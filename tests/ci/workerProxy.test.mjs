import test from "node:test";
import assert from "node:assert/strict";
import worker from "../../worker/worker.js";

test("forwards path, query and public host to the fixed Render origin", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (request) => {
    captured = request;
    return new Response("runtime-ok", { status: 200 });
  };
  try {
    const response = await worker.fetch(
      new Request("https://scramjetfork.example.test/assets/app.js?v=3"),
      { RENDER_ORIGIN: "https://scramjetfork.onrender.com" },
    );
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "runtime-ok");
    assert.equal(captured.url, "https://scramjetfork.onrender.com/assets/app.js?v=3");
    assert.equal(captured.headers.get("x-forwarded-host"), "scramjetfork.example.test");
    assert.equal(captured.headers.get("x-scramjet-edge"), "cloudflare-worker");
    assert.equal(response.headers.get("x-scramjet-edge"), "cloudflare-worker");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects a non-HTTPS or credential-bearing runtime origin", async () => {
  await assert.rejects(
    worker.fetch(new Request("https://edge.example.test/"), {
      RENDER_ORIGIN: "http://127.0.0.1:4141",
    }),
    /plain HTTPS origin/,
  );
});

test("health endpoint checks the Render runtime health route", async () => {
  const originalFetch = globalThis.fetch;
  let target;
  globalThis.fetch = async (url) => {
    target = String(url);
    return new Response("ok", { status: 200 });
  };
  try {
    const response = await worker.fetch(
      new Request("https://edge.example.test/__edge/health"),
      { RENDER_ORIGIN: "https://scramjetfork.onrender.com" },
    );
    assert.equal(response.status, 200);
    assert.equal(target, "https://scramjetfork.onrender.com/healthz");
    assert.deepEqual(await response.json(), {
      edge: "cloudflare-worker",
      upstream: "healthy",
      upstreamStatus: 200,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
