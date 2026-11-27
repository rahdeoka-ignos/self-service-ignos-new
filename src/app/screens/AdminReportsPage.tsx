import { apiFetch as fetch } from "../../utils/api";
import { useEffect, useMemo, useState } from "react";
import { Calendar, Download, FileSpreadsheet, RefreshCw, Wallet } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { usePageTitle } from "../../hooks/usePageTitle";

const API = "http://localhost:5000";

interface DailyRow {
  date: string; sessions: number; people: number; omset: number; cash: number; qris: number; unrecorded: number;
  prints4R: number; a4: number; softcopyPaid: number; softcopyRevenue: number;
}
interface ReportResponse {
  success: boolean; error?: string; from: string; to: string; days: number; sessionCount: number; averagePerSession: number;
  summary: {
    totalSessions: number; totalPeople: number; totalOmset: number;
    paymentSummary: { cash: number; qris: number; unrecorded: number };
    totalPrints: { regular: number; bonus: number; total4R: number; a4: number };
    softcopy: { storyFree: number; paid: number; paidRevenue: number };
    addonsSummary: { name: string; qty: number; revenue: number }[];
  };
  daily: DailyRow[];
}

const rupiah = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
const shortDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

type Preset = "today" | "7d" | "month" | "lastMonth" | "custom";
function presetRange(preset: Exclude<Preset, "custom">): [string, string] {
  const now = new Date();
  if (preset === "today") return [localDate(now), localDate(now)];
  if (preset === "7d") { const from = new Date(now); from.setDate(now.getDate() - 6); return [localDate(from), localDate(now)]; }
  if (preset === "month") return [localDate(new Date(now.getFullYear(), now.getMonth(), 1)), localDate(now)];
  return [localDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), localDate(new Date(now.getFullYear(), now.getMonth(), 0))];
}
const PRESETS: { id: Exclude<Preset, "custom">; label: string }[] = [
  { id: "today", label: "Hari ini" }, { id: "7d", label: "7 hari" }, { id: "month", label: "Bulan ini" }, { id: "lastMonth", label: "Bulan lalu" },
];

export function AdminReportsPage() {
  usePageTitle("Laporan & Ekspor — Ignos");
  const [preset, setPreset] = useState<Preset>("month");
  const [[from, to], setRange] = useState<[string, string]>(() => presetRange("month"));
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API}/api/reports?from=${from}&to=${to}`);
      const data: ReportResponse = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Laporan gagal dimuat.");
      setReport(data);
    } catch (err: any) {
      setError(err.message || "Laporan gagal dimuat.");
    } finally { setLoading(false); }
  };
  useEffect(() => { if (from && to && from <= to) void load(); }, [from, to]);

  const choosePreset = (id: Exclude<Preset, "custom">) => { setPreset(id); setRange(presetRange(id)); };
  const setCustom = (which: "from" | "to", value: string) => {
    setPreset("custom");
    setRange(([f, t]) => (which === "from" ? [value, t] : [f, value]));
  };

  const download = async (kind: "transactions" | "daily") => {
    setDownloading(kind); setError(null);
    try {
      const res = await fetch(`${API}/api/reports/export?from=${from}&to=${to}&kind=${kind}`);
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Ekspor gagal.");
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan-${kind === "daily" ? "harian" : "transaksi"}-${from}_sd_${to}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setError(err.message || "Ekspor gagal.");
    } finally { setDownloading(null); }
  };

  const s = report?.summary;
  const maxDay = useMemo(() => Math.max(1, ...(report?.daily ?? []).map((d) => d.omset)), [report]);
  const activeDays = report?.daily.filter((d) => d.sessions > 0).length ?? 0;
  const bestDay = report?.daily.reduce<DailyRow | null>((best, d) => (!best || d.omset > best.omset ? d : best), null);
  const invalidRange = !from || !to || from > to;
  const pill = (active: boolean) => `px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${active
    ? "bg-[var(--admin-tab,#343638)] text-[var(--admin-text,#f4f4f5)] font-semibold"
    : "text-[var(--admin-secondary,#c3c7ca)] hover:text-[var(--admin-text,#f4f4f5)]"}`;
  const card = "rounded-2xl bg-[var(--admin-card,#1c1f20)] p-5";
  const muted = "text-[var(--admin-muted,#92989d)]";

  return (
    <AdminLayout>
      <div className="w-full px-5 pb-8 pt-3 lg:px-[34px] space-y-7">
        <div className="flex flex-col 2xl:flex-row 2xl:items-end justify-between gap-5 pb-6 border-b border-[var(--admin-border,#2a2d2f)]">
          <div>
            <p className={`text-[12px] tracking-[0.14em] uppercase font-medium ${muted}`}>Pembukuan studio</p>
            <h1 className="text-[28px] sm:text-[30px] font-semibold tracking-[-0.04em] text-[var(--admin-text,#f4f4f5)] leading-[1.25] mt-1.5">Laporan & Ekspor</h1>
            <p className={`text-[13px] leading-[1.8] mt-1 max-w-2xl ${muted}`}>Rekap penjualan per periode dan unduh ke Excel untuk pembukuan.</p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <div className="flex items-center gap-1 bg-[var(--admin-control,#1e2022)] p-1 rounded-full border border-[var(--admin-border,#2a2d2f)]" role="group" aria-label="Periode cepat">
              {PRESETS.map((p) => <button key={p.id} type="button" onClick={() => choosePreset(p.id)} aria-pressed={preset === p.id} className={pill(preset === p.id)}>{p.label}</button>)}
            </div>
            {(["from", "to"] as const).map((which) => (
              <label key={which} className="flex items-center gap-2 border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] rounded-full px-3 py-1.5 text-[12px] text-[var(--admin-secondary,#c3c7ca)]">
                <Calendar size={13} className={muted} />
                <span className={muted}>{which === "from" ? "Dari" : "Sampai"}</span>
                <input type="date" aria-label={which === "from" ? "Tanggal awal" : "Tanggal akhir"} value={which === "from" ? from : to}
                  onChange={(e) => setCustom(which, e.target.value)} className="bg-transparent outline-none text-[var(--admin-text,#f4f4f5)] [color-scheme:dark]" />
              </label>
            ))}
            <button type="button" onClick={() => void load()} disabled={loading || invalidRange} aria-label="Muat ulang laporan"
              className="rounded-full border border-[var(--admin-border,#2a2d2f)] p-2 text-[var(--admin-secondary,#c3c7ca)] hover:text-[var(--admin-text,#f4f4f5)] disabled:opacity-40">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {invalidRange && <p role="alert" className="rounded-xl bg-[var(--admin-alert,#3b2d3c)] px-4 py-3 text-[13px] text-[var(--admin-danger,#f18e9a)]">Tanggal awal harus sebelum atau sama dengan tanggal akhir.</p>}
        {error && <p role="alert" className="rounded-xl bg-[var(--admin-alert,#3b2d3c)] px-4 py-3 text-[13px] text-[var(--admin-danger,#f18e9a)]">{error}</p>}

        <section aria-labelledby="report-summary" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="report-summary" className="text-[16px] font-medium">Ringkasan periode</h2>
            <span className={`text-[12px] ${muted}`}>{report ? `${longDate(report.from)} – ${longDate(report.to)} · ${report.days} hari · ${activeDays} hari ada transaksi` : "Memuat…"}</span>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <article className="flex flex-col justify-between rounded-2xl bg-[#c0d0e7] p-6 text-[#111b23] sm:col-span-2">
              <div className="flex items-center justify-between gap-3"><span className="text-[13px] font-medium">Total omset</span><span className="flex size-9 items-center justify-center rounded-full border border-[#111b23]/20"><Wallet size={18} strokeWidth={1.8} /></span></div>
              <p className="my-4 break-words text-[36px] leading-tight tracking-[-2px]">{rupiah(s?.totalOmset ?? 0)}</p>
              <div className="grid grid-cols-3 gap-3 text-[12px] text-[#273342]">
                <div><p>Tunai</p><p className="mt-1 text-[14px] font-medium text-[#111b23]">{rupiah(s?.paymentSummary.cash ?? 0)}</p></div>
                <div><p>QRIS / transfer</p><p className="mt-1 text-[14px] font-medium text-[#111b23]">{rupiah(s?.paymentSummary.qris ?? 0)}</p></div>
                <div title="Sesi dari kiosk tidak menyimpan metode bayar"><p>Belum tercatat</p><p className="mt-1 text-[14px] font-medium text-[#111b23]">{rupiah(s?.paymentSummary.unrecorded ?? 0)}</p></div>
              </div>
            </article>
            <article className={card}>
              <h3 className="text-[13px]">Sesi foto</h3>
              <p className="mt-3 text-[30px] leading-[38px] tracking-[-1px]">{s?.totalSessions ?? 0}<span className={`ml-2 text-[12px] tracking-normal ${muted}`}>sesi</span></p>
              <p className={`mt-1 text-[12px] ${muted}`}>{s?.totalPeople ?? 0} pengunjung · rata-rata {rupiah(report?.averagePerSession ?? 0)}/sesi</p>
            </article>
            <article className={card}>
              <h3 className="text-[13px]">Cetak & softcopy</h3>
              <p className="mt-3 text-[30px] leading-[38px] tracking-[-1px]">{s?.totalPrints.total4R ?? 0}<span className={`ml-2 text-[12px] tracking-normal ${muted}`}>lembar 4R</span></p>
              <p className={`mt-1 text-[12px] ${muted}`}>{s?.totalPrints.a4 ?? 0} A4 · softcopy {s?.softcopy.storyFree ?? 0} gratis / {s?.softcopy.paid ?? 0} bayar ({rupiah(s?.softcopy.paidRevenue ?? 0)})</p>
            </article>
          </div>
        </section>

        <section aria-labelledby="report-export" className={`${card} flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between`}>
          <div className="flex items-start gap-3">
            <FileSpreadsheet size={20} className="mt-0.5 shrink-0 text-[var(--admin-accent-text,#c0d0e7)]" />
            <div>
              <h2 id="report-export" className="text-[14px] font-medium">Unduh ke Excel</h2>
              <p className={`mt-0.5 text-[12px] leading-[1.7] ${muted}`}>File CSV untuk periode di atas, langsung terbuka per kolom di Excel. Angka ditulis tanpa titik ribuan agar bisa dijumlah.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {([["transactions", "Daftar transaksi"], ["daily", "Rekap per hari"]] as const).map(([kind, label]) => (
              <button key={kind} type="button" onClick={() => void download(kind)} disabled={!!downloading || invalidRange || !report}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--admin-raised,#292b2f)] px-4 py-2 text-[12px] font-medium text-[var(--admin-text,#f4f4f5)] hover:bg-[var(--admin-tab,#343638)] disabled:opacity-40">
                {downloading === kind ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}{label}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-3">
          <section aria-labelledby="report-daily" className={`${card} xl:col-span-2 min-w-0`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 id="report-daily" className="text-[14px] font-medium">Omset per hari</h2>
              {bestDay && bestDay.omset > 0 && <span className={`text-[12px] ${muted}`}>Tertinggi: {shortDay(bestDay.date)} · {rupiah(bestDay.omset)}</span>}
            </div>
            {report && report.daily.length <= 62 && (
              <div className="mb-5 flex h-[120px] items-end gap-[3px]" aria-hidden="true">
                {report.daily.map((d) => (
                  <div key={d.date} title={`${shortDay(d.date)}: ${rupiah(d.omset)}`} className="flex-1 rounded-t-[3px] bg-[#c0d0e7]/80 hover:bg-[#c0d0e7] min-h-[2px]"
                    style={{ height: `${Math.max(2, (d.omset / maxDay) * 100)}%`, opacity: d.sessions ? 1 : 0.25 }} />
                ))}
              </div>
            )}
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-left text-[12px]">
                <caption className="sr-only">Rekap per hari untuk periode terpilih</caption>
                <thead className={`sticky top-0 bg-[var(--admin-card,#1c1f20)] ${muted}`}>
                  <tr>{["Tanggal", "Sesi", "Pengunjung", "4R", "A4", "Omset"].map((h, i) => <th key={h} scope="col" className={`py-2 font-medium ${i ? "text-right" : ""}`}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {report?.daily.filter((d) => d.sessions > 0 || report.days <= 31).slice().reverse().map((d) => (
                    <tr key={d.date} className={`border-t border-[var(--admin-border,#2a2d2f)] ${d.sessions ? "" : muted}`}>
                      <td className="py-2">{shortDay(d.date)}</td>
                      <td className="py-2 text-right font-mono">{d.sessions}</td>
                      <td className="py-2 text-right font-mono">{d.people}</td>
                      <td className="py-2 text-right font-mono">{d.prints4R}</td>
                      <td className="py-2 text-right font-mono">{d.a4}</td>
                      <td className="py-2 text-right font-mono">{rupiah(d.omset)}</td>
                    </tr>
                  ))}
                  {report && activeDays === 0 && <tr><td colSpan={6} className={`py-6 text-center ${muted}`}>Belum ada transaksi di periode ini.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="report-addons" className={card}>
            <h2 id="report-addons" className="mb-4 text-[14px] font-medium">Add-ons terlaris</h2>
            {s && s.addonsSummary.length > 0 ? (
              <ol className="space-y-3">
                {s.addonsSummary.slice(0, 10).map((a, i) => (
                  <li key={a.name} className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="flex min-w-0 items-center gap-2"><span className={`w-4 shrink-0 text-right font-mono ${muted}`}>{i + 1}</span><span className="truncate">{a.name}</span></span>
                    <span className="shrink-0 text-right"><span className="font-mono">{a.qty}×</span><span className={`ml-2 ${muted}`}>{rupiah(a.revenue)}</span></span>
                  </li>
                ))}
              </ol>
            ) : <p className={`text-[12px] ${muted}`}>Belum ada add-ons terjual di periode ini.</p>}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
