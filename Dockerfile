# Multi-stage build for ETF Agent
# Stage 1: Build frontend
FROM node:22-bookworm-slim AS frontend-builder

# Build arguments
ARG REACT_APP_VERSION=0.1.0
ARG REACT_APP_GIT_COMMIT=dev
ARG REACT_APP_BUILD_TIME=local

# Update packages and install security patches
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && npm install -g npm@latest

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies (use legacy-peer-deps to avoid conflicts)
RUN npm ci --legacy-peer-deps

# Copy frontend source
COPY frontend/ ./

# Set environment variables for build
ENV REACT_APP_VERSION=$REACT_APP_VERSION
ENV REACT_APP_GIT_COMMIT=$REACT_APP_GIT_COMMIT
ENV REACT_APP_BUILD_TIME=$REACT_APP_BUILD_TIME

# Build frontend
RUN npm run build

# Stage 2: Python backend
FROM python:3.13-slim-bookworm

WORKDIR /app

# Install system dependencies and security updates
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy Python project files
COPY pyproject.toml uv.lock* ./

# Install Python dependencies
RUN uv sync --no-dev --frozen

# Copy backend source code
COPY src/ ./src/

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Create non-root user
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
