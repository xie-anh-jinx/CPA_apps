/**
 * CPA Platform — Mobile Database Schema & Graph Viewer
 */
import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Header } from "../../components/common/Header";
import { Card } from "../../components/common/Card";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { Database, GitCommit, Table, Key } from "lucide-react-native";

export default function DatabaseGraphScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const coreTables = [
    {
      name: "public.do_tbl",
      desc: "Header Surat Jalan (DO) dengan tracking nomor, customer, tanggal, dan status",
      pk: "nomor",
      relations: ["packinglist.nomor (via no_pl)", "customer.id_kontak", "gudang.id_gudang"],
      color: "#0ea5e9",
    },
    {
      name: "public.do_detail",
      desc: "Rincian item barang Surat Jalan, packing number, & qty diterima",
      pk: "no_do, urut",
      relations: ["do_tbl.nomor (via no_do)", "barang.id_barang"],
      color: "#38bdf8",
    },
    {
      name: "public.internal_order",
      desc: "Dokumen permintaan transfer antar gudang (IO) beserta workflow approval DSM & ST",
      pk: "nomor_io",
      relations: ["gudang_asal", "gudang_tujuan", "pegawai"],
      color: "#10b981",
    },
    {
      name: "public.internal_transfer",
      desc: "Dokumen eksekusi fisik perpindahan barang (IT Out & IT In)",
      pk: "nomor",
      relations: ["internal_order.nomor_io", "kendaraan_jenis", "pegawai"],
      color: "#f59e0b",
    },
    {
      name: "public.barang",
      desc: "Master data produk pelumas, SKU, kategori, dan satuan",
      pk: "id_barang",
      relations: ["kategori", "satuan"],
      color: "#8b5cf6",
    },
    {
      name: "public.customer",
      desc: "Master kontak customer, plafon kredit limit, dan sales relation",
      pk: "id_kontak",
      relations: ["pegawai (sales)"],
      color: "#ec4899",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Database Schema" subtitle="Struktur Relasi & Entity Graph CPA" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.introText, { color: theme.textSecondary }]}>
          Visualisasi arsitektur skema database PostgreSQL Ultima & CPA Analytics. Semua relasi data diakses melalui FastAPI.
        </Text>

        {coreTables.map((t) => (
          <Card key={t.name} style={styles.tableCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: `${t.color}20` }]}>
                <Table size={18} color={t.color} />
              </View>
              <View style={styles.titleWrap}>
                <Text style={[styles.tableName, { color: theme.textPrimary }]}>{t.name}</Text>
                <View style={styles.pkRow}>
                  <Key size={12} color="#f59e0b" />
                  <Text style={[styles.pkText, { color: theme.textSecondary }]}>PK: {t.pk}</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.descText, { color: theme.textSecondary }]}>{t.desc}</Text>

            <View style={[styles.relationsBlock, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.relTitle, { color: theme.textPrimary }]}>Relasi Foreign Key:</Text>
              {t.relations.map((r, idx) => (
                <View key={idx} style={styles.relItem}>
                  <GitCommit size={12} color="#0ea5e9" />
                  <Text style={[styles.relText, { color: theme.textSecondary }]}>{r}</Text>
                </View>
              ))}
            </View>
          </Card>
        ))}
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
  introText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  tableCard: {
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
  },
  tableName: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  pkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  pkText: {
    fontSize: 11,
  },
  descText: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 10,
  },
  relationsBlock: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  relTitle: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
  },
  relItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  relText: {
    fontSize: 11.5,
    fontFamily: "monospace",
  },
});
