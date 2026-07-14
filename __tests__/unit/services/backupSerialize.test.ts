/**
 * Unit tests for backupService/serialize.ts — the pure backup logic.
 * No mocks: these functions take data in and return data out. Every branch
 * of validation and of the merge rule is exercised, including the blocking
 * (reject/skip/keep-existing) sides.
 */

import {
  buildBackupPayload,
  parseBackupJson,
  mergeById,
} from '../../../src/services/backupService/serialize';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupParseError,
} from '../../../src/services/backupService/types';
import { createConversation, createMessage } from '../../utils/factories';
import { Project } from '../../../src/types';

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj-1',
  name: 'Test Project',
  description: 'A project',
  systemPrompt: 'You are a test.',
  icon: '#10B981',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

describe('buildBackupPayload', () => {
  it('stamps format, version, clock, and carries the data through untouched', () => {
    const conv = createConversation({ messages: [createMessage({ content: 'hello' })] });
    const proj = makeProject();
    const now = new Date('2026-07-14T10:00:00.000Z');

    const payload = buildBackupPayload([conv], [proj], now);

    expect(payload.format).toBe(BACKUP_FORMAT);
    expect(payload.version).toBe(BACKUP_VERSION);
    expect(payload.exportedAt).toBe('2026-07-14T10:00:00.000Z');
    expect(payload.conversations).toEqual([conv]);
    expect(payload.projects).toEqual([proj]);
  });

  it('defaults the clock when none is supplied', () => {
    const payload = buildBackupPayload([], []);
    expect(Number.isNaN(Date.parse(payload.exportedAt))).toBe(false);
  });
});

describe('parseBackupJson structural validation', () => {
  it('rejects text that is not JSON', () => {
    expect(() => parseBackupJson('not json {')).toThrow(BackupParseError);
    expect(() => parseBackupJson('not json {')).toThrow('This file is not valid JSON.');
  });

  it('rejects JSON null (not an object)', () => {
    expect(() => parseBackupJson('null')).toThrow('This file is not an Off Grid backup.');
  });

  it('rejects a JSON primitive (not an object)', () => {
    expect(() => parseBackupJson('"just a string"')).toThrow('This file is not an Off Grid backup.');
  });

  it('rejects an object with the wrong format marker', () => {
    expect(() => parseBackupJson(JSON.stringify({ format: 'other-app', version: 1 })))
      .toThrow('This file is not an Off Grid backup.');
  });

  it('rejects a payload with a missing version', () => {
    expect(() => parseBackupJson(JSON.stringify({ format: BACKUP_FORMAT })))
      .toThrow('newer version');
  });

  it('rejects a payload from a newer app version', () => {
    const json = JSON.stringify({
      format: BACKUP_FORMAT, version: BACKUP_VERSION + 1, conversations: [], projects: [],
    });
    expect(() => parseBackupJson(json)).toThrow('newer version');
  });

  it('rejects a payload whose conversations field is not an array', () => {
    const json = JSON.stringify({ format: BACKUP_FORMAT, version: 1, conversations: 'x', projects: [] });
    expect(() => parseBackupJson(json)).toThrow('incomplete');
  });

  it('rejects a payload whose projects field is not an array', () => {
    const json = JSON.stringify({ format: BACKUP_FORMAT, version: 1, conversations: [], projects: null });
    expect(() => parseBackupJson(json)).toThrow('incomplete');
  });
});

describe('parseBackupJson per-item validation', () => {
  const validConv = createConversation({ id: 'c1' });
  const validProj = makeProject({ id: 'p1' });

  const wrap = (conversations: unknown[], projects: unknown[]) =>
    JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: '2026-07-14T10:00:00.000Z', conversations, projects });

  it('keeps valid entries and preserves exportedAt', () => {
    const parsed = parseBackupJson(wrap([validConv], [validProj]));
    expect(parsed.payload.conversations).toHaveLength(1);
    expect(parsed.payload.projects).toHaveLength(1);
    expect(parsed.payload.exportedAt).toBe('2026-07-14T10:00:00.000Z');
    expect(parsed.skippedItems).toBe(0);
  });

  it('blanks a non-string exportedAt instead of failing', () => {
    const json = JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: 42, conversations: [], projects: [] });
    expect(parseBackupJson(json).payload.exportedAt).toBe('');
  });

  it.each([
    ['non-object entry', 'a string'],
    ['missing id', { ...validConv, id: 7 }],
    ['missing title', { ...validConv, title: undefined }],
    ['missing updatedAt', { ...validConv, updatedAt: null }],
    ['messages not an array', { ...validConv, messages: 'nope' }],
  ])('skips and counts a conversation with %s', (_label, badEntry) => {
    const parsed = parseBackupJson(wrap([badEntry, validConv], []));
    expect(parsed.payload.conversations.map((c) => c.id)).toEqual(['c1']);
    expect(parsed.skippedItems).toBe(1);
  });

  it.each([
    ['non-object entry', 12],
    ['missing id', { ...validProj, id: undefined }],
    ['missing name', { ...validProj, name: 3 }],
    ['missing systemPrompt', { ...validProj, systemPrompt: undefined }],
    ['missing updatedAt', { ...validProj, updatedAt: 9 }],
  ])('skips and counts a project with %s', (_label, badEntry) => {
    const parsed = parseBackupJson(wrap([], [badEntry, validProj]));
    expect(parsed.payload.projects.map((p) => p.id)).toEqual(['p1']);
    expect(parsed.skippedItems).toBe(1);
  });

  it('sums skipped conversations and projects into one count', () => {
    const parsed = parseBackupJson(wrap([{ bad: true }, validConv], [{ alsoBad: true }]));
    expect(parsed.skippedItems).toBe(2);
  });

  it('round-trips a built payload without loss', () => {
    const conv = createConversation({ messages: [createMessage({ role: 'assistant', content: 'answer' })] });
    const payload = buildBackupPayload([conv], [makeProject()], new Date('2026-07-14T10:00:00.000Z'));
    const parsed = parseBackupJson(JSON.stringify(payload));
    expect(parsed.payload).toEqual(payload);
    expect(parsed.skippedItems).toBe(0);
  });
});

describe('mergeById', () => {
  type Item = { id: string; updatedAt: string; label: string };
  const item = (id: string, updatedAt: string, label: string): Item => ({ id, updatedAt, label });

  it('appends unknown ids and counts them as added', () => {
    const existing = [item('a', '2026-01-01T00:00:00Z', 'local-a')];
    const imported = [item('b', '2026-01-02T00:00:00Z', 'import-b')];

    const outcome = mergeById(existing, imported);

    expect(outcome.merged.map((i) => i.id)).toEqual(['a', 'b']);
    expect(outcome.added).toBe(1);
    expect(outcome.updated).toBe(0);
  });

  it('replaces an existing entry only when the imported copy is strictly newer', () => {
    const existing = [item('a', '2026-01-01T00:00:00Z', 'old-local')];
    const imported = [item('a', '2026-06-01T00:00:00Z', 'newer-import')];

    const outcome = mergeById(existing, imported);

    expect(outcome.merged).toEqual([item('a', '2026-06-01T00:00:00Z', 'newer-import')]);
    expect(outcome.updated).toBe(1);
    expect(outcome.added).toBe(0);
  });

  it('keeps the local entry when the imported copy is older', () => {
    const existing = [item('a', '2026-06-01T00:00:00Z', 'newer-local')];
    const imported = [item('a', '2026-01-01T00:00:00Z', 'stale-import')];

    const outcome = mergeById(existing, imported);

    expect(outcome.merged[0].label).toBe('newer-local');
    expect(outcome.updated).toBe(0);
  });

  it('keeps the local entry on an exact timestamp tie', () => {
    const t = '2026-06-01T00:00:00Z';
    const outcome = mergeById([item('a', t, 'local')], [item('a', t, 'import')]);
    expect(outcome.merged[0].label).toBe('local');
    expect(outcome.updated).toBe(0);
  });

  it('never overwrites when the imported timestamp is unparseable', () => {
    const existing = [item('a', '2026-01-01T00:00:00Z', 'local')];
    const imported = [item('a', 'garbage-date', 'import')];

    const outcome = mergeById(existing, imported);

    expect(outcome.merged[0].label).toBe('local');
    expect(outcome.updated).toBe(0);
  });

  it('never overwrites when the local timestamp is unparseable (NaN comparison blocks)', () => {
    const existing = [item('a', 'garbage-date', 'local')];
    const imported = [item('a', '2026-01-01T00:00:00Z', 'import')];

    const outcome = mergeById(existing, imported);

    expect(outcome.merged[0].label).toBe('local');
    expect(outcome.updated).toBe(0);
  });

  it('preserves existing order and appends new items at the end', () => {
    const existing = [
      item('a', '2026-01-01T00:00:00Z', 'a'),
      item('b', '2026-01-01T00:00:00Z', 'b'),
    ];
    const imported = [
      item('c', '2026-01-01T00:00:00Z', 'c'),
      item('b', '2026-06-01T00:00:00Z', 'b-new'),
    ];

    const outcome = mergeById(existing, imported);

    expect(outcome.merged.map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(outcome.merged[1].label).toBe('b-new');
  });

  it('handles both lists empty', () => {
    const outcome = mergeById<Item>([], []);
    expect(outcome).toEqual({ merged: [], added: 0, updated: 0 });
  });
});
