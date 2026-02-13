# The Shelf - Deployment Guide

This guide covers deploying The Shelf to production using modern hosting platforms.

---

## Architecture Overview

```
┌─────────────────┐
│  Vercel (CDN)   │  ← Frontend (Next.js 14)
│  theshelf.app   │     Port 443 (HTTPS)
└────────┬────────┘
         │
         │ HTTPS API calls
         ▼
┌─────────────────┐
│  Railway/Fly.io │  ← Backend (FastAPI)
│  api.theshelf   │     Port 8000 → 443
└────────┬────────┘
         │
         │ PostgreSQL connection
         ▼
┌─────────────────┐
│  Neon/Supabase  │  ← Database (PostgreSQL 15+)
│  + pgvector     │     with pgvector extension
└─────────────────┘
```

---

## Prerequisites

Before deploying, ensure you have:

- ✅ GitHub repository with your code
- ✅ Vercel account (free tier works)
- ✅ Railway or Fly.io account (free tier works)
- ✅ Neon or Supabase account (free tier works)
- ✅ Domain name (optional but recommended)

---

## Step 1: Database Setup (Neon PostgreSQL)

### Why Neon?

- ✅ Free tier with 512 MB storage
- ✅ PostgreSQL 15+ with extensions support
- ✅ Autoscaling
- ✅ Automatic backups
- ✅ Easy pgvector setup

### Setup Instructions

1. **Create Neon Account**
   - Visit [neon.tech](https://neon.tech)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Name: `the-shelf`
   - Region: Choose closest to your backend
   - PostgreSQL version: 15 or higher

3. **Enable pgvector Extension**
   ```sql
   -- Connect to your database using Neon SQL Editor
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

4. **Get Connection String**
   - Go to project dashboard
   - Copy connection string (starts with `postgresql://`)
   - Format: `postgresql://user:password@host/dbname?sslmode=require`

5. **Save for Later**
   ```bash
   # You'll need this for backend deployment
   DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Alternative: Supabase

If you prefer Supabase:

1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → Database
3. Copy connection string (Transaction pooler)
4. Enable pgvector in SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

---

## Step 2: Backend Deployment (Railway)

### Why Railway?

- ✅ Free $5 credit/month (enough for small apps)
- ✅ Automatic deploys from GitHub
- ✅ Built-in environment variables
- ✅ Easy PostgreSQL connection
- ✅ Custom domains

### Setup Instructions

1. **Create Railway Account**
   - Visit [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your `the-shelf` repository
   - Railway will detect the Python backend

3. **Configure Build**

   Create `railway.json` in your repo root:
   ```json
   {
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "cd backend && pip install -r requirements.txt"
     },
     "deploy": {
       "startCommand": "cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT",
       "healthcheckPath": "/api/health",
       "healthcheckTimeout": 100
     }
   }
   ```

4. **Set Environment Variables**

   In Railway dashboard → Variables:
   ```bash
   DATABASE_URL=postgresql://...  # From Neon
   SECRET_KEY=<generate-random-256-bit-key>
   CORS_ORIGINS=https://your-vercel-app.vercel.app,https://yourdomain.com
   PORT=8000
   ```

   Generate SECRET_KEY:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

5. **Deploy**
   - Railway will automatically deploy
   - Wait for build to complete
   - Check logs for errors

6. **Get Backend URL**
   - Railway generates a URL like `the-shelf-production.up.railway.app`
   - Or set up custom domain (e.g., `api.theshelf.app`)

7. **Test Backend**
   ```bash
   curl https://your-backend.railway.app/api/health
   # Should return: {"status":"ok"}
   ```

### Alternative: Fly.io

If you prefer Fly.io:

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Create app: `fly launch`
4. Set secrets: `fly secrets set DATABASE_URL=...`
5. Deploy: `fly deploy`

---

## Step 3: Frontend Deployment (Vercel)

### Why Vercel?

- ✅ Built for Next.js (same company)
- ✅ Free tier (generous)
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Preview deployments
- ✅ Custom domains

### Setup Instructions

1. **Create Vercel Account**
   - Visit [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "New Project"
   - Import your `the-shelf` repository
   - Vercel detects Next.js automatically

3. **Configure Build Settings**

   - **Root Directory:** `frontend-next`
   - **Framework:** Next.js
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)

4. **Set Environment Variables**

   In Vercel dashboard → Settings → Environment Variables:
   ```bash
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ```

   Important: Must start with `NEXT_PUBLIC_` to be available in browser

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy
   - Takes ~2-3 minutes

6. **Get Frontend URL**
   - Vercel generates a URL like `the-shelf.vercel.app`
   - Or set up custom domain (e.g., `theshelf.app`)

7. **Test Frontend**
   - Visit your Vercel URL
   - Navigate to `/demo`
   - Try rating a book (will fail until database is set up)

---

## Step 4: Database Migration

Now that backend is deployed, run migrations:

### Option A: From Local Machine

```bash
# Set DATABASE_URL to your Neon database
export DATABASE_URL="postgresql://..."

# Navigate to backend
cd backend

# Install dependencies (if not already)
pip install -r requirements.txt

# Initialize Alembic (if first time)
alembic init alembic

# Configure alembic.ini
# Edit: sqlalchemy.url = (leave blank, we'll use env var)

# Generate migration
alembic revision --autogenerate -m "Add multi-dimensional ratings"

# Review migration file in backend/alembic/versions/

# Run migration
alembic upgrade head

# Verify
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'multi_dimensional_ratings';"
```

### Option B: Railway Shell

```bash
# From Railway dashboard
# Click on your service → Shell
# Then run:

cd backend
alembic upgrade head
```

### Seed Database (Optional)

```bash
# From local machine or Railway shell
cd backend
python -m app.seed
```

This creates demo data for testing.

---

## Step 5: Custom Domain Setup

### Frontend (Vercel)

1. Go to Vercel dashboard → Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `theshelf.app`)
4. Follow DNS configuration instructions:
   - Add A record: `76.76.21.21`
   - Add CNAME: `cname.vercel-dns.com`
5. Wait for DNS propagation (~5-60 minutes)
6. Vercel will automatically provision SSL certificate

### Backend (Railway)

1. Go to Railway dashboard → Settings → Domains
2. Click "Generate Domain" or "Custom Domain"
3. For custom domain (e.g., `api.theshelf.app`):
   - Add CNAME record pointing to Railway's domain
   - Railway handles SSL automatically

### Update CORS

After setting up custom domains, update backend environment variables:

```bash
# In Railway dashboard → Variables
CORS_ORIGINS=https://theshelf.app,https://www.theshelf.app
```

---

## Step 6: Monitoring & Logging

### Backend Monitoring (Railway)

- **Logs:** Railway dashboard → Logs tab (real-time)
- **Metrics:** Railway dashboard → Metrics (CPU, memory, network)
- **Alerts:** Set up in Settings → Notifications

### Frontend Monitoring (Vercel)

- **Analytics:** Vercel dashboard → Analytics
- **Logs:** Vercel dashboard → Deployments → Click deployment → Logs
- **Performance:** Built-in Core Web Vitals tracking

### Error Tracking (Sentry)

Optional but recommended:

1. Create account at [sentry.io](https://sentry.io)
2. Create new project (Python for backend, Next.js for frontend)
3. Add to backend:
   ```python
   # backend/app/main.py
   import sentry_sdk
   sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"))
   ```
4. Add environment variable in Railway: `SENTRY_DSN=https://...`
5. Add to frontend:
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard -i nextjs
   ```
6. Add environment variable in Vercel: `NEXT_PUBLIC_SENTRY_DSN=https://...`

---

## Step 7: SSL & Security

### SSL Certificates

- ✅ Vercel: Automatic SSL (Let's Encrypt)
- ✅ Railway: Automatic SSL
- ✅ Neon: SSL required by default

### Security Headers

Add to `next.config.js`:

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

### Backend Security

In `backend/app/main.py`, ensure:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    max_age=3600,
)
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Code pushed to GitHub
- [ ] All tests passing
- [ ] Environment variables documented
- [ ] Database schema finalized
- [ ] API endpoints tested locally
- [ ] Frontend connects to local backend

### Database

- [ ] Neon/Supabase project created
- [ ] pgvector extension enabled
- [ ] Connection string saved
- [ ] Migrations run
- [ ] Seed data loaded (optional)

### Backend

- [ ] Railway/Fly.io project created
- [ ] GitHub connected
- [ ] Environment variables set
- [ ] Build successful
- [ ] Health check passing (`/api/health`)
- [ ] API accessible via HTTPS

### Frontend

- [ ] Vercel project created
- [ ] Root directory set to `frontend-next`
- [ ] Environment variable `NEXT_PUBLIC_API_URL` set
- [ ] Build successful
- [ ] All pages load
- [ ] Demo page works

### Final

- [ ] Custom domains configured (optional)
- [ ] SSL certificates active
- [ ] CORS configured correctly
- [ ] Monitoring set up
- [ ] Error tracking enabled (optional)
- [ ] Performance tested
- [ ] Mobile responsive verified

---

## Costs

### Free Tier Limits

**Neon (Database):**
- ✅ 512 MB storage
- ✅ 1 project
- ✅ Autoscaling to zero (pay only when active)
- **Upgrade:** $19/month for more storage/projects

**Railway (Backend):**
- ✅ $5 credit/month (enough for ~500 hours)
- ✅ Auto-sleep after inactivity
- **Upgrade:** Pay-as-you-go after credit

**Vercel (Frontend):**
- ✅ 100 GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Custom domains
- **Upgrade:** $20/month for team features

### Estimated Monthly Cost

**MVP (< 1000 users):**
- Database: $0 (free tier)
- Backend: $0-5 (Railway credit)
- Frontend: $0 (free tier)
- **Total: $0-5/month**

**Growth (1000-10,000 users):**
- Database: $19 (Neon Pro)
- Backend: $20-50 (Railway)
- Frontend: $0 (still free)
- **Total: $40-70/month**

---

## Troubleshooting

### Database Connection Error

```
Error: connection to server failed
```

**Solutions:**
1. Check `DATABASE_URL` format includes `?sslmode=require`
2. Verify Neon project is not paused (free tier auto-pauses)
3. Check firewall rules (Neon allows all by default)
4. Test connection: `psql $DATABASE_URL -c "SELECT 1;"`

### Frontend Can't Reach Backend

```
Failed to fetch from http://localhost:8000
```

**Solutions:**
1. Check `NEXT_PUBLIC_API_URL` is set in Vercel
2. Ensure backend URL is HTTPS, not HTTP
3. Verify CORS settings in backend
4. Check browser console for CORS errors

### Build Failed on Vercel

```
Error: Cannot find module 'next'
```

**Solutions:**
1. Ensure `package.json` is in `frontend-next/`
2. Set root directory to `frontend-next` in Vercel settings
3. Check Node.js version (should be 18+)
4. Verify `npm install` runs locally

### Railway Build Timeout

```
Error: Build exceeded 10-minute limit
```

**Solutions:**
1. Reduce dependencies in `requirements.txt`
2. Use smaller Docker base image
3. Split into multiple services
4. Contact Railway for increased limit

---

## Continuous Deployment

Both Vercel and Railway support automatic deployments:

**Push to GitHub → Automatic Deploy**

1. Make changes locally
2. Commit: `git commit -m "Update feature"`
3. Push: `git push origin main`
4. Vercel and Railway automatically deploy
5. Check deployment logs for success

**Preview Deployments (Vercel):**
- Every PR gets a unique preview URL
- Test before merging to main

**Rollback:**
- Vercel: Dashboard → Deployments → Click previous → Promote
- Railway: Dashboard → Deployments → Redeploy previous

---

## Performance Optimization

### Frontend (Vercel)

1. **Image Optimization**
   ```tsx
   import Image from 'next/image';
   <Image src={book.cover_url} width={300} height={450} alt={book.title} />
   ```

2. **Font Optimization**
   - Already using `next/font` ✅

3. **Code Splitting**
   - Automatic with Next.js App Router ✅

### Backend (Railway)

1. **Database Connection Pooling**
   ```python
   # In app/database.py
   engine = create_async_engine(
       settings.database_url,
       pool_size=20,
       max_overflow=10,
   )
   ```

2. **Add Indexes**
   ```sql
   CREATE INDEX idx_ratings_book ON multi_dimensional_ratings(book_id);
   CREATE INDEX idx_fingerprints_total ON book_fingerprints(total_ratings);
   ```

3. **Enable pgvector Indexing**
   ```sql
   CREATE INDEX ON book_fingerprints USING ivfflat (fingerprint_vector);
   ```

---

## Next Steps After Deployment

1. **Test Everything**
   - Register a user
   - Rate a book
   - Check fingerprint updates
   - Test on mobile

2. **Set Up Analytics**
   - Vercel Analytics (built-in)
   - Google Analytics (optional)

3. **Monitor Performance**
   - Check Core Web Vitals in Vercel
   - Monitor API response times in Railway

4. **Gather Feedback**
   - Share with beta users
   - Iterate based on feedback

5. **Scale Gradually**
   - Monitor usage
   - Upgrade tiers when needed
   - Add caching (Redis) if needed

---

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Railway Docs:** https://docs.railway.app
- **Neon Docs:** https://neon.tech/docs
- **Next.js Docs:** https://nextjs.org/docs
- **FastAPI Docs:** https://fastapi.tiangolo.com

---

**Your app is now live! 🚀**

Visit your Vercel URL and start tracking books with multi-dimensional ratings!
