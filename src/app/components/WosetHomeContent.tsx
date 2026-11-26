import type { KioskThemeConfig } from "../../types/kioskTheme";
import { WosetChoiceCard } from "./WosetChoiceCard";
import { WosetArtwork } from "./WosetArtwork";

export function WosetHomeContent({ theme, onSelectService, onStaffImport }: {
  theme: KioskThemeConfig;
  onSelectService: (service: string) => void;
  onStaffImport: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-48px)] w-full max-w-[1280px] flex-col">
      <header className="flex items-center justify-between gap-4 text-sm">
        <span className="hidden sm:block">Ruang kecil untuk cerita kamu.</span>
        <div onDoubleClick={onStaffImport} title={theme.studioName} className="select-none text-center sm:absolute sm:left-1/2 sm:-translate-x-1/2">
          {theme.logoUrl ? <img src={theme.logoUrl} alt={theme.studioName} className="mx-auto h-12 max-w-[200px] object-contain" /> : <p className="font-['Gaegu',cursive] text-[32px] font-bold leading-none tracking-[-1px]">{theme.studioName}</p>}
        </div>
        <span className="ml-auto inline-flex items-center gap-2"><span className="size-2 rounded-full bg-[#466856]" />Self service</span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center pb-6 pt-10 text-center">
        <p className="mb-2 text-xs uppercase tracking-[0.2em]">Selamat datang di dunia Ignos</p>
        <h1 className="woset-display max-w-[780px] text-[42px] font-bold leading-[1.05] sm:text-[60px]">{theme.homeHeadline}</h1>
        <p className="mt-3 max-w-[560px] text-[15px] leading-6 opacity-75">{theme.homeSubheadline}</p>
        <WosetArtwork scene="welcome" className="mt-3 h-[min(34vh,340px)] min-h-[190px] w-full max-w-[760px]" />
      </div>

      <div className="grid gap-4 pb-3 md:grid-cols-2 md:gap-6">
        {[
          { id: "photo-studio", scene: "studio" as const, title: "Photo Studio", detail: "Sudah foto di studio? Lanjut pilih dan susun kenanganmu.", label: "Teman cerita pertama", color: "bg-[#6278a4]/10" },
          { id: "photo-box", scene: "booth" as const, title: "Photo Box", detail: "Main bareng, pilih foto favorit, lalu bawa pulang ceritanya.", label: "Teman cerita kedua", color: "bg-[#466856]/10" },
        ].map(service => (
          <WosetChoiceCard key={service.id} scene={service.scene} title={service.title} description={service.detail} eyebrow={service.label} tone={service.id === "photo-box" ? "green" : "blue"} onClick={() => onSelectService(service.id)} />
        ))}
      </div>
      <footer className="flex items-center justify-between gap-4 py-3 text-[11px] opacity-60"><span>Pilih layanan untuk memulai.</span><span>Foto. Main. Simpan cerita.</span></footer>
    </div>
  );
}
