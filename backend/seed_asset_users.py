import os
from passlib.context import CryptContext
from app.models.analytics.models import AppUser
from app.database import AnalyticsSessionLocal

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = AnalyticsSessionLocal()

users_data = [
    {"full_name": "Gabriel Hengky", "username": "hengky", "cabang": "all", "role": "asset_staff"},
    {"full_name": "Abdulrahman Sangge", "username": "rahman", "cabang": "Manado, Gorontalo, Ambon, Bitung, Sofifi, Obi, Weda", "role": "asset_staff"},
    {"full_name": "James Pelealu", "username": "james", "cabang": "Manado, Gorontalo, Ambon, Bitung, Sofifi, Obi, Weda", "role": "asset_staff"},
    {"full_name": "Susanty Gladies M Santi", "username": "gladys", "cabang": "Manado, Gorontalo, Ambon, Bitung, Sofifi, Obi, Weda", "role": "asset_staff"},
    {"full_name": "Daniel Victor Lamboro", "username": "daniel", "cabang": "Palu, Morowali", "role": "asset_staff"},
    {"full_name": "Sri Yuyun", "username": "yuyun", "cabang": "Palu, Morowali", "role": "asset_staff"},
    {"full_name": "Abdul Hamid", "username": "hamid", "cabang": "Makassar", "role": "asset_staff"},
    {"full_name": "Marius Efradus Yulius Nggala", "username": "marius", "cabang": "Makassar", "role": "asset_staff"},
    {"full_name": "Grace Putri Mangaruk", "username": "grace", "cabang": "Makassar", "role": "asset_staff"},
    {"full_name": "Eko Wahyudi", "username": "eko", "cabang": "makassar, palu, kendari", "role": "asset_staff"},
    {"full_name": "Putri Mutiah", "username": "putri", "cabang": "kendari", "role": "asset_staff"},
    {"full_name": "La Ode Achmad As'Ad Hatu", "username": "aat", "cabang": "kendari", "role": "asset_staff"},
    {"full_name": "Arisandi", "username": "arisandi", "cabang": "sampit, palangkaraya, banjarmasin", "role": "asset_staff"},
    {"full_name": "Kades Battung", "username": "kades", "cabang": "all", "role": "asset_staff"},
    {"full_name": "Yusenda D. Sitompul", "username": "yusenda", "cabang": "all", "role": "asset_staff"},
    {"full_name": "Wahyudin", "username": "wahyudin", "cabang": "Balikpapan", "role": "asset_staff"},
    {"full_name": "Mahpudi Alfa Rubbi", "username": "pudi", "cabang": "Balikpapan", "role": "asset_staff"},
    {"full_name": "Jamhari", "username": "jamhari", "cabang": "Balikpapan", "role": "asset_staff"},
    {"full_name": "Roni Sandra", "username": "roni", "cabang": "Balikpapan", "role": "asset_staff"},
    {"full_name": "Gideon lae belo", "username": "gideon", "cabang": "Balikpapan", "role": "asset_staff"},
    {"full_name": "Richard", "username": "richard", "cabang": "Balikpapan, Manado, Bitung, Sofifi, Gorontalo, Sampit, Banjarmasin, Palangkaraya, Ambon, Weda", "role": "asset_staff"},
    {"full_name": "Yoga Ganesha", "username": "yoga", "cabang": "all", "role": "asset_staff"},
]

created = 0
updated = 0
for u in users_data:
    existing = db.query(AppUser).filter_by(username=u["username"]).first()
    hashed = pwd.hash(u["username"])  # default password = username
    if existing:
        existing.full_name = u["full_name"]
        existing.role = u["role"]
        existing.cabang = u["cabang"]
        existing.id_gudang_access = u["cabang"]
        existing.hashed_password = hashed
        existing.is_active = True
        updated += 1
    else:
        new_u = AppUser(
            username=u["username"],
            email=f"{u['username']}@pengajaran.com",
            full_name=u["full_name"],
            hashed_password=hashed,
            role=u["role"],
            cabang=u["cabang"],
            id_gudang_access=u["cabang"],
            is_active=True,
        )
        db.add(new_u)
        created += 1

db.commit()
print(f"Users seed completed successfully: {created} created, {updated} updated.")
db.close()

