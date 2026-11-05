import test from "node:test";
import assert from "node:assert/strict";
import worker from "../../worker/worker.js";

test("routes normal frontend traffic to Vercel when configured", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (request) => {
    captured = request;
    return new Response("frontend-ok", { status: 200 });
  };
  try {
    const response = await worker.fetch(
      new Request("https://edge.example.test/assets/app.js?v=3"),
      {
        RENDER_ORIGIN: "https://scramjetfork.onrender.com",
        VERCEL_FRONTEND_ORIGIN: "https://scramjetfork-frontend.vercel.app",
      },
    );
    assert.equal(await response.text(), "frontend-ok");
    assert.equal(captured.url, "https://scramjetfork-frontend.vercel.app/assets/app.js?v=3");
    assert.equal(response.headers.get("x-scramjet-platform"), "vercel");
    assert.equal(captured.headers.get("x-forwarded-host"), "edge.example.test");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("routes API traffic to Render even when Vercel is configured", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (request) => {
    captured = request;
    return new Response("api-ok", { status: 200 });
  };
  try {
    await worker.fetch(
      new Request("https://edge.example.test/api/session"),
      {
        RENDER_ORIGIN: "https://scramjetfork.onrender.com",
        VERCEL_FRONTEND_ORIGIN: "https://scramjetfork-frontend.vercel.app",
      },
    );
    assert.equal(captured.url, "https://scramjetfork.onrender.com/api/session");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("routes Wisp WebSocket upgrades to Render", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (request) => {
    captured = request;
    return new Response("socket-proxy-test", { status: 200 });
  };
  try {
    await worker.fetch(
      new Request("https://edge.example.test/", { headers: { upgrade: "websocket" } }),
      {
        RENDER_ORIGIN: "https://scramjetfork.onrender.com",
        VERCEL_FRONTEND_ORIGIN: "https://scramjetfork-frontend.vercel.app",
      },
    );
    assert.equal(captured.url, "https://scramjetfork.onrender.com/");
    assert.equal(captured.headers.get("upgrade"), "websocket");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("falls back to Render for frontend requests until Vercel is configured", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (request) => {
    captured = request;
    return new Response("fallback-ok", { status: 200 });
  };
  try {
    await worker.fetch(new Request("https://edge.example.test/"), {
      RENDER_ORIGIN: "https://scramjetfork.onrender.com",
    });
    assert.equal(captured.url, "https://scramjetfork.onrender.com/");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects non-HTTPS or credential-bearing platform origins", async () => {
  await assert.rejects(
    worker.fetch(new Request("https://edge.example.test/api/"), {
      RENDER_ORIGIN: "http://127.0.0.1:4141",
    }),
    /plain HTTPS origin/,
  );
});

test("edge health checks Render and reports whether Vercel is configured", async () => {
  const originalFetch = globalThis.fetch;
  let target;
  globalThis.fetch = async (url) => {
    target = String(url);
    return new Response("ok", { status: 200 });
  };
  try {
    const response = await worker.fetch(
      new Request("https://edge.example.test/__edge/health"),
      {
        RENDER_ORIGIN: "https://scramjetfork.onrender.com",
        VERCEL_FRONTEND_ORIGIN: "https://scramjetfork-frontend.vercel.app",
      },
    );
    assert.equal(response.status, 200);
    assert.equal(target, "https://scramjetfork.onrender.com/healthz");
    assert.deepEqual(await response.json(), {
      edge: "cloudflare-worker",
      upstream: "healthy",
      upstreamStatus: 200,
      frontendConfigured: true,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
