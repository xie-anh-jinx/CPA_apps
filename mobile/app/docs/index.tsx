/**
 * CPA Platform — Mobile Documentation Screen
 */
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Header } from "../../components/common/Header";
import { Card } from "../../components/common/Card";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import { BookOpen, Server, Shield, Sparkles } from "lucide-react-native";

export default function DocsScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  const sections = [
    {
      title: "1. Arsitektur Single Source of Truth",
      icon: Server,
      color: "#0ea5e9",
      body: "Aplikasi Mobile Expo dan Web Next.js menggunakan backend FastAPI yang sama. Semua logic kalkulasi saldo stok FIFO, validasi limit piutang, dan query join Surat Jalan diatur di backend.",
    },
    {
      title: "2. Model Context Protocol (MCP) & PADI AI",
      icon: Sparkles,
      color: "#8b5cf6",
      body: "Endpoint /api/mcp/rpc menyediakan tools otomatis yang dapat dipanggil oleh LLM (Gemini, Claude, DeepSeek). Dilengkapi Row-Level Security berdasarkan role user.",
    },
    {
      title: "3. Keamanan & Otentikasi JWT",
      icon: Shield,
      color: "#10b981",
      body: "Token JWT disimpan di hardware-backed secure storage (Expo SecureStore pada iOS Keychain dan Android Keystore) dengan enkripsi penuh.",
    },
    {
      title: "4. Offline First & Background Sync",
      icon: BookOpen,
      color: "#f59e0b",
      body: "Cache query otomatis disimpan di AsyncStorage via React Query Persister. Data yang di-input saat offline (seperti catatan kunjungan sales) akan otomatis di-sync saat online.",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Dokumentasi Sistem" subtitle="Panduan Arsitektur & Spesifikasi API" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {sections.map((sec, idx) => {
          const IconComp = sec.icon;
          return (
            <Card key={idx} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.iconWrap, { backgroundColor: `${sec.color}20` }]}>
                  <IconComp size={20} color={sec.color} />
                </View>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                  {sec.title}
                </Text>
              </View>
              <Text style={[styles.cardBody, { color: theme.textSecondary }]}>
                {sec.body}
              </Text>
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
  card: {
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    flex: 1,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
  },
});
