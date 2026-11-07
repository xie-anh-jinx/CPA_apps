"""
PADI ERP / CPA Analytics — Multi-Layer Cache Service
===================================================
Implements Redis Query Caching (Layer 2) and LLM Response Caching (Layer 6)
with local in-memory fallback for high-concurrency token reduction.
"""
import os
import json
import time
import hashlib
import logging
from typing import Dict, Any, Optional, Tuple

from app.mcp.session import get_redis_client

logger = logging.getLogger(__name__)

# Default TTL configurations (in seconds)
DEFAULT_QUERY_TTL = int(os.getenv("QUERY_CACHE_TTL", "180"))       # 3 minutes for operational queries
DEFAULT_STOCK_TTL = int(os.getenv("STOCK_CACHE_TTL", "120"))       # 2 minutes for real-time stock
DEFAULT_DO_TTL = int(os.getenv("DO_CACHE_TTL", "120"))             # 2 minutes for delivery orders
DEFAULT_LLM_TTL = int(os.getenv("LLM_RESPONSE_CACHE_TTL", "600"))  # 10 minutes for analytical responses

# In-memory fallback cache: {key: (value, expire_timestamp)}
_memory_cache: Dict[str, Tuple[Any, float]] = {}


def _clean_memory_cache():
    """Removes expired keys from memory cache to prevent unbounded growth."""
    now = time.time()
    expired = [k for k, (_, exp) in _memory_cache.items() if exp < now]
    for k in expired:
        _memory_cache.pop(k, None)


def _make_key(prefix: str, identifier: str, role: Optional[str] = None) -> str:
    """Generates a secure MD5 hash key namespaced by module and user role."""
    payload = f"{identifier}:{role or 'public'}"
    h = hashlib.md5(payload.encode("utf-8")).hexdigest()
    return f"cpa:{prefix}:{h}"


class CacheService:
    """High-performance Redis and In-Memory Caching Service."""

    def __init__(self):
        self._stats = {
            "query_cache_hits": 0,
            "query_cache_misses": 0,
            "llm_cache_hits": 0,
            "llm_cache_misses": 0,
            "tokens_saved_estimate": 0,
        }

    # ─── Layer 2: Query Cache (Redis) ──────────────────────────────────────────

    def get_query_cache(self, tool_name: str, args: Dict[str, Any], role: str = "admin") -> Optional[Dict[str, Any]]:
        """Retrieves cached MCP tool output to prevent repetitive PostgreSQL queries."""
        norm_args = json.dumps(args, sort_keys=True)
        key = _make_key(f"query:{tool_name}", norm_args, role)

        r = get_redis_client()
        if r:
            try:
                raw = r.get(key)
                if raw:
                    self._stats["query_cache_hits"] += 1
                    logger.debug(f"[Cache Hit Layer 2] {tool_name} from Redis")
                    return json.loads(raw)
            except Exception as e:
                logger.warning(f"Redis query cache get error: {e}")

        # Check in-memory fallback
        now = time.time()
        if key in _memory_cache:
            val, exp = _memory_cache[key]
            if exp > now:
                self._stats["query_cache_hits"] += 1
                logger.debug(f"[Cache Hit Layer 2] {tool_name} from Memory")
                return val
            else:
                _memory_cache.pop(key, None)

        self._stats["query_cache_misses"] += 1
        return None

    def set_query_cache(
        self,
        tool_name: str,
        args: Dict[str, Any],
        data: Dict[str, Any],
        role: str = "admin",
        ttl_seconds: Optional[int] = None
    ) -> None:
        """Stores tool execution output in Redis with an automatic expiration TTL."""
        if not data or data.get("isError"):
            return  # Do not cache failed queries

        ttl = ttl_seconds or (DEFAULT_STOCK_TTL if "stock" in tool_name else (DEFAULT_DO_TTL if "do" in tool_name else DEFAULT_QUERY_TTL))
        norm_args = json.dumps(args, sort_keys=True)
        key = _make_key(f"query:{tool_name}", norm_args, role)

        r = get_redis_client()
        if r:
            try:
                r.setex(key, ttl, json.dumps(data, ensure_ascii=False))
                return
            except Exception as e:
                logger.warning(f"Redis query cache set error: {e}")

        # Memory fallback
        _clean_memory_cache()
        _memory_cache[key] = (data, time.time() + ttl)

    # ─── Layer 6: Response Cache (LLM DeepSeek) ────────────────────────────────

    def get_llm_response(self, query: str, role: str = "admin") -> Optional[Dict[str, Any]]:
        """Checks if an identical analytical question was recently answered by DeepSeek."""
        clean_q = " ".join(query.strip().lower().split())
        key = _make_key("llm_resp", clean_q, role)

        r = get_redis_client()
        if r:
            try:
                raw = r.get(key)
                if raw:
                    cached_item = json.loads(raw)
                    self._stats["llm_cache_hits"] += 1
                    self._stats["tokens_saved_estimate"] += cached_item.get("tokens_estimated", 1500)
                    logger.info(f"[Cache Hit Layer 6] DeepSeek response served from Redis cache for query: {query[:40]}...")
                    return cached_item
            except Exception as e:
                logger.warning(f"Redis LLM cache get error: {e}")

        # Memory fallback
        now = time.time()
        if key in _memory_cache:
            val, exp = _memory_cache[key]
            if exp > now:
                self._stats["llm_cache_hits"] += 1
                self._stats["tokens_saved_estimate"] += val.get("tokens_estimated", 1500)
                logger.info(f"[Cache Hit Layer 6] DeepSeek response served from Memory cache")
                return val
            else:
                _memory_cache.pop(key, None)

        self._stats["llm_cache_misses"] += 1
        return None

    def set_llm_response(
        self,
        query: str,
        content: str,
        role: str = "admin",
        model: str = "deepseek-chat",
        token_used: int = 0,
        ttl_seconds: Optional[int] = None
    ) -> None:
        """Stores DeepSeek analytical response to eliminate redundant LLM API calls."""
        if not content or len(content.strip()) < 10:
            return

        ttl = ttl_seconds or DEFAULT_LLM_TTL
        clean_q = " ".join(query.strip().lower().split())
        key = _make_key("llm_resp", clean_q, role)

        payload = {
            "content": content,
            "cached_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "model": model,
            "tokens_estimated": token_used or 1200,
            "source": "response_cache"
        }

        r = get_redis_client()
        if r:
            try:
                r.setex(key, ttl, json.dumps(payload, ensure_ascii=False))
                return
            except Exception as e:
                logger.warning(f"Redis LLM cache set error: {e}")

        # Memory fallback
        _clean_memory_cache()
        _memory_cache[key] = (payload, time.time() + ttl)

    # ─── Cache Analytics ───────────────────────────────────────────────────────

    def get_stats(self) -> Dict[str, Any]:
        """Returns statistics on cache hits, misses, and estimated token savings."""
        return {
            **self._stats,
            "memory_cache_entries": len(_memory_cache),
            "redis_connected": get_redis_client() is not None
        }


# Singleton Instance
cache_service = CacheService()
