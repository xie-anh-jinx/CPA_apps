import random
from datetime import datetime, timedelta
from app.database import AnalyticsSessionLocal
from app.models.analytics.models import CustomerRecord, CRMOpportunity, CRMComplaint
from sqlalchemy import func

db = AnalyticsSessionLocal()
try:
    print("Seeding CRM Data...")
    customers = db.query(CustomerRecord).order_by(func.random()).limit(50).all()
    
    stages = ["prospect", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]
    titles = [
        "Pengadaan Barang Tahunan", "Proyek Infrastruktur Kaltim", 
        "Suplai Bahan Baku Q3", "Tender Pemerintah Daerah", 
        "Ekspansi Pabrik Kelapa Sawit", "Pemeliharaan Mesin Berat",
        "Pengadaan Armada Logistik"
    ]
    
    for c in customers:
        # Create 1-3 opportunities per customer
        for _ in range(random.randint(1, 3)):
            stage = random.choice(stages)
            prob = random.randint(10, 90) if stage not in ["closed_won", "closed_lost"] else (100 if stage == "closed_won" else 0)
            opp = CRMOpportunity(
                id_customer=c.id_kontak,
                nama_customer=c.nama_customer,
                title=f"{random.choice(titles)} - {c.nama_customer[:15]}",
                stage=stage,
                probability=prob,
                expected_value=random.randint(10, 500) * 1000000, # 10jt - 500jt
                expected_close_date=datetime.now().date() + timedelta(days=random.randint(-30, 90)),
                id_salesman=c.id_salesman
            )
            db.add(opp)
            
        # Create 0-1 complaints per customer
        if random.random() > 0.7:
            comp = CRMComplaint(
                id_customer=c.id_kontak,
                nama_customer=c.nama_customer,
                no_referensi=f"REF-{random.randint(1000,9999)}",
                complaint_type=random.choice(["delivery", "product", "service", "billing"]),
                subject="Keterlambatan pengiriman" if random.random() > 0.5 else "Barang rusak saat diterima",
                priority=random.choice(["low", "medium", "high", "critical"]),
                status=random.choice(["open", "in_progress", "resolved"])
            )
            db.add(comp)
            
    db.commit()
    print("Seeding Complete!")
except Exception as e:
    db.rollback()
    print("Error:", e)
finally:
    db.close()
