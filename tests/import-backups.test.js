import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listImportBackups, cleanImportBackups } from '../backend/importBackups.js';

function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ignos-backups-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const day = 86400000, now = Date.now();
  // job-0 newest ... job-4 oldest; job-3 failed (no result.json)
  for (let i = 0; i < 5; i++) {
    const job = path.join(dir, `job-${i}`);
    fs.mkdirSync(path.join(job, 'previous-gallery', 'photos'), { recursive: true });
    fs.writeFileSync(path.join(job, 'previous-gallery', 'photos', 'a.jpg'), Buffer.alloc(1000 * (i + 1)));
    if (i !== 3) fs.writeFileSync(path.join(job, 'result.json'), '{}');
    const time = new Date(now - i * day);
    fs.utimesSync(job, time, time);
  }
  fs.mkdirSync(path.join(dir, 'incoming'));
  return { dir, now };
}

test('import backups are listed newest first with size and status, ignoring the upload temp folder', t => {
  const { dir, now } = setup(t);
  const list = listImportBackups(dir, { now });
  assert.deepEqual(list.map(b => b.id), ['job-0', 'job-1', 'job-2', 'job-3', 'job-4']);
  assert.equal(list[3].status, 'failed');
  assert.equal(list[4].bytes, 5000 + 2); // photo + result.json
});

test('cleaning keeps the newest backups and frees the rest', t => {
  const { dir, now } = setup(t);
  const result = cleanImportBackups(dir, { keepLatest: 3, now });
  assert.equal(result.deletedCount, 2);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['incoming', 'job-0', 'job-1', 'job-2']);
});

test('age limit only removes old backups beyond the kept ones', t => {
  const { dir, now } = setup(t);
  cleanImportBackups(dir, { keepLatest: 1, maxAgeDays: 3, now });
  assert.deepEqual(fs.readdirSync(dir).sort(), ['incoming', 'job-0', 'job-1', 'job-2']);
});

test('nothing is removed while an import is running', t => {
  const { dir, now } = setup(t);
  const result = cleanImportBackups(dir, { keepLatest: 0, isBusy: () => true, now });
  assert.equal(result.skipped, 'busy');
  assert.equal(fs.readdirSync(dir).length, 6);
});
