import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import {
  parseHubConfig, readHubConfig, tokenMatches, forwardPrintJob, fetchHubStatus, hubUnreachableStatus, HUB_TOKEN_HEADER,
} from '../backend/printHub.js';

const TOKEN = 'studio-secret-token-123';

test('hub config: roles, validation, and missing file means local printing', () => {
  assert.deepEqual(readHubConfig(path.join(os.tmpdir(), 'nope-print-hub.json')), { role: 'off' });
  assert.deepEqual(parseHubConfig({ role: 'hub', token: TOKEN }), { role: 'hub', token: TOKEN });
  assert.deepEqual(
    parseHubConfig({ role: 'kiosk', token: TOKEN, url: 'http://192.168.1.20:5000/', name: 'Booth 1<script>' }),
    { role: 'kiosk', token: TOKEN, url: 'http://192.168.1.20:5000', name: 'Booth 1script' },
  );
  assert.throws(() => parseHubConfig({ role: 'hub', token: 'short' }), /16 karakter/);
  assert.throws(() => parseHubConfig({ role: 'kiosk', token: TOKEN, url: 'macbook' }), /url/);
  assert.throws(() => parseHubConfig({ role: 'kiosk', token: TOKEN, url: 'file:///etc/passwd' }), /http/);
  assert.throws(() => parseHubConfig({ role: 'server', token: TOKEN }), /role/);
  assert.equal(tokenMatches(TOKEN, TOKEN), true);
  assert.equal(tokenMatches('wrong', TOKEN), false);
  assert.equal(tokenMatches(undefined, TOKEN), false);
  assert.equal(tokenMatches('', ''), false);
});

test('kiosk forwards the print file to a real hub over HTTP multipart', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-'));
  const received = [];
  const app = express();
  app.post('/api/print-hub/jobs', (req, res, next) => {
    if (!tokenMatches(req.headers[HUB_TOKEN_HEADER], TOKEN)) return res.status(401).json({ success: false, error: 'Token pusat print salah.' });
    next();
  }, multer({ dest: dir }).single('file'), (req, res) => {
    received.push({ query: { ...req.query }, name: req.file.originalname, bytes: fs.readFileSync(req.file.path).toString() });
    if (req.query.printProfile === 'jam') return res.status(502).json({ success: false, printStatus: 'failed', error: 'Kertas macet' });
    res.json({ success: true, printStatus: 'submitted' });
  });
  app.get('/api/print-hub/status', (req, res) => res.json({ success: true, hasError: false, alert: null, printers: [{ name: 'EPSON_L8050_Series' }] }));
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

  const hub = parseHubConfig({ role: 'kiosk', token: TOKEN, url: `http://127.0.0.1:${server.address().port}`, name: 'Booth 2' });
  const file = path.join(dir, 'print-4r.png');
  fs.writeFileSync(file, 'PNGDATA');

  assert.equal(await forwardPrintJob({ hub, filePath: file, productType: '4r', copies: 2 }), 'submitted');
  assert.deepEqual(received[0], { query: { printProfile: '4r', kiosk: 'Booth 2', copies: '2' }, name: 'print-4r.png', bytes: 'PNGDATA' });

  // hub-side failure message reaches the kiosk unchanged
  await assert.rejects(forwardPrintJob({ hub, filePath: file, productType: 'jam' }), /Kertas macet/);
  // wrong token is rejected
  await assert.rejects(forwardPrintJob({ hub: { ...hub, token: 'x'.repeat(20) }, filePath: file, productType: '4r' }), /Token/);

  const status = await fetchHubStatus({ hub });
  assert.equal(status.printers[0].name, 'EPSON_L8050_Series');
});

test('unreachable hub gives a clear error and a kiosk alert', async () => {
  const hub = parseHubConfig({ role: 'kiosk', token: TOKEN, url: 'http://127.0.0.1:9', name: 'Booth 3' });
  const file = path.join(os.tmpdir(), `hub-unreach-${process.pid}.png`);
  fs.writeFileSync(file, 'x');
  try {
    await assert.rejects(forwardPrintJob({ hub, filePath: file, productType: '4r', timeoutMs: 2000 }), /tidak bisa dihubungi/);
  } finally {
    fs.rmSync(file, { force: true });
  }
  const status = hubUnreachableStatus(hub, 'ECONNREFUSED');
  assert.equal(status.hasError, true);
  assert.equal(status.alert.type, 'offline');
  assert.match(status.alert.adminMessage, /Booth 3/);
});
