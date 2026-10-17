/**
 * CPA Platform — Mobile Settings Screen
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  Alert,
} from "react-native";
import { Header } from "../../components/common/Header";
import { Card } from "../../components/common/Card";
import { useAuthStore } from "../../stores/useAuthStore";
import { useThemeStore } from "../../stores/useThemeStore";
import { useOfflineStore } from "../../stores/useOfflineStore";
import { colors } from "../../theme";
import {
  User,
  Moon,
  Server,
  Trash2,
  LogOut,
  Info,
  Shield,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SettingsScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const { setMode } = useThemeStore();
  const { user, serverUrl, setServerUrl, logout } = useAuthStore();
  const { clearQueue } = useOfflineStore();
  const theme = isDark ? colors.dark : colors.light;

  const [inputUrl, setInputUrl] = useState(serverUrl);

  const handleSaveUrl = async () => {
    if (!inputUrl.trim().startsWith("http")) {
      Alert.alert("Error", "URL server harus diawali dengan http:// atau https://");
      return;
    }
    await setServerUrl(inputUrl.trim());
    Alert.alert("Berhasil", "Target endpoint server diperbarui.");
  };

  const handleClearCache = async () => {
    Alert.alert("Konfirmasi", "Hapus semua cache offline dan data sementara?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          await clearQueue();
          Alert.alert("Selesai", "Cache lokal telah dibersihkan.");
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Keluar Akun", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Pengaturan" subtitle="Preferensi Aplikasi & Konfigurasi" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* User Profile Card */}
        <Card style={styles.card}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: "rgba(14, 165, 233, 0.15)" }]}>
              <User size={26} color="#0ea5e9" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: theme.textPrimary }]}>
                {user?.full_name || user?.username || "Admin CPA"}
              </Text>
              <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
                {user?.email || "admin@cpa.co.id"}
              </Text>
              <Text style={[styles.userRole, { color: "#0ea5e9" }]}>
                Role: {user?.role || "superadmin"}
              </Text>
            </View>
          </View>
        </Card>

        {/* Appearance Settings */}
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.rowLeft}>
              <Moon size={18} color={theme.textPrimary} />
              <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>Mode Gelap (Dark Mode)</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(val) => setMode(val ? "dark" : "light")}
              trackColor={{ false: "#767577", true: "#0ea5e9" }}
            />
          </View>
        </Card>

        {/* Server Endpoint Settings */}
        <Card style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Server size={18} color="#0ea5e9" />
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>URL Server API Backend</Text>
          </View>

          <TextInput
            style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surface }]}
            value={inputUrl}
            onChangeText={setInputUrl}
            placeholder="https://warehouse.pengajaran.com"
            placeholderTextColor={theme.textMuted}
          />

          <TouchableOpacity onPress={handleSaveUrl} style={[styles.saveBtn, { backgroundColor: "#0ea5e9" }]}>
            <Text style={styles.saveBtnText}>Simpan Perubahan Server</Text>
          </TouchableOpacity>
        </Card>

        {/* Clear Cache */}
        <Card style={styles.card}>
          <TouchableOpacity onPress={handleClearCache} style={styles.rowClickable}>
            <Trash2 size={18} color="#ef4444" />
            <Text style={[styles.dangerText, { color: "#ef4444" }]}>Bersihkan Cache Offline</Text>
          </TouchableOpacity>
        </Card>

        {/* Logout */}
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={18} color="#fff" />
          <Text style={styles.logoutText}>Keluar dari Aplikasi</Text>
        </TouchableOpacity>

        {/* App Info Footer */}
        <View style={styles.footer}>
          <Info size={14} color={theme.textMuted} />
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            CPA Analytics Mobile v1.0.0 (Expo SDK 52)
          </Text>
        </View>
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
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    marginBottom: 10,
  },
  saveBtn: {
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  rowClickable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dangerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ef4444",
    height: 46,
    borderRadius: 10,
    marginTop: 10,
  },
  logoutText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
  },
});
