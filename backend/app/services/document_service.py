"""
PADI ERP / CPA Analytics — Document RAG & Structured Upload Service
═══════════════════════════════════════════════════════════════════
Implements the cost-reduction pipeline for PDF & Excel document uploads:
1. Parse Once: Parse PDF (pdfplumber) / Excel (openpyxl/pandas) only once and store structured data.
2. Chunking & Metadata: Divide PDF into 500-1000 token chunks with page, section, and keyword metadata.
3. Embedding / Vector Search: Term Frequency / BM25 Vector Cosine Similarity retrieval (Top 3-5 chunks only).
4. Summary Cache: Pre-generated executive summary served with 0 LLM tokens.
5. Structured Data Execution: Excel spreadsheets stored as structured data with SQL/aggregations (0 tokens).
6. SHA-256 Deduplication: Identical uploads reuse existing parsed tables & embeddings without re-processing.
7. File ID Caching: Multi-turn chat persistence by document ID.
8. Context Caching: Standardized prefixes for DeepSeek KV Context Caching.
"""

import os
import re
import io
import json
import time
import math
import hashlib
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.analytics.models import UploadedDocument, DocumentChunk, DocumentExcelTable
from app.mcp.session import get_redis_client
from app.services.report_engine import REPORTS_DIR

logger = logging.getLogger(__name__)

# Stopwords for Indonesian & English document indexing
STOPWORDS = {
    "yang", "untuk", "pada", "ke", "para", "namun", "menurut", "antara", "dia", "dua",
    "ia", "seperti", "jika", "sehingga", "kembali", "dan", "tidak", "ini", "karena",
    "oleh", "saat", "harus", "sementara", "setelah", "belum", "kami", "sekitar",
    "bagi", "serta", "di", "dari", "telah", "sebagai", "masih", "hal", "ketika",
    "adalah", "itu", "atau", "bisa", "akan", "ada", "juga", "sudah", "saya", "anda",
    "the", "is", "at", "which", "on", "and", "a", "an", "in", "to", "for", "of", "with"
}


def compute_sha256(data: bytes) -> str:
    """Computes a SHA-256 hash string for byte content."""
    return hashlib.sha256(data).hexdigest()


def tokenize_text(text_content: str) -> List[str]:
    """Extracts alphanumeric tokens in lowercase, filtering stopwords."""
    words = re.findall(r"\b[a-zA-Z0-9_\-]{2,}\b", text_content.lower())
    return [w for w in words if w not in STOPWORDS]


# ─── 1. PDF Parser Engine (pdfplumber / pypdf) ───────────────────────────────

def parse_pdf_bytes(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Parses PDF bytes using pdfplumber with fallback to pypdf.
    Extracts text, table outlines, and page numbers.
    """
    pages_data = []
    total_pages = 0

    # Try pdfplumber first
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            total_pages = len(pdf.pages)
            for idx, page in enumerate(pdf.pages):
                page_text = page.extract_text() or ""
                # Also extract simple tables if present
                tables = []
                try:
                    raw_tables = page.extract_tables()
                    if raw_tables:
                        for tbl in raw_tables[:3]:
                            clean_tbl = [[str(c or "").strip() for c in row if c is not None] for row in tbl if row]
                            if clean_tbl:
                                tables.append(clean_tbl)
                except Exception:
                    pass

                pages_data.append({
                    "page_number": idx + 1,
                    "text": page_text.strip(),
                    "tables": tables
                })
    except Exception as e:
        logger.warning(f"pdfplumber failed or not available, falling back to pypdf: {e}")
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            total_pages = len(reader.pages)
            for idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                pages_data.append({
                    "page_number": idx + 1,
                    "text": page_text.strip(),
                    "tables": []
                })
        except Exception as e2:
            logger.error(f"Both pdfplumber and pypdf failed to parse PDF: {e2}")
            raise ValueError(f"Gagal membaca file PDF: {str(e2)}")

    total_words = sum(len(p["text"].split()) for p in pages_data)
    return {
        "filename": filename,
        "page_count": total_pages,
        "total_words": total_words,
        "pages": pages_data
    }


# ─── 2. Excel Parser Engine (openpyxl / pandas) ───────────────────────────────

def parse_excel_bytes(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Parses Excel sheets or CSV into structured data.
    Extracts columns, row counts, numerical statistics (SUM, AVG, MIN, MAX),
    and sample rows so SQL-like queries can run without calling LLM.
    """
    sheets_meta = []
    is_csv = filename.lower().endswith(".csv")
    try:
        if is_csv:
            try:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8")
            except Exception:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding="latin-1")
            sheet_items = [("Data", df)]
        else:
            try:
                excel_file = pd.ExcelFile(io.BytesIO(file_bytes))
                sheet_items = [(s_name, excel_file.parse(s_name)) for s_name in excel_file.sheet_names[:10]]
            except Exception:
                # Fallback to CSV if extension was xls/xlsx but content is text/csv
                try:
                    df = pd.read_csv(io.BytesIO(file_bytes))
                    sheet_items = [("Data", df)]
                except Exception as csv_fallback_err:
                    raise

        for s_name, df in sheet_items:
            df = df.dropna(how="all")  # Drop completely empty rows
            row_count = len(df)
            col_names = [str(c).strip() for c in df.columns]

            # Compute numerical summaries
            num_stats = {}
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            for col in numeric_cols:
                series = df[col].dropna()
                if not series.empty:
                    col_str = str(col).strip()
                    num_stats[col_str] = {
                        "sum": float(round(series.sum(), 2)),
                        "mean": float(round(series.mean(), 2)),
                        "min": float(round(series.min(), 2)),
                        "max": float(round(series.max(), 2)),
                        "count": int(series.count())
                    }

            # Extract sample rows (top 5)
            sample_df = df.head(5).copy()
            # Replace NaNs for JSON serialization
            sample_df = sample_df.fillna("-")
            sample_rows = sample_df.to_dict(orient="records")

            # Extract categorical distributions (e.g., branches, statuses)
            cat_breakdown = {}
            cat_cols = df.select_dtypes(include=["object", "string"]).columns.tolist()
            for col in cat_cols[:4]:
                series = df[col].dropna()
                val_counts = series.value_counts().head(5).to_dict()
                if val_counts:
                    cat_breakdown[str(col)] = {str(k): int(v) for k, v in val_counts.items()}

            sheets_meta.append({
                "sheet_name": s_name,
                "row_count": row_count,
                "column_names": col_names,
                "numerical_stats": num_stats,
                "categorical_stats": cat_breakdown,
                "sample_rows": sample_rows
            })

    except Exception as e:
        logger.error(f"Error parsing Excel file {filename}: {e}")
        raise ValueError(f"Gagal membaca file Excel: {str(e)}")

    return {
        "filename": filename,
        "sheet_count": len(sheets_meta),
        "sheets": sheets_meta
    }


# ─── 3. Chunking & Vector Space Indexing (RAG Engine) ─────────────────────────

def chunk_pdf_document(
    pages_data: List[Dict[str, Any]],
    chunk_size_words: int = 350,
    overlap_words: int = 50
) -> List[Dict[str, Any]]:
    """
    Chunks document pages into logical segments of 300-600 words (approx 500-1000 tokens)
    with overlap. Preserves page number and section headings.
    """
    chunks = []
    chunk_idx = 0

    for page in pages_data:
        p_num = page["page_number"]
        p_text = page["text"]
        if not p_text:
            continue

        words = p_text.split()
        if len(words) <= chunk_size_words:
            # Entire page fits into a single chunk
            tokens = tokenize_text(p_text)
            title = _extract_heading(p_text) or f"Halaman {p_num}"
            chunks.append({
                "chunk_index": chunk_idx,
                "page_number": p_num,
                "title": title,
                "content": p_text,
                "token_count": int(len(words) * 1.3),
                "keywords": " ".join(list(set(tokens))[:25]),
                "term_freq": _compute_term_freq(tokens)
            })
            chunk_idx += 1
        else:
            # Split page into overlapping chunks
            start = 0
            sub_part = 1
            while start < len(words):
                end = min(start + chunk_size_words, len(words))
                chunk_words = words[start:end]
                chunk_content = " ".join(chunk_words)
                tokens = tokenize_text(chunk_content)
                title = _extract_heading(chunk_content) or f"Halaman {p_num} (Bagian {sub_part})"

                chunks.append({
                    "chunk_index": chunk_idx,
                    "page_number": p_num,
                    "title": title,
                    "content": chunk_content,
                    "token_count": int(len(chunk_words) * 1.3),
                    "keywords": " ".join(list(set(tokens))[:25]),
                    "term_freq": _compute_term_freq(tokens)
                })
                chunk_idx += 1
                sub_part += 1
                if end >= len(words):
                    break
                start += (chunk_size_words - overlap_words)

    return chunks


def _extract_heading(text_chunk: str) -> str:
    """Attempts to find a header/title at the beginning of a chunk."""
    lines = [line.strip() for line in text_chunk.split("\n") if line.strip()]
    if lines:
        first_line = lines[0]
        if len(first_line) < 80 and not first_line.endswith("."):
            return first_line
    return ""


def _compute_term_freq(tokens: List[str]) -> Dict[str, float]:
    """Computes normalized term frequency dictionary for cosine similarity."""
    if not tokens:
        return {}
    counts: Dict[str, int] = {}
    for t in tokens:
        counts[t] = counts.get(t, 0) + 1
    total = len(tokens)
    return {k: round(v / total, 4) for k, v in counts.items()}


def vector_cosine_similarity(vec_a: Dict[str, float], vec_b: Dict[str, float]) -> float:
    """Computes fast sparse cosine similarity between two term frequency vectors."""
    if not vec_a or not vec_b:
        return 0.0

    dot_product = sum(vec_a[t] * vec_b[t] for t in vec_a if t in vec_b)
    mag_a = math.sqrt(sum(v * v for v in vec_a.values()))
    mag_b = math.sqrt(sum(v * v for v in vec_b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot_product / (mag_a * mag_b)


# ─── 4. Summary Engine (Layer 5: Summary Cache) ───────────────────────────────

def generate_pdf_summary(filename: str, page_count: int, pages: List[Dict[str, Any]]) -> str:
    """
    Generates structured Executive Summary for PDF documents.
    Stored in database to answer 'ringkas laporan ini' with 0 LLM tokens.
    """
    first_pages_text = "\n".join([p["text"] for p in pages[:3] if p["text"]])
    # Extract numerical highlights (percentages, rupiah, quantities)
    figures = re.findall(r"(?:Rp\s*[\d\.,]+|[\d\.,]+\s*%(?:[\s\w]+)?|[\d\.,]+\s*(?:Liter|L|unit|karton|drum))", first_pages_text, re.IGNORECASE)
    unique_figures = list(dict.fromkeys(figures))[:8]

    lines = [
        f"### 📄 Ringkasan Eksekutif Dokumen: `{filename}`",
        f"- **Format Dokumen:** Dokumen PDF ({page_count} halaman)",
        f"- **Tanggal Parsing:** {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "- **Status Ekstraksi:** Berhasil dipecah menjadi chunk terindeks (RAG Ready)\n",
        "#### 📌 Ikhtisar & Poin Utama:"
    ]

    # Extract headings or top lines
    headings = []
    for p in pages[:5]:
        h = _extract_heading(p["text"])
        if h and h not in headings and len(h) > 5:
            headings.append(h)

    if headings:
        for h in headings[:6]:
            lines.append(f"- **Topik:** {h}")
    else:
        sample_snippet = (pages[0]["text"][:200] + "...") if pages and pages[0]["text"] else "Dokumen operasional terverifikasi."
        lines.append(f"- {sample_snippet}")

    if unique_figures:
        lines.append("\n#### 📊 Angka & Metrik Kunci:")
        for fig in unique_figures:
            lines.append(f"- `{fig}`")

    lines.append("\n*💡 Anda dapat menanyakan rincian spesifik dokumen ini. Sistem akan mengambil 3-5 potongan halaman yang paling relevan (RAG hemat token).*")
    return "\n".join(lines)


def generate_excel_summary(filename: str, sheet_count: int, sheets: List[Dict[str, Any]]) -> str:
    """
    Generates structured Executive Summary for Excel workbooks.
    Stored in database to answer summary queries with 0 LLM tokens.
    """
    total_records = sum(s["row_count"] for s in sheets)
    lines = [
        f"### 📊 Ringkasan Dataset Spreadsheet: `{filename}`",
        f"- **Total Lembar Kerja (Sheets):** {sheet_count} sheet",
        f"- **Total Baris Data:** **{total_records:,} baris**",
        "- **Format Pemrosesan:** Tabular Terstruktur (PostgreSQL Fast Path)\n",
        "#### 📑 Rincian per Sheet:"
    ]

    for s in sheets:
        s_name = s["sheet_name"]
        rows = s["row_count"]
        cols = s["column_names"]
        lines.append(f"\n##### 🔹 Sheet: `{s_name}` ({rows:,} baris data)")
        lines.append(f"- **Kolom ({len(cols)}):** `{', '.join(cols[:8])}`" + ("..." if len(cols) > 8 else ""))

        num_stats = s.get("numerical_stats", {})
        if num_stats:
            lines.append("- **Agregasi Metrik Numerik:**")
            for col_name, st in list(num_stats.items())[:4]:
                tot = st.get("sum", 0)
                avg = st.get("mean", 0)
                lines.append(f"  • **{col_name}:** Total = `{tot:,.2f}`, Rata-rata = `{avg:,.2f}`")

        cat_stats = s.get("categorical_stats", {})
        if cat_stats:
            for cat_col, top_vals in list(cat_stats.items())[:2]:
                top_str = ", ".join(f"{k} ({v})" for k, v in top_vals.items())
                lines.append(f"- **Distribusi {cat_col}:** {top_str}")

    lines.append("\n*💡 Tanyakan pertanyaan spesifik (contoh: 'Berapa total penjualan per cabang?' atau 'Top 10 customer'). Sistem akan menghitung langsung via SQL Aggregation tanpa token LLM.*")
    return "\n".join(lines)


# ─── 5. Document Management Service ──────────────────────────────────────────

class DocumentService:
    """Enterprise RAG and Structured Data Service for PADI AI ERP."""

    def __init__(self):
        self._doc_cache: Dict[str, Dict[str, Any]] = {}

    def process_file_bytes(
        self,
        file_bytes: bytes,
        filename: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Unified document processor:
        1. Calculates SHA-256 hash.
        2. Checks if file was already parsed (Deduplication Layer 7).
        3. If new: parses PDF/Excel, chunks text, creates vector representations, saves to DB.
        4. Caches summary and document ID.
        """
        file_hash = compute_sha256(file_bytes)
        file_size = len(file_bytes)
        file_ext = filename.lower().split(".")[-1] if "." in filename else ""
        if file_ext == "pdf":
            doc_type = "pdf"
        elif file_ext in ["xlsx", "xls", "csv"]:
            doc_type = "excel"
        elif file_ext in ["html", "htm"]:
            doc_type = "html"
        elif file_ext in ["txt", "md", "json", "xml", "css", "js", "ts", "py"]:
            doc_type = "text"
        elif file_ext in ["jpg", "jpeg", "png", "webp", "gif"]:
            doc_type = "image"
        else:
            doc_type = "text"

        # ── Step 1: Check SHA-256 Deduplication in DB ──
        existing = db.query(UploadedDocument).filter(UploadedDocument.file_hash == file_hash).first()
        if existing:
            logger.info(f"[Document Deduplication Hit] Reusing existing document ID: {existing.id} (hash: {file_hash[:12]}...)")
            existing.last_accessed_at = datetime.now()
            db.commit()
            ch_list = db.query(DocumentChunk).filter(DocumentChunk.document_id == existing.id).all()
            raw_text = "\n\n".join([c.content for c in ch_list]) if ch_list else existing.summary
            return {
                "document_id": existing.id,
                "file_hash": existing.file_hash,
                "filename": existing.filename,
                "file_type": existing.file_type,
                "page_count": existing.page_count,
                "sheet_count": existing.sheet_count,
                "summary": existing.summary,
                "metadata": existing.metadata_json or {},
                "raw_text": raw_text,
                "is_cached": True,
                "source": "sha256_cache"
            }

        doc_id = f"doc_{file_hash[:16]}"

        # ── Step 2: Parse Document based on Type ──
        if doc_type == "pdf":
            parsed = parse_pdf_bytes(file_bytes, filename)
            page_count = parsed["page_count"]
            sheet_count = 0
            summary = generate_pdf_summary(filename, page_count, parsed["pages"])
            chunks_data = chunk_pdf_document(parsed["pages"])

            # Save UploadedDocument
            new_doc = UploadedDocument(
                id=doc_id,
                file_hash=file_hash,
                filename=filename,
                file_type="pdf",
                file_size=file_size,
                page_count=page_count,
                sheet_count=0,
                summary=summary,
                metadata_json={"total_words": parsed["total_words"]}
            )
            db.add(new_doc)
            db.flush()

            # Bulk save chunks
            for ch in chunks_data:
                chunk_record = DocumentChunk(
                    document_id=doc_id,
                    chunk_index=ch["chunk_index"],
                    page_number=ch["page_number"],
                    title=ch["title"],
                    content=ch["content"],
                    token_count=ch["token_count"],
                    keywords=ch["keywords"],
                    vector_json=ch["term_freq"],
                    metadata_json={"page": ch["page_number"]}
                )
                db.add(chunk_record)

            db.commit()
            logger.info(f"Indexed PDF {filename}: {page_count} pages, {len(chunks_data)} chunks.")

            return {
                "document_id": doc_id,
                "file_hash": file_hash,
                "filename": filename,
                "file_type": "pdf",
                "page_count": page_count,
                "sheet_count": 0,
                "chunk_count": len(chunks_data),
                "summary": summary,
                "is_cached": False,
                "source": "newly_parsed"
            }

        elif doc_type == "excel":
            file_save_path = os.path.join(REPORTS_DIR, f"{doc_id}_{filename}")
            try:
                with open(file_save_path, "wb") as f_save:
                    f_save.write(file_bytes)
            except Exception as fe:
                logger.warning(f"Gagal menyimpan file Excel ke disk: {fe}")

            parsed = parse_excel_bytes(file_bytes, filename)
            sheet_count = parsed["sheet_count"]
            page_count = 0

            # Deteksi otomatis apakah file adalah Delivery Order (DO) / Rekap Pengiriman
            is_do = False
            do_meta = {}
            summary = ""
            try:
                from app.services.do_presentation_generator import do_presentation_generator
                df_raw = do_presentation_generator.parse_dataframe(file_bytes, filename)
                if do_presentation_generator.is_delivery_order_file(df_raw, filename):
                    is_do = True
                    metrics = do_presentation_generator.analyze_dataset(df_raw, filename)
                    html_fn, html_fp, html_url = do_presentation_generator.generate_html_deck(
                        metrics, output_filename=f"padi_presentasi_do_{doc_id[:10]}_{int(time.time())}.html"
                    )
                    summary = do_presentation_generator.generate_chat_markdown_reply(
                        metrics, html_fn, html_url, user=None
                    )
                    do_meta = {
                        "is_do_report": True,
                        "html_filename": html_fn,
                        "html_download_url": html_url,
                        "html_file_path": html_fp,
                        "total_do": metrics["total_rows"],
                        "total_volume": metrics["total_volume"],
                        "periode_short": metrics["periode_short"],
                        "file_save_path": file_save_path
                    }
                    logger.info(f"Auto-generated Delivery Order Interactive Deck: {html_fn} for {filename}")
            except Exception as do_err:
                logger.warning(f"DO Presentation generation check skipped: {do_err}")

            if not summary:
                summary = generate_excel_summary(filename, sheet_count, parsed["sheets"])

            meta_doc = {
                "sheet_names": [s["sheet_name"] for s in parsed["sheets"]],
                "file_save_path": file_save_path,
                **do_meta
            }

            new_doc = UploadedDocument(
                id=doc_id,
                file_hash=file_hash,
                filename=filename,
                file_type="excel",
                file_size=file_size,
                page_count=0,
                sheet_count=sheet_count,
                summary=summary,
                metadata_json=meta_doc
            )
            db.add(new_doc)
            db.flush()

            excel_chunks_text = []
            for idx, s in enumerate(parsed["sheets"]):
                table_record = DocumentExcelTable(
                    document_id=doc_id,
                    sheet_name=s["sheet_name"],
                    table_name=f"excel_{s['sheet_name'][:30]}",
                    row_count=s["row_count"],
                    column_names=s["column_names"],
                    numerical_stats=s["numerical_stats"],
                    sample_rows=s["sample_rows"]
                )
                db.add(table_record)

                sheet_lines = [
                    f"### Sheet: {s['sheet_name']} (Total {s['row_count']:,} baris)",
                    f"Kolom: {', '.join(s['column_names'])}",
                ]
                if s.get("numerical_stats"):
                    sheet_lines.append("Statistik Angka:")
                    for col_name, st in s["numerical_stats"].items():
                        sheet_lines.append(f"- {col_name}: Total (Sum)={st.get('sum'):,}, Rata-rata={st.get('mean'):,}, Min={st.get('min'):,}, Max={st.get('max'):,}")
                if s.get("categorical_stats"):
                    sheet_lines.append("Distribusi Kategori:")
                    for cat_col, dist in s["categorical_stats"].items():
                        sheet_lines.append(f"- {cat_col}: {dist}")
                if s.get("sample_rows"):
                    sheet_lines.append(f"Contoh Baris Data ({len(s['sample_rows'])} baris pertama):")
                    for r_idx, r in enumerate(s["sample_rows"], 1):
                        sheet_lines.append(f"Baris {r_idx}: {json.dumps(r, ensure_ascii=False)}")

                ch_content = "\n".join(sheet_lines)
                excel_chunks_text.append(ch_content)
                tokens = tokenize_text(ch_content)
                chunk_record = DocumentChunk(
                    document_id=doc_id,
                    chunk_index=idx,
                    page_number=idx + 1,
                    title=f"Sheet: {s['sheet_name']}",
                    content=ch_content,
                    token_count=int(len(ch_content.split()) * 1.3),
                    keywords=" ".join(list(set(tokens))[:25]),
                    vector_json=_compute_term_freq(tokens),
                    metadata_json={"sheet_name": s["sheet_name"], "row_count": s["row_count"]}
                )
                db.add(chunk_record)

            db.commit()
            full_raw_text = summary + "\n\n" + "\n\n".join(excel_chunks_text)
            logger.info(f"Indexed Excel {filename}: {sheet_count} sheets, {sum(s['row_count'] for s in parsed['sheets'])} rows.")

            return {
                "document_id": doc_id,
                "file_hash": file_hash,
                "filename": filename,
                "file_type": "excel",
                "page_count": 0,
                "sheet_count": sheet_count,
                "summary": summary,
                "raw_text": full_raw_text,
                "is_cached": False,
                "source": "newly_parsed"
            }

        elif doc_type in ["html", "text"]:
            try:
                text_content = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                text_content = file_bytes.decode("latin-1", errors="replace")

            total_words = len(text_content.split())
            preview_snippet = "\n".join(text_content.strip().split("\n")[:12])
            summary = (
                f"### 📄 Dokumen/File Terlampir: `{filename}`\n"
                f"- **Format Dokumen:** {doc_type.upper()}\n"
                f"- **Ukuran:** {file_size:,} bytes | **{total_words:,} kata**\n"
                f"- **Pratinjau Awal:**\n```\n{preview_snippet[:500]}\n```\n"
                f"*⚡ Sumber Utama Aktif (Priority: 100 — Diutamakan di atas riwayat chat sebelumnya)*"
            )

            new_doc = UploadedDocument(
                id=doc_id,
                file_hash=file_hash,
                filename=filename,
                file_type=doc_type,
                file_size=file_size,
                page_count=1,
                sheet_count=0,
                summary=summary,
                metadata_json={
                    "total_words": total_words,
                    "raw_text": text_content[:50000]
                }
            )
            db.add(new_doc)
            db.flush()

            chunk_record = DocumentChunk(
                document_id=doc_id,
                chunk_index=0,
                page_number=1,
                title=f"{filename} (Full Content)",
                content=text_content[:20000],
                token_count=int(total_words * 1.3),
                keywords=" ".join(tokenize_text(text_content[:2000])[:25]),
                vector_json=_compute_term_freq(tokenize_text(text_content[:2000])),
                metadata_json={"raw_text": text_content[:20000]}
            )
            db.add(chunk_record)
            db.commit()
            logger.info(f"Indexed {doc_type.upper()} {filename}: {total_words} words.")

            return {
                "document_id": doc_id,
                "file_hash": file_hash,
                "filename": filename,
                "file_type": doc_type,
                "page_count": 1,
                "sheet_count": 0,
                "summary": summary,
                "raw_text": text_content,
                "is_cached": False,
                "source": "newly_parsed"
            }

        elif doc_type == "image":
            summary = (
                f"### 🖼️ Gambar/Screenshot Acuan: `{filename}`\n"
                f"- **Ukuran File:** {file_size:,} bytes\n"
                f"- **Status:** File visual diterima sebagai acuan tata letak/desain (Priority: 100)"
            )
            new_doc = UploadedDocument(
                id=doc_id,
                file_hash=file_hash,
                filename=filename,
                file_type="image",
                file_size=file_size,
                page_count=1,
                sheet_count=0,
                summary=summary,
                metadata_json={"filename": filename, "file_size": file_size}
            )
            db.add(new_doc)
            db.commit()
            logger.info(f"Indexed image reference {filename}.")

            return {
                "document_id": doc_id,
                "file_hash": file_hash,
                "filename": filename,
                "file_type": "image",
                "page_count": 1,
                "sheet_count": 0,
                "summary": summary,
                "is_cached": False,
                "source": "newly_parsed"
            }

        else:
            raise ValueError(f"Format file '{file_ext}' tidak dapat diproses.")

    # ─── 6. RAG Retrieval Engine (Top 3 Chunks Only) ───────────────────────────

    def retrieve_top_chunks(
        self,
        document_id: str,
        user_query: str,
        db: Session,
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Retrieves ONLY the Top 3-5 most relevant chunks from the database
        using BM25 & Term Frequency Vector Cosine Similarity.
        This ensures LLM only receives ~400-800 tokens instead of 100,000 tokens!
        """
        query_tokens = tokenize_text(user_query)
        if not query_tokens:
            query_tokens = user_query.lower().split()

        query_vec = _compute_term_freq(query_tokens)

        # Fetch chunks from DB
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).all()
        if not chunks:
            return []

        scored_chunks = []
        for ch in chunks:
            ch_vec = ch.vector_json or {}
            sim = vector_cosine_similarity(query_vec, ch_vec)

            # Keyword presence boosting (for SKUs, DO numbers, product names)
            text_lower = ch.content.lower()
            keyword_hits = sum(1 for q in query_tokens if q in text_lower)
            boosted_score = sim + (keyword_hits * 0.15)

            scored_chunks.append({
                "chunk_id": ch.id,
                "chunk_index": ch.chunk_index,
                "page_number": ch.page_number,
                "title": ch.title,
                "content": ch.content,
                "token_count": ch.token_count,
                "relevance_score": round(boosted_score, 4)
            })

        # Sort descending by score
        scored_chunks.sort(key=lambda x: x["relevance_score"], reverse=True)
        return scored_chunks[:top_k]

    # ─── 7. Excel Structured Aggregator Engine (0 Token Fast Path) ────────────

    def query_excel_structure(
        self,
        document_id: str,
        user_query: str,
        db: Session
    ) -> Optional[str]:
        """
        Resolves mathematical or aggregation questions on uploaded Excel data
        directly from pre-computed metrics without calling LLM (0 token cost).
        """
        tables = db.query(DocumentExcelTable).filter(DocumentExcelTable.document_id == document_id).all()
        if not tables:
            return None

        clean_q = user_query.lower()
        # Check if user asks for total, average, max, min, or sheet overview
        is_total = any(k in clean_q for k in ["total", "jumlah", "berapa sum", "akumulasi"])
        is_avg = any(k in clean_q for k in ["rata-rata", "average", "rata rata", "mean"])
        is_max = any(k in clean_q for k in ["tertinggi", "terbesar", "maksimum", "max"])
        is_min = any(k in clean_q for k in ["terendah", "terkecil", "minimum", "min"])

        results = []
        for tbl in tables:
            num_stats = tbl.numerical_stats or {}
            matched_metrics = []

            for col_name, st in num_stats.items():
                col_lower = col_name.lower()
                # Check if this column is queried or if asking general totals
                if any(w in clean_q for w in col_lower.split("_")) or is_total or is_avg:
                    if is_total and "sum" in st:
                        matched_metrics.append(f"- **Total {col_name}:** **{st['sum']:,.2f}**")
                    elif is_avg and "mean" in st:
                        matched_metrics.append(f"- **Rata-rata {col_name}:** **{st['mean']:,.2f}**")
                    elif is_max and "max" in st:
                        matched_metrics.append(f"- **Nilai Tertinggi {col_name}:** **{st['max']:,.2f}**")
                    elif is_min and "min" in st:
                        matched_metrics.append(f"- **Nilai Terendah {col_name}:** **{st['min']:,.2f}**")

            if matched_metrics:
                results.append(f"#### 📊 Sheet `{tbl.sheet_name}` ({tbl.row_count:,} baris):")
                results.extend(matched_metrics)

        if results:
            header = "### 📊 Hasil Ringkasan Data Spreadsheet\n"
            return header + "\n".join(results)

        return None


# Singleton instance
document_service = DocumentService()
