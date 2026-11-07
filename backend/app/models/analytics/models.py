"""
CPA Platform — Analytics DB Models (READ + WRITE)
Skema: operational, analytics, crm
"""
from sqlalchemy import (
    Column, String, Numeric, Boolean, Date, DateTime,
    Integer, Text, BigInteger, ForeignKey, JSON, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import AnalyticsBase


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMA: operational — Mirror/cleaned dari data lama
# ═══════════════════════════════════════════════════════════════════════════════

class Product(AnalyticsBase):
    """Produk — mirror dari barang + kategori + brand."""
    __tablename__ = "products"
    __table_args__ = {"schema": "operational"}

    id_barang = Column(String(30), primary_key=True)
    nama_barang = Column(String(255), nullable=False)
    nama_alias = Column(String(100))
    id_kategori = Column(String(3))
    nama_kategori = Column(String(100))
    id_brand = Column(Integer)
    nama_brand = Column(String(100))
    id_family = Column(String(3))
    nama_family = Column(String(100))
    barcode = Column(String(25))
    satuan_besar = Column(String(20))
    satuan_kecil = Column(String(20))
    isi_satuan = Column(Numeric)
    status = Column(Boolean)
    synced_at = Column(DateTime, server_default=func.now())


class Warehouse(AnalyticsBase):
    """Gudang — mirror dari gudang + kantor."""
    __tablename__ = "warehouses"
    __table_args__ = {"schema": "operational"}

    id_gudang = Column(String(3), primary_key=True)
    nama_gudang = Column(String(100), nullable=False)
    id_kantor = Column(String(5))
    nama_kantor = Column(String(100))
    parent = Column(String(3))
    alamat = Column(Text)
    telpon = Column(String(20))
    inisial = Column(String(15))
    kontak_person = Column(String(100))
    dsm = Column(String(100))
    is_active = Column(Boolean, default=True)
    synced_at = Column(DateTime, server_default=func.now())


class InventoryBalance(AnalyticsBase):
    """Posisi stok terkini per produk per gudang (aggregated)."""
    __tablename__ = "inventory_balances"
    __table_args__ = (
        Index("ix_inv_bal_gudang_barang", "id_gudang", "id_barang"),
        {"schema": "operational"},
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_gudang = Column(String(3), nullable=False)
    id_barang = Column(String(30), nullable=False)
    # Calculated stock status
    on_hand = Column(Numeric, default=0)        # stok fisik total
    reserved = Column(Numeric, default=0)       # terpesan (dari SO belum DO)
    damaged = Column(Numeric, default=0)        # rusak / karantina
    quarantine = Column(Numeric, default=0)     # karantina
    pending_transfer = Column(Numeric, default=0)  # dalam proses transfer
    available = Column(Numeric, default=0)      # = on_hand - reserved - damaged - quarantine - pending_transfer
    # Min/Max
    stok_min = Column(Numeric, default=0)
    stok_max = Column(Numeric, default=0)
    # Value
    hpp = Column(Numeric)
    nilai_persediaan = Column(Numeric)
    # Batch info
    batch = Column(String(100))
    # Sync
    last_sync = Column(DateTime)
    synced_at = Column(DateTime, server_default=func.now())


class StockMovement(AnalyticsBase):
    """Histori mutasi stok bulanan."""
    __tablename__ = "stock_movements"
    __table_args__ = (
        Index("ix_stk_mov_gudang_barang_period", "id_gudang", "id_barang", "tahun", "bulan"),
        {"schema": "operational"},
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_gudang = Column(String(3), nullable=False)
    id_barang = Column(String(30), nullable=False)
    tahun = Column(String(4), nullable=False)
    bulan = Column(String(2), nullable=False)
    saldo_awal = Column(Numeric, default=0)
    masuk = Column(Numeric, default=0)
    keluar = Column(Numeric, default=0)
    saldo_akhir = Column(Numeric, default=0)
    synced_at = Column(DateTime, server_default=func.now())


class SalesOrder(AnalyticsBase):
    """Sales Order — mirror dari so."""
    __tablename__ = "sales_orders"
    __table_args__ = (
        Index("ix_so_customer_tanggal", "id_customer", "tanggal"),
        {"schema": "operational"},
    )

    nomor = Column(String(30), primary_key=True)
    tanggal = Column(Date)
    id_customer = Column(String(10))
    nama_customer = Column(String(100))
    id_salesman = Column(String(10))
    id_gudang = Column(String(3))
    total = Column(Numeric, default=0)
    total_discount = Column(Numeric, default=0)
    total_ppn = Column(Numeric, default=0)
    grandtotal = Column(Numeric, default=0)
    status = Column(String(1))  # stored as char code from source
    status_label = Column(String(50))  # human-readable: Draft, Approved, etc.
    referensi = Column(String(100))
    create_date = Column(DateTime)
    modified_date = Column(DateTime)
    synced_at = Column(DateTime, server_default=func.now())

    items = relationship("SalesOrderItem", back_populates="order", lazy="dynamic")


class SalesOrderItem(AnalyticsBase):
    """Detail Sales Order."""
    __tablename__ = "sales_order_items"
    __table_args__ = {"schema": "operational"}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    no_so = Column(String(30), ForeignKey("operational.sales_orders.nomor"))
    urut = Column(Integer)
    id_barang = Column(String(30))
    nama_barang = Column(String(255))
    qty = Column(Numeric, default=0)
    harga = Column(Numeric, default=0)
    diskon = Column(Numeric, default=0)
    total = Column(Numeric, default=0)
    diambil = Column(Numeric, default=0)
    sisa = Column(Numeric, default=0)  # qty - diambil
    synced_at = Column(DateTime, server_default=func.now())

    order = relationship("SalesOrder", back_populates="items")


class Invoice(AnalyticsBase):
    """Invoice penjualan — mirror dari penjualan."""
    __tablename__ = "invoices"
    __table_args__ = (
        Index("ix_inv_customer_tanggal", "id_customer", "tanggal"),
        {"schema": "operational"},
    )

    no_penjualan = Column(String(30), primary_key=True)
    tanggal = Column(Date)
    id_customer = Column(String(10))
    nama_customer = Column(String(100))
    id_salesman = Column(String(10))
    id_gudang = Column(String(10))
    no_do = Column(String(30))
    total = Column(Numeric, default=0)
    total_discount = Column(Numeric, default=0)
    total_ppn = Column(Numeric, default=0)
    grandtotal = Column(Numeric, default=0)
    total_bayar = Column(Numeric, default=0)
    is_lunas = Column(Boolean, default=False)
    tgl_jatuh_tempo = Column(Date)
    tgl_bayar = Column(Date)
    status = Column(String(1))
    status_label = Column(String(50))
    faktur = Column(String(50))
    create_date = Column(DateTime)
    synced_at = Column(DateTime, server_default=func.now())


class Delivery(AnalyticsBase):
    """Delivery Order — mirror dari do_tbl."""
    __tablename__ = "deliveries"
    __table_args__ = (
        Index("ix_del_customer_tanggal", "id_customer", "tanggal"),
        Index("ix_del_status", "status_label"),
        {"schema": "operational"},
    )

    nomor = Column(String(30), primary_key=True)
    tanggal = Column(Date)
    id_customer = Column(String(10))
    nama_customer = Column(String(150))
    id_salesman = Column(String(10))
    id_gudang = Column(String(3))
    nama_gudang = Column(String(100))
    alamat = Column(Text)
    tgl_keluar = Column(Date)
    driver = Column(String(30))
    lic_plate = Column(String(50))
    transporter = Column(String(50))
    shippingcosts = Column(Numeric)
    received_date = Column(Date)
    received_name = Column(String(30))
    tgl_sampai = Column(Date)
    origin = Column(String(50))
    destination = Column(String(50))
    leadtime = Column(Integer)
    status = Column(String(1))
    status_label = Column(String(50))   # Draft / In Transit / Delivered / Returned / Void
    create_date = Column(DateTime)
    modified_date = Column(DateTime)
    synced_at = Column(DateTime, server_default=func.now())


class CustomerRecord(AnalyticsBase):
    """Customer — mirror dari customer."""
    __tablename__ = "customers"
    __table_args__ = {"schema": "operational"}

    id_kontak = Column(String(10), primary_key=True)
    nama_customer = Column(String(100), nullable=False)
    telepon = Column(String(50))
    email = Column(String(50))
    alamat_penagihan = Column(Text)
    alamat_kirim = Column(String(300))
    id_kategori = Column(Integer)
    nama_kategori = Column(String(50))
    batas_kredit = Column(Numeric)
    kena_pajak = Column(Boolean)
    isaktif = Column(Boolean)
    id_kantor = Column(String(10))
    id_salesman = Column(String(10))
    top = Column(Integer)  # term of payment
    synced_at = Column(DateTime, server_default=func.now())


class WarehouseTransfer(AnalyticsBase):
    """Transfer antargudang — mirror dari transfer_barang."""
    __tablename__ = "warehouse_transfers"
    __table_args__ = {"schema": "operational"}

    id_transfer = Column(Integer, primary_key=True)
    nomor = Column(String(50), unique=True)
    id_gudang_asal = Column(String(3))
    nama_gudang_asal = Column(String(100))
    id_gudang_tujuan = Column(String(3))
    nama_gudang_tujuan = Column(String(100))
    tanggal = Column(Date)
    uraian = Column(String(100))
    status = Column(String(1))
    status_label = Column(String(50))
    total_item = Column(Integer, default=0)
    synced_at = Column(DateTime, server_default=func.now())


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMA: analytics — Pre-computed aggregations
# ═══════════════════════════════════════════════════════════════════════════════

class DailyStockSnapshot(AnalyticsBase):
    """Snapshot stok harian per produk per gudang."""
    __tablename__ = "daily_stock_snapshot"
    __table_args__ = (
        Index("ix_dss_date_gudang", "snapshot_date", "id_gudang"),
        {"schema": "analytics"},
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    snapshot_date = Column(Date, nullable=False)
    id_gudang = Column(String(3), nullable=False)
    id_barang = Column(String(30), nullable=False)
    nama_barang = Column(String(255))
    nama_gudang = Column(String(100))
    stok_available = Column(Numeric, default=0)
    stok_on_hand = Column(Numeric, default=0)
    nilai_persediaan = Column(Numeric, default=0)
    is_low_stock = Column(Boolean, default=False)
    is_overstock = Column(Boolean, default=False)
    is_zero_stock = Column(Boolean, default=False)
    computed_at = Column(DateTime, server_default=func.now())


class DailySalesSummary(AnalyticsBase):
    """Ringkasan penjualan harian."""
    __tablename__ = "daily_sales_summary"
    __table_args__ = (
        Index("ix_dss_date_gudang_salesman", "tanggal", "id_gudang", "id_salesman"),
        {"schema": "analytics"},
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tanggal = Column(Date, nullable=False)
    id_gudang = Column(String(3))
    nama_gudang = Column(String(100))
    id_salesman = Column(String(10))
    nama_salesman = Column(String(100))
    total_so = Column(Integer, default=0)
    total_invoice = Column(Integer, default=0)
    omzet = Column(Numeric, default=0)
    total_discount = Column(Numeric, default=0)
    total_ppn = Column(Numeric, default=0)
    net_revenue = Column(Numeric, default=0)
    computed_at = Column(DateTime, server_default=func.now())


class WarehousePerformance(AnalyticsBase):
    """Performa gudang per periode."""
    __tablename__ = "warehouse_performance"
    __table_args__ = {"schema": "analytics"}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    period_year = Column(String(4), nullable=False)
    period_month = Column(String(2), nullable=False)
    id_gudang = Column(String(3), nullable=False)
    nama_gudang = Column(String(100))
    total_masuk = Column(Numeric, default=0)
    total_keluar = Column(Numeric, default=0)
    total_transfer_masuk = Column(Numeric, default=0)
    total_transfer_keluar = Column(Numeric, default=0)
    nilai_persediaan_akhir = Column(Numeric, default=0)
    jumlah_sku = Column(Integer, default=0)
    sku_low_stock = Column(Integer, default=0)
    sku_zero_stock = Column(Integer, default=0)
    computed_at = Column(DateTime, server_default=func.now())


class CustomerMetrics(AnalyticsBase):
    """Metrik pelanggan untuk CRM."""
    __tablename__ = "customer_metrics"
    __table_args__ = {"schema": "analytics"}

    id_kontak = Column(String(10), primary_key=True)
    nama_customer = Column(String(100))
    # Purchase metrics
    total_orders = Column(Integer, default=0)
    total_revenue = Column(Numeric, default=0)
    avg_order_value = Column(Numeric, default=0)
    last_purchase_date = Column(Date)
    first_purchase_date = Column(Date)
    # Segmentation
    segment = Column(String(20))  # active, dormant, at_risk, churned
    days_since_last_purchase = Column(Integer)
    purchase_frequency_days = Column(Integer)  # avg days between purchases
    # Financial
    total_piutang = Column(Numeric, default=0)
    is_overdue = Column(Boolean, default=False)
    computed_at = Column(DateTime, server_default=func.now())


class AlertThreshold(AnalyticsBase):
    """Konfigurasi threshold alert."""
    __tablename__ = "alert_thresholds"
    __table_args__ = {"schema": "analytics"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_type = Column(String(50), nullable=False)  # low_stock, overstock, expiry, no_delivery
    id_gudang = Column(String(3))    # NULL = semua gudang
    id_barang = Column(String(30))   # NULL = semua barang
    threshold_value = Column(Numeric)
    threshold_days = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class AlertHistory(AnalyticsBase):
    """Histori alert yang pernah muncul."""
    __tablename__ = "alert_history"
    __table_args__ = {"schema": "analytics"}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    alert_type = Column(String(50), nullable=False)
    id_gudang = Column(String(3))
    id_barang = Column(String(30))
    message = Column(Text)
    severity = Column(String(10))    # info, warning, critical
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())


class SyncState(AnalyticsBase):
    """State tracking untuk incremental sync."""
    __tablename__ = "sync_state"
    __table_args__ = {"schema": "analytics"}

    table_name = Column(String(100), primary_key=True)
    last_sync_at = Column(DateTime)
    last_record_id = Column(String(100))  # bisa berupa timestamp atau ID
    total_synced = Column(BigInteger, default=0)
    sync_status = Column(String(20))  # running, completed, failed
    error_message = Column(Text)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMA: crm — Data CRM baru (tidak ada di DB lama)
# ═══════════════════════════════════════════════════════════════════════════════

class CRMActivity(AnalyticsBase):
    """Aktivitas CRM — follow-up, meeting, call."""
    __tablename__ = "activities"
    __table_args__ = {"schema": "crm"}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_customer = Column(String(10), nullable=False)
    activity_type = Column(String(30))  # call, meeting, email, visit, whatsapp
    subject = Column(String(200))
    description = Column(Text)
    outcome = Column(Text)
    activity_date = Column(DateTime)
    next_followup_date = Column(Date)
    id_pegawai = Column(String(10))  # salesman/staff
    created_by = Column(String(10))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class CRMOpportunity(AnalyticsBase):
    """Pipeline penjualan prospek."""
    __tablename__ = "opportunities"
    __table_args__ = {"schema": "crm"}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_customer = Column(String(10))
    nama_customer = Column(String(100))
    title = Column(String(200), nullable=False)
    description = Column(Text)
    stage = Column(String(30))  # prospect, qualified, proposal, negotiation, closed_won, closed_lost
    probability = Column(Numeric)  # 0-100 %
    expected_value = Column(Numeric)
    expected_close_date = Column(Date)
    id_salesman = Column(String(10))
    products = Column(JSON)  # [{id_barang, nama, qty, harga_estimasi}]
    created_by = Column(String(10))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class CRMComplaint(AnalyticsBase):
    """Keluhan dan tiket layanan pelanggan."""
    __tablename__ = "complaints"
    __table_args__ = {"schema": "crm"}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_customer = Column(String(10), nullable=False)
    nama_customer = Column(String(100))
    no_referensi = Column(String(50))    # no SO/DO terkait
    complaint_type = Column(String(30))  # product, delivery, service, billing
    subject = Column(String(200))
    description = Column(Text)
    status = Column(String(20), default="open")  # open, in_progress, resolved, closed
    priority = Column(String(10), default="medium")  # low, medium, high, critical
    resolution = Column(Text)
    created_by = Column(String(10))
    assigned_to = Column(String(10))
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class CRMFollowupReminder(AnalyticsBase):
    """Reminder follow-up pelanggan."""
    __tablename__ = "followup_reminders"
    __table_args__ = {"schema": "crm"}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    id_customer = Column(String(10), nullable=False)
    reminder_type = Column(String(30))   # reorder, birthday, contract_renewal, payment
    reminder_date = Column(Date)
    message = Column(Text)
    is_sent = Column(Boolean, default=False)
    is_done = Column(Boolean, default=False)
    created_by = Column(String(10))
    created_at = Column(DateTime, server_default=func.now())


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMA: auth — User management untuk platform baru
# ═══════════════════════════════════════════════════════════════════════════════

class AppUser(AnalyticsBase):
    """User untuk aplikasi CPA Platform baru."""
    __tablename__ = "users"
    __table_args__ = {"schema": "analytics"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), default="viewer")  # admin, manager, sales, warehouse, viewer
    id_pegawai = Column(String(10))  # relasi ke hr_pegawai di DB lama
    id_gudang_access = Column(String(500))  # Comma-separated list of gudang IDs
    cabang = Column(String(255))  # Wilayah / Cabang penugasan
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMA: analytics — Document RAG & Structured Upload Cache
# ═══════════════════════════════════════════════════════════════════════════════

class UploadedDocument(AnalyticsBase):
    """Dokumen file yang diunggah (PDF/Excel) dengan SHA256 deduplication."""
    __tablename__ = "uploaded_documents"
    __table_args__ = {"schema": "analytics"}

    id = Column(String(64), primary_key=True)
    file_hash = Column(String(64), unique=True, nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(32), nullable=False)
    file_size = Column(Integer, nullable=False)
    page_count = Column(Integer, default=0)
    sheet_count = Column(Integer, default=0)
    summary = Column(Text)
    metadata_json = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    last_accessed_at = Column(DateTime, server_default=func.now())

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    excel_tables = relationship("DocumentExcelTable", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(AnalyticsBase):
    """Potongan (chunk) teks dokumen PDF dengan metadata & vector term."""
    __tablename__ = "document_chunks"
    __table_args__ = (
        Index("idx_doc_chunks_doc_idx", "document_id", "chunk_index"),
        {"schema": "analytics"}
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    document_id = Column(String(64), ForeignKey("analytics.uploaded_documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, default=1)
    title = Column(String(255))
    content = Column(Text, nullable=False)
    token_count = Column(Integer, default=0)
    keywords = Column(Text)
    vector_json = Column(JSON)
    metadata_json = Column(JSON)

    document = relationship("UploadedDocument", back_populates="chunks")


class DocumentExcelTable(AnalyticsBase):
    """Metadata tabel dan ringkasan terstruktur dari file Excel."""
    __tablename__ = "document_excel_tables"
    __table_args__ = {"schema": "analytics"}

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    document_id = Column(String(64), ForeignKey("analytics.uploaded_documents.id", ondelete="CASCADE"), nullable=False)
    sheet_name = Column(String(128), nullable=False)
    table_name = Column(String(128))
    row_count = Column(Integer, default=0)
    column_names = Column(JSON)
    numerical_stats = Column(JSON)
    sample_rows = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())

    document = relationship("UploadedDocument", back_populates="excel_tables")


# ═══════════════════════════════════════════════════════════════════════════════
# SCHEMA: analytics — AR Collection Confirmations & ICU (Customer Incentives)
# ═══════════════════════════════════════════════════════════════════════════════

class ARCollectionConfirmation(AnalyticsBase):
    """Konfirmasi janji bayar (Promise to Pay) customer per invoice untuk Collection Projection."""
    __tablename__ = "ar_collection_confirmations"
    __table_args__ = {"schema": "analytics"}

    no_penjualan = Column(String(50), primary_key=True)
    id_customer = Column(String(20), index=True)
    confirm_status = Column(String(30), default="CONFIRMED")  # CONFIRMED, PROMISED, FOLLOW_UP, DISPUTED
    promised_date = Column(Date)
    confirmed_amount = Column(Numeric(18, 2))
    pic_collection = Column(String(100))
    notes = Column(Text)
    updated_by = Column(String(50))
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ARCustomerIncentive(AnalyticsBase):
    """Pengajuan Insentif Customer (ICU) yang membutuhkan approval berjenjang & tindak lanjut."""
    __tablename__ = "ar_customer_incentives"
    __table_args__ = {"schema": "analytics"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    nomor_icu = Column(String(50), unique=True, nullable=False, index=True)
    tanggal_pengajuan = Column(Date, nullable=False)
    id_customer = Column(String(20), nullable=False, index=True)
    nama_customer = Column(String(150), nullable=False)
    no_invoice = Column(String(50), nullable=False)
    tanggal_invoice = Column(Date)
    tanggal_payment = Column(Date)
    umur_piutang_hari = Column(Integer, default=0)
    id_salesman = Column(String(20))
    nama_salesman = Column(String(100))
    id_barang = Column(String(30))
    nama_barang = Column(String(150))
    qty = Column(Numeric(14, 2), default=0)
    bottom_price = Column(Numeric(18, 2), default=0)
    harga_invoice = Column(Numeric(18, 2), default=0)
    tarif_icu_per_unit = Column(Numeric(18, 2), default=0)
    ongkos_kirim = Column(Numeric(18, 2), default=0)
    potongan_pph = Column(Numeric(18, 2), default=0)
    total_insentif_net = Column(Numeric(18, 2), default=0)
    penerima_insentif = Column(String(100))
    bank_penerima = Column(String(50))
    nomor_rekening = Column(String(50))
    nama_rekening = Column(String(100))
    status_approval = Column(String(30), default="PENDING_MANAGER")  # PENDING_MANAGER, PENDING_FINANCE, APPROVED, REJECTED, PAID
    current_approver_role = Column(String(50), default="Sales Manager")
    approved_by = Column(String(100))
    approved_at = Column(DateTime)
    catatan_pengajuan = Column(Text)
    catatan_approval = Column(Text)
    tindak_lanjut = Column(String(200))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


