import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class Chunker:
    """Configurable sliding-window document chunker."""

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        """Initialise chunker settings.

        Args:
            chunk_size: Maximum characters per chunk block.
            chunk_overlap: Overlapping characters count.
        """
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be strictly less than chunk_size")
        
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_document_segments(self, segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Splits parsed segments into smaller chunks with metadata values.

        Args:
            segments: List of document segments parsed from parser.py.

        Returns:
            List of chunk dictionaries containing text and metadata attributes.
        """
        chunks = []
        
        for segment in segments:
            text = segment.get("text", "")
            doc_id = segment.get("document_id")
            doc_name = segment.get("document_name")
            page_num = segment.get("page_number", 1)
            file_type = segment.get("file_type", "txt")
            source = segment.get("source")

            if not text.strip():
                continue

            # Sliding window characters splitting
            start = 0
            chunk_idx = 0
            text_len = len(text)

            while start < text_len:
                end = min(start + self.chunk_size, text_len)
                chunk_content = text[start:end]

                chunk_id = f"{doc_id}_p{page_num}_c{chunk_idx}"
                chunks.append({
                    "document_id": doc_id,
                    "document_name": doc_name,
                    "chunk_id": chunk_id,
                    "content": chunk_content,
                    "page_number": page_num,
                    "file_type": file_type,
                    "source": source,
                    "chunk_index": chunk_idx
                })

                chunk_idx += 1
                if end == text_len:
                    break
                # Advance starting pointer by step size (size - overlap)
                start += (self.chunk_size - self.chunk_overlap)

        logger.info(f"Generated {len(chunks)} chunks from {len(segments)} segments.")
        return chunks
