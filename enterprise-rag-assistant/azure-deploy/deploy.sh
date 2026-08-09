#!/usr/bin/env bash
# ============================================================
#  deploy.sh — Azure deployment script for Enterprise RAG
#  Usage: bash azure-deploy/deploy.sh
# ============================================================
set -euo pipefail

# ── Configuration ──────────────────────────────────────────
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-enterprise-rag}"
LOCATION="${LOCATION:-eastus}"
ACR_NAME="${ACR_NAME:-enterpriseragacr}"
APP_NAME="${APP_NAME:-enterprise-rag-assistant}"
APP_SERVICE_PLAN="${APP_SERVICE_PLAN:-asp-enterprise-rag}"
APP_SERVICE_SKU="${APP_SERVICE_SKU:-B2}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

IMAGE_NAME="${ACR_NAME}.azurecr.io/${APP_NAME}:${IMAGE_TAG}"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   Enterprise RAG Assistant — Azure Deployment   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  Resource Group : $RESOURCE_GROUP"
echo "  Location       : $LOCATION"
echo "  ACR            : $ACR_NAME"
echo "  App Service    : $APP_NAME"
echo "  Image          : $IMAGE_NAME"
echo ""

# ── Step 1: Create Resource Group ──────────────────────────
echo "▶ [1/7] Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none
echo "    ✓ Resource group ready."

# ── Step 2: Create Azure Container Registry ─────────────────
echo "▶ [2/7] Creating Azure Container Registry..."
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled true \
  --output none
echo "    ✓ ACR ready."

# ── Step 3: Build & Push Docker image to ACR ────────────────
echo "▶ [3/7] Building and pushing Docker image to ACR..."
az acr build \
  --registry "$ACR_NAME" \
  --image "${APP_NAME}:${IMAGE_TAG}" \
  --file Dockerfile \
  .
echo "    ✓ Image pushed: $IMAGE_NAME"

# ── Step 4: Create App Service Plan ─────────────────────────
echo "▶ [4/7] Creating App Service Plan (Linux)..."
az appservice plan create \
  --name "$APP_SERVICE_PLAN" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --is-linux \
  --sku "$APP_SERVICE_SKU" \
  --output none
echo "    ✓ App Service Plan ready."

# ── Step 5: Deploy Web App ───────────────────────────────────
echo "▶ [5/7] Creating Web App from container..."
ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

az webapp create \
  --resource-group "$RESOURCE_GROUP" \
  --plan "$APP_SERVICE_PLAN" \
  --name "$APP_NAME" \
  --deployment-container-image-name "$IMAGE_NAME" \
  --docker-registry-server-url "https://${ACR_NAME}.azurecr.io" \
  --docker-registry-server-user "$ACR_NAME" \
  --docker-registry-server-password "$ACR_PASSWORD" \
  --output none
echo "    ✓ Web App created."

# ── Step 6: Configure App Settings ──────────────────────────
echo "▶ [6/7] Configuring environment variables..."
az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --settings \
    MOCK_AZURE_SERVICES="False" \
    AZURE_OPENAI_ENDPOINT="${AZURE_OPENAI_ENDPOINT:-}" \
    AZURE_OPENAI_API_KEY="${AZURE_OPENAI_API_KEY:-}" \
    AZURE_OPENAI_API_VERSION="${AZURE_OPENAI_API_VERSION:-2024-02-15-preview}" \
    AZURE_OPENAI_CHAT_DEPLOYMENT="${AZURE_OPENAI_CHAT_DEPLOYMENT:-}" \
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT="${AZURE_OPENAI_EMBEDDING_DEPLOYMENT:-}" \
    AZURE_OPENAI_EMBEDDING_DIMENSIONS="${AZURE_OPENAI_EMBEDDING_DIMENSIONS:-1536}" \
    AZURE_SEARCH_ENDPOINT="${AZURE_SEARCH_ENDPOINT:-}" \
    AZURE_SEARCH_API_KEY="${AZURE_SEARCH_API_KEY:-}" \
    AZURE_SEARCH_INDEX_NAME="${AZURE_SEARCH_INDEX_NAME:-enterprise-knowledge-index}" \
    AZURE_STORAGE_CONNECTION_STRING="${AZURE_STORAGE_CONNECTION_STRING:-}" \
    AZURE_STORAGE_CONTAINER="${AZURE_STORAGE_CONTAINER:-documents}" \
    APPLICATIONINSIGHTS_CONNECTION_STRING="${APPLICATIONINSIGHTS_CONNECTION_STRING:-}" \
    WEBSITES_PORT="8000" \
  --output none
echo "    ✓ App settings configured."

# ── Step 7: Set Health Check ─────────────────────────────────
echo "▶ [7/7] Registering health check endpoint..."
az webapp config set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --generic-configurations '{"healthCheckPath": "/health"}' \
  --output none
echo "    ✓ Health check set to /health"

# ── Done ─────────────────────────────────────────────────────
APP_URL="https://${APP_NAME}.azurewebsites.net"
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║              ✅  DEPLOYMENT COMPLETE             ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "  🌐 App URL     : $APP_URL"
echo "  🩺 Health      : $APP_URL/health"
echo "  📖 API Docs    : $APP_URL/docs"
echo "  🔍 API Status  : $APP_URL/api/v1/status"
echo ""
echo "  Next: Set real Azure credentials in App Service settings."
echo ""
