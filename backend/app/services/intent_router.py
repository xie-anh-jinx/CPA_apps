"""
PADI ERP — Intent Router (Services Re-export)
Ensures backwards-compatibility with services architecture.
"""
from app.router.intent_router import (
    IntentRouter,
    IntentRouteResult,
    IntentRule,
    route_intent,
    _default_router
)

__all__ = ["IntentRouter", "IntentRouteResult", "IntentRule", "route_intent", "_default_router"]
