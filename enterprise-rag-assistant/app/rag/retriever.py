import logging
import json
import os
import time
import re
from typing import List, Dict, Any, Optional
import numpy as np
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from app.config import settings, ROOT_DIR
from app.ingestion.embeddings import EmbeddingGenerator

logger = logging.getLogger(__name__)

MOCK_INDEX_FILE = os.path.join(ROOT_DIR, "data", "mock_index.json")

class Retriever:
    """Enterprise RAG Retriever supporting hybrid search, semantic reranking, versioning, and access control."""

    def __init__(self, embedding_generator: EmbeddingGenerator = None):
        self.embedding_generator = embedding_generator or EmbeddingGenerator()
        self.mock_mode = settings.MOCK_AZURE_SERVICES or not settings.is_azure_configured
        
        if not self.mock_mode:
            try:
                self.credential = AzureKeyCredential(settings.AZURE_SEARCH_API_KEY)
                self.search_client = SearchClient(
                    endpoint=settings.AZURE_SEARCH_ENDPOINT,
                    index_name=settings.AZURE_SEARCH_INDEX_NAME,
                    credential=self.credential
                )
            except Exception as e:
                logger.warning(f"Failed to initialize Azure Search client, using mock search: {e}")
                self.mock_mode = True

    async def retrieve(
        self,
        query: str,
        top_k: int = 5,
        user_groups: List[str] = None,
        user_department: Optional[str] = None,
        search_mode: str = "hybrid" # keyword, vector, hybrid
    ) -> List[Dict[str, Any]]:
        """Retrieves and ranks document chunks based on security, versions, and hybrid search methods.

        Args:
            query: rewritten standalone search query text.
            top_k: number of records to return.
            user_groups: list of security groups the user belongs to (for ACL filtering).
            user_department: department of the user.
            search_mode: retrieval style ('keyword', 'vector', or 'hybrid').
        """
        start_time = time.perf_counter()
        
        # Enforce default access groups if not provided
        if not user_groups:
            user_groups = ["ALL"]
        else:
            if "ALL" not in user_groups:
                user_groups = user_groups + ["ALL"]

        if self.mock_mode:
            results = await self._retrieve_mock(query, top_k, user_groups, user_department, search_mode)
        else:
            results = await self._retrieve_azure(query, top_k, user_groups, user_department, search_mode)

        latency = (time.perf_counter() - start_time) * 1000.0
        logger.info(f"Retrieved {len(results)} chunks in {latency:.2f}ms for query: '{query}'")
        return results

    async def _retrieve_mock(
        self,
        query: str,
        top_k: int,
        user_groups: List[str],
        user_department: Optional[str],
        search_mode: str
    ) -> List[Dict[str, Any]]:
        """Simulates Hybrid vector & keyword search with version filtering and access control locally."""
        if not os.path.exists(MOCK_INDEX_FILE):
            logger.warning("Mock index file does not exist. Run ingestion or index creation scripts.")
            return []

        with open(MOCK_INDEX_FILE, "r", encoding="utf-8") as f:
            all_chunks = json.load(f)

        # 1. SECURITY & DEPT FILTERING (Phase 15)
        # Authorize BEFORE content is passed to LLM
        filtered_chunks = []
        for chunk in all_chunks:
            chunk_groups = chunk.get("access_groups", ["ALL"])
            # Match groups
            has_group = any(group in user_groups for group in chunk_groups) or "ALL" in chunk_groups
            
            # If user_department is specified, filter departmental limits if applicable
            # (e.g. HR user gets HR docs, Finance gets Finance docs)
            if has_group:
                filtered_chunks.append(chunk)

        # 2. DOCUMENT VERSION FILTERING (Phase 11)
        # Find latest version for documents to prevent version-conflicts (e.g., Leave_Policy_2024 vs Leave_Policy_2026)
        # We group by the base document title (e.g. 'Leave_Policy')
        latest_versions = {}
        for chunk in filtered_chunks:
            doc_name = chunk["document_name"]
            # Extract base name by removing year patterns like _2024 or _2026
            base_name = re.sub(r'_(20\d{2})', '', doc_name)
            # Find version/date metrics
            version = float(chunk.get("version", "1.0").replace("v", ""))
            effective_date = chunk.get("effective_date", "2000-01-01")

            key = (base_name, chunk.get("document_type", "Standard"))
            if key not in latest_versions:
                latest_versions[key] = {"version": version, "effective_date": effective_date, "doc_name": doc_name}
            else:
                # Compare version or date
                current = latest_versions[key]
                if version > current["version"] or (version == current["version"] and effective_date > current["effective_date"]):
                    latest_versions[key] = {"version": version, "effective_date": effective_date, "doc_name": doc_name}

        # Filter out outdated documents
        active_doc_names = {val["doc_name"] for val in latest_versions.values()}
        final_filtered_chunks = [c for c in filtered_chunks if c["document_name"] in active_doc_names]

        if not final_filtered_chunks:
            return []

        # 3. SEARCH METHOD EXECUTIONS
        # Vector score calculations
        vector_scores = {}
        if search_mode in ("vector", "hybrid"):
            query_vector = (await self.embedding_generator.generate_embeddings([query]))[0]
            qv_np = np.array(query_vector)
            for chunk in final_filtered_chunks:
                chunk_vector = chunk.get("content_vector")
                if chunk_vector:
                    cv_np = np.array(chunk_vector)
                    # Cosine similarity
                    dot = np.dot(qv_np, cv_np)
                    norm_q = np.linalg.norm(qv_np)
                    norm_c = np.linalg.norm(cv_np)
                    score = dot / (norm_q * norm_c) if (norm_q * norm_c) > 0 else 0.0
                    vector_scores[chunk["id"]] = float(score)
                else:
                    vector_scores[chunk["id"]] = 0.0

        # Keyword score calculations (TF-IDF overlap heuristic)
        keyword_scores = {}
        query_words = set(query.lower().split())
        for chunk in final_filtered_chunks:
            content_lower = chunk["content"].lower()
            matches = sum(1 for word in query_words if word in content_lower)
            # Jaccard-like score
            score = matches / (len(query_words) + len(set(content_lower.split())) - matches) if query_words else 0.0
            keyword_scores[chunk["id"]] = score

        # 4. FUSION AND RAMPING (RRF / Rank Fusion - Phase 8)
        # Sort each result to determine rankings
        sorted_vector = sorted(final_filtered_chunks, key=lambda c: vector_scores.get(c["id"], 0.0), reverse=True)
        sorted_keyword = sorted(final_filtered_chunks, key=lambda c: keyword_scores.get(c["id"], 0.0), reverse=True)

        rank_vector = {c["id"]: idx for idx, c in enumerate(sorted_vector)}
        rank_keyword = {c["id"]: idx for idx, c in enumerate(sorted_keyword)}

        fused_scores = {}
        for chunk in final_filtered_chunks:
            cid = chunk["id"]
            # Reciprocal Rank Fusion: 1 / (60 + rank)
            rrf_vec = 1.0 / (60.0 + rank_vector.get(cid, 9999))
            rrf_key = 1.0 / (60.0 + rank_keyword.get(cid, 9999))
            
            if search_mode == "vector":
                fused_scores[cid] = vector_scores.get(cid, 0.0)
            elif search_mode == "keyword":
                fused_scores[cid] = keyword_scores.get(cid, 0.0)
            else:
                # Normalize Reciprocal Rank Fusion to 0.0 - 1.0 scale
                # Max RRF is 1/60 + 1/60 = 0.033333...
                raw_rrf = rrf_vec + rrf_key
                fused_scores[cid] = min(1.0, raw_rrf / 0.033333)

        # Sort based on fused rankings
        top_chunks = sorted(final_filtered_chunks, key=lambda c: fused_scores.get(c["id"], 0.0), reverse=True)

        # 5. SEMANTIC RERANKING SIMULATION
        # Re-rank the top candidates based on specific structural density (prioritize title, section match)
        candidates = top_chunks[:top_k * 2]
        reranked = []
        for c in candidates:
            score = fused_scores.get(c["id"], 0.0)
            # Add semantic boosts
            title_match = any(word in c["document_name"].lower() for word in query_words)
            section_match = any(word in c["section"].lower() for word in query_words)
            boost = 0.0
            if title_match:
                boost += 0.05
            if section_match:
                boost += 0.05
            
            reranked.append((score + boost, c))

        reranked.sort(key=lambda x: x[0], reverse=True)
        
        # Format outputs
        final_results = []
        for score, chunk in reranked[:top_k]:
            c_copy = dict(chunk)
            # Strip vectors before sending to prevent contextbloat
            if "content_vector" in c_copy:
                del c_copy["content_vector"]
            c_copy["score"] = score
            final_results.append(c_copy)

        return final_results

    async def _retrieve_azure(
        self,
        query: str,
        top_k: int,
        user_groups: List[str],
        user_department: Optional[str],
        search_mode: str
    ) -> List[Dict[str, Any]]:
        """Invokes active Azure AI Search index using vector / keyword / hybrid queries with filter bindings."""
        # 1. Enforce access control filter rules (HR only for HR group, etc.)
        # OData filter syntax: access_groups/any(g: search.in(g, 'HR, ADMIN'))
        group_filter = "access_groups/any(g: search.in(g, '" + ",".join(user_groups) + "'))"
        filter_query = group_filter

        logger.info(f"Azure Search filter clauses: {filter_query}")

        # Produce query vectors
        query_vector = None
        if search_mode in ("vector", "hybrid"):
            vectors = await self.embedding_generator.generate_embeddings([query])
            query_vector = vectors[0] if vectors else None

        try:
            # Execute SDK calls
            if search_mode == "keyword":
                results = self.search_client.search(
                    search_text=query,
                    filter=filter_query,
                    top=top_k
                )
            elif search_mode == "vector":
                from azure.search.documents.models import VectorizedQuery
                vector_query = VectorizedQuery(vector=query_vector, k_nearest_neighbors=top_k, fields="content_vector")
                results = self.search_client.search(
                    search_text=None,
                    vector_queries=[vector_query],
                    filter=filter_query,
                    top=top_k
                )
            else: # Hybrid + Semantic ranker
                from azure.search.documents.models import VectorizedQuery
                vector_query = VectorizedQuery(vector=query_vector, k_nearest_neighbors=top_k, fields="content_vector")
                
                # Check for semantic configuration
                results = self.search_client.search(
                    search_text=query,
                    vector_queries=[vector_query],
                    filter=filter_query,
                    query_type="semantic",
                    semantic_configuration_name="semantic-config",
                    top=top_k
                )

            # Map to dict results
            chunks = []
            for doc in results:
                doc_dict = dict(doc)
                if "content_vector" in doc_dict:
                    del doc_dict["content_vector"]
                doc_dict["score"] = doc.get("@search.score", 0.0)
                chunks.append(doc_dict)

            # Apply additional client-side Document Versioning filtering
            # Standardize by finding highest version
            latest_versions = {}
            for chunk in chunks:
                doc_name = chunk["document_name"]
                base_name = re.sub(r'_(20\d{2})', '', doc_name)
                version = float(chunk.get("version", "1.0").replace("v", ""))
                effective_date = chunk.get("effective_date", "2000-01-01")
                key = (base_name, chunk.get("document_type", "Standard"))
                
                if key not in latest_versions:
                    latest_versions[key] = {"version": version, "effective_date": effective_date, "doc_name": doc_name}
                else:
                    current = latest_versions[key]
                    if version > current["version"] or (version == current["version"] and effective_date > current["effective_date"]):
                        latest_versions[key] = {"version": version, "effective_date": effective_date, "doc_name": doc_name}

            active_doc_names = {val["doc_name"] for val in latest_versions.values()}
            final_chunks = [c for c in chunks if c["document_name"] in active_doc_names]

            return final_chunks
        except Exception as e:
            logger.error(f"Error executing Azure search: {e}", exc_info=True)
            # Fall back to mock if Azure fails
            return await self._retrieve_mock(query, top_k, user_groups, user_department, search_mode)
