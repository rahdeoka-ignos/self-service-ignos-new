import { ArrowRight } from "lucide-react";
import type { KioskThemeConfig } from "../../types/kioskTheme";

type ServiceId = "photo-studio" | "photo-box";
export function AnalogArchiveHome({ theme, onSelectService, onStaffImport }: {
  theme: KioskThemeConfig;
  onSelectService: (service: ServiceId) => void;
  onStaffImport: () => void;
}) {
  return (
    <div className="analog-home relative isolate grid min-h-dvh w-full grid-rows-[minmax(160px,1fr)_auto_minmax(160px,1fr)] bg-[var(--kiosk-bg)] px-6 text-[var(--kiosk-text)] sm:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <img src="/themes/analog-archive/contact-sheet.png" alt="" draggable={false} className="h-full w-full select-none object-cover object-center opacity-65" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,20,18,0.65),rgba(17,20,18,0.5)_45%,rgba(17,20,18,0.85))]" />
      </div>
      <header className="absolute z-10 inset-x-0 top-6 mx-auto flex w-full max-w-[1440px] items-center justify-between gap-5 px-6 sm:px-10">
        <div onDoubleClick={onStaffImport} title={theme.studioName} className="cursor-default select-none">
          {theme.logoUrl ? <img src={theme.logoUrl} alt={theme.studioName} className="h-10 max-w-[160px] rounded bg-[var(--kiosk-primary-text)] p-1 object-contain" /> : <span className="text-[16px] font-semibold tracking-tight">{theme.studioName}</span>}
        </div>
        <span className="text-right text-[10px] uppercase tracking-[0.12em] opacity-80">Analog Archive<br />35 mm / 001</span>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-[1040px] flex-col items-center justify-end pb-7 pt-20 text-center">
        <h1 className="analog-home-title">{theme.homeHeadline}</h1>
        <p className="mt-3 text-[14px] leading-6 opacity-80">{theme.homeSubheadline}</p>
      </div>

      <section aria-label="Pilih layanan foto" className="relative z-10 mx-auto w-full max-w-[1040px]">
        <h2 className="sr-only">Pilih asal sesi fotomu</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-7">
            {([
              { id: "photo-studio", title: "Photo Studio", scene: "studio", code: "01", description: "Pilih dan cetak hasil foto dari studio." },
              { id: "photo-box", title: "Photo Box", scene: "booth", code: "02", description: "Lanjutkan hasil sesi photo box kamu." },
            ] as const).map(item => <button key={item.id} type="button" aria-label={item.title} onClick={() => onSelectService(item.id)} className="analog-home-service group relative flex cursor-pointer min-h-[280px] w-full flex-col items-center justify-center rounded-lg border border-[var(--kiosk-border)] bg-[var(--kiosk-card-bg)] px-6 py-6 text-center text-[var(--kiosk-text)] transition-colors motion-reduce:transition-none lg:min-h-[clamp(320px,40dvh,400px)]">
              <span aria-hidden="true" className="absolute left-5 top-4 font-mono text-[11px] opacity-60">{item.code} / ANALOG ARCHIVE</span>
              <img src={`/themes/analog-archive/${item.scene}.svg`} alt="" className="mb-1 h-[clamp(100px,14dvh,150px)] w-[180px] select-none object-contain" draggable={false} />
              <span className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">{item.title}</span>
              <span className="mt-2 text-[13px] leading-5 text-[var(--kiosk-text)] opacity-70">{item.description}</span>
              <span aria-hidden="true" className="mt-5 inline-flex items-center gap-5 rounded bg-[var(--kiosk-primary)] px-6 py-2.5 text-[14px] font-medium text-[var(--kiosk-primary-text)]"><span>Yuk lanjut</span><ArrowRight size={18} /></span>
            </button>)}
        </div>
      </section>

      <footer className="relative mx-auto flex w-full max-w-[1280px] items-start justify-center pt-7">
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.14em] opacity-70">Collected moments, carefully kept.</p>
        <img src="/themes/analog-archive/welcome.svg" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute bottom-3 right-0 hidden h-[140px] w-[170px] select-none object-contain opacity-60 lg:block" />
      </footer>
    </div>
  );
}
