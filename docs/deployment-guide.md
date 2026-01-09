# Bookio Backend Deployment Guide

This guide walks you through deploying the Bookio backend to production with all necessary services.

## Overview

**Services needed:**
- **Backend Hosting**: Fly.io or Railway
- **Database**: MongoDB Atlas (free tier available)
- **Cache**: Upstash Redis (free tier available)
- **Secrets Management**: Doppler

## Step 1: Set Up MongoDB Atlas

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account

2. Create a new cluster:
   - Click "Build a Database"
   - Select "M0 Sandbox" (free tier)
   - Choose a cloud provider and region close to your backend hosting
   - Click "Create Cluster"

3. Set up database access:
   - Go to "Database Access" in the sidebar
   - Click "Add New Database User"
   - Create a username and password (save these!)
   - Set privileges to "Read and write to any database"

4. Set up network access:
   - Go to "Network Access" in the sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0) for simplicity
   - Or add specific IPs from your hosting provider

5. Get your connection string:
   - Go to "Database" → "Connect"
   - Select "Drivers"
   - Copy the connection string, it looks like:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your credentials
   - Add your database name: `mongodb+srv://...mongodb.net/bookio?retryWrites=true&w=majority`

## Step 2: Set Up Upstash Redis

1. Go to [upstash.com](https://upstash.com) and create a free account

2. Create a new Redis database:
   - Click "Create Database"
   - Name it "bookio-cache"
   - Choose a region close to your backend hosting
   - Select "TLS" for secure connections

3. Get your connection string:
   - Go to your database dashboard
   - Copy the "Redis URL" (starts with `rediss://`)
   - It looks like: `rediss://default:xxxxx@us1-xxxxx.upstash.io:6379`

## Step 3: Set Up Doppler

1. Install Doppler CLI:
   ```bash
   # macOS
   brew install dopplerhq/cli/doppler

   # Linux
   curl -sLf https://cli.doppler.com/install.sh | sh
   ```

2. Login to Doppler:
   ```bash
   doppler login
   ```

3. Create a new project:
   - Go to [dashboard.doppler.com](https://dashboard.doppler.com)
   - Click "Create Project"
   - Name it "bookio"

4. Add your secrets in the Doppler dashboard:
   - Go to your project → "dev" environment
   - Add these secrets:

   | Secret Name | Description | Example Value |
   |-------------|-------------|---------------|
   | `PORT` | Server port | `3000` |
   | `HOST` | Server host | `0.0.0.0` |
   | `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/bookio` |
   | `MONGO_DATABASE` | Database name | `bookio` |
   | `REDIS_URL` | Redis connection string | `rediss://default:xxx@xxx.upstash.io:6379` |
   | `SCRAPER_INTERVAL_HOURS` | How often to scrape | `6` |
   | `REAL_DEBRID_API_KEY` | Real-Debrid API key (optional) | `your-api-key` |
   | `NODE_ENV` | Environment | `production` |

5. Set up environments:
   - Clone secrets to "stg" (staging) and "prd" (production) environments
   - Update values as needed for each environment

6. Link your local project:
   ```bash
   cd backend
   doppler setup
   # Select your project and environment
   ```

7. Run locally with Doppler:
   ```bash
   doppler run -- bun run dev
   ```

## Step 4a: Deploy to Fly.io

1. Install Fly CLI:
   ```bash
   # macOS
   brew install flyctl

   # Or use the install script
   curl -L https://fly.io/install.sh | sh
   ```

2. Login to Fly:
   ```bash
   fly auth login
   ```

3. Create `fly.toml` in the backend directory:
   ```toml
   app = "bookio-api"
   primary_region = "sjc"  # Choose your region

   [build]
     dockerfile = "Dockerfile"

   [env]
     PORT = "8080"
     HOST = "0.0.0.0"
     NODE_ENV = "production"

   [http_service]
     internal_port = 8080
     force_https = true
     auto_stop_machines = true
     auto_start_machines = true
     min_machines_running = 0

   [[vm]]
     cpu_kind = "shared"
     cpus = 1
     memory_mb = 256
   ```

4. Create `Dockerfile` in the backend directory:
   ```dockerfile
   FROM oven/bun:1 as base
   WORKDIR /app

   # Install dependencies
   FROM base AS deps
   COPY package.json bun.lock* ./
   RUN bun install --frozen-lockfile --production

   # Build stage
   FROM base AS build
   COPY package.json bun.lock* ./
   RUN bun install --frozen-lockfile
   COPY . .
   RUN bun build src/index.ts --outdir=dist --target=bun

   # Production stage
   FROM base AS production
   COPY --from=deps /app/node_modules ./node_modules
   COPY --from=build /app/dist ./dist
   COPY --from=build /app/package.json ./

   EXPOSE 8080
   CMD ["bun", "run", "dist/index.js"]
   ```

5. Create `.dockerignore`:
   ```
   node_modules
   .git
   .env*
   *.log
   dist
   ```

6. Launch the app:
   ```bash
   fly launch --no-deploy
   ```

7. Set secrets from Doppler:
   ```bash
   # Option A: Set secrets manually
   fly secrets set MONGO_URI="mongodb+srv://..." MONGO_DATABASE="bookio" REDIS_URL="rediss://..."

   # Option B: Use Doppler integration
   doppler secrets download --no-file --format env | fly secrets import
   ```

8. Deploy:
   ```bash
   fly deploy
   ```

9. Check your deployment:
   ```bash
   fly status
   fly logs
   ```

10. Get your app URL:
    ```bash
    fly open
    # Opens https://bookio-api.fly.dev
    ```

## Step 4b: Deploy to Railway (Alternative)

1. Install Railway CLI:
   ```bash
   # macOS
   brew install railway

   # Or npm
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Create a new project:
   ```bash
   cd backend
   railway init
   ```

4. Add a `railway.json` (optional, for configuration):
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "DOCKERFILE",
       "dockerfilePath": "Dockerfile"
     },
     "deploy": {
       "startCommand": "bun run dist/index.js",
       "restartPolicyType": "ON_FAILURE"
     }
   }
   ```

5. Set environment variables:
   ```bash
   # Option A: Set via CLI
   railway variables set MONGO_URI="mongodb+srv://..."
   railway variables set MONGO_DATABASE="bookio"
   railway variables set REDIS_URL="rediss://..."
   railway variables set NODE_ENV="production"
   railway variables set PORT="3000"

   # Option B: Use Doppler integration in Railway dashboard
   # Go to your project → Variables → Add from Doppler
   ```

6. Deploy:
   ```bash
   railway up
   ```

7. Get your domain:
   ```bash
   railway domain
   # Or set a custom domain in the dashboard
   ```

## Step 5: Verify Deployment

1. Test the health endpoint:
   ```bash
   curl https://your-app-url.fly.dev/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

2. Test the manifest endpoint:
   ```bash
   curl https://your-app-url.fly.dev/addon/community/manifest.json
   ```

3. Test the catalog endpoint:
   ```bash
   curl https://your-app-url.fly.dev/addon/community/catalog/audiobook/popular.json
   ```

## Step 6: Set Up CI/CD (Optional)

### GitHub Actions with Fly.io

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Fly.io

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy to Fly
        working-directory: backend
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

Get your Fly API token:
```bash
fly tokens create deploy -x 999999h
```

Add it to GitHub repository secrets as `FLY_API_TOKEN`.

### GitHub Actions with Railway

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: railwayapp/railway-cli-action@v1
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}

      - name: Deploy
        working-directory: backend
        run: railway up
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `HOST` | No | `localhost` | Server host (use `0.0.0.0` in production) |
| `MONGO_URI` | Yes* | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGO_DATABASE` | No | `bookio` | MongoDB database name |
| `REDIS_URL` | Yes* | `redis://localhost:6379` | Redis connection string |
| `SCRAPER_INTERVAL_HOURS` | No | `6` | Scraper cron interval |
| `REAL_DEBRID_API_KEY` | No | - | Real-Debrid API key |
| `NODE_ENV` | No | `development` | Environment (`production` in prod) |

*Required for full functionality. The app runs with sample data without these.

## Troubleshooting

### MongoDB Connection Issues
- Ensure your IP is whitelisted in MongoDB Atlas Network Access
- Check that username/password are URL-encoded if they contain special characters
- Verify the connection string includes the database name

### Redis Connection Issues
- Upstash requires TLS - use `rediss://` not `redis://`
- Check that the password is correct

### Fly.io Issues
```bash
# Check logs
fly logs

# SSH into the machine
fly ssh console

# Check machine status
fly status
```

### Railway Issues
```bash
# Check logs
railway logs

# Check variables
railway variables
```

## Cost Estimation

**Free tier setup:**
- MongoDB Atlas M0: Free (512MB storage)
- Upstash Redis: Free (10,000 commands/day)
- Fly.io: Free tier includes 3 shared VMs
- Railway: $5 credit/month on free tier

**Production setup (low traffic):**
- MongoDB Atlas M2: ~$9/month
- Upstash Redis Pay-as-you-go: ~$0-5/month
- Fly.io: ~$5-10/month
- Total: ~$15-25/month
