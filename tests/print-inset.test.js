import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { insetBox, hasInset, applyPrintInset, normalizePrintInset } from '../backend/printInset.js';
import { renameWithRetry } from '../backend/safety.js';

test('atomic JSON save retries a rename that Windows briefly refuses', () => {
  const busy = (code, failures) => {
    let calls = 0;
    return { rename: () => { calls++; if (calls <= failures) throw Object.assign(new Error(code), { code }); }, calls: () => calls };
  };
  const eperm = busy('EPERM', 2);
  renameWithRetry('a', 'b', { rename: eperm.rename });
  assert.equal(eperm.calls(), 3); // succeeded on the third try
  const stuck = busy('EBUSY', 99);
  assert.throws(() => renameWithRetry('a', 'b', { rename: stuck.rename, attempts: 3 }), /EBUSY/);
  assert.equal(stuck.calls(), 3);
  const missing = busy('ENOENT', 1);
  assert.throws(() => renameWithRetry('a', 'b', { rename: missing.rename }), /ENOENT/); // not retried
  assert.equal(missing.calls(), 1);
});

test('admin form values are normalised and validated', () => {
  assert.deepEqual(normalizePrintInset({ top: '5.5', bottom: 5.5, left: 3, right: 2.555 }), { top: 5.5, bottom: 5.5, left: 3, right: 2.56 });
  assert.deepEqual(normalizePrintInset({ top: '', bottom: 4 }), { top: 0, right: 0, bottom: 4, left: 0 });
  assert.equal(normalizePrintInset({ top: 0, bottom: 0, left: 0, right: 0 }), null); // switch off
  assert.equal(normalizePrintInset(undefined), null);
  assert.throws(() => normalizePrintInset({ top: 'abc' }), /top/);
  assert.throws(() => normalizePrintInset({ left: 16 }), /left/);
  assert.throws(() => normalizePrintInset({ right: -1 }), /right/);
  assert.throws(() => normalizePrintInset('5'), /objek/);
});

test('inset box converts mm to pixels on a 600 dpi 4R canvas', () => {
  const box = insetBox(2400, 3600, { top: 3, bottom: 5, left: 2, right: 2.5 });
  const pxPerMm = 2400 / 101.6;
  assert.equal(box.top, Math.round(3 * pxPerMm));
  assert.equal(box.bottom, Math.round(5 * pxPerMm));
  assert.equal(box.innerWidth, 2400 - box.left - box.right);
  assert.equal(box.innerHeight, 3600 - box.top - box.bottom);
  assert.throws(() => insetBox(2400, 3600, { top: -1 }));
  assert.throws(() => insetBox(2400, 3600, { top: 'abc' }));
  assert.throws(() => insetBox(2400, 3600, { left: 20 }));
  assert.equal(hasInset(undefined), false);
  assert.equal(hasInset({ top: 0 }), false);
  assert.equal(hasInset({ bottom: 1.5 }), true);
});

test('a thin light line at the very edge of a template is not stretched into a white strip', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inset-edge-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  // Dark grey frame whose top 2 px are a near-white anti-aliasing line (like grid-delapan's export).
  const W = 600, H = 900;
  const src = path.join(dir, 'frame.png');
  const line = await sharp({ create: { width: W, height: 2, channels: 3, background: { r: 232, g: 232, b: 232 } } }).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 95, g: 95, b: 95 } } })
    .composite([{ input: line, left: 0, top: 0 }]).png().toFile(src);

  const inset = { top: 5.5, bottom: 5.5, left: 3.5, right: 3.5 };
  const out = await applyPrintInset(src, inset);
  const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  const grey = (x, y) => data[(y * info.width + x) * info.channels];
  const box = insetBox(W, H, inset);
  for (const y of [0, Math.floor(box.top / 2), box.top - 1, box.top, box.top + 1]) {
    assert.ok(grey(W / 2, y) < 120, `row ${y} should be the dark frame, got ${grey(W / 2, y)}`);
  }
  assert.equal(grey(W / 2, H / 2), 95); // inside the design nothing changes
});

test('padded print keeps canvas size, shrinks design into the inset box, and fills the margin with the edge colour', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inset-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  // Full-bleed design like the "Special Day" frame: maroon left half, blue right half, no white anywhere.
  const src = path.join(dir, 'design.png');
  // 4R at 150 dpi keeps the test light; the mm → px maths is the same at any size.
  const W = 600, H = 900;
  const half = await sharp({ create: { width: W / 2, height: H, channels: 3, background: { r: 120, g: 20, b: 30 } } }).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: { r: 20, g: 40, b: 200 } } })
    .composite([{ input: half, left: 0, top: 0 }]).png().toFile(src);

  const inset = { top: 4, bottom: 6, left: 2, right: 3 };
  const out = await applyPrintInset(src, inset);
  const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, W);
  assert.equal(info.height, H);
  const px = (x, y) => Array.from(data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3));
  const MAROON = [120, 20, 30];
  const BLUE = [20, 40, 200];
  const box = insetBox(W, H, inset);

  // margins are the design's edge colour, never white
  assert.deepEqual(px(0, H / 2), MAROON);
  assert.deepEqual(px(W - 1, H / 2), BLUE);
  assert.deepEqual(px(W / 8, 0), MAROON);
  assert.deepEqual(px(W - W / 8, H - 1), BLUE);
  // the design was shrunk into the box: the maroon/blue split sits at the box centre, not the canvas centre
  const split = box.left + box.innerWidth / 2;
  assert.deepEqual(px(Math.floor(split) - 3, H / 2), MAROON);
  assert.deepEqual(px(Math.ceil(split) + 3, H / 2), BLUE);
  assert.notEqual(Math.round(split), W / 2);
});
