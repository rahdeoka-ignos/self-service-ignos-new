// Print hub: one computer (the MacBook with the USB printers) prints for every
// kiosk on the studio LAN. Each kiosk keeps running its own system (camera,
// photos, sessions) and only forwards the finished print file to the hub.
//
// data/print-hub.json
//   hub (MacBook):  { "role": "hub",   "token": "<shared secret>" }
//   kiosk (Mac mini): { "role": "kiosk", "url": "http://<macbook>:5000", "token": "<same secret>", "name": "Booth 1" }
//   no file / { "role": "off" }: print locally (old behaviour)
import crypto from "crypto";
import fs from "fs";
import path from "path";

export const HUB_TOKEN_HEADER = "x-ignos-hub-token";
const OFF = Object.freeze({ role: "off" });

export function parseHubConfig(raw) {
  if (!raw || typeof raw !== "object") return OFF;
  const role = String(raw.role || "off");
  if (role === "off") return OFF;
  const token = String(raw.token || "");
  if (token.length < 16) throw new Error("print-hub.json: token minimal 16 karakter.");
  if (role === "hub") return { role, token };
  if (role === "kiosk") {
    let url;
    try { url = new URL(String(raw.url || "")); } catch { throw new Error("print-hub.json: url pusat print tidak valid."); }
    if (!/^https?:$/.test(url.protocol)) throw new Error("print-hub.json: url harus http:// atau https://");
    const name = String(raw.name || "Kiosk").replace(/[^\w .()-]/g, "").slice(0, 40) || "Kiosk";
    return { role, token, url: url.origin, name };
  }
  throw new Error(`print-hub.json: role "${role}" tidak dikenal (hub, kiosk, off).`);
}

export const newHubToken = () => crypto.randomBytes(24).toString("hex");

/**
 * Build the config to save from the admin form. A hub keeps its current token
 * unless a new one is requested; an empty token on a new hub gets generated.
 */
export function buildHubConfigFromForm(body = {}, current = OFF) {
  const role = String(body.role || "off");
  if (role === "off") return { role: "off" };
  if (role === "hub") {
    const token = body.regenerateToken
      ? newHubToken()
      : String(body.token || (current.role === "hub" ? current.token : "") || newHubToken());
    return parseHubConfig({ role, token });
  }
  return parseHubConfig({ role, url: body.url, token: String(body.token || "").trim(), name: body.name });
}

/** URLs other kiosks can use to reach this machine (port 5000). */
export function lanAddresses(interfaces, localHostName, port = 5000) {
  const urls = [];
  if (localHostName) urls.push(`http://${localHostName}:${port}`);
  for (const list of Object.values(interfaces || {})) {
    for (const iface of list || []) {
      const v4 = iface.family === "IPv4" || iface.family === 4;
      if (v4 && !iface.internal && !iface.address.startsWith("169.254.")) urls.push(`http://${iface.address}:${port}`);
    }
  }
  return [...new Set(urls)];
}

export function readHubConfig(file) {
  if (!fs.existsSync(file)) return OFF;
  return parseHubConfig(JSON.parse(fs.readFileSync(file, "utf-8")));
}

export function tokenMatches(given, expected) {
  const a = Buffer.from(String(given || ""));
  const b = Buffer.from(String(expected || ""));
  return a.length === b.length && b.length > 0 && crypto.timingSafeEqual(a, b);
}

async function hubFetch(hub, route, init, fetchImpl, timeoutMs) {
  let res;
  try {
    res = await fetchImpl(`${hub.url}/api/print-hub/${route}`, {
      ...init,
      headers: { ...(init?.headers || {}), [HUB_TOKEN_HEADER]: hub.token },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new Error(`Pusat print (${hub.url}) tidak bisa dihubungi: ${err.cause?.code || err.name || err.message}`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(body.error || `Pusat print menolak permintaan (HTTP ${res.status}).`);
  }
  return body;
}

/** Kiosk side: send the saved print file to the hub. Resolves to the hub's printStatus. */
export async function forwardPrintJob({ hub, filePath, productType, copies, fetchImpl = fetch, timeoutMs = 60000 }) {
  const form = new FormData();
  form.append("file", new Blob([await fs.promises.readFile(filePath)]), path.basename(filePath));
  const params = new URLSearchParams({ printProfile: productType, kiosk: hub.name });
  if (copies !== undefined) params.set("copies", String(copies));
  const body = await hubFetch(hub, `jobs?${params}`, { method: "POST", body: form }, fetchImpl, timeoutMs);
  return body.printStatus || "submitted";
}

/** Kiosk side: the hub's printer monitor, so paper-out alerts show on every booth. */
export function fetchHubStatus({ hub, fetchImpl = fetch, timeoutMs = 4000 }) {
  return hubFetch(hub, "status", { method: "GET" }, fetchImpl, timeoutMs);
}

/** Alert shown on a kiosk when the hub cannot be reached. */
export function hubUnreachableStatus(hub, error) {
  return {
    success: false,
    hasError: true,
    source: "hub",
    error,
    printers: [],
    alert: {
      type: "offline",
      title: "Pusat Print Tidak Terhubung",
      customerMessage: "Printer sedang disiapkan oleh staff. Mohon tunggu sebentar ya kak!",
      adminMessage: `Kiosk "${hub.name}" tidak bisa menghubungi pusat print ${hub.url}. Pastikan MacBook menyala, server berjalan, dan terhubung ke jaringan yang sama. (${error})`,
      printerName: hub.url,
      profileLabel: hub.name,
    },
    updatedAt: new Date().toISOString(),
  };
}
