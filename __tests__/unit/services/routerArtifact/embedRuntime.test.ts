import { routeWithEmbedding } from '../../../../src/services/routerArtifact/embedRuntime';
import { EmbedModel } from '../../../../src/services/routerArtifact/types';

describe('embedRuntime', () => {
  describe('routeWithEmbedding', () => {
    it('routes to nearest centroid', () => {
      const model: EmbedModel = {
        embeddingModel: 'all-MiniLM-L6-v2',
        dims: 3,
        centroids: {
          cat: [1, 0, 0],
          dog: [0, 1, 0],
        },
      };
      const queryVector = [0.99, 0.01, 0];
      const result = routeWithEmbedding(['cat', 'dog'], model, queryVector);
      expect(result.label).toBe('cat');
    });

    it('normalizes query vector before cosine', () => {
      const model: EmbedModel = {
        embeddingModel: 'all-MiniLM-L6-v2',
        dims: 2,
        centroids: {
          a: [1, 0],
          b: [0, 1],
        },
      };
      // Un-normalized query [3, 0] should normalize to [1, 0] and match 'a'
      const result = routeWithEmbedding(['a', 'b'], model, [3, 0]);
      expect(result.label).toBe('a');
    });

    it('returns RouteResult with confidence and scores', () => {
      const model: EmbedModel = {
        embeddingModel: 'all-MiniLM-L6-v2',
        dims: 2,
        centroids: {
          x: [1, 0],
          y: [0, 1],
        },
      };
      const result = routeWithEmbedding(['x', 'y'], model, [1, 0]);
      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('scores');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('computes cosine similarity correctly', () => {
      const model: EmbedModel = {
        embeddingModel: 'all-MiniLM-L6-v2',
        dims: 2,
        centroids: {
          same: [1, 0],
          perpendicular: [0, 1],
        },
      };
      const result = routeWithEmbedding(['same', 'perpendicular'], model, [1, 0]);
      // Cosine similarity with itself should be much higher than perpendicular
      expect(result.scores.same).toBeGreaterThan(result.scores.perpendicular);
    });

    it('handles unnormalized embeddings', () => {
      const model: EmbedModel = {
        embeddingModel: 'all-MiniLM-L6-v2',
        dims: 3,
        centroids: {
          a: [1, 1, 1],
          b: [-1, -1, -1],
        },
      };
      const result = routeWithEmbedding(['a', 'b'], model, [2, 2, 2]);
      expect(result.label).toBe('a');
    });

    it('handles zero-norm query vector (edge case)', () => {
      const model: EmbedModel = {
        embeddingModel: 'all-MiniLM-L6-v2',
        dims: 2,
        centroids: {
          a: [1, 0],
          b: [0, 1],
        },
      };
      // Zero vector: normalize to 1, resulting in [0, 0]
      const result = routeWithEmbedding(['a', 'b'], model, [0, 0]);
      expect(result).toHaveProperty('label');
      expect(['a', 'b']).toContain(result.label);
    });

    it('allocates scores to all labels', () => {
      const model: EmbedModel = {
        embeddingModel: 'all-MiniLM-L6-v2',
        dims: 2,
        centroids: {
          x: [1, 0],
          y: [0, 1],
          z: [-1, 0],
        },
      };
      const result = routeWithEmbedding(['x', 'y', 'z'], model, [1, 0.5]);
      expect(result.scores.x).toBeGreaterThan(0);
      expect(result.scores.y).toBeGreaterThan(0);
      expect(result.scores.z).toBeGreaterThan(0);
    });

    it('probabilities sum to approximately 1', () => {
      const model: EmbedModel = {
        embeddingModel: 'all-MiniLM-L6-v2',
        dims: 3,
        centroids: {
          a: [1, 0, 0],
          b: [0, 1, 0],
          c: [0, 0, 1],
        },
      };
      const result = routeWithEmbedding(['a', 'b', 'c'], model, [1, 1, 1]);
      const sum = Object.values(result.scores).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    });

    it('rounds scores to 4 decimals', () => {
      const model: EmbedModel = {
        embeddingModel: 'all-MiniLM-L6-v2',
        dims: 2,
        centroids: {
          a: [1, 0],
          b: [0, 1],
        },
      };
      const result = routeWithEmbedding(['a', 'b'], model, [1, 1]);
      for (const score of Object.values(result.scores)) {
        const decimalPlaces = (score.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(4);
      }
    });

    it('selects highest-scoring label', () => {
      const model: EmbedModel = {
        embeddingModel: 'all-MiniLM-L6-v2',
        dims: 3,
        centroids: {
          near: [0.9, 0.1, 0],
          far: [-1, 0, 0],
        },
      };
      const result = routeWithEmbedding(['near', 'far'], model, [1, 0, 0]);
      expect(result.label).toBe('near');
      expect(result.scores.near).toBeGreaterThan(result.scores.far);
    });
  });
});
