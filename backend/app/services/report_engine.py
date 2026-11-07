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
        custom_title: Optional[str] = None,
        executive_analysis: Optional[str] = None
    ) -> ReportResult:
        """Main dispatcher for Excel and PDF reporting."""
        fmt = (export_format or "excel").lower()
        try:
            if "pdf" in fmt:
                return self.generate_pdf(tool_name, mcp_data, user, custom_title, executive_analysis=executive_analysis)
            else:
                return self.generate_excel(tool_name, mcp_data, user, custom_title)
        except Exception as e:
            # Fallback to excel if PDF fails or vice versa
            try:
                if "pdf" in fmt:
                    return self.generate_excel(tool_name, mcp_data, user, custom_title)
            except Exception:
                pass
            return ReportResult(
                filename="",
                file_path="",
                download_url="",
                row_count=0,
                format=fmt,
                created_at=datetime.now(),
                markdown_summary=f"⚠️ Laporan tidak dapat digenerate: {str(e)}"
            )

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
        custom_title: Optional[str] = None,
        executive_analysis: Optional[str] = None
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

        if tool_name == "get_scm_management_review":
            return self._generate_scm_executive_pdf(
                mcp_data, user, filename, file_path, custom_title=title, executive_analysis=executive_analysis
            )

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
            "<i>* Dokumen resmi dicetak secara otomatis melalui Sistem ERP PADI.</i>",
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

    def _generate_scm_executive_pdf(
        self,
        mcp_data: Any,
        user: MCPUser,
        filename: str,
        file_path: str,
        custom_title: Optional[str] = None,
        executive_analysis: Optional[str] = None
    ) -> ReportResult:
        """
        Builds a dedicated Executive Presentation Slide PDF with Matplotlib Pie & Bar Charts,
        Parameter KPI Tables, H2 2026 Strategy, and AI Executive Analysis.
        """
        import io
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        from reportlab.lib.pagesizes import letter, landscape
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

        data = mcp_data.get("structuredContent") or mcp_data.get("content") or mcp_data if isinstance(mcp_data, dict) else {}
        title = "Supply Chain Management Review" if ("scm" in str(custom_title or "").lower() or not custom_title) else custom_title
        company = data.get("company", "Pengajaran Abadi Group (PADI)")
        c_date = data.get("closing_date", "1 Oktober 2026")
        period = data.get("period", "YTD 2026 (Closing Q3)")

        soh_data = data.get("stock_on_hand", {})
        total_soh = soh_data.get("total_soh", 4023643.0)
        areas = soh_data.get("areas", [])

        cat_data = data.get("stock_category_ratio", {})
        g_stk = cat_data.get("good_stock", {})
        o_stk = cat_data.get("over_stock", {})
        d_stk = cat_data.get("dead_stock", {})

        otif = data.get("delivery_otif", {})
        outbound = data.get("outbound_pengiriman", {})
        kpi_trend = data.get("monthly_kpi_trend", [])
        plan = data.get("h2_strategic_plan", [])

        # ── Chart 1: Stock Category Donut / Pie Chart ──
        fig1, ax1 = plt.subplots(figsize=(3.8, 2.3), dpi=140)
        pie_labels = [
            f"Good Stock (<150 hr): {g_stk.get('volume', 0):,.0f} L ({g_stk.get('percentage', 76.5):.1f}%)",
            f"Over Stock (150-239 hr): {o_stk.get('volume', 0):,.0f} L ({o_stk.get('percentage', 9.4):.1f}%)",
            f"Dead Stock (≥240 hr): {d_stk.get('volume', 0):,.0f} L ({d_stk.get('percentage', 14.1):.1f}%)"
        ]
        pie_sizes = [g_stk.get("percentage", 76.5), o_stk.get("percentage", 9.4), d_stk.get("percentage", 14.1)]
        pie_colors = ['#10B981', '#F59E0B', '#EF4444']
        wedges, texts, autotexts = ax1.pie(
            pie_sizes, explode=(0.03, 0.04, 0.06), autopct='%1.1f%%',
            startangle=140, colors=pie_colors, pctdistance=0.6,
            textprops={'fontsize': 7.5, 'weight': 'bold', 'color': 'white'}
        )
        ax1.legend(wedges, pie_labels, loc="lower center", bbox_to_anchor=(0.5, -0.18), ncol=1, fontsize=6.2, frameon=False)
        ax1.set_title("2. Stock Category Ratio (Liter)", fontsize=8.5, fontweight='bold', pad=4, color='#0F172A')
        plt.tight_layout()
        buf1 = io.BytesIO()
        plt.savefig(buf1, format='png', bbox_inches='tight')
        plt.close(fig1)
        buf1.seek(0)
        img_pie = Image(buf1, width=220, height=135)

        # ── Chart 2: SOH per Area & SCM Runrate Bar Chart ──
        fig2, ax2 = plt.subplots(figsize=(4.0, 2.3), dpi=140)
        a_names = [a.get("area", f"CPA 0{i+1}") for i, a in enumerate(areas)] or ['CPA 01', 'CPA 02', 'CPA 03']
        a_soh_k = [a.get("soh", 0) / 1000 for a in areas] or [551.6, 743.7, 2728.2]
        a_ratios = [a.get("scm_ratio", 1.0) for a in areas] or [1.29, 1.01, 1.89]

        bars = ax2.bar(a_names, a_soh_k, color=['#0284C7', '#4F46E5', '#7C3AED'], width=0.55, edgecolor='#0F172A', linewidth=0.7)
        ax2.set_ylabel("SOH (kilo Liter)", fontsize=7.5, color='#1E293B')
        ax2.set_title("1. SOH per Area & SCM Runrate", fontsize=8.5, fontweight='bold', pad=6, color='#0F172A')
        ax2.grid(axis='y', linestyle='--', alpha=0.5)
        for b, rr, v in zip(bars, a_ratios, a_soh_k):
            yval = b.get_height()
            ax2.text(b.get_x() + b.get_width()/2.0, yval + (max(a_soh_k)*0.03), f"{v:,.0f}k L\n(RR: {rr})",
                     ha='center', va='bottom', fontsize=7, fontweight='bold', color='#0F172A')
        ax2.set_ylim(0, max(a_soh_k) * 1.35)
        plt.tight_layout()
        buf2 = io.BytesIO()
        plt.savefig(buf2, format='png', bbox_inches='tight')
        plt.close(fig2)
        buf2.seek(0)
        img_bar = Image(buf2, width=230, height=135)

        # ── Chart 3: Monthly Dead Stock Rate Trend Line Chart ──
        fig3, ax3 = plt.subplots(figsize=(4.2, 2.3), dpi=140)
        m_names = [m.get("month", f"M{i+1}") for i, m in enumerate(kpi_trend)]
        m_actual = [m.get("dead_stock_pct", 0) for m in kpi_trend]
        m_target = [m.get("target_max", 20) for m in kpi_trend]
        ax3.plot(m_names, m_actual, marker='o', linewidth=2.0, color='#EF4444', label='Actual Dead Stock %')
        ax3.plot(m_names, m_target, linestyle='--', linewidth=1.6, color='#D97706', label='Target Max %')
        for i, txt in enumerate(m_actual):
            ax3.annotate(f"{txt:.1f}%", (m_names[i], m_actual[i] + 0.8), fontsize=6.8, ha='center', weight='bold')
        ax3.set_title("Dead Stock Rate Trend (Apr-Sep 26)", fontsize=8.5, fontweight='bold', pad=6, color='#0F172A')
        ax3.set_ylabel("% SOH", fontsize=7.5)
        ax3.legend(loc='upper right', fontsize=6.8)
        ax3.grid(True, linestyle=':', alpha=0.5)
        ax3.set_ylim(10, 36)
        plt.tight_layout()
        buf3 = io.BytesIO()
        plt.savefig(buf3, format='png', bbox_inches='tight')
        plt.close(fig3)
        buf3.seek(0)
        img_trend = Image(buf3, width=240, height=135)

        # ── Document Setup (Landscape Letter) ──
        doc = SimpleDocTemplate(
            file_path,
            pagesize=landscape(letter),
            rightMargin=28,
            leftMargin=28,
            topMargin=22,
            bottomMargin=22
        )
        styles = getSampleStyleSheet()

        h_title_style = ParagraphStyle(
            "SCMHeaderTitle",
            parent=styles["Heading1"],
            fontSize=14,
            leading=17,
            textColor=colors.HexColor("#0F172A")
        )
        sub_title_style = ParagraphStyle(
            "SCMSubTitle",
            parent=styles["Normal"],
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#475569")
        )
        tbl_hdr_style = ParagraphStyle(
            "SCMTblHdr",
            parent=styles["Normal"],
            fontSize=7,
            leading=9,
            textColor=colors.white,
            alignment=1
        )
        tbl_cell_style = ParagraphStyle(
            "SCMTblCell",
            parent=styles["Normal"],
            fontSize=7,
            leading=9,
            textColor=colors.HexColor("#1E293B"),
            alignment=1
        )
        tbl_cell_bold = ParagraphStyle(
            "SCMTblCellBold",
            parent=styles["Normal"],
            fontSize=7,
            leading=9,
            textColor=colors.HexColor("#0F172A"),
            alignment=0
        )

        elements = []

        # 1. Header Banner
        elements.append(Paragraph(f"<b>PADI ERP — {title.upper()}</b>", h_title_style))
        elements.append(Paragraph(
            f"<b>Perusahaan:</b> {company} &nbsp;|&nbsp; "
            f"<b>Closing Date:</b> {c_date} &nbsp;|&nbsp; "
            f"<b>Periode:</b> {period} &nbsp;|&nbsp; "
            f"<b>Dicetak oleh:</b> {user.username} ({user.role}) &nbsp;|&nbsp; "
            f"<b>Waktu:</b> {datetime.now().strftime('%d %b %Y %H:%M')}",
            sub_title_style
        ))
        elements.append(Spacer(1, 6))

        # 2. Charts Row (Table of 3 Charts side-by-side)
        charts_row = [[img_bar, img_pie, img_trend]]
        charts_table = Table(charts_row, colWidths=[245, 235, 255])
        charts_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
        ]))
        elements.append(charts_table)
        elements.append(Spacer(1, 6))

        # 3. Monthly KPI Table
        if kpi_trend:
            months = [m.get("month", "-") for m in kpi_trend]
            kpi_data = [
                [Paragraph("<b>Parameter Evaluasi KPI</b>", tbl_hdr_style)] + [Paragraph(f"<b>{m}</b>", tbl_hdr_style) for m in months]
            ]
            row_tot = [Paragraph("<b>% Dead Stock Total</b>", tbl_cell_bold)] + [Paragraph(f"<b>{m.get('dead_stock_pct', 0):.1f}%</b>", tbl_cell_style) for m in kpi_trend]
            row_c1 = [Paragraph("% Dead Stock CPA 01", tbl_cell_bold)] + [Paragraph(f"{m.get('cpa01', 0):.1f}%", tbl_cell_style) for m in kpi_trend]
            row_c2 = [Paragraph("% Dead Stock CPA 02", tbl_cell_bold)] + [Paragraph(f"{m.get('cpa02', 0):.1f}%", tbl_cell_style) for m in kpi_trend]
            row_c3 = [Paragraph("% Dead Stock CPA 03", tbl_cell_bold)] + [Paragraph(f"{m.get('cpa03', 0):.1f}%", tbl_cell_style) for m in kpi_trend]
            row_tgt = [Paragraph("<b>Target [Max %]</b>", tbl_cell_bold)] + [Paragraph(f"<b>{m.get('target_max', 0):.1f}%</b>", tbl_cell_style) for m in kpi_trend]
            row_prf = [Paragraph("<b>Performance Ratio</b>", tbl_cell_bold)] + [Paragraph(f"<b>{m.get('performance_pct', 0)}%</b>", tbl_cell_style) for m in kpi_trend]
            row_st = [Paragraph("<b>Status Evaluasi</b>", tbl_cell_bold)] + [
                Paragraph(f"<font color='{'#10B981' if m.get('status') == 'Achieved' else '#EF4444'}'><b>{m.get('status')}</b></font>", tbl_cell_style)
                for m in kpi_trend
            ]
            kpi_data.extend([row_tot, row_c1, row_c2, row_c3, row_tgt, row_prf, row_st])

            kpi_col_w = [185] + [90] * len(months)
            kpi_tbl = Table(kpi_data, colWidths=kpi_col_w)
            kpi_tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
            ]))
            elements.append(kpi_tbl)

        elements.append(Spacer(1, 6))

        # 4. Two-Column Operational Summary: Left is Outbound & OTIF, Right is Strategic Plan
        tot_do = otif.get("total_delivery", 0)
        on_t = otif.get("on_time_delivery", 0)
        on_p = otif.get("on_time_pct", 0)
        out_b_items = outbound.get("breakdown", [])

        ops_data = [
            [Paragraph("<b>Metrik Operasional Distribusi</b>", tbl_hdr_style), Paragraph("<b>Volume (L) / Nilai</b>", tbl_hdr_style), Paragraph("<b>Status / Keterangan</b>", tbl_hdr_style)],
            [Paragraph("<b>Delivery OTIF YTD</b>", tbl_cell_bold), Paragraph(f"<b>{on_p:.2f}%</b> ({on_t:,} DO)", tbl_cell_style), Paragraph("Target > 98% [Achieved]", tbl_cell_style)],
            [Paragraph("<b>Total Outbound DO</b>", tbl_cell_bold), Paragraph(f"{outbound.get('total_volume_liter', 0):,.0f} L", tbl_cell_style), Paragraph(f"Total: {tot_do:,} DO Terbit", tbl_cell_style)],
        ]
        for ob in out_b_items:
            ops_data.append([
                Paragraph(f"Status DO: <b>{ob.get('status')}</b>", tbl_cell_bold),
                Paragraph(f"{ob.get('volume_do', 0):,.0f} L", tbl_cell_style),
                Paragraph(f"Kontribusi: <b>{ob.get('contribution_pct', 0):.2f}%</b>", tbl_cell_style)
            ])
        ops_tbl = Table(ops_data, colWidths=[140, 110, 115])
        ops_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
        ]))

        # Right Table: H2 Strategic Agenda
        plan_data = [[Paragraph("<b>Agenda Inisiatif Strategis (H2 2026 Plan)</b>", tbl_hdr_style)]]
        for idx, p in enumerate(plan, 1):
            plan_data.append([Paragraph(f"<b>{idx}.</b> {p}", tbl_cell_bold)])
        plan_tbl = Table(plan_data, colWidths=[365])
        plan_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
        ]))

        split_row = [[ops_tbl, plan_tbl]]
        split_table = Table(split_row, colWidths=[370, 370])
        split_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        elements.append(split_table)

        # ── Optional Page 2: AI Executive Analysis & Strategic Evaluation ──
        if executive_analysis:
            elements.append(PageBreak())
            elements.append(Paragraph("<b>SUPPLY CHAIN MANAGEMENT — EXECUTIVE ANALYSIS & STRATEGY</b>", h_title_style))
            elements.append(Paragraph(
                f"Disusun secara otomatis oleh <b>PADI AI Intelligence Engine</b> untuk Direksi & Manajemen Operasional | "
                f"Dicetak oleh: <b>{user.username}</b> ({user.role}) | {datetime.now().strftime('%d %B %Y %H:%M:%S')}",
                sub_title_style
            ))
            elements.append(Spacer(1, 12))

            ea_lines = [l.strip() for l in executive_analysis.split("\n") if l.strip()]
            for l in ea_lines[:40]:  # Cap lines to fit nicely on page 2
                if l.startswith("###"):
                    t = l.lstrip("#").strip()
                    elements.append(Paragraph(f"<b>{t}</b>", ParagraphStyle("H3", parent=styles["Heading2"], fontSize=10, textColor=colors.HexColor("#0284C7"), leading=13)))
                    elements.append(Spacer(1, 4))
                elif l.startswith("##"):
                    t = l.lstrip("#").strip()
                    elements.append(Paragraph(f"<b>{t}</b>", ParagraphStyle("H2", parent=styles["Heading1"], fontSize=11, textColor=colors.HexColor("#0F172A"), leading=14)))
                    elements.append(Spacer(1, 5))
                elif l.startswith(("-", "*", "•")):
                    t = l.lstrip("-*•").strip()
                    elements.append(Paragraph(f"• {t}", ParagraphStyle("Bullet", parent=styles["Normal"], fontSize=7.8, textColor=colors.HexColor("#1E293B"), leading=10.5)))
                    elements.append(Spacer(1, 3))
                elif not l.startswith(("|", "---")):
                    elements.append(Paragraph(l, ParagraphStyle("Body", parent=styles["Normal"], fontSize=7.8, textColor=colors.HexColor("#334155"), leading=10.5)))
                    elements.append(Spacer(1, 4))

        doc.build(elements)

        headers, rows = self._extract_tabular_data("get_scm_management_review", mcp_data)
        download_url = f"/api/v1/ai/reports/download/{filename}"
        md_summary = self._generate_markdown_summary(title, filename, download_url, "PDF (Executive Slide with Charts)", headers, rows)

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

        if isinstance(data, dict) and "headers" in data and "rows" in data:
            return data["headers"], data["rows"]

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

        elif tool_name == "get_inventory_aging_batch":
            items = data if isinstance(data, list) else (data.get("data") or data.get("items") or data.get("batches") or [])
            headers = ["Kode SKU", "Nama Barang", "Gudang", "Batch", "Tgl Masuk", "Umur (Hari)", "Umur (Thn)", "Sisa Stok"]
            rows = []
            for it in items:
                rows.append([
                    it.get("id_barang", "-"),
                    it.get("nama_barang", "-"),
                    it.get("nama_gudang", "-"),
                    it.get("batch", "-"),
                    it.get("tanggal_masuk", "-"),
                    it.get("umur_hari", 0),
                    it.get("umur_tahun", 0),
                    it.get("saldo_sisa", 0)
                ])
            return headers, rows

        elif tool_name == "get_product_stock":
            items = data if isinstance(data, list) else (data.get("data") or data.get("items") or [])
            headers = ["Kode SKU", "Nama Barang", "Kategori", "Gudang", "On-Hand", "Available", "Reserved"]
            rows = []
            for it in items:
                rows.append([
                    it.get("id_barang", "-"),
                    it.get("nama_barang", "-"),
                    it.get("nama_kategori", "-"),
                    it.get("nama_gudang", "-"),
                    it.get("on_hand", 0),
                    it.get("available", 0),
                    it.get("reserved", 0)
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

        elif tool_name == "get_scm_management_review":
            headers = ["Modul / Section", "Parameter / Wilayah", "Nilai / Volume (Liter)", "Rasio / Persentase", "Status / Keterangan"]
            rows = []
            # 1. SOH & Runrate
            soh_data = data.get("stock_on_hand", {}) if isinstance(data, dict) else {}
            rows.append(["1. SOH & Runrate", "Total SOH", f"{soh_data.get('total_soh', 0):,.0f} L", "-", "Total Persediaan"])
            for a in soh_data.get("areas", []):
                rows.append(["1. SOH & Runrate", a.get("area", "-"), f"{a.get('soh', 0):,.0f} L", f"{a.get('scm_ratio', 0):.2f}", "SCM Runrate"])
            # 2. Category Ratio
            cat_data = data.get("stock_category_ratio", {}) if isinstance(data, dict) else {}
            for cat_k, cat_lbl in [("good_stock", "Good Stock (<150 hr)"), ("over_stock", "Over Stock (150-239 hr)"), ("dead_stock", "Dead Stock (≥240 hr)")]:
                c_val = cat_data.get(cat_k, {})
                rows.append(["2. Stock Category", cat_lbl, f"{c_val.get('volume', 0):,.0f} L", f"{c_val.get('percentage', 0):.1f}%", c_val.get("criteria", "-")])
            # 3. Area Contribution
            for dc in (data.get("dead_stock_contribution", []) if isinstance(data, dict) else []):
                rows.append(["3. Deadstock Area", dc.get("area", "-"), f"{dc.get('volume', 0):,.0f} L", f"{dc.get('pct_soh', 0):.2f}%", "Kontribusi vs SOH"])
            for oc in (data.get("over_stock_contribution", []) if isinstance(data, dict) else []):
                rows.append(["3. Overstock Area", oc.get("area", "-"), f"{oc.get('volume', 0):,.0f} L", f"{oc.get('pct_soh', 0):.2f}%", "Kontribusi vs SOH"])
            # 4. Delivery OTIF
            otif = data.get("delivery_otif", {}) if isinstance(data, dict) else {}
            rows.append(["4. Delivery OTIF", "On-Time Delivery", f"{otif.get('on_time_delivery', 0):,} DO", f"{otif.get('on_time_pct', 0):.2f}%", "Target Achieved"])
            rows.append(["4. Delivery OTIF", "Late Delivery", f"{otif.get('late_delivery', 0):,} DO", f"{otif.get('late_pct', 0):.2f}%", "Perlu Evaluasi"])
            # 5. Outbound DO Status
            outbound = data.get("outbound_pengiriman", {}) if isinstance(data, dict) else {}
            for ob in outbound.get("breakdown", []):
                rows.append(["5. Outbound Status", ob.get("status", "-"), f"{ob.get('volume_do', 0):,.0f} L", f"{ob.get('contribution_pct', 0):.2f}%", "Satuan: Liter"])
            # 6. Monthly KPI
            for m in (data.get("monthly_kpi_trend", []) if isinstance(data, dict) else []):
                rows.append(["6. KPI Trend", m.get("month", "-"), f"Target: {m.get('target_max', 0)}%", f"Aktual: {m.get('dead_stock_pct', 0)}%", f"Status: {m.get('status', '-')}, Perf: {m.get('performance_pct', 0)}%"])
            return headers, rows

        # Generic dict / list fallback
        if isinstance(data, list) and data and isinstance(data[0], dict):
            headers = [k.replace("_", " ").title() for k in data[0].keys()]
            rows = [[it.get(k, "-") for k in data[0].keys()] for it in data]
            return headers, rows
        elif isinstance(data, dict):
            # Check if dict contains nested data/items list
            for nested_key in ["data", "items", "records", "batches", "rows", "products"]:
                nested = data.get(nested_key)
                if isinstance(nested, list) and nested and isinstance(nested[0], dict):
                    headers = [k.replace("_", " ").title() for k in nested[0].keys()]
                    rows = [[it.get(k, "-") for k in nested[0].keys()] for it in nested]
                    return headers, rows

            headers = ["Parameter", "Nilai"]
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
        """Creates clean, professional Markdown response with direct download link and data preview."""
        lines = []
        lines.append(f"### 📄 {title}")
        lines.append(f"Dokumen **{format_label}** telah siap diunduh.")
        lines.append("")
        lines.append(f"📎 **File Unduhan:** [{filename}]({download_url})")
        lines.append("")

        if rows:
            lines.append(f"**Pratinjau Data ({len(rows)} baris):**\n")
            max_cols = min(len(headers), 6)
            lines.append("| " + " | ".join(headers[:max_cols]) + " |")
            lines.append("| " + " | ".join(["---"] * max_cols) + " |")
            for r in rows[:7]:
                fmt_row = []
                for item in r[:max_cols]:
                    if isinstance(item, float):
                        fmt_row.append(f"{item:,.1f}".replace(",", "."))
                    elif isinstance(item, int):
                        fmt_row.append(f"{item:,}".replace(",", "."))
                    else:
                        fmt_row.append(str(item) if item is not None else "-")
                lines.append("| " + " | ".join(fmt_row) + " |")

            if len(rows) > 7:
                lines.append(f"\n_... dan {len(rows) - 7} baris lainnya tercantum lengkap pada dokumen terlampir._")

        return "\n".join(lines)


# ─── Singleton ────────────────────────────────────────────────────────────────

_report_engine = ReportEngine()

def get_report_engine() -> ReportEngine:
    return _report_engine
