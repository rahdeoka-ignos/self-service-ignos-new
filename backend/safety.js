import fs from "node:fs";
import path from "node:path";

export function childPath(root, name) {
  if (typeof name !== "string" || !name || name === "." || name === ".." || /[\\/:<>"|?*\x00-\x1f]/.test(name)
    || /[ .]$/.test(name) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) {
    throw new Error("Nama folder/file tidak valid.");
  }
  const base = path.resolve(root);
  const target = path.resolve(base, name);
  if (path.dirname(target) !== base) throw new Error("Path di luar direktori yang diizinkan.");
  if (fs.existsSync(target)) {
    const relative = path.relative(fs.realpathSync(base), fs.realpathSync(target));
    if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Symlink di luar direktori yang diizinkan.");
  }
  return target;
}

export function writeJsonAtomic(filename, data) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(temporary, filename);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
