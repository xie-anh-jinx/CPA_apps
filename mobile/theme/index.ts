/**
 * CPA Platform — Mobile Theme & Design Tokens
 */
import { THEME_COLORS } from "@shared/constants";

export const colors = THEME_COLORS;

export type ThemeMode = "dark" | "light" | "system";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const typography = {
  header: {
    fontSize: 22,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: "600" as const,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500" as const,
  },
  body: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  monospace: {
    fontSize: 13,
    fontFamily: "monospace",
  },
};

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};
