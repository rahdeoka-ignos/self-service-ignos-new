import { useState } from "react";
import {
  Palette,
  Sparkles,
  Type,
  Sliders,
  Check,
  RefreshCw,
  Camera,
  Users,
  Eye,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  ArrowRight,
  ShieldCheck,
  Heart,
  Moon,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { useKioskTheme } from "../../context/KioskThemeContext";
import {
  KioskThemeConfig,
  THEME_PRESETS,
  ThemePresetId,
  BorderRadiusType,
  BorderWidthType,
  ShadowStyleType,
  FontFamilyType,
} from "../../types/kioskTheme";

export function AdminKioskThemePage() {
  const {
    theme,
    setTheme,
    applyPreset,
    saveTheme,
    resetTheme,
    loading,
    saving,
  } = useKioskTheme();

  const [activeTab, setActiveTab] = useState<
    "presets" | "colors" | "branding" | "flow"
  >("presets");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleApplyPreset = (presetId: ThemePresetId) => {
    applyPreset(presetId);
  };

  const handleSave = async () => {
    const ok = await saveTheme();
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } else {
      alert("Gagal menyimpan konfigurasi tema kiosk.");
    }
  };

  const handleReset = async () => {
    if (
      confirm(
        "Kembalikan tema kiosk ke pengaturan default Neo-Brutalism?",
      )
    ) {
      await resetTheme();
    }
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
      <div className="w-full max-w-[1620px] mx-auto px-6 md:px-9 py-8 space-y-6">
        {/* ── 1. HEADER (Amara: dash-heading) ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
          <div>
            <p className="text-[10px] tracking-[0.14em] text-[#999] uppercase font-medium">
              KIOSK EXPERIENCE & THEME ENGINE
            </p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.045em] text-[#202020] leading-[1.25] mt-1.5">
              Tema & Alur Kiosk
            </h1>
            <p className="text-[13px] text-[#888] leading-[1.8] mt-1">
              Pilih tema siap pakai atau sesuaikan palet warna, logo, copywriting, dan alur langkah kiosk pelanggan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#e6e6e6] text-[#444] hover:bg-[#f4f4f4] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
            >
              <RefreshCw size={13} strokeWidth={1.5} />
              <span>Reset Default</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#171717] text-white hover:bg-black rounded-[7px] text-[13px] font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check size={14} strokeWidth={2.5} className="text-[#10b981]" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Check size={14} strokeWidth={2} />
                  <span>{saving ? "Menyimpan..." : "Terapkan ke Kiosk"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── 2. TWO-COLUMN LAYOUT (CONTROLS & LIVE MOCKUP PREVIEW) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* ── LEFT COLUMN: CONTROLS & TABS (7 cols) ── */}
          <div className="xl:col-span-7 space-y-4">
            {/* Tabs Bar */}
            <div className="flex items-center gap-1 bg-[#f0f0f0]/80 p-1 rounded-[9px] border border-[#e5e5e5] flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab("presets")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer ${
                  activeTab === "presets"
                    ? "bg-white text-[#171717] shadow-xs font-semibold"
                    : "text-[#666] hover:text-[#171717]"
                }`}
              >
                <Sparkles size={13} strokeWidth={1.5} />
                <span>1. Preset Siap Pakai</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("colors")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer ${
                  activeTab === "colors"
                    ? "bg-white text-[#171717] shadow-xs font-semibold"
                    : "text-[#666] hover:text-[#171717]"
                }`}
              >
                <Palette size={13} strokeWidth={1.5} />
                <span>2. Warna & Bentuk</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("branding")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer ${
                  activeTab === "branding"
                    ? "bg-white text-[#171717] shadow-xs font-semibold"
                    : "text-[#666] hover:text-[#171717]"
                }`}
              >
                <Type size={13} strokeWidth={1.5} />
                <span>3. Logo & Teks</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("flow")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer ${
                  activeTab === "flow"
                    ? "bg-white text-[#171717] shadow-xs font-semibold"
                    : "text-[#666] hover:text-[#171717]"
                }`}
              >
                <Sliders size={13} strokeWidth={1.5} />
                <span>4. Alur & Langkah</span>
              </button>
            </div>

            {/* TAB 1: PRESET SIAP PAKAI */}
            {activeTab === "presets" && (
              <div className="bg-white border border-[#e5e5e5] rounded-[14px] p-6 space-y-4">
                <div className="pb-3 border-b border-[#eee]">
                  <h3 className="text-[16px] font-semibold text-[#202020] tracking-[-0.03em]">
                    Pilih Tema Preset Kiosk
                  </h3>
                  <p className="text-[12px] text-[#888] mt-0.5">
                    Klik salah satu preset untuk langsung memuat gaya desain ke layar kiosk pelanggan.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Preset 1: Neo-Brutalisme */}
                  <div
                    onClick={() => handleApplyPreset("neo-brutalism")}
                    className={`p-4 rounded-[12px] border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      theme.presetId === "neo-brutalism"
                        ? "border-[#171717] bg-[#f9fafb] shadow-xs"
                        : "border-[#e5e5e5] bg-white hover:border-[#bbb]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-black uppercase tracking-wider bg-yellow-300 text-black border-2 border-black px-2 py-0.5 rounded shadow-[2px_2px_0px_#000]">
                          Neo-Brutalism
                        </span>
                        {theme.presetId === "neo-brutalism" && (
                          <span className="w-5 h-5 rounded-full bg-[#171717] text-white flex items-center justify-center">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-[14px] text-black">
                        Pop Studio (Default)
                      </h4>
                      <p className="text-[12px] text-[#666] mt-1 leading-snug">
                        Border tebal 4px, bayangan offset hitam pekat, warna pop berani, dan font Space Grotesk.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-[#eee]">
                      <span className="w-4 h-4 rounded-full bg-[#fde047] border border-black" />
                      <span className="w-4 h-4 rounded-full bg-[#000000] border border-black" />
                      <span className="w-4 h-4 rounded-full bg-[#ffffff] border border-black" />
                      <span className="text-[11px] text-[#888] ml-auto">Original Theme</span>
                    </div>
                  </div>

                  {/* Preset 2: Clean Minimal */}
                  <div
                    onClick={() => handleApplyPreset("clean-minimal")}
                    className={`p-4 rounded-[12px] border transition-all cursor-pointer flex flex-col justify-between ${
                      theme.presetId === "clean-minimal"
                        ? "border-[#171717] bg-[#fafafa] ring-1 ring-[#171717] shadow-xs"
                        : "border-[#e5e5e5] bg-white hover:border-[#bbb]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-[5px] bg-[#f1f1f1] text-[#444] border border-[#e8e8e8]">
                          Clean Minimal
                        </span>
                        {theme.presetId === "clean-minimal" && (
                          <span className="w-5 h-5 rounded-full bg-[#171717] text-white flex items-center justify-center">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-[14px] text-[#202020]">
                        Amara / Editorial
                      </h4>
                      <p className="text-[12px] text-[#888] mt-1 leading-snug">
                        Border tipis 1px, latar belakang off-white tenang, bayangan mikro halus, dan font Manrope.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-[#eee]">
                      <span className="w-4 h-4 rounded-full bg-[#fafafa] border border-[#ddd]" />
                      <span className="w-4 h-4 rounded-full bg-[#171717] border border-[#ddd]" />
                      <span className="w-4 h-4 rounded-full bg-[#10b981] border border-[#ddd]" />
                      <span className="text-[11px] text-[#888] ml-auto">Quiet Luxury</span>
                    </div>
                  </div>

                  {/* Preset 3: Luxury Wedding */}
                  <div
                    onClick={() => handleApplyPreset("luxury-wedding")}
                    className={`p-4 rounded-[12px] border transition-all cursor-pointer flex flex-col justify-between ${
                      theme.presetId === "luxury-wedding"
                        ? "border-[#78350f] bg-[#fdfbf7] ring-1 ring-[#78350f] shadow-xs"
                        : "border-[#e5e5e5] bg-white hover:border-[#bbb]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-[5px] bg-[#fef3c7] text-[#92400e] border border-[#fde68a] flex items-center gap-1">
                          <Heart size={10} className="fill-[#d97706] text-[#d97706]" />
                          Wedding & Event
                        </span>
                        {theme.presetId === "luxury-wedding" && (
                          <span className="w-5 h-5 rounded-full bg-[#78350f] text-white flex items-center justify-center">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-[14px] text-[#451a03]">
                        Romantic Champagne
                      </h4>
                      <p className="text-[12px] text-[#78716c] mt-1 leading-snug">
                        Nuansa linen krem hangat, aksen emas/amber elegan, sudut melengkung, mode sewa gratis.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-[#eee]">
                      <span className="w-4 h-4 rounded-full bg-[#fdfbf7] border border-[#e7e5e4]" />
                      <span className="w-4 h-4 rounded-full bg-[#78350f] border border-[#e7e5e4]" />
                      <span className="w-4 h-4 rounded-full bg-[#d97706] border border-[#e7e5e4]" />
                      <span className="text-[11px] text-[#888] ml-auto">Rental Event</span>
                    </div>
                  </div>

                  {/* Preset 4: Dark Studio */}
                  <div
                    onClick={() => handleApplyPreset("dark-studio")}
                    className={`p-4 rounded-[12px] border transition-all cursor-pointer flex flex-col justify-between ${
                      theme.presetId === "dark-studio"
                        ? "border-zinc-500 bg-[#18181b] text-white ring-1 ring-zinc-400 shadow-xs"
                        : "border-[#e5e5e5] bg-[#18181b] text-white hover:border-[#777]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-[5px] bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                          <Moon size={10} />
                          Cyber Noir
                        </span>
                        {theme.presetId === "dark-studio" && (
                          <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-[14px] text-white">
                        Dark Studio
                      </h4>
                      <p className="text-[12px] text-zinc-400 mt-1 leading-snug">
                        Latar gelap pekat sinematik dengan kartu kontras dan aksen neon cyan modern.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-zinc-800">
                      <span className="w-4 h-4 rounded-full bg-[#09090b] border border-zinc-700" />
                      <span className="w-4 h-4 rounded-full bg-[#ffffff] border border-zinc-700" />
                      <span className="w-4 h-4 rounded-full bg-[#06b6d4] border border-zinc-700" />
                      <span className="text-[11px] text-zinc-400 ml-auto">Neon Modern</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: WARNA & BENTUK */}
            {activeTab === "colors" && (
              <div className="bg-white border border-[#e5e5e5] rounded-[14px] p-6 space-y-5">
                <div className="pb-3 border-b border-[#eee]">
                  <h3 className="text-[16px] font-semibold text-[#202020] tracking-[-0.03em]">
                    Kustomisasi Warna & Geometri
                  </h3>
                  <p className="text-[12px] text-[#888] mt-0.5">
                    Atur palet warna hex dan gaya visual elemen tombol & kartu di layar kiosk.
                  </p>
                </div>

                {/* Color Pickers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Background Layar Kiosk
                    </label>
                    <div className="flex items-center gap-2 border border-[#e2e2e2] rounded-[7px] px-2 py-1 bg-white">
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
                        className="flex-1 font-mono text-[12px] text-[#333] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Background Kartu / Panel
                    </label>
                    <div className="flex items-center gap-2 border border-[#e2e2e2] rounded-[7px] px-2 py-1 bg-white">
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
                        className="flex-1 font-mono text-[12px] text-[#333] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Warna Tombol Utama (Primary)
                    </label>
                    <div className="flex items-center gap-2 border border-[#e2e2e2] rounded-[7px] px-2 py-1 bg-white">
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
                        className="flex-1 font-mono text-[12px] text-[#333] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Warna Teks Tombol Utama
                    </label>
                    <div className="flex items-center gap-2 border border-[#e2e2e2] rounded-[7px] px-2 py-1 bg-white">
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
                        className="flex-1 font-mono text-[12px] text-[#333] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Warna Teks Konten
                    </label>
                    <div className="flex items-center gap-2 border border-[#e2e2e2] rounded-[7px] px-2 py-1 bg-white">
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
                        className="flex-1 font-mono text-[12px] text-[#333] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Warna Garis Border
                    </label>
                    <div className="flex items-center gap-2 border border-[#e2e2e2] rounded-[7px] px-2 py-1 bg-white">
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
                        className="flex-1 font-mono text-[12px] text-[#333] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Shape & Typography Settings */}
                <div className="pt-4 border-t border-[#eee] space-y-4 text-[13px]">
                  {/* Border Radius */}
                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Border Radius (Kelengkungan Sudut)
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(["none", "sm", "md", "lg", "full"] as BorderRadiusType[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => updateThemeField("borderRadius", r)}
                          className={`py-1.5 text-[12px] font-medium rounded-[6px] border transition-colors cursor-pointer ${
                            theme.borderRadius === r
                              ? "bg-[#171717] text-white border-[#171717]"
                              : "bg-white text-[#555] border-[#e2e2e2] hover:bg-[#f4f4f4]"
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
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Ketebalan Garis Border
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["none", "thin", "medium", "thick"] as BorderWidthType[]).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => updateThemeField("borderWidth", w)}
                          className={`py-1.5 text-[12px] font-medium rounded-[6px] border transition-colors cursor-pointer ${
                            theme.borderWidth === w
                              ? "bg-[#171717] text-white border-[#171717]"
                              : "bg-white text-[#555] border-[#e2e2e2] hover:bg-[#f4f4f4]"
                          }`}
                        >
                          {w === "none"
                            ? "Tanpa Border"
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
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Gaya Bayangan (Shadow)
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(["none", "soft", "hard-offset", "elevated"] as ShadowStyleType[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateThemeField("shadowStyle", s)}
                          className={`py-1.5 text-[12px] font-medium rounded-[6px] border transition-colors cursor-pointer ${
                            theme.shadowStyle === s
                              ? "bg-[#171717] text-white border-[#171717]"
                              : "bg-white text-[#555] border-[#e2e2e2] hover:bg-[#f4f4f4]"
                          }`}
                        >
                          {s === "none"
                            ? "Flat (0)"
                            : s === "soft"
                              ? "Soft Mikro"
                              : s === "hard-offset"
                                ? "Hard Brutalist"
                                : "Elevated Blur"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="text-[12px] font-medium text-[#444] mb-1.5 block">
                      Keluarga Font (Typography)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "manrope", label: "Manrope (Clean Minimal)" },
                        { id: "space-grotesk", label: "Space Grotesk (Brutalist)" },
                        { id: "poppins", label: "Poppins (Rounded Pop)" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => updateThemeField("fontFamily", f.id as FontFamilyType)}
                          className={`py-2 px-3 text-[12px] font-medium rounded-[7px] border transition-colors cursor-pointer text-center ${
                            theme.fontFamily === f.id
                              ? "bg-[#171717] text-white border-[#171717]"
                              : "bg-white text-[#555] border-[#e2e2e2] hover:bg-[#f4f4f4]"
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
              <div className="bg-white border border-[#e5e5e5] rounded-[14px] p-6 space-y-4">
                <div className="pb-3 border-b border-[#eee]">
                  <h3 className="text-[16px] font-semibold text-[#202020] tracking-[-0.03em]">
                    Branding & Copywriting Kiosk
                  </h3>
                  <p className="text-[12px] text-[#888] mt-0.5">
                    Sesuaikan nama studio, logo, dan pesan teks sambutan pada layar utama kiosk.
                  </p>
                </div>

                <div className="space-y-4 text-[13px]">
                  <div>
                    <label className="font-medium text-[#333] mb-1 block text-[12px]">
                      Nama Studio / Nama Event
                    </label>
                    <input
                      type="text"
                      value={theme.studioName}
                      onChange={(e) => updateThemeField("studioName", e.target.value)}
                      placeholder="Contoh: IGNOS STUDIO atau SARAH & ANDI WEDDING"
                      className="w-full px-3 py-2 border border-[#e2e2e2] rounded-[7px] text-[13px] outline-none focus:border-[#999] bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-[#333] mb-1 block text-[12px]">
                      URL Gambar Logo (Opsional)
                    </label>
                    <input
                      type="url"
                      value={theme.logoUrl || ""}
                      onChange={(e) => updateThemeField("logoUrl", e.target.value)}
                      placeholder="https://... atau /img/logo/brand.png"
                      className="w-full px-3 py-2 border border-[#e2e2e2] rounded-[7px] text-[13px] outline-none focus:border-[#999] bg-white transition-colors font-mono"
                    />
                    <p className="text-[11px] text-[#888] mt-1">
                      Kosongkan jika ingin menggunakan teks nama studio saja tanpa logo gambar.
                    </p>
                  </div>

                  <div>
                    <label className="font-medium text-[#333] mb-1 block text-[12px]">
                      Headline Teks Sambutan (Landing Page)
                    </label>
                    <input
                      type="text"
                      value={theme.homeHeadline}
                      onChange={(e) => updateThemeField("homeHeadline", e.target.value)}
                      placeholder="Contoh: Kamu Habis Fotoan Dimana? atau Selamat Datang!"
                      className="w-full px-3 py-2 border border-[#e2e2e2] rounded-[7px] text-[13px] outline-none focus:border-[#999] bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-[#333] mb-1 block text-[12px]">
                      Sub-Headline Tambahan
                    </label>
                    <input
                      type="text"
                      value={theme.homeSubheadline}
                      onChange={(e) => updateThemeField("homeSubheadline", e.target.value)}
                      placeholder="Contoh: Sentuh layar untuk mulai berfoto"
                      className="w-full px-3 py-2 border border-[#e2e2e2] rounded-[7px] text-[13px] outline-none focus:border-[#999] bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ALUR & LANGKAH KIOSK */}
            {activeTab === "flow" && (
              <div className="bg-white border border-[#e5e5e5] rounded-[14px] p-6 space-y-4">
                <div className="pb-3 border-b border-[#eee]">
                  <h3 className="text-[16px] font-semibold text-[#202020] tracking-[-0.03em]">
                    Pengaturan Alur Langkah Kiosk
                  </h3>
                  <p className="text-[12px] text-[#888] mt-0.5">
                    Aktifkan atau lewati langkah-langkah tertentu sesuai kebutuhan studio atau event sewa.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Free Event Mode Toggle */}
                  <div className="flex items-start justify-between p-3.5 rounded-[10px] bg-[#fafafa] border border-[#e8e8e8]">
                    <div className="pr-4">
                      <strong className="text-[13px] font-semibold text-[#202020] block">
                        Mode Event Gratis (Sewa Wedding / Corporate)
                      </strong>
                      <p className="text-[12px] text-[#666] mt-0.5 leading-snug">
                        Menonaktifkan tarif dan langkah pembayaran kasir. Semua sesi customer langsung dicetak gratis untuk tamu acara.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={theme.freeEventMode}
                        onChange={(e) => updateThemeField("freeEventMode", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#ddd] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#171717]"></div>
                    </label>
                  </div>

                  {/* Tutorial Bonus Story Toggle */}
                  <div className="flex items-start justify-between p-3.5 rounded-[10px] bg-[#fafafa] border border-[#e8e8e8]">
                    <div className="pr-4">
                      <strong className="text-[13px] font-semibold text-[#202020] block">
                        Langkah Panduan Bonus Story Instagram
                      </strong>
                      <p className="text-[12px] text-[#666] mt-0.5 leading-snug">
                        Menampilkan tutorial cara upload Story untuk mendapatkan cetak bonus lembar ekstra.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={theme.enableBonusTutorial}
                        onChange={(e) => updateThemeField("enableBonusTutorial", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#ddd] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#171717]"></div>
                    </label>
                  </div>

                  {/* Add-ons Step Toggle */}
                  <div className="flex items-start justify-between p-3.5 rounded-[10px] bg-[#fafafa] border border-[#e8e8e8]">
                    <div className="pr-4">
                      <strong className="text-[13px] font-semibold text-[#202020] block">
                        Langkah Penawaran Merchandise / Add-ons
                      </strong>
                      <p className="text-[12px] text-[#666] mt-0.5 leading-snug">
                        Menampilkan pertanyaan tawaran gantungan kunci, bingkai, dan merchandise foto lainnya.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={theme.enableAddonsStep}
                        onChange={(e) => updateThemeField("enableAddonsStep", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#ddd] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#171717]"></div>
                    </label>
                  </div>

                  {/* Story Question Toggle */}
                  <div className="flex items-start justify-between p-3.5 rounded-[10px] bg-[#fafafa] border border-[#e8e8e8]">
                    <div className="pr-4">
                      <strong className="text-[13px] font-semibold text-[#202020] block">
                        Langkah Pertanyaan Softcopy Story
                      </strong>
                      <p className="text-[12px] text-[#666] mt-0.5 leading-snug">
                        Menanyakan izin apakah customer bersedia mengunggah Story untuk mendapatkan softcopy gratis.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={theme.enableStoryQuestion}
                        onChange={(e) => updateThemeField("enableStoryQuestion", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#ddd] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#171717]"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: LIVE INTERACTIVE KIOSK PREVIEW (5 cols) ── */}
          <div className="xl:col-span-5 sticky top-6">
            <div className="bg-white border border-[#e5e5e5] rounded-[14px] p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[#eee]">
                <div className="flex items-center gap-2">
                  <Eye size={15} className="text-[#888]" />
                  <span className="text-[13px] font-semibold text-[#202020]">
                    Live Mockup Kiosk (Real-time)
                  </span>
                </div>
                <span className="text-[10px] uppercase font-mono tracking-wider bg-[#f4f4f4] text-[#666] px-2 py-0.5 rounded border border-[#e8e8e8]">
                  {theme.presetId}
                </span>
              </div>

              {/* Kiosk Screen Enclosure */}
              <div className="bg-[#1f1f1f] p-3 rounded-[16px] shadow-lg border border-[#333]">
                {/* Device Camera Notch */}
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-1 bg-[#3a3a3a] rounded-full" />
                </div>

                {/* Rendered Kiosk Home Screen */}
                <div
                  className="w-full aspect-[4/3] rounded-[10px] p-5 flex flex-col justify-between overflow-hidden transition-all duration-300 select-none relative"
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
                    <h4 className="text-[18px] font-bold tracking-tight leading-none">
                      {theme.studioName || "IGNOS STUDIO"}
                    </h4>
                    <p className="text-[11px] opacity-75 mt-1 leading-snug">
                      {theme.homeHeadline || "Kamu Habis Fotoan Dimana?"}
                    </p>
                  </div>

                  {/* 2 Service Cards in Kiosk */}
                  <div className="grid grid-cols-2 gap-3 my-auto">
                    {/* Card 1: Studio */}
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
                        className="w-10 h-10 rounded-full flex items-center justify-center mb-2 border"
                        style={{
                          backgroundColor: theme.primaryColor,
                          borderColor: theme.borderColor,
                        }}
                      >
                        <Camera
                          size={18}
                          style={{ color: theme.primaryTextColor }}
                          strokeWidth={2}
                        />
                      </div>
                      <span className="font-bold text-[12px] block leading-tight">
                        Photo Studio
                      </span>
                      <button
                        type="button"
                        className="mt-2 text-[10px] font-bold px-2.5 py-1 transition-all"
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

                    {/* Card 2: Box */}
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
                        className="w-10 h-10 rounded-full flex items-center justify-center mb-2 border"
                        style={{
                          backgroundColor: theme.primaryColor,
                          borderColor: theme.borderColor,
                        }}
                      >
                        <Users
                          size={18}
                          style={{ color: theme.primaryTextColor }}
                          strokeWidth={2}
                        />
                      </div>
                      <span className="font-bold text-[12px] block leading-tight">
                        Photo Box
                      </span>
                      <button
                        type="button"
                        className="mt-2 text-[10px] font-bold px-2.5 py-1 transition-all"
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

              {/* Info Pill */}
              <p className="text-[11px] text-[#888] leading-relaxed text-center">
                Mockup di atas mencerminkan langsung bagaimana tampilan layar sentuh kiosk saat disentuh oleh pelanggan.
              </p>
            </div>
          </div>
        </div>

        {/* ── 3. FOOTER ── */}
        <footer className="flex justify-between items-center text-[12px] text-[#aaa] pt-2 pb-6 border-t border-[#eee]">
          <p>© 2026 Ignos Studio. Photobooth Station.</p>
          <span className="hidden sm:inline">Tenang di depan. Tertata di balik layar.</span>
        </footer>
      </div>
    </AdminLayout>
  );
}
