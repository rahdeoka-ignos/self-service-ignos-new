// Studio branches (cabang), e.g. Abiansemal (Windows PC) and Tabanan (the Macs).
//
// data/branches.json  — the shared list with per-branch address, phone, Instagram
//                       (studio-wide data, tracked in git like pricing.json)
// data/branch.json    — which branch THIS computer belongs to: { "branchId": "tabanan" }
//                       (per machine, git-ignored)
//
// The active branch names the Google Drive folder, is stamped on every session, and
// overrides the address/phone/Instagram of the global branding (applyBranchToBranding).
import fs from "fs";
import { writeJsonAtomic } from "./safety.js";

export const BRANCH_SUGGESTIONS = ["Abiansemal", "Tabanan"];

const clean = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

/** Trimmed branch name, or null when empty. Throws on names unsafe for a Drive folder. */
export function normalizeBranch(raw) {
  const name = clean(raw);
  if (!name) return null;
  if (name.length > 40) throw new Error("Nama cabang maksimal 40 karakter.");
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .'&-]*$/u.test(name)) {
    throw new Error("Nama cabang hanya boleh huruf, angka, spasi, titik, tanda hubung, &, atau apostrof.");
  }
  // Reuse the suggested spelling so "tabanan" and "Tabanan" land in one Drive folder.
  return BRANCH_SUGGESTIONS.find((b) => b.toLowerCase() === name.toLowerCase()) || name;
}

export const slugify = (name) =>
  name.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "cabang";

/** Validate the editable fields of a branch from the admin form. */
export function normalizeBranchInput(body = {}) {
  const name = normalizeBranch(body.name);
  if (!name) throw new Error("Nama cabang wajib diisi.");
  const addressLine1 = clean(body.addressLine1);
  const addressLine2 = clean(body.addressLine2);
  if (addressLine1.length > 80 || addressLine2.length > 80) throw new Error("Setiap baris alamat maksimal 80 karakter.");
  const phone = clean(body.phone);
  if (phone.length > 30 || !/^[0-9+()\-. ]*$/.test(phone)) throw new Error("Nomor WA/telepon hanya boleh angka, spasi, +, -, titik, atau tanda kurung.");
  let instagram = clean(body.instagram).replace(/\s/g, "");
  if (instagram && !instagram.startsWith("@")) instagram = `@${instagram}`;
  if (instagram && !/^@[A-Za-z0-9._]{1,30}$/.test(instagram)) throw new Error("Instagram tidak valid (contoh: @ignos.tabanan).");
  return { name, addressLine1, addressLine2, phone, instagram };
}

/** First-run list: Abiansemal takes the address already in branding, Tabanan starts empty. */
export function seedBranches(branding = {}) {
  const receipt = branding.receipt || {};
  return {
    version: 1,
    branches: [
      { id: "abiansemal", name: "Abiansemal", addressLine1: clean(receipt.addressLine1), addressLine2: clean(receipt.addressLine2), phone: clean(branding.phone), instagram: "" },
      { id: "tabanan", name: "Tabanan", addressLine1: "", addressLine2: "", phone: "", instagram: "" },
    ],
  };
}

export function readBranches(file, branding) {
  if (!fs.existsSync(file)) return seedBranches(branding);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return { version: 1, branches: Array.isArray(data.branches) ? data.branches : [] };
}

export function writeBranches(file, data) {
  writeJsonAtomic(file, { version: 1, branches: data.branches });
}

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

export function createBranch(data, body) {
  const input = normalizeBranchInput(body);
  if (data.branches.some((b) => sameName(b.name, input.name))) throw new Error(`Cabang "${input.name}" sudah ada.`);
  let id = slugify(input.name);
  for (let n = 2; data.branches.some((b) => b.id === id); n++) id = `${slugify(input.name)}-${n}`;
  const branch = { id, ...input };
  return { data: { ...data, branches: [...data.branches, branch] }, branch };
}

export function updateBranch(data, id, body) {
  const index = data.branches.findIndex((b) => b.id === id);
  if (index === -1) throw new Error("Cabang tidak ditemukan.");
  const input = normalizeBranchInput(body);
  if (data.branches.some((b) => b.id !== id && sameName(b.name, input.name))) throw new Error(`Cabang "${input.name}" sudah ada.`);
  const branch = { ...data.branches[index], ...input, id };
  const branches = [...data.branches];
  branches[index] = branch;
  return { data: { ...data, branches }, branch };
}

export function deleteBranch(data, id, activeBranchId) {
  if (!data.branches.some((b) => b.id === id)) throw new Error("Cabang tidak ditemukan.");
  if (id === activeBranchId) throw new Error("Cabang ini sedang dipakai komputer ini. Pilih cabang lain untuk komputer ini dulu.");
  return { ...data, branches: data.branches.filter((b) => b.id !== id) };
}

/** Active branch id of this computer. Understands the older { "branch": "Tabanan" } format. */
export function readActiveBranchId(file, branches) {
  try {
    if (!fs.existsSync(file)) return null;
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    if (raw.branchId) return branches.some((b) => b.id === raw.branchId) ? raw.branchId : null;
    const legacyName = clean(raw.branch);
    return legacyName ? branches.find((b) => sameName(b.name, legacyName))?.id ?? null : null;
  } catch {
    return null;
  }
}

export function writeActiveBranch(file, branchId, branches) {
  if (branchId && !branches.some((b) => b.id === branchId)) throw new Error("Cabang tidak ditemukan.");
  writeJsonAtomic(file, { branchId: branchId || null });
  return branchId || null;
}

/** The branch object of this computer, or null. Never throws: a broken file just means "not set". */
export function resolveActiveBranch(activeFile, branchesFile, branding) {
  try {
    const { branches } = readBranches(branchesFile, branding);
    const id = readActiveBranchId(activeFile, branches);
    return branches.find((b) => b.id === id) || null;
  } catch {
    return null;
  }
}

/** Global branding with the branch's address/phone/Instagram on top; empty branch fields keep the global value. */
export function applyBranchToBranding(branding, branch) {
  if (!branch) return { ...branding, branch: null };
  const out = { ...branding, receipt: { ...(branding.receipt || {}) }, whatsapp: { ...(branding.whatsapp || {}) } };
  if (branch.addressLine1 || branch.addressLine2) {
    out.receipt.addressLine1 = branch.addressLine1;
    out.receipt.addressLine2 = branch.addressLine2;
    out.address = [branch.addressLine1, branch.addressLine2].filter(Boolean).join(", ");
  }
  if (branch.phone) {
    out.phone = branch.phone;
    out.receipt.phoneContact = `WA: ${branch.phone}`;
  }
  if (branch.instagram) {
    const globalIg = branding.instagram;
    const note = out.receipt.socialNote || "";
    out.receipt.socialNote = globalIg && note.includes(globalIg) ? note.replaceAll(globalIg, branch.instagram) : `Tag IG kami: ${branch.instagram}`;
    out.instagram = branch.instagram;
    out.whatsapp.instagramTag = branch.instagram;
  }
  out.branch = { id: branch.id, name: branch.name };
  return out;
}
