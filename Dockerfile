ARG BASE_IMAGE=docker.io/ainullcode/borgscale-runtime-base:runtime-borg1-1.4.4-borg2-2.0.0b21-r1

# Selects where the production stage gets its static frontend assets from.
#   frontend-builder  (default) — build the frontend inside Docker. This is what
#                      `docker compose up --build` uses, so a clean checkout of
#                      the repository builds end-to-end with no prior steps.
#   frontend-prebuilt — reuse assets already built into docker/frontend-build-output/.
#                      CI uses this so the same bundle is shared across architectures
#                      instead of being rebuilt once per arch under emulation.
ARG FRONTEND_STAGE=frontend-builder

# Build stage for the frontend. Pinned to the build platform so cross-arch
# images do not pay for an emulated Node build.
FROM --platform=$BUILDPLATFORM node:22-alpine AS frontend-builder
WORKDIR /frontend
# Dependency manifests first so the install layer caches independently of source.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build && test -f build/index.html

# CI fast path: assets built once outside Docker and copied into the context.
# BuildKit skips this stage entirely unless FRONTEND_STAGE selects it.
FROM scratch AS frontend-prebuilt
COPY docker/frontend-build-output/ /frontend/build/

# Resolves to whichever of the two stages above was selected.
FROM ${FRONTEND_STAGE} AS frontend-assets

# Build stage for backend
FROM python:3.10-slim AS backend-builder
WORKDIR /app

# Install build dependencies for psutil and other packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    python3-dev \
    libffi-dev \
    libssl-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and setuptools for better wheel support
RUN pip install --upgrade pip setuptools wheel

COPY requirements.txt .
# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Development stage
FROM ${BASE_IMAGE} AS development

# Build arguments
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}

WORKDIR /app

# Copy Python dependencies
COPY --from=backend-builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin

# Copy application code. Frontend assets are not required in dev because
# the Vite dev server runs locally and proxies API requests to this backend.
COPY app/ ./app/
COPY VERSION ./VERSION

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PYTHONPATH=/app
ENV DATA_DIR=/data
ENV DATABASE_URL=sqlite:////data/borg.db
ENV BORG_BACKUP_PATH=/backups
ENV ENABLE_CRON_BACKUPS=false
ENV PORT=8081

EXPOSE 8081

ENTRYPOINT ["/entrypoint.sh"]

# Production stage
FROM ${BASE_IMAGE} AS production

# Build arguments
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}

# Docker image metadata
LABEL org.opencontainers.image.title="BorgScale"
LABEL org.opencontainers.image.source="https://github.com/thekozugroup/BorgScale"
LABEL org.opencontainers.image.licenses="AGPL-3.0"
LABEL org.opencontainers.image.description="Self-hosted UI for Borg Backup (BorgScale fork of borg-ui)"
LABEL org.opencontainers.image.version="${APP_VERSION}"
LABEL org.opencontainers.image.vendor="BorgScale"
LABEL org.opencontainers.image.url="https://github.com/thekozugroup/BorgScale"
LABEL org.opencontainers.image.documentation="https://github.com/thekozugroup/BorgScale/blob/main/README.md"
LABEL com.borgscale.icon.color="#00dd00"

WORKDIR /app

# Copy Python dependencies
COPY --from=backend-builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin

# Static frontend bundle. See the FRONTEND_STAGE arg at the top of this file
# for how this resolves to either an in-Docker build or CI's prebuilt assets.
COPY --from=frontend-assets /frontend/build/ ./app/static/

# Copy application code
COPY app/ ./app/

# Copy VERSION file
COPY VERSION ./VERSION

# Set proper ownership and permissions
RUN chown -R borg:borg /app /data /backups /var/log/borg /etc/borg && \
    chmod -R 755 /app && \
    chmod -R 755 /data && \
    chmod -R 755 /backups && \
    chmod -R 755 /var/log/borg && \
    chmod -R 755 /etc/borg

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Stay as root - entrypoint will handle UID/GID changes and switch to borg user

# Set environment variables
ENV PYTHONPATH=/app
ENV DATA_DIR=/data
ENV DATABASE_URL=sqlite:////data/borg.db
ENV BORG_BACKUP_PATH=/backups
ENV ENABLE_CRON_BACKUPS=false
ENV PORT=8081

# Expose port
EXPOSE 8081

# Health check. /health/ready verifies the database and the borg binary, so a
# container that boots but cannot actually run backups is reported unhealthy.
# The start period covers migrations on first boot of a large existing database.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -fsS http://localhost:${PORT:-8081}/health/ready || exit 1

# Use entrypoint that handles UID/GID changes
ENTRYPOINT ["/entrypoint.sh"]
