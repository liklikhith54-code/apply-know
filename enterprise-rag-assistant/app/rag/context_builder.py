import logging

logger = logging.getLogger(__name__)

class ContextBuilder:
    """Assembles retrieved chunks into a prompt context block, including citations."""
    def __init__(self):
        pass

    def build(self, chunks: list) -> str:
        """Format chunks into context text with identifiers."""
        logger.info(f"Building context from {len(chunks)} chunks")
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            name = chunk.get("document_name", "Unknown")
            page = chunk.get("page_number", "")
            sec = chunk.get("section", "")
            cid = chunk.get("chunk_id", i)
            content = chunk.get("content", "")
            header = f"[Source {i}] {name} - Page {page} - Section {sec} (ID: {cid})"
            context_parts.append(f"{header}\n{content}\n")
        return "\n".join(context_parts)
