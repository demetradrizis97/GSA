// Multi-Source Real-Time News Aggregation Service
// Fetches live headlines from public, 100% free unauthenticated APIs:
// - GDELT Project DOC 2.0 API
// - USGS Real-Time Global Seismic Alerts
// - BBC World News RSS
// - Al Jazeera English RSS
// - UN News (Peace, Security & Humanitarian) RSS
// - NPR World News RSS
// - Deutsche Welle (DW) English RSS

const { geolocateText, scoreHeadline, categorizeHeadline } = require("./geocoder");

// Helper to decode HTML entities
function decodeHtml(html) {
  if (!html) return "";
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

// Resilient regex-based XML/RSS parser (works identically in Node and Cloudflare Workers)
function parseRssXml(xml, sourceName, defaultCategory = "WORLD") {
  const items = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (let i = 0; i < itemMatches.length; i++) {
    const itemXml = itemMatches[i];

    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i);
    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i) ||
                      itemXml.match(/<link\s+href="([^"]+)"/i);
    const pubDateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/pubDate>/i) ||
                         itemXml.match(/<dc:date>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/dc:date>/i);

    let rawTitle = titleMatch ? (titleMatch[1] || titleMatch[2] || "") : "";
    let rawDesc = descMatch ? (descMatch[1] || descMatch[2] || "") : "";
    let link = linkMatch ? (linkMatch[1] || linkMatch[2] || "") : "";
    let pubDate = pubDateMatch ? (pubDateMatch[1] || pubDateMatch[2] || "") : "";

    // Strip HTML tags from description and title
    const title = decodeHtml(rawTitle.replace(/<[^>]+>/g, "").trim());
    const summary = decodeHtml(rawDesc.replace(/<[^>]+>/g, "").trim());
    link = decodeHtml(link.trim());

    if (!title || title.length < 5) continue;
    // Skip feed headers or generic podcast promos if any
    if (/^podcast:|^subscribe to/i.test(title)) continue;

    let timestamp = new Date().toISOString();
    if (pubDate) {
      const parsedTime = Date.parse(pubDate.trim());
      if (!Number.isNaN(parsedTime)) {
        timestamp = new Date(parsedTime).toISOString();
      }
    }

    const geo = geolocateText(title, summary);
    const intensity = scoreHeadline(title);
    const category = categorizeHeadline(title) || defaultCategory;

    items.push({
      id: `news-${sourceName.toLowerCase().replace(/[^a-z0-9]/g, "")}-${i}-${Date.now().toString(36)}`,
      title,
      summary: summary || title,
      lat: Number(geo.lat.toFixed(4)),
      lon: Number(geo.lon.toFixed(4)),
      country: geo.country,
      region: geo.region,
      theater: geo.city ? `${geo.city} · ${geo.country}` : `${geo.region} · ${geo.country}`,
      category,
      intensityScore: intensity.score,
      intensityLevel: intensity.level,
      source: sourceName,
      url: link,
      timestamp
    });
  }

  return items;
}

// 1. Fetch BBC World News
async function fetchBbcNews() {
  try {
    const res = await fetch("https://feeds.bbci.co.uk/news/world/rss.xml", {
      headers: { "User-Agent": "Mozilla/5.0 (GlobalNewsMonitor/1.0)" }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssXml(xml, "BBC World News", "WORLD");
  } catch (err) {
    console.warn("BBC News fetch failed:", err.message);
    return [];
  }
}

// 2. Fetch Al Jazeera English News
async function fetchAlJazeeraNews() {
  try {
    const res = await fetch("https://www.aljazeera.com/xml/rss/all.xml", {
      headers: { "User-Agent": "Mozilla/5.0 (GlobalNewsMonitor/1.0)" }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssXml(xml, "Al Jazeera", "WORLD");
  } catch (err) {
    console.warn("Al Jazeera fetch failed:", err.message);
    return [];
  }
}

// 3. Fetch UN News (Security, Peace, Humanitarian)
async function fetchUnNews() {
  try {
    const res = await fetch("https://news.un.org/feed/subscribe/en/news/all/rss.xml", {
      headers: { "User-Agent": "Mozilla/5.0 (GlobalNewsMonitor/1.0)" }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssXml(xml, "UN News", "DIPLOMACY");
  } catch (err) {
    console.warn("UN News fetch failed:", err.message);
    return [];
  }
}

// 4. Fetch NPR News
async function fetchNprNews() {
  try {
    const res = await fetch("https://feeds.npr.org/1004/rss.xml", {
      headers: { "User-Agent": "Mozilla/5.0 (GlobalNewsMonitor/1.0)" }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssXml(xml, "NPR News", "WORLD");
  } catch (err) {
    console.warn("NPR News fetch failed:", err.message);
    return [];
  }
}

// 5. Fetch Deutsche Welle News
async function fetchDwNews() {
  try {
    const res = await fetch("https://rss.dw.com/rdf/rss-en-all", {
      headers: { "User-Agent": "Mozilla/5.0 (GlobalNewsMonitor/1.0)" }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssXml(xml, "Deutsche Welle", "WORLD");
  } catch (err) {
    console.warn("DW News fetch failed:", err.message);
    return [];
  }
}

// 6. Fetch USGS Global Real-Time Earthquakes (Real physical coordinates)
async function fetchUsgsEvents() {
  try {
    const res = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson", {
      headers: { "User-Agent": "Mozilla/5.0 (GlobalNewsMonitor/1.0)" }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.features)) return [];

    // Filter earthquakes of magnitude >= 3.0 to keep interesting global events
    const significant = data.features.filter(f => (f.properties?.mag || 0) >= 3.0).slice(0, 30);

    return significant.map((f, i) => {
      const mag = f.properties.mag || 3.0;
      const place = f.properties.place || "Global seismic event";
      const time = f.properties.time ? new Date(f.properties.time).toISOString() : new Date().toISOString();
      const coords = f.geometry?.coordinates || [0, 0];
      const url = f.properties.url || "https://earthquake.usgs.gov";

      let level = "low";
      let score = Math.round(mag * 12);
      if (mag >= 6.0) {
        level = "critical";
        score = Math.min(100, Math.round(75 + mag * 3));
      } else if (mag >= 5.0) {
        level = "high";
        score = Math.round(60 + (mag - 5) * 15);
      } else if (mag >= 4.0) {
        level = "elevated";
        score = Math.round(40 + (mag - 4) * 20);
      }

      return {
        id: `usgs-${f.id || i}-${Date.now().toString(36)}`,
        title: `M ${mag.toFixed(1)} Earthquake - ${place}`,
        summary: `USGS monitored seismic alert. Magnitude ${mag.toFixed(1)} recorded at depth ${coords[2] || 10}km. Event details verified by USGS National Earthquake Information Center.`,
        lat: Number(coords[1].toFixed(4)),
        lon: Number(coords[0].toFixed(4)),
        country: place.split(",").pop().trim(),
        region: place,
        theater: `Seismic Monitor · ${place}`,
        category: "DISASTER",
        intensityScore: score,
        intensityLevel: level,
        source: "USGS Earthquakes",
        url,
        timestamp: time
      };
    });
  } catch (err) {
    console.warn("USGS fetch failed:", err.message);
    return [];
  }
}

// 7. Fetch GDELT Project DOC 2.0 API (Global News Database)
async function fetchGdeltNews() {
  try {
    const url = "https://api.gdeltproject.org/api/v2/doc/doc?query=world&mode=artlist&format=json&maxrecords=40&sort=datedesc";
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (GlobalNewsMonitor/1.0)" }
    });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text || text.trim().startsWith("<")) return []; // GDELT can return HTML error page occasionally
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.articles)) return [];

    return data.articles.map((art, i) => {
      const title = decodeHtml(art.title || "");
      const countryMention = art.sourcecountry || "";
      const geo = geolocateText(title, countryMention);
      const intensity = scoreHeadline(title);
      const category = categorizeHeadline(title);

      let timestamp = new Date().toISOString();
      if (art.seendate) {
        // format: YYYYMMDDTHHMMSSZ
        try {
          const s = art.seendate;
          const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`;
          if (!Number.isNaN(Date.parse(iso))) timestamp = iso;
        } catch (_) {}
      }

      return {
        id: `gdelt-${i}-${Date.now().toString(36)}`,
        title,
        summary: `Reported by ${art.domain || "international wire"}. Location: ${geo.country}. Language: ${art.language || "English"}.`,
        lat: Number(geo.lat.toFixed(4)),
        lon: Number(geo.lon.toFixed(4)),
        country: geo.country,
        region: geo.region,
        theater: `${geo.region} · ${geo.country}`,
        category,
        intensityScore: intensity.score,
        intensityLevel: intensity.level,
        source: art.domain ? `GDELT (${art.domain})` : "GDELT Global News",
        url: art.url || "",
        timestamp
      };
    });
  } catch (err) {
    console.warn("GDELT fetch failed:", err.message);
    return [];
  }
}

/**
 * Fetch and aggregate news from all public sources
 */
async function aggregateLiveNews() {
  console.log("Fetching real-time news from public feeds...");

  const results = await Promise.allSettled([
    fetchBbcNews(),
    fetchAlJazeeraNews(),
    fetchUnNews(),
    fetchUsgsEvents(),
    fetchDwNews(),
    fetchNprNews(),
    fetchGdeltNews()
  ]);

  const allReports = [];
  const sourcesSummary = {};

  results.forEach((res, idx) => {
    const names = ["BBC", "Al Jazeera", "UN News", "USGS", "DW", "NPR", "GDELT"];
    const name = names[idx];
    if (res.status === "fulfilled" && Array.isArray(res.value)) {
      sourcesSummary[name] = res.value.length;
      allReports.push(...res.value);
    } else {
      sourcesSummary[name] = 0;
      console.warn(`Source ${name} failed or empty:`, res.reason);
    }
  });

  // Deduplicate by similar titles
  const seenTitles = new Set();
  const deduplicated = [];

  for (const report of allReports) {
    const key = report.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 45);
    if (!key || seenTitles.has(key)) continue;
    seenTitles.add(key);
    deduplicated.push(report);
  }

  // Sort by timestamp descending (most recent first)
  deduplicated.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  console.log(`Aggregated ${deduplicated.length} live reports from ${Object.keys(sourcesSummary).length} sources:`, sourcesSummary);

  return {
    timestamp: new Date().toISOString(),
    count: deduplicated.length,
    sources: sourcesSummary,
    reports: deduplicated
  };
}

module.exports = {
  aggregateLiveNews,
  parseRssXml,
  fetchBbcNews,
  fetchAlJazeeraNews,
  fetchUnNews,
  fetchUsgsEvents,
  fetchDwNews,
  fetchNprNews,
  fetchGdeltNews
};
