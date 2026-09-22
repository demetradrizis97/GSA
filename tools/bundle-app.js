const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const bundleDir = path.join(rootDir, "bundle");

const skipNames = new Set([
  ".git",
  "node_modules",
  "bundle",
  "transfer",
  ".DS_Store"
]);

const imageExtensions = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp"
]);

function walk(currentDir, files) {
  fs.readdirSync(currentDir).forEach((name) => {
    if (skipNames.has(name)) {
      return;
    }

    const absolutePath = path.join(currentDir, name);
    const relativePath = path.relative(rootDir, absolutePath);
    const stats = fs.statSync(absolutePath);

    if (stats.isDirectory()) {
      walk(absolutePath, files);
      return;
    }

    files.push(relativePath.replace(/\\/g, "/"));
  });
}

function ensureCleanDirectory(directory) {
  if (fs.existsSync(directory)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  fs.mkdirSync(directory, { recursive: true });
}

console.log("Starting bundle process...");
const files = [];
walk(rootDir, files);
ensureCleanDirectory(bundleDir);

files.forEach((relPath) => {
  const source = path.join(rootDir, relPath);
  const ext = path.extname(relPath).toLowerCase();
  
  let targetRelPath = relPath;
  if (!imageExtensions.has(ext)) {
    targetRelPath += ".txt";
  }
  
  const target = path.join(bundleDir, targetRelPath);
  const parent = path.dirname(target);
  
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }
  
  fs.copyFileSync(source, target);
});

// Create rebuild script
const rebuildScriptContent = `
const fs = require("fs");
const path = require("path");

const sourceDir = __dirname;
const outputDir = path.resolve(process.argv[2] || path.join(sourceDir, "rebuilt-project"));

const imageExtensions = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp"
]);

function walk(currentDir, callback) {
  fs.readdirSync(currentDir).forEach((name) => {
    const absolutePath = path.join(currentDir, name);
    const stats = fs.statSync(absolutePath);

    if (stats.isDirectory()) {
      walk(absolutePath, callback);
      return;
    }

    callback(absolutePath);
  });
}

console.log("Rebuilding project...");

walk(sourceDir, (filePath) => {
  const relPath = path.relative(sourceDir, filePath);
  if (relPath === "rebuild-bundle.js" || relPath === "bundle.zip") return;

  let targetRelPath = relPath;
  if (relPath.endsWith(".txt")) {
    // Check if it's actually a renamed file (not an image)
    // In our scheme, all non-images were renamed to .txt
    targetRelPath = relPath.slice(0, -4);
  }

  const targetPath = path.join(outputDir, targetRelPath);
  const parent = path.dirname(targetPath);

  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true });
  }

  fs.copyFileSync(filePath, targetPath);
});

console.log("Project rebuilt into " + outputDir);
`;

fs.writeFileSync(path.join(bundleDir, "rebuild-bundle.js"), rebuildScriptContent);

console.log(`Packed ${files.length} files into ${bundleDir}`);
