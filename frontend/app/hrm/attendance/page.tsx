"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  ClockArrowUp,
  CalendarCheck,
  CalendarOff,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Building2,
  MapPin,
  TrendingDown,
  X,
  CheckCheck,
  XCircle,
  Plus
} from "lucide-react";
import { apiHrm } from "@/lib/api";

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<"attendance" | "overtime">("attendance");
  const [attendances, setAttendances] = useState<any[]>([]);
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [masters, setMasters] = useState<any>({ departments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filters
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedStatusKeh, setSelectedStatusKeh] = useState("all");
  const [selectedOtStatus, setSelectedOtStatus] = useState("all");

  // Modals
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewType, setReviewType] = useState<"overtime">("overtime");
  const [reviewerName, setReviewerName] = useState("HR Executive");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Overtime form
  const [addOtModalOpen, setAddOtModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [newOt, setNewOt] = useState({
    employee_id: "",
    tanggal: new Date().toISOString().split("T")[0],
    jam_mulai: "17:30",
    jam_selesai: "20:30",
    total_jam: 3.0,
    alasan_lembur: ""
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [attRes, otRes, mastRes, empRes] = await Promise.all([
        apiHrm.attendance({
          tanggal: selectedDate,
          department_id: selectedDept !== "all" ? Number(selectedDept) : undefined,
          status_kehadiran: selectedStatusKeh !== "all" ? selectedStatusKeh : undefined
        }),
        apiHrm.overtime({ status: selectedOtStatus !== "all" ? selectedOtStatus : undefined }),
        apiHrm.masters(),
        apiHrm.employees()
      ]);
      setAttendances(attRes.data.attendances || []);
      setOvertimes(otRes.data.overtimes || []);
      setMasters(mastRes.data || {});
      setEmployees(empRes.data.employees || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Gagal memuat data absensi & lembur.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, selectedDept, selectedStatusKeh, selectedOtStatus]);

  const handleReview = async (action: "Approved" | "Rejected") => {
    if (!reviewTarget) return;
    try {
      setSubmitting(true);
      await apiHrm.reviewOvertime(reviewTarget.id, {
        status: action,
        reviewer_name: reviewerName,
        approval_notes: reviewNotes
      });
      setActionMessage(`Lembur #${reviewTarget.id} (${reviewTarget.nama_lengkap}) berhasil di-${action.toLowerCase()}`);
      setReviewModalOpen(false);
      setReviewNotes("");
      setTimeout(() => setActionMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert("Gagal memproses: " + (err?.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddOvertime = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiHrm.createOvertime({
        ...newOt,
        employee_id: Number(newOt.employee_id),
        total_jam: Number(newOt.total_jam)
      });
      setActionMessage("Pengajuan lembur berhasil diajukan dan menunggu persetujuan.");
      setAddOtModalOpen(false);
      setTimeout(() => setActionMessage(null), 4000);
      loadData();
    } catch (err: any) {
      alert("Gagal mengajukan lembur: " + (err?.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, any> = {
      Hadir: { bg: "rgba(58, 201, 119, 0.15)", color: "#3AC977" },
      Terlambat: { bg: "rgba(255, 179, 35, 0.15)", color: "#FFB323" },
      Izin: { bg: "rgba(13, 153, 255, 0.15)", color: "#0D99FF" },
      Cuti: { bg: "rgba(139, 92, 246, 0.15)", color: "#8B5CF6" },
      Sakit: { bg: "rgba(244, 63, 94, 0.15)", color: "#F43F5E" },
      Alpha: { bg: "rgba(130, 134, 144, 0.15)", color: "#828690" },
      Pending: { bg: "rgba(255, 179, 35, 0.15)", color: "#FFB323" },
      Approved: { bg: "rgba(58, 201, 119, 0.15)", color: "#3AC977" },
      Rejected: { bg: "rgba(255, 94, 94, 0.15)", color: "#FF5E5E" }
    };
    const s = styles[status] || { bg: "rgba(130, 134, 144, 0.1)", color: "#828690" };
    return (
      <span style={{ background: s.bg, color: s.color, padding: "2px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 700 }}>
        {status}
      </span>
    );
  };

  // Attendance summary for today
  const attSummary = {
    hadir: attendances.filter(a => a.status_kehadiran === "Hadir").length,
    terlambat: attendances.filter(a => a.status_kehadiran === "Terlambat").length,
    izin: attendances.filter(a => a.status_kehadiran === "Izin").length,
    cuti: attendances.filter(a => a.status_kehadiran === "Cuti").length,
    sakit: attendances.filter(a => a.status_kehadiran === "Sakit").length,
    alpha: attendances.filter(a => a.status_kehadiran === "Alpha").length,
  };

  const otSummary = {
    pending: overtimes.filter(o => o.status === "Pending").length,
    approved: overtimes.filter(o => o.status === "Approved").length,
    rejected: overtimes.filter(o => o.status === "Rejected").length,
    total_jam: overtimes.filter(o => o.status === "Approved").reduce((acc, o) => acc + (o.total_jam || 0), 0)
  };

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
            <div style={{ background: "rgba(58, 201, 119, 0.15)", color: "#3AC977", padding: "0.45rem", borderRadius: "10px", display: "flex" }}>
              <Clock size={22} />
            </div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Absensi, Jam Kerja &amp; Lembur
            </h1>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Monitoring kehadiran harian, keterlambatan per shift, pengajuan &amp; approval lembur karyawan CPA
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => setAddOtModalOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 1rem",
              fontSize: "0.825rem", borderRadius: "8px",
              background: "linear-gradient(135deg, #10B981, #0D99FF)",
              color: "#ffffff", border: "none", fontWeight: 600, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)"
            }}
          >
            <Plus size={15} />
            <span>Ajukan Lembur</span>
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
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{
          background: "rgba(58, 201, 119, 0.15)", border: "1px solid rgba(58, 201, 119, 0.4)",
          color: "#3AC977", padding: "0.75rem 1rem", borderRadius: "8px",
          display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem"
        }}>
          <CheckCircle2 size={16} />
          <span>{actionMessage}</span>
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
        <button
          onClick={() => setActiveTab("attendance")}
          style={{
            padding: "0.55rem 1.15rem", borderRadius: "8px", border: "none",
            background: activeTab === "attendance" ? "#3AC977" : "transparent",
            color: activeTab === "attendance" ? "#ffffff" : "var(--text-muted)",
            fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "0.45rem"
          }}
        >
          <CalendarCheck size={16} />
          <span>Rekap Absensi &amp; Kehadiran</span>
        </button>
        <button
          onClick={() => setActiveTab("overtime")}
          style={{
            padding: "0.55rem 1.15rem", borderRadius: "8px", border: "none",
            background: activeTab === "overtime" ? "#F59E0B" : "transparent",
            color: activeTab === "overtime" ? "#ffffff" : "var(--text-muted)",
            fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "0.45rem"
          }}
        >
          <ClockArrowUp size={16} />
          <span>Lembur &amp; Approval</span>
          {otSummary.pending > 0 && (
            <span style={{ background: "#FF5E5E", color: "#fff", borderRadius: "50%", width: "18px", height: "18px", fontSize: "0.68rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {otSummary.pending}
            </span>
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB 1: ABSENSI
         ══════════════════════════════════════════════════════ */}
      {activeTab === "attendance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Summary KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.85rem" }}>
            {[
              { label: "Hadir Tepat Waktu", val: attSummary.hadir, color: "#3AC977" },
              { label: "Terlambat", val: attSummary.terlambat, color: "#FFB323" },
              { label: "Izin", val: attSummary.izin, color: "#0D99FF" },
              { label: "Cuti", val: attSummary.cuti, color: "#8B5CF6" },
              { label: "Sakit", val: attSummary.sakit, color: "#F43F5E" },
              { label: "Alpha", val: attSummary.alpha, color: "#828690" },
            ].map(item => (
              <div key={item.label} style={{
                background: "var(--bg-surface)", border: "1px solid var(--bg-border)",
                borderRadius: "10px", padding: "0.85rem 1rem",
                borderLeft: `4px solid ${item.color}`,
                boxShadow: "var(--shadow-sm)"
              }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--bg-border)",
            borderRadius: "12px", padding: "0.85rem 1.25rem",
            display: "flex", flexWrap: "wrap", gap: "0.85rem", alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Tanggal:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: "0.45rem 0.75rem", borderRadius: "7px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
              />
            </div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{ padding: "0.45rem 0.75rem", borderRadius: "7px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
            >
              <option value="all">Semua Divisi</option>
              {masters.departments?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              value={selectedStatusKeh}
              onChange={(e) => setSelectedStatusKeh(e.target.value)}
              style={{ padding: "0.45rem 0.75rem", borderRadius: "7px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
            >
              <option value="all">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Izin">Izin</option>
              <option value="Cuti">Cuti</option>
              <option value="Sakit">Sakit</option>
              <option value="Alpha">Alpha</option>
            </select>
          </div>

          {/* Attendance Table */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>KARYAWAN</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>DIVISI &amp; CABANG</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>SHIFT</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "center" }}>CLOCK IN</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "center" }}>CLOCK OUT</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "center" }}>TERLAMBAT</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "center" }}>STATUS</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>LOKASI / CATATAN</th>
                  </tr>
                </thead>
                <tbody>
                  {attendances.map(a => (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border-table-row)" }} className="table-row-hover">
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{a.employee.nama_lengkap}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{a.employee.nik}</div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          {a.employee.department_color && (
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: a.employee.department_color }} />
                          )}
                          <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 600 }}>{a.employee.department}</span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <MapPin size={11} />
                          <span>{a.employee.branch}</span>
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                        {a.shift ? (
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{a.shift.nama_shift?.split(" (")[0]}</div>
                            <div style={{ fontSize: "0.7rem" }}>{a.shift.jam_masuk?.substring(0, 5)} – {a.shift.jam_pulang?.substring(0, 5)}</div>
                          </div>
                        ) : "-"}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        <span style={{ fontWeight: 700, color: a.clock_in ? "#3AC977" : "var(--text-muted)", fontFamily: "monospace" }}>
                          {a.clock_in ? a.clock_in.substring(0, 5) : "—"}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        <span style={{ fontWeight: 700, color: a.clock_out ? "#0D99FF" : "var(--text-muted)", fontFamily: "monospace" }}>
                          {a.clock_out ? a.clock_out.substring(0, 5) : "—"}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        {a.menit_terlambat > 0 ? (
                          <span style={{ color: "#FFB323", fontWeight: 700, fontSize: "0.8rem" }}>
                            +{a.menit_terlambat} mnt
                          </span>
                        ) : (
                          <span style={{ color: "#3AC977", fontSize: "0.8rem" }}>Tepat</span>
                        )}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        {getStatusBadge(a.status_kehadiran)}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {a.lokasi_clock_in || ""}
                        {a.catatan && <span> · {a.catatan}</span>}
                      </td>
                    </tr>
                  ))}
                  {attendances.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                        Tidak ada data absensi untuk tanggal dan filter yang dipilih.
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
          TAB 2: LEMBUR & APPROVAL
         ══════════════════════════════════════════════════════ */}
      {activeTab === "overtime" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* OT Summary KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.85rem" }}>
            {[
              { label: "Menunggu Persetujuan", val: otSummary.pending, color: "#FFB323", sub: "Butuh segera ditinjau" },
              { label: "Disetujui", val: otSummary.approved, color: "#3AC977", sub: "Lembur approved" },
              { label: "Ditolak", val: otSummary.rejected, color: "#FF5E5E", sub: "Tidak disetujui" },
              { label: "Total Jam Lembur (Approved)", val: otSummary.total_jam.toFixed(1) + " Jam", color: "#8B5CF6", sub: "Akumulasi jam disetujui" },
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

          {/* OT Filter */}
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--bg-border)",
            borderRadius: "10px", padding: "0.75rem 1rem",
            display: "flex", gap: "0.75rem", alignItems: "center"
          }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Filter Status:</span>
            {["all", "Pending", "Approved", "Rejected"].map(s => (
              <button
                key={s}
                onClick={() => setSelectedOtStatus(s)}
                style={{
                  padding: "0.3rem 0.75rem", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 600,
                  border: "1px solid var(--bg-border)", cursor: "pointer",
                  background: selectedOtStatus === s ? "var(--color-primary)" : "var(--bg-hover)",
                  color: selectedOtStatus === s ? "#ffffff" : "var(--text-secondary)"
                }}
              >
                {s === "all" ? "Semua" : s}
              </button>
            ))}
          </div>

          {/* OT Table */}
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>KARYAWAN</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>TANGGAL &amp; DURASI</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>JAM LEMBUR</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>ALASAN LEMBUR</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "center" }}>STATUS</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "left" }}>APPROVED BY</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "center" }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {overtimes.map(o => (
                    <tr key={o.id} style={{ borderBottom: "1px solid var(--border-table-row)" }} className="table-row-hover">
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{o.nama_lengkap}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{o.department_name}</div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{o.tanggal}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{o.total_jam} jam total</div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", color: "var(--text-secondary)", fontWeight: 600 }}>
                        {String(o.jam_mulai).substring(0, 5)} – {String(o.jam_selesai).substring(0, 5)}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontSize: "0.8rem", maxWidth: "220px" }}>
                        {o.alasan_lembur}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        {getStatusBadge(o.status)}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {o.approved_by || (o.status === "Pending" ? "Menunggu..." : "-")}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                        {o.status === "Pending" ? (
                          <button
                            onClick={() => { setReviewTarget(o); setReviewModalOpen(true); }}
                            style={{
                              padding: "0.3rem 0.75rem", borderRadius: "6px",
                              background: "rgba(255, 179, 35, 0.15)", color: "#FFB323",
                              border: "1px solid rgba(255, 179, 35, 0.35)",
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
                  {overtimes.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                        Tidak ada data pengajuan lembur.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL REVIEW LEMBUR ── */}
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
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>Tinjauan Pengajuan Lembur</h3>
              <button onClick={() => setReviewModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: "var(--bg-hover)", borderRadius: "10px", padding: "1rem" }}>
              <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "1rem" }}>{reviewTarget.nama_lengkap}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{reviewTarget.department_name} • {reviewTarget.branch_name}</div>
              <div style={{ marginTop: "0.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <div>📅 Tanggal: <b>{reviewTarget.tanggal}</b></div>
                <div>⏱ Durasi: <b>{reviewTarget.total_jam} jam</b></div>
                <div>🕐 Mulai: <b>{String(reviewTarget.jam_mulai).substring(0, 5)}</b></div>
                <div>🕐 Selesai: <b>{String(reviewTarget.jam_selesai).substring(0, 5)}</b></div>
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--text-muted)" }}>Alasan: </span>
                <b>{reviewTarget.alasan_lembur}</b>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Nama Reviewer / Approver</label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Catatan Approval (Opsional)</label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Catatan atau alasan keputusan approval..."
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
                <XCircle size={16} /><span>Tolak Lembur</span>
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
                <CheckCheck size={16} /><span>Setujui Lembur</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL AJUKAN LEMBUR BARU ── */}
      {addOtModalOpen && (
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
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>Ajukan Lembur Baru</h3>
              <button onClick={() => setAddOtModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddOvertime} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Karyawan *</label>
                <select
                  required
                  value={newOt.employee_id}
                  onChange={(e) => setNewOt({ ...newOt, employee_id: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                >
                  <option value="">Pilih Karyawan</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.nama_lengkap} ({e.nik})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Tanggal *</label>
                  <input
                    required type="date" value={newOt.tanggal}
                    onChange={(e) => setNewOt({ ...newOt, tanggal: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Jam Mulai *</label>
                  <input
                    required type="time" value={newOt.jam_mulai}
                    onChange={(e) => setNewOt({ ...newOt, jam_mulai: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Jam Selesai *</label>
                  <input
                    required type="time" value={newOt.jam_selesai}
                    onChange={(e) => setNewOt({ ...newOt, jam_selesai: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Total Jam *</label>
                  <input
                    required type="number" step="0.5" value={newOt.total_jam}
                    onChange={(e) => setNewOt({ ...newOt, total_jam: Number(e.target.value) })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Alasan Lembur *</label>
                  <input
                    required type="text" value={newOt.alasan_lembur}
                    onChange={(e) => setNewOt({ ...newOt, alasan_lembur: e.target.value })}
                    placeholder="Penyelesaian laporan akhir bulan..."
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setAddOtModalOpen(false)} className="btn-secondary" style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}>Batal</button>
                <button
                  type="submit" disabled={submitting}
                  style={{ padding: "0.5rem 1.25rem", borderRadius: "8px", background: "#10B981", color: "#ffffff", border: "none", fontWeight: 600, cursor: "pointer" }}
                >
                  {submitting ? "Mengajukan..." : "Ajukan Lembur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
