"""
Router — CRM Activities, Opportunities, Complaints, Follow-ups
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, date

from app.database import get_analytics_db
from app.models.analytics.models import CRMActivity, CRMOpportunity, CRMComplaint, CRMFollowupReminder
from app.routers.auth import CurrentUser

router = APIRouter()


# ─── Pydantic Schemas ──────────────────────────────────────────────────────────
class ActivityCreate(BaseModel):
    id_customer: str
    activity_type: str  # call, meeting, email, visit
    subject: str
    description: Optional[str] = None
    outcome: Optional[str] = None
    activity_date: datetime
    next_followup_date: Optional[date] = None
    id_pegawai: Optional[str] = None


class OpportunityCreate(BaseModel):
    id_customer: str
    nama_customer: Optional[str] = None
    title: str
    description: Optional[str] = None
    stage: str = "prospect"
    probability: Optional[float] = None
    expected_value: Optional[float] = None
    expected_close_date: Optional[date] = None
    id_salesman: Optional[str] = None
    products: Optional[list] = None


class ComplaintCreate(BaseModel):
    id_customer: str
    nama_customer: Optional[str] = None
    no_referensi: Optional[str] = None
    complaint_type: str
    subject: str
    description: Optional[str] = None
    priority: str = "medium"


# ─── Activities ────────────────────────────────────────────────────────────────
@router.get("/activities")
async def list_activities(
    id_customer: Optional[str] = None,
    activity_type: Optional[str] = None,
    id_pegawai: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    conditions = ["1=1"]
    params = {"limit": limit, "offset": (page - 1) * limit}
    if id_customer:
        conditions.append("a.id_customer = :id_customer")
        params["id_customer"] = id_customer
    if activity_type:
        conditions.append("a.activity_type = :activity_type")
        params["activity_type"] = activity_type
    if id_pegawai:
        conditions.append("a.id_pegawai = :id_pegawai")
        params["id_pegawai"] = id_pegawai

    # Role-based Row-Level Security
    if current_user and current_user.role == "sales" and current_user.id_pegawai:
        conditions.append("a.id_pegawai = :user_pegawai")
        params["user_pegawai"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT a.*, c.nama_customer
        FROM crm.activities a
        LEFT JOIN operational.customers c ON a.id_customer = c.id_kontak
        WHERE {' AND '.join(conditions)}
        ORDER BY a.activity_date DESC
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.post("/activities", status_code=201)
async def create_activity(
    data: ActivityCreate,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    activity = CRMActivity(
        **data.model_dump(),
        created_by=current_user.username,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return {"id": activity.id, "message": "Aktivitas berhasil disimpan"}


# ─── Opportunities / Pipeline ─────────────────────────────────────────────────
@router.get("/opportunities")
async def list_opportunities(
    stage: Optional[str] = None,
    id_salesman: Optional[str] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    conditions = ["1=1"]
    params = {}
    if stage:
        conditions.append("o.stage = :stage")
        params["stage"] = stage
    if id_salesman:
        conditions.append("o.id_salesman = :id_salesman")
        params["id_salesman"] = id_salesman

    # Role-based Row-Level Security
    if current_user and current_user.role == "sales" and current_user.id_pegawai:
        conditions.append("o.id_salesman = :user_pegawai")
        params["user_pegawai"] = current_user.id_pegawai

    rows = db.execute(text(f"""
        SELECT o.*,
            COALESCE(o.expected_value * o.probability / 100, 0) AS weighted_value
        FROM crm.opportunities o
        WHERE {' AND '.join(conditions)}
        ORDER BY o.expected_close_date ASC, o.expected_value DESC
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.post("/opportunities", status_code=201)
async def create_opportunity(
    data: OpportunityCreate,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    opp = CRMOpportunity(
        **data.model_dump(),
        created_by=current_user.username,
    )
    db.add(opp)
    db.commit()
    db.refresh(opp)
    return {"id": opp.id, "message": "Opportunity berhasil dibuat"}


@router.patch("/opportunities/{opp_id}/stage")
async def update_opportunity_stage(
    opp_id: int,
    stage: str,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    opp = db.query(CRMOpportunity).get(opp_id)
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity tidak ditemukan")
    opp.stage = stage
    db.commit()
    return {"message": "Stage updated", "stage": stage}


# ─── Complaints ───────────────────────────────────────────────────────────────
@router.get("/complaints")
async def list_complaints(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    id_customer: Optional[str] = None,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    conditions = ["1=1"]
    params = {}
    if status:
        conditions.append("c.status = :status")
        params["status"] = status
    if priority:
        conditions.append("c.priority = :priority")
        params["priority"] = priority
    if id_customer:
        conditions.append("c.id_customer = :id_customer")
        params["id_customer"] = id_customer

    rows = db.execute(text(f"""
        SELECT * FROM crm.complaints c
        WHERE {' AND '.join(conditions)}
        ORDER BY c.created_at DESC
    """), params).mappings().all()
    return [dict(r) for r in rows]


@router.post("/complaints", status_code=201)
async def create_complaint(
    data: ComplaintCreate,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    complaint = CRMComplaint(
        **data.model_dump(),
        created_by=current_user.username,
        assigned_to=current_user.username,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return {"id": complaint.id, "message": "Keluhan berhasil dicatat"}


@router.patch("/complaints/{complaint_id}/resolve")
async def resolve_complaint(
    complaint_id: int,
    resolution: str,
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    complaint = db.query(CRMComplaint).get(complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Keluhan tidak ditemukan")
    complaint.status = "resolved"
    complaint.resolution = resolution
    complaint.resolved_at = datetime.now()
    db.commit()
    return {"message": "Keluhan diselesaikan"}


# ─── Pipeline Summary ─────────────────────────────────────────────────────────
@router.get("/pipeline-summary")
async def get_pipeline_summary(
    db: Session = Depends(get_analytics_db),
    current_user: CurrentUser = None,
):
    """Ringkasan pipeline per stage."""
    extra = ""
    params = {}
    if current_user and current_user.role == "sales" and current_user.id_pegawai:
        extra = " AND id_salesman = :user_pegawai"
        params["user_pegawai"] = current_user.id_pegawai

    # Total Opps & Value (Active)
    kpi = db.execute(text(f"""
        SELECT
            COUNT(*) AS opportunities_count,
            SUM(expected_value) AS total_value
        FROM crm.opportunities
        WHERE stage NOT IN ('closed_won', 'closed_lost') {extra}
    """), params).mappings().first()

    # Win Rate
    win = db.execute(text(f"""
        SELECT
            SUM(CASE WHEN stage = 'closed_won' THEN 1 ELSE 0 END) AS won_count,
            SUM(CASE WHEN stage IN ('closed_won', 'closed_lost') THEN 1 ELSE 0 END) AS closed_count
        FROM crm.opportunities
        WHERE 1=1 {extra}
    """), params).mappings().first()
    win_rate = (win["won_count"] / win["closed_count"] * 100) if win and win["closed_count"] else 0

    # Open Complaints
    complaints = db.execute(text("""
        SELECT COUNT(*) AS open_complaints
        FROM crm.complaints
        WHERE status != 'resolved'
    """)).scalar()

    return {
        "opportunities_count": kpi["opportunities_count"] or 0,
        "total_value": kpi["total_value"] or 0,
        "win_rate": win_rate,
        "open_complaints": complaints or 0
    }
