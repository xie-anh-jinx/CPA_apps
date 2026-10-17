/**
 * CPA Platform — Mobile FIFO Batch Aging Screen
 */
import React, { useState } from "react";
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
import { Badge } from "../../components/common/Badge";
import { useBatchAging } from "../../hooks/useInventory";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { formatDate, formatNumber } from "../../utils/formatters";
import { Clock, AlertCircle } from "lucide-react-native";

export default function AgingScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: agingList, isLoading, refetch, isFetching } = useBatchAging();

  const categories = [
    { key: "all", label: "Semua Batch" },
    { key: "0-30", label: "0-30 Hari" },
    { key: "31-60", label: "31-60 Hari" },
    { key: "61-90", label: "61-90 Hari" },
    { key: "91-180", label: "91-180 Hari" },
    { key: ">180", label: ">180 Hari (Kritis)" },
  ];

  const filtered = (agingList || []).filter((item) => {
    if (selectedCategory === "all") return true;
    return item.kategori_aging === selectedCategory;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="FIFO Batch Aging" subtitle="Monitoring Usia & Rotasi Persediaan" />

      {/* Filter Category Chips */}
      <View style={styles.filterWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.key;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategory(item.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? "#0ea5e9" : theme.surface,
                    borderColor: isSelected ? "#0ea5e9" : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? "#fff" : theme.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Batch Aging List */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => `${item.batch_no}-${idx}`}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Tidak ada batch pada kategori ini.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOverdue = item.umur_hari > 90;
            return (
              <Card style={styles.batchCard}>
                <View style={styles.batchHeader}>
                  <Text style={styles.batchNo}>Batch: {item.batch_no}</Text>
                  <Badge
                    status={isOverdue ? "C" : "R"}
                    label={`${item.umur_hari} Hari`}
                    color={isOverdue ? "#ef4444" : "#10b981"}
                  />
                </View>

                <Text style={[styles.productName, { color: theme.textPrimary }]}>
                  {item.nama_barang}
                </Text>

                <View style={styles.batchMeta}>
                  <Text style={[styles.metaCol, { color: theme.textSecondary }]}>
                    Masuk: {formatDate(item.tgl_masuk)}
                  </Text>
                  <Text style={[styles.metaCol, { color: theme.textPrimary, fontWeight: "700" }]}>
                    Qty: {formatNumber(item.qty)} {item.satuan}
                  </Text>
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterWrap: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  batchCard: {
    padding: 14,
    marginBottom: 10,
  },
  batchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  batchNo: {
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
  batchMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
    paddingTop: 8,
  },
  metaCol: {
    fontSize: 12,
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
  },
});
