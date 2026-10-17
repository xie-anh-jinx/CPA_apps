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
        mcp_context: Any
    ) -> LLMResponse:
        """
        Executes reasoning on top of MCP context.
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
        mcp_context: Any
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

        full_prompt = (
            f"{system_prompt}\n\n"
            f"Pertanyaan Pengguna: {user_query}\n\n"
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

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or os.environ.get("DEEPSEEK_API_KEY", "").strip()
        self.base_url = base_url or os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
        self.model = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")

    def get_provider_name(self) -> str:
        return "deepseek"

    async def generate_response(
        self,
        system_prompt: str,
        user_query: str,
        mcp_context: Any
    ) -> LLMResponse:
        t0 = time.time()
        if not self.api_key:
            return LLMResponse(
                content="Layanan LLM DeepSeek belum dikonfigurasi dengan DEEPSEEK_API_KEY.",
                model_name="none",
                token_used=0,
                duration_ms=(time.time() - t0) * 1000,
                success=False,
                error_message="Missing DEEPSEEK_API_KEY"
            )

        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    f"Pertanyaan Pengguna: {user_query}\n\n"
                    f"Data MCP:\n{json.dumps(mcp_context, ensure_ascii=False)}"
                )
            }
        ]

        def _call_deepseek():
            import requests
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.3
            }
            resp = requests.post(f"{self.base_url}/chat/completions", headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            choice = data["choices"][0]["message"]["content"]
            tokens = data.get("usage", {}).get("total_tokens", 0)
            return choice, tokens

        try:
            content, tokens = await asyncio.to_thread(_call_deepseek)
            return LLMResponse(
                content=content,
                model_name=self.model,
                token_used=tokens,
                duration_ms=(time.time() - t0) * 1000,
                success=True
            )
        except Exception as err:
            return LLMResponse(
                content=f"Kendala pada DeepSeek API: {str(err)}",
                model_name=self.model,
                token_used=0,
                duration_ms=(time.time() - t0) * 1000,
                success=False,
                error_message=str(err)
            )


# ─── 3. OpenAI Provider ───────────────────────────────────────────────────────

class OpenAILLMProvider(BaseLLMProvider):
    """OpenAI GPT-4o / GPT-4o-mini implementation."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "").strip()
        self.model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

    def get_provider_name(self) -> str:
        return "openai"

    async def generate_response(
        self,
        system_prompt: str,
        user_query: str,
        mcp_context: Any
    ) -> LLMResponse:
        t0 = time.time()
        if not self.api_key:
            return LLMResponse(
                content="Layanan OpenAI belum dikonfigurasi dengan OPENAI_API_KEY.",
                model_name="none",
                token_used=0,
                duration_ms=(time.time() - t0) * 1000,
                success=False,
                error_message="Missing OPENAI_API_KEY"
            )

        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    f"Pertanyaan Pengguna: {user_query}\n\n"
                    f"Data MCP:\n{json.dumps(mcp_context, ensure_ascii=False)}"
                )
            }
        ]

        def _call_openai():
            import requests
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": 0.3
            }
            resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            choice = data["choices"][0]["message"]["content"]
            tokens = data.get("usage", {}).get("total_tokens", 0)
            return choice, tokens

        try:
            content, tokens = await asyncio.to_thread(_call_openai)
            return LLMResponse(
                content=content,
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
        # Determine provider by argument or environment variable (default: gemini)
        p_type = (provider_type or os.environ.get("LLM_PROVIDER", "gemini")).lower().strip()

        if p_type == "deepseek":
            return DeepSeekLLMProvider()
        elif p_type == "openai":
            return OpenAILLMProvider()
        else:
            return GeminiLLMProvider()


# Singleton default provider
_default_provider = LLMProviderFactory.get_provider()

def get_llm_provider() -> BaseLLMProvider:
    """Dependency injection getter for FastAPI."""
    return _default_provider
