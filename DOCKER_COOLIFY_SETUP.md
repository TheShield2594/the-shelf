# Docker Configuration for Coolify Deployment

Optimized Docker setup for deploying The Shelf to Coolify.

---

## Backend Dockerfile

### Production-Ready (Multi-Stage)

```dockerfile
# backend/Dockerfile

# Build stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Development Dockerfile (Faster Builds)

```dockerfile
# backend/Dockerfile.dev

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

---

## Frontend Dockerfile

### Next.js Standalone (Recommended)

```dockerfile
# frontend-next/Dockerfile

# Dependencies stage
FROM node:18-alpine AS deps

WORKDIR /app

# Install dependencies based on lockfile
COPY package.json package-lock.json* ./
RUN npm ci

# Builder stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build arguments
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build application
RUN npm run build

# Runner stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Update next.config.js:**

```javascript
// frontend-next/next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Enable standalone output for Docker
  output: 'standalone',

  // Image optimization
  images: {
    domains: ['covers.openlibrary.org'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
      },
    ],
  },

  // Compression
  compress: true,

  // Performance
  swcMinify: true,
}

module.exports = nextConfig
```

### Development Dockerfile

```dockerfile
# frontend-next/Dockerfile.dev

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

---

## Docker Compose (Local Development)

### Full Stack Setup

```yaml
# docker-compose.yml

version: '3.8'

services:
  # PostgreSQL with pgvector
  database:
    image: ankane/pgvector:latest
    container_name: the-shelf-db
    environment:
      POSTGRES_DB: the_shelf
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend (FastAPI)
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: the-shelf-backend
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@database:5432/the_shelf
      SECRET_KEY: dev-secret-key-change-in-production
      CORS_ORIGINS: http://localhost:3000
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    depends_on:
      database:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  # Frontend (Next.js)
  frontend:
    build:
      context: ./frontend-next
      dockerfile: Dockerfile.dev
    container_name: the-shelf-frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    ports:
      - "3000:3000"
    volumes:
      - ./frontend-next:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Database Initialization Script

```sql
-- init.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Create initial admin user (optional)
-- This will be done via migrations
```

**Usage:**

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Run migrations
docker-compose exec backend alembic upgrade head

# Seed database
docker-compose exec backend python -m app.seed

# Stop all services
docker-compose down

# Reset everything (CAUTION: deletes data)
docker-compose down -v
```

---

## Coolify Configuration Files

### .coolify.yaml (Project Configuration)

```yaml
# .coolify.yaml

version: '1.0'

services:
  backend:
    name: the-shelf-backend
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - SECRET_KEY=${SECRET_KEY}
      - CORS_ORIGINS=${CORS_ORIGINS}
    healthcheck:
      path: /api/health
      port: 8000
      interval: 30s
    resources:
      limits:
        memory: 512M
        cpu: 0.5
      requests:
        memory: 256M
        cpu: 0.25

  frontend:
    name: the-shelf-frontend
    build:
      context: ./frontend-next
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    ports:
      - "3000:3000"
    healthcheck:
      path: /
      port: 3000
      interval: 30s
    resources:
      limits:
        memory: 256M
        cpu: 0.5
      requests:
        memory: 128M
        cpu: 0.25
```

---

## .dockerignore (Optimize Build)

### Backend

```bash
# backend/.dockerignore

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/

# Testing
.pytest_cache/
.coverage
htmlcov/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# Database
*.db
*.sqlite

# OS
.DS_Store
Thumbs.db

# Git
.git/
.gitignore

# Documentation
*.md
docs/

# Alembic (keep, but exclude generated files)
alembic/versions/*.pyc
```

### Frontend

```bash
# frontend-next/.dockerignore

# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js
.next/
out/
dist/
build/

# Testing
coverage/
.nyc_output/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Git
.git/
.gitignore

# Environment (will be passed as build args)
.env.local
.env*.local

# Documentation
*.md
docs/
```

---

## GitHub Actions (CI/CD)

### Auto-Deploy to Coolify

```yaml
# .github/workflows/deploy-coolify.yml

name: Deploy to Coolify

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Trigger Coolify deployment
        run: |
          curl -X POST "${{ secrets.COOLIFY_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d '{"ref": "${{ github.ref }}", "sha": "${{ github.sha }}"}'

      - name: Wait for deployment
        run: sleep 60

      - name: Check backend health
        run: |
          curl -f https://api.theshelf.app/api/health || exit 1

      - name: Check frontend health
        run: |
          curl -f https://theshelf.app || exit 1
```

### Build and Test (Pre-Deploy)

```yaml
# .github/workflows/test.yml

name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-backend:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: ankane/pgvector:latest
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run tests
        env:
          DATABASE_URL: postgresql+asyncpg://postgres:postgres@localhost:5432/test_db
        run: |
          cd backend
          pytest tests/ -v --cov=app

  test-frontend:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd frontend-next
          npm ci

      - name: Type check
        run: |
          cd frontend-next
          npm run type-check

      - name: Lint
        run: |
          cd frontend-next
          npm run lint

      - name: Build
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8000
        run: |
          cd frontend-next
          npm run build
```

---

## Optimization Tips

### 1. Multi-Stage Builds
✅ Already implemented in Dockerfiles above
- Smaller final images (50-70% reduction)
- Faster deployment
- Better security (no build tools in production)

### 2. Layer Caching
```dockerfile
# Copy dependency files first (cached if unchanged)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code last (changes frequently)
COPY . .
```

### 3. Image Size Optimization
```bash
# Use Alpine Linux where possible
FROM node:18-alpine  # ~40MB vs ~900MB for full Node

# Clean up after installs
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Use .dockerignore aggressively
```

### 4. Resource Limits
In Coolify or docker-compose:
```yaml
resources:
  limits:
    memory: 512M
    cpu: 0.5
```

---

## Quick Reference

### Build Images Locally

```bash
# Backend
cd backend
docker build -t the-shelf-backend .

# Frontend
cd frontend-next
docker build -t the-shelf-frontend \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 .
```

### Run Containers

```bash
# Backend
docker run -d \
  -p 8000:8000 \
  -e DATABASE_URL="postgresql+asyncpg://..." \
  -e SECRET_KEY="..." \
  the-shelf-backend

# Frontend
docker run -d \
  -p 3000:3000 \
  the-shelf-frontend
```

### Debug Container

```bash
# Check logs
docker logs <container-id>

# Shell into container
docker exec -it <container-id> sh

# Inspect
docker inspect <container-id>
```

---

This Docker configuration is optimized for both local development and production deployment to Coolify!
