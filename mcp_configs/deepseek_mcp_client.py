#!/usr/bin/env python3
"""
CPA Platform — DeepSeek AI Integration with MCP Server
Menghubungkan DeepSeek (deepseek-chat / deepseek-reasoner) ke CPA MCP Server
menggunakan OpenAI-compatible Tool/Function Calling.

Penggunaan:
  1. Mode interaktif:
     /root/cpa_mcp_env/bin/python /root/CPA_analytics/mcp_configs/deepseek_mcp_client.py
  2. Mode satu pertanyaan:
     /root/cpa_mcp_env/bin/python /root/CPA_analytics/mcp_configs/deepseek_mcp_client.py "Berapa total stok barang saat ini?"
"""

import os
import sys
import json
import httpx
from openai import OpenAI

# ── Konfigurasi ─────────────────────────────────────────────────────────────
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")

# MCP CPA Endpoint
MCP_BASE_URL = os.environ.get("CPA_MCP_URL", "https://warehouse.pengajaran.com/api/mcp")
MCP_ROLE = os.environ.get("CPA_MCP_ROLE", "admin")


class DeepSeekMCPBridge:
    def __init__(self, api_key: str, mcp_url: str, role: str = "admin", model: str = "deepseek-chat"):
        self.mcp_url = mcp_url.rstrip("/")
        self.role = role
        self.model = model
        self.client = OpenAI(api_key=api_key, base_url=DEEPSEEK_BASE_URL)
        self.tools = []
        self._load_tools()

    def _mcp_headers(self):
        return {
            "Content-Type": "application/json",
            "X-CPA-Role": self.role,
        }

    def _load_tools(self):
        """Mengambil daftar tools resmi dari CPA MCP Server."""
        try:
            resp = httpx.post(
                f"{self.mcp_url}/rpc",
                headers=self._mcp_headers(),
                json={"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}},
                timeout=15.0,
            )
            resp.raise_for_status()
            data = resp.json()
            raw_tools = data.get("result", {}).get("tools", [])

            # Konversi format MCP Tool ke OpenAI / DeepSeek Tool Calling Schema
            self.tools = []
            for t in raw_tools:
                self.tools.append({
                    "type": "function",
                    "function": {
                        "name": t["name"],
                        "description": t.get("description", ""),
                        "parameters": t.get("inputSchema", {"type": "object", "properties": {}}),
                    },
                })
            print(f"✅ Berhasil memuat {len(self.tools)} MCP Tools dari CPA (Role: {self.role})")
        except Exception as e:
            print(f"⚠️ Gagal memuat tools dari MCP ({self.mcp_url}): {e}")
            self.tools = []

    def execute_tool(self, name: str, arguments: dict) -> str:
        """Mengeksekusi tool ke MCP Server."""
        try:
            print(f"\n⚙️  [MCP CALL] Mengeksekusi: {name}({json.dumps(arguments, ensure_ascii=False)})")
            resp = httpx.post(
                f"{self.mcp_url}/rpc",
                headers=self._mcp_headers(),
                json={
                    "jsonrpc": "2.0",
                    "id": 2,
                    "method": "tools/call",
                    "params": {"name": name, "arguments": arguments or {}},
                },
                timeout=45.0,
            )
            resp.raise_for_status()
            data = resp.json()
            res = data.get("result", {})
            if res.get("isError"):
                content = res.get("content", [{}])[0].get("text", "Error")
                return f"Error executing tool: {content}"
            content = res.get("content", [{}])[0].get("text", "{}")
            return content
        except Exception as e:
            return f"HTTP error executing tool {name}: {e}"

    def ask(self, user_prompt: str, history: list = None) -> tuple[str, list]:
        """Kirim prompt ke DeepSeek, tangani tool calls jika ada, dan kembalikan jawaban."""
        messages = list(history or [])
        if not messages:
            messages.append({
                "role": "system",
                "content": (
                    "Anda adalah AI Asisten Operasional CPA Inventory & Analytics Platform. "
                    "Anda memiliki akses ke tools data real-time CPA (stok gudang, penjualan, CRM, analitik, dan forecast). "
                    "Gunakan data faktual dari tools saat menjawab pertanyaan inventori dan bisnis."
                ),
            })
        messages.append({"role": "user", "content": user_prompt})

        try:
            # Panggilan pertama ke DeepSeek dengan tools
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=self.tools if self.tools else None,
                tool_choice="auto" if self.tools else None,
            )
        except Exception as e:
            err_msg = str(e)
            if "Insufficient Balance" in err_msg or "402" in err_msg:
                return (
                    "❌ Saldo API DeepSeek Anda saat ini habis (Error 402: Insufficient Balance).\n"
                    "Silakan lakukan top-up kredit di https://platform.deepseek.com/top_up untuk mengaktifkan kembali pemanggilan API.",
                    messages
                )
            return f"❌ Error memanggil DeepSeek API: {err_msg}", messages

        msg = response.choices[0].message
        messages.append(msg)

        # Cek apakah DeepSeek memanggil tool MCP
        if msg.tool_calls:
            for tool_call in msg.tool_calls:
                func_name = tool_call.function.name
                try:
                    args = json.loads(tool_call.function.arguments or "{}")
                except Exception:
                    args = {}

                # Eksekusi tool
                tool_result = self.execute_tool(func_name, args)

                # Kirim hasil tool kembali ke DeepSeek
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": tool_result,
                })

            # Panggilan kedua ke DeepSeek untuk menghasilkan jawaban final dari data tool
            try:
                final_response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                )
                final_msg = final_response.choices[0].message
                messages.append(final_msg)
                return final_msg.content, messages
            except Exception as e:
                return f"❌ Error menghasilkan jawaban akhir: {e}", messages

        return msg.content, messages


def main():
    if not DEEPSEEK_API_KEY:
        print("❌ Error: Variabel environment DEEPSEEK_API_KEY belum disetel.")
        print("Silakan export DEEPSEEK_API_KEY='sk-...' sebelum menjalankan script.")
        sys.exit(1)

    bridge = DeepSeekMCPBridge(
        api_key=DEEPSEEK_API_KEY,
        mcp_url=MCP_BASE_URL,
        role=MCP_ROLE,
        model=DEEPSEEK_MODEL,
    )

    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        print(f"\n👤 Pertanyaan: {query}")
        ans, _ = bridge.ask(query)
        print(f"\n🤖 DeepSeek:\n{ans}\n")
        return

    print("\n" + "=" * 60)
    print("🤖 DeepSeek AI + CPA MCP Interactive Chat")
    print("Ketik pertanyaan Anda tentang stok gudang, omzet, CRM, dll.")
    print("Ketik 'exit' atau 'quit' untuk keluar.")
    print("=" * 60 + "\n")

    history = []
    while True:
        try:
            user_input = input("👤 Anda: ").strip()
            if not user_input:
                continue
            if user_input.lower() in ("exit", "quit", "q"):
                print("👋 Sampai jumpa!")
                break
            ans, history = bridge.ask(user_input, history)
            print(f"\n🤖 DeepSeek:\n{ans}\n")
        except (KeyboardInterrupt, EOFError):
            print("\n👋 Keluar.")
            break


if __name__ == "__main__":
    main()
