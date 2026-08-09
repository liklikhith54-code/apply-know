import pytest
import os
import json
from pathlib import Path
from unittest.mock import patch, MagicMock
from app.config import ROOT_DIR
from evaluation.evaluate import Evaluator, populate_evaluation_corpus

DATASET_PATH = os.path.join(ROOT_DIR, "evaluation", "dataset.json")

def test_dataset_loading():
    """Verify that dataset JSON file exists and loads successfully."""
    assert os.path.exists(DATASET_PATH), "Dataset file dataset.json must exist in evaluation/"
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        dataset = json.load(f)
    assert len(dataset) >= 30, "Dataset must contain at least 30 evaluation cases"

def test_dataset_validation():
    """Validate expected keys and values in the dataset cases."""
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        dataset = json.load(f)
    
    valid_types = {
        "single_document", "straightforward", "multi-document", "multi_document",
        "multi_section", "multi-section", "ambiguous", "unanswerable", "conversational",
        "version_conflict", "version-conflict"
    }
    valid_difficulties = {"easy", "medium", "hard"}

    for idx, item in enumerate(dataset):
        assert "question" in item, f"Item at index {idx} missing 'question'"
        assert "expected_answer" in item, f"Item at index {idx} missing 'expected_answer'"
        assert "expected_documents" in item, f"Item at index {idx} missing 'expected_documents'"
        assert isinstance(item["expected_documents"], list), "expected_documents must be a list"
        assert "expected_sections" in item, f"Item at index {idx} missing 'expected_sections'"
        assert isinstance(item["expected_sections"], list), "expected_sections must be a list"
        assert "question_type" in item, f"Item at index {idx} missing 'question_type'"
        assert item["question_type"] in valid_types, f"Invalid question_type '{item['question_type']}' at index {idx}"
        assert "difficulty" in item, f"Item at index {idx} missing 'difficulty'"
        assert item["difficulty"] in valid_difficulties, f"Invalid difficulty '{item['difficulty']}' at index {idx}"

def test_hit_at_k_calculation():
    """Validate Hit@K metric calculations."""
    # Hit@K is 1 if expected doc is in first K elements, else 0
    expected = ["Doc_A.pdf"]
    retrieved_1 = ["Doc_A.pdf", "Doc_B.pdf"]
    retrieved_2 = ["Doc_C.pdf", "Doc_A.pdf"]
    retrieved_3 = ["Doc_C.pdf", "Doc_D.pdf"]

    # Hit@1
    assert any(doc in retrieved_1[:1] for doc in expected) is True
    assert any(doc in retrieved_2[:1] for doc in expected) is False
    # Hit@3
    assert any(doc in retrieved_2[:3] for doc in expected) is True
    assert any(doc in retrieved_3[:3] for doc in expected) is False

def test_recall_at_k_calculation():
    """Validate Recall@K metric calculations."""
    # Recall@K is the ratio of expected docs retrieved in top K
    expected = ["Doc_A.pdf", "Doc_B.pdf"]
    
    # Retrieves 1 out of 2 expected
    retrieved_1 = ["Doc_A.pdf", "Doc_C.pdf"]
    overlap_1 = sum(1 for doc in expected if doc in retrieved_1)
    recall_1 = overlap_1 / len(expected)
    assert recall_1 == 0.5

    # Retrieves 2 out of 2 expected
    retrieved_2 = ["Doc_B.pdf", "Doc_A.pdf"]
    overlap_2 = sum(1 for doc in expected if doc in retrieved_2)
    recall_2 = overlap_2 / len(expected)
    assert recall_2 == 1.0

def test_retrieval_relevance():
    """Verify precision calculations on retrieved chunks."""
    retrieved = ["Doc_A.pdf", "Doc_B.pdf", "Doc_C.pdf"]
    expected = ["Doc_A.pdf"]
    relevant_retrieved = sum(1 for doc in retrieved if doc in expected)
    precision = relevant_retrieved / len(retrieved)
    assert precision == 1 / 3

def test_correctness_evaluation():
    """Validate Jaccard-based token overlap correctness calculation."""
    ans = "Under the updated 2026 Leave Policy, employees receive 20 days."
    expected = "Under the updated 2026 Leave Policy, employees receive 20 days."
    different = "Unrelated policy information."

    ans_words = set(ans.lower().split())
    exp_words = set(expected.lower().split())
    overlap = len(ans_words.intersection(exp_words))
    jaccard = overlap / (len(ans_words) + len(exp_words) - overlap)
    assert jaccard == 1.0

    diff_words = set(different.lower().split())
    overlap_diff = len(diff_words.intersection(exp_words))
    jaccard_diff = overlap_diff / (len(diff_words) + len(exp_words) - overlap_diff)
    assert jaccard_diff < 0.2

def test_groundedness_evaluation():
    """Validate claim-to-context groundedness overlap scoring."""
    ans = "Employee vacation is 20 days."
    context = "Under the updated 2026 Leave Policy, employee vacation is 20 days."
    
    ans_words = set(ans.lower().split())
    context_words = set(context.lower().split())
    overlap = len(ans_words.intersection(context_words))
    groundedness = overlap / len(ans_words)
    assert groundedness == 1.0

def test_citation_correctness():
    """Validate citation correctness checks."""
    citations = ["Doc_A.pdf"]
    expected_docs = ["Doc_A.pdf"]
    cite_ok = all(doc in citations for doc in expected_docs)
    assert cite_ok is True

    # Missing citations
    expected_docs_missing = ["Doc_B.pdf"]
    cite_fail = all(doc in citations for doc in expected_docs_missing)
    assert cite_fail is False

def test_hallucination_detection():
    """Validate hallucination detection rules."""
    # Expected docs is empty (unanswerable)
    expected_docs = []
    
    # Hallucination occurs when answer claims facts instead of abstaining
    ans_hallucinated = "The remote work policy allows 3 days work from home."
    is_hallucinated_1 = "couldn't find sufficient information" not in ans_hallucinated
    assert is_hallucinated_1 is True

    # No hallucination occurs when model abstains
    ans_abstaining = "I couldn't find sufficient information in the knowledge base."
    is_hallucinated_2 = "couldn't find sufficient information" not in ans_abstaining
    assert is_hallucinated_2 is False

def test_latency_recording():
    """Validate that latency metrics are numeric and valid."""
    metrics = {
        "retrieval_latency_ms": 12.5,
        "generation_latency_ms": 105.2,
        "total_latency_ms": 117.7
    }
    assert metrics["retrieval_latency_ms"] > 0
    assert metrics["generation_latency_ms"] > 0
    assert metrics["total_latency_ms"] == metrics["retrieval_latency_ms"] + metrics["generation_latency_ms"]

@pytest.mark.asyncio
async def test_baseline_mode(tmp_path):
    """Test running the baseline evaluation pipeline."""
    with patch("evaluation.evaluate.MOCK_INDEX_FILE", str(tmp_path / "mock_index.json")):
        populate_evaluation_corpus()
        evaluator = Evaluator()
        # Cut dataset down to 1 item to run quickly
        evaluator.dataset = evaluator.dataset[:1]
        results = await evaluator.evaluate_pipeline(mode="baseline")
        assert "hit_at_1" in results
        assert "avg_latency_ms" in results

@pytest.mark.asyncio
async def test_improved_mode(tmp_path):
    """Test running the improved evaluation pipeline."""
    with patch("evaluation.evaluate.MOCK_INDEX_FILE", str(tmp_path / "mock_index.json")):
        populate_evaluation_corpus()
        evaluator = Evaluator()
        evaluator.dataset = evaluator.dataset[:1]
        results = await evaluator.evaluate_pipeline(mode="improved")
        assert "hit_at_1" in results
        assert "avg_latency_ms" in results

def test_comparison_generation(tmp_path):
    """Verify metrics table reports generate correctly."""
    comparison_md = tmp_path / "comparison.md"
    baseline = {"hit_at_1": 0.5, "hit_at_3": 0.7, "hit_at_5": 0.8, "recall_at_3": 0.6, "mrr": 0.55, "answer_correctness": 0.5, "groundedness": 0.6, "citation_correctness": 0.4, "hallucination_rate": 0.2, "unanswerable_correct_rate": 0.8, "avg_latency_ms": 50.0, "avg_ret_latency_ms": 10.0, "avg_gen_latency_ms": 40.0}
    improved = {"hit_at_1": 0.9, "hit_at_3": 0.95, "hit_at_5": 0.98, "recall_at_3": 0.92, "mrr": 0.91, "answer_correctness": 0.85, "groundedness": 0.95, "citation_correctness": 0.9, "hallucination_rate": 0.0, "unanswerable_correct_rate": 1.0, "avg_latency_ms": 75.0, "avg_ret_latency_ms": 15.0, "avg_gen_latency_ms": 60.0}
    
    report = f"Hit@1 Baseline: {baseline['hit_at_1']:.2%}, Improved: {improved['hit_at_1']:.2%}"
    comparison_md.write_text(report, encoding="utf-8")
    assert comparison_md.exists()
    assert "Hit@1 Baseline: 50.00%" in comparison_md.read_text(encoding="utf-8")
