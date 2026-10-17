from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import date

from app.database import get_analytics_db

router = APIRouter()


class ForecastData(BaseModel):
    product_id: str
    product_name: str
    horizon_days: int
    predicted_qty: float
    lower_bound: float
    upper_bound: float
    model_name: str
    forecast_date: date


class ProductSummary(BaseModel):
    product_id: str
    product_name: str
    best_model: Optional[str] = "seasonal_naive"
    wape: Optional[float] = None
    active_days: Optional[int] = 0
    bias: Optional[float] = None
    mae: Optional[float] = None
    forecast_7d: Optional[float] = None
    forecast_30d: Optional[float] = None
    forecast_90d: Optional[float] = None


@router.get("/summary")
def get_forecast_overview(db: Session = Depends(get_analytics_db)):
    """
    High-level KPIs for Demand Forecasting dashboard.
    """
    # Total products being tracked
    total_query = text("""
        SELECT COUNT(*) as total_count,
               AVG(best_model_wape) as avg_wape
        FROM forecast_products
        WHERE is_active = TRUE
    """)
    overview_row = db.execute(total_query).fetchone()
    total_products = overview_row[0] if overview_row else 0
    avg_wape = float(overview_row[1]) if overview_row and overview_row[1] is not None else None

    # Total 30-day forecasted demand volume across all products
    demand_30d_query = text("""
        SELECT SUM(predicted_qty) as total_30d
        FROM forecast_results
        WHERE horizon_days = 30
    """)
    demand_row = db.execute(demand_30d_query).fetchone()
    total_30d_demand = float(demand_row[0]) if demand_row and demand_row[0] is not None else 0.0

    # Best model distribution count
    model_dist_query = text("""
        SELECT COALESCE(best_model, 'unknown') as model_name, COUNT(*) as cnt
        FROM forecast_products
        WHERE is_active = TRUE
        GROUP BY best_model
        ORDER BY cnt DESC
    """)
    model_rows = db.execute(model_dist_query).fetchall()
    model_distribution = [{"model": r[0], "count": r[1]} for r in model_rows]

    return {
        "total_forecast_products": total_products,
        "average_wape": round(avg_wape, 2) if avg_wape is not None else None,
        "total_30d_predicted_units": round(total_30d_demand, 2),
        "model_distribution": model_distribution,
    }


@router.get("/products", response_model=List[Dict[str, Any]])
def get_forecast_products(db: Session = Depends(get_analytics_db)):
    """
    Get list of all active products for forecasting and their latest metrics & forecast figures.
    """
    query = text("""
        SELECT fp.product_id, fp.product_name, fp.best_model, fp.best_model_wape,
               fp.active_days, mm.bias, mm.mae,
               f7.predicted_qty as pred_7d,
               f30.predicted_qty as pred_30d,
               f90.predicted_qty as pred_90d,
               fp.last_forecast
        FROM forecast_products fp
        LEFT JOIN model_metrics mm ON mm.product_id = fp.product_id 
             AND mm.model_name = fp.best_model 
             AND mm.horizon_days = 30
             AND mm.evaluated_at = (
                 SELECT MAX(evaluated_at) FROM model_metrics 
                 WHERE product_id = fp.product_id AND model_name = fp.best_model
             )
        LEFT JOIN forecast_results f7 ON f7.product_id = fp.product_id AND f7.horizon_days = 7
        LEFT JOIN forecast_results f30 ON f30.product_id = fp.product_id AND f30.horizon_days = 30
        LEFT JOIN forecast_results f90 ON f90.product_id = fp.product_id AND f90.horizon_days = 90
        WHERE fp.is_active = TRUE
        ORDER BY fp.active_days DESC
    """)
    result = db.execute(query).fetchall()

    return [
        {
            "product_id": r[0],
            "product_name": r[1],
            "best_model": r[2] or "seasonal_naive",
            "wape": round(float(r[3]), 2) if r[3] is not None else None,
            "active_days": r[4] or 0,
            "bias": round(float(r[5]), 2) if r[5] is not None else None,
            "mae": round(float(r[6]), 2) if r[6] is not None else None,
            "forecast_7d": round(float(r[7]), 2) if r[7] is not None else None,
            "forecast_30d": round(float(r[8]), 2) if r[8] is not None else None,
            "forecast_90d": round(float(r[9]), 2) if r[9] is not None else None,
            "last_forecast": r[10].isoformat() if r[10] else None,
        }
        for r in result
    ]


@router.get("/products/{product_id}")
def get_product_forecast(product_id: str, db: Session = Depends(get_analytics_db)):
    """
    Get 7, 30, and 90 days forecast for a specific product along with confidence intervals.
    """
    query = text("""
        SELECT product_name, horizon_days, predicted_qty, lower_bound, upper_bound, 
               model_name, forecast_date, generated_at
        FROM forecast_results
        WHERE product_id = :pid
        ORDER BY horizon_days ASC
    """)
    
    results = db.execute(query, {"pid": product_id}).fetchall()
    
    if not results:
        # Fallback to check product exists in forecast_products or daily_sales
        p_info = db.execute(
            text("SELECT product_name FROM forecast_products WHERE product_id = :pid"),
            {"pid": product_id}
        ).fetchone()
        if not p_info:
            p_info = db.execute(
                text("SELECT product_name FROM daily_sales WHERE product_id = :pid LIMIT 1"),
                {"pid": product_id}
            ).fetchone()
        
        if not p_info:
            raise HTTPException(status_code=404, detail="Product not found")
            
        return {
            "product_id": product_id,
            "product_name": p_info[0],
            "forecast_date": date.today().isoformat(),
            "model_name": "seasonal_naive",
            "wape": None,
            "bias": None,
            "bias_label": "NEUTRAL",
            "forecasts": {},
        }

    # Accuracy metrics
    model_name = results[0][5]
    metrics_query = text("""
        SELECT wape, bias, mae, rmse
        FROM model_metrics
        WHERE product_id = :pid AND model_name = :model_name AND horizon_days = 30
        ORDER BY evaluated_at DESC LIMIT 1
    """)
    metrics_row = db.execute(metrics_query, {"pid": product_id, "model_name": model_name}).fetchone()
    
    wape = float(metrics_row[0]) if metrics_row and metrics_row[0] is not None else None
    bias = float(metrics_row[1]) if metrics_row and metrics_row[1] is not None else None
    mae = float(metrics_row[2]) if metrics_row and metrics_row[2] is not None else None
    rmse = float(metrics_row[3]) if metrics_row and metrics_row[3] is not None else None
    
    bias_label = "NEUTRAL"
    if bias is not None:
        if bias > 5:
            bias_label = "OVERFORECAST"
        elif bias < -5:
            bias_label = "UNDERFORECAST"

    forecasts = {}
    for r in results:
        days = f"{r[1]}_days"
        forecasts[days] = {
            "horizon_days": r[1],
            "predicted_qty": float(r[2]),
            "lower_bound": float(r[3]) if r[3] is not None else float(r[2]) * 0.8,
            "upper_bound": float(r[4]) if r[4] is not None else float(r[2]) * 1.2,
        }

    return {
        "product_id": product_id,
        "product_name": results[0][0],
        "forecast_date": results[0][6].isoformat() if hasattr(results[0][6], "isoformat") else str(results[0][6]),
        "model_name": model_name,
        "wape": round(wape, 2) if wape is not None else None,
        "bias": round(bias, 2) if bias is not None else None,
        "mae": round(mae, 2) if mae is not None else None,
        "rmse": round(rmse, 2) if rmse is not None else None,
        "bias_label": bias_label,
        "forecasts": forecasts,
    }


@router.get("/products/{product_id}/history")
def get_product_history(product_id: str, days: int = Query(90, ge=7, le=730), db: Session = Depends(get_analytics_db)):
    """
    Get historical daily sales data for charting alongside forecast.
    """
    query = text("""
        SELECT date, quantity_sold, revenue, avg_price
        FROM daily_sales
        WHERE product_id = :pid 
          AND date >= (
              SELECT COALESCE(MAX(date), CURRENT_DATE) - (:days || ' days')::INTERVAL 
              FROM daily_sales 
              WHERE product_id = :pid
          )
        ORDER BY date ASC
    """)
    results = db.execute(query, {"pid": product_id, "days": days}).fetchall()
    
    return [
        {
            "date": r[0].isoformat() if hasattr(r[0], "isoformat") else str(r[0]),
            "quantity_sold": float(r[1]),
            "revenue": float(r[2]) if r[2] is not None else 0.0,
            "avg_price": float(r[3]) if r[3] is not None else 0.0,
        }
        for r in results
    ]


@router.get("/products/{product_id}/models")
def get_product_models(product_id: str, db: Session = Depends(get_analytics_db)):
    """
    Get all candidate models evaluated for this product with their accuracy metrics.
    """
    query = text("""
        SELECT model_name, horizon_days, mae, rmse, wape, bias, n_samples, evaluated_at
        FROM model_metrics
        WHERE product_id = :pid
        ORDER BY horizon_days ASC, wape ASC
    """)
    results = db.execute(query, {"pid": product_id}).fetchall()

    return [
        {
            "model_name": r[0],
            "horizon_days": r[1],
            "mae": round(float(r[2]), 2) if r[2] is not None else None,
            "rmse": round(float(r[3]), 2) if r[3] is not None else None,
            "wape": round(float(r[4]), 2) if r[4] is not None else None,
            "bias": round(float(r[5]), 2) if r[5] is not None else None,
            "n_samples": r[6],
            "evaluated_at": r[7].isoformat() if hasattr(r[7], "isoformat") else str(r[7]),
        }
        for r in results
    ]
