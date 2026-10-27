import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Printer,
  DollarSign,
  Gift,
  Calendar,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  FileText,
  Clock,
  Search,
  ArrowUpRight,
  Info,
  Camera,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import type { SessionsResponse, SessionRecord } from "../../types/session";

const API = "http://localhost:5000";

function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateIndo(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getInitials(name: string): string {
  if (!name) return "IG";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AdminDashboardPage() {
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [printingReceipt, setPrintingReceipt] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [packageFilter, setPackageFilter] = useState<string>("all");

  const greetingTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "pagi";
    if (hour < 15) return "siang";
    if (hour < 18) return "sore";
    return "malam";
  }, []);

  const fetchSessions = async (date = selectedDate) => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/sessions?date=${date}`);
      if (res.ok) {
        const json: SessionsResponse = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Gagal memuat sesi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions(selectedDate);
    const interval = setInterval(() => fetchSessions(selectedDate), 5000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const handleDeleteSession = async (id: string, name: string) => {
    if (!confirm(`Hapus riwayat sesi customer "${name}"?`)) return;
    try {
      const res = await fetch(`${API}/api/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSessions(selectedDate);
      }
    } catch (err) {
      alert("Gagal menghapus sesi: " + err);
    }
  };

  const handleCopyWhatsAppText = () => {
    if (!data) return;
    const { summary, sessions, date } = data;

    let text = `*REKAP PENJUALAN IGNOS STUDIO*\n`;
    text += `Tanggal: ${formatDateIndo(date)}\n`;
    text += `------------------------------------\n`;
    text += `👥 Total Sesi: ${summary.totalSessions} Sesi (${summary.totalPeople} Orang)\n`;
    text += `🖨️ Kertas 4R: ${summary.totalPrints.total4R} Lembar (${summary.totalPrints.regular} Reguler + ${summary.totalPrints.bonus} Bonus)\n`;
    if (summary.totalPrints.a4 > 0) {
      text += `📄 Kertas A4: ${summary.totalPrints.a4} Lembar\n`;
    }
    text += `🎁 Softcopy: ${summary.softcopy.storyFree} Story Gratis | ${summary.softcopy.paid} Bayar (+${formatRupiah(summary.softcopy.paidRevenue)})\n`;
    text += `------------------------------------\n`;
    text += `💰 *TOTAL OMSET: ${formatRupiah(summary.totalOmset)}*\n`;
    text += `------------------------------------\n\n`;

    text += `*Rincian Sesi Hari Ini:*\n`;
    sessions.forEach((s, idx) => {
      const softcopyLabel = s.makeStory ? "Story Gratis" : `Softcopy Bayar (+${formatRupiah(s.softcopyCharge)})`;
      const addonsStr = s.miscAddons?.length > 0 ? `, Addon: ${s.miscAddons.map((a) => `${a.name} (${a.qty}x)`).join(", ")}` : "";
      text += `${idx + 1}. [${s.time}] ${s.customerName} - ${s.coupleMode ? "Couple" : `${s.peopleCount} org`} (${s.prints.total} lembar 4R, ${softcopyLabel}${addonsStr}) -> ${formatRupiah(s.totalPrice)}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrintClosingReceipt = async () => {
    if (!data || data.sessions.length === 0) {
      alert("Belum ada data sesi untuk dicetak struk rekapnya!");
      return;
    }
    try {
      setPrintingReceipt(true);
      const { jsPDF } = await import("jspdf");

      const W = 80;
      const H = 160 + data.sessions.length * 12;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [W, H],
      });

      let y = 10;
      const margin = 5;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("IGNOS STUDIO", W / 2, y, { align: "center" });
      y += 6;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("REKAP CLOSING SHIFT", W / 2, y, { align: "center" });
      y += 5;
      pdf.text(formatDateIndo(data.date), W / 2, y, { align: "center" });
      y += 6;

      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(margin, y, W - margin, y);
      y += 5;

      const drawRow = (label: string, val: string, bold = false) => {
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(9);
        pdf.text(label, margin, y);
        pdf.text(val, W - margin, y, { align: "right" });
        y += 5;
      };

      drawRow("Total Sesi:", `${data.summary.totalSessions} sesi`);
      drawRow("Total Orang:", `${data.summary.totalPeople} orang`);
      drawRow("Kertas 4R:", `${data.summary.totalPrints.total4R} lembar`);
      if (data.summary.totalPrints.a4 > 0) {
        drawRow("Cetak A4:", `${data.summary.totalPrints.a4} lembar`);
      }
      drawRow("Softcopy Story:", `${data.summary.softcopy.storyFree}x (gratis)`);
      drawRow("Softcopy Bayar:", `${data.summary.softcopy.paid}x (+${formatRupiah(data.summary.softcopy.paidRevenue)})`);

      y += 2;
      pdf.line(margin, y, W - margin, y);
      y += 6;

      drawRow("TOTAL OMSET:", formatRupiah(data.summary.totalOmset), true);

      y += 4;
      pdf.line(margin, y, W - margin, y);
      y += 6;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("DAFTAR TRANSAKSI:", margin, y);
      y += 5;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      data.sessions.forEach((s, idx) => {
        pdf.text(`${idx + 1}. [${s.time}] ${s.customerName}`, margin, y);
        pdf.text(formatRupiah(s.totalPrice), W - margin, y, { align: "right" });
        y += 4.5;
      });

      y += 6;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("Tanda Tangan Kasir:", margin, y);
      y += 18;
      pdf.text("(...................................)", margin, y);

      const blob = pdf.output("blob");
      const formData = new FormData();
      const filename = `rekap-shift-${data.date}.pdf`;
      formData.append("file", blob, filename);

      await fetch(`${API}/api/save-print?label=rekap-shift&printProfile=struk`, {
        method: "POST",
        body: formData,
      });

      alert("Struk Rekap Shift berhasil dikirim ke printer struk!");
    } catch (err: any) {
      alert("Gagal mencetak struk: " + err.message);
    } finally {
      setPrintingReceipt(false);
    }
  };

  const filteredSessionsList = useMemo(() => {
    if (!data) return [];
    let list = data.sessions;

    if (packageFilter === "couple") {
      list = list.filter((s) => s.coupleMode);
    } else if (packageFilter === "group") {
      list = list.filter((s) => !s.coupleMode);
    } else if (packageFilter === "story") {
      list = list.filter((s) => s.makeStory);
    } else if (packageFilter === "paid") {
      list = list.filter((s) => !s.makeStory);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.customerName.toLowerCase().includes(q) ||
        s.time.includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.driveFolderName && s.driveFolderName.toLowerCase().includes(q)),
    );
  }, [data, searchQuery, packageFilter]);

  const latestSession: SessionRecord | null = useMemo(() => {
    if (!data || data.sessions.length === 0) return null;
    return data.sessions[data.sessions.length - 1];
  }, [data]);

  return (
    <AdminLayout>
      <div className="w-full max-w-[1620px] mx-auto px-6 md:px-9 py-8 space-y-6">
        {/* ── 1. GREETING & DATE (Amara: dash-heading) ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-1">
          <div>
            <p className="text-[10px] tracking-[0.14em] text-[#999] uppercase font-medium">
              A LITTLE CARE, IN EVERY DETAIL.
            </p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.045em] text-[#202020] leading-[1.25] mt-1.5">
              Selamat {greetingTime}, Admin.
            </h1>
            <p className="text-[13px] text-[#888] leading-[1.8] mt-1">
              Ini ringkasan aktivitas sesi foto, pemakaian kertas, dan omset Ignos Studio. Semuanya dalam satu tempat.
            </p>
          </div>

          {/* Date Indicator (Amara: dash-date) */}
          <div className="flex items-center gap-2 text-[13px] text-[#666] bg-white border border-[#e8e8e8] rounded-[8px] px-3.5 py-2 shrink-0 self-start md:self-auto">
            <Calendar size={15} strokeWidth={1.5} className="text-[#888]" />
            <time className="font-medium text-[#444]">{formatDateIndo(selectedDate)}</time>
            <span className="text-[11px] text-[#aaa] border-l border-[#ddd] pl-2 font-normal">WIB</span>
          </div>
        </div>

        {/* ── 2. SYSTEM NOTICE BANNER (Amara: demo-notice) ── */}
        <div className="flex items-center gap-2.5 border border-[#e8e8e8] rounded-[9px] px-3.5 py-2.5 bg-white text-[13px] text-[#888] leading-[1.8]">
          <Info size={15} strokeWidth={1.5} className="text-[#888] shrink-0" />
          <p className="min-w-0 truncate">
            <strong className="font-medium text-[#333]">Mode Operasional Kiosk.</strong>{" "}
            Data transaksi, pemakaian kertas, dan tautan Google Drive otomatis tersinkronisasi saat sesi customer selesai.
          </p>
          <span className="text-[10px] tracking-[0.08em] text-[#777] ml-auto uppercase font-medium whitespace-nowrap pl-4 hidden sm:inline">
            LIVE TERMINAL
          </span>
        </div>

        {/* ── 3. OVERVIEW CONTROLS (Amara: overview-top) ── */}
        <section aria-label="Ringkasan Harian" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-semibold text-[#202020] tracking-[-0.03em]">
                Ringkasan Harian
              </h2>
              <span className="text-[13px] text-[#999] border-l border-[#ddd] pl-3">
                {formatDateIndo(selectedDate)}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Quick Date Buttons */}
              <div className="flex items-center gap-1 bg-[#f4f4f4] p-1 rounded-[7px] border border-[#e8e8e8]">
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className={`px-2.5 py-1 rounded-[5px] text-[12px] font-medium transition-colors cursor-pointer ${
                    selectedDate === todayStr
                      ? "bg-white text-[#202020] shadow-xs"
                      : "text-[#666] hover:text-[#171717]"
                  }`}
                >
                  Hari Ini
                </button>
                {data?.allAvailableDates
                  ?.filter((d) => d !== todayStr)
                  .slice(0, 2)
                  .map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDate(d)}
                      className={`px-2.5 py-1 rounded-[5px] text-[12px] font-medium transition-colors cursor-pointer ${
                        selectedDate === d
                          ? "bg-white text-[#202020] shadow-xs"
                          : "text-[#666] hover:text-[#171717]"
                      }`}
                    >
                      {d.slice(5)}
                    </button>
                  ))}
              </div>

              {/* Period Field Date Picker (Amara: period-field) */}
              <label className="flex items-center gap-2 border border-[#e2e2e2] bg-white rounded-[7px] px-2.5 py-1 text-[13px] text-[#555] cursor-pointer hover:border-[#ccc] transition-colors">
                <Calendar size={14} strokeWidth={1.5} className="text-[#888]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border-0 bg-transparent text-[13px] text-[#555] outline-none cursor-pointer p-0"
                />
              </label>

              {/* Salin WA Button */}
              <button
                type="button"
                onClick={handleCopyWhatsAppText}
                disabled={!data || data.sessions.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e6e6e6] text-[#333] hover:bg-[#f4f4f4] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                title="Salin rekap ke format WhatsApp"
              >
                {copied ? <Check size={13} strokeWidth={2} /> : <Copy size={13} strokeWidth={1.5} />}
                <span>{copied ? "Tersalin" : "Salin WA"}</span>
              </button>

              {/* Cetak Struk Rekap */}
              <button
                type="button"
                onClick={handlePrintClosingReceipt}
                disabled={printingReceipt || !data || data.sessions.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#171717] text-white hover:bg-black rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                title="Cetak struk rekap thermal 80mm"
              >
                <FileText size={13} strokeWidth={1.5} />
                <span>{printingReceipt ? "Mencetak..." : "Cetak Struk"}</span>
              </button>

              {/* Refresh Button (Amara: dash-icon-button) */}
              <button
                type="button"
                onClick={() => fetchSessions(selectedDate)}
                disabled={loading}
                className="w-[32px] h-[32px] rounded-full border border-[#e6e6e6] bg-white hover:bg-[#f4f4f4] inline-flex items-center justify-center text-[#666] cursor-pointer transition-colors"
                title="Perbarui data"
              >
                <RefreshCw size={14} strokeWidth={1.5} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* ── 4. 4 METRIC CARDS (Amara: metric-grid & metric-card) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {/* Card 1: Estimasi Nilai Omset */}
            <article className="bg-white border border-[#e5e5e5] rounded-[12px] p-5 min-h-[155px] flex flex-col justify-between hover:border-[#d0d0d0] transition-colors">
              <div className="flex justify-between items-center text-[13px] text-[#888] leading-none">
                <span>Estimasi nilai omset</span>
                <DollarSign size={16} strokeWidth={1.5} className="text-[#888]" />
              </div>
              <div>
                <p className="text-[32px] leading-tight tracking-[-0.05em] font-semibold text-[#202020] mt-3.5">
                  {formatRupiah(data?.summary.totalOmset ?? 0)}
                </p>
                <div className="h-[3px] bg-[#eee] rounded-[5px] overflow-hidden mt-3.5">
                  <span
                    className="block h-full bg-[#202020] rounded-[5px] transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((data?.summary.totalOmset ?? 0) / 2500000) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[12px] text-[#999] leading-[1.7] mt-2">
                  Sesi dasar + addon + softcopy di periode ini
                </p>
              </div>
            </article>

            {/* Card 2: Total Sesi Foto */}
            <article className="bg-white border border-[#e5e5e5] rounded-[12px] p-5 min-h-[155px] flex flex-col justify-between hover:border-[#d0d0d0] transition-colors">
              <div className="flex justify-between items-center text-[13px] text-[#888] leading-none">
                <span>Total sesi foto</span>
                <Users size={16} strokeWidth={1.5} className="text-[#888]" />
              </div>
              <div>
                <p className="text-[32px] leading-tight tracking-[-0.05em] font-semibold text-[#202020] mt-3.5">
                  {data?.summary.totalSessions ?? 0}
                  <small className="text-[16px] text-[#aaa] font-normal tracking-[-0.02em] ml-1">
                    sesi
                  </small>
                </p>
                <div className="h-[3px] bg-[#eee] rounded-[5px] overflow-hidden mt-3.5">
                  <span
                    className="block h-full bg-[#202020] rounded-[5px] transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (data?.summary.totalSessions ?? 0) * 5)}%`,
                    }}
                  />
                </div>
                <p className="text-[12px] text-[#999] leading-[1.7] mt-2">
                  Total {data?.summary.totalPeople ?? 0} orang berfoto
                </p>
              </div>
            </article>

            {/* Card 3: Kertas Foto 4R Terpakai */}
            <article className="bg-white border border-[#e5e5e5] rounded-[12px] p-5 min-h-[155px] flex flex-col justify-between hover:border-[#d0d0d0] transition-colors">
              <div className="flex justify-between items-center text-[13px] text-[#888] leading-none">
                <span>Kertas foto terpakai</span>
                <Printer size={16} strokeWidth={1.5} className="text-[#888]" />
              </div>
              <div>
                <p className="text-[32px] leading-tight tracking-[-0.05em] font-semibold text-[#202020] mt-3.5">
                  {data?.summary.totalPrints.total4R ?? 0}
                  <small className="text-[16px] text-[#aaa] font-normal tracking-[-0.02em] ml-1">
                    lembar
                  </small>
                </p>
                <div className="h-[3px] bg-[#eee] rounded-[5px] overflow-hidden mt-3.5">
                  <span
                    className="block h-full bg-[#202020] rounded-[5px] transition-all duration-500"
                    style={{
                      width: `${Math.min(100, ((data?.summary.totalPrints.total4R ?? 0) / 100) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[12px] text-[#999] leading-[1.7] mt-2 truncate">
                  {data?.summary.totalPrints.regular ?? 0} reguler + {data?.summary.totalPrints.bonus ?? 0} bonus
                  {(data?.summary.totalPrints.a4 ?? 0) > 0 && ` · ${data?.summary.totalPrints.a4} A4`}
                </p>
              </div>
            </article>

            {/* Card 4: Softcopy Story & Bayar */}
            <article className="bg-white border border-[#e5e5e5] rounded-[12px] p-5 min-h-[155px] flex flex-col justify-between hover:border-[#d0d0d0] transition-colors">
              <div className="flex justify-between items-center text-[13px] text-[#888] leading-none">
                <span>Softcopy story & bayar</span>
                <Gift size={16} strokeWidth={1.5} className="text-[#888]" />
              </div>
              <div>
                <p className="text-[32px] leading-tight tracking-[-0.05em] font-semibold text-[#202020] mt-3.5">
                  {data?.summary.softcopy.storyFree ?? 0}
                  <small className="text-[16px] text-[#aaa] font-normal tracking-[-0.02em] mx-1">
                    /
                  </small>
                  {data?.summary.softcopy.paid ?? 0}
                </p>
                <div className="h-[3px] bg-[#eee] rounded-[5px] overflow-hidden mt-3.5">
                  <span
                    className="block h-full bg-[#202020] rounded-[5px] transition-all duration-500"
                    style={{
                      width: `${
                        (data?.summary.softcopy.storyFree ?? 0) + (data?.summary.softcopy.paid ?? 0) > 0
                          ? Math.round(
                              ((data?.summary.softcopy.storyFree ?? 0) /
                                ((data?.summary.softcopy.storyFree ?? 0) + (data?.summary.softcopy.paid ?? 0))) *
                                100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="text-[12px] text-[#999] leading-[1.7] mt-2">
                  {data?.summary.softcopy.storyFree ?? 0} Story gratis · {data?.summary.softcopy.paid ?? 0} Bayar ({formatRupiah(data?.summary.softcopy.paidRevenue ?? 0)})
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* ── 5. MIDDLE PANELS: ADD-ONS & LATEST ACTIVITY (Amara: dash-middle-grid) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Panel 1: Rincian Layanan & Addons (8 cols) */}
          <section className="lg:col-span-7 bg-white border border-[#e5e5e5] rounded-[14px] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#eee]">
                <div>
                  <p className="text-[10px] tracking-[0.12em] text-[#999] uppercase font-medium">
                    SERVICE & ADD-ONS BREAKDOWN
                  </p>
                  <h2 className="text-[20px] font-semibold text-[#202020] tracking-[-0.035em] mt-1">
                    Rincian Add-ons & Sesi
                  </h2>
                </div>
                <span className="text-[12px] bg-[#f4f4f4] border border-[#e8e8e8] rounded-[5px] px-2.5 py-1 text-[#666] font-medium">
                  {data?.summary.addonsSummary?.length ?? 0} Jenis Add-on
                </span>
              </div>

              {/* Addons List */}
              <div className="py-4">
                {(data?.summary.addonsSummary?.length ?? 0) > 0 ? (
                  <div className="space-y-2.5">
                    {data?.summary.addonsSummary.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-3 rounded-[9px] bg-[#fafafa] border border-[#ebebeb] hover:bg-[#f6f6f6] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[7px] bg-white border border-[#e5e5e5] flex items-center justify-center text-[#555]">
                            <ShoppingBag size={14} strokeWidth={1.5} />
                          </div>
                          <div>
                            <strong className="text-[13px] font-medium text-[#202020] block">
                              {item.name}
                            </strong>
                            <span className="text-[11px] text-[#888] block">
                              Terjual {item.qty} item pada sesi hari ini
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[13px] font-semibold text-[#202020] block font-mono">
                            {formatRupiah(item.revenue)}
                          </span>
                          <span className="text-[10px] bg-[#eee] text-[#555] px-1.5 py-0.5 rounded font-mono">
                            {item.qty}x
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-[#999]">
                    <ShoppingBag size={24} strokeWidth={1.5} className="mx-auto mb-2 text-[#ccc]" />
                    <p className="text-[13px] font-medium text-[#666]">
                      Belum ada add-on tambahan yang terjual hari ini.
                    </p>
                    <p className="text-[11px] text-[#aaa] mt-0.5">
                      Penjualan add-on seperti cetak ekstra dan bingkai akan tampil di sini.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick summary footer stats */}
            <div className="pt-4 border-t border-[#eee] grid grid-cols-3 gap-3 text-[12px]">
              <div>
                <span className="text-[#888] block text-[11px]">Rasio Couple</span>
                <strong className="text-[#202020] font-medium text-[13px]">
                  {data?.sessions.length
                    ? `${Math.round(
                        (data.sessions.filter((s) => s.coupleMode).length / data.sessions.length) * 100,
                      )}%`
                    : "0%"}
                </strong>
              </div>
              <div>
                <span className="text-[#888] block text-[11px]">Story Gratis</span>
                <strong className="text-[#202020] font-medium text-[13px]">
                  {data?.summary.softcopy.storyFree ?? 0} Sesi
                </strong>
              </div>
              <div>
                <span className="text-[#888] block text-[11px]">Rata-rata 4R</span>
                <strong className="text-[#202020] font-medium text-[13px]">
                  {data?.summary.totalSessions
                    ? `${(
                        (data.summary.totalPrints.total4R ?? 0) /
                        (data.summary.totalSessions || 1)
                      ).toFixed(1)} lbr/sesi`
                    : "0 lbr"}
                </strong>
              </div>
            </div>
          </section>

          {/* Panel 2: Latest Activity Spotlight (Amara: activity-panel) (5 cols) */}
          <aside className="lg:col-span-5 bg-white border border-[#e5e5e5] rounded-[14px] overflow-hidden flex flex-col justify-between">
            {/* Top Photo / Branding Header */}
            <div className="h-[120px] bg-gradient-to-br from-[#171717] via-[#262626] to-[#3a3a3a] relative p-5 flex flex-col justify-between text-white">
              <div className="flex items-center justify-between">
                <span className="text-[10px] tracking-[0.14em] text-white/70 uppercase font-medium">
                  IGNOS PHOTOBOOTH STATION
                </span>
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                  <Camera size={13} className="text-white" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-[12px] font-medium text-white/90">
                Satu senyuman. Banyak kenangan.
              </p>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 pb-3">
                  <p className="text-[10px] tracking-[0.12em] text-[#999] uppercase font-medium">
                    SESI TERAKHIR DI STUDIO
                  </p>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-[11px] bg-[#f1f1f1] text-[#555]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    {latestSession ? "Selesai" : "Standby"}
                  </span>
                </div>

                {latestSession ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-[36px] h-[36px] rounded-full bg-[#f1f1f1] text-[#555] font-semibold text-[13px] flex items-center justify-center shrink-0">
                        {getInitials(latestSession.customerName)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-medium text-[#202020] truncate">
                          {latestSession.customerName}
                        </h3>
                        <p className="text-[12px] text-[#888] truncate">
                          {latestSession.coupleMode ? "Couple Mode" : `${latestSession.peopleCount} Orang`} · {latestSession.prints.total} lembar 4R
                        </p>
                      </div>
                    </div>

                    <dl className="text-[13px] space-y-1.5 pt-1">
                      <div className="flex justify-between py-1 border-b border-[#f5f5f5]">
                        <dt className="text-[#888]">Waktu Sesi</dt>
                        <dd className="font-mono text-[#444] font-medium">{latestSession.time} WIB</dd>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#f5f5f5]">
                        <dt className="text-[#888]">Format Softcopy</dt>
                        <dd className="text-[#444]">{latestSession.makeStory ? "Story Gratis" : "Softcopy Bayar"}</dd>
                      </div>
                      <div className="flex justify-between py-1">
                        <dt className="text-[#888]">Total Transaksi</dt>
                        <dd className="font-semibold text-[#202020] font-mono">{formatRupiah(latestSession.totalPrice)}</dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <div className="py-6 text-center text-[#999]">
                    <Clock size={20} strokeWidth={1.5} className="mx-auto mb-1.5 text-[#ccc]" />
                    <p className="text-[13px] text-[#666]">Belum ada sesi di terminal hari ini.</p>
                  </div>
                )}
              </div>

              {latestSession?.driveWebViewLink && (
                <a
                  href={latestSession.driveWebViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full mt-4 flex items-center justify-between text-[13px] text-[#444] hover:text-[#171717] pt-3 border-t border-[#eee] transition-colors"
                >
                  <span>Buka arsip foto Google Drive</span>
                  <ArrowUpRight size={15} strokeWidth={1.5} />
                </a>
              )}
            </div>
          </aside>
        </div>

        {/* ── 6. LOG TRANSAKSI TABLE (Amara: reservations-panel & bookings-table) ── */}
        <section
          id="reservasi"
          aria-labelledby="reservations-heading"
          className="bg-white border border-[#e5e5e5] rounded-[14px] overflow-hidden"
        >
          {/* Table Header Controls */}
          <div className="p-5 sm:p-6 border-b border-[#eee] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] tracking-[0.14em] text-[#999] uppercase font-medium">
                THE PEOPLE BEHIND EACH SESSION
              </p>
              <h2
                id="reservations-heading"
                className="text-[20px] font-semibold text-[#202020] tracking-[-0.035em] mt-1 flex items-center gap-2.5"
              >
                <span>Log Transaksi Sesi Foto</span>
                <span className="text-[12px] tracking-normal bg-[#f4f4f4] border border-[#e8e8e8] rounded-[5px] px-2 py-0.5 text-[#888] font-normal">
                  {filteredSessionsList.length}
                </span>
              </h2>
              <p className="text-[13px] text-[#888] mt-1">
                Semua sesi foto dan arsip cetak yang tercatat dari terminal kiosk.
              </p>
            </div>

            {/* Filter & Search controls (Amara: table-controls) */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search Field (Amara: search-field) */}
              <label className="flex items-center gap-2 border border-[#e3e3e3] rounded-[7px] px-2.5 py-1.5 bg-white text-[13px] w-full sm:w-60 focus-within:border-[#999] transition-colors">
                <Search size={14} strokeWidth={1.5} className="text-[#aaa]" />
                <input
                  type="search"
                  placeholder="Cari nama atau jam..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 outline-none w-full text-[13px] bg-transparent text-[#333] placeholder:text-[#aaa]"
                />
              </label>

              {/* Package filter select */}
              <select
                value={packageFilter}
                onChange={(e) => setPackageFilter(e.target.value)}
                className="border border-[#e3e3e3] rounded-[7px] px-2.5 py-1.5 text-[13px] text-[#666] bg-white outline-none cursor-pointer hover:border-[#ccc]"
                aria-label="Filter paket sesi"
              >
                <option value="all">Semua Paket</option>
                <option value="couple">Couple Mode</option>
                <option value="group">Personal / Group</option>
                <option value="story">Story Gratis</option>
                <option value="paid">Softcopy Bayar</option>
              </select>
            </div>
          </div>

          {/* Table Container (Amara: table-scroll & bookings-table) */}
          {filteredSessionsList.length === 0 ? (
            <div className="py-16 text-center">
              <Search size={24} strokeWidth={1.5} className="text-[#aaa] mx-auto mb-2" />
              <h3 className="text-[18px] font-semibold text-[#202020] tracking-[-0.03em]">
                Belum ada yang cocok.
              </h3>
              <p className="text-[13px] text-[#888] mt-1">
                Coba kata kunci pencarian atau ganti filter tanggal di atas.
              </p>
              {(searchQuery || packageFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPackageFilter("all");
                  }}
                  className="mt-3.5 text-[13px] text-[#171717] font-medium border-b border-[#202020] pb-0.5 cursor-pointer hover:opacity-75"
                >
                  Reset filter
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left min-w-[700px]">
                <thead>
                  <tr className="bg-[#fafafa] border-t border-b border-[#eee] text-[12px] font-normal text-[#999]">
                    <th className="py-3 px-5 whitespace-nowrap">Customer</th>
                    <th className="py-3 px-4 whitespace-nowrap">Waktu</th>
                    <th className="py-3 px-4 whitespace-nowrap">Paket Sesi</th>
                    <th className="py-3 px-4 whitespace-nowrap">Kertas Cetak</th>
                    <th className="py-3 px-4 whitespace-nowrap">Softcopy</th>
                    <th className="py-3 px-4 whitespace-nowrap">Add-ons</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Total</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Drive</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0] text-[13px]">
                  {filteredSessionsList.map((s) => (
                    <tr key={s.id} className="hover:bg-[#fafafa] transition-colors">
                      {/* Customer (Amara: table-guest style with avatar) */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-[#f1f1f1] text-[#666] font-medium text-[12px] flex items-center justify-center shrink-0">
                            {getInitials(s.customerName)}
                          </span>
                          <div className="min-w-0">
                            <strong className="text-[14px] font-medium text-[#202020] block truncate">
                              {s.customerName}
                            </strong>
                            <small className="text-[11px] text-[#aaa] font-mono block mt-0.5">
                              {s.id} · {s.coupleMode ? "Couple" : `${s.peopleCount} tamu`}
                            </small>
                          </div>
                        </div>
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[#444] font-medium block">
                          {s.time} WIB
                        </span>
                        <small className="text-[11px] text-[#aaa] block mt-0.5">
                          {selectedDate}
                        </small>
                      </td>

                      {/* Paket Sesi (Amara status-badge) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-[11px] bg-[#f1f1f1] text-[#444]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#555]" />
                          {s.coupleMode ? "Couple Mode" : `${s.peopleCount} Orang`}
                        </span>
                      </td>

                      {/* Prints */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[#333] font-medium">
                          {s.prints?.total ?? s.peopleCount} lembar
                        </span>
                        <small className="text-[11px] text-[#aaa] block mt-0.5">
                          {s.prints?.regular ?? s.peopleCount} reg + {s.prints?.bonus ?? 0} bonus
                        </small>
                      </td>

                      {/* Softcopy */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {s.makeStory ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-[11px] bg-[#ecfdf5] text-[#065f46]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                            Story Gratis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-[11px] bg-[#fffbeb] text-[#92400e]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                            +Rp 25.000 Bayar
                          </span>
                        )}
                      </td>

                      {/* Addons */}
                      <td className="py-3.5 px-4">
                        {s.miscAddons?.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {s.miscAddons.map((a, i) => (
                              <span key={i} className="text-[11px] text-[#666]">
                                {a.name} ({a.qty}x)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#aaa] text-[12px]">—</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-semibold text-[#202020] font-mono text-[14px]">
                          {formatRupiah(s.totalPrice)}
                        </span>
                      </td>

                      {/* Google Drive Link (Amara circular detail button) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {s.driveWebViewLink ? (
                          <a
                            href={s.driveWebViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="w-7 h-7 rounded-full border border-[#e7e7e7] inline-flex items-center justify-center text-[#666] hover:bg-[#171717] hover:text-white hover:border-[#171717] transition-all"
                            title="Buka Folder Google Drive"
                          >
                            <ExternalLink size={12} strokeWidth={1.5} />
                          </a>
                        ) : (
                          <span className="text-[#ccc] text-[11px]">—</span>
                        )}
                      </td>

                      {/* Action Hapus */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(s.id, s.customerName)}
                          className="w-7 h-7 rounded-full text-[#aaa] hover:text-[#dc2626] hover:bg-[#fef2f2] inline-flex items-center justify-center transition-colors cursor-pointer"
                          title="Hapus sesi"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer (Amara: table-footer) */}
          <div className="flex justify-between items-center px-6 py-4 border-t border-[#eee] text-[12px] text-[#aaa]">
            <span>
              Menampilkan {filteredSessionsList.length} dari {data?.sessions.length ?? 0} sesi foto
            </span>
            <span className="text-[11px] tracking-[0.1em] uppercase hidden sm:inline">
              IGNOS · SINGLE KIOSK BOOTH
            </span>
          </div>
        </section>

        {/* ── 7. DASHBOARD FOOTER (Amara: dash-footer) ── */}
        <footer className="flex justify-between items-center text-[12px] text-[#aaa] pt-2 pb-6 border-t border-[#eee]">
          <p>© 2026 Ignos Studio. Photobooth Station.</p>
          <span className="hidden sm:inline">Tenang di depan. Tertata di balik layar.</span>
        </footer>
      </div>
    </AdminLayout>
  );
}
