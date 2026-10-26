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

    // Cari dan kumpulkan semua path file yang akan diunggah
    const uniqueItems = Array.from(new Set([...rawPhotos, ...printFiles]));
    const filePathsToUpload = [];

    for (const item of uniqueItems) {
      if (!item) continue;
      if (item.startsWith("data:image/")) {
        const matches = item.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
          const buffer = Buffer.from(matches[2], "base64");
          const tempName = `raw-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
          const tempPath = path.join(PHOTOS_DIR, tempName);
          fs.writeFileSync(tempPath, buffer);
          filePathsToUpload.push(tempPath);
        }
      } else {
        const filename = item.includes("/") ? item.split("/").pop().split("?")[0] : item;
        const fullPath = path.join(PHOTOS_DIR, filename);
        if (fs.existsSync(fullPath)) {
          filePathsToUpload.push(fullPath);
        } else {
          // Cari kemungkinan kemiripan nama (misal label timestamp prefix)
          const localFiles = fs.readdirSync(PHOTOS_DIR);
          const matched = localFiles.find((f) => f.includes(filename) || filename.includes(f));
          if (matched) {
            filePathsToUpload.push(path.join(PHOTOS_DIR, matched));
          } else {
            console.warn(`[GDrive] File tidak ditemukan di folder lokal: ${fullPath}`);
          }
        }
      }
    }

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
$p = @(Get-CimInstance Win32_Printer | Select-Object Name, PrinterStatus, ExtendedPrinterStatus, DetectedErrorState, PrinterState, WorkOffline, PortName);
$j = @(Get-CimInstance Win32_PrintJob | Select-Object Name, JobStatus, Status, Document);
[PSCustomObject]@{ printers = $p; jobs = $j } | ConvertTo-Json -Depth 3 -Compress
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
    const isOffline = !!p.WorkOffline || (printerState & 128) !== 0 || p.PrinterStatus === 7;
    
    // Paper out checks (DetectedErrorState 4 or PrinterState bit 16)
    const isPaperOut = detectedError === 4 || (printerState & 16) !== 0;

    // Door / Cover / Output Tray closed checks (DetectedErrorState 7 or PrinterState bit 4194304)
    const isDoorOpen = detectedError === 7 || (printerState & 4194304) !== 0;

    // Paper jam checks (DetectedErrorState 8 or PrinterState bit 8)
    const isPaperJam = detectedError === 8 || (printerState & 8) !== 0;

    // User intervention
    const isUserIntervention = (printerState & 1048576) !== 0;

    // Printing
    const isPrinting = (printerState & 1024) !== 0 || p.PrinterStatus === 4;

    const printerJobs = jobs.filter((j) => (j.Name || "").toLowerCase().startsWith(p.Name.toLowerCase()));

    let statusCode = "ready";
    let statusText = "Ready";

    if (isOffline) {
      statusCode = "offline";
      statusText = "Offline";
    } else if (isPaperOut) {
      statusCode = "paper_out";
      statusText = "Kertas Habis";
    } else if (isDoorOpen) {
      statusCode = "door_open";
      statusText = "Penutup / Tray Tertutup";
    } else if (isPaperJam) {
      statusCode = "paper_jam";
      statusText = "Kertas Macet (Paper Jam)";
    } else if (isUserIntervention) {
      statusCode = "user_intervention";
      statusText = "Perlu Perhatian Kasir";
    } else if (isPrinting) {
      statusCode = "printing";
      statusText = "Sedang Mencetak";
    }

    const matchingProfiles = profiles.filter(
      (prof) => prof.printerName.toLowerCase() === p.Name.toLowerCase()
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

        if (p.isPaperOut) {
          activeAlert = {
            type: "paper_out",
            title: is4R ? "Kertas Printer 4R Habis" : `Kertas Printer ${profileLabels} Habis`,
            customerMessage: "Kertas foto sedang diisi ulang oleh staff. Mohon tunggu beberapa saat ya kak!",
            adminMessage: `Kertas pada printer "${p.name}" (${profileLabels}) telah habis! Mohon segera isi ulang kertas.`,
            printerName: p.name,
            profileLabel: profileLabels,
          };
          break;
        } else if (p.isDoorOpen) {
          activeAlert = {
            type: "door_open",
            title: is4R ? "Tray / Penutup Printer 4R Tertutup" : `Penutup Printer ${profileLabels} Belum Ditarik`,
            customerMessage: "Tray penutup printer sedang dibuka/ditarik oleh staff. Foto kamu akan segera keluar!",
            adminMessage: `Penutup/tray pada printer "${p.name}" (${profileLabels}) belum ditarik keluar.`,
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
