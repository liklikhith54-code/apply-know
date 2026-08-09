# RAG System Evaluation Results (Baseline vs Improved)

Generated on: 2026-08-08

This report evaluates and compares retrieval, generation, and operational performance of the **Baseline RAG** pipeline (vector-only, no version control, no access filters) versus the **Improved RAG** pipeline (hybrid vector-keyword, RRF, semantic boosting, query rewrite, date-version filtering, access-controlled filtering, evidence confidence checks).

## Performance Comparison Table

| Metric | Baseline | Improved | Change |
| :--- | :---: | :---: | :---: |
| **Retrieval Hit@1** | 43.33% | 60.00% | +16.67% |
| **Retrieval Hit@3** | 73.33% | 80.00% | +6.67% |
| **Retrieval Hit@5** | 73.33% | 86.67% | +13.33% |
| **Retrieval Recall@3** | 68.33% | 76.67% | +8.33% |
| **Mean Reciprocal Rank (MRR)** | 0.5500 | 0.6944 | +0.1444 |
| **Answer Correctness** | 5.31% | 16.82% | +11.51% |
| **Groundedness** | 67.93% | 100.00% | +32.07% |
| **Citation Accuracy** | 70.00% | 100.00% | +30.00% |
| **Hallucination Rate** | 100.00% | 0.00% | -100.00% |
| **Correct Negative Rate (Unanswerable)** | 0.00% | 100.00% | +100.00% |
| **Avg. Retrieval Latency** | 13.9ms | 11.3ms | -2.5ms |
| **Avg. Generation Latency** | 0.1ms | 0.0ms | -0.0ms |
| **Avg. Total Request Latency** | 13.9ms | 11.4ms | -2.5ms |

## Observations

1. **Version Control Boost**: In the baseline pipeline, old versions of policies (e.g. Leave_Policy_2024.pdf) are returned alongside or instead of current policies due to similarity matches. The improved version-filtering logic successfully selects the 2026 update, leading to higher correctness metrics.
2. **Access Control Filtering**: In baseline RAG, restricted content gets returned and sent directly to the model context. The improved pipeline filters out restricted documents pre-retrieval, maintaining strict authorization compliance.
3. **Hallucination Protection**: The baseline RAG attempts to fabricate answers on out-of-domain/unanswerable questions (e.g. Remote work, external benefits). The improved RAG's confidence checks block these, yielding a 100% correct negative response rate.
