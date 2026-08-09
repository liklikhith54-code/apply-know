import pytest
from app.rag.query_rewriter import QueryRewriter
from app.rag.retriever import Retriever
from app.rag.confidence import ConfidenceScorer
from app.rag.generator import Generator

@pytest.mark.asyncio
async def test_query_rewriter_mock():
    """Verify conversational query rewriting mock resolutions."""
    rewriter = QueryRewriter()
    history = [
        {"role": "user", "content": "What is the Enterprise cancellation policy?"},
        {"role": "assistant", "content": "The cancellation policy is 30 days."}
    ]
    standalone = await rewriter.rewrite("What about Standard?", history)
    assert "Standard" in standalone
    assert "cancellation" in standalone or "limit" in standalone

def test_confidence_scorer_thresholds():
    """Verify confidence classification scoring."""
    scorer = ConfidenceScorer(threshold=0.4)
    
    # Empty case
    res = scorer.evaluate_confidence("test", [])
    assert res["sufficient_evidence"] is False
    assert res["rating"] == "Low"

    # High match case
    high_match_chunks = [
        {"id": "doc_1", "score": 0.8, "content": "This is a document about employee benefits and policies."}
    ]
    res_high = scorer.evaluate_confidence("employee benefits", high_match_chunks)
    assert res_high["sufficient_evidence"] is True
    assert res_high["rating"] == "High"

@pytest.mark.asyncio
async def test_generator_mock_groundedness():
    """Verify generator returns standard response when confidence is low, and citations when high."""
    generator = Generator()
    
    # Case: Insufficient evidence
    res_low = await generator.generate_answer(
        query="What is the refund limit?",
        chunks=[],
        confidence_result={"sufficient_evidence": False}
    )
    assert "couldn't find sufficient information" in res_low["answer"]
    assert res_low["citations"] == []

    # Case: Sufficient evidence
    chunks = [
        {"id": "c1", "document_name": "Refund_Policy.pdf", "section": "Limits", "content": "Refund limit is $100."}
    ]
    res_high = await generator.generate_answer(
        query="What is the refund limit?",
        chunks=chunks,
        confidence_result={"sufficient_evidence": True}
    )
    assert "Refund_Policy.pdf" in res_high["answer"]
    assert len(res_high["citations"]) == 1
    assert res_high["citations"][0]["document_name"] == "Refund_Policy.pdf"
    assert res_high["citations"][0]["source_id"] == "c1"
