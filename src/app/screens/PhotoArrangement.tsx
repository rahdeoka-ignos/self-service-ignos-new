import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { BrutalistCard } from "../components/BrutalistCard";
import { BrutalistButton } from "../components/BrutalistButton";
import { Navigation } from "../components/Navigation";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { generatePrint } from "../../utils/print4r";
import { ButtonTemplate } from "../components/ButtonTemplate";
import { SlotImage } from "../components/SlotImage";
import { useTranslation } from "react-i18next";
import { useCountdownTimer } from "../../hooks/useCountdownTimer";
import { TimerExpiredModal } from "../components/TimerExpiredModal";
import { TimerBar } from "../components/TimerBar";

type Template = {
  background: string;
  overlay: string;
  layout:
    | "1"
    | "2"
    | "4"
    | "6"
    | "8"
    | "newspaper"
    | "wannabeyours"
    | "300days";
};

const FILTERS = [
  { id: "none", name: "Normal", style: "" },
  { id: "bw", name: "B&W", style: "grayscale(100%)" },
  { id: "sepia", name: "Sepia", style: "sepia(80%)" },
  { id: "vivid", name: "Vivid", style: "saturate(180%) contrast(110%)" },
  {
    id: "fade",
    name: "Fade",
    style: "brightness(110%) saturate(70%) contrast(90%)",
  },
  { id: "cool", name: "Cool", style: "hue-rotate(30deg) saturate(120%)" },
  {
    id: "warm",
    name: "Warm",
    style: "sepia(30%) saturate(150%) brightness(105%)",
  },
  {
    id: "dramatic",
    name: "Dramatic",
    style: "contrast(140%) brightness(90%) saturate(80%)",
  },
];

// ─── Layout 8 constants ───────────────────────────────
const L8_PRINT_W = 2400;
const L8_PRINT_H = 3600;
const L8_X0 = 61 * 2; // = 122
const L8_X1 = 661 * 2; // = 1322
const L8_Y0 = 274 * 2; // = 548
const L8_SLOT_W = 479 * 2; // = 958
const L8_SLOT_H = 339 * 2; // = 678
const L8_GAP_Y = 10 * 2; // = 20

// ─── Layout 6 constants (diukur dari background template, di-scale ke print canvas 2400×3600) ──
const L6_PRINT_W = 2400;
const L6_PRINT_H = 3600;
const L6_X0 = 129.6; // left edge kolom 1
const L6_Y0 = 315.0; // top edge baris 1
const L6_SLOT_W = 939.8; // lebar slot
const L6_SLOT_H = 743.4; // tinggi slot
const L6_X1 = 1334.1; // left edge kolom 2
const L6_GAP_Y = 149.4; // gap antar baris

// Posisi kolom 2 (mirror dari kanan)
// L6_X1 = 1334.1 → slot 2 mulai di x=1334.1 dalam print canvas

export function PhotoArrangement() {
  const location = useLocation();
  const navigate = useNavigate();

  const peopleCount = location.state?.peopleCount || 1;
  const joinedBonus = location.state?.joinedBonus || false;
  const { t } = useTranslation();

  let totalPrint = peopleCount;
  if (joinedBonus) {
    if (peopleCount <= 3) {
      totalPrint = peopleCount * 2;
    } else {
      totalPrint = peopleCount + 1;
    }
  }

  const templates: Template[] = location.state?.templates || [];
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [filledSlots, setFilledSlots] = useState<{
    [templateIndex: number]: { [slotNumber: number]: string };
  }>({});
  const [photoGallery, setPhotoGallery] = useState<
    { thumb: string; full: string }[]
  >([]);
  const [printing, setPrinting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [previewPhotoOpen, setPreviewPhotoOpen] = useState(false);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState<number>(0);
  const [countdown, setCountdown] = useState(10);
  const [activeFilters, setActiveFilters] = useState<{
    [templateIndex: number]: string;
  }>({});
  const timerDuration = location.state?.timerDuration ?? 20 * 60;
  const timer = useCountdownTimer(timerDuration);

  useEffect(() => {
    timer.start();
  }, []);

  // Helper untuk get filter aktif per template
  const activeFilter = activeFilters[activeTemplate] ?? "none";
  const setActiveFilter = (filterId: string) => {
    setActiveFilters((prev) => ({ ...prev, [activeTemplate]: filterId }));
  };

  useEffect(() => {
    const cached = sessionStorage.getItem("gallery");
    console.log(peopleCount);

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

  const activeLayout = templates[activeTemplate]?.layout || "4";
  const totalSlots =
    activeLayout === "1"
      ? 1
      : activeLayout === "2"
        ? 2
        : activeLayout === "4"
          ? 4
          : activeLayout === "8"
            ? 8
            : activeLayout === "newspaper"
              ? 1
              : activeLayout === "wannabeyours"
                ? 1
                : activeLayout === "300days"
                  ? 1
                  : 6;

  const preloadImage = (src: string) => {
    const img = new Image();
    img.src = src;
  };

  useEffect(() => {
    if (!successOpen) return;

    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSuccessOpen(false);
          navigate("/add-ons", {
            state: {
              peopleCount,
              joinedBonus,
              coupleMode: location.state?.coupleMode ?? false,
              totalPrint,
              templates: templates.map((tpl) => ({ layout: tpl.layout })),
            },
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [successOpen]);

  const handlePhotoClick = (photo: { thumb: string; full: string }) => {
    preloadImage(photo.full);
    const currentSlots = filledSlots[activeTemplate] || {};
    const emptySlot = Array.from({ length: totalSlots }, (_, i) => i + 1).find(
      (slotNum) => !currentSlots[slotNum],
    );
    if (emptySlot !== undefined) {
      setFilledSlots((prev) => ({
        ...prev,
        [activeTemplate]: {
          ...(prev[activeTemplate] || {}),
          [emptySlot]: photo.full,
        },
      }));
      setSelectedPhoto(null);
    } else {
      setSelectedPhoto((prev) => (prev === photo.full ? null : photo.full));
    }
  };

  const handleSlotClick = (slotNumber: number) => {
    if (!selectedPhoto) return;
    setFilledSlots((prev) => ({
      ...prev,
      [activeTemplate]: {
        ...(prev[activeTemplate] || {}),
        [slotNumber]: selectedPhoto,
      },
    }));
    setSelectedPhoto(null);
  };

  const slotRef = useRef<HTMLDivElement>(null);

  // Simpan ukuran slot per templateIndex
  const [uiSlotSizes, setUiSlotSizes] = useState<{
    [templateIndex: number]: { w: number; h: number };
  }>({});

  // Ukur slot setiap kali layout atau template aktif berubah
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (slotRef.current) {
        const rect = slotRef.current.getBoundingClientRect();
        setUiSlotSizes((prev) => ({
          ...prev,
          [activeTemplate]: { w: rect.width, h: rect.height },
        }));
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [activeTemplate, activeLayout, filledSlots]);

  const handleDragStart = (e: React.DragEvent, photoUrl: string) => {
    e.dataTransfer.setData("photoUrl", photoUrl);
  };

  const handleDrop = (e: React.DragEvent, slotNumber: number) => {
    e.preventDefault();
    const photoUrl = e.dataTransfer.getData("photoUrl");
    if (!photoUrl) return;
    setFilledSlots((prev) => ({
      ...prev,
      [activeTemplate]: {
        ...(prev[activeTemplate] || {}),
        [slotNumber]: photoUrl,
      },
    }));
  };

  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const [slotTransforms, setSlotTransforms] = useState<{
    [templateIndex: number]: {
      [slotNumber: number]: { scale: number; x: number; y: number };
    };
  }>({});

  const updateTransform = (
    templateIndex: number,
    slotNumber: number,
    scale: number,
    x: number,
    y: number,
  ) => {
    setSlotTransforms((prev) => ({
      ...prev,
      [templateIndex]: {
        ...(prev[templateIndex] || {}),
        [slotNumber]: { scale, x, y },
      },
    }));
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      for (let i = 0; i < templates.length; i++) {
        const slotSize = uiSlotSizes[i] || { w: 0, h: 0 };
        await generatePrint(filledSlots[i], {
          layout: templates[i].layout,
          background: templates[i].background,
          frameOverlay: templates[i].overlay,
          watermark: "IGNOS STUDIO",
          transforms: slotTransforms[i],
          uiSlotW: slotSize.w,
          uiSlotH: slotSize.h,
          filter:
            FILTERS.find((f) => f.id === (activeFilters[i] ?? "none"))?.style ||
            "",
        });
      }
      setPrinted(true);
      setSuccessOpen(true);
    } catch (err) {
      console.error("PRINT ERROR:", err);
      alert("Print failed");
    } finally {
      setPrinting(false);
    }
  };

  const handlePreviewPrint = async () => {
    try {
      const slotSize = uiSlotSizes[activeTemplate] || { w: 0, h: 0 };
      const url = await generatePrint(filledSlots[activeTemplate], {
        layout: templates[activeTemplate].layout,
        background: templates[activeTemplate].background,
        frameOverlay: templates[activeTemplate].overlay,
        watermark: "IGNOS STUDIO",
        preview: true,
        transforms: slotTransforms[activeTemplate],
        uiSlotW: slotSize.w,
        uiSlotH: slotSize.h,
        filter:
          FILTERS.find(
            (f) => f.id === (activeFilters[activeTemplate] ?? "none"),
          )?.style || "",
      });
      if (url) {
        setPreviewUrl(url);
        setPreviewOpen(true);
      }
    } catch (err) {
      console.error("PREVIEW ERROR:", err);
      alert("Preview failed");
    }
  };

  const canConfirm = templates.every((tpl, templateIndex) => {
    const slots =
      tpl.layout === "1"
        ? 1
        : tpl.layout === "2"
          ? 2
          : tpl.layout === "4"
            ? 4
            : tpl.layout === "8"
              ? 8
              : tpl.layout === "newspaper"
                ? 1
                : tpl.layout === "wannabeyours"
                  ? 1
                  : tpl.layout === "300days"
                    ? 1
                    : 6;
    return Object.keys(filledSlots[templateIndex] || {}).length === slots;
  });

  // Helper render slot isi — sama untuk semua layout
  const renderSlotContent = (slotNum: number) => {
    const slotSize = uiSlotSizes[activeTemplate];
    if (filledSlots[activeTemplate]?.[slotNum]) {
      return (
        <div
          key={`${activeTemplate}-${slotNum}`}
          className="relative w-full h-full group"
        >
          <SlotImage
            key={`slot-${activeTemplate}-${slotNum}-${uiSlotSizes[activeTemplate]?.w ?? 0}`}
            src={filledSlots[activeTemplate][slotNum]}
            slotW={slotSize?.w ?? 243}
            slotH={slotSize?.h ?? 328}
            transform={
              slotTransforms[activeTemplate]?.[slotNum] ?? {
                scale: 1,
                x: 0,
                y: 0,
              }
            }
            onTransformChange={(t) =>
              updateTransform(activeTemplate, slotNum, t.scale, t.x, t.y)
            }
            filter={FILTERS.find((f) => f.id === activeFilter)?.style || ""}
          />
          <button
            className="absolute top-1 right-1 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white shadow-lg cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setFilledSlots((prev) => {
                const updated = { ...(prev[activeTemplate] || {}) };
                delete updated[slotNum];
                return { ...prev, [activeTemplate]: updated };
              });
              setSlotTransforms((prev) => {
                const updated = { ...(prev[activeTemplate] || {}) };
                delete updated[slotNum];
                return { ...prev, [activeTemplate]: updated };
              });
            }}
          >
            ✕
          </button>
        </div>
      );
    }
    return (
      <div className="h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
        <div className="text-8xl font-bold mb-2">{slotNum}</div>
        <p className="text-xl font-bold">
          {selectedPhoto ? "Click to place" : "Empty Slot"}
        </p>
      </div>
    );
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-100 flex flex-col">
      <TimerBar
        minutes={timer.minutes}
        seconds={timer.seconds}
        timeLeft={timer.timeLeft}
      />

      {timer.isExpired && (
        <TimerExpiredModal
          onContinue={() => {
            // optional: auto-confirm print jika canConfirm
            setConfirmOpen(true);
          }}
        />
      )}
      <Navigation currentStep={4} totalSteps={5} />

      <div className="pt-32 px-8 flex-1 overflow-hidden">
        <div className="w-full mx-auto h-full flex flex-col">
          <div className="my-5">
            <h1 className="text-6xl font-bold mb-4 text-center">
              {t("photoArrange.title")}
            </h1>
            <p className="text-2xl text-center mb-8 text-gray-700">
              {t("photoArrange.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-12 gap-8 flex-1 overflow-hidden mb-5">
            {/* LEFT SIDE - Photo Gallery */}
            <div className="col-span-8 h-full">
              <BrutalistCard className="p-6">
                <h2 className="text-3xl font-bold mb-6">
                  {t("photoArrange.gallery")}
                </h2>
                <div className="grid grid-cols-5 gap-4 max-h-[995px] overflow-y-auto pr-2">
                  {photoGallery.map((photo, index) => (
                    <BrutalistCard
                      key={index}
                      interactive
                      draggable
                      onDragStart={(e) => handleDragStart(e, photo.full)}
                      onClick={() => handlePhotoClick(photo)}
                      className="p-0 overflow-hidden cursor-pointer group"
                    >
                      <ImageWithFallback
                        src={photo.thumb}
                        alt={`Photo ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                        style={{ imageRendering: "auto" }}
                      />
                      <button
                        className="absolute top-2 right-2 z-50 bg-white text-black text-base font-bold px-5 py-2 rounded-lg border-2 border-black opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black hover:text-white cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewPhotoIndex(index);
                          setPreviewPhotoUrl(photo.full);
                          setPreviewPhotoOpen(true);
                        }}
                      >
                        Preview
                      </button>
                    </BrutalistCard>
                  ))}
                </div>
              </BrutalistCard>
            </div>

            {/* RIGHT SIDE - Template Preview with Slots */}
            <BrutalistCard className="col-span-3 pb-5 flex flex-col overflow-hidden h-[77dvh]">
              <div className="px-6">
                <h2 className="text-3xl font-bold my-2">
                  {t("photoArrange.templateLayout")}
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {templates.map((tpl, index) => {
                    const isActive = activeTemplate === index;
                    return (
                      <ButtonTemplate
                        key={index}
                        onClick={() => setActiveTemplate(index)}
                        className={`text-lg px-4 py-2 whitespace-nowrap border-4 border-black transition-all cursor-pointer
                          ${isActive ? "bg-black text-white border-8" : "bg-transparent !text-black hover:bg-black hover:!text-white"}`}
                      >
                        Cetak {index + 1}
                      </ButtonTemplate>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mt-8">
                <div className="px-6 mt-2">
                  <div className="relative aspect-[2/3] w-full max-w-xl rounded-2xl border-4 border-black overflow-hidden">
                    {/* TEMPLATE BACKGROUND */}
                    <img
                      src={templates[activeTemplate]?.background}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    />

                    {/* SLOT AREA */}

                    {/* ── Layout 1 ── */}
                    {activeLayout === "1" && (
                      <div
                        className="absolute inset-0 z-10"
                        style={{
                          paddingTop: `${(41 / 1600) * 100}%`,
                          paddingBottom: `${((1600 - 41 - 1320) / 1600) * 100}%`,
                          paddingLeft: `${(36 / 1066) * 100}%`,
                          paddingRight: `${(36 / 1066) * 100}%`,
                        }}
                      >
                        <div
                          className="w-full"
                          style={{ aspectRatio: "994/1320" }}
                          ref={slotRef}
                        >
                          <BrutalistCard
                            interactive
                            onClick={() => handleSlotClick(1)}
                            onDrop={(e) => handleDrop(e, 1)}
                            onDragOver={allowDrop}
                            className={`w-full h-full p-0 overflow-hidden shadow-none !border-0 ${
                              selectedPhoto ? "cursor-pointer" : ""
                            }`}
                          >
                            {renderSlotContent(1)}
                          </BrutalistCard>
                        </div>
                      </div>
                    )}

                    {/* ── Layout 4 ── */}
                    {activeLayout === "4" && (
                      <div
                        className="absolute inset-0 z-10"
                        style={{
                          paddingTop: `${(41 / 1600) * 100}%`,
                          paddingBottom: `${((1600 - 41 - 652 * 2 - 26) / 1600) * 100}%`,
                          paddingLeft: `${(36 / 1066) * 100}%`,
                          paddingRight: `${(36 / 1066) * 100}%`,
                        }}
                      >
                        <div
                          className="grid grid-cols-2"
                          style={{
                            gap: `${(26 / 1600) * 100}% ${(26 / 1066) * 100}%`,
                          }}
                        >
                          {Array.from({ length: 4 }, (_, i) => i + 1).map(
                            (slotNum) => (
                              <div
                                key={slotNum}
                                ref={slotNum === 1 ? slotRef : undefined}
                                className="w-full"
                                style={{ aspectRatio: "484/652" }}
                              >
                                <BrutalistCard
                                  interactive
                                  onClick={() => handleSlotClick(slotNum)}
                                  onDrop={(e) => handleDrop(e, slotNum)}
                                  onDragOver={allowDrop}
                                  className={`w-full h-full p-0 overflow-hidden shadow-none !border-0 ${
                                    selectedPhoto ? "cursor-pointer" : ""
                                  }`}
                                >
                                  {renderSlotContent(slotNum)}
                                </BrutalistCard>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Layout 2 ── */}
                    {activeLayout === "2" && (
                      <div
                        className="absolute inset-0 z-10"
                        style={{
                          paddingTop: `${(41 / 1600) * 100}%`,
                          paddingBottom: `${((1600 - 41 - 652 * 2 - 26) / 1600) * 100}%`,
                          paddingLeft: `${(36 / 1066) * 100}%`,
                          paddingRight: `${(36 / 1066) * 100}%`,
                        }}
                      >
                        <div
                          className="grid grid-cols-1"
                          style={{
                            gap: `${(26 / 1600) * 100}%`,
                          }}
                        >
                          {[1, 2].map((slotNum) => (
                            <div
                              key={slotNum}
                              ref={slotNum === 1 ? slotRef : undefined}
                              className="w-full"
                              style={{ aspectRatio: "994/652" }}
                            >
                              <BrutalistCard
                                interactive
                                onClick={() => handleSlotClick(slotNum)}
                                onDrop={(e) => handleDrop(e, slotNum)}
                                onDragOver={allowDrop}
                                className={`w-full h-full p-0 overflow-hidden shadow-none !border-0 ${
                                  selectedPhoto ? "cursor-pointer" : ""
                                }`}
                              >
                                {renderSlotContent(slotNum)}
                              </BrutalistCard>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Layout 6: 2 kolom × 3 baris (absolute positioning) ── */}
                    {activeLayout === "6" && (
                      <div className="absolute inset-0 z-10">
                        {Array.from({ length: 6 }, (_, i) => i + 1).map(
                          (slotNum) => {
                            const row = Math.floor((slotNum - 1) / 2); // 0, 1, 2
                            const col = (slotNum - 1) % 2; // 0, 1

                            const colXs = [L6_X0, L6_X1];
                            const leftPct = (colXs[col] / L6_PRINT_W) * 100;
                            const topPct =
                              ((L6_Y0 + row * (L6_SLOT_H + L6_GAP_Y)) /
                                L6_PRINT_H) *
                              100;
                            const widthPct = (L6_SLOT_W / L6_PRINT_W) * 100;
                            const heightPct = (L6_SLOT_H / L6_PRINT_H) * 100;

                            return (
                              <div
                                key={slotNum}
                                ref={slotNum === 1 ? slotRef : undefined}
                                className="absolute"
                                style={{
                                  left: `${leftPct}%`,
                                  top: `${topPct}%`,
                                  width: `${widthPct}%`,
                                  height: `${heightPct}%`,
                                }}
                              >
                                <BrutalistCard
                                  interactive
                                  onClick={() => handleSlotClick(slotNum)}
                                  onDrop={(e) => handleDrop(e, slotNum)}
                                  onDragOver={allowDrop}
                                  className={`w-full h-full p-0 overflow-hidden shadow-none !border-0 !border-transparent !rounded-none ${
                                    selectedPhoto ? "cursor-pointer" : ""
                                  }`}
                                >
                                  {renderSlotContent(slotNum)}
                                </BrutalistCard>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}

                    {/* ── Layout 8: 2 kolom × 4 baris ── */}
                    {activeLayout === "8" && (
                      <div className="absolute inset-0 z-10">
                        {Array.from({ length: 8 }, (_, i) => i + 1).map(
                          (slotNum) => {
                            const row = Math.floor((slotNum - 1) / 2); // 0,1,2,3
                            const col = (slotNum - 1) % 2; // 0,1

                            const colXs = [L8_X0, L8_X1];
                            const leftPct = (colXs[col] / L8_PRINT_W) * 100;
                            const topPct =
                              ((L8_Y0 + row * (L8_SLOT_H + L8_GAP_Y)) /
                                L8_PRINT_H) *
                              100;
                            const widthPct = (L8_SLOT_W / L8_PRINT_W) * 100;
                            const heightPct = (L8_SLOT_H / L8_PRINT_H) * 100;

                            return (
                              <div
                                key={slotNum}
                                ref={slotNum === 1 ? slotRef : undefined}
                                className="absolute"
                                style={{
                                  left: `${leftPct}%`,
                                  top: `${topPct}%`,
                                  width: `${widthPct}%`,
                                  height: `${heightPct}%`,
                                }}
                              >
                                <BrutalistCard
                                  interactive
                                  onClick={() => handleSlotClick(slotNum)}
                                  onDrop={(e) => handleDrop(e, slotNum)}
                                  onDragOver={allowDrop}
                                  className={`w-full h-full p-0 overflow-hidden shadow-none !border-0 !border-transparent !rounded-none transition-all! hover:translate-x-0! hover:translate-y-0! active:translate-x-0! active:translate-y-0! ${
                                    selectedPhoto ? "cursor-pointer" : ""
                                  }`}
                                >
                                  {renderSlotContent(slotNum)}
                                </BrutalistCard>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}

                    {/* ── Layout Newspaper: 1 slot landscape ── */}
                    {activeLayout === "newspaper" && (
                      <div
                        className="absolute z-10"
                        ref={slotRef}
                        style={{
                          left: `${(82 / 2400) * 100}%`,
                          top: `${(874 / 3600) * 100}%`,
                          width: `${(2238 / 2400) * 100}%`,
                          height: `${(1136 / 3600) * 100}%`,
                        }}
                      >
                        <BrutalistCard
                          interactive
                          onClick={() => handleSlotClick(1)}
                          onDrop={(e) => handleDrop(e, 1)}
                          onDragOver={allowDrop}
                          className={`w-full h-full p-0 overflow-hidden shadow-none !border-0 !rounded-none ${
                            selectedPhoto ? "cursor-pointer" : ""
                          }`}
                        >
                          {renderSlotContent(1)}
                        </BrutalistCard>
                      </div>
                    )}

                    {activeLayout === "wannabeyours" && (
                      <div
                        className="absolute z-10"
                        ref={slotRef}
                        style={{
                          left: `${((426 * 2) / 2400) * 100}%`,
                          top: `${((425 * 2) / 3600) * 100}%`,
                          width: `${(1508 / 2400) * 100}%`,
                          height: `${(1520 / 3600) * 100}%`,
                        }}
                      >
                        <BrutalistCard
                          interactive
                          onClick={() => handleSlotClick(1)}
                          onDrop={(e) => handleDrop(e, 1)}
                          onDragOver={allowDrop}
                          className={`w-full h-full p-0 overflow-hidden shadow-none !border-0 !rounded-none ${
                            selectedPhoto ? "cursor-pointer" : ""
                          }`}
                        >
                          {renderSlotContent(1)}
                        </BrutalistCard>
                      </div>
                    )}

                    {activeLayout === "300days" && (
                      <div
                        className="absolute z-10"
                        ref={slotRef}
                        style={{
                          left: `${((20 * 2) / 2400) * 100}%`,
                          top: `${((684 * 2) / 3600) * 100}%`,
                          width: `${((1160 * 2) / 2400) * 100}%`,
                          height: `${((488 * 2) / 3600) * 100}%`,
                        }}
                      >
                        <BrutalistCard
                          interactive
                          onClick={() => handleSlotClick(1)}
                          onDrop={(e) => handleDrop(e, 1)}
                          onDragOver={allowDrop}
                          className={`w-full h-full p-0 overflow-hidden shadow-none !border-0 !rounded-none ${
                            selectedPhoto ? "cursor-pointer" : ""
                          }`}
                        >
                          {renderSlotContent(1)}
                        </BrutalistCard>
                      </div>
                    )}
                    {/* TEMPLATE OVERLAY */}
                    <img
                      src={templates[activeTemplate]?.overlay}
                      className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none"
                    />
                  </div>

                  <div className="mt-12 space-y-4">
                    <div className="flex gap-x-4 w-full">
                      <BrutalistButton
                        onClick={handlePreviewPrint}
                        disabled={!canConfirm}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        {t("photoArrange.actions.previewPrint")}
                      </BrutalistButton>
                      <BrutalistButton
                        onClick={
                          printed
                            ? () => navigate("/add-ons")
                            : () => setConfirmOpen(true)
                        }
                        disabled={!canConfirm || printing}
                        size="sm"
                        className="w-full"
                      >
                        {printing
                          ? t("photoArrange.actions.generating")
                          : printed
                            ? t("photoArrange.actions.next")
                            : t("photoArrange.actions.finishPrint")}
                      </BrutalistButton>
                    </div>
                  </div>
                </div>
              </div>
            </BrutalistCard>
            <div className="col-span-1 h-[77dvh] overflow-hidden">
              <BrutalistCard className="p-4 h-full overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">
                  {t("photoArrange.filter")}
                </h2>
                <div className="flex flex-col gap-3">
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveFilter(filter.id)}
                      className={`w-full border-4 border-black rounded-xl overflow-hidden transition-all cursor-pointer ${
                        activeFilter === filter.id
                          ? "border-8 scale-95"
                          : "hover:scale-105"
                      }`}
                    >
                      {/* Preview thumbnail pakai foto pertama di gallery */}
                      <div className="w-full aspect-square overflow-hidden">
                        {photoGallery[0] ? (
                          <img
                            src={photoGallery[0].thumb}
                            className="w-full h-full object-cover"
                            style={{ filter: filter.style }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200" />
                        )}
                      </div>
                      <div
                        className={`py-2 text-sm font-bold ${activeFilter === filter.id ? "bg-black text-white" : "bg-white text-black"}`}
                      >
                        {filter.name}
                      </div>
                    </button>
                  ))}
                </div>
              </BrutalistCard>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Preview Gambar dari Gallery */}
      {previewPhotoOpen && previewPhotoUrl && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setPreviewPhotoOpen(false)}
        >
          <div
            className="bg-white p-6 rounded-xl border-4 border-black max-w-3xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-3xl font-bold mb-4 text-center">
              Preview Gambar ({previewPhotoIndex + 1} / {photoGallery.length})
            </h2>

            <img
              src={previewPhotoUrl}
              className="w-full rounded-lg border-4 border-black aspect-[4/6]"
            />

            {/* Prev / Next */}
            <div className="flex gap-4 mt-4">
              <BrutalistButton
                className="w-full"
                variant="outline"
                disabled={previewPhotoIndex === 0}
                onClick={() => {
                  const newIndex = previewPhotoIndex - 1;
                  setPreviewPhotoIndex(newIndex);
                  setPreviewPhotoUrl(photoGallery[newIndex].full);
                }}
              >
                ← Previous
              </BrutalistButton>
              <BrutalistButton
                className="w-full"
                variant="outline"
                disabled={previewPhotoIndex === photoGallery.length - 1}
                onClick={() => {
                  const newIndex = previewPhotoIndex + 1;
                  setPreviewPhotoIndex(newIndex);
                  setPreviewPhotoUrl(photoGallery[newIndex].full);
                }}
              >
                Next →
              </BrutalistButton>
            </div>

            <div className="flex gap-4 mt-4">
              <BrutalistButton
                className="w-full"
                variant="outline"
                onClick={() => setPreviewPhotoOpen(false)}
              >
                Tutup
              </BrutalistButton>
              <BrutalistButton
                className="w-full"
                onClick={() => {
                  handlePhotoClick({
                    thumb: previewPhotoUrl,
                    full: previewPhotoUrl,
                  });
                  setPreviewPhotoOpen(false);
                }}
              >
                Pilih Foto Ini
              </BrutalistButton>
            </div>
          </div>
        </div>
      )}

      {previewOpen && previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl border-4 border-black max-w-2xl w-full">
            <h2 className="text-3xl font-bold mb-4 text-center">
              {t("photoArrange.printPreview.title")}
            </h2>
            <img
              src={previewUrl}
              className="w-full rounded-lg border-4 border-black"
            />
            <div className="flex gap-4 mt-6">
              <BrutalistButton
                className="w-full"
                onClick={() => setPreviewOpen(false)}
              >
                {t("photoArrange.printPreview.close")}
              </BrutalistButton>
            </div>
          </div>
        </div>
      )}

      {successOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl border-4 border-black max-w-md w-full text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-2">
              {t("photoArrange.success.title")}
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              {t("photoArrange.success.description")}
            </p>

            {/* Countdown ring */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-20 h-20">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="black"
                    strokeWidth="3"
                    strokeDasharray="100"
                    strokeDashoffset={100 - (countdown / 10) * 100}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold">
                  {countdown}
                </div>
              </div>
            </div>

            <p className="text-lg text-gray-500 mb-4">
              {t("photoArrange.success.autoNext").replace(
                "{{count}}",
                countdown.toString(),
              )}
            </p>

            <BrutalistButton
              className="w-full"
              onClick={() => {
                setSuccessOpen(false);
                navigate("/add-ons", {
                  state: {
                    peopleCount,
                    joinedBonus,
                    coupleMode: location.state?.coupleMode ?? false,
                    totalPrint,
                    templates: templates.map((tpl) => ({ layout: tpl.layout })),
                  },
                });
              }}
            >
              Next →
            </BrutalistButton>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl border-4 border-black max-w-3xl w-full">
            <h2 className="text-3xl font-bold mb-2 text-center">
              {t("photoArrange.confirm.title")}
            </h2>
            <p className="text-xl text-gray-600 mb-6 text-center">
              {t("photoArrange.confirm.description")}
            </p>
            <div className="flex gap-4">
              <BrutalistButton
                className="w-full"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
              >
                {t("photoArrange.confirm.cancel")}
              </BrutalistButton>
              <BrutalistButton
                className="w-full"
                onClick={() => {
                  setConfirmOpen(false);
                  handlePrint();
                }}
              >
                {t("photoArrange.confirm.confirm")}
              </BrutalistButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
