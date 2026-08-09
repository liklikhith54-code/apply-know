import logging
from app.ingestion.indexer import Indexer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

def main():
    logger.info("Initializing Azure AI Search (or local Mock database)...")
    indexer = Indexer()
    success = indexer.create_or_update_index()
    if success:
        logger.info("Index initialization completed successfully.")
    else:
        logger.error("Index initialization failed.")

if __name__ == "__main__":
    main()
