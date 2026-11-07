/**
 * CPA Platform — Mobile Surat Jalan (Delivery Order) & Financial Flow Screen
 */
import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Header } from "../../components/common/Header";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { ReceiptModal } from "../../components/distribution/ReceiptModal";
import { useDeliveryOrders, useDistributionSummary } from "../../hooks/useDistributions";
import { distributionService } from "../../services/distributionService";
import { useQuery } from "@tanstack/react-query";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { formatDate, formatRupiah, formatNumber } from "../../utils/formatters";
import { Truck, ArrowLeft, Calendar, Receipt, Repeat, CheckCircle } from "lucide-react-native";
import { useRouter } from "expo-router";

type DistTab = "do" | "financial_flow" | "transfers";

export default function DistributionsScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const [activeMainTab, setActiveMainTab] = useState<DistTab>("do");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDoNomor, setSelectedDoNomor] = useState<string | null>(null);

  const { data: summary } = useDistributionSummary();
  const { data: doList, isLoading, refetch, isFetching } = useDeliveryOrders({
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Query Financial Flow
  const { data: finFlowData, isLoading: loadingFinFlow } = useQuery({
    queryKey: ["distributions", "financial-flow"],
    queryFn: () => distributionService.getFinancialFlow(),
    enabled: activeMainTab === "financial_flow",
  });

  // Query Transfer Orders
  const { data: transferOrders, isLoading: loadingTransfers } = useQuery({
    queryKey: ["distributions", "transfer-orders"],
    queryFn: () => distributionService.getTransferOrders(),
    enabled: activeMainTab === "transfers",
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
      <Header
        title="Distribusi & Logistik"
        subtitle="Tracking Surat Jalan, Tanda Terima & Financial Flow"
      />

      {/* Main Tabs (DO / Financial Flow / Transfer Orders) */}
      <View style={[styles.mainTabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => setActiveMainTab("do")}
          style={[styles.mainTabBtn, activeMainTab === "do" && styles.mainTabActive]}
        >
          <Truck size={16} color={activeMainTab === "do" ? "#0ea5e9" : theme.textMuted} />
          <Text style={[styles.mainTabText, { color: activeMainTab === "do" ? "#0ea5e9" : theme.textSecondary }]}>
            Surat Jalan (DO)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveMainTab("financial_flow")}
          style={[styles.mainTabBtn, activeMainTab === "financial_flow" && styles.mainTabActive]}
        >
          <Receipt size={16} color={activeMainTab === "financial_flow" ? "#0ea5e9" : theme.textMuted} />
          <Text
            style={[
              styles.mainTabText,
              { color: activeMainTab === "financial_flow" ? "#0ea5e9" : theme.textSecondary },
            ]}
          >
            Financial Flow
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveMainTab("transfers")}
          style={[styles.mainTabBtn, activeMainTab === "transfers" && styles.mainTabActive]}
        >
          <Repeat size={16} color={activeMainTab === "transfers" ? "#0ea5e9" : theme.textMuted} />
          <Text
            style={[
              styles.mainTabText,
              { color: activeMainTab === "transfers" ? "#0ea5e9" : theme.textSecondary },
            ]}
          >
            Transfer Antar Gudang
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================= TAB 1: SURAT JALAN DO ================= */}
      {activeMainTab === "do" && (
        <View style={{ flex: 1 }}>
          {/* Filter Status Chips */}
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
                      <Text style={styles.openReceiptText}>Lihat Form Receipt ➔</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              )}
            />
          )}
        </View>
      )}

      {/* ================= TAB 2: FINANCIAL FLOW ================= */}
      {activeMainTab === "financial_flow" && (
        <ScrollView contentContainerStyle={styles.scrollArea}>
          {loadingFinFlow ? (
            <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 30 }} />
          ) : (
            <>
              <Card style={styles.finFlowInfoCard}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                  Alur Finansial Pengiriman (DO ➔ Invoice ➔ Tagihan)
                </Text>
                <Text style={[styles.finFlowSub, { color: theme.textSecondary }]}>
                  Monitoring siklus perubahan status dari pengiriman fisik (Surat Jalan) hingga
                  terbitnya faktur penagihan pelanggan.
                </Text>

                <View style={styles.flowStagesGrid}>
                  <View style={[styles.flowStageBox, { backgroundColor: theme.background }]}>
                    <Text style={[styles.flowStageTitle, { color: "#38bdf8" }]}>1. Send (DO)</Text>
                    <Text style={[styles.flowStageCount, { color: theme.textPrimary }]}>
                      {summary?.send ?? summary?.in_transit ?? 0} Dokumen
                    </Text>
                    <Text style={[styles.flowStageDesc, { color: theme.textMuted }]}>
                      Barang keluar gudang
                    </Text>
                  </View>

                  <View style={[styles.flowStageBox, { backgroundColor: theme.background }]}>
                    <Text style={[styles.flowStageTitle, { color: "#10b981" }]}>2. Received</Text>
                    <Text style={[styles.flowStageCount, { color: theme.textPrimary }]}>
                      {summary?.received ?? summary?.delivered ?? 0} Dokumen
                    </Text>
                    <Text style={[styles.flowStageDesc, { color: theme.textMuted }]}>
                      Tanda terima sah (POD)
                    </Text>
                  </View>

                  <View style={[styles.flowStageBox, { backgroundColor: theme.background }]}>
                    <Text style={[styles.flowStageTitle, { color: "#818cf8" }]}>3. Invoiced</Text>
                    <Text style={[styles.flowStageCount, { color: theme.textPrimary }]}>
                      {summary?.invoice ?? 0} Dokumen
                    </Text>
                    <Text style={[styles.flowStageDesc, { color: theme.textMuted }]}>
                      Faktur tagihan terbit
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Data Items Flow */}
              {Array.isArray(finFlowData) &&
                finFlowData.map((item: any, idx: number) => (
                  <Card key={idx} style={styles.doCard}>
                    <View style={styles.doTop}>
                      <Text style={styles.nomorText}>DO: {item.no_do}</Text>
                      <Badge
                        status={item.is_invoiced ? "success" : "warning"}
                        label={item.is_invoiced ? "Invoiced" : "Pending Invoice"}
                      />
                    </View>
                    <Text style={[styles.customerName, { color: theme.textPrimary }]}>
                      {item.customer}
                    </Text>
                    <Text style={[styles.metaDate, { color: theme.textSecondary }]}>
                      Faktur: {item.no_faktur || "Belum Terbit"} • Nominal: {formatRupiah(item.nominal || 0)}
                    </Text>
                  </Card>
                ))}
            </>
          )}
        </ScrollView>
      )}

      {/* ================= TAB 3: TRANSFER ANTAR GUDANG ================= */}
      {activeMainTab === "transfers" && (
        <ScrollView contentContainerStyle={styles.scrollArea}>
          {loadingTransfers ? (
            <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 30 }} />
          ) : Array.isArray(transferOrders) && transferOrders.length > 0 ? (
            transferOrders.map((to: any, idx: number) => (
              <Card key={idx} style={styles.doCard}>
                <View style={styles.doTop}>
                  <Text style={styles.nomorText}>IT: {to.nomor}</Text>
                  <Badge status="normal" label={to.status || "Terkirim"} />
                </View>
                <Text style={[styles.customerName, { color: theme.textPrimary }]}>
                  {to.gudang_asal || "Gudang Asal"} ➔ {to.gudang_tujuan || "Gudang Tujuan"}
                </Text>
                <Text style={[styles.metaDate, { color: theme.textSecondary }]}>
                  Tanggal: {formatDate(to.tanggal)} • Total Item: {to.total_item || 1} SKU
                </Text>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Tidak ada dokumen transfer antar gudang aktif.
              </Text>
            </Card>
          )}
        </ScrollView>
      )}

      {/* Form Receipt DO Modal */}
      {selectedDoNomor && (
        <ReceiptModal
          visible={!!selectedDoNomor}
          nomorDo={selectedDoNomor}
          onClose={() => setSelectedDoNomor(null)}
          onCaptureProof={() => {}}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainTabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  mainTabActive: {
    borderBottomWidth: 3,
    borderBottomColor: "#0ea5e9",
  },
  mainTabText: {
    fontSize: 12,
    fontWeight: "600",
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
  scrollArea: {
    padding: 16,
    paddingBottom: 30,
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
  finFlowInfoCard: {
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  finFlowSub: {
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 16,
  },
  flowStagesGrid: {
    gap: 8,
  },
  flowStageBox: {
    padding: 12,
    borderRadius: 8,
  },
  flowStageTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  flowStageCount: {
    fontSize: 15,
    fontWeight: "800",
  },
  flowStageDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyCard: {
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
  },
});
