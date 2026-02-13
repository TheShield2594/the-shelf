# Migration Guide: Vercel → Coolify + Supabase

This guide covers migrating The Shelf from Vercel to a self-hosted Coolify setup with Supabase database.

---

## Why Coolify + Supabase?

### Coolify
- ✅ **Self-hosted** - Run on your own hardware/VPS
- ✅ **Docker-based** - Easy deployment and scaling
- ✅ **Cost-effective** - No per-deployment fees
- ✅ **Privacy** - Complete control over your infrastructure
- ✅ **One-click deploys** - Similar UX to Vercel/Railway
- ✅ **Auto-SSL** - Built-in Let's Encrypt

### Supabase
- ✅ **PostgreSQL 15+** - Latest features
- ✅ **pgvector built-in** - No manual setup needed
- ✅ **Connection pooling** - PgBouncer included
- ✅ **Backups** - Automatic daily backups
- ✅ **Free tier** - 500 MB database
- ✅ **Local development** - Supabase CLI for local PostgreSQL

---

## Architecture Comparison

### Current (Vercel)
```
Frontend (Vercel) → Backend (Railway?) → Database (Neon?)
```

### New (Coolify + Supabase)
```
Frontend (Coolify) → Backend (Coolify) → Database (Supabase)
              ↓
        Your VPS/Local
```

---

## Prerequisites

### For Coolify
- **Server:** VPS with 2GB+ RAM (or local machine)
- **OS:** Ubuntu 22.04 LTS (recommended)
- **Docker:** Installed and running
- **Domain:** Optional but recommended (e.g., `theshelf.app`)

### For Supabase
- Free account at [supabase.com](https://supabase.com)
- Or local Supabase instance (CLI)

---

## Part 1: Supabase Setup

### Option A: Supabase Cloud (Easiest)

#### 1. Create Supabase Project

```bash
# 1. Visit https://supabase.com
# 2. Create new project
#    - Name: the-shelf
#    - Region: Choose closest to your Coolify server
#    - Database password: Generate strong password

# 3. Wait ~2 minutes for provisioning
```

#### 2. Enable pgvector

```sql
-- In Supabase SQL Editor (Dashboard → SQL Editor)
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
SELECT * FROM pg_extension WHERE extname = 'vector';
```

#### 3. Get Connection Strings

Supabase provides multiple connection modes:

**Transaction Mode (for migrations):**
```
postgresql://postgres:password@db.project.supabase.co:5432/postgres
```

**Session Mode (for app - pooled):**
```
postgresql://postgres:password@db.project.supabase.co:6543/postgres
```

**Direct Connection (no pooling):**
```
postgresql://postgres:password@db.project.supabase.co:5432/postgres?sslmode=require
```

**For The Shelf, use Session Mode (port 6543):**
```bash
DATABASE_URL=postgresql+asyncpg://postgres:password@db.project.supabase.co:6543/postgres?sslmode=require
```

#### 4. Run Migrations

From your local machine:

```bash
cd backend

# Set DATABASE_URL to Supabase
export DATABASE_URL="postgresql+asyncpg://postgres:password@db.project.supabase.co:6543/postgres?sslmode=require"

# Run migrations
alembic upgrade head

# Seed data (optional)
python -m app.seed

# Verify tables
# In Supabase Dashboard → Table Editor
# Should see: books, users, multi_dimensional_ratings, book_fingerprints, etc.
```

### Option B: Local Supabase (Advanced)

For true self-hosting:

```bash
# Install Supabase CLI
brew install supabase/tap/supabase  # macOS
# or
npm install -g supabase              # Any OS

# Initialize in your project
cd the-shelf
supabase init

# Start local Supabase
supabase start

# This starts:
# - PostgreSQL on localhost:54322
# - Studio UI on http://localhost:54323
# - API on http://localhost:54321

# Get connection string
supabase status
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres

# Enable pgvector
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

---

## Part 2: Coolify Setup

### Install Coolify

#### On VPS (Ubuntu 22.04)

```bash
# SSH into your server
ssh user@your-server-ip

# Install Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# This will:
# - Install Docker
# - Install Coolify
# - Start Coolify on port 8000

# Access Coolify
# Visit http://your-server-ip:8000
# Create admin account
```

#### On Local Machine (Docker Desktop)

```bash
# Install Docker Desktop first
# Then run:
docker run -d \
  --name coolify \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v coolify-data:/data \
  -p 8000:8000 \
  coollabsio/coolify:latest

# Access at http://localhost:8000
```

### Configure Coolify

1. **Create Source** (GitHub)
   - Dashboard → Sources → Add
   - Connect your GitHub account
   - Or use public repo URL

2. **Create Server** (if not auto-created)
   - Servers → Add
   - For local: localhost
   - For VPS: your server IP

---

## Part 3: Deploy Backend to Coolify

### 1. Create Backend Project

In Coolify Dashboard:

1. **Create Application**
   - Projects → New Project → "The Shelf"
   - Add Application → "Backend"
   - Select source: GitHub
   - Repository: `TheShield2594/the-shelf`
   - Branch: `main`

2. **Configure Build**

   Coolify will detect Python/FastAPI. Configure:

   **Build Pack:** `nixpacks` or `dockerfile`

   **If using Dockerfile, create one:**

   ```dockerfile
   # backend/Dockerfile
   FROM python:3.11-slim

   WORKDIR /app

   # Install dependencies
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt

   # Copy application
   COPY . .

   # Expose port
   EXPOSE 8000

   # Run application
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

   **Build Command:**
   ```bash
   cd backend && pip install -r requirements.txt
   ```

   **Start Command:**
   ```bash
   cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

   **Port:** `8000`

   **Health Check Path:** `/api/health`

3. **Set Environment Variables**

   In Coolify → Application → Environment Variables:

   ```bash
   # Database (from Supabase)
   DATABASE_URL=postgresql+asyncpg://postgres:password@db.project.supabase.co:6543/postgres?sslmode=require

   # Security
   SECRET_KEY=<generate-random-key>

   # CORS (will update after frontend deployed)
   CORS_ORIGINS=http://localhost:3000

   # App settings
   PORT=8000
   ENVIRONMENT=production
   ```

   Generate SECRET_KEY:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

4. **Deploy**

   - Click "Deploy"
   - Coolify will build and start the container
   - Check logs for any errors

5. **Get Backend URL**

   Coolify generates internal URL like:
   - `http://backend-the-shelf.coolify.local:8000` (local)
   - `http://your-server-ip:8000` (VPS)

   Or configure custom domain:
   - Domains → Add Domain
   - `api.theshelf.app` → Points to backend
   - Coolify auto-configures SSL (Let's Encrypt)

---

## Part 4: Deploy Frontend to Coolify

### 1. Create Frontend Project

In Coolify Dashboard:

1. **Add Application** (to same project)
   - Name: "Frontend"
   - Source: Same GitHub repo
   - Branch: `main`

2. **Configure Build**

   **Build Pack:** `nixpacks` (auto-detects Next.js)

   **Root Directory:** `frontend-next`

   **Build Command:**
   ```bash
   cd frontend-next && npm install && npm run build
   ```

   **Start Command:**
   ```bash
   cd frontend-next && npm start
   ```

   **Port:** `3000`

   **Alternatively, use Dockerfile:**

   ```dockerfile
   # frontend-next/Dockerfile
   FROM node:18-alpine AS builder

   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .

   ARG NEXT_PUBLIC_API_URL
   ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

   RUN npm run build

   FROM node:18-alpine AS runner
   WORKDIR /app

   ENV NODE_ENV=production

   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static

   EXPOSE 3000
   ENV PORT=3000

   CMD ["node", "server.js"]
   ```

   **Update next.config.js for standalone:**
   ```javascript
   // frontend-next/next.config.js
   module.exports = {
     output: 'standalone', // For Docker
     reactStrictMode: true,
     images: {
       domains: ['covers.openlibrary.org'],
     },
   }
   ```

3. **Set Environment Variables**

   ```bash
   # Backend API URL
   NEXT_PUBLIC_API_URL=https://api.theshelf.app
   # or http://your-server-ip:8000 if no custom domain

   # Build args (if using Dockerfile)
   NEXT_PUBLIC_API_URL=https://api.theshelf.app
   ```

4. **Deploy**

   - Click "Deploy"
   - Wait for build (~2-3 minutes)
   - Check logs

5. **Configure Domain**

   - Domains → Add Domain
   - `theshelf.app` → Points to frontend
   - Enable SSL (automatic)

---

## Part 5: Update CORS and Environment

### Update Backend CORS

Once frontend is deployed, update backend environment variables:

```bash
# In Coolify → Backend → Environment Variables
CORS_ORIGINS=https://theshelf.app,https://www.theshelf.app
```

Redeploy backend for changes to take effect.

### Update Frontend API URL

If you set up custom domain for backend:

```bash
# In Coolify → Frontend → Environment Variables
NEXT_PUBLIC_API_URL=https://api.theshelf.app
```

Redeploy frontend.

---

## Part 6: DNS Configuration

### If Using Custom Domains

Point your domain DNS to Coolify server:

#### For CloudFlare / NameCheap / Other DNS

```
Type    Name              Value
----    ----              -----
A       theshelf.app      <your-server-ip>
A       www               <your-server-ip>
CNAME   api               theshelf.app
```

#### In Coolify

1. **Backend Domain**
   - Add domain: `api.theshelf.app`
   - Enable SSL (automatic Let's Encrypt)

2. **Frontend Domain**
   - Add domain: `theshelf.app`
   - Enable SSL

Wait for DNS propagation (~5-60 minutes).

---

## Part 7: Continuous Deployment

### Auto-Deploy on Git Push

Coolify supports webhook-based auto-deployment:

1. **In Coolify → Application → Git**
   - Enable "Auto Deploy on Git Push"
   - Copy webhook URL

2. **In GitHub → Settings → Webhooks**
   - Add webhook
   - Payload URL: (from Coolify)
   - Content type: `application/json`
   - Events: Just the push event

Now:
```bash
git push origin main
# → Coolify automatically deploys 🎉
```

---

## Part 8: Migration Checklist

### Pre-Migration

- [ ] Supabase project created
- [ ] pgvector extension enabled
- [ ] Database migrations run
- [ ] Test data seeded (optional)
- [ ] Coolify installed and accessible
- [ ] GitHub repository connected to Coolify

### Backend Migration

- [ ] Backend application created in Coolify
- [ ] Dockerfile or build config set
- [ ] Environment variables configured (DATABASE_URL, SECRET_KEY)
- [ ] Deployed successfully
- [ ] Health check passing (`/api/health`)
- [ ] Custom domain configured (optional)
- [ ] SSL enabled

### Frontend Migration

- [ ] Frontend application created in Coolify
- [ ] Build configuration set (Next.js standalone)
- [ ] Environment variable set (NEXT_PUBLIC_API_URL)
- [ ] Deployed successfully
- [ ] All pages loading
- [ ] Demo page working
- [ ] Custom domain configured (optional)
- [ ] SSL enabled

### Final Steps

- [ ] CORS updated in backend
- [ ] DNS records configured
- [ ] Auto-deployment webhook set up
- [ ] Monitoring configured
- [ ] Old Vercel deployment tested then removed

---

## Coolify vs Vercel Comparison

| Feature | Vercel | Coolify |
|---------|--------|---------|
| Hosting | Managed cloud | Self-hosted |
| Cost | Free tier + $20/mo | VPS cost only (~$5-20/mo) |
| Control | Limited | Full control |
| Privacy | Cloud provider | Your infrastructure |
| Scaling | Auto-scaling | Manual (Docker) |
| SSL | Automatic | Automatic (Let's Encrypt) |
| Domains | Easy | Easy (similar UX) |
| Deploy | Git push | Git push (webhook) |

---

## Cost Breakdown

### Old Setup (Vercel + Railway + Neon)
- Vercel: $0 (free tier)
- Railway: $5/mo (credit) → $20+ after
- Neon: $0 → $19/mo for more storage
- **Total: $0-5/mo → $40+/mo at scale**

### New Setup (Coolify + Supabase)
- VPS (2GB RAM): $5-12/mo (Hetzner/DigitalOcean/Vultr)
- Supabase: $0 (free tier) → $25/mo for Pro
- Domain: $10-15/year
- **Total: $5-12/mo → $30-40/mo at scale**

### Or Fully Self-Hosted
- Local server/old laptop: $0 (electricity only)
- Local Supabase: $0
- Dynamic DNS (free): $0
- **Total: ~$0/mo**

---

## Troubleshooting

### Backend Won't Start in Coolify

**Check logs:**
```bash
# In Coolify dashboard → Application → Logs
# Or SSH to server:
docker logs <container-name>
```

**Common issues:**
1. DATABASE_URL format incorrect
2. Port 8000 not exposed in Dockerfile
3. Missing dependencies in requirements.txt

### Frontend Build Fails

**Error: "Cannot find module 'next'"**

Solution:
```bash
# Ensure package.json is in frontend-next/
# Set Root Directory in Coolify to: frontend-next
```

### Can't Connect to Supabase

**Error: "Connection refused"**

Solutions:
1. Check DATABASE_URL has correct host (Session pooler uses port 6543)
2. Verify password is correct
3. Check Supabase project is not paused (free tier auto-pauses)
4. Whitelist Coolify server IP in Supabase if using IP restrictions

### SSL Not Working

**Browser shows "Not Secure"**

Solutions:
1. Wait 5-10 minutes for Let's Encrypt
2. Check DNS is propagated: `dig theshelf.app`
3. Verify domain points to correct IP
4. In Coolify → Domain settings → Force HTTPS

---

## Monitoring & Backups

### Coolify Monitoring

Built-in monitoring:
- CPU/Memory usage per container
- Request logs
- Error tracking
- Uptime monitoring

### Supabase Backups

**Automatic:**
- Daily backups (7 day retention on free tier)
- Point-in-time recovery (Pro tier)

**Manual backup:**
```bash
# From Supabase dashboard → Database → Backups → Download

# Or CLI:
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Application Logs

```bash
# SSH to Coolify server
docker logs -f <backend-container>
docker logs -f <frontend-container>

# Or use Coolify dashboard → Logs
```

---

## Rollback Plan

If migration has issues:

1. **Keep Vercel running** - Don't delete immediately
2. **Test Coolify thoroughly** before switching DNS
3. **Have database backups** before migration
4. **Document environment variables** from Vercel

**Quick rollback:**
1. Point DNS back to Vercel
2. Restore database from backup if needed
3. Debug Coolify issue offline

---

## Next Steps After Migration

### Week 1: Stabilization
- [ ] Monitor error rates
- [ ] Check performance (response times)
- [ ] Verify backups are working
- [ ] Test auto-deployment

### Week 2: Optimization
- [ ] Set up monitoring (Uptime Kuma, Grafana)
- [ ] Configure log aggregation
- [ ] Optimize Docker images (multi-stage builds)
- [ ] Set up database connection pooling

### Week 3: Enhancement
- [ ] Add staging environment
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Configure automatic SSL renewal
- [ ] Document runbooks

---

## Resources

- **Coolify Docs:** https://coolify.io/docs
- **Supabase Docs:** https://supabase.com/docs
- **Supabase CLI:** https://supabase.com/docs/guides/cli
- **Docker Best Practices:** https://docs.docker.com/develop/dev-best-practices/

---

## Support

**Coolify:**
- Discord: https://coollabs.io/discord
- GitHub: https://github.com/coollabsio/coolify

**Supabase:**
- Discord: https://discord.supabase.com
- Docs: https://supabase.com/docs

---

**Your self-hosted book platform is ready! 🎉**

This setup gives you:
- ✅ Full control over infrastructure
- ✅ Privacy-first hosting
- ✅ Cost-effective at scale
- ✅ Easy deployment (similar to Vercel UX)
- ✅ Professional SSL and domains
