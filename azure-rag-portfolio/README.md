# Azure AI + RAG Architecture, Implementation & Problem Solving Portfolio

A professional, portfolio-grade full-stack web application showcasing the architecture, step-by-step implementation, deployment flow, and debugging strategies for **Azure AI + Retrieval-Augmented Generation (RAG)** systems.

---

## 📖 Table of Contents
1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [Architecture Design](#3-architecture-design)
4. [Technology Stack](#4-technology-stack)
5. [Folder Structure](#5-folder-structure)
6. [Local Installation](#6-local-installation)
7. [Environment Variables](#7-environment-variables)
8. [Running Locally](#8-running-locally)
9. [Azure Integration Guide](#9-azure-integration-guide)
10. [API Documentation](#10-api-documentation)
11. [Grounded RAG Workflow](#11-grounded-rag-workflow)
12. [Troubleshooting & Debugging Lab](#12-troubleshooting--debugging-lab)
13. [Deployment Blueprint](#13-deployment-blueprint)
14. [Security Controls](#14-security-controls)
15. [Future Improvements](#15-future-improvements)

---

## 1. Project Overview
This project serves as a highly detailed, interactive portfolio page showcasing enterprise-level designs for RAG systems. It acts as an educational and presentational guide detailing query flows, chunking strategies, vector searching, authentication layers, security hardening, and error remediation plans.

---

## 2. Key Features
- **Interactive Clicking Architecture Diagram**: Click individual stages of the RAG pipeline to inspect inputs/outputs, stack definitions, common issues, and production solutions.
- **RAG Playground & Sandbox**: Submit natural language queries against pre-seeded data, adjust confidence limits, review live pipeline stage logs, and highlight source citations.
- **Chunking Visualizer Sandbox**: Input arbitrary text and dynamically simulate sliding window segmentations with adjustable overlap ranges.
- **RAG Debugging Lab**: Select from 7 simulated production errors (connection timeout, embedding dimension mismatch, prompt injection, etc.) to view error console stacks and diagnose resolutions.
- **Metrics & Latency Dashboard**: Charts explaining average retrieval confidence metrics, queries processed, and token costs using Recharts.

---

## 3. Architecture Design

### A. Runtime Query Pipeline Flow:
```text
User Query ──> React Frontend UI ──> FastAPI Backend
                                          │
    ┌─────────────────────────────────────┴────────────────────────┐
    ▼                                                              ▼
Query Embeddings (Ada-002) ──> Vector Search (Azure AI Search) ──> Context Extraction ──> GPT-4 Grounding ──> UI Citation Output
```

### B. Ingestion Pipeline Flow:
```text
Documents ──> Document Loader ──> Text Extraction ──> Sliding Chunking ──> Ada-002 Embeddings ──> Vector Index (Azure Search)
```

---

## 4. Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide React, Recharts, Vite.
- **Backend**: Python 3.10+, FastAPI, Uvicorn, Pydantic, Python-Dotenv.
- **Cloud (Production)**: Azure OpenAI, Azure AI Search, Azure Blob Storage, Azure App Service.

---

## 5. Folder Structure
```text
project/
├── backend/
│   ├── main.py              # FastAPI server entry point and endpoint routes
│   ├── config.py            # Environment configuration loader
│   ├── core/
│   │   └── simulator.py     # Seeded context, cosine lookups, and log generator
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/      # Modular UI components (Navbar, Architecture, Playground...)
│   │   ├── types/           # TypeScript definitions
│   │   ├── App.tsx          # Main router layout
│   │   └── index.css        # Tailwind classes and scrollbar configurations
│   ├── tailwind.config.js   # Custom Azure themes config
│   ├── postcss.config.js    # PostCSS adapter config
│   └── vite.config.ts       # Vite configuration
├── .env.example             # Template for configuration keys
├── README.md                # System documentation
└── run_all.bat              # Concurrently runs frontend & backend
```

---

## 6. Local Installation

### Backend Setup:
```bash
cd backend
pip install -r requirements.txt
```

### Frontend Setup:
```bash
cd frontend
npm install --legacy-peer-deps
```

---

## 7. Environment Variables
Create a `.env` file at the root folder based on [.env.example](file:///.env.example):
```env
PORT=8000
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_KEY=your-openai-api-key-here
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_API_KEY=your-search-admin-key-here
```
*(If left empty or utilizing `mock-key`, the system automatically enters **Demo Mode** for local simulation testing).*

---

## 8. Running Locally
Run both systems concurrently with the master batch script in your terminal:
```bash
run_all.bat
```
*(Or run `python -m uvicorn backend.main:app` in backend folder and `npm run dev` in frontend folder).*

---

## 9. Azure Integration Guide
To transition from Demo Mode to Azure Production Mode:
1. Provision **Azure OpenAI** and deploy `text-embedding-ada-002` and `gpt-4` models.
2. Provision **Azure AI Search** and create an index matching the coordinate schema.
3. Update `.env` variables with production endpoints and keys.
4. Restart the FastAPI server. The dashboard status indicator will automatically display **Azure Production Mode**.

---

## 10. API Documentation
- `GET /health`: Returns connection health status and operational mode.
- `GET /config/status`: Exposes index configurations and active model deployments.
- `POST /rag/query`: Submits query text, runs similarity retrieval, and generates completion answers.
- `POST /debug/diagnose`: Simulates target architecture errors, returns stack logs, and presents remediation strategies.
- `GET /dashboard/metrics`: Generates real-time telemetry stats.

---

## 11. Grounded RAG Workflow
To prevent model hallucination, the prompt engineering layer formats system rules as follows:
```text
System Instructions: You are a factual assistant. Answer the user query ONLY using the provided text blocks.
If you cannot find the answer in the context blocks, reply 'I do not know'. Do not make up facts.
Context Blocks:
[doc-01]: ...
User Question: What security roles exist?
```

---

## 12. Troubleshooting & Debugging Lab
The integrated lab provides instant diagnosis simulations for:
- **Connection Timeout**: Network security rule blockage.
- **Dimension Mismatch**: Mismatch between query vector sizes (e.g., 384 vs 1536).
- **Authentication Failure**: Expired Entra ID token or invalid Search credentials.
- **Prompt Injection**: Content safety filters interception.

---

## 13. Deployment Blueprint
```text
GitHub Push ──> GitHub Actions CI/CD Pipeline ──> Azure App Service (FastAPI) ──> VNet (Private Endpoint) ──> Azure OpenAI
```
*(For production, standard web apps should be secured inside virtual networks with VNet integration).*

---

## 14. Security Controls
- **API Secret Isolation**: All keys are hosted server-side and never forwarded to client browsers.
- **Azure Role-Based Access Control (RBAC)**: App identity is restricted to 'Search Index Data Reader' to block deletions.
- **Input Sanitization**: Query inputs are parsed for system instruction bypass keywords on FastAPI before vector submission.

---

## 15. Future Improvements
- **Document Chunk Indexer**: Support local upload and processing of user-provided PDF files.
- **Context Compression**: Integrate LLMLingua to compress prompt context length, reducing API execution cost.
- **Evaluation Layer**: Integrate Ragas framework to automatically score context relevance and retrieval accuracy.
