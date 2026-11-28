import { apiFetch as fetch } from "../../utils/api";
import { notify } from "../../utils/notify";
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
  Receipt,
  Camera,
  Printer,
  Cloud,
  Wallet,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfirmModal } from "../components/AdminConfirmModal";
import { AdminReceiptPreviewModal } from "../components/AdminReceiptPreviewModal";
import { useBranding } from "../../context/BrandingContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { generateReceiptPdf, ReceiptData, ReceiptItem } from "../../utils/generateReceiptPdf";
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
  // Branch-aware: address, phone & Instagram of this computer's cabang.
  const { effectiveBranding: branding } = useBranding();

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

  // Receipt Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [downloadFn, setDownloadFn] = useState<(() => void) | null>(null);

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
            notify.error("Gagal Menghapus Sesi", "Server tidak dapat menghapus file rekaman sesi ini. Coba periksa koneksi backend.");
          }
        } catch (err: any) {
          notify.error("Koneksi Backend Terputus", "Tidak dapat menghubungi server lokal port 5000: " + err.message);
        }
      },
    });
  };

  const handleCopyWhatsAppText = () => {
    if (!data) return;
    const { summary, sessions, date } = data;

    let text = `*REKAP PENJUALAN ${(branding?.studioName || "IGNOS STUDIO").toUpperCase()}*\n`;
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
      notify.info("Belum Ada Transaksi", "Tidak ada riwayat sesi customer pada tanggal yang dipilih untuk dicetak struk rekapnya.");
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
      pdf.setFontSize(13);
      pdf.text(branding?.receipt?.headerTitle || branding?.studioName || "IGNOS STUDIO", W / 2, y, { align: "center" });
      y += 5.5;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.text(branding?.receipt?.headerSub || "REKAP CLOSING SHIFT", W / 2, y, { align: "center" });
      y += 4.5;

      if (branding?.receipt?.phoneContact) {
        pdf.text(branding.receipt.phoneContact, W / 2, y, { align: "center" });
        y += 4;
      }

      pdf.text(formatDateIndo(data.date), W / 2, y, { align: "center" });
      y += 5.5;

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

      y += 5;
      if (branding?.receipt?.footerNote) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.text(branding.receipt.footerNote, W / 2, y, { align: "center" });
        y += 4;
      }
      if (branding?.receipt?.socialNote) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.text(branding.receipt.socialNote, W / 2, y, { align: "center" });
        y += 4;
      }

      y += 3;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("Tanda Tangan Kasir:", margin, y);
      y += 18;
      pdf.text("(...................................)", margin, y);

      const blob = pdf.output("blob");
      const formData = new FormData();
      const filename = `rekap-shift-${data.date}.pdf`;
      formData.append("file", blob, filename);

      const res = await fetch(`${API}/api/save-print?label=rekap-shift&printProfile=struk`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json().catch(() => ({}));

      if (result.printStatus === "skipped") {
        notify.warning(
          "Rekap Shift Tersimpan",
          `File ${filename} tersimpan, tetapi tidak dicetak karena belum ada profil printer "Struk Thermal". Tambahkan profilnya di Admin → Printer & Kertas jika ingin mencetak.`,
        );
      } else {
        notify.success("Struk Berhasil Dikirim", "File struk rekap harian telah dikirim ke antrean printer thermal kasir.");
      }
    } catch (err: any) {
      notify.error("Gagal Mencetak Struk", "Terjadi kesalahan saat memproses cetak struk: " + err.message);
    } finally {
      setPrintingReceipt(false);
    }
  };

  const handleOpenReceipt = async (s: SessionRecord) => {
    const items: ReceiptItem[] =
      s.items && s.items.length > 0
        ? s.items
        : [
            {
              name: s.coupleMode ? "Sesi Foto Couple" : `Sesi Foto (${s.peopleCount} Orang)`,
              qty: 1,
              unitPrice: s.basePrice || s.totalPrice,
              total: s.basePrice || s.totalPrice,
            },
            ...(s.miscAddons || []).map((m) => ({
              name: m.name,
              qty: m.qty,
              unitPrice: m.price || 15000,
              total: m.qty * (m.price || 15000),
            })),
          ];

    const receipt: ReceiptData = {
      invoiceNumber: s.invoiceNumber || `INV-${s.id.slice(-6)}`,
      dateStr: formatDateIndo(s.date),
      timeStr: `${s.time.replace(".", ":")} WITA`,
      customerName: s.customerName,
      customerPhone: s.customerPhone,
      notes: s.notes,
      items,
      subtotal: s.totalPrice + (s.discount || 0),
      discount: s.discount,
      total: s.totalPrice,
      paymentMethod: s.paymentMethod || "cash",
      cashReceived: s.cashReceived,
      cashChange: s.cashChange,
      studioName: branding?.receipt?.headerTitle || branding?.studioName || "IGNOS STUDIO",
      studioTagline: branding?.receipt?.headerSub || branding?.tagline,
      studioAddress: [branding?.receipt?.addressLine1, branding?.receipt?.addressLine2].filter(Boolean).join(", ") || branding?.address,
      studioPhone: branding?.receipt?.phoneContact || branding?.phone,
      studioInstagram: branding?.instagram,
      footerNote: branding?.receipt?.footerNote,
    };

    const { blobUrl: url, download } = await generateReceiptPdf(receipt);
    setReceiptData(receipt);
    setBlobUrl(url);
    setDownloadFn(() => download);
    setPreviewModalOpen(true);
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
      <div className="w-full px-5 pb-8 pt-3 lg:px-[34px] space-y-7">
        {/* ── 1. HEADER & CONTROL BAR ── */}
        <div className="flex flex-col 2xl:flex-row 2xl:items-end justify-between gap-5 pb-6 border-b border-[var(--admin-border,#2a2d2f)]">
          <div>
            <p className="text-[12px] tracking-[0.14em] text-[var(--admin-muted,#92989d)] uppercase font-medium">
              OPERASIONAL & LAPORAN HARIAN
            </p>
            <h1 className="text-[28px] sm:text-[30px] font-semibold tracking-[-0.04em] text-[var(--admin-text,#f4f4f5)] leading-[1.25] mt-1.5">
              Selamat {greetingTime}, Admin.
            </h1>
            <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.8] mt-1 max-w-2xl">
              Pantau sesi foto, penjualan, dan aktivitas studio dalam satu tempat.
            </p>
          </div>

          {/* Quick Date Selector & Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* Quick date pills */}
            <div className="flex items-center gap-1 bg-[var(--admin-control,#1e2022)] p-1 rounded-full border border-[var(--admin-border,#2a2d2f)]">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                  selectedDate === todayStr
                    ? "bg-[var(--admin-tab,#343638)] text-[var(--admin-text,#f4f4f5)] font-semibold"
                    : "text-[var(--admin-secondary,#c3c7ca)] hover:text-[var(--admin-text,#f4f4f5)]"
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
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                      selectedDate === d
                        ? "bg-[var(--admin-tab,#343638)] text-[var(--admin-text,#f4f4f5)] font-semibold"
                        : "text-[var(--admin-secondary,#c3c7ca)] hover:text-[var(--admin-text,#f4f4f5)]"
                    }`}
                  >
                    {d.slice(5)}
                  </button>
                ))}
            </div>

            {/* Date Picker Input */}
            <label className="flex items-center gap-2 border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] rounded-full px-3 py-1.5 text-[12px] text-[var(--admin-secondary,#c3c7ca)] cursor-pointer hover:border-[var(--admin-border-strong,#41474e)] transition-colors">
              <Calendar size={13} className="text-[var(--admin-muted,#92989d)]" />
              <input
                type="date"
                aria-label="Tanggal laporan"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border-0 bg-transparent text-[12px] text-[var(--admin-secondary,#c3c7ca)] outline-none cursor-pointer p-0 font-medium"
              />
            </label>

            {/* Salin WA */}
            <button
              type="button"
              onClick={handleCopyWhatsAppText}
              disabled={!data || data.sessions.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] text-[var(--admin-secondary,#c3c7ca)] hover:bg-[var(--admin-raised,#292b2f)] hover:text-[var(--admin-text,#f4f4f5)] rounded-full text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
              title="Salin rekap penjualan ke format pesan WhatsApp"
            >
              {copied ? <Check size={13} className="text-[var(--admin-accent-text,#c9d2e1)]" /> : <Copy size={13} />}
              <span>{copied ? "Tersalin" : "Salin WA"}</span>
            </button>

            {/* Cetak Struk */}
            <button
              type="button"
              onClick={handlePrintClosingReceipt}
              disabled={printingReceipt || !data || data.sessions.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#c0d0e7] text-[#111b23] hover:bg-[#d2def0] rounded-full text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40 "
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
              className="w-[34px] h-[34px] rounded-full border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] inline-flex items-center justify-center text-[var(--admin-secondary,#c3c7ca)] cursor-pointer transition-colors"
              title="Segarkan data sesi"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-[var(--admin-muted,#92989d)]" : "text-[var(--admin-muted,#92989d)]"} />
            </button>
          </div>
        </div>

        <section aria-labelledby="overview-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="overview-heading" className="text-[16px] font-medium">Ringkasan studio</h2>
            <span className="text-[12px] text-[var(--admin-muted,#92989d)]">{formatDateIndo(selectedDate)}</span>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4 xl:grid-rows-2">
            <article className="flex min-h-[294px] min-w-0 flex-col justify-between rounded-2xl bg-[#c0d0e7] p-6 text-[#111b23] sm:col-span-2 xl:row-span-2">
              <div className="flex items-center justify-between gap-3"><span className="text-[13px] font-medium">Total omset</span><span className="flex size-9 items-center justify-center rounded-full border border-[#111b23]/20"><Wallet size={18} strokeWidth={1.8} /></span></div>
              <div className="my-6"><p className="break-words text-[36px] font-normal leading-tight tracking-[-2px] 2xl:text-[40px]">{formatRupiah(data?.summary.totalOmset ?? 0)}</p><p className="mt-2 text-[13px] text-[#273342]">Seluruh paket, cetak foto & add-ons</p></div>
              <div className="grid grid-cols-2 gap-4  border-[#111b23]/20 pt-4"><div><p className="text-[12px] text-[#273342]">Pembayaran tunai</p><p className="mt-1 text-[15px] font-medium">{formatRupiah(data?.summary.paymentSummary?.cash ?? 0)}</p></div><div><p className="text-[12px] text-[#273342]">Pembayaran QRIS</p><p className="mt-1 text-[15px] font-medium">{formatRupiah(data?.summary.paymentSummary?.qris ?? 0)}</p></div></div>
            </article>
            <article className="flex min-h-[294px] flex-col justify-between rounded-2xl bg-[var(--admin-card,#1c1f20)] p-5 xl:row-span-2">
              <div className="flex items-center justify-between text-[13px]"><h3 className="text-[13px]">Sesi foto</h3><Camera size={18} className="text-[var(--admin-muted,#92989d)]" /></div>
              <div className="flex flex-1 items-center justify-center py-5"><div className="flex size-[132px] flex-col items-center justify-center rounded-full bg-[#dfb9de] text-[#644362]"><span className="text-[32px] leading-tight tracking-[-2px]">{data?.summary.totalSessions ?? 0}</span><span className="text-[12px]">sesi tercatat</span></div></div>
              <div className="flex items-center justify-between gap-2  border-[var(--admin-border,#2a2d2f)] pt-3 text-[12px] text-[var(--admin-muted,#92989d)]"><span>{data?.summary.totalPeople ?? 0} pengunjung</span><span>{data?.sessions.filter((session) => session.coupleMode).length ?? 0} couple</span></div>
            </article>
            <article className="flex min-h-[141px] flex-col justify-between rounded-2xl bg-[var(--admin-card,#1c1f20)] p-5">
              <div className="flex items-center justify-between gap-2 text-[13px]"><h3 className="text-[13px]">Kertas foto terpakai</h3><Printer size={17} className="text-[var(--admin-muted,#92989d)]" /></div>
              <p className="mt-3 text-[30px] leading-[38px] tracking-[-1px]">{data?.summary.totalPrints.total4R ?? 0}<span className="ml-2 text-[12px] tracking-normal text-[var(--admin-muted,#92989d)]">lembar 4R</span></p>
              <p className="mt-1 text-[12px] text-[var(--admin-muted,#92989d)]">{data?.summary.totalPrints.regular ?? 0} reguler · {data?.summary.totalPrints.bonus ?? 0} bonus · {data?.summary.totalPrints.a4 ?? 0} A4</p>
            </article>
            <article className="flex min-h-[141px] flex-col justify-between rounded-2xl bg-[var(--admin-card,#1c1f20)] p-5">
              <div className="flex items-center justify-between gap-2 text-[13px]"><h3 className="text-[13px]">Klaim softcopy</h3><Cloud size={17} className="text-[var(--admin-muted,#92989d)]" /></div>
              <p className="mt-3 text-[30px] leading-[38px] tracking-[-1px]">{data?.summary.softcopy.storyFree ?? 0}<span className="mx-2 text-[24px] text-[var(--admin-label,#737779)]">/</span>{data?.summary.softcopy.paid ?? 0}</p>
              <p className="mt-1 text-[12px] text-[var(--admin-muted,#92989d)]">Story / berbayar · {formatRupiah(data?.summary.softcopy.paidRevenue ?? 0)}</p>
            </article>
          </div>
        </section>

        {/* ── 3. MIDDLE PANELS: ADD-ONS BREAKDOWN & RECENT SESSION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Panel 1: Rincian Penjualan Add-Ons (7 cols) */}
          <div className="lg:col-span-7 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div className="pb-4  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-[-0.02em]">
                    Penjualan Add-Ons & Merchandise
                  </h2>
                  <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.7] mt-0.5">
                    Rincian barang tambahan yang dibeli pengunjung di luar paket dasar.
                  </p>
                </div>
                <span className="text-[12px] text-[var(--admin-muted,#92989d)] font-normal shrink-0">
                  {data?.summary.addonsSummary?.length ?? 0} jenis item
                </span>
              </div>

              <div className="py-2">
                {(data?.summary.addonsSummary?.length ?? 0) > 0 ? (
                  <div className="divide-y divide-[var(--admin-border,#2a2d2f)]">
                    {data?.summary.addonsSummary.map((item) => (
                      <div
                        key={item.name}
                        className="py-3.5 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <span className="text-[13px] font-medium text-[var(--admin-text,#f4f4f5)] block">
                            {item.name}
                          </span>
                          <span className="text-[12px] text-[var(--admin-muted,#92989d)] block mt-0.5">
                            Terjual {item.qty} pcs pada sesi hari ini
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[13px] font-semibold text-[var(--admin-text,#f4f4f5)] font-mono block">
                            {formatRupiah(item.revenue)}
                          </span>
                          <span className="text-[12px] text-[var(--admin-muted,#92989d)] font-mono">
                            {item.qty} item
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center space-y-1">
                    <p className="text-[13px] font-medium text-[var(--admin-text,#f4f4f5)]">Belum ada add-ons terjual</p>
                    <p className="text-[12px] text-[var(--admin-muted,#92989d)]">
                      Penjualan gantungan kunci, cetak ekstra, dan bingkai akan tercatat di sini.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between text-[12px] text-[var(--admin-muted,#92989d)]">
              <span>Rasio Customer Couple: <strong className="text-[var(--admin-text,#f4f4f5)] font-medium font-mono">{data?.sessions.length ? `${Math.round((data.sessions.filter((s) => s.coupleMode).length / data.sessions.length) * 100)}%` : "0%"}</strong></span>
              <span>Rata-rata 4R: <strong className="text-[var(--admin-text,#f4f4f5)] font-medium font-mono">{data?.summary.totalSessions ? `${((data.summary.totalPrints.total4R ?? 0) / (data.summary.totalSessions || 1)).toFixed(1)} lbr` : "0 lbr"}</strong></span>
            </div>
          </div>

          {/* Panel 2: Aktivitas Sesi Terakhir (5 cols) */}
          <div className="lg:col-span-5 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div className="pb-4  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-[-0.02em]">
                    Aktivitas Sesi Terakhir
                  </h2>
                  <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.7] mt-0.5">
                    Transaksi pengunjung paling akhir di terminal Kiosk.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c9d2e1]" />
                  <span className="text-[12px] text-[var(--admin-secondary,#c3c7ca)] font-medium">{latestSession ? "Selesai" : "Standby"}</span>
                </div>
              </div>

              {latestSession ? (
                <div className="py-3 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-[var(--admin-raised,#292b2f)] text-[var(--admin-text,#f4f4f5)] font-semibold text-[13px] flex items-center justify-center shrink-0">
                      {getInitials(latestSession.customerName)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-medium text-[var(--admin-text,#f4f4f5)] truncate">
                        {latestSession.customerName}
                      </h3>
                      <p className="text-[12px] text-[var(--admin-muted,#92989d)] truncate">
                        {latestSession.coupleMode ? "Couple Mode" : `${latestSession.peopleCount} Orang`} · {latestSession.prints.total} lembar 4R
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-[var(--admin-border,#2a2d2f)] text-[13px]">
                    <div className="py-2.5 flex justify-between">
                      <span className="text-[var(--admin-muted,#92989d)]">Waktu Transaksi</span>
                      <span className="font-mono text-[var(--admin-text,#f4f4f5)] font-medium">{latestSession.time} WIB</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-[var(--admin-muted,#92989d)]">Status Softcopy</span>
                      <span className="text-[var(--admin-text,#f4f4f5)]">{latestSession.makeStory ? "Promo Story (Gratis)" : "Softcopy Berbayar"}</span>
                    </div>
                    <div className="py-2.5 flex justify-between">
                      <span className="text-[var(--admin-muted,#92989d)]">Total Tagihan</span>
                      <span className="font-semibold text-[var(--admin-text,#f4f4f5)] font-mono">{formatRupiah(latestSession.totalPrice)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-[var(--admin-muted,#92989d)] text-[13px]">
                  Belum ada sesi tercatat di terminal hari ini.
                </div>
              )}
            </div>

            {latestSession?.driveWebViewLink && (
              <a
                href={latestSession.driveWebViewLink}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between text-[12px] font-medium text-[var(--admin-text,#f4f4f5)] hover:underline pt-4 border-t border-[var(--admin-border,#2a2d2f)] transition-colors"
              >
                <span>Buka folder Google Drive sesi ini</span>
                <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        </div>

        {/* ── 4. LOG TRANSAKSI TABLE (Clean & Spacious) ── */}
        <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="pb-4  border-[var(--admin-border,#2a2d2f)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-[-0.02em]">
                  Log Transaksi Sesi Foto
                </h2>
                <span className="text-[12px] text-[var(--admin-muted,#92989d)] font-normal">
                  ({filteredSessionsList.length} dari {data?.sessions.length ?? 0} sesi)
                </span>
              </div>
              <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.7] mt-0.5">
                Daftar rekaman sesi foto, jumlah cetak kertas, dan tautan Google Drive per customer.
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <div className="flex items-center gap-2 border border-[var(--admin-border,#2a2d2f)] focus-within:border-[var(--admin-focus,#c0d0e7)] rounded-full px-3 py-1.5 bg-[var(--admin-card,#1c1f20)] text-[12px] transition-colors w-full sm:w-56">
                <Search size={16} className="text-[var(--admin-muted,#92989d)] shrink-0" />
                <input
                  type="search"
                  aria-label="Cari transaksi berdasarkan nama, jam, atau ID"
                  placeholder="Cari nama / jam..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-0 outline-none text-[var(--admin-text,#f4f4f5)] placeholder:text-[var(--admin-muted,#92989d)] text-[12px] p-0"
                />
              </div>

              <select
                value={packageFilter}
                aria-label="Filter paket sesi"
                onChange={(e) => setPackageFilter(e.target.value)}
                className="border border-[var(--admin-border,#2a2d2f)] focus:border-[var(--admin-focus,#c0d0e7)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--admin-secondary,#c3c7ca)] bg-[var(--admin-canvas,#111114)] outline-none cursor-pointer"
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
              <p className="text-[14px] font-medium text-[var(--admin-text,#f4f4f5)]">Belum ada sesi yang cocok</p>
              <p className="text-[12px] text-[var(--admin-muted,#92989d)]">
                Coba ubah kata kunci pencarian atau pilih filter tanggal lain di atas.
              </p>
              {(searchQuery || packageFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPackageFilter("all");
                  }}
                  className="mt-2 text-[12px] text-[var(--admin-text,#f4f4f5)] font-medium hover:underline cursor-pointer"
                >
                  Reset filter pencarian
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--admin-border,#2a2d2f)]">
              <table className="w-full border-collapse text-left min-w-[720px]">
                <caption className="sr-only">Log transaksi sesi foto untuk tanggal {selectedDate}</caption>
                <thead>
                  <tr className="border-b border-[var(--admin-border,#2a2d2f)] text-[12px] font-medium text-[var(--admin-muted,#92989d)]">
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
                <tbody className="divide-y divide-[var(--admin-border,#2a2d2f)] text-[13px]">
                  {filteredSessionsList.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--admin-selected,#232529)] transition-colors">
                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-[var(--admin-raised,#292b2f)] text-[var(--admin-secondary,#c3c7ca)] font-medium text-[12px] flex items-center justify-center shrink-0">
                            {getInitials(s.customerName)}
                          </span>
                          <div className="min-w-0">
                            <span className="font-medium text-[var(--admin-text,#f4f4f5)] block truncate">
                              {s.customerName}
                            </span>
                            <span className="text-[12px] text-[var(--admin-muted,#92989d)] font-mono block">
                              {s.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-[var(--admin-secondary,#c3c7ca)] text-[12px] block">
                          {s.time} WIB
                        </span>
                        <span className="text-[12px] text-[var(--admin-muted,#92989d)] block">
                          {selectedDate}
                        </span>
                      </td>

                      {/* Paket Sesi */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[12px] text-[var(--admin-secondary,#c3c7ca)]">
                          {s.coupleMode ? "Couple Mode" : `${s.peopleCount} Orang`}
                        </span>
                      </td>

                      {/* Prints */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[var(--admin-text,#f4f4f5)] font-mono text-[12px]">
                          {s.prints?.total ?? s.peopleCount} lbr 4R
                        </span>
                        {s.prints?.bonus > 0 && (
                          <span className="text-[12px] text-[var(--admin-muted,#92989d)] block">
                            +{s.prints.bonus} bonus
                          </span>
                        )}
                      </td>

                      {/* Softcopy */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {s.makeStory ? (
                          <div className="flex items-center gap-1.5 text-[12px] text-[var(--admin-accent-text,#c9d2e1)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#c9d2e1]" />
                            <span>Story Gratis</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[12px] text-[var(--admin-muted,#92989d)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#d7b8d6]" />
                            <span>Softcopy Bayar</span>
                          </div>
                        )}
                      </td>

                      {/* Addons */}
                      <td className="py-3.5 px-4">
                        {s.miscAddons?.length > 0 ? (
                          <div className="flex flex-col gap-0.5 text-[12px] text-[var(--admin-secondary,#c3c7ca)]">
                            {s.miscAddons.map((a, i) => (
                              <span key={i}>
                                {a.name} ({a.qty}x)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[var(--admin-label,#737779)] text-[12px]">—</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-semibold text-[var(--admin-text,#f4f4f5)] font-mono text-[13px] block">
                          {formatRupiah(s.totalPrice)}
                        </span>
                        <span className="text-[12px] text-[var(--admin-muted,#92989d)] font-medium tracking-wide uppercase">
                          {s.paymentMethod ? s.paymentMethod : "tunai"}
                        </span>
                      </td>

                      {/* Google Drive Link */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {s.driveWebViewLink ? (
                          <a
                            href={s.driveWebViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="w-7 h-8 rounded-lg border border-[var(--admin-border,#2a2d2f)] inline-flex items-center justify-center text-[var(--admin-secondary,#c3c7ca)] hover:bg-[#d2def0] hover:text-[#111b23] hover:border-[var(--admin-focus,#c0d0e7)] transition-all"
                            title="Buka Folder Google Drive Customer"
                          >
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-[var(--admin-label,#737779)] text-[12px]">—</span>
                        )}
                      </td>

                      {/* Action E-Receipt & Hapus */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt(s)}
                            className="w-7 h-8 rounded-lg text-[var(--admin-secondary,#c3c7ca)] hover:text-[var(--admin-text,#f4f4f5)] hover:bg-[var(--admin-raised,#292b2f)] inline-flex items-center justify-center transition-colors cursor-pointer"
                            title="Buka / Unduh E-Receipt Digital"
                          >
                            <Receipt size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(s.id, s.customerName)}
                            className="w-7 h-8 rounded-lg text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-danger,#f18e9a)] hover:bg-[var(--admin-alert,#3b2d3c)] inline-flex items-center justify-center transition-colors cursor-pointer"
                            title="Hapus rekaman sesi ini"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
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

        {/* ── E-Receipt Digital Preview Modal ── */}
        <AdminReceiptPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          onNewTransaction={() => setPreviewModalOpen(false)}
          receiptData={receiptData}
          blobUrl={blobUrl}
          onDownload={() => {
            if (downloadFn) downloadFn();
          }}
        />
      </div>
    </AdminLayout>
  );
}
