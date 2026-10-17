/**
 * CPA Platform — Mobile Demand Forecasting Screen
 */
import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Header } from "../../components/common/Header";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { useQuery } from "@tanstack/react-query";
import { forecastService } from "../../services/forecastService";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { formatNumber } from "../../utils/formatters";
import { LineChart, Sparkles, TrendingUp, CheckCircle2 } from "lucide-react-native";

export default function ForecastScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const { data: summary, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["forecast", "summary"],
    queryFn: () => forecastService.getSummary(),
  });

  const { data: products } = useQuery({
    queryKey: ["forecast", "products"],
    queryFn: () => forecastService.getProducts(),
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Demand Forecasting" subtitle="Prediksi Permintaan Berbasis AI" />

      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={products || []}
          keyExtractor={(item, idx) => item.id_barang || String(idx)}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              {/* Forecast KPI Highlights */}
              <View style={styles.kpiRow}>
                <Card style={styles.kpiCard}>
                  <View style={[styles.iconWrap, { backgroundColor: "rgba(139, 92, 246, 0.15)" }]}>
                    <LineChart size={18} color="#8b5cf6" />
                  </View>
                  <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
                    {formatNumber(summary?.total_forecast_volume || 0)} L
                  </Text>
                  <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>
                    Estimasi Permintaan
                  </Text>
                </Card>

                <Card style={styles.kpiCard}>
                  <View style={[styles.iconWrap, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                    <TrendingUp size={18} color="#10b981" />
                  </View>
                  <Text style={[styles.kpiValue, { color: "#10b981" }]}>
                    +{summary?.expected_growth_pct || 8.4}%
                  </Text>
                  <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>
                    Pertumbuhan MoM
                  </Text>
                </Card>
              </View>

              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Rekomendasi Restock & Prediksi SKU
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.forecastCard}>
              <View style={styles.cardTop}>
                <Text style={styles.skuText}>{item.id_barang || "SKU"}</Text>
                <Badge
                  status="R"
                  label={item.trend === "naik" ? "Trend Naik ↗" : "Stabil →"}
                  color={item.trend === "naik" ? "#10b981" : "#0ea5e9"}
                />
              </View>

              <Text style={[styles.productName, { color: theme.textPrimary }]}>
                {item.nama_barang || "Nama Barang"}
              </Text>

              <View style={styles.metricsRow}>
                <View style={styles.metricCol}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Prediksi Order</Text>
                  <Text style={[styles.metricVal, { color: theme.textPrimary }]}>
                    {formatNumber(item.predicted_qty || 0)} Unit
                  </Text>
                </View>

                <View style={styles.metricCol}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Akurasi Model</Text>
                  <Text style={[styles.metricVal, { color: "#10b981" }]}>
                    {item.accuracy_pct ? `${item.accuracy_pct}%` : "94.2%"}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  headerBlock: {
    marginBottom: 8,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    marginBottom: 0,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  forecastCard: {
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  skuText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0ea5e9",
    fontFamily: "monospace",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
    paddingTop: 8,
  },
  metricCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: "700",
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
