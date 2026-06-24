import { useEffect, useRef, useState } from "react";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { BrutalistButton } from "../components/BrutalistButton";
import { BrutalistCard } from "../components/BrutalistCard";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AdminLayout } from "../components/AdminLayout";
import type {
  CustomSlotDef,
  LayoutType,
  TemplateCategory,
  TemplateEntry,
  TemplatesData,
} from "../../types/template";

const API = "http://localhost:5000";

const LAYOUT_OPTIONS: { value: LayoutType; label: string; slots: number | "custom" }[] = [
  { value: "1", label: "1 Slot (Portrait)", slots: 1 },
  { value: "2", label: "2 Slot (Vertikal)", slots: 2 },
  { value: "4", label: "4 Slot (2×2)", slots: 4 },
  { value: "6", label: "6 Slot (2×3)", slots: 6 },
  { value: "8", label: "8 Slot (2×4)", slots: 8 },
  { value: "newspaper", label: "Newspaper (1 Landscape)", slots: 1 },
  { value: "wannabeyours", label: "Wannabeyours (1 Slot)", slots: 1 },
  { value: "300days", label: "300 Days (1 Slot)", slots: 1 },
  { value: "aboutu-v2", label: "About U v2 (2 Rotated)", slots: 2 },
  { value: "custom", label: "Custom (Atur Sendiri)", slots: "custom" },
];

// Print canvas dimensions
const PRINT_W = 2400;
const PRINT_H = 3600;
// Editor canvas display dimensions — content area (no border)
// Using outline (not border) so content area = exactly EDITOR_W × EDITOR_H
// and SCALE = content_px / print_px stays accurate at 1:5
const EDITOR_W = 480;
const EDITOR_H = 720;
const SCALE_X = EDITOR_W / PRINT_W; // 0.2 exact
const SCALE_Y = EDITOR_H / PRINT_H; // 0.2 exact
const SNAP_GRID = 100; // print units per grid cell
const MIN_SLOT_SIZE = 100; // minimum slot dimension in print units

interface SlotEditorSlot extends CustomSlotDef {}

interface TemplateFormState {
  name: string;
  category: string;
  newCategoryName: string;
  newCategoryId: string;
  layout: LayoutType;
  slots: SlotEditorSlot[];
  backgroundFile: File | null;
  overlayFile: File | null;
  previewFile: File | null;
}

const defaultForm = (): TemplateFormState => ({
  name: "",
  category: "basic",
  newCategoryName: "",
  newCategoryId: "",
  layout: "4",
  slots: [],
  backgroundFile: null,
  overlayFile: null,
  previewFile: null,
});

// ── Slot Editor ──────────────────────────────────────────────
type ResizeHandle = "nw" | "n" | "ne" | "w" | "e" | "sw" | "s" | "se";

type DragState = {
  type: "move" | "resize";
  handle?: ResizeHandle;
  slotIndex: number;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
};

function CustomSlotEditor({
  slots,
  onChange,
  backgroundFile,
  overlayFile,
}: {
  slots: SlotEditorSlot[];
  onChange: (slots: SlotEditorSlot[]) => void;
  backgroundFile?: File | null;
  overlayFile?: File | null;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!backgroundFile) { setBgUrl(null); return; }
    const url = URL.createObjectURL(backgroundFile);
    setBgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [backgroundFile]);

  useEffect(() => {
    if (!overlayFile) { setOverlayUrl(null); return; }
    const url = URL.createObjectURL(overlayFile);
    setOverlayUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [overlayFile]);

  const snap = (v: number) =>
    snapEnabled ? Math.round(v / SNAP_GRID) * SNAP_GRID : Math.round(v);

  const addSlot = () => {
    const next = slots.length + 1;
    const offsetY = Math.min(
      snap(Math.round(PRINT_H * 0.05 + PRINT_H * 0.15 * slots.length)),
      PRINT_H - 600,
    );
    const newSlot: SlotEditorSlot = {
      slotNumber: next,
      x: snap(Math.round(PRINT_W * 0.1)),
      y: offsetY,
      width: snapEnabled ? snap(800) : 800,
      height: snapEnabled ? snap(600) : 600,
      rotation: 0,
    };
    onChange([...slots, newSlot]);
    setSelectedSlot(slots.length);
  };

  const removeSlot = (index: number) => {
    const updated = slots
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, slotNumber: i + 1 }));
    onChange(updated);
    setSelectedSlot(null);
  };

  const updateField = (index: number, field: keyof SlotEditorSlot, rawValue: number) => {
    onChange(
      slots.map((s, i) => {
        if (i !== index) return s;
        let v = Math.round(rawValue);
        if (field === "x")      v = Math.max(0, Math.min(PRINT_W - s.width, v));
        if (field === "y")      v = Math.max(0, Math.min(PRINT_H - s.height, v));
        if (field === "width")  v = Math.max(MIN_SLOT_SIZE, Math.min(PRINT_W - s.x, v));
        if (field === "height") v = Math.max(MIN_SLOT_SIZE, Math.min(PRINT_H - s.y, v));
        return { ...s, [field]: v };
      }),
    );
  };

  const onMouseDownMove = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setSelectedSlot(index);
    const s = slots[index];
    dragRef.current = {
      type: "move",
      slotIndex: index,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: s.x,
      startY: s.y,
      startW: s.width,
      startH: s.height,
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onMouseDownResize = (e: React.MouseEvent, index: number, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSlot(index);
    const s = slots[index];
    dragRef.current = {
      type: "resize",
      handle,
      slotIndex: index,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: s.x,
      startY: s.y,
      startW: s.width,
      startH: s.height,
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startMouseX) / SCALE_X;
    const dy = (e.clientY - d.startMouseY) / SCALE_Y;

    onChange(
      slots.map((s, i) => {
        if (i !== d.slotIndex) return s;

        if (d.type === "move") {
          // Use d.startW/H (not stale s.width/height) for correct clamping
          return {
            ...s,
            x: snap(Math.max(0, Math.min(PRINT_W - d.startW, d.startX + dx))),
            y: snap(Math.max(0, Math.min(PRINT_H - d.startH, d.startY + dy))),
          };
        }

        // ── Resize ──────────────────────────────────────────────────
        const h = d.handle!;
        // Fixed edges: opposite side of the handle being dragged
        const rightEdge  = d.startX + d.startW; // stays fixed when "w" handle moves
        const bottomEdge = d.startY + d.startH; // stays fixed when "n" handle moves

        let newX = d.startX, newY = d.startY;
        let newW = d.startW, newH = d.startH;

        // ── Horizontal ──────────────────────────────────────────────
        if (h.includes("e")) {
          // Right edge moves; left edge stays. Clamp so right edge ≤ PRINT_W.
          newW = Math.max(MIN_SLOT_SIZE, d.startW + dx);
          newW = Math.min(newW, PRINT_W - d.startX);
          if (snapEnabled) {
            // Snap the right edge to grid, then derive width
            const snappedRight = snap(d.startX + newW);
            newW = Math.max(MIN_SLOT_SIZE, Math.min(PRINT_W - d.startX, snappedRight - d.startX));
          }
        } else if (h.includes("w")) {
          // Left edge moves; right edge stays at rightEdge.
          // Clamp newX to [0, rightEdge - MIN_SLOT_SIZE].
          const rawX = d.startX + dx;
          newX = Math.max(0, Math.min(rightEdge - MIN_SLOT_SIZE, rawX));
          if (snapEnabled) newX = Math.max(0, Math.min(rightEdge - MIN_SLOT_SIZE, snap(rawX)));
          newW = rightEdge - newX; // derived — always keeps right edge fixed
        }

        // ── Vertical ────────────────────────────────────────────────
        if (h.includes("s")) {
          // Bottom edge moves; top edge stays. Clamp so bottom edge ≤ PRINT_H.
          newH = Math.max(MIN_SLOT_SIZE, d.startH + dy);
          newH = Math.min(newH, PRINT_H - d.startY);
          if (snapEnabled) {
            // Snap the bottom edge to grid, then derive height
            const snappedBottom = snap(d.startY + newH);
            newH = Math.max(MIN_SLOT_SIZE, Math.min(PRINT_H - d.startY, snappedBottom - d.startY));
          }
        } else if (h.includes("n")) {
          // Top edge moves; bottom edge stays at bottomEdge.
          // Clamp newY to [0, bottomEdge - MIN_SLOT_SIZE].
          const rawY = d.startY + dy;
          newY = Math.max(0, Math.min(bottomEdge - MIN_SLOT_SIZE, rawY));
          if (snapEnabled) newY = Math.max(0, Math.min(bottomEdge - MIN_SLOT_SIZE, snap(rawY)));
          newH = bottomEdge - newY; // derived — always keeps bottom edge fixed
        }

        // Round to integer print units (no float sub-pixel drift).
        // For "w"/"n" handles, re-derive size from the fixed opposite edge AFTER
        // rounding position — prevents the fixed edge from drifting by ±1 unit.
        if (!snapEnabled) {
          newX = Math.round(newX); newY = Math.round(newY);
          if (h.includes("w")) newW = rightEdge - newX;      // keep right edge exact
          else newW = Math.round(newW);
          if (h.includes("n")) newH = bottomEdge - newY;     // keep bottom edge exact
          else newH = Math.round(newH);
        }

        return { ...s, x: newX, y: newY, width: newW, height: newH };
      }),
    );
  };

  const onMouseUp = () => {
    dragRef.current = null;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (selectedSlot === null) return;
    const slot = slots[selectedSlot];
    if (!slot) return;
    const step = snapEnabled ? SNAP_GRID : 10;
    const updates: Partial<SlotEditorSlot> = {};
    if (e.key === "ArrowLeft")  { e.preventDefault(); updates.x = Math.max(0, slot.x - step); }
    if (e.key === "ArrowRight") { e.preventDefault(); updates.x = Math.min(PRINT_W - slot.width, slot.x + step); }
    if (e.key === "ArrowUp")    { e.preventDefault(); updates.y = Math.max(0, slot.y - step); }
    if (e.key === "ArrowDown")  { e.preventDefault(); updates.y = Math.min(PRINT_H - slot.height, slot.y + step); }
    if (Object.keys(updates).length > 0)
      onChange(slots.map((s, i) => (i === selectedSlot ? { ...s, ...updates } : s)));
  };

  // 8 resize handles: nw n ne  w e  sw s se
  const resizeHandles: { id: ResizeHandle; style: React.CSSProperties }[] = [
    { id: "nw", style: { top: -5, left: -5, cursor: "nw-resize" } },
    { id: "n",  style: { top: -5, left: "calc(50% - 5px)", cursor: "n-resize" } },
    { id: "ne", style: { top: -5, right: -5, cursor: "ne-resize" } },
    { id: "w",  style: { top: "calc(50% - 5px)", left: -5, cursor: "w-resize" } },
    { id: "e",  style: { top: "calc(50% - 5px)", right: -5, cursor: "e-resize" } },
    { id: "sw", style: { bottom: -5, left: -5, cursor: "sw-resize" } },
    { id: "s",  style: { bottom: -5, left: "calc(50% - 5px)", cursor: "s-resize" } },
    { id: "se", style: { bottom: -5, right: -5, cursor: "se-resize" } },
  ];

  const gridStep = SNAP_GRID * SCALE_X; // pixels per grid cell in editor

  return (
    <div className="flex flex-col gap-3" tabIndex={0} onKeyDown={handleKeyDown} style={{ outline: "none" }}>
      {/* Toolbar */}
      <div className="flex gap-2 items-center flex-wrap">
        <BrutalistButton size="sm" onClick={addSlot}>
          + Tambah Slot
        </BrutalistButton>
        <button
          type="button"
          onClick={() => setSnapEnabled((v) => !v)}
          className={`px-3 py-1.5 border-2 border-black rounded-lg text-sm font-bold transition-colors ${
            snapEnabled ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
          }`}
        >
          Snap {snapEnabled ? "ON" : "OFF"}
        </button>
        <button
          type="button"
          onClick={() => setShowGrid((v) => !v)}
          className={`px-3 py-1.5 border-2 border-black rounded-lg text-sm font-bold transition-colors ${
            showGrid ? "bg-gray-700 text-white" : "bg-white text-black hover:bg-gray-100"
          }`}
        >
          Grid {showGrid ? "ON" : "OFF"}
        </button>
        {selectedSlot !== null && slots[selectedSlot] ? (
          <span className="text-xs text-blue-700 font-medium ml-1">
            Slot {slots[selectedSlot].slotNumber} dipilih — tekan ↑↓←→ untuk geser halus
          </span>
        ) : (
          <span className="text-xs text-gray-400 ml-1">Klik slot untuk memilih</span>
        )}
      </div>

      <div className="flex gap-4">
        {/* Visual canvas */}
        <div className="shrink-0">
          <p className="text-[11px] text-gray-500 mb-1 font-medium">
            Skala 1:5 — print canvas 2400×3600px
          </p>
          <div
            ref={canvasRef}
            className="relative rounded-lg select-none overflow-hidden"
            style={{ width: EDITOR_W, height: EDITOR_H, backgroundColor: "#e5e7eb", outline: "4px solid black" }}
            onClick={() => setSelectedSlot(null)}
          >
            {/* Background preview — object-fill to match ctx.drawImage(bg,0,0,2400,3600) */}
            {bgUrl ? (
              <img
                src={bgUrl}
                alt="background preview"
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 0, objectFit: "fill" }}
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
                <span className="text-gray-400 text-xs font-medium text-center px-4">
                  Upload background<br />untuk preview di sini
                </span>
              </div>
            )}
            {/* Grid overlay */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  zIndex: 1,
                  backgroundImage:
                    `repeating-linear-gradient(0deg,rgba(255,255,255,0.25) 0,rgba(255,255,255,0.25) 1px,transparent 1px,transparent ${gridStep}px),` +
                    `repeating-linear-gradient(90deg,rgba(255,255,255,0.25) 0,rgba(255,255,255,0.25) 1px,transparent 1px,transparent ${gridStep}px),` +
                    `repeating-linear-gradient(0deg,rgba(0,0,0,0.07) 0,rgba(0,0,0,0.07) 1px,transparent 1px,transparent ${gridStep}px),` +
                    `repeating-linear-gradient(90deg,rgba(0,0,0,0.07) 0,rgba(0,0,0,0.07) 1px,transparent 1px,transparent ${gridStep}px)`,
                }}
              />
            )}
            {slots.map((s, i) => {
              const isSel = selectedSlot === i;
              return (
                <div
                  key={i}
                  className={`absolute group ${
                    isSel
                      ? "border-2 border-black bg-blue-300/50 z-20"
                      : "border-2 border-blue-500 bg-blue-100/40 z-10 hover:border-blue-700"
                  }`}
                  style={{
                    left: s.x * SCALE_X,
                    top: s.y * SCALE_Y,
                    width: s.width * SCALE_X,
                    height: s.height * SCALE_Y,
                    transform: s.rotation !== 0 ? `rotate(${s.rotation}deg)` : undefined,
                    transformOrigin: "center center",
                    cursor: "move",
                  }}
                  onClick={(e) => { e.stopPropagation(); setSelectedSlot(i); }}
                  onMouseDown={(e) => onMouseDownMove(e, i)}
                >
                  {/* Slot number badge */}
                  <span
                    className={`absolute top-0.5 left-0.5 text-white text-[10px] font-bold px-1 rounded leading-none z-10 ${
                      isSel ? "bg-black" : "bg-blue-600"
                    }`}
                  >
                    {s.slotNumber}
                  </span>
                  {/* Dimensions badge — shown when slot is large enough */}
                  {s.width * SCALE_X > 55 && s.height * SCALE_Y > 22 && (
                    <span className="absolute bottom-0.5 right-0.5 text-[9px] font-mono text-gray-700 bg-white/80 px-0.5 rounded leading-none pointer-events-none">
                      {s.width}×{s.height}
                    </span>
                  )}
                  {/* 8 resize handles — only on selected slot */}
                  {isSel && resizeHandles.map((h) => (
                    <div
                      key={h.id}
                      className="absolute w-2.5 h-2.5 bg-black border border-white rounded-sm z-30"
                      style={{ ...h.style }}
                      onMouseDown={(e) => onMouseDownResize(e, i, h.id)}
                    />
                  ))}
                </div>
              );
            })}
            {/* Overlay preview — sama persis dengan ctx.drawImage(overlay,0,0,2400,3600) di print4r.ts
                Ditampilkan di atas slot boxes sehingga user bisa align slot dengan frame overlay */}
            {overlayUrl && (
              <img
                src={overlayUrl}
                alt="overlay preview"
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ zIndex: 22, objectFit: "fill" }}
                draggable={false}
              />
            )}
          </div>
        </div>

        {/* Slot detail panel */}
        <div className="flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: EDITOR_H }}>
          <p className="text-[11px] font-bold text-gray-500 uppercase mb-2">
            Detail Slot (koordinat print canvas)
          </p>
          {slots.length === 0 && (
            <p className="text-gray-400 text-sm italic mt-4">
              Klik &quot;+ Tambah Slot&quot; untuk mulai.
            </p>
          )}
          {slots.map((s, i) => (
            <div
              key={i}
              className={`border-2 rounded-xl p-3 mb-2 cursor-pointer transition-colors ${
                selectedSlot === i
                  ? "border-black bg-blue-50"
                  : "border-gray-300 bg-white hover:border-gray-600"
              }`}
              onClick={() => setSelectedSlot(i)}
            >
              <div className="flex justify-between items-center mb-2.5">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  <span
                    className={`text-white text-xs px-1.5 py-0.5 rounded font-bold ${
                      selectedSlot === i ? "bg-black" : "bg-blue-600"
                    }`}
                  >
                    {s.slotNumber}
                  </span>
                  Slot {s.slotNumber}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeSlot(i); }}
                  className="text-red-500 text-xs font-bold hover:underline"
                >
                  Hapus
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { field: "x",        label: "X (kiri)",    min: 0,            max: PRINT_W },
                    { field: "y",        label: "Y (atas)",    min: 0,            max: PRINT_H },
                    { field: "width",    label: "Lebar (W)",   min: MIN_SLOT_SIZE, max: PRINT_W },
                    { field: "height",   label: "Tinggi (H)",  min: MIN_SLOT_SIZE, max: PRINT_H },
                    { field: "rotation", label: "Rotasi (°)",  min: -360,         max: 360 },
                  ] as const
                ).map(({ field, label, min, max }) => (
                  <label key={field} className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">
                      {label}
                    </span>
                    <input
                      type="number"
                      value={s[field]}
                      min={min}
                      max={max}
                      step={snapEnabled && field !== "rotation" ? SNAP_GRID : 1}
                      onChange={(e) => updateField(i, field, Number(e.target.value))}
                      className="border-2 border-black rounded-lg px-2 py-1 text-xs font-mono w-full outline-none focus:ring-2 focus:ring-black"
                    />
                  </label>
                ))}
              </div>

              {/* Quick size presets */}
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-[10px] text-gray-400 font-medium self-center mr-0.5">Preset W×H:</span>
                {([
                  { label: "Full", w: 2400, h: 3600 },
                  { label: "½ H", w: 2400, h: 1800 },
                  { label: "Square", w: 1200, h: 1200 },
                  { label: "4:3", w: 1600, h: 1200 },
                ] as const).map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(slots.map((sl, idx) => idx === i ? { ...sl, width: p.w, height: p.h } : sl));
                    }}
                    className="text-[10px] px-1.5 py-0.5 border border-gray-400 rounded hover:border-black hover:bg-gray-100 transition-colors font-medium"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Template Form Dialog ─────────────────────────────────────
function TemplateFormDialog({
  open,
  onClose,
  categories,
  editTemplate,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  categories: TemplateCategory[];
  editTemplate: TemplateEntry | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TemplateFormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    if (editTemplate) {
      setForm({
        name: editTemplate.name,
        category:
          categories.find((c) =>
            c.id
          )?.id || "basic",
        newCategoryName: "",
        newCategoryId: "",
        layout: editTemplate.layout,
        slots: editTemplate.slots || [],
        backgroundFile: null,
        overlayFile: null,
        previewFile: null,
      });
    } else {
      setForm(defaultForm());
    }
  }, [editTemplate, open]);

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Nama template wajib diisi");
    setSaving(true);
    try {
      if (creatingCategory && form.newCategoryId && form.newCategoryName) {
        await fetch(`${API}/api/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: form.newCategoryId,
            name: form.newCategoryName,
            image: "",
          }),
        });
      }

      const category = creatingCategory ? form.newCategoryId : form.category;

      if (editTemplate) {
        await fetch(`${API}/api/templates/${editTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            layout: form.layout,
            slots: form.layout === "custom" ? form.slots : null,
          }),
        });
      } else {
        const res = await fetch(`${API}/api/templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            name: form.name.trim(),
            layout: form.layout,
            slots: form.layout === "custom" ? form.slots : null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Gagal membuat template");
          return;
        }
      }

      const templateName = editTemplate ? editTemplate.name : form.name.trim();
      const hasImages = form.backgroundFile || form.overlayFile || form.previewFile;
      if (hasImages) {
        const fd = new FormData();
        if (form.backgroundFile) fd.append("background", form.backgroundFile, "background.png");
        if (form.overlayFile) fd.append("overlay", form.overlayFile, "overlay.png");
        if (form.previewFile) fd.append("preview", form.previewFile, "preview.png");
        await fetch(`${API}/api/templates/${templateName}/images`, {
          method: "POST",
          body: fd,
        });
      }

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">
              {editTemplate ? "Edit Template" : "Tambah Template Baru"}
            </h2>
            <button
              onClick={onClose}
              className="text-3xl font-bold leading-none hover:opacity-70"
            >
              ✕
            </button>
          </div>

          <div className="space-y-5">
            {/* Name */}
            {!editTemplate && (
              <label className="block">
                <span className="text-base font-bold mb-2 block text-gray-700">
                  Nama Template *
                </span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="contoh: summer-vibes"
                  className="w-full border-4 border-black rounded-xl px-4 py-3 text-lg font-medium outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nama folder di /public/templates/ (tanpa spasi, gunakan tanda hubung)
                </p>
              </label>
            )}

            {/* Category */}
            {!editTemplate && (
              <div>
                <span className="text-base font-bold mb-2 block text-gray-700">
                  Kategori *
                </span>
                <div className="flex gap-3 items-center flex-wrap">
                  <select
                    value={creatingCategory ? "__new__" : form.category}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setCreatingCategory(true);
                      } else {
                        setCreatingCategory(false);
                        setForm({ ...form, category: e.target.value });
                      }
                    }}
                    className="border-4 border-black rounded-xl px-4 py-3 text-lg font-medium outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__new__">+ Buat Kategori Baru</option>
                  </select>
                </div>
                {creatingCategory && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="ID kategori (misal: vintage)"
                      value={form.newCategoryId}
                      onChange={(e) =>
                        setForm({ ...form, newCategoryId: e.target.value })
                      }
                      className="border-4 border-black rounded-xl px-4 py-3 text-lg font-medium outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Nama tampilan (misal: Vintage)"
                      value={form.newCategoryName}
                      onChange={(e) =>
                        setForm({ ...form, newCategoryName: e.target.value })
                      }
                      className="border-4 border-black rounded-xl px-4 py-3 text-lg font-medium outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Layout */}
            <label className="block">
              <span className="text-base font-bold mb-2 block text-gray-700">
                Layout *
              </span>
              <select
                value={form.layout}
                onChange={(e) =>
                  setForm({
                    ...form,
                    layout: e.target.value as LayoutType,
                    slots: e.target.value !== "custom" ? [] : form.slots,
                  })
                }
                className="w-full border-4 border-black rounded-xl px-4 py-3 text-lg font-medium outline-none"
              >
                {LAYOUT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Custom slot editor */}
            {form.layout === "custom" && (
              <div>
                <span className="text-base font-bold mb-3 block text-gray-700">
                  Atur Posisi & Ukuran Slot
                </span>
                <p className="text-xs text-gray-500 mb-3 -mt-2">
                  Drag slot untuk pindah · Tarik handle sudut/tepi untuk resize · Aktifkan Snap untuk grid 100px · Gunakan ↑↓←→ saat slot dipilih
                </p>
                <CustomSlotEditor
                  slots={form.slots}
                  onChange={(slots) => setForm({ ...form, slots })}
                  backgroundFile={form.backgroundFile}
                  overlayFile={form.overlayFile}
                />
              </div>
            )}

            {/* Image uploads */}
            <div>
              <span className="text-base font-bold mb-3 block text-gray-700">
                Upload Gambar Template
              </span>
              <div className="grid grid-cols-3 gap-4">
                {(
                  [
                    { key: "backgroundFile", label: "Background *", hint: "background.png" },
                    { key: "overlayFile", label: "Overlay (opsional)", hint: "overlay.png" },
                    { key: "previewFile", label: "Preview (opsional)", hint: "preview.png" },
                  ] as const
                ).map(({ key, label, hint }) => (
                  <label key={key} className="block">
                    <span className="text-sm font-bold mb-1 block text-gray-600">
                      {label}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.files?.[0] || null })
                      }
                      className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">{hint}</p>
                    {form[key] && (
                      <p className="text-xs text-green-600 font-bold mt-1">
                        ✓ {(form[key] as File).name}
                      </p>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-8">
            <BrutalistButton
              onClick={handleSave}
              disabled={saving}
              size="md"
              className="flex-1"
            >
              {saving ? "Menyimpan..." : editTemplate ? "Update Template" : "Simpan Template"}
            </BrutalistButton>
            <BrutalistButton
              onClick={onClose}
              size="md"
              variant="outline"
            >
              Batal
            </BrutalistButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export function AdminTemplatePage() {
  const [data, setData] = useState<TemplatesData | null>(null);
  const [activeCategory, setActiveCategory] = useState("basic");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<TemplateEntry | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TemplateEntry | null>(null);

  const fetchData = () => {
    fetch(`${API}/api/templates`)
      .then((r) => r.json())
      .then((d: TemplatesData) => {
        setData(d);
        if (!d.templates[activeCategory] && d.categories.length > 0) {
          setActiveCategory(d.categories[0].id);
        }
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (tpl: TemplateEntry) => {
    await fetch(`${API}/api/templates/${tpl.id}?deleteFiles=false`, {
      method: "DELETE",
    });
    setDeleteConfirm(null);
    fetchData();
  };

  const currentTemplates = data?.templates[activeCategory] || [];
  const totalTemplates = data
    ? Object.values(data.templates).reduce((s, arr) => s + arr.length, 0)
    : 0;

  return (
    <AdminLayout>
      <div className="p-8">
        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black leading-tight">Template Manager</h1>
            <p className="text-gray-500 font-medium mt-1">
              Kelola semua layout template foto studio
            </p>
          </div>
          <button
            onClick={() => {
              setEditTemplate(null);
              setDialogOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-black text-white font-bold border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-base"
          >
            <Plus size={18} strokeWidth={2.5} />
            Tambah Template
          </button>
        </div>

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Template</p>
            <p className="text-3xl font-black">{totalTemplates}</p>
          </div>
          <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Kategori</p>
            <p className="text-3xl font-black">{data?.categories.length ?? 0}</p>
          </div>
          <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Custom Layout</p>
            <p className="text-3xl font-black">
              {data
                ? Object.values(data.templates)
                    .flat()
                    .filter((t) => t.layout === "custom").length
                : 0}
            </p>
          </div>
        </div>

        {/* ── Category Tabs ── */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {data?.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-5 py-2.5 font-bold border-2 border-black rounded-xl transition-all text-sm ${
                activeCategory === cat.id
                  ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                  : "bg-white text-black hover:bg-gray-50"
              }`}
            >
              <Layers size={14} strokeWidth={2.5} />
              {cat.name}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-md font-black ${
                  activeCategory === cat.id
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {data?.templates[cat.id]?.length ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* ── Template Grid ── */}
        {!data ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-lg font-bold text-gray-400">Memuat templates...</p>
            </div>
          </div>
        ) : currentTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border-4 border-dashed border-black rounded-2xl bg-white">
            <div className="w-16 h-16 bg-gray-100 border-4 border-black rounded-2xl flex items-center justify-center mb-4">
              <Layers size={28} strokeWidth={2} className="text-gray-400" />
            </div>
            <p className="text-xl font-bold text-gray-400 mb-2">Belum ada template</p>
            <p className="text-sm text-gray-400 mb-6">Tambahkan template pertama untuk kategori ini</p>
            <button
              onClick={() => {
                setEditTemplate(null);
                setDialogOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-3 bg-black text-white font-bold border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              <Plus size={18} strokeWidth={2.5} />
              Tambah Template Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
            {currentTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all group"
              >
                {/* Preview image */}
                <div className="aspect-[2/3] bg-gray-100 border-b-4 border-black overflow-hidden relative">
                  <ImageWithFallback
                    src={tpl.previewTemplate}
                    alt={tpl.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Layout badge */}
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded-md uppercase tracking-wide">
                      {tpl.layout}
                    </span>
                  </div>
                  {/* Overlay indicator */}
                  {tpl.overlay && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[10px] font-black bg-white border-2 border-black text-black px-1.5 py-0.5 rounded-md">
                        OVL
                      </span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-3">
                  <p className="font-black text-sm truncate mb-0.5">{tpl.name}</p>
                  {tpl.slots ? (
                    <p className="text-xs text-blue-600 font-bold mb-3">
                      {tpl.slots.length} custom slot
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 font-medium mb-3">
                      Built-in layout
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setEditTemplate(tpl);
                        setDialogOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 border-2 border-black rounded-lg py-1.5 text-xs font-bold hover:bg-black hover:text-white transition-colors"
                    >
                      <Pencil size={11} strokeWidth={2.5} />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(tpl)}
                      className="flex-1 flex items-center justify-center gap-1 border-2 border-red-500 text-red-500 rounded-lg py-1.5 text-xs font-bold hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 size={11} strokeWidth={2.5} />
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add/Edit Dialog ── */}
      <TemplateFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditTemplate(null);
        }}
        categories={data?.categories || []}
        editTemplate={editTemplate}
        onSaved={fetchData}
      />

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-100 border-4 border-red-500 rounded-xl flex items-center justify-center mb-4">
              <Trash2 size={22} className="text-red-500" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black mb-2">Hapus Template?</h3>
            <p className="text-gray-600 mb-1">
              Template <strong>&ldquo;{deleteConfirm.name}&rdquo;</strong> akan dihapus dari daftar.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              File gambar di /public/templates/ tidak akan dihapus.
            </p>
            <div className="flex gap-3">
              <BrutalistButton
                size="md"
                className="flex-1 !bg-red-500 !border-red-700"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Ya, Hapus
              </BrutalistButton>
              <BrutalistButton
                size="md"
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
              >
                Batal
              </BrutalistButton>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
