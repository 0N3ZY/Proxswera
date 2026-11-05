import platformConfig from "../config/platforms.json" with { type: "json" };

const DEFAULT_RENDER_ORIGIN = "https://scramjetfork.onrender.com";

function resolveOrigin(value, fallback = "") {
  const origin = new URL(value || fallback);
  if (origin.protocol !== "https:" || origin.username || origin.password ||
      origin.pathname !== "/" || origin.search || origin.hash) {
    throw new TypeError("Platform origin must be a plain HTTPS origin.");
  }
  return origin;
}

function matchesPath(pattern, pathname) {
  if (pattern === "/*") return true;
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return pathname === prefix || pathname.startsWith(prefix + "/");
  }
  return pathname === pattern;
}

function selectRoute(request) {
  const url = new URL(request.url);
  const isWebSocket = (request.headers.get("upgrade") || "").toLowerCase() === "websocket";
  return platformConfig.routes.find((route) => {
    const protocol = isWebSocket ? "websocket" : url.protocol.slice(0, -1);
    return route.protocols.includes(protocol) && matchesPath(route.match, url.pathname);
  });
}

function originFor(destination, env) {
  const provider = platformConfig.providers[destination];
  if (!provider) throw new TypeError("Unknown platform destination.");
  const key = provider.environment?.origin;
  const value = key ? env[key] : undefined;
  if (destination === "vercel" && !value) return { name: "render", origin: resolveOrigin(env.RENDER_ORIGIN, DEFAULT_RENDER_ORIGIN) };
  if (!value && destination !== "render") throw new TypeError("Platform is not configured.");
  return {
    name: destination,
    origin: resolveOrigin(value, destination === "render" ? DEFAULT_RENDER_ORIGIN : ""),
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

export default {
  async fetch(request, env) {
    const incomingUrl = new URL(request.url);
    const renderOrigin = resolveOrigin(env.RENDER_ORIGIN, DEFAULT_RENDER_ORIGIN);

    if (incomingUrl.pathname === "/__edge/health") {
      try {
        const health = await fetch(new URL("/healthz", renderOrigin), {
          method: "GET",
          headers: { "cache-control": "no-cache" },
          redirect: "manual",
        });
        return json({
          edge: "cloudflare-worker",
          upstream: health.ok ? "healthy" : "unhealthy",
          upstreamStatus: health.status,
          frontendConfigured: Boolean(env.VERCEL_FRONTEND_ORIGIN),
        }, health.ok ? 200 : 503);
      } catch {
        return json({ edge: "cloudflare-worker", upstream: "unreachable" }, 503);
      }
    }

    const route = selectRoute(request);
    if (!route) return json({ error: "No platform route matches this request." }, 404);

    let selected;
    try {
      selected = originFor(route.destination, env);
    } catch {
      return json({ error: "The selected platform is not configured." }, 503);
    }

    const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, selected.origin);
    try {
      const upstreamRequest = new Request(upstreamUrl, request);
      upstreamRequest.headers.set("x-forwarded-host", incomingUrl.host);
      upstreamRequest.headers.set("x-forwarded-proto", incomingUrl.protocol.slice(0, -1));
      upstreamRequest.headers.set("x-scramjet-edge", "cloudflare-worker");

      const upstreamResponse = await fetch(upstreamRequest);
      if (upstreamResponse.status === 101) return upstreamResponse;

      const responseHeaders = new Headers(upstreamResponse.headers);
      responseHeaders.set("x-scramjet-edge", "cloudflare-worker");
      responseHeaders.set("x-scramjet-platform", selected.name);
      const location = responseHeaders.get("location");
      if (location) {
        try {
          const redirectUrl = new URL(location, selected.origin);
          if (redirectUrl.origin === selected.origin.origin) {
            redirectUrl.host = incomingUrl.host;
            redirectUrl.protocol = incomingUrl.protocol;
            responseHeaders.set("location", redirectUrl.toString());
          }
        } catch {
          // Preserve non-URL Location values unchanged.
        }
      }
      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });
    } catch {
      return json({
        error: "The selected Scramjet platform is temporarily unavailable.",
        edge: "cloudflare-worker",
        platform: selected.name,
      }, 502);
    }
  },
};
