import logging
import hashlib
import random
from typing import List
from openai import AzureOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

class EmbeddingGenerator:
    """Generates vector embeddings using Azure OpenAI or deterministic mock fallback."""

    def __init__(self):
        self.endpoint = settings.AZURE_OPENAI_ENDPOINT
        self.api_key = settings.AZURE_OPENAI_API_KEY
        self.api_version = settings.AZURE_OPENAI_API_VERSION
        self.deployment = settings.AZURE_OPENAI_EMBEDDING_DEPLOYMENT
        self.dimensions = settings.AZURE_OPENAI_EMBEDDING_DIMENSIONS

        self.is_mock_mode = (
            not self.endpoint or 
            not self.api_key or 
            not self.deployment or
            "your-resource-name" in self.endpoint or
            "mock-openai" in self.endpoint
        )

        if self.is_mock_mode:
            logger.info("=== EMBEDDING GENERATOR: MOCK MODE ACTIVE ===")
            logger.info(f"Using deterministic mock vectors of dimension: {self.dimensions}")
        else:
            logger.info(f"EMBEDDING GENERATOR: Initialising Azure OpenAI Client ({self.endpoint})")
            try:
                self.client = AzureOpenAI(
                    azure_endpoint=self.endpoint,
                    api_key=self.api_key,
                    api_version=self.api_version
                )
            except Exception as e:
                logger.error(f"Failed to initialise Azure OpenAI: {e}. Falling back to mock mode.")
                self.is_mock_mode = True

    def generate_embedding(self, text: str) -> List[float]:
        """Generates a float vector list for the input text block."""
        if not text.strip():
            # Return zero vector for empty strings
            return [0.0] * self.dimensions

        if self.is_mock_mode:
            vector = self._generate_deterministic_mock(text)
        else:
            try:
                # Call Azure OpenAI embedding deployment
                response = self.client.embeddings.create(
                    input=[text],
                    model=self.deployment
                )
                vector = response.data[0].embedding
            except Exception as e:
                logger.error(f"Azure OpenAI embedding call failed: {e}. Falling back to mock mode.")
                vector = self._generate_deterministic_mock(text)

        # Validate dimensions match configuration
        if len(vector) != self.dimensions:
            raise ValueError(
                f"Embedding vector dimension mismatch: expected {self.dimensions}, got {len(vector)}"
            )

        return vector

    def _generate_deterministic_mock(self, text: str) -> List[float]:
        """Generates a repeatable, deterministic mock float vector based on string hash values."""
        # Seed random sequence using text hash code
        hash_seed = int(hashlib.md5(text.encode('utf-8')).hexdigest(), 16)
        rng = random.Random(hash_seed)
        
        # Generate floating point values between -1.0 and 1.0
        mock_vector = [round(rng.uniform(-1.0, 1.0), 6) for _ in range(self.dimensions)]
        return mock_vector

    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Compatibility async method returning a list of vector embeddings."""
        return [self.generate_embedding(t) for t in texts]

