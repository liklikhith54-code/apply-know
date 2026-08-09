import logging
import sys
from app.ingestion.pipeline import IngestionPipeline

# Configure logger output formats
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

def main():
    logger.info("Executing Document Ingestion CLI script...")
    try:
        pipeline = IngestionPipeline()
        result = pipeline.run_ingestion()
        
        logger.info("Ingestion complete details:")
        logger.info(f" - Running in Mock Mode: {result['mock_mode']}")
        logger.info(f" - Processed Documents: {result['processed_files']}")
        logger.info(f" - Chunks Processed: {result['chunks_created']}")
        logger.info(f" - Embeddings Created: {result['embeddings_generated']}")
        logger.info(f" - Embeddings Size: {result['embedding_dimensions']}")
    except Exception as e:
        logger.error(f"Ingestion CLI task failed: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
