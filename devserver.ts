import fs from "node:fs/promises";
import { execSync } from "node:child_process";
import http from "node:http";
import process from "node:process";
import chalk from "chalk";
import { createServer } from "vite";
//@ts-expect-error no typedefs
import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import {
  normalizeWebsocketUrl,
  warnOnUrlEscape,
  runRspack,
  black,
  printBanner,
} from "./devlib.ts";
import rspackConfig from "./rspack.config.ts";

const image = await fs.readFile("./assets/scramjet-mini-noalpha.png");

const gitValue = (args: string[]) => {
  try {
    return execSync(`git ${args.join(" ")}`, { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
};
const commit = gitValue(["rev-parse", "--short", "HEAD"]);
const branch = gitValue(["rev-parse", "--abbrev-ref", "HEAD"]);
const packagejson = JSON.parse(await fs.readFile("./package.json", "utf-8"));
const version = packagejson.version;

// Render provides PORT and RENDER_EXTERNAL_HOSTNAME. The browser-facing Wisp
// WebSocket must use the public HTTPS origin, not localhost or an internal port.
const PORT = Number(process.env.PORT || process.env.DEMO_PORT || 4141);
if (process.env.VITE_WISP_URL) {
  process.env.VITE_WISP_URL = normalizeWebsocketUrl(process.env.VITE_WISP_URL);
} else if (process.env.RENDER_EXTERNAL_HOSTNAME) {
  process.env.VITE_WISP_URL = `wss://${process.env.RENDER_EXTERNAL_HOSTNAME}/`;
} else {
  process.env.VITE_WISP_URL = `ws://localhost:${PORT}/`;
}

wisp.options.allow_private_ips = true;
wisp.options.allow_loopback_ips = true;

const vite = await createServer({
  configFile: "./packages/demo/vite.config.ts",
  root: "./packages/demo",
  appType: "spa",
  server: {
    middlewareMode: true,
    hmr: false,
  },
});
warnOnUrlEscape(vite);

// Render web services expose one public port. Serve Vite and Wisp upgrades
// from the same HTTP server so both the page and WebSocket are reachable.
const server = http.createServer(vite.middlewares);
server.on("upgrade", (req, socket, head) => {
  wisp.routeRequest(req, socket, head);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Scramjet listening on 0.0.0.0:${PORT}`);
  console.log(`Wisp WebSocket: ${process.env.VITE_WISP_URL}`);
});

const accent = (text: string) => chalk.hex("#f1855bff").bold(text);
const highlight = (text: string) => chalk.hex("#fdd76cff").bold(text);
const urlColor = (text: string) => chalk.hex("#64DFDF").underline(text);
const connector = chalk.hex("#8D99AE").dim("@");
const lines = [
  black()(`${highlight("SCRAMJET SERVER")}`),
  black()(`${accent("web")} ${connector} ${urlColor(`http://localhost:${PORT}/`)}`),
  black()(`${accent("wisp")} ${connector} ${urlColor(process.env.VITE_WISP_URL)}`),
  black()(chalk.dim(`[${branch}] ${commit} scramjet/${version}`)),
];

if (process.env.NODE_ENV !== "production") {
  runRspack(rspackConfig);
}
await printBanner(image, lines);

const shutdown = async () => {
  server.close();
  await vite.close();
  process.exit(0);
};
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
