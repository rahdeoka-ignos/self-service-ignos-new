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
        dotClass: "bg-[var(--admin-raised,#292b2f)]",
        badgeText: "Memeriksa",
        badgeBg: "bg-[var(--admin-raised,#292b2f)] text-[var(--admin-secondary,#c3c7ca)]",
      };
    }
    if (license.isClockTampered) {
      return {
        label: "Manipulasi Jam Terdeteksi",
        dotClass: "bg-rose-500",
        badgeText: "Jam PC Tidak Valid",
        badgeBg: "bg-[var(--admin-alert,#3b2d3c)] text-[var(--admin-danger,#f18e9a)] border border-rose-200",
      };
    }
    if (license.isExpired) {
      return {
        label: "Masa Sewa Berakhir",
        dotClass: "bg-rose-500",
        badgeText: "Kedaluwarsa",
        badgeBg: "bg-[var(--admin-alert,#3b2d3c)] text-[var(--admin-danger,#f18e9a)] border border-rose-200",
      };
    }
    if (license.status === "warning_expiring_soon") {
      return {
        label: "Mendekati Jatuh Tempo",
        dotClass: "bg-amber-500",
        badgeText: "Segera Perpanjang",
        badgeBg: "bg-[var(--admin-alert,#3b2d3c)] text-[var(--admin-pending,#d7b8d6)] border border-amber-200",
      };
    }
    return {
      label: "Lisensi Aktif & Valid",
      dotClass: "bg-emerald-500",
      badgeText: "Aktif",
      badgeBg: "bg-[var(--admin-raised,#292b2f)] text-[var(--admin-accent-text,#c0d0e7)] border border-emerald-200",
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
      <div className="w-full px-5 pb-8 pt-3 lg:px-[34px] space-y-7">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[var(--admin-border,#2a2d2f)]">
          <div>
            <h1 className="text-[28px] sm:text-[30px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-tight">
              Lisensi Sewa & Langganan
            </h1>
            <p className="text-sm text-[var(--admin-muted,#92989d)] mt-1">
              Pantau masa sewa software studio, status proteksi offline, dan aktivasi kode perpanjangan dari vendor.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--admin-border,#2a2d2f)] hover:bg-[var(--admin-raised,#292b2f)] text-[var(--admin-text,#f4f4f5)] rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              <span>Periksa Status</span>
            </button>
          </div>
        </div>

        {/* Notice Banner if Expired or Expiring Soon */}
        {isLocked && (
          <div className="bg-[var(--admin-alert,#3b2d3c)] border border-rose-200 rounded-xl p-5 flex items-start gap-4 text-[var(--admin-danger,#f18e9a)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--admin-alert,#3b2d3c)] flex items-center justify-center shrink-0 text-[var(--admin-danger,#f18e9a)] mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-[var(--admin-danger,#f18e9a)]">
                {license?.isClockTampered
                  ? "Peringatan: Manipulasi Jam PC Terdeteksi"
                  : "Masa Sewa Software Telah Berakhir"}
              </h3>
              <p className="text-xs text-[var(--admin-danger,#f18e9a)] mt-1 leading-relaxed">
                {license?.isClockTampered
                  ? "Sistem mendeteksi pengaturan jam komputer dimundurkan. Sesuaikan kembali jam Windows ke waktu saat ini atau masukkan kode lisensi baru untuk melanjutkan."
                  : "Layar antarmuka bilik Kiosk saat ini terkunci otomatis. Hubungi vendor penyedia software untuk melakukan perpanjangan masa sewa dan dapatkan kode aktivasi baru."}
              </p>
            </div>
          </div>
        )}

        {isWarning && !isLocked && (
          <div className="bg-[var(--admin-alert,#3b2d3c)] border border-amber-200 rounded-xl p-5 flex items-start gap-4 text-[var(--admin-pending,#d7b8d6)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--admin-alert,#3b2d3c)] flex items-center justify-center shrink-0 text-[var(--admin-pending,#d7b8d6)] mt-0.5">
              <Clock size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-[var(--admin-pending,#d7b8d6)]">
                Masa Sewa Akan Segera Berakhir dalam {license?.daysLeft} Hari
              </h3>
              <p className="text-xs text-[var(--admin-pending,#d7b8d6)] mt-1 leading-relaxed">
                Lisensi studio Anda jatuh tempo pada {formattedExpiry}. Disarankan untuk segera menghubungi vendor agar operasional bilik foto customer tidak terganggu saat hari pergantian sewa.
              </p>
            </div>
          </div>
        )}

        {/* 4 Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Status */}
          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--admin-muted,#92989d)] uppercase tracking-wider">
                Status Lisensi
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${statusDisplay.dotClass}`} />
                <span className="text-xs font-medium text-[var(--admin-text,#f4f4f5)]">{statusDisplay.badgeText}</span>
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-[var(--admin-text,#f4f4f5)] tracking-tight truncate">
                {statusDisplay.label}
              </div>
              <div className="text-xs text-[var(--admin-muted,#92989d)] mt-0.5 truncate">
                Klien: {license?.clientName || "—"}
              </div>
            </div>
          </div>

          {/* Card 2: Sisa Hari */}
          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--admin-muted,#92989d)] uppercase tracking-wider">
                Sisa Masa Sewa
              </span>
              <Clock size={15} className="text-[var(--admin-muted,#92989d)]" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--admin-text,#f4f4f5)] tracking-tight">
                {license?.isExpired ? "0 Hari" : `${license?.daysLeft ?? 0} Hari`}
              </div>
              <div className="text-xs text-[var(--admin-muted,#92989d)] mt-0.5 truncate">
                Jatuh tempo: {formattedExpiry}
              </div>
            </div>
          </div>

          {/* Card 3: Paket Sewa */}
          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--admin-muted,#92989d)] uppercase tracking-wider">
                Paket Berlangganan
              </span>
              <Building size={15} className="text-[var(--admin-muted,#92989d)]" />
            </div>
            <div>
              <div className="text-base font-bold text-[var(--admin-text,#f4f4f5)] tracking-tight truncate">
                {license?.plan || "Paket Sewa Studio"}
              </div>
              <div className="text-xs text-[var(--admin-muted,#92989d)] mt-0.5">
                Aktivasi: {formattedActivated}
              </div>
            </div>
          </div>

          {/* Card 4: Perangkat PC */}
          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--admin-muted,#92989d)] uppercase tracking-wider">
                Perangkat Terverifikasi
              </span>
              <Laptop size={15} className="text-[var(--admin-muted,#92989d)]" />
            </div>
            <div>
              <div className="text-base font-bold text-[var(--admin-text,#f4f4f5)] tracking-tight truncate">
                {license?.machineInfo?.hostname || "Localhost"}
              </div>
              <div className="text-xs text-[var(--admin-muted,#92989d)] mt-0.5 truncate">
                OS: {license?.machineInfo?.platform || "Windows"} • Enkripsi Offline V1
              </div>
            </div>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom Kiri: Form Aktivasi Kode Lisensi Baru (7 Cols) */}
          <div className="lg:col-span-7 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-xl p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-[16px] font-bold text-[var(--admin-text,#f4f4f5)] tracking-tight">
                Aktivasi Kode Lisensi Baru
              </h2>
              <p className="text-sm text-[var(--admin-muted,#92989d)] mt-1">
                Tempelkan kode lisensi terenkripsi yang diberikan oleh vendor setelah perpanjangan sewa software.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--admin-text,#f4f4f5)] uppercase tracking-wider">
                  Kode Lisensi (Format IGNOS-V1)
                </label>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="text-xs font-medium text-[var(--admin-secondary,#c3c7ca)] hover:text-[var(--admin-text,#f4f4f5)] flex items-center gap-1.5 transition-colors cursor-pointer"
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
                className="w-full p-3.5 bg-[var(--admin-canvas,#111114)] border border-[var(--admin-border,#2a2d2f)] rounded-lg font-mono text-xs text-[var(--admin-text,#f4f4f5)] placeholder:text-[var(--admin-muted,#92989d)] focus:bg-[var(--admin-canvas,#111114)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-focus,#c0d0e7)] focus:border-transparent transition-all resize-none"
              />
              <p className="text-xs text-[#8a8a8a] leading-relaxed">
                Kode lisensi bersifat unik dan diamankan dengan tanda tangan kriptografi HMAC-SHA256. Sistem tidak memerlukan internet saat proses verifikasi.
              </p>
            </div>

            {/* Horizontal Control & Action (GEMINI.md Rule 6) */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4  border-[var(--admin-border,#2a2d2f)]">
              <span className="text-xs text-[var(--admin-muted,#92989d)]">
                Pastikan seluruh rangkaian kode tersalin lengkap tanpa spasi tambahan.
              </span>
              <button
                type="button"
                onClick={handleActivate}
                disabled={submitting || !inputKey.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#c0d0e7] text-[#111b23] text-sm font-semibold rounded-lg hover:bg-[#d2def0] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
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
            <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-xl p-6 md:p-8 space-y-5">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--admin-text,#f4f4f5)] tracking-tight">
                  Kontak Vendor Software
                </h2>
                <p className="text-sm text-[var(--admin-muted,#92989d)] mt-1">
                  Hubungi penyedia software untuk melakukan perpanjangan sewa atau bantuan teknis sistem.
                </p>
              </div>

              <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-lg p-4 space-y-3 text-sm">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--admin-muted,#92989d)]">Penyedia Layanan:</span>
                  <span className="font-semibold text-[var(--admin-text,#f4f4f5)]">
                    {license?.supportContact?.name || "Vendor Ignos Studio"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--admin-muted,#92989d)]">WhatsApp Bantuan:</span>
                  <span className="font-mono text-[var(--admin-text,#f4f4f5)]">
                    +{license?.supportContact?.phone || "6281234567890"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--admin-muted,#92989d)]">Waktu Respon:</span>
                  <span className="text-[var(--admin-text,#f4f4f5)]">Setiap Hari (09:00 - 21:00)</span>
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
            <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-xl p-6 md:p-8 space-y-4">
              <h3 className="text-sm font-bold text-[var(--admin-text,#f4f4f5)] uppercase tracking-wider">
                Alur Perpanjangan Sewa
              </h3>
              <ol className="space-y-3 text-xs text-[var(--admin-secondary,#c3c7ca)] leading-relaxed list-decimal list-inside">
                <li>
                  <strong className="text-[var(--admin-text,#f4f4f5)]">Hubungi Vendor:</strong> Konfirmasikan perpanjangan masa sewa 3-5 hari sebelum jatuh tempo.
                </li>
                <li>
                  <strong className="text-[var(--admin-text,#f4f4f5)]">Pembayaran Sewa:</strong> Selesaikan pembayaran biaya sewa bulanan atau tahunan.
                </li>
                <li>
                  <strong className="text-[var(--admin-text,#f4f4f5)]">Terima Kode Lisensi:</strong> Vendor akan membuatkan kode lisensi dan mengirimkannya via WhatsApp.
                </li>
                <li>
                  <strong className="text-[var(--admin-text,#f4f4f5)]">Aktivasi di Kiosk:</strong> Masukkan kode ke formulir aktivasi di halaman ini. Masa sewa otomatis bertambah tanpa perlu restart perangkat.
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
