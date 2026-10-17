/**
 * CPA Platform — Mobile Form Receipt Delivery Order Modal
 * 100% Cocok dengan tampilan Ultima Web
 */
import React from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { useDeliveryOrderDetail } from "../../hooks/useDistributions";
import { Badge } from "../common/Badge";
import { X, MapPin, Camera } from "lucide-react-native";
import { formatDate, formatNumber } from "../../utils/formatters";

interface ReceiptModalProps {
  visible: boolean;
  nomorDo: string;
  onClose: () => void;
  onCaptureProof?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  visible,
  nomorDo,
  onClose,
  onCaptureProof,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const { data, isLoading } = useDeliveryOrderDetail(nomorDo);
  const header = data?.header;
  const items = data?.items || [];

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Header Bar */}
          <View style={[styles.headerBar, { borderBottomColor: theme.border }]}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                Form Receipt Delivery Order
              </Text>
              {header?.status && <Badge status={header.status} />}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Memuat rincian Surat Jalan...
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Form Fields: Two Column Grid / Stack */}
              <View style={[styles.formContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {/* Left Column */}
                <View style={styles.formCol}>
                  <View style={styles.formRow}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>No. DO.</Text>
                    <Text style={[styles.value, { color: theme.textPrimary }]}>{header?.no_do || nomorDo}</Text>
                  </View>

                  <View style={styles.formRow}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Picking List No.</Text>
                    <Text style={[styles.value, { color: theme.textPrimary }]}>{header?.picking_list_no || "—"}</Text>
                  </View>

                  <View style={styles.formRow}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>PO No.</Text>
                    <Text style={[styles.value, { color: theme.textPrimary }]}>{header?.po_no || "—"}</Text>
                  </View>

                  <View style={styles.formRow}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Contact Person</Text>
                    <Text style={[styles.value, { color: theme.textPrimary }]}>{header?.contact_person || "—"}</Text>
                  </View>

                  <View style={styles.formRow}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Nama Penerima *</Text>
                    <Text style={[styles.value, { color: theme.textPrimary, fontWeight: "700" }]}>
                      {header?.nama_penerima || "—"}
                    </Text>
                  </View>

                  <View style={styles.formRow}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Tgl.Sampai Tujuan</Text>
                    <Text style={[styles.value, { color: theme.textPrimary }]}>
                      {header?.tgl_sampai_tujuan_str || formatDate(header?.tgl_sampai_tujuan)}
                    </Text>
                  </View>

                  {/* Delivery Address with B I U S toolbar */}
                  <View style={styles.addressBlock}>
                    <Text style={[styles.label, { color: theme.textSecondary, marginBottom: 4 }]}>
                      Delivery Addres
                    </Text>
                    <View style={[styles.addressBox, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                      <View style={[styles.toolbar, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.toolBtn, { fontWeight: "800", color: theme.textSecondary }]}>B</Text>
                        <Text style={[styles.toolBtn, { fontStyle: "italic", color: theme.textSecondary }]}>I</Text>
                        <Text style={[styles.toolBtn, { textDecorationLine: "underline", color: theme.textSecondary }]}>U</Text>
                        <Text style={[styles.toolBtn, { textDecorationLine: "line-through", color: theme.textSecondary }]}>S</Text>
                      </View>
                      <Text style={[styles.addressText, { color: theme.textPrimary }]}>
                        {header?.delivery_address?.replace(/<[^>]+>/g, "\n").trim() || "— Belum ada alamat —"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right Column */}
                <View style={styles.formCol}>
                  <View style={styles.formRow}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Tgl DO</Text>
                    <Text style={[styles.value, { color: theme.textPrimary }]}>
                      {header?.tgl_do_str || formatDate(header?.tgl_do)}
                    </Text>
                  </View>

                  <View style={styles.formRow}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Customer :</Text>
                    <Text style={[styles.value, { color: theme.textPrimary, fontWeight: "700" }]}>
                      {header?.customer || "—"}
                    </Text>
                  </View>

                  <View style={styles.formRow}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Gudang</Text>
                    <Text style={[styles.value, { color: theme.textPrimary }]}>
                      {header?.gudang || "—"} ▼
                    </Text>
                  </View>

                  <View style={styles.formRow}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Telpon No.</Text>
                    <Text style={[styles.value, { color: theme.textPrimary }]}>{header?.telpon_no || "—"}</Text>
                  </View>

                  <View style={styles.formRow}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Receive Date *</Text>
                    <Text style={[styles.value, { color: theme.textPrimary }]}>
                      {header?.receive_date_str || formatDate(header?.receive_date) || "—"}
                    </Text>
                  </View>

                  <View style={styles.formRow}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Biaya Pengiriman *</Text>
                    <Text style={[styles.value, { color: theme.textPrimary }]}>
                      {header?.biaya_pengiriman !== undefined ? `Rp ${formatNumber(header.biaya_pengiriman)}` : "—"}
                    </Text>
                  </View>

                  <View style={styles.formRow}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Return Date</Text>
                    <Text style={[styles.value, { color: theme.textPrimary }]}>
                      {header?.return_date_str || formatDate(header?.return_date) || "—"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Mobile Actions: GPS & Upload Foto Bukti */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={onCaptureProof}
                  style={[styles.cameraBtn, { backgroundColor: "#0ea5e9" }]}
                >
                  <Camera size={16} color="#fff" />
                  <Text style={styles.cameraBtnText}>Ambil Foto Bukti Serah Terima</Text>
                </TouchableOpacity>
              </View>

              {/* Daftar Barang Section */}
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                📦 Daftar Barang (Delivery Order Detail) ({items.length} item)
              </Text>

              {items.map((item, idx) => (
                <View
                  key={idx}
                  style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemIndex}>#{item.no || idx + 1}</Text>
                    <Text style={[styles.itemCode, { color: "#0ea5e9" }]}>{item.kode_barang}</Text>
                    <Text style={[styles.itemQty, { color: theme.textPrimary }]}>
                      {item.qty} {item.satuan}
                    </Text>
                  </View>
                  <Text style={[styles.itemName, { color: theme.textPrimary }]}>{item.nama_barang}</Text>
                  {item.packing_number ? (
                    <Text style={[styles.packingText, { color: theme.textSecondary }]}>
                      Packing: {item.packing_number}
                    </Text>
                  ) : null}
                  {item.qty_diterima !== undefined && (
                    <Text style={[styles.receivedQtyText, { color: "#10b981" }]}>
                      Diterima: {item.qty_diterima} {item.satuan}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalBox: {
    maxHeight: "92%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  loadingWrap: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formContainer: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  formCol: {
    marginBottom: 8,
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.15)",
  },
  label: {
    width: 130,
    fontSize: 12,
  },
  value: {
    flex: 1,
    fontSize: 13,
  },
  addressBlock: {
    marginTop: 8,
  },
  addressBox: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  toolbar: {
    flexDirection: "row",
    gap: 12,
    padding: 6,
    borderBottomWidth: 1,
  },
  toolBtn: {
    fontSize: 12,
    width: 18,
    textAlign: "center",
  },
  addressText: {
    padding: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  cameraBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cameraBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  itemCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemIndex: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
  },
  itemCode: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  itemQty: {
    fontSize: 12,
    fontWeight: "700",
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  packingText: {
    fontSize: 11,
  },
  receivedQtyText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
});
