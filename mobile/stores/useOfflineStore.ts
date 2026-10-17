/**
 * CPA Platform — Mobile Offline Sync Store
 */
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SyncAction {
  id: string;
  type: "CREATE_CRM_ACTIVITY" | "CONFIRM_DO_RECEIPT" | "RESOLVE_ALERT";
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

interface OfflineState {
  isOnline: boolean;
  queue: SyncAction[];
  isSyncing: boolean;
  setIsOnline: (status: boolean) => void;
  addToQueue: (action: Omit<SyncAction, "id" | "createdAt" | "retryCount">) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  loadQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
}

const QUEUE_STORAGE_KEY = "cpa_offline_sync_queue";

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: true,
  queue: [],
  isSyncing: false,

  setIsOnline: (isOnline) => set({ isOnline }),

  addToQueue: async (action) => {
    const newAction: SyncAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    const updated = [...get().queue, newAction];
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
    set({ queue: updated });
  },

  removeFromQueue: async (id) => {
    const updated = get().queue.filter((a) => a.id !== id);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
    set({ queue: updated });
  },

  loadQueue: async () => {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        set({ queue: JSON.parse(stored) });
      }
    } catch {
      set({ queue: [] });
    }
  },

  clearQueue: async () => {
    await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    set({ queue: [] });
  },
}));
