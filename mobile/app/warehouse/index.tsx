/**
 * CPA Platform — Mobile Warehouse Screen
 */
import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Header } from "../../components/common/Header";
import { Card } from "../../components/common/Card";
import { useWarehouses } from "../../hooks/useInventory";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { formatNumber } from "../../utils/formatters";
import { Warehouse, Layers, MapPin, Eye } from "lucide-react-native";

export default function WarehouseScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const { data: warehouses, isLoading, refetch, isFetching } = useWarehouses();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Daftar Gudang" subtitle="Kapasitas & Pemetaan Visual 3D" />

      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={warehouses}
          keyExtractor={(item) => item.id_gudang}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <Card style={styles.warehouseCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <Warehouse size={20} color="#0ea5e9" />
                </View>
                <View style={styles.titleBox}>
                  <Text style={[styles.warehouseTitle, { color: theme.textPrimary }]}>
                    {item.gudang}
                  </Text>
                  <Text style={[styles.warehouseCode, { color: theme.textSecondary }]}>
                    Kode: {item.id_gudang}
                  </Text>
                </View>
              </View>

              {item.alamat && (
                <View style={styles.addressRow}>
                  <MapPin size={14} color={theme.textMuted} />
                  <Text style={[styles.addressText, { color: theme.textSecondary }]}>
                    {item.alamat}
                  </Text>
                </View>
              )}

              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total SKU</Text>
                  <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                    {formatNumber(item.total_sku || 0)}
                  </Text>
                </View>

                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Stok</Text>
                  <Text style={[styles.statValue, { color: "#10b981" }]}>
                    {formatNumber(item.total_qty || 0)} Unit
                  </Text>
                </View>

                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Utilisasi</Text>
                  <Text style={[styles.statValue, { color: "#0ea5e9" }]}>
                    {item.utilisasi_persen ? `${item.utilisasi_persen}%` : "Normal"}
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
  warehouseCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "rgba(14, 165, 233, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleBox: {
    flex: 1,
  },
  warehouseTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  warehouseCode: {
    fontSize: 12,
    marginTop: 2,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 12,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
    paddingTop: 10,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
