import { Share } from 'react-native';
import RNFS from 'react-native-fs';
import { useChatStore } from '../../stores/chatStore';
import { useProjectStore } from '../../stores/projectStore';
import { resolvePickedFileUri } from '../../utils/resolvePickedFileUri';
import logger from '../../utils/logger';
import { buildBackupPayload, mergeById, parseBackupJson } from './serialize';
import { ImportResult } from './types';

export { BackupParseError, BACKUP_FORMAT, BACKUP_VERSION } from './types';
export type { BackupPayload, ImportResult } from './types';

/** file-safe timestamp: 2026-07-14T09-30-05 */
function fileTimestamp(now: Date): string {
  return now.toISOString().slice(0, 19).replaceAll(':', '-');
}

/**
 * Owns backup and restore of the user's data sets: conversations and projects.
 * Serialization, validation, and the merge rule live in ./serialize (pure);
 * this layer does the file and share-sheet I/O and applies merges to the stores.
 */
export const backupService = {
  /**
   * Write every conversation and project to a single JSON file in the cache
   * directory and hand it to the OS share sheet. The user chooses where it
   * goes (Files, iCloud Drive, Google Drive, OneDrive, AirDrop); the app
   * itself uploads nothing.
   */
  async exportBackup(now: Date = new Date()): Promise<string> {
    const payload = buildBackupPayload(
      useChatStore.getState().conversations,
      useProjectStore.getState().projects,
      now,
    );
    const path = `${RNFS.CachesDirectoryPath}/offgrid-backup-${fileTimestamp(now)}.json`;
    await RNFS.writeFile(path, JSON.stringify(payload), 'utf8');
    logger.log(`[BACKUP] exported ${payload.conversations.length} conversations, ${payload.projects.length} projects to ${path}`);
    // Same share mechanism the gallery uses for image export.
    await Share.share({ url: `file://${path}` });
    return path;
  },

  /**
   * Read a picked backup file, validate it, and merge it into the stores.
   * Unknown ids are added; known ids are replaced only when the backup copy
   * is newer. Nothing on the device is deleted by an import.
   */
  async importBackupFromFile(uri: string, fileName: string): Promise<ImportResult> {
    const path = await resolvePickedFileUri(uri, fileName);
    const json = await RNFS.readFile(path, 'utf8');
    const { payload, skippedItems } = parseBackupJson(json);

    const conversations = mergeById(useChatStore.getState().conversations, payload.conversations);
    const projects = mergeById(useProjectStore.getState().projects, payload.projects);

    useChatStore.getState().replaceConversations(conversations.merged);
    useProjectStore.getState().replaceProjects(projects.merged);

    logger.log(`[BACKUP] import applied: +${conversations.added}/${conversations.updated} conversations, +${projects.added}/${projects.updated} projects, ${skippedItems} skipped`);
    return {
      conversationsAdded: conversations.added,
      conversationsUpdated: conversations.updated,
      projectsAdded: projects.added,
      projectsUpdated: projects.updated,
      skippedItems,
    };
  },
};
