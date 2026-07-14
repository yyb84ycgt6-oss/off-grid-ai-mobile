import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { embeddingService } from '../rag/embedding';
import { compileNano } from './nanoRuntime';
import { routeWithEmbedding } from './embedRuntime';
import {
  RouterArtifact,
  RouteResult,
  StoredRouterSummary,
  RouterArtifactError,
} from './types';
import { validateArtifact } from './validate';

const ARTIFACTS_PREFIX = '@local_llm/router-artifacts-';

interface StoredArtifact {
  artifact: RouterArtifact;
  sizeBytes: number;
  importedAt: number;
}

class RouterArtifactService {
  async import(file: { uri?: string }): Promise<StoredRouterSummary> {
    if (!file.uri) {
      throw new RouterArtifactError('Invalid file: missing URI.');
    }
    const content = await RNFS.readFile(file.uri, 'utf8');
    const parsed = JSON.parse(content);
    const artifact = validateArtifact(parsed);

    const stored: StoredArtifact = {
      artifact,
      sizeBytes: content.length,
      importedAt: Date.now(),
    };
    const key = `${ARTIFACTS_PREFIX}${artifact.name}`;
    await AsyncStorage.setItem(key, JSON.stringify(stored));

    return {
      name: artifact.name,
      kind: artifact.kind,
      task: artifact.task || '',
      labels: artifact.labels,
      sizeBytes: content.length,
    };
  }

  async list(): Promise<StoredRouterSummary[]> {
    const keys = await AsyncStorage.getAllKeys();
    const artifactKeys = keys.filter(k => k.startsWith(ARTIFACTS_PREFIX));
    const summaries: StoredRouterSummary[] = [];

    for (const key of artifactKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const stored: StoredArtifact = JSON.parse(data);
        summaries.push({
          name: stored.artifact.name,
          kind: stored.artifact.kind,
          task: stored.artifact.task || '',
          labels: stored.artifact.labels,
          sizeBytes: stored.sizeBytes,
        });
      }
    }
    return summaries;
  }

  async remove(name: string): Promise<void> {
    const key = `${ARTIFACTS_PREFIX}${name}`;
    await AsyncStorage.removeItem(key);
  }

  private async getArtifact(name: string): Promise<RouterArtifact> {
    const key = `${ARTIFACTS_PREFIX}${name}`;
    const data = await AsyncStorage.getItem(key);
    if (!data) {
      throw new RouterArtifactError(`Router artifact "${name}" not found.`);
    }
    const stored: StoredArtifact = JSON.parse(data);
    return stored.artifact;
  }

  async route(name: string, text: string): Promise<RouteResult> {
    const artifact = await this.getArtifact(name);

    if (artifact.kind === 'nano') {
      const compiled = compileNano(artifact.labels, artifact.model as any);
      return compiled.route(text);
    }

    if (artifact.kind === 'embed') {
      await embeddingService.load();
      const queryVector = await embeddingService.embed(text);
      return routeWithEmbedding(artifact.labels, artifact.model as any, queryVector);
    }

    throw new RouterArtifactError(`Unsupported router kind: ${artifact.kind}`);
  }
}

export const routerArtifactService = new RouterArtifactService();
