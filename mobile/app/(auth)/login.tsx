/**
 * CPA Platform — Mobile Login Screen (React Hook Form + Zod)
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormData } from "@shared/validation";
import { useAuthStore } from "../../stores/useAuthStore";
import { useThemeStore } from "../../stores/useThemeStore";
import { authService } from "../../services/authService";
import { colors } from "../../theme";
import { Lock, User, Server, ShieldCheck } from "lucide-react-native";

export default function LoginScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;
  const { login, serverUrl, setServerUrl } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [showServerInput, setShowServerInput] = useState(false);
  const [customUrl, setCustomUrl] = useState(serverUrl);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "admin",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      const res = await authService.login({
        username: data.username,
        password: data.password,
      });

      if (res.access_token) {
        const userProfile = res.user || {
          username: data.username,
          email: `${data.username}@cpa.co.id`,
          full_name: data.username.toUpperCase(),
          role: "admin",
        };
        await login(res.access_token, userProfile);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Kredensial tidak valid. Silakan periksa username dan password.";
      Alert.alert("Login Gagal", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <ShieldCheck size={38} color="#0ea5e9" />
          </View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>CPA Analytics</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Platform Analitik Bisnis & Distribusi Logistik
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Username */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Username</Text>
          <View style={[styles.inputBox, { borderColor: errors.username ? "#ef4444" : theme.border, backgroundColor: theme.card }]}>
            <User size={18} color={theme.textSecondary} />
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="Masukkan username"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>
          {errors.username && <Text style={styles.errorText}>{errors.username.message}</Text>}

          {/* Password */}
          <Text style={[styles.label, { color: theme.textSecondary, marginTop: 14 }]}>Password</Text>
          <View style={[styles.inputBox, { borderColor: errors.password ? "#ef4444" : theme.border, backgroundColor: theme.card }]}>
            <Lock size={18} color={theme.textSecondary} />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, { color: theme.textPrimary }]}
                  placeholder="Masukkan password"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            style={[styles.button, { backgroundColor: "#0ea5e9" }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Masuk ke Akun</Text>
            )}
          </TouchableOpacity>

          {/* Server Config Toggle */}
          <TouchableOpacity
            onPress={() => setShowServerInput(!showServerInput)}
            style={styles.serverToggle}
          >
            <Server size={14} color={theme.textSecondary} />
            <Text style={[styles.serverText, { color: theme.textSecondary }]}>
              Server: {serverUrl}
            </Text>
          </TouchableOpacity>

          {showServerInput && (
            <View style={styles.serverBox}>
              <TextInput
                style={[styles.serverInput, { color: theme.textPrimary, borderColor: theme.border }]}
                value={customUrl}
                onChangeText={setCustomUrl}
                placeholder="https://your-server.com"
                placeholderTextColor={theme.textMuted}
              />
              <TouchableOpacity
                onPress={() => {
                  setServerUrl(customUrl);
                  setShowServerInput(false);
                  Alert.alert("Server Disimpan", `Target API dialihkan ke ${customUrl}`);
                }}
                style={styles.saveServerBtn}
              >
                <Text style={styles.saveServerText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(14, 165, 233, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  serverToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 18,
  },
  serverText: {
    fontSize: 11,
  },
  serverBox: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  serverInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 12,
    height: 36,
  },
  saveServerBtn: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: "center",
  },
  saveServerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
