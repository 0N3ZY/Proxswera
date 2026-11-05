import test from "node:test";
import assert from "node:assert/strict";
import { discoverPlatforms, selectPlatform } from "../../platforms/discovery.js";

test("discovers Render as the runtime and selects it for Wisp", () => {
  const selected = selectPlatform("wisp-websocket", { NODE_ENV: "development" });
  assert.equal(selected?.name, "render");
});

test("selects Vercel for frontend work only when configured with an HTTPS origin", () => {
  const env = { VERCEL_FRONTEND_ORIGIN: "https://frontend.example.test" };
  assert.equal(selectPlatform("static-frontend", env)?.name, "vercel");
  assert.equal(selectPlatform("static-frontend", { VERCEL_FRONTEND_ORIGIN: "http://localhost:3000" }), null);
});

test("selects Cloudflare for public ingress only when configured", () => {
  assert.equal(selectPlatform("public-ingress", {
    CLOUDFLARE_WORKER_ORIGIN: "https://edge.example.test",
  })?.name, "cloudflare");
  assert.equal(selectPlatform("public-ingress", {}) , null);
});

test("selects Supabase for database work only when URL and a key are configured", () => {
  assert.equal(selectPlatform("postgres", {
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "public-key-placeholder",
  })?.name, "supabase");
  assert.equal(selectPlatform("postgres", {
    SUPABASE_URL: "https://project.supabase.co",
  }), null);
});

test("GitHub is a control-plane provider and is discovered in Actions", () => {
  assert.equal(selectPlatform("source-of-truth", { GITHUB_ACTIONS: "true" })?.name, "github");
  assert.equal(selectPlatform("source-of-truth", {}) , null);
});

test("discovery exposes capabilities and status but never environment values", () => {
  const status = discoverPlatforms({
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SECRET_KEY: "do-not-expose-this",
  });
  const serialized = JSON.stringify(status);
  assert.equal(serialized.includes("do-not-expose-this"), false);
  assert.equal(status.find((p) => p.name === "supabase")?.available, true);
});
