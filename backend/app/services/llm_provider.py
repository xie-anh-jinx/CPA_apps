"""
PADI ERP / CPA Analytics — LLM Provider Layer
==============================================
Implements Clean Architecture & Dependency Injection for LLMs.
Allows hot-swapping between Google Gemini, DeepSeek, OpenAI, or local models
without altering the core ERP or Intent Router business logic.
"""

import os
import time
import json
import asyncio
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass


@dataclass
class LLMResponse:
    """Standardized response from any LLM provider."""
    content: str
    model_name: str
    token_used: int
    duration_ms: float
    success: bool = True
    error_message: Optional[str] = None
    prompt_cache_hit_tokens: int = 0
    prompt_cache_miss_tokens: int = 0


class BaseLLMProvider(ABC):
    """Abstract Base Class for LLM providers."""

    @abstractmethod
    def get_provider_name(self) -> str:
        """Returns the identifier of the LLM provider."""
        pass

    @abstractmethod
    async def generate_response(
        self,
        system_prompt: str,
        user_query: str,
        mcp_context: Any,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> LLMResponse:
        """
        Executes reasoning on top of MCP context with conversational history awareness.
        LLMs never query the database directly — only analyze MCP structured results.
        """
        pass


# ─── 1. Google Gemini Provider ────────────────────────────────────────────────

class GeminiLLMProvider(BaseLLMProvider):
    """Google Gemini implementation (supports Gemini 1.5/2.0/Flash)."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "").strip()
        self.candidate_models = [
            "gemini-3.5-flash-lite",
            "gemini-3.5-flash",
            "gemini-flash-latest",
            "gemini-2.0-flash",
            "gemini-1.5-flash"
        ]

    def get_provider_name(self) -> str:
        return "gemini"

    async def generate_response(
        self,
        system_prompt: str,
        user_query: str,
        mcp_context: Any,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> LLMResponse:
        t0 = time.time()
        if not self.api_key:
            return LLMResponse(
                content="Layanan LLM Gemini belum dikonfigurasi dengan GEMINI_API_KEY.",
                model_name="none",
                token_used=0,
                duration_ms=(time.time() - t0) * 1000,
                success=False,
                error_message="Missing GEMINI_API_KEY"
            )

        history_text = ""
        if conversation_history:
            lines = []
            for m in conversation_history[-8:]:
                r = m.get("role") if isinstance(m, dict) else getattr(m, "role", "")
                c = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
                if r and c:
                    sender = "Pengguna" if r == "user" else "PADI AI Assistant"
                    lines.append(f"{sender}: {c}")
            if lines:
                history_text = "Riwayat Percakapan Sebelumnya:\n" + "\n".join(lines) + "\n\n"

        full_prompt = (
            f"{system_prompt}\n\n"
            f"{history_text}"
            f"Pertanyaan Pengguna Terkini: {user_query}\n\n"
            f"Data Eksekusi MCP Terverifikasi:\n"
            f"{json.dumps(mcp_context, ensure_ascii=False, indent=2) if mcp_context else 'Tidak ada data MCP khusus.'}"
        )

        # Direct REST API call via urllib (zero external dependency, high reliability)
        def _call_gemini() -> Tuple[str, str, int]:
            import urllib.request
            payload = json.dumps({
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {
                    "temperature": 0.35,
                    "maxOutputTokens": 2048,
                }
            }).encode("utf-8")

            last_err = None
            for model_id in self.candidate_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={self.api_key}"
                req = urllib.request.Request(
                    url,
                    data=payload,
                    headers={"Content-Type": "application/json"}
                )
                try:
                    with urllib.request.urlopen(req, timeout=18) as response:
                        if response.status == 200:
                            resp_data = json.loads(response.read().decode("utf-8"))
                            candidates = resp_data.get("candidates", [])
                            if candidates:
                                parts = candidates[0].get("content", {}).get("parts", [])
                                if parts and "text" in parts[0]:
                                    text = parts[0]["text"].strip()
                                    usage = resp_data.get("usageMetadata", {})
                                    token_count = usage.get("totalTokenCount", 0)
                                    if token_count == 0:
                                        token_count = int(len(full_prompt.split()) * 1.3) + int(len(text.split()) * 1.3)
                                    return text, model_id, token_count
                except Exception as e:
                    last_err = e
                    continue
            raise RuntimeError(f"All Gemini models failed. Last error: {last_err}")

        try:
            content, used_model, tokens = await asyncio.to_thread(_call_gemini)
            duration = (time.time() - t0) * 1000
            return LLMResponse(
                content=content,
                model_name=used_model,
                token_used=tokens,
                duration_ms=duration,
                success=True
            )
        except Exception as err:
            duration = (time.time() - t0) * 1000
            return LLMResponse(
                content=f"Maaf, terjadi kendala saat memproses analisa bisnis dengan Gemini: {str(err)}",
                model_name="gemini-error",
                token_used=0,
                duration_ms=duration,
                success=False,
                error_message=str(err)
            )


# ─── 2. DeepSeek Provider (OpenAI Compatible) ─────────────────────────────────

class DeepSeekLLMProvider(BaseLLMProvider):
    """DeepSeek (V3 / R1) implementation via standard OpenAI-compatible endpoint."""

    DEFAULT_API_KEY = "sk-cf906535b2674fddb7e4671bfb550eba"

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, model: Optional[str] = None, temperature: Optional[float] = None):
        self.api_key = (api_key or os.environ.get("DEEPSEEK_API_KEY", self.DEFAULT_API_KEY)).strip()
        self.base_url = (base_url or os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")).strip().rstrip("/")
        self.model = (model or os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")).strip()
        env_temp = os.environ.get("DEEPSEEK_TEMPERATURE")
        self.temperature = temperature if temperature is not None else (float(env_temp) if env_temp else 0.45)

    def get_provider_name(self) -> str:
        return "deepseek"

    async def generate_response(
        self,
        system_prompt: str,
        user_query: str,
        mcp_context: Any,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> LLMResponse:
        t0 = time.time()
        api_key = self.api_key or os.environ.get("DEEPSEEK_API_KEY", self.DEFAULT_API_KEY).strip()
        base_url = (self.base_url or os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")).strip().rstrip("/")
        model = (self.model or os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")).strip()
        temperature = self.temperature

        if not api_key:
            return LLMResponse(
                content="Layanan LLM DeepSeek belum dikonfigurasi dengan DEEPSEEK_API_KEY.",
                model_name="none",
                token_used=0,
                duration_ms=(time.time() - t0) * 1000,
                success=False,
                error_message="Missing DEEPSEEK_API_KEY"
            )

        messages = [{"role": "system", "content": system_prompt}]

        if conversation_history:
            for m in conversation_history[-8:]:
                r = m.get("role") if isinstance(m, dict) else getattr(m, "role", "")
                c = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
                if r in ("user", "assistant") and c:
                    messages.append({"role": r, "content": c})

        context_str = json.dumps(mcp_context, ensure_ascii=False, indent=2) if mcp_context else "Tidak ada data tambahan dari MCP."
        messages.append({
            "role": "user",
            "content": (
                f"Pertanyaan Pengguna:\n{user_query}\n\n"
                f"Konteks Data MCP PADI ERP (Terverifikasi dari Database PostgreSQL):\n"
                f"```json\n{context_str}\n```\n\n"
                f"Petunjuk Respons (ChatGPT Grounded Style):\n"
                f"1. Jawab pertanyaan pengguna secara cerdas, kontekstual, ramah, dan mengalir alami.\n"
                f"2. Gunakan data MCP di atas sebagai fakta utama jawaban Anda.\n"
                f"3. Berikan highlight kesimpulan/poin penting di awal, gunakan tabel Markdown rapi jika membandingkan atau menyajikan daftar barang/data, dan berikan catatan/insight operasional yang relevan.\n"
                f"4. Hubungkan dengan riwayat percakapan sebelumnya jika pertanyaan pengguna merupakan pertanyaan lanjutan.\n"
                f"5. JANGAN PERNAH menampilkan blok JSON mentah kepada pengguna."
            )
        })

        def _call_deepseek_sync():
            import urllib.request
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = json.dumps({
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": 2500
            }).encode("utf-8")
            url = f"{base_url}/chat/completions"
            req = urllib.request.Request(url, data=payload, headers=headers)
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                choice = data["choices"][0]["message"]["content"]
                u = data.get("usage", {})
                tokens = u.get("total_tokens", 0)
                hit_tokens = u.get("prompt_cache_hit_tokens", 0)
                miss_tokens = u.get("prompt_cache_miss_tokens", 0)
                return choice, tokens, hit_tokens, miss_tokens

        try:
            try:
                import httpx
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": 2500
                }
                url = f"{base_url}/chat/completions"
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    choice = data["choices"][0]["message"]["content"]
                    u = data.get("usage", {})
                    tokens = u.get("total_tokens", 0)
                    hit_tokens = u.get("prompt_cache_hit_tokens", 0)
                    miss_tokens = u.get("prompt_cache_miss_tokens", 0)
            except ImportError:
                choice, tokens, hit_tokens, miss_tokens = await asyncio.to_thread(_call_deepseek_sync)

            return LLMResponse(
                content=choice,
                model_name=model,
                token_used=tokens,
                duration_ms=(time.time() - t0) * 1000,
                success=True,
                prompt_cache_hit_tokens=hit_tokens,
                prompt_cache_miss_tokens=miss_tokens
            )
        except Exception as err:
            return LLMResponse(
                content=f"Kendala pada DeepSeek API: {str(err)}",
                model_name=model,
                token_used=0,
                duration_ms=(time.time() - t0) * 1000,
                success=False,
                error_message=str(err)
            )


# ─── 3. OpenAI Provider ───────────────────────────────────────────────────────

class OpenAILLMProvider(BaseLLMProvider):
    """OpenAI GPT-4o / GPT-4o-mini implementation."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = (api_key or os.environ.get("OPENAI_API_KEY", "")).strip()
        self.model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini").strip()

    def get_provider_name(self) -> str:
        return "openai"

    async def generate_response(
        self,
        system_prompt: str,
        user_query: str,
        mcp_context: Any,
        conversation_history: Optional[List[Dict[str, Any]]] = None
    ) -> LLMResponse:
        t0 = time.time()
        api_key = self.api_key or os.environ.get("OPENAI_API_KEY", "").strip()
        if not api_key:
            return LLMResponse(
                content="Layanan OpenAI belum dikonfigurasi dengan OPENAI_API_KEY.",
                model_name="none",
                token_used=0,
                duration_ms=(time.time() - t0) * 1000,
                success=False,
                error_message="Missing OPENAI_API_KEY"
            )

        messages = [{"role": "system", "content": system_prompt}]

        if conversation_history:
            for m in conversation_history[-8:]:
                r = m.get("role") if isinstance(m, dict) else getattr(m, "role", "")
                c = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
                if r in ("user", "assistant") and c:
                    messages.append({"role": r, "content": c})

        messages.append({
            "role": "user",
            "content": (
                f"Pertanyaan Pengguna: {user_query}\n\n"
                f"Data MCP:\n{json.dumps(mcp_context, ensure_ascii=False)}"
            )
        })

        def _call_openai_sync():
            import urllib.request
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            payload = json.dumps({
                "model": self.model,
                "messages": messages,
                "temperature": 0.3
            }).encode("utf-8")
            url = "https://api.openai.com/v1/chat/completions"
            req = urllib.request.Request(url, data=payload, headers=headers)
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                choice = data["choices"][0]["message"]["content"]
                tokens = data.get("usage", {}).get("total_tokens", 0)
                return choice, tokens

        try:
            try:
                import httpx
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": self.model,
                    "messages": messages,
                    "temperature": 0.3
                }
                url = "https://api.openai.com/v1/chat/completions"
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    choice = data["choices"][0]["message"]["content"]
                    tokens = data.get("usage", {}).get("total_tokens", 0)
            except ImportError:
                choice, tokens = await asyncio.to_thread(_call_openai_sync)

            return LLMResponse(
                content=content if 'content' in locals() else choice,
                model_name=self.model,
                token_used=tokens,
                duration_ms=(time.time() - t0) * 1000,
                success=True
            )
        except Exception as err:
            return LLMResponse(
                content=f"Kendala pada OpenAI API: {str(err)}",
                model_name=self.model,
                token_used=0,
                duration_ms=(time.time() - t0) * 1000,
                success=False,
                error_message=str(err)
            )


# ─── Dependency Injection Factory ─────────────────────────────────────────────

class LLMProviderFactory:
    """Dependency Injection Factory to instantiate the active LLM Provider."""

    @staticmethod
    def get_provider(provider_type: Optional[str] = None) -> BaseLLMProvider:
        # Determine provider by argument or environment variable (default: deepseek)
        p_type = (provider_type or os.environ.get("LLM_PROVIDER", "deepseek")).lower().strip()

        if p_type == "deepseek":
            return DeepSeekLLMProvider()
        elif p_type == "openai":
            return OpenAILLMProvider()
        else:
            return GeminiLLMProvider()


def get_llm_provider() -> BaseLLMProvider:
    """Dependency injection getter for FastAPI."""
    return LLMProviderFactory.get_provider()

