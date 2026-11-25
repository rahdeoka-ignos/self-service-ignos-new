import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { Camera, X } from "lucide-react";
import { CameraImportModal, type CameraAutoRequest } from "./CameraImportModal";
import { CAMERA_API } from "./CameraPhotoGrid";

type Detected = CameraAutoRequest & { label: string };

// Listens for "camera / card reader plugged in" events from the backend.
// - Home screen or admin pages: open the import pop-up right away.
// - During a customer session: show a small badge instead, so the customer's flow and timer are not
//   interrupted. The pop-up opens when staff click it, or once the kiosk is back on the home screen.
export function CameraPlugWatcher() {
  const location = useLocation();
  const idle = location.pathname === "/" || location.pathname.startsWith("/admin");
  const idleRef = useRef(idle);
  idleRef.current = idle;
  const [request, setRequest] = useState<Detected>();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Detected | null>(null);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const source = new EventSource(`${CAMERA_API}/api/camera-import/events`, { withCredentials: true });
    source.onmessage = (message) => {
      let event: { type: string; source: string; path?: string; label?: string };
      try { event = JSON.parse(message.data); } catch { return; }
      if (event.type === "connected") {
        const detected: Detected = { key: Date.now(), presetId: event.source, path: event.path, label: event.label || "Kamera" };
        if (idleRef.current) { setRequest(detected); setOpen(true); setPending(null); }
        else setPending(detected);
      } else if (event.type === "disconnected") {
        setPending((current) => (current && current.presetId === event.source && (!event.path || current.path === event.path) ? null : current));
      }
    };
    // EventSource reconnects by itself when the backend restarts.
    return () => source.close();
  }, []);

  useEffect(() => {
    if (idle && pending && !open) { setRequest(pending); setOpen(true); setPending(null); }
  }, [idle, pending, open]);

  return (
    <>
      {pending && !open && (
        <div className="fixed bottom-4 left-4 z-[45] flex items-center gap-2 bg-[#171717] text-white rounded-full shadow-lg pl-3 pr-1.5 py-1.5 text-[12px] font-medium animate-in fade-in slide-in-from-bottom-2">
          <button type="button" onClick={() => { setRequest(pending); setOpen(true); setPending(null); }} className="flex items-center gap-2 cursor-pointer">
            <Camera size={14} />
            <span>{pending.label} terdeteksi — klik untuk impor foto</span>
          </button>
          <button type="button" aria-label="Sembunyikan" onClick={() => setPending(null)} className="w-6 h-6 rounded-full hover:bg-white/15 flex items-center justify-center cursor-pointer">
            <X size={13} />
          </button>
        </div>
      )}
      <CameraImportModal isOpen={open} onClose={() => setOpen(false)} autoRequest={request} />
    </>
  );
}
