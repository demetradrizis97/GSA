// Production Build Script: Compiles static assets into dist/ for GitHub Pages deployment
const fs = require("fs");
const path = require("path");
const { aggregateLiveNews } = require("../backend/news-service");

const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

async function build() {
  console.log("Starting build process for GitHub Pages...");

  // 1. Clean and create dist directory
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR, { recursive: true });
  console.log("Created clean dist/ directory.");

  // 2. Fetch fresh real-time news snapshot
  let newsData = null;
  try {
    console.log("Fetching live news headlines for pre-baked build snapshot...");
    newsData = await aggregateLiveNews();
    const snapshotPath = path.join(DIST_DIR, "news-feed.json");
    fs.writeFileSync(snapshotPath, JSON.stringify(newsData, null, 2), "utf8");
    // Also update root news-feed.json for local dev
    fs.writeFileSync(path.join(ROOT_DIR, "news-feed.json"), JSON.stringify(newsData, null, 2), "utf8");
    console.log(`Pre-baked ${newsData.count} live real-time headlines into dist/news-feed.json`);
  } catch (err) {
    console.warn("Live news fetch during build had an issue, checking existing snapshot:", err.message);
    const existing = path.join(ROOT_DIR, "news-feed.json");
    if (fs.existsSync(existing)) {
      fs.copyFileSync(existing, path.join(DIST_DIR, "news-feed.json"));
      console.log("Used existing news-feed.json snapshot.");
    }
  }

  // 3. Copy index.html
  fs.copyFileSync(path.join(ROOT_DIR, "index.html"), path.join(DIST_DIR, "index.html"));
  fs.copyFileSync(path.join(ROOT_DIR, "index.html"), path.join(DIST_DIR, "404.html"));
  console.log("Copied index.html and 404.html");

  // 4. Copy data-countries-110m.geojson
  const geojsonSrc = path.join(ROOT_DIR, "data-countries-110m.geojson");
  if (fs.existsSync(geojsonSrc)) {
    fs.copyFileSync(geojsonSrc, path.join(DIST_DIR, "data-countries-110m.geojson"));
    console.log("Copied country boundaries data-countries-110m.geojson");
  }

  // 5. Copy src/
  copyRecursiveSync(path.join(ROOT_DIR, "src"), path.join(DIST_DIR, "src"));
  console.log("Copied src/ directory.");

  // 6. Copy assets/
  copyRecursiveSync(path.join(ROOT_DIR, "assets"), path.join(DIST_DIR, "assets"));
  console.log("Copied assets/ directory.");

  // 7. Create .nojekyll for GitHub Pages
  fs.writeFileSync(path.join(DIST_DIR, ".nojekyll"), "");
  console.log("Created .nojekyll for GitHub Pages.");

  console.log("Build completed successfully into dist/!");
}

if (require.main === module) {
  build().catch(err => {
    console.error("Build failed:", err);
    process.exit(1);
  });
}

module.exports = { build };
