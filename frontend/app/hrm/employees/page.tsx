"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users2,
  Briefcase,
  GitFork,
  History,
  Search,
  Filter,
  Plus,
  Building2,
  MapPin,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Eye,
  Edit,
  Mail,
  Phone,
  Calendar,
  Award,
  ShieldCheck,
  CheckCircle,
  X,
  ArrowRight,
  UserPlus
} from "lucide-react";
import { apiHrm } from "@/lib/api";

export default function EmployeeManagementPage() {
  const [activeTab, setActiveTab] = useState<"list" | "org" | "mutations">("list");
  const [employees, setEmployees] = useState<any[]>([]);
  const [masters, setMasters] = useState<any>({ departments: [], positions: [], branches: [], supervisors: [] });
  const [orgChart, setOrgChart] = useState<any[]>([]);
  const [mutations, setMutations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Pagination & Counts
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(500); // Default to 500 so all 478 employees load immediately
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [statusCounts, setStatusCounts] = useState<{
    total: number;
    active: number;
    tetap: number;
    kontrak: number;
    probation: number;
    resigned: number;
  }>({ total: 478, active: 225, tetap: 72, kontrak: 138, probation: 15, resigned: 253 });

  // Modals
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addEmpModalOpen, setAddEmpModalOpen] = useState(false);
  const [addMutModalOpen, setAddMutModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Employee Form
  const [newEmp, setNewEmp] = useState({
    nik: "",
    nama_lengkap: "",
    email: "",
    no_hp: "",
    alamat: "",
    jenis_kelamin: "L",
    tanggal_masuk: new Date().toISOString().split("T")[0],
    status_karyawan: "Tetap",
    department_id: "",
    position_id: "",
    branch_id: "",
    supervisor_id: "",
    pendidikan: "S1",
    status_nikah: "Belum Menikah",
    gaji_pokok: 8500000
  });

  // New Mutation Form
  const [newMut, setNewMut] = useState({
    employee_id: "",
    jenis_mutasi: "Promosi",
    ke_department_id: "",
    ke_position_id: "",
    ke_branch_id: "",
    tanggal_efektif: new Date().toISOString().split("T")[0],
    nomor_sk: "",
    keterangan: ""
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [empRes, mastRes, orgRes, mutRes] = await Promise.all([
        apiHrm.employees({
          search: search || undefined,
          department_id: selectedDept !== "all" ? Number(selectedDept) : undefined,
          branch_id: selectedBranch !== "all" ? selectedBranch : undefined,
          status: selectedStatus !== "all" ? selectedStatus : undefined,
          page: page,
          limit: pageSize
        }),
        apiHrm.masters(),
        apiHrm.orgChart(),
        apiHrm.mutations()
      ]);
      setEmployees(empRes.data.employees || []);
      setTotalEmployees(empRes.data.total || 0);
      if (empRes.data.status_counts) {
        setStatusCounts(empRes.data.status_counts);
      }
      setMasters(mastRes.data || {});
      setOrgChart(orgRes.data.root || []);
      setMutations(mutRes.data.mutations || []);
    } catch (err) {
      console.error("Failed to load employee data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDept, selectedBranch, selectedStatus, page, pageSize]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const openDetail = async (empId: string | number) => {
    try {
      const res = await apiHrm.employeeDetail(empId);
      setSelectedEmp(res.data);
      setDetailModalOpen(true);
    } catch (err) {
      alert("Gagal memuat detail karyawan");
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiHrm.createEmployee({
        ...newEmp,
        department_id: newEmp.department_id ? Number(newEmp.department_id) : null,
        position_id: newEmp.position_id ? Number(newEmp.position_id) : null,
        branch_id: newEmp.branch_id ? Number(newEmp.branch_id) : null,
        supervisor_id: newEmp.supervisor_id ? Number(newEmp.supervisor_id) : null,
        gaji_pokok: Number(newEmp.gaji_pokok)
      });
      alert("Karyawan baru berhasil ditambahkan!");
      setAddEmpModalOpen(false);
      loadData();
    } catch (err: any) {
      alert("Gagal menambahkan karyawan: " + (err?.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiHrm.createMutation({
        ...newMut,
        employee_id: Number(newMut.employee_id),
        ke_department_id: newMut.ke_department_id ? Number(newMut.ke_department_id) : null,
        ke_position_id: newMut.ke_position_id ? Number(newMut.ke_position_id) : null,
        ke_branch_id: newMut.ke_branch_id ? Number(newMut.ke_branch_id) : null
      });
      alert("Riwayat mutasi berhasil dicatat dan status karyawan diperbarui!");
      setAddMutModalOpen(false);
      loadData();
    } catch (err: any) {
      alert("Gagal mencatat mutasi: " + (err?.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Tetap":
        return <span style={{ background: "rgba(58, 201, 119, 0.15)", color: "#3AC977", padding: "2px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 700 }}>Tetap</span>;
      case "Kontrak":
        return <span style={{ background: "rgba(13, 153, 255, 0.15)", color: "#0D99FF", padding: "2px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 700 }}>Kontrak</span>;
      case "Probation":
        return <span style={{ background: "rgba(255, 179, 35, 0.15)", color: "#FFB323", padding: "2px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 700 }}>Probation</span>;
      case "Magang":
        return <span style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8B5CF6", padding: "2px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 700 }}>Magang</span>;
      case "Resigned":
        return <span style={{ background: "rgba(255, 94, 94, 0.15)", color: "#FF5E5E", padding: "2px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 700 }}>Resigned</span>;
      default:
        return <span>{status}</span>;
    }
  };

  // Render Org Node recursively
  const renderOrgNode = (node: any, depth = 0) => {
    return (
      <div key={node.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
        {/* Node Card */}
        <div
          onClick={() => openDetail(node.id)}
          style={{
            background: "var(--bg-surface)",
            border: `1.5px solid ${node.department_color || "var(--bg-border)"}`,
            borderRadius: "12px",
            padding: "0.85rem 1.15rem",
            width: "250px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            textAlign: "center"
          }}
          className="hover-card"
        >
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: node.department_color || "var(--color-primary)",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 0.45rem auto"
          }}>
            {node.nama_lengkap.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {node.nama_lengkap}
          </div>
          <div style={{ fontSize: "0.75rem", color: node.department_color || "var(--color-primary)", fontWeight: 600, marginTop: "2px" }}>
            {node.title}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "0.4rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
            <span>{node.department}</span>
            <span>•</span>
            <span>{node.branch}</span>
          </div>
        </div>

        {/* Subordinates */}
        {node.children && node.children.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", marginTop: "1rem" }}>
            <div style={{ width: "2px", height: "16px", background: "var(--bg-border)" }} />
            <div style={{
              display: "flex",
              gap: "1.25rem",
              justifyContent: "center",
              position: "relative",
              paddingTop: "16px"
            }}>
              {node.children.map((child: any) => renderOrgNode(child, depth + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1600px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
            <div style={{ background: "rgba(13, 153, 255, 0.15)", color: "#0D99FF", padding: "0.45rem", borderRadius: "10px", display: "flex" }}>
              <Briefcase size={22} />
            </div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Employee Management
            </h1>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Pengelolaan database karyawan, struktur hierarki organisasi, serta riwayat mutasi jabatan &amp; cabang
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => setAddMutModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 0.95rem",
              fontSize: "0.825rem",
              borderRadius: "8px",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--bg-border)",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            <History size={14} />
            <span>Catat Mutasi</span>
          </button>

          <button
            onClick={() => setAddEmpModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 1rem",
              fontSize: "0.825rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #0D99FF, #7928CA)",
              color: "#ffffff",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(13, 153, 255, 0.3)"
            }}
          >
            <UserPlus size={15} />
            <span>Tambah Karyawan</span>
          </button>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.5rem" }}>
        <button
          onClick={() => setActiveTab("list")}
          style={{
            padding: "0.55rem 1.15rem",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "list" ? "var(--color-primary)" : "transparent",
            color: activeTab === "list" ? "#ffffff" : "var(--text-muted)",
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem"
          }}
        >
          <Users2 size={16} />
          <span>Data Karyawan ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("org")}
          style={{
            padding: "0.55rem 1.15rem",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "org" ? "var(--color-primary)" : "transparent",
            color: activeTab === "org" ? "#ffffff" : "var(--text-muted)",
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem"
          }}
        >
          <GitFork size={16} />
          <span>Struktur Organisasi (Org Chart)</span>
        </button>

        <button
          onClick={() => setActiveTab("mutations")}
          style={{
            padding: "0.55rem 1.15rem",
            borderRadius: "8px",
            border: "none",
            background: activeTab === "mutations" ? "var(--color-primary)" : "transparent",
            color: activeTab === "mutations" ? "#ffffff" : "var(--text-muted)",
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem"
          }}
        >
          <History size={16} />
          <span>Riwayat Mutasi &amp; Promosi ({mutations.length})</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 1: DATA KARYAWAN
          ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Quick Status Filter Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "Semua Karyawan", value: "all", count: statusCounts.total },
              { label: "Karyawan Aktif", value: "Aktif", count: statusCounts.active },
              { label: "Tetap", value: "Tetap", count: statusCounts.tetap },
              { label: "Kontrak", value: "Kontrak", count: statusCounts.kontrak },
              { label: "Probation", value: "Probation", count: statusCounts.probation },
              { label: "Resigned / Non-Aktif", value: "Resigned", count: statusCounts.resigned },
            ].map((pill) => {
              const isSelected = selectedStatus === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => {
                    setSelectedStatus(pill.value);
                    setPage(1);
                  }}
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: "20px",
                    border: `1.5px solid ${isSelected ? "var(--color-primary)" : "var(--bg-border)"}`,
                    background: isSelected ? "rgba(13, 153, 255, 0.15)" : "var(--bg-surface)",
                    color: isSelected ? "var(--color-primary)" : "var(--text-secondary)",
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    transition: "all 0.15s ease"
                  }}
                >
                  <span>{pill.label}</span>
                  <span style={{
                    fontSize: "0.72rem",
                    padding: "1px 6px",
                    borderRadius: "10px",
                    background: isSelected ? "var(--color-primary)" : "var(--bg-hover)",
                    color: isSelected ? "#ffffff" : "var(--text-muted)",
                    fontWeight: 700
                  }}>
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filters Bar */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "12px",
            padding: "0.85rem 1.25rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.85rem",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <form onSubmit={handleSearchSubmit} style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: "1", minWidth: "260px" }}>
              <div style={{ position: "relative", width: "100%" }}>
                <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Cari nama, NIK, NIP, jabatan, atau email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                    borderRadius: "8px",
                    border: "1px solid var(--bg-border)",
                    background: "var(--bg-hover)",
                    color: "var(--text-primary)",
                    fontSize: "0.825rem"
                  }}
                />
              </div>
              <button type="submit" className="btn-secondary" style={{ padding: "0.5rem 0.85rem", fontSize: "0.825rem", borderRadius: "8px" }}>
                Cari
              </button>
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setPage(1); }}
                  style={{
                    padding: "0.5rem 0.65rem",
                    borderRadius: "8px",
                    border: "1px solid var(--bg-border)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontSize: "0.825rem",
                    cursor: "pointer"
                  }}
                >
                  Reset
                </button>
              )}
            </form>

            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
              {/* Filter Divisi */}
              <select
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setPage(1); }}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.825rem"
                }}
              >
                <option value="all">Semua Divisi ({masters.departments?.length || 13})</option>
                {masters.departments?.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {/* Filter Cabang */}
              <select
                value={selectedBranch}
                onChange={(e) => { setSelectedBranch(e.target.value); setPage(1); }}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--bg-border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.825rem"
                }}
              >
                <option value="all">Semua Cabang ({masters.branches?.length || 10})</option>
                {masters.branches?.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)"
          }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.825rem" }}>
                <thead>
                  <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>NIK / NIP</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>NAMA LENGKAP</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>DIVISI &amp; JABATAN</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>CABANG</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>STATUS</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>MASA KERJA</th>
                    <th style={{ padding: "0.85rem 1rem", fontWeight: 600, textAlign: "center" }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const posTitle = emp.position?.title || emp.position_title || emp.position || "-";
                    const deptName = emp.department?.name || emp.department_name || emp.department || "-";
                    const deptColor = emp.department?.color || emp.department_color || "#0D99FF";
                    const branchName = emp.branch?.city || emp.branch?.name || emp.branch_name || emp.branch || "-";
                    const masaKerja = emp.masa_kerja || "-";

                    return (
                      <tr
                        key={emp.id}
                        style={{ borderBottom: "1px solid var(--border-table-row)", transition: "background 0.15s ease" }}
                        className="table-row-hover"
                      >
                        <td style={{ padding: "0.85rem 1rem", fontFamily: "var(--font-mono, monospace)" }}>
                          <div style={{ fontWeight: 700, color: "var(--color-primary)" }}>{emp.nik || emp.id}</div>
                          {emp.nip && emp.nip !== emp.nik && (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>NIP: {emp.nip}</div>
                          )}
                        </td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{emp.nama_lengkap}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {emp.email} {emp.no_hp && emp.no_hp !== "-" ? `• ${emp.no_hp}` : ""}
                          </div>
                        </td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: deptColor, flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{posTitle}</span>
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "12px" }}>
                            {deptName}
                          </div>
                        </td>
                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <MapPin size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                            <span>{branchName}</span>
                          </div>
                        </td>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          {getStatusBadge(emp.status_karyawan)}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                          <div>{masaKerja}</div>
                          {emp.tanggal_masuk && (
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 400 }}>Sejak {emp.tanggal_masuk}</div>
                          )}
                        </td>
                        <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                          <button
                            onClick={() => openDetail(emp.id)}
                            style={{
                              padding: "0.35rem 0.65rem",
                              borderRadius: "6px",
                              border: "1px solid var(--bg-border)",
                              background: "var(--bg-hover)",
                              color: "var(--text-primary)",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem"
                            }}
                          >
                            <Eye size={13} />
                            <span>Detail</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {employees.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                        Tidak ditemukan data karyawan sesuai kriteria filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Row Count Footer */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              padding: "0.85rem 1.25rem",
              background: "var(--bg-hover)",
              borderTop: "1px solid var(--bg-border)"
            }}>
              <div style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>
                Menampilkan <strong>{employees.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> - <strong>{Math.min(page * pageSize, totalEmployees)}</strong> dari <strong>{totalEmployees}</strong> karyawan
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.825rem", color: "var(--text-muted)" }}>
                  <span>Tampilkan:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    style={{
                      padding: "0.35rem 0.6rem",
                      borderRadius: "6px",
                      border: "1px solid var(--bg-border)",
                      background: "var(--bg-surface)",
                      color: "var(--text-primary)",
                      fontSize: "0.825rem"
                    }}
                  >
                    <option value={50}>50 Baris</option>
                    <option value={100}>100 Baris</option>
                    <option value={250}>250 Baris</option>
                    <option value={500}>Semua (478 Karyawan)</option>
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    style={{
                      padding: "0.4rem 0.8rem",
                      borderRadius: "6px",
                      border: "1px solid var(--bg-border)",
                      background: page <= 1 ? "transparent" : "var(--bg-surface)",
                      color: page <= 1 ? "var(--text-muted)" : "var(--text-primary)",
                      cursor: page <= 1 ? "not-allowed" : "pointer",
                      fontSize: "0.8rem"
                    }}
                  >
                    Sebelumnya
                  </button>
                  <span style={{ fontSize: "0.825rem", color: "var(--text-secondary)", padding: "0 0.4rem" }}>
                    Hal. {page} dari {Math.ceil(totalEmployees / pageSize) || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(Math.ceil(totalEmployees / pageSize) || 1, p + 1))}
                    disabled={page >= Math.ceil(totalEmployees / pageSize)}
                    style={{
                      padding: "0.4rem 0.8rem",
                      borderRadius: "6px",
                      border: "1px solid var(--bg-border)",
                      background: page >= Math.ceil(totalEmployees / pageSize) ? "transparent" : "var(--bg-surface)",
                      color: page >= Math.ceil(totalEmployees / pageSize) ? "var(--text-muted)" : "var(--text-primary)",
                      cursor: page >= Math.ceil(totalEmployees / pageSize) ? "not-allowed" : "pointer",
                      fontSize: "0.8rem"
                    }}
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 2: STRUKTUR ORGANISASI (ORG CHART)
          ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "org" && (
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--bg-border)",
          borderRadius: "14px",
          padding: "2rem",
          overflowX: "auto",
          minHeight: "550px",
          display: "flex",
          justifyContent: "center",
          boxShadow: "var(--shadow-sm)"
        }}>
          <div style={{ display: "flex", gap: "2rem", justifyContent: "center" }}>
            {orgChart.map((rootNode) => renderOrgNode(rootNode))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TAB 3: RIWAYAT MUTASI KARYAWAN
          ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "mutations" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.825rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>TANGGAL EFEKTIF</th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>KARYAWAN</th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>JENIS MUTASI</th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>PERUBAHAN (DARI → KE)</th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>NOMOR SK</th>
                  <th style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>KETERANGAN</th>
                </tr>
              </thead>
              <tbody>
                {mutations.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--border-table-row)" }}>
                    <td style={{ padding: "0.85rem 1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {m.tanggal_efektif}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{m.nama_lengkap}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.nik}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "12px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: m.jenis_mutasi === "Promosi" ? "rgba(16, 185, 129, 0.15)" : "rgba(13, 153, 255, 0.15)",
                        color: m.jenis_mutasi === "Promosi" ? "#10B981" : "#0D99FF"
                      }}>
                        {m.jenis_mutasi}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)" }}>
                        <span>{m.dari_pos || m.dari_dept || m.dari_cabang || "-"}</span>
                        <ArrowRight size={13} style={{ color: "var(--color-primary)" }} />
                        <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{m.ke_pos || m.ke_dept || m.ke_cabang || "-"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontFamily: "var(--font-mono, monospace)", fontSize: "0.78rem" }}>
                      {m.nomor_sk || "-"}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                      {m.keterangan || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL DETAIL KARYAWAN ── */}
      {detailModalOpen && selectedEmp && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "700px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Briefcase size={18} style={{ color: "var(--color-primary)" }} />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Detail Profil Karyawan
                </h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Header Card */}
            {(() => {
              const emp = selectedEmp?.employee || selectedEmp || {};
              const deptColor = emp.department?.color || emp.department_color || "var(--color-primary)";
              const deptName = emp.department?.name || emp.department_name || emp.department || "General";
              const posTitle = emp.position?.title || emp.position_title || emp.position || "Staff";
              const branchName = emp.branch?.name || emp.branch?.city || emp.branch_name || emp.branch || "HO - Balikpapan";
              const supervisorName = emp.supervisor?.name || emp.supervisor_name || "Direktur Utama / Board";
              const leaveBal = selectedEmp?.leave_balance || {};
              const attStats = selectedEmp?.attendance_stats || {};

              return (
                <>
                  <div style={{
                    background: "var(--bg-hover)",
                    borderRadius: "12px",
                    padding: "1rem 1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem"
                  }}>
                    <div style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      background: deptColor,
                      color: "#ffffff",
                      fontSize: "1.2rem",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      {emp.nama_lengkap ? emp.nama_lengkap.split(" ").map((n: string) => n[0]).slice(0, 2).join("") : "CP"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>
                        {emp.nama_lengkap}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--color-primary)", fontWeight: 600 }}>
                        {posTitle} • {deptName}
                      </div>
                      <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.3rem", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>ID: {emp.nik || emp.id}</span>
                        {emp.nip && emp.nip !== emp.nik && (
                          <>
                            <span>•</span>
                            <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--text-muted)" }}>NIP: {emp.nip}</span>
                          </>
                        )}
                        <span>•</span>
                        {getStatusBadge(emp.status_karyawan)}
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem", fontSize: "0.825rem" }}>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Email Perusahaan:</span>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{emp.email || "-"}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>No. Telepon / WA:</span>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{emp.no_hp || emp.wa || "-"}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Penempatan Cabang:</span>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{branchName}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Atasan Langsung:</span>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{supervisorName}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Tanggal Bergabung:</span>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{emp.tanggal_masuk || "-"} ({emp.masa_kerja || "-"})</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Alamat Domisili:</span>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{emp.alamat || "-"}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Rekening Payroll:</span>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {emp.nomorrekening ? `${emp.nomorrekening} (a.n ${emp.pemilik_rekening || emp.nama_lengkap})` : "Tercatat di Payroll"}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)" }}>Jenis Kelamin:</span>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {emp.jenis_kelamin === "L" || emp.jenis_kelamin === "l" ? "Laki-laki" : "Perempuan"}
                      </div>
                    </div>
                  </div>

                  {/* Sisa Cuti Card */}
                  <div style={{
                    background: "rgba(13, 153, 255, 0.08)",
                    border: "1px solid rgba(13, 153, 255, 0.25)",
                    borderRadius: "10px",
                    padding: "0.85rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>KUOTA CUTI TAHUNAN ({leaveBal.tahun || "2026"})</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 600 }}>
                        Hak: {leaveBal.kuota || leaveBal.kuota_cuti || 12} hari • Terpakai: {leaveBal.terpakai || leaveBal.cuti_terpakai || 0} hari
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-primary)" }}>
                        {leaveBal.sisa ?? leaveBal.cuti_sisa ?? 12}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Hari Tersisa</div>
                    </div>
                  </div>

                  {/* Rekap Absensi Operasional */}
                  <div style={{
                    background: "var(--bg-hover)",
                    borderRadius: "10px",
                    padding: "0.85rem 1rem"
                  }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: "0.4rem" }}>
                      REKAP ABSENSI OPERASIONAL
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", textAlign: "center" }}>
                      <div style={{ padding: "0.4rem", background: "var(--bg-surface)", borderRadius: "6px" }}>
                        <div style={{ fontWeight: 700, color: "#FFB323" }}>{attStats.total_terlambat || 0}x</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Terlambat</div>
                      </div>
                      <div style={{ padding: "0.4rem", background: "var(--bg-surface)", borderRadius: "6px" }}>
                        <div style={{ fontWeight: 700, color: "#0D99FF" }}>{attStats.total_izin || 0}x</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Izin</div>
                      </div>
                      <div style={{ padding: "0.4rem", background: "var(--bg-surface)", borderRadius: "6px" }}>
                        <div style={{ fontWeight: 700, color: "#F43F5E" }}>{attStats.total_sakit || 0}x</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Sakit</div>
                      </div>
                      <div style={{ padding: "0.4rem", background: "var(--bg-surface)", borderRadius: "6px" }}>
                        <div style={{ fontWeight: 700, color: "#8B5CF6" }}>{attStats.total_cuti || 0}x</div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Cuti</div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Riwayat Mutasi Karyawan */}
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                Riwayat Mutasi &amp; Promosi
              </div>
              {selectedEmp.mutations && selectedEmp.mutations.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {selectedEmp.mutations.map((m: any) => (
                    <div key={m.id} style={{ background: "var(--bg-hover)", padding: "0.65rem 0.85rem", borderRadius: "8px", fontSize: "0.78rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                        <span style={{ color: "var(--color-primary)" }}>{m.jenis_mutasi} ({m.tanggal_efektif})</span>
                        <span style={{ color: "var(--text-muted)" }}>{m.nomor_sk}</span>
                      </div>
                      <div style={{ color: "var(--text-primary)", marginTop: "2px" }}>
                        {m.dari_pos || m.dari_dept} → {m.ke_pos || m.ke_dept}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                        Keterangan: {m.keterangan || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Belum ada riwayat mutasi.</div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="btn-secondary"
                style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TAMBAH KARYAWAN BARU ── */}
      {addEmpModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "650px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Tambah Karyawan Baru
              </h3>
              <button onClick={() => setAddEmpModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>NIK *</label>
                  <input
                    required
                    type="text"
                    placeholder="EMP-026"
                    value={newEmp.nik}
                    onChange={(e) => setNewEmp({ ...newEmp, nik: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Nama Lengkap *</label>
                  <input
                    required
                    type="text"
                    placeholder="Nama Lengkap Karyawan"
                    value={newEmp.nama_lengkap}
                    onChange={(e) => setNewEmp({ ...newEmp, nama_lengkap: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Email Perusahaan *</label>
                  <input
                    required
                    type="email"
                    placeholder="nama@cpa.co.id"
                    value={newEmp.email}
                    onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>No HP / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="0812xxxxxxxx"
                    value={newEmp.no_hp}
                    onChange={(e) => setNewEmp({ ...newEmp, no_hp: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Divisi *</label>
                  <select
                    required
                    value={newEmp.department_id}
                    onChange={(e) => setNewEmp({ ...newEmp, department_id: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  >
                    <option value="">Pilih Divisi</option>
                    {masters.departments?.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Jabatan *</label>
                  <select
                    required
                    value={newEmp.position_id}
                    onChange={(e) => setNewEmp({ ...newEmp, position_id: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  >
                    <option value="">Pilih Jabatan</option>
                    {masters.positions?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Cabang Penempatan *</label>
                  <select
                    required
                    value={newEmp.branch_id}
                    onChange={(e) => setNewEmp({ ...newEmp, branch_id: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  >
                    <option value="">Pilih Cabang</option>
                    {masters.branches?.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Atasan Langsung (Supervisor)</label>
                  <select
                    value={newEmp.supervisor_id}
                    onChange={(e) => setNewEmp({ ...newEmp, supervisor_id: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  >
                    <option value="">Tanpa Supervisor (BOD)</option>
                    {masters.supervisors?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.nama_lengkap} ({s.position_title})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Status Karyawan *</label>
                  <select
                    value={newEmp.status_karyawan}
                    onChange={(e) => setNewEmp({ ...newEmp, status_karyawan: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  >
                    <option value="Tetap">Tetap</option>
                    <option value="Kontrak">Kontrak</option>
                    <option value="Probation">Probation</option>
                    <option value="Magang">Magang</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Tanggal Bergabung *</label>
                  <input
                    required
                    type="date"
                    value={newEmp.tanggal_masuk}
                    onChange={(e) => setNewEmp({ ...newEmp, tanggal_masuk: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setAddEmpModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "8px",
                    background: "var(--color-primary)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {submitting ? "Menyimpan..." : "Simpan Karyawan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CATAT MUTASI BARU ── */}
      {addMutModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--bg-border)",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "600px",
            maxHeight: "90vh",
            overflowY: "auto",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--bg-border)", paddingBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Catat Mutasi / Promosi Karyawan
              </h3>
              <button onClick={() => setAddMutModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMutation} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Pilih Karyawan *</label>
                <select
                  required
                  value={newMut.employee_id}
                  onChange={(e) => setNewMut({ ...newMut, employee_id: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                >
                  <option value="">Pilih Karyawan</option>
                  {employees.filter(e => e.status_karyawan !== "Resigned").map((e: any) => (
                    <option key={e.id} value={e.id}>{e.nama_lengkap} ({e.nik} - {e.position?.title})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Jenis Mutasi *</label>
                  <select
                    value={newMut.jenis_mutasi}
                    onChange={(e) => setNewMut({ ...newMut, jenis_mutasi: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  >
                    <option value="Promosi">Promosi</option>
                    <option value="Rotasi">Rotasi</option>
                    <option value="Transfer Cabang">Transfer Cabang</option>
                    <option value="Demosi">Demosi</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Tanggal Efektif *</label>
                  <input
                    required
                    type="date"
                    value={newMut.tanggal_efektif}
                    onChange={(e) => setNewMut({ ...newMut, tanggal_efektif: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Nomor SK Direksi</label>
                <input
                  type="text"
                  placeholder="SK/HRM/025/2026"
                  value={newMut.nomor_sk}
                  onChange={(e) => setNewMut({ ...newMut, nomor_sk: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Ke Divisi Baru</label>
                  <select
                    value={newMut.ke_department_id}
                    onChange={(e) => setNewMut({ ...newMut, ke_department_id: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  >
                    <option value="">Tetap (Tidak Berubah)</option>
                    {masters.departments?.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Ke Jabatan Baru</label>
                  <select
                    value={newMut.ke_position_id}
                    onChange={(e) => setNewMut({ ...newMut, ke_position_id: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                  >
                    <option value="">Tetap (Tidak Berubah)</option>
                    {masters.positions?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Ke Cabang Baru</label>
                <select
                  value={newMut.ke_branch_id}
                  onChange={(e) => setNewMut({ ...newMut, ke_branch_id: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                >
                  <option value="">Tetap (Tidak Berubah)</option>
                  {masters.branches?.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Keterangan / Alasan Mutasi</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan SK Direksi atau pertimbangan evaluasi kinerja tahunan..."
                  value={newMut.keterangan}
                  onChange={(e) => setNewMut({ ...newMut, keterangan: e.target.value })}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--bg-border)", background: "var(--bg-hover)", color: "var(--text-primary)", fontSize: "0.825rem" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setAddMutModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "8px",
                    background: "var(--color-primary)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {submitting ? "Memproses..." : "Catat & Terapkan Mutasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
