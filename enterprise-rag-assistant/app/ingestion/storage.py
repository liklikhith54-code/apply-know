import os
import logging
from pathlib import Path
from typing import List
from azure.storage.blob import BlobServiceClient
from app.config import settings

logger = logging.getLogger(__name__)

class StorageManager:
    """Manages document retrieval from Azure Blob Storage with fallback mock/local mode."""

    def __init__(self):
        self.connection_string = settings.AZURE_STORAGE_CONNECTION_STRING
        self.container_name = settings.AZURE_STORAGE_CONTAINER
        self.local_doc_dir = Path(settings.ROOT_DIR) / "data" / "documents"
        
        # Ensure local doc folder exists for mock downloads/local access
        self.local_doc_dir.mkdir(parents=True, exist_ok=True)

        # Check if real connection is possible
        # Since standard connection strings contain AccountName and AccountKey, let's check for "youraccount" placeholder or empty.
        self.is_mock_mode = (
            not self.connection_string or 
            "youraccount" in self.connection_string or 
            "mockstorage" in self.connection_string
        )

        if self.is_mock_mode:
            logger.info("=== STORAGE MANAGER: MOCK MODE ACTIVE ===")
            logger.info(f"Reading documents locally from: {self.local_doc_dir.absolute()}")
        else:
            logger.info("STORAGE MANAGER: Connecting to Azure Blob Storage...")
            try:
                self.blob_service_client = BlobServiceClient.from_connection_string(self.connection_string)
                self.container_client = self.blob_service_client.get_container_client(self.container_name)
            except Exception as e:
                logger.error(f"Failed to connect to Azure Blob Storage: {e}. Switching to mock/local mode.")
                self.is_mock_mode = True

    def get_document_files(self) -> List[Path]:
        """Downloads/retrieves files to ingest.

        In Mock Mode: Reads files locally from data/documents/.
        In Azure Mode: Downloads all blobs from the container and saves them locally.
        """
        downloaded_paths = []

        if self.is_mock_mode:
            logger.info("=== STORAGE MANAGER: MOCK MODE ACTIVE ===")
            # Look up local directory
            for entry in self.local_doc_dir.iterdir():
                if entry.is_file() and entry.suffix.lower() in (".pdf", ".docx", ".txt", ".md"):
                    if entry.name != ".gitkeep":
                        downloaded_paths.append(entry)
            logger.info(f"Found {len(downloaded_paths)} local document(s) in {self.local_doc_dir.name}")
        else:
            logger.info(f"Azure Blob Storage: Scanning container '{self.container_name}'...")
            try:
                blobs = self.container_client.list_blobs()
                for blob in blobs:
                    blob_client = self.container_client.get_blob_client(blob.name)
                    target_path = self.local_doc_dir / blob.name
                    
                    # Make parent folders if blob name has folder path structure
                    target_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    logger.info(f"Downloading blob '{blob.name}' to '{target_path.name}'...")
                    with open(target_path, "wb") as download_file:
                        download_file.write(blob_client.download_blob().readall())
                    downloaded_paths.append(target_path)
            except Exception as e:
                logger.error(f"Error downloading blobs: {e}. Falling back to local files.")
                # Fallback to local
                for entry in self.local_doc_dir.iterdir():
                    if entry.is_file() and entry.suffix.lower() in (".pdf", ".docx", ".txt", ".md"):
                        if entry.name != ".gitkeep":
                            downloaded_paths.append(entry)

        return downloaded_paths
