const fs = require("fs");
const http = require("http");
const path = require("path");
const { exec } = require("child_process");

const root = __dirname;
const args = process.argv.slice(2);

function readArg(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1 || index === args.length - 1) {
    return fallback;
  }
  return args[index + 1];
}

const port = Number(readArg("--port", "4173"));
const shouldOpenBrowser = args.includes("--open");
const host = "127.0.0.1";
const url = `http://${host}:${port}/`;

function getContentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".webmanifest":
      return "application/manifest+json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

function resolveRequestPath(requestUrl) {
  const requestPath = decodeURIComponent(new URL(requestUrl, url).pathname);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const fullPath = path.resolve(root, relativePath);
  const rootPath = path.resolve(root);

  if (!fullPath.startsWith(rootPath)) {
    throw new Error("Request path attempted to escape the PWA root.");
  }

  return fullPath;
}

function maybeOpenBrowser() {
  if (!shouldOpenBrowser) {
    return;
  }

  if (process.platform === "win32") {
    exec(`start "" "${url}"`);
    return;
  }

  if (process.platform === "darwin") {
    exec(`open "${url}"`);
    return;
  }

  exec(`xdg-open "${url}"`);
}

const server = http.createServer((request, response) => {
  try {
    let filePath = resolveRequestPath(request.url || "/");
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, { "Content-Type": getContentType(filePath) });
    fs.createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error.message);
  }
});

server.listen(port, host, () => {
  console.log("Serving Mancala Bot Lab Training Facility PWA from:");
  console.log(`  ${root}`);
  console.log("");
  console.log("Open in browser:");
  console.log(`  ${url}`);
  console.log("");
  console.log("Press Ctrl+C to stop the server.");
  maybeOpenBrowser();
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(`Could not start the PWA server because http://${host}:${port}/ is already in use.`);
    console.error("Close the other server using that port, then try again.");
  } else {
    console.error(`Could not start the PWA server: ${error.message}`);
  }
  process.exit(1);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
