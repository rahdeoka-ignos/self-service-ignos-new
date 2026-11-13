// Both USB and card readers use camera-local timestamps, independent of the PC's current clock.
export function exifDateTime(buffer) {
  if (!buffer) return null;
  try {
    const start = buffer.subarray(0, 6).toString("ascii") === "Exif\0\0" ? 6 : 0;
    const little = buffer.toString("ascii", start, start + 2) === "II";
    const u16 = (offset) => little ? buffer.readUInt16LE(start + offset) : buffer.readUInt16BE(start + offset);
    const u32 = (offset) => little ? buffer.readUInt32LE(start + offset) : buffer.readUInt32BE(start + offset);
    if (u16(2) !== 42) return null;
    const readIfd = (offset) => {
      const tags = new Map();
      const count = Math.min(u16(offset), 512);
      for (let i = 0; i < count; i++) {
        const entry = offset + 2 + i * 12;
        tags.set(u16(entry), { type: u16(entry + 2), count: u32(entry + 4), value: u32(entry + 8), entry });
      }
      return tags;
    };
    const root = readIfd(u32(4));
    const exif = root.get(0x8769);
    if (!exif) return null;
    const tags = readIfd(exif.value);
    for (const tag of [0x9003, 0x9004]) {
      const value = tags.get(tag);
      if (!value || value.type !== 2 || value.count < 19) continue;
      const text = buffer.toString("ascii", start + value.value, start + value.value + 19);
      const match = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
      if (!match) continue;
      const [, year, month, day, hour, minute, second] = match.map(Number);
      const date = new Date(year, month - 1, day, hour, minute, second);
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        && date.getHours() === hour && date.getMinutes() === minute && date.getSeconds() === second) return date.getTime();
    }
  } catch { /* Missing or malformed metadata falls back to file modification time. */ }
  return null;
}

export function selectPhotoWindow(files, { filter = "custom_min", minutes = 30 } = {}) {
  minutes = Number(minutes);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) throw new Error("Durasi harus 1-180 menit.");
  const sorted = [...files].sort((a, b) => (a.timeMs ?? Infinity) - (b.timeMs ?? Infinity) || a.id.localeCompare(b.id));
  const dated = sorted.filter((f) => Number.isFinite(f.timeMs));
  const reference = dated.at(-1)?.timeMs ?? null;
  const tolerance = minutes === 30 ? 10 : minutes === 45 ? 15 : minutes === 60 ? 20 : Math.ceil(minutes / 3);
  const cutoff = reference === null ? null : reference - minutes * 60000;
  const candidates = sorted.map((file) => {
    const known = Number.isFinite(file.timeMs);
    let group = "outside";
    if (!known) group = "unknown";
    else if (filter === "all") group = "main";
    else if (filter === "today") group = new Date(file.timeMs).toDateString() === new Date(reference).toDateString() ? "main" : "outside";
    else if (file.timeMs >= cutoff) group = "main";
    else if (file.timeMs >= cutoff - tolerance * 60000) group = "tolerance";
    return { ...file, group, selected: group === "main" };
  });
  const gaps = [];
  for (let i = 1; i < dated.length; i++) {
    const gapMinutes = (dated[i].timeMs - dated[i - 1].timeMs) / 60000;
    if (gapMinutes >= 8 && (cutoff === null || dated[i].timeMs >= cutoff - tolerance * 60000)) {
      gaps.push({ beforeId: dated[i - 1].id, afterId: dated[i].id, minutes: Math.round(gapMinutes) });
    }
  }
  return { candidates, reference, minutes, toleranceMinutes: tolerance, gaps };
}

export function selectConfirmedRange(scan, firstId, lastId) {
  const first = scan.candidates.findIndex((f) => f.id === firstId);
  const last = scan.candidates.findIndex((f) => f.id === lastId);
  if (first < 0 || last < first) throw new Error("Pilih foto awal dan akhir yang valid dari hasil scan.");
  return scan.candidates.slice(first, last + 1);
}
