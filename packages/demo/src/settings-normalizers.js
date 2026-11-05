export function normalizeWispUrl(
  value,
  pageProtocol = globalThis.location?.protocol ?? "http:",
) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    throw new TypeError("Wisp URL is required.");
  }

  let normalized = trimmed;
  if (/^https?:\/\//i.test(normalized)) {
    normalized = normalized.replace(/^http/i, "ws");
  } else if (!/^wss?:\/\//i.test(normalized)) {
    const isHostAndPort = /^[^/:]+:\d+(?:\/|$|\?)/.test(normalized);
    if (/^[a-z][a-z\d+.-]*:/i.test(normalized) && !isHostAndPort) {
      throw new TypeError("Wisp URL must use ws:// or wss://.");
    }
    const protocol = pageProtocol === "https:" ? "wss:" : "ws:";
    normalized = protocol + "//" + normalized;
  }

  const parsed = new URL(normalized);
  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    throw new TypeError("Wisp URL must use ws:// or wss://.");
  }
  if (pageProtocol === "https:" && parsed.protocol !== "wss:") {
    throw new TypeError("Wisp URL must use wss:// on HTTPS pages.");
  }
  if (parsed.username || parsed.password) {
    throw new TypeError("Wisp URL cannot contain embedded credentials.");
  }
  if (parsed.hash) {
    throw new TypeError("Wisp URL cannot contain a fragment.");
  }
  if (!parsed.pathname.endsWith("/")) {
    parsed.pathname += "/";
  }

  return parsed.toString();
}

export function normalizeHomeUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    throw new TypeError("Home page URL is required.");
  }

  const normalized = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
    ? trimmed
    : "https://" + trimmed;
  const parsed = new URL(normalized);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError("Home page URL must use HTTP or HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new TypeError("Home page URL cannot contain embedded credentials.");
  }

  return parsed.toString();
}
