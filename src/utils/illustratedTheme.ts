import type { KioskThemeConfig } from "../types/kioskTheme";

export type IllustratedPack = "woset-play" | "riso-zine" | "analog-archive" | "studio-cats";

export function isIllustratedPack(pack: KioskThemeConfig["assetPack"] | undefined): pack is IllustratedPack {
  return pack === "woset-play" || pack === "riso-zine" || pack === "analog-archive" || pack === "studio-cats";
}
