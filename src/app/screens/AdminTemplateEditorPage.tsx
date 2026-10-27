import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowLeft,
  BringToFront,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Layers,
  Move,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Scissors,
  SendToBack,
  Trash2,
  Undo2,
  Upload,
  ZoomIn,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import type {
  CustomSlotDef,
  LayoutType,
  TemplateCategory,
  TemplateEntry,
  TemplatesData,
} from "../../types/template";

const API = "http://localhost:5000";

const LAYOUT_OPTIONS: {
  value: LayoutType;
  label: string;
  slots: number | "custom";
}[] = [
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

// Print canvas dimensions (4R @ 300 DPI)
const PRINT_W = 2400;
const PRINT_H = 3600;

// Editor canvas display dimensions (1:5 exact ratio)
const EDITOR_W = 480;
const EDITOR_H = 720;
const SCALE_X = EDITOR_W / PRINT_W; // 0.2 exact
const SCALE_Y = EDITOR_H / PRINT_H; // 0.2 exact
const SNAP_GRID = 100; // print units per grid cell
const MIN_SLOT_SIZE = 100; // minimum slot dimension in print units
const SAFE_PRINT_MARGIN = 60; // ~3mm bleed cut margin on 4R (60 print px)

const DUMMY_PHOTOS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&auto=format&fit=crop&q=80",
];

interface SlotEditorSlot extends CustomSlotDef {}

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
  startSlots?: { index: number; x: number; y: number; width: number; height: number }[];
  snapshotBeforeDrag?: SlotEditorSlot[];
  hasMoved?: boolean;
  didToggleShift?: boolean;
};

export function AdminTemplateEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("basic");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [layout, setLayout] = useState<LayoutType>("4");
  const [slots, setSlots] = useState<SlotEditorSlot[]>([]);

  // Files & Preview URLs
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [overlayFile, setOverlayFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const [existingBgUrl, setExistingBgUrl] = useState<string | null>(null);
  const [existingOverlayUrl, setExistingOverlayUrl] = useState<string | null>(
    null,
  );

  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);
  const [overlayPreviewUrl, setOverlayPreviewUrl] = useState<string | null>(
    null,
  );

  // Slot editor states
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [smartGuidesEnabled, setSmartGuidesEnabled] = useState(true);
  const [activeGuides, setActiveGuides] = useState<{ type: "v" | "h"; pos: number }[]>([]);
  const [activeGaps, setActiveGaps] = useState<{
    axis: "v" | "h";
    from: number;
    to: number;
    gap: number;
    crossCenter: number;
    crossSpan: number;
  }[]>([]);
  const smartGuidesEnabledRef = useRef(smartGuidesEnabled);
  smartGuidesEnabledRef.current = smartGuidesEnabled;

  // Visual simulation & safe margin states (Opsi 1 & Opsi 2)
  const [showDummyPhotos, setShowDummyPhotos] = useState(false);
  const [showSafeMargin, setShowSafeMargin] = useState(true);

  // Undo / Redo history
  const [past, setPast] = useState<SlotEditorSlot[][]>([]);
  const [future, setFuture] = useState<SlotEditorSlot[][]>([]);
  const pastRef = useRef<SlotEditorSlot[][]>([]);
  pastRef.current = past;
  const futureRef = useRef<SlotEditorSlot[][]>([]);
  futureRef.current = future;

  // Figma-like shortcuts & clipboard state
  const clipboardRef = useRef<SlotEditorSlot[] | null>(null);
  const [shortcutNotice, setShortcutNotice] = useState<string | null>(null);
  const noticeTimeoutRef = useRef<any>(null);

  const showNotice = (text: string) => {
    setShortcutNotice(text);
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => {
      setShortcutNotice(null);
    }, 1500);
  };

  // Push snapshot helper for undo
  const pushSnapshot = (snapshotToSave?: SlotEditorSlot[]) => {
    const snapState = snapshotToSave || slotsRef.current;
    const cloned = snapState.map((s) => ({ ...s }));
    setPast((p) => [...p.slice(-29), cloned]);
    setFuture([]); // Clear redo on new action
  };

  // Undo action
  const undo = () => {
    const curPast = pastRef.current;
    if (curPast.length === 0) return;
    const previous = curPast[curPast.length - 1];
    const newPast = curPast.slice(0, -1);
    setFuture((f) => [slotsRef.current.map((s) => ({ ...s })), ...f]);
    setPast(newPast);
    setSlots(previous.map((s) => ({ ...s })));
    setSelectedSlots((prev) => prev.filter((i) => i < previous.length));
    showNotice("↩ Undo (Ctrl+Z)");
  };

  // Redo action
  const redo = () => {
    const curFuture = futureRef.current;
    if (curFuture.length === 0) return;
    const next = curFuture[0];
    const newFuture = curFuture.slice(1);
    setPast((p) => [...p.slice(-29), slotsRef.current.map((s) => ({ ...s }))]);
    setFuture(newFuture);
    setSlots(next.map((s) => ({ ...s })));
    setSelectedSlots((prev) => prev.filter((i) => i < next.length));
    showNotice("↪ Redo (Ctrl+Y)");
  };

  // Sync refs for window keydown listener
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const selectedSlotsRef = useRef(selectedSlots);
  selectedSlotsRef.current = selectedSlots;
  const snapEnabledRef = useRef(snapEnabled);
  snapEnabledRef.current = snapEnabled;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  // Load existing data or categories
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/templates`);
        if (!res.ok) throw new Error("Gagal mengambil template");
        const data: TemplatesData = await res.json();

        if (!isMounted) return;
        setCategories(data.categories || []);

        if (id) {
          // Find template by numeric id or name
          let found: TemplateEntry | null = null;
          let foundCat = "basic";

          for (const [catKey, tpls] of Object.entries(data.templates)) {
            const match = tpls.find(
              (t) => String(t.id) === String(id) || t.name === id,
            );
            if (match) {
              found = match;
              foundCat = catKey;
              break;
            }
          }

          if (found) {
            setName(found.name);
            setCategory(foundCat);
            setLayout(found.layout);
            setSlots(found.slots || []);
            setExistingBgUrl(
              found.previewTemplate ||
                `/templates/${found.name}/background.png`,
            );
            if (found.overlay) {
              setExistingOverlayUrl(found.overlay);
            }
          } else {
            alert(`Template dengan ID "${id}" tidak ditemukan.`);
            navigate("/admin/templates");
          }
        } else {
          if (data.categories?.length > 0) {
            setCategory(data.categories[0].id);
          }
        }
      } catch (err: any) {
        console.error(err);
        alert(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  // Object URLs for local background and overlay files
  useEffect(() => {
    if (backgroundFile) {
      const url = URL.createObjectURL(backgroundFile);
      setBgPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setBgPreviewUrl(existingBgUrl);
    }
  }, [backgroundFile, existingBgUrl]);

  useEffect(() => {
    if (overlayFile) {
      const url = URL.createObjectURL(overlayFile);
      setOverlayPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setOverlayPreviewUrl(existingOverlayUrl);
    }
  }, [overlayFile, existingOverlayUrl]);

  // Snap helper
  const snap = (v: number) =>
    snapEnabled ? Math.round(v / SNAP_GRID) * SNAP_GRID : Math.round(v);

  // Slot management
  const addSlot = () => {
    pushSnapshot();
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
      borderRadius: 0,
    };
    const updated = [...slots, newSlot];
    setSlots(updated);
    setSelectedSlots([updated.length - 1]);
    showNotice(`✓ Slot ${next} ditambahkan`);
  };

  const duplicateSlot = (index: number) => {
    pushSnapshot();
    const s = slots[index];
    const next = slots.length + 1;

    // Smart Figma-style duplicate: preserve same X and detect consistent gap from above
    let targetX = s.x;
    let targetY = s.y + s.height + 60; // default 60px gap directly below

    // Look for a preceding slot in the same column to infer the exact gap
    const columnSlots = slots
      .filter((other, idx) => idx !== index && Math.abs(other.x - s.x) < 40)
      .sort((a, b) => a.y - b.y);

    if (columnSlots.length > 0) {
      const prev = columnSlots.filter((o) => o.y + o.height <= s.y).pop();
      if (prev) {
        const detectedGap = s.y - (prev.y + prev.height);
        if (detectedGap >= 0) {
          targetY = s.y + s.height + detectedGap;
        }
      }
    }

    // If targetY exceeds canvas bottom, wrap to next column or safe offset
    if (targetY + s.height > PRINT_H) {
      if (s.x + s.width * 2 + 60 <= PRINT_W) {
        targetX = s.x + s.width + 60;
        targetY = s.y;
      } else {
        targetX = Math.min(PRINT_W - s.width, s.x + 80);
        targetY = Math.min(PRINT_H - s.height, s.y + 80);
      }
    }

    const newSlot: SlotEditorSlot = {
      ...s,
      slotNumber: next,
      x: targetX,
      y: targetY,
    };
    const updated = [...slots, newSlot];
    setSlots(updated);
    setSelectedSlots([updated.length - 1]);
    showNotice(`✓ Slot ${next} diduplikat rapi ke bawah`);
  };

  const duplicateSelected = () => {
    const currentSel = selectedSlotsRef.current;
    if (currentSel.length === 0) return;
    pushSnapshot();
    const targets = currentSel.map((i) => slotsRef.current[i]).filter(Boolean);

    // If duplicating a group of slots, check if we can stack them cleanly below
    const maxY = Math.max(...targets.map((s) => s.y + s.height));
    const minY = Math.min(...targets.map((s) => s.y));
    const groupHeight = maxY - minY;

    let offsetY = groupHeight + 60;
    let offsetX = 0;
    if (maxY + offsetY > PRINT_H) {
      offsetX = 80;
      offsetY = 80;
    }

    const newSlots: SlotEditorSlot[] = targets.map((s, idx) => ({
      ...s,
      slotNumber: slotsRef.current.length + idx + 1,
      x: Math.min(PRINT_W - s.width, Math.max(0, s.x + offsetX)),
      y: Math.min(PRINT_H - s.height, Math.max(0, s.y + offsetY)),
    }));
    const updated = [...slotsRef.current, ...newSlots];
    setSlots(updated);
    const newIndices = newSlots.map((_, idx) => slotsRef.current.length + idx);
    setSelectedSlots(newIndices);
    clipboardRef.current = newSlots;
    showNotice(`✓ ${newSlots.length} slot diduplikat (Ctrl+D)`);
  };

  const removeSlot = (index: number) => {
    pushSnapshot();
    const updated = slots
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, slotNumber: i + 1 }));
    setSlots(updated);
    setSelectedSlots((prev) =>
      prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)),
    );
    showNotice(`🗑 Slot dihapus`);
  };

  const deleteSelected = () => {
    const currentSel = selectedSlotsRef.current;
    if (currentSel.length === 0) return;
    pushSnapshot();
    const count = currentSel.length;
    const updated = slotsRef.current
      .filter((_, i) => !currentSel.includes(i))
      .map((s, i) => ({ ...s, slotNumber: i + 1 }));
    setSlots(updated);
    setSelectedSlots([]);
    showNotice(`🗑 ${count} slot dihapus`);
  };

  // ── LAYER STACKING ORDER CONTROLS (Z-INDEX) ──
  const bringForward = (index?: number) => {
    const curSlots = slotsRef.current;
    const curSel = selectedSlotsRef.current;
    const targetIdx = index !== undefined ? index : curSel.length === 1 ? curSel[0] : -1;
    if (targetIdx < 0 || targetIdx >= curSlots.length - 1) return;
    pushSnapshot();
    const updated = [...curSlots];
    const temp = updated[targetIdx];
    updated[targetIdx] = updated[targetIdx + 1];
    updated[targetIdx + 1] = temp;
    setSlots(updated);
    setSelectedSlots([targetIdx + 1]);
    showNotice(`▲ Slot ${temp.slotNumber} naik 1 layer`);
  };

  const sendBackward = (index?: number) => {
    const curSlots = slotsRef.current;
    const curSel = selectedSlotsRef.current;
    const targetIdx = index !== undefined ? index : curSel.length === 1 ? curSel[0] : -1;
    if (targetIdx <= 0) return;
    pushSnapshot();
    const updated = [...curSlots];
    const temp = updated[targetIdx];
    updated[targetIdx] = updated[targetIdx - 1];
    updated[targetIdx - 1] = temp;
    setSlots(updated);
    setSelectedSlots([targetIdx - 1]);
    showNotice(`▼ Slot ${temp.slotNumber} turun 1 layer`);
  };

  const bringToFront = (index?: number) => {
    const curSlots = slotsRef.current;
    const curSel = selectedSlotsRef.current;
    const targetIdx = index !== undefined ? index : curSel.length === 1 ? curSel[0] : -1;
    if (targetIdx < 0 || targetIdx >= curSlots.length - 1) return;
    pushSnapshot();
    const updated = [...curSlots];
    const [target] = updated.splice(targetIdx, 1);
    updated.push(target);
    setSlots(updated);
    setSelectedSlots([updated.length - 1]);
    showNotice(`⏫ Slot ${target.slotNumber} dipindah ke paling depan`);
  };

  const sendToBack = (index?: number) => {
    const curSlots = slotsRef.current;
    const curSel = selectedSlotsRef.current;
    const targetIdx = index !== undefined ? index : curSel.length === 1 ? curSel[0] : -1;
    if (targetIdx <= 0) return;
    pushSnapshot();
    const updated = [...curSlots];
    const [target] = updated.splice(targetIdx, 1);
    updated.unshift(target);
    setSlots(updated);
    setSelectedSlots([0]);
    showNotice(`⏬ Slot ${target.slotNumber} dipindah ke paling belakang`);
  };

  type AlignmentType =
    | "left"
    | "h-center"
    | "right"
    | "top"
    | "v-center"
    | "bottom"
    | "distribute-h"
    | "distribute-v";

  const alignSelected = (type: AlignmentType) => {
    const currentSel = selectedSlotsRef.current;
    if (currentSel.length === 0) return;
    const currentSlots = slotsRef.current;
    const targets = currentSel
      .map((i) => ({ index: i, slot: currentSlots[i] }))
      .filter((t) => t.slot);
    if (targets.length === 0) return;

    pushSnapshot();
    const updated = [...currentSlots];

    if (targets.length === 1) {
      // Single slot: align relative to 4R canvas
      const { index, slot } = targets[0];
      let newX = slot.x;
      let newY = slot.y;

      if (type === "left") newX = 0;
      if (type === "h-center") newX = Math.round((PRINT_W - slot.width) / 2);
      if (type === "right") newX = PRINT_W - slot.width;
      if (type === "top") newY = 0;
      if (type === "v-center") newY = Math.round((PRINT_H - slot.height) / 2);
      if (type === "bottom") newY = PRINT_H - slot.height;

      if (snapEnabledRef.current) {
        newX = snap(newX);
        newY = snap(newY);
      }

      updated[index] = { ...slot, x: newX, y: newY };
      setSlots(updated);
      showNotice(`✓ Slot ${slot.slotNumber} diratakan ke kanvas`);
      return;
    }

    // Multiple slots: align relative to selection bounding box
    const minX = Math.min(...targets.map((t) => t.slot.x));
    const maxX = Math.max(...targets.map((t) => t.slot.x + t.slot.width));
    const minY = Math.min(...targets.map((t) => t.slot.y));
    const maxY = Math.max(...targets.map((t) => t.slot.y + t.slot.height));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    if (type === "left") {
      targets.forEach(({ index, slot }) => {
        updated[index] = { ...slot, x: minX };
      });
      showNotice("✓ Rata Kiri");
    } else if (type === "h-center") {
      targets.forEach(({ index, slot }) => {
        const newX = Math.round(centerX - slot.width / 2);
        updated[index] = {
          ...slot,
          x: snapEnabledRef.current ? snap(newX) : newX,
        };
      });
      showNotice("✓ Rata Tengah Horizontal");
    } else if (type === "right") {
      targets.forEach(({ index, slot }) => {
        const newX = maxX - slot.width;
        updated[index] = { ...slot, x: newX };
      });
      showNotice("✓ Rata Kanan");
    } else if (type === "top") {
      targets.forEach(({ index, slot }) => {
        updated[index] = { ...slot, y: minY };
      });
      showNotice("✓ Rata Atas");
    } else if (type === "v-center") {
      targets.forEach(({ index, slot }) => {
        const newY = Math.round(centerY - slot.height / 2);
        updated[index] = {
          ...slot,
          y: snapEnabledRef.current ? snap(newY) : newY,
        };
      });
      showNotice("✓ Rata Tengah Vertikal");
    } else if (type === "bottom") {
      targets.forEach(({ index, slot }) => {
        const newY = maxY - slot.height;
        updated[index] = { ...slot, y: newY };
      });
      showNotice("✓ Rata Bawah");
    } else if (type === "distribute-h") {
      if (targets.length >= 3) {
        const sorted = [...targets].sort((a, b) => a.slot.x - b.slot.x);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const span = last.slot.x - (first.slot.x + first.slot.width);
        const gap = span / (sorted.length - 1);

        let currX = first.slot.x + first.slot.width + gap;
        for (let i = 1; i < sorted.length - 1; i++) {
          const t = sorted[i];
          const newX = Math.round(currX);
          updated[t.index] = {
            ...t.slot,
            x: snapEnabledRef.current ? snap(newX) : newX,
          };
          currX += t.slot.width + gap;
        }
        showNotice("✓ Distribusi Rata Horizontal");
      }
    } else if (type === "distribute-v") {
      if (targets.length >= 3) {
        const sorted = [...targets].sort((a, b) => a.slot.y - b.slot.y);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const span = last.slot.y - (first.slot.y + first.slot.height);
        const gap = span / (sorted.length - 1);

        let currY = first.slot.y + first.slot.height + gap;
        for (let i = 1; i < sorted.length - 1; i++) {
          const t = sorted[i];
          const newY = Math.round(currY);
          updated[t.index] = {
            ...t.slot,
            y: snapEnabledRef.current ? snap(newY) : newY,
          };
          currY += t.slot.height + gap;
        }
        showNotice("✓ Distribusi Rata Vertikal");
      }
    }

    setSlots(updated);
  };

  const updateField = (
    index: number,
    field: keyof SlotEditorSlot,
    rawValue: number,
  ) => {
    pushSnapshot();
    setSlots(
      slots.map((s, i) => {
        if (i !== index) return s;
        let v = Math.round(rawValue);
        if (field === "x") v = Math.max(0, Math.min(PRINT_W - s.width, v));
        if (field === "y") v = Math.max(0, Math.min(PRINT_H - s.height, v));
        if (field === "width")
          v = Math.max(MIN_SLOT_SIZE, Math.min(PRINT_W - s.x, v));
        if (field === "height")
          v = Math.max(MIN_SLOT_SIZE, Math.min(PRINT_H - s.y, v));
        if (field === "borderRadius")
          v = Math.max(
            0,
            Math.min(Math.floor(Math.min(s.width, s.height) / 2), v),
          );
        return { ...s, [field]: v };
      }),
    );
  };

  // Mouse drag & resize
  const onMouseDownMove = (e: React.MouseEvent, index: number) => {
    // Only accept left-click (button === 0)
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const currentSlots = slotsRef.current;
    let currentSel = selectedSlotsRef.current;
    let didToggleShift = false;

    if (e.shiftKey) {
      // Shift + Left Click: toggle this slot
      currentSel = currentSel.includes(index)
        ? currentSel.filter((idx) => idx !== index)
        : [...currentSel, index];
      setSelectedSlots(currentSel);
      didToggleShift = true;
    } else {
      // Normal Left Click:
      if (!currentSel.includes(index)) {
        // If clicking an unselected slot, select only this one
        currentSel = [index];
        setSelectedSlots([index]);
      }
      // If clicking an already selected slot in multi-selection, retain group for potential dragging
    }

    const startSlots = currentSel.map((idx) => ({
      index: idx,
      x: currentSlots[idx].x,
      y: currentSlots[idx].y,
      width: currentSlots[idx].width,
      height: currentSlots[idx].height,
    }));

    dragRef.current = {
      type: "move",
      slotIndex: index,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: currentSlots[index].x,
      startY: currentSlots[index].y,
      startW: currentSlots[index].width,
      startH: currentSlots[index].height,
      startSlots,
      snapshotBeforeDrag: currentSlots.map((s) => ({ ...s })),
      hasMoved: false,
      didToggleShift,
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onMouseDownResize = (
    e: React.MouseEvent,
    index: number,
    handle: ResizeHandle,
  ) => {
    // Only accept left-click (button === 0)
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedSlots([index]);
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
      snapshotBeforeDrag: slots.map((item) => ({ ...item })),
      hasMoved: false,
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    let dx = (e.clientX - d.startMouseX) / SCALE_X;
    let dy = (e.clientY - d.startMouseY) / SCALE_Y;

    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      d.hasMoved = true;
    }

    if (d.type === "move" && d.startSlots) {
      const currentGuides: { type: "v" | "h"; pos: number }[] = [];

      if (smartGuidesEnabledRef.current) {
        const SNAP_THRESHOLD = 30; // 30 print px (6px on screen)
        const primaryStart =
          d.startSlots.find((item) => item.index === d.slotIndex) ||
          d.startSlots[0];
        const primaryW = primaryStart.width;
        const primaryH = primaryStart.height;
        const currentTargetX = primaryStart.x + dx;
        const currentTargetY = primaryStart.y + dy;

        // Collect candidate guide lines from other non-dragged slots
        const otherSlots = slotsRef.current.filter(
          (_, idx) => !d.startSlots?.some((item) => item.index === idx),
        );

        const candidateLinesX: number[] = [PRINT_W / 2];
        const candidateLinesY: number[] = [PRINT_H / 2];

        otherSlots.forEach((other) => {
          candidateLinesX.push(other.x);
          candidateLinesX.push(Math.round(other.x + other.width / 2));
          candidateLinesX.push(other.x + other.width);

          candidateLinesY.push(other.y);
          candidateLinesY.push(Math.round(other.y + other.height / 2));
          candidateLinesY.push(other.y + other.height);
        });

        // ── X Snapping (Left, Center, Right) ──
        let bestDiffX = Infinity;
        let snapAdjustmentX = 0;
        let bestLineX: number | null = null;

        const testPointsX = [
          { pos: currentTargetX },
          { pos: currentTargetX + primaryW / 2 },
          { pos: currentTargetX + primaryW },
        ];

        for (const line of candidateLinesX) {
          for (const tp of testPointsX) {
            const diff = line - tp.pos;
            if (
              Math.abs(diff) <= SNAP_THRESHOLD &&
              Math.abs(diff) < Math.abs(bestDiffX)
            ) {
              bestDiffX = diff;
              snapAdjustmentX = diff;
              bestLineX = line;
            }
          }
        }

        if (bestLineX !== null) {
          dx += snapAdjustmentX;
          currentGuides.push({ type: "v", pos: bestLineX });
        }

        // ── Y Snapping (Top, Center, Bottom) ──
        let bestDiffY = Infinity;
        let snapAdjustmentY = 0;
        let bestLineY: number | null = null;

        const testPointsY = [
          { pos: currentTargetY },
          { pos: currentTargetY + primaryH / 2 },
          { pos: currentTargetY + primaryH },
        ];

        for (const line of candidateLinesY) {
          for (const tp of testPointsY) {
            const diff = line - tp.pos;
            if (
              Math.abs(diff) <= SNAP_THRESHOLD &&
              Math.abs(diff) < Math.abs(bestDiffY)
            ) {
              bestDiffY = diff;
              snapAdjustmentY = diff;
              bestLineY = line;
            }
          }
        }

        if (bestLineY !== null) {
          dy += snapAdjustmentY;
          currentGuides.push({ type: "h", pos: bestLineY });
        }

        // ── Smart Equal Gap Snapping (Figma Distance & Equal Gap Snapping) ──
        const detectedGaps: {
          axis: "v" | "h";
          from: number;
          to: number;
          gap: number;
          crossCenter: number;
          crossSpan: number;
        }[] = [];

        // Check vertical gaps between pairs in otherSlots
        if (otherSlots.length >= 2) {
          for (let i = 0; i < otherSlots.length; i++) {
            for (let j = 0; j < otherSlots.length; j++) {
              if (i === j) continue;
              const A = otherSlots[i];
              const B = otherSlots[j];

              // Check if A is above B in same column
              if (A.y + A.height < B.y) {
                const overlapStart = Math.max(A.x, B.x);
                const overlapEnd = Math.min(A.x + A.width, B.x + B.width);
                if (overlapEnd - overlapStart > 40) {
                  const gapAB = B.y - (A.y + A.height);
                  if (gapAB >= 10 && gapAB <= 2000) {
                    const primaryCurrY = primaryStart.y + dy;
                    // Check if dragged slot is placed below B with matching gap
                    const targetYBelow = B.y + B.height + gapAB;
                    const diffBelow = targetYBelow - primaryCurrY;
                    if (Math.abs(diffBelow) <= SNAP_THRESHOLD) {
                      dy += diffBelow;
                      const span = Math.min(350, Math.max(80, overlapEnd - overlapStart));
                      const center = (overlapStart + overlapEnd) / 2;
                      detectedGaps.push({
                        axis: "v",
                        from: A.y + A.height,
                        to: B.y,
                        gap: Math.round(gapAB),
                        crossCenter: center,
                        crossSpan: span,
                      });
                      detectedGaps.push({
                        axis: "v",
                        from: B.y + B.height,
                        to: targetYBelow,
                        gap: Math.round(gapAB),
                        crossCenter: center,
                        crossSpan: span,
                      });
                    }

                    // Check if dragged slot is placed above A with matching gap
                    const targetYAbove = A.y - primaryH - gapAB;
                    const diffAbove = targetYAbove - primaryCurrY;
                    if (Math.abs(diffAbove) <= SNAP_THRESHOLD) {
                      dy += diffAbove;
                      const span = Math.min(350, Math.max(80, overlapEnd - overlapStart));
                      const center = (overlapStart + overlapEnd) / 2;
                      detectedGaps.push({
                        axis: "v",
                        from: targetYAbove + primaryH,
                        to: A.y,
                        gap: Math.round(gapAB),
                        crossCenter: center,
                        crossSpan: span,
                      });
                      detectedGaps.push({
                        axis: "v",
                        from: A.y + A.height,
                        to: B.y,
                        gap: Math.round(gapAB),
                        crossCenter: center,
                        crossSpan: span,
                      });
                    }
                  }
                }
              }

              // Check horizontal gaps (A is to left of B in same row)
              if (A.x + A.width < B.x) {
                const overlapStartY = Math.max(A.y, B.y);
                const overlapEndY = Math.min(A.y + A.height, B.y + B.height);
                if (overlapEndY - overlapStartY > 40) {
                  const gapAB = B.x - (A.x + A.width);
                  if (gapAB >= 10 && gapAB <= 2000) {
                    const primaryCurrX = primaryStart.x + dx;
                    const targetXRight = B.x + B.width + gapAB;
                    const diffRight = targetXRight - primaryCurrX;
                    if (Math.abs(diffRight) <= SNAP_THRESHOLD) {
                      dx += diffRight;
                      const span = Math.min(350, Math.max(80, overlapEndY - overlapStartY));
                      const center = (overlapStartY + overlapEndY) / 2;
                      detectedGaps.push({
                        axis: "h",
                        from: A.x + A.width,
                        to: B.x,
                        gap: Math.round(gapAB),
                        crossCenter: center,
                        crossSpan: span,
                      });
                      detectedGaps.push({
                        axis: "h",
                        from: B.x + B.width,
                        to: targetXRight,
                        gap: Math.round(gapAB),
                        crossCenter: center,
                        crossSpan: span,
                      });
                    }
                  }
                }
              }
            }
          }
        }

        setActiveGaps(detectedGaps);
      } else {
        setActiveGaps([]);
      }

      setActiveGuides(currentGuides);

      setSlots((prev) =>
        prev.map((s, i) => {
          const match = d.startSlots?.find((item) => item.index === i);
          if (!match) return s;
          let newX = Math.max(0, Math.min(PRINT_W - match.width, match.x + dx));
          let newY = Math.max(0, Math.min(PRINT_H - match.height, match.y + dy));
          if (snapEnabled && currentGuides.length === 0) {
            newX = snap(newX);
            newY = snap(newY);
          } else {
            newX = Math.round(newX);
            newY = Math.round(newY);
          }
          return { ...s, x: newX, y: newY };
        }),
      );
      return;
    }

    if (d.type === "resize") {
      setSlots((prev) =>
        prev.map((s, i) => {
          if (i !== d.slotIndex) return s;

          const h = d.handle!;
          const rightEdge = d.startX + d.startW;
          const bottomEdge = d.startY + d.startH;
          const isShift = e.shiftKey;
          const aspectRatio = d.startW / d.startH;

          let newX = d.startX;
          let newY = d.startY;
          let newW = d.startW;
          let newH = d.startH;

          if (isShift) {
            // ── PROPORTIONAL RESIZE (Figma-style Shift Key) ──
            if (h === "se") {
              const scaleW = (d.startW + dx) / d.startW;
              const scaleH = (d.startH + dy) / d.startH;
              const scale = Math.max(0.05, Math.abs(dx) > Math.abs(dy) ? scaleW : scaleH);
              newW = Math.round(d.startW * scale);
              newH = Math.round(d.startH * scale);

              if (newW < MIN_SLOT_SIZE || newH < MIN_SLOT_SIZE) {
                if (aspectRatio >= 1) {
                  newH = MIN_SLOT_SIZE;
                  newW = Math.round(MIN_SLOT_SIZE * aspectRatio);
                } else {
                  newW = MIN_SLOT_SIZE;
                  newH = Math.round(MIN_SLOT_SIZE / aspectRatio);
                }
              }

              if (d.startX + newW > PRINT_W) {
                newW = PRINT_W - d.startX;
                newH = Math.round(newW / aspectRatio);
              }
              if (d.startY + newH > PRINT_H) {
                newH = PRINT_H - d.startY;
                newW = Math.round(newH * aspectRatio);
              }

              newX = d.startX;
              newY = d.startY;
            } else if (h === "sw") {
              const scaleW = (d.startW - dx) / d.startW;
              const scaleH = (d.startH + dy) / d.startH;
              const scale = Math.max(0.05, Math.abs(dx) > Math.abs(dy) ? scaleW : scaleH);
              newW = Math.round(d.startW * scale);
              newH = Math.round(d.startH * scale);

              if (newW < MIN_SLOT_SIZE || newH < MIN_SLOT_SIZE) {
                if (aspectRatio >= 1) {
                  newH = MIN_SLOT_SIZE;
                  newW = Math.round(MIN_SLOT_SIZE * aspectRatio);
                } else {
                  newW = MIN_SLOT_SIZE;
                  newH = Math.round(MIN_SLOT_SIZE / aspectRatio);
                }
              }

              if (rightEdge - newW < 0) {
                newW = rightEdge;
                newH = Math.round(newW / aspectRatio);
              }
              if (d.startY + newH > PRINT_H) {
                newH = PRINT_H - d.startY;
                newW = Math.round(newH * aspectRatio);
              }

              newX = rightEdge - newW;
              newY = d.startY;
            } else if (h === "ne") {
              const scaleW = (d.startW + dx) / d.startW;
              const scaleH = (d.startH - dy) / d.startH;
              const scale = Math.max(0.05, Math.abs(dx) > Math.abs(dy) ? scaleW : scaleH);
              newW = Math.round(d.startW * scale);
              newH = Math.round(d.startH * scale);

              if (newW < MIN_SLOT_SIZE || newH < MIN_SLOT_SIZE) {
                if (aspectRatio >= 1) {
                  newH = MIN_SLOT_SIZE;
                  newW = Math.round(MIN_SLOT_SIZE * aspectRatio);
                } else {
                  newW = MIN_SLOT_SIZE;
                  newH = Math.round(MIN_SLOT_SIZE / aspectRatio);
                }
              }

              if (d.startX + newW > PRINT_W) {
                newW = PRINT_W - d.startX;
                newH = Math.round(newW / aspectRatio);
              }
              if (bottomEdge - newH < 0) {
                newH = bottomEdge;
                newW = Math.round(newH * aspectRatio);
              }

              newX = d.startX;
              newY = bottomEdge - newH;
            } else if (h === "nw") {
              const scaleW = (d.startW - dx) / d.startW;
              const scaleH = (d.startH - dy) / d.startH;
              const scale = Math.max(0.05, Math.abs(dx) > Math.abs(dy) ? scaleW : scaleH);
              newW = Math.round(d.startW * scale);
              newH = Math.round(d.startH * scale);

              if (newW < MIN_SLOT_SIZE || newH < MIN_SLOT_SIZE) {
                if (aspectRatio >= 1) {
                  newH = MIN_SLOT_SIZE;
                  newW = Math.round(MIN_SLOT_SIZE * aspectRatio);
                } else {
                  newW = MIN_SLOT_SIZE;
                  newH = Math.round(MIN_SLOT_SIZE / aspectRatio);
                }
              }

              if (rightEdge - newW < 0) {
                newW = rightEdge;
                newH = Math.round(newW / aspectRatio);
              }
              if (bottomEdge - newH < 0) {
                newH = bottomEdge;
                newW = Math.round(newH * aspectRatio);
              }

              newX = rightEdge - newW;
              newY = bottomEdge - newH;
            } else if (h === "e") {
              newW = Math.max(MIN_SLOT_SIZE, Math.min(PRINT_W - d.startX, d.startW + dx));
              newH = Math.round(newW / aspectRatio);
              newY = Math.max(0, Math.min(PRINT_H - newH, Math.round(d.startY + (d.startH - newH) / 2)));
              newX = d.startX;
            } else if (h === "w") {
              newW = Math.max(MIN_SLOT_SIZE, Math.min(rightEdge, d.startW - dx));
              newH = Math.round(newW / aspectRatio);
              newX = rightEdge - newW;
              newY = Math.max(0, Math.min(PRINT_H - newH, Math.round(d.startY + (d.startH - newH) / 2)));
            } else if (h === "s") {
              newH = Math.max(MIN_SLOT_SIZE, Math.min(PRINT_H - d.startY, d.startH + dy));
              newW = Math.round(newH * aspectRatio);
              newX = Math.max(0, Math.min(PRINT_W - newW, Math.round(d.startX + (d.startW - newW) / 2)));
              newY = d.startY;
            } else if (h === "n") {
              newH = Math.max(MIN_SLOT_SIZE, Math.min(bottomEdge, d.startH - dy));
              newW = Math.round(newH * aspectRatio);
              newY = bottomEdge - newH;
              newX = Math.max(0, Math.min(PRINT_W - newW, Math.round(d.startX + (d.startW - newW) / 2)));
            }
          } else {
            // ── UNCONSTRAINED RESIZE (Free aspect ratio) ──
            if (h.includes("e")) {
              newW = Math.max(MIN_SLOT_SIZE, d.startW + dx);
              newW = Math.min(newW, PRINT_W - d.startX);
              if (snapEnabled) {
                const snappedRight = snap(d.startX + newW);
                newW = Math.max(
                  MIN_SLOT_SIZE,
                  Math.min(PRINT_W - d.startX, snappedRight - d.startX),
                );
              }
            } else if (h.includes("w")) {
              const rawX = d.startX + dx;
              newX = Math.max(0, Math.min(rightEdge - MIN_SLOT_SIZE, rawX));
              if (snapEnabled)
                newX = Math.max(0, Math.min(rightEdge - MIN_SLOT_SIZE, snap(rawX)));
              newW = rightEdge - newX;
            }

            if (h.includes("s")) {
              newH = Math.max(MIN_SLOT_SIZE, d.startH + dy);
              newH = Math.min(newH, PRINT_H - d.startY);
              if (snapEnabled) {
                const snappedBottom = snap(d.startY + newH);
                newH = Math.max(
                  MIN_SLOT_SIZE,
                  Math.min(PRINT_H - d.startY, snappedBottom - d.startY),
                );
              }
            } else if (h.includes("n")) {
              const rawY = d.startY + dy;
              newY = Math.max(0, Math.min(bottomEdge - MIN_SLOT_SIZE, rawY));
              if (snapEnabled)
                newY = Math.max(
                  0,
                  Math.min(bottomEdge - MIN_SLOT_SIZE, snap(rawY)),
                );
              newH = bottomEdge - newY;
            }

            if (!snapEnabled) {
              newX = Math.round(newX);
              newY = Math.round(newY);
              if (h.includes("w")) newW = rightEdge - newX;
              else newW = Math.round(newW);
              if (h.includes("n")) newH = bottomEdge - newY;
              else newH = Math.round(newH);
            }
          }

          return { ...s, x: newX, y: newY, width: newW, height: newH };
        }),
      );
    }
  };

  const onMouseUp = () => {
    setActiveGuides([]);
    setActiveGaps([]);
    const d = dragRef.current;
    if (d) {
      if (d.hasMoved && d.snapshotBeforeDrag) {
        pushSnapshot(d.snapshotBeforeDrag);
      } else if (!d.hasMoved && !d.didToggleShift) {
        // User clicked an already selected slot without shift and without moving:
        // isolate selection to this single slot
        setSelectedSlots([d.slotIndex]);
      }
    }
    dragRef.current = null;
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  // Figma-like keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+C, Ctrl+V, Ctrl+D, Backspace/Del, Arrow keys, Esc)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // 1. Never intercept when user is typing inside an input, textarea, or select
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Only active if layout is custom
      if (layoutRef.current !== "custom") return;

      const currentSlots = slotsRef.current;
      const currentSel = selectedSlotsRef.current;
      const isSnap = snapEnabledRef.current;
      const isModifier = e.ctrlKey || e.metaKey;

      // ── UNDO: Ctrl + Z / Cmd + Z ──
      if (isModifier && (e.key === "z" || e.key === "Z") && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // ── REDO: Ctrl + Y / Cmd + Y or Ctrl + Shift + Z ──
      if (
        (isModifier && (e.key === "y" || e.key === "Y")) ||
        (isModifier && e.shiftKey && (e.key === "z" || e.key === "Z"))
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // ── COPY: Ctrl + C / Cmd + C ──
      if (isModifier && (e.key === "c" || e.key === "C")) {
        if (currentSel.length > 0) {
          e.preventDefault();
          const targets = currentSel
            .map((i) => currentSlots[i])
            .filter(Boolean);
          if (targets.length > 0) {
            clipboardRef.current = targets.map((s) => ({ ...s }));
            showNotice(`✓ ${targets.length} slot disalin (Ctrl+C)`);
          }
        }
        return;
      }

      // ── PASTE: Ctrl + V / Cmd + V ──
      if (isModifier && (e.key === "v" || e.key === "V")) {
        if (clipboardRef.current && clipboardRef.current.length > 0) {
          e.preventDefault();
          pushSnapshot();
          const clips = clipboardRef.current;
          const offset = isSnap ? SNAP_GRID : 80;

          const newSlots: SlotEditorSlot[] = clips.map((clip, idx) => ({
            ...clip,
            slotNumber: currentSlots.length + idx + 1,
            x: Math.min(PRINT_W - clip.width, Math.max(0, clip.x + offset)),
            y: Math.min(PRINT_H - clip.height, Math.max(0, clip.y + offset)),
          }));

          const updated = [...currentSlots, ...newSlots];
          setSlots(updated);

          const newIndices = newSlots.map(
            (_, idx) => currentSlots.length + idx,
          );
          setSelectedSlots(newIndices);
          clipboardRef.current = newSlots; // Cascade subsequent pastes
          showNotice(`✓ ${newSlots.length} slot ditempel (Ctrl+V)`);
        }
        return;
      }

      // ── DUPLICATE: Ctrl + D / Cmd + D ──
      if (isModifier && (e.key === "d" || e.key === "D")) {
        if (currentSel.length > 0) {
          e.preventDefault();
          duplicateSelected();
        }
        return;
      }

      // ── BRING FORWARD / BRING TO FRONT: Ctrl + ] / Ctrl + Shift + ] ──
      if (
        isModifier &&
        (e.key === "]" || e.key === "}" || e.code === "BracketRight")
      ) {
        if (currentSel.length === 1) {
          e.preventDefault();
          if (e.shiftKey) {
            bringToFront();
          } else {
            bringForward();
          }
        }
        return;
      }

      // ── SEND BACKWARD / SEND TO BACK: Ctrl + [ / Ctrl + Shift + [ ──
      if (
        isModifier &&
        (e.key === "[" || e.key === "{" || e.code === "BracketLeft")
      ) {
        if (currentSel.length === 1) {
          e.preventDefault();
          if (e.shiftKey) {
            sendToBack();
          } else {
            sendBackward();
          }
        }
        return;
      }

      // ── DELETE: Backspace or Delete ──
      if (e.key === "Backspace" || e.key === "Delete") {
        if (currentSel.length > 0) {
          e.preventDefault();
          deleteSelected();
        }
        return;
      }

      // ── DESELECT: Escape ──
      if (e.key === "Escape") {
        if (currentSel.length > 0) {
          e.preventDefault();
          setSelectedSlots([]);
        }
        return;
      }

      // ── NUDGE: Arrow keys ──
      if (
        currentSel.length > 0 &&
        (e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown")
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 100 : isSnap ? SNAP_GRID : 20;

        setSlots((prev) =>
          prev.map((s, i) => {
            if (!currentSel.includes(i)) return s;
            let { x, y } = s;

            if (e.key === "ArrowLeft") x = Math.max(0, x - step);
            if (e.key === "ArrowRight")
              x = Math.min(PRINT_W - s.width, x + step);
            if (e.key === "ArrowUp") y = Math.max(0, y - step);
            if (e.key === "ArrowDown")
              y = Math.min(PRINT_H - s.height, y + step);

            return { ...s, x, y };
          }),
        );
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    };
  }, []);

  const resizeHandles: { id: ResizeHandle; style: React.CSSProperties }[] = [
    { id: "nw", style: { top: -6, left: -6, cursor: "nw-resize" } },
    {
      id: "n",
      style: { top: -6, left: "calc(50% - 6px)", cursor: "n-resize" },
    },
    { id: "ne", style: { top: -6, right: -6, cursor: "ne-resize" } },
    {
      id: "w",
      style: { top: "calc(50% - 6px)", left: -6, cursor: "w-resize" },
    },
    {
      id: "e",
      style: { top: "calc(50% - 6px)", right: -6, cursor: "e-resize" },
    },
    { id: "sw", style: { bottom: -6, left: -6, cursor: "sw-resize" } },
    {
      id: "s",
      style: { bottom: -6, left: "calc(50% - 6px)", cursor: "s-resize" },
    },
    { id: "se", style: { bottom: -6, right: -6, cursor: "se-resize" } },
  ];

  const gridStep = SNAP_GRID * SCALE_X; // 20px in editor

  // Save template handler
  const handleSave = async () => {
    if (!name.trim()) return alert("Nama template wajib diisi");
    if (!isEdit && !backgroundFile) {
      return alert("File background wajib diupload untuk template baru.");
    }
    if (layout === "custom" && slots.length === 0) {
      if (
        !confirm(
          "Layout custom dipilih tapi belum ada slot yang ditambahkan. Tetap simpan?",
        )
      ) {
        return;
      }
    }

    setSaving(true);
    try {
      if (creatingCategory && newCategoryId && newCategoryName) {
        await fetch(`${API}/api/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: newCategoryId.trim(),
            name: newCategoryName.trim(),
            image: "",
          }),
        });
      }

      const selectedCategory = creatingCategory
        ? newCategoryId.trim()
        : category;

      if (isEdit && id) {
        await fetch(`${API}/api/templates/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            layout,
            slots: layout === "custom" ? slots : null,
          }),
        });
      } else {
        const res = await fetch(`${API}/api/templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: selectedCategory,
            name: name.trim(),
            layout,
            slots: layout === "custom" ? slots : null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "Gagal membuat template baru");
          return;
        }
      }

      // Upload files if any
      const hasImages = backgroundFile || overlayFile || previewFile;
      if (hasImages) {
        const fd = new FormData();
        if (backgroundFile)
          fd.append("background", backgroundFile, "background.png");
        if (overlayFile) fd.append("overlay", overlayFile, "overlay.png");
        if (previewFile) fd.append("preview", previewFile, "preview.png");

        await fetch(`${API}/api/templates/${name.trim()}/images`, {
          method: "POST",
          body: fd,
        });
      }

      navigate("/admin/templates");
    } catch (err: any) {
      console.error(err);
      alert("Gagal menyimpan template: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 text-center py-24">
          <RefreshCw
            size={32}
            className="animate-spin mx-auto text-black mb-3"
          />
          <p className="font-bold text-gray-600">
            Memuat data template editor...
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="w-full p-6 md:p-8 space-y-6 min-w-0">
        {/* ── TOP NAVIGATION & HEADER ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div>
            <button
              onClick={() => navigate("/admin/templates")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 rounded-lg font-medium text-xs bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors mb-2.5 cursor-pointer shadow-xs"
            >
              <ArrowLeft size={13} />
              <span>Kembali ke Daftar Template</span>
            </button>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-950 leading-tight">
              {isEdit ? `Edit Template: ${name}` : "Tambah Template Baru"}
            </h1>
            <p className="text-zinc-500 text-xs md:text-sm mt-0.5">
              {isEdit
                ? "Perbarui tata letak, koordinat custom slot, atau ganti file gambar template."
                : "Buat template foto baru lengkap dengan pengaturan layout bawaan atau custom slot."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => navigate("/admin/templates")}
              className="px-3.5 py-2 bg-white text-zinc-700 font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:text-zinc-950 transition-colors cursor-pointer text-xs shadow-xs"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 text-white font-medium rounded-lg hover:bg-black transition-colors text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>
                {saving
                  ? "Menyimpan..."
                  : isEdit
                    ? "Update Template"
                    : "Simpan Template"}
              </span>
            </button>
          </div>
        </div>

        {/* ── SECTION 1: INFORMASI TEMPLATE & GAMBAR ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card: Konfigurasi Dasar */}
          <div className="lg:col-span-6 bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-zinc-950 flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Layers size={16} />
              <span>Informasi & Pengaturan Layout</span>
            </h2>

            {/* Nama Template */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 block mb-1">
                Nama Template {!isEdit && "*"}
              </label>
              {isEdit ? (
                <div className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg font-mono font-medium text-xs text-zinc-800">
                  {name}
                </div>
              ) : (
                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                  }
                  placeholder="contoh: vintage-love, summer-vibe"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-medium outline-none bg-white focus:border-zinc-400 placeholder:text-zinc-400"
                />
              )}
              <p className="text-[11px] text-zinc-400 mt-1">
                Digunakan sebagai nama folder di server (huruf kecil & tanda
                hubung).
              </p>
            </div>

            {/* Kategori */}
            {!isEdit && (
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 block mb-1">
                  Kategori Template *
                </label>
                <select
                  value={creatingCategory ? "__new__" : category}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setCreatingCategory(true);
                    } else {
                      setCreatingCategory(false);
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs font-medium outline-none bg-white cursor-pointer focus:border-zinc-400"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id})
                    </option>
                  ))}
                  <option value="__new__">+ Buat Kategori Baru</option>
                </select>

                {creatingCategory && (
                  <div className="mt-2.5 grid grid-cols-2 gap-2.5 p-3 bg-zinc-50 border border-dashed border-zinc-300 rounded-lg">
                    <div>
                      <span className="text-[10px] font-medium text-zinc-400 uppercase">
                        ID Kategori
                      </span>
                      <input
                        type="text"
                        placeholder="misal: graduation"
                        value={newCategoryId}
                        onChange={(e) =>
                          setNewCategoryId(
                            e.target.value.toLowerCase().replace(/\s+/g, "-"),
                          )
                        }
                        className="w-full border border-zinc-200 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white outline-none focus:border-zinc-400"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-zinc-400 uppercase">
                        Nama Tampilan
                      </span>
                      <input
                        type="text"
                        placeholder="misal: Graduation 2026"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full border border-zinc-200 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white outline-none focus:border-zinc-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tipe Layout */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 block mb-1">
                Tipe Layout Foto *
              </label>
              <select
                value={layout}
                onChange={(e) => {
                  const val = e.target.value as LayoutType;
                  setLayout(val);
                  if (val !== "custom") {
                    setSlots([]);
                  }
                }}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs font-medium outline-none bg-white cursor-pointer focus:border-zinc-400"
              >
                {LAYOUT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-400 mt-1">
                Pilih <strong>Custom (Atur Sendiri)</strong> untuk mengatur
                posisi, ukuran, dan jumlah slot foto secara bebas.
              </p>
            </div>
          </div>

          {/* Card: Upload Gambar */}
          <div className="lg:col-span-6 bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-zinc-950 flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Upload size={16} />
              <span>File Gambar Template (4R - 2400×3600px)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Background */}
              <div className="border border-zinc-200 rounded-xl p-3 bg-zinc-50/50 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-medium text-zinc-900 block mb-0.5">
                    Background {!isEdit && "*"}
                  </span>
                  <p className="text-[10px] text-zinc-400 mb-2">
                    background.png
                  </p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) =>
                      setBackgroundFile(e.target.files?.[0] || null)
                    }
                    className="text-[11px] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border file:border-zinc-200 file:text-[10px] file:font-medium file:bg-white file:text-zinc-700 hover:file:bg-zinc-50 cursor-pointer w-full text-zinc-500"
                  />
                </div>
                {backgroundFile ? (
                  <p className="text-[10px] text-emerald-700 font-medium mt-2 truncate flex items-center gap-1">
                    <Check size={11} strokeWidth={2.5} /> {backgroundFile.name}
                  </p>
                ) : existingBgUrl ? (
                  <p className="text-[10px] text-blue-700 font-medium mt-2 truncate">
                    ✓ File tersedia di server
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-400 mt-2 italic">
                    Belum ada file
                  </p>
                )}
              </div>

              {/* Overlay */}
              <div className="border border-zinc-200 rounded-xl p-3 bg-zinc-50/50 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-medium text-zinc-900 block mb-0.5">
                    Overlay (Opsional)
                  </span>
                  <p className="text-[10px] text-zinc-400 mb-2">
                    overlay.png (transparan)
                  </p>
                  <input
                    type="file"
                    accept="image/png,image/webp"
                    onChange={(e) =>
                      setOverlayFile(e.target.files?.[0] || null)
                    }
                    className="text-[11px] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border file:border-zinc-200 file:text-[10px] file:font-medium file:bg-white file:text-zinc-700 hover:file:bg-zinc-50 cursor-pointer w-full text-zinc-500"
                  />
                </div>
                {overlayFile ? (
                  <p className="text-[10px] text-emerald-700 font-medium mt-2 truncate flex items-center gap-1">
                    <Check size={11} strokeWidth={2.5} /> {overlayFile.name}
                  </p>
                ) : existingOverlayUrl ? (
                  <p className="text-[10px] text-blue-700 font-medium mt-2 truncate">
                    ✓ Overlay tersedia
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-400 mt-2 italic">
                    Tanpa overlay
                  </p>
                )}
              </div>

              {/* Preview */}
              <div className="border border-zinc-200 rounded-xl p-3 bg-zinc-50/50 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-medium text-zinc-900 block mb-0.5">
                    Preview (Opsional)
                  </span>
                  <p className="text-[10px] text-zinc-400 mb-2">
                    preview.png thumbnail
                  </p>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) =>
                      setPreviewFile(e.target.files?.[0] || null)
                    }
                    className="text-[11px] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border file:border-zinc-200 file:text-[10px] file:font-medium file:bg-white file:text-zinc-700 hover:file:bg-zinc-50 cursor-pointer w-full text-zinc-500"
                  />
                </div>
                {previewFile ? (
                  <p className="text-[10px] text-emerald-700 font-medium mt-2 truncate flex items-center gap-1">
                    <Check size={11} strokeWidth={2.5} /> {previewFile.name}
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-400 mt-2 italic">
                    Otomatis dari background
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-zinc-500 font-normal bg-zinc-50 border border-zinc-200 p-2.5 rounded-lg">
              💡 <strong>Tips:</strong> Ukuran ideal gambar adalah{" "}
              <strong>2400 × 3600 pixel</strong> (proporsi 2:3 cetak foto 4R).
              Gambar background akan langsung tampil pada visual canvas di
              bawah.
            </p>
          </div>
        </div>

        {/* ── SECTION 2: CUSTOM SLOT STUDIO (FULL WIDTH & SPACIOUS) ── */}
        {layout === "custom" && (
          <div className="bg-white border border-zinc-200 rounded-xl p-5 md:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-zinc-100 gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-950 flex items-center gap-2">
                  <Move size={17} />
                  <span>Studio Custom Slot Foto</span>
                </h2>
                <p className="text-xs text-zinc-500 font-normal mt-0.5">
                  Atur posisi dan ukuran slot foto secara leluasa. Drag untuk
                  menggeser, tarik handle untuk mengubah ukuran.
                </p>
              </div>

              {/* Studio Toolbar */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Undo / Redo buttons */}
                <div className="flex items-center gap-0.5 border border-zinc-200 rounded-lg p-0.5 bg-white shadow-xs">
                  <button
                    type="button"
                    onClick={undo}
                    disabled={past.length === 0}
                    title="Undo (Ctrl+Z)"
                    className={`p-1.5 rounded-md transition-colors ${
                      past.length === 0
                        ? "opacity-30 cursor-not-allowed text-zinc-400"
                        : "hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer text-zinc-700"
                    }`}
                  >
                    <Undo2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={redo}
                    disabled={future.length === 0}
                    title="Redo (Ctrl+Y)"
                    className={`p-1.5 rounded-md transition-colors ${
                      future.length === 0
                        ? "opacity-30 cursor-not-allowed text-zinc-400"
                        : "hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer text-zinc-700"
                    }`}
                  >
                    <Redo2 size={14} />
                  </button>
                </div>

                {/* Figma-style Alignment Bar */}
                <div className="flex items-center gap-0.5 border border-zinc-200 rounded-lg p-0.5 bg-white shadow-xs">
                  <button
                    type="button"
                    onClick={() => alignSelected("left")}
                    disabled={selectedSlots.length === 0}
                    title={
                      selectedSlots.length > 1
                        ? "Rata Kiri (Align Left)"
                        : "Rata Kiri Kanvas"
                    }
                    className={`p-1.5 rounded-md transition-colors ${
                      selectedSlots.length === 0
                        ? "opacity-30 cursor-not-allowed text-zinc-400"
                        : "hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer text-zinc-700"
                    }`}
                  >
                    <AlignStartHorizontal size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelected("h-center")}
                    disabled={selectedSlots.length === 0}
                    title={
                      selectedSlots.length > 1
                        ? "Rata Tengah Horizontal (Align Horizontal Center)"
                        : "Rata Tengah Horizontal Kanvas"
                    }
                    className={`p-1.5 rounded-md transition-colors ${
                      selectedSlots.length === 0
                        ? "opacity-30 cursor-not-allowed text-zinc-400"
                        : "hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer text-zinc-700"
                    }`}
                  >
                    <AlignCenterHorizontal size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelected("right")}
                    disabled={selectedSlots.length === 0}
                    title={
                      selectedSlots.length > 1
                        ? "Rata Kanan (Align Right)"
                        : "Rata Kanan Kanvas"
                    }
                    className={`p-1.5 rounded-md transition-colors ${
                      selectedSlots.length === 0
                        ? "opacity-30 cursor-not-allowed text-zinc-400"
                        : "hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer text-zinc-700"
                    }`}
                  >
                    <AlignEndHorizontal size={14} />
                  </button>

                  <div className="w-[1px] h-3.5 bg-zinc-200 mx-0.5" />

                  <button
                    type="button"
                    onClick={() => alignSelected("top")}
                    disabled={selectedSlots.length === 0}
                    title={
                      selectedSlots.length > 1
                        ? "Rata Atas (Align Top)"
                        : "Rata Atas Kanvas"
                    }
                    className={`p-1.5 rounded-md transition-colors ${
                      selectedSlots.length === 0
                        ? "opacity-30 cursor-not-allowed text-zinc-400"
                        : "hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer text-zinc-700"
                    }`}
                  >
                    <AlignStartVertical size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelected("v-center")}
                    disabled={selectedSlots.length === 0}
                    title={
                      selectedSlots.length > 1
                        ? "Rata Tengah Vertikal (Align Vertical Center)"
                        : "Rata Tengah Vertikal Kanvas"
                    }
                    className={`p-1.5 rounded-md transition-colors ${
                      selectedSlots.length === 0
                        ? "opacity-30 cursor-not-allowed text-zinc-400"
                        : "hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer text-zinc-700"
                    }`}
                  >
                    <AlignCenterVertical size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => alignSelected("bottom")}
                    disabled={selectedSlots.length === 0}
                    title={
                      selectedSlots.length > 1
                        ? "Rata Bawah (Align Bottom)"
                        : "Rata Bawah Kanvas"
                    }
                    className={`p-1.5 rounded-md transition-colors ${
                      selectedSlots.length === 0
                        ? "opacity-30 cursor-not-allowed text-zinc-400"
                        : "hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer text-zinc-700"
                    }`}
                  >
                    <AlignEndVertical size={14} />
                  </button>

                  {selectedSlots.length >= 3 && (
                    <>
                      <div className="w-[1px] h-3.5 bg-zinc-200 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => alignSelected("distribute-h")}
                        title="Distribusi Rata Jarak Horizontal"
                        className="p-1.5 rounded-md transition-colors hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer text-zinc-700"
                      >
                        <AlignHorizontalDistributeCenter size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => alignSelected("distribute-v")}
                        title="Distribusi Rata Jarak Vertikal"
                        className="p-1.5 rounded-md transition-colors hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer text-zinc-700"
                      >
                        <AlignVerticalDistributeCenter size={14} />
                      </button>
                    </>
                  )}
                </div>

                {/* Layer Stacking Order Bar */}
                <div
                  className="flex items-center gap-0.5 border border-zinc-200 rounded-lg p-0.5 bg-white shadow-xs"
                  title="Urutan Tumpukan Layer Slot (Z-Index)"
                >
                  <button
                    type="button"
                    onClick={() => bringToFront()}
                    disabled={selectedSlots.length !== 1 || selectedSlots[0] === slots.length - 1}
                    title="Bawa ke Paling Depan (Ctrl+Shift+])"
                    className={`p-1.5 rounded-md transition-colors ${
                      selectedSlots.length !== 1 || selectedSlots[0] === slots.length - 1
                        ? "opacity-30 cursor-not-allowed text-zinc-400"
                        : "hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer text-zinc-700"
                    }`}
                  >
                    <BringToFront size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => bringForward()}
                    disabled={selectedSlots.length !== 1 || selectedSlots[0] === slots.length - 1}
                    title="Naik 1 Layer (Ctrl+])"
                    className={`p-1.5 rounded-md transition-colors ${
                      selectedSlots.length !== 1 || selectedSlots[0] === slots.length - 1
                        ? "opacity-30 cursor-not-allowed text-zinc-400"
                        : "hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer text-zinc-700"
                    }`}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => sendBackward()}
                    disabled={selectedSlots.length !== 1 || selectedSlots[0] === 0}
                    title="Turun 1 Layer (Ctrl+[)"
                    className={`p-1.5 rounded-md transition-colors ${
                      selectedSlots.length !== 1 || selectedSlots[0] === 0
                        ? "opacity-30 cursor-not-allowed text-zinc-400"
                        : "hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer text-zinc-700"
                    }`}
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => sendToBack()}
                    disabled={selectedSlots.length !== 1 || selectedSlots[0] === 0}
                    title="Kirim ke Paling Belakang (Ctrl+Shift+[)"
                    className={`p-1.5 rounded-md transition-colors ${
                      selectedSlots.length !== 1 || selectedSlots[0] === 0
                        ? "opacity-30 cursor-not-allowed text-zinc-400"
                        : "hover:bg-zinc-100 hover:text-zinc-950 cursor-pointer text-zinc-700"
                    }`}
                  >
                    <SendToBack size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={addSlot}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-black transition-colors shadow-xs cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Tambah Slot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSnapEnabled((v) => !v)}
                  className={`px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    snapEnabled
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  Snap: {snapEnabled ? "ON" : "OFF"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowGrid((v) => !v)}
                  className={`px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    showGrid
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  Grid: {showGrid ? "ON" : "OFF"}
                </button>

                <button
                  type="button"
                  onClick={() => setSmartGuidesEnabled((v) => !v)}
                  className={`px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    smartGuidesEnabled
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                  title="Garis pandu magnetik otomatis ala Figma untuk menempelkan slot lurus dengan slot lain"
                >
                  <span>🧲 Guides:</span>
                  <span>{smartGuidesEnabled ? "ON" : "OFF"}</span>
                </button>

                {/* Preview Foto Contoh Toggle (Opsi 1) */}
                <button
                  type="button"
                  onClick={() => setShowDummyPhotos((v) => !v)}
                  className={`px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    showDummyPhotos
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                  title="Tampilkan foto contoh manusia nyata pada setiap slot untuk simulasi hasil cetak sesungguhnya"
                >
                  {showDummyPhotos ? <Eye size={13} /> : <EyeOff size={13} />}
                  <span>Foto Contoh: {showDummyPhotos ? "ON" : "OFF"}</span>
                </button>

                {/* Garis Batas Aman Cetak Toggle (Opsi 2) */}
                <button
                  type="button"
                  onClick={() => setShowSafeMargin((v) => !v)}
                  className={`px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    showSafeMargin
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                  title="Tampilkan garis batas aman potong kertas foto 4R (~3mm / 60px)"
                >
                  <Scissors size={13} />
                  <span>Batas Potong: {showSafeMargin ? "ON" : "OFF"}</span>
                </button>
              </div>
            </div>

            {/* Keyboard Shortcuts Hint Bar */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-medium text-zinc-500 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg">
              <span className="text-zinc-800 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1">
                Shortcuts:
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-zinc-300 rounded text-[10px] font-mono shadow-xs font-medium text-zinc-800">
                  Ctrl+Z
                </kbd>{" "}
                Undo
              </span>
              <span className="text-zinc-300">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-zinc-300 rounded text-[10px] font-mono shadow-xs font-medium text-zinc-800">
                  Ctrl+Y
                </kbd>{" "}
                Redo
              </span>
              <span className="text-zinc-300">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-zinc-300 rounded text-[10px] font-mono shadow-xs font-medium text-zinc-800">
                  Shift + Klik
                </kbd>{" "}
                Pilih Banyak
              </span>
              <span className="text-zinc-300">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-zinc-300 rounded text-[10px] font-mono shadow-xs font-medium text-zinc-800">
                  Ctrl+C
                </kbd>{" "}
                Copy
              </span>
              <span className="text-zinc-300">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-zinc-300 rounded text-[10px] font-mono shadow-xs font-medium text-zinc-800">
                  Ctrl+V
                </kbd>{" "}
                Paste
              </span>
              <span className="text-zinc-300">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-zinc-300 rounded text-[10px] font-mono shadow-xs font-medium text-zinc-800">
                  Ctrl+D
                </kbd>{" "}
                Duplikat
              </span>
              <span className="text-zinc-300">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-zinc-300 rounded text-[10px] font-mono shadow-xs font-medium text-zinc-800">
                  Del
                </kbd>{" "}
                Hapus
              </span>
              <span className="text-zinc-300">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-zinc-300 rounded text-[10px] font-mono shadow-xs font-medium text-zinc-800">
                  ↑ ↓ ← →
                </kbd>{" "}
                Geser
              </span>
              <span className="text-zinc-300">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-zinc-300 rounded text-[10px] font-mono shadow-xs font-medium text-zinc-800">
                  Ctrl + [ / ]
                </kbd>{" "}
                Layer
              </span>
              <span className="text-zinc-300">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-zinc-300 rounded text-[10px] font-mono shadow-xs font-medium text-zinc-800">
                  Shift + Tarik
                </kbd>{" "}
                Proporsional
              </span>
              <span className="text-zinc-300">•</span>
              <span className="inline-flex items-center gap-1">
                <kbd className="px-1.5 py-0.2 bg-white border border-zinc-300 rounded text-[10px] font-mono shadow-xs font-medium text-zinc-800">
                  Esc
                </kbd>{" "}
                Batal
              </span>
            </div>

            {/* Studio Workspace: Visual Canvas + Detail Columns */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              {/* Column 1: The Interactive Canvas */}
              <div className="xl:col-span-5 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Preview Canvas (Skala 1:5)
                  </span>
                  {selectedSlots.length === 1 && slots[selectedSlots[0]] ? (
                    <span className="text-xs font-medium text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                      Slot {slots[selectedSlots[0]].slotNumber} terpilih (↑↓←→)
                    </span>
                  ) : selectedSlots.length > 1 ? (
                    <span className="text-xs font-medium text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                      {selectedSlots.length} slot terpilih (Del)
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">
                      Klik slot untuk memilih
                    </span>
                  )}
                </div>

                {/* Canvas Container */}
                <div
                  ref={canvasRef}
                  className="relative rounded-xl select-none overflow-hidden border border-zinc-800 shadow-md"
                  style={{
                    width: EDITOR_W,
                    height: EDITOR_H,
                    backgroundColor: "#f4f4f5",
                  }}
                  onClick={() => setSelectedSlots([])}
                >
                  {/* Floating Shortcut Toast */}
                  {shortcutNotice && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black text-white text-xs font-black px-4 py-1.5 rounded-full shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] pointer-events-none transition-all border border-white">
                      {shortcutNotice}
                    </div>
                  )}

                  {/* Background preview */}
                  {bgPreviewUrl ? (
                    <img
                      src={bgPreviewUrl}
                      alt="Background preview"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ zIndex: 0, objectFit: "fill" }}
                      draggable={false}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-6 text-gray-400"
                      style={{ zIndex: 0 }}
                    >
                      <Layers size={36} className="mb-2 opacity-50" />
                      <p className="text-xs font-bold leading-relaxed">
                        Upload background di atas
                        <br />
                        untuk preview langsung di sini
                      </p>
                    </div>
                  )}

                  {/* Grid overlay */}
                  {showGrid && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        zIndex: 1,
                        backgroundImage:
                          `repeating-linear-gradient(0deg,rgba(255,255,255,0.3) 0,rgba(255,255,255,0.3) 1px,transparent 1px,transparent ${gridStep}px),` +
                          `repeating-linear-gradient(90deg,rgba(255,255,255,0.3) 0,rgba(255,255,255,0.3) 1px,transparent 1px,transparent ${gridStep}px),` +
                          `repeating-linear-gradient(0deg,rgba(0,0,0,0.1) 0,rgba(0,0,0,0.1) 1px,transparent 1px,transparent ${gridStep}px),` +
                          `repeating-linear-gradient(90deg,rgba(0,0,0,0.1) 0,rgba(0,0,0,0.1) 1px,transparent 1px,transparent ${gridStep}px)`,
                      }}
                    />
                  )}

                  {/* Smart Magnetic Guide Lines (Figma Pink Line) */}
                  {activeGuides.map((g, idx) =>
                    g.type === "v" ? (
                      <div
                        key={`guide-v-${idx}`}
                        className="absolute top-0 bottom-0 pointer-events-none z-35"
                        style={{
                          left: g.pos * SCALE_X,
                          width: "2px",
                          backgroundColor: "#ec4899",
                          boxShadow: "0 0 6px rgba(236, 72, 153, 0.9)",
                        }}
                      />
                    ) : (
                      <div
                        key={`guide-h-${idx}`}
                        className="absolute left-0 right-0 pointer-events-none z-35"
                        style={{
                          top: g.pos * SCALE_Y,
                          height: "2px",
                          backgroundColor: "#ec4899",
                          boxShadow: "0 0 6px rgba(236, 72, 153, 0.9)",
                        }}
                      />
                    ),
                  )}

                  {/* Smart Equal Gap Indicators (Figma Pink Dimension Pills) */}
                  {activeGaps.map((g, idx) =>
                    g.axis === "v" ? (
                      <div
                        key={`gap-v-${idx}`}
                        className="absolute pointer-events-none z-35 flex items-center justify-center border-t-2 border-b-2 border-dashed border-pink-500 bg-pink-500/15"
                        style={{
                          top: g.from * SCALE_Y,
                          height: Math.max(1, (g.to - g.from) * SCALE_Y),
                          left: (g.crossCenter - g.crossSpan / 2) * SCALE_X,
                          width: g.crossSpan * SCALE_X,
                        }}
                      >
                        <span className="bg-pink-500 text-white text-[9px] font-black font-mono px-1.5 py-0.5 rounded-full shadow-md z-40 select-none">
                          {g.gap} px
                        </span>
                      </div>
                    ) : (
                      <div
                        key={`gap-h-${idx}`}
                        className="absolute pointer-events-none z-35 flex items-center justify-center border-l-2 border-r-2 border-dashed border-pink-500 bg-pink-500/15"
                        style={{
                          left: g.from * SCALE_X,
                          width: Math.max(1, (g.to - g.from) * SCALE_X),
                          top: (g.crossCenter - g.crossSpan / 2) * SCALE_Y,
                          height: g.crossSpan * SCALE_Y,
                        }}
                      >
                        <span className="bg-pink-500 text-white text-[9px] font-black font-mono px-1.5 py-0.5 rounded-full shadow-md z-40 select-none">
                          {g.gap} px
                        </span>
                      </div>
                    ),
                  )}

                  {/* Garis Batas Aman Cetak (Safe Print / Bleed Cut Margin ~3mm) */}
                  {showSafeMargin && (
                    <div
                      className="absolute pointer-events-none border-2 border-dashed border-rose-500/80 rounded-sm z-30"
                      style={{
                        top: SAFE_PRINT_MARGIN * SCALE_Y,
                        left: SAFE_PRINT_MARGIN * SCALE_X,
                        right: SAFE_PRINT_MARGIN * SCALE_X,
                        bottom: SAFE_PRINT_MARGIN * SCALE_Y,
                      }}
                    >
                      <div className="absolute top-1 left-1.5 bg-rose-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1 select-none">
                        <Scissors size={9} />
                        <span>BATAS POTONG (3mm)</span>
                      </div>
                    </div>
                  )}

                  {/* Slots */}
                  {slots.map((s, i) => {
                    const isSel = selectedSlots.includes(i);
                    const isSingleSel = isSel && selectedSlots.length === 1;
                    const isBreachingMargin =
                      showSafeMargin &&
                      (s.x < SAFE_PRINT_MARGIN ||
                        s.y < SAFE_PRINT_MARGIN ||
                        s.x + s.width > PRINT_W - SAFE_PRINT_MARGIN ||
                        s.y + s.height > PRINT_H - SAFE_PRINT_MARGIN);

                    return (
                      <div
                        key={i}
                        className={`absolute group transition-shadow ${
                          isSel
                            ? "border-3 border-black bg-blue-400/50 shadow-lg ring-2 ring-black/40"
                            : isBreachingMargin
                              ? "border-2 border-rose-500 bg-rose-200/40 hover:border-black hover:bg-rose-300/40"
                              : "border-2 border-blue-600 bg-blue-200/40 hover:border-black hover:bg-blue-300/40"
                        }`}
                        style={{
                          left: s.x * SCALE_X,
                          top: s.y * SCALE_Y,
                          width: s.width * SCALE_X,
                          height: s.height * SCALE_Y,
                          transform:
                            s.rotation !== 0
                              ? `rotate(${s.rotation}deg)`
                              : undefined,
                          transformOrigin: "center center",
                          cursor: "move",
                          borderRadius:
                            (s.borderRadius ?? 0) > 0
                              ? (s.borderRadius ?? 0) * SCALE_X
                              : undefined,
                          zIndex: 10 + i,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        onMouseDown={(e) => onMouseDownMove(e, i)}
                      >
                        {/* Dummy Model Photo (when toggled on) */}
                        {showDummyPhotos && (
                          <img
                            src={DUMMY_PHOTOS[i % DUMMY_PHOTOS.length]}
                            alt={`Model slot ${s.slotNumber}`}
                            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                            style={{
                              borderRadius:
                                (s.borderRadius ?? 0) > 0
                                  ? (s.borderRadius ?? 0) * SCALE_X
                                  : undefined,
                            }}
                            draggable={false}
                          />
                        )}

                        {/* Selected overlay when photo preview is on */}
                        {showDummyPhotos && isSel && (
                          <div
                            className="absolute inset-0 bg-blue-500/25 pointer-events-none"
                            style={{
                              borderRadius:
                                (s.borderRadius ?? 0) > 0
                                  ? (s.borderRadius ?? 0) * SCALE_X
                                  : undefined,
                            }}
                          />
                        )}

                        {/* Slot Number Badge */}
                        <span
                          className={`absolute top-1 left-1 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow z-10 flex items-center gap-1 ${
                            isSel
                              ? "bg-black"
                              : isBreachingMargin
                                ? "bg-rose-600"
                                : "bg-blue-600"
                          }`}
                        >
                          <span>{s.slotNumber}</span>
                          {isBreachingMargin && (
                            <Scissors size={9} className="text-rose-200" />
                          )}
                        </span>

                        {/* Dimensions Label */}
                        {s.width * SCALE_X > 60 && s.height * SCALE_Y > 26 && (
                          <span className="absolute bottom-1 right-1 text-[9px] font-mono font-bold text-gray-800 bg-white/90 px-1 py-0.5 rounded shadow pointer-events-none z-10">
                            {s.width}×{s.height}
                          </span>
                        )}

                        {/* 8 Resize Handles only on single selected slot */}
                        {isSingleSel &&
                          resizeHandles.map((h) => (
                            <div
                              key={h.id}
                              className="absolute w-3 h-3 bg-black border-2 border-white rounded-sm z-30"
                              style={{ ...h.style }}
                              onMouseDown={(e) => onMouseDownResize(e, i, h.id)}
                            />
                          ))}
                      </div>
                    );
                  })}

                  {/* Overlay preview on top of slots */}
                  {overlayPreviewUrl && (
                    <img
                      src={overlayPreviewUrl}
                      alt="Overlay preview"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ zIndex: 40, objectFit: "fill" }}
                      draggable={false}
                    />
                  )}
                </div>

                {/* Safe Print Margin Alert Banner */}
                {showSafeMargin &&
                  slots.some(
                    (s) =>
                      s.x < SAFE_PRINT_MARGIN ||
                      s.y < SAFE_PRINT_MARGIN ||
                      s.x + s.width > PRINT_W - SAFE_PRINT_MARGIN ||
                      s.y + s.height > PRINT_H - SAFE_PRINT_MARGIN,
                  ) && (
                    <div className="w-full mt-3 p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-rose-900 text-xs font-medium flex items-start gap-2.5 shadow-xs">
                      <Scissors
                        size={15}
                        className="text-rose-600 shrink-0 mt-0.5"
                      />
                      <div className="leading-snug">
                        <strong className="font-semibold text-rose-800 block mb-0.5">
                          Peringatan Garis Potong 4R:
                        </strong>
                        Slot{" "}
                        {slots
                          .filter(
                            (s) =>
                              s.x < SAFE_PRINT_MARGIN ||
                              s.y < SAFE_PRINT_MARGIN ||
                              s.x + s.width > PRINT_W - SAFE_PRINT_MARGIN ||
                              s.y + s.height > PRINT_H - SAFE_PRINT_MARGIN,
                          )
                          .map((s) => `#${s.slotNumber}`)
                          .join(", ")}{" "}
                        melewati batas aman 3mm (60px) dari tepi kanvas dan
                        berisiko terpotong mesin printer foto saat proses cetak.
                      </div>
                    </div>
                  )}

                <p className="text-[11px] text-zinc-400 font-medium mt-3 text-center">
                  Cetak 4R: 2400 × 3600 px · Tahan Shift saat resize untuk rasio proporsional · Tahan Shift + Klik untuk pilih banyak
                </p>
              </div>

              {/* Column 2: Detailed Slot List & Numeric Fine-tuning */}
              <div className="xl:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Daftar & Koordinat Slot ({slots.length} Slot)
                  </p>
                  {slots.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Hapus semua slot yang ada?")) {
                          pushSnapshot();
                          setSlots([]);
                          setSelectedSlots([]);
                        }
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer transition-colors"
                    >
                      Hapus Semua
                    </button>
                  )}
                </div>

                {/* Multi-Selection Bulk Actions Banner */}
                {selectedSlots.length > 1 && (
                  <div className="bg-zinc-900 text-white rounded-xl p-3.5 border border-zinc-800 shadow-sm animate-fadeIn space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">
                          {selectedSlots.length} Slot Terpilih
                        </span>
                        <span className="text-[11px] text-zinc-400 hidden sm:inline">
                          (Tahan Shift untuk pilih/lepas)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={duplicateSelected}
                          className="px-2.5 py-1 text-xs font-medium bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white rounded-md border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Copy size={12} />
                          Duplikat ({selectedSlots.length})
                        </button>
                        <button
                          type="button"
                          onClick={deleteSelected}
                          className="px-2.5 py-1 text-xs font-medium bg-rose-950/60 text-rose-300 hover:bg-rose-900/80 rounded-md border border-rose-800/80 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                          Hapus ({selectedSlots.length})
                        </button>
                      </div>
                    </div>

                    {/* Quick Alignment controls inside banner */}
                    <div className="pt-2 border-t border-zinc-800 flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-zinc-400 font-medium text-[10px] uppercase tracking-wider shrink-0">
                        Align:
                      </span>
                      <div className="flex items-center gap-0.5 bg-zinc-800/70 p-0.5 rounded-lg border border-zinc-700/60 flex-wrap">
                        <button
                          type="button"
                          onClick={() => alignSelected("left")}
                          className="px-2 py-1 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                          title="Rata Kiri"
                        >
                          <AlignStartHorizontal size={13} />
                          <span>Kiri</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => alignSelected("h-center")}
                          className="px-2 py-1 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                          title="Rata Tengah Horizontal"
                        >
                          <AlignCenterHorizontal size={13} />
                          <span>Tengah H</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => alignSelected("right")}
                          className="px-2 py-1 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                          title="Rata Kanan"
                        >
                          <AlignEndHorizontal size={13} />
                          <span>Kanan</span>
                        </button>
                        <div className="w-[1px] h-3.5 bg-zinc-700 mx-0.5 hidden sm:block" />
                        <button
                          type="button"
                          onClick={() => alignSelected("top")}
                          className="px-2 py-1 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                          title="Rata Atas"
                        >
                          <AlignStartVertical size={13} />
                          <span>Atas</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => alignSelected("v-center")}
                          className="px-2 py-1 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                          title="Rata Tengah Vertikal"
                        >
                          <AlignCenterVertical size={13} />
                          <span>Tengah V</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => alignSelected("bottom")}
                          className="px-2 py-1 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                          title="Rata Bawah"
                        >
                          <AlignEndVertical size={13} />
                          <span>Bawah</span>
                        </button>
                        {selectedSlots.length >= 3 && (
                          <>
                            <div className="w-[1px] h-3.5 bg-zinc-700 mx-0.5 hidden sm:block" />
                            <button
                              type="button"
                              onClick={() => alignSelected("distribute-h")}
                              className="px-2 py-1 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                              title="Distribusi Rata Jarak Horizontal"
                            >
                              <AlignHorizontalDistributeCenter size={13} />
                              <span>Jarak H</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => alignSelected("distribute-v")}
                              className="px-2 py-1 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                              title="Distribusi Rata Jarak Vertikal"
                            >
                              <AlignVerticalDistributeCenter size={13} />
                              <span>Jarak V</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {slots.length === 0 ? (
                  <div className="py-14 text-center border border-dashed border-zinc-300 rounded-xl bg-zinc-50/50">
                    <Layers size={28} className="text-zinc-300 mx-auto mb-2" />
                    <p className="font-semibold text-zinc-700 text-sm">
                      Belum ada slot yang dibuat.
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 mb-4">
                      Klik tombol "+ Tambah Slot Baru" untuk mulai meletakkan foto.
                    </p>
                    <button
                      type="button"
                      onClick={addSlot}
                      className="px-3.5 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-black transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1"
                    >
                      <Plus size={13} />
                      Tambah Slot Pertama
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
                    {slots.map((s, i) => {
                      const isSel = selectedSlots.includes(i);
                      const isBreachingMargin =
                        showSafeMargin &&
                        (s.x < SAFE_PRINT_MARGIN ||
                          s.y < SAFE_PRINT_MARGIN ||
                          s.x + s.width > PRINT_W - SAFE_PRINT_MARGIN ||
                          s.y + s.height > PRINT_H - SAFE_PRINT_MARGIN);

                      return (
                        <div
                          key={i}
                          className={`border rounded-xl p-3.5 transition-all cursor-pointer ${
                            isSel
                              ? "border-zinc-900 bg-zinc-50/70 shadow-xs ring-1 ring-zinc-900"
                              : isBreachingMargin
                                ? "border-rose-300 bg-rose-50/30 hover:border-zinc-400 hover:bg-rose-50/50 shadow-xs"
                                : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/30 shadow-xs"
                          }`}
                          onClick={(e) => {
                            if (e.shiftKey) {
                              setSelectedSlots((prev) =>
                                prev.includes(i)
                                  ? prev.filter((idx) => idx !== i)
                                  : [...prev, i],
                              );
                            } else {
                              setSelectedSlots([i]);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                                  isSel
                                    ? "bg-zinc-900 text-white"
                                    : isBreachingMargin
                                      ? "bg-rose-100 text-rose-700 border border-rose-200"
                                      : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                                }`}
                              >
                                Slot {s.slotNumber}
                              </span>
                              <span className="text-xs font-mono text-zinc-500">
                                {s.width} × {s.height} px
                              </span>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
                                Layer {i + 1}/{slots.length}
                              </span>
                              {isBreachingMargin && (
                                <span
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"
                                  title="Slot ini melewati batas potong aman 3mm"
                                >
                                  <Scissors size={10} />
                                  <span>Batas Potong</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Layer Order Controls (Z-Index) */}
                              <div
                                className="flex items-center border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-xs mr-1"
                                title="Pengaturan Urutan Layer (Z-Index)"
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    bringToFront(i);
                                  }}
                                  disabled={i === slots.length - 1}
                                  className={`p-1.5 transition-colors ${
                                    i === slots.length - 1
                                      ? "opacity-25 cursor-not-allowed text-zinc-300"
                                      : "hover:bg-zinc-100 cursor-pointer text-zinc-600 hover:text-zinc-900"
                                  }`}
                                  title="Bawa ke Paling Depan (Ctrl+Shift+])"
                                >
                                  <BringToFront size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    bringForward(i);
                                  }}
                                  disabled={i === slots.length - 1}
                                  className={`p-1.5 transition-colors border-l border-zinc-200 ${
                                    i === slots.length - 1
                                      ? "opacity-25 cursor-not-allowed text-zinc-300"
                                      : "hover:bg-zinc-100 cursor-pointer text-zinc-600 hover:text-zinc-900"
                                  }`}
                                  title="Naik 1 Layer (Ctrl+])"
                                >
                                  <ChevronUp size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sendBackward(i);
                                  }}
                                  disabled={i === 0}
                                  className={`p-1.5 transition-colors border-l border-zinc-200 ${
                                    i === 0
                                      ? "opacity-25 cursor-not-allowed text-zinc-300"
                                      : "hover:bg-zinc-100 cursor-pointer text-zinc-600 hover:text-zinc-900"
                                  }`}
                                  title="Turun 1 Layer (Ctrl+[)"
                                >
                                  <ChevronDown size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sendToBack(i);
                                  }}
                                  disabled={i === 0}
                                  className={`p-1.5 transition-colors border-l border-zinc-200 ${
                                    i === 0
                                      ? "opacity-25 cursor-not-allowed text-zinc-300"
                                      : "hover:bg-zinc-100 cursor-pointer text-zinc-600 hover:text-zinc-900"
                                  }`}
                                  title="Kirim ke Paling Belakang (Ctrl+Shift+[)"
                                >
                                  <SendToBack size={13} />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateSlot(i);
                                }}
                                className="px-2.5 py-1 text-xs font-medium border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 text-zinc-700 transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                title="Duplikat slot ini"
                              >
                                <Copy size={12} />
                                <span>Duplikat</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSlot(i);
                                }}
                                className="p-1.5 text-xs font-medium border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus slot"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Numeric Inputs Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2.5 border-t border-zinc-100">
                            <div>
                              <span className="text-[10px] font-medium uppercase text-zinc-400 block mb-1">
                                Posisi X
                              </span>
                              <input
                                type="number"
                                value={s.x}
                                onChange={(e) =>
                                  updateField(i, "x", Number(e.target.value))
                                }
                                className="w-full border border-zinc-200 rounded-md px-2 py-1 text-xs font-mono text-zinc-800 bg-white hover:border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-colors"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] font-medium uppercase text-zinc-400 block mb-1">
                                Posisi Y
                              </span>
                              <input
                                type="number"
                                value={s.y}
                                onChange={(e) =>
                                  updateField(i, "y", Number(e.target.value))
                                }
                                className="w-full border border-zinc-200 rounded-md px-2 py-1 text-xs font-mono text-zinc-800 bg-white hover:border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-colors"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] font-medium uppercase text-zinc-400 block mb-1">
                                Lebar (W)
                              </span>
                              <input
                                type="number"
                                value={s.width}
                                onChange={(e) =>
                                  updateField(
                                    i,
                                    "width",
                                    Number(e.target.value),
                                  )
                                }
                                className="w-full border border-zinc-200 rounded-md px-2 py-1 text-xs font-mono text-zinc-800 bg-white hover:border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-colors"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] font-medium uppercase text-zinc-400 block mb-1">
                                Tinggi (H)
                              </span>
                              <input
                                type="number"
                                value={s.height}
                                onChange={(e) =>
                                  updateField(
                                    i,
                                    "height",
                                    Number(e.target.value),
                                  )
                                }
                                className="w-full border border-zinc-200 rounded-md px-2 py-1 text-xs font-mono text-zinc-800 bg-white hover:border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-colors"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] font-medium uppercase text-zinc-400 block mb-1">
                                Radius (R)
                              </span>
                              <input
                                type="number"
                                value={s.borderRadius ?? 0}
                                onChange={(e) =>
                                  updateField(
                                    i,
                                    "borderRadius",
                                    Number(e.target.value),
                                  )
                                }
                                className="w-full border border-zinc-200 rounded-md px-2 py-1 text-xs font-mono text-zinc-800 bg-white hover:border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-colors"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] font-medium uppercase text-zinc-400 block mb-1">
                                Rotasi (°)
                              </span>
                              <input
                                type="number"
                                value={s.rotation ?? 0}
                                onChange={(e) =>
                                  updateField(
                                    i,
                                    "rotation",
                                    Number(e.target.value),
                                  )
                                }
                                className="w-full border border-zinc-200 rounded-md px-2 py-1 text-xs font-mono text-zinc-800 bg-white hover:border-zinc-300 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
