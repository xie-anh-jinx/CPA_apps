/**
 * CPA Platform — Mobile Intelligence & C3 Main Dashboard
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../../components/common/Header";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { intelligenceService } from "../../services/intelligenceService";
import { useQuery } from "@tanstack/react-query";
import { formatRupiah, formatNumber } from "../../utils/formatters";
import {
  Gauge,
  PieChart,
  Award,
  Users,
  TrendingUp,
  Sparkles,
  Layers,
  Activity,
  CheckCircle,
  AlertTriangle,
} from "lucide-react-native";

export default function IntelligenceScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const [activeTab, setActiveTab] = useState<"c3" | "analytics" | "sales">("c3");

  const {
    data: c3Data,
    isLoading: loadingC3,
    refetch: refetchC3,
    isFetching: fetchingC3,
  } = useQuery({
    queryKey: ["intelligence", "c3"],
    queryFn: () => intelligenceService.getMainDashboard(),
  });

  const {
    data: overview,
    isLoading: loadingOverview,
    refetch: refetchOverview,
    isFetching: fetchingOverview,
  } = useQuery({
    queryKey: ["intelligence", "overview"],
    queryFn: () => intelligenceService.getOverview(),
  });

  const {
    data: salesPerf,
    isLoading: loadingSales,
    refetch: refetchSales,
    isFetching: fetchingSales,
  } = useQuery({
    queryKey: ["intelligence", "sales-performance"],
    queryFn: () => intelligenceService.getSalesPerformance(),
  });

  const isRefreshing = fetchingC3 || fetchingOverview || fetchingSales;
  const onRefresh = async () => {
    await Promise.all([refetchC3(), refetchOverview(), refetchSales()]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title="Intelligence & C3"
        subtitle="Picture of Success & Operasional Enterprise"
      />

      {/* Tabs */}
      <View style={[styles.tabBarWrap, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => setActiveTab("c3")}
            style={[styles.tabItem, activeTab === "c3" && styles.tabActive]}
          >
            <Gauge size={16} color={activeTab === "c3" ? "#0ea5e9" : theme.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === "c3" ? "#0ea5e9" : theme.textSecondary }]}>
              Main Dashboard (C3)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("analytics")}
            style={[styles.tabItem, activeTab === "analytics" && styles.tabActive]}
          >
            <PieChart size={16} color={activeTab === "analytics" ? "#0ea5e9" : theme.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === "analytics" ? "#0ea5e9" : theme.textSecondary }]}>
              Picture of Success
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("sales")}
            style={[styles.tabItem, activeTab === "sales" && styles.tabActive]}
          >
            <Award size={16} color={activeTab === "sales" ? "#0ea5e9" : theme.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === "sales" ? "#0ea5e9" : theme.textSecondary }]}>
              Sales Performance
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {/* ================= TAB 1: C3 DASHBOARD ================= */}
        {activeTab === "c3" && (
          <View>
            {loadingC3 ? (
              <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 30 }} />
            ) : (
              <>
                {/* Health & Operations Summary */}
                <View style={styles.kpiGrid}>
                  <Card style={styles.kpiCard}>
                    <Activity size={20} color="#0ea5e9" style={{ marginBottom: 6 }} />
                    <Text style={[styles.kpiVal, { color: theme.textPrimary }]}>
                      {c3Data?.operational_rate ?? "98.4%"}
                    </Text>
                    <Text style={[styles.kpiSub, { color: theme.textSecondary }]}>
                      Operational Uptime
                    </Text>
                  </Card>

                  <Card style={styles.kpiCard}>
                    <Sparkles size={20} color="#10b981" style={{ marginBottom: 6 }} />
                    <Text style={[styles.kpiVal, { color: "#10b981" }]}>Active</Text>
                    <Text style={[styles.kpiSub, { color: theme.textSecondary }]}>
                      AI Engine & Sync Status
                    </Text>
                  </Card>
                </View>

                {/* Modules Status Summary */}
                <Card style={styles.sectionCard}>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                    Status Pilar Operasional (C3 Architecture)
                  </Text>

                  <View style={styles.statusRow}>
                    <View style={styles.statusLeft}>
                      <View style={[styles.statusDot, { backgroundColor: "#10b981" }]} />
                      <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>Logistik & Distribusi</Text>
                    </View>
                    <Badge status="success" label="Optimal" />
                  </View>

                  <View style={styles.statusRow}>
                    <View style={styles.statusLeft}>
                      <View style={[styles.statusDot, { backgroundColor: "#0ea5e9" }]} />
                      <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>Monitoring Stok Gudang</Text>
                    </View>
                    <Badge status="normal" label="Tersinkron" />
                  </View>

                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: "#f59e0b" }]} />
                    <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>Cost Variance Audit</Text>
                    <Badge status="warning" label="Review Pending" />
                  </View>

                  <View style={styles.statusRow}>
                    <View style={styles.statusLeft}>
                      <View style={[styles.statusDot, { backgroundColor: "#10b981" }]} />
                      <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>CRM & Pipeline Sales</Text>
                    </View>
                    <Badge status="success" label="Active" />
                  </View>
                </Card>

                {/* AI Assistant Quick Prompt Box */}
                <Card style={styles.aiBox}>
                  <View style={styles.aiHead}>
                    <Sparkles size={20} color="#0ea5e9" />
                    <Text style={[styles.aiTitle, { color: theme.textPrimary }]}>
                      PADI AI Executive Summary
                    </Text>
                  </View>
                  <Text style={[styles.aiDesc, { color: theme.textSecondary }]}>
                    Gunakan PADI AI untuk mengevaluasi efisiensi pengiriman antar cabang,
                    menganalisis forecast permintaan produk, atau menghitung potensi resiko piutang.
                  </Text>
                  <TouchableOpacity
                    style={[styles.aiBtn, { backgroundColor: "#0ea5e9" }]}
                    onPress={() => router.push("/(tabs)/ai")}
                  >
                    <Text style={styles.aiBtnText}>Buka Chat PADI AI ➔</Text>
                  </TouchableOpacity>
                </Card>
              </>
            )}
          </View>
        )}

        {/* ================= TAB 2: PICTURE OF SUCCESS ================= */}
        {activeTab === "analytics" && (
          <View>
            {loadingOverview ? (
              <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 30 }} />
            ) : (
              <>
                <Card style={styles.sectionCard}>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                    Overview Pertumbuhan Bisnis (KITA Analytics)
                  </Text>
                  <Text style={[styles.overviewSub, { color: theme.textSecondary }]}>
                    Data konsolidasi performa penjualan dan penetrasi pasar.
                  </Text>

                  <View style={styles.metricGrid}>
                    <View style={styles.metricCol}>
                      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Total Revenue</Text>
                      <Text style={[styles.metricVal, { color: theme.textPrimary }]}>
                        {formatRupiah(overview?.total_revenue || overview?.omzet || 0)}
                      </Text>
                    </View>
                    <View style={styles.metricCol}>
                      <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Total Klien Aktif</Text>
                      <Text style={[styles.metricVal, { color: "#0ea5e9" }]}>
                        {overview?.active_customers ?? 0} Customer
                      </Text>
                    </View>
                  </View>
                </Card>
              </>
            )}
          </View>
        )}

        {/* ================= TAB 3: SALES PERFORMANCE ================= */}
        {activeTab === "sales" && (
          <View>
            {loadingSales ? (
              <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 30 }} />
            ) : (
              <>
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
                  Peringkat Capaian Sales Person
                </Text>

                {Array.isArray(salesPerf) && salesPerf.length > 0 ? (
                  salesPerf.map((s: any, idx: number) => (
                    <Card key={idx} style={styles.salesCard}>
                      <View style={styles.salesHeader}>
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankText}>#{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.salesName, { color: theme.textPrimary }]}>
                            {s.nama_sales || s.sales_name || "Sales Person"}
                          </Text>
                          <Text style={[styles.salesArea, { color: theme.textSecondary }]}>
                            Area: {s.area || "Nasional"} • {s.total_order || 0} Order
                          </Text>
                        </View>
                        <Text style={[styles.salesOmzet, { color: "#0ea5e9" }]}>
                          {formatRupiah(s.total_omzet || s.omzet || 0)}
                        </Text>
                      </View>
                    </Card>
                  ))
                ) : (
                  <Card style={styles.emptyCard}>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                      Data performa sales belum tersedia.
                    </Text>
                  </Card>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBarWrap: { borderBottomWidth: 1 },
  tabBar: { flexDirection: "row" },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: "#0ea5e9",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    padding: 14,
    marginBottom: 0,
  },
  kpiVal: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 11,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  aiBox: {
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#0ea5e9",
  },
  aiHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  aiDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  aiBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  aiBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  overviewSub: {
    fontSize: 12,
    marginBottom: 14,
  },
  metricGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 15,
    fontWeight: "800",
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  salesCard: {
    padding: 14,
    marginBottom: 10,
  },
  salesHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(14, 165, 233, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    color: "#0ea5e9",
    fontWeight: "800",
    fontSize: 12,
  },
  salesName: {
    fontSize: 13,
    fontWeight: "700",
  },
  salesArea: {
    fontSize: 11,
    marginTop: 2,
  },
  salesOmzet: {
    fontSize: 13,
    fontWeight: "800",
  },
  emptyCard: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
  },
});
