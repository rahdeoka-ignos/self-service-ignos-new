import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {
  normalizeBranch, normalizeBranchInput, seedBranches, readBranches, writeBranches, createBranch, updateBranch, deleteBranch,
  readActiveBranchId, writeActiveBranch, resolveActiveBranch, applyBranchToBranding,
} from '../backend/branch.js';
import { createQueueUploader } from '../backend/uploadQueue.js';

const BRANDING = {
  studioName: 'IGNOS STUDIO', address: 'Jl. Raya Abiansemal No. 12, Badung, Bali', phone: '081234567890', instagram: '@ignos.studio',
  receipt: { addressLine1: 'Jl. Raya Abiansemal No. 12', addressLine2: 'Badung, Bali', phoneContact: 'WA: 0812-3456-7890', socialNote: 'Tag IG kami: @ignos.studio', footerNote: 'Terima kasih' },
  whatsapp: { instagramTag: '@ignos.studio', introText: 'Berikut link softcopy' },
};
const tmp = (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'branch-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};

test('branch names are trimmed, validated, and match the suggested spelling', () => {
  assert.equal(normalizeBranch('  tabanan '), 'Tabanan');
  assert.equal(normalizeBranch('ABIANSEMAL'), 'Abiansemal');
  assert.equal(normalizeBranch('Denpasar   Barat'), 'Denpasar Barat');
  assert.equal(normalizeBranch(''), null);
  assert.equal(normalizeBranch(undefined), null);
  assert.throws(() => normalizeBranch('Tabanan/../x'), /hanya boleh/);
  assert.throws(() => normalizeBranch('<script>'), /hanya boleh/);
  assert.throws(() => normalizeBranch('a'.repeat(41)), /40 karakter/);
});

test('branch form fields are validated and Instagram gets its @', () => {
  assert.deepEqual(
    normalizeBranchInput({ name: ' tabanan ', addressLine1: ' Jl. Raya  Tabanan 5 ', addressLine2: '', phone: '0812-3456 789', instagram: 'ignos.tabanan' }),
    { name: 'Tabanan', addressLine1: 'Jl. Raya Tabanan 5', addressLine2: '', phone: '0812-3456 789', instagram: '@ignos.tabanan' },
  );
  assert.throws(() => normalizeBranchInput({ name: '' }), /wajib/);
  assert.throws(() => normalizeBranchInput({ name: 'X', phone: '0812abc' }), /WA/);
  assert.throws(() => normalizeBranchInput({ name: 'X', instagram: '@bad name!' }), /Instagram/);
  assert.throws(() => normalizeBranchInput({ name: 'X', addressLine1: 'a'.repeat(81) }), /80/);
});

test('first run seeds Abiansemal from the current branding and an empty Tabanan', (t) => {
  const file = path.join(tmp(t), 'branches.json');
  const { branches } = readBranches(file, BRANDING);
  assert.deepEqual(branches.map((b) => b.id), ['abiansemal', 'tabanan']);
  assert.equal(branches[0].addressLine1, 'Jl. Raya Abiansemal No. 12');
  assert.equal(branches[0].phone, '081234567890');
  assert.equal(branches[1].addressLine1, '');
  assert.equal(fs.existsSync(file), false); // nothing written until the admin saves
});

test('create, rename and delete branches with guards', () => {
  let data = seedBranches(BRANDING);
  const created = createBranch(data, { name: 'Denpasar', phone: '0811' });
  data = created.data;
  assert.equal(created.branch.id, 'denpasar');
  assert.throws(() => createBranch(data, { name: 'denpasar' }), /sudah ada/);
  const renamed = updateBranch(data, 'denpasar', { name: 'Denpasar Barat', phone: '0811' });
  assert.equal(renamed.branch.id, 'denpasar'); // id stays, so this computer keeps pointing at it
  assert.equal(renamed.branch.name, 'Denpasar Barat');
  assert.throws(() => updateBranch(renamed.data, 'denpasar', { name: 'Tabanan' }), /sudah ada/);
  assert.throws(() => updateBranch(data, 'nope', { name: 'X' }), /tidak ditemukan/);
  assert.throws(() => deleteBranch(renamed.data, 'tabanan', 'tabanan'), /sedang dipakai/);
  assert.deepEqual(deleteBranch(renamed.data, 'tabanan', 'abiansemal').branches.map((b) => b.id), ['abiansemal', 'denpasar']);
  // a second "Denpasar" after a rename gets a unique id
  assert.equal(createBranch(renamed.data, { name: 'Denpasar' }).branch.id, 'denpasar-2');
});

test('this computer remembers its branch by id, and reads the older name-only file', (t) => {
  const dir = tmp(t);
  const active = path.join(dir, 'branch.json');
  const branchesFile = path.join(dir, 'branches.json');
  const { branches } = seedBranches(BRANDING);
  assert.equal(readActiveBranchId(active, branches), null);
  fs.writeFileSync(active, JSON.stringify({ branch: 'tabanan' })); // format saved by the previous version
  assert.equal(readActiveBranchId(active, branches), 'tabanan');
  assert.equal(writeActiveBranch(active, 'abiansemal', branches), 'abiansemal');
  assert.equal(readActiveBranchId(active, branches), 'abiansemal');
  assert.throws(() => writeActiveBranch(active, 'ghost', branches), /tidak ditemukan/);
  fs.writeFileSync(active, '{ broken');
  assert.equal(readActiveBranchId(active, branches), null);

  writeActiveBranch(active, 'tabanan', branches);
  writeBranches(branchesFile, updateBranch(seedBranches(BRANDING), 'tabanan', { name: 'Tabanan', phone: '0899' }).data);
  assert.equal(resolveActiveBranch(active, branchesFile, BRANDING).phone, '0899');
});

test('active branch overrides address, phone and Instagram; empty fields keep the studio values', () => {
  const tabanan = { id: 'tabanan', name: 'Tabanan', addressLine1: 'Jl. Raya Tabanan 5', addressLine2: 'Tabanan, Bali', phone: '0899', instagram: '@ignos.tabanan' };
  const out = applyBranchToBranding(BRANDING, tabanan);
  assert.equal(out.address, 'Jl. Raya Tabanan 5, Tabanan, Bali');
  assert.equal(out.receipt.addressLine1, 'Jl. Raya Tabanan 5');
  assert.equal(out.receipt.phoneContact, 'WA: 0899');
  assert.equal(out.receipt.socialNote, 'Tag IG kami: @ignos.tabanan');
  assert.equal(out.whatsapp.instagramTag, '@ignos.tabanan');
  assert.equal(out.whatsapp.introText, 'Berikut link softcopy'); // message text stays studio-wide
  assert.deepEqual(out.branch, { id: 'tabanan', name: 'Tabanan' });
  assert.equal(BRANDING.receipt.addressLine1, 'Jl. Raya Abiansemal No. 12'); // global object untouched

  const partial = applyBranchToBranding(BRANDING, { id: 't', name: 'T', addressLine1: '', addressLine2: '', phone: '', instagram: '' });
  assert.equal(partial.address, BRANDING.address);
  assert.equal(partial.receipt.phoneContact, BRANDING.receipt.phoneContact);
  assert.equal(partial.instagram, BRANDING.instagram);
  assert.equal(applyBranchToBranding(BRANDING, null).branch, null);
});

// Runs the real createCustomerFolder from gdrive.js against an in-memory fake Drive.
function loadCreateCustomerFolder() {
  const source = fs.readFileSync(new URL('../gdrive.js', import.meta.url), 'utf8');
  const folders = [{ id: 'old-abiansemal', name: 'abiansemal', parent: 'ROOT' }];
  let seq = 0;
  const drive = {
    files: {
      list: async ({ q }) => {
        const parent = /'([^']+)' in parents/.exec(q)[1];
        return { data: { files: folders.filter((f) => f.parent === parent) } };
      },
      create: async ({ resource }) => {
        const folder = { id: `f${++seq}`, name: resource.name, parent: resource.parents[0] };
        folders.push(folder);
        return { data: { id: folder.id, name: folder.name } };
      },
      get: async ({ fileId }) => ({ data: { id: fileId, webViewLink: `https://drive/${fileId}` } }),
    },
    permissions: { create: async () => ({}) },
  };
  const ctx = {
    getDriveClient: () => drive, PARENT_FOLDER_ID: 'ROOT', fs: { existsSync: () => false }, path, __dirname: '/app',
    uploadFileToDrive: async () => {}, console,
    MONTH_NAMES: ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'],
    MONTH_SHORTS: ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'],
  };
  const start = source.indexOf('export async function getOrCreateSubfolder');
  const end = source.indexOf('export async function uploadFileToDrive');
  vm.runInNewContext(`${source.slice(start, end).replaceAll('export ', '')}\nthis.createCustomerFolder = createCustomerFolder;`, ctx);
  const chain = (id) => {
    const names = [];
    for (let f = folders.find((x) => x.id === id); f; f = folders.find((x) => x.id === f.parent)) names.unshift(f.name);
    return names;
  };
  return { createCustomerFolder: ctx.createCustomerFolder, folders, chain };
}

test('Drive session folder goes under the branch folder; existing branch folder is reused', async () => {
  const { createCustomerFolder, folders, chain } = loadCreateCustomerFolder();
  const now = new Date();
  const month = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'][now.getMonth()];

  const tabanan = await createCustomerFolder('budi', { branch: 'Tabanan' });
  const [branchName, monthName, dateName, sessionName] = chain(tabanan.folderId);
  assert.equal(branchName, 'Tabanan');
  assert.equal(monthName, month);
  assert.match(dateName, /^\d{1,2} - [A-Z]{3}$/);
  assert.match(sessionName, /^IGNOS STUDIO - \d{2}\.\d{2} \(budi\)$/);
  assert.equal(folders.find((f) => f.name === 'Tabanan').parent, 'ROOT');

  // "abiansemal" already exists in Drive (different case): reused, not duplicated
  const abiansemal = await createCustomerFolder('', { branch: 'Abiansemal' });
  assert.equal(chain(abiansemal.folderId)[0], 'abiansemal');
  assert.equal(folders.filter((f) => f.name.toLowerCase() === 'abiansemal').length, 1);

  // no branch set: old layout, month directly under the root
  const legacy = await createCustomerFolder('rina');
  assert.equal(chain(legacy.folderId)[0], month);
  assert.equal(folders.find((f) => f.id === legacy.folderId).name.endsWith('(rina)'), true);
});

test('queued retry creates the Drive folder for the branch recorded on the session', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'branch-queue-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const queueDir = path.join(root, 'queue');
  const archiveDir = path.join(root, 'archive');
  fs.mkdirSync(path.join(queueDir, 'KIOSK-1'), { recursive: true });
  fs.mkdirSync(archiveDir);
  fs.writeFileSync(path.join(queueDir, 'KIOSK-1', 'a.jpg'), 'x');
  fs.writeFileSync(path.join(queueDir, 'KIOSK-1', 'session_info.json'), JSON.stringify({
    id: 'KIOSK-1', customerName: 'budi', branch: 'Tabanan', date: '2026-11-28', files: ['a.jpg'], status: 'queued',
  }));
  const calls = [];
  const upload = createQueueUploader({
    queueDir, archiveDir, updateSession() {},
    createFolder: async (...args) => { calls.push(args); return { folderId: 'd', folderName: 'IGNOS STUDIO', webViewLink: 'l' }; },
    uploadFiles: async (files, _id, progress) => { for (const f of files) await progress(0, 0, path.basename(f), 'done'); },
  });
  await upload('KIOSK-1');
  assert.deepEqual(calls, [['budi', { branch: 'Tabanan' }]]);
});
