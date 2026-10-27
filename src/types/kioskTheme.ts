export type ThemePresetId =
  | "neo-brutalism"
  | "clean-minimal"
  | "luxury-wedding"
  | "dark-studio"
  | "custom";

export type BorderRadiusType = "none" | "sm" | "md" | "lg" | "full";
export type BorderWidthType = "none" | "thin" | "medium" | "thick";
export type ShadowStyleType = "none" | "soft" | "hard-offset" | "elevated";
export type FontFamilyType = "manrope" | "space-grotesk" | "poppins";

export interface KioskThemeConfig {
  presetId: ThemePresetId;
  name: string;
  // Colors
  backgroundColor: string;
  cardBackgroundColor: string;
  primaryColor: string;
  primaryTextColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  // Shapes & Effects
  borderRadius: BorderRadiusType;
  borderWidth: BorderWidthType;
  shadowStyle: ShadowStyleType;
  fontFamily: FontFamilyType;
  // Branding & Copywriting
  studioName: string;
  homeHeadline: string;
  homeSubheadline: string;
  logoUrl?: string;
  // Flow Toggles
  enableBonusTutorial: boolean;
  enableAddonsStep: boolean;
  enableStoryQuestion: boolean;
  freeEventMode: boolean;
}

export const THEME_PRESETS: Record<ThemePresetId, KioskThemeConfig> = {
  "neo-brutalism": {
    presetId: "neo-brutalism",
    name: "Neo-Brutalism (Pop Studio)",
    backgroundColor: "#f3f4f6",
    cardBackgroundColor: "#ffffff",
    primaryColor: "#000000",
    primaryTextColor: "#ffffff",
    textColor: "#171717",
    accentColor: "#fde047",
    borderColor: "#000000",
    borderRadius: "lg",
    borderWidth: "thick",
    shadowStyle: "none",
    fontFamily: "space-grotesk",
    studioName: "IGNOS STUDIO",
    homeHeadline: "Kamu Habis Fotoan Dimana?",
    homeSubheadline: "Pilih studio untuk mulai sesi foto kamu",
    logoUrl: "",
    enableBonusTutorial: true,
    enableAddonsStep: true,
    enableStoryQuestion: true,
    freeEventMode: false,
  },
  "clean-minimal": {
    presetId: "clean-minimal",
    name: "Clean Minimal (Amara Editorial)",
    backgroundColor: "#fafafa",
    cardBackgroundColor: "#ffffff",
    primaryColor: "#171717",
    primaryTextColor: "#ffffff",
    textColor: "#202020",
    accentColor: "#10b981",
    borderColor: "#e5e5e5",
    borderRadius: "md",
    borderWidth: "thin",
    shadowStyle: "soft",
    fontFamily: "manrope",
    studioName: "IGNOS PHOTOBOOTH",
    homeHeadline: "Abadikan Momen Berhargamu",
    homeSubheadline: "Sentuh layar untuk memulai sesi pemotretan",
    logoUrl: "",
    enableBonusTutorial: true,
    enableAddonsStep: true,
    enableStoryQuestion: true,
    freeEventMode: false,
  },
  "luxury-wedding": {
    presetId: "luxury-wedding",
    name: "Romantic Luxury (Wedding & Event)",
    backgroundColor: "#fdfbf7",
    cardBackgroundColor: "#ffffff",
    primaryColor: "#78350f",
    primaryTextColor: "#ffffff",
    textColor: "#292524",
    accentColor: "#d97706",
    borderColor: "#e7e5e4",
    borderRadius: "lg",
    borderWidth: "thin",
    shadowStyle: "elevated",
    fontFamily: "manrope",
    studioName: "THE WEDDING PHOTOBOOTH",
    homeHeadline: "Capture Our Sweet Moments",
    homeSubheadline: "Terima kasih telah hadir dan merayakan bersama kami",
    logoUrl: "",
    enableBonusTutorial: false,
    enableAddonsStep: false,
    enableStoryQuestion: true,
    freeEventMode: true,
  },
  "dark-studio": {
    presetId: "dark-studio",
    name: "Dark Studio (Cyber Noir)",
    backgroundColor: "#09090b",
    cardBackgroundColor: "#18181b",
    primaryColor: "#ffffff",
    primaryTextColor: "#000000",
    textColor: "#f4f4f5",
    accentColor: "#06b6d4",
    borderColor: "#27272a",
    borderRadius: "md",
    borderWidth: "thin",
    shadowStyle: "elevated",
    fontFamily: "space-grotesk",
    studioName: "NOIR PHOTO STUDIO",
    homeHeadline: "Step Into The Spotlight",
    homeSubheadline: "Instant photo sessions with studio-grade lighting",
    logoUrl: "",
    enableBonusTutorial: true,
    enableAddonsStep: true,
    enableStoryQuestion: true,
    freeEventMode: false,
  },
  custom: {
    presetId: "custom",
    name: "Custom Theme",
    backgroundColor: "#f3f4f6",
    cardBackgroundColor: "#ffffff",
    primaryColor: "#000000",
    primaryTextColor: "#ffffff",
    textColor: "#171717",
    accentColor: "#fde047",
    borderColor: "#000000",
    borderRadius: "lg",
    borderWidth: "thick",
    shadowStyle: "hard-offset",
    fontFamily: "space-grotesk",
    studioName: "IGNOS STUDIO",
    homeHeadline: "Kamu Habis Fotoan Dimana?",
    homeSubheadline: "Pilih studio untuk mulai sesi foto kamu",
    logoUrl: "",
    enableBonusTutorial: true,
    enableAddonsStep: true,
    enableStoryQuestion: true,
    freeEventMode: false,
  },
};
