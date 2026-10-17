import csv
from app.database import SessionLocal_Existing
from sqlalchemy import text

def export_data():
    db = SessionLocal_Existing()
    sql = text("""
        SELECT 
            sb.id_barang,
            b.nama_barang,
            sb.batch,
            sb.tanggal as tanggal_masuk,
            sb.stok as saldo_sisa
        FROM public.stok_barang sb
        LEFT JOIN public.barang b ON sb.id_barang = b.id_barang
        WHERE sb.id_gudang = '005' AND sb.stok > 0
        ORDER BY sb.id_barang, sb.tanggal DESC
    """)
    rows = db.execute(sql).fetchall()
    
    with open('/root/.gemini/antigravity-ide/brain/5a7b491d-806f-45b1-93b9-f17322ef712d/stock_gudang_005_batch.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["id_barang", "nama_barang", "batch", "tanggal_masuk", "saldo_sisa"])
        for r in rows:
            writer.writerow([r[0], r[1], r[2], r[3], r[4]])
    
    db.close()
    print("Export done")

if __name__ == "__main__":
    export_data()
