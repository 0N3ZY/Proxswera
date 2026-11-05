import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHomeUrl, normalizeWispUrl } from "../../packages/demo/src/settings-normalizers.js";

test("bare Wisp hosts use secure WebSockets on HTTPS pages", () => {
  assert.equal(normalizeWispUrl("wisp.example.test", "https:"), "wss://wisp.example.test/");
});

test("bare Wisp hosts use ordinary WebSockets on HTTP pages", () => {
  assert.equal(normalizeWispUrl("localhost:4142", "http:"), "ws://localhost:4142/");
});

test("HTTP(S) Wisp origins normalize to the matching WebSocket scheme", () => {
  assert.equal(normalizeWispUrl("https://wisp.example.test/path", "https:"), "wss://wisp.example.test/path/");
  assert.equal(normalizeWispUrl("http://localhost:4142", "http:"), "ws://localhost:4142/");
});

test("insecure Wisp URLs are rejected on HTTPS pages", () => {
  assert.throws(() => normalizeWispUrl("ws://wisp.example.test", "https:"), /wss/);
});

test("Wisp URLs cannot contain embedded credentials or fragments", () => {
  assert.throws(() => normalizeWispUrl("wss://user:pass@wisp.example.test", "https:"), /credentials/);
  assert.throws(() => normalizeWispUrl("wss://wisp.example.test/#fragment", "https:"), /fragment/);
});

test("home URLs default to HTTPS and only allow HTTP(S)", () => {
  assert.equal(normalizeHomeUrl("example.test"), "https://example.test/");
  assert.equal(normalizeHomeUrl("http://example.test/path"), "http://example.test/path");
  assert.throws(() => normalizeHomeUrl("javascript://alert.example.test"), /HTTP or HTTPS/);
  assert.throws(() => normalizeHomeUrl("file:///etc/passwd"), /HTTP or HTTPS/);
});

test("home URLs reject embedded credentials", () => {
  assert.throws(() => normalizeHomeUrl("https://user:pass@example.test"), /credentials/);
});
