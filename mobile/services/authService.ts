/**
 * CPA Platform — Mobile Auth Service
 */
import { api } from "./apiClient";
import { API_ENDPOINTS } from "@shared/constants";
import { LoginCredentials, AuthTokenResponse, AppUser } from "@shared/types";

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthTokenResponse> => {
    const formData = new URLSearchParams();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, formData.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  },

  getProfile: async (): Promise<AppUser> => {
    const response = await api.get(API_ENDPOINTS.AUTH.ME);
    return response.data;
  },
};
