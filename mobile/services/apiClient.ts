/**
 * CPA Platform — Mobile API Client (Axios + SecureStore)
 */
import axios from "axios";
import { useAuthStore } from "../stores/useAuthStore";

export const createApiClient = () => {
  const instance = axios.create({
    timeout: 25000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  instance.interceptors.request.use(async (config) => {
    const { token, serverUrl } = useAuthStore.getState();
    if (serverUrl && !config.baseURL) {
      config.baseURL = serverUrl.replace(/\/+$/, "");
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        await useAuthStore.getState().logout();
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

export const api = createApiClient();
