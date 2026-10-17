/**
 * CPA Platform — Shared Validation Schemas (Zod)
 */
import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const crmActivitySchema = z.object({
  id_customer: z.string().min(1, "Customer wajib dipilih"),
  tipe_aktivitas: z.enum(["kunjungan", "telepon", "email", "penawaran", "meeting"]),
  catatan: z.string().min(3, "Catatan minimal 3 karakter"),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type CRMActivityFormData = z.infer<typeof crmActivitySchema>;

export const dateRangeFilterSchema = z.object({
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  status: z.string().optional(),
  id_gudang: z.string().optional(),
});

export type DateRangeFilter = z.infer<typeof dateRangeFilterSchema>;

export const serverSettingsSchema = z.object({
  apiUrl: z.string().url("Format URL server tidak valid"),
  wsUrl: z.string().optional(),
  enableOfflineCache: z.boolean().default(true),
  enablePushNotifications: z.boolean().default(true),
});

export type ServerSettingsData = z.infer<typeof serverSettingsSchema>;
