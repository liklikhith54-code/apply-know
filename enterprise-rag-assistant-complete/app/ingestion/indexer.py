import logging
import json
import os
from typing import List, Dict, Any
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
    VectorSearchAlgorithmKind,
    VectorSearchAlgorithmMetric,
    SemanticConfiguration,
    SemanticField,
    SemanticPrioritizedFields,
    SemanticSearch
)
from app.config import settings, ROOT_DIR

logger = logging.getLogger(__name__)

MOCK_INDEX_FILE = os.path.join(ROOT_DIR, "data", "mock_index.json")

class Indexer:
    """Configures and writes chunks to the Azure AI Search Index (or a local JSON mock index)."""

    def __init__(self):
        self.mock_mode = settings.MOCK_AZURE_SERVICES or not settings.is_azure_configured
        
        if not self.mock_mode:
            try:
                self.credential = AzureKeyCredential(settings.AZURE_SEARCH_API_KEY)
                self.index_client = SearchIndexClient(
                    endpoint=settings.AZURE_SEARCH_ENDPOINT,
                    credential=self.credential
                )
                self.search_client = SearchClient(
                    endpoint=settings.AZURE_SEARCH_ENDPOINT,
                    index_name=settings.AZURE_SEARCH_INDEX_NAME,
                    credential=self.credential
                )
            except Exception as e:
                logger.warning(f"Failed to initialize Azure AI Search client, falling back to mock: {e}")
                self.mock_mode = True

    def create_or_update_index(self):
        """Creates the Azure AI Search Index (hybrid & semantic config) or initializes mock database."""
        if self.mock_mode:
            logger.info(f"Initializing local mock index file at: {MOCK_INDEX_FILE}")
            os.makedirs(os.path.dirname(MOCK_INDEX_FILE), exist_ok=True)
            if not os.path.exists(MOCK_INDEX_FILE):
                with open(MOCK_INDEX_FILE, "w", encoding="utf-8") as f:
                    json.dump([], f)
            return True

        logger.info(f"Connecting to Azure AI Search to create/update index '{settings.AZURE_SEARCH_INDEX_NAME}'...")
        
        # Configure Vector Search algorithm (HNSW) and profile
        vector_search = VectorSearch(
            algorithms=[
                HnswAlgorithmConfiguration(
                    name="hnsw-config",
                    kind=VectorSearchAlgorithmKind.HNSW,
                    parameters={
                        "metric": VectorSearchAlgorithmMetric.COSINE,
                        "m": 4,
                        "efConstruction": 400,
                        "efSearch": 500
                    }
                )
            ],
            profiles=[
                VectorSearchProfile(
                    name="vector-profile",
                    algorithm_configuration_name="hnsw-config"
                )
            ]
        )

        # Configure Semantic Ranker configuration
        semantic_search = SemanticSearch(
            configurations=[
                SemanticConfiguration(
                    name="semantic-config",
                    prioritized_fields=SemanticPrioritizedFields(
                        title_field=SemanticField(field_name="document_name"),
                        content_fields=[SemanticField(field_name="content")],
                        keywords_fields=[SemanticField(field_name="section")]
                    )
                )
            ]
        )

        # Define Schema Fields
        fields = [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True, filterable=True),
            SimpleField(name="chunk_id", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="document_id", type=SearchFieldDataType.String, filterable=True),
            SearchableField(name="document_name", type=SearchFieldDataType.String, filterable=True, sortable=True),
            SearchableField(name="content", type=SearchFieldDataType.String, analyzer_name="en.microsoft"),
            SearchField(
                name="content_vector",
                type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                vector_search_dimensions=1536, # Standard for OpenAI embeddings text-embedding-ada-002 and mocked
                vector_search_profile_name="vector-profile"
            ),
            SimpleField(name="page_number", type=SearchFieldDataType.Int32, filterable=True, sortable=True),
            SearchableField(name="section", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="department", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="document_type", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="version", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="effective_date", type=SearchFieldDataType.String, filterable=True, sortable=True),
            SimpleField(name="access_groups", type=SearchFieldDataType.Collection(SearchFieldDataType.String), filterable=True),
            SimpleField(name="source", type=SearchFieldDataType.String, filterable=True)
        ]

        index = SearchIndex(
            name=settings.AZURE_SEARCH_INDEX_NAME,
            fields=fields,
            vector_search=vector_search,
            semantic_search=semantic_search
        )

        try:
            self.index_client.create_or_update_index(index)
            logger.info(f"Index '{settings.AZURE_SEARCH_INDEX_NAME}' created/updated successfully.")
            return True
        except Exception as e:
            logger.error(f"Error creating index in Azure: {e}", exc_info=True)
            raise

    async def index_chunks(self, chunks: List[Dict[str, Any]]):
        """Indexes metadata-enriched chunks into Azure Search (or local mock index)."""
        if not chunks:
            return True

        if self.mock_mode:
            logger.info(f"Writing {len(chunks)} chunks to local mock index...")
            # Load existing
            if os.path.exists(MOCK_INDEX_FILE):
                try:
                    with open(MOCK_INDEX_FILE, "r", encoding="utf-8") as f:
                        data = json.load(f)
                except Exception:
                    data = []
            else:
                data = []

            # Update/append (key on 'id' or 'chunk_id')
            existing_ids = {item["id"] for item in data}
            for chunk in chunks:
                # Standardize id field
                chunk_to_save = dict(chunk)
                if "id" not in chunk_to_save:
                    chunk_to_save["id"] = chunk_to_save.get("chunk_id")
                
                # Check for duplicates and overwrite or append
                if chunk_to_save["id"] in existing_ids:
                    data = [item if item["id"] != chunk_to_save["id"] else chunk_to_save for item in data]
                else:
                    data.append(chunk_to_save)
                    existing_ids.add(chunk_to_save["id"])

            with open(MOCK_INDEX_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            logger.info(f"Local mock index now has {len(data)} total chunks.")
            return True

        # Azure Indexing upload
        # Upload batch
        logger.info(f"Uploading {len(chunks)} chunks to Azure Search index...")
        batch_chunks = []
        for chunk in chunks:
            item = dict(chunk)
            if "id" not in item:
                item["id"] = item.get("chunk_id")
            batch_chunks.append(item)

        try:
            results = self.search_client.upload_documents(documents=batch_chunks)
            failed_count = sum(1 for r in results if not r.succeeded)
            if failed_count > 0:
                logger.warning(f"Failed to upload {failed_count} out of {len(chunks)} chunks to Azure Search.")
            else:
                logger.info(f"Uploaded all {len(chunks)} chunks successfully.")
            return True
        except Exception as e:
            logger.error(f"Error uploading chunks to Azure AI Search: {e}", exc_info=True)
            raise
