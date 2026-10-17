"""
Test Stock Aging berdasarkan spesifikasi
Aturan:
1. Aging barang dihitung dari tanggal penerimaan barang (tgl_penerimaan), bukan tanggal posting.
2. Barang yang pindah gudang lewat Internal Transfer tetap membawa tanggal penerimaan asalnya.
3. Rumus: aging (hari) = tanggal hari ini - tanggal stok.
4. Urutan prioritas penentuan tanggal stok:
   1) Stok hasil Cancel IT, batch sama — tanggal stok asal paling awal dengan batch yang sama.
   2) Stok hasil Cancel IT, batch beda — tanggal stok asal paling awal untuk barang yang sama.
   3) Selain itu — tanggal paling awal antara stok_barang.tanggal dan tanggal dokumen Internal Transfer (kalau stok berasal dari IT).
"""
from datetime import date
from sqlalchemy import text
from app.database import ExistingSessionLocal

db = ExistingSessionLocal()
id_gudang = '005'
today = date.today()

print(f"=== Menghitung Stock Aging untuk Gudang {id_gudang} (Hari ini: {today}) ===")

query = """
WITH cancel_origin_batch AS (
    -- Prioritas 1: Stok asal paling awal dengan batch yang sama
    SELECT 
        sb.id_stok,
        MIN(orig.tanggal) as tgl_batch
    FROM stok_barang sb
    JOIN stok_barang orig ON orig.id_barang = sb.id_barang 
                         AND orig.batch = sb.batch 
                         AND orig.reff NOT LIKE '%CANCEL%'
                         AND orig.tanggal <= sb.tanggal
    WHERE sb.id_gudang = :id_gudang 
      AND sb.stok > 0 
      AND (sb.reff LIKE '%IT-CANCEL%' OR sb.reff LIKE '%CANCEL%')
      AND sb.batch IS NOT NULL 
      AND TRIM(sb.batch) != ''
    GROUP BY sb.id_stok
),
cancel_origin_item AS (
    -- Prioritas 2: Stok asal paling awal untuk barang yang sama di gudang asal
    SELECT 
        sb.id_stok,
        MIN(orig.tanggal) as tgl_item
    FROM stok_barang sb
    JOIN stok_barang orig ON orig.id_barang = sb.id_barang 
                         AND orig.id_gudang = sb.id_gudang
                         AND orig.reff NOT LIKE '%CANCEL%'
                         AND orig.tanggal <= sb.tanggal
    WHERE sb.id_gudang = :id_gudang 
      AND sb.stok > 0 
      AND (sb.reff LIKE '%IT-CANCEL%' OR sb.reff LIKE '%CANCEL%')
    GROUP BY sb.id_stok
)
SELECT 
    sb.id_stok,
    sb.id_barang,
    b.nama_barang,
    sb.stok,
    sb.tanggal AS tgl_tercatat,
    sb.batch,
    sb.reff,
    it.tanggal AS tgl_dokumen_it,
    it.tanggal_terima AS tgl_terima_it,
    CASE 
        WHEN sb.reff LIKE '%CANCEL%' THEN 'Cancel IT'
        WHEN it.nomor IS NOT NULL THEN COALESCE(g_asal.gudang, it.id_gudang_asal)
        WHEN sb.reff LIKE '%BTB%' OR sb.reff LIKE '%BPB%' THEN 
            CASE 
                WHEN s.supplier ILIKE '%Shell%' THEN 'Shell'
                WHEN s.supplier ILIKE '%Cahaya Resources%' OR s.supplier ILIKE '%CRA%' THEN 'CRA'
                WHEN s.supplier IS NOT NULL THEN s.supplier
                ELSE 'Supplier'
            END
        WHEN sb.reff LIKE '%SPK%' OR sb.reff LIKE '%DCNT%' THEN 'Decanting'
        WHEN sb.reff LIKE '%/IN/%' OR sb.reff LIKE '%PENAMBAHAN%' OR sb.reff LIKE '%ADJ%' THEN 'Penambahan'
        ELSE 'Lainnya'
    END AS asal,
    pg.nomor_po,
    s.supplier AS nama_supplier,
    -- Prioritas 1, 2, 3
    CASE 
        WHEN (sb.reff LIKE '%IT-CANCEL%' OR sb.reff LIKE '%CANCEL%') AND cob.tgl_batch IS NOT NULL THEN cob.tgl_batch
        WHEN (sb.reff LIKE '%IT-CANCEL%' OR sb.reff LIKE '%CANCEL%') AND coi.tgl_item IS NOT NULL THEN coi.tgl_item
        WHEN it.nomor IS NOT NULL AND it.tanggal IS NOT NULL THEN LEAST(sb.tanggal, it.tanggal)
        ELSE sb.tanggal
    END AS tanggal_stok
FROM stok_barang sb
JOIN barang b ON sb.id_barang = b.id_barang
LEFT JOIN internal_transfer it ON sb.reff = it.nomor
LEFT JOIN gudang g_asal ON it.id_gudang_asal = g_asal.id_gudang
LEFT JOIN penerimaan_gudang pg ON sb.reff = pg.no_penerimaan
LEFT JOIN supplier s ON pg.id_supplier = s.id
LEFT JOIN cancel_origin_batch cob ON sb.id_stok = cob.id_stok
LEFT JOIN cancel_origin_item coi ON sb.id_stok = coi.id_stok
WHERE sb.id_gudang = :id_gudang AND sb.stok > 0
ORDER BY tanggal_stok ASC, sb.id_barang
"""

try:
    rows = db.execute(text(query), {"id_gudang": id_gudang}).mappings().all()
    print(f"Ditemukan {len(rows)} baris stok aktif.")

    summary = {
        "0-30": {"skuCount": 0, "unitCount": 0},
        "31-60": {"skuCount": 0, "unitCount": 0},
        "61-90": {"skuCount": 0, "unitCount": 0},
        ">90": {"skuCount": 0, "unitCount": 0}
    }
    sku_set_per_cat = {"0-30": set(), "31-60": set(), "61-90": set(), ">90": set()}

    for r in rows:
        stok_val = float(r['stok']) if r['stok'] is not None else 0.0
        tgl_stok = r['tanggal_stok'] or r['tgl_tercatat'] or today
        aging_hari = max((today - tgl_stok).days, 0)

        key = ">90"
        if aging_hari <= 30: key = "0-30"
        elif aging_hari <= 60: key = "31-60"
        elif aging_hari <= 90: key = "61-90"

        summary[key]["unitCount"] += stok_val
        sku_set_per_cat[key].add(r['id_barang'])

    for k in summary:
        summary[k]["skuCount"] = len(sku_set_per_cat[k])

    print("\n--- Summary Aging ---")
    for k, v in summary.items():
        print(f"Kategori {k} hari: {v['skuCount']} SKU, {v['unitCount']:,.1f} unit")

    print("\n--- Contoh 10 Baris Stok ---")
    for r in rows[:10]:
        tgl_stok = r['tanggal_stok'] or r['tgl_tercatat'] or today
        aging = max((today - tgl_stok).days, 0)
        po_info = f" | PO: {r['nomor_po']}" if r['nomor_po'] else ""
        print(f"- {r['id_barang']} | {r['nama_barang'][:30]} | Stok: {r['stok']} | Asal: {r['asal']}{po_info} | Dok: {r['reff']} | Tgl Stok: {tgl_stok} | Aging: {aging} hari")

except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
