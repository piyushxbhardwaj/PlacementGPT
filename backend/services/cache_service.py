import os
import redis
import json
import logging
import hashlib
from typing import Optional, Dict, Any, List

logger = logging.getLogger("placementgpt")

class CacheService:
    def __init__(self):
        # Read from environment or config
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client = None
        self._local_cache: Dict[str, Dict[str, Any]] = {}
        
        try:
            logger.info(f"Connecting to Redis Cache at {redis_url}...")
            self.redis_client = redis.Redis.from_url(redis_url, socket_timeout=2.0)
            # Ping connection to confirm active
            self.redis_client.ping()
            logger.info("Connected to Redis successfully.")
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {str(e)}. Falling back to local in-memory cache.")
            self.redis_client = None

    def _generate_key(self, user_id: str, query: str, document_ids: List[str]) -> str:
        """
        Generates a deterministic hash representing the user query and the user's document state.
        By hashing the active document IDs, the cache automatically invalidates if any document
        is added, updated, or deleted.
        """
        # Sort document IDs to guarantee key consistency
        sorted_docs = sorted(document_ids)
        raw_key = f"user:{user_id}:query:{query.strip().lower()}:docs:{','.join(sorted_docs)}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    def get_cached_response(self, user_id: str, query: str, document_ids: List[str]) -> Optional[Dict[str, Any]]:
        """Retrieve cached response if key matches."""
        cache_key = self._generate_key(user_id, query, document_ids)
        
        # Redis implementation
        if self.redis_client:
            try:
                cached_val = self.redis_client.get(cache_key)
                if cached_val:
                    logger.info(f"Cache hit (Redis) for query hash: {cache_key}")
                    return json.loads(cached_val.decode("utf-8"))
            except Exception as e:
                logger.error(f"Redis get failed: {str(e)}")
        
        # Local fallback implementation
        else:
            if cache_key in self._local_cache:
                logger.info(f"Cache hit (In-Memory) for query hash: {cache_key}")
                return self._local_cache[cache_key]

        return None

    def cache_response(self, user_id: str, query: str, document_ids: List[str], response_data: Dict[str, Any], ttl: int = 3600) -> None:
        """Stores query response in cache with optional TTL (time-to-live) in seconds."""
        cache_key = self._generate_key(user_id, query, document_ids)
        
        # Redis implementation
        if self.redis_client:
            try:
                self.redis_client.setex(
                    cache_key,
                    ttl,
                    json.dumps(response_data)
                )
                logger.info(f"Cached response (Redis) for query hash: {cache_key}")
            except Exception as e:
                logger.error(f"Redis set failed: {str(e)}")
                
        # Local fallback implementation
        else:
            self._local_cache[cache_key] = response_data
            logger.info(f"Cached response (In-Memory) for query hash: {cache_key}")

    def clear_cache(self) -> None:
        """Clear all cache values (useful for migrations/testing)."""
        if self.redis_client:
            try:
                self.redis_client.flushdb()
                logger.info("Redis cache cleared.")
            except Exception as e:
                logger.error(f"Redis flush failed: {str(e)}")
        else:
            self._local_cache.clear()
            logger.info("Local cache cleared.")

# Global cache service instance
cache_service = CacheService()
