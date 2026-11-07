"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarOff,
  CalendarCheck,
  Calendar,
  RefreshCw,
  Plus,
  CheckCheck,
  XCircle,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Building2,
  ChevronRight
} from "lucide-react";
import { apiHrm } from "@/lib/api";

export default function LeavesPage() {
  const [activeTab, setActiveTab] = useState<"leaves" | "balances">("leaves");
  const [leaves, setLeaves] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedJenis, setSelectedJenis] = useState("all");

  // Modals
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewerName, setReviewerName] = useState("HR Executive");
  const [reviewNotes, setReviewNotes] = useState("");
  const [addLeaveModalOpen, setAddLeaveModalOpen] = useState(false);

  // New Leave Form
  const [newLeave, setNewLeave] = useState({
    employee_id: "",
    jenis: "Cuti Tahunan",
    tanggal_mulai: new Date().toISOString().split("T")[0],
    tanggal_selesai: new Date().toISOString().split("T")[0],
    total_hari: 1,
    alasan: ""
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [leavesRes, balRes, empRes] = await Promise.all([
        apiHrm.leaves({
          status: selectedStatus !== "all" ? selectedStatus : undefined,
          jenis: selectedJenis !== "all" ? selectedJenis : undefined
        }),
        apiHrm.leaveBalances(),
        apiHrm.employees()
      ]);
      setLeaves(leavesRes.data.leaves || []);
      setBalances(balRes.data.balances || []);
      setEmployees(empRes.data.employees || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Gagal memuat data cuti & izin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStatus, selectedJenis]);

  const handleReview = async (action: "Approved" | "Rejected") => {
    if (!reviewTarget) return;
    try {
      setSubmitting(true);
      await apiHrm.reviewLeave(reviewTarget.id, {
        status: action,
        reviewer_name: reviewerName,
        approval_notes: reviewNotes
      });
      setActionMessage(`Pengajuan ${reviewTarget.jenis} #${reviewTarget.id} (${reviewTarget.nama_lengkap}) berhasil di-${action.toLowerCase()}`);
      setReviewModalOpen(false);
      setReviewNotes("");
      setTimeout(() => setActionMessage(null), 4500);
      loadData();
    } catch (err: any) {
      alert("Gagal memproses: " + (err?.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const start = new Date(newLeave.tanggal_mulai);
      const end = new Date(newLeave.tanggal_selesai);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      await apiHrm.createLeave({
        ...newLeave,
        employee_id: Number(newLeave.employee_id),
        total_hari: diffDays
      });
      setActionMessage(`Pengajuan ${newLeave.jenis} berhasil diajukan dan menunggu persetujuan atasan.`);
      setAddLeaveModalOpen(false);
      setTimeout(() => setActionMessage(null), 4500);
      loadData();
    } catch (err: any) {
      alert("Gagal mengajukan: " + (err?.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, any> = {
      Pending: { bg: "rgba(255, 179, 35, 0.15)", color: "#FFB323" },
      Approved: { bg: "rgba(58, 201, 119, 0.15)", color: "#3AC977" },
      Rejected: { bg: "rgba(255, 94, 94, 0.15)", color: "#FF5E5E" }
    };
    const s = map[status] || { bg: "rgba(130, 134, 144, 0.1)", color: "#828690" };
    return <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 700 }}>{status}</span>;
  };

  const getJenisBadge = (jenis: string) => {
    const map: Record<string, any> = {
      "Cuti Tahunan": { bg: "rgba(13, 153, 255, 0.12)", color: "#0D99FF" },
      "Cuti Melahirkan": { bg: "rgba(139, 92, 246, 0.12)", color: "#8B5CF6" },
      "Cuti Menikah": { bg: "rgba(16, 185, 129, 0.12)", color: "#10B981" },
      "Izin": { bg: "rgba(245, 158, 11, 0.12)", color: "#F59E0B" },
      "Sakit": { bg: "rgba(244, 63, 94, 0.12)", color: "#F43F5E" }
    };
    const s = map[jenis] || { bg: "rgba(130, 134, 144, 0.1)", color: "#828690" };
    return <span style={{ background: s.bg, color: s.color, padding: "2px 9px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 700 }}>{jenis}</span>;
  };

  // Summary counts
  const pendingCount = leaves.filter(l => l.status === "Pending").length;
  const approvedCount = leaves.filter(l => l.status === "Approved").length;
  const rejectedCount = leaves.filter(l => l.status === "Rejected").length;
  const totalDaysApproved = leaves.filter(l => l.status === "Approved").reduce((acc, l) => acc + (l.total_hari || 0), 0);

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
            <div style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8B5CF6", padding: "0.45rem", borderRadius: "10px", display: "flex" }}>
              <CalendarOff size={22} />
            </div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Manajemen Cuti &amp; Izin
            </h1>
            {pendingCount > 0 && (
              <span style={{
                background: "#FF5E5E", color: "#ffffff", fontSize: "0.72rem",
                padding: "2px 8px", borderRadius: "12px", fontWeight: 800
              }}>
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Pengajuan &amp; approval cuti tahunan, izin, sakit, dan monitoring saldo cuti karyawan CPA
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => setAddLeaveModalOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1rem",
              fontSize: "0.825rem", borderRadius: "8px",
              background: "linear-gradient(135deg, #8B5CF6, #0D99FF)",
              color: "#ffffff", border: "none", fontWeight: 600, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(139, 92, 246, 0.35)"
            }}
          >
            <Plus size={15} />
            <span>Ajukan Cuti / Izin</span>
          </button>
          <button
            onClick={loadData}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 0.9rem",
              fontSize: "0.825rem", borderRadius: "8px", background: "var(--bg-surface)",
              color: "var(--text-primary)", border: "1px solid var(--bg-border)", cursor: "pointer"
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{
          background: "rgba(58, 201, 119, 0.15)", border: "1px solid rgba(58, 201, 119, 0.4)",
          color: "#3AC977", padding: "0.75rem 1rem", borderRadius: "8px",
          display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem"
        }}>
          <CheckCircle2 size={16} /><span>{actionMessage}</span>
        </div>
      )}
      {error && (
        <div style={{
          background: "rgba(255, 94, 94, 0.12)", border: "1px solid rgba(255, 94, 94, 0.3)",
          color: "#FF5E5E", padding: "0.75rem 1rem", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.5rem"
        }}>
          <AlertCircle size={16} /><span>{error}</span>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.5rem" }}>
        {[
          { key: "leaves", label: "Pengajuan Cuti & Izin", icon: <CalendarOff size={16} /> },
          { key: "balances", label: "Saldo Cuti Karyawan 2026", icon: <CalendarCheck size={16} /> }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: "0.55rem 1.15rem", borderRadius: "8px", border: "none",
              background: activeTab === tab.key ? "#8B5CF6" : "transparent",
              color: activeTab === tab.key ? "#ffffff" : "var(--text-muted)",
              fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "0.45rem"
            }}
          >
            {tab.icon}<span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB 1: PENGAJUAN CUTI & IZIN
         ══════════════════════════════════════════════════════ */}
      {activeTab === "leaves" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Summary KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.85rem" }}>
            {[
              { label: "Menunggu Persetujuan", val: pendingCount, color: "#FFB323", sub: "Butuh review segera" },
              { label: "Disetujui", val: approvedCount, color: "#3AC977", sub: "Leave requests approved" },
              { label: "Ditolak", val: rejectedCount, color: "#FF5E5E", sub: "Tidak disetujui" },
              { label: "Total Hari Cuti (Approved)", val: totalDaysApproved + " Hari", color: "#8B5CF6", sub: "Hari akumulatif" }
            ].map(item => (
              <div key={item.label} style={{
                background: "var(--bg-surface)", border: "1px solid var(--bg-border)",
                borderRadius: "10px", padding: "1rem", borderLeft: `4px solid ${item.color}`,
                boxShadow: "var(--shadow-sm)"
              }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>{item.val}</div>
                <div style={{ fontSize: "0.72rem", color: item.color }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--bg-border)",
            borderRadius: "10px", padding: "0.75rem 1rem",
            display: "flex", gap: "0.85rem", alignItems: "center", flexWrap: "wrap"
          }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Filter:</span>
            {["all", "Pending", "Approved", "Rejected"].map(s => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                style={{
                  padding: "0.3rem 0.75rem", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 600,
                  border: "1px solid var(--bg-border)", cursor: "pointer",
                  background: selectedStatus === s ? "var(--color-primary)" : "var(--bg-hover)",
                  color: selectedStatus === s ? "#ffffff" : "var(--text-secondary)"
                }}
              >
                {s === "all" ? "Semua Status" : s}
              </button>
            ))}
            <span style={{ color: "var(--bg-border)" }}>|</span>
            <select
              value={selectedJenis}
              onChange={(e) => setSelectedJenis(e.target.value)}
              style={{ padding: "0.35rem 0.65rem", borderRadius: "7px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.8rem" }}
            >
              <option value="all">Semua Jenis</option>
              <option value="Cuti Tahunan">Cuti Tahunan</option>
              <option value="Cuti Melahirkan">Cuti Melahirkan</option>
              <option value="Cuti Menikah">Cuti Menikah</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
            </select>
          </div>

          {/* Leaves Table */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>KARYAWAN</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>JENIS</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>PERIODE</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "center" }}>TOTAL HARI</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>ALASAN</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "center" }}>STATUS</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>DISETUJUI OLEH</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "center" }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(l => (
                    <tr key={l.id} style={{ borderBottom: "1px solid var(--border-table-row)" }} className="table-row-hover">
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{l.nama_lengkap}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{l.department_name} • {l.branch_name}</div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        {getJenisBadge(l.jenis)}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{l.tanggal_mulai}</div>
                        {l.tanggal_mulai !== l.tanggal_selesai && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>s.d. {l.tanggal_selesai}</div>
                        )}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 800, color: "var(--text-primary)" }}>
                        {l.total_hari}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem", maxWidth: "210px" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                          {l.alasan}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        {getStatusBadge(l.status)}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {l.approved_by || (l.status === "Pending" ? "Menunggu approval..." : "-")}
                        {l.approval_notes && (
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontStyle: "italic", marginTop: "2px" }}>
                            &ldquo;{l.approval_notes}&rdquo;
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        {l.status === "Pending" ? (
                          <button
                            onClick={() => { setReviewTarget(l); setReviewModalOpen(true); }}
                            style={{
                              padding: "0.3rem 0.75rem", borderRadius: "6px",
                              background: "rgba(139, 92, 246, 0.12)", color: "#8B5CF6",
                              border: "1px solid rgba(139, 92, 246, 0.3)",
                              fontSize: "0.75rem", fontWeight: 700, cursor: "pointer"
                            }}
                          >
                            Tinjau
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Selesai</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {leaves.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                        Tidak ada pengajuan cuti/izin sesuai filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 2: SALDO CUTI KARYAWAN
         ══════════════════════════════════════════════════════ */}
      {activeTab === "balances" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>KARYAWAN</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>DIVISI &amp; JABATAN</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "center" }}>KUOTA CUTI</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "center" }}>TERPAKAI</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "center" }}>SISA CUTI</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>UTILISASI</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map(b => {
                    const pct = b.kuota_cuti > 0 ? Math.round((b.cuti_terpakai / b.kuota_cuti) * 100) : 0;
                    return (
                      <tr key={b.id} style={{ borderBottom: "1px solid var(--border-table-row)" }} className="table-row-hover">
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{b.nama_lengkap}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{b.nik}</div>
                        </td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 600 }}>{b.department_name}</div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{b.position_title}</div>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 700, color: "var(--text-primary)" }}>
                          {b.kuota_cuti} Hari
                        </td>
                        <td style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 700, color: b.cuti_terpakai > 0 ? "#F59E0B" : "var(--text-muted)" }}>
                          {b.cuti_terpakai} Hari
                        </td>
                        <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                          <span style={{
                            fontSize: "1rem",
                            fontWeight: 800,
                            color: b.cuti_sisa <= 3 ? "#FF5E5E" : b.cuti_sisa <= 6 ? "#FFB323" : "#3AC977"
                          }}>
                            {b.cuti_sisa}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "4px" }}>Hari</span>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", minWidth: "160px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{ flex: 1, height: "8px", background: "var(--bg-hover)", borderRadius: "4px", overflow: "hidden" }}>
                              <div style={{
                                height: "100%", width: `${pct}%`, borderRadius: "4px",
                                background: pct >= 80 ? "#FF5E5E" : pct >= 50 ? "#FFB323" : "#3AC977"
                              }} />
                            </div>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", minWidth: "34px", textAlign: "right" }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REVIEW CUTI/IZIN ── */}
      {reviewModalOpen && reviewTarget && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "1rem"
        }}>
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--bg-border)",
            borderRadius: "16px", width: "100%", maxWidth: "520px", padding: "1.5rem",
            display: "flex", flexDirection: "column", gap: "1.25rem", boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>Tinjauan Pengajuan {reviewTarget.jenis}</h3>
              <button onClick={() => setReviewModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: "var(--bg-hover)", borderRadius: "10px", padding: "1rem" }}>
              <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "1rem" }}>{reviewTarget.nama_lengkap}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{reviewTarget.department_name} • {reviewTarget.branch_name}</div>
              <div style={{ marginTop: "0.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <div>📋 Jenis: <b>{reviewTarget.jenis}</b></div>
                <div>📅 Mulai: <b>{reviewTarget.tanggal_mulai}</b></div>
                <div>📅 Selesai: <b>{reviewTarget.tanggal_selesai}</b></div>
                <div>⏳ Total: <b>{reviewTarget.total_hari} Hari</b></div>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--text-muted)" }}>Alasan: </span>
                <b>{reviewTarget.alasan}</b>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Nama Reviewer / Atasan</label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Catatan Approval</label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Catatan atau alasan keputusan..."
                style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => handleReview("Rejected")}
                disabled={submitting}
                style={{
                  flex: 1, padding: "0.65rem", borderRadius: "8px",
                  background: "rgba(255, 94, 94, 0.12)", color: "#FF5E5E",
                  border: "1px solid rgba(255, 94, 94, 0.3)", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem"
                }}
              >
                <XCircle size={16} /><span>Tolak Pengajuan</span>
              </button>
              <button
                onClick={() => handleReview("Approved")}
                disabled={submitting}
                style={{
                  flex: 1, padding: "0.65rem", borderRadius: "8px",
                  background: "rgba(58, 201, 119, 0.15)", color: "#3AC977",
                  border: "1px solid rgba(58, 201, 119, 0.35)", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem"
                }}
              >
                <CheckCheck size={16} /><span>Setujui Pengajuan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AJUKAN CUTI / IZIN BARU ── */}
      {addLeaveModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: "1rem"
        }}>
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--bg-border)",
            borderRadius: "16px", width: "100%", maxWidth: "520px", padding: "1.5rem",
            display: "flex", flexDirection: "column", gap: "1.25rem", boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>Ajukan Cuti / Izin / Sakit</h3>
              <button onClick={() => setAddLeaveModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddLeave} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Karyawan yang Mengajukan *</label>
                <select
                  required
                  value={newLeave.employee_id}
                  onChange={(e) => setNewLeave({ ...newLeave, employee_id: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                >
                  <option value="">Pilih Karyawan</option>
                  {employees.filter(e => e.status_karyawan !== "Resigned").map(e => (
                    <option key={e.id} value={e.id}>{e.nama_lengkap} ({e.nik})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Jenis Pengajuan *</label>
                <select
                  value={newLeave.jenis}
                  onChange={(e) => setNewLeave({ ...newLeave, jenis: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                >
                  <option value="Cuti Tahunan">Cuti Tahunan</option>
                  <option value="Cuti Melahirkan">Cuti Melahirkan</option>
                  <option value="Cuti Menikah">Cuti Menikah</option>
                  <option value="Izin">Izin (Keperluan Pribadi)</option>
                  <option value="Sakit">Sakit (Dengan Surat Dokter)</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Tanggal Mulai *</label>
                  <input
                    required type="date" value={newLeave.tanggal_mulai}
                    onChange={(e) => setNewLeave({ ...newLeave, tanggal_mulai: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Tanggal Selesai *</label>
                  <input
                    required type="date" value={newLeave.tanggal_selesai}
                    onChange={(e) => setNewLeave({ ...newLeave, tanggal_selesai: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Alasan / Keperluan *</label>
                <textarea
                  required rows={3}
                  value={newLeave.alasan}
                  onChange={(e) => setNewLeave({ ...newLeave, alasan: e.target.value })}
                  placeholder="Jelaskan keperluan atau alasan pengajuan cuti/izin secara singkat..."
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setAddLeaveModalOpen(false)} className="btn-secondary" style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}>Batal</button>
                <button
                  type="submit" disabled={submitting}
                  style={{ padding: "0.5rem 1.25rem", borderRadius: "8px", background: "#8B5CF6", color: "#ffffff", border: "none", fontWeight: 600, cursor: "pointer" }}
                >
                  {submitting ? "Mengajukan..." : "Kirim Pengajuan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
