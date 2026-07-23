import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { Navigation } from "../../components/Navigation";
import { BrutalistButton } from "../../components/BrutalistButton";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { Minus, Plus, Printer } from "lucide-react";

// ── Canvas sizes (HD) ────────────────────────────────────────
const RATIO_OPTIONS = [
  {
    id: "3x4",
    label: "3 × 4",
    desc: "Pas foto standar KTP / ijazah",
    canvasW: 3000,
    canvasH: 4000,
    aspect: 3 / 4,
    badge: "Paling Umum",
  },
  {
    id: "2x3",
    label: "2 × 3",
    desc: "Pas foto kecil / dompet",
    canvasW: 2000,
    canvasH: 3000,
    aspect: 2 / 3,
    badge: null,
  },
  {
    id: "1x1",
    label: "1 × 1",
    desc: "Pas foto kotak / visa",
    canvasW: 3000,
    canvasH: 3000,
    aspect: 1 / 1,
    badge: null,
  },
  {
    id: "4x6",
    label: "4 × 6",
    desc: "Pas foto landscape / SKCK",
    canvasW: 4000,
    canvasH: 6000,
    aspect: 4 / 6,
    badge: null,
  },
  {
    id: "5xt",
    label: "5 × 5",
    desc: "Pas foto ukuran 5R / tanda tangan",
    canvasW: 5000,
    canvasH: 7000,
    aspect: 5 / 7,
    badge: null,
  },
];

// ── SlotImage inline (with correct object-cover clamp) ────────
interface SlotImageProps {
  src: string;
  slotW: number;
  slotH: number;
  transform: { scale: number; x: number; y: number };
  onTransformChange: (t: { scale: number; x: number; y: number }) => void;
}

function SlotImage({
  src,
  slotW,
  slotH,
  transform,
  onTransformChange,
}: SlotImageProps) {
  const { scale, x, y } = transform;
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  const imgAspect = imgSize ? imgSize.w / imgSize.h : 1;
  const frameAspect = slotW / slotH;
  let coverW: number, coverH: number;
  if (imgSize && imgAspect > frameAspect) {
    coverH = slotH;
    coverW = imgAspect * slotH;
  } else {
    coverW = slotW;
    coverH = imgSize ? slotW / imgAspect : slotH;
  }

  const clamp = useCallback(
    (newScale: number, newX: number, newY: number) => {
      if (!imgSize) return { scale: newScale, x: newX, y: newY };
      const iA = imgSize.w / imgSize.h;
      const fA = slotW / slotH;
      let bW: number, bH: number;
      if (iA > fA) {
        bH = slotH;
        bW = iA * slotH;
      } else {
        bW = slotW;
        bH = slotW / iA;
      }
      const sW = bW * newScale;
      const sH = bH * newScale;
      const maxX = Math.max(0, (sW - slotW) / 2);
      const maxY = Math.max(0, (sH - slotH) / 2);
      return {
        scale: newScale,
        x: Math.min(maxX, Math.max(-maxX, newX)),
        y: Math.min(maxY, Math.max(-maxY, newY)),
      };
    },
    [imgSize, slotW, slotH],
  );

  useEffect(() => {
    if (!imgSize) return;
    onTransformChange(clamp(transform.scale, transform.x, transform.y));
  }, [imgSize]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.min(5, Math.max(1, scale + delta));
      onTransformChange(clamp(newScale, x, y));
    },
    [scale, x, y, clamp, onTransformChange],
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      onTransformChange(clamp(scale, x + dx, y + dy));
    },
    [scale, x, y, clamp, onTransformChange],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const offsetX = (slotW - coverW * scale) / 2 + x;
  const offsetY = (slotH - coverH * scale) / 2 + y;

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
    >
      <div
        style={{
          position: "absolute",
          width: coverW * scale,
          height: coverH * scale,
          left: offsetX,
          top: offsetY,
          pointerEvents: "none",
        }}
      >
        <ImageWithFallback
          src={src}
          alt="pas foto"
          className="w-full h-full select-none"
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          style={{ display: "block", objectFit: "fill" }}
        />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export function PasFotoPage() {
  const navigate = useNavigate();
  const [printQty, setPrintQty] = useState<number | null>(null);
  const [tempQty, setTempQty] = useState<number>(1);
  const [selectedRatios, setSelectedRatios] = useState<Record<number, string>>(
    {},
  );
  const [ratiosSelected, setRatiosSelected] = useState<boolean>(false);
  const [ratioSelectIndex, setRatioSelectIndex] = useState<number>(0);
  const [photoGallery, setPhotoGallery] = useState<
    { thumb: string; full: string }[]
  >([]);
  const [filledSlots, setFilledSlots] = useState<Record<number, string | null>>(
    {},
  );
  const [transforms, setTransforms] = useState<
    Record<number, { scale: number; x: number; y: number }>
  >({});
  const [activeArrangeIndex, setActiveArrangeIndex] = useState<number>(0);
  const [slotSizes, setSlotSizes] = useState<
    Record<number, { w: number; h: number }>
  >({});
  const [printing, setPrinting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);

  const ratio = RATIO_OPTIONS.find(
    (r) => r.id === selectedRatios[activeArrangeIndex],
  );
  const slotSize = slotSizes[activeArrangeIndex] || null;
  const canPrint =
    printQty !== null &&
    Array.from({ length: printQty }, (_, i) => i).every((i) => filledSlots[i]);

  useEffect(() => {
    const cached = sessionStorage.getItem("gallery");
    if (cached) {
      setPhotoGallery(JSON.parse(cached));
    }

    const fetchPhotos = () => {
      fetch("http://localhost:5000/api/photos")
        .then((res) => res.json())
        .then((data) => {
          const photos = data.reverse().slice(0, 200);
          sessionStorage.setItem("gallery", JSON.stringify(photos));
          setPhotoGallery((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(photos)) {
              return photos;
            }
            return prev;
          });
        })
        .catch((err) => console.error("Fetch photos failed:", err));
    };

    fetchPhotos();
    const interval = setInterval(fetchPhotos, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (slotRef.current) {
        const w = slotRef.current.offsetWidth;
        const h = slotRef.current.offsetHeight;
        setSlotSizes((prev) => ({ ...prev, [activeArrangeIndex]: { w, h } }));
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [activeArrangeIndex, selectedRatios, filledSlots]);

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

  const generateCanvas = async (
    preview = false,
    index = 0,
  ): Promise<string | void> => {
    const fSlot = filledSlots[index];
    const rId = selectedRatios[index];
    const ratioOpt = RATIO_OPTIONS.find((r) => r.id === rId);
    if (!fSlot || !ratioOpt) return;

    const canvas = document.createElement("canvas");
    canvas.width = ratioOpt.canvasW;
    canvas.height = ratioOpt.canvasH;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ratioOpt.canvasW, ratioOpt.canvasH);

    const img = await loadImage(fSlot);
    const slotW = ratioOpt.canvasW;
    const slotH = ratioOpt.canvasH;

    const imgAspect = img.width / img.height;
    const frameAspect = slotW / slotH;

    let baseW: number, baseH: number;
    if (imgAspect > frameAspect) {
      baseH = slotH;
      baseW = imgAspect * slotH;
    } else {
      baseW = slotW;
      baseH = slotW / imgAspect;
    }

    const t = transforms[index] || { scale: 1, x: 0, y: 0 };
    const scaledW = baseW * t.scale;
    const scaledH = baseH * t.scale;

    const sSize = slotSizes[index];
    const ratioX = sSize ? slotW / sSize.w : 1;
    const ratioY = sSize ? slotH / sSize.h : 1;

    const drawX = (slotW - scaledW) / 2 + t.x * ratioX;
    const drawY = (slotH - scaledH) / 2 + t.y * ratioY;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, slotW, slotH);
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, scaledW, scaledH);
    ctx.restore();

    if (preview) {
      return new Promise((resolve) =>
        canvas.toBlob(
          (b) => resolve(b ? URL.createObjectURL(b) : undefined),
          "image/png",
          1,
        ),
      );
    }

    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject("Failed")), "image/png", 1),
    );

    const formData = new FormData();
    const filename = `pasfoto-${ratioOpt.id}-${Date.now()}.png`;
    formData.append("file", blob, filename);

    await fetch(
      `http://localhost:5000/api/save-print?label=pasfoto-${ratioOpt.id}`,
      {
        method: "POST",
        body: formData,
      },
    );
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      const qty = printQty || 1;
      for (let i = 0; i < qty; i++) {
        await generateCanvas(false, i);
      }
      setSuccessOpen(true);
    } catch (err) {
      console.error("PRINT ERROR:", err);
      alert("Print failed");
    } finally {
      setPrinting(false);
    }
  };

  const handlePreview = async () => {
    const url = await generateCanvas(true, activeArrangeIndex);
    if (url) {
      setPreviewUrl(url as string);
      setPreviewOpen(true);
    }
  };

  // ── Step 1: Input Jumlah Cetak ─────────────────────────────
  if (printQty === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-between">
        <Navigation currentStep={1} totalSteps={3} />

        <div className="flex-1 flex items-center justify-center pt-32 pb-8 px-8">
          <div className="max-w-2xl w-full bg-white border-4 border-black rounded-3xl p-16 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-center">
              <div className="mb-8">
                <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-black">
                  <Printer size={48} className="text-white" strokeWidth={3} />
                </div>
                <h1 className="text-5xl font-bold mb-4">
                  Jumlah Cetak Pas Foto
                </h1>
                <p className="text-2xl text-gray-600">
                  Tentukan jumlah lembar pas foto yang ingin dicetak
                </p>
              </div>

              <div className="my-12">
                <div className="flex items-center justify-center gap-8">
                  <BrutalistButton
                    size="md"
                    variant="outline"
                    onClick={() => {
                      if (tempQty > 1) setTempQty(tempQty - 1);
                    }}
                    disabled={tempQty <= 1}
                    className="w-20 h-20 p-0 flex items-center justify-center cursor-pointer"
                  >
                    <Minus size={32} strokeWidth={4} />
                  </BrutalistButton>

                  <div className="text-9xl font-bold min-w-[200px] text-center border-8 border-black rounded-3xl py-8 px-12 bg-white select-none">
                    {tempQty}
                  </div>

                  <BrutalistButton
                    size="md"
                    variant="outline"
                    onClick={() => {
                      if (tempQty < 15) setTempQty(tempQty + 1);
                    }}
                    disabled={tempQty >= 15}
                    className="w-20 h-20 p-0 flex items-center justify-center cursor-pointer"
                  >
                    <Plus size={32} strokeWidth={4} />
                  </BrutalistButton>
                </div>
              </div>

              <div className="mt-12 flex flex-col gap-4">
                <BrutalistButton
                  onClick={() => {
                    setPrintQty(tempQty);
                    setSelectedRatios({});
                    setRatioSelectIndex(0);
                    setRatiosSelected(false);
                  }}
                  className="w-full"
                >
                  Lanjutkan ke Pilih Ukuran →
                </BrutalistButton>
                <button
                  onClick={() => navigate(-1)}
                  className="text-xl font-bold border-4 border-black px-12 py-4 bg-white hover:bg-black hover:text-white transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                >
                  ← Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Pilih Rasio ────────────────────────────────────
  if (!ratiosSelected) {
    const allRatiosSelected =
      printQty !== null &&
      Array.from({ length: printQty }, (_, i) => i).every(
        (i) => selectedRatios[i],
      );

    return (
      <div className="h-[100dvh] overflow-hidden bg-gray-100 flex flex-col">
        <Navigation currentStep={2} totalSteps={3} />

        <div className="pt-32 pb-8 px-8 flex-1 overflow-hidden">
          <div className="max-w-[1600px] mx-auto h-full flex flex-col">
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold mb-2">Cetak Pas Foto</h1>
              <p className="text-2xl text-gray-600">
                Pilih ukuran untuk Cetak #{ratioSelectIndex + 1} dari {printQty}
              </p>
            </div>

            <div className="grid grid-cols-12 gap-8 flex-1 overflow-hidden">
              {/* LEFT COLUMN: Size options */}
              <div className="col-span-8 overflow-y-auto pr-2 pb-10">
                <div className="grid grid-cols-3 gap-6">
                  {RATIO_OPTIONS.map((opt) => {
                    const isCurrentSelected =
                      selectedRatios[ratioSelectIndex] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSelectedRatios((prev) => ({
                            ...prev,
                            [ratioSelectIndex]: opt.id,
                          }));
                          if (ratioSelectIndex < (printQty || 1) - 1) {
                            setRatioSelectIndex((prev) => prev + 1);
                          } else {
                            setRatiosSelected(true);
                            setActiveArrangeIndex(0);
                          }
                        }}
                        className={`group relative flex flex-col items-center bg-white border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-150 cursor-pointer
                          ${isCurrentSelected ? "ring-8 ring-black" : ""}`}
                      >
                        {opt.badge && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-300 border-2 border-black text-black text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
                            {opt.badge}
                          </span>
                        )}

                        {/* Visual ratio preview */}
                        <div
                          className="flex items-center justify-center w-full mb-4"
                          style={{ height: 100 }}
                        >
                          <div
                            className="bg-gray-900 border-4 border-black group-hover:bg-black transition-colors"
                            style={{
                              width:
                                opt.aspect >= 1
                                  ? 80
                                  : Math.round(80 * opt.aspect),
                              height:
                                opt.aspect >= 1
                                  ? Math.round(80 / opt.aspect)
                                  : 80,
                              maxHeight: 100,
                              maxWidth: 100,
                            }}
                          />
                        </div>

                        <p className="text-3xl font-black mb-1">{opt.label}</p>
                        <p className="text-base text-gray-500 font-medium text-center leading-snug">
                          {opt.desc}
                        </p>
                        <p className="text-xs text-gray-400 mt-2 font-mono">
                          {opt.canvasW.toLocaleString()} ×{" "}
                          {opt.canvasH.toLocaleString()} px
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-center mt-10">
                  <button
                    onClick={() => {
                      if (ratioSelectIndex > 0) {
                        setRatioSelectIndex((prev) => prev - 1);
                      } else {
                        setPrintQty(null);
                      }
                    }}
                    className="text-xl font-bold border-4 border-black px-12 py-4 bg-white hover:bg-black hover:text-white transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                  >
                    ← Kembali
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: Selection Summary */}
              <div className="col-span-4 bg-white border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-y-auto flex flex-col h-[70vh]">
                <h2 className="text-2xl font-bold mb-6 border-b-4 border-black pb-3">
                  Daftar Pilihan Cetak
                </h2>

                <div className="space-y-4 flex-1">
                  {Array.from({ length: printQty || 1 }, (_, idx) => {
                    const selectedRatioId = selectedRatios[idx];
                    const ratioOpt = RATIO_OPTIONS.find(
                      (r) => r.id === selectedRatioId,
                    );
                    const isActive = ratioSelectIndex === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setRatioSelectIndex(idx);
                        }}
                        className={`p-4 border-4 border-black rounded-xl flex items-center gap-4 transition-all cursor-pointer
                          ${isActive ? "bg-black text-white" : "bg-white text-black hover:bg-gray-50"}
                          ${selectedRatioId ? "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "border-dashed border-gray-300 shadow-none opacity-50"}`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 border-black
                          ${isActive ? "bg-white text-black" : "bg-black text-white"}`}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg">Cetak {idx + 1}</p>
                          <p
                            className={`text-sm ${isActive ? "text-gray-300" : "text-gray-500"}`}
                          >
                            {ratioOpt
                              ? `${ratioOpt.label} — ${ratioOpt.desc}`
                              : "Belum dipilih"}
                          </p>
                        </div>
                        {selectedRatioId && (
                          <div className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 border-2 border-green-600 rounded-full text-base font-black">
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {allRatiosSelected && (
                  <div className="mt-6 border-t-4 border-black pt-6">
                    <BrutalistButton
                      onClick={() => {
                        setRatiosSelected(true);
                        setActiveArrangeIndex(0);
                      }}
                      className="w-full"
                    >
                      Lanjutkan →
                    </BrutalistButton>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: Susun Foto ─────────────────────────────────────
  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-100 flex flex-col">
      <Navigation currentStep={3} totalSteps={3} />

      <div className="pt-32 px-8 flex-1 overflow-hidden">
        <div className="w-full mx-auto h-full flex flex-col">
          <div className="my-5 text-center">
            <h1 className="text-5xl font-bold mb-2">Pas Foto {ratio?.label}</h1>
            <p className="text-xl text-gray-600">
              Pilih foto lalu sesuaikan posisinya
            </p>
          </div>

          {/* Tabs for selecting print copies */}
          {printQty && printQty > 1 && (
            <div className="flex gap-3 justify-center mb-6 overflow-x-auto py-2">
              {Array.from({ length: printQty }, (_, idx) => {
                const isActive = activeArrangeIndex === idx;
                const ratioId = selectedRatios[idx];
                const ratioOpt = RATIO_OPTIONS.find((r) => r.id === ratioId);
                const hasPhoto = !!filledSlots[idx];
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveArrangeIndex(idx)}
                    className={`text-lg px-6 py-3 font-bold border-4 border-black rounded-xl transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none relative
                      ${
                        isActive
                          ? "bg-black text-white translate-x-0.5 translate-y-0.5 shadow-none"
                          : "bg-white text-black hover:bg-gray-100"
                      }`}
                  >
                    {hasPhoto && (
                      <span className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-green-400 border-2 border-black rounded-full text-xs text-black flex items-center justify-center font-black">
                        ✓
                      </span>
                    )}
                    Cetak {idx + 1} ({ratioOpt?.label || "Pilih Ukuran"})
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-12 gap-8 flex-1 overflow-hidden mb-5 max-h-[80dvh]">
            {/* LEFT — Gallery */}
            <div className="col-span-8 h-full">
              <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-2xl font-bold mb-4">Pilih Foto</h2>
                <div className="grid grid-cols-5 gap-3 max-h-[900px] overflow-y-auto pr-2">
                  {photoGallery.map((photo, i) => {
                    const isSelected =
                      filledSlots[activeArrangeIndex] === photo.full;
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          setFilledSlots((prev) => ({
                            ...prev,
                            [activeArrangeIndex]: photo.full,
                          }));
                          setTransforms((prev) => ({
                            ...prev,
                            [activeArrangeIndex]: { scale: 1, x: 0, y: 0 },
                          }));
                        }}
                        className={`relative aspect-square border-4 cursor-pointer overflow-hidden rounded-lg transition-all ${
                          isSelected
                            ? "border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] scale-95"
                            : "border-gray-200 hover:border-black hover:scale-105"
                        }`}
                      >
                        <img
                          src={photo.thumb}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                            <div className="bg-black text-white text-xs font-black px-2 py-1 rounded">
                              ✓ Dipilih
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT — Preview slot + actions */}
            <div className="col-span-4 flex flex-col gap-4 h-[80dvh]">
              <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <h2 className="text-xl font-bold">Preview</h2>
                  <button
                    onClick={() => {
                      setRatiosSelected(false);
                      setRatioSelectIndex(activeArrangeIndex);
                    }}
                    className="text-sm font-bold border-2 border-black px-3 py-1 rounded-lg hover:bg-black hover:text-white transition-colors"
                  >
                    Ganti Ukuran
                  </button>
                </div>

                {/* Slot preview */}
                <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0">
                  <div
                    ref={slotRef}
                    className="border-4 border-black bg-white shadow-lg overflow-hidden"
                    style={{
                      aspectRatio: ratio
                        ? `${ratio.canvasW}/${ratio.canvasH}`
                        : "3/4",
                      maxHeight: "100%",
                      maxWidth: "100%",
                      ...(ratio && ratio.aspect >= 1
                        ? { width: "100%", height: "auto" }
                        : { height: "100%", width: "auto" }),
                    }}
                  >
                    {filledSlots[activeArrangeIndex] && slotSize ? (
                      <div className="relative w-full h-full group">
                        <SlotImage
                          src={filledSlots[activeArrangeIndex]!}
                          slotW={slotSize.w}
                          slotH={slotSize.h}
                          transform={
                            transforms[activeArrangeIndex] || {
                              scale: 1,
                              x: 0,
                              y: 0,
                            }
                          }
                          onTransformChange={(newT) =>
                            setTransforms((prev) => ({
                              ...prev,
                              [activeArrangeIndex]: newT,
                            }))
                          }
                        />
                        {/* Tombol hapus */}
                        <button
                          className="absolute top-2 right-2 z-50 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full border-2 border-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFilledSlots((prev) => ({
                              ...prev,
                              [activeArrangeIndex]: null,
                            }));
                            setTransforms((prev) => ({
                              ...prev,
                              [activeArrangeIndex]: { scale: 1, x: 0, y: 0 },
                            }));
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                        <div className="text-5xl mb-3">📷</div>
                        <p className="text-base font-bold text-center px-4">
                          Pilih foto dari galeri
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {filledSlots[activeArrangeIndex] && (
                  <p className="text-xs text-gray-400 text-center mt-2 flex-shrink-0">
                    Scroll untuk zoom · Drag untuk geser
                  </p>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-4 flex-shrink-0">
                  {!canPrint && (
                    <p className="text-xs text-red-500 font-bold text-center">
                      Harap lengkapi semua foto sebelum mencetak
                    </p>
                  )}
                  <div className="flex gap-3">
                    <BrutalistButton
                      onClick={handlePreview}
                      disabled={!filledSlots[activeArrangeIndex]}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Lihat Preview
                    </BrutalistButton>
                    <BrutalistButton
                      onClick={handlePrint}
                      disabled={!canPrint || printing}
                      size="sm"
                      className="w-full"
                    >
                      {printing ? "Mencetak..." : "Cetak Pas Foto"}
                    </BrutalistButton>
                  </div>
                </div>
              </div>

              {/* Info card */}
              <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-bold text-gray-500 mb-1">
                      Ukuran Output
                    </p>
                    <p className="text-xl font-black">{ratio?.label}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-500 mb-1">
                      Jumlah Cetak
                    </p>
                    <p className="text-xl font-black">{printQty} Lembar</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 font-mono">
                  {ratio?.canvasW.toLocaleString()} ×{" "}
                  {ratio?.canvasH.toLocaleString()} px
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Preview */}
      {previewOpen && previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl border-4 border-black max-w-lg w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-center">
              Preview Cetak
            </h2>
            <img
              src={previewUrl}
              className="w-full rounded-lg border-4 border-black"
              style={{ maxHeight: "60vh", objectFit: "contain" }}
            />
            <div className="flex gap-4 mt-4">
              <BrutalistButton
                className="w-full"
                variant="outline"
                onClick={() => setPreviewOpen(false)}
              >
                Tutup
              </BrutalistButton>
              <BrutalistButton
                className="w-full"
                onClick={() => {
                  setPreviewOpen(false);
                  handlePrint();
                }}
              >
                Cetak Sekarang
              </BrutalistButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sukses */}
      {successOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl border-4 border-black max-w-md w-full mx-4 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-2">Berhasil!</h2>
            <p className="text-xl text-gray-600 mb-8">
              Semua {printQty} pas foto berhasil dikirim ke printer.
            </p>
            <div className="flex gap-4">
              <BrutalistButton
                className="w-full"
                variant="outline"
                onClick={() => {
                  setSuccessOpen(false);
                  setFilledSlots({});
                  setTransforms({});
                  setSelectedRatios({});
                  setRatioSelectIndex(0);
                  setRatiosSelected(false);
                  setPrintQty(null);
                  setTempQty(1);
                  setActiveArrangeIndex(0);
                }}
              >
                Cetak Lagi
              </BrutalistButton>
              <BrutalistButton
                className="w-full"
                onClick={() => {
                  setSuccessOpen(false);
                  navigate("/");
                }}
              >
                Selesai
              </BrutalistButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
