// Cloudflare Worker: Serverless Edge API for Live News Globe
// Deploys to Cloudflare Edge Network with global sub-50ms caching.

import { aggregateLiveNews } from "./news-service.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=180, s-maxage=300"
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    // Use Cloudflare Cache API for edge caching
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);

    // Health check endpoint
    if (pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          status: "healthy",
          runtime: "cloudflare-workers",
          colo: request.cf?.colo || "unknown",
          country: request.cf?.country || "unknown",
          timestamp: new Date().toISOString()
        }),
        { headers: CORS_HEADERS }
      );
    }

    if (pathname === "/api/news" || pathname === "/api/reports" || pathname === "/") {
      // Check Cloudflare edge cache first
      let cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        // Return cached response with header indicating edge hit
        const res = new Response(cachedResponse.body, cachedResponse);
        res.headers.set("X-Cache-Status", "HIT");
        return res;
      }

      try {
        const data = await aggregateLiveNews();
        const filterCategory = url.searchParams.get("category");
        let reports = data.reports;
        if (filterCategory) {
          reports = reports.filter(r => r.category.toLowerCase() === filterCategory.toLowerCase());
        }

        const body = JSON.stringify({
          ...data,
          count: reports.length,
          reports,
          edgeLocation: request.cf?.colo || "global",
          edgeCountry: request.cf?.country || "global"
        });

        const response = new Response(body, {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            "X-Cache-Status": "MISS"
          }
        });

        // Cache on Cloudflare Edge for 5 minutes
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch live news feeds", details: err.message }),
          { status: 502, headers: CORS_HEADERS }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: CORS_HEADERS
    });
  }
};
