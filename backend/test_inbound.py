import asyncio
from app.database import get_existing_db
from sqlalchemy import text

db = next(get_existing_db())

params = {"date_from": "2026-09-01", "date_to": "2026-09-16", "limit": 5, "offset": 0}

# Test 1: penerimaan
q1 = """
SELECT
    'penerimaan_barang'::text AS tipe,
    'Penerimaan Barang'::text AS tipe_label,
    p.no_penerimaan::text AS nomor,
    p.tgl_penerimaan AS tanggal,
    p.id_gudang,
    g.gudang AS nama_gudang,
    p.referensi::text AS referensi,
    p.keterangan::text,
    p.kode_user::text,
    (SELECT COALESCE(SUM(qty), 0) FROM penerimaan_detail WHERE no_penerimaan = p.no_penerimaan) AS total_qty,
    COALESCE(p.grandtotal, p.total, 0) AS total_nilai,
    p.status::text
FROM penerimaan p
LEFT JOIN gudang g ON p.id_gudang = g.id_gudang
WHERE p.tgl_penerimaan BETWEEN :date_from AND :date_to
"""
try:
    r1 = db.execute(text(q1), params).mappings().all()
    print("Q1 (penerimaan) success, count:", len(r1))
except Exception as e:
    print("Q1 error:", e)

# Test 2: penerimaan_gudang
q2 = """
SELECT
    'receipt_internal'::text AS tipe,
    'Receipt Internal Transfer'::text AS tipe_label,
    pg.no_penerimaan::text AS nomor,
    pg.tgl_penerimaan AS tanggal,
    pg.id_gudang,
    g.gudang AS nama_gudang,
    pg.referensi::text,
    pg.keterangan::text,
    pg.kode_user::text,
    (SELECT COALESCE(SUM(qty), 0) FROM penerimaan_gudang_detail WHERE no_penerimaan = pg.no_penerimaan) AS total_qty,
    0::numeric AS total_nilai,
    pg.status::text
FROM penerimaan_gudang pg
LEFT JOIN gudang g ON pg.id_gudang = g.id_gudang
WHERE pg.tgl_penerimaan BETWEEN :date_from AND :date_to
"""
try:
    r2 = db.execute(text(q2), params).mappings().all()
    print("Q2 (penerimaan_gudang) success, count:", len(r2))
except Exception as e:
    print("Q2 error:", e)

# Test 3: penambahan
q3 = """
SELECT
    'penambahan'::text AS tipe,
    'Penambahan Barang'::text AS tipe_label,
    pn.nomor::text AS nomor,
    pn.tanggal AS tanggal,
    pn.id_gudang,
    g.gudang AS nama_gudang,
    COALESCE(pn.po, pn.dn, '')::text AS referensi,
    pn.keterangan::text,
    pn.kode_user::text,
    (SELECT COALESCE(SUM(qty), 0) FROM penambahan_detail WHERE id = pn.id) AS total_qty,
    0::numeric AS total_nilai,
    pn.status::text
FROM penambahan pn
LEFT JOIN gudang g ON pn.id_gudang = g.id_gudang
WHERE pn.tanggal BETWEEN :date_from AND :date_to
"""
try:
    r3 = db.execute(text(q3), params).mappings().all()
    print("Q3 (penambahan) success, count:", len(r3))
except Exception as e:
    print("Q3 error:", e)

# Test 4: decanting
q4 = """
SELECT
    'decanting'::text AS tipe,
    'Decanting'::text AS tipe_label,
    d.no_decanting::text AS nomor,
    d.tanggal AS tanggal,
    d.id_gudang,
    g.gudang AS nama_gudang,
    d.referensi::text,
    d.keterangan::text,
    d.diajukan::text AS kode_user,
    COALESCE(d.totalbawah, 0) AS total_qty,
    0::numeric AS total_nilai,
    d.status::text
FROM decanting d
LEFT JOIN gudang g ON d.id_gudang = g.id_gudang
WHERE d.tanggal BETWEEN :date_from AND :date_to
"""
try:
    r4 = db.execute(text(q4), params).mappings().all()
    print("Q4 (decanting) success, count:", len(r4))
except Exception as e:
    print("Q4 error:", e)
