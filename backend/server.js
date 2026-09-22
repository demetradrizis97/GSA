// Standalone Node.js Backend Server for Real-Time News API
// Can be run locally, in Docker, or behind Cloudflare Orange-Cloud Proxy / Cloudflare Tunnel.

const http = require("http");
const { aggregateLiveNews } = require("./news-service");

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

let cache = {
  data: null,
  expiresAt: 0,
  isFetching: false
};

async function getCachedNews() {
  const now = Date.now();
  if (cache.data && now < cache.expiresAt) {
    return cache.data;
  }

  if (cache.isFetching && cache.data) {
    return cache.data; // serve stale while revalidating
  }

  cache.isFetching = true;
  try {
    const fresh = await aggregateLiveNews();
    cache.data = fresh;
    cache.expiresAt = now + CACHE_TTL_MS;
    return fresh;
  } catch (err) {
    console.error("News aggregation failed:", err);
    if (cache.data) return cache.data;
    throw err;
  } finally {
    cache.isFetching = false;
  }
}

const server = http.createServer(async (req, res) => {
  // CORS Headers for cross-origin requests (GitHub Pages or local frontend)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=180, s-maxage=300"
  };

  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // Cloudflare Proxy info headers logging
  const clientIp = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const rayId = req.headers["cf-ray"] || "direct";

  if (pathname === "/api/news" || pathname === "/api/reports" || pathname === "/") {
    try {
      const data = await getCachedNews();
      // Optional category filtering via ?category=CONFLICT
      const filterCategory = url.searchParams.get("category");
      let reports = data.reports;
      if (filterCategory) {
        reports = reports.filter(r => r.category.toLowerCase() === filterCategory.toLowerCase());
      }

      res.writeHead(200, headers);
      res.end(JSON.stringify({
        ...data,
        count: reports.length,
        reports,
        cfRay: rayId
      }));
    } catch (err) {
      res.writeHead(502, headers);
      res.end(JSON.stringify({ error: "Failed to aggregate live news", message: err.message }));
    }
    return;
  }

  if (pathname === "/api/health") {
    res.writeHead(200, headers);
    res.end(JSON.stringify({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      cachedReports: cache.data ? cache.data.count : 0,
      clientIp,
      cfRay: rayId
    }));
    return;
  }

  if (pathname === "/api/sources") {
    try {
      const data = await getCachedNews();
      res.writeHead(200, headers);
      res.end(JSON.stringify({
        timestamp: data.timestamp,
        sources: data.sources,
        totalItems: data.count
      }));
    } catch (err) {
      res.writeHead(502, headers);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404, headers);
  res.end(JSON.stringify({ error: "Endpoint not found" }));
});

server.listen(PORT, HOST, () => {
  console.log(`Live News Backend Server running at http://${HOST}:${PORT}`);
  console.log(`Endpoints:`);
  console.log(` - GET /api/news     (Real-time aggregated headlines)`);
  console.log(` - GET /api/health   (Health check & Cloudflare proxy headers)`);
  console.log(` - GET /api/sources  (Connected news providers summary)`);
  // Warm cache immediately on startup
  getCachedNews().catch(console.warn);
});
