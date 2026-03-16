import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import sharp from "sharp";
import multer from "multer";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());

// fix __dirname di ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PHOTOS_DIR = path.join(__dirname, "public/photos");
const THUMBS_DIR = path.join(__dirname, "public/thumbnails");

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
    cb(null, `print-${Date.now()}.png`);
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

app.listen(5000, () => {
  console.log("Photo API running on http://localhost:5000");
});
