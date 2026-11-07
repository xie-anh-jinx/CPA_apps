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

// ── Display helpers (formatting only — semua kalkulasi bisnis ada di backend /api/hrm/hr-legal) ──
type BadgeType = "success" | "warning" | "danger" | "info";

const pctText = (v: number | null | undefined) => (v == null ? "—" : `${v}%`);
const num = (v: number | null | undefined) => (v == null ? "—" : Number(v).toLocaleString("id-ID"));
const statusColor = (v: number | null | undefined, target: number) =>
  v == null ? "var(--text-muted)" : v >= target ? "#10B981" : "#EF4444";
const trendText = (status: string | undefined, delta: number | null | undefined, unit: string) =>
  delta == null ? status || "N/A" : `${status} (${delta > 0 ? "+" : ""}${delta}${unit})`;
/** higherIsBetter=true untuk kehadiran; false untuk jumlah pelanggaran. */
const trendBadge = (delta: number | null | undefined, higherIsBetter: boolean): BadgeType =>
  delta == null || delta === 0 ? "info" : (delta > 0) === higherIsBetter ? "success" : "danger";
const trendColor = (delta: number | null | undefined, higherIsBetter: boolean) =>
  ({ info: "var(--text-secondary)", success: "#10B981", danger: "#EF4444", warning: "#F59E0B" })[trendBadge(delta, higherIsBetter)];

const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" };
const surfaceStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--bg-border)",
  borderRadius: "12px",
  padding: "1.25rem",
};

function KpiCard({ title, value, color, sub }: { title: string; value: React.ReactNode; color: string; sub?: React.ReactNode }) {
  return (
    <div style={{ ...surfaceStyle, height: "100%" }}>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: "1.55rem", fontWeight: 800, color, marginTop: "0.3rem" }}>{value}</div>
      {sub && <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>{sub}</div>}
    </div>
  );
}

function GapNotice({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <div style={{ ...surfaceStyle, padding: "0.8rem 1rem", borderColor: "rgba(245, 158, 11, 0.45)", background: "rgba(245, 158, 11, 0.08)", display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
      <AlertTriangle size={16} style={{ color: "#F59E0B", flexShrink: 0, marginTop: "0.1rem" }} />
      <span><strong style={{ color: "#F59E0B" }}>Data belum tersedia:</strong> {text}</span>
    </div>
  );
}

function SourceNote({ text }: { text: string }) {
  return <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "-0.5rem" }}>{text}</div>;
}

function TableCard({ title, headers, rows, note }: { title: string; headers: string[]; rows: React.ReactNode[][]; note?: string | null }) {
  return (
    <div style={surfaceStyle}>
      <h3 style={{ margin: "0 0 0.85rem 0", fontSize: "1rem", fontWeight: 700 }}>{title}</h3>
      {note && <div style={{ fontSize: "0.76rem", color: "#F59E0B", margin: "-0.5rem 0 0.75rem 0" }}>⚠ {note}</div>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--bg-border)", textAlign: "left" }}>
              {headers.map((h) => (
                <th key={h} style={{ padding: "0.7rem", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)" }}>
                  Tidak ada data pada periode ini
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--bg-border)" }}>
                  {r.map((c, j) => (
                    <td key={j} style={{ padding: "0.7rem" }}>{c}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
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
              <span style={badgeStyle("info")}>PERIODE: {data?.header?.period} ({data?.header?.period_start} s/d {data?.header?.period_end})</span>
              <span style={badgeStyle("success")}>KARYAWAN AKTIF: {data?.header?.active_employees}</span>
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
          {/* Summary KPI Row — 1 kartu per topik, nilai langsung dari API */}
          <div style={gridStyle}>
            {topics.map((t: any) => (
              <Link key={t.no} href={t.href} style={{ textDecoration: "none" }}>
                <KpiCard
                  title={`${t.no}. ${t.topic.replace(/\s*\[.*\]$/, "").toUpperCase()}`}
                  value={t.achievement_pct == null ? (t.data_gap && !t.actual_label?.match(/\d/) ? "Belum Ada Data" : "—") : `${t.achievement_pct}%`}
                  color={t.achievement_pct == null ? "var(--text-muted)" : "var(--text-primary)"}
                  sub={`Target ${t.target_label}`}
                />
              </Link>
            ))}
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
                          Target: {t.target_label} • Trend: <strong style={{ color: "var(--text-secondary)" }}>{t.trend}</strong>
                        </div>
                        {t.data_source && (
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>Sumber: {t.data_source}</div>
                        )}
                        {t.data_gap && (
                          <div style={{ fontSize: "0.7rem", color: "#F59E0B", marginTop: "0.15rem" }}>⚠ {t.data_gap}</div>
                        )}
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
      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 1: RATIO KEHADIRAN [WEEKLY & MONTHLY]  — sumber: hr.absen
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "attendance-ratio" && (
        <>
          <div style={gridStyle}>
            <KpiCard
              title={`PENCAPAIAN vs TARGET ${att.target_pct ?? 90}% · ${data?.header?.period ?? ""}`}
              value={pctText(att.current_monthly?.achievement_pct)}
              color={statusColor(att.current_monthly?.achievement_pct, att.target_pct ?? 90)}
              sub={`${num(att.current_monthly?.hadir_days)} hari hadir dari ${num(att.current_monthly?.hari_kerja_wajib)} hari kerja wajib`}
            />
            <KpiCard
              title="STATUS NAIK / TURUN vs PERIODE LALU"
              value={trendText(att.current_monthly?.trend_status, att.current_monthly?.delta, "%")}
              color={trendColor(att.current_monthly?.delta, true)}
              sub="Dibandingkan periode cut-off sebelumnya"
            />
            <KpiCard
              title="% SAKIT"
              value={pctText(att.current_monthly?.sakit_pct)}
              color="#F59E0B"
              sub={`${num(att.current_monthly?.sakit_days)} hari sakit`}
            />
            <KpiCard
              title="% UL & % MANGKIR"
              value={`${pctText(att.current_monthly?.ul_pct)} • ${pctText(att.current_monthly?.mangkir_pct)}`}
              color="#EF4444"
              sub={`UL ${num(att.current_monthly?.ul_days)} hari • Mangkir ${num(att.current_monthly?.mangkir_days)} hari`}
            />
          </div>
          <SourceNote text={`Definisi: ${att.definition ?? "-"} Sumber: hr.absen (periode ${data?.header?.period_start} s/d ${data?.header?.period_end}).`} />

          <TableCard
            title="Ratio Kehadiran Mingguan [Weekly] vs Target 90%"
            headers={["Minggu Cut-Off", "Tanggal", "Hari Kerja Wajib", "Pencapaian", "Naik/Turun", "% Sakit", "% UL", "% Mangkir", "Status"]}
            rows={(att.weekly || []).map((w: any) => [
              <strong key="w">{w.week}</strong>,
              `${w.date_from} s/d ${w.date_to}`,
              num(w.hari_kerja_wajib),
              <strong key="p" style={{ color: statusColor(w.achievement_pct, w.target_pct) }}>{pctText(w.achievement_pct)}</strong>,
              <span key="t" style={badgeStyle(trendBadge(w.delta, true))}>{trendText(w.trend_status, w.delta, "%")}</span>,
              `${pctText(w.sakit_pct)} (${w.sakit_days} hr)`,
              `${pctText(w.ul_pct)} (${w.ul_days} hr)`,
              `${pctText(w.mangkir_pct)} (${w.mangkir_days} hr)`,
              <span key="s" style={badgeStyle(w.achievement_pct >= w.target_pct ? "success" : "danger")}>
                {w.achievement_pct >= w.target_pct ? "TERCAPAI" : "DI BAWAH TARGET"}
              </span>,
            ])}
          />

          <TableCard
            title="Ratio Kehadiran Bulanan [Monthly] — 6 Periode Cut-Off Terakhir"
            headers={["Periode", "Headcount", "Hari Kerja Wajib", "Pencapaian", "Naik/Turun", "% Sakit", "% UL", "% Mangkir", "Cuti (hr)"]}
            rows={(att.monthly || []).map((m: any) => [
              <strong key="m">{m.period}</strong>,
              `${m.headcount} org`,
              num(m.hari_kerja_wajib),
              <strong key="p" style={{ color: statusColor(m.achievement_pct, m.target_pct) }}>{pctText(m.achievement_pct)}</strong>,
              <span key="t" style={badgeStyle(trendBadge(m.delta, true))}>{trendText(m.trend_status, m.delta, "%")}</span>,
              `${pctText(m.sakit_pct)} (${m.sakit_days} hr)`,
              `${pctText(m.ul_pct)} (${m.ul_days} hr)`,
              `${pctText(m.mangkir_pct)} (${m.mangkir_days} hr)`,
              num(m.cuti_days),
            ])}
          />

          <TableCard
            title={`Ratio Kehadiran per Departemen — ${data?.header?.period ?? ""} (urut dari terendah)`}
            headers={["Departemen", "Headcount", "Pencapaian", "Naik/Turun", "% Sakit", "% UL", "% Mangkir", "Status"]}
            rows={(att.by_department || []).map((d: any) => [
              <strong key="d">{d.department}</strong>,
              `${d.headcount} org`,
              <strong key="p" style={{ color: statusColor(d.achievement_pct, d.target_pct) }}>{pctText(d.achievement_pct)}</strong>,
              <span key="t" style={badgeStyle(trendBadge(d.delta_pct, true))}>{trendText(d.status_trend, d.delta_pct, "%")}</span>,
              pctText(d.sakit_pct),
              pctText(d.ul_pct),
              pctText(d.mangkir_pct),
              <span key="s" style={badgeStyle(d.achievement_pct >= d.target_pct ? "success" : "danger")}>
                {d.achievement_pct >= d.target_pct ? "TERCAPAI" : "DI BAWAH TARGET"}
              </span>,
            ])}
          />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 2: PELANGGARAN TATA TERTIB [WEEKLY & MONTHLY] — hr.absen × hr.jadwal_kerja
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "disciplinary" && (
        <>
          <div style={gridStyle}>
            <KpiCard
              title={`TOTAL PELANGGARAN · ${data?.header?.period ?? ""}`}
              value={num(disc.current_monthly?.total_violations)}
              color="#F59E0B"
              sub={`Telat ${num(disc.current_monthly?.terlambat)} • Pulang cepat ${num(disc.current_monthly?.pulang_cepat)} • Lupa absen ${num(disc.current_monthly?.lupa_absen)} • Mangkir ${num(disc.current_monthly?.mangkir)}`}
            />
            <KpiCard
              title="STATUS NAIK / TURUN vs PERIODE LALU"
              value={trendText(disc.current_monthly?.trend_status, disc.current_monthly?.delta, "")}
              color={trendColor(disc.current_monthly?.delta, false)}
              sub="Jumlah pelanggaran dibanding periode sebelumnya"
            />
            <KpiCard title="TINDAK LANJUT (SP / TEGURAN)" value="—" color="var(--text-muted)" sub="Belum tercatat di database" />
          </div>
          <GapNotice text={disc.data_gap} />

          <TableCard
            title="Pelanggaran Tata Tertib Mingguan [Weekly]"
            headers={["Minggu Cut-Off", "Terlambat", "Pulang Cepat", "Lupa Absen", "Mangkir", "Total", "Naik/Turun"]}
            rows={(disc.weekly || []).map((w: any) => [
              <strong key="w">{w.week}</strong>, w.terlambat, w.pulang_cepat, w.lupa_absen, w.mangkir,
              <strong key="t">{w.total}</strong>,
              <span key="d" style={badgeStyle(trendBadge(w.delta, false))}>{trendText(w.trend_status, w.delta, "")}</span>,
            ])}
          />
          <TableCard
            title="Pelanggaran Tata Tertib Bulanan [Monthly]"
            headers={["Periode", "Terlambat", "Pulang Cepat", "Lupa Absen", "Mangkir", "Total", "Naik/Turun"]}
            rows={(disc.monthly || []).map((m: any) => [
              <strong key="m">{m.period}</strong>, m.terlambat, m.pulang_cepat, m.lupa_absen, m.mangkir,
              <strong key="t">{m.total_violations}</strong>,
              <span key="d" style={badgeStyle(trendBadge(m.delta, false))}>{trendText(m.trend_status, m.delta, "")}</span>,
            ])}
          />
          <TableCard
            title={`Daftar Karyawan dengan Pelanggaran — ${data?.header?.period ?? ""} (Top 25)`}
            headers={["ID", "Nama", "Departemen & Cabang", "Terlambat", "Pulang Cepat", "Lupa Absen", "Mangkir", "Total", "Kategori", "Terakhir", "Tindak Lanjut"]}
            rows={(disc.cases || []).map((c: any) => [
              <strong key="i">{c.id_pegawai}</strong>, c.employee_name, `${c.department} (${c.branch})`,
              c.terlambat, c.pulang_cepat, c.lupa_absen, c.mangkir, <strong key="t">{c.total}</strong>,
              <span key="s" style={badgeStyle(c.severity === "Berat" ? "danger" : c.severity === "Sedang" ? "warning" : "info")}>{c.severity}</span>,
              c.last_date ?? "-",
              c.follow_up ?? <span key="f" style={{ color: "var(--text-muted)" }}>Belum tercatat</span>,
            ])}
          />
          <SourceNote text="Kategori: Berat = mangkir ≥ 3 hari; Sedang = ada mangkir atau total ≥ 6; Ringan = lainnya. Terlambat/pulang cepat dihitung terhadap batas toleransi hr.jadwal_kerja." />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 3: PROSES PAYROLL; CUT OFF 21-20 — hr.payroll_detail
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "payroll-process" && (
        <>
          <GapNotice text={payroll.data_gap} />
          <TableCard
            title="Penyelesaian Payroll vs Target Mingguan (Cut-Off 21-20)"
            headers={["Minggu", "Target Kumulatif", "Realisasi", "Status"]}
            rows={(payroll.weekly_milestones || []).map((w: any) => [
              <strong key="w">{w.week}</strong>,
              <strong key="t" style={{ color: "#0D99FF" }}>{w.target_pct}%</strong>,
              pctText(w.actual_pct),
              <span key="s" style={badgeStyle("warning")}>{w.status}</span>,
            ])}
          />
          <TableCard
            title="Batch Payroll Terakhir (hr.payroll_detail)"
            headers={["Batch", "Slip", "Gaji Pokok", "Tunjangan + UMT", "Overtime", "Insentif", "Potongan Absensi", "Karyawan Dipotong", "PPh 21"]}
            rows={(payroll.batches || []).map((b: any) => [
              <strong key="b">#{b.batch_id}</strong>, num(b.slips), formatIDR(b.gaji_pokok), formatIDR(b.tunjangan),
              formatIDR(b.overtime), formatIDR(b.insentif), formatIDR(b.potongan_absensi),
              `${b.karyawan_dipotong_absensi} org`, formatIDR(b.pph21),
            ])}
          />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 4: BPJS (TK & KES) + KESEHATAN SINAR MAS — hr.pegawai_bpjs × hr.setting_bpjs
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "bpjs-insurance" && (
        <>
          <div style={gridStyle}>
            <KpiCard
              title="KARYAWAN AKTIF TERDAFTAR"
              value={`${num(bpjs.total_participants)} / ${num(bpjs.active_employees)}`}
              color="var(--text-primary)"
              sub={`BPJS TK ${num(bpjs.bpjs_tk_participants)} • BPJS Kes ${num(bpjs.bpjs_kes_participants)} • Asuransi komersil ${num(bpjs.sinarmas_participants)}`}
            />
            <KpiCard title="IURAN BPJS KETENAGAKERJAAN / BLN" value={formatIDR(bpjs.monthly_premi_tk)} color="#0D99FF" sub="JHT, JKK, JKM & JP (perusahaan + pekerja)" />
            <KpiCard title="IURAN BPJS KESEHATAN / BLN" value={formatIDR(bpjs.monthly_premi_kes)} color="#10B981" sub="Perusahaan + pekerja" />
            <KpiCard title="PREMI ASURANSI KOMERSIL / BLN" value={formatIDR(bpjs.monthly_premi_sinarmas)} color="#8B5CF6" sub="Iuran Allianz / Prudential (hr.pegawai_bpjs)" />
          </div>
          <TableCard
            title="4 Indikator Akurasi BPJS vs Target 100% Tanpa Kesalahan"
            headers={["Indikator", "Parameter Evaluasi", "Diperiksa", "Error", "Akurasi", "Status", "Sumber / Catatan"]}
            rows={(bpjs.quality_metrics || []).map((m: any) => [
              <strong key="i">{m.indicator}</strong>,
              <span key="d" style={{ color: "var(--text-secondary)" }}>{m.description}</span>,
              m.total_checked == null ? "—" : `${m.total_checked} org`,
              m.error_count == null ? "—" : <strong key="e" style={{ color: m.error_count === 0 ? "#10B981" : "#EF4444" }}>{m.error_count}</strong>,
              <strong key="a" style={{ color: statusColor(m.accuracy_pct, m.target_pct) }}>{pctText(m.accuracy_pct)}</strong>,
              <span key="s" style={badgeStyle(m.error_count == null ? "warning" : m.error_count === 0 ? "success" : "danger")}>{m.status}</span>,
              <span key="n" style={{ color: "var(--text-secondary)" }}>{m.notes}</span>,
            ])}
          />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 5: KPI PERSONAL [MONTHLY]
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "kpi-personal" && (
        <>
          <div style={gridStyle}>
            <KpiCard title="% PENCAPAIAN KESELURUHAN vs MIN 80%" value={pctText(kpi.overall_achievement_pct)} color="var(--text-muted)" sub="Menunggu data KPI" />
            <KpiCard title="% PENCAPAIAN PER DEPARTEMEN" value="—" color="var(--text-muted)" sub="Menunggu data KPI" />
            <KpiCard title="PUNISHMENT DI BAWAH PERFORM" value="—" color="var(--text-muted)" sub="Menunggu data KPI" />
          </div>
          <GapNotice text={kpi.data_gap} />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 6: MAN POWER [WEEKLY & MONTHLY] — public.pegawai × hr.absen
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "man-power" && (
        <>
          <div style={gridStyle}>
            <KpiCard
              title={`TURNOVER 12 PERIODE vs MAX ${mp.max_turnover_target_pct ?? 15}%`}
              value={pctText(mp.annual_turnover_pct)}
              color={mp.annual_turnover_pct == null ? "var(--text-muted)" : mp.annual_turnover_pct <= (mp.max_turnover_target_pct ?? 15) ? "#10B981" : "#EF4444"}
              sub={`Keluar ${num(mp.out_12m)} • Masuk ${num(mp.in_12m)} dalam 12 periode`}
            />
            <KpiCard title="TOTAL PERSONAL AKTIF" value={num(mp.total_active)} color="#0D99FF" sub={`${(mp.by_department || []).length} departemen`} />
          </div>
          <GapNotice text={mp.data_gap} />
          <TableCard
            title={`In / Out Karyawan Mingguan [Weekly] — ${data?.header?.period ?? ""}`}
            headers={["Minggu Cut-Off", "Masuk (In)", "Keluar (Out)", "Net"]}
            rows={(mp.weekly_in_out || []).map((w: any) => [
              <strong key="w">{w.week}</strong>,
              <span key="i" style={{ color: "#10B981", fontWeight: 700 }}>+{w.join_in}</span>,
              <span key="o" style={{ color: "#EF4444", fontWeight: 700 }}>-{w.resign_out}</span>,
              <strong key="n">{w.net_change >= 0 ? `+${w.net_change}` : w.net_change}</strong>,
            ])}
          />
          <TableCard
            title="In / Out Karyawan Bulanan [Monthly] — 6 Periode"
            headers={["Periode", "Masuk (In)", "Keluar (Out)", "Net"]}
            rows={(mp.monthly_in_out || []).map((m: any) => [
              <strong key="m">{m.period}</strong>,
              <span key="i" style={{ color: "#10B981", fontWeight: 700 }}>+{m.join_in}</span>,
              <span key="o" style={{ color: "#EF4444", fontWeight: 700 }}>-{m.resign_out}</span>,
              <strong key="n">{m.join_in - m.resign_out}</strong>,
            ])}
          />
          <TableCard
            title="Jumlah Personal & Persentase per Departemen"
            headers={["Departemen", "Aktif", "% Porsi", "Tetap", "Kontrak", "Probation", "In 12 Periode", "Out 12 Periode", "Turnover"]}
            rows={(mp.by_department || []).map((d: any) => [
              <strong key="d">{d.department}</strong>, `${d.active_headcount} org`,
              <strong key="p" style={{ color: "#0D99FF" }}>{d.percentage_of_total}%</strong>,
              d.tetap, d.kontrak, d.probation,
              <span key="i" style={{ color: "#10B981" }}>+{d.in_12m}</span>,
              <span key="o" style={{ color: "#EF4444" }}>-{d.out_12m}</span>,
              <strong key="t" style={{ color: d.turnover_pct != null && d.turnover_pct > 15 ? "#EF4444" : "#10B981" }}>{pctText(d.turnover_pct)}</strong>,
            ])}
          />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 7: RECRUITMENT [MONTHLY] — public.pegawai.mulai_bekerja
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "recruitment" && (
        <>
          <div style={gridStyle}>
            <KpiCard title="KANDIDAT SIAP PROSES / POSISI (MIN 5)" value="—" color="var(--text-muted)" sub="Belum ada data kandidat" />
            <KpiCard title="WAKTU HIRING vs WAKTU BAKU" value="—" color="var(--text-muted)" sub="Belum ada data requisition / SLA" />
            <KpiCard title="KARYAWAN BARU (12 PERIODE)" value={num((rec.recent_hires || []).length)} color="#10B981" sub="Realisasi hiring dari master pegawai" />
          </div>
          <GapNotice text={rec.data_gap} />
          <TableCard
            title="Realisasi Hiring — Karyawan Baru 12 Periode Terakhir"
            headers={["ID", "Nama", "Posisi", "Departemen", "Cabang", "Tgl Masuk", "Status", "Akhir Kontrak", "Masih Aktif"]}
            rows={(rec.recent_hires || []).map((h: any) => [
              <strong key="i">{h.id_pegawai}</strong>, h.name, h.position, h.department, h.branch, h.join_date ?? "-",
              h.employment_status, h.contract_end ?? "-",
              <span key="a" style={badgeStyle(h.still_active ? "success" : "danger")}>{h.still_active ? "Aktif" : "Keluar"}</span>,
            ])}
          />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 8: TRAINING, COACHING/COUNSELING [MONTHLY]
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "training-coaching" && (
        <>
          <div style={gridStyle}>
            <KpiCard title="% PELAKSANAAN TRAINING / COACHING" value={pctText(trn.overall_completion_pct)} color="var(--text-muted)" sub="Menunggu data rencana & realisasi" />
          </div>
          <GapNotice text={trn.data_gap} />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 9: BENEFIT KARYAWAN [MONTHLY] — hr.absen (status I) × hr.cuti_sub
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "employee-benefits" && (
        <>
          <div style={gridStyle}>
            <KpiCard title="PENGAJUAN CUTI KHUSUS (12 PERIODE)" value={num(bnf.total_events)} color="#0D99FF" sub={`${num(bnf.total_days)} hari cuti khusus terealisasi`} />
            <KpiCard title="% TERLAKSANA vs TARGET 100%" value="—" color="var(--text-muted)" sub="Status pencairan benefit belum tercatat" />
          </div>
          <GapNotice text={bnf.data_gap} />
          <TableCard
            title="Kebijakan Benefit Cuti Khusus (hr.cuti_sub)"
            headers={["Jenis Benefit", "Hak (hari)"]}
            rows={(bnf.policy || []).map((p: any) => [<strong key="b">{p.benefit_type}</strong>, `${p.entitlement_days} hari`])}
          />
          <TableCard
            title="Realisasi Cuti Khusus per Pengajuan — 12 Periode Terakhir"
            headers={["ID Cuti", "ID Pegawai", "Nama", "Departemen", "Dari", "Sampai", "Hari"]}
            rows={(bnf.events || []).map((e: any, i: number) => [
              e.id_cuti ?? "-", <strong key={`p${i}`}>{e.id_pegawai}</strong>, e.employee_name, e.department,
              e.date_from, e.date_to, <strong key={`d${i}`}>{e.days}</strong>,
            ])}
          />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SUB-MENU 10: LEGALITAS [WEEKLY & MONTHLY]
         ═══════════════════════════════════════════════════════════════════════ */}
      {section === "legality" && (
        <>
          <div style={gridStyle}>
            {(leg.categories || []).map((c: any) => (
              <KpiCard
                key={c.category_id}
                title={c.category_name.toUpperCase()}
                value={pctText(c.actual_pct)}
                color="var(--text-muted)"
                sub={`Populasi: ${num(c.population)} ${c.population_label}`}
              />
            ))}
          </div>
          <GapNotice text={leg.data_gap} />
          {(leg.categories || []).map((c: any) => (
            <TableCard
              key={c.category_id}
              title={`${c.category_id} · ${c.category_name} — Target ${c.target_pct}%`}
              note={c.data_gap}
              headers={["Item", "Terpenuhi", "Total", "%", "Sumber"]}
              rows={(c.items || []).map((it: any) => [
                <strong key="t">{it.title}</strong>,
                it.fulfilled == null ? "—" : num(it.fulfilled),
                num(it.total),
                <strong key="p" style={{ color: statusColor(it.pct, 100) }}>{pctText(it.pct)}</strong>,
                <span key="s" style={{ color: "var(--text-secondary)" }}>{it.source}</span>,
              ])}
            />
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

