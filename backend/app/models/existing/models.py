"""
CPA Platform — Models untuk tabel di database lama (READ ONLY)
Dipetakan sesuai skema public dari cpa_13022024.sql
"""
from sqlalchemy import (
    Column, String, Numeric, Boolean, Date, DateTime,
    Integer, Text, LargeBinary, BigInteger, SmallInteger, CHAR
)
from sqlalchemy.orm import relationship
from app.database import ExistingBase


# ─── MASTER DATA ──────────────────────────────────────────────────────────────

class Barang(ExistingBase):
    """Master produk/barang."""
    __tablename__ = "barang"
    __table_args__ = {"schema": "public"}

    id_barang = Column(String(30), primary_key=True)
    nama_barang = Column(String(255), nullable=False)
    id_kategori_barang = Column(String(3), nullable=False)
    id_satuan_besar = Column(String(4), nullable=False)
    id_satuan_kecil = Column(String(4), nullable=False)
    barcode = Column(String(25))
    id_jenis_barang = Column(String(1))
    images = Column(LargeBinary)
    status = Column(Boolean)
    keterangan = Column(String(250))
    nama_alias = Column(String(100))
    isi_satuan = Column(Numeric, nullable=False)
    id_family = Column(String(3))
    penampung = Column(Boolean)
    id_brand = Column(Integer)


class KategoriBarang(ExistingBase):
    """Kategori barang."""
    __tablename__ = "kategori_barang"
    __table_args__ = {"schema": "public"}

    id_kategori_barang = Column(String(3), primary_key=True)
    kategori_barang = Column(String(50), nullable=False)


class Brand(ExistingBase):
    """Brand produk."""
    __tablename__ = "brand"
    __table_args__ = {"schema": "public"}

    id_brand = Column(Integer, primary_key=True)
    brand = Column(String(100), nullable=False)
    kode = Column(String(10))


class Family(ExistingBase):
    """Family/group produk."""
    __tablename__ = "family"
    __table_args__ = {"schema": "public"}

    id_family = Column(String(3), primary_key=True)
    family = Column(String(50), nullable=False)


class Gudang(ExistingBase):
    """Master gudang."""
    __tablename__ = "gudang"
    __table_args__ = {"schema": "public"}

    id_gudang = Column(String(3), primary_key=True)
    gudang = Column(String(100), nullable=False)
    id_kontak = Column(String(10))
    telpon = Column(String(20))
    alamat = Column(Text)
    parent = Column(String(3))
    shipto = Column(String(50))
    id_kantor = Column(String(3))
    inisial = Column(String(15))
    account_hpp = Column(Integer)
    account_persediaan = Column(Integer)
    blind = Column(Boolean, default=True)
    stokopname = Column(Boolean, default=False)
    dsm = Column(String(10))


class Kantor(ExistingBase):
    """Master kantor/cabang."""
    __tablename__ = "kantor"
    __table_args__ = {"schema": "public"}

    id_kantor = Column(String(5), primary_key=True)
    kantor = Column(String(100), nullable=False)
    alamat = Column(Text)
    telpon = Column(String(30))


class Region(ExistingBase):
    """Master wilayah/region."""
    __tablename__ = "region"
    __table_args__ = {"schema": "public"}

    id_region = Column(String(5), primary_key=True)
    region = Column(String(100), nullable=False)


class Customer(ExistingBase):
    """Master customer."""
    __tablename__ = "customer"
    __table_args__ = {"schema": "public"}

    id_kontak = Column(String(10), primary_key=True)
    customer = Column(String(100), nullable=False)
    no_npwp = Column(String(30))
    telepon = Column(String(50))
    fax = Column(String(25))
    email = Column(String(50))
    alamat_penagihan = Column(Text)
    id_kategori_customer = Column(Integer)
    nama_bank = Column(Text)
    no_rekening = Column(String(25))
    pemegang_rekening = Column(String(50))
    kena_pajak = Column(Boolean)
    isaktif = Column(Boolean)
    batas_kredit = Column(Numeric)
    website = Column(String(50))
    alamat_npwp = Column(String(200))
    id_sektor = Column(String(5))
    top = Column(Integer)
    id_kantor = Column(String(10))
    id_sales = Column(String(10))
    alamat_kirim = Column(String(300))


class CustomerKontak(ExistingBase):
    """Kontak detail customer."""
    __tablename__ = "customer_kontak"
    __table_args__ = {"schema": "public"}

    id_kontak = Column(String(10), primary_key=True)
    nama = Column(String(100))
    jabatan = Column(String(50))
    telepon = Column(String(50))
    hp = Column(String(50))
    email = Column(String(50))


class KategoriCustomer(ExistingBase):
    """Kategori customer."""
    __tablename__ = "kategori_customer"
    __table_args__ = {"schema": "public"}

    id_kategori_customer = Column(Integer, primary_key=True)
    kategori_customer = Column(String(50), nullable=False)


class Supplier(ExistingBase):
    """Master supplier."""
    __tablename__ = "supplier"
    __table_args__ = {"schema": "public"}

    id_supplier = Column(String(20), primary_key=True)
    supplier = Column(String(100), nullable=False)
    no_npwp = Column(String(30))
    telepon = Column(String(50))
    fax = Column(String(25))
    email = Column(String(50))
    alamat = Column(Text)
    id_kategori_supplier = Column(Integer)
    isaktif = Column(Boolean)
    id_kantor = Column(String(10))


class Kendaraan(ExistingBase):
    """Master kendaraan."""
    __tablename__ = "kendaraan"
    __table_args__ = {"schema": "public"}

    id_kendaraan = Column(String(20), primary_key=True)
    kendaraan = Column(String(100), nullable=False)
    no_polisi = Column(String(20))
    id_jenis = Column(Integer)
    status = Column(Boolean)


# ─── INVENTORI ────────────────────────────────────────────────────────────────

class StokBarang(ExistingBase):
    """Posisi stok fisik per gudang per batch (real-time stock)."""
    __tablename__ = "stok_barang"
    __table_args__ = {"schema": "public"}

    id_stok = Column(Numeric, primary_key=True)
    id_gudang = Column(String(3), nullable=False)
    id_barang = Column(String(30), nullable=False)
    stok = Column(Numeric, nullable=False)
    tanggal = Column(Date, nullable=False)
    id_perusahaan = Column(String(3))
    hpp = Column(Numeric)
    batch = Column(String(100))
    reff = Column(String(50))
    persediaan = Column(Numeric)
    penampungan = Column(Boolean)


class BarangMinmax(ExistingBase):
    """Batas minimum & maksimum stok per gudang."""
    __tablename__ = "barang_minmax"
    __table_args__ = {"schema": "public"}

    id_gudang = Column(String(3), primary_key=True)
    id_barang = Column(String(30), primary_key=True)
    min = Column(Numeric, nullable=False, default=0)
    max = Column(Numeric, nullable=False, default=0)


class Mutasi(ExistingBase):
    """Mutasi bulanan per barang per gudang."""
    __tablename__ = "mutasi"
    __table_args__ = {"schema": "public"}

    tahun = Column(String(4), primary_key=True)
    bulan = Column(String(2), primary_key=True)
    id_barang = Column(String(20), primary_key=True)
    id_gudang = Column(String(3), primary_key=True)
    saldo_awal = Column(Numeric)
    masuk = Column(Numeric)
    keluar = Column(Numeric)
    saldo_akhir = Column(Numeric)


class TransferBarang(ExistingBase):
    """Transfer barang antargudang."""
    __tablename__ = "transfer_barang"
    __table_args__ = {"schema": "public"}

    id_transfer = Column(Integer, primary_key=True)
    id_gudang_asal = Column(String(3))
    id_gudang_tujuan = Column(String(3))
    tanggal = Column(Date)
    uraian = Column(String(100))
    status = Column(CHAR(1))  # '1'=posted, '2'=void, '3'=draft


class TransferBarangDetil(ExistingBase):
    """Detail transfer barang."""
    __tablename__ = "transfer_barang_detil"
    __table_args__ = {"schema": "public"}

    id_tranfer_detil = Column(Integer, primary_key=True)
    id_transfer = Column(Integer)
    qty = Column(Integer)
    harga = Column(Numeric)
    id_barang = Column(String(20))


class StokOpname(ExistingBase):
    """Dokumen stock opname."""
    __tablename__ = "stok_opname"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True)
    id_gudang = Column(String(10))
    nomor = Column(String(35))
    keterangan = Column(String(100))
    status = Column(CHAR(1))
    create_date = Column(DateTime)


class Karantina(ExistingBase):
    """Barang karantina."""
    __tablename__ = "karantina"
    __table_args__ = {"schema": "public"}

    id_karantina = Column(Integer, primary_key=True)
    id_gudang = Column(String(3))
    tanggal = Column(Date)
    keterangan = Column(String(255))
    status = Column(CHAR(1))
    create_date = Column(DateTime)


class Leadtime(ExistingBase):
    """Lead time per barang/gudang."""
    __tablename__ = "leadtime"
    __table_args__ = {"schema": "public"}

    id_barang = Column(String(20), primary_key=True)
    id_gudang = Column(String(3), primary_key=True)
    leadtime = Column(Integer)


# ─── PENJUALAN ────────────────────────────────────────────────────────────────

class SO(ExistingBase):
    """Sales Order header."""
    __tablename__ = "so"
    __table_args__ = {"schema": "public"}

    nomor = Column(String(30), primary_key=True)
    tanggal = Column(Date)
    id_customer = Column(String(10))
    kepada = Column(String(100))
    keterangan = Column(String(100))
    kode_user = Column(String(10))
    total = Column(Numeric)
    total_ppn = Column(Numeric)
    total_discount = Column(Numeric)
    id_term = Column(String(15))
    id_salesman = Column(String(10))
    kode_mata_uang = Column(String(10))
    alamat = Column(String(100))
    tipe_diskon = Column(CHAR(1))
    nilai_harga = Column(CHAR(1))
    id_gudang = Column(String(3))
    dpp = Column(Numeric)
    grandtotal = Column(Numeric)
    telpon = Column(String(50))
    is_ppn = Column(Boolean)
    persendiskon = Column(Numeric)
    status = Column(CHAR(1))
    referensi = Column(String(100))
    create_date = Column(DateTime)
    modified_date = Column(DateTime)


class SODetail(ExistingBase):
    """Sales Order detail."""
    __tablename__ = "so_detail"
    __table_args__ = {"schema": "public"}

    no_so = Column(String(30), primary_key=True)
    urut = Column(Integer, primary_key=True)
    id_gudang = Column(String(3))
    id_barang = Column(String(20), nullable=False)
    qty = Column(Numeric)
    harga = Column(Numeric)
    total = Column(Numeric)
    harga_asli = Column(Numeric)
    diskon = Column(Numeric)
    diskonrp = Column(Numeric)
    diskonpersen = Column(Numeric)
    diambil = Column(Numeric)


class Penjualan(ExistingBase):
    """Invoice penjualan."""
    __tablename__ = "penjualan"
    __table_args__ = {"schema": "public"}

    no_penjualan = Column(String(30), primary_key=True)
    tanggal = Column(Date)
    id_customer = Column(String(10))
    kepada = Column(String(100))
    keterangan = Column(String(100))
    kode_user = Column(String(10))
    total = Column(Numeric)
    total_ppn = Column(Numeric)
    id_perusahaan = Column(String(3))
    total_discount = Column(Numeric)
    tgl_jatuh_tempo = Column(Date)
    total_bayar = Column(Numeric)
    is_lunas = Column(String(1))
    id_salesman = Column(String(10))
    kode_mata_uang = Column(String(10))
    dpp = Column(Numeric)
    grandtotal = Column(Numeric)
    persendiskon = Column(Numeric)
    is_ppn = Column(Boolean)
    no_do = Column(String(30))
    id_gudang = Column(String(10))
    referensi = Column(String(50))
    status = Column(CHAR(1))
    is_invoice = Column(Boolean, default=False)
    faktur = Column(String(50))
    cn = Column(String(50))
    create_date = Column(DateTime)
    modified_date = Column(DateTime)


class PenjualanDetail(ExistingBase):
    """Detail invoice penjualan."""
    __tablename__ = "penjualan_detail"
    __table_args__ = {"schema": "public"}

    no_penjualan = Column(String(30), primary_key=True)
    urut = Column(Integer, primary_key=True)
    id_gudang = Column(String(3))
    id_barang = Column(String(20))
    qty = Column(Numeric)
    harga = Column(Numeric)
    total = Column(Numeric)
    harga_asli = Column(Numeric)
    diskonrp = Column(Numeric)
    diskonpersen = Column(Numeric)


class Penawaran(ExistingBase):
    """Quotation / Penawaran harga ke customer."""
    __tablename__ = "penawaran"
    __table_args__ = {"schema": "public"}

    nomor = Column(String(30), primary_key=True)
    tanggal = Column(Date)
    id_customer = Column(String(10))
    kepada = Column(String(100))
    keterangan = Column(Text)
    kode_user = Column(String(10))
    total = Column(Numeric)
    grandtotal = Column(Numeric)
    id_gudang = Column(String(3))
    status = Column(CHAR(1))
    id_salesman = Column(String(10))
    create_date = Column(DateTime)


# ─── PEMBELIAN ────────────────────────────────────────────────────────────────

class PO(ExistingBase):
    """Purchase Order."""
    __tablename__ = "po"
    __table_args__ = {"schema": "public"}

    no_po = Column(String(30), primary_key=True)
    tanggal = Column(Date)
    id_supplier = Column(String(20))
    id_gudang = Column(String(3))
    keterangan = Column(String(255))
    kode_user = Column(String(10))
    total = Column(Numeric)
    grandtotal = Column(Numeric)
    status = Column(CHAR(1))
    id_perusahaan = Column(String(3))
    tgl_jatuh_tempo = Column(Date)
    create_date = Column(DateTime)
    modified_date = Column(DateTime)


class Penerimaan(ExistingBase):
    """Penerimaan barang dari supplier."""
    __tablename__ = "penerimaan"
    __table_args__ = {"schema": "public"}

    no_penerimaan = Column(String(30), primary_key=True)
    tgl_penerimaan = Column(Date)
    id_supplier = Column(String(20))
    id_gudang = Column(String(3))
    referensi = Column(String(100))
    tgl_jatuh_tempo = Column(Date)
    keterangan = Column(String(255))
    kode_user = Column(String(10))
    total = Column(Numeric, default=0)
    total_bayar = Column(Numeric, default=0)
    total_ppn = Column(Numeric, default=0)
    grandtotal = Column(Numeric, default=0)
    status = Column(CHAR(1))  # '1'=posted, '2'=void, '3'=draft
    nomor_po = Column(String(30))
    id_perusahaan = Column(String(3))
    create_date = Column(DateTime)


class PenerimaanDetail(ExistingBase):
    """Detail penerimaan barang."""
    __tablename__ = "penerimaan_detail"
    __table_args__ = {"schema": "public"}

    no_penerimaan = Column(String(30), primary_key=True)
    urut = Column(Integer, primary_key=True)
    id_barang = Column(String(20))
    qty = Column(Numeric)
    harga = Column(Numeric)
    total = Column(Numeric)


# ─── DISTRIBUSI ───────────────────────────────────────────────────────────────

class DOTbl(ExistingBase):
    """Delivery Order — dokumen pengiriman."""
    __tablename__ = "do_tbl"
    __table_args__ = {"schema": "public"}

    nomor = Column(String(30), primary_key=True)
    tanggal = Column(Date)
    id_customer = Column(String(10))
    kepada = Column(String(150))
    keterangan = Column(Text)
    id_salesman = Column(String(10))
    alamat = Column(Text)
    id_gudang = Column(String(3))
    telpon = Column(String(100))
    no_pl = Column(String(30))
    tgl_keluar = Column(Date)
    tgl_transporter = Column(Date)
    driver = Column(String(30))
    received_date = Column(Date)
    received_name = Column(String(30))
    status = Column(CHAR(1))  # '1'=delivered, '2'=void, '3'=draft
    lic_plate = Column(String(50))
    transporter = Column(String(50))
    shippingcosts = Column(Numeric)
    received_date_posting = Column(DateTime)
    return_date = Column(Date)
    leadtime = Column(Integer)
    istransporter = Column(Boolean)
    idtransporter = Column(String(10))
    create_date = Column(DateTime)
    modified_date = Column(DateTime)
    kode_user = Column(String(10))
    tgl_sampai = Column(Date)
    origin = Column(String(50))
    destination = Column(String(50))


class DODetail(ExistingBase):
    """Detail Delivery Order."""
    __tablename__ = "do_detail"
    __table_args__ = {"schema": "public"}

    nomor = Column(String(30), primary_key=True)
    urut = Column(Integer, primary_key=True)
    id_barang = Column(String(20))
    qty = Column(Numeric)
    satuan = Column(String(20))
    id_gudang = Column(String(3))


class Packinglist(ExistingBase):
    """Packing list pengiriman."""
    __tablename__ = "packinglist"
    __table_args__ = {"schema": "public"}

    nomor = Column(String(30), primary_key=True)
    tanggal = Column(Date)
    id_customer = Column(String(10))
    kepada = Column(String(100))
    keterangan = Column(Text)
    kode_user = Column(String(10))
    id_perusahaan = Column(String(3))
    id_salesman = Column(String(10))
    alamat = Column(String(100))
    status = Column(CHAR(1))
    id_gudang = Column(String(3))
    telpon = Column(String(100))


class PackinglistDetail(ExistingBase):
    """Detail packing list."""
    __tablename__ = "packinglist_detail"
    __table_args__ = {"schema": "public"}

    nomor = Column(String(30), primary_key=True)
    urut = Column(Integer, primary_key=True)
    id_barang = Column(String(20))
    qty = Column(Numeric)
    satuan = Column(String(20))


# ─── FINANCE ─────────────────────────────────────────────────────────────────

class CreditNote(ExistingBase):
    """Credit note / retur penjualan."""
    __tablename__ = "credit_note"
    __table_args__ = {"schema": "public"}

    nomor = Column(String(30), primary_key=True)
    tanggal = Column(Date)
    id_customer = Column(String(10))
    no_penjualan = Column(String(30))
    total = Column(Numeric)
    grandtotal = Column(Numeric)
    status = Column(CHAR(1))
    kode_user = Column(String(10))
    create_date = Column(DateTime)
