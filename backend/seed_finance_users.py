from passlib.context import CryptContext
from app.models.analytics.models import AppUser
from app.database import AnalyticsSessionLocal

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed_finance_users():
    db = AnalyticsSessionLocal()
    try:
        finance_users = [
            {
                "username": "margono",
                "password": "margono1",
                "full_name": "Margono",
                "role": "finance",
                "cabang": "all",
                "email": "margono@pengajaran.com",
            },
            {
                "username": "mery",
                "password": "mery2",
                "full_name": "Mery Maydita Sari",
                "role": "finance",
                "cabang": "all",
                "email": "mery@pengajaran.com",
            },
        ]

        created = 0
        updated = 0
        for u in finance_users:
            existing = db.query(AppUser).filter_by(username=u["username"]).first()
            hashed = pwd.hash(u["password"])
            if existing:
                existing.full_name = u["full_name"]
                existing.role = u["role"]
                existing.cabang = u["cabang"]
                existing.id_gudang_access = u["cabang"]
                existing.email = u["email"]
                existing.hashed_password = hashed
                existing.is_active = True
                updated += 1
            else:
                new_u = AppUser(
                    username=u["username"],
                    email=u["email"],
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
        print(f"Finance users seed completed: {created} created, {updated} updated.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_finance_users()

