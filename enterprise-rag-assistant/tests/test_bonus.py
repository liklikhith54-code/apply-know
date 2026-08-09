import pytest
from app.rag.cache import ResponseCache
from app.models.schemas import ChatResponse, Citation

def test_response_cache_flow():
    """Verify secure ResponseCache stores and retrieves scoped by entitlements."""
    cache = ResponseCache(ttl_seconds=60)
    
    query = "What is standard vacation leave?"
    user_groups_1 = ["ALL", "HR"]
    user_groups_2 = ["ALL", "ENGINEERING"]
    user_dept_1 = "HR"
    user_dept_2 = "Engineering"
    
    # Response Mock object
    response_1 = ChatResponse(
        answer="You get 20 days.",
        citations=[Citation(document_name="Leave_Policy.pdf", source_id="c1")],
        confidence="HIGH",
        retrieved_documents=[],
        latency_ms=10.0
    )
    
    response_2 = ChatResponse(
        answer="You get 15 days.",
        citations=[Citation(document_name="Standard.pdf", source_id="c2")],
        confidence="HIGH",
        retrieved_documents=[],
        latency_ms=15.0
    )
    
    # Cache miss initially
    assert cache.get(query, user_groups_1, user_dept_1) is None
    
    # Set cache for HR
    cache.set(query, user_groups_1, user_dept_1, response_1)
    
    # Cache hit for HR with exact match
    hit = cache.get(query, user_groups_1, user_dept_1)
    assert hit is not None
    assert hit.answer == "You get 20 days."
    
    # Cache miss for Engineering with same query but different entitlement groups
    assert cache.get(query, user_groups_2, user_dept_1) is None
    # Cache miss for different department
    assert cache.get(query, user_groups_1, user_dept_2) is None
    
    # Set cache for Engineering
    cache.set(query, user_groups_2, user_dept_2, response_2)
    
    # Verify both exist independently
    hit_hr = cache.get(query, user_groups_1, user_dept_1)
    hit_eng = cache.get(query, user_groups_2, user_dept_2)
    assert hit_hr.answer == "You get 20 days."
    assert hit_eng.answer == "You get 15 days."
