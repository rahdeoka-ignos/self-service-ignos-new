import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { Navigation } from "../../components/Navigation";
import { BrutalistButton } from "../../components/BrutalistButton";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

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
  const [selectedRatio, setSelectedRatio] = useState<string | null>(null);
  const [photoGallery, setPhotoGallery] = useState<
    { thumb: string; full: string }[]
  >([]);
  const [filledSlot, setFilledSlot] = useState<string | null>(null);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [slotSize, setSlotSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [printing, setPrinting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);

  const ratio = RATIO_OPTIONS.find((r) => r.id === selectedRatio);

  useEffect(() => {
    const cached = sessionStorage.getItem("gallery");
    if (cached) {
      setPhotoGallery(JSON.parse(cached));
    } else {
      fetch("http://localhost:5000/api/photos")
        .then((res) => res.json())
        .then((data) => {
          const photos = data.reverse().slice(0, 200);
          sessionStorage.setItem("gallery", JSON.stringify(photos));
          setPhotoGallery(photos);
        });
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (slotRef.current) {
        const rect = slotRef.current.getBoundingClientRect();
        setSlotSize({ w: rect.width, h: rect.height });
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [selectedRatio, filledSlot]);

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

  const generateCanvas = async (preview = false): Promise<string | void> => {
    if (!filledSlot || !ratio) return;

    const canvas = document.createElement("canvas");
    canvas.width = ratio.canvasW;
    canvas.height = ratio.canvasH;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ratio.canvasW, ratio.canvasH);

    const img = await loadImage(filledSlot);
    const slotW = ratio.canvasW;
    const slotH = ratio.canvasH;

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

    const scaledW = baseW * transform.scale;
    const scaledH = baseH * transform.scale;

    const ratioX = slotSize ? slotW / slotSize.w : 1;
    const ratioY = slotSize ? slotH / slotSize.h : 1;

    const drawX = (slotW - scaledW) / 2 + transform.x * ratioX;
    const drawY = (slotH - scaledH) / 2 + transform.y * ratioY;

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
    const filename = `pasfoto-${ratio.id}-${Date.now()}.png`;
    formData.append("file", blob, filename);

    await fetch(
      `http://localhost:5000/api/save-print?label=pasfoto-${ratio.id}`,
      {
        method: "POST",
        body: formData,
      },
    );
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      await generateCanvas(false);
      setSuccessOpen(true);
    } catch (err) {
      console.error("PRINT ERROR:", err);
      alert("Print failed");
    } finally {
      setPrinting(false);
    }
  };

  const handlePreview = async () => {
    const url = await generateCanvas(true);
    if (url) {
      setPreviewUrl(url as string);
      setPreviewOpen(true);
    }
  };

  // ── Step 1: Pilih Rasio ────────────────────────────────────
  if (!selectedRatio) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navigation currentStep={1} totalSteps={2} />
        <div className="flex items-center justify-center min-h-screen p-8 pt-32">
          <div className="max-w-4xl w-full">
            <div className="text-center mb-12">
              <h1 className="text-6xl font-bold mb-4">Cetak Pas Foto</h1>
              <p className="text-2xl text-gray-600">
                Pilih ukuran pas foto yang ingin dicetak
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {RATIO_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedRatio(opt.id)}
                  className="group relative flex flex-col items-center bg-white border-4 border-black rounded-2xl p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-150 cursor-pointer"
                >
                  {opt.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-300 border-2 border-black text-black text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
                      {opt.badge}
                    </span>
                  )}

                  {/* Visual ratio preview */}
                  <div
                    className="flex items-center justify-center w-full mb-6"
                    style={{ height: 120 }}
                  >
                    <div
                      className="bg-gray-900 border-4 border-black group-hover:bg-black transition-colors"
                      style={{
                        width:
                          opt.aspect >= 1 ? 100 : Math.round(100 * opt.aspect),
                        height:
                          opt.aspect >= 1 ? Math.round(100 / opt.aspect) : 100,
                        maxHeight: 120,
                        maxWidth: 120,
                      }}
                    />
                  </div>

                  <p className="text-4xl font-black mb-2">{opt.label}</p>
                  <p className="text-base text-gray-500 font-medium text-center">
                    {opt.desc}
                  </p>
                  <p className="text-xs text-gray-400 mt-2 font-mono">
                    {opt.canvasW.toLocaleString()} ×{" "}
                    {opt.canvasH.toLocaleString()} px
                  </p>
                </button>
              ))}
            </div>

            <div className="flex justify-center mt-8">
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
    );
  }

  // ── Step 2: Susun Foto ─────────────────────────────────────
  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-100 flex flex-col">
      <Navigation currentStep={2} totalSteps={2} />

      <div className="pt-32 px-8 flex-1 overflow-hidden">
        <div className="w-full mx-auto h-full flex flex-col">
          <div className="my-5 text-center">
            <h1 className="text-5xl font-bold mb-2">Pas Foto {ratio?.label}</h1>
            <p className="text-xl text-gray-600">
              Pilih foto lalu sesuaikan posisinya
            </p>
          </div>

          <div className="grid grid-cols-12 gap-8 flex-1 overflow-hidden mb-5">
            {/* LEFT — Gallery */}
            <div className="col-span-8 h-full">
              <div className="bg-white border-4 border-black rounded-2xl p-6 h-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-2xl font-bold mb-4">Pilih Foto</h2>
                <div className="grid grid-cols-5 gap-3 max-h-[850px] overflow-y-auto pr-2">
                  {photoGallery.map((photo, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setFilledSlot(photo.full);
                        setTransform({ scale: 1, x: 0, y: 0 });
                      }}
                      className={`relative aspect-square border-4 cursor-pointer overflow-hidden rounded-lg transition-all ${
                        filledSlot === photo.full
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
                      {filledSlot === photo.full && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="bg-black text-white text-xs font-black px-2 py-1 rounded">
                            ✓ Dipilih
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — Preview slot + actions */}
            <div className="col-span-4 flex flex-col gap-4 h-[80dvh]">
              <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <h2 className="text-xl font-bold">Preview</h2>
                  <button
                    onClick={() => setSelectedRatio(null)}
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
                    {filledSlot && slotSize ? (
                      <div className="relative w-full h-full group">
                        <SlotImage
                          src={filledSlot}
                          slotW={slotSize.w}
                          slotH={slotSize.h}
                          transform={transform}
                          onTransformChange={setTransform}
                        />
                        {/* Tombol hapus */}
                        <button
                          className="absolute top-2 right-2 z-50 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full border-2 border-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFilledSlot(null);
                            setTransform({ scale: 1, x: 0, y: 0 });
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

                {filledSlot && (
                  <p className="text-xs text-gray-400 text-center mt-2 flex-shrink-0">
                    Scroll untuk zoom · Drag untuk geser
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-4 flex-shrink-0">
                  <BrutalistButton
                    onClick={handlePreview}
                    disabled={!filledSlot}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Lihat Preview
                  </BrutalistButton>
                  <BrutalistButton
                    onClick={handlePrint}
                    disabled={!filledSlot || printing}
                    size="sm"
                    className="w-full"
                  >
                    {printing ? "Mencetak..." : "Cetak Pas Foto"}
                  </BrutalistButton>
                </div>
              </div>

              {/* Info card */}
              <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
                <p className="text-sm font-bold text-gray-500 mb-1">
                  Ukuran Output
                </p>
                <p className="text-xl font-black">
                  {ratio?.label} —{" "}
                  <span className="font-mono text-base">
                    {ratio?.canvasW.toLocaleString()} ×{" "}
                    {ratio?.canvasH.toLocaleString()} px
                  </span>
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
              Pas foto {ratio?.label} berhasil dikirim ke printer.
            </p>
            <div className="flex gap-4">
              <BrutalistButton
                className="w-full"
                variant="outline"
                onClick={() => {
                  setSuccessOpen(false);
                  setFilledSlot(null);
                  setTransform({ scale: 1, x: 0, y: 0 });
                  setSelectedRatio(null);
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
