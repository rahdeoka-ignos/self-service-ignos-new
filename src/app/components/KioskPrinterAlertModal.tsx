import { useEffect, useState, useRef } from "react";
import { Printer, AlertTriangle, Loader2, X, RefreshCw } from "lucide-react";
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

  const isPaperOut = alert.type === "paper_out";
  const isDoorOpen = alert.type === "door_open";
  const isPaperJam = alert.type === "paper_jam";

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white border-6 border-black rounded-3xl p-8 max-w-xl w-full shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] text-center relative overflow-hidden">
        {/* Decorative Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-yellow-400 border-b-4 border-black" />

        {/* Close Button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-6 right-6 w-11 h-11 border-3 border-black rounded-full flex items-center justify-center bg-gray-100 hover:bg-black hover:text-white transition-colors cursor-pointer"
          title="Tutup peringatan"
        >
          <X size={22} strokeWidth={3} />
        </button>

        {/* Big Animated Icon */}
        <div className="w-24 h-24 bg-yellow-300 border-4 border-black rounded-3xl flex items-center justify-center mx-auto mt-4 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative animate-bounce">
          <Printer size={48} strokeWidth={2.5} className="text-black" />
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full border-2 border-black flex items-center justify-center font-black text-sm">
            !
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-red-100 text-red-800 border-2 border-red-500 rounded-full px-4 py-1.5 text-sm font-black uppercase tracking-wider mb-4">
          <AlertTriangle size={16} strokeWidth={3} className="text-red-600" />
          <span>
            {isPaperOut
              ? "Kertas Printer Habis"
              : isDoorOpen
                ? "Tray / Penutup Belum Terbuka"
                : isPaperJam
                  ? "Kertas Macet (Paper Jam)"
                  : "Perhatian Printer"}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-black text-black leading-tight mb-3">
          {alert.title}
        </h2>

        {/* Customer Friendly Message */}
        <p className="text-lg text-gray-700 font-bold mb-6 leading-relaxed max-w-md mx-auto">
          {alert.customerMessage}
        </p>

        {/* Real-time Status Card */}
        <div className="bg-gray-50 border-3 border-black rounded-2xl p-4 mb-6 flex items-center justify-center gap-3">
          <Loader2 size={20} className="animate-spin text-black" />
          <span className="text-sm font-black text-gray-800">
            Menunggu printer kembali siap (Ready)...
          </span>
        </div>

        {/* Footer Note & Staff Assist */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400 font-bold">
            Staff kasir sudah diberitahu. Cetakan kamu akan otomatis keluar begitu printer selesai disiapkan.
          </p>
          <button
            onClick={() => setDismissed(true)}
            className="mt-2 text-sm font-bold text-gray-500 hover:text-black underline cursor-pointer"
          >
            Tutup sementara
          </button>
        </div>
      </div>
    </div>
  );
}
