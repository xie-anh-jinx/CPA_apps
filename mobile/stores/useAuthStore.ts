/**
 * CPA Platform — Mobile Auth Store (Zustand + Expo SecureStore)
 */
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { AppUser } from "@shared/types";

const TOKEN_KEY = "cpa_auth_token";
const USER_KEY = "cpa_auth_user";

interface AuthState {
  token: string | null;
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  serverUrl: string;
  setToken: (token: string | null) => Promise<void>;
  setUser: (user: AppUser | null) => Promise<void>;
  setServerUrl: (url: string) => Promise<void>;
  login: (token: string, user: AppUser) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  serverUrl: "https://warehouse.pengajaran.com",

  setToken: async (token) => {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
    set({ token, isAuthenticated: !!token });
  },

  setUser: async (user) => {
    if (user) {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } else {
      await SecureStore.deleteItemAsync(USER_KEY);
    }
    set({ user });
  },

  setServerUrl: async (serverUrl) => {
    await SecureStore.setItemAsync("cpa_server_url", serverUrl);
    set({ serverUrl });
  },

  login: async (token, user) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },

  loadStoredAuth: async () => {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(USER_KEY);
      const storedServer = await SecureStore.getItemAsync("cpa_server_url");

      set({
        token: storedToken,
        user: storedUser ? JSON.parse(storedUser) : null,
        serverUrl: storedServer || "https://warehouse.pengajaran.com",
        isAuthenticated: !!storedToken,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },
}));
