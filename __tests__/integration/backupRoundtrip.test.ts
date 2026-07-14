/**
 * Integration: backup export -> wipe -> import, driven through the REAL
 * backupService, REAL chatStore, and REAL projectStore.
 *
 * Mocks sit only at genuine native boundaries: react-native-fs (wired as an
 * in-memory file system so what exportBackup writes is exactly what
 * importBackupFromFile reads back) and the OS share sheet. Deleting the
 * service or the merge rule fails these tests.
 */

import { Share } from 'react-native';
import RNFS from 'react-native-fs';
import { backupService } from '../../src/services/backupService';
import { BACKUP_FORMAT } from '../../src/services/backupService/types';
import { useChatStore } from '../../src/stores/chatStore';
import { useProjectStore } from '../../src/stores/projectStore';
import { resetStores } from '../utils/testHelpers';
import { createConversation, createMessage } from '../utils/factories';
import { Project } from '../../src/types';

const files = new Map<string, string>();

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj-backup',
  name: 'Field Notes',
  description: 'Personal dataset project',
  systemPrompt: 'You keep field notes.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

describe('backup roundtrip through real stores', () => {
  let shareSpy: jest.SpyInstance;

  beforeEach(() => {
    resetStores();
    files.clear();
    (RNFS.writeFile as jest.Mock).mockImplementation(async (path: string, content: string) => {
      files.set(path, content);
    });
    (RNFS.readFile as jest.Mock).mockImplementation(async (path: string) => {
      if (!files.has(path)) throw new Error(`ENOENT: ${path}`);
      return files.get(path);
    });
    shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
  });

  afterEach(() => {
    shareSpy.mockRestore();
  });

  const seedDevice = () => {
    const conversations = [
      createConversation({
        id: 'conv-1',
        title: 'Trip planning',
        updatedAt: '2026-07-01T10:00:00.000Z',
        messages: [
          createMessage({ role: 'user', content: 'Where should we camp?' }),
          createMessage({ role: 'assistant', content: 'Somewhere off grid.' }),
        ],
      }),
      createConversation({
        id: 'conv-2',
        title: 'Recipes',
        updatedAt: '2026-07-02T10:00:00.000Z',
        messages: [createMessage({ role: 'user', content: 'Bread without an oven?' })],
      }),
    ];
    useChatStore.setState({ conversations, activeConversationId: 'conv-1' });
    useProjectStore.setState({ projects: [makeProject()] });
    return conversations;
  };

  it('exports every conversation and project to one JSON file and opens the share sheet', async () => {
    seedDevice();

    const path = await backupService.exportBackup(new Date('2026-07-14T09:30:05.000Z'));

    expect(path).toBe('/mock/caches/offgrid-backup-2026-07-14T09-30-05.json');
    const written = JSON.parse(files.get(path) as string);
    expect(written.format).toBe(BACKUP_FORMAT);
    expect(written.conversations).toHaveLength(2);
    expect(written.conversations[0].messages[0].content).toBe('Where should we camp?');
    expect(written.projects).toHaveLength(1);
    expect(shareSpy).toHaveBeenCalledWith({ url: `file://${path}` });
  });

  it('defaults to the device clock when no export time is supplied', async () => {
    seedDevice();

    const path = await backupService.exportBackup();

    expect(path).toMatch(/^\/mock\/caches\/offgrid-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/);
    expect(files.has(path)).toBe(true);
  });

  it('restores a wiped device from the exported file, byte for byte', async () => {
    seedDevice();
    const path = await backupService.exportBackup(new Date('2026-07-14T09:30:05.000Z'));

    // Simulate the new / wiped device.
    useChatStore.getState().clearAllConversations();
    useProjectStore.setState({ projects: [] });
    expect(useChatStore.getState().conversations).toHaveLength(0);

    const result = await backupService.importBackupFromFile(`file://${path}`, 'offgrid-backup.json');

    expect(result).toEqual({
      conversationsAdded: 2,
      conversationsUpdated: 0,
      projectsAdded: 1,
      projectsUpdated: 0,
      skippedItems: 0,
    });
    const restored = useChatStore.getState().conversations;
    expect(restored.map((c) => c.id).sort()).toEqual(['conv-1', 'conv-2']);
    expect(restored.find((c) => c.id === 'conv-1')?.messages[1].content).toBe('Somewhere off grid.');
    expect(useProjectStore.getState().projects[0].name).toBe('Field Notes');
  });

  it('does not clobber a conversation the device has edited more recently than the backup', async () => {
    seedDevice();
    const path = await backupService.exportBackup(new Date('2026-07-14T09:30:05.000Z'));

    // The device keeps living: conv-1 gains a newer local edit after the export.
    useChatStore.setState({
      conversations: useChatStore.getState().conversations.map((c) =>
        c.id === 'conv-1'
          ? { ...c, title: 'Trip planning (edited on device)', updatedAt: '2026-07-10T10:00:00.000Z' }
          : c,
      ),
    });

    const result = await backupService.importBackupFromFile(`file://${path}`, 'offgrid-backup.json');

    const conv1 = useChatStore.getState().conversations.find((c) => c.id === 'conv-1');
    expect(conv1?.title).toBe('Trip planning (edited on device)');
    expect(result.conversationsUpdated).toBe(0);
    expect(result.conversationsAdded).toBe(0);
  });

  it('overwrites a stale local copy when the backup holds the newer version', async () => {
    seedDevice();
    const path = await backupService.exportBackup(new Date('2026-07-14T09:30:05.000Z'));

    // Roll conv-2 back locally, as if this device missed edits made elsewhere.
    useChatStore.setState({
      conversations: useChatStore.getState().conversations.map((c) =>
        c.id === 'conv-2' ? { ...c, title: 'Recipes (stale)', updatedAt: '2026-06-01T00:00:00.000Z' } : c,
      ),
    });

    const result = await backupService.importBackupFromFile(`file://${path}`, 'offgrid-backup.json');

    expect(useChatStore.getState().conversations.find((c) => c.id === 'conv-2')?.title).toBe('Recipes');
    expect(result.conversationsUpdated).toBe(1);
  });

  it('rejects a non-backup file and leaves both stores untouched', async () => {
    seedDevice();
    files.set('/mock/caches/random.json', JSON.stringify({ hello: 'world' }));
    const before = useChatStore.getState().conversations;

    await expect(
      backupService.importBackupFromFile('file:///mock/caches/random.json', 'random.json'),
    ).rejects.toThrow('This file is not an Off Grid backup.');

    expect(useChatStore.getState().conversations).toBe(before);
    expect(useProjectStore.getState().projects).toHaveLength(1);
  });

  it('reports skipped counts for corrupt entries while importing the rest', async () => {
    useChatStore.setState({ conversations: [], activeConversationId: null });
    useProjectStore.setState({ projects: [] });
    const good = createConversation({ id: 'ok-1', updatedAt: '2026-07-01T00:00:00.000Z' });
    files.set(
      '/mock/caches/partial.json',
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: 1,
        exportedAt: '2026-07-14T00:00:00.000Z',
        conversations: [good, { id: 42, corrupt: true }],
        projects: [],
      }),
    );

    const result = await backupService.importBackupFromFile('file:///mock/caches/partial.json', 'partial.json');

    expect(result.conversationsAdded).toBe(1);
    expect(result.skippedItems).toBe(1);
    expect(useChatStore.getState().conversations.map((c) => c.id)).toEqual(['ok-1']);
  });

  it('nulls the active conversation when a restore replaces it, and keeps it when it survives', () => {
    const a = createConversation({ id: 'keep-me', updatedAt: '2026-07-01T00:00:00.000Z' });
    useChatStore.setState({ conversations: [a], activeConversationId: 'keep-me' });

    useChatStore.getState().replaceConversations([a]);
    expect(useChatStore.getState().activeConversationId).toBe('keep-me');

    useChatStore.getState().replaceConversations([]);
    expect(useChatStore.getState().activeConversationId).toBeNull();

    // Already-null stays null (the falsy side of the survival check).
    useChatStore.getState().replaceConversations([a]);
    expect(useChatStore.getState().activeConversationId).toBeNull();
  });
});
