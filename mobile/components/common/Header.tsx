/**
 * CPA Platform — Mobile App Header Component
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStore } from "../../stores/useThemeStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useOfflineStore } from "../../stores/useOfflineStore";
import { colors } from "../../theme";
import { Moon, Sun, WifiOff, Bell } from "lucide-react-native";
import { useRouter } from "expo-router";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark, setMode } = useThemeStore();
  const { user } = useAuthStore();
  const isOnline = useOfflineStore((s) => s.isOnline);
  const theme = isDark ? colors.dark : colors.light;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 16),
          backgroundColor: theme.surface,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          {!isOnline && (
            <View style={styles.offlineBadge}>
              <WifiOff size={14} color="#ef4444" />
              <Text style={styles.offlineText}>Offline</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => setMode(isDark ? "light" : "dark")}
            style={[styles.iconButton, { backgroundColor: theme.card }]}
          >
            {isDark ? (
              <Sun size={18} color="#f59e0b" />
            ) : (
              <Moon size={18} color="#6366f1" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={[styles.userBadge, { backgroundColor: "rgba(14, 165, 233, 0.15)" }]}
          >
            <Text style={styles.userInitial}>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "A"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  userBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#0ea5e9",
  },
  userInitial: {
    color: "#0ea5e9",
    fontWeight: "700",
    fontSize: 14,
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    fontSize: 11,
    color: "#ef4444",
    fontWeight: "600",
  },
});
