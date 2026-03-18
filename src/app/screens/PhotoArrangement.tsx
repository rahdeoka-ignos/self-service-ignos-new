import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { BrutalistCard } from "../components/BrutalistCard";
import { BrutalistButton } from "../components/BrutalistButton";
import { Navigation } from "../components/Navigation";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Check } from "lucide-react";
import { generatePrint } from "../../utils/print4r";
import { ButtonTemplate } from "../components/ButtonTemplate";
import { SlotImage } from "../components/SlotImage";

type Template = {
  background: string;
  overlay: string;
  layout: "1" | "2" | "4" | "6";
};

export function PhotoArrangement() {
  const location = useLocation();
  const navigate = useNavigate();

  const peopleCount = location.state?.peopleCount || 1;
  const joinedBonus = location.state?.joinedBonus || false;

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

  const activeLayout = templates[activeTemplate]?.layout || "4";
  const totalSlots =
    activeLayout === "1"
      ? 1
      : activeLayout === "2"
        ? 2
        : activeLayout === "4"
          ? 4
          : 6;

  const preloadImage = (src: string) => {
    const img = new Image();
    img.src = src;
  };

  const handlePhotoClick = (photo: { thumb: string; full: string }) => {
    preloadImage(photo.full);
    const currentSlots = filledSlots[activeTemplate] || {};
    const emptySlot = Array.from({ length: totalSlots }, (_, i) => i + 1).find(
      (slotNum) => !currentSlots[slotNum],
    );
    if (emptySlot !== undefined) {
      // Masih ada slot kosong → langsung isi, tidak perlu selectedPhoto
      setFilledSlots((prev) => ({
        ...prev,
        [activeTemplate]: {
          ...(prev[activeTemplate] || {}),
          [emptySlot]: photo.full,
        },
      }));
      setSelectedPhoto(null); // ← pastikan tidak ada yang selected
    } else {
      // Semua slot penuh → mode manual, highlight foto yang dipilih
      setSelectedPhoto(
        (prev) => (prev === photo.full ? null : photo.full), // ← toggle: klik lagi = deselect
      );
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
            : 6;
    return Object.keys(filledSlots[templateIndex] || {}).length === slots;
  });

  // Helper render slot isi — sama untuk semua layout
  const renderSlotContent = (slotNum: number) => {
    const slotSize = uiSlotSizes[activeTemplate];
    if (filledSlots[activeTemplate]?.[slotNum]) {
      return (
        <div className="relative w-full h-full group">
          <SlotImage
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
      <Navigation currentStep={4} totalSteps={5} />

      <div className="pt-32 px-8 flex-1 overflow-hidden">
        <div className="w-full mx-auto h-full flex flex-col">
          <div className="my-5">
            <h1 className="text-6xl font-bold mb-4 text-center">
              Arrange Your Photos
            </h1>
            <p className="text-2xl text-center mb-8 text-gray-700">
              Select a photo from the gallery and click on a slot to place it
            </p>
          </div>

          <div className="grid grid-cols-12 gap-8 flex-1 overflow-hidden mb-5">
            {/* LEFT SIDE - Photo Gallery */}
            <div className="col-span-9 h-full">
              <BrutalistCard className="p-6">
                <h2 className="text-3xl font-bold mb-6">Photo Gallery</h2>
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
            <BrutalistCard className="col-span-3 h-fit pb-5 flex flex-col overflow-hidden">
              <div className="px-6">
                <h2 className="text-3xl font-bold my-2">Template Layout</h2>
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
                        Template {index + 1}
                      </ButtonTemplate>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
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
                            className={`w-full h-full p-0 overflow-hidden shadow-none border-0 ${
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
                                  className={`w-full h-full p-0 overflow-hidden shadow-none border-0 ${
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
                                className={`w-full h-full p-0 overflow-hidden shadow-none border-0 ${
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

                    {/* ── Layout 6 ── */}
                    {activeLayout === "6" && (
                      <div
                        className="absolute inset-0 z-10"
                        style={{
                          paddingTop: `${(41 / 1600) * 100}%`,
                          paddingBottom: `${((1600 - 41 - 430 * 2 - 26) / 1600) * 100}%`,
                          paddingLeft: `${(36 / 1066) * 100}%`,
                          paddingRight: `${(36 / 1066) * 100}%`,
                        }}
                      >
                        <div
                          className="grid grid-cols-3"
                          style={{
                            gap: `${(26 / 1600) * 100}% ${(26 / 1066) * 100}%`,
                          }}
                        >
                          {Array.from({ length: 6 }, (_, i) => i + 1).map(
                            (slotNum) => (
                              <div
                                key={slotNum}
                                ref={slotNum === 1 ? slotRef : undefined}
                                className="w-full"
                                style={{ aspectRatio: "317/430" }}
                              >
                                <BrutalistCard
                                  interactive
                                  onClick={() => handleSlotClick(slotNum)}
                                  onDrop={(e) => handleDrop(e, slotNum)}
                                  onDragOver={allowDrop}
                                  className={`w-full h-full p-0 overflow-hidden shadow-none border-0 ${
                                    selectedPhoto ? "cursor-pointer " : ""
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

                    {/* TEMPLATE OVERLAY */}
                    <img
                      src={templates[activeTemplate]?.overlay}
                      className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none"
                    />
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="flex gap-x-4 w-full">
                      <BrutalistButton
                        onClick={handlePreviewPrint}
                        disabled={!canConfirm}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        Lihat Preview Cetak
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
                          ? "Generating Print..."
                          : printed
                            ? "Next →"
                            : "Selesaikan dan Cetak!"}
                      </BrutalistButton>
                    </div>
                  </div>
                </div>
              </div>
            </BrutalistCard>
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
              Print Preview
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
                Close
              </BrutalistButton>
            </div>
          </div>
        </div>
      )}

      {successOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl border-4 border-black max-w-md w-full text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-2">Print Berhasil!</h2>
            <p className="text-xl text-gray-600 mb-6">
              Semua foto berhasil disimpan dan siap dicetak.
            </p>
            <BrutalistButton
              className="w-full"
              onClick={() => {
                setSuccessOpen(false);
                navigate("/add-ons");
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
              Konfirmasi Cetak
            </h2>
            <p className="text-xl text-gray-600 mb-6 text-center">
              Apakah kamu sudah yakin dengan susunan foto ini? Foto akan
              langsung dicetak.
            </p>
            <div className="flex gap-4">
              <BrutalistButton
                className="w-full"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
              >
                Belum, kembali
              </BrutalistButton>
              <BrutalistButton
                className="w-full"
                onClick={() => {
                  setConfirmOpen(false);
                  handlePrint();
                }}
              >
                Yakin, Cetak!
              </BrutalistButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
