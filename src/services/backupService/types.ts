import { Conversation, Project } from '../../types';

/** Identifies a file as an Off Grid backup. */
export const BACKUP_FORMAT = 'offgrid-backup' as const;

/** Highest payload version this build can read. Bump when the shape changes. */
export const BACKUP_VERSION = 1;

/** The on-disk shape of a backup file: one JSON document, no binary parts. */
export interface BackupPayload {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  conversations: Conversation[];
  projects: Project[];
}

/** Outcome of parsing a backup file, before any merge is applied. */
export interface ParsedBackup {
  payload: BackupPayload;
  /** Entries dropped because they were missing required fields. */
  skippedItems: number;
}

/** What an import changed, reported back to the user. */
export interface ImportResult {
  conversationsAdded: number;
  conversationsUpdated: number;
  projectsAdded: number;
  projectsUpdated: number;
  skippedItems: number;
}

/** Thrown when a picked file is not a readable backup. Message is user-presentable. */
export class BackupParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupParseError';
  }
}
