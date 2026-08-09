import logging
from pathlib import Path
from typing import Dict, Any, List
from app.ingestion.storage import StorageManager
from app.ingestion.parser import DocumentParser
from app.ingestion.chunker import Chunker
from app.ingestion.metadata import MetadataManager
from app.ingestion.embeddings import EmbeddingGenerator
from app.config import settings

logger = logging.getLogger(__name__)

class IngestionPipeline:
    """Co-ordinates raw document retrievals, parsing, chunking, metadata enrichment, and vector embedding generations."""

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.storage_manager = StorageManager()
        self.parser = DocumentParser()
        self.chunker = Chunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        self.metadata_manager = MetadataManager()
        self.embedding_generator = EmbeddingGenerator()

    def run_ingestion(self) -> Dict[str, Any]:
        """Executes full document ingestion process flow.

        Returns:
            Dictionary containing:
                "mock_mode": bool
                "processed_files": list of file names
                "chunks_created": int
                "embeddings_generated": int
                "embedding_dimensions": int
                "chunks": list of enriched chunk objects with "embedding" arrays
        """
        logger.info("Starting Document Ingestion Pipeline...")
        
        # 1. Fetch documents
        file_paths = self.storage_manager.get_document_files()
        processed_files = [path.name for path in file_paths]
        
        all_chunks = []
        
        # 2. Process files
        for path in file_paths:
            try:
                segments = self.parser.parse(path)
                chunks = self.chunker.chunk_document_segments(segments)
                
                # Fetch full text for global metadata parsing checks
                full_text = "\n".join([seg.get("text", "") for seg in segments])
                
                for chunk in chunks:
                    # 3. Enrich chunk metadata
                    enriched = self.metadata_manager.enrich_chunk_metadata(chunk, full_text=full_text)
                    
                    # 4. Generate embeddings
                    embedding = self.embedding_generator.generate_embedding(enriched["content"])
                    enriched["embedding"] = embedding
                    
                    all_chunks.append(enriched)
            except Exception as e:
                logger.error(f"Failed to process file '{path.name}': {e}", exc_info=True)

        import json
        # Save chunks to mock index for local retrieval (RAG) compatibility
        mock_index_path = Path(settings.ROOT_DIR) / "data" / "mock_index.json"
        mock_index_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            for chunk in all_chunks:
                chunk["id"] = chunk.get("chunk_id")
                chunk["content_vector"] = chunk.get("embedding", [])
            with open(mock_index_path, "w", encoding="utf-8") as f:
                json.dump(all_chunks, f, indent=2, ensure_ascii=False)
            logger.info(f"Saved {len(all_chunks)} chunks to mock index: {mock_index_path}")
        except Exception as e:
            logger.error(f"Failed to save mock index file: {e}")

        is_mock = self.storage_manager.is_mock_mode or self.embedding_generator.is_mock_mode

        logger.info(
            f"Ingestion completed. Files: {len(processed_files)}, Chunks: {len(all_chunks)}, "
            f"Embeddings: {len(all_chunks)} (Dim: {self.embedding_generator.dimensions})"
        )

        return {
            "mock_mode": is_mock,
            "processed_files": processed_files,
            "chunks_created": len(all_chunks),
            "embeddings_generated": len(all_chunks),
            "embedding_dimensions": self.embedding_generator.dimensions,
            "chunks": all_chunks
        }
