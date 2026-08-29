from app.database import ExistingSessionLocal, AnalyticsSessionLocal
from sqlalchemy import text
from app.models.analytics.models import Product, Warehouse
from sqlalchemy.dialects.postgresql import insert

def seed_master_data():
    existing_db = ExistingSessionLocal()
    analytics_db = AnalyticsSessionLocal()

    try:
        # Sync Warehouses
        wh_query = text("""
            SELECT g.id_gudang, g.gudang as nama_gudang, g.id_kantor, g.parent, g.alamat
            FROM public.gudang g
        """)
        warehouses = existing_db.execute(wh_query).mappings().all()
        
        for w in warehouses:
            stmt = insert(Warehouse).values(
                id_gudang=w["id_gudang"],
                nama_gudang=w["nama_gudang"],
                id_kantor=w["id_kantor"],
                nama_kantor=w["id_kantor"], # Using id for name temporarily if kantor table is complex
                parent=w["parent"],
                alamat=w["alamat"]
            ).on_conflict_do_update(
                index_elements=["id_gudang"],
                set_={"nama_gudang": w["nama_gudang"], "alamat": w["alamat"]}
            )
            analytics_db.execute(stmt)
        
        # Sync Products
        prod_query = text("""
            SELECT 
                b.id_barang, b.nama_barang, b.nama_alias,
                b.id_kategori_barang, kb.kategori_barang as nama_kategori,
                b.id_brand
            FROM public.barang b
            LEFT JOIN public.kategori_barang kb ON b.id_kategori_barang = kb.id_kategori_barang
        """)
        products = existing_db.execute(prod_query).mappings().all()
        
        for p in products:
            stmt = insert(Product).values(
                id_barang=p["id_barang"],
                nama_barang=p["nama_barang"],
                nama_alias=p["nama_alias"],
                id_kategori=p["id_kategori_barang"],
                nama_kategori=p["nama_kategori"],
                id_brand=p["id_brand"]
            ).on_conflict_do_update(
                index_elements=["id_barang"],
                set_={
                    "nama_barang": p["nama_barang"],
                    "nama_kategori": p["nama_kategori"]
                }
            )
            analytics_db.execute(stmt)

        analytics_db.commit()
        print(f"✅ Synced {len(warehouses)} warehouses and {len(products)} products!")
    except Exception as e:
        analytics_db.rollback()
        print("Error:", e)
    finally:
        existing_db.close()
        analytics_db.close()

if __name__ == "__main__":
    seed_master_data()
