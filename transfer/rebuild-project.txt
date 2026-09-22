const fs = require("fs");
const path = require("path");

const sourceDir = process.cwd();
const outputDir = path.resolve(process.argv[2] || path.join(sourceDir, "rebuilt-project"));
const manifestPath = path.join(sourceDir, "manifest.json.txt");

if (!fs.existsSync(manifestPath)) {
  console.error("manifest.json.txt was not found in the current directory.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (!Array.isArray(manifest.chunks) || !manifest.chunks.length) {
  console.error("manifest.json.txt does not describe any bundle chunks.");
  process.exit(1);
}

const chunks = manifest.chunks
  .map((name) => {
    const chunkPath = path.join(sourceDir, name);
    if (!fs.existsSync(chunkPath)) {
      throw new Error(`Missing chunk file: ${name}`);
    }
    return fs.readFileSync(chunkPath, "utf8");
  })
  .join("");

const payload = JSON.parse(Buffer.from(chunks, "base64").toString("utf8"));
if (!Array.isArray(payload.files) || !payload.files.length) {
  console.error("Bundle payload does not contain any files.");
  process.exit(1);
}

payload.files.forEach((entry) => {
  const target = path.join(outputDir, entry.path);
  const parent = path.dirname(target);
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
  fs.writeFileSync(target, Buffer.from(entry.data, "base64"));
});

console.log(`Rebuilt ${payload.files.length} files into ${outputDir}`);
