# ─────────────────────────────────────────────────────────────────
# Enterprise RAG Assistant — Azure Deployment Guide
# ─────────────────────────────────────────────────────────────────

# Prerequisites:
#   - Azure CLI installed (az --version)
#   - Docker Desktop running
#   - Logged in: az login
#   - Your .env values ready

# ── VARIABLES ────────────────────────────────────────────────────
$RESOURCE_GROUP  = "rg-enterprise-rag"
$LOCATION        = "eastus"
$ACR_NAME        = "enterpriseragacr"       # must be globally unique, lowercase
$APP_NAME        = "enterprise-rag-assistant"
$PLAN_NAME       = "asp-enterprise-rag"
$IMAGE_TAG       = "latest"
$IMAGE_NAME      = "$ACR_NAME.azurecr.io/${APP_NAME}:${IMAGE_TAG}"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Enterprise RAG Assistant — Azure Deployment   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── STEP 1: Resource Group ───────────────────────────────────────
Write-Host "▶ [1/7] Creating resource group..." -ForegroundColor Yellow
az group create --name $RESOURCE_GROUP --location $LOCATION --output none
Write-Host "    ✓ Resource group: $RESOURCE_GROUP" -ForegroundColor Green

# ── STEP 2: Azure Container Registry ────────────────────────────
Write-Host "▶ [2/7] Creating Azure Container Registry..." -ForegroundColor Yellow
az acr create `
  --resource-group $RESOURCE_GROUP `
  --name $ACR_NAME `
  --sku Basic `
  --admin-enabled true `
  --output none
Write-Host "    ✓ ACR: $ACR_NAME.azurecr.io" -ForegroundColor Green

# ── STEP 3: Build & Push Docker Image ───────────────────────────
Write-Host "▶ [3/7] Building and pushing Docker image to ACR..." -ForegroundColor Yellow
az acr build `
  --registry $ACR_NAME `
  --image "${APP_NAME}:${IMAGE_TAG}" `
  --file Dockerfile `
  .
Write-Host "    ✓ Image pushed: $IMAGE_NAME" -ForegroundColor Green

# ── STEP 4: App Service Plan ─────────────────────────────────────
Write-Host "▶ [4/7] Creating App Service Plan (Linux B2)..." -ForegroundColor Yellow
az appservice plan create `
  --name $PLAN_NAME `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --is-linux `
  --sku B2 `
  --output none
Write-Host "    ✓ App Service Plan: $PLAN_NAME" -ForegroundColor Green

# ── STEP 5: Create Web App ───────────────────────────────────────
Write-Host "▶ [5/7] Creating Web App from container..." -ForegroundColor Yellow
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv

az webapp create `
  --resource-group $RESOURCE_GROUP `
  --plan $PLAN_NAME `
  --name $APP_NAME `
  --deployment-container-image-name $IMAGE_NAME `
  --docker-registry-server-url "https://${ACR_NAME}.azurecr.io" `
  --docker-registry-server-user $ACR_NAME `
  --docker-registry-server-password $ACR_PASSWORD `
  --output none
Write-Host "    ✓ Web App created: $APP_NAME" -ForegroundColor Green

# ── STEP 6: Configure App Settings ──────────────────────────────
Write-Host "▶ [6/7] Configuring environment variables..." -ForegroundColor Yellow
# !! Replace the values below with your real Azure resource values !!
az webapp config appsettings set `
  --resource-group $RESOURCE_GROUP `
  --name $APP_NAME `
  --settings `
    WEBSITES_PORT="8000" `
    MOCK_AZURE_SERVICES="false" `
    AZURE_OPENAI_ENDPOINT="https://YOUR-RESOURCE.openai.azure.com/" `
    AZURE_OPENAI_API_KEY="YOUR-OPENAI-KEY" `
    AZURE_OPENAI_API_VERSION="2024-02-15-preview" `
    AZURE_OPENAI_CHAT_DEPLOYMENT="chat-gpt-4o" `
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-3-large" `
    AZURE_OPENAI_EMBEDDING_DIMENSIONS="1536" `
    AZURE_SEARCH_ENDPOINT="https://YOUR-SEARCH.search.windows.net" `
    AZURE_SEARCH_API_KEY="YOUR-SEARCH-KEY" `
    AZURE_SEARCH_INDEX_NAME="enterprise-knowledge-index" `
    AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=YOUR-ACCOUNT;AccountKey=YOUR-KEY;EndpointSuffix=core.windows.net" `
    AZURE_STORAGE_CONTAINER="documents" `
    APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=YOUR-KEY" `
  --output none
Write-Host "    ✓ App settings configured." -ForegroundColor Green

# ── STEP 7: Health Check ─────────────────────────────────────────
Write-Host "▶ [7/7] Registering /health endpoint as health probe..." -ForegroundColor Yellow
az webapp update `
  --resource-group $RESOURCE_GROUP `
  --name $APP_NAME `
  --set siteConfig.healthCheckPath="/health" `
  --output none
Write-Host "    ✓ Health check configured." -ForegroundColor Green

# ── Done ──────────────────────────────────────────────────────────
$APP_URL = "https://${APP_NAME}.azurewebsites.net"
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           ✅  DEPLOYMENT COMPLETE!               ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 App URL   : $APP_URL" -ForegroundColor Cyan
Write-Host "  🩺 Health    : $APP_URL/health" -ForegroundColor Cyan
Write-Host "  📖 API Docs  : $APP_URL/docs" -ForegroundColor Cyan
Write-Host "  🔍 Status    : $APP_URL/api/v1/status" -ForegroundColor Cyan
Write-Host ""
