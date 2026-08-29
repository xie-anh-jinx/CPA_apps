import pandas as pd
from io import BytesIO, StringIO
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_analytics_db
import datetime

router = APIRouter(tags=["export"])

@router.get("/csv")
def export_csv(
    report_type: str = Query(..., description="inventory, sales, distributions, crm"),
    date_range: str = Query("this_month"),
    db: Session = Depends(get_analytics_db)
):
    """Export data ke format CSV yang kompatibel dengan Excel"""
    try:
        if report_type == "inventory":
            # Export Inventory Balances
            query = text("""
                SELECT p.id_barang, p.nama_barang, p.kategori,
                       g.nama_gudang, b.total_on_hand, b.total_available,
                       b.hpp_avg, (b.total_available * b.hpp_avg) as nilai_persediaan
                FROM analytics.inventory_balances b
                JOIN analytics.products p ON b.id_barang = p.id_barang
                JOIN analytics.warehouses g ON b.id_gudang = g.id_gudang
            """)
        elif report_type == "sales":
            # Export Sales Orders
            query = text("""
                SELECT so.nomor, so.tanggal, c.nama as nama_customer,
                       so.total_nilai, so.status, so.salesman
                FROM analytics.sales_orders so
                LEFT JOIN analytics.customers c ON so.customer_id = c.id_customer
            """)
        elif report_type == "distributions":
            # Export Deliveries
            query = text("""
                SELECT d.nomor, d.tanggal, c.nama as nama_customer, c.kota as kota_tujuan,
                       d.status, d.waktu_kirim, d.waktu_sampai, d.driver, d.plat_nomor
                FROM analytics.deliveries d
                LEFT JOIN analytics.customers c ON d.customer_id = c.id_customer
            """)
        elif report_type == "crm":
            # Export Opportunities
            query = text("""
                SELECT o.title, c.nama as nama_customer, o.stage,
                       o.expected_value, o.probability, o.close_date
                FROM analytics.opportunities o
                LEFT JOIN analytics.customers c ON o.customer_id = c.id_customer
            """)
        else:
            raise HTTPException(status_code=400, detail="Invalid report_type")
        
        # Eksekusi dan muat ke Pandas DataFrame
        result = db.execute(query)
        columns = result.keys()
        data = result.fetchall()
        
        df = pd.DataFrame(data, columns=columns)
        
        # Ubah ke CSV
        stream = StringIO()
        df.to_csv(stream, index=False)
        
        response = StreamingResponse(iter([stream.getvalue()]), media_type="text/csv")
        filename = f"Laporan_{report_type}_{datetime.date.today().isoformat()}.csv"
        response.headers["Content-Disposition"] = f"attachment; filename={filename}"
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
