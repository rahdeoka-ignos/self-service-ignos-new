export type WosetScene = "welcome" | "studio" | "booth" | "friends" | "frames" | "keepsake" | "ready";

/** Original SVG scenes shared by the real kiosk and its admin preview. */
export function WosetArtwork({ scene, className = "", alt = "" }: {
  scene: WosetScene;
  className?: string;
  alt?: string;
}) {
  return <img src={`/themes/woset-play/${scene}.svg`} alt={alt} draggable={false} className={`select-none object-contain ${className}`} />;
}
