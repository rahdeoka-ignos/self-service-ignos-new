import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { transform } from "esbuild";
import { createAdminSessions } from "../backend/security.js";
import { childPath, writeJsonAtomic } from "../backend/safety.js";
import { priceKioskSession, reportPrints, reportSoftcopy } from "../backend/pricing.js";
import { createQueueUploader } from "../backend/uploadQueue.js";

const pricing = {
  session: { basePrice: 100000, includedPeople: 2, extraPersonPrice: 15000, softcopyCharge: 25000 },
  prints: { print4rPrice: 10000, printA4Price: 20000 },
  keychains: [{ id: "metal", name: "Metal", price: 30000 }],
  idCards: [{ id: "portrait-full", name: "ID Card Portrait", subtitle: "Full Foto", price: 35000 }],
  addons: [{ id: "4r-print", title: "Cetak Foto 4R", price: 10000 }, { id: "bingkai-a4", title: "Bingkai A4", price: 40000 }],
};
const response = () => ({ statusCode: 200, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; }, cookie() {}, clearCookie() {} });

test("admin endpoints reject missing/forged tokens, including mutations", () => {
  const auth = createAdminSessions();
  for (const [method, route] of [["GET", "/sessions"], ["POST", "/storage-clean"], ["PUT", "/pricing"], ["POST", "/camera-import/import"], ["DELETE", "/templates/1"]]) {
    for (const headers of [{}, { authorization: "Bearer forged" }]) {
      const res = response();
      auth.middleware({ method, path: route, headers }, res, () => assert.fail("Unauthorized request allowed"));
      assert.equal(res.statusCode, 401);
    }
  }
});

test("server sessions expire, support authenticated image cookies, and revoke", () => {
  let now = 100;
  const auth = createAdminSessions({ now: () => now, ttl: 50 });
  const token = auth.issue(response());
  const req = { headers: { authorization: `Bearer ${token}` } };
  assert.ok(auth.valid(req));
  assert.ok(auth.valid({ headers: { cookie: `ignos_admin=${token}` } }));
  now = 150;
  assert.equal(auth.valid(req), false);
  const second = { headers: { authorization: `Bearer ${auth.issue(response())}` } };
  auth.revoke(second, response());
  assert.equal(auth.valid(second), false);
});

test("public kiosk operations remain available without admin login", () => {
  const auth = createAdminSessions();
  for (const [method, route] of [["GET", "/templates"], ["GET", "/photos"], ["POST", "/save-print"], ["POST", "/upload-session-gdrive"]]) {
    let allowed = false;
    auth.middleware({ method, path: route, headers: {} }, response(), () => { allowed = true; });
    assert.ok(allowed);
  }
});

test("paths cannot escape via traversal, absolute paths, Windows separators or ADS", () => {
  for (const name of ["..", ".", "../data", "..\\data", "C:\\data", "/data", "2026-11-13/../../data", "file:stream", ".. ", "name.", "NUL", "CON.png", ""]) {
    assert.throws(() => childPath(process.cwd(), name));
  }
  assert.equal(childPath(process.cwd(), "2026-11-13"), path.join(process.cwd(), "2026-11-13"));
});

test("kiosk computes current base/extra people pricing instead of client overrides", () => {
  const result = priceKioskSession({ peopleCount: 4, basePrice: 1, makeStory: true }, pricing);
  assert.equal(result.basePrice, 130000);
  assert.equal(result.totalPrice, 130000);
});

test("variant prices, A4, 4R and softcopy come from server configuration", () => {
  const result = priceKioskSession({ peopleCount: 2, makeStory: false, a4Count: 1, extraCharge: 1, miscAddons: [
    { productId: "portrait-full", kind: "idcard", qty: 1, price: 1 },
    { productId: "metal", kind: "keychain", qty: 2 },
    { productId: "4r-print", kind: "addon", qty: 3 },
  ] }, pricing);
  assert.equal(result.addonsTotal, 125000);
  assert.equal(result.totalPrice, 270000);
});

test("zero prices remain zero and invalid or unknown items fail closed", () => {
  const free = { ...pricing, session: { basePrice: 0, includedPeople: 2, extraPersonPrice: 0, softcopyCharge: 0 } };
  assert.equal(priceKioskSession({ peopleCount: 4, makeStory: false }, free).totalPrice, 0);
  assert.throws(() => priceKioskSession({ miscAddons: [{ productId: "missing", qty: 1 }] }, pricing));
  assert.throws(() => priceKioskSession({ peopleCount: -1 }, pricing));
  assert.throws(() => priceKioskSession({ a4Count: 1.5 }, pricing));
  assert.equal(priceKioskSession({ peopleCount: 2, makeStory: false }, pricing, true).basePrice, 0);
});

test("legacy in-progress kiosk selections resolve configured variant prices", () => {
  const result = priceKioskSession({ miscAddons: [{ name: "ID Card Portrait - Full Foto", qty: 1 }, { name: "Bingkai A4 - Putih", qty: 1 }] }, pricing);
  assert.equal(result.addonsTotal, 75000);
});

test("reports include additional cashier prints without inventing softcopy revenue", () => {
  assert.deepEqual(reportPrints({ prints: { regular: 2, bonus: 0, total: 5 } }), { regular: 5, bonus: 0 });
  assert.deepEqual(reportPrints({ prints: { regular: 4, bonus: 4, total: 8 } }), { regular: 4, bonus: 4 });
  assert.deepEqual(reportSoftcopy({ makeStory: false, softcopyType: "none", softcopyCharge: 0 }), { free: false, paid: false, revenue: 0 });
  assert.equal(reportSoftcopy({ softcopyType: "paid", softcopyCharge: 0 }).revenue, 0);
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(process.cwd(), "tests", "queue-fixture-"));
  t.after(() => {
    const resolved = path.resolve(root);
    assert.equal(path.dirname(resolved), path.join(process.cwd(), "tests"));
    assert.ok(path.basename(resolved).startsWith("queue-fixture-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const queueDir = path.join(root, "queue"), archiveDir = path.join(root, "archive");
  fs.mkdirSync(path.join(queueDir, "session"), { recursive: true });
  fs.mkdirSync(archiveDir);
  const folder = path.join(queueDir, "session");
  for (const name of ["one.jpg", "two.jpg", "receipt.pdf"]) fs.writeFileSync(path.join(folder, name), "fixture");
  writeJsonAtomic(path.join(folder, "session_info.json"), { id: "session-id", date: "2026-11-13", customerName: "Test", files: ["one.jpg", "two.jpg", "receipt.pdf"] });
  return { queueDir, archiveDir, folder };
}

test("partial Drive failure retains files and retries only unfinished files in the same folder", async (t) => {
  const f = fixture(t);
  let first = true, creates = 0;
  const batches = [];
  const upload = createQueueUploader({ ...f,
    createFolder: async () => { creates++; return { folderId: "drive-id", webViewLink: "mock" }; },
    updateSession() {},
    uploadFiles: async (files, folderId, progress) => {
      assert.equal(folderId, "drive-id");
      batches.push(files.map((p) => path.basename(p)));
      if (first) {
        first = false;
        await progress(1, 3, "one.jpg", "done");
        throw new Error("Mock network failure");
      }
      for (const file of files) await progress(0, 0, path.basename(file), "done");
    },
  });
  await assert.rejects(upload("session"), /network failure/);
  assert.ok(fs.existsSync(path.join(f.folder, "one.jpg")));
  assert.ok(fs.existsSync(path.join(f.folder, "two.jpg")));
  await upload("session");
  assert.equal(creates, 1);
  assert.deepEqual(batches[1], ["two.jpg", "receipt.pdf"]);
  assert.ok(fs.existsSync(path.join(f.archiveDir, "2026-11-13", "session", "receipt.pdf")));
});

test("archive failure never deletes local photos and retry does not upload again", async (t) => {
  const f = fixture(t);
  let failArchive = true;
  const batches = [];
  const upload = createQueueUploader({ ...f,
    io: { ...fs, renameSync(from, to) { if (failArchive) throw new Error("Mock locked archive"); fs.renameSync(from, to); } },
    createFolder: async () => ({ folderId: "drive-id" }), updateSession() {},
    uploadFiles: async (files, _id, progress) => {
      batches.push(files.length);
      for (const file of files) await progress(0, 0, path.basename(file), "done");
    },
  });
  await assert.rejects(upload("session"), /locked archive/);
  assert.ok(fs.existsSync(path.join(f.folder, "receipt.pdf")));
  failArchive = false;
  await upload("session");
  assert.deepEqual(batches, [3, 0]);
});

test("concurrent retries for one queue folder are rejected", async (t) => {
  const f = fixture(t);
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });
  const upload = createQueueUploader({ ...f, createFolder: async () => { await blocked; throw new Error("mock stop"); }, uploadFiles() {}, updateSession() {} });
  const first = upload("session");
  await assert.rejects(upload("session"), /sedang diunggah/);
  release();
  await assert.rejects(first, /mock stop/);
});

test("Google Drive batch rejects partial failures and missing local files", async () => {
  const source = fs.readFileSync(new URL("../gdrive.js", import.meta.url), "utf8");
  const ctx = { fs: { existsSync: (p) => p !== "missing.jpg" }, path, uploadFileToDrive: async (p) => { if (p === "bad.jpg") throw new Error("mock"); return { id: "ok" }; } };
  vm.runInNewContext(source.slice(source.indexOf("export async function uploadMultipleFiles")).replace("export ", ""), ctx);
  await assert.rejects(ctx.uploadMultipleFiles(["ok.jpg", "bad.jpg", "missing.jpg"], "mock"), /2 file gagal/);
});

test("print API waits for driver submission and returns failure while retaining saved file", async () => {
  const source = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
  let handler, fail = true;
  const cupsCalls = [];
  const ctx = { IS_WINDOWS: true, hasInset: () => false, applyPrintInset: async () => { throw new Error("unused"); }, removeQuietly() {}, app: { post(_route, _middleware, fn) { handler = fn; } }, upload: { single() {} }, findPrinterProfile: () => ({ printerName: "Mock", copies: 1 }), print: async () => { if (fail) throw new Error("mock offline"); }, cupsPrint: async (file, opts) => { cupsCalls.push([file, opts.printer, opts.copies]); if (fail) throw new Error("mock offline"); } };
  vm.runInNewContext(source.slice(source.indexOf("async function autoPrintFile"), source.indexOf("let latestDriveSession")), ctx);
  const request = { file: { path: "fixture.png", filename: "fixture.png" }, query: { printProfile: "4r" } };
  const failure = response();
  await handler(request, failure);
  assert.equal(failure.statusCode, 502);
  assert.equal(failure.body.saved, true);
  assert.equal(failure.body.printStatus, "failed");
  fail = false;
  const success = response();
  await handler(request, success);
  assert.equal(success.body.printStatus, "submitted");
  assert.equal(cupsCalls.length, 0);
  // macOS: same contract, but the job goes through CUPS
  ctx.IS_WINDOWS = false;
  const mac = response();
  await handler(request, mac);
  assert.equal(mac.body.printStatus, "submitted");
  assert.deepEqual(cupsCalls, [["fixture.png", "Mock", 1]]);
  fail = true;
  const macFailure = response();
  await handler(request, macFailure);
  assert.equal(macFailure.statusCode, 502);
  assert.equal(macFailure.body.saved, true);
  const missing = response();
  await handler({ query: {} }, missing);
  assert.equal(missing.statusCode, 400);
});

test("PIN endpoints reject former master credentials and issue sessions only for the configured PIN", () => {
  const source = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
  const handlers = new Map();
  const adminSessions = createAdminSessions();
  const record = { pinHash: crypto.createHmac("sha256", "IGNOS_PIN_SALT_2026").update("12345678").digest("hex"), isDefaultPin: false };
  const ctx = { path, crypto, __dirname: "mock", process: { env: {} }, adminSessions,
    app: { get: (p, h) => handlers.set(p, h), post: (p, h) => handlers.set(p, h) },
    fs: { existsSync: () => true, readFileSync: () => JSON.stringify(record) },
  };
  vm.runInNewContext(source.slice(source.indexOf("const SECURITY_FILE"), source.indexOf("// Watch PHOTOS_DIR")), ctx);
  for (const pin of ["888888", "IGNOS-MASTER-ADMIN-RESET"]) {
    const res = response();
    handlers.get("/api/security/verify-pin")({ body: { pin } }, res);
    assert.equal(res.statusCode, 401);
  }
  const valid = response();
  handlers.get("/api/security/verify-pin")({ body: { pin: "12345678" } }, valid);
  assert.equal(valid.body.success, true);
  assert.ok(adminSessions.valid({ headers: { authorization: `Bearer ${valid.body.token}` } }));
  const reset = response();
  handlers.get("/api/security/reset-pin")({ body: { recoveryKey: "888888" } }, reset);
  assert.equal(reset.statusCode, 403);
});

test("kiosk endpoint stages the receipt, uses configured prices, and records one sale on duplicate requests", async (t) => {
  const f = fixture(t);
  const photos = path.join(path.dirname(f.queueDir), "photos");
  const thumbs = path.join(path.dirname(f.queueDir), "thumbs");
  fs.mkdirSync(photos); fs.mkdirSync(thumbs);
  fs.writeFileSync(path.join(photos, "camera.jpg"), "fixture");
  fs.writeFileSync(path.join(photos, "receipt.pdf"), "fixture");
  let handler, sessions = [];
  const source = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
  const ctx = { app: { post: (_p, h) => { handler = h; } }, fs, path, crypto, Buffer,
    PHOTOS_DIR: photos, THUMBS_DIR: thumbs, UPLOAD_QUEUE_DIR: f.queueDir,
    childPath, writeJsonAtomic, priceKioskSession, nonNegative: (v, fallback = 0) => v == null ? fallback : Number(v),
    readPricing: () => pricing, readKioskTheme: () => ({}), readSessions: () => sessions, writeSessions: (v) => { sessions = v; },
    createCustomerFolder: async () => { throw new Error("Mock offline"); },
    updateDriveSession: (id, changes) => Object.assign(sessions.find((s) => s.id === id), changes),
    console: { log() {}, error() {} }, uploadProgress: null, preparingKioskSessions: new Set(),
  };
  vm.runInNewContext(source.slice(source.indexOf('app.post("/api/upload-session-gdrive"'), source.indexOf("async function generateThumbnail")), ctx);
  const id = `KIOSK-${crypto.randomUUID()}`;
  const req = { body: { sessionId: id, customerName: "Test", peopleCount: 4, makeStory: true, printFiles: ["receipt.pdf"], miscAddons: [{ productId: "portrait-full", kind: "idcard", name: "ID Card", qty: 1 }] } };
  const first = response(), second = response();
  await Promise.all([handler(req, first), handler(req, second)]);
  assert.equal(first.body.success, true);
  assert.equal(second.body.success, true);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].basePrice, 130000);
  assert.equal(sessions[0].totalPrice, 165000);
  assert.ok(sessions[0].files.includes("receipt.pdf"));
  assert.ok(fs.existsSync(path.join(f.queueDir, id, "camera.jpg")));
  assert.equal(sessions[0].driveStatus, "offline_pending");
});

test("cashier endpoint is idempotent and never reports success on disk write failure", () => {
  const source = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
  let handler, sessions = [], failWrite = false;
  const ctx = { app: { post: (_p, h) => { handler = h; } }, readSessions: () => [...sessions], writeSessions: (v) => { if (failWrite) throw new Error("Mock disk failure"); sessions = v; } };
  vm.runInNewContext(source.slice(source.indexOf('app.post("/api/sessions"'), source.indexOf('app.delete("/api/sessions/')), ctx);
  const request = { body: { id: "CASH-one", customerName: "Test", totalPrice: 100000 } };
  handler(request, response()); handler(request, response());
  assert.equal(sessions.length, 1);
  failWrite = true;
  const res = response();
  assert.throws(() => handler({ body: { ...request.body, id: "CASH-two" } }, res), /disk failure/);
  assert.equal(res.body, undefined);
});

test("frontend API sends admin credentials and rejects failed print uploads", async () => {
  const source = fs.readFileSync(new URL("../src/utils/api.ts", import.meta.url), "utf8");
  const compiled = await transform(source, { loader: "ts", format: "cjs" });
  const events = [], calls = [];
  const ctx = { module: { exports: {} }, Headers, URL,
    sessionStorage: { getItem: () => "server-token" },
    window: { location: { href: "http://localhost:5173", hostname: "localhost" }, dispatchEvent: (e) => events.push(e) },
    Event, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    fetch: async (_input, options) => { calls.push(options); return { ok: false, status: 502, json: async () => ({ error: "Mock printer offline" }) }; },
  };
  vm.runInNewContext(compiled.code, ctx);
  await assert.rejects(ctx.module.exports.apiFetch("http://localhost:5000/api/save-print", { method: "POST" }), /printer offline/);
  assert.equal(calls[0].headers.get("Authorization"), "Bearer server-token");
  assert.equal(calls[0].credentials, "include");
  assert.equal(events[0].type, "ignos-print-error");
});
