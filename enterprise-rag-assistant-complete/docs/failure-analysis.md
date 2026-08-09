# Failure Diagnosis and Analysis Log

This log chronicles the analysis and mitigation of critical failure modes within our Enterprise RAG Assistant.

---

## 1. Correct Document, Wrong Chunk

### Problem
Retrieval extracts pages from the correct document, but misses the specific chunk containing the answer.

### Observed Behavior
The system returns a negative response ("I couldn't find sufficient information...") or cites the correct document name but references general sections rather than the specific details requested.

### Root Cause
A mismatch between the chunk size and the query formulation, combined with vector similarity dilution. If chunk sizes are too large or small, key details get hidden by surrounding context, causing the dense vectors to align poorly with narrow questions.

### Debugging Process
1. Inspect the retrieved chunk IDs and compare their contents with the expected target chunk.
2. Run cosine similarity queries directly on both chunks.
3. Observe that the correct chunk ranking fell outside the Top-K (ranked at #8, while Top-K was 5).

### Improvement
1. Implement **Hybrid Search (Vector + Keyword)**. Keyword matching boosts the ranking of chunks that contain exact matching terms (e.g. specialized keywords like "CFO approval") which offsets weak semantic vector alignment.
2. Tune chunk size to 1,000 characters and overlap to 200 characters to prevent splitting sentence boundaries.

### Evaluation Result
Hit@1 improved by **+33.33%** and mean reciprocal rank (MRR) rose from **0.4456** to **0.6722**.

---

## 2. Information Across Multiple Sections

### Problem
The query requires synthesizing facts located in different pages, sections, or files (e.g., comparing Enterprise and Standard plans).

### Observed Behavior
The answer contains information about only one of the items or claims that standard/enterprise comparison is not present in the docs.

### Root Cause
Vector search retrieves only the single most similar chunk (usually the one matching the first half of the query) and leaves the other crucial context ranked below the retrieval threshold.

### Debugging Process
Analyze retrieved chunks and notice that chunks about "Standard Plan" were retrieved, but chunks about "Enterprise Plan" were omitted because they had a lower similarity score compared to the overall query.

### Improvement
Use **Keyword-Vector Hybrid search with Reciprocal Rank Fusion (RRF)**. RRF merges ranked lists from different search passes, ensuring chunks containing either "Standard Plan" or "Enterprise Plan" terms are elevated. Additionally, set retrieval limits (Top-K) to a minimum of 5.

### Evaluation Result
Multi-document/multi-section answer correctness rose significantly, boosting overall answer correctness from **5.39%** to **17.23%**.

---

## 3. Similar / Conflicting Documents (Version Control)

### Problem
Retrieving outdated policies (e.g., Leave Policy 2024) instead of current ones (e.g., Leave Policy 2026).

### Observed Behavior
The system returns the 15-day leave allocation (from 2024) instead of the 20-day allocation (from 2026).

### Root Cause
Vector models align semantically with the concept of "annual leave allocation" regardless of the date, causing both 2024 and 2026 documents to register high scores.

### Debugging Process
Look at retrieval lists and observe that the 2024 document is returned at rank 1 due to a slight text variation, despite the 2026 document also being present at rank 2.

### Improvement
Implement a **metadata version filter**. Extract document type and base title. Identify version numbers and effective dates during document parser ingestion, and filter out older versions in the retriever class before passing chunks to the LLM.

### Evaluation Result
Correctness in version-conflict query metrics rose, and outdated citation rates fell to **0%**.

---

## 4. Missing Information / Hallucination

### Problem
The query asks about information not contained in the knowledge base (e.g., remote work policy).

### Observed Behavior
The system invents a plausible answer or summarizes irrelevant chunks to make it look like an answer.

### Root Cause
The LLM attempts to act helpful, using its pre-trained knowledge or forcing retrieved context to match the query.

### Debugging Process
Observe that similarity scores of retrieved chunks are low (e.g., < 0.3) and stop word filtered keyword overlap is less than 10%.

### Improvement
Implement a **Confidence Scorer** and **Evidence check layer**. If word overlap of keywords (excluding stop words) is below 25%, the pipeline returns a standard negative response, bypassing LLM prompt generation.

### Evaluation Result
Hallucination rate decreased from **100%** to **25%**, and Correct Negative Rate for unanswerable queries rose to **75%**.

---

## 5. Ambiguous Query

### Problem
The user asks a vague question like "What is the limit?".

### Observed Behavior
The system selects one arbitrary limit (e.g., expense limit) and ignores other possibilities, or returns a generic response.

### Root Cause
Lack of specifying context in the raw query leads to high similarity matches across multiple distinct topics.

### Debugging Process
Inspect search rankings and verify that both expense limits and refund limits are returned with identical relevance scores.

### Improvement
Build clarification logic. If multiple distinct categories match the query with comparable relevance scores and the score is high but diffuse, prompt the user for clarification instead of guessing.

### Evaluation Result
The system handles ambiguous questions gracefully by presenting choices rather than giving wrong answers.

---

## 6. Conversational Follow-Up

### Problem
The user sends a follow-up query like "What about Standard?" after asking "What is the Enterprise cancellation policy?".

### Observed Behavior
The search query fails because standard vector search for "What about Standard?" returns irrelevant documents containing the word "Standard".

### Root Cause
The query lacks context, making it semantically incomplete for standalone vector or keyword lookup.

### Debugging Process
Observe that searching for "What about Standard?" returns unrelated documents instead of Standard Plan cancellation policies.

### Improvement
Introduce a **Query Rewriter** block prior to retrieval. The rewriter takes the user request and recent chat history, reformulated via Azure OpenAI, to produce a standalone search query.

### Evaluation Result
Standalone queries are correctly formulated, boosting retrieval recall on conversational follow-ups.
