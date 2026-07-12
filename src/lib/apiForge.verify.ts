/**
 * API Forge verification — drives the REAL pipeline end to end:
 * detect → decide → generate → seal → open → live handler CRUD → mini-AI
 * fallback path. No mocks except the chat boundary (network).
 */
import { ForgeService } from './forgeService';
import { openArtifact } from './compression';
import { parseEntity, detectGaps, coverageFromRoutes } from './detector';
import { decide } from './decision';

let passed = 0;
function assert(cond: unknown, label: string) {
  if (!cond) {
    console.error(`✗ FAIL: ${label}`);
    process.exit(1);
  }
  passed++;
  console.log(`✓ ${label}`);
}

const chatCalls: string[] = [];
const fakeChat = async (messages: { role: string; content: string }[]) => {
  chatCalls.push(messages[messages.length - 1].content);
  // Answer a query op with valid contract JSON
  return { content: JSON.stringify({ ok: true, result: [{ id: 'todo-1', matched: true }] }) };
};

const SECRET = 'verify-secret';
const forge = new ForgeService({ chat: fakeChat, sealSecret: SECRET });

// ── detection ──────────────────────────────────────────────────────
const st0 = forge.store.getState();
assert(st0.entities.length === 7, `7 seed entities detected (${st0.entities.length})`);
assert(st0.gaps.length === 7, 'all seeds have gaps (no routes serve them yet)');

const tenant = st0.entities.find((e) => e.name === 'tenant')!;
assert(tenant.fields.some((f) => f.name === 'email' && f.semantic === 'email'), 'tenant.email classified as email');
assert(tenant.fields.find((f) => f.name === 'publicUuid')!.required === false, 'zod .optional() parsed as not-required');

const todo = st0.entities.find((e) => e.name === 'todo')!;
assert(todo.fields.find((f) => f.name === 'description')!.semantic === 'freetext', 'todo.description classified freetext');
assert(todo.fields.find((f) => f.name === 'done')!.semantic === 'boolean', 'interface boolean parsed');

// route coverage
const cov = coverageFromRoutes('tenant', ['GET /tenants', 'POST /tenants', 'DELETE /tenants/:id']);
assert(cov.includes('list') && cov.includes('create') && cov.includes('delete'), 'route coverage inferred');
const partialGaps = detectGaps([tenant], ['GET /tenants', 'POST /tenants', 'DELETE /tenants/:id']);
assert(!partialGaps[0].missingOperations.includes('list'), 'covered ops excluded from gap');

// ── decision ───────────────────────────────────────────────────────
const dTodo = st0.decisions.find((d) => d.entity === 'todo')!;
assert(dTodo.verdict === 'mini-ai', `todo → mini-ai (freetext description) [score ${dTodo.aiScore}]`);
const dTrace = st0.decisions.find((d) => d.entity === 'trace')!;
assert(dTrace.verdict === 'mini-ai' || dTrace.verdict === 'bot-script', 'trace got a verdict');
const dUser = st0.decisions.find((d) => d.entity === 'user')!;
console.log(`  user verdict: ${dUser.verdict} (${dUser.aiScore}) — ${dUser.reasons[0]}`);

// ── generate + seal (compression laws) ─────────────────────────────
const api = await forge.forge('tenant');
assert(api !== null, 'tenant forged');
assert(api!.code.includes('tenantApi'), 'generated code names the handler');
const sealed = forge.store.getState().sealed['tenant'];
assert(sealed && sealed.sealedBytes > 0, `artifact sealed (${sealed.sealedBytes}B from ${sealed.rawBytes}B)`);
const reopened = await openArtifact(sealed, SECRET);
assert(reopened.entity === 'tenant' && reopened.code === api!.code, 'sealed artifact round-trips intact');
let refused = false;
try { await openArtifact(sealed, 'wrong-secret'); } catch { refused = true; }
assert(refused, 'wrong key refuses to unseal (integrity gate)');

// ── live bot handler CRUD ──────────────────────────────────────────
const created = await forge.invoke('tenant', 'create', {
  name: 'Acme', email: 'a@b.co', companyName: 'Acme Inc',
}) as Record<string, unknown>;
assert(typeof created.id === 'string', 'bot create returns row with id');
let rejected = false;
try { await forge.invoke('tenant', 'create', { name: 'NoEmail', companyName: 'X' }); } catch { rejected = true; }
assert(rejected, 'bot create rejects missing required email (validation false branch)');
rejected = false;
try { await forge.invoke('tenant', 'create', { name: 'Bad', email: 'not-an-email', companyName: 'X' }); } catch { rejected = true; }
assert(rejected, 'bot create rejects malformed email');
const listed = await forge.invoke('tenant', 'list') as unknown[];
assert(listed.length === 1, 'bot list shows exactly the created row');
await forge.invoke('tenant', 'update', { id: created.id, companyName: 'Acme LLC' });
const got = await forge.invoke('tenant', 'get', { id: created.id }) as Record<string, unknown>;
assert(got.companyName === 'Acme LLC', 'bot update persisted');
await forge.invoke('tenant', 'delete', { id: created.id });
assert(((await forge.invoke('tenant', 'list')) as unknown[]).length === 0, 'bot delete removed row');

// ── mini AI handler: query routes through chat, CRUD stays real ────
await forge.forge('todo');
await forge.invoke('todo', 'create', { title: 'buy milk', done: false });
const queried = await forge.invoke('todo', 'query', { q: 'anything about milk' });
assert(chatCalls.length === 1, 'mini-ai query called the chat boundary exactly once');
assert(Array.isArray(queried) && (queried as any[])[0].matched === true, 'mini-ai returned parsed contract result');

// idempotency (ansible pattern): forging again replaces, not duplicates
const before = Object.keys(forge.store.getState().artifacts).length;
await forge.forge('todo');
assert(Object.keys(forge.store.getState().artifacts).length === before, 'reforge is idempotent');

console.log(`\n${passed} assertions passed — API Forge pipeline verified.`);
