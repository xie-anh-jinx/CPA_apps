/**
 * CPA Platform — Mobile Navigation Constants
 */

export const ROUTES = {
  AUTH: {
    LOGIN: "/(auth)/login",
  },
  TABS: {
    DASHBOARD: "/(tabs)",
    INVENTORY: "/(tabs)/inventory",
    SALES: "/(tabs)/sales",
    CRM: "/(tabs)/crm",
    AI: "/(tabs)/ai",
  },
  MODULES: {
    DISTRIBUTIONS: "/distributions",
    WAREHOUSE: "/warehouse",
    AGING: "/aging",
    FORECAST: "/forecast",
    REPORTS: "/reports",
    DATABASE_GRAPH: "/database-graph",
    DOCS: "/docs",
    SETTINGS: "/settings",
    SCANNER: "/scanner",
  },
} as const;
