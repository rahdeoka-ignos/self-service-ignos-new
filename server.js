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
    const label = req.query.label?.toString() || "print";
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `${label}-${Date.now()}${ext}`);
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
  });

  // Fire-and-forget: kirim response dulu ke frontend, print jalan di background
  if (productType) {
    autoPrintFile(filePath, productType, copiesOverride);
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
