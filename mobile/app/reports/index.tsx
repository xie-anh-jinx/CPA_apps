/**
 * CPA Platform — Mobile Reports & Download Screen
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Header } from "../../components/common/Header";
import { Card } from "../../components/common/Card";
import { reportService } from "../../services/reportService";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { FileSpreadsheet, Download, FileText, CheckCircle2 } from "lucide-react-native";

export default function ReportsScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const [downloading, setDownloading] = useState<string | null>(null);

  const reports = [
    {
      id: "ar-aging",
      title: "Laporan AR Aging Piutang",
      desc: "Rekapitulasi umur piutang customer per rentang jatuh tempo (.xlsx)",
      endpoint: "/api/sales/export-ar-excel",
      filename: `AR_Aging_${new Date().toISOString().slice(0, 10)}.xlsx`,
      format: "Excel",
      color: "#10b981",
    },
    {
      id: "do-export",
      title: "Laporan Delivery Order (DO)",
      desc: "Rekap seluruh status Surat Jalan pengiriman (.xlsx)",
      endpoint: "/api/distributions/export-excel?type=DO",
      filename: `Delivery_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`,
      format: "Excel",
      color: "#0ea5e9",
    },
    {
      id: "it-export",
      title: "Laporan Internal Transfer (IT)",
      desc: "Rekap mutasi antar gudang cabang (.xlsx)",
      endpoint: "/api/distributions/export-excel?type=IT",
      filename: `Internal_Transfer_${new Date().toISOString().slice(0, 10)}.xlsx`,
      format: "Excel",
      color: "#f59e0b",
    },
  ];

  const handleDownload = async (item: typeof reports[0]) => {
    try {
      setDownloading(item.id);
      const success = await reportService.downloadAndShareReport(item.endpoint, item.filename);
      if (!success) {
        Alert.alert("Info", "File berhasil disimpan ke perangkat.");
      }
    } catch {
      Alert.alert("Gagal", "Terjadi kesalahan saat mengunduh laporan.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Unduh Laporan" subtitle="Ekspor Dokumen Excel & Analitik" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Pilihan Laporan Tersedia
        </Text>

        {reports.map((r) => {
          const isCurrent = downloading === r.id;
          return (
            <Card key={r.id} style={styles.reportCard}>
              <View style={styles.cardTop}>
                <View style={[styles.formatIcon, { backgroundColor: `${r.color}20` }]}>
                  <FileSpreadsheet size={22} color={r.color} />
                </View>
                <View style={styles.textWrap}>
                  <Text style={[styles.reportTitle, { color: theme.textPrimary }]}>
                    {r.title}
                  </Text>
                  <Text style={[styles.reportDesc, { color: theme.textSecondary }]}>
                    {r.desc}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleDownload(r)}
                disabled={isCurrent}
                style={[
                  styles.downloadBtn,
                  { backgroundColor: isCurrent ? "rgba(148, 163, 184, 0.3)" : r.color },
                ]}
              >
                {isCurrent ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Download size={16} color="#fff" />
                    <Text style={styles.downloadBtnText}>Unduh & Buka File</Text>
                  </>
                )}
              </TouchableOpacity>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  reportCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  formatIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  reportDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  downloadBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
