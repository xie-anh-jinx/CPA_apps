"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users2,
  UserCheck,
  UserX,
  TrendingDown,
  CalendarCheck,
  Clock,
  AlertCircle,
  Building2,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  RefreshCw,
  PieChart as PieIcon,
  Layers,
  MapPin,
  Calendar
} from "lucide-react";
import { apiHrm } from "@/lib/api";

export default function HrmDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiHrm.dashboard();
      setData(res.data);
    } catch (err: any) {
      console.error("Failed to load HRM dashboard", err);
      setError(err?.response?.data?.detail || "Gagal memuat data HRM Dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleQuickReview = async (type: "leave" | "overtime", id: number, status: "Approved" | "Rejected") => {
    try {
      setReviewingId(id);
      if (type === "leave") {
        await apiHrm.reviewLeave(id, {
          status,
          reviewer_name: "HR Executive",
          approval_notes: status === "Approved" ? "Disetujui via Quick Action Dashboard" : "Ditolak via Quick Action"
        });
      } else {
        await apiHrm.reviewOvertime(id, {
          status,
          reviewer_name: "HR Executive",
          approval_notes: status === "Approved" ? "Disetujui via Quick Action Dashboard" : "Ditolak via Quick Action"
        });
      }
      setActionMessage(`Pengajuan #${id} berhasil di-${status.toLowerCase()}`);
      setTimeout(() => setActionMessage(null), 3000);
      loadDashboard();
    } catch (err: any) {
      alert("Gagal memproses approval: " + (err?.response?.data?.detail || err.message));
    } finally {
      setReviewingId(null);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <RefreshCw size={32} className="spin" style={{ color: "var(--color-primary)" }} />
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Memuat Employee Dashboard HRM...</p>
      </div>
    );
  }

  const s = data?.summary || {};
  const branches = data?.branch_distribution || [];
  const depts = data?.department_distribution || [];
  const tenure = data?.tenure_distribution || [];
  const att = data?.attendance_today || data?.today_attendance || {};

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* ── Page Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
            <div style={{
              background: "linear-gradient(135deg, rgba(13, 153, 255, 0.2), rgba(121, 40, 202, 0.2))",
              padding: "0.45rem",
              borderRadius: "10px",
              color: "var(--color-primary)",
              display: "flex"
            }}>
              <Users2 size={22} />
            </div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Employee Dashboard (HRM)
            </h1>
            <span style={{
              fontSize: "0.75rem",
              padding: "2px 8px",
              borderRadius: "20px",
              background: "rgba(58, 201, 119, 0.15)",
              color: "#3AC977",
              fontWeight: 600,
              border: "1px solid rgba(58, 201, 119, 0.3)"
            }}>
              Live HR Analytics
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Ringkasan SDM, distribusi cabang & divisi, masa kerja, turnover rate, dan monitoring absensi terpadu PT CPA
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={loadDashboard}
            className="btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 0.9rem",
              fontSize: "0.825rem",
              borderRadius: "8px",
              cursor: "pointer",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--bg-border)"
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Segarkan</span>
          </button>

          <Link
            href="/hrm/employees"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 1rem",
              fontSize: "0.825rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #0D99FF, #7928CA)",
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 600,
              boxShadow: "0 4px 14px rgba(13, 153, 255, 0.3)"
            }}
          >
            <Briefcase size={14} />
            <span>Data Karyawan</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div style={{
          background: "rgba(58, 201, 119, 0.15)",
          border: "1px solid rgba(58, 201, 119, 0.4)",
          color: "#3AC977",
          padding: "0.75rem 1rem",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.875rem"
        }}>
          <CheckCircle2 size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && (
        <div style={{
          background: "rgba(255, 94, 94, 0.15)",
          border: "1px solid rgba(255, 94, 94, 0.4)",
          color: "#FF5E5E",
          padding: "0.75rem 1rem",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.875rem"
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Top Metric KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1rem" }}>
        {/* Card 1: Total Karyawan Aktif */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "14px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "#0D99FF" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>TOTAL KARYAWAN AKTIF</span>
            <div style={{ background: "rgba(13, 153, 255, 0.12)", color: "#0D99FF", padding: "6px", borderRadius: "8px" }}>
              <Users2 size={18} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)" }}>{s.total_active || 0}</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>orang</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            <span>Tetap: <b>{s.tetap || 0}</b></span>
            <span>•</span>
            <span>Kontrak: <b>{s.kontrak || 0}</b></span>
            <span>•</span>
            <span>Probation: <b>{s.probation || 0}</b></span>
          </div>
        </div>

        {/* Card 2: Turnover Rate */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "14px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "#10B981" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>TURNOVER RATE (ATTRITION)</span>
            <div style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10B981", padding: "6px", borderRadius: "8px" }}>
              <TrendingDown size={18} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)" }}>{s.turnover_rate || 0}%</span>
            <span style={{ fontSize: "0.75rem", color: "#10B981", fontWeight: 600 }}>Sehat (&lt; 8%)</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Total Resign: <b>{s.resigned || 0}</b> dari { (s.total_active || 0) + (s.resigned || 0) } total terdaftar
          </div>
        </div>

        {/* Card 3: Kehadiran Hari Ini */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "14px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "#3AC977" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>KEHADIRAN HARI INI</span>
            <div style={{ background: "rgba(58, 201, 119, 0.12)", color: "#3AC977", padding: "6px", borderRadius: "8px" }}>
              <CalendarCheck size={18} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)" }}>{att.attendance_rate || 0}%</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              ({(att.hadir || 0) + (att.terlambat || 0)} / {att.total_active || 0})
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            <span style={{ color: "#3AC977" }}>On Time: {att.hadir || 0}</span>
            <span>•</span>
            <span style={{ color: "#FFB323" }}>Terlambat: {att.terlambat || 0}</span>
            <span>•</span>
            <span style={{ color: "#0D99FF" }}>Izin/Cuti: {(att.izin || 0) + (att.cuti || 0) + (att.sakit || 0)}</span>
          </div>
        </div>

        {/* Card 4: Keterlambatan */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "14px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "#FFB323" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>TERLAMBAT HARI INI</span>
            <div style={{ background: "rgba(255, 179, 35, 0.12)", color: "#FFB323", padding: "6px", borderRadius: "8px" }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)" }}>{att.terlambat || 0}</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>karyawan</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            Rata-rata &lt; 15 menit melewati jam toleransi shift
          </div>
        </div>

        {/* Card 5: Butuh Persetujuan */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "14px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: "#8B5CF6" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>PERLU APPROVAL</span>
            <div style={{ background: "rgba(139, 92, 246, 0.12)", color: "#8B5CF6", padding: "6px", borderRadius: "8px" }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)" }}>{s.pending_approvals || 0}</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>pengajuan</span>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            <span>Cuti/Izin: <b>{s.pending_leaves || 0}</b></span>
            <span>•</span>
            <span>Lembur: <b>{s.pending_overtimes || 0}</b></span>
          </div>
        </div>
      </div>

      {/* ── Visual Distribution Section ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))", gap: "1.25rem" }}>
        
        {/* Distribusi per Cabang */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "14px",
          padding: "1.35rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <Building2 size={18} style={{ color: "var(--color-primary)" }} />
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  Distribusi Karyawan per Cabang
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Sebaran {s.total_active || 225} karyawan aktif di 8 kantor cabang & depo operasional PT CPA
              </p>
            </div>
            <span style={{
              fontSize: "0.75rem",
              background: "var(--bg-hover)",
              border: "1px solid var(--bg-border)",
              padding: "3px 10px",
              borderRadius: "20px",
              color: "var(--text-muted)",
              fontWeight: 600
            }}>
              {branches.length} Lokasi Operasional
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {branches.map((b: any, idx: number) => {
              const branchName = b.name || b.branch_name || "Cabang";
              const count = b.total_employees ?? b.employee_count ?? 0;
              const pct = b.percentage ?? 0;
              const isHq = b.is_headquarters || branchName.toLowerCase().includes("ho") || branchName.toLowerCase().includes("balikpapan");

              return (
                <div key={b.id || b.branch_id || idx} style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                  padding: "0.6rem 0.75rem",
                  background: isHq ? "rgba(13, 153, 255, 0.04)" : "transparent",
                  borderRadius: "8px",
                  border: isHq ? "1px solid rgba(13, 153, 255, 0.15)" : "1px solid transparent"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                      <MapPin size={13} style={{ color: isHq ? "var(--color-primary)" : "var(--text-muted)" }} />
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)" }}>{branchName}</span>
                      {isHq ? (
                        <span style={{ fontSize: "0.65rem", padding: "1px 7px", borderRadius: "10px", background: "rgba(13, 153, 255, 0.15)", color: "#0D99FF", fontWeight: 700 }}>
                          Headquarters
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "10px", background: "var(--bg-hover)", color: "var(--text-muted)", fontWeight: 500 }}>
                          Cabang
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)" }}>{count} org</span>
                      <span style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "1px 7px",
                        borderRadius: "12px",
                        background: isHq ? "rgba(13, 153, 255, 0.12)" : "var(--bg-hover)",
                        color: isHq ? "var(--color-primary)" : "var(--text-secondary)",
                        minWidth: "46px",
                        textAlign: "center"
                      }}>
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: "6px", width: "100%", background: "var(--bg-hover)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: isHq ? "linear-gradient(90deg, #0D99FF, #7928CA)" : "var(--color-primary)",
                      borderRadius: "3px",
                      transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribusi per Divisi */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "14px",
          padding: "1.35rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <Layers size={18} style={{ color: "#8B5CF6" }} />
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  Distribusi Karyawan per Divisi
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Komposisi {s.total_active || 225} karyawan aktif pada 13 divisi fungsional & pendukung
              </p>
            </div>
            <span style={{
              fontSize: "0.75rem",
              background: "var(--bg-hover)",
              border: "1px solid var(--bg-border)",
              padding: "3px 10px",
              borderRadius: "20px",
              color: "var(--text-muted)",
              fontWeight: 600
            }}>
              {depts.length} Departemen
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", maxHeight: "560px", overflowY: "auto", paddingRight: "4px" }}>
            {depts.map((d: any, idx: number) => {
              const deptName = d.name || d.department_name || "Departemen";
              const code = d.code || `D-${d.id || d.department_id || idx + 1}`;
              const count = d.total_employees ?? d.employee_count ?? 0;
              const pct = d.percentage ?? 0;
              const color = d.color || "#0D99FF";

              return (
                <div key={d.id || d.department_id || idx} style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "8px",
                  background: pct >= 15 ? "rgba(139, 92, 246, 0.04)" : "transparent",
                  border: pct >= 15 ? "1px solid rgba(139, 92, 246, 0.15)" : "1px solid transparent"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                      <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)" }}>{deptName}</span>
                      <span style={{ fontSize: "0.68rem", padding: "1px 6px", borderRadius: "6px", background: "var(--bg-hover)", color: "var(--text-muted)", fontWeight: 600 }}>
                        {code}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)" }}>{count} org</span>
                      <span style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "1px 7px",
                        borderRadius: "12px",
                        background: "var(--bg-hover)",
                        color: color,
                        minWidth: "46px",
                        textAlign: "center"
                      }}>
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: "6px", width: "100%", background: "var(--bg-hover)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: color,
                      borderRadius: "3px",
                      transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── Masa Kerja & Ringkasan Absensi Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.25rem" }}>
        
        {/* Distribusi Masa Kerja (Tenure) */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "14px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Calendar size={18} style={{ color: "#10B981" }} />
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Distribusi Masa Kerja (Tenure)
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.85rem" }}>
            {tenure.map((t: any, idx: number) => {
              const colors = ["#0D99FF", "#10B981", "#F59E0B", "#8B5CF6"];
              const color = colors[idx % colors.length];
              const groupLabel = t.label || t.tenure_group || "Masa Kerja";
              const countVal = t.count || 0;
              const pctVal = t.pct ?? t.percentage ?? 0;

              return (
                <div key={groupLabel} style={{
                  background: "var(--bg-hover)",
                  borderRadius: "10px",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                  borderLeft: `4px solid ${color}`
                }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>{groupLabel}</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                    <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>{countVal}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>karyawan</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: color, fontWeight: 600 }}>
                    {pctVal}% dari total
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ringkasan Status Absensi Hari Ini */}
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "14px",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Clock size={18} style={{ color: "#3AC977" }} />
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Status Kehadiran Hari Ini
              </h2>
            </div>
            <Link href="/hrm/attendance" style={{ fontSize: "0.75rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
              Lihat Detail →
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
            <div style={{ padding: "0.85rem", background: "rgba(58, 201, 119, 0.08)", border: "1px solid rgba(58, 201, 119, 0.25)", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#3AC977" }}>{att.hadir || 0}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Hadir Tepat Waktu</div>
            </div>
            <div style={{ padding: "0.85rem", background: "rgba(255, 179, 35, 0.08)", border: "1px solid rgba(255, 179, 35, 0.25)", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#FFB323" }}>{att.terlambat || 0}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Terlambat</div>
            </div>
            <div style={{ padding: "0.85rem", background: "rgba(13, 153, 255, 0.08)", border: "1px solid rgba(13, 153, 255, 0.25)", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0D99FF" }}>{att.izin || 0}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Izin</div>
            </div>
            <div style={{ padding: "0.85rem", background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.25)", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#8B5CF6" }}>{att.cuti || 0}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Cuti</div>
            </div>
            <div style={{ padding: "0.85rem", background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.25)", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#F43F5E" }}>{att.sakit || 0}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Sakit</div>
            </div>
            <div style={{ padding: "0.85rem", background: "rgba(130, 134, 144, 0.08)", border: "1px solid rgba(130, 134, 144, 0.25)", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-muted)" }}>{att.alpha || 0}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>Alpha (Tanpa Ket)</div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Quick Access Feature Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        <Link href="/hrm/employees" style={{ textDecoration: "none" }}>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "12px",
            padding: "1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "all 0.2s ease"
          }}
          className="hover-card"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div style={{ background: "rgba(13, 153, 255, 0.15)", color: "#0D99FF", padding: "10px", borderRadius: "10px" }}>
                <Briefcase size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>Data Karyawan &amp; Org</h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Profil, struktur organisasi &amp; riwayat mutasi</p>
              </div>
            </div>
            <ArrowUpRight size={18} style={{ color: "var(--text-muted)" }} />
          </div>
        </Link>

        <Link href="/hrm/attendance" style={{ textDecoration: "none" }}>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "12px",
            padding: "1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "all 0.2s ease"
          }}
          className="hover-card"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div style={{ background: "rgba(58, 201, 119, 0.15)", color: "#3AC977", padding: "10px", borderRadius: "10px" }}>
                <Clock size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>Absensi &amp; Jam Kerja</h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Clock in/out, shift, keterlambatan &amp; lembur</p>
              </div>
            </div>
            <ArrowUpRight size={18} style={{ color: "var(--text-muted)" }} />
          </div>
        </Link>

        <Link href="/hrm/leaves" style={{ textDecoration: "none" }}>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "12px",
            padding: "1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "all 0.2s ease"
          }}
          className="hover-card"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8B5CF6", padding: "10px", borderRadius: "10px" }}>
                <CalendarCheck size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>Manajemen Cuti &amp; Izin</h3>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Pengajuan cuti, izin, sakit &amp; approval review</p>
              </div>
            </div>
            <ArrowUpRight size={18} style={{ color: "var(--text-muted)" }} />
          </div>
        </Link>
      </div>
    </div>
  );
}
