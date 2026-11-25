import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { childPath, writeJsonAtomic } from "./safety.js";
import { exifDateTime, selectPhotoWindow, selectConfirmedRange } from "./photoSelection.js";
import { prepareGallery, publishGallery, verifyPhoto } from "./photoTransfer.js";

export function createCameraImporter({ photosDir, thumbsDir, storageDir, cacheDir, runMtp, resolveFolders,
  readConfig, saveConfig, beforePublish = () => {}, afterPublish = () => {},
  history = { lookup: () => undefined, record: () => {} }, thumbBatchDelay = 120 }) {
  const scans = new Map();
  const previews = new Map();
  const thumbs = new Map();
  let thumbQueue = [];
  let thumbTimer = null;
  // Nothing in the cache outlives the process (scans live in memory), so start clean.
  try { for (const entry of fs.readdirSync(cacheDir)) fs.rmSync(path.join(cacheDir, entry), { recursive: true, force: true }); }
  catch { /* Missing or locked cache entries are not fatal. */ }
  // Thumbnails and previews wait behind scans/imports and are dropped once a newer scan exists.
  const background = (scan) => ({ priority: "low", cancelled: () => scan.superseded === true });
  let busy = false;
  let progress = { phase: "idle", verified: 0, total: 0 };
  const getScan = (id) => {
    const scan = scans.get(id);
    if (!scan || Date.now() > scan.expiresAt) throw new Error("Hasil scan kedaluwarsa. Scan ulang sebelum impor.");
    return scan;
  };
  const dropScan = (id) => {
    const scan = scans.get(id);
    scans.delete(id);
    for (const map of [previews, thumbs]) for (const key of map.keys()) if (key.startsWith(`${id}/`)) map.delete(key);
    for (const dir of scan?.previewDirs || []) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* Locked preview files are removed with the cache later. */ }
    }
  };
  // Every MTP call re-opens the device, so the photos for one view are copied in a single call.
  const fetchPreviews = (scan, files) => {
    const pending = files.filter((f) => !previews.has(`${scan.id}/${f.id}`));
    if (!pending.length) return;
    const work = childPath(cacheDir, crypto.randomUUID());
    scan.previewDirs.push(work);
    const items = pending.map((f, i) => ({ ...f, destName: `preview-${i + 1}.jpg` }));
    const batch = (async () => {
      fs.mkdirSync(work, { recursive: true });
      const manifest = path.join(work, "selection.json");
      writeJsonAtomic(manifest, { deviceName: scan.deviceName, storageName: scan.storageName, files: items });
      const result = await runMtp(["-Action", "import", "-DeviceQuery", scan.deviceQuery, "-SubFolder", "all", "-ManifestPath", manifest, "-DestDir", work], background(scan));
      if (!result.success) throw new Error(cameraErrorMessage(result.error, "Preview kamera gagal dibuat."));
    })();
    for (const item of items) {
      const key = `${scan.id}/${item.id}`;
      const promise = batch.then(async () => {
        const target = path.join(work, item.destName);
        await verifyPhoto(target, item.size);
        return target;
      });
      previews.set(key, promise);
      promise.catch(() => previews.delete(key));
    }
  };
  // The photo grid asks for many thumbnails at once. Requests arriving close together are sent to
  // the camera as one batch, which reads the small thumbnail the camera already stores instead of
  // copying the full photo. A missing thumbnail is reported, never replaced by a full copy: on the
  // X-S10 that flooded the camera with transfers and delayed scans and imports.
  const flushThumbs = () => {
    thumbTimer = null;
    const queue = thumbQueue; thumbQueue = [];
    const byScan = new Map();
    for (const job of queue) byScan.set(job.scan, [...(byScan.get(job.scan) || []), job]);
    for (const [scan, jobs] of byScan) {
      const work = childPath(cacheDir, crypto.randomUUID());
      scan.previewDirs.push(work);
      const items = jobs.map((job, i) => ({ id: job.file.id, name: job.file.name, folderName: job.file.folderName, destName: `thumb-${i + 1}.jpg` }));
      const batch = (async () => {
        fs.mkdirSync(work, { recursive: true });
        const manifest = path.join(work, "thumbs.json");
        writeJsonAtomic(manifest, { deviceName: scan.deviceName, storageName: scan.storageName, files: items });
        const result = await runMtp(["-Action", "thumbs", "-DeviceQuery", scan.deviceQuery, "-ManifestPath", manifest, "-DestDir", work], background(scan));
        if (!result.success) throw new Error(cameraErrorMessage(result.error, "Thumbnail kamera gagal dibaca."));
        const errors = new Map((Array.isArray(result.files) ? result.files : result.files ? [result.files] : []).map((f) => [f.id, f.error]));
        return items.map((item) => ({ target: path.join(work, item.destName), error: errors.get(item.id) }));
      })();
      jobs.forEach((job, i) => {
        batch.then((outcomes) => {
          const { target, error } = outcomes[i];
          if (fs.existsSync(target) && fs.statSync(target).size > 0) return target;
          throw new Error(cameraErrorMessage(error, "Thumbnail tidak tersedia."));
        }).then(job.resolve, job.reject);
      });
    }
  };
  const timeLabel = (ms) => ms == null ? "Waktu tidak tersedia" : new Date(ms).toLocaleString("id-ID");
  const publicFile = (file, scanId) => ({
    id: file.id, name: file.name, folderName: file.folderName, size: file.size,
    timeMs: file.timeMs, timeFormatted: timeLabel(file.timeMs), timeSource: file.timeSource, group: file.group,
    selected: file.selected, importedAt: file.importedAt || null,
    previewUrl: `/api/camera-import/preview?scanId=${scanId}&id=${encodeURIComponent(file.id)}`,
    thumbUrl: `/api/camera-import/thumb?scanId=${scanId}&id=${encodeURIComponent(file.id)}`,
  });
  return {
    get busy() { return busy; },
    get progress() { return progress; },
    async scan({ presetId = "studio", customPath, filter = "custom_min", minutes, subFolder = "all" } = {}) {
      if (busy) throw new Error("Tunggu impor yang sedang berlangsung selesai.");
      for (const [id, scan] of scans) if (Date.now() > scan.expiresAt) dropScan(id);
      // A new scan replaces the previous grid: its pending thumbnail work no longer needs the camera.
      for (const scan of scans.values()) scan.superseded = true;
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
      // Imported photos are only labelled; the time-based recommendation is unchanged.
      for (const file of selection.candidates) file.importedAt = history.lookup(file)?.importedAt || null;
      const id = crypto.randomUUID();
      const scan = { ...selection, id, presetId, isMtp, deviceName, storageName, deviceQuery: preset.deviceQuery || "X-S10", expiresAt: Date.now() + 30 * 60000, previewDirs: [] };
      scans.set(id, scan);
      const selected = selection.candidates.filter((f) => f.selected);
      const sample = selected.length <= 6 ? selected : [...selected.slice(0, 3), ...selected.slice(-3)];
      return { success: true, scanId: id, expiresAt: scan.expiresAt, isMtp, activeFolder: subFolder === "all" ? "Semua folder kamera" : subFolder,
        availableFolders, totalInFolder: files.length, totalFound: selected.length, totalBytes: selected.reduce((n, f) => n + (f.size || 0), 0),
        earliestTime: selected.length ? timeLabel(selected[0].timeMs) : null, latestTime: selected.length ? timeLabel(selected.at(-1).timeMs) : null,
        candidates: selection.candidates.map((f) => publicFile(f, id)), toleranceCount: selection.candidates.filter((f) => f.group === "tolerance").length,
        unknownCount: selection.candidates.filter((f) => f.group === "unknown").length,
        fallbackCount: selection.candidates.filter((f) => f.timeSource === "modified").length,
        importedCount: selection.candidates.filter((f) => f.importedAt).length,
        deviceName: deviceName || null,
        gaps: selection.gaps, previews: sample.map((f) => publicFile(f, id)) };
    },
    async preview(scanId, fileId) {
      const scan = getScan(scanId);
      const file = scan.candidates.find((f) => f.id === fileId);
      if (!file) throw new Error("Foto bukan bagian hasil scan.");
      if (!scan.isMtp) return file.fullPath;
      fetchPreviews(scan, [file]);
      return previews.get(`${scanId}/${fileId}`);
    },
    async thumbnail(scanId, fileId) {
      const scan = getScan(scanId);
      const file = scan.candidates.find((f) => f.id === fileId);
      if (!file) throw new Error("Foto bukan bagian hasil scan.");
      if (!scan.isMtp) return file.fullPath;
      const key = `${scanId}/${fileId}`;
      if (!thumbs.has(key)) {
        const promise = new Promise((resolve, reject) => thumbQueue.push({ scan, file, resolve, reject }));
        thumbs.set(key, promise);
        promise.catch(() => thumbs.delete(key));
        if (thumbQueue.length >= 60) { clearTimeout(thumbTimer); flushThumbs(); }
        else if (!thumbTimer) thumbTimer = setTimeout(flushThumbs, thumbBatchDelay);
      }
      return thumbs.get(key);
    },
    async import({ scanId, ids, firstId, lastId, clearExistingPhotos = true }) {
      if (busy) throw new Error("Impor lain masih berlangsung.");
      const scan = getScan(scanId);
      const selection = ids === undefined ? selectConfirmedRange(scan, firstId, lastId) : selectPhotoIds(scan, ids);
      const signature = JSON.stringify([ids === undefined ? [firstId, lastId] : [...new Set(ids)].sort(), clearExistingPhotos]);
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
              if (!result.success || result.count !== files.length) throw new Error(cameraErrorMessage(result.error, "Jumlah foto yang tersalin belum lengkap."));
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
        try { saveConfig(config); writeJsonAtomic(path.join(workDir, "result.json"), result); history.record(files, { jobId }); }
        catch { result.warning = "Foto siap, tetapi riwayat impor belum tersimpan."; }
        return result;
      } catch (error) {
        progress = { ...progress, phase: "failed", error: error.message };
        throw new Error(`${error.message} Impor belum selesai; periksa lalu coba lagi. Foto sumber tidak dihapus.`);
      } finally { busy = false; }
    },
  };
}

// Staff may pick any photos (Ctrl/Shift selection). Every id must come from this scan.
export function selectPhotoIds(scan, ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 5000 || ids.some((id) => typeof id !== "string")) {
    throw new Error("Pilih minimal satu foto dari hasil scan.");
  }
  const wanted = new Set(ids);
  const selection = scan.candidates.filter((f) => wanted.has(f.id));
  if (selection.length !== wanted.size) throw new Error("Ada foto yang bukan bagian hasil scan. Scan ulang.");
  return selection;
}

// Windows reports a camera that refuses to hand out photo data as "Access is denied" (0x80070005)
// or a failed thumbnail extraction (0x8004B200). Staff need the action, not the HRESULT.
export function cameraErrorMessage(error, fallback) {
  if (!error) return fallback;
  if (/0x80070005|E_ACCESSDENIED|Access is denied|0x8004B200/i.test(error)) {
    return "Kamera menolak akses ke file foto. Cabut kabel USB, matikan lalu nyalakan kamera, colok lagi, lalu klik Scan Ulang. Jangan buka kamera di Windows Explorer saat impor.";
  }
  return error;
}
