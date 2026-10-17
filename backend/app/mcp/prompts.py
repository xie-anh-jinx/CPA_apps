"""
CPA MCP — Role-Aware Prompt Templates
Pre-configured workflows tailored to specific business roles (Executive, Sales, Warehouse, Finance).
"""
from typing import Dict, List, Any
from app.mcp.auth import MCPUser

ALL_PROMPTS = [
    {
        "name": "daily_executive_briefing",
        "description": "Menyusun ringkasan eksekutif harian: performa penjualan, kondisi stok kritis, dan proyeksi permintaan.",
        "arguments": [],
        "roles": {"admin", "manager"}
    },
    {
        "name": "sales_pipeline_review",
        "description": "Menganalisa pipeline penjualan sales rep: peluang prospek, tindak lanjut CRM tertunda, dan invoice pelanggan.",
        "arguments": [],
        "roles": {"admin", "manager", "sales", "sales_rep"}
    },
    {
        "name": "warehouse_restock_plan",
        "description": "Meninjau defisit stok gudang di bawah stok minimum dan merencanakan pengajuan mutasi/replenishment.",
        "arguments": [],
        "roles": {"admin", "manager", "warehouse", "warehouse_staff"}
    },
    {
        "name": "credit_collection_priority",
        "description": "Menyusun daftar prioritas penagihan piutang berdasarkan analisa aging piutang jatuh tempo.",
        "arguments": [],
        "roles": {"admin", "manager", "finance_manager", "ar_staff", "credit_control"}
    }
]


def list_prompts_for_user(user: MCPUser) -> List[Dict[str, Any]]:
    """Returns prompts filtered by the user's role."""
    user_role = (user.role or "viewer").lower()
    prompts = []
    for p in ALL_PROMPTS:
        if user.is_admin or user_role in p["roles"]:
            prompts.append({
                "name": p["name"],
                "description": p["description"],
                "arguments": p.get("arguments", [])
            })
    return prompts


def get_prompt_content(name: str, arguments: Dict[str, Any], user: MCPUser) -> Dict[str, Any]:
    """Generates the prompt message structure for MCP."""
    if name == "daily_executive_briefing":
        text = (
            f"Halo AI Assistant. Tolong lakukan evaluasi menyeluruh untuk CPA Analytics hari ini.\n"
            f"Peran pengguna saat ini: {user.role}.\n\n"
            f"Langkah-langkah yang harus kamu lakukan menggunakan tools MCP:\n"
            f"1. Panggil `get_sales_summary` untuk melihat total omzet dan status piutang terkini.\n"
            f"2. Panggil `get_inventory_summary` untuk memeriksa kesehatan stok (low-stock dan overstock).\n"
            f"3. Panggil `get_demand_forecast` untuk melihat tren permintaan AI ke depan.\n"
            f"4. Buat rangkuman eksekutif dalam bentuk poin-poin actionable untuk manajemen."
        )
    elif name == "sales_pipeline_review":
        text = (
            f"Halo AI Assistant. Tolong bantu saya meninjau pipeline penjualan saya ({user.username} - {user.id_pegawai or 'Sales'}).\n"
            f"1. Panggil `get_sales_summary` untuk memeriksa omzet pencapaian saya.\n"
            f"2. Panggil `get_crm_opportunities` untuk melihat peluang (deals) yang sedang dalam negosiasi atau proposal.\n"
            f"3. Panggil `get_crm_activities` untuk memeriksa catatan kunjungan dan jadwal follow-up saya berikutnya.\n"
            f"4. Berikan rekomendasi 3 pelanggan prioritas yang harus saya hubungi hari ini."
        )
    elif name == "warehouse_restock_plan":
        text = (
            f"Halo AI Assistant. Saya bertugas di bagian gudang/logistik ({user.username}).\n"
            f"1. Panggil `get_low_stock_alerts` untuk melihat barang-barang yang stoknya sudah di bawah safety stock.\n"
            f"2. Panggil `get_demand_forecast` untuk memperkirakan kecepatan pergerakan barang tersebut.\n"
            f"3. Kelompokkan barang kritis berdasarkan gudang dan urutan urgensi replenishment."
        )
    elif name == "credit_collection_priority":
        text = (
            f"Halo AI Assistant. Sebagai tim Finance & Credit Control ({user.username}), tolong bantu susun strategi penagihan:\n"
            f"1. Panggil `get_ar_piutang_aging` untuk melihat persebaran piutang (overdue 30, 60, 90+ hari).\n"
            f"2. Panggil `get_invoices` dengan filter `is_lunas=false` untuk melihat tagihan terbesar yang belum terbayar.\n"
            f"3. Rekomendasikan akun pelanggan mana yang memiliki risiko kredit tertinggi dan langkah penagihan yang tepat."
        )
    else:
        text = f"Analisis data bisnis CPA Platform untuk role '{user.role}'."

    return {
        "description": f"Prompt workflow: {name}",
        "messages": [
            {
                "role": "user",
                "content": {
                    "type": "text",
                    "text": text
                }
            }
        ]
    }
