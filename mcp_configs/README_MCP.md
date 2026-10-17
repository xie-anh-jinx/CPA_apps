# 🚀 CPA Platform — Model Context Protocol (MCP) Server

Server **Model Context Protocol (MCP)** resmi untuk **CPA Inventory Intelligence & CRM Platform** yang mendukung integrasi langsung dengan **OpenAI GPT (ChatGPT / Custom GPTs)**, **Google Gemini**, **Anthropic Claude**, dan **Cursor IDE**.

Server ini dilengkapi dengan pengamanan **Role-Based Access Control (RBAC)** dan **Row-Level Security (RLS)** tingkat enterprise, sehingga data bisnis yang dapat diakses oleh AI model bergantung penuh pada peran dan identitas pengguna yang terautentikasi.

---

## 🛡️ Matriks Hak Akses & Row-Level Security (RBAC/RLS)

| Modul Data / Tool | Admin | Manager | Sales Rep (`sales_rep`) | Staf Gudang (`warehouse_staff`) | Finance (`finance_manager`) | Viewer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Profil & Autentikasi** (`cpa_whoami`, `cpa_authenticate`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ringkasan Stok** (`get_inventory_summary`) | ✅ | ✅ | ✅ *(Nilai rupiah disembunyikan)* | ✅ *(Nilai rupiah disembunyikan)* | ✅ | ✅ *(Nilai disembunyikan)* |
| **Cek Stok Real-Time** (`get_product_stock`) | ✅ | ✅ | ✅ *(Gudang binaan)* | ✅ *(Gudang binaan)* | ✅ | ✅ |
| **Alert Stok Kritis** (`get_low_stock_alerts`) | ✅ | ✅ | ✅ | ✅ *(Gudang binaan)* | ✅ | ✅ |
| **Ringkasan Penjualan** (`get_sales_summary`) | ✅ *(Semua)* | ✅ *(Semua)* | 🔒 **RLS: Hanya Omzet Diri Sendiri** | ⛔ **403 Ditolak** | ✅ *(Semua)* | ⛔ **403 Ditolak** |
| **Daftar Faktur/Invoice** (`get_invoices`) | ✅ *(Semua)* | ✅ *(Semua)* | 🔒 **RLS: Hanya Pelanggan Binaan** | ⛔ **403 Ditolak** | ✅ *(Semua)* | ⛔ **403 Ditolak** |
| **Produk Terlaris** (`get_top_selling_products`) | ✅ | ✅ | 🔒 **RLS: Terlaris Tim Sendiri** | ⛔ **403 Ditolak** | ✅ | ⛔ **403 Ditolak** |
| **Analisa Aging Piutang** (`get_ar_piutang_aging`) | ✅ | ✅ | ⛔ **403 Ditolak** | ⛔ **403 Ditolak** | ✅ | ⛔ **403 Ditolak** |
| **Profil Pelanggan** (`get_customer_detail`) | ✅ | ✅ | ✅ *(Anotasi kepemilikan akun)* | ⛔ **403 Ditolak** | ✅ | ⛔ **403 Ditolak** |
| **Aktivitas CRM** (`get_crm_activities`) | ✅ | ✅ | 🔒 **RLS: Hanya Log Salesman Sendiri** | ⛔ **403 Ditolak** | ✅ | ⛔ **403 Ditolak** |
| **Pipeline Deals CRM** (`get_crm_opportunities`) | ✅ | ✅ | 🔒 **RLS: Hanya Deals Milik Sendiri** | ⛔ **403 Ditolak** | ✅ | ⛔ **403 Ditolak** |
| **Keluhan Pelanggan** (`get_crm_complaints`) | ✅ | ✅ | 🔒 **RLS: Hanya Pelanggan Sendiri** | ⛔ **403 Ditolak** | ✅ | ⛔ **403 Ditolak** |
| **Prediksi Demand AI** (`get_demand_forecast`) | ✅ | ✅ | ✅ | ✅ | ✅ | ⛔ **403 Ditolak** |
| **Daftar Master Gudang** (`get_warehouse_list`) | ✅ | ✅ | ✅ | 🔒 **RLS: Gudang Binaan Saja** | ✅ | ✅ |

### 🔒 3 Lapis Perlindungan Keamanan:
1. **Dynamic Tool Discovery (`tools/list`)**: AI Model hanya melihat daftar tool yang diizinkan untuk rolenya.
2. **Hard Runtime Guard (`tools/call`)**: Jika pengguna mencoba memanggil fungsi di luar haknya (contoh: staf gudang meminta omzet penjualan), server langsung mengembalikan error penolakan `403 Forbidden`.
3. **Row-Level Security & Field Masking**: 
   - Sales Rep otomatis di-filter berdasarkan `id_pegawai` (contoh: Azzuhri hanya melihat transaksi salesman `CPA-452`).
   - Staf Gudang otomatis dibatasi pada `id_gudang_access`.
   - Angka sensitif seperti `total_nilai` rupiah stok dan margin keuntungan otomatis dimasking menjadi `[RESTRICTED]` untuk non-finance.

---

## 🌐 Mode Transport yang Tersedia

### 1. Streamable HTTP Transport (Standar Resmi ChatGPT / OpenAI Plugins)
Digunakan secara resmi oleh **ChatGPT Apps & Connectors**, **Codex**, dan **MCP Inspector**:
- **Production Endpoint**: `https://warehouse.pengajaran.com/mcp`
- **Alternatif Endpoint**: `https://warehouse.pengajaran.com/api/mcp`
- **Fitur**: Mendukung `initialize`, server instructions, safety annotations (`readOnlyHint`), `tools/list`, `tools/call`, serta proposal **SEP-2640 Skills extension** (`skills/list`, `skills/get`, `resources/read`).

### 2. Server-Sent Events (SSE) Transport (MCP Legacy / Remote Clients)
Cocok untuk remote client seperti Cursor, Claude Desktop, LibreChat, Open WebUI:
- **Endpoint SSE**: `https://warehouse.pengajaran.com/api/mcp/sse` (atau `https://warehouse.pengajaran.com/mcp/sse`)
- **Endpoint Messages**: `https://warehouse.pengajaran.com/api/mcp/messages?sessionId={sessionId}`

### 3. Direct HTTP JSON-RPC Endpoint
Cocok untuk integrasi langsung dengan **Google Gemini Function Calling**, Custom LLM Wrappers, atau Scripting.
- **Endpoint**: `https://warehouse.pengajaran.com/api/mcp/rpc`
- **Method**: `POST` (Menerima standar JSON-RPC 2.0)

### 4. stdio Transport (Command-Line / Desktop)
Cocok untuk **Claude Desktop**, **Cursor IDE (local command)**, atau CLI agent lokal.
- **Command**: `docker exec -i cpa_backend python3 -m app.mcp.server --role <role>`


---

## 🤖 Cara Menghubungkan ke Google Gemini

Anda dapat menghubungkan Google Gemini dengan Function Calling menggunakan helper client yang sudah disediakan di `mcp_configs/gemini_mcp_client.py`:

```python
from mcp_configs.gemini_mcp_client import CPAMCPClient
import google.generativeai as genai

# 1. Inisialisasi MCP Client sesuai Role Pengguna
client = CPAMCPClient(
    base_url="https://warehouse.pengajaran.com/api/mcp",
    role="sales_rep"  # atau "admin", "warehouse_staff", "finance_manager"
)

# 2. Ambil tools yang diizinkan untuk role tersebut
tools = client.list_tools()

# 3. Jalankan eksekusi tool saat Gemini membutuhkan data
result = client.call_tool("get_sales_summary")
print("Hasil aman dari MCP (RLS aktif):", result)
```

Untuk pengujian cepat mandiri simulasi role Gemini:
```bash
docker exec cpa_backend python3 /app/app/test_mcp_rbac.py
```

---

## 🧠 Cara Menghubungkan ke OpenAI GPT (ChatGPT / Custom GPTs)

### Opsi A: Menggunakan Custom GPT Action (OpenAPI Schema)
Di dashboard Custom GPT Editor (OpenAI):
1. Pilih **Configure** -> **Actions** -> **Create new action**.
2. Masukkan URL Schema berikut:
   ```
   https://warehouse.pengajaran.com/api/mcp/openapi-actions.json
   ```
3. Atur Authentication: **Bearer** (menggunakan JWT Token pengguna CPA dari `/api/auth/token`) atau pasang Header `X-CPA-Role`.
4. GPT akan otomatis mendeteksi fungsi-fungsi bisnis CPA sesuai role pengguna.

### Opsi B: Menggunakan Autentikasi Chat Interaktif
Dalam percakapan chat dengan GPT atau Gemini, pengguna dapat mengetik:
> *"Saya ingin login sebagai azzuhri dengan password xxx"*

AI akan otomatis memanggil tool `cpa_authenticate` yang secara dinamis meningkatkan hak akses sesi menjadi role pengguna tersebut!

---

## 💻 Cara Menghubungkan ke Cursor IDE

Tambahkan konfigurasi berikut ke file settings Cursor (`settings.json` atau Cursor MCP Settings):

```json
{
  "mcpServers": {
    "cpa-platform-admin": {
      "type": "sse",
      "url": "https://warehouse.pengajaran.com/api/mcp/sse",
      "headers": {
        "X-CPA-Role": "admin"
      }
    },
    "cpa-platform-sales": {
      "type": "sse",
      "url": "https://warehouse.pengajaran.com/api/mcp/sse?role=sales_rep"
    }
  }
}
```

---

## 🖥️ Cara Menghubungkan ke Claude Desktop

Edit file konfigurasi Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cpa-analytics": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "cpa_backend",
        "python3",
        "-m",
        "app.mcp.server",
        "--role",
        "admin"
      ]
    }
  }
}
```

---

## 🔑 Contoh Akun Pengguna Uji Coba

| Username | Role | ID Pegawai | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| `admin` | `admin` | - | Akses penuh seluruh perusahaan, omzet, margin, CRM, dan sistem. |
| `azzuhri` | `sales_rep` | `CPA-452` | Terkunci hanya pada transaksi salesman CPA-452; nilai rupiah persediaan disembunyikan. |
| `ratih` | `warehouse_staff` | `CPA-051` | Terkunci pada gudang binaan; **Dilarang total** melihat omzet & penjualan. |
| `finance` | `finance_manager` | `CPA-073` | Analisa invoice, omzet, piutang, dan aging 30/60/90+ hari. |
