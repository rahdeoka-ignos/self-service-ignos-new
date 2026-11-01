import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  FileText,
  Search,
  ArrowUpRight,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfirmModal } from "../components/AdminConfirmModal";
import { usePageTitle } from "../../hooks/usePageTitle";
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
  usePageTitle("Dashboard Operasional — Ignos");

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

  // Reusable modal state conforming to GEMINI.md
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    category?: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    variant?: "danger" | "warning" | "info" | "success";
    singleButton?: boolean;
    onConfirm?: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    description: "",
  });

  const greetingTime = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return "Pagi";
    if (hour < 15) return "Siang";
    if (hour < 18) return "Sore";
    return "Malam";
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

  const handleDeleteSession = (id: string, name: string) => {
    setModalConfig({
      isOpen: true,
      title: `Hapus Sesi "${name}"?`,
      category: "Konfirmasi Penghapusan Sesi",
      description: `Riwayat transaksi sesi ID ${id} atas nama "${name}" akan dihapus permanen dari rekap lokal studio.`,
      confirmText: "Hapus Sesi",
      cancelText: "Batal",
      isDangerous: true,
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API}/api/sessions/${id}`, { method: "DELETE" });
          if (res.ok) {
            fetchSessions(selectedDate);
          } else {
            setModalConfig({
              isOpen: true,
              title: "Gagal Menghapus Sesi",
              category: "Terjadi Kendala",
              description: "Server tidak dapat menghapus file rekaman sesi ini. Coba periksa koneksi backend.",
              singleButton: true,
              variant: "warning",
            });
          }
        } catch (err: any) {
          setModalConfig({
            isOpen: true,
            title: "Koneksi Backend Terputus",
            category: "Kendala Jaringan",
            description: "Tidak dapat menghubungi server lokal port 5000: " + err.message,
            singleButton: true,
            variant: "warning",
          });
        }
      },
    });
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
      setModalConfig({
        isOpen: true,
        title: "Belum Ada Transaksi",
        category: "Struk Closing Kasir",
        description: "Tidak ada riwayat sesi customer pada tanggal yang dipilih untuk dicetak struk rekapnya.",
        singleButton: true,
        variant: "info",
      });
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

      setModalConfig({
        isOpen: true,
        title: "Struk Berhasil Dikirim",
        category: "Cetak Rekap Shift",
        description: "File struk rekap harian telah berhasil dikirimkan ke antrian printer thermal kasir.",
        singleButton: true,
        variant: "success",
      });
    } catch (err: any) {
      setModalConfig({
        isOpen: true,
        title: "Gagal Mencetak Struk",
        category: "Kendala Printer",
        description: "Terjadi kesalahan saat memproses cetak struk: " + err.message,
        singleButton: true,
        variant: "warning",
      });
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
      <div className="w-full p-6 md:p-8 space-y-8">
        {/* ── 1. HEADER & CONTROL BAR ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#e8e8e8]">
          <div>
            <p className="text-[10px] tracking-[0.14em] text-[#999] uppercase font-medium">
              OPERASIONAL & LAPORAN HARIAN
            </p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.04em] text-[#202020] leading-[1.25] mt-1.5">
              Selamat {greetingTime}, Admin.
            </h1>
            <p className="text-[13px] text-[#777] leading-[1.8] mt-1 max-w-2xl">
              Ringkasan performa penjualan, pemakaian lembar foto, serta log transaksi Kiosk hari ini.
            </p>
          </div>

          {/* Quick Date Selector & Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* Quick date pills */}
            <div className="flex items-center gap-1 bg-[#f0f0f0] p-1 rounded-[7px] border border-[#e5e5e5]">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 rounded-[5px] text-[12px] font-medium transition-colors cursor-pointer ${
                  selectedDate === todayStr
                    ? "bg-white text-[#171717] shadow-2xs font-semibold"
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
                    className={`px-3 py-1.5 rounded-[5px] text-[12px] font-medium transition-colors cursor-pointer ${
                      selectedDate === d
                        ? "bg-white text-[#171717] shadow-2xs font-semibold"
                        : "text-[#666] hover:text-[#171717]"
                    }`}
                  >
                    {d.slice(5)}
                  </button>
                ))}
            </div>

            {/* Date Picker Input */}
            <label className="flex items-center gap-2 border border-[#e2e2e2] bg-white rounded-[7px] px-3 py-1.5 text-[12px] text-[#555] cursor-pointer hover:border-[#ccc] transition-colors">
              <Calendar size={13} className="text-[#888]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border-0 bg-transparent text-[12px] text-[#444] outline-none cursor-pointer p-0 font-medium"
              />
            </label>

            {/* Salin WA */}
            <button
              type="button"
              onClick={handleCopyWhatsAppText}
              disabled={!data || data.sessions.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#e6e6e6] text-[#444] hover:bg-[#f6f6f6] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
              title="Salin rekap penjualan ke format pesan WhatsApp"
            >
              {copied ? <Check size={13} className="text-[#10b981]" /> : <Copy size={13} />}
              <span>{copied ? "Tersalin" : "Salin WA"}</span>
            </button>

            {/* Cetak Struk */}
            <button
              type="button"
              onClick={handlePrintClosingReceipt}
              disabled={printingReceipt || !data || data.sessions.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#171717] text-white hover:bg-black rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
              title="Cetak struk rekap shift ke printer kasir"
            >
              <FileText size={13} />
              <span>{printingReceipt ? "Mencetak..." : "Cetak Struk"}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchSessions(selectedDate)}
              disabled={loading}
              className="w-[34px] h-[34px] rounded-[7px] border border-[#e6e6e6] bg-white hover:bg-[#f6f6f6] inline-flex items-center justify-center text-[#666] cursor-pointer transition-colors"
              title="Segarkan data sesi"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-[#888]" : "text-[#888]"} />
            </button>
          </div>
        </div>

        {/* ── 2. 4 EXECUTIVE KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Omset */}
          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Total Omset Hari Ini</span>
            <div>
              <div className="text-[26px] font-semibold text-[#171717] font-mono tracking-tight">
                {formatRupiah(data?.summary.totalOmset ?? 0)}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                Akumulasi seluruh paket, cetak & add-ons
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Rata-rata: {data?.summary.totalSessions ? formatRupiah(Math.round((data.summary.totalOmset ?? 0) / data.summary.totalSessions)) : "Rp 0"} / sesi</span>
            </div>
          </div>

          {/* Card 2: Total Sesi Foto */}
          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Total Sesi Foto</span>
            <div>
              <div className="text-[26px] font-semibold text-[#171717] font-mono tracking-tight">
                {data?.summary.totalSessions ?? 0}
                <span className="text-[14px] text-[#888] font-normal font-sans ml-1">sesi</span>
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                Total {data?.summary.totalPeople ?? 0} pengunjung terlayani
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Couple: {data?.sessions.filter((s) => s.coupleMode).length ?? 0}</span>
              <span>Grup: {data?.sessions.filter((s) => !s.coupleMode).length ?? 0}</span>
            </div>
          </div>

          {/* Card 3: Lembaran Kertas Terpakai */}
          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Kertas Foto Terpakai</span>
            <div>
              <div className="text-[26px] font-semibold text-[#171717] font-mono tracking-tight">
                {data?.summary.totalPrints.total4R ?? 0}
                <span className="text-[14px] text-[#888] font-normal font-sans ml-1">lbr</span>
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                {data?.summary.totalPrints.regular ?? 0} reguler + {data?.summary.totalPrints.bonus ?? 0} bonus
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Cetak 4R: {data?.summary.totalPrints.total4R ?? 0}</span>
              <span>Cetak A4: {data?.summary.totalPrints.a4 ?? 0}</span>
            </div>
          </div>

          {/* Card 4: Softcopy Story & Bayar */}
          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Klaim Softcopy Drive</span>
            <div>
              <div className="text-[26px] font-semibold text-[#171717] font-mono tracking-tight">
                {data?.summary.softcopy.storyFree ?? 0}
                <span className="text-[16px] text-[#aaa] font-normal mx-1">/</span>
                {data?.summary.softcopy.paid ?? 0}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                {data?.summary.softcopy.storyFree ?? 0} promo story · {data?.summary.softcopy.paid ?? 0} berbayar
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Pendapatan Softcopy:</span>
              <span className="font-mono text-[#171717] font-medium">{formatRupiah(data?.summary.softcopy.paidRevenue ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* ── 3. MIDDLE PANELS: ADD-ONS BREAKDOWN & RECENT SESSION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Panel 1: Rincian Penjualan Add-Ons (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div className="pb-4 border-b border-[#f0f0f0] flex items-center justify-between">
                <div>
                  <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                    Penjualan Add-Ons & Merchandise
                  </h2>
                  <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                    Rincian barang tambahan yang dibeli pengunjung di luar paket dasar.
                  </p>
                </div>
                <span className="text-[12px] text-[#888] font-normal shrink-0">
                  {data?.summary.addonsSummary?.length ?? 0} jenis item
                </span>
              </div>

              <div className="py-2">
                {(data?.summary.addonsSummary?.length ?? 0) > 0 ? (
                  <div className="divide-y divide-[#f2f2f2]">
                    {data?.summary.addonsSummary.map((item) => (
                      <div
                        key={item.name}
                        className="py-3.5 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <span className="text-[13px] font-medium text-[#202020] block">
                            {item.name}
                          </span>
                          <span className="text-[11px] text-[#888] block mt-0.5">
                            Terjual {item.qty} pcs pada sesi hari ini
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[13px] font-semibold text-[#202020] font-mono block">
                            {formatRupiah(item.revenue)}
                          </span>
                          <span className="text-[11px] text-[#888] font-mono">
                            {item.qty} item
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center space-y-1">
                    <p className="text-[13px] font-medium text-[#202020]">Belum ada add-ons terjual</p>
                    <p className="text-[12px] text-[#888]">
                      Penjualan gantungan kunci, cetak ekstra, dan bingkai akan tercatat di sini.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#f0f0f0] flex items-center justify-between text-[12px] text-[#777]">
              <span>Rasio Customer Couple: <strong className="text-[#202020] font-medium font-mono">{data?.sessions.length ? `${Math.round((data.sessions.filter((s) => s.coupleMode).length / data.sessions.length) * 100)}%` : "0%"}</strong></span>
              <span>Rata-rata 4R: <strong className="text-[#202020] font-medium font-mono">{data?.summary.totalSessions ? `${((data.summary.totalPrints.total4R ?? 0) / (data.summary.totalSessions || 1)).toFixed(1)} lbr` : "0 lbr"}</strong></span>
            </div>
          </div>

          {/* Panel 2: Aktivitas Sesi Terakhir (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div className="pb-4 border-b border-[#f0f0f0] flex items-center justify-between">
                <div>
                  <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                    Aktivitas Sesi Terakhir
                  </h2>
                  <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                    Transaksi pengunjung paling akhir di terminal Kiosk.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  <span className="text-[12px] text-[#666] font-medium">{latestSession ? "Selesai" : "Standby"}</span>
                </div>
              </div>

              {latestSession ? (
                <div className="py-3 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-[#f1f1f1] text-[#202020] font-semibold text-[13px] flex items-center justify-center shrink-0">
                      {getInitials(latestSession.customerName)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-medium text-[#202020] truncate">
                        {latestSession.customerName}
                      </h3>
                      <p className="text-[12px] text-[#888] truncate">
                        {latestSession.coupleMode ? "Couple Mode" : `${latestSession.peopleCount} Orang`} · {latestSession.prints.total} lembar 4R
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-[#f2f2f2] text-[13px]">
                    <div className="py-2.5 flex justify-between">
                      <span className="text-[#888]">Waktu Transaksi</span>
                      <span className="font-mono text-[#202020] font-medium">{latestSession.time} WIB</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-[#888]">Status Softcopy</span>
                      <span className="text-[#202020]">{latestSession.makeStory ? "Promo Story (Gratis)" : "Softcopy Berbayar"}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-[#888]">Total Tagihan</span>
                      <span className="font-semibold text-[#202020] font-mono">{formatRupiah(latestSession.totalPrice)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-[#888] text-[13px]">
                  Belum ada sesi tercatat di terminal hari ini.
                </div>
              )}
            </div>

            {latestSession?.driveWebViewLink && (
              <a
                href={latestSession.driveWebViewLink}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between text-[12px] font-medium text-[#202020] hover:underline pt-4 border-t border-[#f0f0f0] transition-colors"
              >
                <span>Buka folder Google Drive sesi ini</span>
                <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        </div>

        {/* ── 4. LOG TRANSAKSI TABLE (Clean & Spacious) ── */}
        <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 space-y-6">
          <div className="pb-4 border-b border-[#f0f0f0] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                  Log Transaksi Sesi Foto
                </h2>
                <span className="text-[12px] text-[#888] font-normal">
                  ({filteredSessionsList.length} dari {data?.sessions.length ?? 0} sesi)
                </span>
              </div>
              <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                Daftar rekaman sesi foto, jumlah cetak kertas, dan tautan Google Drive per customer.
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <div className="flex items-center gap-2 border border-[#e0e0e0] focus-within:border-[#171717] rounded-[7px] px-3 py-1.5 bg-white text-[12px] transition-colors w-full sm:w-56">
                <Search size={13} className="text-[#999] shrink-0" />
                <input
                  type="search"
                  placeholder="Cari nama / jam..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-0 outline-none text-[#202020] placeholder:text-[#aaa] text-[12px] p-0"
                />
              </div>

              <select
                value={packageFilter}
                onChange={(e) => setPackageFilter(e.target.value)}
                className="border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] px-3 py-1.5 text-[12px] text-[#444] bg-white outline-none cursor-pointer"
              >
                <option value="all">Semua Paket</option>
                <option value="couple">Couple Mode</option>
                <option value="group">Personal / Grup</option>
                <option value="story">Story Gratis</option>
                <option value="paid">Softcopy Bayar</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredSessionsList.length === 0 ? (
            <div className="py-16 text-center space-y-1">
              <p className="text-[14px] font-medium text-[#202020]">Belum ada sesi yang cocok</p>
              <p className="text-[12px] text-[#888]">
                Coba ubah kata kunci pencarian atau pilih filter tanggal lain di atas.
              </p>
              {(searchQuery || packageFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPackageFilter("all");
                  }}
                  className="mt-2 text-[12px] text-[#171717] font-medium hover:underline cursor-pointer"
                >
                  Reset filter pencarian
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left min-w-[720px]">
                <thead>
                  <tr className="border-b border-[#eee] text-[11px] font-medium text-[#999] uppercase tracking-[0.06em]">
                    <th className="py-3 px-4 font-medium">Customer</th>
                    <th className="py-3 px-4 font-medium">Waktu</th>
                    <th className="py-3 px-4 font-medium">Paket Sesi</th>
                    <th className="py-3 px-4 font-medium">Cetak Foto</th>
                    <th className="py-3 px-4 font-medium">Softcopy</th>
                    <th className="py-3 px-4 font-medium">Add-ons</th>
                    <th className="py-3 px-4 text-right font-medium">Total</th>
                    <th className="py-3 px-4 text-center font-medium">Drive</th>
                    <th className="py-3 px-4 text-center font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f2f2] text-[13px]">
                  {filteredSessionsList.map((s) => (
                    <tr key={s.id} className="hover:bg-[#fafafa] transition-colors">
                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-[#f1f1f1] text-[#444] font-medium text-[11px] flex items-center justify-center shrink-0">
                            {getInitials(s.customerName)}
                          </span>
                          <div className="min-w-0">
                            <span className="font-medium text-[#202020] block truncate">
                              {s.customerName}
                            </span>
                            <span className="text-[11px] text-[#aaa] font-mono block">
                              {s.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[#444] text-[12px] block">
                          {s.time} WIB
                        </span>
                        <span className="text-[11px] text-[#aaa] block">
                          {selectedDate}
                        </span>
                      </td>

                      {/* Paket Sesi */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[12px] text-[#444]">
                          {s.coupleMode ? "Couple Mode" : `${s.peopleCount} Orang`}
                        </span>
                      </td>

                      {/* Prints */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[#202020] font-mono text-[12px]">
                          {s.prints?.total ?? s.peopleCount} lbr 4R
                        </span>
                        {s.prints?.bonus > 0 && (
                          <span className="text-[11px] text-[#aaa] block">
                            +{s.prints.bonus} bonus
                          </span>
                        )}
                      </td>

                      {/* Softcopy */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {s.makeStory ? (
                          <div className="flex items-center gap-1.5 text-[12px] text-[#10b981]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                            <span>Story Gratis</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[12px] text-[#888]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                            <span>Softcopy Bayar</span>
                          </div>
                        )}
                      </td>

                      {/* Addons */}
                      <td className="py-3.5 px-4">
                        {s.miscAddons?.length > 0 ? (
                          <div className="flex flex-col gap-0.5 text-[11px] text-[#666]">
                            {s.miscAddons.map((a, i) => (
                              <span key={i}>
                                {a.name} ({a.qty}x)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#ccc] text-[12px]">—</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-semibold text-[#202020] font-mono text-[13px]">
                          {formatRupiah(s.totalPrice)}
                        </span>
                      </td>

                      {/* Google Drive Link */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {s.driveWebViewLink ? (
                          <a
                            href={s.driveWebViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="w-7 h-7 rounded-[5px] border border-[#e0e0e0] inline-flex items-center justify-center text-[#666] hover:bg-[#171717] hover:text-white hover:border-[#171717] transition-all"
                            title="Buka Folder Google Drive Customer"
                          >
                            <ExternalLink size={12} />
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
                          className="w-7 h-7 rounded-[5px] text-[#aaa] hover:text-[#dc2626] hover:bg-[#fef2f2] inline-flex items-center justify-center transition-colors cursor-pointer"
                          title="Hapus rekaman sesi ini"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Standard Admin Confirmation Modal ── */}
        <AdminConfirmModal
          isOpen={modalConfig.isOpen}
          onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={modalConfig.onConfirm}
          title={modalConfig.title}
          category={modalConfig.category}
          description={modalConfig.description}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
          isDangerous={modalConfig.isDangerous}
          variant={modalConfig.variant}
          singleButton={modalConfig.singleButton}
        />
      </div>
    </AdminLayout>
  );
}
