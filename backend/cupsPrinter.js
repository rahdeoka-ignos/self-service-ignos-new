// macOS / Linux printing through CUPS (lp, lpstat, cancel).
// Windows keeps using pdf-to-printer + PowerShell in server.js; this module is
// only used when process.platform is not "win32".
import { execFile } from "child_process";

// lpstat output is localized; force English so the parsers below work.
const CUPS_ENV = { ...process.env, LANG: "C", LC_ALL: "C" };

// Values passed to `lp -o key=value`. execFile never goes through a shell, but
// keep values tame so a bad printers.json entry cannot smuggle extra options.
const SAFE_OPTION_KEY = /^[A-Za-z][\w.-]*$/;
const SAFE_OPTION_VALUE = /^[\w.:+-]+$/;

function run(cmd, args, timeout = 8000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { env: CUPS_ENV, timeout }, (err, stdout, stderr) => {
      if (err) {
        err.message = (String(stderr || "").trim() || err.message);
        return reject(err);
      }
      resolve(String(stdout || ""));
    });
  });
}

/**
 * Build `lp` arguments for one print job.
 * profile.cupsOptions (optional, object) carries driver-specific options such as
 * { "MediaType": "...", "media": "A4.Borderless" } — see `lpoptions -p <printer> -l`.
 */
export function buildLpArgs(filePath, { printer, copies = 1, scale, paperSize, cupsOptions, title } = {}) {
  if (!printer) throw new Error("Nama printer belum diisi.");
  if (!Number.isInteger(copies) || copies < 1 || copies > 100) throw new Error("Jumlah salinan harus 1–100.");
  const args = ["-d", printer, "-n", String(copies)];
  // Job name in the print queue, e.g. "Booth 2 - 4r" when printing for another kiosk.
  if (title) args.push("-t", String(title).replace(/[^\w .()-]/g, "").slice(0, 60));
  if (scale === "fit") args.push("-o", "fit-to-page");

  const options = { ...(cupsOptions && typeof cupsOptions === "object" ? cupsOptions : {}) };
  if (paperSize && options.media === undefined && SAFE_OPTION_VALUE.test(paperSize)) options.media = paperSize;
  for (const [key, value] of Object.entries(options)) {
    const v = String(value);
    if (!SAFE_OPTION_KEY.test(key) || !SAFE_OPTION_VALUE.test(v)) {
      throw new Error(`Opsi printer tidak valid: ${key}=${v}`);
    }
    args.push("-o", `${key}=${v}`);
  }
  args.push("--", filePath);
  return args;
}

export async function cupsPrint(filePath, options) {
  const queues = parsePrinterBlocks(await run("lpstat", ["-l", "-p"]));
  const printer = resolveQueueName(options.printer, queues);
  if (!printer) throw new Error(`Printer "${options.printer}" tidak ditemukan di macOS. Pilih ulang printer di halaman Admin Printer.`);
  const out = await run("lp", buildLpArgs(filePath, { ...options, printer }), 30000);
  // "request id is EPSON_L8050_Series-12 (1 file(s))"
  const match = /request id is (\S+)/.exec(out);
  return match ? match[1] : null;
}

/** Parse `lpstat -d`. */
export function parseDefaultPrinter(text) {
  const match = /system default destination:\s*(\S+)/.exec(text);
  return match ? match[1] : null;
}

/** Parse `lpstat -l -p` into one entry per queue. */
export function parsePrinterBlocks(text) {
  const printers = [];
  let current = null;
  for (const line of String(text).split(/\r?\n/)) {
    const head = /^printer (\S+) (.*)$/.exec(line);
    if (head) {
      const rest = head[2];
      current = {
        name: head[1],
        description: "",
        disabled: /\bdisabled\b/.test(rest),
        printing: /\bnow printing\b/.test(rest),
        reasons: [],
      };
      printers.push(current);
      continue;
    }
    if (!current) continue;
    const desc = /^\s+Description:\s*(.*)$/.exec(line);
    if (desc) current.description = desc[1].trim();
    const alerts = /^\s+Alerts:\s*(.*)$/.exec(line);
    if (alerts) {
      current.reasons = alerts[1].trim().split(/[\s,]+/).filter((r) => r && r !== "none");
    }
  }
  return printers;
}

/** Parse `lpstat -o`: "EPSON_L8050_Series-12  user  123456  Sat Nov 28 10:00:00 2026". */
export function parseJobs(text) {
  const jobs = [];
  for (const line of String(text).split(/\r?\n/)) {
    const match = /^(\S+)-(\d+)\s+(\S+)\s+(\d+)\s+(.*)$/.exec(line.trim());
    if (!match) continue;
    jobs.push({
      Id: Number(match[2]),
      JobId: `${match[1]}-${match[2]}`,
      PrinterName: match[1],
      Owner: match[3],
      Size: Number(match[4]),
      Submitted: match[5].trim(),
    });
  }
  return jobs;
}

const hasReason = (reasons, ...names) => reasons.some((r) => names.some((n) => r === n || r.startsWith(`${n}-`)));

/** Turn parsed CUPS state into the same printer shape the Windows monitor produces (minus profiles). */
export function mapCupsPrinter(p, jobs) {
  const printerJobs = jobs.filter((j) => j.PrinterName === p.name).sort((a, b) => a.Id - b.Id);
  const r = p.reasons;
  const isOffline = p.disabled || hasReason(r, "offline", "offline-report", "shutdown");
  const isPaperOut = hasReason(r, "media-empty", "media-needed", "input-tray-missing");
  const isDoorOpen = hasReason(r, "door-open", "cover-open", "output-tray-missing", "interlock-open");
  const isPaperJam = hasReason(r, "media-jam");
  const isUserIntervention = !isPaperOut && !isDoorOpen && !isPaperJam &&
    r.some((x) => x.endsWith("-error") && !x.startsWith("marker-supply"));
  const isPrinting = p.printing;

  let statusCode = "ready";
  let statusText = "Ready";
  if (isOffline) { statusCode = "offline"; statusText = "Offline"; }
  else if (isDoorOpen) { statusCode = "door_open"; statusText = "Tray Tertutup / Belum Ditarik"; }
  else if (isPaperOut) { statusCode = "paper_out"; statusText = "Kertas Habis"; }
  else if (isPaperJam) { statusCode = "paper_jam"; statusText = "Kertas Macet (Paper Jam)"; }
  else if (isUserIntervention) { statusCode = "user_intervention"; statusText = "Perlu Perhatian Kasir"; }
  else if (isPrinting) { statusCode = "printing"; statusText = "Sedang Mencetak"; }

  return {
    name: p.name,
    description: p.description,
    status: statusText,
    statusCode,
    isOffline,
    isPaperOut,
    isDoorOpen,
    isPaperJam,
    isUserIntervention,
    isPrinting,
    reasons: r,
    jobsCount: printerJobs.length,
    jobs: printerJobs,
  };
}

/**
 * A profile saved on Windows stores the display name ("EPSON L8050 Series"),
 * while CUPS queues use names without spaces ("EPSON_L8050_Series").
 * Match by queue name, description, or the underscored form.
 */
export function resolveQueueName(printerName, printers) {
  const want = String(printerName || "").trim().toLowerCase();
  if (!want) return null;
  const underscored = want.replace(/\s+/g, "_");
  const hit = printers.find((p) => p.name.toLowerCase() === want) ||
    printers.find((p) => (p.description || "").toLowerCase() === want) ||
    printers.find((p) => p.name.toLowerCase() === underscored);
  return hit ? hit.name : null;
}

/** Same shape as pdf-to-printer's getPrinters(), plus isDefault. */
export async function cupsListPrinters() {
  const [list, def] = await Promise.all([
    run("lpstat", ["-l", "-p"]),
    run("lpstat", ["-d"]).catch(() => ""),
  ]);
  const defaultName = parseDefaultPrinter(def);
  return parsePrinterBlocks(list).map((p) => ({
    deviceId: p.name,
    name: p.name,
    description: p.description,
    paperSizes: [],
    isDefault: p.name === defaultName,
  }));
}

export async function cupsPrinterStatus() {
  try {
    const [list, jobsText] = await Promise.all([
      run("lpstat", ["-l", "-p"]),
      // lpstat -o exits non-zero on some systems when there are no jobs.
      run("lpstat", ["-o"]).catch(() => ""),
    ]);
    const jobs = parseJobs(jobsText);
    return { success: true, printers: parsePrinterBlocks(list).map((p) => mapCupsPrinter(p, jobs)) };
  } catch (err) {
    return { success: false, error: err.message, printers: [] };
  }
}

export async function cupsCancelAllJobs() {
  await run("cancel", ["-a"]);
}
