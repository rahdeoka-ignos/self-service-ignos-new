// Borderless printing enlarges the image slightly past the paper edge, so a few
// millimetres of every side are cut off — and how much differs per printer, per
// side and per OS driver. A profile can declare the measured cut-off as
// `printInset: { top, right, bottom, left }` (mm, read from the calibration print
// made by tools/make-print-calibration.js). Before printing, the design is shrunk
// into that inner box and padded with white, so what the printer cuts away is
// only the added white and the design lands on paper exactly as on screen.
import fs from "fs";
import path from "path";
import sharp from "sharp";

const SIDES = ["top", "right", "bottom", "left"];
const MAX_INSET_MM = 15;

/** Pixel box the design must fit into. paperShortMm: short side of the paper (4R = 101.6). */
export function insetBox(width, height, inset = {}, paperShortMm = 101.6) {
  const pxPerMm = Math.min(width, height) / paperShortMm;
  const px = {};
  for (const side of SIDES) {
    const mm = Number(inset[side] ?? 0);
    if (!Number.isFinite(mm) || mm < 0 || mm > MAX_INSET_MM) {
      throw new Error(`printInset.${side} harus 0–${MAX_INSET_MM} mm.`);
    }
    px[side] = Math.round(mm * pxPerMm);
  }
  const innerWidth = width - px.left - px.right;
  const innerHeight = height - px.top - px.bottom;
  if (innerWidth < width / 2 || innerHeight < height / 2) throw new Error("printInset terlalu besar.");
  return { ...px, innerWidth, innerHeight };
}

export const hasInset = (inset) => !!inset && SIDES.some((s) => Number(inset[s] ?? 0) > 0);

/** Writes a padded copy next to the source and returns its path (caller deletes it). */
export async function applyPrintInset(srcPath, inset, paperShortMm) {
  const { width, height } = await sharp(srcPath).metadata();
  const box = insetBox(width, height, inset, paperShortMm);
  const out = path.join(path.dirname(srcPath), `${path.parse(srcPath).name}.inset.png`);
  const inner = await sharp(srcPath)
    .flatten({ background: "#ffffff" })
    .resize(box.innerWidth, box.innerHeight, { fit: "fill" })
    .toBuffer();
  await sharp(inner)
    .extend({ top: box.top, bottom: box.bottom, left: box.left, right: box.right, background: "#ffffff" })
    .png()
    .toFile(out);
  return out;
}

export function removeQuietly(file) {
  fs.promises.unlink(file).catch(() => {});
}
