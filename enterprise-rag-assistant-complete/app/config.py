import os
from typing import Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve absolute path to the .env file in the project root
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE_PATH = os.path.join(ROOT_DIR, ".env")

class Settings(BaseSettings):
    # Azure OpenAI Settings
    AZURE_OPENAI_ENDPOINT: str = Field(
        default="",
        description="Azure OpenAI endpoint URL"
    )
    AZURE_OPENAI_API_KEY: str = Field(
        default="",
        description="Azure OpenAI service API key"
    )
    AZURE_OPENAI_API_VERSION: str = Field(
        default="2024-02-15-preview",
        description="Azure OpenAI API Version"
    )
    AZURE_OPENAI_CHAT_DEPLOYMENT: str = Field(
        default="",
        description="Deployment name for Chat model (e.g., gpt-4o)"
    )
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT: str = Field(
        default="",
        description="Deployment name for Embedding model (e.g., text-embedding-3-large)"
    )

    # Azure AI Search Settings
    AZURE_SEARCH_ENDPOINT: str = Field(
        default="",
        description="Azure AI Search service endpoint URL"
    )
    AZURE_SEARCH_API_KEY: str = Field(
        default="",
        description="Azure AI Search Admin/Query API key"
    )
    AZURE_SEARCH_INDEX_NAME: str = Field(
        default="enterprise-knowledge-index",
        description="Name of the Azure AI Search index"
    )

    # Azure Blob Storage Settings
    AZURE_STORAGE_CONNECTION_STRING: str = Field(
        default="",
        description="Azure Storage account connection string"
    )
    AZURE_STORAGE_CONTAINER: str = Field(
        default="documents",
        description="Azure Storage blob container name"
    )

    # Observability
    APPLICATIONINSIGHTS_CONNECTION_STRING: Optional[str] = Field(
        default=None,
        description="Azure Application Insights connection string"
    )

    # Local Development & Testing flags
    MOCK_AZURE_SERVICES: bool = Field(
        default=True,
        description="If True, mock Azure services (useful when keys are missing or during unit tests)"
    )

    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("AZURE_OPENAI_ENDPOINT", "AZURE_SEARCH_ENDPOINT")
    @classmethod
    def validate_endpoints(cls, v: str) -> str:
        if v and not v.startswith("https://"):
            raise ValueError("Endpoint must start with 'https://'")
        return v

    @property
    def is_azure_configured(self) -> bool:
        """Helper to determine if all core Azure credentials are set."""
        return all([
            self.AZURE_OPENAI_ENDPOINT,
            self.AZURE_OPENAI_API_KEY,
            self.AZURE_OPENAI_CHAT_DEPLOYMENT,
            self.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
            self.AZURE_SEARCH_ENDPOINT,
            self.AZURE_SEARCH_API_KEY,
            self.AZURE_STORAGE_CONNECTION_STRING
        ])

settings = Settings()
