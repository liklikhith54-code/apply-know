import pytest
from pathlib import Path
from app.ingestion.parser import DocumentParser
from app.ingestion.chunker import Chunker
from app.ingestion.metadata import MetadataExtractor

def test_parser_txt(tmp_path):
    """Test text document parsing."""
    p = tmp_path / "test_policy.txt"
    p.write_text("SECTION 1: LEAVE POLICY\nThis is an employee leave policy document.\nIt governs all HR processes.", encoding="utf-8")
    
    parser = DocumentParser()
    parsed_data = parser.parse(p)
    
    assert parsed_data["document_name"] == "test_policy.txt"
    assert "LEAVE POLICY" in parsed_data["text"]
    assert len(parsed_data["pages"]) == 1
    assert parsed_data["pages"][0]["page_number"] == 1
    assert len(parsed_data["sections"]) > 0

def test_metadata_extractor():
    """Verify version, date, and access groups are correctly extracted."""
    text = "Leave policy document.\nVersion: 2.1\nEffective Date: 2026-08-08\nDepartment: HR Group"
    extractor = MetadataExtractor()
    meta = extractor.extract_metadata(text, "leave_policy_v2.txt")
    
    assert meta["version"] == "2.1"
    assert "2026-08-08" in meta["effective_date"]
    assert meta["department"] == "HR"
    assert "HR" in meta["access_groups"]
    assert meta["document_type"] == "Policy"

def test_chunker_splitting():
    """Test chunker splits text within boundaries and correctly propagates metadata."""
    doc_data = {
        "document_name": "leave_policy.txt",
        "pages": [
            {
                "page_number": 1,
                "text": "This is paragraph one. It is short. Here is some other sentence. This is the second paragraph."
            }
        ],
        "sections": [
            {"name": "Leave Policy", "text": "This is paragraph one."}
        ]
    }
    
    # Large size to keep all in 1 chunk
    chunker = Chunker(chunk_size=1000, chunk_overlap=10)
    chunks = chunker.chunk_document(doc_data)
    assert len(chunks) == 1
    assert chunks[0]["page_number"] == 1
    assert "leave_policy.txt" in chunks[0]["source"]

    # Small size to trigger multiple chunks
    small_chunker = Chunker(chunk_size=40, chunk_overlap=10)
    chunks = small_chunker.chunk_document(doc_data)
    assert len(chunks) > 1
    for chunk in chunks:
        assert "chunk_id" in chunk
        assert "content" in chunk
        assert len(chunk["content"]) > 0
