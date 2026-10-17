"""
PADI ERP / CPA Analytics — Audit Logger Layer
==============================================
Records audit entries for every user request processed by the AI Router:
- timestamp
- user
- intent
- route ("mcp" or "llm")
- tool
- duration
- token_used (0 if route == mcp)
- success

Provides real-time token reduction analytics to verify the 80–90% savings target.
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from collections import deque
from dataclasses import dataclass, asdict


LOGS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "logs")
)
os.makedirs(LOGS_DIR, exist_ok=True)
AUDIT_LOG_FILE = os.path.join(LOGS_DIR, "ai_router_audit.jsonl")


@dataclass
class AuditEntry:
    timestamp: str
    user: str
    intent: str
    route: str  # "mcp" or "llm"
    tool: str
    duration: float  # ms
    token_used: int
    success: bool
    extra_details: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if self.extra_details is None:
            d.pop("extra_details", None)
        return d


class AuditLogger:
    """Manages persistent and in-memory audit logs for AI Router metrics."""

    def __init__(self, log_path: str = AUDIT_LOG_FILE, memory_buffer_size: int = 500):
        self.log_path = log_path
        self._buffer: deque = deque(maxlen=memory_buffer_size)
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)
        # Pre-load existing entries from disk
        if os.path.exists(self.log_path):
            try:
                with open(self.log_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            data = json.loads(line)
                            entry = AuditEntry(
                                timestamp=data.get("timestamp", ""),
                                user=data.get("user", ""),
                                intent=data.get("intent", ""),
                                route=data.get("route", "mcp"),
                                tool=data.get("tool", ""),
                                duration=float(data.get("duration", 0)),
                                token_used=int(data.get("token_used", 0)),
                                success=bool(data.get("success", True)),
                                extra_details=data.get("extra_details")
                            )
                            self._buffer.append(entry)
            except Exception:
                pass

    def log(
        self,
        user: str,
        intent: str,
        route: str,
        tool: str,
        duration: float,
        token_used: int = 0,
        success: bool = True,
        extra_details: Optional[Dict[str, Any]] = None
    ) -> AuditEntry:
        """
        Records an audit entry.
        Guarantees that if route == 'mcp', token_used is strictly 0.
        """
        actual_tokens = 0 if route.lower() == "mcp" else max(0, token_used)

        entry = AuditEntry(
            timestamp=datetime.now().isoformat(),
            user=user,
            intent=intent,
            route=route.lower(),
            tool=tool,
            duration=round(duration, 2),
            token_used=actual_tokens,
            success=success,
            extra_details=extra_details
        )

        # 1. Append to in-memory buffer
        self._buffer.append(entry)

        # 2. Append to JSON Lines file
        try:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry.to_dict(), ensure_ascii=False) + "\n")
        except Exception:
            pass

        return entry

    def get_recent_entries(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Returns recent audit logs."""
        entries = list(self._buffer)
        return [e.to_dict() for e in reversed(entries[-limit:])]

    def get_statistics(self) -> Dict[str, Any]:
        """
        Calculates token savings and routing distributions.
        Validates the 80–90% reduction target.
        """
        entries = list(self._buffer)
        total_requests = len(entries)
        if total_requests == 0:
            return {
                "total_requests": 0,
                "mcp_requests": 0,
                "llm_requests": 0,
                "mcp_percentage": 0.0,
                "llm_percentage": 0.0,
                "total_tokens_consumed": 0,
                "estimated_tokens_saved": 0,
                "token_savings_percentage": 0.0
            }

        mcp_count = sum(1 for e in entries if e.route == "mcp")
        llm_count = sum(1 for e in entries if e.route == "llm")
        total_tokens = sum(e.token_used for e in entries)

        # If MCP requests had called an LLM, each would average ~800 tokens
        avg_tokens_per_llm_request = 800
        estimated_saved = mcp_count * avg_tokens_per_llm_request
        hypothetical_total = total_tokens + estimated_saved
        savings_ratio = (estimated_saved / hypothetical_total * 100) if hypothetical_total > 0 else 0.0

        return {
            "total_requests": total_requests,
            "mcp_requests": mcp_count,
            "llm_requests": llm_count,
            "mcp_percentage": round((mcp_count / total_requests) * 100, 1),
            "llm_percentage": round((llm_count / total_requests) * 100, 1),
            "total_tokens_consumed": total_tokens,
            "estimated_tokens_saved": estimated_saved,
            "token_savings_percentage": round(savings_ratio, 1)
        }


# ─── Singleton ────────────────────────────────────────────────────────────────

_audit_logger = AuditLogger()

def get_audit_logger() -> AuditLogger:
    return _audit_logger
