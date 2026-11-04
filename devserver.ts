import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

const PORT = Number(process.env.PORT || process.env.DEMO_PORT || 4141);

if (process.env.VITE_WISP_URL) {
  const configured = process.env.VITE_WISP_URL.trim();
  process.env.VITE_WISP_URL = configured.endsWith("/") ? configured : `${configured}/`;
} else if (process.env.RENDER_EXTERNAL_HOSTNAME) {
  process.env.VITE_WISP_URL = `wss://${process.env.RENDER_EXTERNAL_HOSTNAME}/`;
} else {
  process.env.VITE_WISP_URL = `ws://localhost:${PORT}/`;
}

// Keep the upstream development defaults for local testing, but do not let
// the public production proxy reach Render's loopback or private network.
const isProduction = process.env.NODE_ENV === "production";
wisp.options.allow_private_ips = !isProduction;
wisp.options.allow_loopback_ips = !isProduction;

const mimeTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".eot": "application/vnd.ms-fontobject",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function attachWisp(server: http.Server) {
  server.on("upgrade", (req, socket, head) => {
    try {
      wisp.routeRequest(req, socket, head);
    } catch (error) {
      console.error("Wisp upgrade failed:", error);
      socket.destroy();
    }
  });
}

async function startProductionServer() {
  // The frontend is compiled during the image build. Production only serves
  // those files; it does not boot Vite, Rspack, TypeScript or the banner WASM.
  const distDir = path.resolve("packages/demo/dist");
  const realDistDir = await realpath(distDir);
  const indexPath = path.join(realDistDir, "index.html");
  const indexFile = await realpath(indexPath);
  if (indexFile !== realDistDir && !indexFile.startsWith(realDistDir + path.sep)) {
    throw new Error("The built index.html must remain inside the static build directory.");
  }
  await stat(indexFile);

  const server = http.createServer(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }

    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    } catch {
      res.writeHead(400).end(req.method === "HEAD" ? undefined : "Bad request");
      return;
    }

    if (pathname === "/healthz") {
      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Length": "2",
      });
      res.end(req.method === "HEAD" ? undefined : "ok");
      return;
    }

    let filePath = path.resolve(distDir, `.${pathname}`);
    if (filePath !== distDir && !filePath.startsWith(distDir + path.sep)) {
      res.writeHead(403).end(req.method === "HEAD" ? undefined : "Forbidden");
      return;
    }

    let fileInfo;
    try {
      fileInfo = await stat(filePath);
      if (fileInfo.isDirectory()) {
        filePath = path.join(filePath, "index.html");
      }
      // Resolve symlinks as well as ".." segments so a file placed inside the
      // build output cannot point the public server outside that directory.
      filePath = await realpath(filePath);
      if (filePath !== realDistDir && !filePath.startsWith(realDistDir + path.sep)) {
        res.writeHead(403).end(req.method === "HEAD" ? undefined : "Forbidden");
        return;
      }
      fileInfo = await stat(filePath);
    } catch {
      // The demo is a single-page application. Fall back to index.html for
      // navigation routes, but leave missing asset requests as real 404s.
      if ((req.headers.accept ?? "").includes("text/html")) {
        filePath = indexFile;
        fileInfo = await stat(indexFile);
      } else {
        res.writeHead(404).end(req.method === "HEAD" ? undefined : "Not found");
        return;
      }
    }

    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": fileInfo.size,
      "Cache-Control": filePath === indexFile ? "no-cache" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const stream = createReadStream(filePath);
    stream.on("error", (error) => {
      console.error("Static file stream failed:", error);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    stream.pipe(res);
  });

  attachWisp(server);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Scramjet production server listening on 0.0.0.0:${PORT}`);
    console.log(`Wisp WebSocket: ${process.env.VITE_WISP_URL}`);
    console.log("Health check: /healthz");
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

async function startDevelopmentServer() {
  // Keep the upstream development experience available locally, but never
  // load these heavyweight toolchains in the production Render process.
  const [{ createServer }, devlib, configModule] = await Promise.all([
    import("vite"),
    import("./devlib.ts"),
    import("./rspack.config.ts"),
  ]);
  const image = await (await import("node:fs/promises")).readFile("./assets/scramjet-mini-noalpha.png");

  const vite = await createServer({
    configFile: "./packages/demo/vite.config.ts",
    root: "./packages/demo",
    appType: "spa",
    server: { middlewareMode: true, hmr: false },
  });
  devlib.warnOnUrlEscape(vite);

  const server = http.createServer(vite.middlewares);
  attachWisp(server);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Scramjet development server listening on 0.0.0.0:${PORT}`);
    console.log(`Wisp WebSocket: ${process.env.VITE_WISP_URL}`);
  });

  if (process.env.NODE_ENV !== "production") {
    devlib.runRspack(configModule.default);
  }
  const lines = [
    devlib.black()("SCRAMJET SERVER"),
    devlib.black()(`web @ http://localhost:${PORT}/`),
    devlib.black()(`wisp @ ${process.env.VITE_WISP_URL}`),
  ];
  await devlib.printBanner(image, lines);

  const shutdown = async () => {
    server.close();
    await vite.close();
    process.exit(0);
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

if (process.env.NODE_ENV === "production") {
  await startProductionServer();
} else {
  await startDevelopmentServer();
}
