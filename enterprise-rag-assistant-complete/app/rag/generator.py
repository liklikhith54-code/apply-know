import logging
from typing import List, Dict, Any
from openai import AzureOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

class Generator:
    """Generates precise document-grounded answers with inline citations using Azure OpenAI (or dynamic mock summaries)."""

    def __init__(self, client: AzureOpenAI = None):
        self.client = client
        self.mock_mode = settings.MOCK_AZURE_SERVICES or not settings.is_azure_configured
        
        if not self.mock_mode and not self.client:
            try:
                self.client = AzureOpenAI(
                    azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                    api_key=settings.AZURE_OPENAI_API_KEY,
                    api_version=settings.AZURE_OPENAI_API_VERSION
                )
            except Exception as e:
                logger.warning(f"Failed to initialize Azure OpenAI client for generator, using mock: {e}")
                self.mock_mode = True

    async def generate_answer(
        self,
        query: str,
        chunks: List[Dict[str, Any]],
        confidence_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generates grounded answer with source citations.

        Args:
            query: The user query.
            chunks: List of retrieved chunks.
            confidence_result: Confidence analysis results.
        """
        # Hallucination Prevention check (Phase 12)
        if not confidence_result.get("sufficient_evidence", False) or not chunks:
            logger.info("Insufficient evidence retrieved. Returning standard negative response.")
            return {
                "answer": "I couldn't find sufficient information in the knowledge base to answer this question.",
                "citations": []
            }

        # Format citations list
        citations = []
        for idx, chunk in enumerate(chunks, 1):
            citations.append({
                "document_name": chunk.get("document_name", "Unknown"),
                "page": chunk.get("page_number"),
                "section": chunk.get("section", "General"),
                "source_id": chunk.get("id") or chunk.get("chunk_id", str(idx))
            })

        if self.mock_mode:
            logger.info("Generating mock grounded answer...")
            # Synthesize mock response summarizing retrieved text
            answer_parts = []
            answer_parts.append(f"Based on the retrieved enterprise documents:")
            
            for idx, chunk in enumerate(chunks, 1):
                doc = chunk.get("document_name", "document")
                sec = chunk.get("section", "General")
                content = chunk.get("content", "")
                # Clean content snippet
                snippet = content[:150] + "..." if len(content) > 150 else content
                answer_parts.append(f"According to {doc} under '{sec}' [{idx}], the policy notes that: '{snippet}'.")
            
            # Combine comparisons if standard/enterprise contrast is in query
            query_lower = query.lower()
            if "compare" in query_lower or "difference" in query_lower:
                answer_parts.append("Comparing the retrieved policies reveals differences in limits and scopes.")

            return {
                "answer": "\n\n".join(answer_parts),
                "citations": citations
            }

        # Production Azure OpenAI Chat call
        # Assemble context block
        context_lines = []
        for idx, chunk in enumerate(chunks, 1):
            header = f"--- Source [{idx}] ID: {chunk.get('id')} Document: {chunk.get('document_name')} Page: {chunk.get('page_number')} Section: {chunk.get('section')} ---"
            context_lines.append(f"{header}\n{chunk.get('content')}\n")
        context_block = "\n".join(context_lines)

        system_message = (
            "You are an enterprise knowledge assistant. You must answer the user's question using ONLY the provided sources.\n"
            "Strictly adhere to these rules:\n"
            "1. Answer the question using ONLY the facts present in the source context. Do NOT assume, extrapolate, or invent details.\n"
            "2. For every factual claim you make, you MUST cite the source by adding its bracketed index number (e.g. [1], [2]) at the end of the sentence.\n"
            "3. If the sources do not contain enough information to answer, state clearly that you cannot answer based on the retrieved documents.\n"
            "4. Distinguish clearly between facts directly stated and areas of uncertainty or lack of coverage in the documents.\n"
            "5. Do NOT reference source indexes that were not provided in the context."
        )

        user_message = (
            f"Retrieved Source Context:\n{context_block}\n\n"
            f"User Question: {query}\n\n"
            f"Grounded Answer:"
        )

        try:
            logger.info(f"Calling Azure OpenAI chat deployment '{settings.AZURE_OPENAI_CHAT_DEPLOYMENT}'...")
            response = self.client.chat.completions.create(
                model=settings.AZURE_OPENAI_CHAT_DEPLOYMENT,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.0,
                max_tokens=800
            )
            answer = response.choices[0].message.content.strip()
            
            return {
                "answer": answer,
                "citations": citations
            }
        except Exception as e:
            logger.error(f"Error during OpenAI answer generation: {e}", exc_info=True)
            raise
