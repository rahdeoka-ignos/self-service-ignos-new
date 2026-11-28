// Generates a 4R (4x6 in, 600 dpi) calibration page with millimetre rulers on
// every edge. Print it borderless with the exact kiosk settings, then read the
// first fully visible line on each side: that number is the printInset (mm) for
// that side in public/printers.json.
//
//   node tools/make-print-calibration.js [output.png]
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const W = 2400;
const H = 3600;
const MM = W / 101.6; // px per mm
const MAX = 12; // mm of ruler per side
const out = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), "calibration-4r.png");

const sides = [
  { key: "top", label: "ATAS", color: "#d32f2f" },
  { key: "bottom", label: "BAWAH", color: "#1565c0" },
  { key: "left", label: "KIRI", color: "#2e7d32" },
  { key: "right", label: "KANAN", color: "#ef6c00" },
];

let svg = "";
for (const { key, label, color } of sides) {
  for (let half = 0; half <= MAX * 2; half++) {
    const d = (half / 2) * MM;
    const whole = half % 2 === 0;
    const stroke = whole ? color : "#9e9e9e";
    const sw = whole ? 3 : 2;
    const n = half / 2;
    if (key === "top" || key === "bottom") {
      const y = key === "top" ? d : H - d;
      svg += `<line x1="${W * 0.3}" x2="${W * 0.7}" y1="${y}" y2="${y}" stroke="${stroke}" stroke-width="${sw}"/>`;
      if (whole && n > 0) {
        // odd numbers left, even right: 2 mm per label leaves room for readable text
        const ty = y + 13;
        const left = n % 2 === 1;
        svg += `<line x1="${left ? W * 0.3 - 40 : W * 0.7}" x2="${left ? W * 0.3 : W * 0.7 + 40}" y1="${y}" y2="${y}" stroke="${color}" stroke-width="3"/>`;
        svg += `<text x="${left ? W * 0.3 - 48 : W * 0.7 + 48}" y="${ty}" font-size="38" text-anchor="${left ? "end" : "start"}" fill="${color}" font-family="Arial" font-weight="bold">${n}</text>`;
      }
    } else {
      const x = key === "left" ? d : W - d;
      svg += `<line x1="${x}" x2="${x}" y1="${H * 0.35}" y2="${H * 0.65}" stroke="${stroke}" stroke-width="${sw}"/>`;
      if (whole && n > 0) {
        // odd numbers above, even below
        const above = n % 2 === 1;
        svg += `<line x1="${x}" x2="${x}" y1="${above ? H * 0.35 - 40 : H * 0.65}" y2="${above ? H * 0.35 : H * 0.65 + 40}" stroke="${color}" stroke-width="3"/>`;
        svg += `<text x="${x}" y="${above ? H * 0.35 - 50 : H * 0.65 + 80}" font-size="34" text-anchor="middle" fill="${color}" font-family="Arial" font-weight="bold">${n}</text>`;
      }
    }
  }
  const pos = {
    top: [W / 2, MM * 16], bottom: [W / 2, H - MM * 14], left: [MM * 20, H / 2], right: [W - MM * 20, H / 2],
  }[key];
  svg += `<text x="${pos[0]}" y="${pos[1]}" font-size="70" text-anchor="middle" fill="${color}" font-family="Arial" font-weight="bold">${label}</text>`;
}

const lines = [
  "KALIBRASI CETAK 4R",
  "Cetak borderless dengan setting kiosk.",
  "Di tiap sisi, lihat garis berwarna",
  "paling luar yang MASIH terlihat utuh.",
  "Angka di sebelah garis itu (mm)",
  "= nilai printInset sisi tersebut.",
  "Garis abu-abu = setengah mm.",
];
lines.forEach((t, i) => {
  svg += `<text x="${W / 2}" y="${H * 0.42 + i * 95}" font-size="${i === 0 ? 90 : 62}" text-anchor="middle" fill="#212121" font-family="Arial" font-weight="${i === 0 ? "bold" : "normal"}">${t}</text>`;
});

const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#ffffff"/>${svg}</svg>`;
await sharp(Buffer.from(doc)).png().toFile(out);
console.log(`Calibration page written to ${out}`);
