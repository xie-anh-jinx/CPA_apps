import json
import redis
from app.config import settings

_redis_client = None

def get_redis():
    global _redis_client
    if _redis_client is None:
        # Use sync redis client since Celery workers run synchronously
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client

def publish_sync_event(table_name: str):
    try:
        r = get_redis()
        message = json.dumps({
            "event": "sync_completed",
            "table": table_name
        })
        r.publish("sync_events", message)
    except Exception as e:
        # Ignore redis errors so it doesn't break the sync worker
        pass
