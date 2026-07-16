/**
 * API Forge — owning service.
 *
 * Single seam that runs the full pipeline (detect → decide → generate →
 * seal) and owns all forge state. UI layers subscribe to the store
 * projection and dispatch intents; they hold no state of their own.
 *
 * Idempotent by design (ansible pattern): forging the same entity twice
 * replaces the artifact, it never duplicates.
 */

import { createStore, StoreApi } from './store';
import { detectGaps } from './detector';
import { decideAll } from './decision';
import {
  createBotHandler,
  createMiniAIHandler,
  generateBotScript,
  generateMiniAI,
  ChatFn,
} from './generator';
import { sealArtifact, SealedArtifact } from './compression';
import { SEED_ENTITIES, KNOWN_ROUTES } from './catalog';
import {
  ApiGap,
  EntityDescriptor,
  ForgeDecision,
  ForgeHandler,
  GeneratedApi,
} from './types';

export interface ForgeState {
  entities: EntityDescriptor[];
  gaps: ApiGap[];
  decisions: ForgeDecision[];
  artifacts: Record<string, GeneratedApi>;
  sealed: Record<string, SealedArtifact>;
  /** op latency log (signoz pattern) — entity → last ms */
  latency: Record<string, number>;
  busy: string | null;
  error: string | null;
}

export class ForgeService {
  readonly store: StoreApi<ForgeState>;
  private handlers = new Map<string, ForgeHandler>();
  private chat: ChatFn | null;
  private sealSecret: string;

  constructor(opts: { chat?: ChatFn; sealSecret?: string } = {}) {
    this.chat = opts.chat ?? null;
    this.sealSecret = opts.sealSecret ?? 'api-forge-default-secret';
    const entities = SEED_ENTITIES;
    const gaps = detectGaps(entities, KNOWN_ROUTES);
    this.store = createStore<ForgeState>({
      entities,
      gaps,
      decisions: decideAll(gaps),
      artifacts: {},
      sealed: {},
      latency: {},
      busy: null,
      error: null,
    });
  }

  /** Register an additional entity at runtime and re-run detection. */
  addEntity(entity: EntityDescriptor): void {
    const entities = [...this.store.getState().entities.filter((e) => e.name !== entity.name), entity];
    const gaps = detectGaps(entities, KNOWN_ROUTES);
    this.store.setState({ entities, gaps, decisions: decideAll(gaps) });
  }

  /** Forge one entity: generate per its verdict, seal per compression laws. */
  async forge(entityName: string): Promise<GeneratedApi | null> {
    const { gaps, decisions } = this.store.getState();
    const gap = gaps.find((g) => g.entity.name === entityName);
    const decision = decisions.find((d) => d.entity === entityName);
    if (!gap || !decision) return null;

    this.store.setState({ busy: entityName, error: null });
    const t0 = Date.now();
    try {
      const api =
        decision.verdict === 'mini-ai'
          ? generateMiniAI(gap.entity, gap.missingOperations)
          : generateBotScript(gap.entity, gap.missingOperations);

      const sealed = await sealArtifact(api, this.sealSecret);
      api.sealedBytes = sealed.sealedBytes;

      // Live handler, available immediately.
      const handler =
        decision.verdict === 'mini-ai' && this.chat
          ? createMiniAIHandler(gap.entity, this.chat)
          : createBotHandler(gap.entity);
      this.handlers.set(entityName, handler);

      this.store.setState((s) => ({
        artifacts: { ...s.artifacts, [entityName]: api },
        sealed: { ...s.sealed, [entityName]: sealed },
        latency: { ...s.latency, [entityName]: Date.now() - t0 },
        busy: null,
      }));
      return api;
    } catch (err) {
      this.store.setState({ busy: null, error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  }

  /** Forge everything that has a gap. */
  async forgeAll(): Promise<number> {
    let count = 0;
    for (const gap of this.store.getState().gaps) {
      if (await this.forge(gap.entity.name)) count++;
    }
    return count;
  }

  /** Invoke a live generated API (records latency, signoz pattern). */
  async invoke(entityName: string, op: Parameters<ForgeHandler['invoke']>[0], payload?: Record<string, unknown>) {
    const handler = this.handlers.get(entityName);
    if (!handler) throw new Error(`no live handler for ${entityName} — forge it first`);
    const t0 = Date.now();
    try {
      return await handler.invoke(op, payload);
    } finally {
      this.store.setState((s) => ({ latency: { ...s.latency, [entityName]: Date.now() - t0 } }));
    }
  }
}

let singleton: ForgeService | null = null;

/** App-wide forge instance (lazy). Pass chat once from the host app. */
export function getForge(opts: { chat?: ChatFn; sealSecret?: string } = {}): ForgeService {
  if (!singleton) singleton = new ForgeService(opts);
  return singleton;
}
