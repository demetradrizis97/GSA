const http = require("http");
const fs = require("fs");
const path = require("path");

const server = http.createServer((req, res) => {
  if (req.method === "POST") {
    const filePath = path.join(__dirname, "../assets/osm-english-hd.png");
    const fileStream = fs.createWriteStream(filePath);
    
    req.pipe(fileStream);
    
    req.on("end", () => {
      res.writeHead(200, { "Access-Control-Allow-Origin": "*" });
      res.end("File saved");
      console.log("File saved to " + filePath);
      process.exit(0);
    });
  } else if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
  }
});

server.listen(9999, "127.0.0.1", () => {
  console.log("Receiver listening on port 9999");
});
