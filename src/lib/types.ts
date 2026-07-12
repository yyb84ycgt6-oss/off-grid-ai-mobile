/**
 * API Forge — type contracts.
 *
 * The Forge scans entity descriptors, detects which entities lack API
 * coverage, decides whether each gap should be filled by a deterministic
 * bot script or an LLM-backed mini AI, and generates the implementation.
 *
 * Schema/validation conventions adopted from the incorporated
 * cloudnative-template (Wednesday Solutions) entity-schema package.
 */

/** Semantic meaning of a field — drives the bot-vs-miniAI decision. */
export type FieldSemantic =
  | 'id'        // uuid / primary key
  | 'ref'       // foreign key / relation to another entity
  | 'email'
  | 'date'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'text'      // short structured string (name, title, sku)
  | 'freetext'  // unstructured natural language (description, notes, prompt)
  | 'binary';   // blobs, files, pods

export interface EntityField {
  name: string;
  type: string;          // ts/zod type as written in source
  required: boolean;
  semantic: FieldSemantic;
}

/** One CRUD-ish operation an API can expose. */
export type ApiOperation = 'list' | 'get' | 'create' | 'update' | 'delete' | 'query';

export const ALL_OPERATIONS: ApiOperation[] = ['list', 'get', 'create', 'update', 'delete', 'query'];

export interface EntityDescriptor {
  name: string;                 // e.g. "tenant"
  source: string;               // where it was detected (app / file)
  fields: EntityField[];
  /** Operations already served by an existing route/function. */
  coveredOperations: ApiOperation[];
}

export interface ApiGap {
  entity: EntityDescriptor;
  missingOperations: ApiOperation[];
}

/** The Forge's verdict for how to fill a gap. */
export type ForgeVerdict = 'bot-script' | 'mini-ai';

export interface ForgeDecision {
  entity: string;
  verdict: ForgeVerdict;
  /** 0..1 — how strongly the heuristics point at mini-ai. */
  aiScore: number;
  reasons: string[];
}

export interface GeneratedApi {
  entity: string;
  verdict: ForgeVerdict;
  operations: ApiOperation[];
  /** Generated source code (route handler / edge function). */
  code: string;
  /** ISO timestamp of generation. */
  generatedAt: string;
  /** Set once the artifact has been sealed per the compression laws. */
  sealedBytes?: number;
}

/** A live in-memory handler produced by the runtime factories. */
export interface ForgeHandler {
  entity: string;
  verdict: ForgeVerdict;
  invoke(op: ApiOperation, payload?: Record<string, unknown>): Promise<unknown>;
}

/** One incorporated application in the capability catalog. */
export interface IncorporatedApp {
  id: string;
  name: string;
  origin: string;               // upstream project it came from
  category:
    | 'backend-template'
    | 'frontend-template'
    | 'state-management'
    | 'observability'
    | 'automation'
    | 'data-engineering'
    | 'agent-skills'
    | 'cli-tooling'
    | 'knowledge';
  capabilities: string[];
  /** Which of its patterns the Forge adopted. */
  adoptedPatterns: string[];
  /** What it gives the owner day-to-day, phone in hand. */
  mobileBenefit: string;
}
