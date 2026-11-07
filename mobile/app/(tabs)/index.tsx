/**
 * CPA Platform — Mobile Executive Dashboard
 * Feature-complete mirror of CPA Analytics Executive Web Dashboard.
 * Connected to live FastAPI backend ERP database.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "../../components/common/Header";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { salesService } from "../../services/salesService";
import { inventoryService } from "../../services/inventoryService";
import { distributionService } from "../../services/distributionService";
import { financeService } from "../../services/financeService";
import { intelligenceService } from "../../services/intelligenceService";
import { formatRupiah, formatNumber, formatDate } from "../../utils/formatters";
import {
  TrendingUp,
  Package,
  Truck,
  AlertTriangle,
  QrCode,
  FileText,
  Clock,
  Layers,
  Database,
  LineChart,
  CircleDollarSign,
  Scale,
  Gauge,
  Sparkles,
  Users,
  ChevronRight,
  Receipt,
  FileSpreadsheet,
} from "lucide-react-native";

export default function DashboardScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  // Real Queries from Single Source of Truth Backend
  const { data: sales, refetch: refetchSales, isLoading: loadingSales } = useQuery({
    queryKey: ["dashboard", "sales"],
    queryFn: () => salesService.getSummary(),
  });

  const { data: inv, refetch: refetchInv, isLoading: loadingInv } = useQuery({
    queryKey: ["dashboard", "inventory"],
    queryFn: () => inventoryService.getSummary(),
  });

  const { data: dist, refetch: refetchDist, isLoading: loadingDist } = useQuery({
    queryKey: ["dashboard", "distributions"],
    queryFn: () => distributionService.getSummary(),
  });

  const { data: finKpi, refetch: refetchFin, isLoading: loadingFin } = useQuery({
    queryKey: ["dashboard", "finance-kpi"],
    queryFn: () => financeService.getExecutiveKPI(),
  });

  const { data: recentTx, refetch: refetchRecent, isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard", "recent-transactions"],
    queryFn: () => intelligenceService.getRecentTransactions(5),
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchSales(),
      refetchInv(),
      refetchDist(),
      refetchFin(),
      refetchRecent(),
    ]);
    setRefreshing(false);
  };

  const isLoading = loadingSales || loadingInv || loadingDist || loadingFin;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title="CPA Executive"
        subtitle="Monitoring Terpadu Operasional, Stok & Keuangan"
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* PADI AI Smart Prompt Banner */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/(tabs)/ai")}
          style={[styles.aiBanner, { backgroundColor: theme.surface, borderColor: "#0ea5e9" }]}
        >
          <View style={styles.aiBannerLeft}>
            <View style={styles.aiIconBadge}>
              <Sparkles size={18} color="#0ea5e9" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.aiBannerTitle, { color: theme.textPrimary }]}>
                Tanya CPA AI Executive Assistant
              </Text>
              <Text style={[styles.aiBannerDesc, { color: theme.textSecondary }]}>
                Analisis anomali biaya logistik, status stok kritis, atau laporan piutang.
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={theme.textMuted} />
        </TouchableOpacity>

        {/* Executive KPI Summary 6-Card Grid */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Ringkasan Metrik Eksekutif
        </Text>

        <View style={styles.kpiGrid}>
          {/* 1. Omzet Penjualan */}
          <Card style={styles.kpiCard}>
            <View style={[styles.iconPill, { backgroundColor: "rgba(14, 165, 233, 0.15)" }]}>
              <TrendingUp size={20} color="#0ea5e9" />
            </View>
            <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
              {formatRupiah(sales?.total_omzet || 0)}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Total Omzet Penjualan</Text>
          </Card>

          {/* 2. Piutang (AR Outstanding) */}
          <Card style={styles.kpiCard}>
            <View style={[styles.iconPill, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
              <CircleDollarSign size={20} color="#ef4444" />
            </View>
            <Text style={[styles.kpiValue, { color: "#ef4444" }]}>
              {formatRupiah(sales?.ar_outstanding_total || 0)}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Piutang Tertagih (AR)</Text>
          </Card>

          {/* 3. Total Stok SKU */}
          <Card style={styles.kpiCard}>
            <View style={[styles.iconPill, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Package size={20} color="#10b981" />
            </View>
            <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
              {formatNumber(inv?.total_quantity || 0)} Unit
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>
              Persediaan ({inv?.total_sku || 0} SKU)
            </Text>
          </Card>

          {/* 4. Biaya Logistik & Ongkir (Finance) */}
          <Card style={styles.kpiCard}>
            <View style={[styles.iconPill, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
              <Scale size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.kpiValue, { color: "#f59e0b" }]}>
              {formatRupiah(finKpi?.total_shipping_cost || 0)}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>
              Ongkir (Var {finKpi?.total_variance_pct?.toFixed(1) || 0}%)
            </Text>
          </Card>

          {/* 5. DO Sedang Kirim */}
          <Card style={styles.kpiCard}>
            <View style={[styles.iconPill, { backgroundColor: "rgba(99, 102, 241, 0.15)" }]}>
              <Truck size={20} color="#818cf8" />
            </View>
            <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
              {dist?.send ?? dist?.in_transit ?? 0} DO
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Surat Jalan (In-Transit)</Text>
          </Card>

          {/* 6. Stok Kritis / Menipis */}
          <Card style={styles.kpiCard}>
            <View style={[styles.iconPill, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
              <AlertTriangle size={20} color="#ef4444" />
            </View>
            <Text style={[styles.kpiValue, { color: "#ef4444" }]}>
              {inv?.low_stock_count || 0} SKU
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Stok Kritis / Reorder</Text>
          </Card>
        </View>

        {/* Modul Enterprise Quick Hub */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Akses Seluruh Modul Web di Mobile
        </Text>

        <View style={styles.shortcutsGrid}>
          {/* Finance ERP (Baru!) */}
          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: "#0ea5e9" }]}
            onPress={() => router.push("/finance" as any)}
          >
            <Scale size={24} color="#0ea5e9" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary, fontWeight: "700" }]}>
              Finance & Cost
            </Text>
            <View style={[styles.hubBadge, { backgroundColor: "rgba(14, 165, 233, 0.15)" }]}>
              <Text style={[styles.hubBadgeText, { color: "#0ea5e9" }]}>ERP Live</Text>
            </View>
          </TouchableOpacity>

          {/* Intelligence C3 (Baru!) */}
          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/intelligence" as any)}
          >
            <Gauge size={24} color="#8b5cf6" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>
              Intelligence C3
            </Text>
            <Text style={[styles.hubSub, { color: theme.textMuted }]}>Success Metric</Text>
          </TouchableOpacity>

          {/* Surat Jalan (DO) */}
          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/distributions")}
          >
            <Truck size={24} color="#0ea5e9" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>
              Surat Jalan (DO)
            </Text>
            <Text style={[styles.hubSub, { color: theme.textMuted }]}>
              {dist?.total_do || 0} Total
            </Text>
          </TouchableOpacity>

          {/* Barcode Scanner */}
          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/scanner")}
          >
            <QrCode size={24} color="#10b981" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>
              Scan Barcode
            </Text>
            <Text style={[styles.hubSub, { color: theme.textMuted }]}>Kamera Live</Text>
          </TouchableOpacity>

          {/* Multi Gudang (3D) */}
          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/warehouse")}
          >
            <Layers size={24} color="#f59e0b" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>
              Multi Gudang
            </Text>
            <Text style={[styles.hubSub, { color: theme.textMuted }]}>Denah & Rak</Text>
          </TouchableOpacity>

          {/* FIFO Aging */}
          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/aging")}
          >
            <Clock size={24} color="#ec4899" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>
              FIFO Aging
            </Text>
            <Text style={[styles.hubSub, { color: theme.textMuted }]}>Holding Cost</Text>
          </TouchableOpacity>

          {/* Forecasting */}
          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/forecast")}
          >
            <LineChart size={24} color="#a855f7" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>
              Forecasting
            </Text>
            <Text style={[styles.hubSub, { color: theme.textMuted }]}>AI Demand</Text>
          </TouchableOpacity>

          {/* Unduh Laporan */}
          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/reports")}
          >
            <FileSpreadsheet size={24} color="#06b6d4" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>
              Laporan AR
            </Text>
            <Text style={[styles.hubSub, { color: theme.textMuted }]}>Excel Export</Text>
          </TouchableOpacity>

          {/* Database Graph */}
          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/database-graph")}
          >
            <Database size={24} color="#64748b" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>
              Database Graph
            </Text>
            <Text style={[styles.hubSub, { color: theme.textMuted }]}>Relasi Tabel</Text>
          </TouchableOpacity>
        </View>

        {/* Live Recent Transactions Feed */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 0 }]}>
            Transaksi Faktur Terkini
          </Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/sales")}>
            <Text style={[styles.viewAllLink, { color: "#0ea5e9" }]}>Lihat Semua ➔</Text>
          </TouchableOpacity>
        </View>

        {loadingRecent ? (
          <ActivityIndicator size="small" color="#0ea5e9" style={{ marginVertical: 14 }} />
        ) : Array.isArray(recentTx) && recentTx.length > 0 ? (
          recentTx.map((tx: any, idx: number) => (
            <Card key={idx} style={styles.txCard}>
              <View style={styles.txHeader}>
                <View style={styles.txNoWrap}>
                  <Text style={styles.txNo}>{tx.no_faktur || `INV-${idx + 1}`}</Text>
                  <Text style={[styles.txDate, { color: theme.textMuted }]}>
                    {formatDate(tx.tanggal)}
                  </Text>
                </View>
                <Badge
                  status={tx.is_lunas ? "success" : "warning"}
                  label={tx.is_lunas ? "Lunas" : tx.status_label || "Belum Lunas"}
                />
              </View>

              <Text style={[styles.txCustomer, { color: theme.textPrimary }]}>
                {tx.nama_customer || "Customer"}
              </Text>

              <View style={styles.txBottom}>
                <Text style={[styles.txDo, { color: theme.textSecondary }]}>
                  {tx.no_do ? `DO: ${tx.no_do}` : "DO: -"}
                </Text>
                <Text style={[styles.txAmount, { color: theme.textPrimary }]}>
                  {formatRupiah(tx.grandtotal || 0)}
                </Text>
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Belum ada data transaksi terkini.
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 36,
  },
  aiBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  aiBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  aiIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(14, 165, 233, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  aiBannerDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: "600",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  kpiCard: {
    width: "48%",
    padding: 12,
    marginBottom: 0,
  },
  iconPill: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 11,
  },
  shortcutsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  shortcutItem: {
    width: "31%",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  hubSub: {
    fontSize: 10,
    textAlign: "center",
  },
  hubBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginTop: 2,
  },
  hubBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  txCard: {
    padding: 12,
    marginBottom: 8,
  },
  txHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  txNoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  txNo: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0ea5e9",
    fontFamily: "monospace",
  },
  txDate: {
    fontSize: 11,
  },
  txCustomer: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  txBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.12)",
    paddingTop: 6,
    marginTop: 2,
  },
  txDo: {
    fontSize: 11,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: "800",
  },
  emptyCard: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
  },
});
