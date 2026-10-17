/**
 * CPA Platform — Mobile AI Chat & MCP Service
 */
import { api } from "./apiClient";
import { API_ENDPOINTS } from "@shared/constants";
import { ChatMessage } from "@shared/types";

export const aiChatService = {
  sendMessage: async (payload: {
    messages: { role: string; content: string }[];
    context?: Record<string, unknown>;
  }): Promise<{ content: string; tool_calls?: any[] }> => {
    try {
      const res = await api.post(API_ENDPOINTS.AI.CHAT, {
        ...payload,
        stream: false,
      });
      return res.data;
    } catch {
      // Demo fallback if backend is offline
      return {
        content:
          "Halo! Saya PADI AI Assistant untuk CPA Analytics. Saya dapat membantu analisis data penjualan, pemantauan stok gudang, dan status pengiriman DO secara real-time.",
      };
    }
  },

  listMCPTools: async () => {
    const res = await api.post(API_ENDPOINTS.AI.MCP_TOOLS, {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    });
    return res.data?.result?.tools || [];
  },
};
