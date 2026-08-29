"""
Router — Alerts & Analytics KPI
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from app.database import get_analytics_db
from app.routers.auth import CurrentUser

router = APIRouter()


@router.get("/")
async def list_alerts(
    severity: Optional[str] = Query(None, description="info|warning|critical"),
    alert_type: Optional[str] = None,
    is_resolved: bool = False,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Daftar alert aktif."""
    conditions = ["is_resolved = :is_resolved"]
    params = {"is_resolved": is_resolved, "limit": limit, "offset": (page - 1) * limit}

    if severity:
        conditions.append("severity = :severity")
        params["severity"] = severity
    if alert_type:
        conditions.append("alert_type = :alert_type")
        params["alert_type"] = alert_type

    rows = db.execute(text(f"""
        SELECT ah.*, p.nama_barang, w.nama_gudang
        FROM analytics.alert_history ah
        LEFT JOIN operational.products p ON ah.id_barang = p.id_barang
        LEFT JOIN operational.warehouses w ON ah.id_gudang = w.id_gudang
        WHERE {' AND '.join(conditions)}
        ORDER BY
            CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
            created_at DESC
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()

    total = db.execute(text(f"""
        SELECT COUNT(*) FROM analytics.alert_history
        WHERE {' AND '.join(conditions)}
    """), {k: v for k, v in params.items() if k not in ["limit", "offset"]}).scalar()

    return {
        "data": [dict(r) for r in rows],
        "pagination": {"page": page, "limit": limit, "total": total},
    }


@router.patch("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Tandai alert sebagai resolved."""
    from datetime import datetime
    db.execute(text("""
        UPDATE analytics.alert_history
        SET is_resolved = true, resolved_at = :now
        WHERE id = :id
    """), {"id": alert_id, "now": datetime.now()})
    db.commit()
    return {"message": "Alert resolved"}


@router.get("/counts")
async def get_alert_counts(
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Hitung jumlah alert per severity dan type."""
    rows = db.execute(text("""
        SELECT alert_type, severity, COUNT(*) AS count
        FROM analytics.alert_history
        WHERE is_resolved = false
        GROUP BY alert_type, severity
        ORDER BY severity, alert_type
    """)).mappings().all()
    return [dict(r) for r in rows]
