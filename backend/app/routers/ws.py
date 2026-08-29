import asyncio
import json
import logging
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as redis
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.redis = redis.from_url(settings.redis_url, decode_responses=True)
        self.pubsub = self.redis.pubsub()
        self.listen_task = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Start listening to redis if not already started
        if self.listen_task is None or self.listen_task.done():
            self.listen_task = asyncio.create_task(self.listen_redis())

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)

    async def listen_redis(self):
        """Listen to Redis pub/sub channel for sync events from Celery workers"""
        await self.pubsub.subscribe("sync_events")
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    data = message["data"]
                    await self.broadcast(data)
        except asyncio.CancelledError:
            await self.pubsub.unsubscribe("sync_events")
        except Exception as e:
            logger.error(f"Redis listen error: {e}")

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We don't expect messages from client, but we need to keep connection open
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
