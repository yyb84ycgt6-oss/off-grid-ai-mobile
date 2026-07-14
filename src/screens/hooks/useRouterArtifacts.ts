import { useCallback, useState } from 'react';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { routerArtifactService } from '../../services/routerArtifact';
import type { StoredRouterSummary } from '../../services/routerArtifact/types';
import type { AlertState } from '../../components/CustomAlert';
import { showAlert, hideAlert } from '../../components/CustomAlert';

interface UseRouterArtifactsReturn {
  routerArtifacts: StoredRouterSummary[];
  loadRouterArtifacts: () => Promise<void>;
  handleImportRouterArtifact: () => Promise<StoredRouterSummary | undefined>;
  handleRemoveRouterArtifact: (name: string, setAlertState: (state: AlertState) => void) => void;
}

export function useRouterArtifacts(): UseRouterArtifactsReturn {
  const [routerArtifacts, setRouterArtifacts] = useState<StoredRouterSummary[]>([]);

  const loadRouterArtifacts = useCallback(async () => {
    try {
      const artifacts = await routerArtifactService.list();
      setRouterArtifacts(artifacts);
    } catch (error) {
      console.warn('Failed to load router artifacts:', error);
    }
  }, []);

  const handleImportRouterArtifact = useCallback(async () => {
    try {
      const result = await pick({ type: [types.allFiles] });
      if (!result || result.length === 0) return;
      const file = result[0];
      const summary = await routerArtifactService.import(file);
      await loadRouterArtifacts();
      return summary;
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      throw error;
    }
  }, [loadRouterArtifacts]);

  const handleRemoveRouterArtifact = useCallback(
    (name: string, setAlertState: (state: AlertState) => void) => {
      setAlertState(
        showAlert(
          'Remove Router Artifact',
          `Remove "${name}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: async () => {
                setAlertState(hideAlert());
                try {
                  await routerArtifactService.remove(name);
                  await loadRouterArtifacts();
                  setAlertState(showAlert('Removed', `Router artifact "${name}" was removed.`));
                } catch (error) {
                  setAlertState(showAlert('Error', error instanceof Error ? error.message : 'Failed to remove artifact.'));
                }
              },
            },
          ],
        ),
      );
    },
    [loadRouterArtifacts],
  );

  return {
    routerArtifacts,
    loadRouterArtifacts,
    handleImportRouterArtifact,
    handleRemoveRouterArtifact,
  };
}
