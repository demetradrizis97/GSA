const fs = require("fs");
const path = require("path");

const ESSENTIAL_FILES = [
  "index.html",
  "package.json",
  "data-countries-110m.geojson",
  "src/main.js",
  "src/styles.css",
  "tools/serve.js",
  "tools/pack-project.js",
  "tools/bundle-consolidated.js",
  "tools/rebuild-project.js",
  "tools/package-shared.js",
  "assets/blue-marble-2048.png",
  "assets/osm-world-z4-4096.png",
  "assets/vendor/mgrs.min.js"
];

const OUTPUT_FILE_LIMIT = 10;
const FIXED_OUTPUT_FILES = ["manifest.json.txt", "rebuild-project.txt"];
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico"]);

function ensureCleanDirectory(directory) {
  if (fs.existsSync(directory)) {
    removeDirectoryContents(directory);
    fs.rmdirSync(directory);
  }
  fs.mkdirSync(directory, { recursive: true });
}

function removeDirectoryContents(directory) {
  fs.readdirSync(directory).forEach((name) => {
    const entryPath = path.join(directory, name);
    const stats = fs.statSync(entryPath);

    if (stats.isDirectory()) {
      removeDirectoryContents(entryPath);
      fs.rmdirSync(entryPath);
      return;
    }

    fs.unlinkSync(entryPath);
  });
}

function collectFiles(rootDir) {
  return ESSENTIAL_FILES.map((relPath) => {
    const absolutePath = path.join(rootDir, relPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Required file is missing: ${relPath}`);
    }

    return {
      path: relPath,
      data: fs.readFileSync(absolutePath).toString("base64")
    };
  });
}

function getEssentialFileEntries(rootDir) {
  return ESSENTIAL_FILES.map((relPath) => {
    const absolutePath = path.join(rootDir, relPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Required file is missing: ${relPath}`);
    }

    return {
      path: relPath,
      absolutePath,
      isImage: IMAGE_EXTENSIONS.has(path.extname(relPath).toLowerCase())
    };
  });
}

function splitIntoChunks(payload, maxChunkCount) {
  const chunkSize = Math.max(1, Math.ceil(payload.length / maxChunkCount));
  const chunks = [];

  for (let offset = 0; offset < payload.length; offset += chunkSize) {
    chunks.push(payload.slice(offset, offset + chunkSize));
  }

  return {
    chunks,
    chunkSize
  };
}

function writeTextBundle(rootDir, outputDir) {
  const maxChunkCount = OUTPUT_FILE_LIMIT - FIXED_OUTPUT_FILES.length;
  if (maxChunkCount < 1) {
    throw new Error("Output file limit is too small for the required bundle files.");
  }

  const files = collectFiles(rootDir);
  const payload = Buffer.from(JSON.stringify({ version: 1, files }), "utf8").toString("base64");
  const { chunks, chunkSize } = splitIntoChunks(payload, maxChunkCount);

  ensureCleanDirectory(outputDir);

  const chunkNames = chunks.map((chunk, index) => {
    const name = `bundle.part-${String(index + 1).padStart(3, "0")}.txt`;
    fs.writeFileSync(path.join(outputDir, name), chunk);
    return name;
  });

  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    fileCount: files.length,
    includedFiles: ESSENTIAL_FILES,
    chunkCount: chunkNames.length,
    chunkSize,
    outputFileLimit: OUTPUT_FILE_LIMIT,
    outputFileCount: chunkNames.length + FIXED_OUTPUT_FILES.length,
    chunks: chunkNames
  };

  fs.writeFileSync(
    path.join(outputDir, "manifest.json.txt"),
    JSON.stringify(manifest, null, 2)
  );
  fs.copyFileSync(
    path.join(rootDir, "tools", "rebuild-project.js"),
    path.join(outputDir, "rebuild-project.txt")
  );

  return {
    fileCount: files.length,
    chunkCount: chunkNames.length,
    chunkSize,
    outputFileCount: manifest.outputFileCount
  };
}

module.exports = {
  ESSENTIAL_FILES,
  FIXED_OUTPUT_FILES,
  IMAGE_EXTENSIONS,
  OUTPUT_FILE_LIMIT,
  ensureCleanDirectory,
  getEssentialFileEntries,
  writeTextBundle
};
