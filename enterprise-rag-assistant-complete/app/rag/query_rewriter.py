import logging
from typing import List, Dict
from openai import AzureOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

class QueryRewriter:
    """Conversational context query rewriter utilizing Azure OpenAI (or pattern rules when mocked)."""

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
                logger.warning(f"Failed to initialize Azure OpenAI client for rewriter, using mock: {e}")
                self.mock_mode = True

    async def rewrite(self, query: str, history: List[Dict[str, str]]) -> str:
        """Translates conversational queries into standalone search queries.

        Args:
            query: The latest user question.
            history: List of dictionary records of the conversation history.
        """
        if not history:
            return query

        if self.mock_mode:
            logger.info("Rewriting query in mock mode based on basic context mapping...")
            # Simulate conversational reference resolution
            history_str = " ".join([h.get("content", "").lower() for h in history])
            query_lower = query.lower()

            if "what about" in query_lower or "limit" in query_lower:
                # If history talks about Enterprise and query is "What about Standard?" -> "What is the Standard cancellation policy?"
                if "enterprise" in history_str:
                    if "cancellation" in history_str:
                        return f"What is the Standard plan cancellation policy?"
                    if "limit" in history_str or "reimbursement" in history_str:
                        return f"What is the Standard plan limit?"
            return query

        # Active OpenAI execution
        try:
            conversation_context = ""
            for turn in history[-5:]: # Keep last 5 turns to stay token friendly
                role = turn.get("role", "user")
                content = turn.get("content", "")
                conversation_context += f"{role.capitalize()}: {content}\n"
            
            prompt = (
                "Given the following conversation history and a follow-up question, "
                "rewrite the follow-up question to be a standalone query that contains all necessary context "
                "to perform a keyword and vector search.\n\n"
                f"History:\n{conversation_context}\n"
                f"Follow-up: {query}\n\n"
                "Standalone Query:"
            )

            logger.info("Calling Azure OpenAI for query rewriting...")
            response = self.client.chat.completions.create(
                model=settings.AZURE_OPENAI_CHAT_DEPLOYMENT,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that reformulates follow-up search queries."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.0,
                max_tokens=100
            )
            rewritten = response.choices[0].message.content.strip()
            logger.info(f"Rewritten query: {rewritten}")
            return rewritten
        except Exception as e:
            logger.error(f"Error during query rewriting: {e}", exc_info=True)
            return query
