// Standalone tool to fetch live news snapshot and save to news-feed.json
const fs = require("fs");
const path = require("path");
const { aggregateLiveNews } = require("../backend/news-service");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT_DIR, "news-feed.json");

async function main() {
  console.log("Fetching live news snapshot from public feeds...");
  try {
    const data = await aggregateLiveNews();
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), "utf8");
    console.log(`Successfully saved ${data.count} live reports to ${OUTPUT_PATH}`);
    return data;
  } catch (err) {
    console.error("Failed to fetch news snapshot:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
