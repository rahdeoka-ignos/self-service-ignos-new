import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { summarizeSessions, buildReport, reportRange, transactionsCsv, dailyCsv } from '../backend/reports.js';
import { nonNegative, reportPrints, reportSoftcopy } from '../backend/pricing.js';

const session = (over) => ({
  id: 'S', date: '2026-11-02', time: '10.00', timestamp: '2026-11-02T03:00:00Z', customerName: 'Rina', peopleCount: 2,
  coupleMode: true, makeStory: true, softcopyType: 'story_free', softcopyCharge: 0, prints: { regular: 2, bonus: 0, total: 2 },
  a4Count: 0, miscAddons: [], basePrice: 100000, totalAddonsPrice: 0, totalPrice: 100000, ...over,
});

test('period report filters by local date, fills empty days and separates unrecorded payments', () => {
  const sessions = [
    session({ id: 'a', date: '2026-10-31', totalPrice: 999 }),
    session({ id: 'b', date: '2026-11-01', paymentMethod: 'cash', totalPrice: 120000 }),
    session({ id: 'c', date: '2026-11-03', paymentMethod: 'qris', totalPrice: 80000, miscAddons: [{ name: 'Keychain', qty: 2, price: 15000 }] }),
    session({ id: 'd', date: '2026-11-03', totalPrice: 100000, makeStory: false, softcopyType: 'paid', softcopyCharge: 25000 }),
  ];
  const r = buildReport(sessions, '2026-11-01', '2026-11-03');
  assert.equal(r.days, 3);
  assert.deepEqual(r.daily.map(d => [d.date, d.sessions, d.omset]), [['2026-11-01', 1, 120000], ['2026-11-02', 0, 0], ['2026-11-03', 2, 180000]]);
  assert.equal(r.summary.totalOmset, 300000);
  assert.deepEqual(r.summary.paymentSummary, { cash: 120000, qris: 80000, unrecorded: 100000 });
  assert.equal(r.summary.softcopy.paidRevenue, 25000);
  assert.deepEqual(r.summary.addonsSummary, [{ name: 'Keychain', qty: 2, revenue: 30000 }]);
  assert.equal(r.averagePerSession, 100000);
  assert.deepEqual(r.sessions.map(s => s.id), ['b', 'c', 'd']);
});

test('report ranges are validated', () => {
  assert.throws(() => reportRange('2026-11-05', '2026-11-01'), /sebelum/);
  assert.throws(() => reportRange('2026/11/01', '2026-11-02'), /tidak valid/);
  assert.throws(() => reportRange('2025-01-01', '2026-12-31'), /maksimal/);
  assert.equal(reportRange('2026-02-27', '2026-03-01').length, 3);
});

test('CSV export opens in Excel: BOM, chosen delimiter, quoting, totals, and no formula injection', () => {
  const r = buildReport([
    session({ id: 'x', customerName: '=HYPERLINK("http://evil")', paymentMethod: 'cash' }),
    session({ id: 'y', customerName: 'Budi; Sari', miscAddons: [{ name: 'Bingkai', qty: 1, price: 25000 }], totalPrice: 125000 }),
  ], '2026-11-02', '2026-11-02');
  const csv = transactionsCsv(r, ';');
  assert.ok(csv.startsWith('﻿'));
  const lines = csv.slice(1).trim().split('\r\n');
  assert.equal(lines.length, 4); // header, 2 rows, total
  assert.match(lines[0], /^Tanggal;Jam;/);
  assert.ok(lines[1].includes(`"'=HYPERLINK(""http://evil"")"`), lines[1]);
  assert.ok(lines[2].includes('"Budi; Sari"'));
  assert.ok(lines[2].endsWith(';Belum tercatat'));
  assert.ok(lines[3].includes(';TOTAL;') && lines[3].includes(';225000;'));
  assert.match(dailyCsv(r, ',').slice(1).split('\r\n')[1], /^2026-11-02,2,4,225000,100000,0,125000,/);
});

// The dashboard used to compute these totals inline in server.js; the shared function must give the same numbers.
function legacySummary(sessions) {
  let totalPeople = 0, totalOmset = 0, totalCash = 0, totalQris = 0, reg = 0, bonus = 0, a4 = 0, free = 0, paid = 0, paidRevenue = 0;
  const addons = {};
  for (const s of sessions) {
    totalPeople += Number(s.peopleCount) || 1;
    const price = Number(s.totalPrice) || 0;
    totalOmset += price;
    if (s.paymentMethod === 'cash') totalCash += price; else if (s.paymentMethod === 'qris' || s.paymentMethod === 'transfer') totalQris += price;
    const p = reportPrints(s); reg += p.regular; bonus += p.bonus; a4 += Number(s.a4Count) || 0;
    const sc = reportSoftcopy(s); if (sc.free) free++; if (sc.paid) { paid++; paidRevenue += sc.revenue; }
    for (const item of Array.isArray(s.miscAddons) ? s.miscAddons : []) {
      const name = item.name || 'Addon', qty = Number(item.qty) || 1;
      addons[name] ??= { name, qty: 0, revenue: 0 }; addons[name].qty += qty; addons[name].revenue += qty * nonNegative(item.price);
    }
  }
  return { totalSessions: sessions.length, totalPeople, totalOmset, paymentSummary: { cash: totalCash, qris: totalQris },
    totalPrints: { regular: reg, bonus, total4R: reg + bonus, a4 }, softcopy: { storyFree: free, paid, paidRevenue }, addonsSummary: Object.values(addons) };
}

test('dashboard totals are unchanged by the shared summary (real studio data when present)', () => {
  const data = fs.existsSync('data/sessions.json') ? JSON.parse(fs.readFileSync('data/sessions.json', 'utf8')) : [];
  const samples = [data, ...new Set(data.map(s => s.date))].map(x => Array.isArray(x) ? x : data.filter(s => s.date === x));
  samples.push([session({ paymentMethod: 'transfer' }), session({ miscAddons: [{ qty: 3 }] })]);
  for (const sessions of samples) {
    const { paymentSummary: { unrecorded, ...payments }, ...rest } = summarizeSessions(sessions);
    assert.deepEqual({ ...rest, paymentSummary: payments }, legacySummary(sessions));
    assert.equal(payments.cash + payments.qris + unrecorded, rest.totalOmset);
  }
});
