import pytest
import os
import json
from app.rag.retriever import Retriever
from app.config import settings

@pytest.fixture
def temp_mock_index(tmp_path, monkeypatch):
    """Fixture to set up a mock index JSON file for retrieval testing."""
    mock_file = tmp_path / "mock_index.json"
    
    # Monkeypatch ROOT_DIR or mock index file path
    import app.rag.retriever
    monkeypatch.setattr(app.rag.retriever, "MOCK_INDEX_FILE", str(mock_file))
    
    # Write sample chunks with versions and access control tags
    test_chunks = [
        # Leave Policy v1 (Outdated)
        {
            "id": "leave_v1",
            "chunk_id": "leave_v1",
            "document_id": "leave_policy_2024",
            "document_name": "Leave_Policy_2024.pdf",
            "document_type": "Policy",
            "content": "Employees are entitled to 15 days of annual leave.",
            "version": "1.0",
            "effective_date": "2024-01-01",
            "access_groups": ["HR", "ADMIN"],
            "section": "Vacation Time"
        },
        # Leave Policy v2 (Active)
        {
            "id": "leave_v2",
            "chunk_id": "leave_v2",
            "document_id": "leave_policy_2026",
            "document_name": "Leave_Policy_2026.pdf",
            "document_type": "Policy",
            "content": "Employees are entitled to 20 days of annual leave according to the 2026 update.",
            "version": "2.0",
            "effective_date": "2026-01-01",
            "access_groups": ["HR", "ADMIN"],
            "section": "Vacation Time"
        },
        # Financial Limits (Legal/Finance only)
        {
            "id": "finance_v1",
            "chunk_id": "finance_v1",
            "document_id": "expense_policy_2026",
            "document_name": "Expense_Policy_2026.pdf",
            "document_type": "Policy",
            "content": "Expense limit is capped at $500 per transaction.",
            "version": "1.0",
            "effective_date": "2026-01-01",
            "access_groups": ["Finance", "Legal"],
            "section": "Expense Limits"
        }
    ]
    
    with open(mock_file, "w", encoding="utf-8") as f:
        json.dump(test_chunks, f)
        
    return mock_file

@pytest.mark.asyncio
async def test_retriever_access_control(temp_mock_index):
    """Assert that retriever enforces access group filtering."""
    retriever = Retriever()
    
    # 1. Search with engineering access (should NOT see HR or Finance/Legal chunks if they aren't marked ALL/Engineering)
    eng_results = await retriever.retrieve(
        query="annual leave policy",
        user_groups=["Engineering"]
    )
    assert len(eng_results) == 0

    # 2. Search with HR access (should see Leave Policy but NOT finance limits)
    hr_results = await retriever.retrieve(
        query="annual leave policy",
        user_groups=["HR"]
    )
    assert len(hr_results) > 0
    assert hr_results[0]["document_name"] == "Leave_Policy_2026.pdf"

@pytest.mark.asyncio
async def test_retriever_versioning(temp_mock_index):
    """Assert that retriever automatically filters out older versions of documents."""
    retriever = Retriever()
    
    # Search with HR group (both v1 and v2 would match the query keywords)
    results = await retriever.retrieve(
        query="annual leave Vacation Time days",
        user_groups=["HR", "ADMIN"]
    )
    
    # Assert that only Leave_Policy_2026 is retrieved, not Leave_Policy_2024
    assert len(results) == 1
    assert results[0]["id"] == "leave_v2"
    assert "2026" in results[0]["document_name"]
