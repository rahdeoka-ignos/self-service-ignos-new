import { nonNegative, reportPrints, reportSoftcopy } from "./pricing.js";

// One place for sales figures: the daily dashboard (/api/sessions) and the period report
// (/api/reports) use the same rules, so their numbers always agree.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_REPORT_DAYS = 366;

export function summarizeSessions(sessions) {
  let totalPeople = 0, totalOmset = 0, totalCash = 0, totalQris = 0, unrecorded = 0;
  let totalReg4R = 0, totalBonus4R = 0, totalA4 = 0;
  let storyFreeCount = 0, paidSoftcopyCount = 0, paidSoftcopyRevenue = 0;
  const addonsMap = {};

  for (const s of sessions) {
    totalPeople += Number(s.peopleCount) || 1;
    const price = Number(s.totalPrice) || 0;
    totalOmset += price;
    if (s.paymentMethod === "cash") totalCash += price;
    else if (s.paymentMethod === "qris" || s.paymentMethod === "transfer") totalQris += price;
    // Kiosk sessions do not record how the customer paid.
    else unrecorded += price;

    const prints = reportPrints(s);
    totalReg4R += prints.regular;
    totalBonus4R += prints.bonus;
    totalA4 += Number(s.a4Count) || 0;

    const softcopy = reportSoftcopy(s);
    if (softcopy.free) storyFreeCount++;
    if (softcopy.paid) { paidSoftcopyCount++; paidSoftcopyRevenue += softcopy.revenue; }

    for (const item of Array.isArray(s.miscAddons) ? s.miscAddons : []) {
      const name = item.name || "Addon";
      const qty = Number(item.qty) || 1;
      addonsMap[name] ??= { name, qty: 0, revenue: 0 };
      addonsMap[name].qty += qty;
      addonsMap[name].revenue += qty * nonNegative(item.price);
    }
  }

  return {
    totalSessions: sessions.length,
    totalPeople,
    totalOmset,
    paymentSummary: { cash: totalCash, qris: totalQris, unrecorded },
    totalPrints: { regular: totalReg4R, bonus: totalBonus4R, total4R: totalReg4R + totalBonus4R, a4: totalA4 },
    softcopy: { storyFree: storyFreeCount, paid: paidSoftcopyCount, paidRevenue: paidSoftcopyRevenue },
    addonsSummary: Object.values(addonsMap),
  };
}

// Validates a from/to pair of local dates (YYYY-MM-DD) and returns every day in between.
export function reportRange(from, to) {
  if (typeof from !== "string" || typeof to !== "string" || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    throw new Error("Tanggal laporan tidak valid.");
  }
  if (from > to) throw new Error("Tanggal awal harus sebelum tanggal akhir.");
  const days = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) throw new Error("Tanggal laporan tidak valid.");
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    if (days.length > MAX_REPORT_DAYS) throw new Error(`Periode laporan maksimal ${MAX_REPORT_DAYS} hari.`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function buildReport(allSessions, from, to) {
  const days = reportRange(from, to);
  const sessions = allSessions.filter((s) => typeof s.date === "string" && s.date >= from && s.date <= to);
  const byDay = new Map(days.map((day) => [day, []]));
  for (const s of sessions) byDay.get(s.date)?.push(s);
  const daily = days.map((date) => {
    const summary = summarizeSessions(byDay.get(date));
    return {
      date,
      sessions: summary.totalSessions,
      people: summary.totalPeople,
      omset: summary.totalOmset,
      cash: summary.paymentSummary.cash,
      qris: summary.paymentSummary.qris,
      unrecorded: summary.paymentSummary.unrecorded,
      prints4R: summary.totalPrints.total4R,
      a4: summary.totalPrints.a4,
      softcopyPaid: summary.softcopy.paid,
      softcopyRevenue: summary.softcopy.paidRevenue,
    };
  });
  const summary = summarizeSessions(sessions);
  summary.addonsSummary.sort((a, b) => b.revenue - a.revenue || b.qty - a.qty);
  return {
    from, to, days: days.length,
    summary,
    averagePerSession: summary.totalSessions ? Math.round(summary.totalOmset / summary.totalSessions) : 0,
    daily,
    sessions: [...sessions].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))),
  };
}

// ── CSV (opens directly in Excel) ──────────────────────────────────────────

// A cell starting with = + - @ (or tab/CR) is run as a formula by Excel; customer names are
// typed at the kiosk, so they are neutralised.
function cell(value, delimiter) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  if (text.includes(delimiter) || /["\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows, delimiter) {
  // BOM so Excel reads names with accents/emoji as UTF-8.
  return "﻿" + rows.map((row) => row.map((value) => cell(value, delimiter)).join(delimiter)).join("\r\n") + "\r\n";
}

const paymentLabel = (s) => s.paymentMethod === "cash" ? "Tunai" : s.paymentMethod === "qris" ? "QRIS" : s.paymentMethod === "transfer" ? "Transfer" : "Belum tercatat";

export function transactionsCsv(report, delimiter = ";") {
  const header = ["Tanggal", "Jam", "No. Invoice / ID", "Sumber", "Customer", "Jumlah Orang", "Mode", "Cetak 4R", "Bonus 4R", "Cetak A4",
    "Softcopy", "Biaya Softcopy", "Add-ons", "Total Add-ons", "Harga Dasar", "Diskon", "Total", "Metode Bayar"];
  const rows = report.sessions.map((s) => {
    const prints = reportPrints(s);
    const softcopy = reportSoftcopy(s);
    const addons = (Array.isArray(s.miscAddons) ? s.miscAddons : []).map((a) => `${a.name || "Addon"} x${Number(a.qty) || 1}`).join(", ");
    return [s.date, s.time ?? "", s.invoiceNumber || s.id || "", s.source === "cashier" ? "Kasir" : "Kiosk", s.customerName ?? "",
      Number(s.peopleCount) || 1, s.coupleMode ? "Couple" : "Personal/Grup", prints.regular, prints.bonus, Number(s.a4Count) || 0,
      softcopy.paid ? "Bayar" : "Story gratis", softcopy.revenue, addons, Number(s.totalAddonsPrice) || 0,
      Number(s.basePrice) || 0, Number(s.discount) || 0, Number(s.totalPrice) || 0, paymentLabel(s)];
  });
  const total = report.summary;
  const footer = ["", "", "", "", "TOTAL", total.totalPeople, "", total.totalPrints.regular, total.totalPrints.bonus, total.totalPrints.a4,
    "", total.softcopy.paidRevenue, "", "", "", "", total.totalOmset, ""];
  return toCsv([header, ...rows, footer], delimiter);
}

export function dailyCsv(report, delimiter = ";") {
  const header = ["Tanggal", "Sesi", "Pengunjung", "Omset", "Tunai", "QRIS/Transfer", "Belum Tercatat", "Cetak 4R (lembar)", "Cetak A4", "Softcopy Bayar", "Pendapatan Softcopy"];
  const rows = report.daily.map((d) => [d.date, d.sessions, d.people, d.omset, d.cash, d.qris, d.unrecorded, d.prints4R, d.a4, d.softcopyPaid, d.softcopyRevenue]);
  const s = report.summary;
  const footer = ["TOTAL", s.totalSessions, s.totalPeople, s.totalOmset, s.paymentSummary.cash, s.paymentSummary.qris, s.paymentSummary.unrecorded,
    s.totalPrints.total4R, s.totalPrints.a4, s.softcopy.paid, s.softcopy.paidRevenue];
  return toCsv([header, ...rows, footer], delimiter);
}
