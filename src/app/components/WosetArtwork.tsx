import { useKioskTheme } from "../../context/KioskThemeContext";
import { isIllustratedPack, type IllustratedPack } from "../../utils/illustratedTheme";

export type WosetScene = "welcome" | "studio" | "booth" | "friends" | "frames" | "keepsake" | "ready";

/** Original SVG scenes shared by the real kiosk and its admin preview. */
export function WosetArtwork({ scene, className = "", alt = "", pack }: {
  scene: WosetScene;
  className?: string;
  alt?: string;
  pack?: IllustratedPack;
}) {
  let activePack = pack ?? "woset-play";
  try {
    const { theme } = useKioskTheme();
    if (!pack && isIllustratedPack(theme.assetPack)) activePack = theme.assetPack;
  } catch {
    // Explicit pack previews can also be rendered outside the kiosk provider.
  }
  return <img src={`/themes/${activePack}/${scene}.svg`} alt={alt} draggable={false} className={`kiosk-artwork select-none object-contain ${className}`} />;
}
