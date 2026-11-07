"""
PADI ERP / CPA Analytics — Delivery Order (DO) Recap & Presentation Generator
═══════════════════════════════════════════════════════════════════════════════
Memproses file Excel/CSV laporan operasional (seperti Delivery Order) yang
diunggah pengguna di CPA AI, menghitung analitik secara presisi (100% data aktual),
dan menghasilkan:
1. File presentasi slide deck interaktif (.html) mandiri dengan C3.js + D3.js,
   styling korporat PT CPA (Navy & Amber), 8 slide lengkap, navigasi keyboard & touch,
   serta tombol Fullscreen dan Cetak/Print A4 Landscape.
2. Ringkasan Eksekutif Markdown di chat box lengkap dengan Action Button untuk
   membuka slide presentasi interaktif di browser dan mengunduh filenya.
"""

import os
import re
import io
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np

from app.mcp.auth import MCPUser
from app.services.report_engine import REPORTS_DIR


def format_number_id(val: float or int, decimals: int = 0) -> str:
    """Format number into Indonesian locale format (1.234.567,89)."""
    if pd.isna(val) or val is None:
        return "0"
    if decimals > 0:
        s = f"{val:,.{decimals}f}"
        parts = s.split(".")
        int_part = parts[0].replace(",", ".")
        dec_part = parts[1]
        return f"{int_part},{dec_part}"
    else:
        return f"{int(round(val)):,}".replace(",", ".")


def format_volume_short(vol: float) -> str:
    """Format volume in compact form (e.g. 4,41 Jt L or 88,8 Rb L)."""
    if vol >= 1_000_000:
        return f"{vol / 1_000_000:.2f}".replace(".", ",") + " Jt L"
    elif vol >= 1_000:
        return f"{vol / 1_000:.1f}".replace(".", ",") + " Rb L"
    return f"{int(vol):,} L".replace(",", ".")


class DeliveryOrderPresentationGenerator:
    """Enterprise Delivery Order Analysis & Interactive Slide Deck Generator."""

    def __init__(self, output_dir: str = REPORTS_DIR):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def is_delivery_order_file(self, df: pd.DataFrame, filename: str = "") -> bool:
        """Determines if the DataFrame represents a Delivery Order dataset."""
        fn_lower = filename.lower()
        if any(k in fn_lower for k in ["delivery_order", "laporan_do", "rekap_do", "recap_do", "surat_jalan", "do_"]):
            return True

        col_str = " ".join([str(c).lower() for c in df.columns])
        has_do_col = any(k in col_str for k in ["nomor do", "no do", "no. do", "do number", "surat jalan"])
        has_vol = any(k in col_str for k in ["volume", "liter", "qty"])
        has_cust = any(k in col_str for k in ["customer", "pelanggan"])
        return has_do_col or (has_vol and has_cust)

    def parse_dataframe(self, file_bytes: bytes, filename: str) -> pd.DataFrame:
        """Reads file bytes into a clean Pandas DataFrame."""
        file_ext = filename.lower().split(".")[-1] if "." in filename else ""
        if file_ext == "csv":
            try:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8")
            except Exception:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding="latin-1")
        else:
            excel_file = pd.ExcelFile(io.BytesIO(file_bytes))
            # Pick the sheet with largest number of rows
            best_df = None
            max_r = -1
            for s in excel_file.sheet_names:
                candidate = excel_file.parse(s)
                candidate = candidate.dropna(how="all")
                if len(candidate) > max_r:
                    max_r = len(candidate)
                    best_df = candidate
            df = best_df if best_df is not None else pd.DataFrame()

        df = df.dropna(how="all")
        return df

    def analyze_dataset(self, df: pd.DataFrame, filename: str) -> Dict[str, Any]:
        """Calculates 100% actual metrics and breakdown structures from the dataset."""
        col_map = {}
        for c in df.columns:
            cl = str(c).strip().lower()
            if "nomor do" in cl or "no do" in cl or "no. do" in cl or "do number" in cl:
                col_map["no_do"] = c
            elif "tanggal do" in cl or "tgl do" in cl or (cl == "tanggal" and "tgl_do" not in col_map):
                col_map["tgl_do"] = c
            elif "nama customer" in cl or "customer" in cl or "pelanggan" in cl:
                col_map["customer"] = c
            elif "id customer" in cl or "kode customer" in cl:
                col_map["id_customer"] = c
            elif "gudang" in cl or "warehouse" in cl:
                col_map["gudang"] = c
            elif "volume" in cl or "liter" in cl:
                col_map["volume"] = c
            elif "kemasan" in cl or "koli" in cl or ("qty" in cl and "volume" not in col_map):
                col_map["kemasan"] = c
            elif "receive date" in cl or "tgl terima" in cl or "tanggal terima" in cl:
                col_map["receive_date"] = c
            elif "durasi do ke receive" in cl or "lead receive" in cl:
                col_map["lead_receive"] = c
            elif "return date" in cl or "tgl retur" in cl:
                col_map["return_date"] = c
            elif "selisih hari (return" in cl or "return - receive" in cl:
                col_map["return_delta"] = c
            elif "nomor invoice" in cl or "no invoice" in cl or "no. inv" in cl:
                col_map["no_invoice"] = c
            elif "tanggal invoice" in cl or "tgl invoice" in cl or "tgl inv" in cl:
                col_map["tgl_invoice"] = c
            elif "durasi do ke invoice" in cl or "lead invoice" in cl:
                col_map["lead_invoice"] = c
            elif "status" in cl:
                col_map["status"] = c
            elif "driver" in cl or "supir" in cl:
                col_map["driver"] = c
            elif "plat" in cl:
                col_map["plat"] = c

        total_rows = len(df)
        vol_col = col_map.get("volume")
        kemasan_col = col_map.get("kemasan")
        status_col = col_map.get("status")
        gudang_col = col_map.get("gudang")
        cust_col = col_map.get("customer")
        tgl_do_col = col_map.get("tgl_do")
        lead_inv_col = col_map.get("lead_invoice")
        ret_delta_col = col_map.get("return_delta")

        # Clean numerical columns
        if vol_col:
            df["_clean_vol"] = pd.to_numeric(
                df[vol_col].astype(str).str.replace(".", "", regex=False).str.replace(",", ".", regex=False),
                errors="coerce"
            ).fillna(0)
        else:
            df["_clean_vol"] = 0

        if kemasan_col:
            df["_clean_kemasan"] = pd.to_numeric(
                df[kemasan_col].astype(str).str.replace(".", "", regex=False).str.replace(",", ".", regex=False),
                errors="coerce"
            ).fillna(0)
        else:
            df["_clean_kemasan"] = 0

        total_volume = float(df["_clean_vol"].sum())
        total_kemasan = int(df["_clean_kemasan"].sum())

        unique_customers = int(df[cust_col].nunique()) if cust_col else 0

        min_date_str = ""
        max_date_str = ""
        if tgl_do_col:
            try:
                date_series = pd.to_datetime(df[tgl_do_col], errors="coerce").dropna()
                if not date_series.empty:
                    months_id = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                                 "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
                    d_min = date_series.min()
                    d_max = date_series.max()
                    min_date_str = f"{d_min.day} {months_id[d_min.month]} {d_min.year}"
                    max_date_str = f"{d_max.day} {months_id[d_max.month]} {d_max.year}"
            except Exception:
                pass

        if min_date_str and max_date_str:
            periode_label = f"PERIODE {min_date_str.upper()} – {max_date_str.upper()}"
            periode_short = f"{min_date_str} s.d. {max_date_str}"
        else:
            periode_label = "LAPORAN OPERASIONAL AKTUAL"
            periode_short = "Periode Berjalan"

        # ── 2. Status Breakdown ──
        status_palette = {
            "invoice": {"color": "#148354", "pill": "ok", "canonical": "Invoice"},
            "send": {"color": "#f5a000", "pill": "warn", "canonical": "Send (Kirim)"},
            "kirim": {"color": "#f5a000", "pill": "warn", "canonical": "Send (Kirim)"},
            "return": {"color": "#c63d38", "pill": "bad", "canonical": "Return"},
            "retur": {"color": "#c63d38", "pill": "bad", "canonical": "Return"},
            "cancel": {"color": "#687785", "pill": "bad", "canonical": "Cancel"},
            "batal": {"color": "#687785", "pill": "bad", "canonical": "Cancel"},
            "received": {"color": "#21769f", "pill": "info", "canonical": "Received"},
            "terima": {"color": "#21769f", "pill": "info", "canonical": "Received"},
            "draft": {"color": "#94a3b8", "pill": "gray", "canonical": "Draft"}
        }

        status_records = []
        status_counts = {}
        if status_col:
            for s_val, group in df.groupby(df[status_col].fillna("Unknown").astype(str)):
                s_clean = s_val.strip()
                s_low = s_clean.lower()
                matched_meta = None
                for k, v in status_palette.items():
                    if k in s_low:
                        matched_meta = v
                        break
                if not matched_meta:
                    matched_meta = {"color": "#687785", "pill": "gray", "canonical": s_clean}

                cnt = len(group)
                vol = float(group["_clean_vol"].sum())
                status_records.append({
                    "raw": s_clean,
                    "label": matched_meta["canonical"],
                    "count": cnt,
                    "volume": int(round(vol)),
                    "color": matched_meta["color"],
                    "pill": matched_meta["pill"]
                })
                status_counts[matched_meta["canonical"].lower()] = {
                    "count": cnt,
                    "volume": vol,
                    "pct_count": round(cnt / total_rows * 100, 1) if total_rows else 0
                }

        status_records.sort(key=lambda x: x["count"], reverse=True)

        # ── 3. Monthly Trends ──
        monthly_data = []
        if tgl_do_col:
            df["_date_parsed"] = pd.to_datetime(df[tgl_do_col], errors="coerce")
            valid_dates = df.dropna(subset=["_date_parsed"]).copy()
            if not valid_dates.empty:
                valid_dates["_year_month"] = valid_dates["_date_parsed"].dt.to_period("M")
                months_id = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
                             "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

                for ym, grp in valid_dates.groupby("_year_month"):
                    m_idx = ym.month
                    y_idx = ym.year
                    m_name = f"{months_id[m_idx]} {y_idx}"
                    cnt = len(grp)
                    vol = float(grp["_clean_vol"].sum())

                    grp_status_str = grp[status_col].fillna("").astype(str).str.lower() if status_col else pd.Series([], dtype=str)
                    inv_c = int(grp_status_str.str.contains("invoice", na=False).sum())
                    send_c = int((grp_status_str.str.contains("send", na=False) | grp_status_str.str.contains("kirim", na=False)).sum())
                    ret_c = int((grp_status_str.str.contains("return", na=False) | grp_status_str.str.contains("retur", na=False)).sum())
                    can_c = int((grp_status_str.str.contains("cancel", na=False) | grp_status_str.str.contains("batal", na=False)).sum())
                    rec_c = int((grp_status_str.str.contains("received", na=False) | grp_status_str.str.contains("terima", na=False)).sum())

                    monthly_data.append({
                        "period": str(ym),
                        "month": m_name,
                        "count": cnt,
                        "volume": int(round(vol)),
                        "invoice": inv_c,
                        "send": send_c,
                        "ret": ret_c,
                        "cancel": can_c,
                        "received": rec_c,
                        "avg_vol": int(round(vol / cnt)) if cnt else 0,
                        "inv_rate": round(inv_c / cnt * 100, 1) if cnt else 0.0,
                        "ret_rate": round(ret_c / cnt * 100, 1) if cnt else 0.0,
                        "can_rate": round(can_c / cnt * 100, 1) if cnt else 0.0,
                    })

        # ── 4. Gudang Asal Breakdown ──
        gudang_data = []
        if gudang_col:
            for g_name, grp in df.groupby(df[gudang_col].fillna("Lainnya").astype(str)):
                g_clean = g_name.strip()
                if not g_clean or g_clean.lower() == "nan":
                    g_clean = "Tanpa Gudang / Belum Terdata"
                gudang_data.append({
                    "name": g_clean,
                    "count": len(grp),
                    "volume": int(round(grp["_clean_vol"].sum()))
                })
        gudang_data.sort(key=lambda x: x["volume"], reverse=True)

        # ── 5. Customer Breakdown ──
        customer_data = []
        if cust_col:
            for c_name, grp in df.groupby(df[cust_col].fillna("Unknown").astype(str)):
                c_clean = c_name.strip()
                if not c_clean or c_clean.lower() == "nan":
                    continue
                customer_data.append({
                    "name": c_clean,
                    "count": len(grp),
                    "volume": int(round(grp["_clean_vol"].sum()))
                })
        customer_data.sort(key=lambda x: x["volume"], reverse=True)

        # ── 6. Lead Time DO -> Invoice ──
        lead_invoice_buckets = [
            {"label": "< 0 hr (Mendahului)", "min": -999, "max": -1, "count": 0},
            {"label": "0 hr (Same-Day)", "min": 0, "max": 0, "count": 0},
            {"label": "1 hr", "min": 1, "max": 1, "count": 0},
            {"label": "2 hr", "min": 2, "max": 2, "count": 0},
            {"label": "3 hr", "min": 3, "max": 3, "count": 0},
            {"label": "4-7 hr", "min": 4, "max": 7, "count": 0},
            {"label": ">7 hr (Tertunda)", "min": 8, "max": 99999, "count": 0},
        ]
        negative_lead_count = 0
        sameday_lead_count = 0
        late_lead_count = 0

        if lead_inv_col:
            valid_leads = pd.to_numeric(df[lead_inv_col], errors="coerce").dropna()
            for v in valid_leads:
                iv = int(v)
                if iv < 0:
                    negative_lead_count += 1
                elif iv == 0:
                    sameday_lead_count += 1
                elif iv > 7:
                    late_lead_count += 1

                for b in lead_invoice_buckets:
                    if b["min"] <= iv <= b["max"]:
                        b["count"] += 1
                        break

        # ── 7. Return vs Receive Delta ──
        return_delta_buckets = [
            {"label": "0 hari", "min": 0, "max": 0, "count": 0},
            {"label": "1 hari", "min": 1, "max": 1, "count": 0},
            {"label": "2 hari", "min": 2, "max": 2, "count": 0},
            {"label": ">2 hari", "min": 3, "max": 99999, "count": 0},
        ]
        if ret_delta_col:
            valid_deltas = pd.to_numeric(df[ret_delta_col], errors="coerce").dropna()
            for v in valid_deltas:
                iv = int(v)
                for b in return_delta_buckets:
                    if b["min"] <= iv <= b["max"]:
                        b["count"] += 1
                        break

        # ── 8. Cancel rate per month ──
        cancel_per_month = []
        for m in monthly_data:
            cancel_per_month.append({
                "month": m["month"].split()[0][:3],
                "rate": m["can_rate"]
            })

        top_gudang_vol_name = gudang_data[0]["name"] if gudang_data else "-"
        top_cust_vol_name = customer_data[0]["name"] if customer_data else "-"

        inv_stat = status_counts.get("invoice", {"count": 0, "pct_count": 0, "volume": 0})
        send_stat = status_counts.get("send (kirim)", {"count": 0, "pct_count": 0, "volume": 0})
        ret_stat = status_counts.get("return", {"count": 0, "pct_count": 0, "volume": 0})
        can_stat = status_counts.get("cancel", {"count": 0, "pct_count": 0, "volume": 0})
        rec_stat = status_counts.get("received", {"count": 0, "pct_count": 0, "volume": 0})

        return {
            "total_rows": total_rows,
            "total_volume": total_volume,
            "total_kemasan": total_kemasan,
            "unique_customers": unique_customers,
            "periode_label": periode_label,
            "periode_short": periode_short,
            "status_records": status_records,
            "monthly_data": monthly_data,
            "gudang_data": gudang_data,
            "customer_data": customer_data,
            "lead_invoice_buckets": lead_invoice_buckets,
            "return_delta_buckets": return_delta_buckets,
            "cancel_per_month": cancel_per_month,
            "negative_lead_count": negative_lead_count,
            "sameday_lead_count": sameday_lead_count,
            "late_lead_count": late_lead_count,
            "inv_stat": inv_stat,
            "send_stat": send_stat,
            "ret_stat": ret_stat,
            "can_stat": can_stat,
            "rec_stat": rec_stat,
            "top_gudang_vol_name": top_gudang_vol_name,
            "top_cust_vol_name": top_cust_vol_name,
            "filename": filename
        }

    def generate_html_deck(self, metrics: Dict[str, Any], output_filename: Optional[str] = None) -> Tuple[str, str, str]:
        """
        Builds the standalone interactive HTML presentation deck based on the user's template.
        Returns: (filename, file_path, download_url)
        """
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = output_filename or f"padi_presentasi_do_{timestamp_str}.html"
        file_path = os.path.join(self.output_dir, filename)

        c3_payload = {
            "total": metrics["total_rows"],
            "totalVolume": int(round(metrics["total_volume"])),
            "totalKemasan": metrics["total_kemasan"],
            "status": metrics["status_records"],
            "monthly": metrics["monthly_data"],
            "gudang": metrics["gudang_data"][:35],
            "customer": metrics["customer_data"][:25],
            "leadInvoice": [{"label": b["label"], "count": b["count"]} for b in metrics["lead_invoice_buckets"]],
            "returnDelta": [{"label": b["label"], "count": b["count"]} for b in metrics["return_delta_buckets"]],
            "cancelPerMonth": metrics["cancel_per_month"]
        }
        json_data_str = json.dumps(c3_payload, ensure_ascii=False)

        inv_pct = metrics["inv_stat"]["pct_count"]
        inv_cnt = metrics["inv_stat"]["count"]
        send_pct = metrics["send_stat"]["pct_count"]
        send_cnt = metrics["send_stat"]["count"]
        send_vol = format_volume_short(metrics["send_stat"]["volume"])
        ret_pct = metrics["ret_stat"]["pct_count"]
        ret_cnt = metrics["ret_stat"]["count"]
        ret_vol = format_volume_short(metrics["ret_stat"]["volume"])

        exec_summary_callout = (
            f"<b>Kesimpulan utama:</b> Dari <b>{format_number_id(metrics['total_rows'])} DO</b> yang tercatat, "
            f"<b>{format_number_id(inv_cnt)} DO ({inv_pct}%) berhasil menjadi invoice</b> — proses penagihan berjalan aktif. "
            f"Namun <b>{format_number_id(send_cnt)} DO ({send_pct}%) masih berstatus 'Send'</b> yang membawa volume <b>{send_vol}</b> "
            f"dan belum dikonfirmasi receive. <b>Return rate {ret_pct}% ({format_number_id(ret_cnt)} DO)</b> dengan volume {ret_vol} "
            f"memerlukan evaluasi disiplin penerimaan fisik dan rekonsiliasi pengiriman."
        )

        lead_findings_html = (
            f"<li><b>{format_number_id(metrics['sameday_lead_count'])} invoice</b> terbit di hari yang sama dengan penerbitan DO (SLA instan).</li>\n"
            f"<li><b>{format_number_id(metrics['late_lead_count'])} invoice</b> membutuhkan waktu &gt; 7 hari setelah DO diterbitkan (perlu percepatan konfirmasi fisik).</li>\n"
            f"<li><b>{format_number_id(metrics['negative_lead_count'])} invoice</b> tercatat mendahului tanggal DO (lead time negatif) — disarankan audit sinkronisasi input ERP.</li>\n"
            f"<li>Return-receive delta: <b>{format_number_id(metrics['return_delta_buckets'][0]['count'])} DO</b> diselesaikan di hari yang sama.</li>"
        )

        html_content = f"""<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Presentasi Delivery Order — PT CPA ({metrics['periode_short']})</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/c3@0.7.20/c3.min.css">
<script src="https://cdn.jsdelivr.net/npm/d3@5.16.0/dist/d3.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/c3@0.7.20/c3.min.js"></script>
<style>
  :root{{--navy:#102638;--navy2:#183d57;--amber:#f5a000;--amber2:#ffc247;--ink:#172630;--muted:#687785;--line:#d9e2e7;--ok:#148354;--warn:#c87900;--bad:#c63d38;--blue:#21769f}}
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:#0a1620;color:var(--ink);font-family:Inter,"Segoe UI",Arial,sans-serif;overflow:hidden;height:100vh}}
  .deck{{position:relative;width:100vw;height:100vh;overflow:hidden;background:#0a1620}}
  .slide{{position:absolute;inset:0;padding:52px 68px;background:#fff;opacity:0;visibility:hidden;transition:opacity .4s ease,transform .4s ease;transform:translateX(30px);display:flex;flex-direction:column;overflow:auto}}
  .slide.active{{opacity:1;visibility:visible;transform:none}}
  .slide::-webkit-scrollbar{{width:8px}}.slide::-webkit-scrollbar-thumb{{background:#c9d4db;border-radius:8px}}
  .slideBar{{position:absolute;top:0;left:0;right:0;height:7px;background:linear-gradient(90deg,var(--navy),var(--amber))}}
  .slideHead{{display:flex;align-items:center;gap:14px;margin-bottom:22px;flex-wrap:wrap}}
  .brand{{width:52px;height:52px;flex:0 0 52px;border-radius:14px;background:var(--amber);color:var(--navy);display:grid;place-items:center;font-weight:1000;font-size:18px;box-shadow:inset 0 -6px 0 rgba(0,0,0,.08)}}
  .slideHead h2{{font-size:28px;letter-spacing:-.03em;line-height:1.05;color:var(--navy)}}
  .slideHead p{{font-size:12px;color:var(--muted);margin-top:3px}}
  .slideHead .num{{margin-left:auto;font-size:11px;color:var(--muted);background:#f1f5f7;padding:5px 11px;border-radius:99px;font-weight:800;letter-spacing:.05em}}
  .cover-slide{{background:linear-gradient(125deg,#091c29,#183d57);color:#fff;justify-content:center;align-items:flex-start;padding:64px 80px;position:relative;overflow:hidden}}
  .cover-slide:after{{content:"";position:absolute;width:600px;height:600px;border:100px solid rgba(255,255,255,.035);border-radius:50%;right:-200px;top:-320px}}
  .cover-slide .logo{{width:84px;height:84px;border-radius:20px;background:var(--amber);color:var(--navy);display:grid;place-items:center;font-weight:1000;font-size:28px;box-shadow:inset 0 -8px 0 rgba(0,0,0,.09);margin-bottom:22px;position:relative;z-index:1}}
  .cover-slide h1{{font-size:44px;letter-spacing:-.035em;line-height:1.02;margin-bottom:10px;position:relative;z-index:1}}
  .cover-slide .sub{{font-size:16px;color:#cad8e0;margin-bottom:32px;position:relative;z-index:1}}
  .cover-slide .meta{{display:grid;grid-template-columns:repeat(4,auto);gap:28px;margin-top:34px;font-size:11px;color:#d4e0e6;position:relative;z-index:1}}
  .cover-slide .meta b{{display:block;font-size:9px;letter-spacing:.14em;color:var(--amber2);margin-bottom:4px}}
  .cover-slide .badge{{display:inline-block;font-size:10px;letter-spacing:.14em;padding:6px 14px;border:1px solid rgba(245,160,0,.5);border-radius:99px;color:var(--amber2);margin-bottom:16px;position:relative;z-index:1}}
  .kpiGrid{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}}
  .kpi{{border:1px solid var(--line);border-radius:14px;padding:16px;background:linear-gradient(180deg,#f8fafb,#f1f5f7);position:relative;overflow:hidden}}
  .kpi:before{{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--blue)}}
  .kpi.ok:before{{background:var(--ok)}}.kpi.warn:before{{background:var(--warn)}}.kpi.bad:before{{background:var(--bad)}}.kpi.amber:before{{background:var(--amber)}}
  .kpi small{{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:900}}
  .kpi b{{display:block;font-size:24px;color:var(--navy);margin-top:5px;letter-spacing:-.02em}}
  .kpi span{{font-size:10.5px;color:var(--muted);margin-top:2px;display:block}}
  .chartGrid{{display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:1}}
  .chartGrid3{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}}
  .chartBox{{border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:#fff;display:flex;flex-direction:column;min-height:0}}
  .chartBox h4{{font-size:13px;color:var(--navy);margin-bottom:2px}}
  .chartBox .cap{{font-size:10px;color:var(--muted);margin-bottom:10px}}
  .chartBox .c3{{flex:1}}.chartBox .c3 svg{{font-family:Inter,"Segoe UI",Arial,sans-serif!important}}
  table{{width:100%;border-collapse:collapse;font-size:10.5px}}
  th,td{{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}}
  th{{background:var(--navy);color:#fff;font-size:9px;text-transform:uppercase;letter-spacing:.05em;font-weight:800}}
  tbody tr:nth-child(even){{background:#fafcfd}}
  td.num,th.num{{text-align:right}}
  .pill{{display:inline-block;font-size:9px;font-weight:900;padding:3px 9px;border-radius:99px}}
  .pill.ok{{background:#dcf4e8;color:#087348}}
  .pill.warn{{background:#fff0d5;color:#9e5a00}}
  .pill.bad{{background:#ffe7e5;color:#a32e29}}
  .pill.info{{background:#e2f2fa;color:#17668b}}
  .pill.gray{{background:#e9eef1;color:#53626e}}
  .callout{{border-left:4px solid var(--amber);background:#fff8ec;border-radius:0 10px 10px 0;padding:12px 15px;font-size:11.5px;color:#5a4408;margin-top:12px;line-height:1.5}}
  .callout b{{color:#7a5b00}}
  .callout.dark{{background:#102638;color:#fff;border-left-color:var(--amber2)}}
  .callout.dark b{{color:var(--amber2)}}
  .insightGrid{{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:8px}}
  .insightBox{{border:1px solid var(--line);border-radius:12px;padding:14px 16px;background:#fff}}
  .insightBox h4{{font-size:12.5px;color:var(--navy);margin-bottom:8px;display:flex;align-items:center;gap:8px}}
  .insightBox ul{{margin:0 0 0 16px;font-size:11px;line-height:1.6;color:#334654}}
  .insightBox ul li{{margin-bottom:4px}}
  .nav{{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:rgba(16,38,56,.92);backdrop-filter:blur(8px);color:#fff;border-radius:99px;padding:8px 12px;display:flex;align-items:center;gap:10px;z-index:100;box-shadow:0 8px 24px rgba(0,0,0,.4)}}
  .nav button{{background:#ffffff18;border:0;color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:15px;font-weight:800;display:grid;place-items:center;transition:.15s}}
  .nav button:hover{{background:var(--amber);color:var(--navy)}}
  .nav .counter{{font-size:11px;font-weight:800;padding:0 8px;letter-spacing:.05em}}
  .nav .progress{{width:130px;height:4px;background:#ffffff22;border-radius:99px;overflow:hidden}}
  .nav .progress div{{height:100%;background:var(--amber);transition:width .3s}}
  @media print{{@page{{size:A4 landscape;margin:8mm}}body{{overflow:visible;background:#fff;height:auto}}.deck{{height:auto;overflow:visible}}.slide{{position:relative;opacity:1;visibility:visible;transform:none;page-break-after:always;height:auto;min-height:100vh;padding:30px 40px}}.nav{{display:none}}}}
  @media(max-width:900px){{.slide{{padding:30px 24px}}.slideHead h2{{font-size:22px}}.kpiGrid,.chartGrid,.chartGrid3,.insightGrid{{grid-template-columns:1fr}}.cover-slide{{padding:40px 30px}}.cover-slide h1{{font-size:30px}}.cover-slide .meta{{grid-template-columns:1fr 1fr;gap:16px}}}}
</style>
</head>
<body>
<div class="deck" id="deck">

  <!-- SLIDE 1 — COVER -->
  <section class="slide cover-slide active">
    <div class="badge">{metrics['periode_label']}</div>
    <div class="logo">CPA</div>
    <h1>Analisis Delivery Order<br>& Kinerja Pengiriman</h1>
    <div class="sub">PT Cahaya Pengajaran Abadi · Divisi Supply Chain & Logistik</div>
    <div class="meta">
      <div><b>TOTAL DO</b>{format_number_id(metrics['total_rows'])} dokumen</div>
      <div><b>VOLUME</b>{format_volume_short(metrics['total_volume'])}</div>
      <div><b>KEMASAN</b>{format_number_id(metrics['total_kemasan'])} unit</div>
      <div><b>CUSTOMER</b>~{format_number_id(metrics['unique_customers'])} unik</div>
    </div>
  </section>

  <!-- SLIDE 2 — EXECUTIVE SUMMARY -->
  <section class="slide">
    <div class="slideBar"></div>
    <div class="slideHead">
      <div class="brand">01</div>
      <div><h2>Executive Summary</h2><p>Ringkasan performa Delivery Order ({format_number_id(metrics['total_rows'])} DO)</p></div>
      <div class="num">2 / 8</div>
    </div>
    <div class="kpiGrid">
      <div class="kpi"><small>Total DO</small><b>{format_number_id(metrics['total_rows'])}</b><span>dokumen dibuat</span></div>
      <div class="kpi ok"><small>Invoice</small><b>{format_number_id(inv_cnt)}</b><span>{inv_pct}% dari total DO</span></div>
      <div class="kpi warn"><small>Send (Kirim)</small><b>{format_number_id(send_cnt)}</b><span>{send_pct}% masih dalam proses</span></div>
      <div class="kpi bad"><small>Return</small><b>{format_number_id(ret_cnt)}</b><span>{ret_pct}% pengembalian</span></div>
      <div class="kpi"><small>Total Volume</small><b>{format_volume_short(metrics['total_volume'])}</b><span>≈ {format_number_id(metrics['total_volume'] / metrics['total_rows'] if metrics['total_rows'] else 0)} L/DO</span></div>
      <div class="kpi"><small>Total Kemasan</small><b>{format_number_id(metrics['total_kemasan'])}</b><span>unit kemasan</span></div>
      <div class="kpi amber"><small>Cancel</small><b>{format_number_id(metrics['can_stat']['count'])}</b><span>{metrics['can_stat']['pct_count']}% dibatalkan</span></div>
      <div class="kpi"><small>Received</small><b>{format_number_id(metrics['rec_stat']['count'])}</b><span>{metrics['rec_stat']['pct_count']}% terkonfirmasi</span></div>
    </div>
    <div class="callout">
      {exec_summary_callout}
    </div>
  </section>

  <!-- SLIDE 3 — STATUS DO -->
  <section class="slide">
    <div class="slideBar"></div>
    <div class="slideHead">
      <div class="brand">02</div>
      <div><h2>Distribusi Status Delivery Order</h2><p>Breakdown status dari {format_number_id(metrics['total_rows'])} DO yang diterbitkan</p></div>
      <div class="num">3 / 8</div>
    </div>
    <div class="chartGrid">
      <div class="chartBox"><h4>Proporsi Status DO</h4><div class="cap">Distribusi persentase status dokumen</div><div id="chartStatus" class="c3"></div></div>
      <div class="chartBox"><h4>Volume per Status</h4><div class="cap">Total liter berdasarkan status dokumen</div><div id="chartVolumeStatus" class="c3"></div></div>
    </div>
    <table style="margin-top:14px">
      <thead><tr><th>Status</th><th class="num">Jumlah DO</th><th class="num">% DO</th><th class="num">Volume (L)</th><th class="num">% Volume</th><th class="num">Rata-rata/DO</th></tr></thead>
      <tbody id="statusTable"></tbody>
    </table>
    <div class="callout">
      <b>Insight:</b> Status <b>Invoice ({inv_pct}%)</b> mencerminkan kelancaran proses serah terima dan billing. Status <b>"Send" ({send_pct}%)</b> membawa volume sebesar <b>{send_vol}</b> yang berpotensi menjadi <b>risiko piutang tertunda</b> bila tidak segera difollow-up ke receive. <b>Return ({ret_pct}%)</b> membutuhkan investigasi bersama pihak operasional dan gudang pengirim.
    </div>
  </section>

  <!-- SLIDE 4 — TREN BULANAN -->
  <section class="slide">
    <div class="slideBar"></div>
    <div class="slideHead">
      <div class="brand">03</div>
      <div><h2>Tren Bulanan Delivery Order</h2><p>Aktivitas DO & Volume per bulan ({metrics['periode_short']})</p></div>
      <div class="num">4 / 8</div>
    </div>
    <div class="chartBox" style="margin-bottom:14px">
      <h4>Jumlah DO & Volume per Bulan</h4>
      <div class="cap">Jumlah DO (bar biru) dan total volume liter (line oranye)</div>
      <div id="chartMonthly" class="c3"></div>
    </div>
    <div class="chartGrid3">
      <div class="chartBox"><h4>Rata-rata Volume/DO</h4><div class="cap">Liter / DO per bulan</div><div id="chartAvgVol" class="c3"></div></div>
      <div class="chartBox"><h4>Distribusi Invoice</h4><div class="cap">% DO menjadi invoice per bulan</div><div id="chartInvRate" class="c3"></div></div>
      <div class="chartBox"><h4>Distribusi Return</h4><div class="cap">% DO return per bulan</div><div id="chartRetRate" class="c3"></div></div>
    </div>
    <div class="callout">
      <b>Insight Tren:</b> Pola distribusi menunjukkan variasi volume dan frekuensi pengiriman antar bulan. Konsistensi rasio invoice per bulan menjadi indikator utama efisiensi penagihan divisi logistik dan keuangan.
    </div>
  </section>

  <!-- SLIDE 5 — GUDANG -->
  <section class="slide">
    <div class="slideBar"></div>
    <div class="slideHead">
      <div class="brand">04</div>
      <div><h2>Analisis Gudang Asal</h2><p>Distribusi DO dan volume berdasarkan gudang asal pengiriman</p></div>
      <div class="num">5 / 8</div>
    </div>
    <div class="chartGrid">
      <div class="chartBox"><h4>Top Gudang — Jumlah DO</h4><div class="cap">Gudang dengan kontribusi DO terbanyak</div><div id="chartGudangDO" class="c3" style="height:360px"></div></div>
      <div class="chartBox"><h4>Top Gudang — Volume</h4><div class="cap">Gudang dengan kontribusi volume terbesar (Liter)</div><div id="chartGudangVol" class="c3" style="height:360px"></div></div>
    </div>
    <div class="callout">
      <b>Konsentrasi Logistik:</b> Gudang utama dan konsinyasi memegang peran krusial dalam penyaluran produk. Gudang <b>{metrics['top_gudang_vol_name']}</b> menyumbangkan volume tertinggi, memerlukan pengawasan kapasitas dan kelancaran armada transportasi.
    </div>
  </section>

  <!-- SLIDE 6 — TOP CUSTOMER -->
  <section class="slide">
    <div class="slideBar"></div>
    <div class="slideHead">
      <div class="brand">05</div>
      <div><h2>Top Customer</h2><p>Customer dengan kontribusi volume dan frekuensi DO terbesar</p></div>
      <div class="num">6 / 8</div>
    </div>
    <div class="chartGrid">
      <div class="chartBox"><h4>Top Customer — Volume (Liter)</h4><div class="cap">Customer dengan volume pengiriman terbesar</div><div id="chartCustVol" class="c3" style="height:360px"></div></div>
      <div class="chartBox"><h4>Top Customer — Jumlah DO</h4><div class="cap">Customer dengan frekuensi DO terbanyak</div><div id="chartCustDO" class="c3" style="height:360px"></div></div>
    </div>
    <table style="margin-top:14px">
      <thead><tr><th>Customer</th><th class="num">Jumlah DO</th><th class="num">Volume (L)</th><th class="num">% Volume</th></tr></thead>
      <tbody id="custTable"></tbody>
    </table>
  </section>

  <!-- SLIDE 7 — LEAD TIME & RISIKO -->
  <section class="slide">
    <div class="slideBar"></div>
    <div class="slideHead">
      <div class="brand">06</div>
      <div><h2>Lead Time & Risiko Operasional</h2><p>Durasi DO → Invoice, durasi Return vs Receive, dan mitigasi risiko operasional</p></div>
      <div class="num">7 / 8</div>
    </div>
    <div class="chartGrid3">
      <div class="chartBox"><h4>Distribusi Lead Time DO → Invoice</h4><div class="cap">Durasi hingga invoice terbit</div><div id="chartLeadInvoice" class="c3"></div></div>
      <div class="chartBox"><h4>Distribusi Return vs Receive</h4><div class="cap">Selisih hari antara return & receive</div><div id="chartReturnDelta" class="c3"></div></div>
      <div class="chartBox"><h4>Cancel Rate per Bulan</h4><div class="cap">% DO dibatalkan</div><div id="chartCancelRate" class="c3"></div></div>
    </div>
    <div class="insightGrid" style="margin-top:14px">
      <div class="insightBox">
        <h4>⏱️ Temuan Lead Time</h4>
        <ul id="leadFindings">
          {lead_findings_html}
        </ul>
      </div>
      <div class="insightBox">
        <h4>⚠️ Risiko Utama & Mitigasi</h4>
        <ul>
          <li><b>{format_number_id(send_cnt)} DO 'Send' belum ada receive date</b> → aktifkan automated notification H+3 pengiriman.</li>
          <li><b>Return rate {ret_pct}%</b> → audit penyebab retur barang per gudang konsinyasi vs customer retail.</li>
          <li><b>Lead time invoice &gt; 7 hari</b> → tetapkan SLA penerbitan invoice maksimal 3 hari kerja setelah barang diterima.</li>
          <li><b>Validasi DO vs Invoice terbalik</b> → cegah input tanggal mundur tanpa approval manajer logistik.</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- SLIDE 8 — KESIMPULAN -->
  <section class="slide">
    <div class="slideBar"></div>
    <div class="slideHead">
      <div class="brand">07</div>
      <div><h2>Kesimpulan & Rekomendasi</h2><p>Langkah tindak lanjut prioritas manajemen operasional</p></div>
      <div class="num">8 / 8</div>
    </div>
    <div class="insightGrid" style="grid-template-columns:1fr 1fr 1fr">
      <div class="insightBox">
        <h4>🎯 Prioritas Tinggi</h4>
        <ul>
          <li><b>Follow-up {format_number_id(send_cnt)} DO 'Send'</b> agar segera dikonfirmasi receive & siap invoicing.</li>
          <li>Investigasi mendalam <b>{format_number_id(ret_cnt)} DO Return ({ret_pct}%)</b> untuk mencegah recurring loss.</li>
          <li>Sinkronisasi data <b>{format_number_id(metrics['negative_lead_count'])} DO</b> yang mendahului invoice.</li>
        </ul>
      </div>
      <div class="insightBox">
        <h4>⚙️ Prioritas Menengah</h4>
        <ul>
          <li>Standarisasi SLA: DO → Receive &le; 2 hari dan DO → Invoice &le; 3 hari.</li>
          <li>Dashboard alert harian untuk status 'Send' yang berumur &gt; 5 hari kerja.</li>
          <li>Review kapasitas armada dan ritase di gudang konsinyasi dengan volume tinggi.</li>
        </ul>
      </div>
      <div class="insightBox">
        <h4>🔄 Perbaikan Proses</h4>
        <ul>
          <li>Integrasi POD (Proof of Delivery) digital via mobile app driver/ekspedisi.</li>
          <li>Konsolidasi pesanan customer volume besar untuk penghematan biaya logistik.</li>
          <li>Pelatihan berkala staf admin logistik untuk kedisiplinan input status real-time.</li>
        </ul>
      </div>
    </div>
    <div class="callout dark" style="margin-top:18px">
      <b>Target periode berikutnya:</b> Invoice rate &ge; 75% · Return rate &le; 8% · Cancel rate &le; 2% · Zero DO 'Send' &gt; 7 hari tanpa kejelasan status.
    </div>
    <div style="margin-top:auto;text-align:center;padding:20px 0 4px;font-size:11px;color:var(--muted)">
      Dokumen ini disusun oleh Divisi Supply Chain & Logistik · PT Cahaya Pengajaran Abadi<br>
      Sumber data: {metrics['filename']} · <b>Analisis penuh {format_number_id(metrics['total_rows'])} baris</b>
    </div>
  </section>

</div>

<div class="nav">
  <button id="prevBtn" title="Sebelumnya (←)">‹</button>
  <div class="counter"><span id="curSlide">1</span> / <span id="totalSlide">8</span></div>
  <div class="progress"><div id="progressBar" style="width:12.5%"></div></div>
  <button id="nextBtn" title="Berikutnya (→)">›</button>
  <button id="fullBtn" title="Fullscreen (F)" style="font-size:12px">⛶</button>
  <button id="printBtn" title="Cetak" style="font-size:12px">⎙</button>
</div>

<script>
/* ============================================================
   DATA AKTUAL — Dihitung penuh dari {metrics['total_rows']} baris Excel
   Sumber file: {metrics['filename']}
   ============================================================ */

const DATA = {json_data_str};

/* RENDER TABEL STATUS */
document.getElementById('statusTable').innerHTML = DATA.status.map(s=>`
  <tr>
    <td><span class="pill ${{s.pill}}">${{s.label}}</span></td>
    <td class="num">${{s.count.toLocaleString('id-ID')}}</td>
    <td class="num">${{(DATA.total ? (s.count/DATA.total*100).toFixed(1) : 0)}}%</td>
    <td class="num">${{s.volume.toLocaleString('id-ID')}}</td>
    <td class="num">${{(DATA.totalVolume ? (s.volume/DATA.totalVolume*100).toFixed(1) : 0)}}%</td>
    <td class="num">${{s.count?Math.round(s.volume/s.count).toLocaleString('id-ID'):0}}</td>
  </tr>`).join('');

/* RENDER TOP CUSTOMER TABLE */
const topCust = [...DATA.customer].sort((a,b)=>b.volume-a.volume).slice(0,10);
document.getElementById('custTable').innerHTML = topCust.map(c=>`
  <tr>
    <td><b>${{c.name}}</b></td>
    <td class="num">${{c.count}}</td>
    <td class="num">${{c.volume.toLocaleString('id-ID')}}</td>
    <td class="num">${{(DATA.totalVolume ? (c.volume/DATA.totalVolume*100).toFixed(1) : 0)}}%</td>
  </tr>`).join('');

/* C3 CHARTS */
const C = {{ navy:'#102638', amber:'#f5a000', blue:'#21769f', ok:'#148354', warn:'#c87900', bad:'#c63d38', gray:'#687785' }};

// 1. Status Donut
if(DATA.status && DATA.status.length > 0) {{
  c3.generate({{
    bindto:'#chartStatus',
    data:{{
      columns: DATA.status.map(s=>[s.label, s.count]),
      type:'donut',
      colors: Object.fromEntries(DATA.status.map(s=>[s.label, s.color])),
      order: null
    }},
    donut:{{ title: DATA.total.toLocaleString('id-ID') + ' DO', width:50, label:{{ format:(v)=>v }} }},
    legend:{{ position:'right' }},
    padding:{{ right:10 }},
    size:{{ height:240 }}
  }});

  // 2. Volume per status
  c3.generate({{
    bindto:'#chartVolumeStatus',
    data:{{
      columns: DATA.status.map(s=>[s.label, s.volume]),
      type:'bar',
      colors: Object.fromEntries(DATA.status.map(s=>[s.label, s.color]))
    }},
    bar:{{ width:{{ ratio:.55 }} }},
    axis:{{ y:{{ tick:{{ format:v=>v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'rb':v }} }}, x:{{ type:'category' }} }},
    legend:{{ show:false }},
    size:{{ height:240 }}
  }});
}}

// 3. Monthly trend
if(DATA.monthly && DATA.monthly.length > 0) {{
  c3.generate({{
    bindto:'#chartMonthly',
    data:{{
      x:'x',
      columns:[
        ['x', ...DATA.monthly.map(m=>m.month.split(' ')[0])],
        ['Jumlah DO', ...DATA.monthly.map(m=>m.count)],
        ['Volume (L)', ...DATA.monthly.map(m=>m.volume)]
      ],
      types:{{ 'Jumlah DO':'bar', 'Volume (L)':'spline' }},
      colors:{{ 'Jumlah DO':C.blue, 'Volume (L)':C.amber }},
      axes:{{ 'Volume (L)':'y2' }}
    }},
    axis:{{
      x:{{ type:'category' }},
      y:{{ label:{{ text:'Jumlah DO', position:'outer-middle' }} }},
      y2:{{ show:true, label:{{ text:'Volume (L)', position:'outer-middle' }}, tick:{{ format:v=>v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'rb':v }} }}
    }},
    bar:{{ width:{{ ratio:.5 }} }},
    size:{{ height:230 }}
  }});

  // 4. Avg volume per month
  c3.generate({{
    bindto:'#chartAvgVol',
    data:{{
      x:'x',
      columns:[
        ['x', ...DATA.monthly.map(m=>m.month.split(' ')[0])],
        ['Rata-rata L/DO', ...DATA.monthly.map(m=>m.avg_vol || (m.count ? Math.round(m.volume/m.count) : 0))]
      ],
      type:'bar',
      colors:{{ 'Rata-rata L/DO':C.navy }}
    }},
    axis:{{ x:{{ type:'category' }}, y:{{ tick:{{ format:v=>v>=1000?(v/1000).toFixed(1)+'rb':v }} }} }},
    legend:{{ show:false }},
    size:{{ height:180 }}
  }});

  // 5. Invoice rate per month
  c3.generate({{
    bindto:'#chartInvRate',
    data:{{
      x:'x',
      columns:[
        ['x', ...DATA.monthly.map(m=>m.month.split(' ')[0])],
        ['Invoice Rate %', ...DATA.monthly.map(m=>+(m.inv_rate ?? (m.count ? (m.invoice/m.count*100).toFixed(1) : 0)))]
      ],
      type:'bar',
      colors:{{ 'Invoice Rate %':C.ok }}
    }},
    axis:{{ x:{{ type:'category' }}, y:{{ max:100, tick:{{ format:v=>v+'%' }} }} }},
    legend:{{ show:false }},
    size:{{ height:180 }}
  }});

  // 6. Return rate per month
  c3.generate({{
    bindto:'#chartRetRate',
    data:{{
      x:'x',
      columns:[
        ['x', ...DATA.monthly.map(m=>m.month.split(' ')[0])],
        ['Return Rate %', ...DATA.monthly.map(m=>+(m.ret_rate ?? (m.count ? (m.ret/m.count*100).toFixed(1) : 0)))]
      ],
      type:'bar',
      colors:{{ 'Return Rate %':C.bad }}
    }},
    axis:{{ x:{{ type:'category' }}, y:{{ tick:{{ format:v=>v+'%' }} }} }},
    legend:{{ show:false }},
    size:{{ height:180 }}
  }});
}}

// 7. Gudang DO count
if(DATA.gudang && DATA.gudang.length > 0) {{
  const topGudangDO = [...DATA.gudang].sort((a,b)=>b.count-a.count).slice(0,12);
  c3.generate({{
    bindto:'#chartGudangDO',
    data:{{ columns:[['Jumlah DO', ...topGudangDO.map(g=>g.count)]], type:'bar', colors:{{ 'Jumlah DO':C.blue }} }},
    axis:{{ rotated:true, x:{{ type:'category', categories:topGudangDO.map(g=>g.name.length>22?g.name.slice(0,20)+'…':g.name) }} }},
    bar:{{ width:{{ ratio:.6 }} }}, legend:{{ show:false }}, size:{{ height:360 }}
  }});

  // 8. Gudang Volume
  const topGudangVol = [...DATA.gudang].sort((a,b)=>b.volume-a.volume).slice(0,12);
  c3.generate({{
    bindto:'#chartGudangVol',
    data:{{ columns:[['Volume (L)', ...topGudangVol.map(g=>g.volume)]], type:'bar', colors:{{ 'Volume (L)':C.amber }} }},
    axis:{{ rotated:true, x:{{ type:'category', categories:topGudangVol.map(g=>g.name.length>22?g.name.slice(0,20)+'…':g.name) }}, y:{{ tick:{{ format:v=>v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'rb':v }} }} }},
    bar:{{ width:{{ ratio:.6 }} }}, legend:{{ show:false }}, size:{{ height:360 }}
  }});
}}

// 9. Customer volume
if(DATA.customer && DATA.customer.length > 0) {{
  const topCustVol = [...DATA.customer].sort((a,b)=>b.volume-a.volume).slice(0,10);
  c3.generate({{
    bindto:'#chartCustVol',
    data:{{ columns:[['Volume', ...topCustVol.map(c=>c.volume)]], type:'bar', colors:{{ 'Volume':C.ok }} }},
    axis:{{ rotated:true, x:{{ type:'category', categories:topCustVol.map(c=>c.name.length>20?c.name.slice(0,18)+'…':c.name) }}, y:{{ tick:{{ format:v=>v>=1000?(v/1000).toFixed(0)+'rb':v }} }} }},
    bar:{{ width:{{ ratio:.6 }} }}, legend:{{ show:false }}, size:{{ height:360 }}
  }});

  // 10. Customer DO count
  const topCustDO = [...DATA.customer].sort((a,b)=>b.count-a.count).slice(0,10);
  c3.generate({{
    bindto:'#chartCustDO',
    data:{{ columns:[['Jumlah DO', ...topCustDO.map(c=>c.count)]], type:'bar', colors:{{ 'Jumlah DO':C.navy }} }},
    axis:{{ rotated:true, x:{{ type:'category', categories:topCustDO.map(c=>c.name.length>20?c.name.slice(0,18)+'…':c.name) }} }},
    bar:{{ width:{{ ratio:.6 }} }}, legend:{{ show:false }}, size:{{ height:360 }}
  }});
}}

// 11. Lead invoice distribution
if(DATA.leadInvoice && DATA.leadInvoice.length > 0) {{
  c3.generate({{
    bindto:'#chartLeadInvoice',
    data:{{ columns:[['Jumlah DO', ...DATA.leadInvoice.map(x=>x.count)]], type:'bar', colors:{{ 'Jumlah DO':C.amber }} }},
    axis:{{ x:{{ type:'category', categories:DATA.leadInvoice.map(x=>x.label) }}, y:{{ tick:{{ format:v=>v }} }} }},
    bar:{{ width:{{ ratio:.6 }} }}, legend:{{ show:false }}, size:{{ height:200 }}
  }});
}}

// 12. Return delta
if(DATA.returnDelta && DATA.returnDelta.length > 0) {{
  c3.generate({{
    bindto:'#chartReturnDelta',
    data:{{ columns:[['Jumlah', ...DATA.returnDelta.map(x=>x.count)]], type:'bar', colors:{{ 'Jumlah':C.bad }} }},
    axis:{{ x:{{ type:'category', categories:DATA.returnDelta.map(x=>x.label) }} }},
    bar:{{ width:{{ ratio:.6 }} }}, legend:{{ show:false }}, size:{{ height:200 }}
  }});
}}

// 13. Cancel rate per month
if(DATA.cancelPerMonth && DATA.cancelPerMonth.length > 0) {{
  c3.generate({{
    bindto:'#chartCancelRate',
    data:{{
      x:'x',
      columns:[
        ['x', ...DATA.cancelPerMonth.map(m=>m.month)],
        ['Cancel %', ...DATA.cancelPerMonth.map(m=>m.rate)]
      ],
      type:'bar',
      colors:{{ 'Cancel %':C.gray }}
    }},
    axis:{{ x:{{ type:'category' }}, y:{{ tick:{{ format:v=>v+'%' }} }} }},
    legend:{{ show:false }},
    size:{{ height:200 }}
  }});
}}

/* NAVIGASI SLIDE */
const slides = document.querySelectorAll('.slide');
const totalSlides = slides.length;
let current = 0;
document.getElementById('totalSlide').textContent = totalSlides;

function goTo(idx){{
  if(idx < 0 || idx >= totalSlides) return;
  slides[current].classList.remove('active');
  current = idx;
  slides[current].classList.add('active');
  document.getElementById('curSlide').textContent = current + 1;
  document.getElementById('progressBar').style.width = ((current+1)/totalSlides*100) + '%';
}}

document.getElementById('prevBtn').onclick = ()=>goTo(current - 1);
document.getElementById('nextBtn').onclick = ()=>goTo(current + 1);
document.getElementById('fullBtn').onclick = ()=>{{ if(!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }};
document.getElementById('printBtn').onclick = ()=>window.print();

document.addEventListener('keydown', e=>{{
  if(e.key === 'ArrowRight' || e.key === ' '){{ e.preventDefault(); goTo(current + 1); }}
  if(e.key === 'ArrowLeft'){{ e.preventDefault(); goTo(current - 1); }}
  if(e.key === 'f' || e.key === 'F'){{ document.getElementById('fullBtn').click(); }}
  if(e.key === 'Home'){{ goTo(0); }}
  if(e.key === 'End'){{ goTo(totalSlides - 1); }}
}});

let touchStartX = 0;
document.addEventListener('touchstart', e=>{{ touchStartX = e.touches[0].clientX; }});
document.addEventListener('touchend', e=>{{
  const dx = e.changedTouches[0].clientX - touchStartX;
  if(Math.abs(dx) > 60){{ if(dx < 0) goTo(current + 1); else goTo(current - 1); }}
}});
</script>
</body>
</html>"""

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        download_url = f"/api/v1/ai/reports/download/{filename}"
        return filename, file_path, download_url

    def generate_chat_markdown_reply(
        self,
        metrics: Dict[str, Any],
        html_filename: str,
        html_download_url: str,
        user: MCPUser
    ) -> str:
        """
        Creates an executive markdown response in chat with KPI table,
        insights, and clickable action pills to open the interactive slide deck.
        """
        tot_do = format_number_id(metrics["total_rows"])
        tot_vol = format_volume_short(metrics["total_volume"])
        tot_kemasan = format_number_id(metrics["total_kemasan"])
        unique_cust = format_number_id(metrics["unique_customers"])

        inv_cnt = format_number_id(metrics["inv_stat"]["count"])
        inv_pct = metrics["inv_stat"]["pct_count"]
        send_cnt = format_number_id(metrics["send_stat"]["count"])
        send_pct = metrics["send_stat"]["pct_count"]
        send_vol = format_volume_short(metrics["send_stat"]["volume"])
        ret_cnt = format_number_id(metrics["ret_stat"]["count"])
        ret_pct = metrics["ret_stat"]["pct_count"]
        ret_vol = format_volume_short(metrics["ret_stat"]["volume"])

        lines = [
            f"## 📊 Recap Analisis Delivery Order (DO) & Kinerja Pengiriman",
            f"**PT Cahaya Pengajaran Abadi · Divisi Supply Chain & Logistik**",
            f"*{metrics['periode_label']}* | Sumber Data: `{metrics['filename']}` ({tot_do} dokumen)\n",
            f"---",
            f"### 🖥️ Presentasi Interaktif Telah Dibuat",
            f"Laporan recap lengkap telah selesai diproses dan disusun ke dalam template presentasi 8 slide interaktif resmi PT CPA:\n",
            f"👉 **[Buka Presentasi Interaktif Deck ({html_filename})]({html_download_url})** *(Klik untuk membuka presentasi fullscreen & cetak PDF)*\n",
            f"---\n",
            f"### 📌 Ringkasan Eksekutif Key Performance Indicators (KPI):",
            f"| Metrik Utama | Nilai Aktual | Keterangan & Rasio |",
            f"|---|---|---|",
            f"| **Total Delivery Order (DO)** | **{tot_do}** dokumen | 100% data terverifikasi |",
            f"| **Total Volume Pengiriman** | **{tot_vol}** ({format_number_id(metrics['total_volume'])} L) | Rata-rata: {format_number_id(metrics['total_volume'] / metrics['total_rows'] if metrics['total_rows'] else 0)} L/DO |",
            f"| **Total Unit Kemasan** | **{tot_kemasan}** unit | Drum / Pail / IBC |",
            f"| **Pelanggan Aktif** | **{unique_cust}** customer | Cakupan wilayah operasional |\n",
            f"### 🚦 Breakdown Distribusi Status DO:",
            f"| Status Dokumen | Jumlah DO | % Kontribusi | Total Volume (L) | Catatan Operasional |",
            f"|---|---|---|---|---|",
        ]

        for s in metrics["status_records"][:6]:
            pct_do = (s["count"] / metrics["total_rows"] * 100) if metrics["total_rows"] else 0
            lines.append(f"| **{s['label']}** | {format_number_id(s['count'])} | {pct_do:.1f}% | {format_number_id(s['volume'])} L | {s['pill'].upper()} status |")

        lines.extend([
            f"\n### ⏱️ Temuan Lead Time & Risiko Operasional:",
            f"- **Kecepatan Invoicing:** **{format_number_id(metrics['sameday_lead_count'])} DO** terbit invoice di hari yang sama (*Same-Day Invoice*).",
            f"- **DO Tertunda (Send):** **{send_cnt} DO ({send_pct}%)** membawa volume **{send_vol}** belum ada konfirmasi penerimaan (*Pending Billing Risk*).",
            f"- **Return Rate:** **{ret_cnt} DO ({ret_pct}%)** dengan volume **{ret_vol}** perlu investigasi bersama kepala gudang dan driver.",
            f"- **Validasi Data:** Terdapat **{format_number_id(metrics['negative_lead_count'])} DO** dengan tanggal invoice sebelum DO diterbitkan yang perlu disinkronkan.\n",
            f"### 🏆 Top Customer & Gudang Pengirim:",
            f"- **Gudang Kontributor Utama:** `{metrics['top_gudang_vol_name']}` memimpin volume distribusi.",
            f"- **Pelanggan Volume Terbesar:** `{metrics['top_cust_vol_name']}`.",
            f"\n---\n",
            f"### 📥 Akses & Unduhan Dokumen:",
            f"- 🖥️ **[Buka Presentasi Interaktif Deck (Full Slide)]({html_download_url})**",
            f"- 📥 **[Unduh File Presentasi HTML]({html_download_url})**"
        ])

        return "\n".join(lines)


# Singleton
do_presentation_generator = DeliveryOrderPresentationGenerator()

