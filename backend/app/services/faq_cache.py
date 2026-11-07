"""
PADI ERP / CPA Analytics — FAQ & Domain Knowledge Cache (Layer 3)
================================================================
Zero Database, Zero LLM Token response engine for common ERP business terms,
definitions, operational rules, and status codes.
"""
import re
import hashlib
from typing import Dict, Any, Optional, List, Tuple


FAQ_REGISTRY: List[Dict[str, Any]] = [
    {
        "id": "deadstock",
        "title": "Pengertian & Ketentuan Deadstock di ERP PADI",
        "keywords": ["deadstock", "dead stock", "apa itu deadstock", "arti deadstock", "definisi deadstock", "stok mati"],
        "regex": [r"\b(apa\s+itu|apa\s+arti|maksud|definisi|pengertian)\s*(dari\s*)?(deadstock|dead\s+stock|stok\s+mati)\b", r"^(deadstock|dead\s+stock)\??$"],
        "answer": """### 🏷️ Pengertian Deadstock di ERP PADI

**Deadstock** adalah kategori persediaan barang yang mengendap di gudang tanpa adanya mutasi keluar (penjualan atau transfer) selama **lebih dari 240 hari (> 8 bulan)**.

#### 📊 Ketentuan Klasifikasi Umur Stok:
- **Fast / Normal Moving:** Umur stok 0 – 89 hari.
- **Slow Moving:** Umur stok 90 – 149 hari.
- **Overstock:** Umur stok 150 – 239 hari (peringatan dini penumpukan).
- **Deadstock:** Umur stok **≥ 240 hari** (status kritis).

#### ⚠️ Dampak Bisnis:
1. **Modal Kerja Tertahan:** Nilai valuasi barang tidak berputar menjadi arus kas (cash flow).
2. **Risiko Mutu:** Potensi penurunan kualitas pelumas, kerusakan kemasan, atau masa simpan (*shelf life*) kedaluwarsa.
3. **Biaya Gudang:** Menyita kapasitas ruang simpan (pallet space) di depo operasional.

#### 💡 Rekomendasi Tindakan:
- Ajukan program diskon khusus / *clearance sale* ke divisi komersial.
- Lakukan program *bundling* produk fast-moving.
- Koordinasikan dengan principal untuk opsi re-packaging atau retur jika memenuhi syarat kerja sama."""
    },
    {
        "id": "overstock",
        "title": "Pengertian & Kebijakan Overstock di ERP PADI",
        "keywords": ["overstock", "over stock", "apa itu overstock", "arti overstock", "definisi overstock", "kelebihan stok"],
        "regex": [r"\b(apa\s+itu|apa\s+arti|maksud|definisi|pengertian)\s*(dari\s*)?(overstock|over\s+stock|kelebihan\s+stok)\b", r"^(overstock|over\s+stock)\??$"],
        "answer": """### 📦 Pengertian Overstock di ERP PADI

**Overstock** adalah kondisi persediaan barang di mana volume stok yang tersimpan di gudang melampaui kebutuhan operasional normal, dengan kriteria:
1. Barang telah tersimpan di gudang selama **150 hingga 239 hari (5 – 8 bulan)** tanpa habis terjual, ATAU
2. Kuantitas *on-hand* melampaui parameter batas atas persediaan (`stok_max`) yang ditetapkan per SKU di gudang tersebut.

#### 🔄 Perbedaan Overstock vs Deadstock:
- **Overstock (150–239 hari):** Sinyal peringatan awal (*early warning*). Barang masih memiliki minat pasar namun perputarannya melambat.
- **Deadstock (≥ 240 hari):** Barang sudah dinyatakan macet total dan wajib dievaluasi disposisi/penghapusan.

#### 💡 Solusi Penanganan:
- Hentikan penerbitan Purchase Order (PO) baru untuk SKU terkait.
- Redistribusi stok ke cabang/depo lain yang memiliki tingkat *demand velocity* lebih tinggi.
- Dorong tim sales representatif untuk menawarkan volume ekstra dengan insentif target."""
    },
    {
        "id": "cancel_it",
        "title": "Pengertian Cancel IT (In-Transit) di ERP PADI",
        "keywords": ["cancel it", "cancel-it", "apa itu cancel it", "arti cancel it", "maksud cancel it", "batal transfer"],
        "regex": [r"\b(apa\s+itu|apa\s+arti|maksud|definisi|pengertian)\s*(dari\s*)?(cancel\s*it|cancel-it|batal\s+it|batal\s+transfer)\b", r"^(cancel\s*it|cancel-it)\??$"],
        "answer": """### 🚫 Pengertian Cancel IT (Cancel In-Transit)

**Cancel IT** adalah pembatalan transaksi pemindahan stok antar gudang (*Inter-Warehouse Transfer*) saat dokumen transfer pengiriman sudah terbit, namun barang belum diserahterimakan secara fisik di gudang penerima.

#### ⚙️ Prosedur & Dampak di Database:
1. **Status Dokumen:** Status pengiriman antar gudang diubah menjadi dibatalkan (*Cancelled*).
2. **Penyesuaian Stok:** Kuantitas stok yang semula dialokasikan sebagai *In-Transit* dikembalikan ke saldo stok tersedia (*available stock*) pada gudang asal.
3. **Pencatatan Audit:** Alasan pembatalan (misal: armada kendala teknis, salah dokumen, atau perubahan alokasi mendadak) wajib dicatat dalam log sistem ERP.

#### 🛡️ Kontrol Administrasi:
Hanya Supervisor Gudang dan Manajer Logistik yang memiliki wewenang untuk mengeksekusi Cancel IT guna mencegah selisih fisik saat stok opname."""
    },
    {
        "id": "lama_it",
        "title": "Pengertian & Batasan Lama IT (In-Transit Lead Time)",
        "keywords": ["lama it", "lama-it", "apa itu lama it", "arti lama it", "in transit lead time", "durasi kirim"],
        "regex": [r"\b(apa\s+itu|apa\s+arti|maksud|definisi|pengertian)\s*(dari\s*)?(lama\s*it|lama-it|in\s*transit\s*time|durasi\s+it)\b", r"^(lama\s*it|lama-it)\??$"],
        "answer": """### ⏱️ Pengertian Lama IT (In-Transit Lead Time)

**Lama IT (Lama In-Transit)** adalah total hari yang dihitung sejak Surat Jalan/Dokumen Transfer dirilis dari gudang pengirim hingga barang diverifikasi dan diterima secara fisik (*Goods Receipt*) di gudang penerima.

#### 🚚 Standar SLA Distribusi PADI:
- **Transfer Darat Intra-Pulau:** Maksimal **1 – 3 hari kerja**.
- **Transfer Laut / Lintas Pulau (contoh: Surabaya ke Balikpapan / Bitung / Sampit):** Maksimal **5 – 14 hari kerja**.

#### ⚠️ Peringatan Sistem:
Jika Lama IT melampaui SLA estimasi rute:
- Sistem menandai transaksi sebagai **Overdue In-Transit**.
- Muncul alert di dashboard monitoring distribusi untuk konfirmasi posisi armada ekspedisi."""
    },
    {
        "id": "surat_jalan_do",
        "title": "Pengertian Surat Jalan (Delivery Order / DO) & Standar Satuan",
        "keywords": ["surat jalan", "delivery order", "apa itu do", "arti do", "fungsi surat jalan", "satuan do"],
        "regex": [r"\b(apa\s+itu|apa\s+arti|maksud|definisi|pengertian)\s*(dari\s*)?(do|surat\s+jalan|delivery\s+order)\b", r"^(do|surat\s+jalan)\??$"],
        "answer": """### 🚚 Pengertian Surat Jalan (Delivery Order / DO)

**Surat Jalan (DO)** adalah dokumen legal operasional yang menyertai pengiriman fisik barang dari gudang PADI menuju lokasi pembeli (*customer shipto*) atau depo transit.

#### 📌 Ketentuan Kunci pada ERP PADI:
1. **Satuan Volume Wajib:** Seluruh kuantitas muatan DO dihitung dan dilaporkan dalam satuan **LITER** (bukan sekadar QTY drum/kemasan), mengingat komoditas utama adalah pelumas industri.
2. **Kaitan dengan Piutang:** DO fisik yang telah ditandatangani pembeli (*proof of delivery / POD*) menjadi syarat mutlak untuk penerbitan Faktur Penjualan (Invoice) dan penagihan piutang.

#### 🔠 Kode Status DO di Sistem:
- **`S` (Selesai):** Pengiriman tuntas dan telah diserahterimakan kepada pelanggan.
- **`R` (Released):** Barang telah keluar dari gudang dan sedang dalam perjalanan armada/sopir.
- **`I` (Invoiced):** DO telah terhubung dengan faktur penjualan.
- **`C` (Cancelled):** Surat Jalan dibatalkan sebelum pengiriman.
- **`D` (Draft):** Pengajuan Surat Jalan yang menunggu persetujuan gudang."""
    },
    {
        "id": "rop_safety_stock",
        "title": "Pengertian ROP (Reorder Point) dan Safety Stock",
        "keywords": ["rop", "reorder point", "safety stock", "stok pengaman", "apa itu rop", "arti rop"],
        "regex": [r"\b(apa\s+itu|apa\s+arti|maksud|definisi|pengertian)\s*(dari\s*)?(rop|reorder\s+point|safety\s+stock|stok\s+pengaman)\b"],
        "answer": """### 🛡️ ROP (Reorder Point) & Safety Stock

#### 1. Reorder Point (ROP)
Titik batas minimum saldo stok di gudang yang menjadi pemicu otomatis bagi bagian Purchasing untuk menerbitkan Purchase Order (PO) restock baru ke principal.
$$\\text{ROP} = (\\text{Rata-rata Konsumsi Harian} \\times \\text{Lead Time Pengadaan}) + \\text{Safety Stock}$$

#### 2. Safety Stock (Stok Pengaman)
Cadangan penyangga persediaan yang dialokasikan di gudang untuk mengantisipasi dua risiko utama:
- Lonjakan pesanan mendadak dari pelanggan industri.
- Keterlambatan jadwal pengiriman kapal pasokan dari principal.

Jika saldo stok tersedia (*available*) berada di bawah ROP, sistem AI CPA akan memunculkan peringatan pada tool **`get_low_stock_alerts`**."""
    },
    {
        "id": "order_to_cash",
        "title": "Alur Bisnis Order-to-Cash (O2C) di ERP PADI",
        "keywords": ["order to cash", "o2c", "alur bisnis", "alur transaksi", "so do faktur", "siklus penjualan"],
        "regex": [r"\b(alur|siklus|tahapan)\s*(bisnis|transaksi)?\s*(order\s*to\s*cash|o2c|penjualan)\b"],
        "answer": """### 🔄 Alur Transaksi Order-to-Cash (O2C) di ERP PADI

Siklus transaksi operasional penjualan pelumas dari pesanan hingga penerimaan kas:

```
1. Sales Order (`so`, `so_detail`)
   └─ Pelanggan mengajukan pesanan pembelian.
         ▼
2. Surat Jalan / DO (`do_tbl`, `do_detail`) [Volume dalam LITER]
   └─ Gudang merilis barang fisik & armada mengantar ke lokasi pelanggan.
         ▼
3. Cross-Link DO-Penjualan (`penjualando`)
   └─ Verifikasi bukti serah terima (POD) untuk penerbitan tagihan.
         ▼
4. Faktur Penjualan (`penjualan`, `penjualan_detail`)
   └─ Dokumen tagihan resmi diterbitkan ke pembeli.
         ▼
5. Piutang Usaha (`acc_ar_faktur`)
   └─ Piutang berjalan dicatat dengan batas jatuh tempo (TOP).
         ▼
6. Penerimaan Kas / Bank (`acc_kas`, `acc_gl_trans`)
   └─ Pembayaran lunas, piutang ditutup, dan jurnal akuntansi balance.
```"""
    },
    {
        "id": "product_lines",
        "title": "Klasifikasi Lini Produk Pelumas (Gadus, Rimula, Tellus, Spirax, Omala)",
        "keywords": ["gadus", "rimula", "tellus", "spirax", "omala", "produk shell", "jenis oli"],
        "regex": [r"\b(apa\s+itu|apa\s+arti|perbedaan|kategori)\s*(dari\s*)?(gadus|rimula|tellus|spirax|omala)\b"],
        "answer": """### 🛢️ Klasifikasi Lini Produk Pelumas Shell di ERP PADI

1. **Shell Rimula:** Pelumas mesin diesel tugas berat (*Heavy Duty Diesel Engine Oil*) untuk armada logistik, dump truck tambang, dan alat berat.
2. **Shell Tellus:** Pelumas hidrolik industri performa tinggi untuk sistem hidrolik alat berat, crane, dan mesin pabrik.
3. **Shell Gadus:** Gemuk pelumas (*grease*) untuk bearing, sambungan mekanis, dan komponen yang bekerja pada temperatur/beban ekstrem.
4. **Shell Spirax:** Pelumas transmisi, gardan, dan gear gandar untuk kendaraan komersial dan mesin industri.
5. **Shell Omala:** Pelumas gear industri tertutup (*enclosed industrial gear oil*) untuk gearbox pabrik dan konveyor beban berat."""
    }
]


class FAQCacheService:
    """Handles Layer 3 FAQ Cache queries with 0 DB queries and 0 LLM tokens."""

    def __init__(self):
        self._faq_list = FAQ_REGISTRY

    def lookup(self, user_query: str) -> Optional[Dict[str, Any]]:
        """
        Matches a natural language question against the domain FAQ knowledge base.
        Returns formatted answer if matched, or None.
        """
        clean_text = " ".join(user_query.strip().lower().split())

        # Check regex patterns first (highest precision)
        for faq in self._faq_list:
            for pat in faq["regex"]:
                if re.search(pat, clean_text, re.IGNORECASE):
                    return {
                        "faq_id": faq["id"],
                        "title": faq["title"],
                        "content": faq["answer"],
                        "source": "faq_cache",
                        "token_used": 0
                    }

        # Check exact keyword matching
        for faq in self._faq_list:
            for kw in faq["keywords"]:
                if kw == clean_text:
                    return {
                        "faq_id": faq["id"],
                        "title": faq["title"],
                        "content": faq["answer"],
                        "source": "faq_cache",
                        "token_used": 0
                    }

        return None


# Singleton instance
faq_cache = FAQCacheService()
