import crypto from "node:crypto";

const publicRoutes = new Set([
  "GET /photos", "GET /templates", "GET /categories", "GET /pricing",
  "GET /branding", "GET /kiosk-theme", "GET /license/status",
  "GET /printer-status", "GET /gdrive-upload-status", "GET /camera-import/events",
  "GET /security/pin-status", "POST /security/verify-pin",
  "POST /security/reset-pin", "POST /license/activate",
  "POST /save-print", "POST /upload-session-gdrive",
  // Print hub routes check their own shared token (backend/printHub.js).
  "POST /print-hub/jobs", "GET /print-hub/status",
]);

export function createAdminSessions({ now = Date.now, ttl = 60 * 60 * 1000 } = {}) {
  const sessions = new Map();
  const tokenFrom = (req) => {
    const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    const cookie = req.headers.cookie?.split("; ").find((v) => v.startsWith("ignos_admin="))?.slice(12);
    return bearer || cookie;
  };
  const valid = (req) => {
    const token = tokenFrom(req);
    const expiry = sessions.get(token);
    if (!expiry || expiry <= now()) {
      sessions.delete(token);
      return false;
    }
    return true;
  };
  return {
    issue(res) {
      for (const [token, expiry] of sessions) if (expiry <= now()) sessions.delete(token);
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, now() + ttl);
      res.cookie("ignos_admin", token, { httpOnly: true, sameSite: "strict", maxAge: ttl, path: "/" });
      return token;
    },
    valid,
    revoke(req, res) {
      sessions.delete(tokenFrom(req));
      res.clearCookie("ignos_admin", { path: "/" });
    },
    clear() { sessions.clear(); },
    middleware(req, res, next) {
      const route = `${req.method === "HEAD" ? "GET" : req.method} ${req.path.replace(/\/$/, "")}`;
      if (publicRoutes.has(route) || valid(req)) return next();
      return res.status(401).json({ success: false, error: "Sesi admin berakhir. Masukkan PIN kembali." });
    },
  };
}
