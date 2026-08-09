import pytest
from pathlib import Path
from pydantic import ValidationError
from app.config import Settings
from app.ingestion.parser import DocumentParser
from app.ingestion.chunker import Chunker
from app.ingestion.metadata import MetadataManager

def test_settings_validation():
    """Verify endpoint validation formats constraints."""
    # Invalid endpoint format should throw ValidationError
    with pytest.raises(ValidationError):
        Settings(AZURE_OPENAI_ENDPOINT="http://insecure-openai-endpoint.com")
        
    with pytest.raises(ValidationError):
        Settings(AZURE_SEARCH_ENDPOINT="ftp://invalid-endpoint.com")

def test_txt_parser(tmp_path):
    """Verify TXT parsing returns structured document fields."""
    p = tmp_path / "test_doc.txt"
    p.write_text("SECTION 1: NDA RULES\nThis is confidential legal text.", encoding="utf-8")
    
    parser = DocumentParser()
    parsed_segments = parser.parse(p)
    
    assert len(parsed_segments) == 1
    segment = parsed_segments[0]
    assert segment["document_name"] == "test_doc.txt"
    assert "NDA RULES" in segment["text"]
    assert segment["file_type"] == "txt"
    assert segment["page_number"] == 1
    assert "document_id" in segment

def test_chunking_sliding_windows():
    """Assert chunker splits segments based on sizes and overlaps correctly."""
    segments = [{
        "document_id": "test_id",
        "document_name": "test_doc.txt",
        "text": "This is a sentence. And here is another sentence for chunking.",
        "page_number": 1,
        "file_type": "txt",
        "source": "test_doc.txt#page=1"
    }]
    
    # Large size
    chunker = Chunker(chunk_size=100, chunk_overlap=20)
    chunks = chunker.chunk_document_segments(segments)
    assert len(chunks) == 1
    assert chunks[0]["chunk_index"] == 0
    assert chunks[0]["document_id"] == "test_id"

    # Small size triggering splits
    small_chunker = Chunker(chunk_size=30, chunk_overlap=10)
    chunks_split = small_chunker.chunk_document_segments(segments)
    assert len(chunks_split) > 1
    for chunk in chunks_split:
        assert "chunk_id" in chunk
        assert "content" in chunk

def test_metadata_enrichment():
    """Verify metadata mappings and heuristic evaluations."""
    chunk = {
        "document_id": "doc_123",
        "document_name": "HR_Leave_Policy_2026.pdf",
        "chunk_id": "doc_123_p1_c0",
        "content": "SECTION 2: VACATION LEAVE\nVersion: 2.4\nEffective Date: 2026-08-08\nAnnual leave allocations rule.",
        "page_number": 1,
        "source": "HR_Leave_Policy_2026.pdf#page=1"
    }

    manager = MetadataManager()
    enriched = manager.enrich_chunk_metadata(chunk)

    assert enriched["version"] == "2.4"
    assert enriched["effective_date"] == "2026-08-08"
    assert enriched["department"] == "HR"
    assert enriched["document_type"] == "Policy"
    assert enriched["section"] == "SECTION 2: VACATION LEAVE"
    assert "HR" in enriched["access_groups"]
