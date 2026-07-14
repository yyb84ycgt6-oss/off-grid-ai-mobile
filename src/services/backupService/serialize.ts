import { Conversation, Project } from '../../types';
import { BACKUP_FORMAT, BACKUP_VERSION, BackupParseError, BackupPayload, ParsedBackup } from './types';

/** Build the exact payload written to disk. Pure: caller supplies the clock. */
export function buildBackupPayload(
  conversations: Conversation[],
  projects: Project[],
  now: Date = new Date(),
): BackupPayload {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    conversations,
    projects,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** A conversation entry must carry the fields every consumer relies on. */
function isValidConversation(value: unknown): value is Conversation {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.updatedAt === 'string' &&
    Array.isArray(value.messages)
  );
}

/** A project entry must carry the fields the project screens rely on. */
function isValidProject(value: unknown): value is Project {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.systemPrompt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

/**
 * Parse and validate a backup file's JSON text.
 *
 * Malformed individual entries are skipped and counted rather than failing the
 * whole restore: one corrupt conversation must not block the other five hundred.
 * Structural problems (wrong format, newer version, missing arrays) throw,
 * because continuing would silently import garbage.
 */
export function parseBackupJson(json: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new BackupParseError('This file is not valid JSON.');
  }

  if (!isRecord(raw)) {
    throw new BackupParseError('This file is not an Off Grid backup.');
  }
  if (raw.format !== BACKUP_FORMAT) {
    throw new BackupParseError('This file is not an Off Grid backup.');
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    throw new BackupParseError(
      'This backup was made by a newer version of the app. Update the app, then import again.',
    );
  }
  if (!Array.isArray(raw.conversations) || !Array.isArray(raw.projects)) {
    throw new BackupParseError('This backup file is incomplete and cannot be imported.');
  }

  const conversations = raw.conversations.filter(isValidConversation);
  const projects = raw.projects.filter(isValidProject);
  const skippedItems =
    raw.conversations.length - conversations.length + (raw.projects.length - projects.length);

  return {
    payload: {
      format: BACKUP_FORMAT,
      version: raw.version,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      conversations,
      projects,
    },
    skippedItems,
  };
}

export interface MergeOutcome<T> {
  merged: T[];
  added: number;
  updated: number;
}

/**
 * Merge imported entries into existing ones by id: unknown ids are appended,
 * known ids are replaced only when the imported copy is strictly newer by
 * updatedAt. Existing order is preserved so the device's list does not reshuffle.
 * This is the single merge rule for every backed-up collection.
 */
export function mergeById<T extends { id: string; updatedAt: string }>(
  existing: T[],
  imported: T[],
): MergeOutcome<T> {
  const byId = new Map(existing.map((item) => [item.id, item]));
  let added = 0;
  let updated = 0;
  const appended: T[] = [];

  for (const item of imported) {
    const current = byId.get(item.id);
    if (!current) {
      byId.set(item.id, item);
      appended.push(item);
      added += 1;
      continue;
    }
    const currentTime = Date.parse(current.updatedAt);
    const importedTime = Date.parse(item.updatedAt);
    // NaN comparisons are false, so an unparseable timestamp never overwrites.
    if (importedTime > currentTime) {
      byId.set(item.id, item);
      updated += 1;
    }
  }

  const merged = existing.map((item) => byId.get(item.id) as T).concat(appended);
  return { merged, added, updated };
}
