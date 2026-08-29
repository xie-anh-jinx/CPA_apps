"use client";
import { useState, useEffect } from "react";
import { apiAlerts } from "@/lib/api";

interface Alert {
  id: number;
  alert_type: string;
  severity: string;
  message: string;
  reference_id: string;
  is_resolved: boolean;
  created_at: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const res = await apiAlerts.list();
      setAlerts(res.data.data);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (id: number) => {
    try {
      await apiAlerts.resolve(id);
      loadAlerts(); // Refresh after resolving
    } catch (err) {
      console.error("Failed to resolve alert:", err);
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <h1 className="page-title">Sistem Peringatan (Alerts)</h1>
        <p className="page-subtitle">Peringatan stok, pengiriman, dan anomali data</p>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : alerts.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          Tidak ada peringatan aktif saat ini.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`alert-banner ${alert.severity === "critical" ? "critical" : "warning"}`}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <div>
                <strong>{alert.severity === "critical" ? "🚨 Kritis" : "⚠️ Warning"} - {alert.alert_type}</strong>
                <p style={{ margin: "0.25rem 0", fontSize: "0.875rem" }}>{alert.message}</p>
                <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                  Ref: {alert.reference_id} • {new Date(alert.created_at).toLocaleString("id")}
                </span>
              </div>
              
              {!alert.is_resolved && (
                <button 
                  onClick={() => resolveAlert(alert.id)}
                  className="btn btn-ghost btn-sm"
                  style={{ backgroundColor: "rgba(0,0,0,0.1)", fontWeight: 600 }}
                >
                  Tandai Selesai ✓
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
