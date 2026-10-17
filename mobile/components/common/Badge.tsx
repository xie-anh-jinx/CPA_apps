/**
 * CPA Platform — Mobile Status Badge Component
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DO_STATUS_MAP } from "@shared/constants";

interface BadgeProps {
  status: string;
  label?: string;
  color?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, label, color }) => {
  const mapped = DO_STATUS_MAP[status] || {
    label: label || status,
    color: color || "#94a3b8",
  };

  const badgeColor = color || mapped.color;
  const badgeLabel = label || mapped.label;

  return (
    <View style={[styles.badge, { backgroundColor: `${badgeColor}20`, borderColor: `${badgeColor}50` }]}>
      <Text style={[styles.text, { color: badgeColor }]}>{badgeLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
  },
});
