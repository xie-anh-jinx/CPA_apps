"use client";
import { useState, useEffect, useCallback } from "react";
import { apiCRM } from "@/lib/api";
import CustomerTab from "./CustomerTab";
import CreditHealthTab from "./CreditHealthTab";

interface PipelineSummary {
  opportunities_count: number;
  total_value: number;
  win_rate: number;
  open_complaints: number;
}

interface Opportunity {
  id: number;
  customer_id: string;
  nama_customer: string;
  title: string;
  stage: string;
  expected_value: number;
  close_date: string | null;
}

const STAGES = [
  { id: "prospect", label: "Prospect" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal", label: "Proposal" },
  { id: "negotiation", label: "Negotiation" },
  { id: "closed_won", label: "Closed Won" },
  { id: "closed_lost", label: "Closed Lost" }
];

const STAGE_COLORS: Record<string, string> = {
  "prospect": "hsl(217,91%,75%)",
  "qualified": "hsl(180,80%,65%)",
  "proposal": "hsl(262,83%,75%)",
  "negotiation": "hsl(38,92%,65%)",
  "closed_won": "hsl(142,76%,45%)",
  "closed_lost": "hsl(0,84%,60%)",
};

function fmt(n: number | null | undefined, prefix = "") {
  if (n == null) return "—";
  return `${prefix}${Number(n).toLocaleString("id")}`;
}

export default function CrmPage() {
  const [activeTab, setActiveTab] = useState<"credit_health" | "pipeline" | "customers">("pipeline");
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFinance, setIsFinance] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cpa_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (["finance_manager", "ar_staff", "credit_control", "finance"].includes(u?.role)) {
          setIsFinance(true);
          setActiveTab("credit_health");
        }
      }
    } catch (e) {}
  }, []);

  const load = useCallback(async () => {
    try {
      const [sumRes, oppRes] = await Promise.allSettled([
        apiCRM.pipelineSummary(),
        apiCRM.opportunities(),
      ]);

      if (sumRes.status === "fulfilled") setSummary(sumRes.value.data);
      if (oppRes.status === "fulfilled") setOpportunities(oppRes.value.data || []);
    } catch {
      // API error handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group by stage for Kanban view
  const groupedOpp = STAGES.reduce((acc, stage) => {
    acc[stage.id] = opportunities.filter((o: Opportunity) => o.stage === stage.id);
    return acc;
  }, {} as Record<string, Opportunity[]>);

  return (
    <div className="animate-fade-up">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className="page-title">
            {activeTab === "credit_health" ? "CRM Credit Health & Risiko Piutang" : "CRM & Pipeline"}
          </h1>
          <p className="page-subtitle">
            {activeTab === "credit_health" 
              ? "Monitoring kesehatan kredit customer, batas plafon, overdue AR, dan rekomendasi rilis pengiriman"
              : "Manajemen prospek dan interaksi pelanggan"}
          </p>
        </div>
        <div>
          {activeTab === "pipeline" && (
            <button className="btn btn-primary">+ Tambah Prospek</button>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid var(--bg-border)" }}>
        <button 
          onClick={() => setActiveTab("credit_health")}
          style={{ 
            background: "none", border: "none", cursor: "pointer", 
            padding: "0.75rem 1rem", fontSize: "0.95rem", fontWeight: 600,
            display: "flex", alignItems: "center", gap: "0.4rem",
            color: activeTab === "credit_health" ? "var(--color-primary)" : "var(--text-muted)",
            borderBottom: activeTab === "credit_health" ? "2px solid var(--color-primary)" : "2px solid transparent"
          }}>
          <span>💳</span>
          <span>Credit Health & Risiko</span>
          {isFinance && (
            <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", borderRadius: "10px", background: "rgba(59,130,246,0.15)", color: "#3B82F6" }}>
              Finance Focus
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab("pipeline")}
          style={{ 
            background: "none", border: "none", cursor: "pointer", 
            padding: "0.75rem 1rem", fontSize: "0.95rem", fontWeight: 600,
            display: "flex", alignItems: "center", gap: "0.4rem",
            color: activeTab === "pipeline" ? "var(--color-primary)" : "var(--text-muted)",
            borderBottom: activeTab === "pipeline" ? "2px solid var(--color-primary)" : "2px solid transparent"
          }}>
          <span>🎯</span>
          <span>Pipeline Prospek</span>
        </button>
        <button 
          onClick={() => setActiveTab("customers")}
          style={{ 
            background: "none", border: "none", cursor: "pointer", 
            padding: "0.75rem 1rem", fontSize: "0.95rem", fontWeight: 600,
            display: "flex", alignItems: "center", gap: "0.4rem",
            color: activeTab === "customers" ? "var(--color-primary)" : "var(--text-muted)",
            borderBottom: activeTab === "customers" ? "2px solid var(--color-primary)" : "2px solid transparent"
          }}>
          <span>👥</span>
          <span>Direktori & Customer 360</span>
        </button>
      </div>

      {activeTab === "credit_health" ? (
        <CreditHealthTab />
      ) : activeTab === "pipeline" ? (
        <>
          <div className="kpi-grid" style={{ marginBottom: "1.25rem" }}>
            <div className="kpi-card primary">
              <div className="kpi-icon primary">🎯</div>
              <div className="kpi-value">{summary?.opportunities_count || "—"}</div>
              <div className="kpi-label">Total Opportunities</div>
            </div>
            <div className="kpi-card primary">
              <div className="kpi-icon primary">💰</div>
              <div className="kpi-value">{fmt(summary?.total_value, "Rp ")}</div>
              <div className="kpi-label">Pipeline Value</div>
            </div>
            <div className="kpi-card success">
              <div className="kpi-icon success">🏆</div>
              <div className="kpi-value">{summary?.win_rate ? `${summary.win_rate.toFixed(1)}%` : "—"}</div>
              <div className="kpi-label">Win Rate</div>
            </div>
            <div className="kpi-card danger">
              <div className="kpi-icon danger">🎫</div>
              <div className="kpi-value" style={{ color: "hsl(0,84%,70%)" }}>{summary?.open_complaints || "—"}</div>
              <div className="kpi-label">Open Complaints</div>
            </div>
          </div>

          {/* Kanban Board */}
          <div style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "1rem" }}>
            {STAGES.map((stage) => (
              <div key={stage.id} style={{ minWidth: 280, flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.5rem 0", borderBottom: `2px solid ${STAGE_COLORS[stage.id]}`
                }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{stage.label}</span>
                  <span style={{
                    background: "var(--bg-surface)", padding: "0.2rem 0.5rem",
                    borderRadius: "var(--radius-md)", fontSize: "0.75rem", color: "var(--text-muted)"
                  }}>
                    {groupedOpp[stage.id]?.length || 0}
                  </span>
                </div>

                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 100, borderRadius: "var(--radius-md)" }} />
                  ))
                ) : groupedOpp[stage.id]?.length === 0 ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", border: "1px dashed var(--bg-border)", borderRadius: "var(--radius-md)" }}>
                    Kosong
                  </div>
                ) : (
                  groupedOpp[stage.id]?.map((opp: Opportunity) => (
                    <div key={opp.id} className="card" style={{ padding: "0.75rem", cursor: "grab" }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--text-primary)" }}>
                        {opp.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                        🏢 {opp.nama_customer}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: STAGE_COLORS[stage.id] }}>
                          {fmt(opp.expected_value, "Rp ")}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {opp.close_date ? new Date(opp.close_date).toLocaleDateString("id", { month: "short", day: "numeric" }) : "—"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <CustomerTab />
      )}
    </div>
  );
}
