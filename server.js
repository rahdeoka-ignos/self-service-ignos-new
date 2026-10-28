import { exec } from "child_process";
import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import sharp from "sharp";
import multer from "multer";
import pdfToPrinter from "pdf-to-printer";
const { print, getPrinters } = pdfToPrinter;

// Disable sharp cache to release file locks on Windows
sharp.cache(false);
import { fileURLToPath } from "url";
import { createCustomerFolder, uploadMultipleFiles } from "./gdrive.js";

const app = express();
app.use(cors());
app.use(express.json());

// fix __dirname di ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PHOTOS_DIR = path.join(__dirname, "public/photos");
const THUMBS_DIR = path.join(__dirname, "public/thumbnails");
const UPLOAD_QUEUE_DIR = path.join(__dirname, "storage/upload_queue");
const ARCHIVE_DIR = path.join(__dirname, "storage/archive");

if (!fs.existsSync(UPLOAD_QUEUE_DIR)) fs.mkdirSync(UPLOAD_QUEUE_DIR, { recursive: true });
if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
const TEMPLATES_DIR = path.join(__dirname, "public/templates");
const TEMPLATES_JSON = path.join(TEMPLATES_DIR, "templates.json");
const PRINTERS_JSON = path.join(__dirname, "public/printers.json");
const SESSIONS_DIR = path.join(__dirname, "data");
const SESSIONS_JSON = path.join(SESSIONS_DIR, "sessions.json");

function readSessions() {
  if (!fs.existsSync(SESSIONS_JSON)) return [];
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_JSON, "utf-8"));
  } catch {
    return [];
  }
}

function writeSessions(sessions) {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
  fs.writeFileSync(SESSIONS_JSON, JSON.stringify(sessions, null, 2), "utf-8");
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
  fs.writeFileSync(PRINTERS_JSON, JSON.stringify(data, null, 2), "utf-8");
}

const templateImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(TEMPLATES_DIR, req.params.name);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, file.originalname),
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

// upload hasil print
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PHOTOS_DIR);
  },
  filename: function (req, file, cb) {
    // Jika frontend mengirimkan nama file spesifik (bukan default "blob"), gunakan nama tersebut
    if (file.originalname && file.originalname !== "blob") {
      cb(null, file.originalname);
    } else {
      const label = req.query.label?.toString() || "print";
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

async function autoPrintFile(filePath, productType, copiesOverride) {
  const profile = findPrinterProfile(productType);
  if (!profile) {
    console.log(`No printer profile found for product type "${productType}", skipping auto-print.`);
    return;
  }
  const copiesToPrint = copiesOverride || profile.copies || 1;
  try {
    for (let c = 0; c < copiesToPrint; c++) {
      await print(filePath, {
        printer: profile.printerName,
        copies: 1,
        printDialog: false,
        silent: true,
        scale: "fit",
        ...(profile.paperSize ? { paperSize: profile.paperSize } : {}),
      });
    }
    console.log(`Auto-printed "${path.basename(filePath)}" (${copiesToPrint}x) to "${profile.printerName}" (profile: ${profile.id})`);
  } catch (err) {
    console.error(`Auto-print failed for profile "${profile.id}":`, err.message);
  }
}

app.post("/api/save-print", upload.single("file"), async (req, res) => {
  const productType = req.query.printProfile?.toString();
  const copiesOverride = req.query.copies ? parseInt(req.query.copies.toString(), 10) : undefined;
  const filePath = req.file.path;

  res.json({
    success: true,
    file: `http://localhost:5000/photos/${req.file.filename}`,
    filename: req.file.filename,
  });

  // Fire-and-forget: kirim response dulu ke frontend, print jalan di background
  if (productType) {
    autoPrintFile(filePath, productType, copiesOverride);
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

app.post("/api/upload-session-gdrive", async (req, res) => {
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
      basePrice = 50000,
    } = req.body;

    const cleanCustomerName = customerName ? customerName.replace(/^@+/, "").trim() : "";

    console.log(`[GDrive] Membuat folder Google Drive untuk sesi: "${cleanCustomerName || "Tanpa Nama"}"...`);
    const folderResult = await createCustomerFolder(cleanCustomerName);
    console.log(`[GDrive] Folder dibuat: ${folderResult.folderName} (${folderResult.webViewLink})`);

    latestDriveSession = {
      customerName: cleanCustomerName,
      folderName: folderResult.folderName,
      webViewLink: folderResult.webViewLink,
      createdAt: new Date().toISOString(),
    };

    // Auto-record session in persistent storage
    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const timeStr = `${hours}.${minutes}`;

      const addonsTotal = (miscAddons || []).reduce((sum, item) => {
        const price = item.price || 15000;
        return sum + (price * (item.qty || 1));
      }, 0);
      const a4Total = (Number(a4Count) || 0) * 20000;
      const softcopyTotal = makeStory ? 0 : (Number(extraCharge) || 25000);
      const sessionBasePrice = Number(basePrice) || 50000;
      const finalTotalPrice = sessionBasePrice + addonsTotal + a4Total + softcopyTotal;

      const newSessionRecord = {
        id: `SES-${Date.now()}`,
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
          regular: Number(regularPrint) || Number(peopleCount) || 1,
          bonus: Number(bonusPrint) || (joinedBonus ? Number(peopleCount) : 0),
          total: Number(totalPrint) || (joinedBonus ? (Number(peopleCount) * 2) : Number(peopleCount)),
        },
        a4Count: Number(a4Count) || 0,
        miscAddons: miscAddons || [],
        basePrice: sessionBasePrice,
        totalAddonsPrice: addonsTotal + a4Total,
        totalPrice: finalTotalPrice,
        driveFolderName: folderResult.folderName,
        driveWebViewLink: folderResult.webViewLink,
      };

      const allSessions = readSessions();
      allSessions.unshift(newSessionRecord);
      writeSessions(allSessions);
      console.log(`[Session] Recorded session for ${cleanCustomerName}: Total Rp ${finalTotalPrice}`);
    } catch (saveErr) {
      console.error("[Session] Gagal menyimpan data sesi:", saveErr.message);
    }

    // ─── 1. SESSION STAGING QUEUE (ISOLASI FILE SESI) ─────────
    // Buat folder staging terpisah di storage/upload_queue agar file sesi ini
    // TIDAK HILANG / RUSAK meskipun folder public/photos dihapus untuk customer berikutnya.
    const safeSessionDirName = `${Date.now()}_${cleanCustomerName || "Session"}`.replace(/[/\\?%*:|"<>]/g, "_");
    const sessionStagingDir = path.join(UPLOAD_QUEUE_DIR, safeSessionDirName);
    fs.mkdirSync(sessionStagingDir, { recursive: true });

    const filePathsToUpload = [];

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

    // A. Simpan data:image base64 (seperti print composite/layout) langsung ke staging folder
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
    // Semua file foto yang ada di PHOTOS_DIR adalah jepretan sesi customer ini.
    // Dengan memindahkannya, PHOTOS_DIR langsung KOSONG seketika untuk customer berikutnya!
    if (fs.existsSync(PHOTOS_DIR)) {
      const existingPhotos = fs.readdirSync(PHOTOS_DIR);
      for (const f of existingPhotos) {
        if (f.match(/\.(jpg|jpeg|png|webp)$/i)) {
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

    // Inisialisasi progress untuk dipantau admin & frontend
    uploadProgress = {
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

    // Kirim response link ke frontend secepatnya (di bawah 1 detik)
    res.json({
      success: true,
      folderId: folderResult.folderId,
      folderName: folderResult.folderName,
      webViewLink: folderResult.webViewLink,
      totalFiles: filePathsToUpload.length,
    });

    // Background upload dengan update real-time progress
    (async () => {
      try {
        console.log(`[GDrive] Mengunggah ${filePathsToUpload.length} file ke ${folderResult.folderName}...`);
        await uploadMultipleFiles(
          filePathsToUpload,
          folderResult.photosFolderId || folderResult.folderId,
          (uploadedCount, totalCount, fileName, status) => {
            const fileItem = uploadProgress.files.find((f) => f.name === fileName);
            if (fileItem) fileItem.status = status;
            uploadProgress.uploaded = (status === "done" || status === "failed") ? uploadedCount : uploadProgress.uploaded;
            uploadProgress.percent = Math.round((uploadProgress.uploaded / totalCount) * 100);
            uploadProgress.currentFile = status === "uploading" ? fileName : "";
            uploadProgress.updatedAt = new Date().toISOString();
          }
        );
        uploadProgress.isUploading = false;
        uploadProgress.percent = 100;
        uploadProgress.currentFile = "";
        uploadProgress.updatedAt = new Date().toISOString();
        console.log(`[GDrive] Selesai! Semua ${filePathsToUpload.length} file berhasil diunggah ke ${folderResult.folderName}.`);

        // Setelah upload selesai 100%, pindahkan staging folder ke arsip lokal harian sebagai cadangan
        try {
          const now = new Date();
          const dateFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
          const archiveDestDir = path.join(ARCHIVE_DIR, dateFolder, safeSessionDirName);
          fs.mkdirSync(path.dirname(archiveDestDir), { recursive: true });
          fs.renameSync(sessionStagingDir, archiveDestDir);
          console.log(`[GDrive] Sesi diarsipkan di disk lokal: ${archiveDestDir}`);
        } catch (archiveErr) {
          try { fs.rmSync(sessionStagingDir, { recursive: true, force: true }); } catch {}
        }
      } catch (uploadErr) {
        uploadProgress.isUploading = false;
        uploadProgress.error = uploadErr.message;
        console.error("[GDrive] Error saat background file upload:", uploadErr);
      }
    })();
  } catch (err) {
    console.error("[GDrive] Gagal membuat sesi Google Drive:", err);
    res.status(500).json({ error: err.message });
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
  const queueStats = getDirectoryStats(UPLOAD_QUEUE_DIR);
  const archiveDateFolders = getArchiveDateFolders();

  const totalArchiveBytes = archiveDateFolders.reduce((sum, item) => sum + item.bytes, 0);
  const totalArchiveFiles = archiveDateFolders.reduce((sum, item) => sum + item.files, 0);
  const totalArchiveSessions = archiveDateFolders.reduce((sum, item) => sum + item.sessionCount, 0);

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

  const studioTotalBytes = cameraStats.bytes + thumbsStats.bytes + queueStats.bytes + totalArchiveBytes;

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
      queue: {
        bytes: queueStats.bytes,
        formatted: queueStats.formatted,
        folderCount: queueFolders.length,
        folders: queueFolders,
        isUploading: uploadProgress.isUploading,
        activeFolder: uploadProgress.folderName || null,
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
        const targetPath = path.join(ARCHIVE_DIR, item.date);
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
          const target = path.join(ARCHIVE_DIR, item.date);
          try {
            fs.rmSync(target, { recursive: true, force: true });
            freedBytes += item.bytes;
            deletedCount++;
          } catch (e) {
            console.error(`[Storage] Gagal hapus ${item.date}:`, e);
          }
        }
      }
    } else if (action === "archive_date") {
      if (!date) return res.status(400).json({ error: "Parameter 'date' diperlukan" });
      const target = path.join(ARCHIVE_DIR, date);
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
          const target = path.join(ARCHIVE_DIR, e);
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
      name: "Fotobox (Card Reader E:)",
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
  try {
    if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    fs.writeFileSync(CAMERA_IMPORT_CONFIG_JSON, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[CameraImport] Gagal simpan config:", err);
  }
}

// Menemukan folder DCIM atau folder kamera aktif (misal 263_FUJI, 264_FUJI, 100CANON)
function resolveCameraFolders(rootPath) {
  if (!rootPath || !fs.existsSync(rootPath)) return [];

  // 1. Cek apakah folder yang diberikan langsung berisi file foto JPG
  try {
    const directFiles = fs.readdirSync(rootPath);
    if (directFiles.some((f) => f.match(/\.(jpg|jpeg)$/i))) {
      return [{ folderPath: rootPath, folderName: path.basename(rootPath) }];
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
      .map((e) => ({
        folderPath: path.join(targetDcim, e.name),
        folderName: e.name,
      }))
      // Sort numeric descending, misal 264_FUJI sebelum 263_FUJI
      .sort((a, b) => b.folderName.localeCompare(a.folderName, undefined, { numeric: true }));

    if (subDirs.length > 0) return subDirs;
  } catch {}

  return [];
}

// Scan file foto di folder kamera berdasarkan filter waktu
function scanCameraPhotos(sourcePath, options = {}) {
  const { minutes = 30, filter = "30_min", lastImportTimestamp = null } = options;
  const folders = resolveCameraFolders(sourcePath);

  if (folders.length === 0) {
    return {
      success: false,
      error: `Folder sumber tidak terdeteksi atau belum dicolok: "${sourcePath}"`,
      folders: [],
      files: [],
      totalFound: 0,
    };
  }

  // Ambil folder terbaru (dan folder kedua jika ada, untuk menangani rollover 263 -> 264)
  const foldersToScan = folders.slice(0, 2);
  const now = Date.now();
  let cutoffMs = 0;

  if (filter === "30_min") cutoffMs = now - 30 * 60 * 1000;
  else if (filter === "45_min") cutoffMs = now - 45 * 60 * 1000;
  else if (filter === "60_min") cutoffMs = now - 60 * 60 * 1000;
  else if (filter === "custom_min" && typeof minutes === "number") cutoffMs = now - minutes * 60 * 1000;
  else if (filter === "since_last" && lastImportTimestamp) cutoffMs = new Date(lastImportTimestamp).getTime();

  const isTodayOnly = filter === "today";
  const todayDateStr = new Date().toDateString();

  const matchedFiles = [];

  for (const f of foldersToScan) {
    try {
      const items = fs.readdirSync(f.folderPath);
      for (const item of items) {
        if (!item.match(/\.(jpg|jpeg)$/i)) continue; // Hanya JPG (abaikan RAW .RAF/.CR3)

        const fullPath = path.join(f.folderPath, item);
        try {
          const stat = fs.statSync(fullPath);
          const mtimeMs = stat.mtimeMs;
          const mtimeDate = new Date(mtimeMs);

          // Cek filter waktu
          if (cutoffMs > 0 && mtimeMs < cutoffMs) continue;
          if (isTodayOnly && mtimeDate.toDateString() !== todayDateStr) continue;

          matchedFiles.push({
            name: item,
            fullPath,
            size: stat.size,
            formattedSize: formatBytes(stat.size),
            mtimeMs,
            timeFormatted: mtimeDate.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            folderName: f.folderName,
          });
        } catch {}
      }
    } catch {}
  }

  // Urutkan berdasarkan waktu pengambilan foto (tertua ke terbaru)
  matchedFiles.sort((a, b) => a.mtimeMs - b.mtimeMs);

  const totalBytes = matchedFiles.reduce((acc, f) => acc + f.size, 0);

  // Ambil sampel preview: 3 foto awal dan 3 foto akhir
  const previewFiles = [];
  if (matchedFiles.length <= 6) {
    previewFiles.push(...matchedFiles);
  } else {
    previewFiles.push(matchedFiles[0], matchedFiles[1], matchedFiles[2]);
    previewFiles.push(
      matchedFiles[matchedFiles.length - 3],
      matchedFiles[matchedFiles.length - 2],
      matchedFiles[matchedFiles.length - 1]
    );
  }

  return {
    success: true,
    activeFolder: folders[0].folderName,
    activeFolderPath: folders[0].folderPath,
    totalFound: matchedFiles.length,
    totalBytes,
    formattedTotalSize: formatBytes(totalBytes),
    earliestTime: matchedFiles.length > 0 ? matchedFiles[0].timeFormatted : null,
    latestTime: matchedFiles.length > 0 ? matchedFiles[matchedFiles.length - 1].timeFormatted : null,
    files: matchedFiles,
    previews: previewFiles.map((pf) => ({
      name: pf.name,
      fullPath: pf.fullPath,
      timeFormatted: pf.timeFormatted,
      previewUrl: `/api/camera-import/thumbnail?filePath=${encodeURIComponent(pf.fullPath)}`,
    })),
  };
}

app.get("/api/camera-import/config", (req, res) => {
  try {
    const config = readCameraImportConfig();
    // Tambahkan status koneksi live untuk masing-masing preset
    const presetStatuses = {};
    for (const [key, p] of Object.entries(config.presets)) {
      const isConnected = !!(p.path && fs.existsSync(p.path));
      const detectedFolders = isConnected ? resolveCameraFolders(p.path).map((f) => f.folderName) : [];
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

app.post("/api/camera-import/scan", (req, res) => {
  try {
    const { presetId = "studio", customPath, filter = "30_min", minutes = 30 } = req.body;
    const config = readCameraImportConfig();

    let targetPath = "";
    if (presetId === "custom" || customPath) {
      targetPath = customPath || config.presets.custom?.path || "";
    } else if (config.presets[presetId]) {
      targetPath = config.presets[presetId].path;
    }

    if (!targetPath) {
      return res.status(400).json({ success: false, error: "Path folder sumber belum ditentukan." });
    }

    const lastImportTime = config.lastImport?.timestamp || null;
    const result = scanCameraPhotos(targetPath, {
      filter,
      minutes: Number(minutes) || 30,
      lastImportTimestamp: lastImportTime,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint streaming thumbnail cepat untuk preview foto kamera
app.get("/api/camera-import/thumbnail", async (req, res) => {
  try {
    const filePath = req.query.filePath;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).send("File not found");
    }

    // Buat thumbnail kecil on-the-fly (max lebar 260px) agar render modal instan
    res.type("image/jpeg");
    try {
      const stream = sharp(filePath)
        .resize({ width: 260, height: 260, fit: "inside" })
        .jpeg({ quality: 75 });
      stream.pipe(res);
    } catch {
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/api/camera-import/import", async (req, res) => {
  try {
    const {
      presetId = "studio",
      customPath,
      filter = "30_min",
      minutes = 30,
      clearExistingPhotos = true,
    } = req.body;

    const config = readCameraImportConfig();

    let targetPath = "";
    if (presetId === "custom" || customPath) {
      targetPath = customPath || config.presets.custom?.path || "";
    } else if (config.presets[presetId]) {
      targetPath = config.presets[presetId].path;
    }

    if (!targetPath) {
      return res.status(400).json({ success: false, error: "Path folder kamera belum ditentukan" });
    }

    const scan = scanCameraPhotos(targetPath, {
      filter,
      minutes: Number(minutes) || 30,
      lastImportTimestamp: config.lastImport?.timestamp,
    });

    if (!scan.success || scan.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: scan.error || "Tidak ada foto baru yang ditemukan sesuai filter waktu.",
      });
    }

    // 1. Kosongkan folder kamera aktif jika dipilih
    if (clearExistingPhotos) {
      if (fs.existsSync(PHOTOS_DIR)) {
        const files = fs.readdirSync(PHOTOS_DIR);
        for (const f of files) {
          if (f.match(/\.(jpg|jpeg|png|webp)$/i)) {
            try { fs.unlinkSync(path.join(PHOTOS_DIR, f)); } catch {}
          }
        }
      }
      if (fs.existsSync(THUMBS_DIR)) {
        const thumbs = fs.readdirSync(THUMBS_DIR);
        for (const t of thumbs) {
          try { fs.unlinkSync(path.join(THUMBS_DIR, t)); } catch {}
        }
      }
    }

    // 2. Salin file-file foto ke public/photos
    let copiedCount = 0;
    let copiedBytes = 0;

    for (const file of scan.files) {
      const dest = path.join(PHOTOS_DIR, file.name);
      try {
        fs.copyFileSync(file.fullPath, dest);
        copiedCount++;
        copiedBytes += file.size;

        // Generate thumbnail langsung untuk Kiosk
        await generateThumbnail(file.name);
      } catch (err) {
        console.error(`[CameraImport] Gagal salin ${file.name}:`, err.message);
      }
    }

    // 3. Catat riwayat import di config
    config.lastImport = {
      timestamp: new Date().toISOString(),
      preset: presetId,
      count: copiedCount,
      bytes: copiedBytes,
      formattedSize: formatBytes(copiedBytes),
      firstFile: scan.files[0]?.name || null,
      lastFile: scan.files[scan.files.length - 1]?.name || null,
      earliestTime: scan.earliestTime,
      latestTime: scan.latestTime,
    };
    writeCameraImportConfig(config);

    console.log(`[CameraImport] Sukses import ${copiedCount} foto (${formatBytes(copiedBytes)}) dari ${presetId}.`);

    res.json({
      success: true,
      count: copiedCount,
      totalBytes: copiedBytes,
      formattedSize: formatBytes(copiedBytes),
      timeRange: `${scan.earliestTime} - ${scan.latestTime}`,
      message: `Berhasil menyalin ${copiedCount} foto (${formatBytes(copiedBytes)}) ke Kiosk!`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Membuka folder public/photos di Windows Explorer asli
app.post("/api/camera-import/open-folder", (req, res) => {
  try {
    const targetDir = PHOTOS_DIR.replace(/\//g, "\\");
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

  const dir = path.join(TEMPLATES_DIR, name);
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
        const dir = path.join(TEMPLATES_DIR, removed.name);
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
    const printers = await getPrinters();
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
  const data = readPrinters();
  if (data.profiles.find((p) => p.id === id)) {
    return res.status(409).json({ error: "Printer profile already exists" });
  }
  const entry = { id, label, printerName, appliesTo, copies: copies || 1 };
  data.profiles.push(entry);
  writePrinters(data);
  res.json({ success: true, profile: entry });
});

app.put("/api/printers/:id", (req, res) => {
  const { id } = req.params;
  const changes = req.body;
  const data = readPrinters();
  const idx = data.profiles.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: "Printer profile not found" });
  data.profiles[idx] = { ...data.profiles[idx], ...changes };
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

  const { success, printers = [], jobs = [], error } = await fetchWindowsPrinterStatus();
  const printersData = readPrinters();
  const profiles = printersData.profiles || [];

  const mappedPrinters = printers.map((p) => {
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

    const matchingProfiles = profiles.filter(
      (prof) => prof.printerName.toLowerCase() === (p.Name || "").toLowerCase()
    );

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
      profiles: matchingProfiles.map((prof) => ({
        id: prof.id,
        label: prof.label,
        appliesTo: prof.appliesTo,
      })),
    };
  });

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

app.get("/api/printer-status", async (req, res) => {
  try {
    const status = await getDetailedPrinterStatus();
    res.json(status);
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

app.post("/api/printers/clear-jobs", (req, res) => {
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

  let totalSessions = filteredSessions.length;
  let totalPeople = 0;
  let totalOmset = 0;
  let totalReg4R = 0;
  let totalBonus4R = 0;
  let totalA4 = 0;
  let storyFreeCount = 0;
  let paidSoftcopyCount = 0;
  let paidSoftcopyRevenue = 0;
  const addonsMap = {};

  filteredSessions.forEach((s) => {
    totalPeople += Number(s.peopleCount) || 1;
    totalOmset += Number(s.totalPrice) || 0;
    totalReg4R += Number(s.prints?.regular) || 0;
    totalBonus4R += Number(s.prints?.bonus) || 0;
    totalA4 += Number(s.a4Count) || 0;

    if (s.makeStory) {
      storyFreeCount++;
    } else {
      paidSoftcopyCount++;
      paidSoftcopyRevenue += Number(s.softcopyCharge) || 25000;
    }

    if (Array.isArray(s.miscAddons)) {
      s.miscAddons.forEach((item) => {
        const name = item.name || "Addon";
        const qty = Number(item.qty) || 1;
        const price = Number(item.price) || 15000;
        if (!addonsMap[name]) {
          addonsMap[name] = { name, qty: 0, revenue: 0 };
        }
        addonsMap[name].qty += qty;
        addonsMap[name].revenue += (qty * price);
      });
    }
  });

  const allAvailableDates = Array.from(new Set(allSessions.map((s) => s.date))).sort().reverse();

  res.json({
    success: true,
    date: targetDate,
    summary: {
      totalSessions,
      totalPeople,
      totalOmset,
      totalPrints: {
        regular: totalReg4R,
        bonus: totalBonus4R,
        total4R: totalReg4R + totalBonus4R,
        a4: totalA4,
      },
      softcopy: {
        storyFree: storyFreeCount,
        paid: paidSoftcopyCount,
        paidRevenue: paidSoftcopyRevenue,
      },
      addonsSummary: Object.values(addonsMap),
    },
    sessions: filteredSessions,
    allAvailableDates,
  });
});

app.post("/api/sessions", (req, res) => {
  const sessionData = req.body;
  if (!sessionData) return res.status(400).json({ error: "Missing session data" });
  const allSessions = readSessions();
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

// ─────────────────────────────────────────────────────────────

// Watch PHOTOS_DIR for new files and generate thumbnails immediately
function startFileWatcher() {
  console.log(`Watching for new photos in ${PHOTOS_DIR}...`);
  try {
    fs.watch(PHOTOS_DIR, async (eventType, filename) => {
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
});
