import { useState, useRef } from "react";
import {
  Check,
  RefreshCw,
  Upload,
  Building2,
  FileText,
  MessageSquare,
  Image as ImageIcon,
  Stamp,
  ExternalLink,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfirmModal } from "../components/AdminConfirmModal";
import { useBranding } from "../../context/BrandingContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import type { StudioBrandingConfig } from "../../types/branding";

export function AdminBrandingPage() {
  usePageTitle("Identitas Studio & Branding — Ignos");

  const {
    branding,
    setBranding,
    updateBrandingField,
    saveBranding,
    resetBranding,
    uploadLogo,
    saving,
  } = useBranding();

  const [activeTab, setActiveTab] = useState<
    "profile" | "logo" | "receipt" | "whatsapp" | "watermark"
  >("profile");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const lightLogoInputRef = useRef<HTMLInputElement>(null);
  const darkLogoInputRef = useRef<HTMLInputElement>(null);

  // Standard modal state conforming to GEMINI.md Rule 5
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

  const handleSave = async () => {
    const ok = await saveBranding();
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } else {
      setModalConfig({
        isOpen: true,
        title: "Gagal Menyimpan Identitas",
        category: "Kendala Server",
        description: "Terjadi kesalahan saat menyimpan identitas studio ke server. Periksa status backend port 5000.",
        singleButton: true,
        variant: "warning",
      });
    }
  };

  const handleReset = () => {
    setModalConfig({
      isOpen: true,
      title: "Reset Identitas ke Bawaan?",
      category: "Konfirmasi Reset Identitas",
      description: "Seluruh nama studio, alamat, pengaturan struk kasir, dan template pesan WhatsApp akan dikembalikan ke setelan awal Ignos Studio.",
      confirmText: "Reset Bawaan",
      cancelText: "Batal",
      isDangerous: true,
      variant: "warning",
      onConfirm: async () => {
        await resetBranding();
      },
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "light" | "dark") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setModalConfig({
        isOpen: true,
        title: "Format File Tidak Didukung",
        category: "Upload Logo",
        description: "Harap pilih file gambar dengan format PNG, JPG, WEBP, atau SVG.",
        singleButton: true,
        variant: "warning",
      });
      return;
    }

    try {
      setUploadingLogo(true);
      const res = await uploadLogo(file, type);
      if (!res.success) {
        setModalConfig({
          isOpen: true,
          title: "Gagal Upload Logo",
          category: "Upload Logo",
          description: res.error || "Terjadi kesalahan saat mengunggah file logo.",
          singleButton: true,
          variant: "warning",
        });
      }
    } finally {
      setUploadingLogo(false);
      if (e.target) e.target.value = "";
    }
  };

  const updateReceiptField = <K extends keyof StudioBrandingConfig["receipt"]>(
    field: K,
    val: StudioBrandingConfig["receipt"][K],
  ) => {
    setBranding((prev) => ({
      ...prev,
      receipt: {
        ...prev.receipt,
        [field]: val,
      },
    }));
  };

  const updateWhatsappField = <K extends keyof StudioBrandingConfig["whatsapp"]>(
    field: K,
    val: StudioBrandingConfig["whatsapp"][K],
  ) => {
    setBranding((prev) => ({
      ...prev,
      whatsapp: {
        ...prev.whatsapp,
        [field]: val,
      },
    }));
  };

  const updateWatermarkField = <K extends keyof StudioBrandingConfig["watermark"]>(
    field: K,
    val: StudioBrandingConfig["watermark"][K],
  ) => {
    setBranding((prev) => ({
      ...prev,
      watermark: {
        ...prev.watermark,
        [field]: val,
      },
    }));
  };

  return (
    <AdminLayout>
      <div className="w-full p-6 md:p-8 space-y-8">
        {/* ── 1. HEADER & CONTROL ACTIONS ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#e8e8e8]">
          <div>
            <p className="text-[10px] tracking-[0.14em] text-[#999] uppercase font-medium">
              BRANDING & WHITELABEL SAAS
            </p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.04em] text-[#202020] leading-[1.25] mt-1.5">
              Identitas Studio & Branding
            </h1>
            <p className="text-[13px] text-[#777] leading-[1.8] mt-1 max-w-2xl">
              Sesuaikan identitas nama studio, logo, format struk kasir, watermark kertas cetak, serta pesan WhatsApp softcopy secara mandiri.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#e6e6e6] text-[#444] hover:bg-[#f6f6f6] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
              title="Reset identitas ke setelan bawaan"
            >
              <RefreshCw size={13} />
              <span>Reset Bawaan</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#171717] text-white hover:bg-black rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check size={13} className="text-[#10b981]" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Check size={13} />
                  <span>{saving ? "Menyimpan..." : "Simpan Identitas"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── 2. 4 EXECUTIVE STATUS CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Nama Studio Aktif</span>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] truncate tracking-tight">
                {branding.studioName || "Ignos Studio"}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5 truncate">
                {branding.tagline || "Self-Service Photobooth Station"}
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Mode: Whitelabel Mandiri</span>
            </div>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Aset Logo Resmi</span>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] tracking-tight flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    branding.logoUrl ? "bg-[#10b981]" : "bg-[#999]"
                  }`}
                />
                <span>{branding.logoUrl ? "Logo Terpasang" : "Teks Standar"}</span>
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                {branding.logoDarkUrl ? "Light & Dark Mode siap" : "Logo utama aktif"}
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Format: PNG Transparan</span>
            </div>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Struk Kasir Thermal</span>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] tracking-tight">
                {branding.receipt.headerTitle || branding.studioName}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5 truncate">
                {branding.receipt.phoneContact || branding.phone}
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Format: Struk 80mm</span>
            </div>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Watermark Cetak 4R</span>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] tracking-tight flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    branding.watermark.enabled ? "bg-[#10b981]" : "bg-[#bbb]"
                  }`}
                />
                <span>{branding.watermark.enabled ? "Aktif di Kertas" : "Nonaktif"}</span>
              </div>
              <p className="text-[11px] text-[#888] mt-0.5 truncate">
                {branding.watermark.enabled ? `Posisi: ${branding.watermark.position}` : "Foto bersih tanpa cap"}
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Opasitas: {Math.round(branding.watermark.opacity * 100)}%</span>
            </div>
          </div>
        </div>

        {/* ── 3. TYPOGRAPHY-FIRST NAVIGATION TABS (Rule 2) ── */}
        <div className="border-b border-[#e8e8e8] flex items-center gap-8 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-[14px] transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "profile"
                ? "border-b-2 border-[#171717] font-semibold text-[#171717]"
                : "border-b-2 border-transparent font-medium text-[#777] hover:text-[#171717]"
            }`}
          >
            Profil & Kontak
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logo")}
            className={`pb-3 text-[14px] transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "logo"
                ? "border-b-2 border-[#171717] font-semibold text-[#171717]"
                : "border-b-2 border-transparent font-medium text-[#777] hover:text-[#171717]"
            }`}
          >
            Aset Logo
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("receipt")}
            className={`pb-3 text-[14px] transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "receipt"
                ? "border-b-2 border-[#171717] font-semibold text-[#171717]"
                : "border-b-2 border-transparent font-medium text-[#777] hover:text-[#171717]"
            }`}
          >
            Struk Kasir Thermal
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={`pb-3 text-[14px] transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "whatsapp"
                ? "border-b-2 border-[#171717] font-semibold text-[#171717]"
                : "border-b-2 border-transparent font-medium text-[#777] hover:text-[#171717]"
            }`}
          >
            Pesan WhatsApp
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("watermark")}
            className={`pb-3 text-[14px] transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "watermark"
                ? "border-b-2 border-[#171717] font-semibold text-[#171717]"
                : "border-b-2 border-transparent font-medium text-[#777] hover:text-[#171717]"
            }`}
          >
            Watermark Cetak
          </button>
        </div>

        {/* ── 4. TAB CONTENTS ── */}

        {/* TAB 1: PROFIL & KONTAK */}
        {activeTab === "profile" && (
          <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 space-y-6">
            <div className="pb-4 border-b border-[#f0f0f0]">
              <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                Profil Studio & Informasi Kontak
              </h2>
              <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                Informasi dasar studio yang disematkan pada seluruh nota, tautan media sosial, serta header bilik foto.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-[13px]">
              <div>
                <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                  Nama Studio / Event Organizer
                </label>
                <input
                  type="text"
                  value={branding.studioName}
                  onChange={(e) => updateBrandingField("studioName", e.target.value)}
                  placeholder="Contoh: IGNOS STUDIO atau LUMEN PHOTO LAB"
                  className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white transition-colors"
                />
              </div>

              <div>
                <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                  Tagline / Slogan Studio
                </label>
                <input
                  type="text"
                  value={branding.tagline}
                  onChange={(e) => updateBrandingField("tagline", e.target.value)}
                  placeholder="Contoh: Self-Service Photobooth Station"
                  className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                  Alamat Fisik / Lokasi Bilik
                </label>
                <input
                  type="text"
                  value={branding.address}
                  onChange={(e) => updateBrandingField("address", e.target.value)}
                  placeholder="Contoh: Jl. Raya Abiansemal No. 12, Badung, Bali"
                  className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white transition-colors"
                />
              </div>

              <div>
                <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                  Nomor WhatsApp CS / Kasir
                </label>
                <input
                  type="text"
                  value={branding.phone}
                  onChange={(e) => updateBrandingField("phone", e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white transition-colors font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                  Akun Instagram (@username)
                </label>
                <input
                  type="text"
                  value={branding.instagram}
                  onChange={(e) => updateBrandingField("instagram", e.target.value)}
                  placeholder="@ignos.studio"
                  className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white transition-colors font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                  Akun TikTok (Opsional)
                </label>
                <input
                  type="text"
                  value={branding.tiktok}
                  onChange={(e) => updateBrandingField("tiktok", e.target.value)}
                  placeholder="@ignos.photobooth"
                  className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white transition-colors font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                  Website Resmi / Linktree (Opsional)
                </label>
                <input
                  type="url"
                  value={branding.website}
                  onChange={(e) => updateBrandingField("website", e.target.value)}
                  placeholder="https://ignos.id"
                  className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white transition-colors font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ASET LOGO & MEDIA */}
        {activeTab === "logo" && (
          <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 space-y-6">
            <div className="pb-4 border-b border-[#f0f0f0]">
              <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                Logo Resmi Studio
              </h2>
              <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                Unggah file gambar logo transparan untuk ditampilkan pada header bilik foto, sidebar admin, dan berkas cetak.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Light Mode */}
              <div className="border border-[#e8e8e8] rounded-[10px] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[14px] text-[#202020]">Logo Utama (Light Mode)</h3>
                    <p className="text-[11px] text-[#888] mt-0.5">Tampil di layar berlatar belakang terang</p>
                  </div>
                  {branding.logoUrl && (
                    <button
                      type="button"
                      onClick={() => updateBrandingField("logoUrl", "")}
                      className="text-[11px] text-[#dc2626] hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>

                <div className="aspect-[3/1] bg-[#fafafa] border border-dashed border-[#e0e0e0] rounded-[8px] flex items-center justify-center p-4 overflow-hidden relative">
                  {branding.logoUrl ? (
                    <img
                      src={branding.logoUrl}
                      alt="Logo Utama"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-[12px] text-[#999] font-medium">Belum ada logo terunggah</span>
                  )}
                </div>

                <input
                  type="file"
                  ref={lightLogoInputRef}
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, "light")}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => lightLogoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-[#f6f6f6] border border-[#e2e2e2] text-[#202020] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer"
                >
                  <Upload size={13} />
                  <span>{uploadingLogo ? "Mengunggah..." : "Unggah Logo Utama (PNG)"}</span>
                </button>
              </div>

              {/* Logo Dark Mode */}
              <div className="border border-[#e8e8e8] rounded-[10px] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[14px] text-[#202020]">Logo Alternatif (Dark Mode)</h3>
                    <p className="text-[11px] text-[#888] mt-0.5">Tampil saat tema kiosk gelap (Dark Studio/Noir)</p>
                  </div>
                  {branding.logoDarkUrl && (
                    <button
                      type="button"
                      onClick={() => updateBrandingField("logoDarkUrl", "")}
                      className="text-[11px] text-[#dc2626] hover:underline cursor-pointer"
                    >
                      Hapus
                    </button>
                  )}
                </div>

                <div className="aspect-[3/1] bg-[#171717] border border-dashed border-[#333] rounded-[8px] flex items-center justify-center p-4 overflow-hidden relative">
                  {branding.logoDarkUrl ? (
                    <img
                      src={branding.logoDarkUrl}
                      alt="Logo Dark Mode"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-[12px] text-[#777] font-medium">Opsional (Gunakan jika tema gelap)</span>
                  )}
                </div>

                <input
                  type="file"
                  ref={darkLogoInputRef}
                  accept="image/*"
                  onChange={(e) => handleLogoUpload(e, "dark")}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => darkLogoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-white hover:bg-[#f6f6f6] border border-[#e2e2e2] text-[#202020] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer"
                >
                  <Upload size={13} />
                  <span>{uploadingLogo ? "Mengunggah..." : "Unggah Logo Dark Mode"}</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#fafafa] border border-[#e8e8e8] rounded-[8px] text-[12px] text-[#777] leading-relaxed">
              💡 <strong>Tips Format:</strong> Disarankan menggunakan gambar format <strong>PNG transparan</strong> dengan rasio horizontal atau persegi resolusi minimal 512×512 px agar logo tampil tajam di layar sentuh bilik Kiosk.
            </div>
          </div>
        )}

        {/* TAB 3: STRUK KASIR THERMAL (80mm) */}
        {activeTab === "receipt" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Controls (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 space-y-6">
              <div className="pb-4 border-b border-[#f0f0f0]">
                <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                  Pengaturan Struk Closing Kasir
                </h2>
                <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                  Atur teks header, kontak, dan footer nota yang tercetak di printer thermal kasir 80mm.
                </p>
              </div>

              <div className="space-y-4 text-[13px]">
                <div>
                  <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                    Nama Studio di Struk (Header)
                  </label>
                  <input
                    type="text"
                    value={branding.receipt.headerTitle}
                    onChange={(e) => updateReceiptField("headerTitle", e.target.value)}
                    placeholder="IGNOS STUDIO"
                    className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none font-medium bg-white"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                    Sub-Judul / Teks Nota
                  </label>
                  <input
                    type="text"
                    value={branding.receipt.headerSub}
                    onChange={(e) => updateReceiptField("headerSub", e.target.value)}
                    placeholder="REKAP CLOSING SHIFT"
                    className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                      Alamat Baris 1
                    </label>
                    <input
                      type="text"
                      value={branding.receipt.addressLine1}
                      onChange={(e) => updateReceiptField("addressLine1", e.target.value)}
                      placeholder="Jl. Raya Abiansemal No. 12"
                      className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                      Alamat Baris 2 (Kota / Daerah)
                    </label>
                    <input
                      type="text"
                      value={branding.receipt.addressLine2}
                      onChange={(e) => updateReceiptField("addressLine2", e.target.value)}
                      placeholder="Badung, Bali"
                      className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                    Kontak / WhatsApp di Struk
                  </label>
                  <input
                    type="text"
                    value={branding.receipt.phoneContact}
                    onChange={(e) => updateReceiptField("phoneContact", e.target.value)}
                    placeholder="WA: 0812-3456-7890"
                    className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                    Pesan Terima Kasih (Footer Note)
                  </label>
                  <input
                    type="text"
                    value={branding.receipt.footerNote}
                    onChange={(e) => updateReceiptField("footerNote", e.target.value)}
                    placeholder="Terima kasih telah berfoto bersama kami!"
                    className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                    Sosial Media Note
                  </label>
                  <input
                    type="text"
                    value={branding.receipt.socialNote}
                    onChange={(e) => updateReceiptField("socialNote", e.target.value)}
                    placeholder="Tag Instagram kami: @ignos.studio"
                    className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Live Thermal Receipt Simulation (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-[#e8e8e8] rounded-[12px] p-6 space-y-4">
              <div>
                <h3 className="text-[14px] font-semibold text-[#202020]">
                  Simulasi Kertas Struk 80mm
                </h3>
                <p className="text-[11px] text-[#888] mt-0.5">
                  Tampilan fisik hasil cetak printer thermal kasir
                </p>
              </div>

              {/* Thermal Paper Enclosure */}
              <div className="bg-[#fafafa] border border-[#e2e2e2] rounded-[8px] p-6 font-mono text-[11px] text-[#202020] shadow-2xs space-y-3 leading-relaxed">
                <div className="text-center space-y-0.5">
                  <p className="font-bold text-[14px] uppercase">{branding.receipt.headerTitle || branding.studioName}</p>
                  <p className="text-[10px] text-[#666]">{branding.receipt.headerSub}</p>
                  {branding.receipt.addressLine1 && <p className="text-[10px] text-[#888]">{branding.receipt.addressLine1}</p>}
                  {branding.receipt.addressLine2 && <p className="text-[10px] text-[#888]">{branding.receipt.addressLine2}</p>}
                  {branding.receipt.phoneContact && <p className="text-[10px] text-[#888]">{branding.receipt.phoneContact}</p>}
                </div>

                <div className="border-t border-dashed border-[#ccc] my-2" />

                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span>{new Date().toLocaleDateString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Sesi:</span>
                    <span>12 sesi (24 orang)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kertas 4R:</span>
                    <span>32 lembar</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Klaim Softcopy:</span>
                    <span>10x gratis / 2x bayar</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-[#ccc] my-2" />

                <div className="flex justify-between font-bold text-[12px]">
                  <span>TOTAL OMSET:</span>
                  <span>Rp 750.000</span>
                </div>

                <div className="border-t border-dashed border-[#ccc] my-2" />

                <div className="text-center text-[10px] text-[#666] space-y-1 pt-1">
                  <p>{branding.receipt.footerNote}</p>
                  <p className="font-semibold">{branding.receipt.socialNote}</p>
                  <p className="text-[9px] text-[#aaa] mt-2">Tanda Tangan Kasir:</p>
                  <p className="text-[9px] text-[#aaa] pt-4">( ................................... )</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEMPLATE PESAN WHATSAPP */}
        {activeTab === "whatsapp" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Controls (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 space-y-6">
              <div className="pb-4 border-b border-[#f0f0f0]">
                <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                  Template Pesan Softcopy WhatsApp
                </h2>
                <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                  Atur susunan kalimat pengiriman tautan Google Drive yang dikirimkan kasir ke WhatsApp customer.
                </p>
              </div>

              <div className="space-y-4 text-[13px]">
                <div>
                  <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                    Kalimat Sapaan Header
                  </label>
                  <input
                    type="text"
                    value={branding.whatsapp.headerGreeting}
                    onChange={(e) => updateWhatsappField("headerGreeting", e.target.value)}
                    placeholder="Halo Kakak {customerName}"
                    className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white"
                  />
                  <p className="text-[11px] text-[#888] mt-1 font-mono">
                    Gunakan tag {"{customerName}"} untuk menyisipkan nama customer otomatis.
                  </p>
                </div>

                <div>
                  <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                    Kalimat Pengantar Link Drive
                  </label>
                  <textarea
                    rows={2}
                    value={branding.whatsapp.introText}
                    onChange={(e) => updateWhatsappField("introText", e.target.value)}
                    className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white resize-none"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                    Tag Instagram Studio
                  </label>
                  <input
                    type="text"
                    value={branding.whatsapp.instagramTag}
                    onChange={(e) => updateWhatsappField("instagramTag", e.target.value)}
                    placeholder="@ignos.studio"
                    className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none font-mono bg-white"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                    Disclaimer & Penutup (Masa Berlaku Link)
                  </label>
                  <textarea
                    rows={3}
                    value={branding.whatsapp.footerDisclaimer}
                    onChange={(e) => updateWhatsappField("footerDisclaimer", e.target.value)}
                    className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Live Simulation Balon WhatsApp (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-[#e8e8e8] rounded-[12px] p-6 space-y-4">
              <div>
                <h3 className="text-[14px] font-semibold text-[#202020]">
                  Simulasi Tampilan Chat Customer
                </h3>
                <p className="text-[11px] text-[#888] mt-0.5">
                  Pratinjau pesan di layar smartphone pelanggan
                </p>
              </div>

              <div className="bg-[#f7f7f7] border border-[#e8e8e8] rounded-[10px] p-4 space-y-3">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[#e5e5e5]">
                  <div className="w-7 h-7 rounded-full bg-[#171717] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    {branding.studioName.slice(0, 2).toUpperCase() || "IG"}
                  </div>
                  <div>
                    <p className="font-semibold text-[13px] text-[#202020] leading-tight">
                      {branding.studioName || "Ignos Studio"}
                    </p>
                    <p className="text-[10px] text-[#888]">WhatsApp Business</p>
                  </div>
                </div>

                <div className="bg-white border border-[#e0e0e0] rounded-[10px] rounded-tl-none p-4 shadow-2xs space-y-2 text-[12px] text-[#202020] leading-relaxed">
                  <p className="font-medium">
                    {branding.whatsapp.headerGreeting.replace("{customerName}", "Sari")} Selamat Siang✨
                  </p>
                  <p>{branding.whatsapp.introText}</p>
                  <p className="text-[#0284c7] font-mono text-[11px] break-all underline">
                    https://drive.google.com/drive/folders/1aBcDeFg...
                  </p>
                  <p className="text-[11px] text-[#555]">
                    Jangan lupa tag kami yaa kak <strong>{branding.whatsapp.instagramTag}</strong>
                  </p>
                  <p className="text-[11px] text-[#777] italic">
                    {branding.whatsapp.footerDisclaimer}
                  </p>
                  <p className="text-[10px] text-[#aaa] text-right font-mono pt-1">
                    14:30 WIB · Dibaca
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: WATERMARK KERTAS CETAK */}
        {activeTab === "watermark" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Controls (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 space-y-6">
              <div className="pb-4 border-b border-[#f0f0f0]">
                <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                  Watermark Margin Kertas Cetak 4R
                </h2>
                <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                  Sematkan tanda identitas studio atau nama pasangan pengantin di margin tepi foto cetak fisik secara otomatis.
                </p>
              </div>

              <div className="space-y-4 text-[13px]">
                {/* Toggle Enable */}
                <div className="flex items-center justify-between p-4 rounded-[8px] bg-[#fafafa] border border-[#e8e8e8]">
                  <div className="pr-4">
                    <strong className="text-[13px] font-medium text-[#202020] block">
                      Aktifkan Watermark di Kertas Foto
                    </strong>
                    <p className="text-[12px] text-[#777] mt-0.5 leading-[1.6]">
                      Menambahkan cap teks identitas studio pada setiap lembar foto 4R yang dicetak printer.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={branding.watermark.enabled}
                      onChange={(e) => updateWatermarkField("enabled", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#e0e0e0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#171717]"></div>
                  </label>
                </div>

                {branding.watermark.enabled && (
                  <>
                    <div>
                      <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                        Teks Watermark
                      </label>
                      <input
                        type="text"
                        value={branding.watermark.text}
                        onChange={(e) => updateWatermarkField("text", e.target.value)}
                        placeholder="Contoh: IGNOS PHOTOBOOTH atau #SARAHANDI2026"
                        className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none font-mono bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-[#444] mb-2 block text-[12px]">
                        Posisi Penempatan Watermark
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "bottom-left", label: "Kiri Bawah" },
                          { id: "bottom-center", label: "Tengah Bawah" },
                          { id: "bottom-right", label: "Kanan Bawah" },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => updateWatermarkField("position", pos.id as any)}
                            className={`py-2 text-[12px] font-medium rounded-[7px] border transition-colors cursor-pointer ${
                              branding.watermark.position === pos.id
                                ? "bg-[#171717] text-white border-[#171717] font-semibold"
                                : "bg-white text-[#555] border-[#e0e0e0] hover:bg-[#f6f6f6]"
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="font-medium text-[#444] text-[12px]">
                          Opasitas Watermark
                        </label>
                        <span className="font-mono text-[12px] font-medium text-[#202020]">
                          {Math.round(branding.watermark.opacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={branding.watermark.opacity}
                        onChange={(e) => updateWatermarkField("opacity", parseFloat(e.target.value))}
                        className="w-full accent-[#171717] cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Live 4R Photo Preview (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-[#e8e8e8] rounded-[12px] p-6 space-y-4">
              <div>
                <h3 className="text-[14px] font-semibold text-[#202020]">
                  Simulasi Hasil Cetak 4R
                </h3>
                <p className="text-[11px] text-[#888] mt-0.5">
                  Posisi cap watermark pada margin foto
                </p>
              </div>

              {/* 4R Photo frame simulation */}
              <div className="aspect-[2/3] max-w-[260px] mx-auto bg-[#f0f0f0] border-2 border-[#171717] rounded-[6px] shadow-sm p-3 flex flex-col justify-between relative overflow-hidden">
                <div className="grid grid-cols-2 gap-2 my-auto">
                  <div className="aspect-square bg-[#ddd] rounded-[4px] flex items-center justify-center text-[10px] text-[#888]">Slot 1</div>
                  <div className="aspect-square bg-[#ddd] rounded-[4px] flex items-center justify-center text-[10px] text-[#888]">Slot 2</div>
                  <div className="aspect-square bg-[#ddd] rounded-[4px] flex items-center justify-center text-[10px] text-[#888]">Slot 3</div>
                  <div className="aspect-square bg-[#ddd] rounded-[4px] flex items-center justify-center text-[10px] text-[#888]">Slot 4</div>
                </div>

                {branding.watermark.enabled && (
                  <div
                    className={`pt-2 text-[9px] font-mono tracking-wider uppercase ${
                      branding.watermark.position === "bottom-left"
                        ? "text-left"
                        : branding.watermark.position === "bottom-center"
                          ? "text-center"
                          : "text-right"
                    }`}
                    style={{ opacity: branding.watermark.opacity }}
                  >
                    <span>{branding.watermark.text || branding.studioName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Standard Admin Confirmation Modal Conforming to GEMINI.md Rule 5 ── */}
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
