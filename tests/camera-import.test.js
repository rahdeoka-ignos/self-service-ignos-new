import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { selectPhotoWindow, selectConfirmedRange, exifDateTime } from '../backend/photoSelection.js';
import { publishGallery, verifyPhoto } from '../backend/photoTransfer.js';
import { createCameraImporter } from '../backend/cameraImport.js';
sharp.cache(false);
const minute = 60000;

test('selection sorts capture times, excludes tolerance and keeps pauses within session', () => {
  const result = selectPhotoWindow([60, 21, 0, 30, 45].map(n => ({ id: String(n), timeMs: n * minute })), { minutes: 30 });
  assert.deepEqual(result.candidates.filter(f => f.selected).map(f => f.id), ['30', '45', '60']);
  assert.equal(result.candidates.find(f => f.id === '21').group, 'tolerance');
  assert.ok(result.gaps.length);
  assert.deepEqual(selectConfirmedRange(result, '21', '45').map(f => f.id), ['21', '30', '45']);
  assert.throws(() => selectConfirmedRange(result, '45', '21'));
  assert.throws(() => selectPhotoWindow([], { minutes: 0 }));
});

test('unknown time requires manual selection, malformed EXIF safely falls back', () => {
  const result = selectPhotoWindow([{ id: 'unknown', timeMs: null }]);
  assert.equal(result.candidates[0].selected, false);
  assert.equal(result.candidates[0].group, 'unknown');
  assert.equal(selectConfirmedRange(result, 'unknown', 'unknown').length, 1);
  assert.equal(exifDateTime(Buffer.from('broken')), null);
});

async function fixture(t, runMtp) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ignos-import-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dirs = Object.fromEntries(['photosDir', 'thumbsDir', 'storageDir', 'cacheDir', 'source'].map(n => [n, path.join(root, n)]));
  Object.values(dirs).forEach(dir => fs.mkdirSync(dir));
  const jpeg = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#777' } }).jpeg().toBuffer();
  fs.writeFileSync(path.join(dirs.photosDir, 'old.jpg'), jpeg);
  fs.writeFileSync(path.join(dirs.thumbsDir, 'old.jpg'), jpeg);
  let config = { presets: { custom: { path: dirs.source, defaultMinutes: 30 }, studio: {} } };
  const importer = createCameraImporter({ ...dirs, runMtp, resolveFolders: source => [{ folderName: 'DCIM', folderPath: source }], readConfig: () => config, saveConfig: next => { config = next; } });
  return { ...dirs, importer, jpeg };
}

test('card scan prefers EXIF to modification time; verified import preserves backup and retry is idempotent', async t => {
  const f = await fixture(t);
  await sharp(f.jpeg).withExif({ IFD2: { DateTimeOriginal: '2026:01:01 10:00:00' } }).toFile(path.join(f.source, 'a.jpg'));
  await sharp(f.jpeg).withExif({ IFD2: { DateTimeOriginal: '2026:01:01 11:00:00' } }).toFile(path.join(f.source, 'b.jpg'));
  const scan = await f.importer.scan({ presetId: 'custom', minutes: 30 });
  assert.equal(scan.totalFound, 1);
  assert.equal(scan.candidates[0].timeSource, 'taken');
  assert.equal(scan.candidates.find(x => x.selected).name, 'b.jpg');
  const args = { scanId: scan.scanId, firstId: scan.candidates[1].id, lastId: scan.candidates[1].id };
  const result = await f.importer.import(args);
  assert.equal(result.count, 1);
  assert.ok(fs.existsSync(path.join(result.backupDir, 'photos', 'old.jpg')));
  assert.equal(fs.readdirSync(f.photosDir).length, 1);
  assert.deepEqual(await f.importer.import(args), result);
  assert.equal(f.importer.progress.phase, 'complete');
});

test('changed or disconnected source fails without replacing existing gallery', async t => {
  const f = await fixture(t);
  const sourceFile = path.join(f.source, 'a.jpg');
  fs.writeFileSync(sourceFile, f.jpeg);
  const scan = await f.importer.scan({ presetId: 'custom' });
  fs.appendFileSync(sourceFile, 'changed');
  const args = { scanId: scan.scanId, firstId: scan.candidates[0].id, lastId: scan.candidates[0].id };
  await assert.rejects(f.importer.import(args), /berubah/);
  assert.deepEqual(fs.readdirSync(f.photosDir), ['old.jpg']);
  fs.unlinkSync(sourceFile);
  await assert.rejects(f.importer.import(args));
  assert.equal(f.importer.busy, false);
  assert.deepEqual(fs.readdirSync(f.photosDir), ['old.jpg']);
});

test('truncated and wrong-sized image transfers fail verification and leave old gallery intact', async t => {
  const f = await fixture(t);
  const filename = path.join(f.source, 'broken.jpg');
  fs.writeFileSync(filename, f.jpeg.subarray(0, f.jpeg.length - 20));
  await assert.rejects(verifyPhoto(filename, f.jpeg.length));
  await assert.rejects(verifyPhoto(filename, null));
  const scan = await f.importer.scan({ presetId: 'custom' });
  await assert.rejects(f.importer.import({ scanId: scan.scanId, firstId: scan.candidates[0].id, lastId: scan.candidates[0].id }));
  assert.deepEqual(fs.readdirSync(f.photosDir), ['old.jpg']);
});

test('publication failure rolls back both old gallery directories', async t => {
  const f = await fixture(t);
  const stagePhotos = path.join(f.storageDir, 'photos'), stageThumbs = path.join(f.storageDir, 'thumbs');
  fs.mkdirSync(stagePhotos); fs.mkdirSync(stageThumbs);
  fs.writeFileSync(path.join(stagePhotos, 'new.jpg'), f.jpeg);
  fs.writeFileSync(path.join(stageThumbs, 'new.jpg'), f.jpeg);
  const io = { ...fs, renameSync: (from, to) => { if (path.dirname(from) === stageThumbs) throw new Error('simulated locked file'); fs.renameSync(from, to); } };
  assert.throws(() => publishGallery({ ...f, stagePhotos, stageThumbs, backupDir: path.join(f.storageDir, 'backup'), io }), /dipulihkan/);
  assert.deepEqual(fs.readdirSync(f.photosDir), ['old.jpg']);
  assert.deepEqual(fs.readdirSync(f.thumbsDir), ['old.jpg']);
});

test('a photo briefly locked (antivirus scan) is retried instead of failing the import', async t => {
  const f = await fixture(t);
  const stagePhotos = path.join(f.storageDir, 'photos'), stageThumbs = path.join(f.storageDir, 'thumbs');
  fs.mkdirSync(stagePhotos); fs.mkdirSync(stageThumbs);
  fs.writeFileSync(path.join(stagePhotos, 'new.jpg'), f.jpeg);
  fs.writeFileSync(path.join(stageThumbs, 'new.jpg'), f.jpeg);
  let locks = 3;
  const io = { ...fs, renameSync: (from, to) => {
    if (from === path.join(stagePhotos, 'new.jpg') && locks-- > 0) throw Object.assign(new Error('EPERM: operation not permitted, rename'), { code: 'EPERM' });
    fs.renameSync(from, to);
  } };
  publishGallery({ ...f, stagePhotos, stageThumbs, backupDir: path.join(f.storageDir, 'backup'), io, retryDelayMs: 1 });
  assert.deepEqual(fs.readdirSync(f.photosDir), ['new.jpg']);
});

test('gallery is replaced even when the gallery folder itself cannot be renamed (open in Explorer)', async t => {
  const f = await fixture(t);
  const stagePhotos = path.join(f.storageDir, 'photos'), stageThumbs = path.join(f.storageDir, 'thumbs');
  fs.mkdirSync(stagePhotos); fs.mkdirSync(stageThumbs);
  fs.writeFileSync(path.join(stagePhotos, 'new.jpg'), f.jpeg);
  fs.writeFileSync(path.join(stageThumbs, 'new.jpg'), f.jpeg);
  const locked = new Set([f.photosDir, f.thumbsDir]);
  const io = { ...fs, renameSync: (from, to) => { if (locked.has(from) || locked.has(to)) throw new Error('EPERM: operation not permitted, rename'); fs.renameSync(from, to); } };
  const backupDir = path.join(f.storageDir, 'backup');
  publishGallery({ ...f, stagePhotos, stageThumbs, backupDir, io });
  assert.deepEqual(fs.readdirSync(f.photosDir), ['new.jpg']);
  assert.deepEqual(fs.readdirSync(f.thumbsDir), ['new.jpg']);
  assert.deepEqual(fs.readdirSync(path.join(backupDir, 'photos')), ['old.jpg']);
  assert.deepEqual(fs.readdirSync(path.join(backupDir, 'thumbs')), ['old.jpg']);
});

test('USB imports exact confirmed identities including duplicate filenames in separate folders', async t => {
  let jpeg, received;
  const f = await fixture(t, async args => {
    if (args[1] === 'scan') return { success: true, deviceName: 'test', storageName: 'card', files: [
      { id: 'B/same.jpg', name: 'same.jpg', capturedAt: '2026-01-01T11:00:00', size: jpeg.length },
      { id: 'A/same.jpg', name: 'same.jpg', capturedAt: '2026-01-01T10:55:00', size: jpeg.length },
    ] };
    received = JSON.parse(fs.readFileSync(args[args.indexOf('-ManifestPath') + 1], 'utf8'));
    const dest = args[args.indexOf('-DestDir') + 1];
    received.files.forEach(file => fs.writeFileSync(path.join(dest, file.destName), jpeg));
    return { success: true, count: received.files.length };
  });
  jpeg = f.jpeg;
  const scan = await f.importer.scan({ presetId: 'studio' });
  assert.deepEqual(scan.candidates.map(x => x.id), ['A/same.jpg', 'B/same.jpg']);
  await f.importer.import({ scanId: scan.scanId, firstId: 'A/same.jpg', lastId: 'B/same.jpg' });
  assert.deepEqual(received.files.map(x => x.id), ['A/same.jpg', 'B/same.jpg']);
  assert.equal(new Set(fs.readdirSync(f.photosDir)).size, 2);
});

test('USB scan does not copy photos by itself; a large preview is copied once and reused', async t => {
  let jpeg; const imports = [];
  const files = Array.from({ length: 8 }, (_, i) => ({ id: `100_FUJI/DSCF000${i}.JPG`, name: `DSCF000${i}.JPG`, folderName: '100_FUJI',
    capturedAt: `2026-01-01T10:0${i}:00`, size: 0 }));
  const f = await fixture(t, async args => {
    if (args[1] === 'scan') return { success: true, deviceName: 'test', storageName: 'card', files: files.map(x => ({ ...x, size: jpeg.length })) };
    const manifest = JSON.parse(fs.readFileSync(args[args.indexOf('-ManifestPath') + 1], 'utf8'));
    imports.push(manifest.files.map(x => x.id));
    const dest = args[args.indexOf('-DestDir') + 1];
    manifest.files.forEach(file => fs.writeFileSync(path.join(dest, file.destName), jpeg));
    return { success: true, count: manifest.files.length };
  });
  jpeg = f.jpeg;
  const scan = await f.importer.scan({ presetId: 'studio' });
  await new Promise(r => setTimeout(r, 20));
  assert.equal(imports.length, 0, 'the grid uses camera thumbnails; nothing is copied until asked');
  const other = scan.candidates[2];
  const [a, b] = await Promise.all([f.importer.preview(scan.scanId, other.id), f.importer.preview(scan.scanId, other.id)]);
  assert.equal(a, b);
  await f.importer.preview(scan.scanId, other.id);
  assert.deepEqual(imports, [[other.id]]);
});
