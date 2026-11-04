import assert from "node:assert/strict";

const base = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:10000").replace(/\/$/, "");
const root = await fetch(base + "/");
assert.equal(root.status, 200, "GET / should return 200");
assert.match(root.headers.get("content-type") || "", /text\/html/i, "Root should be HTML");
const html = await root.text();
assert.ok(html.length > 100, "Root HTML should not be empty");

const head = await fetch(base + "/", { method: "HEAD" });
assert.equal(head.status, 200, "HEAD / should return 200");
assert.equal(await head.text(), "", "HEAD must not return a response body");
assert.ok(Number(head.headers.get("content-length")) > 0, "HEAD should preserve Content-Length");

const assetMatch = html.match(/(?:src|href)="(\/[^"]+\.(?:js|css)(?:\?[^"]*)?)"/i);
assert.ok(assetMatch, "Built index.html should reference a local JS or CSS asset");
const assetPath = assetMatch[1];
const asset = await fetch(base + assetPath);
assert.equal(asset.status, 200, `Asset ${assetPath} should return 200`);
assert.match(asset.headers.get("content-type") || "", /javascript|css/i, "Asset should have a useful MIME type");
assert.match(asset.headers.get("cache-control") || "", /max-age=300/, "Assets should use the configured cache policy");
const assetHead = await fetch(base + assetPath, { method: "HEAD" });
assert.equal(assetHead.status, 200, "HEAD asset should return 200");
assert.equal(await assetHead.text(), "", "HEAD asset must not return a body");

const spa = await fetch(base + "/__scramjet_smoke_route__", { headers: { Accept: "text/html" } });
assert.equal(spa.status, 200, "Unknown browser navigation route should use SPA fallback");
assert.match(spa.headers.get("content-type") || "", /text\/html/i);
const missingAsset = await fetch(base + "/__missing_smoke_asset__.js", { headers: { Accept: "*/*" } });
assert.equal(missingAsset.status, 404, "Missing asset must remain a real 404");

const traversal = await fetch(base + "/%2e%2e%2fpackage.json", { headers: { Accept: "*/*" } });
assert.equal(traversal.status, 403, "Encoded path traversal must be rejected");
const unsupported = await fetch(base + "/", { method: "POST" });
assert.equal(unsupported.status, 405, "Unsupported methods should return 405");
assert.match(unsupported.headers.get("allow") || "", /GET.*HEAD/);

const socketUrl = base.replace(/^http:/, "ws:").replace(/^https:/, "wss:") + "/";
const socket = new WebSocket(socketUrl);
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    socket.close();
    reject(new Error("Wisp WebSocket handshake timed out"));
  }, 8000);
  socket.addEventListener("open", () => {
    clearTimeout(timer);
    socket.close();
    resolve();
  }, { once: true });
  socket.addEventListener("error", () => {
    clearTimeout(timer);
    reject(new Error("Wisp WebSocket handshake failed"));
  }, { once: true });
});

console.log("Runtime smoke tests passed: HTTP, HEAD, static assets, SPA fallback, 404, traversal, methods, and Wisp WebSocket.");
