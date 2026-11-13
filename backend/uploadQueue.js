import fs from "node:fs";
import path from "node:path";
import { childPath, writeJsonAtomic } from "./safety.js";

export function createQueueUploader({ queueDir, archiveDir, createFolder, uploadFiles, updateSession, io = fs }) {
  const active = new Set();
  return async function uploadQueuedSession(folderName, onProgress) {
    const folder = childPath(queueDir, folderName);
    if (active.has(folder)) throw new Error("Sesi ini sedang diunggah. Tunggu proses selesai.");
    active.add(folder);
    const metaPath = path.join(folder, "session_info.json");
    let meta;
    try {
      meta = JSON.parse(io.readFileSync(metaPath, "utf8"));
      if (meta.status === "staging") throw new Error("Sesi belum selesai disiapkan. Coba simpan sesi kembali dari kiosk; foto tetap tersimpan lokal.");
      const save = () => writeJsonAtomic(metaPath, meta);
      const names = meta.files ?? io.readdirSync(folder).filter((f) => /\.(jpg|jpeg|png|webp|pdf)$/i.test(f));
      meta.files = names;
      if (!meta.driveFolder) {
        meta.driveFolder = await createFolder(meta.customerName);
        save();
      }
      meta.uploadedFiles ??= [];
      const pending = names.filter((name) => !meta.uploadedFiles.includes(name));
      await uploadFiles(pending.map((name) => childPath(folder, name)), meta.driveFolder.photosFolderId || meta.driveFolder.folderId,
        async (_count, _total, name, status) => {
          if (status === "done") {
            meta.uploadedFiles.push(name);
            save();
          }
          if (onProgress) onProgress(meta.uploadedFiles.length, names.length, name, status);
        });
      if (meta.uploadedFiles.length !== names.length) throw new Error("Sebagian file belum terunggah. Antrean lokal dipertahankan.");
      meta.status = "uploaded";
      save();
      updateSession(meta.id, {
        driveFolderName: meta.driveFolder.folderName, driveWebViewLink: meta.driveFolder.webViewLink,
        driveStatus: "uploaded", driveError: null,
      });
      const date = /^\d{4}-\d{2}-\d{2}$/.test(meta.date) ? meta.date : new Date().toISOString().slice(0, 10);
      const dateDir = childPath(archiveDir, date);
      io.mkdirSync(dateDir, { recursive: true });
      // If archiving fails, keep the queue and its completed-file manifest for retry.
      io.renameSync(folder, childPath(dateDir, folderName));
      return { folderResult: meta.driveFolder, filesUploaded: names.length };
    } catch (error) {
      if (meta) {
        updateSession(meta.id, { driveStatus: meta.status === "uploaded" ? "archive_pending" : "upload_failed", driveError: error.message });
      }
      throw error;
    } finally {
      active.delete(folder);
    }
  };
}
