/**
 * CPA Platform — Mobile Inventory & Stock Screen
 */
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../../components/common/Header";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { useProductsStock, useWarehouses } from "../../hooks/useInventory";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { formatNumber } from "../../utils/formatters";
import { Search, QrCode, Filter } from "lucide-react-native";
import { ProductStock } from "@shared/types";

export default function InventoryScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const [search, setSearch] = useState("");
  const [selectedGudang, setSelectedGudang] = useState<string | undefined>(undefined);

  const { data: warehouses } = useWarehouses();
  const { data, refetch, isFetching, isLoading } = useProductsStock({
    search: search.trim() || undefined,
    id_gudang: selectedGudang,
  });

  const products = data?.data || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Stok Persediaan" subtitle={`Total ${products.length} SKU terdata`} />

      {/* Search & Barcode Scan Bar */}
      <View style={styles.searchBarWrap}>
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Search size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Cari kode atau nama barang..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <TouchableOpacity
          onPress={() => router.push("/scanner")}
          style={[styles.scanButton, { backgroundColor: "#0ea5e9" }]}
        >
          <QrCode size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Warehouse Filter Chips */}
      <View style={styles.warehouseFilterWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id_gudang: "", gudang: "Semua Gudang" }, ...(warehouses || [])]}
          keyExtractor={(item) => item.id_gudang}
          renderItem={({ item }) => {
            const isSelected = (selectedGudang || "") === item.id_gudang;
            return (
              <TouchableOpacity
                onPress={() => setSelectedGudang(item.id_gudang ? item.id_gudang : undefined)}
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
                  {item.gudang}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Products List with Pull-to-refresh & Infinite Scroll */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Memuat daftar persediaan...
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id_barang}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Tidak ada produk ditemukan.
              </Text>
            </View>
          }
          renderItem={({ item }: { item: ProductStock }) => (
            <Card style={styles.itemCard}>
              <View style={styles.itemTop}>
                <Text style={styles.skuText}>{item.id_barang}</Text>
                <Badge
                  status={item.stok_total <= 5 ? "C" : item.stok_total < 20 ? "D" : "R"}
                  label={item.stok_total <= 5 ? "Kritis" : item.stok_total < 20 ? "Waspada" : "Aman"}
                  color={item.stok_total <= 5 ? "#ef4444" : item.stok_total < 20 ? "#f59e0b" : "#10b981"}
                />
              </View>

              <Text style={[styles.productName, { color: theme.textPrimary }]}>
                {item.nama_barang}
              </Text>

              <View style={styles.stockDetails}>
                <View style={styles.stockCol}>
                  <Text style={[styles.stockSubLabel, { color: theme.textSecondary }]}>Total Stok</Text>
                  <Text style={[styles.stockValue, { color: theme.textPrimary }]}>
                    {formatNumber(item.stok_total)} {item.satuan || "Unit"}
                  </Text>
                </View>

                {item.batch_count !== undefined && (
                  <View style={styles.stockCol}>
                    <Text style={[styles.stockSubLabel, { color: theme.textSecondary }]}>Batch Aktif</Text>
                    <Text style={[styles.stockValue, { color: theme.textSecondary }]}>
                      {item.batch_count} Batch
                    </Text>
                  </View>
                )}
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
  searchBarWrap: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  warehouseFilterWrap: {
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
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  itemCard: {
    padding: 14,
    marginBottom: 10,
  },
  itemTop: {
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
    marginBottom: 10,
  },
  stockDetails: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
    paddingTop: 8,
  },
  stockCol: {
    flex: 1,
  },
  stockSubLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  stockValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
  emptyWrap: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
  },
});
