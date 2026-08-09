# Enterprise Knowledge Assistant (RAG)

A production-ready RAG (Retrieval-Augmented Generation) Enterprise Knowledge Assistant built with Python, FastAPI, and Azure services (Azure OpenAI, Azure AI Search, Azure Blob Storage, and Microsoft Entra ID).

---

## 1. Project Overview & Problem Statement
Large enterprise organizations own thousands of documents (policies, NDA contracts, guidelines, manuals) spread across departments. Employees struggle to find exact information or compare rules between different policies. Simple search engines lack reasoning capabilities, while raw LLMs lack specific organizational context and are prone to hallucinations.

This project implements a secure, scalable, and audit-friendly Enterprise RAG Assistant. It retrieves authoritative evidence from authorized documents to answer questions with verifiable inline citations.

---

## 2. Architecture & Design Trade-offs
The architecture separates document ingestion from API querying to enable low-latency searches.

### Key Technical Decisions:
- **FastAPI Backend**: Provides an asynchronous, low-overhead REST API.
- **Azure AI Search**: Chosen for its native hybrid queries, integration of Bing Semantic Rankers, and simple OData filtering schemas for Access Control Lists (ACLs).
- **Hybrid Retrieval**: Combines BM25 keyword matching (crucial for exact matches like "Section 4" or product SKUs) with dense vector search (semantic mapping), fused using Reciprocal Rank Fusion (RRF).
- **Metadata Versioning**: Rejects older policies (e.g. 2024 versions) in favor of the latest active policies (e.g. 2026 versions) by parsing version fields and effective dates pre-generation.

---

## 3. Technology Stack
- **Backend Framework**: FastAPI, Uvicorn
- **Settings Management**: Pydantic v2 Settings
- **Azure Integration**: `azure-search-documents`, `azure-storage-blob`, `azure-identity`
- **Embedding & Chat Models**: OpenAI SDK, Azure OpenAI
- **Document Extractors**: `pypdf`, `docx2txt`
- **Testing**: `pytest`, `pytest-asyncio`
- **Analysis Tools**: `numpy`, `tiktoken`

---

## 4. Repository Structure
```text
enterprise-rag-assistant/
├── app/
│   ├── api/             # API routes (/chat, /search, /ingest)
│   ├── ingestion/       # Parser, Chunker, Metadata, Embeddings, Indexer
│   ├── models/          # Request & Response schemas
│   ├── rag/             # Query rewriter, Retriever, Confidence, Generator
│   ├── services/        # Azure API client wrappers
│   ├── config.py        # Environment variables validation loader
│   └── main.py          # FastAPI application & Root Playground UI
├── docs/                # Architecture, Failure Logs, troubleshooting guides
├── evaluation/          # Evaluation dataset & comparison script
├── tests/               # Unit and integration tests (100% mocked capabilities)
├── Dockerfile           # Multi-stage container setup
├── requirements.txt     # Locked dependencies
├── .env.example         # Template configuration envs
└── README.md            # Documentation manual
```

---

## 5. Local Setup & Verification

### Prerequisites
- Python 3.10 or higher
- Node (optional, for Docker testing)

### Installation
1. Clone the repository and navigate to the project directory:
   ```bash
   cd enterprise-rag-assistant
   ```
2. Set up a virtual environment and install dependencies:
   ```bash
   python -m venv .venv
   .venv\Scripts\activate   # On Linux/macOS: source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. Initialize the configuration. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
4. Run index setup script (this initializes the local mock index database if MOCK_AZURE_SERVICES=True):
   ```bash
   $env:PYTHONPATH="."; python scripts/create_index.py
   ```
5. Run the unit tests suite to verify all component operations:
   ```bash
   pytest
   ```

---

## 6. Running the API and Playground
Start the development FastAPI server locally:
```bash
$env:PYTHONPATH="."; uvicorn app.main:app --reload --port 8000
```
Open your browser and navigate to:
- **Interactive RAG Playground**: `http://localhost:8000/`
- **FastAPI OpenAPI Swagger Docs**: `http://localhost:8000/docs`

---

## 7. RAG Pipeline Operational Flows

### A. Document Ingestion Flow (`POST /api/v1/ingest`)
1. **Parser**: Extracts structured text pages and raw headers from uploaded PDF, Word, or TXT files.
2. **Metadata Extractor**: Auto-detects policy version numbers, effective dates, document type, and managing department.
3. **Sentence-Aware Chunker**: Splits document text into sliding chunks (1000 characters, 200 overlap) without cutting mid-sentence.
4. **Embeddings Manager**: Batches text chunks and creates vectors via Azure OpenAI `text-embedding-3-large`.
5. **Indexer**: Uploads unified vector-metadata payloads to the search index database.

### B. Chat Querying Flow (`POST /api/v1/chat`)
1. **Query Rewriter**: Reformulates conversational context history (e.g. "What about Standard?") into a standalone search query.
2. **Security Pre-Filter**: Automatically builds OData expressions filtering documents based on user access groups.
3. **Retriever**: Executes hybrid vector/keyword search, applies version-control checks (retains latest active document versions), and applies semantic boosts.
4. **Confidence Scorer**: Performs word overlap analysis. If similarity is low or search matches are off-topic, blocks LLM processing.
5. **Grounded Generator**: Prompts Azure OpenAI using strict system guidelines, returning a grounded answer with inline citations.

---

## 8. Security & Entra ID Integration
Access control validation occurs **before** data is compiled into the LLM context.
- **Entra ID Production Design**: In production, configure FastAPI to authorize users using Azure Active Directory (Microsoft Entra ID) JWT tokens. Extract user group claims (like `groups`) directly from the token on each API call.
- **Metadata Filtering**: Ensure the search index maps access permissions (`access_groups` array). Pass claims as index filter criteria to block access at the database level.

---

## 9. Evaluation & Comparison Benchmarks
Run the evaluation test harness comparing the vector-only Baseline RAG vs the Improved RAG pipeline:
```bash
$env:PYTHONPATH="."; python evaluation/evaluate.py
```
This evaluates the pipeline against approximately 30 questions defined in `evaluation/dataset.json` and outputs comparison tables to `evaluation/results/comparison.md`.

### Evaluation Summary Table:
- **Retrieval Hit@1**: Baseline **26.67%** | Improved **60.00%** (*+33.33%*)
- **Mean Reciprocal Rank (MRR)**: Baseline **0.4456** | Improved **0.6722** (*+0.2267*)
- **Answer Correctness**: Baseline **5.39%** | Improved **17.23%** (*+11.84%*)
- **Hallucination Rate**: Baseline **100.00%** | Improved **25.00%** (*-75.00%*)
- **Correct Negative Rate (Unanswerable)**: Baseline **0.00%** | Improved **75.00%** (*+75.00%*)

---

## 10. Cost Optimization and Scaling Strategy
- **Cost Minimization**: Apply semantic caching to query endpoints. Tune RAG parameters so that highly confident retrieves utilize fewer chunks, saving input token costs.
- **Scaling from 10k to 5M docs**:
  1. Offload Ingestion parsing to event-triggered serverless Azure Functions.
  2. Implement Azure Blob Storage change-tracking indexers.
  3. Deploy FastAPI API instances inside Azure Container Apps (ACA) using autoscalers.
