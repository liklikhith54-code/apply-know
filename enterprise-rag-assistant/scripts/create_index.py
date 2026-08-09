import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    logger.info("CLI create index script trigger.")

if __name__ == "__main__":
    main()
