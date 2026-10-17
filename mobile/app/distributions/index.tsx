/**
 * CPA Platform — Mobile Surat Jalan (Delivery Order) Screen
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
import { ReceiptModal } from "../../components/distribution/ReceiptModal";
import { useDeliveryOrders, useDistributionSummary } from "../../hooks/useDistributions";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { formatDate } from "../../utils/formatters";
import { Truck, ArrowLeft, Calendar } from "lucide-react-native";
import { useRouter } from "expo-router";

export default function DistributionsScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDoNomor, setSelectedDoNomor] = useState<string | null>(null);

  const { data: summary } = useDistributionSummary();
  const { data: doList, isLoading, refetch, isFetching } = useDeliveryOrders({
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const filterTabs = [
    { key: "all", label: "Semua", count: summary?.total_do },
    { key: "send", label: "🚛 Send", count: summary?.send ?? summary?.in_transit },
    { key: "received", label: "✅ Received", count: summary?.received ?? summary?.delivered },
    { key: "invoice", label: "📄 Invoice", count: summary?.invoice },
    { key: "cancel", label: "❌ Cancel", count: summary?.cancel },
    { key: "draft", label: "⏳ Draft", count: summary?.draft ?? summary?.pending },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Surat Jalan (DO)" subtitle="Tracking Status Pengiriman & Tanda Terima" />

      {/* Filter Tabs Horizontal */}
      <View style={styles.filterWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterTabs}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            const isSelected = statusFilter === item.key;
            return (
              <TouchableOpacity
                onPress={() => setStatusFilter(item.key)}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isSelected ? "#0ea5e9" : theme.surface,
                    borderColor: isSelected ? "#0ea5e9" : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    { color: isSelected ? "#fff" : theme.textSecondary },
                  ]}
                >
                  {item.label} {item.count !== undefined ? `(${item.count})` : ""}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* DO List */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Memuat daftar Surat Jalan...
          </Text>
        </View>
      ) : (
        <FlatList
          data={doList}
          keyExtractor={(item) => item.nomor}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <Card style={styles.doCard}>
              <View style={styles.doTop}>
                {/* Klik nomor DO untuk membuka Form Receipt Delivery Order */}
                <TouchableOpacity
                  onPress={() => setSelectedDoNomor(item.nomor)}
                  style={styles.nomorButton}
                >
                  <Text style={styles.nomorText}>▶ {item.nomor}</Text>
                </TouchableOpacity>
                <Badge status={item.status} label={item.status_label || item.status} />
              </View>

              <Text style={[styles.customerName, { color: theme.textPrimary }]}>
                {item.nama_customer || "Customer"}
              </Text>

              <Text style={[styles.destination, { color: theme.textSecondary }]}>
                📍 {item.destination || item.kota_tujuan || "Kota Tujuan"}
              </Text>

              <View style={styles.doMeta}>
                <Text style={[styles.metaDate, { color: theme.textSecondary }]}>
                  Tgl DO: {formatDate(item.tanggal)}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedDoNomor(item.nomor)}
                  style={styles.openReceiptBtn}
                >
                  <Text style={styles.openReceiptText}>Lihat Form Receipt</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}

      {/* Form Receipt DO Modal */}
      {selectedDoNomor && (
        <ReceiptModal
          visible={!!selectedDoNomor}
          nomorDo={selectedDoNomor}
          onClose={() => setSelectedDoNomor(null)}
          onCaptureProof={() => {
            // Can launch camera
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
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  doCard: {
    padding: 14,
    marginBottom: 10,
  },
  doTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  nomorButton: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: "rgba(14, 165, 233, 0.12)",
  },
  nomorText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0ea5e9",
    fontFamily: "monospace",
  },
  customerName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  destination: {
    fontSize: 12,
    marginBottom: 8,
  },
  doMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
    paddingTop: 8,
  },
  metaDate: {
    fontSize: 12,
  },
  openReceiptBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  openReceiptText: {
    fontSize: 12,
    color: "#0ea5e9",
    fontWeight: "600",
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
});
