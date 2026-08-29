"""Initial migration - create operational, analytics, crm schemas and tables

Revision ID: 0001_initial
Revises: 
Create Date: 2026-08-29
"""
from alembic import op
import sqlalchemy as sa


revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Create Schemas ─────────────────────────────────────────────────────────
    op.execute("CREATE SCHEMA IF NOT EXISTS operational")
    op.execute("CREATE SCHEMA IF NOT EXISTS analytics")
    op.execute("CREATE SCHEMA IF NOT EXISTS crm")

    # ── operational.products ───────────────────────────────────────────────────
    op.create_table(
        "products",
        sa.Column("id_barang", sa.String(30), primary_key=True),
        sa.Column("nama_barang", sa.String(255), nullable=False),
        sa.Column("nama_alias", sa.String(100)),
        sa.Column("id_kategori", sa.String(3)),
        sa.Column("nama_kategori", sa.String(100)),
        sa.Column("id_brand", sa.Integer),
        sa.Column("nama_brand", sa.String(100)),
        sa.Column("id_family", sa.String(3)),
        sa.Column("nama_family", sa.String(100)),
        sa.Column("barcode", sa.String(25)),
        sa.Column("satuan_besar", sa.String(20)),
        sa.Column("satuan_kecil", sa.String(20)),
        sa.Column("isi_satuan", sa.Numeric),
        sa.Column("status", sa.Boolean),
        sa.Column("synced_at", sa.DateTime, server_default=sa.func.now()),
        schema="operational",
    )

    # ── operational.warehouses ────────────────────────────────────────────────
    op.create_table(
        "warehouses",
        sa.Column("id_gudang", sa.String(3), primary_key=True),
        sa.Column("nama_gudang", sa.String(100), nullable=False),
        sa.Column("id_kantor", sa.String(5)),
        sa.Column("nama_kantor", sa.String(100)),
        sa.Column("parent", sa.String(3)),
        sa.Column("alamat", sa.Text),
        sa.Column("telpon", sa.String(20)),
        sa.Column("inisial", sa.String(15)),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("synced_at", sa.DateTime, server_default=sa.func.now()),
        schema="operational",
    )

    # ── operational.inventory_balances ────────────────────────────────────────
    op.create_table(
        "inventory_balances",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("id_gudang", sa.String(3), nullable=False),
        sa.Column("id_barang", sa.String(30), nullable=False),
        sa.Column("on_hand", sa.Numeric, server_default="0"),
        sa.Column("reserved", sa.Numeric, server_default="0"),
        sa.Column("damaged", sa.Numeric, server_default="0"),
        sa.Column("quarantine", sa.Numeric, server_default="0"),
        sa.Column("pending_transfer", sa.Numeric, server_default="0"),
        sa.Column("available", sa.Numeric, server_default="0"),
        sa.Column("stok_min", sa.Numeric, server_default="0"),
        sa.Column("stok_max", sa.Numeric, server_default="0"),
        sa.Column("hpp", sa.Numeric),
        sa.Column("nilai_persediaan", sa.Numeric),
        sa.Column("batch", sa.String(100)),
        sa.Column("last_sync", sa.DateTime),
        sa.Column("synced_at", sa.DateTime, server_default=sa.func.now()),
        schema="operational",
    )
    op.create_unique_constraint(
        "uq_inv_bal_gudang_barang",
        "inventory_balances",
        ["id_gudang", "id_barang"],
        schema="operational",
    )
    op.create_index(
        "ix_inv_bal_gudang_barang",
        "inventory_balances",
        ["id_gudang", "id_barang"],
        schema="operational",
    )

    # ── operational.stock_movements ───────────────────────────────────────────
    op.create_table(
        "stock_movements",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("id_gudang", sa.String(3), nullable=False),
        sa.Column("id_barang", sa.String(30), nullable=False),
        sa.Column("tahun", sa.String(4), nullable=False),
        sa.Column("bulan", sa.String(2), nullable=False),
        sa.Column("saldo_awal", sa.Numeric, server_default="0"),
        sa.Column("masuk", sa.Numeric, server_default="0"),
        sa.Column("keluar", sa.Numeric, server_default="0"),
        sa.Column("saldo_akhir", sa.Numeric, server_default="0"),
        sa.Column("synced_at", sa.DateTime, server_default=sa.func.now()),
        schema="operational",
    )
    op.create_unique_constraint(
        "uq_stk_mov",
        "stock_movements",
        ["id_gudang", "id_barang", "tahun", "bulan"],
        schema="operational",
    )

    # ── operational.customers ─────────────────────────────────────────────────
    op.create_table(
        "customers",
        sa.Column("id_kontak", sa.String(10), primary_key=True),
        sa.Column("nama_customer", sa.String(100), nullable=False),
        sa.Column("telepon", sa.String(50)),
        sa.Column("email", sa.String(50)),
        sa.Column("alamat_penagihan", sa.Text),
        sa.Column("alamat_kirim", sa.String(300)),
        sa.Column("id_kategori", sa.Integer),
        sa.Column("nama_kategori", sa.String(50)),
        sa.Column("batas_kredit", sa.Numeric),
        sa.Column("kena_pajak", sa.Boolean),
        sa.Column("isaktif", sa.Boolean),
        sa.Column("id_kantor", sa.String(10)),
        sa.Column("id_salesman", sa.String(10)),
        sa.Column("top", sa.Integer),
        sa.Column("synced_at", sa.DateTime, server_default=sa.func.now()),
        schema="operational",
    )

    # ── operational.sales_orders ──────────────────────────────────────────────
    op.create_table(
        "sales_orders",
        sa.Column("nomor", sa.String(30), primary_key=True),
        sa.Column("tanggal", sa.Date),
        sa.Column("id_customer", sa.String(10)),
        sa.Column("nama_customer", sa.String(100)),
        sa.Column("id_salesman", sa.String(10)),
        sa.Column("id_gudang", sa.String(3)),
        sa.Column("total", sa.Numeric, server_default="0"),
        sa.Column("total_discount", sa.Numeric, server_default="0"),
        sa.Column("total_ppn", sa.Numeric, server_default="0"),
        sa.Column("grandtotal", sa.Numeric, server_default="0"),
        sa.Column("status", sa.String(1)),
        sa.Column("status_label", sa.String(50)),
        sa.Column("referensi", sa.String(100)),
        sa.Column("create_date", sa.DateTime),
        sa.Column("modified_date", sa.DateTime),
        sa.Column("synced_at", sa.DateTime, server_default=sa.func.now()),
        schema="operational",
    )

    # ── operational.sales_order_items ─────────────────────────────────────────
    op.create_table(
        "sales_order_items",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("no_so", sa.String(30)),
        sa.Column("urut", sa.Integer),
        sa.Column("id_barang", sa.String(30)),
        sa.Column("nama_barang", sa.String(255)),
        sa.Column("qty", sa.Numeric, server_default="0"),
        sa.Column("harga", sa.Numeric, server_default="0"),
        sa.Column("diskon", sa.Numeric, server_default="0"),
        sa.Column("total", sa.Numeric, server_default="0"),
        sa.Column("diambil", sa.Numeric, server_default="0"),
        sa.Column("sisa", sa.Numeric, server_default="0"),
        sa.Column("synced_at", sa.DateTime, server_default=sa.func.now()),
        schema="operational",
    )
    op.create_unique_constraint(
        "uq_so_items", "sales_order_items", ["no_so", "urut"], schema="operational"
    )

    # ── operational.invoices ──────────────────────────────────────────────────
    op.create_table(
        "invoices",
        sa.Column("no_penjualan", sa.String(30), primary_key=True),
        sa.Column("tanggal", sa.Date),
        sa.Column("id_customer", sa.String(10)),
        sa.Column("nama_customer", sa.String(100)),
        sa.Column("id_salesman", sa.String(10)),
        sa.Column("id_gudang", sa.String(10)),
        sa.Column("no_do", sa.String(30)),
        sa.Column("total", sa.Numeric, server_default="0"),
        sa.Column("total_discount", sa.Numeric, server_default="0"),
        sa.Column("total_ppn", sa.Numeric, server_default="0"),
        sa.Column("grandtotal", sa.Numeric, server_default="0"),
        sa.Column("total_bayar", sa.Numeric, server_default="0"),
        sa.Column("is_lunas", sa.Boolean, server_default="false"),
        sa.Column("tgl_jatuh_tempo", sa.Date),
        sa.Column("tgl_bayar", sa.Date),
        sa.Column("status", sa.String(1)),
        sa.Column("status_label", sa.String(50)),
        sa.Column("faktur", sa.String(50)),
        sa.Column("create_date", sa.DateTime),
        sa.Column("synced_at", sa.DateTime, server_default=sa.func.now()),
        schema="operational",
    )

    # ── operational.deliveries ────────────────────────────────────────────────
    op.create_table(
        "deliveries",
        sa.Column("nomor", sa.String(30), primary_key=True),
        sa.Column("tanggal", sa.Date),
        sa.Column("id_customer", sa.String(10)),
        sa.Column("nama_customer", sa.String(150)),
        sa.Column("id_salesman", sa.String(10)),
        sa.Column("id_gudang", sa.String(3)),
        sa.Column("alamat", sa.Text),
        sa.Column("tgl_keluar", sa.Date),
        sa.Column("driver", sa.String(30)),
        sa.Column("lic_plate", sa.String(50)),
        sa.Column("transporter", sa.String(50)),
        sa.Column("shippingcosts", sa.Numeric),
        sa.Column("received_date", sa.Date),
        sa.Column("received_name", sa.String(30)),
        sa.Column("tgl_sampai", sa.Date),
        sa.Column("origin", sa.String(50)),
        sa.Column("destination", sa.String(50)),
        sa.Column("leadtime", sa.Integer),
        sa.Column("status", sa.String(1)),
        sa.Column("status_label", sa.String(50)),
        sa.Column("create_date", sa.DateTime),
        sa.Column("modified_date", sa.DateTime),
        sa.Column("synced_at", sa.DateTime, server_default=sa.func.now()),
        schema="operational",
    )

    # ── operational.warehouse_transfers ───────────────────────────────────────
    op.create_table(
        "warehouse_transfers",
        sa.Column("id_transfer", sa.Integer, primary_key=True),
        sa.Column("id_gudang_asal", sa.String(3)),
        sa.Column("nama_gudang_asal", sa.String(100)),
        sa.Column("id_gudang_tujuan", sa.String(3)),
        sa.Column("nama_gudang_tujuan", sa.String(100)),
        sa.Column("tanggal", sa.Date),
        sa.Column("uraian", sa.String(100)),
        sa.Column("status", sa.String(1)),
        sa.Column("status_label", sa.String(50)),
        sa.Column("total_item", sa.Integer, server_default="0"),
        sa.Column("synced_at", sa.DateTime, server_default=sa.func.now()),
        schema="operational",
    )

    # ── analytics.daily_stock_snapshot ────────────────────────────────────────
    op.create_table(
        "daily_stock_snapshot",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("snapshot_date", sa.Date, nullable=False),
        sa.Column("id_gudang", sa.String(3), nullable=False),
        sa.Column("id_barang", sa.String(30), nullable=False),
        sa.Column("nama_barang", sa.String(255)),
        sa.Column("nama_gudang", sa.String(100)),
        sa.Column("stok_available", sa.Numeric, server_default="0"),
        sa.Column("stok_on_hand", sa.Numeric, server_default="0"),
        sa.Column("nilai_persediaan", sa.Numeric, server_default="0"),
        sa.Column("is_low_stock", sa.Boolean, server_default="false"),
        sa.Column("is_overstock", sa.Boolean, server_default="false"),
        sa.Column("is_zero_stock", sa.Boolean, server_default="false"),
        sa.Column("computed_at", sa.DateTime, server_default=sa.func.now()),
        schema="analytics",
    )
    op.create_unique_constraint(
        "uq_dss",
        "daily_stock_snapshot",
        ["snapshot_date", "id_gudang", "id_barang"],
        schema="analytics",
    )

    # ── analytics.daily_sales_summary ─────────────────────────────────────────
    op.create_table(
        "daily_sales_summary",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("tanggal", sa.Date, nullable=False),
        sa.Column("id_gudang", sa.String(3)),
        sa.Column("nama_gudang", sa.String(100)),
        sa.Column("id_salesman", sa.String(10)),
        sa.Column("nama_salesman", sa.String(100)),
        sa.Column("total_so", sa.Integer, server_default="0"),
        sa.Column("total_invoice", sa.Integer, server_default="0"),
        sa.Column("omzet", sa.Numeric, server_default="0"),
        sa.Column("total_discount", sa.Numeric, server_default="0"),
        sa.Column("total_ppn", sa.Numeric, server_default="0"),
        sa.Column("net_revenue", sa.Numeric, server_default="0"),
        sa.Column("computed_at", sa.DateTime, server_default=sa.func.now()),
        schema="analytics",
    )

    # ── analytics.warehouse_performance ───────────────────────────────────────
    op.create_table(
        "warehouse_performance",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("period_year", sa.String(4), nullable=False),
        sa.Column("period_month", sa.String(2), nullable=False),
        sa.Column("id_gudang", sa.String(3), nullable=False),
        sa.Column("nama_gudang", sa.String(100)),
        sa.Column("total_masuk", sa.Numeric, server_default="0"),
        sa.Column("total_keluar", sa.Numeric, server_default="0"),
        sa.Column("total_transfer_masuk", sa.Numeric, server_default="0"),
        sa.Column("total_transfer_keluar", sa.Numeric, server_default="0"),
        sa.Column("nilai_persediaan_akhir", sa.Numeric, server_default="0"),
        sa.Column("jumlah_sku", sa.Integer, server_default="0"),
        sa.Column("sku_low_stock", sa.Integer, server_default="0"),
        sa.Column("sku_zero_stock", sa.Integer, server_default="0"),
        sa.Column("computed_at", sa.DateTime, server_default=sa.func.now()),
        schema="analytics",
    )

    # ── analytics.customer_metrics ────────────────────────────────────────────
    op.create_table(
        "customer_metrics",
        sa.Column("id_kontak", sa.String(10), primary_key=True),
        sa.Column("nama_customer", sa.String(100)),
        sa.Column("total_orders", sa.Integer, server_default="0"),
        sa.Column("total_revenue", sa.Numeric, server_default="0"),
        sa.Column("avg_order_value", sa.Numeric, server_default="0"),
        sa.Column("last_purchase_date", sa.Date),
        sa.Column("first_purchase_date", sa.Date),
        sa.Column("segment", sa.String(20)),
        sa.Column("days_since_last_purchase", sa.Integer),
        sa.Column("purchase_frequency_days", sa.Integer),
        sa.Column("total_piutang", sa.Numeric, server_default="0"),
        sa.Column("is_overdue", sa.Boolean, server_default="false"),
        sa.Column("computed_at", sa.DateTime, server_default=sa.func.now()),
        schema="analytics",
    )

    # ── analytics.alert_thresholds ────────────────────────────────────────────
    op.create_table(
        "alert_thresholds",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("alert_type", sa.String(50), nullable=False),
        sa.Column("id_gudang", sa.String(3)),
        sa.Column("id_barang", sa.String(30)),
        sa.Column("threshold_value", sa.Numeric),
        sa.Column("threshold_days", sa.Integer),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        schema="analytics",
    )

    # ── analytics.alert_history ───────────────────────────────────────────────
    op.create_table(
        "alert_history",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("alert_type", sa.String(50), nullable=False),
        sa.Column("id_gudang", sa.String(3)),
        sa.Column("id_barang", sa.String(30)),
        sa.Column("message", sa.Text),
        sa.Column("severity", sa.String(10)),
        sa.Column("is_resolved", sa.Boolean, server_default="false"),
        sa.Column("resolved_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        schema="analytics",
    )

    # ── analytics.sync_state ──────────────────────────────────────────────────
    op.create_table(
        "sync_state",
        sa.Column("table_name", sa.String(100), primary_key=True),
        sa.Column("last_sync_at", sa.DateTime),
        sa.Column("last_record_id", sa.String(100)),
        sa.Column("total_synced", sa.BigInteger, server_default="0"),
        sa.Column("sync_status", sa.String(20)),
        sa.Column("error_message", sa.Text),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
        schema="analytics",
    )

    # ── analytics.users ───────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("username", sa.String(50), unique=True, nullable=False),
        sa.Column("email", sa.String(100), unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(100)),
        sa.Column("role", sa.String(20), server_default="viewer"),
        sa.Column("id_pegawai", sa.String(10)),
        sa.Column("id_gudang_access", sa.String(50)),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("last_login", sa.DateTime),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        schema="analytics",
    )

    # ── crm.activities ────────────────────────────────────────────────────────
    op.create_table(
        "activities",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("id_customer", sa.String(10), nullable=False),
        sa.Column("activity_type", sa.String(30)),
        sa.Column("subject", sa.String(200)),
        sa.Column("description", sa.Text),
        sa.Column("outcome", sa.Text),
        sa.Column("activity_date", sa.DateTime),
        sa.Column("next_followup_date", sa.Date),
        sa.Column("id_pegawai", sa.String(10)),
        sa.Column("created_by", sa.String(10)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
        schema="crm",
    )

    # ── crm.opportunities ─────────────────────────────────────────────────────
    op.create_table(
        "opportunities",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("id_customer", sa.String(10)),
        sa.Column("nama_customer", sa.String(100)),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("stage", sa.String(30)),
        sa.Column("probability", sa.Numeric),
        sa.Column("expected_value", sa.Numeric),
        sa.Column("expected_close_date", sa.Date),
        sa.Column("id_salesman", sa.String(10)),
        sa.Column("products", sa.JSON),
        sa.Column("created_by", sa.String(10)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
        schema="crm",
    )

    # ── crm.complaints ────────────────────────────────────────────────────────
    op.create_table(
        "complaints",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("id_customer", sa.String(10), nullable=False),
        sa.Column("nama_customer", sa.String(100)),
        sa.Column("no_referensi", sa.String(50)),
        sa.Column("complaint_type", sa.String(30)),
        sa.Column("subject", sa.String(200)),
        sa.Column("description", sa.Text),
        sa.Column("status", sa.String(20), server_default="open"),
        sa.Column("priority", sa.String(10), server_default="medium"),
        sa.Column("resolution", sa.Text),
        sa.Column("created_by", sa.String(10)),
        sa.Column("assigned_to", sa.String(10)),
        sa.Column("resolved_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
        schema="crm",
    )

    # ── crm.followup_reminders ────────────────────────────────────────────────
    op.create_table(
        "followup_reminders",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("id_customer", sa.String(10), nullable=False),
        sa.Column("reminder_type", sa.String(30)),
        sa.Column("reminder_date", sa.Date),
        sa.Column("message", sa.Text),
        sa.Column("is_sent", sa.Boolean, server_default="false"),
        sa.Column("is_done", sa.Boolean, server_default="false"),
        sa.Column("created_by", sa.String(10)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        schema="crm",
    )


def downgrade() -> None:
    op.execute("DROP SCHEMA IF EXISTS crm CASCADE")
    op.execute("DROP SCHEMA IF EXISTS analytics CASCADE")
    op.execute("DROP SCHEMA IF EXISTS operational CASCADE")
