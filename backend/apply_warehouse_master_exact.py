"""
Sync master 120 warehouse records from clean user data into:
1. operational.warehouses (cpa_analytics)
2. public.gudang (cpa_existing)
3. operational.deliveries (cpa_analytics) - update nama_gudang
"""
import json
from sqlalchemy import text
from app.database import analytics_engine, existing_engine

KANTOR_MAP = {
    'HO - Balikpapan': '01',
    'Makasar': '02',
    'Kendari': '03',
    'Manado': '04',
    'Palu': '05',
    'Sampit': '06',
    'Banjarmasin': '07',
    'Mapa': '08'
}

with open('/app/user_warehouses_clean.json') as f:
    records = json.load(f)

print(f"Loaded {len(records)} records.")

with analytics_engine.begin() as conn_an:
    for r in records:
        id_g = r['id_gudang']
        nama = r['nama_gudang']
        kantor = r['kantor']
        id_kantor = KANTOR_MAP.get(kantor, '01')
        telpon = r.get('telpon', '')
        alamat = r.get('alamat', '')
        kontak = r.get('kontak', '')
        dsm = r.get('dsm', '')

        conn_an.execute(text("""
            INSERT INTO operational.warehouses (
                id_gudang, nama_gudang, id_kantor, nama_kantor, alamat, telpon,
                is_active, synced_at, kontak_person, dsm
            ) VALUES (:id_gudang, :nama_gudang, :id_kantor, :nama_kantor, :alamat, :telpon, true, NOW(), :kontak, :dsm)
            ON CONFLICT (id_gudang) DO UPDATE SET
                nama_gudang = EXCLUDED.nama_gudang,
                id_kantor = EXCLUDED.id_kantor,
                nama_kantor = EXCLUDED.nama_kantor,
                alamat = EXCLUDED.alamat,
                telpon = EXCLUDED.telpon,
                is_active = true,
                synced_at = NOW(),
                kontak_person = EXCLUDED.kontak_person,
                dsm = EXCLUDED.dsm;
        """), {
            "id_gudang": id_g,
            "nama_gudang": nama,
            "id_kantor": id_kantor,
            "nama_kantor": kantor,
            "alamat": alamat,
            "telpon": telpon,
            "kontak": kontak,
            "dsm": dsm
        })

    # Update operational.deliveries
    res_del = conn_an.execute(text("""
        UPDATE operational.deliveries d
        SET nama_gudang = w.nama_gudang
        FROM operational.warehouses w
        WHERE d.id_gudang = w.id_gudang;
    """))
    print(f"Updated deliveries nama_gudang: {res_del.rowcount} rows.")

import psycopg2
from psycopg2.extras import execute_batch

conn_ex = psycopg2.connect(
    dbname="cpa_existing",
    user="postgres",
    password="postgres123",
    host="cpa_db_existing",
    port=5432
)
conn_ex.autocommit = True
cur_ex = conn_ex.cursor()

ex_data = []
for r in records:
    id_g = r['id_gudang']
    nama = r['nama_gudang']
    kantor = r['kantor']
    id_kantor = KANTOR_MAP.get(kantor, '01')
    telpon = r.get('telpon', '')
    alamat = r.get('alamat', '')
    ex_data.append((id_g, nama, id_kantor, telpon, alamat))

sql_ex = """
    INSERT INTO public.gudang (
        id_gudang, gudang, id_kantor, telpon, alamat, blind, stokopname
    ) VALUES (%s, %s, %s, %s, %s, true, false)
    ON CONFLICT (id_gudang) DO UPDATE SET
        gudang = EXCLUDED.gudang,
        id_kantor = EXCLUDED.id_kantor,
        telpon = EXCLUDED.telpon,
        alamat = EXCLUDED.alamat;
"""
execute_batch(cur_ex, sql_ex, ex_data)
cur_ex.close()
conn_ex.close()
print("Successfully updated public.gudang in cpa_existing!")


print("Successfully updated both databases with 120 master warehouses!")
