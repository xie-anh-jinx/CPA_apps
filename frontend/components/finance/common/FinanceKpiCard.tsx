"use client";
import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type KpiColor = "primary" | "success" | "warning" | "danger" | "purple" | "cyan";

interface FinanceKpiCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  change?: number; // e.g., +4.2 or -1.5
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: KpiColor;
  invertChangeColor?: boolean; // If true, positive change is bad (red), negative change is good (green) e.g., costs/variance
}

const COLOR_MAP = {
  primary: {
    border: "#0D99FF",
    bg: "rgba(13, 153, 255, 0.1)",
    text: "#0D99FF",
  },
  success: {
    border: "#3AC977",
    bg: "rgba(58, 201, 119, 0.1)",
    text: "#3AC977",
  },
  warning: {
    border: "#FFB323",
    bg: "rgba(255, 179, 35, 0.1)",
    text: "#FFB323",
  },
  danger: {
    border: "#FF5E5E",
    bg: "rgba(255, 94, 94, 0.1)",
    text: "#FF5E5E",
  },
  purple: {
    border: "#9147FF",
    bg: "rgba(145, 71, 255, 0.1)",
    text: "#9147FF",
  },
  cyan: {
    border: "#06B6D4",
    bg: "rgba(6, 182, 212, 0.1)",
    text: "#06B6D4",
  },
};

export default function FinanceKpiCard({
  label,
  value,
  subValue,
  change,
  changeLabel = "vs bln lalu",
  icon,
  color = "primary",
  invertChangeColor = false,
}: FinanceKpiCardProps) {
  const theme = COLOR_MAP[color] || COLOR_MAP.primary;

  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change === 0;

  // If invertChangeColor is true (like cost or variance increase is bad):
  let changeColor = "var(--text-muted)";
  if (isPositive) {
    changeColor = invertChangeColor ? "var(--color-danger)" : "var(--color-success)";
  } else if (isNegative) {
    changeColor = invertChangeColor ? "var(--color-success)" : "var(--color-danger)";
  }

  return (
    <div
      className="card"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "1.1rem 1.25rem",
        borderRadius: "12px",
        background: "var(--bg-card)",
        border: "1px solid var(--bg-border)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "115px",
        transition: "all 0.2s ease",
      }}
    >
      {/* Top Accent Strip */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: theme.border,
        }}
      />

      {/* Header: Label & Icon */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "0.5rem",
          marginBottom: "0.5rem",
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
        {icon && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              background: theme.bg,
              color: theme.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Main Value */}
      <div style={{ marginBottom: "0.25rem" }}>
        <div
          style={{
            fontSize: "1.45rem",
            fontWeight: 800,
            lineHeight: 1.15,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </div>
        {subValue && (
          <div
            style={{
              fontSize: "0.725rem",
              color: "var(--text-muted)",
              marginTop: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subValue}
          </div>
        )}
      </div>

      {/* Trend change */}
      {change !== undefined && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            fontSize: "0.72rem",
            fontWeight: 600,
            color: changeColor,
            marginTop: "0.3rem",
          }}
        >
          {isPositive ? (
            <TrendingUp size={13} />
          ) : isNegative ? (
            <TrendingDown size={13} />
          ) : (
            <Minus size={13} />
          )}
          <span>
            {isPositive ? `+${change}%` : `${change}%`}
          </span>
          <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: "2px" }}>
            {changeLabel}
          </span>
        </div>
      )}
    </div>
  );
}
