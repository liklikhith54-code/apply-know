import time
import os
import shutil
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks

from app.models.schemas import ChatRequest, ChatResponse, Citation
from app.rag.query_rewriter import QueryRewriter
from app.rag.retriever import Retriever
from app.rag.confidence import ConfidenceScorer
from app.rag.generator import Generator
from app.ingestion.parser import DocumentParser
from app.ingestion.chunker import Chunker
from app.ingestion.metadata import MetadataExtractor
from app.ingestion.embeddings import EmbeddingGenerator
from app.ingestion.indexer import Indexer
from app.config import settings, ROOT_DIR

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize core pipeline modules
rewriter = QueryRewriter()
retriever = Retriever()
confidence_scorer = ConfidenceScorer()
generator = Generator()
parser = DocumentParser()
chunker = Chunker()
metadata_extractor = MetadataExtractor()
embedding_gen = EmbeddingGenerator()
indexer = Indexer()

@router.post("/chat", response_model=ChatResponse, tags=["RAG"])
async def chat_endpoint(request: ChatRequest):
    """Executes the complete production RAG query rewriting, hybrid retrieval, and generation flow."""
    start_time = time.perf_counter()
    try:
        # 1. Query Rewriting (Phase 9)
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

        # 3. Evidence / Confidence validation checks (Phase 12)
        confidence_res = confidence_scorer.evaluate_confidence(standalone_query, retrieved_chunks)

        # 4. Generate Answer with Citations (Phase 10, 13)
        gen_res = await generator.generate_answer(
            query=standalone_query,
            chunks=retrieved_chunks,
            confidence_result=confidence_res
        )

        # Prepare retrieved documents representation for user
        retrieved_docs = []
        for c in retrieved_chunks:
            retrieved_docs.append({
                "id": c.get("id"),
                "document_name": c.get("document_name"),
                "page_number": c.get("page_number"),
                "section": c.get("section"),
                "score": c.get("score", 0.0),
                "content": c.get("content")
            })

        latency = (time.perf_counter() - start_time) * 1000.0

        return ChatResponse(
            answer=gen_res["answer"],
            citations=[Citation(**cit) for cit in gen_res["citations"]],
            confidence=confidence_res["rating"],
            retrieved_documents=retrieved_docs,
            latency_ms=latency
        )

    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal RAG pipeline error: {str(e)}")


@router.post("/search", tags=["RAG"])
async def search_endpoint(
    query: str,
    user_groups: Optional[List[str]] = Form(None),
    user_department: Optional[str] = Form(None),
    top_k: int = 5
):
    """Executes vector + keyword hybrid search with Entra/department filter validation directly."""
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


@router.post("/ingest", tags=["Ingestion"])
async def ingest_endpoint(
    file: UploadFile = File(...),
    department: Optional[str] = Form(None),
    version: Optional[str] = Form(None),
    effective_date: Optional[str] = Form(None),
    access_groups: Optional[List[str]] = Form(None)
):
    """Uploads, parses, chunks, embeds, and indexes a corporate document file."""
    temp_dir = os.path.join(ROOT_DIR, "data", "temp_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = Path(temp_dir) / file.filename

    try:
        # Save file to disk
        with open(temp_file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # 1. Parse document structure
        parsed_doc = parser.parse(temp_file_path)

        # 2. Extract/infer metadata
        extracted_meta = metadata_extractor.extract_metadata(parsed_doc["text"], file.filename)
        
        # Override metadata with user forms parameters if specified
        final_meta = {
            "version": version or extracted_meta["version"],
            "effective_date": effective_date or extracted_meta["effective_date"],
            "department": department or extracted_meta["department"],
            "access_groups": access_groups or extracted_meta["access_groups"],
            "document_type": extracted_meta["document_type"]
        }

        # 3. Create Chunks
        chunks = chunker.chunk_document(parsed_doc)

        # Inject unified metadata to all chunks
        texts_to_embed = []
        for chunk in chunks:
            chunk.update(final_meta)
            texts_to_embed.append(chunk["content"])

        # 4. Generate Embeddings
        embeddings = await embedding_gen.generate_embeddings(texts_to_embed)
        
        # Map back to chunks
        for idx, chunk in enumerate(chunks):
            chunk["content_vector"] = embeddings[idx] if idx < len(embeddings) else []

        # 5. Index into search database
        await indexer.index_chunks(chunks)

        return {
            "status": "success",
            "document_name": file.filename,
            "chunks_count": len(chunks),
            "metadata": final_meta
        }

    except Exception as e:
        logger.error(f"Error during document ingestion: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
    finally:
        # Clean up upload file
        if temp_file_path.exists():
            os.remove(temp_file_path)
