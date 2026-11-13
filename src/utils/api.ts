export const AUTH_TOKEN_KEY = "ignos_admin_session_token";

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.href);
  const isApi = url.port === "5000" && url.pathname.startsWith("/api/")
    && ["localhost", "127.0.0.1", window.location.hostname].includes(url.hostname);
  if (!isApi) return globalThis.fetch(input, init);
  const headers = new Headers(init?.headers);
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await globalThis.fetch(input, { ...init, headers, credentials: "include" });
  } catch (error) {
    if (url.pathname === "/api/save-print") {
      window.dispatchEvent(new CustomEvent("ignos-print-error", { detail: "Koneksi ke server terputus. Status cetakan belum diketahui; periksa antrean printer sebelum mencoba lagi." }));
    }
    throw error;
  }
  if (response.status === 401 && !url.pathname.endsWith("/verify-pin")) {
    window.dispatchEvent(new Event("ignos-auth-expired"));
  }
  if (url.pathname === "/api/save-print" && !response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data.error || `Gagal menyimpan/mengirim cetakan (${response.status}).`;
    window.dispatchEvent(new CustomEvent("ignos-print-error", { detail: message }));
    throw new Error(message);
  }
  return response;
}

export function notifyPrintError(error: unknown) {
  window.dispatchEvent(new CustomEvent("ignos-print-error", {
    detail: error instanceof Error ? error.message : String(error || "Gagal menyiapkan cetakan. Hubungi staf."),
  }));
}
