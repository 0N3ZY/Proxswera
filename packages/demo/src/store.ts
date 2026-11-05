import { createStore } from "dreamland/core";
import { normalizeHomeUrl, normalizeWispUrl } from "./settings-normalizers.js";
export { normalizeHomeUrl, normalizeWispUrl } from "./settings-normalizers.js";

export type AvailableTransports = "libcurl" | "epoxy";

export const AVAILABLE_TRANSPORTS: ReadonlyArray<{
  value: AvailableTransports;
  label: string;
}> = [
  { value: "libcurl", label: "Libcurl" },
  { value: "epoxy", label: "Epoxy" },
];
const DEFAULT_WISP_URL =
  import.meta.env.VITE_WISP_URL ||
  `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/`;
const DEFAULT_TRANSPORT: AvailableTransports = "libcurl";
const DEFAULT_HOME_URL = "https://google.com";
const DEFAULT_MAX_REQUESTS = 200;

export const demoSettingsStore = createStore(
  {
    transport: DEFAULT_TRANSPORT as AvailableTransports,
    wispUrl: DEFAULT_WISP_URL,
    homeUrl: DEFAULT_HOME_URL,
    maxRequests: DEFAULT_MAX_REQUESTS,
  },
  {
    ident: "scramjet-demo-settings",
    backing: "localstorage",
    autosave: "auto",
  }
);

export function normalizeTransport(value: string): AvailableTransports {
  if (AVAILABLE_TRANSPORTS.some((t) => t.value === value)) {
    return value as AvailableTransports;
  }
  throw new TypeError(`Unknown transport: ${value}`);
}

export function normalizeMaxRequests(value: string | number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new TypeError("Request log limit must be a number.");
  }

  const rounded = Math.round(parsed);
  if (rounded < 10 || rounded > 5000) {
    throw new RangeError("Request log limit must be between 10 and 5000.");
  }

  return rounded;
}

export const demoSettingsDefaults = {
  wispUrl: normalizeWispUrl(DEFAULT_WISP_URL),
  transport: DEFAULT_TRANSPORT,
  homeUrl: normalizeHomeUrl(DEFAULT_HOME_URL),
  maxRequests: DEFAULT_MAX_REQUESTS,
};
