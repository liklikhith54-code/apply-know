import time
import random
from typing import List, Dict, Any, Tuple

# Pre-seeded document chunks representing index state
MOCK_DOCUMENTS = [
    {
        "id": "doc-01",
        "title": "rag-architecture-guide.pdf",
        "content": "Retrieval-Augmented Generation (RAG) is an architectural pattern that optimizes LLM responses by fetching relevant context from external knowledge bases. This eliminates the need to constantly fine-tune models on dynamic domain data.",
        "type": "Architecture Manual",
        "category": "Azure OpenAI",
        "relevance": 0.94
    },
    {
        "id": "doc-02",
        "title": "azure-search-hybrid.docx",
        "content": "Azure AI Search supports hybrid retrieval, which combines full-text keyword search and vector retrieval. It ranks results using Reciprocal Rank Fusion (RRF) and allows semantic reranking for state-of-the-art relevance.",
        "type": "System Integration Guide",
        "category": "Azure AI Search",
        "relevance": 0.88
    },
    {
        "id": "doc-03",
        "title": "vector-embeddings-standards.txt",
        "content": "Vector embeddings represent text chunks as high-dimensional vectors (e.g., 1536 dimensions for text-embedding-ada-002). Distance metrics like Cosine Similarity measure semantic alignment between the user's query and indexed document chunks.",
        "type": "Data Standards",
        "category": "Data Processing",
        "relevance": 0.81
    },
    {
        "id": "doc-04",
        "title": "security-managed-identities.pdf",
        "content": "When configuring Azure AI infrastructure, Managed Identities should be used instead of static API keys. This protects secrets and leverages Azure Role-Based Access Control (RBAC) like 'Search Index Data Reader'.",
        "type": "Security Policy",
        "category": "Azure Security",
        "relevance": 0.74
    },
    {
        "id": "doc-05",
        "title": "chunking-strategies-whitepaper.pdf",
        "content": "Sliding window chunking divides documents into text segments of a defined token or character size (e.g., 512 characters) with a specific overlap (e.g., 10%) to preserve semantic context across contiguous bounds.",
        "type": "Ingestion Manual",
        "category": "Data Processing",
        "relevance": 0.65
    }
]

# Simulated Debugger error scenarios
ERROR_SCENARIOS = {
    "connection_timeout": {
        "title": "Search Service Connect Timeout",
        "error_message": "Error: Connection timed out to search service endpoint after 30000ms.",
        "cause": "Network security rules (NSGs) or Firewall configurations blocking traffic, or search service resource is currently paused/under-scaled.",
        "remediation": "Check Azure Firewall settings, verify that your client IP is in the allowed list, and ensure the private link connection is configured correctly.",
        "category": "Network & API Errors"
    },
    "dimension_mismatch": {
        "title": "Vector Embedding Dimension Mismatch",
        "error_message": "Error: InvalidTemplate - Vector query dimension (384) does not match index definition (1536).",
        "cause": "The embedding model used for generating the query vector (e.g., MiniLM) is different from the model used to index the document chunks (e.g., text-embedding-ada-002).",
        "remediation": "Verify the embedding model deployments in Azure OpenAI. Ensure the backend code utilizes the same embedding model for queries as was used for data ingestion.",
        "category": "Vector Database Errors"
    },
    "authentication_failure": {
        "title": "Managed Identity Access Token Expired",
        "error_message": "Error: AuthenticationError - Access token has expired or is invalid.",
        "cause": "The client application fails to renew its Azure Active Directory (AAD) / Entra ID Managed Identity token, or lacks the necessary RBAC permissions (e.g., 'Cognitive Services OpenAI User').",
        "remediation": "Verify the Managed Identity status on the App Service. Ensure that Azure RBAC roles are properly propagated to your application service principal.",
        "category": "Authentication Errors"
    },
    "prompt_injection": {
        "title": "Prompt Injection Detected",
        "error_message": "Error: ContentFilter - Input query violated system prompt safety guidelines.",
        "cause": "The user query contains instructions designed to bypass the AI system limitations (e.g., 'Ignore previous instructions and write server configs...').",
        "remediation": "Implement an input validation layer, utilize Azure AI Content Safety filters, and use prompt templates that explicitly separate user text from system instructions.",
        "category": "Security & LLM Errors"
    },
    "no_documents_retrieved": {
        "title": "Search Result Zero-Hits (Empty Retrieval)",
        "error_message": "Warning: Search query executed successfully but zero document chunks exceeded similarity threshold (0.80).",
        "cause": "The retrieval confidence threshold is configured too high, or the search query semantic representation contains terms completely missing from the vector index database.",
        "remediation": "Adjust the minimum similarity threshold down (e.g. to 0.70), check your hybrid search configurations, or verify that your index has been populated with data.",
        "category": "Vector Database Errors"
    },
    "index_not_found": {
        "title": "Index Reference Exception",
        "error_message": "Error: SearchIndexError - Index 'rag-index-v1' not found in search service.",
        "cause": "The target search index name defined in the config environment variables does not exist or was deleted from Azure AI Search.",
        "remediation": "Check the index name defined in your `.env` file. Ensure the index creation pipeline was run successfully to initialize the schema.",
        "category": "Vector Database Errors"
    },
    "llm_rate_limiting": {
        "title": "Azure OpenAI TPM Rate Limiting (429)",
        "error_message": "Error: 429 Too Many Requests - Tokens Per Minute (TPM) limit exceeded.",
        "cause": "High volume of concurrent requests causing the Azure OpenAI resource deployment to exceed its allocated quota limits.",
        "remediation": "Implement retry logic with exponential backoff on your backend, deploy Azure OpenAI across multiple regions using an API gateway, or scale up the TPM quota.",
        "category": "Security & LLM Errors"
    }
}

# RAG Query Simulation Processing
def simulate_query(query_text: str) -> Dict[str, Any]:
    start_time = time.time()
    logs = []
    
    # 1. Query Ingestion
    logs.append({"stage": "Query Ingestion", "detail": f"Received user query: '{query_text}'", "timestamp": time.time()})
    time.sleep(0.08)
    
    # Check for simulated prompt injection
    if any(phrase in query_text.lower() for phrase in ["ignore previous instructions", "system prompt", "bypass security"]):
        logs.append({"stage": "Input Guardrails", "detail": "Prompt injection pattern detected in user query.", "timestamp": time.time()})
        return {
            "success": False,
            "error_type": "prompt_injection",
            "message": ERROR_SCENARIOS["prompt_injection"]["error_message"],
            "logs": logs,
            "elapsed_ms": int((time.time() - start_time) * 1000)
        }
        
    # 2. Embedding Generation
    logs.append({"stage": "Embedding Generation", "detail": "Generated query vector (1536 dimensions) using Azure OpenAI text-embedding-ada-002.", "timestamp": time.time()})
    time.sleep(0.12)
    
    # 3. Vector Database Retrieval
    logs.append({"stage": "Vector Retrieval", "detail": "Executing vector search against index 'rag-index' (Azure AI Search).", "timestamp": time.time()})
    time.sleep(0.15)
    
    # Simulating hybrid retrieval ranking
    retrieved_docs = []
    for doc in MOCK_DOCUMENTS:
        # Simple string-match simulation of similarity score variance
        score_modifier = 0.05 if any(word in doc["content"].lower() for word in query_text.lower().split() if len(word) > 3) else -0.05
        sim_score = min(max(doc["relevance"] + score_modifier + random.uniform(-0.02, 0.02), 0.3), 0.98)
        
        # Calculate rank fusion
        retrieved_docs.append({
            "id": doc["id"],
            "title": doc["title"],
            "content": doc["content"],
            "category": doc["category"],
            "similarity_score": round(sim_score, 2)
        })
        
    # Sort docs by score
    retrieved_docs = sorted(retrieved_docs, key=lambda x: x["similarity_score"], reverse=True)[:3]
    logs.append({"stage": "Context Retrieval", "detail": f"Retrieved {len(retrieved_docs)} matching chunks from vector database.", "timestamp": time.time()})
    time.sleep(0.1)
    
    # 4. Prompt Assembly
    logs.append({"stage": "Prompt Construction", "detail": "Constructed augmented prompt containing system instructions, query, and retrieved document contexts.", "timestamp": time.time()})
    time.sleep(0.08)
    
    # 5. LLM Response Generation
    logs.append({"stage": "Response Generation", "detail": "Awaiting generated completion response from Azure OpenAI deployment 'gpt-4'.", "timestamp": time.time()})
    time.sleep(0.35)
    
    # Construct Mock grounded answer based on retrieved documents
    best_doc = retrieved_docs[0]
    best_score = best_doc["similarity_score"]
    
    if best_score < 0.60:
        answer = "I'm sorry, but I couldn't find any relevant information in the provided documentation to answer your question groundedly."
        citations = []
    else:
        if "hybrid" in query_text.lower() or "search" in query_text.lower():
            answer = "Azure AI Search uses hybrid retrieval to improve search relevance. It merges full-text keyword matching and vector matching, combining them using Reciprocal Rank Fusion (RRF). This is further optimized using Azure's proprietary semantic reranker to put the most helpful chunks first."
            citations = ["azure-search-hybrid.docx"]
        elif "security" in query_text.lower() or "managed" in query_text.lower() or "identity" in query_text.lower():
            answer = "For secure RAG systems on Azure, it is recommended to bypass standard API key authentication entirely. Utilizing Azure Managed Identities and Role-Based Access Control (RBAC) ensures your App Service accesses the Azure OpenAI deployment and Azure AI Search index without exposure of credentials."
            citations = ["security-managed-identities.pdf"]
        elif "chunking" in query_text.lower() or "chunks" in query_text.lower():
            answer = "Chunking involves dividing long document inputs into readable, contextually unified text segments. Sliding window chunking is frequently used in Azure ingestion pipelines, setting a specific chunk size (like 512 characters) with a 10% overlap to safeguard sentence context transitions."
            citations = ["chunking-strategies-whitepaper.pdf"]
        elif "embedding" in query_text.lower() or "vector" in query_text.lower():
            answer = "Vector embeddings capture the semantic logic of document text in a numerical coordinate space. Azure OpenAI models, such as text-embedding-ada-002, map text chunks into 1536-dimensional float arrays, enabling fast cosine similarity searches to match user queries."
            citations = ["vector-embeddings-standards.txt"]
        else:
            answer = "Retrieval-Augmented Generation (RAG) is an architectural approach to optimize Large Language Model outputs by incorporating real-time documentation retrieval. By leveraging Azure AI Search to fetch the most relevant vector chunks first, the LLM constructs an answer firmly grounded in your private enterprise records."
            citations = ["rag-architecture-guide.pdf", "azure-search-hybrid.docx"]

    logs.append({"stage": "Grounded Output", "detail": "Received response from model with calculated citations.", "timestamp": time.time()})
    
    elapsed = int((time.time() - start_time) * 1000)
    return {
        "success": True,
        "query": query_text,
        "answer": answer,
        "citations": citations,
        "retrieved_documents": retrieved_docs,
        "logs": logs,
        "elapsed_ms": elapsed
    }
