import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.routes import router as api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RAG-based Enterprise Knowledge Assistant",
    description="FastAPI service hosting the Enterprise RAG Assistant API endpoints.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Bind API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify server is active."""
    return {
        "status": "healthy",
        "service": "enterprise-rag-assistant"
    }

# Mount static files for the frontend SPA
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    @app.get("/", include_in_schema=False)
    async def serve_spa():
        """Serve the Enterprise RAG Knowledge Assistant frontend SPA."""
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
