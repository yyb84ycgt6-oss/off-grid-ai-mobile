/**
 * API Forge — capability catalog.
 *
 * The ten incorporated applications, what each one contributes, and the
 * seed entity manifests the Forge watches. Bundled offline: browsable
 * from a phone with zero network.
 */

import { EntityDescriptor, IncorporatedApp } from './types';
import { parseEntity } from './detector';

export const INCORPORATED_APPS: IncorporatedApp[] = [
  {
    id: 'cloudnative-template',
    name: 'CloudNative Template',
    origin: 'wednesday-solutions/cloudnative-template',
    category: 'backend-template',
    capabilities: ['Fastify + Postgres monorepo', 'zod entity schemas', 'typed custom errors', 'K8s-ready deployment'],
    adoptedPatterns: ['entity schema shape (tenant/user)', 'validation error phrasing', 'error-class hierarchy'],
    mobileBenefit: 'Every generated API validates input the same predictable way — fewer surprises when calling from the phone.',
  },
  {
    id: 'serverless-template',
    name: 'Serverless Template',
    origin: 'wednesday-solutions/serverless-template',
    category: 'backend-template',
    capabilities: ['AWS Lambda function layout', 'per-function schemas + tests', 'cron functions'],
    adoptedPatterns: ['one-folder-per-operation function layout in generated route tables'],
    mobileBenefit: 'Generated APIs deploy as small independent functions — cheap to run, nothing idle.',
  },
  {
    id: 'next-bulletproof-ts',
    name: 'Next Bulletproof TS',
    origin: 'wednesday-solutions/next-bulletproof-ts',
    category: 'frontend-template',
    capabilities: ['production Next.js setup', 'strict TS', 'container/presenter split'],
    adoptedPatterns: ['presentation kept dumb: Forge UI only projects store state'],
    mobileBenefit: 'Screens stay thin and fast on mobile connections.',
  },
  {
    id: 'zustand',
    name: 'Zustand',
    origin: 'pmndrs/zustand',
    category: 'state-management',
    capabilities: ['minimal store: setState/getState/subscribe', 'no boilerplate', 'framework-agnostic vanilla core'],
    adoptedPatterns: ['forge store is a dependency-free port of zustand/vanilla'],
    mobileBenefit: 'Forge state updates are instant and tiny — no heavy state framework in the bundle.',
  },
  {
    id: 'ecs-signoz',
    name: 'SigNoz on ECS',
    origin: 'wednesday-solutions/ecs-signoz',
    category: 'observability',
    capabilities: ['SigNoz APM deploy on Fargate', 'ClickHouse trace store', 'latency dashboards'],
    adoptedPatterns: ['every forge handler records op latency + outcome for a future trace sink'],
    mobileBenefit: 'You can see which generated API is slow before users feel it.',
  },
  {
    id: 'ansible',
    name: 'Ansible',
    origin: 'ansible/ansible',
    category: 'automation',
    capabilities: ['agentless automation', 'playbooks as declarative state', 'idempotent tasks'],
    adoptedPatterns: ['forge generation is idempotent: re-running produces the same artifact, never duplicates'],
    mobileBenefit: 'Tap generate twice by accident — nothing breaks, nothing duplicates.',
  },
  {
    id: 'data-engineering-starter',
    name: 'Data Engineering Starter',
    origin: 'wednesday-solutions/Data-Engineering-Onboarding-Starter',
    category: 'data-engineering',
    capabilities: ['pipeline staging patterns', 'ingest → transform → serve'],
    adoptedPatterns: ['detect → decide → generate → seal is a staged pipeline with inspectable output at each stage'],
    mobileBenefit: 'Each stage shows its work — easy to audit from a small screen.',
  },
  {
    id: 'superpowers',
    name: 'Superpowers',
    origin: 'obra/superpowers',
    category: 'agent-skills',
    capabilities: ['composable agent skills', 'methodology-as-skills runtime'],
    adoptedPatterns: ['mini AI contracts are written as small composable skill prompts'],
    mobileBenefit: 'Mini AIs behave consistently because each carries a tight, testable contract.',
  },
  {
    id: 'negt-cli',
    name: 'NEGT CLI',
    origin: 'wednesday-solutions/negt',
    category: 'cli-tooling',
    capabilities: ['project scaffolding CLI', 'template-driven codegen'],
    adoptedPatterns: ['generated code is emitted as ready-to-mount scaffolds with route tables'],
    mobileBenefit: 'Generated output is copy-paste deployable — no laptop required to read it.',
  },
  {
    id: 'chipotle',
    name: 'Chipotle Knowledge Base',
    origin: 'chipotle (in-house POCs)',
    category: 'knowledge',
    capabilities: ['POC reference implementations', 'knowledge-sharing material'],
    adoptedPatterns: ['seed entity manifests double as living documentation'],
    mobileBenefit: 'The catalog itself is the docs — read it in the app, offline.',
  },
];

/* ------------------------------------------------------------------ */
/* Seed entity manifests (real shapes from the incorporated sources)   */
/* ------------------------------------------------------------------ */

const seeds: { name: string; origin: string; source: string }[] = [
  {
    name: 'tenant',
    origin: 'cloudnative-template/entities-schemas',
    source: `{
      name: z.string(),
      publicUuid: z.string().optional(),
      createdAt: z.date().optional(),
      updatedAt: z.date().optional(),
      email: z.string(),
      companyName: z.string(),
      tenantAccessKey: z.string().optional(),
    }`,
  },
  {
    name: 'user',
    origin: 'cloudnative-template/entities-schemas',
    source: `{
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
      tenantId: z.string(),
      role: z.enum(),
      createdAt: z.date().optional(),
    }`,
  },
  {
    name: 'todo',
    origin: 'serverless-template/functions',
    source: `interface Todo {
      id: string;
      title: string;
      description?: string;
      dueOn?: string;
      done: boolean;
    }`,
  },
  {
    name: 'pipeline',
    origin: 'data-engineering-starter',
    source: `interface Pipeline {
      id: string;
      name: string;
      sourceRef: string;
      sinkRef: string;
      scheduleCron?: string;
      notes?: string;
    }`,
  },
  {
    name: 'playbook',
    origin: 'ansible',
    source: `interface Playbook {
      id: string;
      name: string;
      hostsPattern: string;
      description?: string;
      taskCount: number;
      lastRunAt?: string;
    }`,
  },
  {
    name: 'skill',
    origin: 'superpowers',
    source: `interface Skill {
      id: string;
      name: string;
      promptBody: string;
      category: string;
      enabled: boolean;
    }`,
  },
  {
    name: 'trace',
    origin: 'ecs-signoz',
    source: `interface Trace {
      id: string;
      serviceRef: string;
      operation: string;
      durationMs: number;
      startedAt: string;
      statusCode: number;
    }`,
  },
];

export const SEED_ENTITIES: EntityDescriptor[] = seeds.map((s) =>
  parseEntity(s.name, s.source, s.origin),
);

/** Routes the host app already serves (so the Forge doesn't regenerate them). */
export const KNOWN_ROUTES: string[] = [
  'POST /api/freeai/chat',
  'GET /api/freeai/health',
];
