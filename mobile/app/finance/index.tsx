/**
 * CPA Platform — Mobile Finance & Logistics ERP Module
 * 100% connected to live FastAPI backend ERP database.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../../components/common/Header";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import {
  useFinanceMeta,
  useFinanceExecutiveKPI,
  useFinanceExecutiveCharts,
  useCostVariances,
  useTransactionJourneys,
  useShippingCosts,
  useBudgetRequests,
  useVendorPerformances,
  usePendingVerifications,
} from "../../hooks/useFinance";
import { formatRupiah, formatNumber, formatDate } from "../../utils/formatters";
import {
  CircleDollarSign,
  Scale,
  Milestone,
  Truck,
  FileCheck,
  AlertOctagon,
  Building2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  X,
  FileText,
  ArrowRight,
} from "lucide-react-native";
import { TransactionJourney, CostVarianceItem } from "@shared/types";

type FinanceTab = "executive" | "variance" | "journey" | "shipping" | "audit";

export default function FinanceScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const [activeTab, setActiveTab] = useState<FinanceTab>("executive");
  const [search, setSearch] = useState("");
  const [varianceStatus, setVarianceStatus] = useState<string>("ALL");
  const [selectedJourney, setSelectedJourney] = useState<TransactionJourney | null>(null);

  // Queries
  const { data: meta } = useFinanceMeta();
  const {
    data: kpi,
    isLoading: loadingKpi,
    refetch: refetchKpi,
    isFetching: fetchingKpi,
  } = useFinanceExecutiveKPI();

  const {
    data: variances,
    isLoading: loadingVariance,
    refetch: refetchVariance,
    isFetching: fetchingVariance,
  } = useCostVariances({
    search: search.trim() || undefined,
    status: varianceStatus,
  });

  const {
    data: journeys,
    isLoading: loadingJourneys,
    refetch: refetchJourneys,
    isFetching: fetchingJourneys,
  } = useTransactionJourneys({
    search: search.trim() || undefined,
  });

  const {
    data: shippingList,
    isLoading: loadingShipping,
    refetch: refetchShipping,
    isFetching: fetchingShipping,
  } = useShippingCosts({
    search: search.trim() || undefined,
  });

  const {
    data: pendingList,
    isLoading: loadingPending,
    refetch: refetchPending,
    isFetching: fetchingPending,
  } = usePendingVerifications({
    search: search.trim() || undefined,
  });

  const {
    data: vendors,
    isLoading: loadingVendors,
    refetch: refetchVendors,
    isFetching: fetchingVendors,
  } = useVendorPerformances();

  const isRefreshing =
    fetchingKpi || fetchingVariance || fetchingJourneys || fetchingShipping || fetchingPending;

  const onRefresh = async () => {
    await Promise.all([
      refetchKpi(),
      refetchVariance(),
      refetchJourneys(),
      refetchShipping(),
      refetchPending(),
      refetchVendors(),
    ]);
  };

  const tabs: Array<{ id: FinanceTab; label: string; icon: any; badge?: number }> = [
    { id: "executive", label: "Executive", icon: CircleDollarSign },
    { id: "variance", label: "Cost Variance", icon: Scale, badge: variances?.length },
    { id: "journey", label: "Journey Dokumen", icon: Milestone },
    { id: "shipping", label: "Biaya Kirim", icon: Truck },
    { id: "audit", label: "Audit & Verifikasi", icon: AlertOctagon, badge: pendingList?.length },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title="Finance & Cost Variance"
        subtitle="Monitoring Biaya Logistik & Audit Transaksi"
      />

      {/* Navigation Tabs Bar */}
      <View style={[styles.tabBarWrap, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarScroll}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tabItem,
                  isActive && { borderBottomColor: "#0ea5e9", borderBottomWidth: 3 },
                ]}
              >
                <Icon size={16} color={isActive ? "#0ea5e9" : theme.textMuted} />
                <Text
                  style={[
                    styles.tabItemText,
                    { color: isActive ? "#0ea5e9" : theme.textSecondary },
                    isActive && styles.tabItemTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <View style={[styles.tabBadge, { backgroundColor: tab.id === "audit" ? "#ef4444" : "#0ea5e9" }]}>
                    <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Tab Content */}
      <ScrollView
        style={styles.contentArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {/* ======================= TAB 1: EXECUTIVE ======================= */}
        {activeTab === "executive" && (
          <View>
            {loadingKpi ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#0ea5e9" />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Memuat Executive Financial Data...
                </Text>
              </View>
            ) : (
              <>
                {/* Highlight Stats Grid */}
                <View style={styles.kpiGrid}>
                  <Card style={styles.kpiCard}>
                    <View style={[styles.iconWrap, { backgroundColor: "rgba(14, 165, 233, 0.15)" }]}>
                      <Truck size={20} color="#0ea5e9" />
                    </View>
                    <Text style={[styles.kpiVal, { color: theme.textPrimary }]}>
                      {formatNumber(kpi?.total_delivery_order || 0)} DO
                    </Text>
                    <Text style={[styles.kpiSub, { color: theme.textSecondary }]}>Total Delivery Order</Text>
                  </Card>

                  <Card style={styles.kpiCard}>
                    <View style={[styles.iconWrap, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
                      <CircleDollarSign size={20} color="#ef4444" />
                    </View>
                    <Text style={[styles.kpiVal, { color: "#ef4444" }]}>
                      {formatRupiah(kpi?.total_shipping_cost || 0)}
                    </Text>
                    <Text style={[styles.kpiSub, { color: theme.textSecondary }]}>Total Biaya Kirim</Text>
                  </Card>

                  <Card style={styles.kpiCard}>
                    <View style={[styles.iconWrap, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                      <Scale size={20} color="#f59e0b" />
                    </View>
                    <Text style={[styles.kpiVal, { color: (kpi?.total_variance || 0) > 0 ? "#ef4444" : "#10b981" }]}>
                      {formatRupiah(kpi?.total_variance || 0)} ({kpi?.total_variance_pct?.toFixed(1) || 0}%)
                    </Text>
                    <Text style={[styles.kpiSub, { color: theme.textSecondary }]}>Cost Variance (Selisih)</Text>
                  </Card>

                  <Card style={styles.kpiCard}>
                    <View style={[styles.iconWrap, { backgroundColor: "rgba(168, 85, 247, 0.15)" }]}>
                      <Clock size={20} color="#a855f7" />
                    </View>
                    <Text style={[styles.kpiVal, { color: theme.textPrimary }]}>
                      {kpi?.average_lead_time_days?.toFixed(1) || 0} Hari
                    </Text>
                    <Text style={[styles.kpiSub, { color: theme.textSecondary }]}>Rata-rata Lead Time</Text>
                  </Card>
                </View>

                {/* Anggaran vs Realisasi Bar */}
                <Card style={styles.budgetCard}>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                    Anggaran vs Realisasi Pengiriman
                  </Text>
                  <View style={styles.compareRow}>
                    <View style={styles.compareCol}>
                      <Text style={[styles.compareLabel, { color: theme.textSecondary }]}>Budget Request</Text>
                      <Text style={[styles.compareVal, { color: "#0ea5e9" }]}>
                        {formatRupiah(kpi?.total_budget_request || 0)}
                      </Text>
                    </View>
                    <View style={styles.compareCol}>
                      <Text style={[styles.compareLabel, { color: theme.textSecondary }]}>Actual Cost</Text>
                      <Text style={[styles.compareVal, { color: "#ef4444" }]}>
                        {formatRupiah(kpi?.total_actual_cost || 0)}
                      </Text>
                    </View>
                  </View>
                  {/* Progress ratio */}
                  <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(
                            100,
                            ((kpi?.total_actual_cost || 1) / (kpi?.total_budget_request || 1)) * 100
                          )}%`,
                          backgroundColor:
                            (kpi?.total_actual_cost || 0) > (kpi?.total_budget_request || 0)
                              ? "#ef4444"
                              : "#10b981",
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressHint, { color: theme.textMuted }]}>
                    Rasio Realisasi:{" "}
                    {(
                      ((kpi?.total_actual_cost || 0) / (kpi?.total_budget_request || 1)) *
                      100
                    ).toFixed(1)}
                    % dari pengajuan awal
                  </Text>
                </Card>

                {/* Top Performers Cards */}
                <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
                  Analisis Utama (Top Cost & Transporter)
                </Text>

                {kpi?.top_customer && (
                  <Card style={styles.performerCard}>
                    <View style={styles.performerHead}>
                      <Text style={[styles.performerRole, { color: theme.textMuted }]}>CUSTOMER TERBESAR</Text>
                      <Badge status="normal" label={`${kpi.top_customer.do_count} DO`} />
                    </View>
                    <Text style={[styles.performerName, { color: theme.textPrimary }]}>
                      {kpi.top_customer.name}
                    </Text>
                    <Text style={[styles.performerCost, { color: "#0ea5e9" }]}>
                      Total Ongkir: {formatRupiah(kpi.top_customer.total_cost)}
                    </Text>
                  </Card>
                )}

                {kpi?.top_vendor && (
                  <Card style={styles.performerCard}>
                    <View style={styles.performerHead}>
                      <Text style={[styles.performerRole, { color: theme.textMuted }]}>VENDOR PENGIRIMAN UTAMA</Text>
                      <Badge
                        status="success"
                        label={`On-Time ${(kpi.top_vendor.on_time_rate * 100).toFixed(0)}%`}
                      />
                    </View>
                    <Text style={[styles.performerName, { color: theme.textPrimary }]}>
                      {kpi.top_vendor.name}
                    </Text>
                    <Text style={[styles.performerCost, { color: "#10b981" }]}>
                      {kpi.top_vendor.shipment_count} Pengiriman • {formatRupiah(kpi.top_vendor.total_cost)}
                    </Text>
                  </Card>
                )}

                {kpi?.top_sales && (
                  <Card style={styles.performerCard}>
                    <View style={styles.performerHead}>
                      <Text style={[styles.performerRole, { color: theme.textMuted }]}>SALES PERSON BIAYA TERTINGGI</Text>
                      <Badge
                        status={kpi.top_sales.variance_pct > 5 ? "danger" : "normal"}
                        label={`Var ${kpi.top_sales.variance_pct?.toFixed(1)}%`}
                      />
                    </View>
                    <Text style={[styles.performerName, { color: theme.textPrimary }]}>
                      {kpi.top_sales.name}
                    </Text>
                    <Text style={[styles.performerCost, { color: theme.textSecondary }]}>
                      Total Beban Biaya: {formatRupiah(kpi.top_sales.total_cost)}
                    </Text>
                  </Card>
                )}
              </>
            )}
          </View>
        )}

        {/* ======================= TAB 2: COST VARIANCE ======================= */}
        {activeTab === "variance" && (
          <View>
            {/* Search and Status Filters */}
            <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Search size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                placeholder="Cari Nomor DO atau Customer..."
                placeholderTextColor={theme.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <View style={styles.filterChipScroll}>
              {[
                { id: "ALL", label: "Semua Status" },
                { id: "NORMAL", label: "Normal (<= 5%)" },
                { id: "REVIEW", label: "Review (5 - 15%)" },
                { id: "HIGH_VARIANCE", label: "High Variance (> 15%)" },
              ].map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setVarianceStatus(f.id)}
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: varianceStatus === f.id ? "#0ea5e9" : theme.surface,
                      borderColor: varianceStatus === f.id ? "#0ea5e9" : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: varianceStatus === f.id ? "#fff" : theme.textSecondary },
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loadingVariance ? (
              <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 20 }} />
            ) : variances?.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Tidak ada data variance yang cocok.
                </Text>
              </Card>
            ) : (
              variances?.map((item) => {
                const isHigh = item.status === "HIGH_VARIANCE";
                const isReview = item.status === "REVIEW";
                const badgeColor = isHigh ? "danger" : isReview ? "warning" : "success";

                return (
                  <Card key={item.id} style={styles.varianceCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.noDoWrap}>
                        <Text style={styles.noDoText}>DO: {item.no_do}</Text>
                        <Text style={[styles.tglText, { color: theme.textMuted }]}>
                          {formatDate(item.tanggal)}
                        </Text>
                      </View>
                      <Badge
                        status={badgeColor}
                        label={item.status_label || item.status}
                      />
                    </View>

                    <Text style={[styles.cardCustomer, { color: theme.textPrimary }]}>
                      {item.customer}
                    </Text>
                    <Text style={[styles.cardRoute, { color: theme.textSecondary }]}>
                      📍 {item.rute} • {item.transporter}
                    </Text>

                    {/* Breakdown 3 Kolom: Estimasi Sales, Budget Request, Realisasi */}
                    <View style={[styles.gridThree, { borderColor: theme.border }]}>
                      <View style={styles.gridThreeCol}>
                        <Text style={[styles.gridLabel, { color: theme.textMuted }]}>Est. Sales</Text>
                        <Text style={[styles.gridVal, { color: theme.textSecondary }]}>
                          {formatRupiah(item.estimasi_sales)}
                        </Text>
                      </View>
                      <View style={styles.gridThreeCol}>
                        <Text style={[styles.gridLabel, { color: theme.textMuted }]}>Pengajuan BR</Text>
                        <Text style={[styles.gridVal, { color: "#0ea5e9" }]}>
                          {formatRupiah(item.budget_request)}
                        </Text>
                      </View>
                      <View style={styles.gridThreeCol}>
                        <Text style={[styles.gridLabel, { color: theme.textMuted }]}>Realisasi Cost</Text>
                        <Text style={[styles.gridVal, { color: isHigh ? "#ef4444" : theme.textPrimary }]}>
                          {formatRupiah(item.actual_cost)}
                        </Text>
                      </View>
                    </View>

                    {/* Variance Diff Footer */}
                    <View style={styles.varianceFooter}>
                      <Text style={[styles.diffLabel, { color: theme.textSecondary }]}>
                        Selisih Biaya:
                      </Text>
                      <Text
                        style={[
                          styles.diffVal,
                          { color: item.variance > 0 ? "#ef4444" : "#10b981" },
                        ]}
                      >
                        {formatRupiah(item.variance)} ({item.variance_pct > 0 ? "+" : ""}
                        {item.variance_pct?.toFixed(1)}%)
                      </Text>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {/* ======================= TAB 3: TRANSACTION JOURNEY ======================= */}
        {activeTab === "journey" && (
          <View>
            <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Search size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                placeholder="Cari DO, Customer, atau No Faktur..."
                placeholderTextColor={theme.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {loadingJourneys ? (
              <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 20 }} />
            ) : journeys?.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Tidak ada dokumen transaction journey ditemukan.
                </Text>
              </Card>
            ) : (
              journeys?.map((j) => (
                <TouchableOpacity
                  key={j.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedJourney(j)}
                >
                  <Card style={styles.journeyCard}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.journeyDo}>DO: {j.no_do}</Text>
                      <Badge
                        status={
                          j.overall_status === "COMPLETED"
                            ? "success"
                            : j.overall_status === "PENDING_VERIFICATION"
                            ? "danger"
                            : "normal"
                        }
                        label={j.overall_status}
                      />
                    </View>

                    <Text style={[styles.cardCustomer, { color: theme.textPrimary }]}>
                      {j.customer}
                    </Text>
                    <Text style={[styles.cardRoute, { color: theme.textSecondary }]}>
                      {j.asal_gudang} ➔ {j.destination} ({j.transporter})
                    </Text>

                    {/* Timeline stage icons bar */}
                    <View style={styles.stagesBar}>
                      {j.documents?.map((doc, idx) => {
                        const isAvail = doc.is_available;
                        return (
                          <View key={idx} style={styles.stageItem}>
                            <View
                              style={[
                                styles.stageCircle,
                                {
                                  backgroundColor: isAvail ? "#10b981" : "rgba(148, 163, 184, 0.2)",
                                  borderColor: isAvail ? "#10b981" : theme.border,
                                },
                              ]}
                            >
                              <Text style={[styles.stageInitial, { color: isAvail ? "#fff" : theme.textMuted }]}>
                                {doc.stage.substring(0, 2)}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.stageStageName,
                                { color: isAvail ? theme.textPrimary : theme.textMuted },
                              ]}
                              numberOfLines={1}
                            >
                              {doc.stage_label.split(" ")[0]}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    <View style={styles.journeyBottomRow}>
                      <Text style={[styles.leadTimeText, { color: theme.textMuted }]}>
                        ⏱ Lead Time: {j.lead_time_days} Hari
                      </Text>
                      <Text style={[styles.detailAction, { color: "#0ea5e9" }]}>
                        Lihat 8 Tahap Dokumen ➔
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ======================= TAB 4: SHIPPING COSTS ======================= */}
        {activeTab === "shipping" && (
          <View>
            <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Search size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                placeholder="Cari armada, rute, atau kota..."
                placeholderTextColor={theme.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {loadingShipping ? (
              <ActivityIndicator size="large" color="#0ea5e9" style={{ marginTop: 20 }} />
            ) : (
              shippingList?.map((s) => (
                <Card key={s.id} style={styles.shippingCard}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.noDoText}>DO: {s.no_do}</Text>
                    <Badge
                      status={s.status_pengiriman === "DELIVERED" ? "success" : "normal"}
                      label={s.status_pengiriman}
                    />
                  </View>

                  <Text style={[styles.shippingRoute, { color: theme.textPrimary }]}>
                    {s.asal_gudang} ➔ {s.kota_tujuan}
                  </Text>
                  <Text style={[styles.shippingArmada, { color: theme.textSecondary }]}>
                    🚚 {s.transporter} ({s.jenis_armada}) • {s.berat_kg} Kg ({s.volume_cbm} CBM)
                  </Text>

                  <View style={[styles.shippingCostBreakdown, { backgroundColor: theme.background }]}>
                    <View style={styles.costItemRow}>
                      <Text style={[styles.costItemLabel, { color: theme.textMuted }]}>Biaya Dasar</Text>
                      <Text style={[styles.costItemVal, { color: theme.textPrimary }]}>
                        {formatRupiah(s.biaya_dasar)}
                      </Text>
                    </View>
                    <View style={styles.costItemRow}>
                      <Text style={[styles.costItemLabel, { color: theme.textMuted }]}>Bongkar Muat + Tol</Text>
                      <Text style={[styles.costItemVal, { color: theme.textPrimary }]}>
                        {formatRupiah((s.biaya_bongkar_muat || 0) + (s.biaya_tol_retribusi || 0))}
                      </Text>
                    </View>
                    <View style={[styles.costItemRow, styles.costTotalRow]}>
                      <Text style={[styles.costTotalLabel, { color: theme.textPrimary }]}>Total Tagihan Kirim</Text>
                      <Text style={[styles.costTotalVal, { color: "#0ea5e9" }]}>
                        {formatRupiah(s.total_biaya)}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {/* ======================= TAB 5: AUDIT & PENDING ======================= */}
        {activeTab === "audit" && (
          <View>
            <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
              Pending Verification & Urgent Audit ({pendingList?.length || 0})
            </Text>
            <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>
              Transaksi dengan selisih &gt; 5% atau kelengkapan dokumen belum memenuhi SOP.
            </Text>

            {loadingPending ? (
              <ActivityIndicator size="large" color="#ef4444" style={{ marginTop: 20 }} />
            ) : pendingList?.length === 0 ? (
              <Card style={styles.emptyCard}>
                <CheckCircle2 size={36} color="#10b981" />
                <Text style={[styles.emptyText, { color: theme.textPrimary, marginTop: 8 }]}>
                  Semua transaksi telah terverifikasi. Tidak ada anomali biaya!
                </Text>
              </Card>
            ) : (
              pendingList?.map((p) => (
                <Card key={p.id} style={[styles.pendingCard, { borderLeftColor: "#ef4444", borderLeftWidth: 4 }]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.noDoText}>DO: {p.no_do}</Text>
                    <Badge
                      status={p.priority === "CRITICAL" ? "danger" : "warning"}
                      label={p.priority}
                    />
                  </View>

                  <Text style={[styles.cardCustomer, { color: theme.textPrimary }]}>
                    {p.customer} ({p.sales})
                  </Text>
                  <Text style={[styles.cardRoute, { color: theme.textSecondary }]}>
                    Transporter: {p.transporter} • Tertahan {p.days_pending} Hari
                  </Text>

                  {/* Trigger Reasons */}
                  <View style={styles.triggersWrap}>
                    {p.trigger_reasons?.map((trig, idx) => (
                      <View key={idx} style={styles.triggerBadge}>
                        <AlertTriangle size={12} color="#ef4444" />
                        <Text style={styles.triggerText}>{trig.replace(/_/g, " ")}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.varianceFooter}>
                    <Text style={[styles.diffLabel, { color: theme.textSecondary }]}>Selisih Biaya Realisasi:</Text>
                    <Text style={[styles.diffVal, { color: "#ef4444" }]}>
                      +{formatRupiah(p.variance)} (+{p.variance_pct?.toFixed(1)}%)
                    </Text>
                  </View>
                </Card>
              ))
            )}

            {/* Vendor Performance Section */}
            <Text style={[styles.sectionHeading, { color: theme.textPrimary, marginTop: 24 }]}>
              Evaluasi Kinerja Vendor Logistik
            </Text>

            {vendors?.map((v) => (
              <Card key={v.vendor_id} style={styles.vendorCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.vendorName, { color: theme.textPrimary }]}>
                    {v.vendor_name}
                  </Text>
                  <View style={styles.vendorRatingBadge}>
                    <Text style={styles.vendorRatingText}>{v.rating}</Text>
                  </View>
                </View>

                <Text style={[styles.vendorMeta, { color: theme.textSecondary }]}>
                  Total {v.jumlah_pengiriman} Pengiriman • On-Time: {(v.on_time_delivery_rate * 100).toFixed(0)}%
                </Text>
                <Text style={[styles.vendorMeta, { color: theme.textMuted }]}>
                  Rata-rata Lead Time: {v.avg_lead_time_days} Hari • Rata-rata Ongkir: {formatRupiah(v.avg_shipping_cost)}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ======================= MODAL: JOURNEY TIMELINE ======================= */}
      {selectedJourney && (
        <Modal
          visible={!!selectedJourney}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedJourney(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                    Lifecycle Dokumen DO
                  </Text>
                  <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                    {selectedJourney.no_do} • {selectedJourney.customer}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedJourney(null)}
                  style={styles.closeBtn}
                >
                  <X size={20} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.timelineScroll}>
                {selectedJourney.documents?.map((step, idx) => {
                  const isAvail = step.is_available;
                  return (
                    <View key={idx} style={styles.timelineStepRow}>
                      <View style={styles.timelineAxis}>
                        <View
                          style={[
                            styles.axisDot,
                            { backgroundColor: isAvail ? "#10b981" : "#94a3b8" },
                          ]}
                        />
                        {idx < (selectedJourney.documents?.length || 0) - 1 && (
                          <View
                            style={[
                              styles.axisLine,
                              { backgroundColor: isAvail ? "#10b981" : theme.border },
                            ]}
                          />
                        )}
                      </View>

                      <View style={[styles.timelineCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                        <View style={styles.timelineCardTop}>
                          <Text style={[styles.stepLabel, { color: theme.textPrimary }]}>
                            {idx + 1}. {step.stage_label}
                          </Text>
                          <Badge
                            status={isAvail ? "success" : "muted"}
                            label={isAvail ? "Tersedia" : "Belum Ada"}
                          />
                        </View>

                        {step.nomor_dokumen && (
                          <Text style={[styles.stepDocNo, { color: "#0ea5e9" }]}>
                            Nomor: {step.nomor_dokumen}
                          </Text>
                        )}
                        {step.tanggal && (
                          <Text style={[styles.stepDocDate, { color: theme.textMuted }]}>
                            Tanggal: {formatDate(step.tanggal)} {step.pic ? `• PIC: ${step.pic}` : ""}
                          </Text>
                        )}
                        {step.nominal !== null && step.nominal !== undefined && (
                          <Text style={[styles.stepDocNominal, { color: theme.textPrimary }]}>
                            Nominal: {formatRupiah(step.nominal)}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
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
  tabBarWrap: {
    borderBottomWidth: 1,
  },
  tabBarScroll: {
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 8,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tabItemTextActive: {
    fontWeight: "700",
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  contentArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    width: "48%",
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
  kpiVal: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 11,
  },
  budgetCard: {
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  compareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  compareCol: {},
  compareLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  compareVal: {
    fontSize: 15,
    fontWeight: "800",
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 11,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionSub: {
    fontSize: 12,
    marginBottom: 12,
  },
  performerCard: {
    padding: 12,
    marginBottom: 10,
  },
  performerHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  performerRole: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  performerName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  performerCost: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  filterChipScroll: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  varianceCard: {
    padding: 14,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  noDoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noDoText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0ea5e9",
    fontFamily: "monospace",
  },
  tglText: {
    fontSize: 11,
  },
  cardCustomer: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  cardRoute: {
    fontSize: 12,
    marginBottom: 10,
  },
  gridThree: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 8,
    marginBottom: 8,
  },
  gridThreeCol: {
    flex: 1,
    alignItems: "center",
  },
  gridLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  gridVal: {
    fontSize: 12,
    fontWeight: "700",
  },
  varianceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  diffLabel: {
    fontSize: 12,
  },
  diffVal: {
    fontSize: 13,
    fontWeight: "800",
  },
  journeyCard: {
    padding: 14,
    marginBottom: 10,
  },
  journeyDo: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0ea5e9",
  },
  stagesBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 10,
  },
  stageItem: {
    alignItems: "center",
    width: "11%",
  },
  stageCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 4,
  },
  stageInitial: {
    fontSize: 9,
    fontWeight: "700",
  },
  stageStageName: {
    fontSize: 9,
    textAlign: "center",
  },
  journeyBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  leadTimeText: {
    fontSize: 11,
  },
  detailAction: {
    fontSize: 11,
    fontWeight: "600",
  },
  shippingCard: {
    padding: 14,
    marginBottom: 10,
  },
  shippingRoute: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  shippingArmada: {
    fontSize: 12,
    marginBottom: 8,
  },
  shippingCostBreakdown: {
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  costItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  costItemLabel: {
    fontSize: 11,
  },
  costItemVal: {
    fontSize: 11,
    fontWeight: "600",
  },
  costTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.2)",
    paddingTop: 4,
    marginTop: 2,
  },
  costTotalLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  costTotalVal: {
    fontSize: 13,
    fontWeight: "800",
  },
  pendingCard: {
    padding: 14,
    marginBottom: 10,
  },
  triggersWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 8,
  },
  triggerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  triggerText: {
    fontSize: 10,
    color: "#ef4444",
    fontWeight: "600",
  },
  vendorCard: {
    padding: 12,
    marginBottom: 8,
  },
  vendorName: {
    fontSize: 13,
    fontWeight: "700",
  },
  vendorRatingBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vendorRatingText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  vendorMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyCard: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },
  centerLoading: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "85%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.15)",
    paddingBottom: 12,
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
  timelineScroll: {
    paddingBottom: 20,
  },
  timelineStepRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  timelineAxis: {
    width: 24,
    alignItems: "center",
  },
  axisDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
  },
  axisLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineCard: {
    flex: 1,
    marginLeft: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  timelineCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  stepDocNo: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  stepDocDate: {
    fontSize: 11,
    marginTop: 2,
  },
  stepDocNominal: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
});
