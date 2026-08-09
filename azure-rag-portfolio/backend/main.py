import os
import time
import random
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from backend import config
from backend.core import simulator

app = FastAPI(
    title="Azure AI + RAG Architecture API",
    description="Backend API for the RAG architecture portfolio website, supporting mock and integration modes.",
    version="1.0.0"
)

# Enable CORS for frontend interactions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- DATA MODELS -----------------
class QueryRequest(BaseModel):
    query: str

class IngestionRequest(BaseModel):
    document_name: str
    content: str
    chunk_size: int = 512
    overlap: int = 50

class DiagnoseRequest(BaseModel):
    scenario_id: str
    query: str

# In-memory session telemetry for dashboard metrics
metrics_store = {
    "docs_indexed": 5,
    "total_chunks": 42,
    "queries_processed": 184,
    "avg_retrieval_score": 0.85,
    "avg_response_time_ms": 780,
    "tokens_consumed": 142050,
    "success_queries": 178,
    "failed_queries": 6
}

# Uploaded documents memory store
uploaded_documents = [
    {"name": "rag-architecture-guide.pdf", "size": "154 KB", "chunks": 12, "status": "Indexed"},
    {"name": "azure-search-hybrid.docx", "size": "88 KB", "chunks": 8, "status": "Indexed"},
    {"name": "vector-embeddings-standards.txt", "size": "45 KB", "chunks": 5, "status": "Indexed"},
    {"name": "security-managed-identities.pdf", "size": "210 KB", "chunks": 11, "status": "Indexed"},
    {"name": "chunking-strategies-whitepaper.pdf", "size": "120 KB", "chunks": 6, "status": "Indexed"}
]

# ----------------- ENDPOINTS -----------------

@app.get("/health")
def get_health():
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "mode": "Demo Mode (Simulation)" if config.IS_DEMO else "Azure Production Mode",
        "azure_config": {
            "openai_configured": bool(config.AZURE_OPENAI_ENDPOINT and not config.IS_DEMO),
            "search_configured": bool(config.AZURE_SEARCH_ENDPOINT and not config.IS_DEMO)
        }
    }

@app.get("/config/status")
def get_config_status():
    return {
        "is_demo": config.IS_DEMO,
        "azure_openai_endpoint": config.AZURE_OPENAI_ENDPOINT if not config.IS_DEMO else "https://demo-openai.azure.com",
        "azure_search_endpoint": config.AZURE_SEARCH_ENDPOINT if not config.IS_DEMO else "https://demo-search.azure.net",
        "openai_model": config.AZURE_OPENAI_DEPLOYMENT_NAME,
        "search_index": config.AZURE_SEARCH_INDEX_NAME
    }

@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    # Simulate processing delay
    time.sleep(0.5)
    
    # Calculate mock chunks
    chunk_count = random.randint(4, 15)
    doc_size_kb = len(await file.read()) // 1024
    
    new_doc = {
        "name": file.filename,
        "size": f"{doc_size_kb} KB" if doc_size_kb > 0 else "1 KB",
        "chunks": chunk_count,
        "status": "Uploaded"
    }
    uploaded_documents.append(new_doc)
    
    # Update metrics
    metrics_store["docs_indexed"] += 1
    metrics_store["total_chunks"] += chunk_count
    
    return {
        "success": True,
        "filename": file.filename,
        "size_kb": doc_size_kb,
        "generated_chunks": chunk_count,
        "status": "Uploaded & Parsed"
    }

@app.post("/documents/index")
def index_document(request: IngestionRequest):
    time.sleep(1.0) # Ingestion latency simulation
    
    chunk_count = max(1, len(request.content) // request.chunk_size)
    
    new_doc = {
        "name": request.document_name,
        "size": f"{len(request.content) // 1024} KB",
        "chunks": chunk_count,
        "status": "Indexed"
    }
    uploaded_documents.append(new_doc)
    
    # Update metrics
    metrics_store["docs_indexed"] += 1
    metrics_store["total_chunks"] += chunk_count
    
    return {
        "success": True,
        "document_name": request.document_name,
        "chunks_created": chunk_count,
        "status": "Successfully Indexed"
    }

@app.get("/documents/list")
def list_documents():
    return uploaded_documents

@app.post("/rag/query")
def query_rag(request: QueryRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query text cannot be empty.")
    
    result = simulator.simulate_query(request.query)
    
    # Update metrics store
    metrics_store["queries_processed"] += 1
    if result["success"]:
        metrics_store["success_queries"] += 1
        metrics_store["tokens_consumed"] += random.randint(350, 850)
        # Update running averages
        metrics_store["avg_response_time_ms"] = int((metrics_store["avg_response_time_ms"] * 9 + result["elapsed_ms"]) / 10)
        if result.get("retrieved_documents"):
            top_score = result["retrieved_documents"][0]["similarity_score"]
            metrics_store["avg_retrieval_score"] = round((metrics_store["avg_retrieval_score"] * 9 + top_score) / 10, 2)
    else:
        metrics_store["failed_queries"] += 1
        
    return result

@app.get("/rag/sources")
def get_rag_sources():
    # Return structured metadata about our document knowledge base
    return [
        {"id": "doc-01", "name": "rag-architecture-guide.pdf", "type": "PDF", "description": "Core RAG architecture manual."},
        {"id": "doc-02", "name": "azure-search-hybrid.docx", "type": "Word Document", "description": "Hybrid search index strategies."},
        {"id": "doc-03", "name": "vector-embeddings-standards.txt", "type": "Text File", "description": "Embedding standards and similarity guidelines."},
        {"id": "doc-04", "name": "security-managed-identities.pdf", "type": "PDF", "description": "Credential protection and Entra ID integration."},
        {"id": "doc-05", "name": "chunking-strategies-whitepaper.pdf", "type": "PDF", "description": "Document parsing and split windows."}
    ]

@app.get("/debug/scenarios")
def get_debug_scenarios():
    # Return mapping of scenarios
    return [
        {"id": key, "title": val["title"], "category": val["category"]}
        for key, val in simulator.ERROR_SCENARIOS.items()
    ]

@app.post("/debug/diagnose")
def diagnose_error(request: DiagnoseRequest):
    scenario = simulator.ERROR_SCENARIOS.get(request.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Error scenario not found.")
    
    # Update metrics
    metrics_store["queries_processed"] += 1
    metrics_store["failed_queries"] += 1
    
    # Generate mock logs based on scenario
    logs = [
        {"stage": "Query Ingestion", "detail": f"Received diagnostic request: '{request.query}'", "timestamp": time.time()},
    ]
    
    if request.scenario_id == "connection_timeout":
        logs.append({"stage": "Embedding Generation", "detail": "Generated query vector successfully.", "timestamp": time.time()})
        logs.append({"stage": "Vector Retrieval", "detail": "Attempting connection to Azure AI Search...", "timestamp": time.time()})
    elif request.scenario_id == "dimension_mismatch":
        logs.append({"stage": "Embedding Generation", "detail": "Generated query vector (384 dimensions) using local embedding model.", "timestamp": time.time()})
        logs.append({"stage": "Vector Retrieval", "detail": "Submitting query vector (384 dims) to Azure AI Search index (configured for 1536 dims).", "timestamp": time.time()})
    elif request.scenario_id == "authentication_failure":
        logs.append({"stage": "Credential Check", "detail": "Acquiring access token for Azure OpenAI endpoint...", "timestamp": time.time()})
    elif request.scenario_id == "prompt_injection":
        logs.append({"stage": "Input Guardrails", "detail": "Analyzing user query for safety violations.", "timestamp": time.time()})
    elif request.scenario_id == "no_documents_retrieved":
        logs.append({"stage": "Embedding Generation", "detail": "Generated query vector successfully.", "timestamp": time.time()})
        logs.append({"stage": "Vector Retrieval", "detail": "Completed index query. Scanning results below similarity threshold of 0.80.", "timestamp": time.time()})
    elif request.scenario_id == "index_not_found":
        logs.append({"stage": "Vector Retrieval", "detail": "Locating index 'rag-index-v1' in Search Service...", "timestamp": time.time()})
    elif request.scenario_id == "llm_rate_limiting":
        logs.append({"stage": "Embedding Generation", "detail": "Generated query vector successfully.", "timestamp": time.time()})
        logs.append({"stage": "Vector Retrieval", "detail": "Retrieved matching document chunks.", "timestamp": time.time()})
        logs.append({"stage": "Response Generation", "detail": "Forwarding augmented prompt to GPT-4 model deployment...", "timestamp": time.time()})

    logs.append({"stage": "Process Terminated", "detail": "Error occurred. Halting request execution.", "timestamp": time.time()})

    return {
        "success": False,
        "scenario_id": request.scenario_id,
        "title": scenario["title"],
        "error_message": scenario["error_message"],
        "cause": scenario["cause"],
        "remediation": scenario["remediation"],
        "logs": logs
    }

@app.get("/dashboard/metrics")
def get_dashboard_metrics():
    # Return metrics + some dynamic variance to look active
    res = metrics_store.copy()
    res["queries_processed"] += random.randint(0, 2)
    res["tokens_consumed"] += random.randint(0, 1500)
    return res

# Serve static files from React build directory
build_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")
if os.path.exists(build_dir):
    app.mount("/", StaticFiles(directory=build_dir, html=True), name="static")
