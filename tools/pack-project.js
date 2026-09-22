const path = require("path");
const { writeTextBundle } = require("./package-shared");

const rootDir = path.resolve(__dirname, "..");
const transferDir = path.join(rootDir, "transfer");

const result = writeTextBundle(rootDir, transferDir);

console.log(
  `Packed ${result.fileCount} essential files into ${result.chunkCount} chunk(s) `
  + `and ${result.outputFileCount} total transfer files in ${transferDir}`
);
