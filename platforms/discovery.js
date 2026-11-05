import platformConfig from "../config/platforms.json" with { type: "json" };

function isHttpsOrigin(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      url.pathname === "/" && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function discoverPlatforms(env = process.env) {
  const configured = {
    github: Boolean(env.GITHUB_REPOSITORY || env.GITHUB_ACTIONS),
    vercel: isHttpsOrigin(env.VERCEL_FRONTEND_ORIGIN),
    cloudflare: isHttpsOrigin(env.CLOUDFLARE_WORKER_ORIGIN),
    render: isHttpsOrigin(env.RENDER_ORIGIN) || Boolean(env.RENDER_EXTERNAL_HOSTNAME) || env.NODE_ENV === "development",
    supabase: isHttpsOrigin(env.SUPABASE_URL) &&
      Boolean(env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY),
    "cloud-run": isHttpsOrigin(env.CLOUD_RUN_PREVIEW_ORIGIN),
  };

  return Object.entries(platformConfig.providers).map(([name, provider]) => ({
    name,
    kind: provider.kind,
    trafficRole: provider.trafficRole,
    configured: configured[name] ?? false,
    health: configured[name] ? "not-checked" : "not-configured",
    capabilities: [...provider.capabilities],
  }));
}

export function selectPlatform(capability, env = process.env) {
  return discoverPlatforms(env).find(
    (provider) => provider.configured && provider.capabilities.includes(capability),
  ) ?? null;
}
