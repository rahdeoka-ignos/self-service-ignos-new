import { useEffect, useState, useRef } from "react";
import { Printer, Loader2, X } from "lucide-react";
import type { PrinterMonitorResponse, PrinterAlertInfo } from "../../types/printer";

const API = "http://localhost:5000";

// Gentle audio chime to notify staff without startling customers
function playAlertChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Pleasant two-tone chime (E5 -> G#5)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc2.frequency.setValueAtTime(830.61, now + 0.15); // G#5

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.15);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);
  } catch {
    // Audio context may require user gesture on some browsers
  }
}

export function KioskPrinterAlertModal() {
  const [alert, setAlert] = useState<PrinterAlertInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const prevAlertRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkPrinterStatus = async () => {
      try {
        const res = await fetch(`${API}/api/printer-status`);
        if (!res.ok) return;
        const data: PrinterMonitorResponse = await res.json();

        if (!isMounted) return;

        if (data.hasError && data.alert) {
          const alertKey = `${data.alert.type}-${data.alert.printerName}`;
          if (prevAlertRef.current !== alertKey) {
            playAlertChime();
            prevAlertRef.current = alertKey;
            setDismissed(false); // reset dismiss on new alert
          }
          setAlert(data.alert);
        } else {
          // Resolved / normal!
          setAlert(null);
          setDismissed(false);
          prevAlertRef.current = null;
        }
      } catch {
        // backend might be unreachable temporarily
      }
    };

    checkPrinterStatus();
    const interval = setInterval(checkPrinterStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!alert || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 select-none font-['Manrope',sans-serif] animate-in fade-in duration-150">
      <div className="bg-white border border-[#e5e5e5] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-center relative space-y-6 text-[#171717]">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-neutral-400 hover:text-[#171717] hover:bg-neutral-100 transition-colors cursor-pointer"
          title="Tutup sementara"
        >
          <X size={18} />
        </button>

        {/* Clean Executive Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shadow-2xs pt-0.5">
          <Printer size={28} strokeWidth={1.75} />
        </div>

        {/* Title & Customer-Friendly Message */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-[#171717] tracking-tight leading-snug">
            {alert.title}
          </h2>
          <p className="text-sm text-[#737373] leading-relaxed max-w-md mx-auto">
            {alert.customerMessage}
          </p>
        </div>

        {/* Real-time Status Box */}
        <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-xl p-3.5 flex items-center justify-center gap-2.5 text-xs font-semibold text-[#171717]">
          <Loader2 size={16} className="animate-spin text-[#171717]" />
          <span>Menunggu printer kembali siap (Ready)...</span>
        </div>

        {/* Footer Note & Secondary Dismiss Action */}
        <div className="space-y-2 pt-1 border-t border-[#f0f0f0]">
          <p className="text-[11px] text-[#888] leading-relaxed">
            Staf kasir studio telah diberitahu. Cetakan foto akan otomatis keluar begitu printer selesai disiapkan.
          </p>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs font-semibold text-neutral-400 hover:text-[#171717] transition-colors cursor-pointer"
          >
            Tutup sementara
          </button>
        </div>
      </div>
    </div>
  );
}
