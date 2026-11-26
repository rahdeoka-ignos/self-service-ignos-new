import type { ReactNode } from "react";
import { WosetArtwork, type WosetScene } from "./WosetArtwork";

/** One choice-card language for services, print modes, bonuses and softcopy. */
export function WosetChoiceCard({ scene, title, description, badge, eyebrow, selected, tone = "blue", onClick }: {
  scene: WosetScene;
  title: ReactNode;
  description: ReactNode;
  badge?: ReactNode;
  eyebrow?: ReactNode;
  selected?: boolean;
  tone?: "blue" | "green";
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={`group flex min-h-[210px] w-full flex-col items-start gap-4 rounded-[28px] border p-6 text-left text-[#252820] shadow-none transition-colors sm:flex-row sm:items-center motion-reduce:transition-none ${selected ? "border-[#35564a] bg-[#d6c574]/25 ring-1 ring-[#35564a]" : `border-[#252820]/35 hover:border-[#252820] hover:bg-[#d6c574]/15 ${tone === "blue" ? "bg-[#6278a4]/10" : "bg-[#466856]/10"}`}`}>
      <WosetArtwork scene={scene} className="h-[128px] w-[130px] shrink-0 self-center" />
      <span className="flex min-w-0 flex-1 flex-col items-start">
        {eyebrow && <span className="mb-1 text-[11px] uppercase tracking-[0.12em] opacity-65">{eyebrow}</span>}
        <span className="woset-display block text-[32px] font-bold leading-[1.05]">{title}</span>
        <span className="mt-3 block text-[15px] leading-6 opacity-80">{description}</span>
        {badge && <span className="mt-4 inline-flex min-h-8 items-center rounded-full border border-[#252820]/35 px-3 py-1 text-[12px] font-medium">{badge}</span>}
      </span>
      <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center self-end rounded-full border border-[#252820]/35 text-[20px] sm:self-center ${selected ? "bg-[#35564a] text-white" : ""}`}>{selected ? "✓" : "↗"}</span>
    </button>
  );
}
