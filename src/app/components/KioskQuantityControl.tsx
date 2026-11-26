import { Minus, Plus } from "lucide-react";

export function KioskQuantityControl({ value, onChange, label }: { value: number; onChange: (value: number) => void; label: string }) {
  return (
    <div className="mt-auto flex w-full items-center gap-2">
      <button type="button" data-kiosk-ui="control" aria-label={`Kurangi ${label}`} disabled={value <= 0} onClick={() => onChange(Math.max(0, value - 1))} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border-4 border-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30"><Minus size={18} strokeWidth={2} /></button>
      <output data-kiosk-ui="quantity" aria-label={`Jumlah ${label}`} aria-live="polite" className="flex min-h-11 flex-1 items-center justify-center rounded-lg border-4 border-black py-1.5 text-center text-2xl font-bold">{value}</output>
      <button type="button" data-kiosk-ui="control" aria-label={`Tambah ${label}`} onClick={() => onChange(value + 1)} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border-4 border-black transition-colors hover:bg-black hover:text-white"><Plus size={18} strokeWidth={2} /></button>
    </div>
  );
}
