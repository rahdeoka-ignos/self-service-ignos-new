// Borderless printing enlarges the image slightly past the paper edge, so a few
// millimetres of every side are cut off — and how much differs per printer, per
// side and per OS driver. A profile can declare the measured cut-off as
// `printInset: { top, right, bottom, left }` (mm, read from the calibration print
// made by tools/make-print-calibration.js). Before printing, the design is shrunk
// into that inner box and the margin is filled by stretching the design's own edge
// pixels outward, so what the printer cuts away is only that filler. If the printer
// cuts a little less than measured (paper feed varies ±0.5 mm), the leftover shows
// the design's edge colour (e.g. a maroon frame) instead of a white line.
//
// The colour is taken EDGE_SAMPLE_MM inside the design, not from the very last pixel:
// exported templates often end in a thin light anti-aliased line (grid-delapan fades
// from #e8e8e8 to its dark grey frame over ~5 px), and stretching that line outward
// printed as a white strip. Those outer EDGE_SAMPLE_MM are always cut by the printer.
import fs from "fs";
import path from "path";
import sharp from "sharp";

const SIDES = ["top", "right", "bottom", "left"];
const MAX_INSET_MM = 15;
export const EDGE_SAMPLE_MM = 0.4;

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
  return { ...px, innerWidth, innerHeight, pxPerMm };
}

/**
 * Normalise a printInset coming from the admin form: numbers 0–15 mm, max 2 decimals.
 * Returns null when every side is 0 (no compensation).
 */
export function normalizePrintInset(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") throw new Error("printInset harus berupa objek { top, right, bottom, left }.");
  const out = {};
  for (const side of SIDES) {
    const value = raw[side] === "" || raw[side] === undefined || raw[side] === null ? 0 : Number(raw[side]);
    if (!Number.isFinite(value) || value < 0 || value > MAX_INSET_MM) {
      throw new Error(`printInset.${side} harus angka 0–${MAX_INSET_MM} mm.`);
    }
    out[side] = Math.round(value * 100) / 100;
  }
  if (raw.paperShortMm !== undefined) out.paperShortMm = Number(raw.paperShortMm);
  return SIDES.some((s) => out[s] > 0) ? out : null;
}

export const hasInset = (inset) => !!inset && SIDES.some((s) => Number(inset[s] ?? 0) > 0);

/** Writes a padded copy (edge colour extended outward) next to the source and returns its path (caller deletes it). */
export async function applyPrintInset(srcPath, inset, paperShortMm) {
  const { width, height } = await sharp(srcPath).metadata();
  const box = insetBox(width, height, inset, paperShortMm);
  const out = path.join(path.dirname(srcPath), `${path.parse(srcPath).name}.inset.png`);
  const inner = await sharp(srcPath)
    .flatten({ background: "#ffffff" })
    .resize(box.innerWidth, box.innerHeight, { fit: "fill" })
    .toBuffer();
  // Drop the outermost EDGE_SAMPLE_MM of each compensated side, then grow back from
  // there: the filler (and that thin band) repeats a pixel from inside the design.
  const sample = Math.round(EDGE_SAMPLE_MM * box.pxPerMm);
  const trim = Object.fromEntries(SIDES.map((side) => [side, box[side] > 0 ? sample : 0]));
  const core = await sharp(inner)
    .extract({
      left: trim.left,
      top: trim.top,
      width: box.innerWidth - trim.left - trim.right,
      height: box.innerHeight - trim.top - trim.bottom,
    })
    .toBuffer();
  await sharp(core)
    .extend({
      top: box.top + trim.top,
      bottom: box.bottom + trim.bottom,
      left: box.left + trim.left,
      right: box.right + trim.right,
      extendWith: "copy",
    })
    .png()
    .toFile(out);
  return out;
}

export function removeQuietly(file) {
  fs.promises.unlink(file).catch(() => {});
}
