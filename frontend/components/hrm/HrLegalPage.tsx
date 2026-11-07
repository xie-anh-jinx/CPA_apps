"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scale,
  CalendarCheck,
  ShieldAlert,
  Wallet,
  HeartPulse,
  Award,
  Users2,
  UserPlus,
  GraduationCap,
  Gift,
  FileCheck2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Edit3,
  Save,
  X,
  Building2,
} from "lucide-react";
import { apiHrm } from "@/lib/api";

export type HrLegalSection =
  | "overview"
  | "attendance-ratio"
  | "disciplinary"
  | "payroll-process"
  | "bpjs-insurance"
  | "kpi-personal"
  | "man-power"
  | "recruitment"
  | "training-coaching"
  | "employee-benefits"
  | "legality";

const HR_LEGAL_SUBMENUS: {
  id: HrLegalSection;
  no?: number;
  label: string;
  shortLabel: string;
  freq: string;
  href: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "overview",
    label: "HR & Legal Dashboard (Action Plan Matrix)",
    shortLabel: "HR & Legal Dashboard",
    freq: "Master",
    href: "/hrm/hr-legal",
    icon: <Scale size={14} />,
  },
  {
    id: "attendance-ratio",
    no: 1,
    label: "1. Ratio Kehadiran [Weekly & Monthly]",
    shortLabel: "1. Ratio Kehadiran",
    freq: "Weekly & Monthly",
    href: "/hrm/hr-legal/attendance-ratio",
    icon: <CalendarCheck size={14} />,
  },
  {
    id: "disciplinary",
    no: 2,
    label: "2. Pelanggaran Tata Tertib [Weekly & Monthly]",
    shortLabel: "2. Pelanggaran Tata Tertib",
    freq: "Weekly & Monthly",
    href: "/hrm/hr-legal/disciplinary",
    icon: <ShieldAlert size={14} />,
  },
  {
    id: "payroll-process",
    no: 3,
    label: "3. Proses Payroll; Cut Off 21-20 [Weekly & Monthly]",
    shortLabel: "3. Proses Payroll (21-20)",
    freq: "Weekly & Monthly",
    href: "/hrm/hr-legal/payroll-process",
    icon: <Wallet size={14} />,
  },
  {
    id: "bpjs-insurance",
    no: 4,
    label: "4. Proses BPJS (TK & Kes) + Sinar Mas [Monthly]",
    shortLabel: "4. BPJS & Sinar Mas",
    freq: "Monthly",
    href: "/hrm/hr-legal/bpjs-insurance",
    icon: <HeartPulse size={14} />,
  },
  {
    id: "kpi-personal",
    no: 5,
    label: "5. KPI Personal [Monthly]",
    shortLabel: "5. KPI Personal",
    freq: "Monthly",
    href: "/hrm/hr-legal/kpi-personal",
    icon: <Award size={14} />,
  },
  {
    id: "man-power",
    no: 6,
    label: "6. Man Power [Weekly & Monthly]",
    shortLabel: "6. Man Power",
    freq: "Weekly & Monthly",
    href: "/hrm/hr-legal/man-power",
    icon: <Users2 size={14} />,
  },
  {
    id: "recruitment",
    no: 7,
    label: "7. Recruitment [Monthly]",
    shortLabel: "7. Recruitment",
    freq: "Monthly",
    href: "/hrm/hr-legal/recruitment",
    icon: <UserPlus size={14} />,
  },
  {
    id: "training-coaching",
    no: 8,
    label: "8. Training, Coaching/Counseling [Monthly]",
    shortLabel: "8. Training & Coaching",
    freq: "Monthly",
    href: "/hrm/hr-legal/training-coaching",
    icon: <GraduationCap size={14} />,
  },
  {
    id: "employee-benefits",
    no: 9,
    label: "9. Pelaksanaan Benefit Karyawan [Monthly]",
    shortLabel: "9. Benefit Karyawan",
    freq: "Monthly",
    href: "/hrm/hr-legal/employee-benefits",
    icon: <Gift size={14} />,
  },
  {
    id: "legality",
    no: 10,
    label: "10. Legalitas [Weekly & Monthly]",
    shortLabel: "10. Legalitas",
    freq: "Weekly & Monthly",
    href: "/hrm/hr-legal/legality",
    icon: <FileCheck2 size={14} />,
  },
];

function formatIDR(val: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export default function HrLegalPage({ section = "overview" }: { section?: HrLegalSection }) {
  const pathname = usePathname();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [editForm, setEditForm] = useState({ pic: "", status: "Open", due_date: "Open", action_plan_note: "" });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiHrm.hrLegal();
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Gagal memuat data HR & Legal Dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEdit = (t: any) => {
    setEditingTopic(t);
    setEditForm({
      pic: t.pic || "HR & PIC Terkait",
      status: t.status || "Open",
      due_date: t.due_date || "Open",
      action_plan_note: "",
    });
  };

  const handleSaveTopic = async () => {
    if (!editingTopic) return;
    try {
      setSaving(true);
      await apiHrm.updateHrLegalTopic(editingTopic.no, editForm);
      setEditingTopic(null);
      await loadData();
    } catch (err: any) {
      alert("Gagal menyimpan perubahan: " + (err?.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ padding: "3rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "1rem" }}>
        <RefreshCw size={32} className="spin" style={{ color: "var(--color-primary)" }} />
        <div style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Memuat Data HR & Legal Dashboard...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: "2rem", color: "var(--color-danger)" }}>
        <p>{error}</p>
        <button onClick={loadData} className="btn btn-primary">Coba Lagi</button>
      </div>
    );
  }

  const activeMenu = HR_LEGAL_SUBMENUS.find((m) => m.id === section) || HR_LEGAL_SUBMENUS[0];
  const topics = data?.topics || [];
  const att = data?.attendance_ratio || {};
  const disc = data?.disciplinary || {};
  const payroll = data?.payroll_process || {};
  const bpjs = data?.bpjs_insurance || {};
  const kpi = data?.kpi_personal || {};
  const mp = data?.man_power || {};
  const rec = data?.recruitment || {};
  const trn = data?.training_coaching || {};
  const bnf = data?.employee_benefits || {};
  const leg = data?.legality || {};

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-surface)",
    border: "1px solid var(--bg-border)",
    borderRadius: "12px",
    padding: "1.25rem",
  };

  const badgeStyle = (type: "success" | "warning" | "danger" | "info"): React.CSSProperties => {
    const colors = {
      success: { bg: "rgba(16, 185, 129, 0.14)", color: "#10B981", border: "rgba(16, 185, 129, 0.35)" },
      warning: { bg: "rgba(245, 158, 11, 0.14)", color: "#F59E0B", border: "rgba(245, 158, 11, 0.35)" },
      danger: { bg: "rgba(239, 68, 68, 0.14)", color: "#EF4444", border: "rgba(239, 68, 68, 0.35)" },
      info: { bg: "rgba(13, 153, 255, 0.14)", color: "#0D99FF", border: "rgba(13, 153, 255, 0.35)" },
    }[type];
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.3rem",
      padding: "0.22rem 0.65rem",
      borderRadius: "999px",
      fontSize: "0.73rem",
      fontWeight: 700,
      background: colors.bg,
      color: colors.color,
      border: `1px solid ${colors.border}`,
    };
  };

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.35rem" }}>
      {/* ── Top Header ── */}
      <div style={{ ...cardStyle, background: "linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(13, 153, 255, 0.06))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <span style={{ padding: "0.45rem", borderRadius: "10px", background: "rgba(99, 102, 241, 0.2)", color: "#6366F1", display: "inline-flex" }}>
                <Scale size={22} />
              </span>
              <h1 style={{ fontSize: "1.45rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {activeMenu.label}
              </h1>
              <span style={badgeStyle("info")}>PIC: {data?.header?.pic || "HR & PIC Terkait"}</span>
              <span style={badgeStyle("warning")}>STATUS: {data?.header?.status || "Open"}</span>
              <span style={badgeStyle("info")}>DUE DATE: {data?.header?.due_date || "Open"}</span>
            </div>
            <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Monitoring Terpadu 10 Indikator Utama HR & Legal (Kehadiran, Disiplin, Payroll Cut-Off 21-20, BPJS & Sinar Mas, KPI Personal, Man Power, Recruitment, Training/Coaching, Benefit & Legalitas)
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Link
              href="/hrm"
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid var(--bg-border)",
                background: "var(--bg-surface)",
                color: "var(--text-secondary)",
                fontSize: "0.8rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Employee Dashboard
            </Link>
            <button
              onClick={loadData}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid rgba(13, 153, 255, 0.4)",
                background: "rgba(13, 153, 255, 0.12)",
                color: "#0D99FF",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* ── 10 Sub-Menus Bar ── */}
        <div
          style={{
            marginTop: "1rem",
            paddingTop: "0.85rem",
            borderTop: "1px solid var(--bg-border)",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.4rem",
          }}
        >
          {HR_LEGAL_SUBMENUS.map((m) => {
            const isActive = pathname === m.href || section === m.id;
            return (
              <Link
                key={m.id}
                href={m.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.38rem",
                  padding: "0.38rem 0.72rem",
                  borderRadius: "7px",
                  fontSize: "0.74rem",
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#ffffff" : "var(--text-secondary)",
                  background: isActive ? "linear-gradient(135deg, #6366F1, #0D99FF)" : "var(--bg-surface)",
                  border: isActive ? "1px solid rgba(99, 102, 241, 0.6)" : "1px solid var(--bg-border)",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                }}
              >
                {m.icon}
                <span>{m.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          OVERVIEW: MASTER HR & LEGAL ACTION PLAN MATRIX (10 TOPICS)
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "overview" && (
        <>
          {/* Summary KPI Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>1. RATIO KEHADIRAN vs TARGET 90%</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#10B981", marginTop: "0.3rem" }}>
                {att.current_monthly?.achievement_pct}%
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Sakit {att.current_monthly?.sakit_pct}% • UL {att.current_monthly?.ul_pct}% • Mangkir {att.current_monthly?.mangkir_pct}%
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>3. PROSES PAYROLL (CUT-OFF 21-20)</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0D99FF", marginTop: "0.3rem" }}>
                W4: 98.5%
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                W1: 25% ✓ • W2: 50% ✓ • W3: 75% ✓ • W4: Target 100%
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>5. KPI PERSONAL (MIN 80%)</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#8B5CF6", marginTop: "0.3rem" }}>
                {kpi.overall_achievement_pct}%
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                {kpi.total_underperform} Underperform ({kpi.punishment_implementation_pct}% Tindak Lanjut)
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>6. MAN POWER & TURNOVER (MAX 15%)</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#10B981", marginTop: "0.3rem" }}>
                {mp.annual_turnover_pct}% / Thn
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                {mp.total_active} Karyawan Aktif di 13 Departemen
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>10. PEMENUHAN LEGALITAS & LISENSI</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#F59E0B", marginTop: "0.3rem" }}>
                {leg.overall_fulfillment_pct}%
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Izin Usaha 97.5% • Kontrak 98.4% • Lisensi 96.8%
              </div>
            </div>
          </div>

          {/* Master Reference Table: ISSUE / TOPIC | ACTION PLAN | PIC | STATUS | DUE DATE */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  2. HR & Legal Dashboard — Master Action Plan & Monitoring Matrix
                </h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.2rem 0 0 0" }}>
                  Klik judul Issue/Topic untuk membuka halaman detail masing-masing sub-menu, atau klik Edit untuk memperbarui PIC, Status, dan Due Date.
                </p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left", background: "rgba(99, 102, 241, 0.06)" }}>
                    <th style={{ padding: "0.75rem", width: "48px" }}>NO</th>
                    <th style={{ padding: "0.75rem", minWidth: "230px" }}>ISSUE / TOPIC</th>
                    <th style={{ padding: "0.75rem", minWidth: "320px" }}>ACTION PLAN</th>
                    <th style={{ padding: "0.75rem", minWidth: "240px" }}>REALISASI vs TARGET</th>
                    <th style={{ padding: "0.75rem", minWidth: "140px" }}>PIC</th>
                    <th style={{ padding: "0.75rem", width: "110px" }}>STATUS</th>
                    <th style={{ padding: "0.75rem", width: "110px" }}>DUE DATE</th>
                    <th style={{ padding: "0.75rem", width: "130px", textAlign: "right" }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((t: any) => (
                    <tr key={t.no} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                      <td style={{ padding: "0.85rem 0.75rem", fontWeight: 700, color: "var(--color-primary)" }}>
                        {t.no}
                      </td>
                      <td style={{ padding: "0.85rem 0.75rem" }}>
                        <Link
                          href={t.href}
                          style={{
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                          }}
                        >
                          <span>{t.topic}</span>
                          <ArrowUpRight size={14} style={{ color: "#0D99FF" }} />
                        </Link>
                        <div style={{ marginTop: "0.25rem" }}>
                          <span style={badgeStyle("info")}>{t.frequency}</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 0.75rem", color: "var(--text-secondary)" }}>
                        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                          {(t.action_plans || []).map((ap: string, i: number) => (
                            <li key={i}>{ap}</li>
                          ))}
                        </ul>
                      </td>
                      <td style={{ padding: "0.85rem 0.75rem" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{t.actual_label}</div>
                        <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          Target: {t.target_label} • Trend: <strong style={{ color: "#10B981" }}>{t.trend}</strong>
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 0.75rem", fontWeight: 600 }}>{t.pic}</td>
                      <td style={{ padding: "0.85rem 0.75rem" }}>
                        <span
                          style={badgeStyle(
                            t.status === "Closed" ? "success" : t.status === "In Progress" ? "info" : "warning"
                          )}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                        {t.due_date}
                      </td>
                      <td style={{ padding: "0.85rem 0.75rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                          <button
                            onClick={() => handleOpenEdit(t)}
                            style={{
                              padding: "0.35rem 0.6rem",
                              borderRadius: "6px",
                              border: "1px solid var(--bg-border)",
                              background: "var(--bg-surface)",
                              color: "var(--text-secondary)",
                              fontSize: "0.74rem",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <Edit3 size={12} />
                            Update
                          </button>
                          <Link
                            href={t.href}
                            style={{
                              padding: "0.35rem 0.65rem",
                              borderRadius: "6px",
                              background: "rgba(13, 153, 255, 0.14)",
                              color: "#0D99FF",
                              fontSize: "0.74rem",
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                          >
                            Detail
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 1: RATIO KEHADIRAN [WEEKLY & MONTHLY]
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "attendance-ratio" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>PENCAPAIAN vs TARGET (90%)</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#10B981", marginTop: "0.3rem" }}>
                {att.current_monthly?.achievement_pct}% <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>/ 90.0%</span>
              </div>
              <div style={{ marginTop: "0.35rem" }}>
                <span style={badgeStyle("success")}>Melampaui Target (+{(att.current_monthly?.achievement_pct - 90).toFixed(2)}%)</span>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>STATUS NAIK / TURUN PERIODE</div>
              <div style={{ fontSize: "1.55rem", fontWeight: 800, color: att.current_monthly?.delta_pct >= 0 ? "#10B981" : "#EF4444", marginTop: "0.3rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {att.current_monthly?.delta_pct >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                {att.current_monthly?.trend_status} ({att.current_monthly?.delta_pct >= 0 ? "+" : ""}{att.current_monthly?.delta_pct}%)
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Dibandingkan periode bulan sebelumnya
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>% SAKIT (SICK LEAVE)</div>
              <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#F59E0B", marginTop: "0.3rem" }}>
                {att.current_monthly?.sakit_pct}%
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                {att.current_monthly?.sakit_days} Hari Sakit Tercatat
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>% UL (UNPAID LEAVE) & MANGKIR</div>
              <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#EF4444", marginTop: "0.3rem" }}>
                UL {att.current_monthly?.ul_pct}% • Mangkir {att.current_monthly?.mangkir_pct}%
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                UL: {att.current_monthly?.ul_days} hari • Mangkir/Alpha: {att.current_monthly?.mangkir_days} hari
              </div>
            </div>
          </div>

          {/* Weekly Attendance Table */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 0.85rem 0", fontSize: "1rem", fontWeight: 700 }}>
              Monitoring Ratio Kehadiran Mingguan [Weekly] vs Target 90%
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left" }}>
                    <th style={{ padding: "0.7rem" }}>Periode Minggu</th>
                    <th style={{ padding: "0.7rem" }}>Target</th>
                    <th style={{ padding: "0.7rem" }}>Pencapaian (%)</th>
                    <th style={{ padding: "0.7rem" }}>Status Naik/Turun</th>
                    <th style={{ padding: "0.7rem" }}>% Sakit</th>
                    <th style={{ padding: "0.7rem" }}>% UL (Unpaid Leave)</th>
                    <th style={{ padding: "0.7rem" }}>% Mangkir (Alpha)</th>
                    <th style={{ padding: "0.7rem" }}>Status Target</th>
                  </tr>
                </thead>
                <tbody>
                  {(att.weekly || []).map((w: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                      <td style={{ padding: "0.7rem", fontWeight: 600 }}>{w.week}</td>
                      <td style={{ padding: "0.7rem" }}>{w.target_pct}%</td>
                      <td style={{ padding: "0.7rem", fontWeight: 700, color: "#10B981" }}>{w.achievement_pct}%</td>
                      <td style={{ padding: "0.7rem" }}>
                        <span style={badgeStyle(w.delta_pct >= 0 ? "success" : "danger")}>
                          {w.trend_status} ({w.delta_pct >= 0 ? "+" : ""}{w.delta_pct}%)
                        </span>
                      </td>
                      <td style={{ padding: "0.7rem" }}>{w.sakit_pct}% ({w.sakit_count} org)</td>
                      <td style={{ padding: "0.7rem" }}>{w.ul_pct}% ({w.ul_count} org)</td>
                      <td style={{ padding: "0.7rem" }}>{w.mangkir_pct}% ({w.mangkir_count} org)</td>
                      <td style={{ padding: "0.7rem" }}>
                        <span style={badgeStyle(w.achievement_pct >= 90 ? "success" : "warning")}>
                          {w.achievement_pct >= 90 ? "TERCAPAI (≥90%)" : "DI BAWAH TARGET"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Attendance History Table */}
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 0.85rem 0", fontSize: "1rem", fontWeight: 700 }}>
              Rekapitulasi Ratio Kehadiran Bulanan [Monthly] (Data Riil hr.absen_pegawai_status)
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left" }}>
                    <th style={{ padding: "0.7rem" }}>Bulan</th>
                    <th style={{ padding: "0.7rem" }}>Headcount</th>
                    <th style={{ padding: "0.7rem" }}>Total Hari Kerja</th>
                    <th style={{ padding: "0.7rem" }}>Pencapaian vs Target 90%</th>
                    <th style={{ padding: "0.7rem" }}>Status Naik/Turun</th>
                    <th style={{ padding: "0.7rem" }}>% Sakit</th>
                    <th style={{ padding: "0.7rem" }}>% UL</th>
                    <th style={{ padding: "0.7rem" }}>% Mangkir</th>
                  </tr>
                </thead>
                <tbody>
                  {(att.monthly || []).map((m: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                      <td style={{ padding: "0.7rem", fontWeight: 700 }}>{m.period}</td>
                      <td style={{ padding: "0.7rem" }}>{m.headcount} Pegawai</td>
                      <td style={{ padding: "0.7rem" }}>{m.total_workdays.toLocaleString("id-ID")} Hari</td>
                      <td style={{ padding: "0.7rem", fontWeight: 700, color: m.achievement_pct >= 90 ? "#10B981" : "#F59E0B" }}>
                        {m.achievement_pct}% (Target {m.target_pct}%)
                      </td>
                      <td style={{ padding: "0.7rem" }}>
                        <span style={badgeStyle(m.delta_pct >= 0 ? "success" : "warning")}>
                          {m.trend_status} ({m.delta_pct >= 0 ? "+" : ""}{m.delta_pct}%)
                        </span>
                      </td>
                      <td style={{ padding: "0.7rem" }}>{m.sakit_pct}% ({m.sakit_days} hr)</td>
                      <td style={{ padding: "0.7rem" }}>{m.ul_pct}% ({m.ul_days} hr)</td>
                      <td style={{ padding: "0.7rem" }}>{m.mangkir_pct}% ({m.mangkir_days} hr)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 2: PELANGGARAN TATA TERTIB [WEEKLY & MONTHLY]
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "disciplinary" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1rem" }}>
            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>TOTAL INSIDEN BULAN BERJALAN</div>
              <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#F59E0B", marginTop: "0.3rem" }}>
                {disc.current_monthly?.total_violations} Insiden
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Terlambat {disc.current_monthly?.terlambat} • Lupa Absen {disc.current_monthly?.lupa_absen} • Mangkir {disc.current_monthly?.mangkir}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>STATUS NAIK / TURUN PELANGGARAN</div>
              <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#10B981", marginTop: "0.3rem" }}>
                {disc.current_monthly?.trend_status} ({disc.current_monthly?.delta_count} Kasus)
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Tren pelanggaran menurun dibanding periode lalu
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>PENYELESAIAN TINDAK LANJUT</div>
              <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#0D99FF", marginTop: "0.3rem" }}>
                {disc.current_monthly?.resolved_pct}%
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Coaching, Teguran Tertulis, SP1/SP2 & Potong Insentif
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 0.85rem 0", fontSize: "1rem", fontWeight: 700 }}>
              Monitoring Pelanggaran Tata Tertib Mingguan [Weekly] & Tindak Lanjut
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left" }}>
                    <th style={{ padding: "0.7rem" }}>Minggu</th>
                    <th style={{ padding: "0.7rem" }}>Keterlambatan</th>
                    <th style={{ padding: "0.7rem" }}>Lupa Absen</th>
                    <th style={{ padding: "0.7rem" }}>Mangkir / Alpha</th>
                    <th style={{ padding: "0.7rem" }}>Pelanggaran SOP/K3</th>
                    <th style={{ padding: "0.7rem" }}>Total</th>
                    <th style={{ padding: "0.7rem" }}>Status Naik/Turun</th>
                    <th style={{ padding: "0.7rem" }}>Tindak Lanjut HR & Atasan</th>
                  </tr>
                </thead>
                <tbody>
                  {(disc.weekly || []).map((w: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                      <td style={{ padding: "0.7rem", fontWeight: 600 }}>{w.week}</td>
                      <td style={{ padding: "0.7rem" }}>{w.terlambat}</td>
                      <td style={{ padding: "0.7rem" }}>{w.lupa_absen}</td>
                      <td style={{ padding: "0.7rem" }}>{w.mangkir}</td>
                      <td style={{ padding: "0.7rem" }}>{w.pelanggaran_sop}</td>
                      <td style={{ padding: "0.7rem", fontWeight: 700 }}>{w.total}</td>
                      <td style={{ padding: "0.7rem" }}>
                        <span style={badgeStyle(w.delta <= 0 ? "success" : "danger")}>
                          {w.trend} ({w.delta})
                        </span>
                      </td>
                      <td style={{ padding: "0.7rem", color: "var(--text-secondary)" }}>{w.tindak_lanjut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 0.85rem 0", fontSize: "1rem", fontWeight: 700 }}>
              Daftar Kasus Pelanggaran Tata Tertib & Status Tindak Lanjut
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left" }}>
                    <th style={{ padding: "0.7rem" }}>No Kasus</th>
                    <th style={{ padding: "0.7rem" }}>Personel / Unit</th>
                    <th style={{ padding: "0.7rem" }}>Departemen & Cabang</th>
                    <th style={{ padding: "0.7rem" }}>Jenis Pelanggaran</th>
                    <th style={{ padding: "0.7rem" }}>Kategori</th>
                    <th style={{ padding: "0.7rem" }}>Tindak Lanjut</th>
                    <th style={{ padding: "0.7rem" }}>PIC</th>
                    <th style={{ padding: "0.7rem" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(disc.cases || []).map((c: any) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                      <td style={{ padding: "0.7rem", fontWeight: 700 }}>{c.id}</td>
                      <td style={{ padding: "0.7rem", fontWeight: 600 }}>{c.employee_name}</td>
                      <td style={{ padding: "0.7rem" }}>{c.department} ({c.branch})</td>
                      <td style={{ padding: "0.7rem" }}>{c.violation_type}</td>
                      <td style={{ padding: "0.7rem" }}>
                        <span style={badgeStyle(c.severity === "Berat" ? "danger" : c.severity === "Sedang" ? "warning" : "info")}>
                          {c.severity}
                        </span>
                      </td>
                      <td style={{ padding: "0.7rem" }}>{c.follow_up}</td>
                      <td style={{ padding: "0.7rem" }}>{c.pic}</td>
                      <td style={{ padding: "0.7rem" }}>
                        <span style={badgeStyle(c.status === "Closed" ? "success" : "warning")}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 3: PROSES PAYROLL; CUT OFF 21-20 [WEEKLY & MONTHLY]
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "payroll-process" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1rem" }}>
            {(payroll.weekly_milestones || []).map((w: any, idx: number) => (
              <div key={idx} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>{w.week}</span>
                  <span style={badgeStyle(w.actual_pct >= w.target_pct ? "success" : "info")}>{w.status}</span>
                </div>
                <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.35rem" }}>
                  {w.actual_pct}% <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 500 }}>/ Target {w.target_pct}%</span>
                </div>
                <div style={{ marginTop: "0.5rem", height: "8px", borderRadius: "999px", background: "var(--bg-border)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, w.actual_pct)}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #0D99FF, #10B981)",
                    }}
                  />
                </div>
                <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                  {w.milestone}
                </div>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 0.85rem 0", fontSize: "1rem", fontWeight: 700 }}>
              Tahapan Penyelesaian Proses Payroll (Cut-Off 21 s/d 20) vs Target Mingguan (25% → 50% → 75% → 100%)
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left" }}>
                    <th style={{ padding: "0.7rem" }}>Tahapan Minggu</th>
                    <th style={{ padding: "0.7rem" }}>Target Kumulatif</th>
                    <th style={{ padding: "0.7rem" }}>Realisasi</th>
                    <th style={{ padding: "0.7rem" }}>Agenda & Fokus Pekerjaan</th>
                    <th style={{ padding: "0.7rem" }}>Output / Deliverable</th>
                    <th style={{ padding: "0.7rem" }}>PIC</th>
                    <th style={{ padding: "0.7rem" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(payroll.weekly_milestones || []).map((w: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                      <td style={{ padding: "0.7rem", fontWeight: 700 }}>{w.week}</td>
                      <td style={{ padding: "0.7rem", fontWeight: 700, color: "#0D99FF" }}>{w.target_pct}%</td>
                      <td style={{ padding: "0.7rem", fontWeight: 700, color: "#10B981" }}>{w.actual_pct}%</td>
                      <td style={{ padding: "0.7rem", fontWeight: 600 }}>{w.milestone}</td>
                      <td style={{ padding: "0.7rem", color: "var(--text-secondary)" }}>{w.deliverables}</td>
                      <td style={{ padding: "0.7rem" }}>{w.pic}</td>
                      <td style={{ padding: "0.7rem" }}>
                        <span style={badgeStyle(w.status === "Completed" ? "success" : "info")}>{w.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 4: PROSES BPJS (TK & KES) + KESEHATAN SINAR MAS [MONTHLY]
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "bpjs-insurance" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>TOTAL PESERTA TERDAFTAR</div>
              <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.3rem" }}>
                {bpjs.total_participants} Karyawan
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                BPJS TK: {bpjs.bpjs_tk_participants} • BPJS Kes: {bpjs.bpjs_kes_participants} • Asuransi Komersil/Sinar Mas: {bpjs.sinarmas_participants}
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>IURAN BPJS KETENAGAKERJAAN</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0D99FF", marginTop: "0.3rem" }}>
                {formatIDR(bpjs.monthly_premi_tk)}
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                JHT, JKK, JKM, & Jaminan Pensiun (JP)
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>IURAN BPJS KESEHATAN</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#10B981", marginTop: "0.3rem" }}>
                {formatIDR(bpjs.monthly_premi_kes)}
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Porsi Perusahaan (4%) & Pekerja (1%)
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>PREMI KESEHATAN SINAR MAS / KOMERSIL</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#8B5CF6", marginTop: "0.3rem" }}>
                {formatIDR(bpjs.monthly_premi_sinarmas)}
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Proteksi Rawat Inap & Fasilitas RS Rekanan
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 0.85rem 0", fontSize: "1rem", fontWeight: 700 }}>
              4 Indikator Akurasi BPJS (Ketenagakerjaan & Kesehatan) + Kesehatan Sinar Mas vs Target 100% Tanpa Kesalahan
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left" }}>
                    <th style={{ padding: "0.7rem" }}>Indikator Kualitas</th>
                    <th style={{ padding: "0.7rem" }}>Parameter Evaluasi</th>
                    <th style={{ padding: "0.7rem" }}>Data Diperiksa</th>
                    <th style={{ padding: "0.7rem" }}>Jumlah Error/Gagal</th>
                    <th style={{ padding: "0.7rem" }}>Realisasi vs Target 100%</th>
                    <th style={{ padding: "0.7rem" }}>Status</th>
                    <th style={{ padding: "0.7rem" }}>Keterangan Tindak Lanjut</th>
                  </tr>
                </thead>
                <tbody>
                  {(bpjs.quality_metrics || []).map((m: any) => (
                    <tr key={m.id} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                      <td style={{ padding: "0.7rem", fontWeight: 700 }}>{m.indicator}</td>
                      <td style={{ padding: "0.7rem", color: "var(--text-secondary)" }}>{m.description}</td>
                      <td style={{ padding: "0.7rem" }}>{m.total_checked} Peserta</td>
                      <td style={{ padding: "0.7rem", fontWeight: 700, color: m.error_count === 0 ? "#10B981" : "#F59E0B" }}>
                        {m.error_count} Kasus
                      </td>
                      <td style={{ padding: "0.7rem", fontWeight: 700, color: "#10B981" }}>
                        {m.accuracy_pct}% / {m.target_pct}%
                      </td>
                      <td style={{ padding: "0.7rem" }}>
                        <span style={badgeStyle(m.error_count === 0 ? "success" : "info")}>{m.status}</span>
                      </td>
                      <td style={{ padding: "0.7rem", color: "var(--text-secondary)" }}>{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 5: KPI PERSONAL [MONTHLY]
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "kpi-personal" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1rem" }}>
            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>% PENCAPAIAN KESELURUHAN vs MIN 80%</div>
              <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#10B981", marginTop: "0.3rem" }}>
                {kpi.overall_achievement_pct}% <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>/ Min 80.0%</span>
              </div>
              <div style={{ marginTop: "0.35rem" }}>
                <span style={badgeStyle("success")}>Di Atas Standar Minimum (+{(kpi.overall_achievement_pct - 80).toFixed(1)}%)</span>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>JUMLAH PUNISHMENT DI BAWAH PERFORM</div>
              <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#F59E0B", marginTop: "0.3rem" }}>
                {kpi.total_underperform} Personel
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Karyawan dengan skor evaluasi bulanan &lt; 80%
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>% IMPLEMENTASI PUNISHMENT</div>
              <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#0D99FF", marginTop: "0.3rem" }}>
                {kpi.punishment_implementation_pct}% ({kpi.total_punishment_implemented}/{kpi.total_underperform})
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Coaching wajib, pemotongan insentif KPI & evaluasi kontrak
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 0.85rem 0", fontSize: "1rem", fontWeight: 700 }}>
              Pencapaian KPI Personal per Departemen vs Target Min. 80% & Implementasi Punishment
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left" }}>
                    <th style={{ padding: "0.7rem" }}>Departemen</th>
                    <th style={{ padding: "0.7rem" }}>Jumlah Personel</th>
                    <th style={{ padding: "0.7rem" }}>Target Min</th>
                    <th style={{ padding: "0.7rem" }}>Rata-rata Capaian KPI</th>
                    <th style={{ padding: "0.7rem" }}>Status Dept</th>
                    <th style={{ padding: "0.7rem" }}>Di Bawah Perform (&lt;80%)</th>
                    <th style={{ padding: "0.7rem" }}>% Implementasi Punishment</th>
                    <th style={{ padding: "0.7rem" }}>Tindak Lanjut</th>
                  </tr>
                </thead>
                <tbody>
                  {(kpi.by_department || []).map((d: any) => (
                    <tr key={d.dept_id} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                      <td style={{ padding: "0.7rem", fontWeight: 700 }}>{d.department}</td>
                      <td style={{ padding: "0.7rem" }}>{d.headcount} Org</td>
                      <td style={{ padding: "0.7rem" }}>{d.target_min_pct}%</td>
                      <td style={{ padding: "0.7rem", fontWeight: 700, color: d.avg_kpi_pct >= 80 ? "#10B981" : "#EF4444" }}>
                        {d.avg_kpi_pct}%
                      </td>
                      <td style={{ padding: "0.7rem" }}>
                        <span style={badgeStyle(d.avg_kpi_pct >= 80 ? "success" : "danger")}>{d.status}</span>
                      </td>
                      <td style={{ padding: "0.7rem", fontWeight: 600 }}>{d.underperform_count} Org</td>
                      <td style={{ padding: "0.7rem", fontWeight: 700, color: "#0D99FF" }}>
                        {d.punishment_pct}% ({d.punishment_implemented}/{d.underperform_count})
                      </td>
                      <td style={{ padding: "0.7rem", color: "var(--text-secondary)" }}>{d.action_taken}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 6: MAN POWER [WEEKLY & MONTHLY]
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "man-power" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1rem" }}>
            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>TURNOVER KARYAWAN vs MAX 15%/THN</div>
              <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#10B981", marginTop: "0.3rem" }}>
                {mp.annual_turnover_pct}% <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>/ Max 15.0%</span>
              </div>
              <div style={{ marginTop: "0.35rem" }}>
                <span style={badgeStyle("success")}>Terkendali di Bawah Batas Maksimal</span>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>TOTAL PERSONAL AKTIF</div>
              <div style={{ fontSize: "1.7rem", fontWeight: 800, color: "#0D99FF", marginTop: "0.3rem" }}>
                {mp.total_active} Karyawan
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Terdistribusi di 13 Departemen & 10 Cabang
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 0.85rem 0", fontSize: "1rem", fontWeight: 700 }}>
              Pergerakan In / Out Karyawan Mingguan [Weekly]
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left" }}>
                    <th style={{ padding: "0.7rem" }}>Minggu</th>
                    <th style={{ padding: "0.7rem" }}>Karyawan Masuk (In)</th>
                    <th style={{ padding: "0.7rem" }}>Karyawan Keluar / Resign (Out)</th>
                    <th style={{ padding: "0.7rem" }}>Mutasi / Rotasi Cabang</th>
                    <th style={{ padding: "0.7rem" }}>Net Perubahan</th>
                    <th style={{ padding: "0.7rem" }}>Total Headcount Akhir</th>
                  </tr>
                </thead>
                <tbody>
                  {(mp.weekly_in_out || []).map((w: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                      <td style={{ padding: "0.7rem", fontWeight: 600 }}>{w.week}</td>
                      <td style={{ padding: "0.7rem", color: "#10B981", fontWeight: 700 }}>+{w.join_in} Org</td>
                      <td style={{ padding: "0.7rem", color: "#EF4444", fontWeight: 700 }}>-{w.resign_out} Org</td>
                      <td style={{ padding: "0.7rem" }}>{w.mutation} Org</td>
                      <td style={{ padding: "0.7rem", fontWeight: 700 }}>{w.net_change >= 0 ? `+${w.net_change}` : w.net_change}</td>
                      <td style={{ padding: "0.7rem", fontWeight: 700 }}>{w.ending_headcount} Karyawan</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 0.85rem 0", fontSize: "1rem", fontWeight: 700 }}>
              Jumlah Personal & Persentase di Setiap Departemen [Monthly]
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left" }}>
                    <th style={{ padding: "0.7rem" }}>Departemen</th>
                    <th style={{ padding: "0.7rem" }}>Jumlah Personal</th>
                    <th style={{ padding: "0.7rem" }}>% Porsi Departemen</th>
                    <th style={{ padding: "0.7rem" }}>Tetap</th>
                    <th style={{ padding: "0.7rem" }}>Kontrak</th>
                    <th style={{ padding: "0.7rem" }}>Probation</th>
                    <th style={{ padding: "0.7rem" }}>In / Out Bulan Ini</th>
                  </tr>
                </thead>
                <tbody>
                  {(mp.by_department || []).map((d: any) => (
                    <tr key={d.dept_id} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                      <td style={{ padding: "0.7rem", fontWeight: 700 }}>{d.department}</td>
                      <td style={{ padding: "0.7rem", fontWeight: 700 }}>{d.active_headcount} Org</td>
                      <td style={{ padding: "0.7rem", fontWeight: 700, color: "#0D99FF" }}>{d.percentage_of_total}%</td>
                      <td style={{ padding: "0.7rem" }}>{d.tetap}</td>
                      <td style={{ padding: "0.7rem" }}>{d.kontrak}</td>
                      <td style={{ padding: "0.7rem" }}>{d.probation}</td>
                      <td style={{ padding: "0.7rem" }}>
                        <span style={{ color: "#10B981", fontWeight: 600 }}>+{d.in_monthly} In</span> /{" "}
                        <span style={{ color: "#EF4444", fontWeight: 600 }}>-{d.out_monthly} Out</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 7: RECRUITMENT [MONTHLY]
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "recruitment" && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 0.85rem 0", fontSize: "1rem", fontWeight: 700 }}>
            Monitoring Recruitment Bulanan: Min. 5 Kandidat Siap Proses per Posisi & Waktu Penyelesaian vs Waktu Baku Level
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left" }}>
                  <th style={{ padding: "0.7rem" }}>Kode</th>
                  <th style={{ padding: "0.7rem" }}>Posisi Jabatan</th>
                  <th style={{ padding: "0.7rem" }}>Departemen & Cabang</th>
                  <th style={{ padding: "0.7rem" }}>Level</th>
                  <th style={{ padding: "0.7rem" }}>Kandidat Siap Proses (Min. 5)</th>
                  <th style={{ padding: "0.7rem" }}>Waktu Proses vs Baku (SLA)</th>
                  <th style={{ padding: "0.7rem" }}>Tahap Saat Ini</th>
                  <th style={{ padding: "0.7rem" }}>Status SLA</th>
                </tr>
              </thead>
              <tbody>
                {(rec.open_positions || []).map((p: any) => (
                  <tr key={p.req_id} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                    <td style={{ padding: "0.7rem", fontWeight: 700 }}>{p.req_id}</td>
                    <td style={{ padding: "0.7rem", fontWeight: 700 }}>{p.position}</td>
                    <td style={{ padding: "0.7rem" }}>{p.department} • {p.branch}</td>
                    <td style={{ padding: "0.7rem" }}>{p.level}</td>
                    <td style={{ padding: "0.7rem", fontWeight: 700, color: "#10B981" }}>
                      {p.candidates_ready} Kandidat (Target ≥ {p.min_target_candidates})
                    </td>
                    <td style={{ padding: "0.7rem", fontWeight: 600 }}>
                      {p.days_elapsed} Hari / Baku {p.sla_days} Hari
                    </td>
                    <td style={{ padding: "0.7rem" }}>{p.status}</td>
                    <td style={{ padding: "0.7rem" }}>
                      <span style={badgeStyle("success")}>Memenuhi Kandidat & SLA</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 8: TRAINING, COACHING/COUNSELING [MONTHLY]
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "training-coaching" && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 0.85rem 0", fontSize: "1rem", fontWeight: 700 }}>
            Monitoring Pelaksanaan Training, Coaching & Counseling Setiap Departemen [Monthly]
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left" }}>
                  <th style={{ padding: "0.7rem" }}>Departemen</th>
                  <th style={{ padding: "0.7rem" }}>Topik Training & Pembinaan Utama</th>
                  <th style={{ padding: "0.7rem" }}>Sesi (Realisasi/Rencana)</th>
                  <th style={{ padding: "0.7rem" }}>Peserta (Aktual/Target)</th>
                  <th style={{ padding: "0.7rem" }}>Sesi Coaching/Counseling</th>
                  <th style={{ padding: "0.7rem" }}>% Pelaksanaan</th>
                  <th style={{ padding: "0.7rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(trn.by_department || []).map((d: any) => (
                  <tr key={d.dept_id} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                    <td style={{ padding: "0.7rem", fontWeight: 700 }}>{d.department}</td>
                    <td style={{ padding: "0.7rem", color: "var(--text-secondary)" }}>{d.training_topic}</td>
                    <td style={{ padding: "0.7rem", fontWeight: 600 }}>{d.completed_sessions} / {d.planned_sessions} Sesi</td>
                    <td style={{ padding: "0.7rem" }}>{d.participants_actual} / {d.participants_target} Org</td>
                    <td style={{ padding: "0.7rem" }}>{d.coaching_counseling_cases} Sesi</td>
                    <td style={{ padding: "0.7rem", fontWeight: 700, color: d.achievement_pct >= 90 ? "#10B981" : "#F59E0B" }}>
                      {d.achievement_pct}%
                    </td>
                    <td style={{ padding: "0.7rem" }}>
                      <span style={badgeStyle(d.achievement_pct >= 90 ? "success" : "info")}>{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 9: PELAKSANAAN BENEFIT LAIN UNTUK KARYAWAN [MONTHLY]
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "employee-benefits" && (
        <div style={cardStyle}>
          <h3 style={{ margin: "0 0 0.85rem 0", fontSize: "1rem", fontWeight: 700 }}>
            Pelaksanaan Benefit Karyawan (Kelahiran, Keluarga Inti Meninggal, Pernikahan, Medis) vs Target 100% Terlaksana
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left" }}>
                  <th style={{ padding: "0.7rem" }}>Kode</th>
                  <th style={{ padding: "0.7rem" }}>Jenis Benefit Karyawan</th>
                  <th style={{ padding: "0.7rem" }}>Standar Kebijakan Perusahaan</th>
                  <th style={{ padding: "0.7rem" }}>Klaim Diajukan</th>
                  <th style={{ padding: "0.7rem" }}>Realisasi</th>
                  <th style={{ padding: "0.7rem" }}>Total Nilai Disalurkan</th>
                  <th style={{ padding: "0.7rem" }}>SLA Pencairan</th>
                  <th style={{ padding: "0.7rem" }}>Capaian vs 100%</th>
                </tr>
              </thead>
              <tbody>
                {(bnf.items || []).map((b: any) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                    <td style={{ padding: "0.7rem", fontWeight: 700 }}>{b.id}</td>
                    <td style={{ padding: "0.7rem", fontWeight: 700 }}>{b.benefit_type}</td>
                    <td style={{ padding: "0.7rem", color: "var(--text-secondary)" }}>{b.policy_standard}</td>
                    <td style={{ padding: "0.7rem" }}>{b.submitted_claims} Pengajuan</td>
                    <td style={{ padding: "0.7rem", fontWeight: 700, color: "#10B981" }}>{b.realized_claims} Selesai</td>
                    <td style={{ padding: "0.7rem", fontWeight: 700 }}>{formatIDR(b.total_disbursed_idr)}</td>
                    <td style={{ padding: "0.7rem" }}>{b.sla_days}</td>
                    <td style={{ padding: "0.7rem" }}>
                      <span style={badgeStyle("success")}>{b.status} ({b.actual_pct}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 10: LEGALITAS [WEEKLY & MONTHLY]
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "legality" && (
        <>
          {(leg.categories || []).map((cat: any) => (
            <div key={cat.category_id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                    {cat.category_name}
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Dokumen Terpenuhi: {cat.fulfilled_documents} dari {cat.total_documents} Dokumen ({cat.in_renewal} Dalam Proses Perpanjangan)
                  </div>
                </div>
                <span style={badgeStyle(cat.actual_pct >= 98 ? "success" : "info")}>
                  Pemenuhan: {cat.actual_pct}% / Target {cat.target_pct}%
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left" }}>
                      <th style={{ padding: "0.7rem" }}>Kode Dokumen</th>
                      <th style={{ padding: "0.7rem" }}>Nama Perizinan / Kontrak / Lisensi</th>
                      <th style={{ padding: "0.7rem" }}>Cakupan Cabang</th>
                      <th style={{ padding: "0.7rem" }}>Masa Berlaku</th>
                      <th style={{ padding: "0.7rem" }}>PIC</th>
                      <th style={{ padding: "0.7rem" }}>Status Pemenuhan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cat.items || []).map((item: any) => (
                      <tr key={item.doc_no} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                        <td style={{ padding: "0.7rem", fontWeight: 700 }}>{item.doc_no}</td>
                        <td style={{ padding: "0.7rem", fontWeight: 600 }}>{item.title}</td>
                        <td style={{ padding: "0.7rem" }}>{item.branch}</td>
                        <td style={{ padding: "0.7rem" }}>{item.expiry_date}</td>
                        <td style={{ padding: "0.7rem" }}>{item.pic}</td>
                        <td style={{ padding: "0.7rem" }}>
                          <span style={badgeStyle(item.status.includes("100%") || item.status.includes("Terpenuhi") ? "success" : "warning")}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Modal Update Topic Action Plan / PIC / Status / Due Date */}
      {editingTopic && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div style={{ ...cardStyle, width: "100%", maxWidth: "480px", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                Update Topic #{editingTopic.no}: {editingTopic.topic}
              </h3>
              <button onClick={() => setEditingTopic(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.3rem" }}>PIC</label>
              <input
                type="text"
                value={editForm.pic}
                onChange={(e) => setEditForm({ ...editForm, pic: e.target.value })}
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid var(--bg-border)", background: "var(--bg-base)", color: "var(--text-primary)" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.3rem" }}>Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid var(--bg-border)", background: "var(--bg-base)", color: "var(--text-primary)" }}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.3rem" }}>Due Date</label>
                <input
                  type="text"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  placeholder="Open atau YYYY-MM-DD"
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid var(--bg-border)", background: "var(--bg-base)", color: "var(--text-primary)" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.3rem" }}>Tambahan Catatan Action Plan (Opsional)</label>
              <input
                type="text"
                value={editForm.action_plan_note}
                onChange={(e) => setEditForm({ ...editForm, action_plan_note: e.target.value })}
                placeholder="Masukkan tindak lanjut baru..."
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid var(--bg-border)", background: "var(--bg-base)", color: "var(--text-primary)" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.4rem" }}>
              <button
                onClick={() => setEditingTopic(null)}
                style={{ padding: "0.5rem 0.9rem", borderRadius: "8px", border: "1px solid var(--bg-border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                onClick={handleSaveTopic}
                disabled={saving}
                style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "#0D99FF", color: "#fff", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              >
                <Save size={14} />
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

