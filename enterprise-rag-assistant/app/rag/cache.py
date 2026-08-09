import logging
import time
from typing import Dict, Any, List, Tuple, Optional

logger = logging.getLogger(__name__)

class ResponseCache:
    """Secure response cache for RAG queries that respects user access control credentials."""

    def __init__(self, ttl_seconds: int = 300, max_size: int = 1000):
        self.ttl_seconds = ttl_seconds
        self.max_size = max_size
        self._cache: Dict[Tuple[str, str, Optional[str]], Tuple[float, Any]] = {}

    def _get_key(
        self,
        query: str,
        user_groups: List[str],
        user_department: Optional[str],
        search_mode: str = "hybrid",
        top_k: int = 5
    ) -> Tuple[str, str, Optional[str], str, int]:
        # Sort groups to ensure consistent ordering for key creation
        sorted_groups_str = ",".join(sorted(user_groups))
        return (query.strip().lower(), sorted_groups_str, user_department, search_mode, top_k)

    def get(
        self,
        query: str,
        user_groups: List[str],
        user_department: Optional[str],
        search_mode: str = "hybrid",
        top_k: int = 5
    ) -> Optional[Any]:
        """Fetch cached answer if present and not expired, respecting identity parameters."""
        key = self._get_key(query, user_groups, user_department, search_mode, top_k)
        if key in self._cache:
            timestamp, cached_response = self._cache[key]
            if time.time() - timestamp < self.ttl_seconds:
                logger.info(f"Response cache HIT for query: '{query}'")
                return cached_response
            else:
                # Expired cache element cleanup
                logger.info(f"Response cache EXPIRED element removed for query: '{query}'")
                del self._cache[key]
        return None

    def set(
        self,
        query: str,
        user_groups: List[str],
        user_department: Optional[str],
        response: Any,
        search_mode: str = "hybrid",
        top_k: int = 5
    ) -> None:
        """Stores RAG response mapped securely to user identity criteria."""
        if len(self._cache) >= self.max_size:
            # Simple eviction of oldest item if cache is full
            oldest_key = next(iter(self._cache))
            del self._cache[oldest_key]
            logger.info("Response cache full. Evicted oldest cache element.")

        key = self._get_key(query, user_groups, user_department, search_mode, top_k)
        self._cache[key] = (time.time(), response)
        logger.info(f"Response cache SET entry stored for query: '{query}'")

    def clear(self) -> None:
        """Flushes all entries in the query cache."""
        self._cache.clear()
        logger.info("Response cache flushed successfully.")
