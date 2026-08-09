import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from app.config import settings
from app.ingestion.storage import StorageManager
from app.ingestion.embeddings import EmbeddingGenerator
from app.ingestion.pipeline import IngestionPipeline

def test_storage_mock_mode(tmp_path):
    """Verify that storage manager loads local files from documents directory in mock mode."""
    # Write a test document locally
    doc_dir = tmp_path / "data" / "documents"
    doc_dir.mkdir(parents=True, exist_ok=True)
    
    test_file = doc_dir / "test_doc_policy.txt"
    test_file.write_text("Company standard leave allocation rules details.", encoding="utf-8")

    # Force settings local directories to point to tmp_path
    with patch.object(settings, "ROOT_DIR", str(tmp_path)), \
         patch.object(settings, "AZURE_STORAGE_CONNECTION_STRING", ""):
        
        storage = StorageManager()
        assert storage.is_mock_mode is True
        
        files = storage.get_document_files()
        assert len(files) == 1
        assert files[0].name == "test_doc_policy.txt"

def test_embedding_generator_mock_dimensions():
    """Verify that mock embedding generator outputs exact dimensions configured."""
    with patch.object(settings, "AZURE_OPENAI_EMBEDDING_DIMENSIONS", 768), \
         patch.object(settings, "AZURE_OPENAI_ENDPOINT", ""):
        
        generator = EmbeddingGenerator()
        assert generator.is_mock_mode is True
        assert generator.dimensions == 768
        
        vector = generator.generate_embedding("Test content")
        assert len(vector) == 768
        assert all(isinstance(val, float) for val in vector)

def test_deterministic_mock_embeddings():
    """Verify that mock embedding values are identical for identical inputs (repeatable)."""
    generator = EmbeddingGenerator()
    
    vec1 = generator.generate_embedding("Same text block content")
    vec2 = generator.generate_embedding("Same text block content")
    vec3 = generator.generate_embedding("Different text block content")
    
    assert vec1 == vec2
    assert vec1 != vec3

def test_embedding_dimension_mismatch_validation():
    """Verify ValueError is raised if embedding lengths mismatch settings config."""
    generator = EmbeddingGenerator()
    
    # Force mock vector return of size 100, but configure dimension as 1536
    with patch.object(generator, "_generate_deterministic_mock", return_value=[0.1] * 100):
        with pytest.raises(ValueError, match="Embedding vector dimension mismatch"):
            generator.generate_embedding("Test input block")

def test_complete_ingestion_pipeline_mock(tmp_path):
    """Verify the combined sequence of files loading, parsing, chunking, metadata and embeddings."""
    doc_dir = tmp_path / "data" / "documents"
    doc_dir.mkdir(parents=True, exist_ok=True)
    
    test_file = doc_dir / "HR_Leave_2026.txt"
    test_file.write_text("SECTION 1: ANNUAL LEAVE\nEffective Date: 2026-08-08\nVersion: 2.1\nAllocations details.", encoding="utf-8")

    with patch.object(settings, "ROOT_DIR", str(tmp_path)), \
         patch.object(settings, "AZURE_STORAGE_CONNECTION_STRING", ""), \
         patch.object(settings, "AZURE_OPENAI_ENDPOINT", ""), \
         patch.object(settings, "AZURE_OPENAI_EMBEDDING_DIMENSIONS", 512):
        
        pipeline = IngestionPipeline()
        result = pipeline.run_ingestion()
        
        assert result["mock_mode"] is True
        assert "HR_Leave_2026.txt" in result["processed_files"]
        assert result["chunks_created"] > 0
        assert result["embedding_dimensions"] == 512
        
        # Test first chunk schema details
        chunk = result["chunks"][0]
        assert chunk["document_name"] == "HR_Leave_2026.txt"
        assert chunk["version"] == "2.1"
        assert chunk["effective_date"] == "2026-08-08"
        assert chunk["department"] == "HR"
        assert len(chunk["embedding"]) == 512
