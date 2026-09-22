const fs = require("fs");
const path = require("path");
const {
  ensureCleanDirectory,
  getEssentialFileEntries
} = require("./package-shared");

const rootDir = path.resolve(__dirname, "..");
const bundleDir = path.join(rootDir, "consolidated-bundle");
const CODE_BUNDLE_NAME = "code-bundle.json.txt";
const MANIFEST_NAME = "manifest.json.txt";
const REBUILD_NAME = "rebuild-project.txt";

function flattenImagePath(filePath) {
  return `IMG__${filePath.replace(/\//g, "__")}`;
}

function createRebuildScript() {
  return [
    'const fs = require("fs");',
    'const path = require("path");',
    "",
    "const sourceDir = process.cwd();",
    'const outputDir = path.resolve(process.argv[2] || path.join(sourceDir, "rebuilt-project"));',
    `const manifestPath = path.join(sourceDir, "${MANIFEST_NAME}");`,
    `const codeBundlePath = path.join(sourceDir, "${CODE_BUNDLE_NAME}");`,
    "",
    "if (!fs.existsSync(manifestPath)) {",
    `  console.error("${MANIFEST_NAME} was not found in the current directory.");`,
    "  process.exit(1);",
    "}",
    "",
    "if (!fs.existsSync(codeBundlePath)) {",
    `  console.error("${CODE_BUNDLE_NAME} was not found in the current directory.");`,
    "  process.exit(1);",
    "}",
    "",
    'const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));',
    "if (!Array.isArray(manifest.images)) {",
    `  console.error("${MANIFEST_NAME} does not list bundled images.");`,
    "  process.exit(1);",
    "}",
    "",
    'const codeBundle = JSON.parse(fs.readFileSync(codeBundlePath, "utf8"));',
    "if (!codeBundle.files || typeof codeBundle.files !== \"object\") {",
    `  console.error("${CODE_BUNDLE_NAME} does not contain any bundled code files.");`,
    "  process.exit(1);",
    "}",
    "",
    "Object.keys(codeBundle.files).forEach((originalPath) => {",
    "  const target = path.join(outputDir, originalPath);",
    "  const parent = path.dirname(target);",
    "  if (!fs.existsSync(parent)) {",
    "    fs.mkdirSync(parent, { recursive: true });",
    "  }",
    '  fs.writeFileSync(target, codeBundle.files[originalPath], "utf8");',
    "});",
    "",
    "manifest.images.forEach((entry) => {",
    "  const source = path.join(sourceDir, entry.flatName);",
    "  if (!fs.existsSync(source)) {",
    '    throw new Error(`Missing bundled image: ${entry.flatName}`);',
    "  }",
    '  const target = path.join(outputDir, entry.originalPath);',
    "  const parent = path.dirname(target);",
    "  if (!fs.existsSync(parent)) {",
    "    fs.mkdirSync(parent, { recursive: true });",
    "  }",
    "  fs.copyFileSync(source, target);",
    "});",
    "",
    "const totalFiles = Object.keys(codeBundle.files).length + manifest.images.length;",
    'console.log(`Rebuilt ${totalFiles} files into ${outputDir}`);',
    ""
  ].join("\n");
}

const entries = getEssentialFileEntries(rootDir);
ensureCleanDirectory(bundleDir);

const codeFiles = {};
const manifest = {
  createdAt: new Date().toISOString(),
  fileCount: entries.length,
  codeBundle: CODE_BUNDLE_NAME,
  rebuildScript: REBUILD_NAME,
  images: []
};

entries.forEach((entry) => {
  if (entry.isImage) {
    const flatName = flattenImagePath(entry.path);
    fs.copyFileSync(entry.absolutePath, path.join(bundleDir, flatName));
    manifest.images.push({
      originalPath: entry.path,
      flatName
    });
  } else {
    codeFiles[entry.path] = fs.readFileSync(entry.absolutePath, "utf8");
  }
});

fs.writeFileSync(
  path.join(bundleDir, CODE_BUNDLE_NAME),
  JSON.stringify({ files: codeFiles }, null, 2)
);
fs.writeFileSync(
  path.join(bundleDir, MANIFEST_NAME),
  JSON.stringify(manifest, null, 2)
);
fs.writeFileSync(
  path.join(bundleDir, REBUILD_NAME),
  createRebuildScript()
);

const imageCount = manifest.images.length;
const textCount = Object.keys(codeFiles).length;

console.log(
  `Wrote 1 combined code bundle, ${imageCount} image asset(s), `
  + `${MANIFEST_NAME}, and ${REBUILD_NAME} into ${bundleDir}`
);
