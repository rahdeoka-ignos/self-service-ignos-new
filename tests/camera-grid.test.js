import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createCameraImporter } from '../backend/cameraImport.js';
import { createImportHistory, photoKey } from '../backend/importHistory.js';
import { createDeviceWatcher } from '../backend/deviceWatcher.js';
import { createMtpQueue } from '../backend/mtpQueue.js';
sharp.cache(false);

async function setup(t, runMtp) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ignos-grid-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dirs = Object.fromEntries(['photosDir', 'thumbsDir', 'storageDir', 'cacheDir', 'source'].map(n => [n, path.join(root, n)]));
  Object.values(dirs).forEach(dir => fs.mkdirSync(dir));
  const jpeg = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#777' } }).jpeg().toBuffer();
  let config = { presets: { custom: { path: dirs.source, defaultMinutes: 30 }, studio: {} } };
  const history = createImportHistory(path.join(root, 'import-history.json'));
  const importer = createCameraImporter({ ...dirs, runMtp, history, thumbBatchDelay: 5,
    resolveFolders: source => [{ folderName: 'DCIM', folderPath: source }], readConfig: () => config, saveConfig: next => { config = next; } });
  return { ...dirs, root, importer, jpeg, history };
}

test('staff can import any photos (non-contiguous) and imported photos are labelled on the next scan', async t => {
  const f = await setup(t);
  for (const [name, time] of [['a.jpg', '10:00:00'], ['b.jpg', '10:05:00'], ['c.jpg', '10:10:00'], ['d.jpg', '10:15:00']]) {
    await sharp(f.jpeg).withExif({ IFD2: { DateTimeOriginal: `2026:01:01 ${time}` } }).toFile(path.join(f.source, name));
  }
  const scan = await f.importer.scan({ presetId: 'custom', minutes: 30 });
  assert.equal(scan.importedCount, 0);
  const result = await f.importer.import({ scanId: scan.scanId, ids: ['DCIM/d.jpg', 'DCIM/a.jpg'] });
  assert.equal(result.count, 2);
  assert.deepEqual(fs.readdirSync(f.photosDir).map(n => n.split('-').slice(2).join('-')).sort(), ['a.jpg', 'd.jpg']);
  // Same selection again returns the stored result; a different one needs a new scan.
  assert.equal((await f.importer.import({ scanId: scan.scanId, ids: ['DCIM/a.jpg', 'DCIM/d.jpg'] })).count, 2);
  await assert.rejects(f.importer.import({ scanId: scan.scanId, ids: ['DCIM/b.jpg'] }), /sudah diimpor/);

  const again = await f.importer.scan({ presetId: 'custom', minutes: 30 });
  assert.equal(again.importedCount, 2);
  const labelled = Object.fromEntries(again.candidates.map(c => [c.name, Boolean(c.importedAt)]));
  assert.deepEqual(labelled, { 'a.jpg': true, 'b.jpg': false, 'c.jpg': false, 'd.jpg': true });
  // Labels never change the time-based recommendation.
  assert.deepEqual(again.candidates.filter(c => c.selected).map(c => c.name), ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']);
});

test('photo ids outside the scan, empty and malformed selections are rejected before copying', async t => {
  const f = await setup(t);
  await sharp(f.jpeg).toFile(path.join(f.source, 'a.jpg'));
  const scan = await f.importer.scan({ presetId: 'custom', minutes: 30 });
  for (const ids of [[], ['DCIM/zzz.jpg'], ['DCIM/a.jpg', 'DCIM/../x.jpg'], [42], 'DCIM/a.jpg']) {
    await assert.rejects(f.importer.import({ scanId: scan.scanId, ids }), /Pilih minimal|bukan bagian/);
  }
  assert.deepEqual(fs.readdirSync(f.photosDir), []);
});

test('USB grid thumbnails are read in one batch; a missing thumbnail is reported without copying the photo', async t => {
  let jpeg; const calls = [];
  const files = ['1', '2', '3'].map(n => ({ id: `100_FUJI/DSCF000${n}.JPG`, name: `DSCF000${n}.JPG`, folderName: '100_FUJI', capturedAt: `2026-01-01T10:0${n}:00` }));
  const f = await setup(t, async args => {
    const action = args[1];
    if (action === 'scan') return { success: true, deviceName: 'X-S10', storageName: 'card', files: files.map(x => ({ ...x, size: jpeg.length })) };
    const manifest = JSON.parse(fs.readFileSync(args[args.indexOf('-ManifestPath') + 1], 'utf8'));
    const dest = args[args.indexOf('-DestDir') + 1];
    calls.push([action, manifest.files.map(x => x.id)]);
    // The camera refuses photo 3.
    manifest.files.forEach(x => { if (!x.id.endsWith('3.JPG')) fs.writeFileSync(path.join(dest, x.destName), jpeg); });
    return { success: true, files: manifest.files.map(x => ({ id: x.id, ok: !x.id.endsWith('3.JPG'), error: x.id.endsWith('3.JPG') ? 'Exception from HRESULT: 0x80070005 (E_ACCESSDENIED)' : null })) };
  });
  jpeg = f.jpeg;
  const scan = await f.importer.scan({ presetId: 'studio' });
  const results = await Promise.allSettled(scan.candidates.map(c => f.importer.thumbnail(scan.scanId, c.id)));
  assert.deepEqual(results.map(r => r.status), ['fulfilled', 'fulfilled', 'rejected']);
  assert.match(results[2].reason.message, /Kamera menolak akses/);
  assert.deepEqual(calls, [['thumbs', files.map(x => x.id)]], 'no full-copy fallback');
  // Cached: asking again does not touch the device.
  await f.importer.thumbnail(scan.scanId, files[0].id);
  assert.equal(calls.length, 1);
});

test('import history keys match whether the card is read via USB or a card reader, and expire after retention', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ignos-history-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let clock = Date.parse('2026-01-01T00:00:00Z');
  const history = createImportHistory(path.join(root, 'h.json'), { now: () => clock });
  const usb = { folderName: '100_FUJI', name: 'DSCF0001.JPG', timeMs: 1000, size: 5 };
  const card = { ...usb, fullPath: 'E:\\DCIM\\100_FUJI\\DSCF0001.JPG', mtimeMs: 7 };
  history.record([usb], { jobId: 'job1' });
  assert.equal(photoKey(usb), photoKey(card));
  assert.equal(createImportHistory(path.join(root, 'h.json')).lookup(card).jobId, 'job1');
  // Same name after the camera numbering wraps is a different photo.
  assert.equal(history.lookup({ ...usb, timeMs: 2000 }), undefined);
  clock += 181 * 24 * 3600 * 1000;
  history.record([{ ...usb, name: 'NEW.JPG' }], { jobId: 'job2' });
  assert.equal(history.lookup(usb), undefined);
});

test('device watcher reports plug and unplug transitions, not devices already present at start', async () => {
  let mtp = { connected: false }; let cards = ['F:\\DCIM'];
  const events = [];
  const watcher = createDeviceWatcher({ checkMtp: async () => mtp, findCards: () => cards, setRepeat: () => 0 });
  watcher.subscribe(e => events.push(`${e.type}:${e.source}:${e.path || e.label || ''}`));
  await watcher.detect();
  assert.deepEqual(events, []);
  mtp = { connected: true, deviceName: 'X-S10' }; cards = ['F:\\DCIM', 'E:\\DCIM'];
  await watcher.detect();
  assert.deepEqual(events, ['connected:fotobox:E:\\DCIM', 'connected:studio:X-S10']);
  mtp = { connected: false }; cards = ['F:\\DCIM'];
  await watcher.detect();
  assert.deepEqual(events.slice(2), ['disconnected:fotobox:E:\\DCIM', 'disconnected:studio:']);
});

test('device watcher does not query the camera while an import is running', async () => {
  let checks = 0; let busy = false;
  const watcher = createDeviceWatcher({ checkMtp: async () => { checks++; return { connected: true }; }, findCards: () => [], isBusy: () => busy, setRepeat: () => 0 });
  await watcher.detect();
  busy = true;
  await watcher.detect();
  assert.equal(checks, 1);
  assert.notEqual(watcher.state.mtp, null, 'keeps last known state');
});

test('a newer scan cancels thumbnail work still waiting for the camera', async t => {
  let jpeg; const calls = []; let release;
  const gate = new Promise(r => { release = r; });
  const files = [{ id: '100_FUJI/A.JPG', name: 'A.JPG', folderName: '100_FUJI', capturedAt: '2026-01-01T10:00:00' }];
  const queue = createMtpQueue(async args => {
    calls.push(args[1]);
    if (args[1] === 'scan') return { success: true, deviceName: 'X-S10', storageName: 'card', files: files.map(x => ({ ...x, size: jpeg.length })) };
    if (args[1] === 'block') await gate;
    return { success: true, files: [] };
  });
  const f = await setup(t, (args, options) => queue.run(args, options));
  jpeg = f.jpeg;
  const first = await f.importer.scan({ presetId: 'studio' });
  // Something else (e.g. a large preview) is using the camera while the grid asks for thumbnails.
  const busy = queue.run(['', 'block'], { priority: 'low' });
  const thumb = f.importer.thumbnail(first.scanId, files[0].id);
  thumb.catch(() => {});
  await new Promise(r => setTimeout(r, 30)); // thumbs batch is now queued
  const second = f.importer.scan({ presetId: 'studio' });
  release();
  await Promise.all([second, busy]);
  await assert.rejects(thumb, /Dibatalkan/);
  assert.deepEqual(calls, ['scan', 'block', 'scan'], 'the old thumbnail batch never reached the camera');
});

test('camera queue runs scans and imports before queued background thumbnails', async () => {
  const order = []; let release;
  const gate = new Promise(r => { release = r; });
  const queue = createMtpQueue(async args => { order.push(args[0]); if (args[0] === 'first') await gate; return args[0]; });
  const first = queue.run(['first'], { priority: 'low' });
  const low1 = queue.run(['thumbs-1'], { priority: 'low' });
  const low2 = queue.run(['thumbs-2'], { priority: 'low', cancelled: () => true });
  const scan = queue.run(['scan']);
  release();
  await Promise.all([first, low1, scan]);
  await assert.rejects(low2, /Dibatalkan/);
  assert.deepEqual(order, ['first', 'scan', 'thumbs-1']);
});
