/**
 * API Forge — vitest suite driving the REAL pipeline.
 * Only the chat boundary (network) is stubbed; everything else runs live:
 * detection, decision, generation, eYe-pod sealing, handler CRUD.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ForgeService } from '../forgeService';
import { openArtifact } from '../compression';
import { detectGaps, coverageFromRoutes, parseEntity } from '../detector';
import { decide } from '../decision';

const SECRET = 'test-secret';

function makeForge(replies: string[] = []) {
  const calls: string[] = [];
  const chat = async (messages: { role: string; content: string }[]) => {
    calls.push(messages[messages.length - 1].content);
    return { content: replies.shift() ?? JSON.stringify({ ok: true, result: [] }) };
  };
  return { forge: new ForgeService({ chat, sealSecret: SECRET }), calls };
}

describe('detection', () => {
  it('parses zod optional and classifies semantics', () => {
    const { forge } = makeForge();
    const tenant = forge.store.getState().entities.find((e) => e.name === 'tenant')!;
    expect(tenant.fields.find((f) => f.name === 'email')!.semantic).toBe('email');
    expect(tenant.fields.find((f) => f.name === 'publicUuid')!.required).toBe(false);
  });

  it('classifies interface freetext and boolean fields', () => {
    const { forge } = makeForge();
    const todo = forge.store.getState().entities.find((e) => e.name === 'todo')!;
    expect(todo.fields.find((f) => f.name === 'description')!.semantic).toBe('freetext');
    expect(todo.fields.find((f) => f.name === 'done')!.semantic).toBe('boolean');
  });

  it('excludes route-covered operations from gaps', () => {
    const entity = parseEntity('tenant', '{ name: z.string(), email: z.string() }');
    const routes = ['GET /tenants', 'POST /tenants', 'DELETE /tenants/:id'];
    expect(coverageFromRoutes('tenant', routes)).toEqual(
      expect.arrayContaining(['list', 'create', 'delete']),
    );
    const gaps = detectGaps([entity], routes);
    expect(gaps[0].missingOperations).not.toContain('list');
    expect(gaps[0].missingOperations).toContain('update');
  });
});

describe('decision engine', () => {
  it('sends freetext-bearing entities to mini-ai', () => {
    const { forge } = makeForge();
    const d = forge.store.getState().decisions.find((x) => x.entity === 'todo')!;
    expect(d.verdict).toBe('mini-ai');
    expect(d.aiScore).toBeGreaterThanOrEqual(0.4);
  });

  it('keeps flat structured entities on bot-script', () => {
    const entity = parseEntity('counter', '{ name: z.string(), value: z.number() }');
    const d = decide({ entity, missingOperations: ['list', 'get', 'create'] });
    expect(d.verdict).toBe('bot-script');
  });
});

describe('generation + compression laws', () => {
  let forge: ForgeService;
  beforeEach(() => {
    forge = makeForge().forge;
  });

  it('forges, seals, and round-trips the artifact', async () => {
    const api = await forge.forge('tenant');
    expect(api).not.toBeNull();
    const sealed = forge.store.getState().sealed['tenant'];
    expect(sealed.sealedBytes).toBeGreaterThan(0);
    const reopened = await openArtifact(sealed, SECRET);
    expect(reopened.code).toBe(api!.code);
  });

  it('refuses to unseal with the wrong key (integrity gate)', async () => {
    await forge.forge('tenant');
    const sealed = forge.store.getState().sealed['tenant'];
    await expect(openArtifact(sealed, 'wrong')).rejects.toThrow();
  });

  it('reforge is idempotent — replaces, never duplicates', async () => {
    await forge.forge('tenant');
    const n = Object.keys(forge.store.getState().artifacts).length;
    await forge.forge('tenant');
    expect(Object.keys(forge.store.getState().artifacts).length).toBe(n);
  });
});

describe('live bot handler', () => {
  let forge: ForgeService;
  beforeEach(async () => {
    forge = makeForge().forge;
    await forge.forge('tenant');
  });

  it('runs full CRUD against the real store', async () => {
    const row = (await forge.invoke('tenant', 'create', {
      name: 'Acme', email: 'a@b.co', companyName: 'Acme Inc',
    })) as Record<string, unknown>;
    expect(typeof row.id).toBe('string');
    await forge.invoke('tenant', 'update', { id: row.id, companyName: 'Acme LLC' });
    const got = (await forge.invoke('tenant', 'get', { id: row.id })) as Record<string, unknown>;
    expect(got.companyName).toBe('Acme LLC');
    await forge.invoke('tenant', 'delete', { id: row.id });
    expect((await forge.invoke('tenant', 'list')) as unknown[]).toHaveLength(0);
  });

  it('rejects missing required fields (validation false branch)', async () => {
    await expect(
      forge.invoke('tenant', 'create', { name: 'NoEmail', companyName: 'X' }),
    ).rejects.toThrow(/email is required/);
  });

  it('rejects malformed email', async () => {
    await expect(
      forge.invoke('tenant', 'create', { name: 'Bad', email: 'nope', companyName: 'X' }),
    ).rejects.toThrow(/valid email/);
  });
});

describe('mini AI handler', () => {
  it('routes query through the chat boundary and parses the contract', async () => {
    const { forge, calls } = makeForge([
      JSON.stringify({ ok: true, result: [{ id: 'todo-1', matched: true }] }),
    ]);
    await forge.forge('todo');
    await forge.invoke('todo', 'create', { title: 'buy milk', done: false });
    const out = (await forge.invoke('todo', 'query', { q: 'milk' })) as any[];
    expect(calls).toHaveLength(1);
    expect(out[0].matched).toBe(true);
  });

  it('falls back to deterministic query when the model returns junk', async () => {
    const { forge } = makeForge(['this is not json']);
    await forge.forge('todo');
    await forge.invoke('todo', 'create', { title: 'buy milk', done: false });
    const out = (await forge.invoke('todo', 'query', { where: { done: false } })) as any[];
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('buy milk');
  });

  it('CRUD ops bypass the model entirely (deterministic store stays authoritative)', async () => {
    const { forge, calls } = makeForge();
    await forge.forge('todo');
    await forge.invoke('todo', 'create', { title: 'x', done: false });
    await forge.invoke('todo', 'list');
    expect(calls).toHaveLength(0);
  });
});
