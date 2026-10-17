/**
 * CPA Platform — Mobile Executive Dashboard
 */
import React from "react";
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
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { salesService } from "../../services/salesService";
import { inventoryService } from "../../services/inventoryService";
import { distributionService } from "../../services/distributionService";
import { formatRupiah, formatNumber } from "../../utils/formatters";
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
} from "lucide-react-native";

export default function DashboardScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

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

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSales(), refetchInv(), refetchDist()]);
    setRefreshing(false);
  };

  const isLoading = loadingSales || loadingInv || loadingDist;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="CPA Executive" subtitle="Monitoring Operasional Real-time" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* KPI Summary Cards */}
        <View style={styles.kpiGrid}>
          {/* Omzet Penjualan */}
          <Card style={styles.kpiCard}>
            <View style={[styles.iconPill, { backgroundColor: "rgba(14, 165, 233, 0.15)" }]}>
              <TrendingUp size={20} color="#0ea5e9" />
            </View>
            <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
              {formatRupiah(sales?.total_omzet || 0)}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Total Penjualan</Text>
          </Card>

          {/* Total Stok SKU */}
          <Card style={styles.kpiCard}>
            <View style={[styles.iconPill, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
              <Package size={20} color="#10b981" />
            </View>
            <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
              {formatNumber(inv?.total_quantity || 0)} Unit
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>
              Total Persediaan ({inv?.total_sku || 0} SKU)
            </Text>
          </Card>

          {/* DO Sedang Kirim */}
          <Card style={styles.kpiCard}>
            <View style={[styles.iconPill, { backgroundColor: "rgba(99, 102, 241, 0.15)" }]}>
              <Truck size={20} color="#818cf8" />
            </View>
            <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
              {dist?.send || dist?.in_transit || 0} DO
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Surat Jalan (Send)</Text>
          </Card>

          {/* Stok Kritis */}
          <Card style={styles.kpiCard}>
            <View style={[styles.iconPill, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
              <AlertTriangle size={20} color="#ef4444" />
            </View>
            <Text style={[styles.kpiValue, { color: "#ef4444" }]}>
              {inv?.low_stock_count || 0} SKU
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Stok Kritis / Menipis</Text>
          </Card>
        </View>

        {/* Quick Actions Shortcuts */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Akses Cepat & Navigasi Modul
        </Text>

        <View style={styles.shortcutsGrid}>
          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/distributions")}
          >
            <Truck size={22} color="#0ea5e9" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>Surat Jalan (DO)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/scanner")}
          >
            <QrCode size={22} color="#10b981" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>Scan Barcode</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/warehouse")}
          >
            <Layers size={22} color="#f59e0b" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>Gudang (3D)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/aging")}
          >
            <Clock size={22} color="#ec4899" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>FIFO Aging</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/forecast")}
          >
            <LineChart size={22} color="#8b5cf6" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>Forecasting</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/reports")}
          >
            <FileText size={22} color="#06b6d4" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>Unduh Laporan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shortcutItem, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push("/database-graph")}
          >
            <Database size={22} color="#64748b" />
            <Text style={[styles.shortcutLabel, { color: theme.textPrimary }]}>Database Graph</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 32,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    width: "48%",
    padding: 14,
    marginBottom: 0,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
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
    gap: 6,
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
});
