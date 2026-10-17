/**
 * CPA Platform — Mobile Background Sync Service
 */
import { useOfflineStore, SyncAction } from "../stores/useOfflineStore";
import { customerService } from "./customerService";

export const offlineSyncService = {
  syncQueue: async () => {
    const { queue, removeFromQueue, isSyncing } = useOfflineStore.getState();
    if (isSyncing || queue.length === 0) return;

    useOfflineStore.setState({ isSyncing: true });

    for (const action of queue) {
      try {
        if (action.type === "CREATE_CRM_ACTIVITY") {
          await customerService.createActivity(action.payload as any);
          await removeFromQueue(action.id);
        }
      } catch (err) {
        console.warn(`Gagal sync action ${action.id}, akan dicoba ulang nanti:`, err);
      }
    }

    useOfflineStore.setState({ isSyncing: false });
  },
};
