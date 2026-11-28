import { isIllustratedPack } from "../../utils/illustratedTheme";
import { notify } from "../../utils/notify";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  RefreshCw,
  Camera,
  Users,
} from "lucide-react";
import { WosetArtwork } from "../components/WosetArtwork";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfirmModal } from "../components/AdminConfirmModal";
import { useKioskTheme } from "../../context/KioskThemeContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import {
  THEME_PRESETS,
  KioskThemeConfig,
  ThemePresetId,
  BorderRadiusType,
  BorderWidthType,
  ShadowStyleType,
  FontFamilyType,
} from "../../types/kioskTheme";

import { radiusMap, borderWMap, fontMap, getShadowMap, isValidTheme } from "../../utils/kioskTheme";

export function AdminKioskThemePage() {
  usePageTitle("Tema & Alur Kiosk — Ignos");

  const { theme: activeTheme, saveTheme, resetTheme, saving, loading } = useKioskTheme();
  const [theme, setTheme] = useState(activeTheme);
  const dirty = useRef(false);
  const [saveError, setSaveError] = useState("");
  const successTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!dirty.current) setTheme(activeTheme);
  }, [activeTheme]);
  useEffect(() => () => clearTimeout(successTimer.current), []);
  const markDirty = () => {
    dirty.current = true;
    setSaveSuccess(false);
    setSaveError("");
  };

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
    if (loading || saving) return;
    markDirty();
    setTheme({ ...THEME_PRESETS[presetId] });
  };

  const handleSave = async () => {
    setSaveError("");
    if (!isValidTheme(theme)) {
      setSaveError("Warna harus berupa kode hex 6 digit, misalnya #171717.");
      return;
    }
    const ok = await saveTheme(theme);
    if (ok) {
      dirty.current = false;
      setSaveSuccess(true);
      clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSaveSuccess(false), 2500);
      notify.success("Tema Kiosk Tersimpan");
    } else {
      notify.error("Gagal Menyimpan Tema", "Terjadi kesalahan saat menyimpan pengaturan tema ke server. Pastikan backend aktif.");
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
        const ok = await resetTheme();
        if (ok) {
          dirty.current = false;
          setTheme({ ...THEME_PRESETS["neo-brutalism"] });
          setSaveSuccess(false);
          setSaveError("");
        } else {
          setSaveError("Reset gagal. Tema aktif tidak berubah. Periksa koneksi dan sesi admin, lalu coba lagi.");
        }
      },
    });
  };

  const updateThemeField = <K extends keyof KioskThemeConfig>(
    key: K,
    value: KioskThemeConfig[K],
  ) => {
    if (loading || saving) return;
    markDirty();
    setTheme((prev) => ({
      ...prev,
      presetId: "custom",
      [key]: value,
    }));
  };

  const shadowMap = getShadowMap(theme.borderColor);

  return (
    <AdminLayout>
      <fieldset disabled={loading || saving} className="min-w-0 w-full px-5 pb-8 pt-3 lg:px-[34px] space-y-7">
        {loading && <p role="status">Memuat tema tersimpan…</p>}
        <AdminConfirmModal
          isOpen={Boolean(saveError)}
          onClose={() => setSaveError("")}
          title="Pengaturan Tema Belum Disimpan"
          description={saveError}
          singleButton
          variant="warning"
        />
        {/* ── 1. HEADER & ACTIONS ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[var(--admin-border,#2a2d2f)]">
          <div>
            <p className="text-[12px] tracking-[0.14em] text-[var(--admin-muted,#92989d)] uppercase font-medium">
              PENGATURAN TAMPILAN BILIK
            </p>
            <h1 className="text-[28px] sm:text-[30px] font-semibold tracking-[-0.04em] text-[var(--admin-text,#f4f4f5)] leading-[1.25] mt-1.5">
              Tema & Alur Kiosk
            </h1>
            <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.8] mt-1 max-w-2xl">
              Pilih preset tema visual atau sesuaikan warna, geometri sudut, identitas studio, serta alur langkah customer di bilik foto.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={loading || saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] text-[var(--admin-secondary,#c3c7ca)] hover:bg-[var(--admin-raised,#292b2f)] hover:text-[var(--admin-text,#f4f4f5)] rounded-full text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
              title="Reset ke tema bawaan sistem"
            >
              <RefreshCw size={13} />
              <span>Reset Bawaan</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#c0d0e7] text-[#111b23] hover:bg-[#d2def0] rounded-full text-[12px] font-medium transition-colors cursor-pointer  disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check size={13} className="text-[var(--admin-accent-text,#c9d2e1)]" />
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
          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-5 space-y-3">
            <span className="text-[12px] font-medium text-[var(--admin-muted,#92989d)]">Pratinjau Preset Tema</span>
            <div>
              <div className="text-[18px] font-semibold text-[var(--admin-text,#f4f4f5)] capitalize tracking-tight">
                {theme.presetId === "neo-brutalism"
                  ? "Pop Studio"
                  : theme.presetId === "clean-minimal"
                    ? "Clean Minimal"
                    : theme.presetId === "luxury-wedding"
                      ? "Romantic Champagne"
                      : theme.presetId === "dark-studio"
                        ? "Cyber Noir"
                        : theme.presetId === "woset-play" ? "Woset Play" : theme.presetId === "riso-zine" ? "Riso Zine" : theme.presetId === "analog-archive" ? "Analog Archive" : theme.presetId === "studio-cats" ? "Studio Cats" : "Custom Style"}
              </div>
              <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                {theme.presetId === "custom" ? "Penyesuaian manual" : "Preset siap pakai"}
              </p>
            </div>
            <div className="pt-2  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between text-[12px] text-[var(--admin-muted,#92989d)]">
              <span>ID: {theme.presetId}</span>
            </div>
          </div>

          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-5 space-y-3">
            <span className="text-[12px] font-medium text-[var(--admin-muted,#92989d)]">Mode Operasional</span>
            <div>
              <div className="text-[18px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-tight">
                {theme.freeEventMode ? "Event Gratis" : "Standar Berbayar"}
              </div>
              <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                {theme.freeEventMode
                  ? "Bilik event / sewa wedding (tanpa kasir)"
                  : "Operasional reguler studio komersial"}
              </p>
            </div>
            <div className="pt-2  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between text-[12px] text-[var(--admin-muted,#92989d)]">
              <span>Alur Pembayaran: {theme.freeEventMode ? "Dilewati" : "Aktif"}</span>
            </div>
          </div>

          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-5 space-y-3">
            <span className="text-[12px] font-medium text-[var(--admin-muted,#92989d)]">Geometri Sudut & Garis</span>
            <div>
              <div className="text-[28px] font-semibold text-[var(--admin-text,#f4f4f5)] font-mono tracking-tight">
                {radiusMap[theme.borderRadius]} · {borderWMap[theme.borderWidth]}
              </div>
              <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                Bayangan: {theme.shadowStyle}
              </p>
            </div>
            <div className="pt-2  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between text-[12px] text-[var(--admin-muted,#92989d)]">
              <span>Border: {theme.borderColor || "Hitam"}</span>
            </div>
          </div>

          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-5 space-y-3">
            <span className="text-[12px] font-medium text-[var(--admin-muted,#92989d)]">Tipografi Bilik</span>
            <div>
              <div className="text-[18px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-tight">
                {theme.fontFamily === "manrope"
                  ? "Manrope"
                  : theme.fontFamily === "space-grotesk"
                    ? "Space Grotesk"
                    : "Poppins"}
              </div>
              <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                Font utama seluruh teks di bilik foto
              </p>
            </div>
            <div className="pt-2  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between text-[12px] text-[var(--admin-muted,#92989d)]">
              <span>Branding: {theme.studioName || "Ignos Studio"}</span>
            </div>
          </div>
        </div>

        {/* ── 3. TWO-COLUMN LAYOUT: SETTINGS (7 cols) & LIVE MOCKUP (5 cols) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* ── LEFT COLUMN: CONTROLS & TABS ── */}
          <div className="xl:col-span-7 space-y-6">
            {/* Pure Typography Navigation Tabs (Conforming to GEMINI.md Rule 2) */}
            <div className="flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-full bg-[var(--admin-control,#1e2022)] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("presets")}
                className={`rounded-full px-4 py-2 text-[13px] transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === "presets"
                    ? " bg-[var(--admin-tab,#343638)] font-medium text-[var(--admin-text,#f4f4f5)]"
                    : " border-transparent font-medium text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-text,#f4f4f5)]"
                }`}
              >
                Preset Siap Pakai
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("colors")}
                className={`rounded-full px-4 py-2 text-[13px] transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === "colors"
                    ? " bg-[var(--admin-tab,#343638)] font-medium text-[var(--admin-text,#f4f4f5)]"
                    : " border-transparent font-medium text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-text,#f4f4f5)]"
                }`}
              >
                Warna & Geometri
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("branding")}
                className={`rounded-full px-4 py-2 text-[13px] transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === "branding"
                    ? " bg-[var(--admin-tab,#343638)] font-medium text-[var(--admin-text,#f4f4f5)]"
                    : " border-transparent font-medium text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-text,#f4f4f5)]"
                }`}
              >
                Identitas & Teks
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("flow")}
                className={`rounded-full px-4 py-2 text-[13px] transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === "flow"
                    ? " bg-[var(--admin-tab,#343638)] font-medium text-[var(--admin-text,#f4f4f5)]"
                    : " border-transparent font-medium text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-text,#f4f4f5)]"
                }`}
              >
                Alur & Langkah Kiosk
              </button>
            </div>

            {/* TAB 1: PRESET SIAP PAKAI */}
            {activeTab === "presets" && (
              <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="pb-4  border-[var(--admin-border,#2a2d2f)]">
                  <h2 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-[-0.02em]">
                    Koleksi Preset Tema
                  </h2>
                  <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.7] mt-0.5">
                    Pilih salah satu preset untuk langsung memuat tata visual ke bilik foto pelanggan.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: "neo-brutalism", title: "Pop Studio (Default)", tag: "Brutalist", description: "Border tebal, warna pop berani, dan font Space Grotesk.", onClick: () => handleApplyPreset("neo-brutalism") },
                    { id: "clean-minimal", title: "Amara / Clean Minimal", tag: "Editorial", description: "Latar off-white, garis tipis, dan tipografi Manrope yang tenang.", onClick: () => handleApplyPreset("clean-minimal") },
                    { id: "luxury-wedding", title: "Romantic Champagne", tag: "Wedding", description: "Linen krem, aksen emas, sudut halus, dan mode sewa gratis.", onClick: () => handleApplyPreset("luxury-wedding") },
                    { id: "dark-studio", title: "Cyber Noir (Dark Studio)", tag: "Dark mode", description: "Latar gelap sinematik dengan panel kontras dan aksen cyan.", onClick: () => handleApplyPreset("dark-studio") },
                    { id: "woset-play", title: "Woset Play", tag: "Illustrated", description: "Karakter kamera dan dunia studio bergambar dalam tujuh ilustrasi.", thumbnail: "/themes/woset-play/welcome.svg", onClick: () => handleApplyPreset("woset-play") },
                    { id: "riso-zine", title: "Riso Zine", tag: "Photo club", description: "Kolase coral-cobalt, tekstur halftone, dan ilustrasi bergaya cetak.", thumbnail: "/themes/riso-zine/welcome.svg", onClick: () => handleApplyPreset("riso-zine") },
                    { id: "analog-archive", title: "Analog Archive", tag: "Contact sheet", description: "Dua card layanan di tengah layar, aset film, dan aksen amber.", thumbnail: "/themes/analog-archive/contact-sheet.png", onClick: () => handleApplyPreset("analog-archive") },
                    { id: "studio-cats", title: "Studio Cats", tag: "Cat photo club", description: "Poster cobalt-krem, kucing fotografer, dan ilustrasi garis di setiap langkah.", thumbnail: "/themes/studio-cats/welcome.svg", onClick: () => handleApplyPreset("studio-cats") },
                  ].map(preset => {
                    const selected = theme.presetId === preset.id;
                    const palette = THEME_PRESETS[preset.id as ThemePresetId];
                    return (
                      <button key={preset.id} type="button" onClick={preset.onClick} aria-pressed={selected} className={`relative isolate flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border bg-[var(--admin-card,#1c1f20)] p-5 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-focus,#c0d0e7)] ${selected ? "border-[var(--admin-focus,#c0d0e7)]" : "border-[var(--admin-border,#2a2d2f)] hover:border-[var(--admin-border-strong,#41474e)]"}`}>
                        {preset.thumbnail && <>
                          <img src={preset.thumbnail} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center opacity-50" />
                          <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(110deg, var(--admin-card,#1c1f20) 10%, color-mix(in srgb, var(--admin-card,#1c1f20) 88%, transparent) 50%, color-mix(in srgb, var(--admin-card,#1c1f20) 30%, transparent) 100%)" }} />
                        </>}
                        <div className="relative z-10 w-full">
                          <div className="mb-3 flex min-h-6 items-center justify-between gap-2">
                            <span className="rounded-[4px] bg-[var(--admin-raised,#292b2f)] px-2 py-0.5 font-mono text-[12px] uppercase tracking-wider text-[var(--admin-text,#f4f4f5)]">{preset.tag}</span>
                            {selected && <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--admin-text,#f4f4f5)]"><Check size={13} />Dipilih</span>}
                          </div>
                          <h3 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)]">{preset.title}</h3>
                          <p className="mt-1.5 text-[12px] leading-[1.6] text-[var(--admin-muted,#92989d)]">{preset.description}</p>
                        </div>
                        <div className="relative z-10 mt-5 flex w-full items-center justify-between gap-3">
                          <span aria-hidden="true" className="flex items-center gap-1.5">{[palette.backgroundColor, palette.primaryColor, palette.accentColor].map((color, index) => <span key={index} className="size-3.5 rounded-full border border-[var(--admin-border,#2a2d2f)]" style={{ backgroundColor: color }} />)}</span>
                          {!preset.thumbnail && <span className="font-mono text-[11px] text-[var(--admin-muted,#92989d)]">{preset.tag}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-xl border border-[var(--admin-border,#2a2d2f)] p-4">
                  <label htmlFor="kiosk-asset-pack" className="block text-[13px] font-medium">Paket ilustrasi</label>
                  <p className="mt-1 text-[12px] leading-5 text-[var(--admin-muted,#92989d)]">Paket aset tetap mengikuti tema saat warna dan teks dikustomisasi. Pilih Tanpa ilustrasi untuk kembali ke tampilan biasa.</p>
                  <select id="kiosk-asset-pack" value={theme.assetPack} onChange={event => updateThemeField("assetPack", event.target.value as KioskThemeConfig["assetPack"])} className="mt-3 w-full rounded-lg border border-[var(--admin-border-strong,#41474e)] bg-[var(--admin-canvas,#111114)] px-3 py-2 text-[13px]">
                    <option value="none">Tanpa ilustrasi</option><option value="woset-play">Woset Play — illustrated studio</option><option value="riso-zine">Riso Zine — photo club</option><option value="analog-archive">Analog Archive — contact sheet</option><option value="studio-cats">Studio Cats — cat photo club</option>
                  </select>
                </div>
              </div>
            )}

            {/* TAB 2: WARNA & BENTUK */}
            {activeTab === "colors" && (
              <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="pb-4  border-[var(--admin-border,#2a2d2f)]">
                  <h2 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-[-0.02em]">
                    Kustomisasi Warna & Geometri
                  </h2>
                  <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.7] mt-0.5">
                    Atur palet warna hex dan gaya visual elemen tombol serta kartu di bilik foto.
                  </p>
                </div>

                {/* Color Pickers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
                  <div>
                    <label className="text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block">
                      Background Layar Kiosk
                    </label>
                    <div className="flex items-center gap-2 border border-[var(--admin-border,#2a2d2f)] focus-within:border-[var(--admin-focus,#c0d0e7)] rounded-full px-2.5 py-1.5 bg-[var(--admin-card,#1c1f20)] transition-colors">
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
                        className="flex-1 font-mono text-[12px] text-[var(--admin-text,#f4f4f5)] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block">
                      Background Kartu / Panel
                    </label>
                    <div className="flex items-center gap-2 border border-[var(--admin-border,#2a2d2f)] focus-within:border-[var(--admin-focus,#c0d0e7)] rounded-full px-2.5 py-1.5 bg-[var(--admin-card,#1c1f20)] transition-colors">
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
                        className="flex-1 font-mono text-[12px] text-[var(--admin-text,#f4f4f5)] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block">
                      Warna Tombol Utama (Primary)
                    </label>
                    <div className="flex items-center gap-2 border border-[var(--admin-border,#2a2d2f)] focus-within:border-[var(--admin-focus,#c0d0e7)] rounded-full px-2.5 py-1.5 bg-[var(--admin-card,#1c1f20)] transition-colors">
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
                        className="flex-1 font-mono text-[12px] text-[var(--admin-text,#f4f4f5)] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block">
                      Warna Teks Tombol Utama
                    </label>
                    <div className="flex items-center gap-2 border border-[var(--admin-border,#2a2d2f)] focus-within:border-[var(--admin-focus,#c0d0e7)] rounded-full px-2.5 py-1.5 bg-[var(--admin-card,#1c1f20)] transition-colors">
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
                        className="flex-1 font-mono text-[12px] text-[var(--admin-text,#f4f4f5)] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block">
                      Warna Teks Konten
                    </label>
                    <div className="flex items-center gap-2 border border-[var(--admin-border,#2a2d2f)] focus-within:border-[var(--admin-focus,#c0d0e7)] rounded-full px-2.5 py-1.5 bg-[var(--admin-card,#1c1f20)] transition-colors">
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
                        className="flex-1 font-mono text-[12px] text-[var(--admin-text,#f4f4f5)] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block">
                      Warna Garis Border
                    </label>
                    <div className="flex items-center gap-2 border border-[var(--admin-border,#2a2d2f)] focus-within:border-[var(--admin-focus,#c0d0e7)] rounded-full px-2.5 py-1.5 bg-[var(--admin-card,#1c1f20)] transition-colors">
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
                        className="flex-1 font-mono text-[12px] text-[var(--admin-text,#f4f4f5)] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Shape & Geometry Settings */}
                <div className="pt-5  border-[var(--admin-border,#2a2d2f)] space-y-5 text-[13px]">
                  {/* Border Radius */}
                  <div>
                    <label className="text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] mb-2 block">
                      Border Radius (Kelengkungan Sudut Elemen)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {(["none", "sm", "md", "lg", "full"] as BorderRadiusType[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => updateThemeField("borderRadius", r)}
                          className={`py-2 text-[12px] font-medium rounded-full border transition-colors cursor-pointer ${
                            theme.borderRadius === r
                              ? "bg-[#c0d0e7] text-[#111b23] border-[var(--admin-focus,#c0d0e7)] font-semibold"
                              : "bg-[var(--admin-card,#1c1f20)] text-[var(--admin-secondary,#c3c7ca)] border-[var(--admin-border,#2a2d2f)] hover:bg-[var(--admin-raised,#292b2f)] hover:text-[var(--admin-text,#f4f4f5)]"
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
                    <label className="text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] mb-2 block">
                      Ketebalan Garis Border
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(["none", "thin", "medium", "thick"] as BorderWidthType[]).map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => updateThemeField("borderWidth", w)}
                          className={`py-2 text-[12px] font-medium rounded-full border transition-colors cursor-pointer ${
                            theme.borderWidth === w
                              ? "bg-[#c0d0e7] text-[#111b23] border-[var(--admin-focus,#c0d0e7)] font-semibold"
                              : "bg-[var(--admin-card,#1c1f20)] text-[var(--admin-secondary,#c3c7ca)] border-[var(--admin-border,#2a2d2f)] hover:bg-[var(--admin-raised,#292b2f)] hover:text-[var(--admin-text,#f4f4f5)]"
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
                    <label className="text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] mb-2 block">
                      Gaya Bayangan (Shadow)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(["none", "soft", "hard-offset", "elevated"] as ShadowStyleType[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateThemeField("shadowStyle", s)}
                          className={`py-2 text-[12px] font-medium rounded-full border transition-colors cursor-pointer ${
                            theme.shadowStyle === s
                              ? "bg-[#c0d0e7] text-[#111b23] border-[var(--admin-focus,#c0d0e7)] font-semibold"
                              : "bg-[var(--admin-card,#1c1f20)] text-[var(--admin-secondary,#c3c7ca)] border-[var(--admin-border,#2a2d2f)] hover:bg-[var(--admin-raised,#292b2f)] hover:text-[var(--admin-text,#f4f4f5)]"
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
                    <label className="text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] mb-2 block">
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
                          className={`py-2 px-3 text-[12px] font-medium rounded-full border transition-colors cursor-pointer text-center ${
                            theme.fontFamily === f.id
                              ? "bg-[#c0d0e7] text-[#111b23] border-[var(--admin-focus,#c0d0e7)] font-semibold"
                              : "bg-[var(--admin-card,#1c1f20)] text-[var(--admin-secondary,#c3c7ca)] border-[var(--admin-border,#2a2d2f)] hover:bg-[var(--admin-raised,#292b2f)] hover:text-[var(--admin-text,#f4f4f5)]"
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
              <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="pb-4  border-[var(--admin-border,#2a2d2f)]">
                  <h2 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-[-0.02em]">
                    Identitas Studio & Copywriting
                  </h2>
                  <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.7] mt-0.5">
                    Sesuaikan nama studio, logo bilik, serta pesan teks sambutan pada layar utama kiosk.
                  </p>
                </div>

                <div className="space-y-4 text-[13px]">
                  <div>
                    <label className="font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block text-[12px]">
                      Nama Studio / Nama Acara Sewa
                    </label>
                    <input
                      type="text"
                      value={theme.studioName}
                      onChange={(e) => updateThemeField("studioName", e.target.value)}
                      placeholder="Contoh: IGNOS STUDIO atau SARAH & ANDI WEDDING"
                      className="w-full px-3 py-2 border border-[var(--admin-border,#2a2d2f)] focus:border-[var(--admin-focus,#c0d0e7)] rounded-lg text-[13px] outline-none bg-[var(--admin-canvas,#111114)] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block text-[12px]">
                      URL Gambar Logo Bilik (Opsional)
                    </label>
                    <input
                      type="url"
                      value={theme.logoUrl || ""}
                      onChange={(e) => updateThemeField("logoUrl", e.target.value)}
                      placeholder="https://... atau /img/logo/brand.png"
                      className="w-full px-3 py-2 border border-[var(--admin-border,#2a2d2f)] focus:border-[var(--admin-focus,#c0d0e7)] rounded-lg text-[13px] outline-none bg-[var(--admin-canvas,#111114)] transition-colors font-mono"
                    />
                    <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-1">
                      Kosongkan jika ingin menampilkan teks nama studio tanpa logo gambar.
                    </p>
                  </div>

                  <div>
                    <label className="font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block text-[12px]">
                      Headline Teks Sambutan (Layar Selamat Datang)
                    </label>
                    <input
                      type="text"
                      value={theme.homeHeadline}
                      onChange={(e) => updateThemeField("homeHeadline", e.target.value)}
                      placeholder="Contoh: Kamu Habis Fotoan Dimana? atau Selamat Datang!"
                      className="w-full px-3 py-2 border border-[var(--admin-border,#2a2d2f)] focus:border-[var(--admin-focus,#c0d0e7)] rounded-lg text-[13px] outline-none bg-[var(--admin-canvas,#111114)] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block text-[12px]">
                      Sub-Headline / Petunjuk Tambahan
                    </label>
                    <input
                      type="text"
                      value={theme.homeSubheadline}
                      onChange={(e) => updateThemeField("homeSubheadline", e.target.value)}
                      placeholder="Contoh: Sentuh layar untuk mulai berfoto"
                      className="w-full px-3 py-2 border border-[var(--admin-border,#2a2d2f)] focus:border-[var(--admin-focus,#c0d0e7)] rounded-lg text-[13px] outline-none bg-[var(--admin-canvas,#111114)] transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ALUR & LANGKAH KIOSK */}
            {activeTab === "flow" && (
              <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="pb-4  border-[var(--admin-border,#2a2d2f)]">
                  <h2 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-[-0.02em]">
                    Pengaturan Alur Langkah Kiosk
                  </h2>
                  <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.7] mt-0.5">
                    Aktifkan atau lewati langkah tertentu sesuai kebutuhan studio atau paket sewa event.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Free Event Mode Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-[8px] bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)]">
                    <div className="pr-4">
                      <strong className="text-[13px] font-medium text-[var(--admin-text,#f4f4f5)] block">
                        Mode Event Gratis (Sewa Wedding / Corporate)
                      </strong>
                      <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5 leading-[1.6]">
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
                      <div className="w-9 h-5 bg-[var(--admin-tab,#343638)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--admin-card,#1c1f20)] after:border-[var(--admin-border-interactive,#34373b)] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c0d0e7]"></div>
                    </label>
                  </div>

                  {/* Tutorial Bonus Story Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-[8px] bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)]">
                    <div className="pr-4">
                      <strong className="text-[13px] font-medium text-[var(--admin-text,#f4f4f5)] block">
                        Langkah Panduan Bonus Story Instagram
                      </strong>
                      <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5 leading-[1.6]">
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
                      <div className="w-9 h-5 bg-[var(--admin-tab,#343638)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--admin-card,#1c1f20)] after:border-[var(--admin-border-interactive,#34373b)] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c0d0e7]"></div>
                    </label>
                  </div>

                  {/* Add-ons Step Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-[8px] bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)]">
                    <div className="pr-4">
                      <strong className="text-[13px] font-medium text-[var(--admin-text,#f4f4f5)] block">
                        Langkah Penawaran Merchandise / Add-Ons
                      </strong>
                      <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5 leading-[1.6]">
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
                      <div className="w-9 h-5 bg-[var(--admin-tab,#343638)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--admin-card,#1c1f20)] after:border-[var(--admin-border-interactive,#34373b)] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c0d0e7]"></div>
                    </label>
                  </div>

                  {/* Story Question Toggle */}
                  <div className="flex items-center justify-between p-4 rounded-[8px] bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)]">
                    <div className="pr-4">
                      <strong className="text-[13px] font-medium text-[var(--admin-text,#f4f4f5)] block">
                        Langkah Pertanyaan Softcopy Story
                      </strong>
                      <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5 leading-[1.6]">
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
                      <div className="w-9 h-5 bg-[var(--admin-tab,#343638)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--admin-card,#1c1f20)] after:border-[var(--admin-border-interactive,#34373b)] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c0d0e7]"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: LIVE REAL-TIME KIOSK PREVIEW (5 cols) ── */}
          <div className="xl:col-span-5 sticky top-6">
            <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 space-y-4 ">
              <div className="flex items-center justify-between pb-3  border-[var(--admin-border,#2a2d2f)]">
                <div>
                  <h3 className="text-[14px] font-semibold text-[var(--admin-text,#f4f4f5)]">
                    Pratinjau Bilik Kiosk
                  </h3>
                  <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                    Draft tampilan kiosk. Klik Terapkan ke Kiosk untuk menyimpan.
                  </p>
                </div>
                <span className="text-[12px] font-mono uppercase tracking-wider bg-[var(--admin-raised,#292b2f)] text-[var(--admin-secondary,#c3c7ca)] px-2 py-0.5 rounded-[4px]">
                  {theme.presetId}
                </span>
              </div>

              {/* Kiosk Device Enclosure */}
              <div className="bg-[#c0d0e7] p-3.5 rounded-[14px] shadow-sm border border-[#2a2a2a]">
                {/* Device Camera Notch */}
                <div className="flex justify-center mb-2.5">
                  <div className="w-10 h-1 bg-[#c0d0e7] rounded-full" />
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
                  {theme.assetPack === "studio-cats" ? (
                    <div className="flex h-full flex-col overflow-hidden rounded-xl px-5 py-4 text-center" style={{ backgroundColor: theme.primaryColor, color: theme.primaryTextColor }}>
                      <span className="text-left text-[9px] font-medium">{theme.studioName} / STUDIO CATS</span>
                      <div className="flex flex-1 flex-col justify-center gap-4">
                        <p className="text-[21px] font-bold leading-tight tracking-tight">{theme.homeHeadline}</p>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">{(["studio", "booth"] as const).map((scene, index) => <div key={scene} className="flex flex-col items-center rounded-lg p-3" style={{ backgroundColor: theme.cardBackgroundColor, color: theme.primaryColor }}><img src={`/themes/studio-cats/${scene}.svg`} alt="" className="h-16 w-20 object-contain" /><span className="font-semibold">{index ? "Photo Box" : "Photo Studio"}</span><span className="mt-2 text-[8px]">Yuk lanjut →</span></div>)}</div>
                        <span className="text-[9px]">Good company. Great photos.</span>
                      </div>
                    </div>
                  ) : theme.assetPack === "analog-archive" ? (
                    <div className="relative isolate flex h-full flex-col overflow-hidden rounded-xl px-5 py-4 text-center" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor, fontFamily: fontMap["space-grotesk"] }}>
                      <img src="/themes/analog-archive/contact-sheet.png" alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-30" /><div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#111412]/65 to-[#111412]/85" />
                      <span className="text-left font-mono text-[9px]">{theme.studioName} / ANALOG ARCHIVE</span>
                      <div className="flex flex-1 flex-col justify-center gap-4">
                        <p className="text-[21px] font-bold leading-tight tracking-tight">{theme.homeHeadline}</p>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">{(["studio", "booth"] as const).map((scene, index) => <div key={scene} className="flex flex-col items-center rounded border p-3" style={{ backgroundColor: theme.cardBackgroundColor, borderColor: theme.borderColor }}><img src={`/themes/analog-archive/${scene}.svg`} alt="" className="h-16 w-20 object-contain" /><span className="font-semibold">{index ? "Photo Box" : "Photo Studio"}</span><span className="mt-2 text-[8px]" style={{ color: theme.primaryColor }}>Yuk lanjut →</span></div>)}</div>
                        <span className="font-mono text-[8px] uppercase tracking-wide">Collected moments, carefully kept.</span>
                      </div>
                    </div>
                  ) : isIllustratedPack(theme.assetPack) ? (
                    <div className="flex h-full flex-col items-center justify-between gap-2 text-center">
                      <span className="text-[12px] font-semibold">{theme.studioName}</span>
                      <div><p className={`text-[25px] font-bold leading-none ${theme.assetPack === "riso-zine" ? "font-['Space_Grotesk',sans-serif] tracking-tight" : "font-['Gaegu',cursive]"}`}>{theme.homeHeadline}</p><WosetArtwork scene="welcome" pack={isIllustratedPack(theme.assetPack) ? theme.assetPack : undefined} className="mx-auto h-[125px] w-full" /></div>
                      <div className="grid w-full grid-cols-2 gap-2">{(["studio", "booth"] as const).map((scene, index) => <div key={scene} className="flex items-center gap-1 rounded-xl border border-current/25 p-1.5"><WosetArtwork scene={scene} pack={isIllustratedPack(theme.assetPack) ? theme.assetPack : undefined} className="h-12 w-14" /><span className="text-[10px] font-medium">{index ? "Photo Box" : "Photo Studio"} ↗</span></div>)}</div>
                    </div>
                  ) : (<>
                  {/* Top Branding */}
                  <div className="text-center pt-2">
                    {theme.logoUrl && (
                      <img
                        src={theme.logoUrl}
                        alt="Logo"
                        className="h-6 mx-auto mb-1.5 object-contain"
                      />
                    )}
                    <h4 className="text-[16px] font-bold tracking-tight leading-none">
                      {theme.studioName || "IGNOS STUDIO"}
                    </h4>
                    <p className="text-[12px] opacity-75 mt-1 leading-snug">
                      {theme.homeHeadline || "Kamu Habis Fotoan Dimana?"}
                    </p>
                  </div>

                  {theme.homeSubheadline && <p className="text-center text-[12px] opacity-60">{theme.homeSubheadline}</p>}

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
                      <span className="font-bold text-[12px] block leading-tight">
                        Photo Studio
                      </span>
                      <button
                        type="button"
                        className="mt-2 text-[12px] font-bold px-2 py-0.5 transition-all"
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
                      <span className="font-bold text-[12px] block leading-tight">
                        Photo Box
                      </span>
                      <button
                        type="button"
                        className="mt-2 text-[12px] font-bold px-2 py-0.5 transition-all"
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
                  <div className="text-center text-[12px] opacity-40 font-mono">
                    {theme.freeEventMode
                      ? "• MODE SEWA WEDDING / EVENT AKTIF •"
                      : "IGNOS PHOTOBOOTH SYSTEM"}
                  </div>
                  </>)}
                </div>
              </div>

              <div className="pt-2 text-center">
                <span className="text-[12px] text-[var(--admin-muted,#92989d)]">
                  Warna, teks, dan paket ilustrasi mengikuti draft tema. Terapkan untuk mengaktifkan di kiosk.
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
      </fieldset>
    </AdminLayout>
  );
}
