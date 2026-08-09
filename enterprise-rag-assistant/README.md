# RAG-based Enterprise Knowledge Assistant

## Project Purpose
The goal is to build an enterprise knowledge assistant chatbot that answers user questions using the Microsoft Azure AI stack.

## Current Phase
* **Step 1**: Project Setup and Document Ingestion Preparation. Focuses on directory structure, configuration settings management, document parser interface, chunking module, metadata scheme, and unit testing.

## Project Structure
```text
enterprise-rag-assistant/
├── app/
│   ├── api/             # Routes endpoints
│   ├── ingestion/       # Document processing pipeline (parser, chunker, metadata)
│   ├── models/          # Data schemas
│   ├── rag/             # Retrieval and generation pipeline
│   ├── config.py        # Settings validation configuration loader
│   └── main.py          # FastAPI application entrypoint
├── data/
│   └── documents/       # Local target documents storage
├── docs/                # Architecture and design logs
├── evaluation/          # Evaluation metrics datasets
├── scripts/             # CLI triggers (ingestion, index)
├── tests/               # pytest suites
├── .env.example         # App environment variables structure
├── .gitignore           # Ignored files list
├── requirements.txt     # Python requirements list
├── Dockerfile           # App Docker image config
└── README.md            # Manual
```

## How to Create the Virtual Environment
Navigate to the project root and create a virtual environment using python:
```bash
cd enterprise-rag-assistant
python -m venv .venv
```
Activate it:
- **Windows**: `.venv\Scripts\activate`
- **Linux/macOS**: `source .venv/bin/activate`

## How to Install Requirements
```bash
pip install -r requirements.txt
```

## How to Run FastAPI
```bash
python -m uvicorn app.main:app --reload --port 8000
```

## How to Test `/health`
Run the app locally and perform a curl request or navigate in your web browser:
```bash
curl http://localhost:8000/health
```
Expected output:
```json
{
    "status": "healthy",
    "service": "enterprise-rag-assistant"
}
```

# Architecture & Problem Solving
- [Architecture Log](file:///c:/Users/Likhith/OneDrive/Desktop/Coding/maps/enterprise-rag-assistant/docs/architecture.md)
- [Failure Analysis](file:///c:/Users/Likhith/OneDrive/Desktop/Coding/maps/enterprise-rag-assistant/docs/failure-analysis.md)
- [Evaluation Report](file:///c:/Users/Likhith/OneDrive/Desktop/Coding/maps/enterprise-rag-assistant/docs/evaluation.md)
- [Problem Solving Details](file:///c:/Users/Likhith/OneDrive/Desktop/Coding/maps/enterprise-rag-assistant/docs/problem-solving.md)
