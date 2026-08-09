import os
from typing import Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE_PATH = os.path.join(ROOT_DIR, ".env")

class Settings(BaseSettings):
    ROOT_DIR: str = Field(default=ROOT_DIR, description="Root directory of the project")
    MOCK_AZURE_SERVICES: bool = Field(default=True, description="Enable local simulated services mock mode")
    # Azure OpenAI Settings
    AZURE_OPENAI_ENDPOINT: str = Field(default="", description="Azure OpenAI Endpoint")
    AZURE_OPENAI_API_KEY: str = Field(default="", description="Azure OpenAI API Key")
    AZURE_OPENAI_API_VERSION: str = Field(default="2024-02-15-preview", description="Azure OpenAI API Version")
    AZURE_OPENAI_CHAT_DEPLOYMENT: str = Field(default="", description="Azure OpenAI Chat Model Deployment Name")
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT: str = Field(default="", description="Azure OpenAI Embedding Model Deployment Name")
    AZURE_OPENAI_EMBEDDING_DIMENSIONS: int = Field(default=1536, description="Azure OpenAI Embedding Vector Dimensions")

    # Azure AI Search Settings
    AZURE_SEARCH_ENDPOINT: str = Field(default="", description="Azure AI Search Endpoint")
    AZURE_SEARCH_API_KEY: str = Field(default="", description="Azure AI Search Admin/Query Key")
    AZURE_SEARCH_INDEX_NAME: str = Field(default="enterprise-knowledge-index", description="Azure Search Index Name")

    # Azure Storage Settings
    AZURE_STORAGE_CONNECTION_STRING: str = Field(default="", description="Azure Storage Account Connection String")
    AZURE_STORAGE_CONTAINER: str = Field(default="documents", description="Azure Storage Container Name")

    # Observability Settings
    APPLICATIONINSIGHTS_CONNECTION_STRING: Optional[str] = Field(default=None, description="App Insights Connection String")

    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH,
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("AZURE_OPENAI_ENDPOINT", "AZURE_SEARCH_ENDPOINT")
    @classmethod
    def validate_endpoints(cls, v: str) -> str:
        if v and not v.startswith("https://"):
            raise ValueError("Endpoint URL must begin with secure 'https://'")
        return v
    # Application Insights Settings
    APPLICATIONINSIGHTS_CONNECTION_STRING: Optional[str] = Field(default=None, description="Azure Application Insights connection string")
    @property
    def is_azure_configured(self) -> bool:
        """Determines if all core credentials for connecting to Azure are defined."""
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
