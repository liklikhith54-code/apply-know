import logging
import re
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class Chunker:
    """Configurable sliding-window chunker with sentence-boundary preservation."""

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        """Initialize chunker.

        Args:
            chunk_size: Maximum character count per chunk.
            chunk_overlap: Overlap character count between consecutive chunks.
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_document(self, doc_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Splits parsed document pages into metadata-enriched chunks.

        Args:
            doc_data: Parsed document dict containing:
                "document_name": str
                "pages": List[Dict[str, Any]] (each with page_number and text)
                "sections": List[Dict[str, Any]] (optional)

        Returns:
            List of chunks, each chunk is a Dict containing content and metadata.
        """
        chunks = []
        doc_name = doc_data.get("document_name", "unknown")
        pages = doc_data.get("pages", [])
        sections = doc_data.get("sections", [])

        chunk_idx = 0
        for page in pages:
            page_num = page.get("page_number", 1)
            page_text = page.get("text", "")
            
            # Identify active section name for this page content if available
            section_name = self._resolve_section_for_page(page_text, sections)

            # Split page text into sentences
            sentences = self._split_into_sentences(page_text)
            
            current_chunk_sentences = []
            current_len = 0

            for sentence in sentences:
                sent_len = len(sentence)
                if not sentence.strip():
                    continue

                if current_len + sent_len > self.chunk_size and current_chunk_sentences:
                    # Emit chunk
                    chunk_content = " ".join(current_chunk_sentences)
                    chunks.append(self._create_chunk_dict(
                        doc_name=doc_name,
                        content=chunk_content,
                        page_number=page_num,
                        section=section_name,
                        chunk_idx=chunk_idx
                    ))
                    chunk_idx += 1

                    # Re-initialize with overlap logic
                    # To overlap, keep sentences from the end of the previous list that fit within overlap limits
                    overlap_sentences = []
                    overlap_len = 0
                    for prev_sent in reversed(current_chunk_sentences):
                        if overlap_len + len(prev_sent) <= self.chunk_overlap:
                            overlap_sentences.insert(0, prev_sent)
                            overlap_len += len(prev_sent)
                        else:
                            break
                    current_chunk_sentences = overlap_sentences + [sentence]
                    current_len = overlap_len + sent_len
                else:
                    current_chunk_sentences.append(sentence)
                    current_len += sent_len + 1 # +1 for join space

            # Emit final chunk for this page
            if current_chunk_sentences:
                chunk_content = " ".join(current_chunk_sentences)
                chunks.append(self._create_chunk_dict(
                    doc_name=doc_name,
                    content=chunk_content,
                    page_number=page_num,
                    section=section_name,
                    chunk_idx=chunk_idx
                ))
                chunk_idx += 1

        logger.info(f"Generated {len(chunks)} chunks for document: {doc_name}")
        return chunks

    def _split_into_sentences(self, text: str) -> List[str]:
        """Simple regex-based sentence splitter."""
        # Split by periods, exclamation, and question marks followed by space or newline
        sentence_endings = re.compile(r'(?<=[.!?])\s+')
        sentences = sentence_endings.split(text)
        return [s.strip() for s in sentences if s.strip()]

    def _resolve_section_for_page(self, page_text: str, sections: List[Dict[str, Any]]) -> str:
        """Determines which section heading is most representative of this page text."""
        for sec in sections:
            name = sec.get("name", "General")
            if name != "General" and name in page_text:
                return name
        return "General"

    def _create_chunk_dict(self, doc_name: str, content: str, page_number: int, section: str, chunk_idx: int) -> Dict[str, Any]:
        # Formulate a stable unique ID for the chunk
        doc_clean_id = re.sub(r'[^a-zA-Z0-9]', '_', doc_name).lower()
        chunk_id = f"{doc_clean_id}_p{page_number}_c{chunk_idx}"
        return {
            "chunk_id": chunk_id,
            "document_id": doc_clean_id,
            "document_name": doc_name,
            "content": content,
            "page_number": page_number,
            "section": section,
            "source": f"{doc_name}#page={page_number}"
        }
