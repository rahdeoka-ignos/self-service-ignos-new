import fs from "node:fs";
import { writeJsonAtomic } from "./safety.js";

const RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

// A camera reuses file names (DSCF numbering wraps, cards get formatted), so a photo is
// identified by folder/name together with its capture time and size. The same key is produced
// whether the card is read through the camera (USB/MTP) or a card reader.
export function photoKey(file) {
  return `${file.folderName}/${file.name}|${file.timeMs ?? "?"}|${file.size ?? "?"}`;
}

export function createImportHistory(filename, { now = Date.now } = {}) {
  let cache = null;
  const load = () => {
    if (cache) return cache;
    try { cache = JSON.parse(fs.readFileSync(filename, "utf8")).entries || {}; }
    catch { cache = {}; }
    return cache;
  };
  return {
    // Returns { importedAt, jobId } or undefined.
    lookup(file) { return load()[photoKey(file)]; },
    record(files, { jobId, importedAt = new Date(now()).toISOString() }) {
      const entries = { ...load() };
      const cutoff = now() - RETENTION_MS;
      for (const [key, entry] of Object.entries(entries)) {
        if (Date.parse(entry.importedAt) < cutoff) delete entries[key];
      }
      for (const file of files) entries[photoKey(file)] = { importedAt, jobId };
      writeJsonAtomic(filename, { version: 1, entries });
      cache = entries;
    },
  };
}
