"""
CPA Platform — Model Context Protocol (MCP) Server
Enterprise Role-Based Access Control (RBAC) & Row-Level Security (RLS) for LLMs (GPT, Gemini, Claude, Cursor)
"""
from app.mcp.router import router

__all__ = ["router"]
