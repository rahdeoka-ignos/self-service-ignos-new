import { useState } from "react";
import {
  Check,
  RefreshCw,
  Camera,
  Users,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfirmModal } from "../components/AdminConfirmModal";
import { useKioskTheme } from "../../context/KioskThemeContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import {
  KioskThemeConfig,
  ThemePresetId,
  BorderRadiusType,
  BorderWidthType,
  ShadowStyleType,
  FontFamilyType,
} from "../../types/kioskTheme";

export function AdminKioskThemePage() {
  usePageTitle("Tema & Alur Kiosk — Ignos");

  const {
    theme,
    setTheme,
    applyPreset,
    saveTheme,
    resetTheme,
    saving,
  } = useKioskTheme();

  const [activeTab, setActiveTab] = useState<
    "presets" | "colors" | "branding" | "flow"
  >("presets");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Unified AdminConfirmModal state conforming to GEMINI.md
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

  const handleApplyPreset = (presetId: ThemePresetId) => {
    applyPreset(presetId);
  };

  const handleSave = async () => {
    const ok = await saveTheme();
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } else {
      setModalConfig({
        isOpen: true,
        title: "Gagal Menyimpan Tema",
        category: "Kendala Server",
        description: "Terjadi kesalahan saat menyimpan pengaturan tema ke server. Pastikan backend aktif.",
        singleButton: true,
        variant: "warning",
      });
    }
  };

  const handleReset = () => {
    setModalConfig({
      isOpen: true,
      title: "Kembalikan ke Preset Bawaan?",
      category: "Konfirmasi Reset Tema",
      description: "Seluruh konfigurasi warna, geometri sudut, identitas studio, dan alur kiosk akan dikembalikan ke tema standar Pop Studio (Neo-Brutalism).",
      confirmText: "Reset Bawaan",
      cancelText: "Batal",
      isDangerous: true,
      variant: "warning",
      onConfirm: async () => {
        await resetTheme();
      },
    });
  };

  const updateThemeField = <K extends keyof KioskThemeConfig>(
    key: K,
    value: KioskThemeConfig[K],
  ) => {
    setTheme((prev) => ({
      ...prev,
      presetId: "custom",
      [key]: value,
    }));
  };

  // Preview helper values
  const radiusMap: Record<BorderRadiusType, string> = {
    none: "0px",
    sm: "6px",
    md: "10px",
    lg: "16px",
    full: "24px",
  };
  const borderWMap: Record<BorderWidthType, string> = {
    none: "0px",
    thin: "1px",
    medium: "2px",
    thick: "4px",
  };
  const shadowMap: Record<ShadowStyleType, string> = {
    none: "none",
    soft: "0 2px 8px rgba(0,0,0,0.06)",
    "hard-offset": `3px 3px 0px 0px ${theme.borderColor || "#000"}`,
    elevated: "0 8px 24px rgba(0,0,0,0.12)",
  };
  const fontMap: Record<FontFamilyType, string> = {
    manrope: "'Manrope', sans-serif",
    "space-grotesk": "'Space Grotesk', sans-serif",
    poppins: "'Poppins', sans-serif",
  };

  return (
    <AdminLayout>
      <div className="w-full p-6 md:p-8 space-y-8">
        {/* ── 1. HEADER & ACTIONS ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#e8e8e8]">
          <div>
            <p className="text-[10px] tracking-[0.14em] text-[#999] uppercase font-medium">
              PENGATURAN TAMPILAN BILIK
            </p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.04em] text-[#202020] leading-[1.25] mt-1.5">
              Tema & Alur Kiosk
            </h1>
            <p className="text-[13px] text-[#777] leading-[1.8] mt-1 max-w-2xl">
              Pilih preset tema visual atau sesuaikan warna, geometri sudut, identitas studio, serta alur langkah customer di bilik foto.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#e6e6e6] text-[#444] hover:bg-[#f6f6f6] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
              title="Reset ke tema bawaan sistem"
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
                  <span>{saving ? "Menyimpan..." : "Terapkan ke Kiosk"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── 2. 4 EXECUTIVE STATUS METRICS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Preset Tema Aktif</span>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] capitalize tracking-tight">
                {theme.presetId === "neo-brutalism"
                  ? "Pop Studio"
                  : theme.presetId === "clean-minimal"
                    ? "Clean Minimal"
                    : theme.presetId === "luxury-wedding"
                      ? "Romantic Champagne"
                      : theme.presetId === "dark-studio"
                        ? "Cyber Noir"
                        : "Custom Style"}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                {theme.presetId === "custom" ? "Penyesuaian manual" : "Preset siap pakai"}
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>ID: {theme.presetId}</span>
            </div>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Mode Operasional</span>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] tracking-tight">
                {theme.freeEventMode ? "Event Gratis" : "Standar Berbayar"}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                {theme.freeEventMode
                  ? "Bilik event / sewa wedding (tanpa kasir)"
                  : "Operasional reguler studio komersial"}
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Alur Pembayaran: {theme.freeEventMode ? "Dilewati" : "Aktif"}</span>
            </div>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Geometri Sudut & Garis</span>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] font-mono tracking-tight">
                {radiusMap[theme.borderRadius]} · {borderWMap[theme.borderWidth]}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                Bayangan: {theme.shadowStyle}
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Border: {theme.borderColor || "Hitam"}</span>
            </div>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Tipografi Bilik</span>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] tracking-tight">
                {theme.fontFamily === "manrope"
                  ? "Manrope"
                  : theme.fontFamily === "space-grotesk"
                    ? "Space Grotesk"
                    : "Poppins"}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                Font utama seluruh teks di bilik foto
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Branding: {theme.studioName || "Ignos Studio"}</span>
            </div>
          </div>
        </div>

        {/* ── 3. TWO-COLUMN LAYOUT: SETTINGS (7 cols) & LIVE MOCKUP (5 cols) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* ── LEFT COLUMN: CONTROLS & TABS ── */}
          <div className="xl:col-span-7 space-y-6">
            {/* Pure Typography Navigation Tabs (Conforming to GEMINI.md Rule 2) */}
            <div className="border-b border-[#e8e8e8] flex items-center gap-8 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab("presets")}
                className={`pb-3 text-[14px] transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === "presets"
                    ? "border-b-2 border-[#171717] font-semibold text-[#171717]"
                    : "border-b-2 border-transparent font-medium text-[#777] hover:text-[#171717]"
                }`}
              >
                Preset Siap Pakai
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("colors")}
                className={`pb-3 text-[14px] transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === "colors"
                    ? "border-b-2 border-[#171717] font-semibold text-[#171717]"
                    : "border-b-2 border-transparent font-medium text-[#777] hover:text-[#171717]"
                }`}
              >
                Warna & Geometri
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("branding")}
                className={`pb-3 text-[14px] transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === "branding"
                    ? "border-b-2 border-[#171717] font-semibold text-[#171717]"
                    : "border-b-2 border-transparent font-medium text-[#777] hover:text-[#171717]"
                }`}
              >
                Identitas & Teks
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("flow")}
                className={`pb-3 text-[14px] transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === "flow"
                    ? "border-b-2 border-[#171717] font-semibold text-[#171717]"
                    : "border-b-2 border-transparent font-medium text-[#777] hover:text-[#171717]"
                }`}
              >
                Alur & Langkah Kiosk
              </button>
            </div>

            {/* TAB 1: PRESET SIAP PAKAI */}
            {activeTab === "presets" && (
              <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 space-y-6">
                <div className="pb-4 border-b border-[#f0f0f0]">
                  <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                    Koleksi Preset Tema
                  </h2>
                  <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                    Pilih salah satu preset untuk langsung memuat tata visual ke bilik foto pelanggan.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Preset 1: Neo-Brutalisme */}
                  <div
                    onClick={() => handleApplyPreset("neo-brutalism")}
                    className={`p-5 rounded-[10px] border transition-all cursor-pointer flex flex-col justify-between ${
                      theme.presetId === "neo-brutalism"
                        ? "border-[#171717] bg-[#fafafa] shadow-xs"
                        : "border-[#e8e8e8] bg-white hover:border-[#ccc]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#f2f2f2] text-[#333]">
                          Brutalist
                        </span>
                        {theme.presetId === "neo-brutalism" && (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#171717]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                            <span>Aktif</span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-[15px] text-[#202020]">
                        Pop Studio (Default)
                      </h3>
                      <p className="text-[12px] text-[#777] mt-1.5 leading-[1.6]">
                        Border tebal 4px, bayangan offset hitam pekat, warna pop berani, dan font Space Grotesk.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-5 pt-3 border-t border-[#f0f0f0]">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#fde047] border border-[#ddd]" />
                      <span className="w-3.5 h-3.5 rounded-full bg-[#000000] border border-[#ddd]" />
                      <span className="w-3.5 h-3.5 rounded-full bg-[#ffffff] border border-[#ddd]" />
                      <span className="text-[11px] text-[#999] ml-auto font-mono">Original</span>
                    </div>
                  </div>

                  {/* Preset 2: Clean Minimal */}
                  <div
                    onClick={() => handleApplyPreset("clean-minimal")}
                    className={`p-5 rounded-[10px] border transition-all cursor-pointer flex flex-col justify-between ${
                      theme.presetId === "clean-minimal"
                        ? "border-[#171717] bg-[#fafafa] shadow-xs"
                        : "border-[#e8e8e8] bg-white hover:border-[#ccc]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#f2f2f2] text-[#333]">
                          Editorial
                        </span>
                        {theme.presetId === "clean-minimal" && (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#171717]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                            <span>Aktif</span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-[15px] text-[#202020]">
                        Amara / Clean Minimal
                      </h3>
                      <p className="text-[12px] text-[#777] mt-1.5 leading-[1.6]">
                        Border tipis 1px, latar belakang off-white tenang, bayangan mikro halus, dan font Manrope.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-5 pt-3 border-t border-[#f0f0f0]">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#fafafa] border border-[#ddd]" />
                      <span className="w-3.5 h-3.5 rounded-full bg-[#171717] border border-[#ddd]" />
                      <span className="w-3.5 h-3.5 rounded-full bg-[#10b981] border border-[#ddd]" />
                      <span className="text-[11px] text-[#999] ml-auto font-mono">Quiet Luxury</span>
                    </div>
                  </div>

                  {/* Preset 3: Luxury Wedding */}
                  <div
                    onClick={() => handleApplyPreset("luxury-wedding")}
                    className={`p-5 rounded-[10px] border transition-all cursor-pointer flex flex-col justify-between ${
                      theme.presetId === "luxury-wedding"
                        ? "border-[#171717] bg-[#fafafa] shadow-xs"
                        : "border-[#e8e8e8] bg-white hover:border-[#ccc]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#f2f2f2] text-[#333]">
                          Wedding
                        </span>
                        {theme.presetId === "luxury-wedding" && (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#171717]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                            <span>Aktif</span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-[15px] text-[#202020]">
                        Romantic Champagne
                      </h3>
                      <p className="text-[12px] text-[#777] mt-1.5 leading-[1.6]">
                        Nuansa linen krem hangat, aksen emas elegan, sudut melengkung halus, mode sewa gratis.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-5 pt-3 border-t border-[#f0f0f0]">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#fdfbf7] border border-[#ddd]" />
                      <span className="w-3.5 h-3.5 rounded-full bg-[#78350f] border border-[#ddd]" />
                      <span className="w-3.5 h-3.5 rounded-full bg-[#d97706] border border-[#ddd]" />
                      <span className="text-[11px] text-[#999] ml-auto font-mono">Rental Event</span>
                    </div>
                  </div>

                  {/* Preset 4: Dark Studio */}
                  <div
                    onClick={() => handleApplyPreset("dark-studio")}
                    className={`p-5 rounded-[10px] border transition-all cursor-pointer flex flex-col justify-between ${
                      theme.presetId === "dark-studio"
                        ? "border-[#171717] bg-[#fafafa] shadow-xs"
                        : "border-[#e8e8e8] bg-white hover:border-[#ccc]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#f2f2f2] text-[#333]">
                          Dark Mode
                        </span>
                        {theme.presetId === "dark-studio" && (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#171717]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                            <span>Aktif</span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-[15px] text-[#202020]">
                        Cyber Noir (Dark Studio)
                      </h3>
                      <p className="text-[12px] text-[#777] mt-1.5 leading-[1.6]">
                        Latar gelap pekat sinematik dengan panel kontras tinggi dan aksen neon cyan modern.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-5 pt-3 border-t border-[#f0f0f0]">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#09090b] border border-[#ddd]" />
                      <span className="w-3.5 h-3.5 rounded-full bg-[#ffffff] border border-[#ddd]" />
                      <span className="w-3.5 h-3.5 rounded-full bg-[#06b6d4] border border-[#ddd]" />
                      <span className="text-[11px] text-[#999] ml-auto font-mono">Noir</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: WARNA & BENTUK */}
            {activeTab === "colors" && (
              <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 space-y-6">
                <div className="pb-4 border-b border-[#f0f0f0]">
                  <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                    Kustomisasi Warna & Geometri
                  </h2>
                  <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                    Atur palet warna hex dan gaya visual elemen tombol serta kartu di bilik foto.
                  </p>
                </div>

                {/* Color Pickers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Background Layar Kiosk
                    </label>
                    <div className="flex items-center gap-2 border border-[#e0e0e0] focus-within:border-[#171717] rounded-[7px] px-2.5 py-1.5 bg-white transition-colors">
                      <input
                        type="color"
                        value={theme.backgroundColor}
                        onChange={(e) => updateThemeField("backgroundColor", e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={theme.backgroundColor}
                        onChange={(e) => updateThemeField("backgroundColor", e.target.value)}
                        className="flex-1 font-mono text-[12px] text-[#202020] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Background Kartu / Panel
                    </label>
                    <div className="flex items-center gap-2 border border-[#e0e0e0] focus-within:border-[#171717] rounded-[7px] px-2.5 py-1.5 bg-white transition-colors">
                      <input
                        type="color"
                        value={theme.cardBackgroundColor}
                        onChange={(e) => updateThemeField("cardBackgroundColor", e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={theme.cardBackgroundColor}
                        onChange={(e) => updateThemeField("cardBackgroundColor", e.target.value)}
                        className="flex-1 font-mono text-[12px] text-[#202020] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Warna Tombol Utama (Primary)
                    </label>
                    <div className="flex items-center gap-2 border border-[#e0e0e0] focus-within:border-[#171717] rounded-[7px] px-2.5 py-1.5 bg-white transition-colors">
                      <input
                        type="color"
                        value={theme.primaryColor}
                        onChange={(e) => updateThemeField("primaryColor", e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={theme.primaryColor}
                        onChange={(e) => updateThemeField("primaryColor", e.target.value)}
                        className="flex-1 font-mono text-[12px] text-[#202020] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Warna Teks Tombol Utama
                    </label>
                    <div className="flex items-center gap-2 border border-[#e0e0e0] focus-within:border-[#171717] rounded-[7px] px-2.5 py-1.5 bg-white transition-colors">
                      <input
                        type="color"
                        value={theme.primaryTextColor}
                        onChange={(e) => updateThemeField("primaryTextColor", e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={theme.primaryTextColor}
                        onChange={(e) => updateThemeField("primaryTextColor", e.target.value)}
                        className="flex-1 font-mono text-[12px] text-[#202020] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Warna Teks Konten
                    </label>
                    <div className="flex items-center gap-2 border border-[#e0e0e0] focus-within:border-[#171717] rounded-[7px] px-2.5 py-1.5 bg-white transition-colors">
                      <input
                        type="color"
                        value={theme.textColor}
                        onChange={(e) => updateThemeField("textColor", e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={theme.textColor}
                        onChange={(e) => updateThemeField("textColor", e.target.value)}
                        className="flex-1 font-mono text-[12px] text-[#202020] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Warna Garis Border
                    </label>
                    <div className="flex items-center gap-2 border border-[#e0e0e0] focus-within:border-[#171717] rounded-[7px] px-2.5 py-1.5 bg-white transition-colors">
                      <input
                        type="color"
                        value={theme.borderColor}
                        onChange={(e) => updateThemeField("borderColor", e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={theme.borderColor}
                        onChange={(e) => updateThemeField("borderColor", e.target.value)}
                        className="flex-1 font-mono text-[12px] text-[#202020] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Shape & Geometry Settings */}
                <div className="pt-5 border-t border-[#f0f0f0] space-y-5 text-[13px]">
                  {/* Border Radius */}
                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-2 block">
                      Border Radius (Kelengkungan Sudut Elemen)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {(["none", "sm", "md", "lg", "full"] as BorderRadiusType[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => updateThemeField("borderRadius", r)}
                          className={`py-2 text-[12px] font-medium rounded-[7px] border transition-colors cursor-pointer ${
                            theme.borderRadius === r
                              ? "bg-[#171717] text-white border-[#171717] font-semibold"
                              : "bg-white text-[#555] border-[#e0e0e0] hover:bg-[#f6f6f6] hover:text-[#171717]"
                          }`}
                        >
                          {r === "none"
                            ? "0px"
                            : r === "sm"
                              ? "6px"
                              : r === "md"
                                ? "10px"
                                : r === "lg"
                                  ? "16px"
                                  : "24px"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Border Width */}
                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-2 block">
                      Ketebalan Garis Border
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(["none", "thin", "medium", "thick"] as BorderWidthType[]).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => updateThemeField("borderWidth", w)}
                          className={`py-2 text-[12px] font-medium rounded-[7px] border transition-colors cursor-pointer ${
                            theme.borderWidth === w
                              ? "bg-[#171717] text-white border-[#171717] font-semibold"
                              : "bg-white text-[#555] border-[#e0e0e0] hover:bg-[#f6f6f6] hover:text-[#171717]"
                          }`}
                        >
                          {w === "none"
                            ? "Tanpa Garis"
                            : w === "thin"
                              ? "1px Tipis"
                              : w === "medium"
                                ? "2px Sedang"
                                : "4px Tebal"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shadow Style */}
                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-2 block">
                      Gaya Bayangan (Shadow)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(["none", "soft", "hard-offset", "elevated"] as ShadowStyleType[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateThemeField("shadowStyle", s)}
                          className={`py-2 text-[12px] font-medium rounded-[7px] border transition-colors cursor-pointer ${
                            theme.shadowStyle === s
                              ? "bg-[#171717] text-white border-[#171717] font-semibold"
                              : "bg-white text-[#555] border-[#e0e0e0] hover:bg-[#f6f6f6] hover:text-[#171717]"
                          }`}
                        >
                          {s === "none"
                            ? "Flat (0)"
                            : s === "soft"
                              ? "Soft Mikro"
                              : s === "hard-offset"
                                ? "Offset Pekat"
                                : "Elevated Blur"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-2 block">
                      Tipografi Bilik (Font Family)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "manrope", label: "Manrope (Clean Minimal)" },
                        { id: "space-grotesk", label: "Space Grotesk (Neo-Brutalist)" },
                        { id: "poppins", label: "Poppins (Rounded Pop)" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => updateThemeField("fontFamily", f.id as FontFamilyType)}
                          className={`py-2 px-3 text-[12px] font-medium rounded-[7px] border transition-colors cursor-pointer text-center ${
                            theme.fontFamily === f.id
                              ? "bg-[#171717] text-white border-[#171717] font-semibold"
                              : "bg-white text-[#555] border-[#e0e0e0] hover:bg-[#f6f6f6] hover:text-[#171717]"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: LOGO & COPYWRITING */}
            {activeTab === "branding" && (
              <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 space-y-6">
                <div className="pb-4 border-b border-[#f0f0f0]">
                  <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                    Identitas Studio & Copywriting
                  </h2>
                  <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                    Sesuaikan nama studio, logo bilik, serta pesan teks sambutan pada layar utama kiosk.
                  </p>
                </div>

                <div className="space-y-4 text-[13px]">
                  <div>
                    <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                      Nama Studio / Nama Acara Sewa
                    </label>
                    <input
                      type="text"
                      value={theme.studioName}
                      onChange={(e) => updateThemeField("studioName", e.target.value)}
                      placeholder="Contoh: IGNOS STUDIO atau SARAH & ANDI WEDDING"
                      className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                      URL Gambar Logo Bilik (Opsional)
                    </label>
                    <input
                      type="url"
                      value={theme.logoUrl || ""}
                      onChange={(e) => updateThemeField("logoUrl", e.target.value)}
                      placeholder="https://... atau /img/logo/brand.png"
                      className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white transition-colors font-mono"
                    />
                    <p className="text-[11px] text-[#888] mt-1">
                      Kosongkan jika ingin menampilkan teks nama studio tanpa logo gambar.
                    </p>
                  </div>

                  <div>
                    <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                      Headline Teks Sambutan (Layar Selamat Datang)
                    </label>
                    <input
                      type="text"
                      value={theme.homeHeadline}
                      onChange={(e) => updateThemeField("homeHeadline", e.target.value)}
                      placeholder="Contoh: Kamu Habis Fotoan Dimana? atau Selamat Datang!"
                      className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                      Sub-Headline / Petunjuk Tambahan
                    </label>
                    <input
                      type="text"
                      value={theme.homeSubheadline}
                      onChange={(e) => updateThemeField("homeSubheadline", e.target.value)}
                      placeholder="Contoh: Sentuh layar untuk mulai berfoto"
                      className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ALUR & LANGKAH KIOSK */}
            {activeTab === "flow" && (
              <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 space-y-6">
                <div className="pb-4 border-b border-[#f0f0f0]">
                  <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                    Pengaturan Alur Langkah Kiosk
                  </h2>
                  <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                    Aktifkan atau lewati langkah tertentu sesuai kebutuhan studio atau paket sewa event.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Free Event Mode Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-[8px] bg-white border border-[#e8e8e8]">
                    <div className="pr-4">
                      <strong className="text-[13px] font-medium text-[#202020] block">
                        Mode Event Gratis (Sewa Wedding / Corporate)
                      </strong>
                      <p className="text-[12px] text-[#777] mt-0.5 leading-[1.6]">
                        Menonaktifkan tarif dan alur kasir. Sesi customer langsung dicetak gratis untuk para tamu acara.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={theme.freeEventMode}
                        onChange={(e) => updateThemeField("freeEventMode", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#e0e0e0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#171717]"></div>
                    </label>
                  </div>

                  {/* Tutorial Bonus Story Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-[8px] bg-white border border-[#e8e8e8]">
                    <div className="pr-4">
                      <strong className="text-[13px] font-medium text-[#202020] block">
                        Langkah Panduan Bonus Story Instagram
                      </strong>
                      <p className="text-[12px] text-[#777] mt-0.5 leading-[1.6]">
                        Menampilkan tutorial cara upload Story untuk klaim lembar cetak ekstra.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={theme.enableBonusTutorial}
                        onChange={(e) => updateThemeField("enableBonusTutorial", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#e0e0e0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#171717]"></div>
                    </label>
                  </div>

                  {/* Add-ons Step Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-[8px] bg-white border border-[#e8e8e8]">
                    <div className="pr-4">
                      <strong className="text-[13px] font-medium text-[#202020] block">
                        Langkah Penawaran Merchandise / Add-Ons
                      </strong>
                      <p className="text-[12px] text-[#777] mt-0.5 leading-[1.6]">
                        Menampilkan opsi pembelian gantungan kunci, cetak ekstra, dan bingkai foto sebelum checkout.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={theme.enableAddonsStep}
                        onChange={(e) => updateThemeField("enableAddonsStep", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#e0e0e0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#171717]"></div>
                    </label>
                  </div>

                  {/* Story Question Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-[8px] bg-white border border-[#e8e8e8]">
                    <div className="pr-4">
                      <strong className="text-[13px] font-medium text-[#202020] block">
                        Langkah Pertanyaan Softcopy Story
                      </strong>
                      <p className="text-[12px] text-[#777] mt-0.5 leading-[1.6]">
                        Menanyakan persetujuan upload Instagram Story untuk mendapatkan softcopy Google Drive gratis.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={theme.enableStoryQuestion}
                        onChange={(e) => updateThemeField("enableStoryQuestion", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#e0e0e0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#171717]"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: LIVE REAL-TIME KIOSK PREVIEW (5 cols) ── */}
          <div className="xl:col-span-5 sticky top-6">
            <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#202020]">
                    Pratinjau Bilik Kiosk
                  </h3>
                  <p className="text-[11px] text-[#888] mt-0.5">
                    Simulasi tampilan layar sentuh customer secara langsung
                  </p>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider bg-[#f2f2f2] text-[#444] px-2 py-0.5 rounded-[4px]">
                  {theme.presetId}
                </span>
              </div>

              {/* Kiosk Device Enclosure */}
              <div className="bg-[#171717] p-3.5 rounded-[14px] shadow-sm border border-[#2a2a2a]">
                {/* Device Camera Notch */}
                <div className="flex justify-center mb-2.5">
                  <div className="w-10 h-1 bg-[#333] rounded-full" />
                </div>

                {/* Rendered Kiosk Home Screen */}
                <div
                  className="w-full aspect-[4/3] rounded-[8px] p-5 flex flex-col justify-between overflow-hidden transition-all duration-300 select-none relative"
                  style={{
                    backgroundColor: theme.backgroundColor,
                    color: theme.textColor,
                    fontFamily: fontMap[theme.fontFamily] || "sans-serif",
                  }}
                >
                  {/* Top Branding */}
                  <div className="text-center pt-2">
                    {theme.logoUrl && (
                      <img
                        src={theme.logoUrl}
                        alt="Logo"
                        className="h-6 mx-auto mb-1.5 object-contain"
                      />
                    )}
                    <h4 className="text-[17px] font-bold tracking-tight leading-none">
                      {theme.studioName || "IGNOS STUDIO"}
                    </h4>
                    <p className="text-[11px] opacity-75 mt-1 leading-snug">
                      {theme.homeHeadline || "Kamu Habis Fotoan Dimana?"}
                    </p>
                  </div>

                  {/* 2 Service Selection Cards */}
                  <div className="grid grid-cols-2 gap-3 my-auto">
                    {/* Card 1: Photo Studio */}
                    <div
                      className="p-3 text-center flex flex-col items-center justify-center transition-all"
                      style={{
                        backgroundColor: theme.cardBackgroundColor,
                        borderRadius: radiusMap[theme.borderRadius],
                        borderWidth: borderWMap[theme.borderWidth],
                        borderColor: theme.borderColor,
                        boxShadow: shadowMap[theme.shadowStyle],
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center mb-2 border"
                        style={{
                          backgroundColor: theme.primaryColor,
                          borderColor: theme.borderColor,
                        }}
                      >
                        <Camera
                          size={16}
                          style={{ color: theme.primaryTextColor }}
                          strokeWidth={2}
                        />
                      </div>
                      <span className="font-bold text-[11px] block leading-tight">
                        Photo Studio
                      </span>
                      <button
                        type="button"
                        className="mt-2 text-[9px] font-bold px-2 py-0.5 transition-all"
                        style={{
                          backgroundColor: theme.primaryColor,
                          color: theme.primaryTextColor,
                          borderRadius: radiusMap[theme.borderRadius],
                          borderWidth: borderWMap[theme.borderWidth],
                          borderColor: theme.borderColor,
                        }}
                      >
                        Lanjut
                      </button>
                    </div>

                    {/* Card 2: Photo Box */}
                    <div
                      className="p-3 text-center flex flex-col items-center justify-center transition-all"
                      style={{
                        backgroundColor: theme.cardBackgroundColor,
                        borderRadius: radiusMap[theme.borderRadius],
                        borderWidth: borderWMap[theme.borderWidth],
                        borderColor: theme.borderColor,
                        boxShadow: shadowMap[theme.shadowStyle],
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center mb-2 border"
                        style={{
                          backgroundColor: theme.primaryColor,
                          borderColor: theme.borderColor,
                        }}
                      >
                        <Users
                          size={16}
                          style={{ color: theme.primaryTextColor }}
                          strokeWidth={2}
                        />
                      </div>
                      <span className="font-bold text-[11px] block leading-tight">
                        Photo Box
                      </span>
                      <button
                        type="button"
                        className="mt-2 text-[9px] font-bold px-2 py-0.5 transition-all"
                        style={{
                          backgroundColor: theme.primaryColor,
                          color: theme.primaryTextColor,
                          borderRadius: radiusMap[theme.borderRadius],
                          borderWidth: borderWMap[theme.borderWidth],
                          borderColor: theme.borderColor,
                        }}
                      >
                        Lanjut
                      </button>
                    </div>
                  </div>

                  {/* Kiosk Footer watermark */}
                  <div className="text-center text-[9px] opacity-40 font-mono">
                    {theme.freeEventMode
                      ? "• MODE SEWA WEDDING / EVENT AKTIF •"
                      : "IGNOS PHOTOBOOTH SYSTEM"}
                  </div>
                </div>
              </div>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-[#888]">
                  Perubahan warna & font akan langsung diperbarui di simulasi bilik.
                </span>
              </div>
            </div>
          </div>
        </div>

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
