/**
 * CPA Platform — Mobile Report Service (FileSystem + Sharing)
 */
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useAuthStore } from "../stores/useAuthStore";

export const reportService = {
  downloadAndShareReport: async (
    endpoint: string,
    filename: string
  ): Promise<boolean> => {
    try {
      const { serverUrl, token } = useAuthStore.getState();
      const downloadUrl = `${serverUrl.replace(/\/+$/, "")}${endpoint}`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      const downloadRes = await FileSystem.downloadAsync(downloadUrl, fileUri, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (downloadRes.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadRes.uri);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Gagal mendownload laporan:", err);
      return false;
    }
  },
};
