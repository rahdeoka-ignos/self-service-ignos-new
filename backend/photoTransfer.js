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
// Folders are never renamed, only their files: Windows refuses to rename a folder while any file in
// it is open (EPERM), and freshly copied photos are typically being scanned by the antivirus right
// then. A single file that is briefly locked is retried for up to ~3 seconds.
const LOCK_CODES = new Set(["EPERM", "EBUSY", "EACCES"]);
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export function publishGallery({ photosDir, thumbsDir, stagePhotos, stageThumbs, backupDir, io = fs, retryDelayMs = 100, retries = 30 }) {
  io.mkdirSync(backupDir, { recursive: true });
  const moves = [];
  // Synchronous on purpose: no request handler can observe a half-replaced gallery.
  const move = (from, to) => {
    for (let attempt = 0; ; attempt++) {
      try { io.renameSync(from, to); break; }
      catch (error) {
        if (!LOCK_CODES.has(error.code) || attempt >= retries) throw error;
        pause(retryDelayMs);
      }
    }
    moves.push([from, to]);
  };
  const swap = (liveDir, stageDir, backupName) => {
    const backup = path.join(backupDir, backupName);
    io.mkdirSync(liveDir, { recursive: true });
    io.mkdirSync(backup, { recursive: true });
    for (const name of io.readdirSync(liveDir)) move(path.join(liveDir, name), path.join(backup, name));
    for (const name of io.readdirSync(stageDir)) move(path.join(stageDir, name), path.join(liveDir, name));
  };
  try {
    swap(photosDir, stagePhotos, "photos");
    swap(thumbsDir, stageThumbs, "thumbs");
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
  // One decode per photo, several photos at a time: building the gallery thumbnail is also the
  // integrity check (a truncated or corrupt JPEG fails with failOn: "warning"). Decoding every
  // photo twice, one by one, took about half of an 81-photo import.
  let bytes = 0, verified = 0;
  const imported = new Set(files.map((file) => file.destName));
  await mapLimit(files, THUMB_CONCURRENCY, async (file) => {
    const photo = childPath(stagePhotos, file.destName);
    const stat = await fs.promises.stat(photo);
    if (!stat.isFile() || !stat.size || (file.size != null && stat.size !== file.size)) throw new Error(`Transfer belum lengkap: ${file.destName}`);
    await sharp(photo, { failOn: "warning" }).rotate().resize(400).jpeg({ quality: 80 }).toFile(childPath(stageThumbs, file.destName));
    bytes += stat.size;
    onProgress(++verified, files.length, "verifying");
  });
  // Photos kept from the previous gallery only need their thumbnails rebuilt.
  const kept = fs.readdirSync(stagePhotos).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f) && !imported.has(f));
  await mapLimit(kept, THUMB_CONCURRENCY, (name) =>
    sharp(childPath(stagePhotos, name), { failOn: "warning" }).rotate().resize(400).jpeg({ quality: 80 }).toFile(childPath(stageThumbs, name)));
  writeJsonAtomic(path.join(workDir, "manifest.json"), { status: "verified", files, bytes });
  return { stagePhotos, stageThumbs, bytes };
}

const THUMB_CONCURRENCY = 4;

// Runs fn over items with at most limit in flight; rejects on the first failure.
async function mapLimit(items, limit, fn) {
  let next = 0;
  const worker = async () => { while (next < items.length) { const item = items[next++]; await fn(item); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
