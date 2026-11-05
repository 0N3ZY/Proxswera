const DEFAULT_RENDER_ORIGIN = "https://scramjetfork.onrender.com";

function resolveRenderOrigin(value) {
  const origin = new URL(value || DEFAULT_RENDER_ORIGIN);
  if (origin.protocol !== "https:" || origin.username || origin.password ||
      origin.pathname !== "/" || origin.search || origin.hash) {
    throw new TypeError("RENDER_ORIGIN must be a plain HTTPS origin.");
  }
  return origin;
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
    const origin = resolveRenderOrigin(env.RENDER_ORIGIN);
    const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, origin);

    if (incomingUrl.pathname === "/__edge/health") {
      try {
        const health = await fetch(new URL("/healthz", origin), {
          method: "GET",
          headers: { "cache-control": "no-cache" },
          redirect: "manual",
        });
        return json({
          edge: "cloudflare-worker",
          upstream: health.ok ? "healthy" : "unhealthy",
          upstreamStatus: health.status,
        }, health.ok ? 200 : 503);
      } catch {
        return json({ edge: "cloudflare-worker", upstream: "unreachable" }, 503);
      }
    }

    try {
      // Preserve method, body, query and WebSocket Upgrade; only the fixed
      // upstream origin changes. This is deliberately not an open proxy.
      const upstreamRequest = new Request(upstreamUrl, request);
      upstreamRequest.headers.set("x-forwarded-host", incomingUrl.host);
      upstreamRequest.headers.set("x-forwarded-proto", incomingUrl.protocol.slice(0, -1));
      upstreamRequest.headers.set("x-scramjet-edge", "cloudflare-worker");

      const upstreamResponse = await fetch(upstreamRequest);
      if (upstreamResponse.status === 101) return upstreamResponse;

      const responseHeaders = new Headers(upstreamResponse.headers);
      responseHeaders.set("x-scramjet-edge", "cloudflare-worker");
      const location = responseHeaders.get("location");
      if (location) {
        try {
          const redirectUrl = new URL(location, origin);
          if (redirectUrl.origin === origin.origin) {
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
        error: "The Scramjet runtime is temporarily unavailable.",
        edge: "cloudflare-worker",
      }, 502);
    }
  },
};
