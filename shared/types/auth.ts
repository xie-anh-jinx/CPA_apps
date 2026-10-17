/**
 * CPA Platform — Shared Auth Types
 */

export type UserRole =
  | "admin"
  | "superadmin"
  | "manager"
  | "sales"
  | "sales_rep"
  | "warehouse"
  | "warehouse_staff"
  | "viewer";

export interface AppUser {
  id?: number | string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  id_pegawai?: string | null;
  id_gudang_access?: string | null;
  is_active?: boolean;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  user?: AppUser;
}

export interface LoginCredentials {
  username: string;
  password: string;
}
