const fs = require("fs");
const path = require("path");
const https = require("https");
const { spawnSync } = require("child_process");

const outputDir = path.resolve(__dirname, "..", "assets", "osm-z4");
const finalPath = path.resolve(__dirname, "..", "assets", "osm-world-z4-4096.png");
const size = 16;

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function tileName(x, y) {
  return `${String(y).padStart(2, "0")}_${String(x).padStart(2, "0")}.png`;
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    const request = https.get(
      url,
      {
        headers: {
          "User-Agent": "reports-map/0.1 local-dev"
        }
      },
      (response) => {
        if (response.statusCode !== 200) {
          file.close(() => fs.unlink(destination, () => {}));
          reject(new Error(`Tile ${url} returned ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on("finish", () => file.close(resolve));
      }
    );

    request.on("error", (error) => {
      file.close(() => fs.unlink(destination, () => {}));
      reject(error);
    });

    file.on("error", (error) => {
      file.close(() => fs.unlink(destination, () => {}));
      reject(error);
    });
  });
}

async function downloadWithRetry(url, destination, attempts) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await download(url, destination);
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  throw lastError;
}

async function main() {
  ensureDirectory(outputDir);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const destination = path.join(outputDir, tileName(x, y));
      if (fs.existsSync(destination)) {
        continue;
      }

      const url = `https://tile.openstreetmap.org/4/${x}/${y}.png`;
      await downloadWithRetry(url, destination, 4);
    }
  }

  for (let y = 0; y < size; y += 1) {
    const rowInputs = [];
    for (let x = 0; x < size; x += 1) {
      rowInputs.push(path.join(outputDir, tileName(x, y)));
    }

    const rowPath = path.join(outputDir, `row-${String(y).padStart(2, "0")}.png`);
    const rowResult = spawnSync("magick", [...rowInputs, "+append", rowPath], {
      stdio: "inherit"
    });

    if (rowResult.status !== 0) {
      throw new Error(`Failed to assemble row ${y}`);
    }
  }

  const rowPaths = [];
  for (let y = 0; y < size; y += 1) {
    rowPaths.push(path.join(outputDir, `row-${String(y).padStart(2, "0")}.png`));
  }

  const finalResult = spawnSync("magick", [...rowPaths, "-append", finalPath], {
    stdio: "inherit"
  });

  if (finalResult.status !== 0) {
    throw new Error("Failed to assemble final OSM mosaic");
  }

  console.log(`Built ${finalPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
