# Azure Deployment Guide

## Architecture

```
GitHub (push to main)
        │
        ▼
GitHub Actions CI/CD
   ├── Run 34 tests (mock mode)
   ├── Build Docker image
   ├── Push to Azure Container Registry
   └── Deploy to Azure App Service
                │
        ┌───────┴────────┐
        │  Azure OpenAI  │  GPT-4o · text-embedding-3-large
        │  Azure Search  │  Hybrid + Semantic Ranking
        │  Azure Blob    │  Document Storage
        │  App Insights  │  Telemetry + Tracing
        └────────────────┘
```

## Quick Start

### Option A — PowerShell (Windows)
```powershell
# 1. Login to Azure
az login

# 2. Fill in your Azure credentials inside deploy.ps1
notepad azure-deploy\deploy.ps1

# 3. Run deployment
.\azure-deploy\deploy.ps1
```

### Option B — Bash (Linux / macOS / WSL)
```bash
# 1. Login to Azure
az login

# 2. Set your credentials as env vars
export AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/"
export AZURE_OPENAI_API_KEY="your-key"
# ... (see .env.example for full list)

# 3. Run deployment
bash azure-deploy/deploy.sh
```

### Option C — ARM Template (Azure Portal / az cli)
```bash
az deployment group create \
  --resource-group rg-enterprise-rag \
  --template-file azure-deploy/arm-template.json \
  --parameters appName=enterprise-rag-assistant \
               acrName=enterpriseragacr \
               azureOpenAiEndpoint="https://your-resource.openai.azure.com/" \
               azureOpenAiApiKey="your-key"
```

### Option D — GitHub Actions (Automated CI/CD)
1. Push your code to GitHub
2. Add these **Repository Secrets** in GitHub → Settings → Secrets:

| Secret | Value |
|:---|:---|
| `AZURE_CREDENTIALS` | Output of `az ad sp create-for-rbac --sdk-auth` |

3. Every `git push` to `main` will automatically:
   - Run all 34 tests
   - Build and push Docker image to ACR
   - Deploy to Azure App Service
   - Run health check

## App Service Environment Variables

Set these in Azure Portal → App Service → Configuration → Application Settings:

| Variable | Description | Example |
|:---|:---|:---|
| `WEBSITES_PORT` | Port uvicorn listens on | `8000` |
| `MOCK_AZURE_SERVICES` | **Must be `false` in production** | `false` |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI resource URL | `https://xxx.openai.azure.com/` |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | `abc123...` |
| `AZURE_OPENAI_API_VERSION` | API version | `2024-02-15-preview` |
| `AZURE_OPENAI_CHAT_DEPLOYMENT` | Chat model deployment name | `chat-gpt-4o` |
| `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` | Embedding model deployment name | `text-embedding-3-large` |
| `AZURE_OPENAI_EMBEDDING_DIMENSIONS` | Embedding vector dimensions | `1536` |
| `AZURE_SEARCH_ENDPOINT` | Azure AI Search endpoint | `https://xxx.search.windows.net` |
| `AZURE_SEARCH_API_KEY` | Azure AI Search admin key | `abc123...` |
| `AZURE_SEARCH_INDEX_NAME` | Search index name | `enterprise-knowledge-index` |
| `AZURE_STORAGE_CONNECTION_STRING` | Blob storage connection string | `DefaultEndpointsProtocol=https;...` |
| `AZURE_STORAGE_CONTAINER` | Blob container name | `documents` |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights telemetry | `InstrumentationKey=xxx;...` |

## Endpoints (After Deployment)

| Endpoint | Description |
|:---|:---|
| `GET  /health` | Health probe — used by App Service |
| `GET  /api/v1/status` | RAG pipeline operational status |
| `POST /api/v1/chat` | Full RAG query → grounded answer |
| `POST /api/v1/ingest` | Trigger document ingestion |
| `POST /api/v1/search` | Hybrid search (vector + keyword) |
| `GET  /docs` | Swagger UI — interactive API docs |

## Files Created

| File | Purpose |
|:---|:---|
| `Dockerfile` | Multi-stage production image with non-root user + health check |
| `.dockerignore` | Excludes tests, .env, cache from image |
| `azure-deploy/deploy.sh` | Automated bash deployment (7 steps) |
| `azure-deploy/deploy.ps1` | Same for Windows PowerShell |
| `azure-deploy/arm-template.json` | ARM template for full Azure resource provisioning |
| `.github/workflows/deploy.yml` | GitHub Actions CI/CD pipeline |
