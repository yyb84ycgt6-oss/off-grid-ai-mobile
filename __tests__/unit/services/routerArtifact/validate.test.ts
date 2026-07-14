import { validateArtifact } from '../../../../src/services/routerArtifact/validate';
import {
  RouterArtifact,
  RouterArtifactError,
  ROUTER_FORGE_FORMAT,
  ROUTER_FORGE_VERSION,
} from '../../../../src/services/routerArtifact/types';

describe('validate', () => {
  describe('validateArtifact', () => {
    const baseArtifact: RouterArtifact = {
      format: ROUTER_FORGE_FORMAT,
      version: ROUTER_FORGE_VERSION,
      kind: 'nano',
      name: 'test-router',
      labels: ['a', 'b'],
      model: {
        hashDim: 256,
        ngrams: [1, 2],
        weights: 'AQIDBAAA',
        scales: [0.1, 0.1],
        biases: [0, 0],
      },
    };

    it('accepts valid nano artifact', () => {
      const artifact = validateArtifact(baseArtifact);
      expect(artifact.name).toBe('test-router');
    });

    it('rejects null artifact', () => {
      expect(() => validateArtifact(null)).toThrow(RouterArtifactError);
      expect(() => validateArtifact(null)).toThrow('This file is not a router-forge artifact.');
    });

    it('rejects undefined artifact', () => {
      expect(() => validateArtifact(undefined)).toThrow(RouterArtifactError);
    });

    it('rejects non-object artifact', () => {
      expect(() => validateArtifact('string')).toThrow(RouterArtifactError);
      expect(() => validateArtifact(123)).toThrow(RouterArtifactError);
    });

    it('rejects artifact with wrong format', () => {
      const artifact = { ...baseArtifact, format: 'wrong-format' };
      expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
      expect(() => validateArtifact(artifact)).toThrow('This file is not a router-forge artifact.');
    });

    it('rejects artifact with missing format', () => {
      const artifact = { ...baseArtifact } as any;
      delete artifact.format;
      expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
    });

    it('rejects non-numeric version', () => {
      const artifact = { ...baseArtifact, version: 'v1' };
      expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
      expect(() => validateArtifact(artifact)).toThrow('Unsupported artifact version');
    });

    it('rejects version higher than current', () => {
      const artifact = { ...baseArtifact, version: ROUTER_FORGE_VERSION + 1 };
      expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
      expect(() => validateArtifact(artifact)).toThrow('Unsupported artifact version');
    });

    it('rejects unknown kind', () => {
      const artifact = { ...baseArtifact, kind: 'unknown' };
      expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
      expect(() => validateArtifact(artifact)).toThrow('Unknown router kind.');
    });

    it('accepts kind=nano', () => {
      const artifact = validateArtifact({ ...baseArtifact, kind: 'nano' });
      expect(artifact.kind).toBe('nano');
    });

    it('accepts kind=embed', () => {
      const artifact: RouterArtifact = {
        ...baseArtifact,
        kind: 'embed',
        model: {
          embeddingModel: 'all-MiniLM-L6-v2',
          dims: 384,
          centroids: { a: Array(384).fill(0), b: Array(384).fill(0) },
        },
      };
      const validated = validateArtifact(artifact);
      expect(validated.kind).toBe('embed');
    });

    it('accepts kind=llm', () => {
      const artifact = { ...baseArtifact, kind: 'llm', model: { prompt: 'test' } };
      const validated = validateArtifact(artifact);
      expect(validated.kind).toBe('llm');
    });

    it('rejects non-array labels', () => {
      const artifact = { ...baseArtifact, labels: 'not-an-array' };
      expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
      expect(() => validateArtifact(artifact)).toThrow('Artifact must carry at least 2 labels.');
    });

    it('rejects labels with fewer than 2 elements', () => {
      const artifact = { ...baseArtifact, labels: ['only-one'] };
      expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
      expect(() => validateArtifact(artifact)).toThrow('Artifact must carry at least 2 labels.');
    });

    it('rejects empty labels array', () => {
      const artifact = { ...baseArtifact, labels: [] };
      expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
    });

    it('accepts exactly 2 labels', () => {
      const artifact = validateArtifact({ ...baseArtifact, labels: ['a', 'b'] });
      expect(artifact.labels.length).toBe(2);
    });

    it('accepts more than 2 labels', () => {
      const artifact = validateArtifact({ ...baseArtifact, labels: ['a', 'b', 'c', 'd'] });
      expect(artifact.labels.length).toBe(4);
    });

    it('rejects non-string name', () => {
      const artifact = { ...baseArtifact, name: 123 };
      expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
      expect(() => validateArtifact(artifact)).toThrow('Artifact is missing its name.');
    });

    it('rejects empty name', () => {
      const artifact = { ...baseArtifact, name: '' };
      expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
    });

    it('rejects whitespace-only name', () => {
      const artifact = { ...baseArtifact, name: '   ' };
      expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
    });

    it('accepts valid name', () => {
      const artifact = validateArtifact({ ...baseArtifact, name: 'my-router' });
      expect(artifact.name).toBe('my-router');
    });

    it('rejects missing model', () => {
      const artifact = { ...baseArtifact } as any;
      delete artifact.model;
      expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
      expect(() => validateArtifact(artifact)).toThrow('Artifact is missing its model payload.');
    });

    it('rejects null model', () => {
      const artifact = { ...baseArtifact, model: null };
      expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
    });

    it('rejects non-object model', () => {
      const artifact = { ...baseArtifact, model: 'string' };
      expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
    });

    describe('nano model validation', () => {
      it('rejects nano missing hashDim', () => {
        const artifact = { ...baseArtifact, kind: 'nano', model: { ngrams: [1, 2], weights: 'x', scales: [0.1, 0.1], biases: [0, 0] } };
        expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
        expect(() => validateArtifact(artifact)).toThrow('hashDim');
      });

      it('rejects nano missing ngrams', () => {
        const artifact = { ...baseArtifact, kind: 'nano', model: { hashDim: 256, weights: 'x', scales: [0.1, 0.1], biases: [0, 0] } };
        expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
        expect(() => validateArtifact(artifact)).toThrow('ngrams');
      });

      it('rejects nano missing weights', () => {
        const artifact = { ...baseArtifact, kind: 'nano', model: { hashDim: 256, ngrams: [1, 2], scales: [0.1, 0.1], biases: [0, 0] } };
        expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
        expect(() => validateArtifact(artifact)).toThrow('weights');
      });

      it('rejects nano missing scales', () => {
        const artifact = { ...baseArtifact, kind: 'nano', model: { hashDim: 256, ngrams: [1, 2], weights: 'x', biases: [0, 0] } };
        expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
        expect(() => validateArtifact(artifact)).toThrow('scales');
      });

      it('rejects nano missing biases', () => {
        const artifact = { ...baseArtifact, kind: 'nano', model: { hashDim: 256, ngrams: [1, 2], weights: 'x', scales: [0.1, 0.1] } };
        expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
        expect(() => validateArtifact(artifact)).toThrow('biases');
      });

      it('accepts valid nano model', () => {
        const artifact = validateArtifact(baseArtifact);
        expect(artifact.kind).toBe('nano');
      });
    });

    describe('embed model validation', () => {
      const embedArtifact: RouterArtifact = {
        ...baseArtifact,
        kind: 'embed',
        model: {
          embeddingModel: 'all-MiniLM-L6-v2',
          dims: 384,
          centroids: {
            a: Array(384).fill(0.1),
            b: Array(384).fill(0.2),
          },
        },
      };

      it('rejects embed missing dims', () => {
        const artifact = { ...embedArtifact, model: { embeddingModel: 'test', centroids: { a: [], b: [] } } };
        expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
        expect(() => validateArtifact(artifact)).toThrow('dims or centroids');
      });

      it('rejects embed missing centroids', () => {
        const artifact = { ...embedArtifact, model: { embeddingModel: 'test', dims: 384 } };
        expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
      });

      it('rejects embed with non-numeric dims', () => {
        const artifact = { ...embedArtifact, model: { embeddingModel: 'test', dims: 'not-a-number', centroids: {} } };
        expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
      });

      it('rejects embed centroid with wrong dimension', () => {
        const artifact = { ...embedArtifact, model: { ...embedArtifact.model as any, centroids: { a: Array(384).fill(0), b: Array(383).fill(0) } } };
        expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
        expect(() => validateArtifact(artifact)).toThrow('centroid');
      });

      it('rejects embed missing centroid for a label', () => {
        const artifact = { ...embedArtifact, model: { ...embedArtifact.model as any, centroids: { a: Array(384).fill(0) } } };
        expect(() => validateArtifact(artifact)).toThrow(RouterArtifactError);
      });

      it('accepts valid embed model', () => {
        const artifact = validateArtifact(embedArtifact);
        expect(artifact.kind).toBe('embed');
      });
    });
  });
});
