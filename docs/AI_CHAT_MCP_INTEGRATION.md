# 🤖 Panduan Integrasi AI LLM & MCP Chat Box

Dokumen ini menjelaskan implementasi dan cara menghubungkan komponen **AI Chat Box** di dashboard platform CPA dengan **AI Large Language Model (LLM)** dan **Model Context Protocol (MCP)** server.

---

## 🎨 1. Desain Tampilan & Interaktivitas UI

Komponen chat box dibuat dengan styling dan markup CSS presisi sesuai rancangan:

- **Markup HTML & Class**: Menggunakan kelas `.container-ia-chat`, `.container-upload-files`, `.upload-file`, `.input-text`, `.input-voice`, `.label-voice`, `.label-files`, `.label-text`, `.ai`, `.container`, `.c.c1..c4`, `.rings`, dan `.glass`.
- **Micro-Animations**:
  - **Efek Expand & Focus**: Saat input teks aktif/diisi, bilah input memanjang (`max-width: 250px`), ikon upload memudar, dan tombol plus (`.label-files`) muncul.
  - **Tombol Kirim Gradien**: Saat input terisi (`:valid` atau bernilai), tombol panah atas muncul dengan efek gradien modern (`#0D99FF`, `#9147ff`, `#ff4141`).
  - **Voice Conversation Mode**: Saat ikon voice diklik (`.input-voice:checked`), komponen membesar menjadi kartu interaktif 300x300px dengan **AI Orb** animasi 3D, gelombang resonansi (*wave pulses*), cincin rotasi (*rotating rings*), efek kaca (*glassmorphism*), dan teks status *"Conversation Started"*.
  - **Web Speech API**: Terintegrasi otomatis dengan `SpeechRecognition` browser untuk mengenali ucapan bahasa Indonesia dan mengonversinya menjadi teks pertanyaan.
  - **Dukungan Multi-Upload**: Tiga ikon upload (Kamera, Galeri Foto, dan Dokumen/File) terhubung langsung ke dialog pemilihan file dengan preview chip dan opsi hapus.
  - **Expandable Conversation Drawer**: Jendela riwayat percakapan yang dapat diperbesar/layar penuh, dilengkapi badge eksekusi MCP tool real-time, tombol salin, dan reset obrolan.

---

## 🏗️ 2. Arsitektur Komponen

```
Dashboard (Executive / Main C3)
        ↓
AIChatBox (frontend/components/ai/AIChatBox.tsx)
        ↓
aiChat client (frontend/lib/aiChat.ts)
        ↓  POST /api/ai/chat (SSE Stream / JSON)
FastAPI Backend (backend/app/routers/ai_chat.py)
        ↓
CPA MCP Server & RBAC Guard (backend/app/mcp)
        ├── list_tools_for_user(role)
        └── execute_tool(name, args, user, db)
        ↓
PostgreSQL Analytics (ODS / Mirror / Agregasi)
```

---

## 🔌 3. Menghubungkan ke AI LLM (Gemini / OpenAI / DeepSeek / Claude)

Endpoint backend di `backend/app/routers/ai_chat.py` telah disiapkan untuk mendukung function calling LLM.

### Opsi A: Google Gemini (Function Calling + MCP)
Pasang library `google-genai` atau `google-generativeai`:
```python
import google.generativeai as genai
from app.mcp.tools import list_tools_for_user, execute_tool

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# 1. Konversi MCP tools ke Gemini Function Declarations
mcp_tools = list_tools_for_user(mcp_user)
gemini_functions = [
    {
        "name": t["name"],
        "description": t["description"],
        "parameters": t["inputSchema"]
    }
    for t in mcp_tools
]

# 2. Inisialisasi model dengan tools
model = genai.GenerativeModel(
    model_name="gemini-1.5-pro",
    tools=gemini_functions
)

# 3. Kirim percakapan dan tangani Tool Call secara rekursif
chat = model.start_chat()
response = chat.send_message(user_query)

if response.function_calls:
    for call in response.function_calls:
        tool_name = call.name
        tool_args = dict(call.args)
        # Eksekusi MCP tool dengan RBAC aman
        tool_result, _ = execute_tool(tool_name, tool_args, mcp_user, db)
        # Kirim hasil kembali ke Gemini
        final_response = chat.send_message({
            "function_response": {
                "name": tool_name,
                "response": tool_result
            }
        })
```

### Opsi B: OpenAI GPT (ChatGPT / Codex)
```python
from openai import OpenAI
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# 1. Konversi MCP tools ke format OpenAI Tools
openai_tools = [
    {
        "type": "function",
        "function": {
            "name": t["name"],
            "description": t["description"],
            "parameters": t["inputSchema"]
        }
    }
    for t in list_tools_for_user(mcp_user)
]

# 2. Panggil API dengan streaming
response = client.chat.completions.create(
    model="gpt-4o",
    messages=formatted_messages,
    tools=openai_tools,
    stream=True
)
```

---

## 🛡️ 4. Matriks Akses MCP & Keamanan (RBAC/RLS)

Seluruh pemanggilan data dari chat box melewati 3 lapis perlindungan:
1. **Dynamic Tool Filtering**: Pengguna hanya melihat tool yang berhak diakses perannya.
2. **Hard Runtime Guard**: Panggilan yang melanggar langsung ditolak dengan `403 Forbidden`.
3. **Row-Level Security (RLS)**:
   - `sales_rep` otomatis dikunci hanya pada transaksi salesman miliknya (contoh: Azzuhri pada `CPA-452`).
   - `warehouse_staff` otomatis dikunci hanya pada gudang binaannya.
   - Nilai finansial dan margin laba disembunyikan untuk non-manajemen/finance.
