import os
from dotenv import load_dotenv

load_dotenv()

# Server setup
PORT = int(os.getenv("PORT", 8000))

# Azure OpenAI
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_DEPLOYMENT_NAME = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4")
AZURE_OPENAI_EMBEDDING_NAME = os.getenv("AZURE_OPENAI_EMBEDDING_NAME", "text-embedding-ada-002")

# Azure AI Search
AZURE_SEARCH_ENDPOINT = os.getenv("AZURE_SEARCH_ENDPOINT", "")
AZURE_SEARCH_API_KEY = os.getenv("AZURE_SEARCH_API_KEY", "")
AZURE_SEARCH_INDEX_NAME = os.getenv("AZURE_SEARCH_INDEX_NAME", "rag-index")

# Detect Mode
def is_demo_mode() -> bool:
    # If key is mock, missing, or default example, we run in Demo Mode
    if not AZURE_OPENAI_API_KEY or "mock" in AZURE_OPENAI_API_KEY.lower() or "your-openai-api-key" in AZURE_OPENAI_API_KEY.lower():
        return True
    return False

IS_DEMO = is_demo_mode()
