# ─────────────────────────────────────────────
# Stage 1: Builder — install dependencies
# ─────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install system dependencies needed for PDF/DOCX parsing
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ─────────────────────────────────────────────
# Stage 2: Runtime — lean production image
# ─────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application source
COPY app/       ./app/
COPY scripts/   ./scripts/
COPY data/      ./data/
COPY evaluation/ ./evaluation/

# Create non-root user for security
RUN useradd -m -u 1001 raguser && chown -R raguser:raguser /app
USER raguser

# Azure App Service uses PORT env variable; default to 8000
ENV PORT=8000

EXPOSE 8000

# Health check registered to /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/health')" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 2"]
