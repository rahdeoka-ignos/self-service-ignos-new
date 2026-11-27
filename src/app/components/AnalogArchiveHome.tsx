import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { KioskThemeConfig } from "../../types/kioskTheme";

type ServiceId = "photo-studio" | "photo-box";
const services = [
  { id: "photo-studio" as const, name: "Photo Studio", code: "01", description: "Pilih hasil sesi foto dari studio." },
  { id: "photo-box" as const, name: "Photo Box", code: "02", description: "Lanjutkan hasil sesi photo box." },
];

export function AnalogArchiveHome({ theme, onSelectService, onStaffImport }: {
  theme: KioskThemeConfig;
  onSelectService: (service: ServiceId) => void;
  onStaffImport: () => void;
}) {
  const [selectedService, setSelectedService] = useState<ServiceId>("photo-studio");
  const [photoError, setPhotoError] = useState(false);

  return (
    <div className="analog-home mx-auto flex min-h-[calc(100dvh-48px)] w-full max-w-[1440px] flex-col text-[var(--kiosk-text)] md:min-h-[calc(100dvh-64px)]">
      <header className="flex items-center justify-between gap-6 pb-8">
        <div onDoubleClick={onStaffImport} title={theme.studioName} className="flex min-w-0 cursor-default select-none items-center gap-3">
          {theme.logoUrl ? <img src={theme.logoUrl} alt={theme.studioName} className="h-10 max-w-[160px] rounded bg-[#eee9dd] p-1 object-contain" /> : <span className="text-[17px] font-semibold tracking-[-0.5px]">{theme.studioName}</span>}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#aeb4a7]">Analog archive / 001</span>
      </header>

      <div className="grid flex-1 content-center items-center gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)] lg:gap-14 xl:gap-20">
        <section aria-labelledby="archive-sheet-heading" className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#aeb4a7]">
            <h2 id="archive-sheet-heading" className="text-[10px] font-normal">Contact sheet</h2><span>35 mm / B&amp;W</span>
          </div>
          <figure className="m-0 overflow-hidden bg-[#101311]">
            <img src={photoError ? "/themes/analog-archive/welcome.svg" : "/themes/analog-archive/contact-sheet.png"} onError={() => setPhotoError(true)} alt="Contact sheet berisi enam potret studio hitam putih" draggable={false} className="block aspect-[3/2] w-full select-none object-contain" />
            <figcaption className="sr-only">Koleksi potret editorial untuk tema Analog Archive.</figcaption>
          </figure>
          <div className="mt-3 flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[#aeb4a7]"><span>Frame 01 — 06</span><span>Ignos photo collection</span></div>
        </section>

        <aside aria-label="Mulai sesi foto" className="w-full max-w-[420px] justify-self-center py-3 lg:justify-self-start">
          <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--kiosk-primary)]">Self-service photo studio</p>
          <h1 className="analog-home-title">{theme.homeHeadline}</h1>
          <p className="mt-4 max-w-[36ch] text-[14px] leading-[1.7] text-[#aeb4a7]">{theme.homeSubheadline}</p>

          <fieldset className="mt-8 min-w-0 border-0 p-0">
            <legend className="mb-3 text-[12px] font-medium text-[#aeb4a7]">Pilih asal sesi fotomu</legend>
            <div role="group" aria-label="Pilih layanan" className="space-y-2">
              {services.map(service => {
                const active = selectedService === service.id;
                return <button key={service.id} type="button" aria-pressed={active} onClick={() => setSelectedService(service.id)} className={`flex min-h-[78px] w-full items-center gap-4 rounded border px-4 py-3 text-left transition-colors motion-reduce:transition-none ${active ? "border-[var(--kiosk-primary)] bg-[#d2b477]/[0.06]" : "border-[#6e746c]/40 hover:border-[#aeb4a7]"}`}>
                  <span className={`font-mono text-[11px] ${active ? "text-[var(--kiosk-primary)]" : "text-[#aeb4a7]"}`}>{service.code}</span>
                  <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{service.name}</span><span className="mt-1 block text-[12px] leading-5 text-[#aeb4a7]">{service.description}</span></span>
                  <span aria-hidden="true" className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border ${active ? "border-[var(--kiosk-primary)] bg-[var(--kiosk-primary)] text-[var(--kiosk-primary-text)]" : "border-[#6e746c]"}`}>{active && <Check size={12} strokeWidth={2.5} />}</span>
                </button>;
              })}
            </div>
          </fieldset>

          <button type="button" onClick={() => onSelectService(selectedService)} className="mt-5 flex min-h-[54px] w-full items-center justify-between rounded bg-[var(--kiosk-primary)] px-5 py-3 text-[15px] font-semibold text-[var(--kiosk-primary-text)] transition-opacity hover:opacity-90 motion-reduce:transition-none"><span>Mulai sesi</span><ArrowRight size={19} strokeWidth={1.7} /></button>
        </aside>
      </div>

      <footer className="flex items-center justify-between gap-4 pt-8 font-mono text-[9px] uppercase tracking-[0.1em] text-[#aeb4a7]"><span>Ignos / Analog Archive</span><span>Pilih. Susun. Cetak.</span></footer>
    </div>
  );
}
