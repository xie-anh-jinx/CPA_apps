/**
 * CPA Platform — Mobile Main Tab Layout
 */
import React from "react";
import { Tabs } from "expo-router";
import { useThemeStore } from "../../stores/useThemeStore";
import { colors } from "../../theme";
import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  Users,
  Sparkles,
} from "lucide-react-native";

export default function TabLayout() {
  const isDark = useThemeStore((s) => s.isDark);
  const theme = isDark ? colors.dark : colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: "#0ea5e9",
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Stok",
          tabBarIcon: ({ color, size }) => <Boxes size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "Penjualan",
          tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="crm"
        options={{
          title: "Customer",
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: "PADI AI",
          tabBarIcon: ({ color, size }) => <Sparkles size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
