import fs from "node:fs";
import path from "node:path";

// Every camera import / manual upload leaves a job folder in storage/camera_imports holding the
// gallery it replaced (previous-gallery) — often hundreds of MB per customer. The newest few are
// kept so staff can recover from importing the wrong customer; the rest are removed.
export const IMPORT_BACKUP_KEEP_LATEST = 3;
export const IMPORT_BACKUP_MAX_AGE_DAYS = 1;
const SKIP = new Set(["incoming"]); // multer's temporary upload folder

function folderSize(dir) {
  let bytes = 0, files = 0;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) { try { bytes += fs.statSync(full).size; files++; } catch { /* vanished */ } }
    }
  }
  return { bytes, files };
}

export function listImportBackups(dir, { now = Date.now() } = {}) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !SKIP.has(entry.name))
    .map((entry) => {
      const full = path.join(dir, entry.name);
      const { mtimeMs } = fs.statSync(full);
      const { bytes, files } = folderSize(full);
      return {
        id: entry.name,
        bytes, files, mtimeMs,
        ageDays: (now - mtimeMs) / 86400000,
        status: fs.existsSync(path.join(full, "result.json")) ? "completed" : "failed",
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

// Removes job folders beyond the newest `keepLatest`; with `maxAgeDays`, only those at least that old.
// Never runs while an import is in progress (its folder is being written).
export function cleanImportBackups(dir, { keepLatest = IMPORT_BACKUP_KEEP_LATEST, maxAgeDays = null, isBusy = () => false, now = Date.now(), rm = fs.rmSync } = {}) {
  if (isBusy()) return { deletedCount: 0, freedBytes: 0, skipped: "busy" };
  let deletedCount = 0, freedBytes = 0;
  for (const backup of listImportBackups(dir, { now }).slice(keepLatest)) {
    if (maxAgeDays != null && backup.ageDays < maxAgeDays) continue;
    try {
      rm(path.join(dir, backup.id), { recursive: true, force: true });
      deletedCount++;
      freedBytes += backup.bytes;
    } catch (error) {
      console.error(`[Storage] Gagal menghapus cadangan impor ${backup.id}:`, error.message);
    }
  }
  return { deletedCount, freedBytes };
}
