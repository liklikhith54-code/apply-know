import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class ConfidenceScorer:
    """Evaluates whether retrieved documents contain sufficient evidence using multi-factor signals."""

    def __init__(self, score_threshold: float = 0.15, threshold: float = None):
        self.score_threshold = threshold if threshold is not None else score_threshold

    def evaluate_confidence(self, query: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculates a confidence score based on retrieval relevance, retrieval scores, reranking,

        evidence coverage, and support consistency.

        Args:
            query: Standing query.
            chunks: List of retrieved chunks.

        Returns:
            Dict containing:
                "score": float (0.0 to 1.0)
                "rating": str ("HIGH", "MEDIUM", "LOW")
                "sufficient_evidence": bool
                "diagnostic_stopword_overlap": float (diagnostic only)
        """
        if not chunks:
            return {
                "score": 0.0,
                "rating": "LOW",
                "sufficient_evidence": False,
                "diagnostic_stopword_overlap": 0.0
            }

        # 1. Retrieval scores evaluation (hybrid or vector cosine similarities)
        top_score = chunks[0].get("score", 0.0)
        
        # 2. Semantic reranking score evaluation
        # In mock or real reranker, look for 'rerank_score'
        top_rerank = chunks[0].get("rerank_score", top_score)

        # 3. Evidence coverage check (optional stopword diagnostic overlap ratio)
        stop_words = {
            "the", "a", "an", "and", "or", "but", "if", "then", "else", "when", 
            "at", "by", "from", "for", "in", "out", "on", "to", "with", "is", 
            "are", "was", "were", "be", "been", "have", "has", "had", "do", "does",
            "did", "what", "which", "who", "whom", "this", "that", "these", "those",
            "how", "many", "any", "all", "of", "about", "under", "above"
        }
        query_words = {w for w in query.lower().split() if w not in stop_words}
        max_overlap_ratio = 0.0
        for chunk in chunks:
            words = {w for w in chunk.get("content", "").lower().split() if w not in stop_words}
            overlap = len(query_words.intersection(words))
            ratio = overlap / len(query_words) if query_words else 0.0
            if ratio > max_overlap_ratio:
                max_overlap_ratio = ratio

        # 4. Consistency/supporting evidence count (do multiple retrieved chunks from same document support?)
        document_matches = {}
        for chunk in chunks:
            doc = chunk.get("document_name", "")
            document_matches[doc] = document_matches.get(doc, 0) + 1
        
        # Supporting evidence score: boost if multiple chunks exist
        max_supporting_chunks = max(document_matches.values()) if document_matches else 0
        consistency_multiplier = 1.1 if max_supporting_chunks > 1 else 1.0

        # Multi-factor score formulation
        # Combines retrieval top score and reranker score with consistency boost
        weighted_score = ((top_score * 0.6) + (top_rerank * 0.4)) * consistency_multiplier
        # Ensure value bounds [0.0, 1.0]
        final_score = min(max(weighted_score, 0.0), 1.0)

        # Classify rating
        rating = "LOW"
        is_sufficient = False

        # Evaluate sufficiency using retrieval scores & reranking primarily
        if final_score >= 0.35:
            rating = "HIGH"
            is_sufficient = True
        elif final_score >= self.score_threshold:
            rating = "MEDIUM"
            is_sufficient = True
        else:
            rating = "LOW"
            is_sufficient = False

        logger.info(
            f"Multi-Factor Confidence check: score={final_score:.3f}, rating={rating}, "
            f"sufficient={is_sufficient} (RRF/cosine={top_score:.3f}, rerank={top_rerank:.3f}, "
            f"overlap_ratio={max_overlap_ratio:.3f}, supporting_chunks={max_supporting_chunks})"
        )

        return {
            "score": final_score,
            "rating": rating,
            "sufficient_evidence": is_sufficient,
            "diagnostic_stopword_overlap": max_overlap_ratio
        }
