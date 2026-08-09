import pytest
from pydantic import ValidationError
from app.config import Settings

def test_settings_load_from_env(monkeypatch):
    """Test that settings load properly from custom environment variables."""
    monkeypatch.setenv("AZURE_OPENAI_ENDPOINT", "https://test-openai.azure.com")
    monkeypatch.setenv("AZURE_OPENAI_API_KEY", "test-key-1")
    monkeypatch.setenv("AZURE_SEARCH_ENDPOINT", "https://test-search.windows.net")
    monkeypatch.setenv("AZURE_SEARCH_API_KEY", "test-key-2")
    monkeypatch.setenv("AZURE_STORAGE_CONNECTION_STRING", "DefaultEndpointsProtocol=https;AccountName=test;")

    settings = Settings()
    assert settings.AZURE_OPENAI_ENDPOINT == "https://test-openai.azure.com"
    assert settings.AZURE_OPENAI_API_KEY == "test-key-1"
    assert settings.AZURE_SEARCH_ENDPOINT == "https://test-search.windows.net"
    assert settings.AZURE_SEARCH_API_KEY == "test-key-2"
    assert settings.AZURE_STORAGE_CONNECTION_STRING == "DefaultEndpointsProtocol=https;AccountName=test;"

def test_settings_endpoint_validation():
    """Verify that invalid endpoints raise ValidationErrors."""
    with pytest.raises(ValidationError):
        Settings(AZURE_OPENAI_ENDPOINT="http://insecure-openai.azure.com")

    with pytest.raises(ValidationError):
        Settings(AZURE_SEARCH_ENDPOINT="ftp://invalid-search.windows.net")

def test_is_azure_configured(monkeypatch):
    """Verify helper property is_azure_configured detects complete environments."""
    # Blank out env variables
    monkeypatch.setenv("AZURE_OPENAI_ENDPOINT", "")
    settings = Settings()
    assert settings.is_azure_configured is False

    # Fully configure
    monkeypatch.setenv("AZURE_OPENAI_ENDPOINT", "https://endpoint.azure.com")
    monkeypatch.setenv("AZURE_OPENAI_API_KEY", "key")
    monkeypatch.setenv("AZURE_OPENAI_CHAT_DEPLOYMENT", "chat")
    monkeypatch.setenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "embed")
    monkeypatch.setenv("AZURE_SEARCH_ENDPOINT", "https://search.windows.net")
    monkeypatch.setenv("AZURE_SEARCH_API_KEY", "skey")
    monkeypatch.setenv("AZURE_STORAGE_CONNECTION_STRING", "conn")
    
    settings = Settings()
    assert settings.is_azure_configured is True
