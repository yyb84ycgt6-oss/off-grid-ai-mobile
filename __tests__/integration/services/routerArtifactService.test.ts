import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { routerArtifactService } from '../../../src/services/routerArtifact/index';
import { RouterArtifactError, ROUTER_FORGE_FORMAT, ROUTER_FORGE_VERSION } from '../../../src/services/routerArtifact/types';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native-fs');
jest.mock('../../../src/services/rag/embedding', () => ({
  embeddingService: {
    load: jest.fn().mockResolvedValue(undefined),
    embed: jest.fn().mockResolvedValue(Array(384).fill(0.1)),
  },
}));

describe('routerArtifactService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
  });

  describe('import', () => {
    it('imports a valid nano artifact from file', async () => {
      const nanoArtifact = {
        format: ROUTER_FORGE_FORMAT,
        version: ROUTER_FORGE_VERSION,
        kind: 'nano',
        name: 'test-router',
        labels: ['a', 'b'],
        task: 'test routing',
        model: {
          hashDim: 256,
          ngrams: [1, 2],
          weights: 'AQIDBAAA',
          scales: [0.1, 0.1],
          biases: [0, 0],
        },
      };
      const fileContent = JSON.stringify(nanoArtifact);
      (RNFS.readFile as jest.Mock).mockResolvedValue(fileContent);

      const summary = await routerArtifactService.import({
        uri: 'file://artifact.json',
      });

      expect(summary.name).toBe('test-router');
      expect(summary.kind).toBe('nano');
      expect(summary.labels).toEqual(['a', 'b']);
      expect(summary.task).toBe('test routing');
      expect(summary.sizeBytes).toBe(fileContent.length);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('test-router'),
        expect.any(String),
      );
    });

    it('imports a valid embed artifact', async () => {
      const embedArtifact = {
        format: ROUTER_FORGE_FORMAT,
        version: ROUTER_FORGE_VERSION,
        kind: 'embed',
        name: 'embed-router',
        labels: ['cat', 'dog'],
        task: 'pet classification',
        model: {
          embeddingModel: 'all-MiniLM-L6-v2',
          dims: 384,
          centroids: {
            cat: Array(384).fill(0.1),
            dog: Array(384).fill(0.2),
          },
        },
      };
      const fileContent = JSON.stringify(embedArtifact);
      (RNFS.readFile as jest.Mock).mockResolvedValue(fileContent);

      const summary = await routerArtifactService.import({
        uri: 'file://embed.json',
      });

      expect(summary.kind).toBe('embed');
      expect(summary.name).toBe('embed-router');
    });

    it('rejects file with missing URI', async () => {
      await expect(
        routerArtifactService.import({
          name: 'test.json',
          size: 100,
          type: 'application/json',
        } as any),
      ).rejects.toThrow(RouterArtifactError);
    });

    it('rejects invalid JSON', async () => {
      (RNFS.readFile as jest.Mock).mockResolvedValue('not valid json');

      await expect(
        routerArtifactService.import({
          uri: 'file://bad.json',
        }),
      ).rejects.toThrow();
    });

    it('rejects artifact that fails validation', async () => {
      const invalidArtifact = {
        format: 'wrong-format',
        version: ROUTER_FORGE_VERSION,
        kind: 'nano',
        name: 'test',
        labels: ['only-one'],
        model: {},
      };
      (RNFS.readFile as jest.Mock).mockResolvedValue(JSON.stringify(invalidArtifact));

      await expect(
        routerArtifactService.import({
          uri: 'file://invalid.json',
        }),
      ).rejects.toThrow(RouterArtifactError);
    });
  });

  describe('list', () => {
    it('returns empty list when no artifacts stored', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);

      const summaries = await routerArtifactService.list();

      expect(summaries).toEqual([]);
    });

    it('lists all stored artifacts', async () => {
      const artifact1 = {
        artifact: {
          format: ROUTER_FORGE_FORMAT,
          version: ROUTER_FORGE_VERSION,
          kind: 'nano',
          name: 'router1',
          labels: ['a', 'b'],
          model: {},
        },
        sizeBytes: 1000,
        importedAt: Date.now(),
      };
      const artifact2 = {
        artifact: {
          format: ROUTER_FORGE_FORMAT,
          version: ROUTER_FORGE_VERSION,
          kind: 'embed',
          name: 'router2',
          labels: ['x', 'y'],
          task: 'embedding routing',
          model: {},
        },
        sizeBytes: 2000,
        importedAt: Date.now(),
      };

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@local_llm/router-artifacts-router1',
        '@local_llm/router-artifacts-router2',
      ]);
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(artifact1))
        .mockResolvedValueOnce(JSON.stringify(artifact2));

      const summaries = await routerArtifactService.list();

      expect(summaries).toHaveLength(2);
      expect(summaries[0].name).toBe('router1');
      expect(summaries[0].kind).toBe('nano');
      expect(summaries[0].sizeBytes).toBe(1000);
      expect(summaries[1].name).toBe('router2');
      expect(summaries[1].kind).toBe('embed');
    });

    it('filters non-artifact keys', async () => {
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
        '@local_llm/router-artifacts-router1',
        '@other/key',
        '@local_llm/something-else',
      ]);
      const artifact = {
        artifact: {
          format: ROUTER_FORGE_FORMAT,
          version: ROUTER_FORGE_VERSION,
          kind: 'nano',
          name: 'router1',
          labels: ['a', 'b'],
          model: {},
        },
        sizeBytes: 1000,
        importedAt: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(artifact));

      const summaries = await routerArtifactService.list();

      expect(summaries).toHaveLength(1);
      expect(summaries[0].name).toBe('router1');
    });
  });

  describe('remove', () => {
    it('removes artifact from storage', async () => {
      await routerArtifactService.remove('my-router');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@local_llm/router-artifacts-my-router');
    });
  });

  describe('route', () => {
    it('routes with nano router', async () => {
      const nanoArtifact = {
        artifact: {
          format: ROUTER_FORGE_FORMAT,
          version: ROUTER_FORGE_VERSION,
          kind: 'nano',
          name: 'nano-router',
          labels: ['fast', 'slow'],
          model: {
            hashDim: 256,
            ngrams: [1, 2],
            weights: 'AAAA',
            scales: [0.1, 0.1],
            biases: [0, 100],
          },
        },
        sizeBytes: 500,
        importedAt: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(nanoArtifact));

      const result = await routerArtifactService.route('nano-router', 'test text');

      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('scores');
      expect(['fast', 'slow']).toContain(result.label);
    });

    it('routes with embed router', async () => {
      const embedArtifact = {
        artifact: {
          format: ROUTER_FORGE_FORMAT,
          version: ROUTER_FORGE_VERSION,
          kind: 'embed',
          name: 'embed-router',
          labels: ['image', 'text'],
          model: {
            embeddingModel: 'all-MiniLM-L6-v2',
            dims: 384,
            centroids: {
              image: Array(384).fill(0.1),
              text: Array(384).fill(0.2),
            },
          },
        },
        sizeBytes: 2000,
        importedAt: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(embedArtifact));

      const result = await routerArtifactService.route('embed-router', 'test text');

      expect(result).toHaveProperty('label');
      expect(result).toHaveProperty('confidence');
      expect(['image', 'text']).toContain(result.label);
    });

    it('throws when router not found', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await expect(routerArtifactService.route('nonexistent', 'text')).rejects.toThrow(
        RouterArtifactError,
      );
      await expect(routerArtifactService.route('nonexistent', 'text')).rejects.toThrow(
        'not found',
      );
    });

    it('throws for unsupported kind', async () => {
      const unsupportedArtifact = {
        artifact: {
          format: ROUTER_FORGE_FORMAT,
          version: ROUTER_FORGE_VERSION,
          kind: 'unsupported-kind',
          name: 'bad-router',
          labels: ['a', 'b'],
          model: {},
        },
        sizeBytes: 500,
        importedAt: Date.now(),
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(unsupportedArtifact),
      );

      await expect(routerArtifactService.route('bad-router', 'text')).rejects.toThrow(
        RouterArtifactError,
      );
      await expect(routerArtifactService.route('bad-router', 'text')).rejects.toThrow(
        'Unsupported router kind',
      );
    });
  });
});
