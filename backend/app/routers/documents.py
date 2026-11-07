"""
PADI ERP / CPA Analytics — Document Upload & RAG API Router
═══════════════════════════════════════════════════════════
Endpoints for PDF & Excel document ingestion, SHA-256 deduplication,
summary retrieval, and targeted chunk retrieval.
"""

import base64
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_analytics_db
from app.mcp.auth import MCPUser, authenticate_jwt, create_role_user
from app.models.analytics.models import UploadedDocument
from app.services.document_service import document_service

router = APIRouter(prefix="/documents", tags=["Document RAG"])


def resolve_user(request: Request, db: Session) -> MCPUser:
    """Resolves MCPUser context from Bearer token or role headers."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        success, user, _ = authenticate_jwt(token, db)
        if success and user:
            return user
    role = request.headers.get("X-CPA-Role", "admin").lower()
    return create_role_user(role=role, username=f"doc_user_{role}")


class DocumentQueryRequest(BaseModel):
    query: str
    top_k: int = 3


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_analytics_db)
):
    """
    Uploads and parses a PDF or Excel document.
    - Uses SHA-256 deduplication (instant return if already uploaded)
    - Extracts text/sheets once
    - Indexes chunks for RAG with 0 duplicate LLM tokens
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nama file tidak valid.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="File kosong.")

    try:
        result = document_service.process_file_bytes(
            file_bytes=file_bytes,
            filename=file.filename,
            db=db
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memproses dokumen: {str(e)}")


@router.get("/{document_id}")
async def get_document_info(
    document_id: str,
    db: Session = Depends(get_analytics_db)
):
    """Retrieves metadata and executive summary of an uploaded document."""
    doc = db.query(UploadedDocument).filter(UploadedDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")

    return {
        "document_id": doc.id,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "file_size": doc.file_size,
        "page_count": doc.page_count,
        "sheet_count": doc.sheet_count,
        "summary": doc.summary,
        "created_at": doc.created_at.strftime("%Y-%m-%d %H:%M:%S") if doc.created_at else None
    }


@router.post("/{document_id}/query")
async def query_document_chunks(
    document_id: str,
    payload: DocumentQueryRequest,
    db: Session = Depends(get_analytics_db)
):
    """
    Retrieves ONLY the Top 3-5 relevant chunks for a question (RAG).
    Ensures DeepSeek receives minimal tokens (~400 tokens) instead of the entire PDF.
    """
    doc = db.query(UploadedDocument).filter(UploadedDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan.")

    # Check if asking for summary
    clean_q = payload.query.lower()
    if any(k in clean_q for k in ["ringkas", "summary", "rangkum", "apa isi", "overview"]):
        return {
            "document_id": doc.id,
            "filename": doc.filename,
            "intent": "summary_cache_hit",
            "content": doc.summary,
            "tokens_saved": 1500,
            "source": "summary_cache"
        }

    # If Excel, check structured calculation
    if doc.file_type == "excel":
        structured_ans = document_service.query_excel_structure(doc.id, payload.query, db)
        if structured_ans:
            return {
                "document_id": doc.id,
                "filename": doc.filename,
                "intent": "excel_structured_calc",
                "content": structured_ans,
                "source": "sql_structured_table"
            }

    # If PDF or detailed question, retrieve Top 3 chunks
    chunks = document_service.retrieve_top_chunks(doc.id, payload.query, db, top_k=payload.top_k)
    return {
        "document_id": doc.id,
        "filename": doc.filename,
        "intent": "rag_chunks",
        "chunks_count": len(chunks),
        "chunks": chunks
    }
