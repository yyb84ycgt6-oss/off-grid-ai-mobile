/**
 * useToolbox — thin React projection of the ToolboxService.
 *
 * The View (ToolboxApp) observes this hook and dispatches intents
 * (install/uninstall/run) back to the service. It holds NO authoritative
 * state: the service owns the registry, installed set, and usage log.
 */
import { useSyncExternalStore, useCallback } from 'react';
import { toolboxService } from './toolboxService';
import { ToolboxTool, ToolCategory, ToolResult } from './types';

export function useToolbox() {
  const subscribe = useCallback((cb: () => void) => toolboxService.subscribe(cb), []);
  // The service mutates the same arrays' identities via persistence; snapshot a
  // small version token so re-renders fire on install/usage changes.
  const getSnapshot = useCallback(() => toolboxService.getInstalled().length + ':' + toolboxService.getUsage().length, []);
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const install = useCallback((id: string) => toolboxService.install(id), []);
  const uninstall = useCallback((id: string) => toolboxService.uninstall(id), []);
  const toggleInstall = useCallback((id: string) => toolboxService.toggleInstall(id), []);
  const run = useCallback((id: string, input: string, caller = 'user'): Promise<ToolResult> => toolboxService.run(id, input, caller), []);
  const clearUsage = useCallback(() => toolboxService.clearUsage(), []);

  return {
    all: toolboxService.list() as ToolboxTool[],
    categories: toolboxService.categories() as ToolCategory[],
    installed: toolboxService.getInstalled() as ToolboxTool[],
    usage: toolboxService.getUsage(),
    stats: toolboxService.stats(),
    isInstalled: (id: string) => toolboxService.isInstalled(id),
    byCategory: (c: ToolCategory) => toolboxService.byCategory(c),
    search: (q: string) => toolboxService.search(q),
    get: (id: string) => toolboxService.get(id),
    install,
    uninstall,
    toggleInstall,
    run,
    clearUsage,
  };
}
