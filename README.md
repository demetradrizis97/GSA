# Global News Monitor & Real-Time 3D News Globe

An interactive 3D orthographic globe visualizing live, real-time international news headlines and geopolitical events with zero dummy mock data. Built with an automated news aggregation pipeline from completely free public APIs, deployed via **GitHub Actions for GitHub Pages** (building from `dist/`) and backed by a **Cloudflare Proxy Backend** (Cloudflare Worker edge API and Node.js proxy server).

---

## Features

- **100% Real-Time News Feeds**: Replaces all dummy/synthetic mock data with live international news from public, free feeds.
- **Global News Sources**:
  - **BBC World News**: International top stories and reporting.
  - **Al Jazeera English**: Breaking alerts, Middle East, Asia, and global coverage.
  - **UN News**: Global peace, security, climate, and humanitarian dispatches.
  - **USGS Real-Time Earthquakes**: Live global seismic alerts with exact coordinates and magnitude.
  - **Deutsche Welle (DW) English**: European and world affairs.
  - **NPR World News**: In-depth global journalism.
  - **GDELT Project DOC 2.0**: Global event database tracking international articles and publications.
- **Interactive 3D News Globe**: Orthographic projection with drag rotation, zoom, country boundaries, and category filter chips (Conflict, Disasters, Diplomacy, Security, Tech, Economy).
- **Direct Story Links**: Click any headline marker to inspect details and jump directly to the verified news article with "Read Story on [Source] ↗".
- **Severity & Intensity Scoring**: Auto-classifies event severity (Low, Elevated, High, Critical) based on incident type and impact keywords.
- **Auto-Refreshing**: Periodically re-fetches breaking news every 5 minutes with a live indicator and manual refresh button.

---

## Deployment Setup

### 1. Frontend: GitHub Pages via GitHub Actions

The frontend builds production assets into `dist/` and is deployed using official GitHub Actions (`.github/workflows/deploy-frontend.yml`).

#### Required Repository Setting
1. Open your repository on GitHub: [`https://github.com/sft3hy/gsa`](https://github.com/sft3hy/gsa).
2. Go to **Settings** &rarr; **Pages**.
3. Under **Build and deployment** &rarr; **Source**, select **GitHub Actions** (instead of "Deploy from a branch").
4. Every push to `main` will automatically build `dist/` and deploy to `https://sft3hy.github.io/gsa/`.

---

### 2. Backend: Cloudflare Proxy Backend

The backend aggregates and geocodes public news feeds, caches results with Cloudflare edge caching, and exposes CORS-enabled `/api/news`, `/api/health`, and `/api/sources` endpoints.

#### Option A: Cloudflare Worker (Zero Servers Needed - Recommended)
The Worker runs serverless directly on Cloudflare's global edge network:
- Configured via `wrangler.toml` and `backend/worker.js`.
- Automated deployment via `.github/workflows/deploy-backend.yml`.

**Account Configuration Required:**
1. In the [Cloudflare Dashboard](https://dash.cloudflare.com/):
   - Go to **My Profile** &rarr; **API Tokens** &rarr; **Create Token**.
   - Select the template **Edit Cloudflare Workers**.
   - Copy the generated API token.
   - Copy your **Account ID** (found on the right sidebar of any domain overview or Workers page).
2. In your GitHub repository:
   - Go to **Settings** &rarr; **Secrets and variables** &rarr; **Actions** &rarr; **New repository secret**.
   - Add:
     - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token.
     - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID.
3. Push to `main` or trigger `.github/workflows/deploy-backend.yml` manually via GitHub Actions to deploy!

#### Option B: Standalone Node.js Server behind Cloudflare Tunnel / Orange-Cloud Proxy
If you prefer hosting the backend on a VM, container, or home server:
```bash
# Start backend server locally on port 8787
npm run backend
```
- Expose via **Cloudflare Tunnel (`cloudflared`)**:
  - Review template configuration in `backend/cloudflared.yml`.
  - Run: `cloudflared tunnel --config backend/cloudflared.yml run`
- Or point a proxied (Orange-cloud) DNS record to your server origin.

---

## Local Development

```bash
# 1. Install dependencies (if any)
npm install

# 2. Build the production bundle into dist/ (pre-fetches fresh live headlines)
npm run build

# 3. Serve the built dist/ locally
npm run serve

# 4. Or run the local backend news API server
npm run backend
```

Open `http://127.0.0.1:4173` to explore the globe.

---

## Available npm Scripts

- `npm run build`: Cleans `dist/`, fetches live real-time news snapshot into `dist/news-feed.json`, bundles assets and country boundaries.
- `npm run serve`: Serves `dist/` (or root) locally at `http://127.0.0.1:4173`.
- `npm run backend`: Runs the live news aggregation HTTP server locally at `http://localhost:8787`.
- `npm run fetch:news`: Fetches a fresh news snapshot from public feeds and updates `news-feed.json`.
- `npm run pack`: Packs project into text chunks for transfer.
- `npm run pack:consolidated`: Builds consolidated single-file code bundle.
- `npm run rebuild`: Rebuilds project from transferred text packs.
