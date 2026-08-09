# RAG Evaluation

## 1. Evaluation Objective
The primary objective is to construct a reproducible, data-driven evaluation framework to benchmark and compare:
- A vector-only baseline RAG pipeline.
- The improved RAG assistant pipeline implementing hybrid retrieval, query rewriting, version control, security filters, and multi-factor confidence scoring.

## 2. Dataset
The evaluation dataset is located at [dataset.json](file:///c:/Users/Likhith/OneDrive/Desktop/Coding/maps/enterprise-rag-assistant/evaluation/dataset.json). It contains exactly 30 test cases covering various scenarios:
- **straightforward** (single-document questions)
- **multi-document** (questions spanning multiple source files)
- **multi-section** (questions requiring context from different sections)
- **ambiguous** (vague terms requiring clarification)
- **unanswerable** (out of scope queries where the model must abstain)
- **conversational** (follow-ups using chat history context)
- **version-conflict** (queries targeting overridden policies)

Each test case contains fields specifying the expected answer, target documents, target sections, and difficulty levels (`easy`, `medium`, `hard`).

## 3. Baseline RAG
The baseline pipeline is implemented in [baseline.py](file:///c:/Users/Likhith/OneDrive/Desktop/Coding/maps/enterprise-rag-assistant/evaluation/baseline.py). It models a standard RAG workflow:
- No conversational history parsing (ignores context).
- Vector-only search query execution (no keyword matching or semantic boosting).
- Direct top-K selection without security, version-control, or date filtering.
- Direct forwarding of retrieved chunks to the generator without confidence checks.

## 4. Improved RAG
The improved pipeline executes advanced RAG query processing:
1. **Query Rewriting**: Contextualizes multi-turn conversations into standalone queries.
2. **Metadata Filtering**: Checks Entra ID access groups and filters out outdated document versions using comparative date metrics.
3. **Hybrid Search**: Fuses keyword and vector ranks using Reciprocal Rank Fusion (RRF).
4. **Confidence Verification**: Screens the relevance, rerank score, and support consistency of chunks, falling back to a standard negative response when evidence is insufficient.

## 5. Retrieval Metrics
Retrieval precision and recall are tracked using:
- **Hit@1**: Whether the target document is returned in the first slot.
- **Hit@3**: Whether target documents appear within the top 3 results.
- **Hit@5**: Whether target documents appear within the top 5 results.
- **Recall@K**: The proportion of target documents successfully retrieved within top K.
- **MRR (Mean Reciprocal Rank)**: Calculates the average rank of the first relevant result.

## 6. Generation Metrics
Answer generation quality is validated using:
- **Answer Correctness**: Jaccard token overlap between generated and expected texts.
- **Groundedness**: Overlap proportion between generated answers and retrieved context words.
- **Citation Correctness**: Ensures cited source files match expected target documents.
- **Hallucination Rate**: Measure of incorrect factual claims generated for unanswerable queries instead of correct negative responses ("I couldn't find sufficient information...").

## 7. System Metrics
Tracks query overhead and efficiency metrics:
- **avg_latency_ms**: Mean total latency per query.
- **avg_ret_latency_ms**: Mean retrieval stage latency.
- **avg_gen_latency_ms**: Mean text generation stage latency.
- **Estimated Cost**: Calculated using mock OpenAI model pricing structures.

## 8. Results
Metrics gathered from running the 30-query evaluation suite:

### Baseline Results
- Hit@1: **43.33%**
- Hit@3: **73.33%**
- Hit@5: **73.33%**
- Recall@3: **68.33%**
- MRR: **0.5500**
- Answer Correctness: **5.31%**
- Groundedness: **67.93%**
- Citation Accuracy: **70.00%**
- Hallucination Rate: **100.00%**
- Correct Negative Rate: **0.00%**

### Improved Results
- Hit@1: **60.00%**
- Hit@3: **80.00%**
- Hit@5: **86.67%**
- Recall@3: **76.67%**
- MRR: **0.6944**
- Answer Correctness: **16.82%**
- Groundedness: **100.00%**
- Citation Accuracy: **100.00%**
- Hallucination Rate: **0.00%**
- Correct Negative Rate: **100.00%**

## 9. Error Analysis
### Wrong Chunk / Outdated Document
- **Query**: "What is the annual leave allocation in the 2024 Leave Policy?"
- **Baseline**: Returned the 2026 policy or mixed the 2024 and 2026 contexts due to high semantic similarities.
- **Improved**: Filtered out versions strictly utilizing version filters, matching the requested year correctly.

### Hallucination
- **Query**: "How many remote working days are allowed under the HR guideline?"
- **Baseline**: Prompted the LLM with unrelated policy details, leading it to fabricate a remote work rules statement.
- **Improved**: The multi-factor confidence scorer classified the relevance as `LOW` due to low score matches, prompting the pipeline to return a correct negative response.

## 10. Baseline vs Improved
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

## 11. Limitations
- **Mock LLM Generative Benchmarking**: Jaccard token overlap is a text-comparison heuristic. Since the mock LLM outputs templated patterns, Jaccard scores do not fully reflect semantic equivalence in human answers.
- **Mock Reranking**: The mock retriever simulates reranking scores based on keyword overlaps. True reranking metrics require a live Azure AI Search/Cohere model.

## 12. Azure AI Foundry Integration
To integrate Azure AI Foundry evaluations:
1. Initialize the `AIProjectClient` using your subscription and project credentials.
2. Package the `evaluate_pipeline` execution outputs as a dataset flow.
3. Call the `evaluate` method of the Azure AI Foundry SDK referencing target evaluators (such as Groundedness, Relevance, and Coherence metrics).
4. Run:
   ```python
   from azure.ai.evaluation import evaluate, GroundednessEvaluator
   # Configure evaluations and register results in Azure AI Foundry workspace
   ```
