import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { childPath, writeJsonAtomic } from "./safety.js";

export async function verifyPhoto(filename, expectedSize) {
  const stat = await fs.promises.stat(filename);
  if (!stat.isFile() || !stat.size || (expectedSize != null && stat.size !== expectedSize)) throw new Error(`Transfer belum lengkap: ${path.basename(filename)}`);
  // stats() decodes pixel data, unlike metadata() which can accept a truncated image.
  await sharp(filename, { failOn: "warning" }).stats();
  return stat.size;
}

// Synchronous rename section: no other API handler observes a partially published gallery.
// Old files are retained, not deleted. Roll back if either directory cannot be switched.
export function publishGallery({ photosDir, thumbsDir, stagePhotos, stageThumbs, backupDir, io = fs }) {
  io.mkdirSync(backupDir, { recursive: true });
  const moves = [];
  const move = (from, to) => { io.renameSync(from, to); moves.push([from, to]); };
  try {
    if (io.existsSync(photosDir)) move(photosDir, path.join(backupDir, "photos"));
    if (io.existsSync(thumbsDir)) move(thumbsDir, path.join(backupDir, "thumbs"));
    move(stagePhotos, photosDir);
    move(stageThumbs, thumbsDir);
  } catch (error) {
    const rollbackErrors = [];
    for (const [from, to] of moves.reverse()) {
      try { io.renameSync(to, from); } catch (err) { rollbackErrors.push(err.message); }
    }
    throw new Error(`Galeri belum diganti: ${error.message}${rollbackErrors.length ? `. Pemulihan perlu staf; cadangan ada di ${backupDir}: ${rollbackErrors.join("; ")}` : ". Galeri sebelumnya dipulihkan."}`);
  }
}

export async function prepareGallery({ files, workDir, photosDir, clearExisting, copy, onProgress = () => {} }) {
  const stagePhotos = path.join(workDir, "photos"), stageThumbs = path.join(workDir, "thumbs");
  fs.mkdirSync(stagePhotos, { recursive: true }); fs.mkdirSync(stageThumbs, { recursive: true });
  if (!clearExisting && fs.existsSync(photosDir)) {
    for (const entry of fs.readdirSync(photosDir, { withFileTypes: true })) {
      if (entry.isFile()) await fs.promises.copyFile(childPath(photosDir, entry.name), childPath(stagePhotos, entry.name));
    }
  }
  writeJsonAtomic(path.join(workDir, "manifest.json"), { status: "copying", files });
  await copy(stagePhotos);
  let bytes = 0, verified = 0;
  for (const file of files) {
    bytes += await verifyPhoto(childPath(stagePhotos, file.destName), file.size);
    onProgress(++verified, files.length, "verifying");
  }
  for (const file of fs.readdirSync(stagePhotos).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))) {
    await sharp(childPath(stagePhotos, file), { failOn: "warning" }).rotate().resize(400).jpeg({ quality: 80 }).toFile(childPath(stageThumbs, file));
  }
  writeJsonAtomic(path.join(workDir, "manifest.json"), { status: "verified", files, bytes });
  return { stagePhotos, stageThumbs, bytes };
}
