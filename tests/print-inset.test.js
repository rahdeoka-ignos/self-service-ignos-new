import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { insetBox, hasInset, applyPrintInset } from '../backend/printInset.js';

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

test('padded print keeps canvas size and puts white only where the printer cuts', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'inset-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const src = path.join(dir, 'design.png');
  await sharp({ create: { width: 2400, height: 3600, channels: 3, background: '#000000' } }).png().toFile(src);

  const out = await applyPrintInset(src, { top: 4, bottom: 6, left: 2, right: 2 });
  const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 2400);
  assert.equal(info.height, 3600);
  const px = (x, y) => data[(y * info.width + x) * info.channels];
  const box = insetBox(2400, 3600, { top: 4, bottom: 6, left: 2, right: 2 });
  assert.equal(px(1200, box.top - 2), 255); // white band at the top
  assert.equal(px(1200, box.top + 2), 0); // design starts right after it
  assert.equal(px(1200, 3600 - box.bottom + 2), 255);
  assert.equal(px(1200, 3600 - box.bottom - 2), 0);
  assert.equal(px(box.left - 2, 1800), 255);
  assert.equal(px(box.left + 2, 1800), 0);
});
