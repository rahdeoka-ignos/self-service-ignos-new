import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ImgHTMLAttributes, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { VariableSizeList } from "react-window";
import { Check, ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";
import { apiFetch as fetch } from "../../utils/api";

export const CAMERA_API =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? `http://${window.location.hostname}:5000`
    : "http://localhost:5000";

export interface GridPhoto {
  id: string;
  name: string;
  size: number;
  timeMs: number | null;
  timeFormatted: string;
  group: string; // main | tolerance | outside | unknown (time-based recommendation)
  importedAt: string | null;
  thumbUrl: string;
  previewUrl: string;
}

// ── Thumbnail loading ─────────────────────────────────────────────────────
// The browser sends only ~6 requests per host at a time, so visible thumbnails are first announced
// together in one "warm" call; the backend copies them from the camera in one batch and the
// individual image requests then return from its cache.
const warmPending = new Map<string, { ids: Set<string>; done: Array<() => void> }>();
let warmTimer: ReturnType<typeof setTimeout> | null = null;
function warmThumbnail(thumbUrl: string) {
  const url = new URL(thumbUrl, CAMERA_API);
  const scanId = url.searchParams.get("scanId") || "";
  const id = url.searchParams.get("id") || "";
  return new Promise<void>((resolve) => {
    const entry = warmPending.get(scanId) || { ids: new Set<string>(), done: [] };
    entry.ids.add(id);
    entry.done.push(resolve);
    warmPending.set(scanId, entry);
    if (!warmTimer) {
      warmTimer = setTimeout(() => {
        warmTimer = null;
        const batches = [...warmPending.entries()];
        warmPending.clear();
        for (const [batchScanId, batch] of batches) {
          void fetch(`${CAMERA_API}/api/camera-import/thumbs/warm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scanId: batchScanId, ids: [...batch.ids] }),
          }).catch(() => undefined).finally(() => batch.done.forEach((fn) => fn()));
        }
      }, 60);
    }
  });
}

export function CameraImage({ src, warm = false, className, ...props }: ImgHTMLAttributes<HTMLImageElement> & { warm?: boolean }) {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setUrl(undefined); setError(undefined);
    if (!src) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    void (warm ? warmThumbnail(src) : Promise.resolve())
      .then(() => {
        if (controller.signal.aborted) throw new DOMException("aborted", "AbortError");
        return fetch(new URL(src, CAMERA_API).href, { signal: controller.signal });
      })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Preview tidak tersedia.");
        return res.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err.message || "Preview tidak tersedia."); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [src, attempt, warm]);
  if (url) return <img {...props} className={className} src={url} draggable={false} />;
  return (
    <div className={`${className || ""} flex flex-col items-center justify-center gap-1 p-1 text-center text-[10px] text-[#888]`} title={error}>
      {error ? (
        <>
          <span className="text-[#b45309] line-clamp-2">{error}</span>
          <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setAttempt((n) => n + 1); }} className="underline text-[#171717]">Coba lagi</button>
        </>
      ) : (
        <RefreshCw size={12} className="animate-spin" />
      )}
    </div>
  );
}

// ── Grouping ──────────────────────────────────────────────────────────────
// A pause of 8+ minutes between shots usually separates two customers (same rule as the backend).
const GAP_MS = 8 * 60000;
interface PhotoGroup { key: string; label: string; start: number; end: number; recommended: boolean }

const clock = (ms: number) => new Date(ms).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
const day = (ms: number) => new Date(ms).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

export function groupPhotos(photos: GridPhoto[]): PhotoGroup[] {
  const groups: PhotoGroup[] = [];
  photos.forEach((photo, index) => {
    const previous = photos[index - 1];
    const known = photo.timeMs != null;
    const startsNew = !previous
      || (known !== (previous.timeMs != null))
      || (known && previous.timeMs != null && photo.timeMs! - previous.timeMs >= GAP_MS);
    if (startsNew) groups.push({ key: photo.id, label: "", start: index, end: index, recommended: false });
    const group = groups[groups.length - 1];
    group.end = index;
    if (photo.group === "main") group.recommended = true;
  });
  for (const group of groups) {
    const first = photos[group.start], last = photos[group.end];
    const count = group.end - group.start + 1;
    group.label = first.timeMs == null
      ? `Tanpa waktu · ${count} foto`
      : `${day(first.timeMs)} · ${clock(first.timeMs)}–${clock(last.timeMs!)} · ${count} foto`;
  }
  return groups;
}

type Row = { kind: "header"; group: PhotoGroup } | { kind: "photos"; start: number; end: number };

interface RowData {
  rows: Row[]; photos: GridPhoto[]; selected: Set<string>; cell: number; gap: number;
  onCellMouseDown: (index: number, event: ReactMouseEvent) => void;
  onCellMouseEnter: (index: number, event: ReactMouseEvent) => void;
  toggle: (index: number) => void;
  toggleGroup: (group: PhotoGroup) => void;
  openLightbox: (index: number) => void;
}

function GridRow({ index, style, data }: { index: number; style: CSSProperties; data: RowData }) {
    const { rows, photos, selected, cell, gap, onCellMouseDown, onCellMouseEnter, toggle, toggleGroup, openLightbox } = data;
    const row = rows[index];
    if (row.kind === "header") {
      const ids = photos.slice(row.group.start, row.group.end + 1);
      const count = ids.filter((p) => selected.has(p.id)).length;
      const all = count === ids.length;
      return (
        <div style={style} className="flex items-end pb-1.5">
          <div className="flex items-center justify-between w-full border-b border-[#ececec] pb-1">
            <button type="button" onClick={() => toggleGroup(row.group)} className="flex items-center gap-2 text-[12px] font-semibold text-[#171717] cursor-pointer">
              <span className={`w-4 h-4 rounded-[4px] border flex items-center justify-center ${all ? "bg-[#171717] border-[#171717] text-white" : count ? "bg-[#a1a1aa] border-[#a1a1aa] text-white" : "bg-white border-[#c4c4c8]"}`}>
                {count > 0 && <Check size={11} strokeWidth={3} />}
              </span>
              <span>{row.group.label}</span>
              {row.group.recommended && <span className="text-[10px] font-semibold text-[#059669] bg-[#ecfdf5] border border-[#a7f3d0] px-1.5 py-px rounded">rekomendasi durasi</span>}
            </button>
            <span className="text-[11px] text-[#888]">{count ? `${count} dipilih` : ""}</span>
          </div>
        </div>
      );
    }
    const cells = [];
    for (let i = row.start; i <= row.end; i++) {
      const photo = photos[i];
      const isSelected = selected.has(photo.id);
      cells.push(
        <div
          key={photo.id}
          role="option"
          aria-selected={isSelected}
          onMouseDown={(e) => onCellMouseDown(i, e)}
          onMouseEnter={(e) => onCellMouseEnter(i, e)}
          onDoubleClick={() => openLightbox(i)}
          style={{ width: cell }}
          className="select-none cursor-pointer"
          title={`${photo.name} · ${photo.timeFormatted}${photo.importedAt ? ` · sudah diimpor ${new Date(photo.importedAt).toLocaleString("id-ID")}` : ""}`}
        >
          <div className={`relative rounded-[7px] overflow-hidden border-2 bg-[#f4f4f5] ${isSelected ? "border-[#2563eb]" : "border-transparent"}`} style={{ height: Math.round(cell * 0.72) }}>
            <CameraImage src={photo.thumbUrl} warm alt={photo.name} className={`w-full h-full object-cover ${isSelected ? "" : photo.group === "main" ? "" : "opacity-80"}`} />
            {isSelected && <div className="absolute inset-0 bg-[#2563eb]/15 pointer-events-none" />}
            <button
              type="button"
              aria-label={isSelected ? `Batal pilih ${photo.name}` : `Pilih ${photo.name}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); toggle(i); }}
              className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-[5px] border flex items-center justify-center shadow-sm ${isSelected ? "bg-[#2563eb] border-[#2563eb] text-white" : "bg-white/90 border-[#c4c4c8] text-transparent hover:text-[#bbb]"}`}
            >
              <Check size={13} strokeWidth={3} />
            </button>
            {photo.importedAt && (
              <span className="absolute top-1.5 right-1.5 text-[9px] font-semibold bg-[#f59e0b] text-white px-1.5 py-0.5 rounded shadow-sm">
                Sudah pernah diimpor
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] mt-0.5 px-0.5 text-[#666] font-mono">
            <span className="truncate">{photo.name}</span>
            <span className="shrink-0 ml-1">{photo.timeMs != null ? new Date(photo.timeMs).toLocaleTimeString("id-ID") : "--"}</span>
          </div>
        </div>,
      );
    }
    return <div style={style} className="flex" role="presentation"><div className="flex" style={{ gap }}>{cells}</div></div>;
  };


// ── Grid ──────────────────────────────────────────────────────────────────
interface Props {
  photos: GridPhoto[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  height: number;
}

export function CameraPhotoGrid({ photos, selected, onChange, height }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VariableSizeList>(null);
  const [width, setWidth] = useState(800);
  const anchor = useRef<number | null>(null);
  const drag = useRef<{ start: number; base: Set<string> } | null>(null);
  const beforeClick = useRef<Set<string> | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const end = () => { drag.current = null; };
    window.addEventListener("mouseup", end);
    return () => window.removeEventListener("mouseup", end);
  }, []);

  const gap = 8;
  const usable = width - 18; // room for the list's vertical scrollbar
  const columns = Math.max(3, Math.floor((usable + gap) / (150 + gap)));
  const cell = Math.floor((usable - gap * (columns - 1)) / columns);
  const photoRowHeight = Math.round(cell * 0.72) + 24 + gap;
  const groups = useMemo(() => groupPhotos(photos), [photos]);
  const rows = useMemo(() => {
    const result: Row[] = [];
    for (const group of groups) {
      result.push({ kind: "header", group });
      for (let i = group.start; i <= group.end; i += columns) result.push({ kind: "photos", start: i, end: Math.min(i + columns - 1, group.end) });
    }
    return result;
  }, [groups, columns]);
  useEffect(() => { listRef.current?.resetAfterIndex(0); }, [rows, photoRowHeight]);

  // Open on the recommendation (the newest session), like Explorer opening on the last folder.
  const scrolledFor = useRef<GridPhoto[] | null>(null);
  useEffect(() => {
    if (scrolledFor.current === photos || !rows.length) return;
    scrolledFor.current = photos;
    const target = photos.findIndex((p) => p.group === "main");
    const rowIndex = rows.findIndex((r) => r.kind === "photos" && target >= r.start && target <= r.end);
    listRef.current?.scrollToItem(Math.max(0, (rowIndex > 0 ? rowIndex - 1 : rowIndex)), "start");
  }, [photos, rows]);

  const range = (a: number, b: number) => photos.slice(Math.min(a, b), Math.max(a, b) + 1).map((p) => p.id);
  const union = (base: Set<string>, ids: string[]) => { const next = new Set(base); ids.forEach((id) => next.add(id)); return next; };

  const onCellMouseDown = (index: number, event: ReactMouseEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    containerRef.current?.focus();
    // The second press of a double-click only opens the large view (see openLargeView).
    if (event.detail >= 2) return;
    const additive = event.ctrlKey || event.metaKey;
    const current = selectedRef.current;
    beforeClick.current = current;
    if (event.shiftKey && anchor.current != null) {
      onChange(union(additive ? current : new Set(), range(anchor.current, index)));
      return;
    }
    if (additive) {
      const next = new Set(current);
      if (next.has(photos[index].id)) next.delete(photos[index].id); else next.add(photos[index].id);
      anchor.current = index;
      drag.current = { start: index, base: next };
      onChange(next);
      return;
    }
    anchor.current = index;
    drag.current = { start: index, base: new Set() };
    onChange(new Set([photos[index].id]));
  };
  const onCellMouseEnter = (index: number, event: ReactMouseEvent) => {
    if (!drag.current || !(event.buttons & 1)) return;
    onChange(union(drag.current.base, range(drag.current.start, index)));
  };
  const toggle = (index: number) => {
    const next = new Set(selectedRef.current);
    if (next.has(photos[index].id)) next.delete(photos[index].id); else next.add(photos[index].id);
    anchor.current = index;
    onChange(next);
  };
  const toggleGroup = (group: PhotoGroup) => {
    const ids = photos.slice(group.start, group.end + 1).map((p) => p.id);
    const all = ids.every((id) => selectedRef.current.has(id));
    const next = new Set(selectedRef.current);
    ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
    anchor.current = group.start;
    onChange(next);
  };
  const onKeyDown = (event: ReactKeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      onChange(new Set(photos.map((p) => p.id)));
    } else if (event.key === "Escape" && selectedRef.current.size) {
      event.preventDefault();
      event.stopPropagation();
      onChange(new Set());
    }
  };

  // Inspecting a photo must not throw away the selection the first click of the double-click changed.
  const openLargeView = (index: number) => {
    if (beforeClick.current) onChange(beforeClick.current);
    beforeClick.current = null;
    drag.current = null;
    setLightbox(index);
  };
  const itemData: RowData = { rows, photos, selected, cell, gap, onCellMouseDown, onCellMouseEnter, toggle, toggleGroup, openLightbox: openLargeView };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="listbox"
      aria-multiselectable="true"
      aria-label="Foto di kamera"
      onKeyDown={onKeyDown}
      className="outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/40 rounded-[8px]"
    >
      <VariableSizeList
        ref={listRef}
        height={height}
        width="100%"
        itemCount={rows.length}
        itemSize={(index) => (rows[index].kind === "header" ? 38 : photoRowHeight)}
        overscanCount={2}
        itemData={itemData}
        style={{ overflowX: "hidden" }}
      >
        {GridRow}
      </VariableSizeList>
      {lightbox != null && photos[lightbox] && (
        <PhotoLightbox
          photos={photos}
          index={lightbox}
          selected={selected}
          onIndex={setLightbox}
          onToggle={toggle}
          onClose={() => { setLightbox(null); containerRef.current?.focus(); }}
        />
      )}
    </div>
  );
}

function PhotoLightbox({ photos, index, selected, onIndex, onToggle, onClose }: {
  photos: GridPhoto[]; index: number; selected: Set<string>;
  onIndex: (index: number) => void; onToggle: (index: number) => void; onClose: () => void;
}) {
  const photo = photos[index];
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
      else if (event.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      else if (event.key === "ArrowRight" && index < photos.length - 1) onIndex(index + 1);
      else if (event.key === " ") { event.preventDefault(); onToggle(index); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [index, photos.length, onClose, onIndex, onToggle]);
  const isSelected = selected.has(photo.id);
  return (
    <div className="fixed inset-0 z-[60] bg-black/85 flex flex-col" onMouseDown={onClose}>
      <div className="flex items-center justify-between px-5 py-3 text-white text-[13px]" onMouseDown={(e) => e.stopPropagation()}>
        <span className="font-mono">{photo.name} · {photo.timeFormatted} · {index + 1}/{photos.length}</span>
        <div className="flex items-center gap-2">
          {photo.importedAt && <span className="text-[11px] bg-[#f59e0b] px-2 py-0.5 rounded">Sudah pernah diimpor</span>}
          <button type="button" onClick={() => onToggle(index)} className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium ${isSelected ? "bg-[#2563eb]" : "bg-white/15 hover:bg-white/25"}`}>
            {isSelected ? "✓ Dipilih (Spasi)" : "Pilih (Spasi)"}
          </button>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-[6px] hover:bg-white/15 flex items-center justify-center" aria-label="Tutup"><X size={18} /></button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center gap-3 px-4 pb-6 min-h-0" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" disabled={index === 0} onClick={() => onIndex(index - 1)} className="text-white disabled:opacity-20 p-2" aria-label="Sebelumnya"><ChevronLeft size={32} /></button>
        <CameraImage key={photo.id} src={photo.previewUrl} alt={photo.name} className="max-h-full max-w-full min-w-[240px] min-h-[200px] object-contain text-white" />
        <button type="button" disabled={index === photos.length - 1} onClick={() => onIndex(index + 1)} className="text-white disabled:opacity-20 p-2" aria-label="Berikutnya"><ChevronRight size={32} /></button>
      </div>
    </div>
  );
}
