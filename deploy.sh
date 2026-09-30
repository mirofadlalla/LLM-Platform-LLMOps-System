#!/usr/bin/env bash
# ==============================================================================
# Production Deployment Script for LLMOps Backend on AWS EC2
# ==============================================================================

set -euo pipefail

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}====================================================${NC}"
echo -e "${GREEN}      LLMOps Backend - EC2 Deployment Script       ${NC}"
echo -e "${GREEN}====================================================${NC}"

# 1. Check prerequisites
echo -e "\n${YELLOW}[1/6] Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed or not in PATH.${NC}"
    echo "Please install Docker on this EC2 instance: sudo apt-get install -y docker.io"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: docker compose plugin is not installed.${NC}"
    echo "Please install Docker Compose plugin: sudo apt-get install -y docker-compose-v2"
    exit 1
fi

# 2. Check environment configuration file
echo -e "\n${YELLOW}[2/6] Checking environment file (.env)...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found in current directory.${NC}"
    echo "Please copy .env.example to .env and configure production secrets:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

# Basic check for default unsafe secrets
if grep -q "replace_with_strong_password" .env; then
    echo -e "${RED}Warning: POSTGRES_PASSWORD is still set to placeholder in .env!${NC}"
    echo "Please edit .env with a secure password before deploying."
    exit 1
fi

# Source PORT from .env if present
APP_PORT=$(grep -E '^PORT=' .env | cut -d '=' -f2 | tr -d ' "' || echo "8000")
if [ -z "$APP_PORT" ]; then
    APP_PORT="8000"
fi

# 3. Build Docker images
echo -e "\n${YELLOW}[3/6] Building production backend Docker image...${NC}"
docker compose build --pull

# 4. Start database and cache services first
echo -e "\n${YELLOW}[4/6] Starting database and cache services...${NC}"
docker compose up -d postgres redis

# Wait for postgres to become healthy
echo "Waiting for PostgreSQL to be healthy..."
RETRY_COUNT=0
MAX_RETRIES=30
until [ $(docker inspect --format='{{json .State.Health.Status}}' llmops-postgres 2>/dev/null || echo '"starting"') = '"healthy"' ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo -e "${RED}Timed out waiting for PostgreSQL container to become healthy.${NC}"
        docker compose logs postgres
        exit 1
    fi
    sleep 2
done
echo -e "${GREEN}PostgreSQL is healthy.${NC}"

# 5. Run database migrations explicitly
echo -e "\n${YELLOW}[5/6] Executing database migrations (alembic upgrade head)...${NC}"
docker compose run --rm migrate
echo -e "${GREEN}Database migrations executed successfully.${NC}"

# 6. Start API and Celery workers
echo -e "\n${YELLOW}[6/6] Starting API and Celery worker services...${NC}"
docker compose up -d api celery-worker

# Wait for API to pass health check
echo "Waiting for API to be healthy on port ${APP_PORT}..."
API_RETRIES=0
MAX_API_RETRIES=30
API_READY=false

while [ $API_RETRIES -lt $MAX_API_RETRIES ]; do
    if curl -s -f "http://localhost:${APP_PORT}/api/v1/health" > /dev/null 2>&1; then
        API_READY=true
        break
    fi
    API_RETRIES=$((API_RETRIES + 1))
    sleep 2
done

echo -e "\n${GREEN}====================================================${NC}"
if [ "$API_READY" = true ]; then
    echo -e "${GREEN}Deployment Succeeded!${NC}"
    echo -e "API is listening at: http://localhost:${APP_PORT}"
    echo -e "Health check:        http://localhost:${APP_PORT}/api/v1/health"
    HEALTH_OUTPUT=$(curl -s "http://localhost:${APP_PORT}/api/v1/health" 2>/dev/null || echo '{"status":"ok"}')
    echo -e "Health response:     ${HEALTH_OUTPUT}"
else
    echo -e "${YELLOW}API is still initializing or healthcheck timed out.${NC}"
    echo "Check container status below."
fi
echo -e "${GREEN}====================================================${NC}"

# Show running status
echo -e "\nActive backend containers:"
docker compose ps

echo -e "\nTo view logs:"
echo "  docker compose logs -f api"
echo "  docker compose logs -f celery-worker"
