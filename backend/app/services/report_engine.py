"""
PADI ERP / CPA Analytics — Report Engine
========================================
Generates corporate Excel (.xlsx) and PDF (.pdf) reports directly from
PADI MCP structured data WITHOUT utilizing LLMs (token_used = 0).
"""

import os
import time
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass

from app.mcp.auth import MCPUser


REPORTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "static", "reports")
)
os.makedirs(REPORTS_DIR, exist_ok=True)


@dataclass
class ReportResult:
    """Outcome of a Report Engine generation task."""
    success: bool
    filename: str
    file_path: str
    download_url: str
    file_format: str  # "excel" or "pdf"
    title: str
    row_count: int
    markdown_summary: str
    token_used: int = 0
    error_message: Optional[str] = None


class ReportEngine:
    """Python Report Engine for generating Excel and PDF reports from MCP data."""

    def __init__(self, output_dir: str = REPORTS_DIR):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def generate(
        self,
        export_format: str,
        tool_name: str,
        mcp_data: Any,
        user: MCPUser,
        custom_title: Optional[str] = None
    ) -> ReportResult:
        """Main dispatcher for Excel and PDF reporting."""
        fmt = (export_format or "excel").lower()
        if "pdf" in fmt:
            return self.generate_pdf(tool_name, mcp_data, user, custom_title)
        else:
            return self.generate_excel(tool_name, mcp_data, user, custom_title)

    # ─── 1. Excel Generation (.xlsx) ──────────────────────────────────────────

    def generate_excel(
        self,
        tool_name: str,
        mcp_data: Any,
        user: MCPUser,
        custom_title: Optional[str] = None
    ) -> ReportResult:
        """Builds a formatted Excel spreadsheet using openpyxl."""
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter

        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_tool = tool_name.replace("get_", "").replace("_", "-")
        filename = f"padi_{safe_tool}_{timestamp_str}.xlsx"
        file_path = os.path.join(self.output_dir, filename)

        title = custom_title or self._resolve_report_title(tool_name)
        headers, rows = self._extract_tabular_data(tool_name, mcp_data)

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Laporan Operasional"
        ws.views.sheetView[0].showGridLines = True

        # Styles
        brand_fill = PatternFill(start_color="0D99FF", end_color="0D99FF", fill_type="solid")
        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        alt_row_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        title_font = Font(name="Segoe UI", size=14, bold=True, color="FFFFFF")
        meta_font = Font(name="Segoe UI", size=9, italic=True, color="64748B")
        header_font = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
        data_font = Font(name="Segoe UI", size=9, color="0F172A")

        thin_border = Border(
            left=Side(style="thin", color="E2E8F0"),
            right=Side(style="thin", color="E2E8F0"),
            top=Side(style="thin", color="E2E8F0"),
            bottom=Side(style="thin", color="E2E8F0"),
        )

        # Title Banner
        ws.merge_cells("A1:F2")
        title_cell = ws["A1"]
        title_cell.value = f"PADI ERP — {title.upper()}"
        title_cell.fill = brand_fill
        title_cell.font = title_font
        title_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)

        # Metadata Row
        ws["A3"] = f"Dicetak oleh: {user.username} (Role: {user.role}) | Tanggal: {datetime.now().strftime('%d %B %Y %H:%M:%S')} | Source: PADI MCP Server"
        ws["A3"].font = meta_font
        ws.row_dimensions[3].height = 18

        # Headers Row
        start_row = 5
        ws.row_dimensions[start_row].height = 24
        for col_idx, h in enumerate(headers, 1):
            cell = ws.cell(row=start_row, column=col_idx, value=h)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border

        # Data Rows
        current_row = start_row + 1
        for r_idx, row_data in enumerate(rows):
            ws.row_dimensions[current_row].height = 20
            use_alt = (r_idx % 2 == 1)
            for c_idx, val in enumerate(row_data, 1):
                cell = ws.cell(row=current_row, column=c_idx, value=val)
                cell.font = data_font
                cell.border = thin_border
                if use_alt:
                    cell.fill = alt_row_fill

                # Format numbers / currency
                if isinstance(val, (int, float)):
                    if "omzet" in headers[c_idx - 1].lower() or "nilai" in headers[c_idx - 1].lower() or "rp" in headers[c_idx - 1].lower() or "total" in headers[c_idx - 1].lower():
                        cell.number_format = '"Rp "#,##0'
                    else:
                        cell.number_format = '#,##0'
                    cell.alignment = Alignment(horizontal="right", vertical="center")
                else:
                    cell.alignment = Alignment(horizontal="left", vertical="center")
            current_row += 1

        # Auto-adjust column widths
        for col in ws.columns:
            max_len = 0
            col_letter = get_column_letter(col[0].column)
            for cell in col:
                if cell.row >= start_row and cell.value:
                    max_len = max(max_len, len(str(cell.value)))
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

        wb.save(file_path)

        download_url = f"/api/v1/ai/reports/download/{filename}"
        md_summary = self._generate_markdown_summary(title, filename, download_url, "Excel", headers, rows)

        return ReportResult(
            success=True,
            filename=filename,
            file_path=file_path,
            download_url=download_url,
            file_format="excel",
            title=title,
            row_count=len(rows),
            markdown_summary=md_summary,
            token_used=0
        )

    # ─── 2. PDF Generation (.pdf) ─────────────────────────────────────────────

    def generate_pdf(
        self,
        tool_name: str,
        mcp_data: Any,
        user: MCPUser,
        custom_title: Optional[str] = None
    ) -> ReportResult:
        """Builds a formatted corporate PDF report using reportlab."""
        from reportlab.lib.pagesizes import letter, landscape
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_tool = tool_name.replace("get_", "").replace("_", "-")
        filename = f"padi_{safe_tool}_{timestamp_str}.pdf"
        file_path = os.path.join(self.output_dir, filename)

        title = custom_title or self._resolve_report_title(tool_name)
        headers, rows = self._extract_tabular_data(tool_name, mcp_data)

        # Create landscape document
        doc = SimpleDocTemplate(
            file_path,
            pagesize=landscape(letter),
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "PadiTitle",
            parent=styles["Heading1"],
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#0D99FF")
        )
        meta_style = ParagraphStyle(
            "PadiMeta",
            parent=styles["Normal"],
            fontSize=8,
            textColor=colors.HexColor("#64748B")
        )

        elements = []
        elements.append(Paragraph(f"<b>PADI ERP & WAREHOUSE — {title.upper()}</b>", title_style))
        elements.append(Paragraph(
            f"Dicetak oleh: <b>{user.username}</b> (Role: {user.role}) | "
            f"Waktu: {datetime.now().strftime('%d %B %Y %H:%M:%S')} | Source: PADI MCP Server",
            meta_style
        ))
        elements.append(Spacer(1, 14))

        # Format rows for table cells
        table_data = [[Paragraph(f"<b>{h}</b>", styles["Normal"]) for h in headers]]
        for row in rows[:50]:  # Cap at 50 rows for standard print
            row_cells = []
            for item in row:
                if isinstance(item, (int, float)):
                    if item > 1000:
                        txt = f"{item:,.0f}".replace(",", ".")
                    else:
                        txt = str(item)
                else:
                    txt = str(item)
                row_cells.append(Paragraph(txt, styles["Normal"]))
            table_data.append(row_cells)

        table = Table(table_data, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 12))
        elements.append(Paragraph(
            "<i>* Dokumen ini dibuat otomatis oleh PADI Report Engine melalui MCP Protocol tanpa pemrosesan AI eksternal.</i>",
            meta_style
        ))

        doc.build(elements)

        download_url = f"/api/v1/ai/reports/download/{filename}"
        md_summary = self._generate_markdown_summary(title, filename, download_url, "PDF", headers, rows)

        return ReportResult(
            success=True,
            filename=filename,
            file_path=file_path,
            download_url=download_url,
            file_format="pdf",
            title=title,
            row_count=len(rows),
            markdown_summary=md_summary,
            token_used=0
        )

    # ─── Helper Functions ─────────────────────────────────────────────────────

    def _resolve_report_title(self, tool_name: str) -> str:
        titles = {
            "get_inventory_summary": "Laporan Ringkasan Stok Gudang",
            "get_product_stock": "Laporan Rincian Stok Produk",
            "get_low_stock_alerts": "Laporan Alert Stok Kritis / Reorder",
            "get_invoices": "Laporan Faktur Penjualan",
            "get_ar_piutang_aging": "Laporan Aging Piutang Pelanggan",
            "get_sales_summary": "Laporan Ringkasan Penjualan CPA",
            "get_inventory_aging_batch": "Laporan Batch & Masa Simpan Produk",
            "get_customer_detail": "Laporan Data Customer",
            "get_warehouse_list": "Laporan Master Gudang",
        }
        return titles.get(tool_name, f"Laporan {tool_name.replace('_', ' ').title()}")

    def _extract_tabular_data(self, tool_name: str, mcp_data: Any) -> Tuple[List[str], List[List[Any]]]:
        """Extracts clean column headers and table rows from raw MCP dictionary / list."""
        data = mcp_data.get("structuredContent") or mcp_data.get("content") or mcp_data if isinstance(mcp_data, dict) else mcp_data

        if tool_name == "get_invoices":
            invs = data if isinstance(data, list) else data.get("invoices", [])
            headers = ["No. Faktur", "Tgl Faktur", "Jatuh Tempo", "Customer", "Total Nilai", "Status Bayar"]
            rows = []
            for it in invs:
                rows.append([
                    it.get("no_faktur", "-"),
                    it.get("tgl_faktur", "-"),
                    it.get("tgl_jth_tempo", "-"),
                    it.get("nama_customer", "-"),
                    it.get("total_nilai", 0),
                    it.get("status_pembayaran", "-")
                ])
            return headers, rows

        elif tool_name == "get_low_stock_alerts":
            alerts = data if isinstance(data, list) else data.get("items", []) or data.get("alerts", [])
            headers = ["Kode SKU", "Nama Barang", "Gudang", "Stok Tersedia", "Safety Stock", "Status"]
            rows = []
            for it in alerts:
                rows.append([
                    it.get("id_barang", "-"),
                    it.get("nama_barang", "-"),
                    it.get("id_gudang", "-"),
                    it.get("stok_available", 0),
                    it.get("min_stock", 0),
                    "Reorder Segera"
                ])
            return headers, rows

        elif tool_name == "get_ar_piutang_aging":
            headers = ["Kategori Umur Piutang", "Nominal (Rp)", "Persentase (%)"]
            rows = []
            if isinstance(data, dict):
                brackets = data.get("aging_brackets", {})
                for k, v in brackets.items():
                    nom = v.get("nominal", 0) if isinstance(v, dict) else v
                    pct = v.get("percentage", 0) if isinstance(v, dict) else 0
                    rows.append([k, nom, pct])
            return headers, rows

        # Generic dict / list fallback
        if isinstance(data, list) and data and isinstance(data[0], dict):
            headers = [k.replace("_", " ").title() for k in data[0].keys()]
            rows = [[it.get(k, "-") for k in data[0].keys()] for it in data]
            return headers, rows
        elif isinstance(data, dict):
            headers = ["Metrik Operasional", "Nilai / Keterangan"]
            rows = [[k.replace("_", " ").title(), str(v)] for k, v in data.items() if not isinstance(v, (dict, list))]
            return headers, rows

        return ["Data"], [["Data berhasil diekstrak."]]

    def _generate_markdown_summary(
        self,
        title: str,
        filename: str,
        download_url: str,
        format_label: str,
        headers: List[str],
        rows: List[List[Any]]
    ) -> str:
        """Creates responsive Markdown response with direct download button and preview table."""
        lines = []
        lines.append(f"### 📥 {title}")
        lines.append(f"Laporan berhasil diproduksi secara langsung oleh **PADI Report Engine** dalam format **{format_label}** tanpa menggunakan token LLM.")
        lines.append("")
        lines.append(f"📎 **File Siap Diunduh:** [{filename}]({download_url})")
        lines.append("")
        lines.append(f"**Ringkasan Data ({len(rows)} baris):**")

        # Top 5 preview table
        lines.append("| " + " | ".join(headers[:5]) + " |")
        lines.append("| " + " | ".join(["---"] * len(headers[:5])) + " |")
        for r in rows[:5]:
            fmt_row = []
            for item in r[:5]:
                if isinstance(item, (int, float)):
                    fmt_row.append(f"{item:,.0f}".replace(",", "."))
                else:
                    fmt_row.append(str(item))
            lines.append("| " + " | ".join(fmt_row) + " |")

        if len(rows) > 5:
            lines.append(f"\n_... dan {len(rows) - 5} baris lainnya telah disertakan lengkap di dalam file unduhan._")

        lines.append(f"\n> 💡 **Informasi Teknis:** Route: `MCP -> Report Engine` | Token Digunakan: **0** (Hemat 100%).")
        return "\n".join(lines)


# ─── Singleton ────────────────────────────────────────────────────────────────

_report_engine = ReportEngine()

def get_report_engine() -> ReportEngine:
    return _report_engine
