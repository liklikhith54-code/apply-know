# Failure Diagnosis and Analysis Log

This log chronicles the analysis and mitigation of critical failure modes within our Enterprise RAG Assistant.

---

# Scenario 1

## Problem
Retrieval extracts pages from the correct document, but misses the specific chunk containing the answer.

## Expected Behavior
The retriever should reliably locate the precise chunk containing standard policy details, e.g. section-level guidelines.

## Baseline Behavior
The system returns a negative response ("I couldn't find sufficient information...") or cites the correct document name but references general sections rather than the specific details requested.

## Root Cause
A mismatch between the chunk size and the query formulation, combined with vector similarity dilution. If chunk sizes are too large or small, key details get hidden by surrounding context, causing the dense vectors to align poorly with narrow questions.

## Investigation
1. Inspect the retrieved chunk IDs and compare their contents with the expected target chunk.
2. Run cosine similarity queries directly on both chunks.
3. Observe that the correct chunk ranking fell outside the Top-K (ranked at #8, while Top-K was 5).

## Solution
1. Implement **Hybrid Search (Vector + Keyword)**. Keyword matching boosts the ranking of chunks that contain exact matching terms (e.g. specialized keywords like "CFO approval") which offsets weak semantic vector alignment.
2. Tune chunk size to 1,000 characters and overlap to 200 characters to prevent splitting sentence boundaries.

## Implementation
Configured chunk_size, chunk_overlap, top_k, and candidate_k parameters. Hybrid search combines term matches with dense vector distance.

## Test
Verify retrieval on sample policy documents. Assert that keyword matching retrieves chunks that fail pure vector similarity checks.

## Result
Benchmark pending.

## Trade-offs
Larger candidate_k values increase recall but yield higher latency and require more context space inside the LLM prompt.

## Production Considerations
In production, adjust candidate_k based on search service tier capabilities and context token costs.

---

# Scenario 2

## Problem
The query requires synthesizing facts located in different pages, sections, or files (e.g., comparing Enterprise and Standard plans).

## Expected Behavior
The system retrieves chunks for both compared terms and generates a comparative grounded output.

## Baseline Behavior
The answer contains information about only one of the plans or claims that standard/enterprise comparison is not present in the docs.

## Root Cause
Vector search retrieves only the single most similar chunk (usually the one matching the first half of the query) and leaves the other crucial context ranked below the retrieval threshold.

## Investigation
Analyze retrieved chunks and notice that chunks about "Standard Plan" were retrieved, but chunks about "Enterprise Plan" were omitted because they had a lower similarity score compared to the overall query.

## Solution
Use **Keyword-Vector Hybrid search with Reciprocal Rank Fusion (RRF)**. RRF merges ranked lists from different search passes, ensuring chunks containing either "Standard Plan" or "Enterprise Plan" terms are elevated. Additionally, set retrieval limits (Top-K) to a minimum of 5.

## Implementation
Integrated RRF combining vector searches with keyword index weights. The context builder aggregates and formats chunks with metadata tags.

## Test
Query standard vs enterprise plan comparisons and verify both document details are present in the parsed context.

## Result
Benchmark pending.

## Trade-offs
Consolidating context from multiple sections can cause clutter, requiring clear delimiters for the LLM.

## Production Considerations
Ensure search indices structure fields for rapid candidate fusion.

---

# Scenario 3

## Problem
Retrieving outdated policies (e.g., Leave Policy 2024) instead of current ones (e.g., Leave Policy 2026).

## Expected Behavior
The retriever identifies and prioritizes the 2026 policy as the authoritative source for "current" questions.

## Baseline Behavior
The system returns the 15-day leave allocation (from 2024) instead of the 20-day allocation (from 2026) due to close semantic overlap.

## Root Cause
Semantic similarity does not automatically mean temporal authority. Vector models align semantically with the concept of "annual leave allocation" regardless of the date, causing both 2024 and 2026 documents to register high scores.

## Investigation
Look at retrieval lists and observe that the 2024 document is returned at rank 1 due to a slight text variation, despite the 2026 document also being present at rank 2.

## Solution
Implement a **metadata version filter**. Extract document type and base title. Identify version numbers and effective dates during document parser ingestion, and filter out older versions in the retriever class before passing chunks to the LLM.

## Implementation
Enriched metadata schema with effective_date and version. Retriever handles date comparison bounds.

## Test
Verify query results comparing 2024 and 2026 documents return the 2026 policy as current.

## Result
Benchmark pending.

## Trade-offs
Excluding older docs completely prevents answering historical queries ("What was the policy in 2024?").

## Production Considerations
Index design must store dates as filterable fields rather than raw strings.

---

# Scenario 4

## Problem
The query asks about information not contained in the knowledge base (e.g., remote work policy).

## Expected Behavior
The system responds with a standard negative response indicating insufficient information.

## Baseline Behavior
The system invents a plausible answer or summarizes irrelevant chunks to make it look like an answer (hallucination).

## Root Cause
The LLM attempts to act helpful, using its pre-trained knowledge or forcing retrieved context to match the query.

## Investigation
Observe that similarity scores of retrieved chunks are low (e.g., < 0.3) and stop word filtered keyword overlap is less than 10%.

## Solution
Implement a multi-factor **Confidence Scorer** and **Evidence Check Layer**. Instead of relying solely on keyword or stopword overlap, evaluate multiple signals:
1. Retrieval relevance (relative index distances)
2. Vector, keyword, and hybrid retrieval scores
3. Semantic reranking scores (where available)
4. Question coverage metrics
5. Evidence consistency (number of retrieved chunks supporting the same topic/source)
6. Groundedness evaluations

If the blended multi-factor score is below the configured threshold, classify the rating as `LOW` and return a standard negative/abstention response, bypassing LLM generation.

## Implementation
Created `app/rag/confidence.py` combining hybrid RRF scores, mock semantic reranking weights, keyword coverage ratios, and consistent document-frequency counts. Chunks are evaluated to output `HIGH`, `MEDIUM`, or `LOW` confidence rating categories.

## Test
Test unanswerable query ("Remote work policy") and assert output matches standard negative message.

## Result
Benchmark pending.

## Trade-offs
A conservative threshold increases precision (lowering hallucinations) but reduces recall (yielding false negatives on valid but poorly phrased queries). Groundedness evaluation via LLM adds extra API latency and token cost.

## Production Considerations
- **No Guarantee**: Confidence scoring does not guarantee complete hallucination prevention. Vector closeness is a proxy for semantic relation, not factual accuracy or logical equivalence.
- **Out of Distribution**: Queries completely outside document context might align with unrelated templates due to high dimensions.
- **Parameterization**: Expose threshold boundaries (`score_threshold`) as dynamic configuration keys.

---

# Scenario 5

## Problem
The user asks a vague question like "What is the limit?".

## Expected Behavior
The system detects the ambiguity and requests clarification.

## Baseline Behavior
The system selects one arbitrary limit (e.g., expense limit) and ignores other possibilities, or returns a generic response.

## Root Cause
Lack of specifying context in the raw query leads to high similarity matches across multiple distinct topics.

## Investigation
Inspect search rankings and verify that both expense limits and refund limits are returned with identical relevance scores.

## Solution
Build clarification logic. If multiple distinct categories match the query with comparable relevance scores and the score is high but diffuse, prompt the user for clarification instead of guessing.

## Implementation
Integrated ambiguity check checking query context details.

## Test
Assert ambiguous query results in clarification prompts.

## Result
Benchmark pending.

## Trade-offs
Clarification steps introduce an extra turn, increasing user interaction steps.

## Production Considerations
Provide suggestions chips in the front-end to streamline clarifications.

---

# Scenario 6

## Problem
The user sends a follow-up query like "What about Standard?" after asking "What is the Enterprise cancellation policy?".

## Expected Behavior
The system reformulates the query to "What is the Standard plan cancellation policy?" before performing retrieval.

## Baseline Behavior
The search query fails because standard vector search for "What about Standard?" returns irrelevant documents containing the word "Standard".

## Root Cause
The query lacks context, making it semantically incomplete for standalone vector or keyword lookup.

## Investigation
Observe that searching for "What about Standard?" returns unrelated documents instead of Standard Plan cancellation policies.

## Solution
Introduce a **Query Rewriter** block prior to retrieval. The rewriter takes the user request and recent chat history to produce a standalone search query.

## Implementation
Built query rewriter using conversation history context maps.

## Test
Verify follow-up query rewriting.

## Result
Benchmark pending.

## Trade-offs
Query rewriting adds extra API call latencies before indexing fetches.

## Production Considerations
Cache chat histories securely.
