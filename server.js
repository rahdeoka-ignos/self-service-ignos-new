import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import sharp from "sharp";
import multer from "multer";
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

function readTemplates() {
  return JSON.parse(fs.readFileSync(TEMPLATES_JSON, "utf-8"));
}
function writeTemplates(data) {
  fs.writeFileSync(TEMPLATES_JSON, JSON.stringify(data, null, 2), "utf-8");
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

app.post("/api/save-print", upload.single("file"), (req, res) => {
  res.json({
    success: true,
    file: `http://localhost:5000/photos/${req.file.filename}`,
  });
});

async function generateThumbnail(file) {
  const inputPath = path.join(PHOTOS_DIR, file);
  const thumbPath = path.join(THUMBS_DIR, file);

  if (!fs.existsSync(thumbPath)) {
    await sharp(inputPath)
      .resize(400) // ukuran thumbnail
      .jpeg({ quality: 80 })
      .toFile(thumbPath);
  }
}

app.get("/api/photos", async (req, res) => {
  try {
    const files = fs.readdirSync(PHOTOS_DIR);

    const images = [];

    for (const file of files) {
      if (file.match(/\.(jpg|jpeg|png|webp)$/i)) {
        await generateThumbnail(file);

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

// ─────────────────────────────────────────────────────────────

app.listen(5000, () => {
  console.log("Photo API running on http://localhost:5000");
});
