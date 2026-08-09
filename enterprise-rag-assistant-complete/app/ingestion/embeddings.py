import logging
import asyncio
from typing import List
from openai import AzureOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

class EmbeddingGenerator:
    """Generates vector embeddings for chunk content using Azure OpenAI (or mock vectors if configured)."""

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
                logger.warning(f"Failed to initialize Azure OpenAI client, falling back to mock mode: {e}")
                self.mock_mode = True

    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generates embeddings for a list of strings with retries and batching.

        Args:
            texts: List of content strings to embed.

        Returns:
            List of embedding vectors (list of floats).
        """
        if not texts:
            return []

        if self.mock_mode:
            logger.info(f"Generating mock embeddings for {len(texts)} items (MOCK_MODE=True)")
            # Generate deterministic mock vectors of dimension 1536 based on string lengths/hash
            mock_vectors = []
            for text in texts:
                length = len(text)
                vector = [float((i + length) % 100) / 100.0 for i in range(1536)]
                # Normalize vector
                magnitude = sum(x**2 for x in vector)**0.5
                normalized = [x / magnitude for x in vector] if magnitude > 0 else vector
                mock_vectors.append(normalized)
            return mock_vectors

        # Production execution with retry logic
        max_retries = 3
        backoff = 2
        for attempt in range(max_retries):
            try:
                logger.info(f"Calling Azure OpenAI embedding deployment '{settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT}' for {len(texts)} texts...")
                response = self.client.embeddings.create(
                    input=texts,
                    model=settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
                )
                return [item.embedding for item in response.data]
            except Exception as e:
                logger.warning(f"Embedding creation failed (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(backoff ** attempt)
                else:
                    logger.error("Embedding creation failed permanently after all retries.")
                    raise
        return []
