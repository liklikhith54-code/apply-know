import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_ingest():
    """Main CLI ingestion trigger."""
    logger.info("Starting ingestion workflow (CLI)...")

if __name__ == "__main__":
    run_ingest()
