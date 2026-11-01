import { useState } from "react";
import {
  KeyRound,
  ShieldCheck,
  Clock,
  Building,
  Laptop,
  Check,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ClipboardPaste,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfirmModal } from "../components/AdminConfirmModal";
import { useLicense } from "../../context/LicenseContext";
import { usePageTitle } from "../../hooks/usePageTitle";

export function AdminLicensePage() {
  usePageTitle("Lisensi Sewa & Langganan — Ignos");

  const { license, loading, refreshLicense, activateLicense, isLocked, isWarning } = useLicense();
  const [inputKey, setInputKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State strictly conforming to GEMINI.md Rule 5
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    category?: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info" | "success";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshLicense();
    setTimeout(() => setRefreshing(false), 400);
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputKey(text.trim());
          return;
        }
      }
    } catch {
      // Fallback if browser blocks clipboard reading
    }
  };

  const handleActivate = async () => {
    if (!inputKey.trim()) {
      setModalConfig({
        isOpen: true,
        title: "Kode Lisensi Kosong",
        category: "VALIDASI",
        description: "Silakan masukkan atau tempel kode lisensi yang diberikan oleh vendor software.",
        variant: "warning",
        confirmText: "Mengerti",
        onConfirm: () => setModalConfig((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    setSubmitting(true);
    const result = await activateLicense(inputKey.trim());
    setSubmitting(false);

    if (result.success) {
      setInputKey("");
      setModalConfig({
        isOpen: true,
        title: "Aktivasi Berhasil",
        category: "LISENSI AKTIF",
        description: result.message,
        variant: "success",
        confirmText: "Selesai",
        onConfirm: () => setModalConfig((prev) => ({ ...prev, isOpen: false })),
      });
    } else {
      setModalConfig({
        isOpen: true,
        title: "Aktivasi Gagal",
        category: "VERIFIKASI GAGAL",
        description: result.message,
        variant: "danger",
        confirmText: "Tutup",
        onConfirm: () => setModalConfig((prev) => ({ ...prev, isOpen: false })),
      });
    }
  };

  // Helper for Status UI elements
  const getStatusDisplay = () => {
    if (!license) {
      return {
        label: "Memuat Status...",
        dotClass: "bg-neutral-300",
        badgeText: "Memeriksa",
        badgeBg: "bg-neutral-100 text-neutral-600",
      };
    }
    if (license.isClockTampered) {
      return {
        label: "Manipulasi Jam Terdeteksi",
        dotClass: "bg-rose-500",
        badgeText: "Jam PC Tidak Valid",
        badgeBg: "bg-rose-50 text-rose-700 border border-rose-200",
      };
    }
    if (license.isExpired) {
      return {
        label: "Masa Sewa Berakhir",
        dotClass: "bg-rose-500",
        badgeText: "Kedaluwarsa",
        badgeBg: "bg-rose-50 text-rose-700 border border-rose-200",
      };
    }
    if (license.status === "warning_expiring_soon") {
      return {
        label: "Mendekati Jatuh Tempo",
        dotClass: "bg-amber-500",
        badgeText: "Segera Perpanjang",
        badgeBg: "bg-amber-50 text-amber-700 border border-amber-200",
      };
    }
    return {
      label: "Lisensi Aktif & Valid",
      dotClass: "bg-emerald-500",
      badgeText: "Aktif",
      badgeBg: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    };
  };

  const statusDisplay = getStatusDisplay();

  const formattedExpiry = license?.expiresAt
    ? new Date(license.expiresAt).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const formattedActivated = license?.activatedAt
    ? new Date(license.activatedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <AdminLayout>
      <div className="w-full p-6 md:p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#e8e8e8]">
          <div>
            <h1 className="text-2xl font-bold text-[#171717] tracking-tight">
              Lisensi Sewa & Langganan
            </h1>
            <p className="text-sm text-[#737373] mt-1">
              Pantau masa sewa software studio, status proteksi offline, dan aktivasi kode perpanjangan dari vendor.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[#e5e5e5] hover:bg-neutral-50 text-[#171717] rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              <span>Periksa Status</span>
            </button>
          </div>
        </div>

        {/* Notice Banner if Expired or Expiring Soon */}
        {isLocked && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 flex items-start gap-4 text-rose-900">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 text-rose-600 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-rose-950">
                {license?.isClockTampered
                  ? "Peringatan: Manipulasi Jam PC Terdeteksi"
                  : "Masa Sewa Software Telah Berakhir"}
              </h3>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                {license?.isClockTampered
                  ? "Sistem mendeteksi pengaturan jam komputer dimundurkan. Sesuaikan kembali jam Windows ke waktu saat ini atau masukkan kode lisensi baru untuk melanjutkan."
                  : "Layar antarmuka bilik Kiosk saat ini terkunci otomatis. Hubungi vendor penyedia software untuk melakukan perpanjangan masa sewa dan dapatkan kode aktivasi baru."}
              </p>
            </div>
          </div>
        )}

        {isWarning && !isLocked && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4 text-amber-900">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-600 mt-0.5">
              <Clock size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-amber-950">
                Masa Sewa Akan Segera Berakhir dalam {license?.daysLeft} Hari
              </h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Lisensi studio Anda jatuh tempo pada {formattedExpiry}. Disarankan untuk segera menghubungi vendor agar operasional bilik foto customer tidak terganggu saat hari pergantian sewa.
              </p>
            </div>
          </div>
        )}

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Status */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#737373] uppercase tracking-wider">
                Status Lisensi
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${statusDisplay.dotClass}`} />
                <span className="text-xs font-medium text-[#171717]">{statusDisplay.badgeText}</span>
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#171717] tracking-tight truncate">
                {statusDisplay.label}
              </div>
              <div className="text-xs text-[#737373] mt-0.5 truncate">
                Klien: {license?.clientName || "—"}
              </div>
            </div>
          </div>

          {/* Card 2: Sisa Hari */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#737373] uppercase tracking-wider">
                Sisa Masa Sewa
              </span>
              <Clock size={15} className="text-[#a3a3a3]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#171717] tracking-tight">
                {license?.isExpired ? "0 Hari" : `${license?.daysLeft ?? 0} Hari`}
              </div>
              <div className="text-xs text-[#737373] mt-0.5 truncate">
                Jatuh tempo: {formattedExpiry}
              </div>
            </div>
          </div>

          {/* Card 3: Paket Sewa */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#737373] uppercase tracking-wider">
                Paket Berlangganan
              </span>
              <Building size={15} className="text-[#a3a3a3]" />
            </div>
            <div>
              <div className="text-base font-bold text-[#171717] tracking-tight truncate">
                {license?.plan || "Paket Sewa Studio"}
              </div>
              <div className="text-xs text-[#737373] mt-0.5">
                Aktivasi: {formattedActivated}
              </div>
            </div>
          </div>

          {/* Card 4: Perangkat PC */}
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#737373] uppercase tracking-wider">
                Perangkat Terverifikasi
              </span>
              <Laptop size={15} className="text-[#a3a3a3]" />
            </div>
            <div>
              <div className="text-base font-bold text-[#171717] tracking-tight truncate">
                {license?.machineInfo?.hostname || "Localhost"}
              </div>
              <div className="text-xs text-[#737373] mt-0.5 truncate">
                OS: {license?.machineInfo?.platform || "Windows"} • Enkripsi Offline V1
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom Kiri: Form Aktivasi Kode Lisensi Baru (7 Cols) */}
          <div className="lg:col-span-7 bg-white border border-[#e5e5e5] rounded-xl p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#171717] tracking-tight">
                Aktivasi Kode Lisensi Baru
              </h2>
              <p className="text-sm text-[#737373] mt-1">
                Tempelkan kode lisensi terenkripsi yang diberikan oleh vendor setelah perpanjangan sewa software.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#171717] uppercase tracking-wider">
                  Kode Lisensi (Format IGNOS-V1)
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="text-xs font-medium text-[#525252] hover:text-[#171717] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ClipboardPaste size={13} />
                  <span>Tempel dari Clipboard</span>
                </button>
              </div>

              <textarea
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Contoh: IGNOS-V1.eyJjbGllbnQiOiJMdW1lbiBTdHVkaW8iLCJwbGFuIjoiMSBCdWxhbiJ9.756c8e62abdc..."
                rows={5}
                className="w-full p-3.5 bg-[#fafafa] border border-[#e5e5e5] rounded-lg font-mono text-xs text-[#171717] placeholder:text-[#a3a3a3] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#171717] focus:border-transparent transition-all resize-none"
              />
              <p className="text-xs text-[#8a8a8a] leading-relaxed">
                Kode lisensi bersifat unik dan diamankan dengan tanda tangan kriptografi HMAC-SHA256. Sistem tidak memerlukan internet saat proses verifikasi.
              </p>
            </div>

            {/* Horizontal Control & Action (GEMINI.md Rule 6) */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[#f0f0f0]">
              <span className="text-xs text-[#737373]">
                Pastikan seluruh rangkaian kode tersalin lengkap tanpa spasi tambahan.
              </span>
              <button
                type="button"
                onClick={handleActivate}
                disabled={submitting || !inputKey.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#171717] text-white text-sm font-semibold rounded-lg hover:bg-[#333333] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={15} />
                    <span>Aktifkan Lisensi</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Kolom Kanan: Panduan Perpanjangan & Kontak Vendor (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Box Kontak Vendor */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-6 md:p-8 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-[#171717] tracking-tight">
                  Kontak Vendor Software
                </h2>
                <p className="text-sm text-[#737373] mt-1">
                  Hubungi penyedia software untuk melakukan perpanjangan sewa atau bantuan teknis sistem.
                </p>
              </div>

              <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-lg p-4 space-y-3 text-sm">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#737373]">Penyedia Layanan:</span>
                  <span className="font-semibold text-[#171717]">
                    {license?.supportContact?.name || "Vendor Ignos Studio"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#737373]">WhatsApp Bantuan:</span>
                  <span className="font-mono text-[#171717]">
                    +{license?.supportContact?.phone || "6281234567890"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#737373]">Waktu Respon:</span>
                  <span className="text-[#171717]">Setiap Hari (09:00 - 21:00)</span>
                </div>
              </div>

              {license?.supportContact?.whatsappUrl && (
                <a
                  href={license.supportContact.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#25d366] hover:bg-[#20ba59] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <ExternalLink size={16} />
                  <span>Chat WhatsApp Vendor</span>
                </a>
              )}
            </div>

            {/* Box Penjelasan Alur Sewa */}
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-6 md:p-8 space-y-4">
              <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider">
                Alur Perpanjangan Sewa
              </h3>
              <ol className="space-y-3 text-xs text-[#525252] leading-relaxed list-decimal list-inside">
                <li>
                  <strong className="text-[#171717]">Hubungi Vendor:</strong> Konfirmasikan perpanjangan masa sewa 3-5 hari sebelum jatuh tempo.
                </li>
                <li>
                  <strong className="text-[#171717]">Pembayaran Sewa:</strong> Selesaikan pembayaran biaya sewa bulanan atau tahunan.
                </li>
                <li>
                  <strong className="text-[#171717]">Terima Kode Lisensi:</strong> Vendor akan membuatkan kode lisensi dan mengirimkannya via WhatsApp.
                </li>
                <li>
                  <strong className="text-[#171717]">Aktivasi di Kiosk:</strong> Masukkan kode ke formulir aktivasi di halaman ini. Masa sewa otomatis bertambah tanpa perlu restart perangkat.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation / Alert Modal */}
      <AdminConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        category={modalConfig.category}
        description={modalConfig.description}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        variant={modalConfig.variant}
      />
    </AdminLayout>
  );
}
