# Production Failure Diagnosis Guide

This guide outlines the protocol to diagnose the following production issue:
**"Users report that the chatbot usually gives correct answers, but occasionally gives a completely wrong answer with a valid-looking citation."**

## Diagnostic Trace Protocol
To pinpoint the root cause, follow the request trace ID from ingestion through prompt compilation using structured App Insights logs.

```text
User Query ──> Query Rewrite ──> Retrieval ──> Ranking ──> Context ──> Prompt ──> LLM ──> Citation
```

---

## Troubleshooting Checklist by Pipeline Phase

### 1. Query Rewriting Failure
- **Question to ask**: Did the query rewriter misinterpret the conversation history and search for the wrong topic?
- **How to test**: Check the rewritten query in the logs. If the user asked "What about Standard?" and the rewriter produced "What is the standard configuration of a travel seat?" instead of "What is the Standard plan cancellation policy?", the error originated here.
- **Remedy**: Adjust rewriter prompt guidelines or switch to a more capable model.

### 2. Retrieval Failure
- **Question to ask**: Did the search engine return irrelevant documents due to keyword mismatch or vector embedding drift?
- **How to test**: Inspect the list of retrieved chunk IDs. Check if the correct document exists in the top search results. If not, the index lacks appropriate density or search criteria were overly restrictive.
- **Remedy**: Modify hybrid weighting or expand top-K threshold.

### 3. Ranking Failure
- **Question to ask**: Was the correct document retrieved, but ranked so low that it was excluded from the Top-K sent to the LLM?
- **How to test**: Examine the raw search scores and check if the target chunk was ranked #6 or lower (outside the context limit).
- **Remedy**: Optimize RRF fusion constants or configure Azure Semantic Ranker.

### 4. Wrong Document Version
- **Question to ask**: Did retrieval fetch an outdated policy file that has identical text semantic meaning?
- **How to test**: Check the document name and metadata in the retrieved chunks. If `Leave_Policy_2024.pdf` was returned instead of `Leave_Policy_2026.pdf` because the version filter was bypassed, this is a metadata versioning bug.
- **Remedy**: Fix the version filter code path in the retriever.

### 5. Context Assembly Failure
- **Question to ask**: Did the context builder corrupt, truncate, or shuffle the retrieved chunks?
- **How to test**: View the exact context string injected into the final prompt. If chunks are cut off mid-sentence due to character limits, critical numbers might be lost.
- **Remedy**: Adjust chunk limits and prompt layout structure.

### 6. Prompt Vulnerability
- **Question to ask**: Did the prompt fail to enforce strict groundedness constraints?
- **How to test**: Verify the system prompt constraints. If they are loose, the LLM may ignore context and use its general training weights instead.
- **Remedy**: Strengthen system instructions to enforce "answer ONLY from supplied evidence" constraints.

### 7. LLM Generation Hallucination
- **Question to ask**: Did the LLM receive the correct context but hallucinate facts anyway?
- **How to test**: Compare the generated response directly against the context. If the context says "cancellation fee is $50" and the LLM output says "cancellation is free" with a citation to the $50 paragraph, the model hallucinated.
- **Remedy**: Set model temperature to `0.0`, verify model version, or adjust system instructions.

### 8. Citation Mapping Error
- **Question to ask**: Is the answer correct and the context correct, but the citation index mapped to the wrong file?
- **How to test**: Inspect the citation output object. If the text references fact A (found in document X) but appends citation `[2]` (which links to document Y), it is a post-processing indexing bug.
- **Remedy**: Ensure the index mapping logic in the generator maps strictly to the source chunk order.
