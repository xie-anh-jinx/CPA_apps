/**
 * CPA Platform — Mobile Sales & Orders Screen
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
  Modal,
  ScrollView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Header } from "../../components/common/Header";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { salesService } from "../../services/salesService";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { formatRupiah, formatNumber, formatDate } from "../../utils/formatters";
import { Search, FileSpreadsheet, ArrowUpRight, X, Package, Calendar } from "lucide-react-native";
import { SalesOrderRecord } from "@shared/types";

export default function SalesScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const [activeTab, setActiveTab] = useState<"orders" | "ar">("orders");
  const [search, setSearch] = useState("");
  const [selectedOrderNo, setSelectedOrderNo] = useState<string | null>(null);

  const { data: summary } = useQuery({
    queryKey: ["sales", "summary"],
    queryFn: () => salesService.getSummary(),
  });

  const {
    data: ordersData,
    isLoading: loadingOrders,
    refetch: refetchOrders,
    isFetching: fetchingOrders,
  } = useQuery({
    queryKey: ["sales", "orders", search],
    queryFn: () => salesService.getOrders({ search: search.trim() || undefined }),
    enabled: activeTab === "orders",
  });

  const {
    data: arData,
    isLoading: loadingAR,
    refetch: refetchAR,
    isFetching: fetchingAR,
  } = useQuery({
    queryKey: ["sales", "ar"],
    queryFn: () => salesService.getAROutstanding(),
    enabled: activeTab === "ar",
  });

  // Query order detail when an order is selected
  const { data: orderDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["sales", "order-detail", selectedOrderNo],
    queryFn: () => salesService.getOrderDetail(selectedOrderNo!),
    enabled: !!selectedOrderNo,
  });

  const orders = ordersData?.data || [];
  const arItems = arData?.items || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Penjualan & Piutang" subtitle="Tracking Order & Status Tagihan" />

      {/* KPI Mini Bar */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.kpiPillLabel, { color: theme.textSecondary }]}>Omzet Berjalan</Text>
          <Text style={[styles.kpiPillValue, { color: "#0ea5e9" }]}>
            {formatRupiah(summary?.total_omzet || 0)}
          </Text>
        </View>

        <View style={[styles.kpiPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.kpiPillLabel, { color: theme.textSecondary }]}>Piutang (AR)</Text>
          <Text style={[styles.kpiPillValue, { color: "#ef4444" }]}>
            {formatRupiah(summary?.ar_outstanding_total || 0)}
          </Text>
        </View>
      </View>

      {/* Tabs Switcher */}
      <View style={styles.tabsWrap}>
        <TouchableOpacity
          onPress={() => setActiveTab("orders")}
          style={[
            styles.tabButton,
            activeTab === "orders" && { borderBottomColor: "#0ea5e9", borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "orders" ? "#0ea5e9" : theme.textSecondary },
            ]}
          >
            Sales Orders ({orders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("ar")}
          style={[
            styles.tabButton,
            activeTab === "ar" && { borderBottomColor: "#0ea5e9", borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "ar" ? "#0ea5e9" : theme.textSecondary },
            ]}
          >
            AR Outstanding ({arItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      {activeTab === "orders" && (
        <View style={styles.searchWrap}>
          <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Search size={18} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Cari nomor SO atau customer..."
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>
      )}

      {/* Content List */}
      {activeTab === "orders" ? (
        loadingOrders ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#0ea5e9" />
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.nomor}
            contentContainerStyle={styles.listContent}
            refreshing={fetchingOrders}
            onRefresh={refetchOrders}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedOrderNo(item.nomor)}
              >
                <Card style={styles.orderCard}>
                  <View style={styles.orderTop}>
                    <Text style={styles.soNumber}>{item.nomor}</Text>
                    <Badge status={item.status} label={item.status_label || item.status} />
                  </View>
                  <Text style={[styles.customerName, { color: theme.textPrimary }]}>
                    {item.nama_customer}
                  </Text>
                  <View style={styles.orderMeta}>
                    <Text style={[styles.metaDate, { color: theme.textSecondary }]}>
                      {formatDate(item.tanggal)}
                    </Text>
                    <Text style={[styles.orderTotal, { color: theme.textPrimary }]}>
                      {formatRupiah(item.total_nominal)}
                    </Text>
                  </View>
                  <Text style={[styles.viewItemsHint, { color: "#0ea5e9" }]}>
                    Lihat Rincian Item Barang ➔
                  </Text>
                </Card>
              </TouchableOpacity>
            )}
          />
        )
      ) : loadingAR ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={arItems}
          keyExtractor={(item) => item.nomor_faktur}
          contentContainerStyle={styles.listContent}
          refreshing={fetchingAR}
          onRefresh={refetchAR}
          renderItem={({ item }) => (
            <Card style={styles.orderCard}>
              <View style={styles.orderTop}>
                <Text style={styles.soNumber}>{item.nomor_faktur}</Text>
                <Badge
                  status={item.umur_hari > 30 ? "C" : "D"}
                  label={`${item.umur_hari} Hari`}
                  color={item.umur_hari > 30 ? "#ef4444" : "#f59e0b"}
                />
              </View>
              <Text style={[styles.customerName, { color: theme.textPrimary }]}>
                {item.nama_customer}
              </Text>
              <View style={styles.orderMeta}>
                <Text style={[styles.metaDate, { color: theme.textSecondary }]}>
                  Jatuh Tempo: {formatDate(item.jatuh_tempo)}
                </Text>
                <Text style={[styles.orderTotal, { color: "#ef4444" }]}>
                  {formatRupiah(item.sisa_piutang)}
                </Text>
              </View>
            </Card>
          )}
        />
      )}

      {/* Modal Detail Order & Items */}
      {selectedOrderNo && (
        <Modal
          visible={!!selectedOrderNo}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedOrderNo(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                    Detail Sales Order
                  </Text>
                  <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                    Nomor: {selectedOrderNo}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedOrderNo(null)} style={styles.closeBtn}>
                  <X size={20} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              {loadingDetail ? (
                <ActivityIndicator size="large" color="#0ea5e9" style={{ marginVertical: 30 }} />
              ) : (
                <ScrollView contentContainerStyle={styles.detailScroll}>
                  <Card style={styles.detailSummaryCard}>
                    <Text style={[styles.detailCustomer, { color: theme.textPrimary }]}>
                      {orderDetail?.customer || orderDetail?.nama_customer || "Customer"}
                    </Text>
                    <Text style={[styles.detailDate, { color: theme.textSecondary }]}>
                      Tanggal: {formatDate(orderDetail?.tanggal || "")} • Sales: {orderDetail?.salesperson || "Internal"}
                    </Text>
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>
                        Grand Total SO:
                      </Text>
                      <Text style={[styles.totalVal, { color: "#0ea5e9" }]}>
                        {formatRupiah(orderDetail?.total_nominal || orderDetail?.grandtotal || 0)}
                      </Text>
                    </View>
                  </Card>

                  <Text style={[styles.itemsHeading, { color: theme.textPrimary }]}>
                    Daftar Item Barang ({orderDetail?.items?.length || 0})
                  </Text>

                  {orderDetail?.items?.map((item: any, idx: number) => (
                    <View
                      key={idx}
                      style={[styles.itemRow, { borderColor: theme.border, backgroundColor: theme.background }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, { color: theme.textPrimary }]}>
                          {item.nama_barang || item.item_name}
                        </Text>
                        <Text style={[styles.itemSku, { color: theme.textMuted }]}>
                          SKU: {item.kode_barang || item.sku} • {formatNumber(item.qty || item.quantity)} {item.satuan || "Unit"}
                        </Text>
                      </View>
                      <Text style={[styles.itemPrice, { color: theme.textPrimary }]}>
                        {formatRupiah(item.subtotal || item.total_harga || 0)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  kpiPill: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  kpiPillLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  kpiPillValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  tabsWrap: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.15)",
  },
  tabButton: {
    paddingVertical: 10,
    marginRight: 20,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  orderCard: {
    padding: 14,
    marginBottom: 10,
  },
  orderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  soNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0ea5e9",
    fontFamily: "monospace",
  },
  customerName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  orderMeta: {
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
  orderTotal: {
    fontSize: 14,
    fontWeight: "700",
  },
  viewItemsHint: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 6,
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "80%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.15)",
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  detailScroll: {
    paddingBottom: 20,
  },
  detailSummaryCard: {
    padding: 14,
    marginBottom: 14,
  },
  detailCustomer: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  detailDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 12,
  },
  totalVal: {
    fontSize: 15,
    fontWeight: "800",
  },
  itemsHeading: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
  },
  itemSku: {
    fontSize: 11,
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: "700",
  },
});
