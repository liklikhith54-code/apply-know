# RAG System Architecture & Problem Solving

This guide details the debugging frameworks, scalability considerations, operational trade-offs, and failure investigations for the Enterprise Knowledge Assistant.

---

## QUESTION 1 — RETRIEVAL QUALITY

### Question
*"Our chatbot retrieves 5 chunks, but only one is relevant. How would you debug and improve it?"*

### Debugging Process Flowchart
```text
User Query ──> Query Rewriting ──> Search Request ──> Candidate Retrieval ──> Ranking / Reranking ──> Final Context ──> LLM
```

To pinpoint where the dilution occurs, we inspect each component systematically using trace logs:
1. **Original Query**: Inspect the raw user query for spelling errors, syntax anomalies, or language vagueness.
2. **Rewritten Query**: Compare the raw query with the rewritten query. Check if the query rewriter introduced semantic drift (e.g. rewriting "Standard" as seat specifications instead of Standard plan subscription details).
3. **Retrieval Parameters**: Inspect configurations for `chunk_size`, `chunk_overlap`, Top-K, and candidate-K.
4. **Retrieval Scores**: Review the raw vector similarities and keyword relevance scores of the top retrieved chunks.
5. **Filters & Metadata**: Check if active metadata filters (like effective date or access groups) were overly broad or incorrectly applied, permitting irrelevant chunks to crowd the context window.
6. **Reranker Scores**: Examine rerank scores. Check if the reranking step demoted relevant chunks.

### Root Causes
- **Insufficient Candidate Pool (Candidate-K)**: If vector retrieval retrieves too few candidates before reranking, the reranker has no high-quality content to elevate.
- **Overly Broad Retrieval**: High Top-K combined with loose keyword matches forces the context to fill with low-scoring filler content.
- **Poor Chunking Boundaries**: Small chunk sizes without overlap split key sentences across margins, degrading cosine similarity scores.
- **Embedding Incompatibility**: Model embedding dimension configuration mismatches or semantic drift in raw embeddings.

### Optimization Strategies
- **Tune Chunk Size**: Adjust chunk sizes (e.g. increase from 500 to 1000 characters with 200 character overlap) to preserve local semantic context.
- **Configure Hybrid Retrieval**: Blending keyword (BM25) and vector search ranks via RRF ensures that terms not captured semantically are retrieved based on lexical presence.
- **Implement Semantic Reranking**: Run secondary reranking (e.g., Azure AI Search Semantic Ranker or Cohere Rerank) to reorder retrieved candidates based on deep sentence relevance.
- **Measure Iterative Progress**: Benchmark improvements against baseline metrics using **Hit@K** and **Recall@K** scores from the evaluation dataset.
- **Recall/Latency/Context Trade-offs**: Increasing candidate Top-K improves Recall, but scales latency linearly and bloats prompt token sizes, risking context pollution.

---

## QUESTION 2 — LATENCY

### Question
*"Production chatbot response time increases from 3 seconds to 12 seconds. How would you identify the bottleneck?"*

### Measurement-First Trace ID Pipeline
We associate a unique `trace_id` with each user request to record duration metrics across each stage independently:
```text
Request ──> Authentication ──> Query Rewriting ──> Azure AI Search ──> Reranking ──> Context Construction ──> Azure OpenAI ──> Citation Processing ──> Response
```

Using Application Insights, we log the duration of each phase:
- `auth_latency_ms` (Authentication)
- `rewrite_latency_ms` (Query Rewriting)
- `search_latency_ms` (Azure AI Search vector/hybrid search)
- `rerank_latency_ms` (Semantic Rerank stage)
- `context_latency_ms` (Context construction and formatting)
- `llm_latency_ms` (LLM prompt to response completion)
- `citation_latency_ms` (Citation mapping and post-processing)
- `total_latency_ms` (End-to-end response time)

### Diagnosing & Optimizing Bottlenecks
- **If Azure AI Search is Slow**: 
  - *Diagnostics*: Search latency exceeds 200ms.
  - *Remedy*: Reduce candidate count (candidate-K), optimize complexity of metadata OData filter queries, simplify keyword matches, or scale search partitions/replicas.
- **If Reranking is Slow**:
  - *Diagnostics*: High rerank latency.
  - *Remedy*: Reduce candidate-K input count passed to the reranker (e.g. only rerank top 15 chunks instead of 50).
- **If LLM Generation is Slow**:
  - *Diagnostics*: LLM latency is the dominant component (> 80% of total time).
  - *Remedy*: Implement streaming responses (time-to-first-token optimization), reduce prompt context sizes (exclude low-score chunks), limit max output completion tokens, or shift to a faster model.
- **If Query Rewriting is Slow**:
  - *Diagnostics*: High rewriter time.
  - *Remedy*: Avoid query rewriting on first-turn queries or simple standalone requests. Switch rewriting prompts to lighter, faster models (e.g. GPT-3.5 or GPT-4o-mini).

---

## QUESTION 3 — SCALE

### Question
*"The system grows from 10,000 documents to 5 million documents. What architectural changes would you consider?"*

### Scaling Comparison Table
| Area | ~10K Documents (Currently Implemented) | ~5M Documents (Production Recommendations) |
| :--- | :--- | :--- |
| **Ingestion Pipeline** | Synchronous, direct in-memory parsing. | Asynchronous, event-driven distributed worker queues. |
| **Storage & Processing** | Local files directory / basic Azure Blob Storage. | Distributed ingestion nodes (Azure Functions, batch containers). |
| **Indexing Operations** | Local index file (`mock_index.json`) or single partition index. | Distributed index batching, incremental indexing triggers. |
| **Azure AI Search** | Basic Tier index (single replica, single partition). | Standard Tier index (multiple partitions for scale, replicas for QPS). |
| **Caching Layer** | No active query/semantic caching. | Redis Semantic Caching for common vectorized questions. |
| **Query Throughput** | Single server instance handles load. | Load-balancer with autoscaling API instances and isolated workloads. |
| **Monitoring** | Basic file log tracing. | System telemetry dashboards (App Insights, Datadog) with cost alarms. |

### Architectural Recommendations at Scale
- **Asynchronous Event-Driven Ingestion**: Use blob upload events (Azure Event Grid) to trigger decoupled ingestion pipelines. Processing queues (Azure Service Bus/RabbitMQ) ensure that heavy document processing (PDF parsing, OCR, chunking) is distributed across auto-scaling worker pools.
- **Search Scale & Capacity**: Transition to Azure AI Search Standard tiers. Capacity (replicas for concurrent query capacity and partitions for document volume storage limits) should be determined through **load testing** simulating peak concurrent indexing and query workloads.
- **Workload Isolation**: Dedicate separate Azure Search indexer instances to background document ingestion so that heavy writing does not choke concurrent read query latency.
- **Document Lifecycle & Cost Management**: Implement data retention rules. Move archival documents to cool storage tiers and index only active version items to contain hosting costs.

---

## QUESTION 4 — SECURITY

### Question
*"HR, Finance, Legal and Engineering use the same chatbot. HR documents must never be retrieved for Engineering users. How would you architect access-controlled RAG?"*

### Security Flow Chart
```text
User ──> Microsoft Entra ID ──> Authentication ──> User identity/group membership ──> Authorization ──> Security filter ──> Azure AI Search ──> Authorized documents only ──> Context ──> LLM
```

### Access-Control Implementations
1. **Metadata Enforcement**: During ingestion, extract or assign security attributes (`access_groups`) to document chunk metadata:
   - HR chunk: `access_groups: ["HR", "ADMIN"]`
   - Engineering chunk: `access_groups: ["ENGINEERING", "ADMIN"]`
2. **Pre-LLM Security Filtering**: When the user queries the endpoint, extract Entra ID token identities. The retriever constructs OData filter strings based on user group claims (e.g. `access_groups/any(g: g eq 'ENGINEERING' or g eq 'ALL')`).
3. **No LLM Relying**: Filter chunks **BEFORE** they are sent to the LLM. *Never* send restricted data to the prompt and instruct the LLM to hide it, as LLMs are vulnerable to prompt injections and jailbreaks.
4. **Key Secrets Management**: Store database keys, API endpoints, and storage credentials in Azure Key Vault, accessed via Managed Identities (no hardcoded passwords).
5. **Auditing**: Log search filters and user queries in audit vaults for compliance tracking.

---

## QUESTION 5 — COST

### Question
*"Azure OpenAI costs suddenly increase significantly. How would you identify the cause and optimize it?"*

### Token Cost Flow
```text
User Query ──> Query Rewrite Tokens ──> Search/Reranking ──> Context Size ──> LLM Input Tokens ──> LLM Output Tokens ──> Cost
```

To diagnose a cost spike, inspect the following metrics over the period of the spike:
- **Total Requests Volume**: Confirm if user queries suddenly scaled up.
- **Input vs Output Token Counts**: Identify if input tokens (prompt context size) or output tokens (LLM answer completion lengths) drove the increase.
- **Query Rewrite Ratios**: Measure the volume of tokens consumed contextualizing queries.
- **Ingestion Re-indexing Loops**: Check logs for duplicate/unnecessary re-embedding tasks.

### Cost Control Strategies
- **Context Optimization**: Restrict Top-K to a strict maximum (e.g. top 5 chunks instead of 10). Use semantic reranking to select only high-relevance candidates, discarding low-scoring items before compiling the prompt.
- **Model Isolation**: Use smaller, cost-effective models (e.g. GPT-4o-mini) for query rewriting, extraction, and confidence scoring. Reserve powerful models (e.g. GPT-4o) exclusively for grounded synthesis.
- **Incremental Indexing**: Track document hashes during ingestion. Embed only new or modified documents; avoid duplicate embedding generation runs.
- **Semantic Caching**: Cache common questions and answers at the API gateway layer to prevent hitting LLM completion paths for identical requests.
- **Workload Controls**: Limit loop counts during evaluation runs and implement token rate-limit quotas per user department.

---

## QUESTION 6 — PRODUCTION FAILURE

### Question
*"Users report that the chatbot gives correct answers most of the time, but occasionally gives a completely wrong answer with a valid-looking citation."*

### Full-Pipeline Diagnostic Protocol
When an incorrect grounded claim occurs, follow the request ID path:
```text
User Query ──> Query Rewriting ──> Retrieval ──> Ranking ──> Context ──> Prompt ──> LLM ──> Citation Mapping ──> Final Answer
```

We audit the pipeline states in order:
1. **User Query**: Was the original question ambiguous, leading to multiple conflicting interpretations?
2. **Query Rewriting**: Did rewriting pollute the search terms, introducing out-of-context references?
3. **Retrieval Output**: Inspect retrieved chunk IDs. Did retrieval select outdated policy versions (e.g. `Leave_Policy_2024.pdf` instead of `2026`) or restricted documents?
4. **Reranker Order**: Verify if relevant evidence chunks were pushed outside the prompt window due to low similarity ranking.
5. **Context Block**: Verify if the prompt compiler truncated critical figures (like budget amounts) during text assembly.
6. **Grounding Prompt Instructions**: Check if prompt guidelines were relaxed, allowing the model to answer based on pre-trained internal parameters instead of context text.
7. **LLM Temperature**: Ensure temperature is set to `0.0` for maximum consistency and reproducibility.
8. **Citation Mapping Integrity**: Verify the post-processing index mapping. Check if the LLM generated factual statements from Document A but appended citation tags referencing Document B.

### Fixes & Mitigation
- **Strict Citation Mappings**: Use structured extraction (such as JSON mode or Pydantic output schemas) to force the LLM to output pairs of `(claim, source_id)`.
- **Pre-flight Evidence Checks**: Implement confidence check boundaries to block low-score queries.
- **Automated Citations Audits**: Implement automated post-generation checks comparing answer tokens with cited chunk content to confirm that citations support claims.
- **Regression Testing**: Add the failure query to the evaluation dataset (`dataset.json`) to prevent future regressions.

---

## ARCHITECTURAL TRADE-OFFS

- **Vector vs. Hybrid Retrieval**: Vector retrieval provides semantic flexibility but fails on exact codes or product version numbers. Hybrid search (Vector + Keyword) ensures terms are captured lexically while retaining conceptual matches, albeit with slightly higher index complexity.
- **Larger vs. Smaller Chunks**: Large chunks (1000+ tokens) capture extensive context but bloat prompt token sizes and introduce noise. Small chunks (150-300 tokens) lower token costs but often slice cohesive clauses, leading to poor vector similarities.
- **Fewer vs. More Candidates**: Restricting Top-K reduces latency and API costs but risks missing critical information. Higher candidate lists increase Recall but risk context pollution and hit token limits.
- **Stronger vs. Smaller LLMs**: Large models yield high reasoning and citation accuracy but incur greater latency and higher costs. Small models are fast and cheap but display higher hallucination rates.

---

## INTERVIEW QUICK ANSWERS

### Q1: Retrieval Quality
To debug retrieval quality, inspect the trace log from rewritten query through search engine scores (BM25 and vector similarities) up to semantic reranking. We resolve irrelevant chunks by tuning chunk sizes, increasing candidate-K input pools, and applying hybrid search with a semantic reranker to prioritize top relevance before context compilation.

### Q2: Latency Bottlenecks
We trace request latencies across each phase using trace IDs logged to Application Insights. If search or reranking is slow, we reduce candidate-K counts and simplify filters; if the LLM is the bottleneck, we streaming-process responses, limit output tokens, and cache common query results.

### Q3: Architectural Scale (10K to 5M Documents)
Scaling to 5M documents requires shifting from synchronous parsing to an event-driven worker queue pipeline using distributed chunking nodes. For search queries, we transition to Azure Search partitions and replicas scaling capacity based on load testing queries-per-second benchmarks.

### Q4: Security & Access-Control
Authentication tokens are validated using Microsoft Entra ID. We filter restricted content pre-retrieval using metadata filters (e.g. `access_groups: ["HR"]`) inside the search queries; we never pass restricted chunks to the prompt context, preventing prompt leakage.

### Q5: Cost Optimization
We analyze token volumes to identify if input prompts or output lengths drove the costs. We optimize by routing query rewrites to smaller models, shrinking context inputs through rerank filters, caching common queries, and batching incremental ingestion runs.

### Q6: Citation & Hallucination Failures
We audit the trace pipeline to isolate whether the error is due to semantic drift during rewriting, retrieving outdated files, prompt leakage, or a post-processing mapping error. We fix citations by enforcing structured JSON outputs mapping claims strictly to source IDs, and adding automated evaluations checks to verify facts.
