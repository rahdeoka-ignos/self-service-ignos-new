import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { childPath, writeJsonAtomic } from "./safety.js";
import { exifDateTime, selectPhotoWindow, selectConfirmedRange } from "./photoSelection.js";
import { prepareGallery, publishGallery, verifyPhoto } from "./photoTransfer.js";

export function createCameraImporter({ photosDir, thumbsDir, storageDir, cacheDir, runMtp, resolveFolders,
  readConfig, saveConfig, beforePublish = () => {}, afterPublish = () => {} }) {
  const scans = new Map();
  const previews = new Map();
  let busy = false;
  let progress = { phase: "idle", verified: 0, total: 0 };
  const getScan = (id) => {
    const scan = scans.get(id);
    if (!scan || Date.now() > scan.expiresAt) throw new Error("Hasil scan kedaluwarsa. Scan ulang sebelum impor.");
    return scan;
  };
  const timeLabel = (ms) => ms == null ? "Waktu tidak tersedia" : new Date(ms).toLocaleString("id-ID");
  const publicFile = (file, scanId) => ({
    id: file.id, name: file.name, folderName: file.folderName, size: file.size,
    timeFormatted: timeLabel(file.timeMs), timeSource: file.timeSource, group: file.group,
    selected: file.selected, previewUrl: `/api/camera-import/preview?scanId=${scanId}&id=${encodeURIComponent(file.id)}`,
  });
  return {
    get busy() { return busy; },
    get progress() { return progress; },
    async scan({ presetId = "studio", customPath, filter = "custom_min", minutes, subFolder = "all" } = {}) {
      if (busy) throw new Error("Tunggu impor yang sedang berlangsung selesai.");
      for (const [id, scan] of scans) if (Date.now() > scan.expiresAt) {
        scans.delete(id);
        for (const key of previews.keys()) if (key.startsWith(`${id}/`)) previews.delete(key);
      }
      const config = readConfig();
      const preset = config.presets[presetId];
      if (!preset) throw new Error("Sumber foto tidak dikenal.");
      const source = customPath || preset.path;
      const isMtp = presetId === "studio" || (source && !/^[a-zA-Z]:[\\/]/.test(source) && !path.isAbsolute(source));
      const duration = minutes ?? Number(filter.match(/^(\d+)_min$/)?.[1] ?? preset.defaultMinutes ?? 30);
      // Validate before accessing a device.
      selectPhotoWindow([], { filter, minutes: duration });
      let files = [], deviceName, storageName, availableFolders;
      if (isMtp) {
        const result = await runMtp(["-Action", "scan", "-DeviceQuery", preset.deviceQuery || "X-S10", "-SubFolder", subFolder]);
        if (!result.success) throw new Error(result.error || "Kamera tidak dapat dibaca.");
        deviceName = result.deviceName; storageName = result.storageName;
        availableFolders = result.availableFolders;
        files = (Array.isArray(result.files) ? result.files : result.files ? [result.files] : []).map((file) => {
          const time = file.capturedAt ? new Date(file.capturedAt).getTime() : NaN;
          return { ...file, timeMs: Number.isFinite(time) ? time : null };
        });
      } else {
        if (!source) throw new Error("Pilih folder kamera atau SD card terlebih dahulu.");
        let folders = resolveFolders(source);
        if (subFolder && subFolder !== "all") folders = folders.filter((f) => f.folderName === subFolder);
        if (!folders.length) throw new Error("Folder foto tidak ditemukan. Periksa koneksi perangkat.");
        availableFolders = folders.map((f) => ({ name: f.folderName }));
        for (const folder of folders) {
          for (const name of await fs.promises.readdir(folder.folderPath)) {
            if (!/\.(jpg|jpeg)$/i.test(name)) continue;
            const fullPath = childPath(folder.folderPath, name);
            const stat = await fs.promises.stat(fullPath);
            if (!stat.isFile()) continue;
            let taken = null;
            try { taken = exifDateTime((await sharp(fullPath).metadata()).exif); } catch { /* Verification rejects unreadable photos at import. */ }
            files.push({ id: `${folder.folderName}/${name}`, name, folderName: folder.folderName, fullPath,
              size: stat.size, mtimeMs: stat.mtimeMs, timeMs: taken ?? stat.mtimeMs, timeSource: taken == null ? "modified" : "taken" });
          }
        }
      }
      if (new Set(files.map((f) => f.id)).size !== files.length) throw new Error("Identitas file ambigu. Pilih satu folder sumber.");
      const selection = selectPhotoWindow(files, { filter, minutes: duration });
      const id = crypto.randomUUID();
      const scan = { ...selection, id, presetId, isMtp, deviceName, storageName, deviceQuery: preset.deviceQuery || "X-S10", expiresAt: Date.now() + 30 * 60000 };
      scans.set(id, scan);
      const selected = selection.candidates.filter((f) => f.selected);
      const sample = selected.length <= 6 ? selected : [...selected.slice(0, 3), ...selected.slice(-3)];
      return { success: true, scanId: id, expiresAt: scan.expiresAt, isMtp, activeFolder: subFolder === "all" ? "Semua folder kamera" : subFolder,
        availableFolders, totalInFolder: files.length, totalFound: selected.length, totalBytes: selected.reduce((n, f) => n + (f.size || 0), 0),
        earliestTime: selected.length ? timeLabel(selected[0].timeMs) : null, latestTime: selected.length ? timeLabel(selected.at(-1).timeMs) : null,
        candidates: selection.candidates.map((f) => publicFile(f, id)), toleranceCount: selection.candidates.filter((f) => f.group === "tolerance").length,
        unknownCount: selection.candidates.filter((f) => f.group === "unknown").length,
        fallbackCount: selection.candidates.filter((f) => f.timeSource === "modified").length,
        gaps: selection.gaps, previews: sample.map((f) => publicFile(f, id)) };
    },
    async preview(scanId, fileId) {
      const scan = getScan(scanId);
      const file = scan.candidates.find((f) => f.id === fileId);
      if (!file) throw new Error("Foto bukan bagian hasil scan.");
      if (!scan.isMtp) return file.fullPath;
      const key = `${scanId}/${fileId}`;
      if (!previews.has(key)) {
        const promise = (async () => {
          const work = childPath(cacheDir, crypto.randomUUID());
          fs.mkdirSync(work, { recursive: true });
          const manifest = path.join(work, "selection.json");
          writeJsonAtomic(manifest, { deviceName: scan.deviceName, storageName: scan.storageName, files: [{ ...file, destName: "preview.jpg" }] });
          const result = await runMtp(["-Action", "import", "-DeviceQuery", scan.deviceQuery, "-SubFolder", "all", "-ManifestPath", manifest, "-DestDir", work]);
          if (!result.success) throw new Error(result.error);
          const target = path.join(work, "preview.jpg");
          await verifyPhoto(target, file.size);
          return target;
        })();
        previews.set(key, promise);
        promise.catch(() => previews.delete(key));
      }
      return previews.get(key);
    },
    async import({ scanId, firstId, lastId, clearExistingPhotos = true }) {
      if (busy) throw new Error("Impor lain masih berlangsung.");
      const scan = getScan(scanId);
      const selection = selectConfirmedRange(scan, firstId, lastId);
      const signature = JSON.stringify([firstId, lastId, clearExistingPhotos]);
      if (scan.completed) {
        if (scan.completed.signature !== signature) throw new Error("Sesi ini sudah diimpor. Scan ulang untuk pilihan baru.");
        return scan.completed.result;
      }
      busy = true;
      const jobId = crypto.randomUUID();
      const workDir = childPath(storageDir, jobId);
      const files = selection.map((f, index) => ({ ...f, destName: `${jobId.slice(0, 8)}-${index + 1}-${f.name}` }));
      progress = { scanId, phase: "copying", verified: 0, total: files.length };
      try {
        const prepared = await prepareGallery({ files, workDir, photosDir, clearExisting: clearExistingPhotos,
          onProgress: (verified, total, phase) => { progress = { scanId, verified, total, phase }; },
          copy: async (destination) => {
            if (scan.isMtp) {
              const manifest = path.join(workDir, "selection.json");
              writeJsonAtomic(manifest, { deviceName: scan.deviceName, storageName: scan.storageName, files });
              const result = await runMtp(["-Action", "import", "-DeviceQuery", scan.deviceQuery, "-SubFolder", "all", "-ManifestPath", manifest, "-DestDir", destination]);
              if (!result.success || result.count !== files.length) throw new Error(result.error || "Jumlah foto yang tersalin belum lengkap.");
            } else {
              for (const file of files) {
                const before = await fs.promises.stat(file.fullPath);
                if (before.size !== file.size || before.mtimeMs !== file.mtimeMs) throw new Error(`Foto berubah sejak scan: ${file.name}. Scan ulang.`);
                await fs.promises.copyFile(file.fullPath, childPath(destination, file.destName));
                const after = await fs.promises.stat(file.fullPath);
                if (after.size !== before.size || after.mtimeMs !== before.mtimeMs) throw new Error(`Foto berubah saat disalin: ${file.name}.`);
              }
            }
          },
        });
        progress = { ...progress, phase: "publishing" };
        beforePublish();
        try { publishGallery({ photosDir, thumbsDir, ...prepared, backupDir: path.join(workDir, "previous-gallery") }); }
        finally { afterPublish(); }
        const result = { success: true, count: files.length, totalBytes: prepared.bytes,
          message: `${files.length} foto sudah diverifikasi dan siap untuk pelanggan.`, backupDir: path.join(workDir, "previous-gallery") };
        scan.completed = { signature, result };
        progress = { ...progress, phase: "complete" };
        const config = readConfig();
        config.lastImport = { timestamp: new Date().toISOString(), preset: scan.presetId, count: files.length, bytes: prepared.bytes,
          formattedSize: `${(prepared.bytes / 1048576).toFixed(1)} MB`, firstFile: files[0].name, lastFile: files.at(-1).name,
          earliestTime: timeLabel(files[0].timeMs), latestTime: timeLabel(files.at(-1).timeMs) };
        try { saveConfig(config); writeJsonAtomic(path.join(workDir, "result.json"), result); }
        catch { result.warning = "Foto siap, tetapi riwayat impor belum tersimpan."; }
        return result;
      } catch (error) {
        progress = { ...progress, phase: "failed", error: error.message };
        throw new Error(`${error.message} Impor belum selesai; periksa lalu coba lagi. Foto sumber tidak dihapus.`);
      } finally { busy = false; }
    },
  };
}
