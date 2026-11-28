import { prepareGallery, publishGallery } from "./backend/photoTransfer.js";
import { createCameraImporter } from "./backend/cameraImport.js";
import { createImportHistory } from "./backend/importHistory.js";
import { createDeviceWatcher } from "./backend/deviceWatcher.js";
import { createMtpQueue } from "./backend/mtpQueue.js";
import { listImportBackups, cleanImportBackups, IMPORT_BACKUP_KEEP_LATEST } from "./backend/importBackups.js";
import { summarizeSessions, buildReport, transactionsCsv, dailyCsv } from "./backend/reports.js";
import crypto from "crypto";
import os from "os";
import { exec, execSync, execFile, spawn } from "child_process";
import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import sharp from "sharp";
import multer from "multer";
import pdfToPrinter from "pdf-to-printer";
const { print, getPrinters } = pdfToPrinter;
import { cupsPrint, cupsListPrinters, cupsPrinterStatus, cupsCancelAllJobs, resolveQueueName } from "./backend/cupsPrinter.js";
import { applyPrintInset, hasInset, removeQuietly, normalizePrintInset } from "./backend/printInset.js";
import { readHubConfig, tokenMatches, forwardPrintJob, fetchHubStatus, hubUnreachableStatus, HUB_TOKEN_HEADER, buildHubConfigFromForm, parseHubConfig, lanAddresses } from "./backend/printHub.js";
// Windows: pdf-to-printer (SumatraPDF) + PowerShell spooler. macOS/Linux: CUPS (lp/lpstat).
const IS_WINDOWS = process.platform === "win32";

// Disable sharp cache to release file locks on Windows
sharp.cache(false);
import { fileURLToPath } from "url";
import { createCustomerFolder, uploadMultipleFiles, testFolderAccess, PARENT_FOLDER_ID } from "./gdrive.js";

import { createQueueUploader } from "./backend/uploadQueue.js";
import { createAdminSessions } from "./backend/security.js";
import { childPath, writeJsonAtomic } from "./backend/safety.js";
import { priceKioskSession, reportPrints, reportSoftcopy, nonNegative } from "./backend/pricing.js";

const app = express();
const adminSessions = createAdminSessions();
const allowedOrigins = new Set([
  "http://localhost:5173", "http://127.0.0.1:5173",
  "http://localhost:4173", "http://127.0.0.1:4173",
  ...(process.env.IGNOS_ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
]);
app.use((req, res, next) => {
  if (req.headers.origin && !allowedOrigins.has(req.headers.origin)) {
    return res.status(403).json({ error: "Origin tidak diizinkan." });
  }
  next();
});
app.use(cors({ origin: (origin, done) => done(null, !origin || allowedOrigins.has(origin)), credentials: true }));
app.use(express.json({ limit: "30mb" }));
app.use("/api", adminSessions.middleware);

let cameraImporter;
let manualUploadBusy = false;
app.use("/api", (req, res, next) => {
  if ((cameraImporter?.busy || manualUploadBusy) && req.method !== "GET" && ["/save-print", "/upload-session-gdrive", "/clear-photos", "/upload-photos", "/storage-clean", "/camera-import/import", "/camera-import/scan"].includes(req.path)) {
    return res.status(409).json({ success: false, error: "Impor foto sedang berlangsung. Tunggu hingga galeri siap." });
  }
  next();
});

// fix __dirname di ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PHOTOS_DIR = path.join(__dirname, "public/photos");
const THUMBS_DIR = path.join(__dirname, "public/thumbnails");
const UPLOAD_QUEUE_DIR = path.join(__dirname, "storage/upload_queue");
const ARCHIVE_DIR = path.join(__dirname, "storage/archive");
const CAMERA_CACHE_DIR = path.join(__dirname, "storage/camera_cache");

// public/photos is git-ignored (customer photos), so a fresh clone must create it.
if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_QUEUE_DIR)) fs.mkdirSync(UPLOAD_QUEUE_DIR, { recursive: true });
if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
if (!fs.existsSync(CAMERA_CACHE_DIR)) fs.mkdirSync(CAMERA_CACHE_DIR, { recursive: true });
const TEMPLATES_DIR = path.join(__dirname, "public/templates");
const TEMPLATES_JSON = path.join(TEMPLATES_DIR, "templates.json");
const PRINTERS_JSON = path.join(__dirname, "public/printers.json");
// Kept out of public/ because it holds the shared hub token.
const PRINT_HUB_JSON = path.join(__dirname, "data/print-hub.json");
const PRINT_HUB_JOBS_DIR = path.join(__dirname, "storage/print-hub");
const SESSIONS_DIR = path.join(__dirname, "data");
const SESSIONS_JSON = path.join(SESSIONS_DIR, "sessions.json");

function readSessions() {
  if (!fs.existsSync(SESSIONS_JSON)) return [];
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_JSON, "utf-8"));
  } catch (err) {
    throw new Error("Data transaksi tidak dapat dibaca: " + err.message);
  }
}

function writeSessions(sessions) {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
  writeJsonAtomic(SESSIONS_JSON, sessions);
}

function readTemplates() {
  return JSON.parse(fs.readFileSync(TEMPLATES_JSON, "utf-8"));
}
function writeTemplates(data) {
  fs.writeFileSync(TEMPLATES_JSON, JSON.stringify(data, null, 2), "utf-8");
}

function readPrinters() {
  if (!fs.existsSync(PRINTERS_JSON)) return { version: 1, profiles: [] };
  return JSON.parse(fs.readFileSync(PRINTERS_JSON, "utf-8"));
}
function writePrinters(data) {
  // Atomic: a print reading printers.json mid-save must never see half a file.
  writeJsonAtomic(PRINTERS_JSON, data);
}

const templateImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir;
    try { dir = childPath(TEMPLATES_DIR, req.params.name); } catch (err) { return cb(err); }
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const expected = `${file.fieldname}.png`;
    cb(null, expected);
  },
});
const uploadTemplateImage = multer({
  storage: templateImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// buat folder thumbnail kalau belum ada
if (!fs.existsSync(THUMBS_DIR)) {
  fs.mkdirSync(THUMBS_DIR, { recursive: true });
}

// serve images
app.use("/photos", express.static(PHOTOS_DIR));
app.use("/thumbs", express.static(THUMBS_DIR));
// Camera previews are served through authenticated scan-bound endpoints.

// upload hasil print
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PHOTOS_DIR);
  },
  filename: function (req, file, cb) {
    // Jika frontend mengirimkan nama file spesifik (bukan default "blob"), gunakan nama tersebut
    if (file.originalname && file.originalname !== "blob") {
      try { childPath(PHOTOS_DIR, file.originalname); cb(null, file.originalname); } catch (err) { cb(err); }
    } else {
      const label = (req.query.label?.toString() || "print").replace(/[^a-zA-Z0-9_-]/g, "_");
      const ext = path.extname(file.originalname) || ".png";
      cb(null, `${label}-${Date.now()}${ext}`);
    }
  },
});

const upload = multer({ storage });

function findPrinterProfile(productType) {
  if (!productType) return null;
  const data = readPrinters();
  return data.profiles.find((p) => p.appliesTo.includes(productType)) || null;
}

async function autoPrintFile(filePath, productType, copiesOverride, { title } = {}) {
  // Kiosk mode: the printers live on the print hub (MacBook); send the file there.
  const hub = readHubConfig(PRINT_HUB_JSON);
  if (hub.role === "kiosk") return forwardPrintJob({ hub, filePath, productType, copies: copiesOverride });

  const profile = findPrinterProfile(productType);
  if (!profile) throw new Error(`Profil printer untuk ${productType} belum dikonfigurasi. File tetap tersimpan.`);
  const copies = copiesOverride ?? profile.copies ?? 1;
  if (!Number.isInteger(copies) || copies < 1 || copies > 100) throw new Error("Jumlah salinan harus 1–100.");
  if (!IS_WINDOWS) {
    // Compensate the borderless overspray measured for this printer (see backend/printInset.js).
    const padded = hasInset(profile.printInset) && /\.(png|jpe?g|webp)$/i.test(filePath)
      ? await applyPrintInset(filePath, profile.printInset, profile.printInset.paperShortMm)
      : null;
    try {
      await cupsPrint(padded || filePath, {
        printer: profile.printerName, copies, scale: "fit",
        paperSize: profile.paperSize, cupsOptions: profile.cupsOptions, title,
      });
    } finally {
      // lp has copied the file into the CUPS spool once it returns.
      if (padded) removeQuietly(padded);
    }
    return "submitted";
  }
  await print(filePath, {
    printer: profile.printerName, copies, printDialog: false, silent: true, scale: "fit",
    ...(profile.paperSize ? { paperSize: profile.paperSize } : {}),
  });
  return "submitted";
}

app.post("/api/save-print", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: "File cetak wajib dikirim." });
  const productType = req.query.printProfile?.toString();
  const copies = req.query.copies === undefined ? undefined : Number(req.query.copies);
  const saved = { file: `http://localhost:5000/photos/${encodeURIComponent(req.file.filename)}`, filename: req.file.filename, saved: true };
  try {
    const printStatus = productType ? await autoPrintFile(req.file.path, productType, copies) : "saved";
    res.json({ success: true, ...saved, printStatus });
  } catch (err) {
    res.status(502).json({ success: false, ...saved, printStatus: "failed", error: `File tersimpan, tetapi pengiriman ke printer gagal: ${err.message}. Periksa antrean printer sebelum mencoba lagi.` });
  }
});

// ── Google Drive Session Upload API & Progress Tracker ──────────────────────────────
let latestDriveSession = null;

let uploadProgress = {
  isUploading: false,
  folderName: "",
  webViewLink: "",
  customerName: "",
  total: 0,
  uploaded: 0,
  percent: 0,
  currentFile: "",
  files: [],
  updatedAt: new Date().toISOString(),
};

app.get("/api/gdrive-upload-status", (req, res) => {
  res.json(uploadProgress);
});

app.get("/api/latest-session-drive", (req, res) => {
  res.json(latestDriveSession || { success: false, message: "Belum ada sesi Google Drive" });
});

app.get("/api/gdrive-auth-status", async (req, res) => {
  try {
    const folderInfo = await testFolderAccess();
    res.json({
      connected: true,
      folderName: folderInfo?.name || "Root",
      parentFolderId: PARENT_FOLDER_ID,
    });
  } catch (err) {
    const errMsg = err?.message || String(err);
    const isTokenExpired =
      errMsg.includes("invalid_grant") ||
      errMsg.includes("Token has been expired") ||
      errMsg.includes("revoked");
    res.json({
      connected: false,
      isTokenExpired,
      error: errMsg,
    });
  }
});

app.post("/api/gdrive-trigger-auth", (req, res) => {
  try {
    const authScriptPath = path.join(__dirname, "auth_gdrive.cjs");
    if (!fs.existsSync(authScriptPath)) {
      return res.status(404).json({ error: "Script auth_gdrive.cjs tidak ditemukan" });
    }
    console.log("[GDrive] Menjalankan auth_gdrive.cjs untuk login ulang Google Drive...");
    exec(`node "${authScriptPath}"`, (err, stdout, stderr) => {
      if (err) {
        console.error("[GDrive] Error saat auth_gdrive.cjs:", err.message);
      } else {
        console.log("[GDrive] auth_gdrive.cjs selesai:", stdout);
      }
    });
    res.json({
      success: true,
      message: "Browser otorisasi Google Drive sedang dibuka di komputer kasir...",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/gdrive-pending-queue", (req, res) => {
  try {
    if (!fs.existsSync(UPLOAD_QUEUE_DIR)) {
      return res.json({ queue: [] });
    }
    const folders = fs.readdirSync(UPLOAD_QUEUE_DIR).filter((f) => {
      const fullPath = path.join(UPLOAD_QUEUE_DIR, f);
      return fs.statSync(fullPath).isDirectory();
    });

    const queue = folders.map((folderName) => {
      const folderPath = path.join(UPLOAD_QUEUE_DIR, folderName);
      const files = fs.readdirSync(folderPath);
      let sessionInfo = null;
      const infoPath = path.join(folderPath, "session_info.json");
      if (fs.existsSync(infoPath)) {
        try {
          sessionInfo = JSON.parse(fs.readFileSync(infoPath, "utf8"));
        } catch {}
      }
      return {
        folderName,
        folderPath,
        fileCount: files.filter((f) => f.match(/\.(jpg|jpeg|png|webp|pdf)$/i)).length,
        sessionInfo,
      };
    });

    res.json({ queue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const preparingKioskSessions = new Set();

function updateDriveSession(id, changes) {
  const sessions = readSessions();
  const session = sessions.find((s) => s.id === id);
  if (session) { Object.assign(session, changes); writeSessions(sessions); }
}
const uploadQueuedSession = createQueueUploader({
  queueDir: UPLOAD_QUEUE_DIR, archiveDir: ARCHIVE_DIR,
  createFolder: createCustomerFolder, uploadFiles: uploadMultipleFiles, updateSession: updateDriveSession,
});

app.post("/api/gdrive-upload-pending", async (req, res) => {
  try {
    const { folderName } = req.body || {};
    if (folderName) childPath(UPLOAD_QUEUE_DIR, folderName);
    const folders = folderName ? [folderName] : fs.readdirSync(UPLOAD_QUEUE_DIR).filter((f) => fs.statSync(childPath(UPLOAD_QUEUE_DIR, f)).isDirectory());
    const results = [];
    for (const folder of folders) {
      try {
        if (preparingKioskSessions.has(folder)) throw new Error("Sesi masih disiapkan oleh kiosk. Coba lagi setelah selesai.");
        const result = await uploadQueuedSession(folder);
        latestDriveSession = { ...result.folderResult, createdAt: new Date().toISOString() };
        results.push({ folder, success: true, ...result });
      } catch (err) { results.push({ folder, success: false, error: err.message }); }
    }
    const failed = results.filter((r) => !r.success).length;
    res.status(failed ? 502 : 200).json({ success: !failed, results,
      message: `${results.length - failed} sesi berhasil diunggah.`,
      ...(failed ? { error: `${failed} sesi belum selesai. Foto tetap di antrean lokal; silakan coba lagi.` } : {}),
    });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

app.post("/api/upload-session-gdrive", async (req, res) => {
  let preparingId;
  try {
    const {
      customerName = "",
      rawPhotos = [],
      printFiles = [],
      peopleCount = 1,
      coupleMode = false,
      joinedBonus = false,
      makeStory = true,
      extraCharge = 0,
      totalPrint = 1,
      regularPrint = 1,
      bonusPrint = 0,
      a4Count = 0,
      miscAddons = [],
    } = req.body;

    if (!Array.isArray(rawPhotos) || !Array.isArray(printFiles) || [...rawPhotos, ...printFiles].some((v) => typeof v !== "string")) {
      return res.status(400).json({ error: "Daftar file sesi tidak valid." });
    }
    const sessionId = req.body.sessionId || `KIOSK-${crypto.randomUUID()}`;
    if (!/^KIOSK-[a-f0-9-]{36}$/.test(sessionId)) return res.status(400).json({ error: "ID sesi tidak valid." });
    const existing = readSessions().find((s) => s.id === sessionId);
    if (existing) return res.json({ success: true, sessionId, folderName: existing.driveFolderName || "Antrean lokal",
      webViewLink: existing.driveWebViewLink || "", offlineQueue: !existing.driveWebViewLink, totalFiles: existing.totalFiles });
    preparingId = sessionId;
    preparingKioskSessions.add(sessionId);

    const cleanCustomerName = customerName ? customerName.replace(/^@+/, "").trim() : "";
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const timeStr = `${hours}.${minutes}`;

    const priced = priceKioskSession(req.body, readPricing(), readKioskTheme().freeEventMode === true);
    const { addonsTotal, a4Total, softcopyTotal, basePrice: sessionBasePrice, totalPrice: finalTotalPrice } = priced;

    // ─── 1. SESSION STAGING QUEUE (ISOLASI FILE SESI PERTAMA KALI) ─────────
    // Dibuat PERTAMA agar file foto tidak pernah hilang meskipun Google Drive offline
    const safeSessionDirName = sessionId;
    const sessionStagingDir = path.join(UPLOAD_QUEUE_DIR, safeSessionDirName);
    fs.mkdirSync(sessionStagingDir, { recursive: true });

    const filePathsToUpload = fs.readdirSync(sessionStagingDir).filter((f) => /\.(jpg|jpeg|png|webp|pdf)$/i.test(f)).map((f) => childPath(sessionStagingDir, f));

    const sessionMeta = {
      id: sessionId,
      timestamp: now.toISOString(),
      date: dateStr,
      time: timeStr,
      customerName: cleanCustomerName || "Customer",
      peopleCount: Number(peopleCount) || 1,
      coupleMode: Boolean(coupleMode),
      joinedBonus: Boolean(joinedBonus),
      makeStory: Boolean(makeStory),
      softcopyType: makeStory ? "story_free" : "paid",
      softcopyCharge: softcopyTotal,
      prints: {
        regular: nonNegative(regularPrint, Number(peopleCount) || 1) + priced.miscAddons.filter((a) => a.productId === "4r-print" || a.name === "Cetak Foto 4R").reduce((n, a) => n + a.qty, 0),
        bonus: Number(bonusPrint) || (joinedBonus ? Number(peopleCount) : 0),
        total: nonNegative(totalPrint, Number(peopleCount) || 1) + priced.miscAddons.filter((a) => a.productId === "4r-print" || a.name === "Cetak Foto 4R").reduce((n, a) => n + a.qty, 0),
      },
      a4Count: Number(a4Count) || 0,
      miscAddons: priced.miscAddons,
      source: "kiosk",
      basePrice: sessionBasePrice,
      totalAddonsPrice: addonsTotal + a4Total,
      totalPrice: finalTotalPrice,
      totalFiles: filePathsToUpload.length,
      files: filePathsToUpload.map((p) => path.basename(p)),
      stagingDir: safeSessionDirName,
      status: "staging",
    };
    writeJsonAtomic(path.join(sessionStagingDir, "session_info.json"), sessionMeta);

    // Helper untuk memindahkan file secara aman
    function stageFile(sourcePath, filename) {
      const destPath = path.join(sessionStagingDir, filename);
      try {
        fs.renameSync(sourcePath, destPath);
      } catch (err) {
        fs.copyFileSync(sourcePath, destPath);
        try { fs.unlinkSync(sourcePath); } catch {}
      }
      return destPath;
    }

    // A. Simpan data:image base64 langsung ke staging folder
    const uniqueItems = Array.from(new Set([...rawPhotos, ...printFiles]));
    for (const item of uniqueItems) {
      if (!item) continue;
      if (item.startsWith("data:image/")) {
        const matches = item.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
          const buffer = Buffer.from(matches[2], "base64");
          const tempName = `print-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
          const destPath = path.join(sessionStagingDir, tempName);
          fs.writeFileSync(destPath, buffer);
          filePathsToUpload.push(destPath);
        }
      }
    }

    // B. Pindahkan SEMUA foto jepretan kamera dari public/photos ke staging folder
    if (fs.existsSync(PHOTOS_DIR)) {
      const existingPhotos = fs.readdirSync(PHOTOS_DIR);
      for (const f of existingPhotos) {
        if (f.match(/\.(jpg|jpeg|png|webp)$/i) || (f.toLowerCase().endsWith(".pdf") && printFiles.some((v) => typeof v === "string" && (v === f || v.endsWith("/" + encodeURIComponent(f)) || v.endsWith("/" + f))))) {
          const srcPath = path.join(PHOTOS_DIR, f);
          const stagedPath = stageFile(srcPath, f);
          filePathsToUpload.push(stagedPath);

          // Hapus thumbnail di THUMBS_DIR agar galeri sesi berikutnya juga bersih
          const thumbPath = path.join(THUMBS_DIR, f);
          if (fs.existsSync(thumbPath)) {
            try { fs.unlinkSync(thumbPath); } catch {}
          }
        }
      }
    }

    console.log(`[GDrive] ${filePathsToUpload.length} foto berhasil diisolasi ke antrian: ${sessionStagingDir}`);
    console.log(`[GDrive] Folder ${PHOTOS_DIR} kini telah bersih dan siap untuk sesi berikutnya.`);

    // ─── 2. SIMPAN METADATA SESI SECARA LOKAL ──────────────────────
    sessionMeta.files = filePathsToUpload.map((p) => path.basename(p));
    sessionMeta.totalFiles = filePathsToUpload.length;
    sessionMeta.status = "queued";

    writeJsonAtomic(path.join(sessionStagingDir, "session_info.json"), sessionMeta);
    const allSessions = readSessions();
    allSessions.unshift({ ...sessionMeta, driveStatus: "queued", driveWebViewLink: "" });
    writeSessions(allSessions);


    // ─── 3. HUBUNGI GOOGLE DRIVE DENGAN PERLINDUNGAN TRY/CATCH ──────
    let folderResult = null;
    let driveError = null;

    try {
      console.log(`[GDrive] Mencoba membuat folder Google Drive untuk sesi: "${cleanCustomerName || "Tanpa Nama"}"...`);
      folderResult = await createCustomerFolder(cleanCustomerName);
      console.log(`[GDrive] Folder dibuat: ${folderResult.folderName} (${folderResult.webViewLink})`);
    } catch (err) {
      driveError = err?.message || "Gagal menghubungkan Google Drive";
      console.error("[GDrive] Gagal membuat folder Google Drive (Disimpan aman di antrian lokal):", driveError);
    }

    updateDriveSession(sessionId, {
      driveFolderName: folderResult?.folderName || "Antrean Lokal (Drive Belum Login)",
      driveWebViewLink: folderResult?.webViewLink || "",
      driveStatus: folderResult ? "ready" : "offline_pending", driveError,
    });

    // ─── 4. RESPON KE FRONTEND (KIOSK) ────────────────────────────
    if (folderResult) {
      sessionMeta.driveFolder = folderResult;
      writeJsonAtomic(path.join(sessionStagingDir, "session_info.json"), sessionMeta);
      latestDriveSession = {
        customerName: cleanCustomerName,
        folderName: folderResult.folderName,
        webViewLink: folderResult.webViewLink,
        createdAt: new Date().toISOString(),
      };

      uploadProgress = {
        sessionId,
        isUploading: true,
        folderName: folderResult.folderName,
        webViewLink: folderResult.webViewLink,
        customerName: cleanCustomerName,
        total: filePathsToUpload.length,
        uploaded: 0,
        percent: 0,
        currentFile: filePathsToUpload.length > 0 ? path.basename(filePathsToUpload[0]) : "",
        files: filePathsToUpload.map((p) => ({
          name: path.basename(p),
          status: "pending",
        })),
        updatedAt: new Date().toISOString(),
      };

      res.json({
        success: true,
        folderId: folderResult.folderId,
        folderName: folderResult.folderName,
        webViewLink: folderResult.webViewLink,
        totalFiles: filePathsToUpload.length,
      });

      const progress = uploadProgress;
      // Background upload Google Drive
      (async () => {
        try {
          console.log(`[GDrive] Mengunggah ${filePathsToUpload.length} file ke ${folderResult.folderName}...`);
          await uploadQueuedSession(
            safeSessionDirName,
            (uploadedCount, totalCount, fileName, status) => {
              const fileItem = progress.files.find((f) => f.name === fileName);
              if (fileItem) fileItem.status = status;
              progress.uploaded = uploadedCount;
              progress.percent = totalCount ? Math.round((progress.uploaded / totalCount) * 100) : 100;
              progress.currentFile = status === "uploading" ? fileName : "";
              progress.updatedAt = new Date().toISOString();
            }
          );
          progress.isUploading = false;
          progress.percent = 100;
          progress.currentFile = "";
          progress.updatedAt = new Date().toISOString();
          console.log(`[GDrive] Selesai! Semua ${filePathsToUpload.length} file berhasil diunggah ke ${folderResult.folderName}.`);

        } catch (uploadErr) {
          progress.isUploading = false;
          progress.error = uploadErr.message;
          console.error("[GDrive] Error saat background file upload:", uploadErr);
        }
      })();
    } else {
      // GOOGLE DRIVE SEDANG OFFLINE / TOKEN EXPIRED
      // Foto TETAP AMAN di antrian storage/upload_queue!
      uploadProgress = {
        sessionId,
        isUploading: false,
        folderName: "Antrian Offline (PC Lokal)",
        webViewLink: "",
        customerName: cleanCustomerName,
        total: filePathsToUpload.length,
        uploaded: 0,
        percent: 0,
        currentFile: "",
        error: `Google Drive offline: ${driveError}. Semua foto aman tersimpan di antrian lokal.`,
        files: filePathsToUpload.map((p) => ({
          name: path.basename(p),
          status: "queued",
        })),
        updatedAt: new Date().toISOString(),
      };

      res.json({
        success: true,
        offlineQueue: true,
        warning: "drive_offline",
        message: "Foto berhasil disimpan aman di antrian server. Google Drive sedang offline atau token kedaluwarsa.",
        folderName: `Antrian Lokal: ${cleanCustomerName || "Sesi Customer"}`,
        webViewLink: "",
        totalFiles: filePathsToUpload.length,
      });
    }
  } catch (err) {
    console.error("[GDrive] Fatal error di upload-session-gdrive:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (preparingId) preparingKioskSessions.delete(preparingId);
  }
});

async function generateThumbnail(file) {
  const inputPath = path.join(PHOTOS_DIR, file);
  const thumbPath = path.join(THUMBS_DIR, file);

  if (!fs.existsSync(thumbPath)) {
    try {
      await sharp(inputPath)
        .rotate()
        .resize(400) // ukuran thumbnail
        .jpeg({ quality: 80 })
        .toFile(thumbPath);
    } catch (err) {
      console.error(`Failed to generate thumbnail for ${file}:`, err);
    }
  }
}

app.get("/api/photos", async (req, res) => {
  try {
    const files = fs.readdirSync(PHOTOS_DIR);

    const images = [];

    for (const file of files) {
      if (file.match(/\.(jpg|jpeg|png|webp)$/i)) {
        // Run in the background without blocking the API response
        generateThumbnail(file);

        images.push({
          thumb: `http://localhost:5000/thumbs/${file}`,
          full: `http://localhost:5000/photos/${file}`,
        });
      }
    }

    res.json(images.reverse());
  } catch (err) {
    res.status(500).json({ error: "Cannot read photos folder" });
  }
});

app.post("/api/clear-photos", (req, res) => {
  try {
    let clearedCount = 0;
    if (fs.existsSync(PHOTOS_DIR)) {
      const files = fs.readdirSync(PHOTOS_DIR);
      for (const f of files) {
        if (f.match(/\.(jpg|jpeg|png|webp)$/i)) {
          try {
            fs.unlinkSync(path.join(PHOTOS_DIR, f));
            clearedCount++;
          } catch {}
        }
      }
    }
    if (fs.existsSync(THUMBS_DIR)) {
      const thumbs = fs.readdirSync(THUMBS_DIR);
      for (const t of thumbs) {
        try { fs.unlinkSync(path.join(THUMBS_DIR, t)); } catch {}
      }
    }
    console.log(`[Photos] Manual clear: ${clearedCount} foto dibersihkan dari folder kamera.`);
    res.json({ success: true, cleared: clearedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Storage Manager & Disk Cleanup API ────────────────────────

const STORAGE_CONFIG_JSON = path.join(SESSIONS_DIR, "storage-config.json");
const DEFAULT_STORAGE_CONFIG = {
  autoCleanEnabled: true,
  retentionDays: 7,
  lastCleanedAt: null,
};

function readStorageConfig() {
  if (!fs.existsSync(STORAGE_CONFIG_JSON)) {
    return DEFAULT_STORAGE_CONFIG;
  }
  try {
    return { ...DEFAULT_STORAGE_CONFIG, ...JSON.parse(fs.readFileSync(STORAGE_CONFIG_JSON, "utf-8")) };
  } catch {
    return DEFAULT_STORAGE_CONFIG;
  }
}

function writeStorageConfig(data) {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    fs.writeFileSync(STORAGE_CONFIG_JSON, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[Storage] Failed to write storage config:", err);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getDirectoryStats(dirPath) {
  let totalBytes = 0;
  let fileCount = 0;
  if (!fs.existsSync(dirPath)) return { bytes: 0, files: 0, formatted: "0 B" };
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    try {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
        } else if (entry.isFile()) {
          try {
            const stat = fs.statSync(fullPath);
            totalBytes += stat.size;
            fileCount++;
          } catch {}
        }
      }
    } catch {}
  }
  return { bytes: totalBytes, files: fileCount, formatted: formatBytes(totalBytes) };
}

function getDiskStats() {
  try {
    if (typeof fs.statfsSync === "function") {
      const stat = fs.statfsSync(__dirname);
      const total = stat.blocks * stat.bsize;
      const free = stat.bavail * stat.bsize;
      const used = total - free;
      return {
        totalBytes: total,
        freeBytes: free,
        usedBytes: used,
        usedPercent: total > 0 ? parseFloat(((used / total) * 100).toFixed(1)) : 0,
        totalFormatted: formatBytes(total),
        freeFormatted: formatBytes(free),
        usedFormatted: formatBytes(used),
      };
    }
  } catch (err) {
    console.warn("[Storage] statfsSync error:", err.message);
  }
  return null;
}

function getArchiveDateFolders() {
  if (!fs.existsSync(ARCHIVE_DIR)) return [];
  try {
    const dates = fs.readdirSync(ARCHIVE_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
      .reverse();

    const now = new Date();
    return dates.map((dateStr) => {
      const folderPath = path.join(ARCHIVE_DIR, dateStr);
      const stats = getDirectoryStats(folderPath);
      let sessionCount = 0;
      let sessionNames = [];
      try {
        const sub = fs.readdirSync(folderPath, { withFileTypes: true })
          .filter((e) => e.isDirectory());
        sessionCount = sub.length;
        sessionNames = sub.map((s) => s.name);
      } catch {}

      // Hitung umur folder (hari)
      let ageDays = 0;
      try {
        const fDate = new Date(dateStr);
        if (!isNaN(fDate.getTime())) {
          ageDays = Math.max(0, Math.floor((now.getTime() - fDate.getTime()) / (1000 * 60 * 60 * 24)));
        }
      } catch {}

      return {
        date: dateStr,
        bytes: stats.bytes,
        formatted: stats.formatted,
        files: stats.files,
        sessionCount,
        sessionNames,
        ageDays,
      };
    });
  } catch {
    return [];
  }
}

function getFullStorageStats() {
  const disk = getDiskStats();
  const cameraStats = getDirectoryStats(PHOTOS_DIR);
  const thumbsStats = getDirectoryStats(THUMBS_DIR);
  const cameraCacheStats = getDirectoryStats(CAMERA_CACHE_DIR);
  const queueStats = getDirectoryStats(UPLOAD_QUEUE_DIR);
  const archiveDateFolders = getArchiveDateFolders();

  const totalArchiveBytes = archiveDateFolders.reduce((sum, item) => sum + item.bytes, 0);
  const totalArchiveFiles = archiveDateFolders.reduce((sum, item) => sum + item.files, 0);
  const totalArchiveSessions = archiveDateFolders.reduce((sum, item) => sum + item.sessionCount, 0);

  // List files in camera_cache
  let cameraCacheItems = [];
  try {
    if (fs.existsSync(CAMERA_CACHE_DIR)) {
      const files = fs.readdirSync(CAMERA_CACHE_DIR);
      for (const f of files) {
        if (f.match(/\.(jpg|jpeg|png|webp)$/i)) {
          const p = path.join(CAMERA_CACHE_DIR, f);
          try {
            const stat = fs.statSync(p);
            cameraCacheItems.push({
              name: f,
              size: stat.size,
              formattedSize: formatBytes(stat.size),
              mtime: stat.mtime.toISOString(),
              timeFormatted: stat.mtime.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            });
          } catch {}
        }
      }
      cameraCacheItems.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
    }
  } catch {}

  // Queue subfolders
  let queueFolders = [];
  try {
    if (fs.existsSync(UPLOAD_QUEUE_DIR)) {
      queueFolders = fs.readdirSync(UPLOAD_QUEUE_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
    }
  } catch {}

  const config = readStorageConfig();
  const importBackups = listImportBackups(IMPORT_STORAGE_DIR);
  const importBackupBytes = importBackups.reduce((sum, item) => sum + item.bytes, 0);

  const studioTotalBytes =
    cameraStats.bytes +
    thumbsStats.bytes +
    cameraCacheStats.bytes +
    queueStats.bytes +
    totalArchiveBytes +
    importBackupBytes;

  return {
    disk,
    studioStorage: {
      totalBytes: studioTotalBytes,
      totalFormatted: formatBytes(studioTotalBytes),
      camera: {
        bytes: cameraStats.bytes + thumbsStats.bytes,
        formatted: formatBytes(cameraStats.bytes + thumbsStats.bytes),
        photoFiles: cameraStats.files,
        thumbFiles: thumbsStats.files,
      },
      cameraCache: {
        bytes: cameraCacheStats.bytes,
        formatted: cameraCacheStats.formatted,
        files: cameraCacheStats.files,
        items: cameraCacheItems,
      },
      queue: {
        bytes: queueStats.bytes,
        formatted: queueStats.formatted,
        folderCount: queueFolders.length,
        folders: queueFolders,
        isUploading: uploadProgress.isUploading,
        activeFolder: uploadProgress.folderName || null,
      },
      importBackups: {
        bytes: importBackupBytes,
        formatted: formatBytes(importBackupBytes),
        count: importBackups.length,
        failedCount: importBackups.filter((item) => item.status === "failed").length,
        keepLatest: IMPORT_BACKUP_KEEP_LATEST,
        latestAt: importBackups[0] ? new Date(importBackups[0].mtimeMs).toISOString() : null,
      },
      archive: {
        bytes: totalArchiveBytes,
        formatted: formatBytes(totalArchiveBytes),
        totalFiles: totalArchiveFiles,
        sessionCount: totalArchiveSessions,
        dateFolders: archiveDateFolders,
      },
    },
    retentionPolicy: config,
  };
}

// Background auto cleanup runner
function runAutoCleanup() {
  const config = readStorageConfig();
  if (!config.autoCleanEnabled || !config.retentionDays || config.retentionDays <= 0) {
    return;
  }

  try {
    const archiveFolders = getArchiveDateFolders();
    let freedBytes = 0;
    let deletedCount = 0;

    for (const item of archiveFolders) {
      if (item.ageDays >= config.retentionDays) {
        const targetPath = childPath(ARCHIVE_DIR, item.date);
        try {
          fs.rmSync(targetPath, { recursive: true, force: true });
          freedBytes += item.bytes;
          deletedCount++;
          console.log(`[Storage] Auto-clean menghapus arsip lama: ${item.date} (${item.formatted})`);
        } catch (e) {
          console.error(`[Storage] Gagal menghapus arsip ${item.date}:`, e.message);
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`[Storage] Auto-clean selesai: ${deletedCount} tanggal dibersihkan, ${formatBytes(freedBytes)} ruang disk dibebaskan.`);
    }

    config.lastCleanedAt = new Date().toISOString();
    writeStorageConfig(config);
  } catch (err) {
    console.error("[Storage] Error during auto cleanup:", err);
  }
}

// Jalankan auto cleanup berkala setiap 6 jam
setInterval(runAutoCleanup, 6 * 60 * 60 * 1000);
// Jalankan 15 detik setelah server start
setTimeout(runAutoCleanup, 15000);

app.get("/api/storage-stats", (req, res) => {
  try {
    res.json(getFullStorageStats());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/storage-policy", (req, res) => {
  try {
    const current = readStorageConfig();
    const { autoCleanEnabled, retentionDays } = req.body;
    const updated = {
      ...current,
      autoCleanEnabled: typeof autoCleanEnabled === "boolean" ? autoCleanEnabled : current.autoCleanEnabled,
      retentionDays: typeof retentionDays === "number" ? Math.max(1, retentionDays) : current.retentionDays,
    };
    writeStorageConfig(updated);
    res.json({ success: true, policy: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/storage-clean", (req, res) => {
  try {
    const { action, days, date } = req.body;
    let freedBytes = 0;
    let deletedCount = 0;

    if (action === "archive_by_days") {
      const thresholdDays = Number(days) || 7;
      const folders = getArchiveDateFolders();
      for (const item of folders) {
        if (item.ageDays >= thresholdDays) {
          const target = childPath(ARCHIVE_DIR, item.date);
          try {
            fs.rmSync(target, { recursive: true, force: true });
            freedBytes += item.bytes;
            deletedCount++;
          } catch (e) {
            console.error(`[Storage] Gagal hapus ${item.date}:`, e);
          }
        }
      }
    } else if (action === "camera_imports") {
      // Keep only the most recent import so the gallery it replaced can still be recovered.
      const result = cleanImportBackups(IMPORT_STORAGE_DIR, { keepLatest: 1, isBusy: () => cameraImporter.busy || manualUploadBusy });
      freedBytes += result.freedBytes;
      deletedCount += result.deletedCount;
    } else if (action === "archive_date") {
      if (!date) return res.status(400).json({ error: "Parameter 'date' diperlukan" });
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Tanggal arsip tidak valid." });
      const target = childPath(ARCHIVE_DIR, date);
      if (fs.existsSync(target)) {
        const stats = getDirectoryStats(target);
        fs.rmSync(target, { recursive: true, force: true });
        freedBytes += stats.bytes;
        deletedCount++;
      }
    } else if (action === "archive_all") {
      if (fs.existsSync(ARCHIVE_DIR)) {
        const entries = fs.readdirSync(ARCHIVE_DIR);
        for (const e of entries) {
          const target = childPath(ARCHIVE_DIR, e);
          const stats = getDirectoryStats(target);
          try {
            fs.rmSync(target, { recursive: true, force: true });
            freedBytes += stats.bytes;
            deletedCount++;
          } catch (err) {
            console.error(`[Storage] Gagal hapus ${e}:`, err);
          }
        }
      }
    } else if (action === "queue_stale") {
      // Bersihkan folder di upload_queue yang TIDAK sedang diupload
      if (fs.existsSync(UPLOAD_QUEUE_DIR)) {
        const activeFolderName = uploadProgress.isUploading ? uploadProgress.folderName : null;
        const entries = fs.readdirSync(UPLOAD_QUEUE_DIR, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            // Lindungi folder yang sedang diupload saat ini
            if (activeFolderName && entry.name.includes(activeFolderName)) {
              continue;
            }
            const target = path.join(UPLOAD_QUEUE_DIR, entry.name);
            const stats = getDirectoryStats(target);
            try {
              fs.rmSync(target, { recursive: true, force: true });
              freedBytes += stats.bytes;
              deletedCount++;
            } catch (err) {
              console.error(`[Storage] Gagal hapus queue ${entry.name}:`, err);
            }
          }
        }
      }
    } else if (action === "camera_cache") {
      // Kosongkan seluruh cache foto kamera MTP
      if (fs.existsSync(CAMERA_CACHE_DIR)) {
        const cacheFiles = fs.readdirSync(CAMERA_CACHE_DIR);
        for (const c of cacheFiles) {
          const p = path.join(CAMERA_CACHE_DIR, c);
          try {
            const stat = fs.statSync(p);
            // MTP previews live in per-scan subfolders.
            freedBytes += stat.isDirectory() ? getDirectoryStats(p).bytes : stat.size;
            fs.rmSync(p, { recursive: true, force: true });
            deletedCount++;
          } catch (e) {
            console.error(`[Storage] Gagal hapus cache ${c}:`, e.message);
          }
        }
      }
    } else if (action === "camera_cache_file") {
      // Hapus satu foto spesifik di camera_cache
      const targetName = req.body.fileName || req.body.date;
      if (!targetName) return res.status(400).json({ error: "Parameter 'fileName' diperlukan" });
      const safeName = path.basename(targetName);
      const p = path.join(CAMERA_CACHE_DIR, safeName);
      if (fs.existsSync(p)) {
        try {
          const stat = fs.statSync(p);
          // MTP previews live in per-scan subfolders.
          freedBytes += stat.isDirectory() ? getDirectoryStats(p).bytes : stat.size;
          fs.rmSync(p, { recursive: true, force: true });
          deletedCount = 1;
        } catch (e) {
          return res.status(500).json({ error: `Gagal menghapus file ${safeName}: ${e.message}` });
        }
      }
    } else if (action === "camera_all") {
      // Kosongkan kamera & thumbnail
      if (fs.existsSync(PHOTOS_DIR)) {
        const files = fs.readdirSync(PHOTOS_DIR);
        for (const f of files) {
          if (f.match(/\.(jpg|jpeg|png|webp)$/i)) {
            const p = path.join(PHOTOS_DIR, f);
            try {
              const stat = fs.statSync(p);
              freedBytes += stat.size;
              fs.unlinkSync(p);
              deletedCount++;
            } catch {}
          }
        }
      }
      if (fs.existsSync(CAMERA_CACHE_DIR)) {
        const cacheFiles = fs.readdirSync(CAMERA_CACHE_DIR);
        for (const c of cacheFiles) {
          const p = path.join(CAMERA_CACHE_DIR, c);
          try {
            const stat = fs.statSync(p);
            // MTP previews live in per-scan subfolders.
            freedBytes += stat.isDirectory() ? getDirectoryStats(p).bytes : stat.size;
            fs.rmSync(p, { recursive: true, force: true });
            deletedCount++;
          } catch {}
        }
      }
      if (fs.existsSync(THUMBS_DIR)) {
        const thumbs = fs.readdirSync(THUMBS_DIR);
        for (const t of thumbs) {
          const p = path.join(THUMBS_DIR, t);
          try {
            const stat = fs.statSync(p);
            freedBytes += stat.size;
            fs.unlinkSync(p);
          } catch {}
        }
      }
    } else {
      return res.status(400).json({ error: `Aksi '${action}' tidak dikenali` });
    }

    const config = readStorageConfig();
    config.lastCleanedAt = new Date().toISOString();
    writeStorageConfig(config);

    res.json({
      success: true,
      action,
      freedBytes,
      freedFormatted: formatBytes(freedBytes),
      deletedCount,
      message: `Berhasil membersihkan ${formatBytes(freedBytes)} (${deletedCount} item dihapus).`,
      stats: getFullStorageStats(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Smart Camera Importer API ──────────────────────────────────────

const CAMERA_IMPORT_CONFIG_JSON = path.join(SESSIONS_DIR, "camera-import-config.json");

const DEFAULT_CAMERA_IMPORT_CONFIG = {
  selectedPreset: "studio",
  presets: {
    studio: {
      id: "studio",
      name: "Foto Studio (Fujifilm X-S10)",
      path: "D:\\DCIM",
      defaultMinutes: 30,
    },
    fotobox: {
      id: "fotobox",
      name: "SD Card / Card Reader",
      path: "E:\\DCIM",
      defaultMinutes: 30,
    },
    custom: {
      id: "custom",
      name: "Folder Kustom",
      path: "",
      defaultMinutes: 30,
    },
  },
  lastImport: null,
};

function readCameraImportConfig() {
  if (!fs.existsSync(CAMERA_IMPORT_CONFIG_JSON)) {
    return DEFAULT_CAMERA_IMPORT_CONFIG;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(CAMERA_IMPORT_CONFIG_JSON, "utf-8"));
    return {
      ...DEFAULT_CAMERA_IMPORT_CONFIG,
      ...raw,
      presets: {
        ...DEFAULT_CAMERA_IMPORT_CONFIG.presets,
        ...(raw.presets || {}),
      },
    };
  } catch {
    return DEFAULT_CAMERA_IMPORT_CONFIG;
  }
}

function writeCameraImportConfig(data) {
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  writeJsonAtomic(CAMERA_IMPORT_CONFIG_JSON, data);
}

const MTP_SCRIPT_PATH = path.join(__dirname, "scripts", "mtp-manager.ps1");

function isMtpTarget(targetPath = "", presetId = "") {
  if (presetId === "studio") return true;
  if (!targetPath) return false;
  const p = targetPath.toLowerCase();
  return (
    p.includes("this pc") ||
    p.includes("x-s10") ||
    p.includes("external memory") ||
    !/^[a-zA-Z]:/.test(targetPath)
  );
}

// Background work (thumbnails, previews) may not hold the camera for long: a stuck transfer would
// otherwise delay the next scan. The staff's own import keeps the long limit.
const mtpQueue = createMtpQueue((args, options) => new Promise((resolve, reject) => {
  execFile("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", MTP_SCRIPT_PATH, ...args],
    { windowsHide: true, timeout: options.priority === "low" ? 3 * 60 * 1000 : 30 * 60 * 1000, maxBuffer: 20 * 1024 * 1024, encoding: "utf8" },
    (error, stdout) => {
      if (error) return reject(new Error("Kamera tidak dapat diakses: " + error.message));
      try { resolve(JSON.parse(stdout.trim().replace(/^\uFEFF/, ""))); } catch { reject(new Error("Respons kamera tidak valid.")); }
    });
}));
function runMtp(args, options) {
  return mtpQueue.run(args, options);
}

async function checkMtpDevice(targetPath = "") {
  try { return await runMtp(["-Action", "check", "-DeviceQuery", "X-S10"]); }
  catch (err) { return { connected: false, error: err.message, folders: [] }; }
}

// Menemukan folder DCIM atau folder kamera aktif (misal 263_FUJI, 264_FUJI, 100CANON)
function resolveCameraFolders(rootPath) {
  if (!rootPath || !fs.existsSync(rootPath)) return [];

  // 1. Cek apakah folder yang diberikan langsung berisi file foto JPG
  try {
    const directFiles = fs.readdirSync(rootPath);
    if (directFiles.some((f) => f.match(/\.(jpg|jpeg)$/i))) {
      let photoCount = 0;
      let latestMtime = 0;
      for (const file of directFiles) {
        if (file.match(/\.(jpg|jpeg)$/i)) {
          photoCount++;
          try {
            const stat = fs.statSync(path.join(rootPath, file));
            if (stat.mtimeMs > latestMtime) latestMtime = stat.mtimeMs;
          } catch {}
        }
      }
      return [{ folderPath: rootPath, folderName: path.basename(rootPath), photoCount, latestMtime }];
    }
  } catch {}

  // 2. Cek apakah di dalamnya ada folder DCIM
  let targetDcim = rootPath;
  const directDcim = path.join(rootPath, "DCIM");
  if (fs.existsSync(directDcim)) {
    targetDcim = directDcim;
  }

  // 3. Scan subfolder dalam DCIM
  try {
    const entries = fs.readdirSync(targetDcim, { withFileTypes: true });
    const subDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => {
        const folderPath = path.join(targetDcim, e.name);
        let photoCount = 0;
        let latestMtime = 0;
        try {
          const files = fs.readdirSync(folderPath);
          for (const file of files) {
            if (file.match(/\.(jpg|jpeg)$/i)) {
              photoCount++;
              try {
                const stat = fs.statSync(path.join(folderPath, file));
                if (stat.mtimeMs > latestMtime) latestMtime = stat.mtimeMs;
              } catch {}
            }
          }
        } catch {}
        return {
          folderPath,
          folderName: e.name,
          photoCount,
          latestMtime,
        };
      })
      // Sort: folder dengan foto paling baru muncul teratas, jika sama urutkan nama descending
      .sort((a, b) => {
        if (b.latestMtime !== a.latestMtime) return b.latestMtime - a.latestMtime;
        return b.folderName.localeCompare(a.folderName, undefined, { numeric: true });
      });

    if (subDirs.length > 0) return subDirs;
  } catch {}

  return [];
}

const IMPORT_STORAGE_DIR = path.join(__dirname, "storage", "camera_imports");
fs.mkdirSync(IMPORT_STORAGE_DIR, { recursive: true });
cameraImporter = createCameraImporter({
  photosDir: PHOTOS_DIR, thumbsDir: THUMBS_DIR, storageDir: IMPORT_STORAGE_DIR, cacheDir: CAMERA_CACHE_DIR,
  runMtp, resolveFolders: resolveCameraFolders, readConfig: readCameraImportConfig, saveConfig: writeCameraImportConfig,
  beforePublish: () => { photoWatcher?.close(); photoWatcher = null; }, afterPublish: () => startFileWatcher(),
  history: createImportHistory(path.join(SESSIONS_DIR, "import-history.json")),
});

// ── Camera / card reader plug detection (pushed to every open app screen via SSE) ──
const SYSTEM_DRIVE = (process.env.SystemDrive || "C:").slice(0, 1).toUpperCase();
function findCardFolders() {
  const found = [];
  for (const letter of "DEFGHIJKLMNOPQRSTUVWXYZ") {
    if (letter === SYSTEM_DRIVE) continue;
    const dcim = `${letter}:\\DCIM`;
    try { if (fs.statSync(dcim).isDirectory()) found.push(dcim); } catch { /* No drive or no card. */ }
  }
  return found;
}
const deviceWatcher = createDeviceWatcher({
  checkMtp: () => runMtp(["-Action", "check", "-DeviceQuery", readCameraImportConfig().presets.studio?.deviceQuery || "X-S10"]),
  findCards: findCardFolders,
  isBusy: () => cameraImporter.busy,
});
function startDeviceEvents() {
  const child = spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(__dirname, "scripts", "device-events.ps1"), "-ParentPid", String(process.pid)], { windowsHide: true });
  let buffer = "";
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    const lines = buffer.split(/\r?\n/); buffer = lines.pop();
    for (const line of lines) {
      if (line.trim() === "ready") deviceWatcher.setEventsAlive(true);
      else if (line.trim() === "change") deviceWatcher.notifyChange();
    }
  });
  child.on("error", (err) => console.warn("[CameraImport] Detektor perangkat gagal:", err.message));
  child.on("exit", () => {
    deviceWatcher.setEventsAlive(false);
    setTimeout(startDeviceEvents, 10000).unref();
  });
  process.once("exit", () => child.kill());
}

// Public on purpose: only says that a device was plugged in, never photo data.
app.get("/api/camera-import/events", (req, res) => {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  send({ type: "state", state: deviceWatcher.state });
  const unsubscribe = deviceWatcher.subscribe(send);
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25000);
  req.on("close", () => { clearInterval(heartbeat); unsubscribe(); });
});

app.get("/api/camera-import/config", async (req, res) => {
  try {
    const config = readCameraImportConfig();
    // Tambahkan status koneksi live untuk masing-masing preset
    const presetStatuses = {};
    for (const [key, p] of Object.entries(config.presets)) {
      let isConnected = false;
      let detectedFolders = [];

      if (key === "studio" || isMtpTarget(p.path, key)) {
        const mtpCheck = await checkMtpDevice(p.path);
        isConnected = !!mtpCheck.connected;
        const foldersList = Array.isArray(mtpCheck.folders)
          ? mtpCheck.folders
          : (mtpCheck.folders ? [mtpCheck.folders] : []);
        detectedFolders = foldersList.map((f) => f.name);
      } else {
        isConnected = !!(p.path && fs.existsSync(p.path));
        detectedFolders = isConnected ? resolveCameraFolders(p.path).map((f) => f.folderName) : [];
      }

      presetStatuses[key] = {
        ...p,
        isConnected,
        detectedFolders,
      };
    }
    res.json({
      selectedPreset: config.selectedPreset,
      presets: presetStatuses,
      lastImport: config.lastImport,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/camera-import/config", (req, res) => {
  try {
    const current = readCameraImportConfig();
    for (const preset of Object.values(req.body.presets || {})) {
      if (preset.defaultMinutes !== undefined && (!Number.isInteger(preset.defaultMinutes) || preset.defaultMinutes < 1 || preset.defaultMinutes > 180)) {
        return res.status(400).json({ error: "Durasi harus 1-180 menit." });
      }
    }
    const updated = {
      ...current,
      ...req.body,
      presets: {
        ...current.presets,
        ...(req.body.presets || {}),
      },
    };
    writeCameraImportConfig(updated);
    res.json({ success: true, config: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/camera-import/scan", async (req, res) => {
  try { res.json(await cameraImporter.scan(req.body)); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

app.get("/api/camera-import/progress", (req, res) => res.json(cameraImporter.progress));

// The grid announces the thumbnails it is about to show so they are read from the camera in one batch.
app.post("/api/camera-import/thumbs/warm", async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id) => typeof id === "string").slice(0, 120) : [];
  const results = await Promise.allSettled(ids.map((id) => cameraImporter.thumbnail(req.body.scanId, id)));
  res.json({ success: true, ready: results.filter((r) => r.status === "fulfilled").length });
});

// Thumbnails for the photo grid: the device's own thumbnail over USB, a resized copy for card readers.
app.get("/api/camera-import/thumb", async (req, res) => {
  try {
    const file = await cameraImporter.thumbnail(req.query.scanId, req.query.id);
    const buffer = await sharp(file).rotate().resize({ width: 240, height: 240, fit: "inside" }).jpeg({ quality: 70 }).toBuffer();
    res.set("Cache-Control", "private, max-age=1800").type("image/jpeg").send(buffer);
  } catch (err) {
    console.warn("[CameraImport] Thumbnail gagal:", req.query.id, err.message);
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/camera-import/preview", async (req, res) => {
  try {
    const file = await cameraImporter.preview(req.query.scanId, req.query.id);
    const buffer = await sharp(file).rotate().resize({ width: 1200, height: 1200, fit: "inside" }).jpeg({ quality: 82 }).toBuffer();
    res.set("Cache-Control", "private, max-age=1800").type("image/jpeg").send(buffer);
  } catch (err) {
    console.warn("[CameraImport] Preview gagal:", req.query.id, err.message);
    res.status(400).json({ error: err.message });
  }
});

// Each import leaves a backup of the gallery it replaced; keep only the newest few.
function trimImportBackups() {
  setImmediate(() => {
    const result = cleanImportBackups(IMPORT_STORAGE_DIR, { isBusy: () => cameraImporter.busy || manualUploadBusy });
    if (result.deletedCount) console.log(`[Storage] ${result.deletedCount} cadangan impor lama dihapus (${formatBytes(result.freedBytes)}).`);
  });
}

app.post("/api/camera-import/import", async (req, res) => {
  try { res.json(await cameraImporter.import(req.body)); trimImportBackups(); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// Membuka folder public/photos di Windows Explorer asli
app.post("/api/camera-import/open-folder", (req, res) => {
  try {
    let target = PHOTOS_DIR;
    if (req.body?.target === "camera_cache" || req.query?.target === "camera_cache") {
      target = CAMERA_CACHE_DIR;
    } else if (req.body?.target === "archive" || req.query?.target === "archive") {
      target = ARCHIVE_DIR;
    } else if (req.body?.target === "camera_imports" || req.query?.target === "camera_imports") {
      target = IMPORT_STORAGE_DIR;
    }
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
    const targetDir = target.replace(/\//g, "\\");
    exec(`explorer.exe "${targetDir}"`, (err) => {
      if (err) {
        console.warn("[CameraImport] explorer.exe warning:", err.message);
      }
    });
    res.json({ success: true, path: targetDir });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload multiple photos via Drag & Drop atau File Picker manual
const manualPhotoUpload = multer({ dest: path.join(IMPORT_STORAGE_DIR, "incoming"), limits: { fileSize: 100 * 1024 * 1024, files: 500 } }).array("photos", 500);
app.post("/api/upload-photos", (req, res) => {
  manualUploadBusy = true;
  manualPhotoUpload(req, res, async (uploadError) => {
    try {
      if (uploadError) throw uploadError;
      if (!req.files?.length) throw new Error("Pilih foto untuk diunggah.");
      const workDir = path.join(IMPORT_STORAGE_DIR, crypto.randomUUID());
      const files = req.files.map((file, index) => {
        if (!/\.(jpe?g|png|webp)$/i.test(file.originalname)) throw new Error("Format foto tidak didukung.");
        return { ...file, destName: `${path.basename(workDir).slice(0, 8)}-${index + 1}${path.extname(file.originalname).toLowerCase()}` };
      });
      const prepared = await prepareGallery({ files, workDir, photosDir: PHOTOS_DIR, clearExisting: req.body.clearExistingPhotos === "true",
        copy: async destination => { for (const file of files) await fs.promises.copyFile(file.path, childPath(destination, file.destName)); } });
      photoWatcher?.close();
      try { publishGallery({ photosDir: PHOTOS_DIR, thumbsDir: THUMBS_DIR, ...prepared, backupDir: path.join(workDir, "previous-gallery") }); }
      finally { startFileWatcher(); }
      res.json({ success: true, count: files.length, message: "Foto sudah diperiksa dan siap di galeri." });
      trimImportBackups();
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
    finally {
      for (const file of req.files || []) { try { fs.unlinkSync(file.path); } catch {} }
      manualUploadBusy = false;
    }
  });
});

// ── Template API ──────────────────────────────────────────────

app.get("/api/templates", (req, res) => {
  try {
    res.json(readTemplates());
  } catch (err) {
    res.status(500).json({ error: "Cannot read templates.json" });
  }
});

app.get("/api/categories", (req, res) => {
  try {
    res.json(readTemplates().categories);
  } catch (err) {
    res.status(500).json({ error: "Cannot read categories" });
  }
});

app.post("/api/categories", (req, res) => {
  const { id, name, image } = req.body;
  if (!id || !name) return res.status(400).json({ error: "id and name required" });
  const data = readTemplates();
  if (data.categories.find((c) => c.id === id)) {
    return res.status(409).json({ error: "Category already exists" });
  }
  data.categories.push({ id, name, image: image || "" });
  if (!data.templates[id]) data.templates[id] = [];
  writeTemplates(data);
  res.json({ success: true });
});

app.post("/api/templates", (req, res) => {
  const { category, name, layout, slots } = req.body;
  if (!category || !name || !layout) {
    return res.status(400).json({ error: "category, name, and layout are required" });
  }
  const data = readTemplates();
  if (!data.templates[category]) {
    return res.status(400).json({ error: `Category '${category}' not found` });
  }
  const existing = Object.values(data.templates).flat().find((t) => t.name === name);
  if (existing) return res.status(409).json({ error: "Template name already exists" });

  const dir = childPath(TEMPLATES_DIR, name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const entry = {
    id: Date.now(),
    name,
    preview: `/templates/${name}/background.png`,
    overlay: null,
    layout,
    previewTemplate: `/templates/${name}/preview.png`,
    slots: slots || null,
  };
  data.templates[category].push(entry);
  writeTemplates(data);
  res.json({ success: true, template: entry });
});

app.put("/api/templates/:id", (req, res) => {
  const id = Number(req.params.id);
  const changes = req.body;
  const data = readTemplates();
  let found = false;
  for (const category of Object.keys(data.templates)) {
    const idx = data.templates[category].findIndex((t) => t.id === id);
    if (idx !== -1) {
      data.templates[category][idx] = { ...data.templates[category][idx], ...changes };
      found = true;
      break;
    }
  }
  if (!found) return res.status(404).json({ error: "Template not found" });
  writeTemplates(data);
  res.json({ success: true });
});

app.delete("/api/templates/:id", (req, res) => {
  const id = Number(req.params.id);
  const deleteFiles = req.query.deleteFiles === "true";
  const data = readTemplates();
  let found = false;
  for (const category of Object.keys(data.templates)) {
    const idx = data.templates[category].findIndex((t) => t.id === id);
    if (idx !== -1) {
      const [removed] = data.templates[category].splice(idx, 1);
      if (deleteFiles) {
        const dir = childPath(TEMPLATES_DIR, removed.name);
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
      }
      found = true;
      break;
    }
  }
  if (!found) return res.status(404).json({ error: "Template not found" });
  writeTemplates(data);
  res.json({ success: true });
});

app.post(
  "/api/templates/:name/images",
  uploadTemplateImage.fields([
    { name: "background", maxCount: 1 },
    { name: "overlay", maxCount: 1 },
    { name: "preview", maxCount: 1 },
  ]),
  (req, res) => {
    const templateName = req.params.name;
    const data = readTemplates();
    let updated = false;
    for (const category of Object.keys(data.templates)) {
      const tpl = data.templates[category].find((t) => t.name === templateName);
      if (tpl) {
        tpl.preview = `/templates/${templateName}/background.png`;
        tpl.previewTemplate = `/templates/${templateName}/preview.png`;
        if (req.files?.overlay) {
          tpl.overlay = `/templates/${templateName}/overlay.png`;
        }
        updated = true;
        break;
      }
    }
    if (updated) writeTemplates(data);
    res.json({ success: true, files: req.files });
  }
);

// ── Printer API ──────────────────────────────────────────────

app.get("/api/system-printers", async (req, res) => {
  try {
    const printers = IS_WINDOWS ? await getPrinters() : await cupsListPrinters();
    res.json(printers);
  } catch (err) {
    res.status(500).json({ error: "Cannot list system printers", detail: err.message });
  }
});

app.get("/api/printers", (req, res) => {
  try {
    res.json(readPrinters());
  } catch (err) {
    res.status(500).json({ error: "Cannot read printers.json" });
  }
});

app.post("/api/printers", (req, res) => {
  const { id, label, printerName, appliesTo, copies } = req.body;
  if (!id || !label || !printerName || !Array.isArray(appliesTo)) {
    return res.status(400).json({ error: "id, label, printerName, and appliesTo are required" });
  }
  let printInset;
  try {
    printInset = normalizePrintInset(req.body.printInset);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  const data = readPrinters();
  if (data.profiles.find((p) => p.id === id)) {
    return res.status(409).json({ error: "Printer profile already exists" });
  }
  const entry = { id, label, printerName, appliesTo, copies: copies || 1, ...(printInset ? { printInset } : {}) };
  data.profiles.push(entry);
  writePrinters(data);
  res.json({ success: true, profile: entry });
});

app.put("/api/printers/:id", (req, res) => {
  const { id } = req.params;
  const changes = { ...req.body };
  const data = readPrinters();
  const idx = data.profiles.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Printer profile not found" });
  let removeInset = false;
  if ("printInset" in changes) {
    try {
      changes.printInset = normalizePrintInset(changes.printInset);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!changes.printInset) {
      delete changes.printInset;
      removeInset = true; // all sides 0 → no compensation
    }
  }
  data.profiles[idx] = { ...data.profiles[idx], ...changes };
  if (removeInset) delete data.profiles[idx].printInset;
  writePrinters(data);
  res.json({ success: true, profile: data.profiles[idx] });
});

// ── Live Printer Monitoring & Spooler Tracking ─────────────
let printerStatusCache = null;
let printerStatusCacheTime = 0;
let simulatedPrinterAlert = null;

function fetchWindowsPrinterStatus() {
  return new Promise((resolve) => {
    const psScript = `
$ProgressPreference = 'SilentlyContinue'
$printers = @(Get-CimInstance Win32_Printer | Select-Object Name, PrinterStatus, ExtendedPrinterStatus, DetectedErrorState, PrinterState, WorkOffline, PortName)
$allJobs = @()
foreach ($pr in $printers) {
    try {
        $pJobs = @(Get-PrintJob -PrinterName $pr.Name -ErrorAction SilentlyContinue | Select-Object Id, PrinterName, DocumentName, JobStatus, Position, TotalPages, PagesPrinted, Size, @{Name='SubmittedTimeEpoch';Expression={if ($_.SubmittedTime) { [double]([DateTimeOffset]$_.SubmittedTime).ToUnixTimeMilliseconds() } else { 0 }}})
        if ($pJobs -and $pJobs.Count -gt 0) {
            $allJobs += $pJobs
        }
    } catch {}
}
[PSCustomObject]@{ printers = $printers; jobs = $allJobs } | ConvertTo-Json -Depth 3 -Compress
`;
    const b64 = Buffer.from(psScript, "utf16le").toString("base64");
    exec(`powershell -NoProfile -EncodedCommand ${b64}`, { windowsHide: true, timeout: 6000 }, (err, stdout) => {
      if (err) {
        return resolve({ success: false, error: err.message, printers: [], jobs: [] });
      }
      try {
        const raw = JSON.parse(stdout);
        const printers = Array.isArray(raw.printers) ? raw.printers : raw.printers ? [raw.printers] : [];
        const jobs = Array.isArray(raw.jobs) ? raw.jobs : raw.jobs ? [raw.jobs] : [];
        resolve({ success: true, printers, jobs });
      } catch (parseErr) {
        resolve({ success: false, error: parseErr.message, printers: [], jobs: [] });
      }
    });
  });
}

async function getDetailedPrinterStatus() {
  const now = Date.now();
  if (printerStatusCache && now - printerStatusCacheTime < 2500) {
    return { ...printerStatusCache, alert: simulatedPrinterAlert || printerStatusCache.alert };
  }

  const printersData = readPrinters();
  const profiles = printersData.profiles || [];
  const profilesFor = (printer) => profiles
    .filter((prof) => IS_WINDOWS
      ? prof.printerName.toLowerCase() === (printer.name || "").toLowerCase()
      : resolveQueueName(prof.printerName, [printer]) === printer.name)
    .map((prof) => ({ id: prof.id, label: prof.label, appliesTo: prof.appliesTo }));

  let error;
  let mappedPrinters;
  if (!IS_WINDOWS) {
    const cups = await cupsPrinterStatus();
    error = cups.error;
    mappedPrinters = cups.printers.map((p) => ({ ...p, profiles: profilesFor(p) }));
  } else {
  const { printers = [], jobs = [], error: winError } = await fetchWindowsPrinterStatus();
  error = winError;

  mappedPrinters = printers.map((p) => {
    const printerState = p.PrinterState || 0;
    const detectedError = p.DetectedErrorState || 0;

    const printerJobs = jobs.filter(
      (j) => (j.PrinterName || "").toLowerCase() === (p.Name || "").toLowerCase() ||
             (j.Name || "").toLowerCase().startsWith((p.Name || "").toLowerCase())
    );

    printerJobs.sort((a, b) => (a.Position || 0) - (b.Position || 0));
    const activeJob = printerJobs[0];

    const isOffline = !!p.WorkOffline || (printerState & 128) !== 0 || p.PrinterStatus === 7;

    let isPaperOut = detectedError === 4 || (printerState & 16) !== 0;
    let isDoorOpen = detectedError === 7 || (printerState & 4194304) !== 0;
    let isPaperJam = detectedError === 8 || (printerState & 8) !== 0;
    const isUserIntervention = (printerState & 1048576) !== 0;
    const isPrinting = (printerState & 1024) !== 0 || p.PrinterStatus === 4;

    // Check stalled jobs (tray closed or paper out)
    // On photo printers (like Epson L8050), when the tray is closed or paper is out,
    // the driver pauses paper feed and leaves the job at Position 1 with 0 pages printed.
    let isStalled = false;
    if (activeJob && !isOffline) {
      const ageMs = activeJob.SubmittedTimeEpoch ? (now - activeJob.SubmittedTimeEpoch) : 10000;
      if (ageMs > 3500 && (activeJob.PagesPrinted || 0) === 0) {
        isStalled = true;
        if (!isDoorOpen && !isPaperOut && !isPaperJam) {
          isDoorOpen = true; // Tray closed / retracted!
        }
      }
    }

    let statusCode = "ready";
    let statusText = "Ready";

    if (isOffline) {
      statusCode = "offline";
      statusText = "Offline";
    } else if (isDoorOpen) {
      statusCode = "door_open";
      statusText = "Tray Tertutup / Belum Ditarik";
    } else if (isPaperOut) {
      statusCode = "paper_out";
      statusText = "Kertas Habis";
    } else if (isPaperJam) {
      statusCode = "paper_jam";
      statusText = "Kertas Macet (Paper Jam)";
    } else if (isUserIntervention) {
      statusCode = "user_intervention";
      statusText = "Perlu Perhatian Kasir";
    } else if (isPrinting) {
      statusCode = "printing";
      statusText = "Sedang Mencetak";
    } else if (printerJobs.length > 0) {
      statusCode = "door_open";
      statusText = "Tray Tertutup / Belum Ditarik";
    }

    return {
      name: p.Name,
      status: statusText,
      statusCode,
      isOffline,
      isPaperOut,
      isDoorOpen,
      isPaperJam,
      isUserIntervention,
      isPrinting,
      jobsCount: printerJobs.length,
      jobs: printerJobs,
      profiles: profilesFor({ name: p.Name }),
    };
  });
  }

  // Calculate alert for customer kiosk and admin
  let activeAlert = null;
  if (simulatedPrinterAlert) {
    activeAlert = simulatedPrinterAlert;
  } else {
    for (const p of mappedPrinters) {
      if (p.profiles.length > 0) {
        const profileLabels = p.profiles.map((pr) => pr.label).join(", ");
        const appliesList = p.profiles.flatMap((pr) => pr.appliesTo);
        const is4R = appliesList.includes("4r");

        if (p.isDoorOpen) {
          activeAlert = {
            type: "door_open",
            title: is4R ? "Tray / Penutup Printer 4R Belum Ditarik" : `Tray Printer ${profileLabels} Belum Ditarik`,
            customerMessage: "Tray penutup printer belum ditarik keluar. Foto kamu akan otomatis keluar setelah tray ditarik ya kak!",
            adminMessage: `Penutup/tray keluaran pada printer "${p.name}" (${profileLabels}) belum ditarik keluar! Mohon tarik keluar tray printer agar foto dapat tercetak.`,
            printerName: p.name,
            profileLabel: profileLabels,
          };
          break;
        } else if (p.isPaperOut) {
          activeAlert = {
            type: "paper_out",
            title: is4R ? "Kertas Printer 4R Habis" : `Kertas Printer ${profileLabels} Habis`,
            customerMessage: "Kertas foto sedang diisi ulang oleh staff. Mohon tunggu beberapa saat ya kak!",
            adminMessage: `Kertas pada printer "${p.name}" (${profileLabels}) telah habis! Mohon segera isi ulang kertas.`,
            printerName: p.name,
            profileLabel: profileLabels,
          };
          break;
        } else if (p.isPaperJam) {
          activeAlert = {
            type: "paper_jam",
            title: `Kertas Macet (${profileLabels})`,
            customerMessage: "Printer sedang diperiksa oleh staff. Mohon tunggu sebentar ya kak!",
            adminMessage: `Terjadi Paper Jam pada printer "${p.name}" (${profileLabels})!`,
            printerName: p.name,
            profileLabel: profileLabels,
          };
          break;
        } else if (p.isOffline && p.jobsCount > 0) {
          activeAlert = {
            type: "offline",
            title: `Printer ${profileLabels} Offline`,
            customerMessage: "Printer sedang disiapkan oleh staff. Mohon tunggu sebentar ya kak!",
            adminMessage: `Printer "${p.name}" (${profileLabels}) Offline dengan ${p.jobsCount} antrean cetak!`,
            printerName: p.name,
            profileLabel: profileLabels,
          };
          break;
        }
      }
    }
  }

  const result = {
    success: true,
    hasError: !!activeAlert,
    alert: activeAlert,
    printers: mappedPrinters,
    error,
    updatedAt: new Date().toISOString(),
  };

  printerStatusCache = result;
  printerStatusCacheTime = now;
  return result;
}

let hubStatusCache = null;
let hubStatusCacheTime = 0;

app.get("/api/printer-status", async (req, res) => {
  try {
    const hub = readHubConfig(PRINT_HUB_JSON);
    if (hub.role === "kiosk") {
      // Show the hub's printer alerts (paper out, tray, offline) on this booth too.
      if (!hubStatusCache || Date.now() - hubStatusCacheTime > 2500) {
        try {
          hubStatusCache = { ...(await fetchHubStatus({ hub })), source: "hub" };
        } catch (err) {
          hubStatusCache = hubUnreachableStatus(hub, err.message);
        }
        hubStatusCacheTime = Date.now();
      }
      return res.json(hubStatusCache);
    }
    const status = await getDetailedPrinterStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, printers: [] });
  }
});

// ── Print hub (this machine prints for the other kiosks on the LAN) ─────────
function requireHubToken(req, res, next) {
  let hub;
  try {
    hub = readHubConfig(PRINT_HUB_JSON);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
  if (hub.role !== "hub") return res.status(404).json({ success: false, error: "Komputer ini bukan pusat print." });
  if (!tokenMatches(req.headers[HUB_TOKEN_HEADER], hub.token)) {
    return res.status(401).json({ success: false, error: "Token pusat print salah. Samakan token di data/print-hub.json." });
  }
  next();
}

const hubUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(PRINT_HUB_JOBS_DIR, { recursive: true });
      cb(null, PRINT_HUB_JOBS_DIR);
    },
    filename: (req, file, cb) => {
      const ext = (path.extname(file.originalname).toLowerCase().match(/^\.(png|jpe?g|webp|pdf)$/) || [".png"])[0];
      cb(null, `hub-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 60 * 1024 * 1024, files: 1 },
});

app.post("/api/print-hub/jobs", requireHubToken, hubUpload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: "File cetak wajib dikirim." });
  const productType = req.query.printProfile?.toString();
  const copies = req.query.copies === undefined ? undefined : Number(req.query.copies);
  const kiosk = (req.query.kiosk?.toString() || "Kiosk").slice(0, 40);
  try {
    if (!productType) throw new Error("printProfile wajib diisi.");
    const printStatus = await autoPrintFile(req.file.path, productType, copies, { title: `${kiosk} - ${productType}` });
    printerStatusCacheTime = 0;
    console.log(`[print-hub] ${kiosk}: ${productType} x${copies ?? "default"} dikirim ke printer`);
    res.json({ success: true, printStatus });
  } catch (err) {
    console.error(`[print-hub] ${kiosk}: gagal cetak ${productType}:`, err.message);
    res.status(502).json({ success: false, printStatus: "failed", error: err.message });
  } finally {
    // The kiosk keeps its own copy; the spooler has ours once lp returns.
    removeQuietly(req.file.path);
  }
});

// ── Print hub setup from Admin → Printer (admin PIN required: not a public route) ──
function localHostName() {
  // macOS Bonjour name ("macs-MacBook-Pro.local"), reachable by the other Macs without an IP.
  if (process.platform !== "darwin") return Promise.resolve(null);
  return new Promise((resolve) => {
    execFile("scutil", ["--get", "LocalHostName"], { timeout: 3000 }, (err, stdout) => {
      const name = String(stdout || "").trim();
      resolve(!err && name ? `${name}.local` : null);
    });
  });
}

app.get("/api/print-hub/config", async (req, res) => {
  try {
    const config = readHubConfig(PRINT_HUB_JSON);
    res.json({ success: true, config, addresses: lanAddresses(os.networkInterfaces(), await localHostName()) });
  } catch (err) {
    // A broken file must not lock the admin out of fixing it.
    res.json({ success: true, config: { role: "off" }, configError: err.message, addresses: lanAddresses(os.networkInterfaces(), await localHostName()) });
  }
});

app.put("/api/print-hub/config", (req, res) => {
  let current = { role: "off" };
  try { current = readHubConfig(PRINT_HUB_JSON); } catch { /* replaced below */ }
  let config;
  try {
    config = buildHubConfigFromForm(req.body, current);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message.replace("print-hub.json: ", "") });
  }
  writeJsonAtomic(PRINT_HUB_JSON, config);
  hubStatusCache = null;
  printerStatusCacheTime = 0;
  console.log(`[print-hub] mode diubah ke "${config.role}"${config.url ? ` → ${config.url}` : ""}`);
  res.json({ success: true, config });
});

app.post("/api/print-hub/test", async (req, res) => {
  let hub;
  try {
    hub = parseHubConfig({ role: "kiosk", url: req.body?.url, token: String(req.body?.token || "").trim(), name: req.body?.name });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message.replace("print-hub.json: ", "") });
  }
  try {
    const status = await fetchHubStatus({ hub, timeoutMs: 5000 });
    res.json({ success: true, printers: (status.printers || []).map((p) => ({ name: p.name, status: p.status })), alert: status.alert || null });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.get("/api/print-hub/status", requireHubToken, async (req, res) => {
  try {
    res.json(await getDetailedPrinterStatus());
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, printers: [] });
  }
});

app.post("/api/printer-status/test-alert", (req, res) => {
  const { type, active } = req.body;
  if (!active || type === "normal") {
    simulatedPrinterAlert = null;
  } else if (type === "paper_out") {
    simulatedPrinterAlert = {
      type: "paper_out",
      title: "Kertas Printer 4R Habis (Simulasi)",
      customerMessage: "Kertas foto sedang diisi ulang oleh staff. Mohon tunggu beberapa saat ya kak!",
      adminMessage: "Simulasi: Kertas pada printer 4R habis!",
      printerName: "EPSON L8050 Series",
      profileLabel: "4R mantap",
      isSimulated: true,
    };
  } else if (type === "door_open") {
    simulatedPrinterAlert = {
      type: "door_open",
      title: "Penutup Printer 4R Belum Ditarik (Simulasi)",
      customerMessage: "Tray penutup printer sedang ditarik oleh staff. Foto kamu akan segera keluar!",
      adminMessage: "Simulasi: Tray/penutup printer belum ditarik keluar!",
      printerName: "EPSON L8050 Series",
      profileLabel: "4R mantap",
      isSimulated: true,
    };
  } else if (type === "paper_jam") {
    simulatedPrinterAlert = {
      type: "paper_jam",
      title: "Kertas Macet / Paper Jam (Simulasi)",
      customerMessage: "Printer sedang diperiksa oleh staff. Mohon tunggu sebentar ya kak!",
      adminMessage: "Simulasi: Kertas macet pada printer 4R!",
      printerName: "EPSON L8050 Series",
      profileLabel: "4R mantap",
      isSimulated: true,
    };
  }
  printerStatusCacheTime = 0; // force refresh
  res.json({ success: true, alert: simulatedPrinterAlert });
});

app.post("/api/printers/clear-jobs", async (req, res) => {
  if (!IS_WINDOWS) {
    try {
      await cupsCancelAllJobs();
      printerStatusCacheTime = 0;
      return res.json({ success: true, message: "Antrean cetak berhasil dibersihkan" });
    } catch (err) {
      printerStatusCacheTime = 0;
      return res.status(500).json({ success: false, error: err.message });
    }
  }
  const psScript = `Get-CimInstance Win32_PrintJob | Remove-CimInstance`;
  const b64 = Buffer.from(psScript, "utf16le").toString("base64");
  exec(`powershell -NoProfile -EncodedCommand ${b64}`, { windowsHide: true }, (err) => {
    printerStatusCacheTime = 0;
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: "Antrean cetak berhasil dibersihkan" });
  });
});

// ── Session Sales & Shift Endpoints ──────────────────────
app.get("/api/sessions", (req, res) => {
  const { date, all } = req.query;
  const allSessions = readSessions();
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const targetDate = date ? date.toString() : todayStr;

  const filteredSessions = all === "true" 
    ? allSessions 
    : allSessions.filter((s) => s.date === targetDate);

  const allAvailableDates = Array.from(new Set(allSessions.map((s) => s.date))).sort().reverse();

  res.json({
    success: true,
    date: targetDate,
    summary: summarizeSessions(filteredSessions),
    sessions: filteredSessions,
    allAvailableDates,
  });
});

// ── Period reports & Excel export (admin) ─────────────────────────────
// Excel splits CSV columns on the PC's regional list separator (";" in Indonesian settings).
let csvDelimiter = ";";
execFile("powershell.exe", ["-NoProfile", "-Command", "(Get-Culture).TextInfo.ListSeparator"], { windowsHide: true, timeout: 15000 }, (error, stdout) => {
  const separator = String(stdout || "").trim();
  if (!error && (separator === "," || separator === ";")) csvDelimiter = separator;
});

app.get("/api/reports", (req, res) => {
  try {
    const { sessions, ...report } = buildReport(readSessions(), req.query.from, req.query.to);
    res.json({ success: true, ...report, sessionCount: sessions.length });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get("/api/reports/export", (req, res) => {
  try {
    const report = buildReport(readSessions(), req.query.from, req.query.to);
    const daily = req.query.kind === "daily";
    const csv = daily ? dailyCsv(report, csvDelimiter) : transactionsCsv(report, csvDelimiter);
    const name = `laporan-${daily ? "harian" : "transaksi"}-${report.from}_sd_${report.to}.csv`;
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` }).send(csv);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post("/api/sessions", (req, res) => {
  const sessionData = req.body;
  if (!sessionData) return res.status(400).json({ error: "Missing session data" });
  const allSessions = readSessions();
  const existing = sessionData.id && allSessions.find((s) => s.id === sessionData.id);
  if (existing) return res.json({ success: true, session: existing });
  if (!sessionData.customerName || !Number.isFinite(sessionData.totalPrice) || sessionData.totalPrice < 0) {
    return res.status(400).json({ success: false, error: "Data transaksi tidak valid." });
  }
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");

  const newEntry = {
    id: sessionData.id || `SES-${Date.now()}`,
    timestamp: sessionData.timestamp || now.toISOString(),
    date: sessionData.date || dateStr,
    time: sessionData.time || `${hours}.${minutes}`,
    ...sessionData,
  };
  allSessions.unshift(newEntry);
  writeSessions(allSessions);
  res.json({ success: true, session: newEntry });
});

app.delete("/api/sessions/:id", (req, res) => {
  const { id } = req.params;
  const allSessions = readSessions();
  const filtered = allSessions.filter((s) => s.id !== id);
  writeSessions(filtered);
  res.json({ success: true, message: "Sesi berhasil dihapus" });
});

app.delete("/api/printers/:id", (req, res) => {
  const { id } = req.params;
  const data = readPrinters();
  const idx = data.profiles.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Printer profile not found" });
  data.profiles.splice(idx, 1);
  writePrinters(data);
  res.json({ success: true });
});

// ─── KIOSK THEME CONFIG API ──────────────────────────────────────
const KIOSK_THEME_JSON = path.join(__dirname, "public/kiosk-theme.json");

const DEFAULT_KIOSK_THEME = {
  presetId: "neo-brutalism",
  name: "Neo-Brutalism (Pop Studio)",
  backgroundColor: "#f3f4f6",
  cardBackgroundColor: "#ffffff",
  primaryColor: "#000000",
  primaryTextColor: "#ffffff",
  textColor: "#171717",
  accentColor: "#fde047",
  borderColor: "#000000",
  borderRadius: "lg",
  borderWidth: "thick",
  shadowStyle: "none",
  fontFamily: "space-grotesk",
  studioName: "IGNOS STUDIO",
  homeHeadline: "Kamu Habis Fotoan Dimana?",
  homeSubheadline: "Pilih studio untuk mulai sesi foto kamu",
  logoUrl: "",
  enableBonusTutorial: true,
  enableAddonsStep: true,
  enableStoryQuestion: true,
  freeEventMode: false,
};

function readKioskTheme() {
  if (!fs.existsSync(KIOSK_THEME_JSON)) {
    return DEFAULT_KIOSK_THEME;
  }
  try {
    return { ...DEFAULT_KIOSK_THEME, ...JSON.parse(fs.readFileSync(KIOSK_THEME_JSON, "utf-8")) };
  } catch {
    return DEFAULT_KIOSK_THEME;
  }
}

function writeKioskTheme(data) {
  fs.writeFileSync(KIOSK_THEME_JSON, JSON.stringify(data, null, 2), "utf-8");
}

app.get("/api/kiosk-theme", (req, res) => {
  res.json(readKioskTheme());
});

const saveKioskThemeHandler = (req, res) => {
  try {
    const updated = { ...readKioskTheme(), ...req.body };
    writeKioskTheme(updated);
    res.json({ success: true, theme: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.put("/api/kiosk-theme", saveKioskThemeHandler);
app.post("/api/kiosk-theme", saveKioskThemeHandler);

app.post("/api/kiosk-theme/reset", (req, res) => {
  writeKioskTheme(DEFAULT_KIOSK_THEME);
  res.json({ success: true, theme: DEFAULT_KIOSK_THEME });
});

// ─── PRICING CONFIG API ──────────────────────────────────────────
const PRICING_JSON = path.join(SESSIONS_DIR, "pricing.json");

const DEFAULT_PRICING = {
  currency: "IDR",
  currencySymbol: "Rp",
  session: {
    basePrice: 50000,
    includedPeople: 2,
    extraPersonPrice: 15000,
    softcopyCharge: 25000,
  },
  prints: {
    print4rPrice: 10000,
    printA4Price: 20000,
  },
  keychains: [
    { id: "kotak-plastik", name: "Kotak Plastik", subtitle: "Full Foto", price: 15000, enabled: true, image: "/addons/keychain-kotak-plastik.png" },
    { id: "kotak-metal", name: "Kotak Metal", subtitle: "Full Foto", price: 30000, enabled: true, image: "/addons/keychain-kotak-metal.png" },
    { id: "oval-metal", name: "Oval Metal", subtitle: "Full Foto", price: 30000, enabled: true, image: "/addons/keychain-oval-metal.png" },
    { id: "love-metal", name: "Love Metal", subtitle: "Full Foto", price: 30000, enabled: true, image: "/addons/keychain-love-metal.png" },
  ],
  idCards: [
    { id: "portrait-full", name: "ID Card Portrait", subtitle: "Full Foto", price: 35000, enabled: true, image: "/addons/idcard-portrait-full.png", orientation: "portrait" },
    { id: "landscape-full", name: "ID Card Landscape", subtitle: "Full Foto", price: 35000, enabled: true, image: "/addons/idcard-landscape-full.png", orientation: "landscape" },
    { id: "landscape-blue", name: "ID Card Landscape", subtitle: "Design Biru", price: 35000, enabled: true, image: "/addons/idcard-blue.png", orientation: "landscape" },
    { id: "landscape-red", name: "ID Card Landscape", subtitle: "Design Merah", price: 35000, enabled: true, image: "/addons/idcard-red.png", orientation: "landscape" },
  ],
  addons: [
    { id: "4r-print", title: "Cetak Foto 4R", price: 10000, enabled: true, description: "Cetak foto ukuran 4R dengan hasil tajam, warna akurat, dan kertas premium.", image: "/addons/cetak4r.mp4", path: "/people-count" },
    { id: "10r-print", title: "Cetak Foto A4", price: 20000, enabled: true, description: "Cetak foto ukuran A4 (10R) dengan kualitas tinggi.", image: "/addons/cetaka4.mp4", path: "/people-count" },
    { id: "keychain", title: "Gantungan Kunci", price: 15000, enabled: true, description: "Ubah foto favoritmu jadi gantungan kunci unik dan lucu.", image: "/addons/keychain.mp4", path: "/keychain" },
    { id: "id-card", title: "ID Card", price: 35000, enabled: true, description: "Cetak foto menjadi ID card custom dengan desain menarik.", image: "/addons/idcard.mp4", path: "/id-card" },
    { id: "bingkai-4r", title: "Bingkai 4R", price: 25000, enabled: true, description: "Percantik foto 4R dengan bingkai estetik siap pajang.", image: "/addons/bingkai4r.mp4", path: "/bingkai4r" },
    { id: "bingkai-a4", title: "Bingkai A4", price: 40000, enabled: true, description: "Bingkai elegan untuk foto A4, cocok untuk dekorasi.", image: "/addons/bingkaia4.mp4", path: "/bingkaiA4" },
    { id: "flower-hotwheels", title: "Flower Hotwheels", price: 45000, enabled: true, description: "Dekorasi unik dengan bunga / miniatur, cocok untuk hadiah spesial.", image: "/addons/hotwheel.mp4", path: "/flower-hotwheels" },
    { id: "cetak-bingkai3d-10r", title: "Cetak Bingkai 3D 10R", price: 90000, enabled: true, description: "Foto 10R dengan efek bingkai 3D premium.", image: "/addons/bingkai3d.mp4", path: "/cetak-bingkai3d-10r" },
    { id: "boneka-tabung", title: "Boneka Tabung", price: 60000, enabled: true, description: "Boneka custom dengan foto pilihan, cocok untuk kado.", image: "/addons/boneka.mp4", path: "/boneka-tabung" },
    { id: "puzzle-foto", title: "Puzzle Foto", price: 90000, enabled: true, isPreorder: true, description: "Foto jadi puzzle seru, cocok untuk hadiah unik (PO).", image: "/addons/puzzel.mp4", path: "/puzzle-foto" },
    { id: "photo-calender", title: "Photo Calender", price: 90000, enabled: true, isPreorder: false, description: "Photo Calender custom dengan foto pilihan.", image: "/addons/kalender.mp4", path: "/photo-calender" },
    { id: "cermin-foto-3d", title: "Cermin Foto 3D", price: 70000, enabled: true, description: "Cermin custom dengan efek foto 3D yang estetik.", image: "/addons/cerminfoto.mp4", path: "/cermin-foto-3d" },
  ],
};

function readPricing() {
  if (!fs.existsSync(PRICING_JSON)) {
    return DEFAULT_PRICING;
  }
  try {
    return { ...DEFAULT_PRICING, ...JSON.parse(fs.readFileSync(PRICING_JSON, "utf-8")) };
  } catch {
    return DEFAULT_PRICING;
  }
}

function writePricing(data) {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    fs.writeFileSync(PRICING_JSON, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[Pricing] Gagal simpan pricing.json:", err);
  }
}

app.get("/api/pricing", (req, res) => {
  res.json(readPricing());
});

const savePricingHandler = (req, res) => {
  try {
    const updated = { ...readPricing(), ...req.body };
    writePricing(updated);
    res.json({ success: true, pricing: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.put("/api/pricing", savePricingHandler);
app.post("/api/pricing", savePricingHandler);

app.post("/api/pricing/reset", (req, res) => {
  writePricing(DEFAULT_PRICING);
  res.json({ success: true, pricing: DEFAULT_PRICING });
});

// ── STUDIO BRANDING & WHITELABEL API ──────────────────────────
const BRANDING_JSON = path.join(__dirname, "data/branding.json");

const DEFAULT_BRANDING = {
  studioName: "IGNOS STUDIO",
  tagline: "Self-Service Photobooth Station",
  logoUrl: "",
  logoDarkUrl: "",
  address: "Jl. Raya Abiansemal No. 12, Badung, Bali",
  phone: "081234567890",
  instagram: "@ignos.studio",
  tiktok: "@ignos.photobooth",
  website: "https://ignos.id",
  receipt: {
    headerTitle: "IGNOS STUDIO",
    headerSub: "Self-Service Photobooth Station",
    addressLine1: "Jl. Raya Abiansemal No. 12",
    addressLine2: "Badung, Bali",
    phoneContact: "WA: 0812-3456-7890",
    footerNote: "Terima kasih telah berfoto bersama kami!",
    socialNote: "Tag IG kami: @ignos.studio",
  },
  whatsapp: {
    headerGreeting: "Halo Kakak {customerName}",
    introText: "Berikut kami kirimkan link Google Drive softcopy foto hari ini, silahkan dicek ya kak.",
    instagramTag: "@ignos.studio",
    footerDisclaimer:
      "Mohon segera disimpan dikarenakan link akan expired dalam waktu 7 hari. Terima kasih kak, ditunggu kedatangannya yang selanjutnya!",
    expiryDays: 7,
  },
  watermark: {
    enabled: false,
    text: "IGNOS PHOTOBOOTH",
    position: "bottom-right",
    opacity: 0.6,
  },
};

function readBranding() {
  if (!fs.existsSync(BRANDING_JSON)) {
    return DEFAULT_BRANDING;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(BRANDING_JSON, "utf-8"));
    return {
      ...DEFAULT_BRANDING,
      ...raw,
      receipt: { ...DEFAULT_BRANDING.receipt, ...(raw.receipt || {}) },
      whatsapp: { ...DEFAULT_BRANDING.whatsapp, ...(raw.whatsapp || {}) },
      watermark: { ...DEFAULT_BRANDING.watermark, ...(raw.watermark || {}) },
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

function writeBranding(data) {
  try {
    const dir = path.dirname(BRANDING_JSON);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(BRANDING_JSON, JSON.stringify(data, null, 2), "utf-8");

    // Also sync studioName & logoUrl to public/kiosk-theme.json if changed
    try {
      if (fs.existsSync(KIOSK_THEME_JSON)) {
        const themeData = JSON.parse(fs.readFileSync(KIOSK_THEME_JSON, "utf-8"));
        let themeChanged = false;
        if (data.studioName && themeData.studioName !== data.studioName) {
          themeData.studioName = data.studioName;
          themeChanged = true;
        }
        if (data.logoUrl !== undefined && themeData.logoUrl !== data.logoUrl) {
          themeData.logoUrl = data.logoUrl;
          themeChanged = true;
        }
        if (themeChanged) {
          fs.writeFileSync(KIOSK_THEME_JSON, JSON.stringify(themeData, null, 2), "utf-8");
        }
      }
    } catch (e) {
      console.warn("[Branding] Gagal sinkronisasi ke kiosk-theme.json:", e.message);
    }
  } catch (err) {
    console.error("[Branding] Gagal simpan branding.json:", err);
  }
}

app.get("/api/branding", (req, res) => {
  res.json(readBranding());
});

const saveBrandingHandler = (req, res) => {
  try {
    const current = readBranding();
    const updated = {
      ...current,
      ...req.body,
      receipt: { ...current.receipt, ...(req.body.receipt || {}) },
      whatsapp: { ...current.whatsapp, ...(req.body.whatsapp || {}) },
      watermark: { ...current.watermark, ...(req.body.watermark || {}) },
      lastUpdated: new Date().toISOString(),
    };
    writeBranding(updated);
    res.json({ success: true, branding: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.put("/api/branding", saveBrandingHandler);
app.post("/api/branding", saveBrandingHandler);

app.post("/api/branding/reset", (req, res) => {
  writeBranding(DEFAULT_BRANDING);
  res.json({ success: true, branding: DEFAULT_BRANDING });
});

// Logo upload endpoint for branding
const brandingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "public/img/branding");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    const filename = "logo-" + Date.now() + ext;
    cb(null, filename);
  },
});
const uploadBrandingLogo = multer({ storage: brandingStorage });

app.post("/api/branding/logo", uploadBrandingLogo.single("logo"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "File logo tidak ditemukan" });
    }
    const publicUrl = "/img/branding/" + req.file.filename;
    const branding = readBranding();
    const isDark = req.query.type === "dark";
    if (isDark) {
      branding.logoDarkUrl = publicUrl;
    } else {
      branding.logoUrl = publicUrl;
    }
    writeBranding(branding);
    res.json({ success: true, url: publicUrl, branding });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// IGNOS RENTAL LICENSE SYSTEM (B2B Offline Cryptographic Verification)
// ─────────────────────────────────────────────────────────────
const LICENSE_FILE = path.join(__dirname, "data/license.json");
const LICENSE_SECRET = process.env.IGNOS_LICENSE_SECRET || "IGNOS_STUDIO_RENTAL_SECRET_2026";
const VENDOR_SUPPORT_PHONE = process.env.IGNOS_VENDOR_PHONE || "6281234567890";

function readLicenseRecord() {
  try {
    if (fs.existsSync(LICENSE_FILE)) {
      const raw = fs.readFileSync(LICENSE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading license.json:", err.message);
  }
  return null;
}

function writeLicenseRecord(record) {
  try {
    const dir = path.dirname(LICENSE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LICENSE_FILE, JSON.stringify(record, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing license.json:", err.message);
  }
}

function verifyLicenseKey(keyStr) {
  if (!keyStr || typeof keyStr !== "string") {
    return { valid: false, error: "Kode lisensi kosong." };
  }
  const cleanKey = keyStr.trim();
  const parts = cleanKey.split(".");
  if (parts.length !== 3 || parts[0] !== "IGNOS-V1") {
    return { valid: false, error: "Format kode lisensi tidak valid (Wajib format IGNOS-V1)." };
  }

  const [prefix, b64Payload, signature] = parts;

  // Calculate expected HMAC
  const expectedSig = crypto
    .createHmac("sha256", LICENSE_SECRET)
    .update(b64Payload)
    .digest("hex");

  if (signature.toLowerCase() !== expectedSig.toLowerCase()) {
    return { valid: false, error: "Tanda tangan digital tidak cocok atau lisensi telah dimanipulasi." };
  }

  try {
    const jsonStr = Buffer.from(b64Payload, "base64url").toString("utf-8");
    const payload = JSON.parse(jsonStr);
    if (!payload.client || !payload.exp) {
      return { valid: false, error: "Struktur isi lisensi tidak lengkap." };
    }
    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: "Gagal membaca payload lisensi: " + err.message };
  }
}

function calculateLicenseStatus() {
  const record = readLicenseRecord();
  const now = Date.now();
  const hostname = os.hostname();
  const platform = os.platform();

  if (!record || !record.licenseKey) {
    return {
      isValid: false,
      isExpired: true,
      isClockTampered: false,
      status: "unregistered",
      clientName: "Belum Terdaftar",
      plan: "Tanpa Lisensi Aktif",
      daysLeft: 0,
      hoursLeft: 0,
      machineInfo: { hostname, platform },
      supportContact: {
        name: "Vendor Ignos Studio",
        phone: VENDOR_SUPPORT_PHONE,
        whatsappUrl: "https://wa.me/" + VENDOR_SUPPORT_PHONE + "?text=" + encodeURIComponent("Halo Vendor Ignos, saya ingin aktivasi lisensi software studio."),
      },
      lastVerifiedAt: now,
    };
  }

  const verification = verifyLicenseKey(record.licenseKey);
  if (!verification.valid) {
    return {
      isValid: false,
      isExpired: true,
      isClockTampered: false,
      status: "unregistered",
      clientName: record.clientName || "Tidak Diketahui",
      plan: "Lisensi Rusak / Tidak Sah",
      daysLeft: 0,
      hoursLeft: 0,
      machineInfo: { hostname, platform },
      supportContact: {
        name: "Vendor Ignos Studio",
        phone: VENDOR_SUPPORT_PHONE,
        whatsappUrl: "https://wa.me/" + VENDOR_SUPPORT_PHONE + "?text=" + encodeURIComponent("Halo Vendor Ignos, lisensi studio kami tidak sah."),
      },
      lastVerifiedAt: now,
    };
  }

  const { payload } = verification;
  const lastVerified = record.lastVerifiedAt || 0;

  // Anti-rollback jam Windows: toleransi 5 menit untuk sinkronisasi NTP
  let isClockTampered = false;
  if (lastVerified > 0 && now < lastVerified - (5 * 60 * 1000)) {
    isClockTampered = true;
  }

  const expTime = payload.exp;
  const diffMs = expTime - now;
  const daysLeft = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
  const hoursLeft = Math.max(0, Math.floor(diffMs / (60 * 60 * 1000)));
  const isExpired = diffMs <= 0 || isClockTampered;

  let status = "active";
  if (isClockTampered) {
    status = "clock_tampered";
  } else if (isExpired) {
    status = "expired";
  } else if (daysLeft <= 3) {
    status = "warning_expiring_soon";
  }

  // Perbarui lastVerifiedAt jika jam bergerak maju normal
  if (!isClockTampered && now > lastVerified) {
    record.lastVerifiedAt = now;
    writeLicenseRecord(record);
  }

  return {
    isValid: !isExpired && !isClockTampered,
    isExpired,
    isClockTampered,
    status,
    clientName: payload.client,
    plan: payload.plan || "Paket Sewa",
    activatedAt: record.activatedAt,
    expiresAt: new Date(expTime).toISOString(),
    daysLeft,
    hoursLeft,
    machineInfo: { hostname, platform },
    supportContact: {
      name: "Vendor Ignos Studio",
      phone: VENDOR_SUPPORT_PHONE,
      whatsappUrl: "https://wa.me/" + VENDOR_SUPPORT_PHONE + "?text=" + encodeURIComponent("Halo Vendor Ignos, saya dari *" + payload.client + "* ingin perpanjang lisensi sewa software."),
    },
    lastVerifiedAt: record.lastVerifiedAt || now,
  };
}

// GET /api/license/status
app.get("/api/license/status", (req, res) => {
  try {
    const status = calculateLicenseStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/license/activate
app.post("/api/license/activate", (req, res) => {
  try {
    const { licenseKey } = req.body;
    if (!licenseKey) {
      return res.status(400).json({ success: false, message: "Kode lisensi wajib diisi." });
    }

    const verification = verifyLicenseKey(licenseKey);
    if (!verification.valid) {
      return res.status(400).json({ success: false, message: verification.error });
    }

    const { payload } = verification;
    const now = Date.now();

    if (now >= payload.exp) {
      return res.status(400).json({
        success: false,
        message: "Kode lisensi ini sudah kedaluwarsa sejak " + new Date(payload.exp).toLocaleDateString("id-ID"),
      });
    }

    const newRecord = {
      licenseKey: licenseKey.trim(),
      clientName: payload.client,
      plan: payload.plan || "Paket Sewa Studio",
      activatedAt: new Date(now).toISOString(),
      expiresAt: new Date(payload.exp).toISOString(),
      lastVerifiedAt: now,
      notes: payload.notes || "Aktivasi manual via Admin Portal",
    };

    writeLicenseRecord(newRecord);
    const updatedStatus = calculateLicenseStatus();

    res.json({
      success: true,
      message: "Lisensi berhasil diaktifkan untuk " + payload.client + "! Berlaku hingga " + new Date(payload.exp).toLocaleDateString("id-ID") + ".",
      status: updatedStatus,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// IGNOS ADMIN PIN SECURITY SYSTEM (Kiosk Protection & Access Guard)
// ─────────────────────────────────────────────────────────────
const SECURITY_FILE = path.join(__dirname, "data/security.json");
const PIN_SALT = process.env.IGNOS_PIN_SALT || "IGNOS_PIN_SALT_2026";
const MASTER_RECOVERY_KEY = process.env.IGNOS_MASTER_KEY || "";

let pinFailedAttempts = 0;
let pinLockoutUntil = 0;

function hashPin(pin) {
  return crypto.createHmac("sha256", PIN_SALT).update(String(pin).trim()).digest("hex");
}

function readSecurityRecord() {
  try {
    if (fs.existsSync(SECURITY_FILE)) {
      const raw = fs.readFileSync(SECURITY_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    throw new Error("Data PIN tidak dapat dibaca. Hubungi operator: " + err.message);
  }
  return {
    pinHash: hashPin("1234"),
    isDefaultPin: true,
    updatedAt: new Date().toISOString(),
  };
}

function writeSecurityRecord(record) {
  try {
    const dir = path.dirname(SECURITY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SECURITY_FILE, JSON.stringify(record, null, 2), "utf-8");
  } catch (err) {
    throw err;
  }
}

app.get("/api/security/session", (req, res) => res.json({ authenticated: true }));
app.post("/api/security/logout", (req, res) => {
  adminSessions.revoke(req, res);
  res.json({ success: true });
});

// GET /api/security/pin-status
app.get("/api/security/pin-status", (req, res) => {
  try {
    const record = readSecurityRecord();
    const now = Date.now();
    const isLockedOut = now < pinLockoutUntil;
    const remainingSeconds = isLockedOut ? Math.ceil((pinLockoutUntil - now) / 1000) : 0;
    
    res.json({
      hasPin: Boolean(record.pinHash),
      isDefaultPin: Boolean(record.isDefaultPin),
      isLockedOut,
      lockoutRemainingSeconds: remainingSeconds,
      updatedAt: record.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/security/verify-pin
app.post("/api/security/verify-pin", (req, res) => {
  try {
    const { pin } = req.body;
    const now = Date.now();

    // Check brute force lockout
    if (now < pinLockoutUntil) {
      const waitSec = Math.ceil((pinLockoutUntil - now) / 1000);
      return res.status(429).json({
        success: false,
        isLockedOut: true,
        remainingSeconds: waitSec,
        message: "Terlalu banyak percobaan salah. Coba lagi dalam " + waitSec + " detik.",
      });
    }

    if (!pin || typeof pin !== "string") {
      return res.status(400).json({ success: false, message: "PIN wajib diisi." });
    }

    if (pinLockoutUntil && now >= pinLockoutUntil) { pinFailedAttempts = 0; pinLockoutUntil = 0; }
    const record = readSecurityRecord();
    const inputHash = hashPin(pin);

    if (inputHash === record.pinHash) {
      pinFailedAttempts = 0;
      pinLockoutUntil = 0;
      const sessionToken = adminSessions.issue(res);
      return res.json({
        success: true,
        message: "PIN benar. Akses Admin dibuka.",
        token: sessionToken,
        isDefaultPin: record.isDefaultPin,
      });
    } else {
      pinFailedAttempts++;
      if (pinFailedAttempts >= 5) {
        pinLockoutUntil = now + 30000; // 30 sec lockout
        return res.status(429).json({
          success: false,
          isLockedOut: true,
          remainingSeconds: 30,
          message: "PIN salah 5 kali berturut-turut. Sistem dikunci sementara selama 30 detik.",
        });
      }
      return res.status(401).json({
        success: false,
        message: "PIN salah. Sisa percobaan: " + (5 - pinFailedAttempts),
        attemptsLeft: 5 - pinFailedAttempts,
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/security/change-pin
app.post("/api/security/change-pin", (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    if (!currentPin || !newPin) {
      return res.status(400).json({ success: false, message: "PIN saat ini dan PIN baru wajib diisi." });
    }

    const cleanNewPin = String(newPin).trim();
    if (!/^\d{4,8}$/.test(cleanNewPin)) {
      return res.status(400).json({ success: false, message: "PIN baru harus berupa 4 hingga 8 digit angka." });
    }

    const record = readSecurityRecord();
    const currentHash = hashPin(currentPin);

    if (currentHash !== record.pinHash) {
      return res.status(401).json({ success: false, message: "PIN saat ini salah." });
    }

    record.pinHash = hashPin(cleanNewPin);
    record.isDefaultPin = false;
    record.updatedAt = new Date().toISOString();
    writeSecurityRecord(record);
    adminSessions.clear();

    res.json({
      success: true,
      message: "PIN keamanan Admin berhasil diperbarui!",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/security/reset-pin
app.post("/api/security/reset-pin", (req, res) => {
  try {
    const { recoveryKey } = req.body;
    if (!MASTER_RECOVERY_KEY || typeof recoveryKey !== "string" || recoveryKey !== MASTER_RECOVERY_KEY) {
      return res.status(403).json({ success: false, message: "Kunci pemulihan master tidak valid." });
    }

    const record = {
      pinHash: hashPin("1234"),
      isDefaultPin: true,
      updatedAt: new Date().toISOString(),
    };
    writeSecurityRecord(record);
    adminSessions.clear();
    pinFailedAttempts = 0;
    pinLockoutUntil = 0;

    res.json({
      success: true,
      message: "PIN berhasil direset ke nilai default (1234).",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Watch PHOTOS_DIR for new files and generate thumbnails immediately
let photoWatcher = null;
function startFileWatcher() {
  photoWatcher?.close();
  console.log(`Watching for new photos in ${PHOTOS_DIR}...`);
  try {
    photoWatcher = fs.watch(PHOTOS_DIR, async (eventType, filename) => {
      if (eventType === "rename" && filename) {
        const filePath = path.join(PHOTOS_DIR, filename);
        // Wait a bit to ensure the file is fully written and unlocked
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        if (fs.existsSync(filePath) && filename.match(/\.(jpg|jpeg|png|webp)$/i)) {
          console.log(`New photo detected: ${filename}. Generating thumbnail...`);
          await generateThumbnail(filename);
        }
      }
    });
  } catch (err) {
    console.error("Failed to start file watcher:", err);
  }
}

app.listen(5000, () => {
  console.log("Photo API running on http://localhost:5000");
  startFileWatcher();
  deviceWatcher.start();
  startDeviceEvents();
});
