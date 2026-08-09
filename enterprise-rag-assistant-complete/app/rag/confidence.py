import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class ConfidenceScorer:
    """Evaluates whether retrieved documents contain sufficient evidence to answer user's query."""

    def __init__(self, threshold: float = 0.35):
        self.threshold = threshold

    def evaluate_confidence(self, query: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculates a confidence score and rating.

        Args:
            query: Standing query.
            chunks: List of retrieved chunks with 'score'.

        Returns:
            Dict containing:
                "score": float (0.0 to 1.0)
                "rating": str ("High", "Medium", "Low")
                "sufficient_evidence": bool
        """
        if not chunks:
            return {
                "score": 0.0,
                "rating": "Low",
                "sufficient_evidence": False
            }

        # Check maximum score among retrieved documents
        # Note: In mock mode, cosine similarity is saved as score, in real it's semantic or RRF
        top_score = chunks[0].get("score", 0.0)
        logger.info(f"Evaluating confidence with top retrieved score: {top_score:.3f}")

        # Filter out common English stop words to check meaningful overlap
        stop_words = {
            "the", "a", "an", "and", "or", "but", "if", "then", "else", "when", 
            "at", "by", "from", "for", "in", "out", "on", "to", "with", "is", 
            "are", "was", "were", "be", "been", "have", "has", "had", "do", "does",
            "did", "what", "which", "who", "whom", "this", "that", "these", "those",
            "how", "many", "any", "all", "of", "about", "under", "above", "re"
        }
        
        query_words = {w for w in query.lower().split() if w not in stop_words}
        max_overlap_ratio = 0.0
        for chunk in chunks:
            words = {w for w in chunk.get("content", "").lower().split() if w not in stop_words}
            overlap = len(query_words.intersection(words))
            ratio = overlap / len(query_words) if query_words else 0.0
            if ratio > max_overlap_ratio:
                max_overlap_ratio = ratio

        # Heuristic confidence blending
        # If top_score is an RRF score, it might be around 0.033, so we check both top score and word overlap
        is_sufficient = False
        rating = "Low"
        score = top_score

        # Safeguard: if there is very low word overlap (< 0.25), consider it insufficient evidence
        if max_overlap_ratio < 0.25:
            rating = "Low"
            is_sufficient = False
            score = min(top_score, max_overlap_ratio)
        elif top_score > 0.6 or max_overlap_ratio > 0.4:
            rating = "High"
            is_sufficient = True
            score = max(top_score, max_overlap_ratio)
        elif top_score >= self.threshold or max_overlap_ratio >= 0.2:
            rating = "Medium"
            is_sufficient = True
            score = max(top_score, max_overlap_ratio)
        else:
            rating = "Low"
            is_sufficient = False
            score = min(top_score, max_overlap_ratio)

        logger.info(f"Confidence evaluation: rating={rating}, score={score:.2f}, sufficient={is_sufficient}")
        return {
            "score": score,
            "rating": rating,
            "sufficient_evidence": is_sufficient
        }
