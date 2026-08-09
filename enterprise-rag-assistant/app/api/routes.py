import logging
import time
import os
import json
import glob
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException

from app.models.schemas import ChatRequest, ChatResponse, Citation
from app.rag.query_rewriter import QueryRewriter
from app.rag.retriever import Retriever
from app.rag.confidence import ConfidenceScorer
from app.rag.generator import Generator
from app.ingestion.pipeline import IngestionPipeline
from app.rag.cache import ResponseCache
from app.config import settings, ROOT_DIR

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize core pipeline modules
rewriter = QueryRewriter()
retriever = Retriever()
confidence_scorer = ConfidenceScorer()
generator = Generator()
response_cache = ResponseCache()


@router.get("/status", tags=["Status"])
async def get_status():
    """Get service API operational status including Azure service connection states."""
    mock_mode = settings.MOCK_AZURE_SERVICES or not settings.is_azure_configured

    def svc_status(configured: bool) -> str:
        if mock_mode:
            return "MOCK MODE"
        return "CONNECTED" if configured else "NOT CONFIGURED"

    openai_configured = bool(settings.AZURE_OPENAI_ENDPOINT and settings.AZURE_OPENAI_API_KEY)
    search_configured = bool(settings.AZURE_SEARCH_ENDPOINT and settings.AZURE_SEARCH_API_KEY)
    storage_configured = bool(settings.AZURE_STORAGE_CONNECTION_STRING)
    insights_configured = bool(settings.APPLICATIONINSIGHTS_CONNECTION_STRING)

    return {
        "status": "operational",
        "mock_mode": mock_mode,
        "azure_openai": svc_status(openai_configured),
        "azure_search": svc_status(search_configured),
        "azure_storage": svc_status(storage_configured),
        "application_insights": "CONFIGURED" if insights_configured else "NOT CONFIGURED",
        "embedding_dimensions": settings.AZURE_OPENAI_EMBEDDING_DIMENSIONS,
        "search_index": settings.AZURE_SEARCH_INDEX_NAME,
    }



@router.post("/ingest", tags=["Ingestion"])
async def ingest_documents(
    chunk_size: int = Query(default=1000, description="Max character length per chunk block"),
    chunk_overlap: int = Query(default=200, description="Character overlap between consecutive chunks")
):
    """Triggers the document retrieval, chunking, and embedding generation sequence."""
    logger.info("REST API request: Triggering ingestion pipeline")
    try:
        pipeline = IngestionPipeline(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        result = pipeline.run_ingestion()
        
        return {
            "status": "success",
            "mock_mode": result["mock_mode"],
            "processed_files": result["processed_files"],
            "chunks_created": result["chunks_created"],
            "embeddings_generated": result["embeddings_generated"],
            "embedding_dimensions": result["embedding_dimensions"]
        }
    except Exception as e:
        logger.error(f"Ingestion REST API failed: {e}", exc_info=True)
        return {
            "status": "failed",
            "error": str(e)
        }

@router.post("/chat", response_model=ChatResponse, tags=["RAG"])
async def chat_endpoint(request: ChatRequest):
    """Executes the complete production RAG query rewriting, hybrid retrieval, and generation flow."""
    import uuid
    request_id = str(uuid.uuid4())
    start_time = time.perf_counter()
    try:
        # Check secure responses cache first (scoped strictly to user entitlements to prevent privilege bypass)
        cached_res = response_cache.get(request.question, request.user_groups, request.user_department, request.search_mode, request.top_k)
        if cached_res is not None:
            latency = (time.perf_counter() - start_time) * 1000.0
            # Update cache response latency metric
            cached_res.latency_ms = latency
            logger.info(
                f"RAG Request Telemetry (CACHE HIT): [RequestID: {request_id}] [TotalLatency: {latency:.2f}ms] "
                f"[Cached: True] [UserGroups: {request.user_groups}] [UserDept: {request.user_department}]"
            )
            return cached_res

        # 1. Query Rewriting (Conversational Context)
        standalone_query = await rewriter.rewrite(request.question, request.history)

        # 2. Hybrid Retrieval with version controls and access groups
        ret_start = time.perf_counter()
        retrieved_chunks = await retriever.retrieve(
            query=standalone_query,
            top_k=request.top_k,
            user_groups=request.user_groups,
            user_department=request.user_department,
            search_mode=request.search_mode
        )
        ret_lat = (time.perf_counter() - ret_start) * 1000.0

        # 3. Evidence / Confidence validation checks
        confidence_res = confidence_scorer.evaluate_confidence(standalone_query, retrieved_chunks)

        # 4. Generate Answer with Citations
        gen_start = time.perf_counter()
        gen_res = await generator.generate_answer(
            query=standalone_query,
            chunks=retrieved_chunks,
            confidence_result=confidence_res
        )
        gen_lat = (time.perf_counter() - gen_start) * 1000.0

        # Prepare retrieved documents representation for user
        retrieved_docs = []
        for c in retrieved_chunks:
            retrieved_docs.append({
                "id": c.get("chunk_id") or c.get("id"),
                "document_name": c.get("document_name"),
                "page_number": c.get("page_number"),
                "section": c.get("section"),
                "score": c.get("score", 0.0),
                "content": c.get("content")
            })

        latency = (time.perf_counter() - start_time) * 1000.0

        # Create structured response
        response = ChatResponse(
            answer=gen_res["answer"],
            citations=[Citation(**cit) for cit in gen_res["citations"]],
            confidence=confidence_res["rating"],
            retrieved_documents=retrieved_docs,
            latency_ms=latency
        )

        # Log detailed Telemetry in JSON formatting to be parsed by App Insights
        logger.info(
            f"RAG Request Telemetry: [RequestID: {request_id}] [TotalLatency: {latency:.2f}ms] "
            f"[RetrievalLatency: {ret_lat:.2f}ms] [GenerationLatency: {gen_lat:.2f}ms] "
            f"[UserGroups: {request.user_groups}] [UserDept: {request.user_department}] "
            f"[ChunksRetrieved: {len(retrieved_chunks)}] [Confidence: {confidence_res['rating']}] "
            f"[Tokens: Input={len(standalone_query)//4}, Output={len(gen_res['answer'])//4}]"
        )

        # Store in caching layer
        response_cache.set(request.question, request.user_groups, request.user_department, response, request.search_mode, request.top_k)
        
        return response

    except Exception as e:
        logger.error(f"Error in chat endpoint: {e} [RequestID: {request_id}]", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal RAG pipeline error: {str(e)} [RequestID: {request_id}]")

@router.post("/search", tags=["RAG"])
async def search_endpoint(
    query: str,
    user_groups: Optional[List[str]] = Query(None),
    user_department: Optional[str] = Query(None),
    top_k: int = 5
):
    """Executes vector + keyword hybrid search directly."""
    try:
        results = await retriever.retrieve(
            query=query,
            top_k=top_k,
            user_groups=user_groups,
            user_department=user_department
        )
        return {"results": results}
    except Exception as e:
        logger.error(f"Error in search endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard", tags=["Dashboard"])
async def get_dashboard_stats():
    """Returns live stats for the engineering dashboard."""
    import datetime
    mock_mode = settings.MOCK_AZURE_SERVICES or not settings.is_azure_configured

    docs_dir = os.path.join(ROOT_DIR, "data", "documents")
    doc_files = [f for f in glob.glob(os.path.join(docs_dir, "*")) if not os.path.basename(f).startswith(".")]
    doc_count = len(doc_files)

    chunk_count = 0
    mock_index_path = os.path.join(ROOT_DIR, "data", "mock_index.json")
    last_ingestion = None
    if os.path.exists(mock_index_path):
        try:
            with open(mock_index_path, "r") as f:
                index_data = json.load(f)
                chunk_count = len(index_data) if isinstance(index_data, list) else 0
            mtime = os.path.getmtime(mock_index_path)
            last_ingestion = datetime.datetime.fromtimestamp(mtime).isoformat()
        except Exception:
            pass

    eval_dataset_path = os.path.join(ROOT_DIR, "evaluation", "dataset.json")
    eval_q_count = 0
    if os.path.exists(eval_dataset_path):
        try:
            with open(eval_dataset_path, "r") as f:
                eval_data = json.load(f)
                eval_q_count = len(eval_data) if isinstance(eval_data, list) else 0
        except Exception:
            pass

    tests_dir = os.path.join(ROOT_DIR, "tests")
    test_files = glob.glob(os.path.join(tests_dir, "test_*.py"))

    return {
        "mock_mode": mock_mode,
        "service_mode": "LOCAL / MOCK MODE" if mock_mode else "AZURE MODE",
        "document_count": doc_count,
        "chunk_count": chunk_count,
        "evaluation_questions": eval_q_count,
        "test_files": len(test_files),
        "last_ingestion": last_ingestion,
        "embedding_dimensions": settings.AZURE_OPENAI_EMBEDDING_DIMENSIONS,
        "search_index": settings.AZURE_SEARCH_INDEX_NAME,
    }


@router.get("/documents", tags=["Knowledge Base"])
async def list_documents():
    """Lists documents in the local knowledge base with chunk counts."""
    import datetime
    docs_dir = os.path.join(ROOT_DIR, "data", "documents")
    mock_index_path = os.path.join(ROOT_DIR, "data", "mock_index.json")
    chunk_map: Dict[str, int] = {}

    if os.path.exists(mock_index_path):
        try:
            with open(mock_index_path, "r") as f:
                chunks = json.load(f)
                for ch in chunks:
                    dn = ch.get("document_name", "unknown")
                    chunk_map[dn] = chunk_map.get(dn, 0) + 1
        except Exception:
            pass

    documents = []
    if os.path.exists(docs_dir):
        for fpath in sorted(glob.glob(os.path.join(docs_dir, "*"))):
            fname = os.path.basename(fpath)
            if fname.startswith("."):
                continue
            ext = fname.rsplit(".", 1)[-1].upper() if "." in fname else "UNKNOWN"
            stat = os.stat(fpath)
            documents.append({
                "name": fname,
                "type": ext,
                "size_bytes": stat.st_size,
                "modified": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "chunk_count": chunk_map.get(fname, 0),
                "indexed": fname in chunk_map,
                "access_groups": ["ALL"],
                "version": "latest",
            })

    return {"documents": documents, "total": len(documents)}


@router.get("/evaluation", tags=["Evaluation"])
async def get_evaluation_results():
    """Returns actual evaluation results from evaluation/results/ directory."""
    results_dir = os.path.join(ROOT_DIR, "evaluation", "results")

    def load_json(filename: str):
        path = os.path.join(results_dir, filename)
        if os.path.exists(path):
            try:
                with open(path, "r") as f:
                    return json.load(f)
            except Exception:
                return None
        return None

    baseline = load_json("baseline_results.json")
    improved = load_json("improved_results.json")
    comparison = load_json("comparison.json")

    return {
        "evaluation_mode": "LOCAL / MOCK EVALUATION",
        "baseline": baseline,
        "improved": improved,
        "comparison": comparison,
        "results_available": baseline is not None or improved is not None,
    }
