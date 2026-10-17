/**
 * CPA Platform — Mobile Customer & CRM Screen
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
  Alert,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Header } from "../../components/common/Header";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { customerService } from "../../services/customerService";
import { locationService } from "../../services/locationService";
import { useOfflineStore } from "../../stores/useOfflineStore";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { formatRupiah } from "../../utils/formatters";
import { Search, MapPin, Camera, Plus, X, Phone, CheckCircle } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

export default function CRMScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;
  const { isOnline, addToQueue } = useOfflineStore();

  const [search, setSearch] = useState("");
  const [activityModal, setActivityModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id_kontak: string; customer: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: customers, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["customers", "list", search],
    queryFn: () => customerService.getCustomers({ search: search.trim() || undefined }),
  });

  const handlePickImage = async () => {
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotoUri(res.assets[0].uri);
    }
  };

  const handleSaveActivity = async () => {
    if (!selectedCustomer || !notes.trim()) {
      Alert.alert("Perhatian", "Pilih customer dan isi catatan kunjungan.");
      return;
    }

    try {
      setSaving(true);
      const loc = await locationService.getCurrentLocation();
      const payload = {
        id_customer: selectedCustomer.id_kontak,
        tipe_aktivitas: "kunjungan" as const,
        catatan: notes.trim(),
        tanggal: new Date().toISOString(),
        latitude: loc?.latitude,
        longitude: loc?.longitude,
        lampiran_foto: photoUri || undefined,
      };

      if (!isOnline) {
        await addToQueue({
          type: "CREATE_CRM_ACTIVITY",
          payload,
        });
        Alert.alert("Disimpan Offline", "Aktivitas kunjungan disimpan di perangkat dan akan disinkronkan otomatis saat online.");
      } else {
        await customerService.createActivity(payload);
        Alert.alert("Berhasil", "Aktivitas kunjungan sales berhasil dicatat ke server.");
      }

      setActivityModal(false);
      setNotes("");
      setPhotoUri(null);
      setSelectedCustomer(null);
    } catch {
      Alert.alert("Gagal", "Gagal menyimpan aktivitas kunjungan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Customer & CRM" subtitle="Manajemen Kontak & Catatan Sales" />

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Search size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.textPrimary }]}
            placeholder="Cari nama customer atau kota..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Customers List */}
      {isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id_kontak}
          contentContainerStyle={styles.listContent}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <Card style={styles.customerCard}>
              <View style={styles.customerTop}>
                <Text style={styles.customerId}>{item.id_kontak}</Text>
                <Badge
                  status={item.status_kredit === "kritis" ? "C" : "R"}
                  label={item.status_kredit || "Aktif"}
                  color={item.status_kredit === "kritis" ? "#ef4444" : "#10b981"}
                />
              </View>

              <Text style={[styles.customerTitle, { color: theme.textPrimary }]}>
                {item.customer}
              </Text>

              {item.alamat && (
                <Text style={[styles.customerAddress, { color: theme.textSecondary }]}>
                  {item.alamat}
                </Text>
              )}

              <View style={styles.customerMeta}>
                <Text style={[styles.metaPhone, { color: theme.textSecondary }]}>
                  {item.telepon ? `📞 ${item.telepon}` : "—"}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    setSelectedCustomer(item);
                    setActivityModal(true);
                  }}
                  style={styles.logVisitBtn}
                >
                  <Plus size={14} color="#0ea5e9" />
                  <Text style={styles.logVisitText}>Log Kunjungan</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}

      {/* Log Visit Modal with GPS & Photo Capture */}
      <Modal visible={activityModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                Catat Kunjungan Sales
              </Text>
              <TouchableOpacity onPress={() => setActivityModal(false)}>
                <X size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.selectedCustomerName, { color: "#0ea5e9" }]}>
              {selectedCustomer?.customer}
            </Text>

            <TextInput
              style={[
                styles.notesInput,
                { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.card },
              ]}
              placeholder="Tuliskan hasil diskusi, penawaran harga, atau kebutuhan customer..."
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={handlePickImage}
                style={[styles.photoButton, { borderColor: theme.border }]}
              >
                <Camera size={16} color="#0ea5e9" />
                <Text style={[styles.photoButtonText, { color: theme.textPrimary }]}>
                  {photoUri ? "Foto Terlampir ✓" : "Ambil Foto Lokasi"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveActivity}
                disabled={saving}
                style={[styles.saveActivityBtn, { backgroundColor: "#0ea5e9" }]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveActivityText}>Simpan Kunjungan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBox: {
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
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  customerCard: {
    padding: 14,
    marginBottom: 10,
  },
  customerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  customerId: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0ea5e9",
    fontFamily: "monospace",
  },
  customerTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 16,
  },
  customerMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.15)",
    paddingTop: 8,
  },
  metaPhone: {
    fontSize: 12,
  },
  logVisitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "rgba(14, 165, 233, 0.12)",
  },
  logVisitText: {
    fontSize: 12,
    color: "#0ea5e9",
    fontWeight: "600",
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: 20,
  },
  modalBox: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  selectedCustomerName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    height: 100,
    textAlignVertical: "top",
    fontSize: 13,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    height: 44,
  },
  photoButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  saveActivityBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    height: 44,
  },
  saveActivityText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
