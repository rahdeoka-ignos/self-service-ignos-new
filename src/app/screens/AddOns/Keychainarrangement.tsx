import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { BrutalistCard } from "../../components/BrutalistCard";
import { BrutalistButton } from "../../components/BrutalistButton";
import { Navigation } from "../../components/Navigation";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { SlotImage } from "../../components/SlotImage";
import type { KeychainOrder } from "./Keychainoptions";
import { generatePrintKeychain } from "../../../utils/printKeychain";

// Expand orders jadi flat list slot
// Misal: Kotak Plastik x2, Oval Metal x1 → [KotakPlastik-0, KotakPlastik-1, OvalMetal-0]
type SlotItem = {
  orderId: string;
  orderName: string;
  orderImage: string;
  slotIndex: number; // index dalam order qty
  globalIndex: number; // index global semua slot
};

export function KeychainArrangement() {
  const location = useLocation();
  const navigate = useNavigate();

  const orders: KeychainOrder[] = location.state?.orders || [];

  // Flatten semua slot
  const slots: SlotItem[] = [];
  let globalIndex = 0;
  for (const order of orders) {
    for (let i = 0; i < order.qty; i++) {
      slots.push({
        orderId: order.id,
        orderName: order.name,
        orderImage: order.image,
        slotIndex: i,
        globalIndex: globalIndex++,
      });
    }
  }

  const [photoGallery, setPhotoGallery] = useState<
    { thumb: string; full: string }[]
  >([]);
  const [filledSlots, setFilledSlots] = useState<{
    [globalIndex: number]: string;
  }>({});
  const [transforms, setTransforms] = useState<{
    [globalIndex: number]: { scale: number; x: number; y: number };
  }>({});
  const [activeSlot, setActiveSlot] = useState(0);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [previewPhotoOpen, setPreviewPhotoOpen] = useState(false);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const slotRef = useRef<HTMLDivElement>(null);
  const [uiSlotSize, setUiSlotSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const activeSlotItem = slots[activeSlot];

  useLayoutEffect(() => {
    const measure = () => {
      if (slotRef.current) {
        const rect = slotRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setUiSlotSize({ w: rect.width, h: rect.height });
        }
      }
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeSlot, filledSlots, activeSlotItem?.orderId]);

  useEffect(() => {
    if (!successOpen) return;
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSuccessOpen(false);
          navigate("/add-ons");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [successOpen]);

  const handlePhotoClick = (photo: { thumb: string; full: string }) => {
    // Cari slot kosong pertama
    const emptySlot = slots.find((s) => !filledSlots[s.globalIndex]);
    if (emptySlot !== undefined) {
      setFilledSlots((prev) => ({
        ...prev,
        [emptySlot.globalIndex]: photo.full,
      }));
    } else {
      // Ganti slot aktif
      setFilledSlots((prev) => ({ ...prev, [activeSlot]: photo.full }));
      setTransforms((prev) => {
        const updated = { ...prev };
        delete updated[activeSlot];
        return updated;
      });
    }
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      for (const slot of slots) {
        if (!filledSlots[slot.globalIndex]) continue;
        const isKotakPlastik = slot.orderId === "kotak-plastik";
        const effectiveSlotH = isKotakPlastik
          ? (uiSlotSize?.h ?? 0) * 0.92
          : uiSlotSize?.h;
        await generatePrintKeychain(filledSlots[slot.globalIndex], {
          transform: transforms[slot.globalIndex],
          uiSlotW: uiSlotSize?.w,
          uiSlotH: effectiveSlotH,
          keychainType: slot.orderId,
        });
      }
      setSuccessOpen(true);
    } catch (err) {
      console.error("PRINT ERROR:", err);
      alert("Print failed");
    } finally {
      setPrinting(false);
    }
  };

  const getSlotAspectRatio = (orderId: string) => {
    switch (orderId) {
      case "kotak-plastik":
        return "633/1023"; // 2.68:4.33
      default:
        return "1/1"; // square untuk metal dll
    }
  };

  const canConfirm = slots.every((s) => filledSlots[s.globalIndex]);

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-100 flex flex-col">
      <Navigation currentStep={4} totalSteps={5} />

      <div className="pt-32 px-8 flex-1 overflow-hidden">
        <div className="w-full mx-auto h-full flex flex-col">
          <div className="my-5">
            <h1 className="text-6xl font-bold mb-2 text-center">
              Susun Foto Gantungan Kunci
            </h1>
            <p className="text-2xl text-center text-gray-700">
              Pilih foto untuk setiap gantungan kunci
            </p>
          </div>

          <div className="grid grid-cols-12 gap-8 flex-1 min-h-0 overflow-hidden mb-5">
            {/* LEFT - Gallery */}
            <div className="col-span-8 h-[80dvh] min-h-0">
              <BrutalistCard className="p-6 h-full flex flex-col overflow-y-auto">
                <h2 className="text-3xl font-bold mb-6 ">
                  Photo Gallery
                </h2>
                <div className="grid grid-cols-5 gap-4 flex-1 min-h-0 overflow-y-auto pr-2">
                  {photoGallery.map((photo, index) => (
                    <BrutalistCard
                      key={index}
                      interactive
                      onClick={() => handlePhotoClick(photo)}
                      className="p-0 h-full cursor-pointer group"
                    >
                      <ImageWithFallback
                        src={photo.thumb}
                        alt={`Photo ${index + 1}`}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                      <button
                        className="absolute top-2 right-2 z-50 bg-white text-black text-base font-bold px-3 py-1 rounded-lg border-2 border-black opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black hover:text-white cursor-pointer"
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

            {/* RIGHT - Keychain Slots */}
            <div className="col-span-4 h-[80dvh] flex flex-col gap-4 overflow-hidden">
              {/* Slot tabs */}
              <BrutalistCard className="p-4 flex-shrink-0">
                <h2 className="text-xl font-bold mb-3">Pilih Slot</h2>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {slots.map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSlot(idx)}
                      className={`px-3 py-2 border-4 border-black font-bold text-base cursor-pointer transition-all flex items-center gap-2 ${
                        activeSlot === idx
                          ? "bg-black text-white"
                          : filledSlots[slot.globalIndex]
                            ? "bg-gray-200 text-black"
                            : "bg-white text-black hover:bg-black hover:text-white"
                      }`}
                    >
                      {filledSlots[slot.globalIndex] ? "✓" : ""}
                      <span className="text-sm">{slot.orderName}</span>
                      <span className="text-xs font-normal">
                        #{slot.slotIndex + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </BrutalistCard>

              {/* Active slot preview */}
              <BrutalistCard className="p-4 flex flex-col flex-1 overflow-hidden">
                {activeSlotItem && (
                  <>
                    <div className="flex items-center gap-3 mb-3 flex-shrink-0">
                      <img
                        src={activeSlotItem.orderImage}
                        className="w-12 h-12 object-cover border-2 border-black rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/48x48/e5e7eb/6b7280?text=?";
                        }}
                      />
                      <div>
                        <h2 className="text-xl  font-bold">
                          {activeSlotItem.orderName}
                        </h2>
                        {slots.filter(
                          (s) => s.orderId === activeSlotItem.orderId,
                        ).length > 1 && (
                          <p className="text-gray-500">
                            #{activeSlotItem.slotIndex + 1} dari{" "}
                            {
                              slots.filter(
                                (s) => s.orderId === activeSlotItem.orderId,
                              ).length
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Foto slot — square karena keychain */}
                    <div className="flex-1 flex items-center justify-center overflow-hidden min-h-0">
                      <div
                        ref={slotRef}
                        className="relative border-4 border-black rounded-xl overflow-hidden bg-white shadow-lg group"
                        style={{
                          aspectRatio: getSlotAspectRatio(
                            activeSlotItem.orderId,
                          ),
                          height: "100%",
                          maxHeight: "100%",
                          width: "auto",
                          maxWidth: "100%",
                          containerType: "inline-size",
                        }}
                      >
                        {filledSlots[activeSlotItem.globalIndex] ? (
                          <>
                            {/* Area foto: 85% tinggi untuk kotak-plastik */}
                            <div
                              className="relative overflow-hidden"
                              style={{
                                height:
                                  activeSlotItem.orderId === "kotak-plastik"
                                    ? "92%"
                                    : "100%",
                                width: "100%",
                              }}
                            >
                              <SlotImage
                                key={`kc-${activeSlotItem.globalIndex}-${filledSlots[activeSlotItem.globalIndex]}-${uiSlotSize?.w ?? 0}`}
                                src={filledSlots[activeSlotItem.globalIndex]}
                                slotW={uiSlotSize?.w || 300}
                                slotH={
                                  activeSlotItem.orderId === "kotak-plastik"
                                    ? (uiSlotSize?.h ?? 300) * 0.92
                                    : uiSlotSize?.h || 300
                                }
                                transform={
                                  transforms[activeSlotItem.globalIndex] ?? {
                                    scale: 1,
                                    x: 0,
                                    y: 0,
                                  }
                                }
                                onTransformChange={(t) =>
                                  setTransforms((prev) => ({
                                    ...prev,
                                    [activeSlotItem.globalIndex]: t,
                                  }))
                                }
                              />
                              {/* Tombol delete */}
                              <button
                                className="absolute top-1 right-1 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-2 border-white shadow-lg cursor-pointer"
                                onClick={() => {
                                  setFilledSlots((prev) => {
                                    const updated = { ...prev };
                                    delete updated[activeSlotItem.globalIndex];
                                    return updated;
                                  });
                                  setTransforms((prev) => {
                                    const updated = { ...prev };
                                    delete updated[activeSlotItem.globalIndex];
                                    return updated;
                                  });
                                }}
                              >
                                ✕
                              </button>
                            </div>

                            {/* Area teks IGNOS STUDIO — hanya untuk kotak-plastik */}
                            {activeSlotItem.orderId === "kotak-plastik" && (
                              <div
                                className="flex items-center justify-center border-t-2 border-black bg-white"
                                style={{ height: "8%" }}
                              >
                                <span
                                  className="font-black text-black tracking-tight"
                                  style={{
                                    fontSize: "clamp(70px, 2.5cqw, 14px)",
                                  }}
                                >
                                  IGNOS STUDIO
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                            <div className="text-5xl mb-2">📷</div>
                            <p className="text-lg font-bold text-center px-4">
                              Klik foto untuk menempatkan
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Progress & Tombol */}
                {/* Progress & Tombol */}
                <div className="mt-4 flex-shrink-0">
                  <p className="text-lg text-gray-600 mb-3">
                    {Object.keys(filledSlots).length} / {slots.length} foto
                    terisi
                  </p>
                  <div className="flex gap-3">
                    <BrutalistButton
                      onClick={async () => {
                        if (!filledSlots[activeSlotItem.globalIndex]) return;
                        const isKotakPlastik =
                          activeSlotItem.orderId === "kotak-plastik";
                        const effectiveSlotH = isKotakPlastik
                          ? (uiSlotSize?.h ?? 0) * 0.92
                          : uiSlotSize?.h;
                        const url = await generatePrintKeychain(
                          filledSlots[activeSlotItem.globalIndex],
                          {
                            preview: true,
                            transform: transforms[activeSlotItem.globalIndex],
                            uiSlotW: uiSlotSize?.w,
                            uiSlotH: effectiveSlotH,
                            keychainType: activeSlotItem.orderId,
                          },
                        );
                        if (url) {
                          setPreviewUrl(url as string);
                          setPreviewOpen(true);
                        }
                      }}
                      disabled={!filledSlots[activeSlotItem.globalIndex]}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Lihat Preview
                    </BrutalistButton>
                    <BrutalistButton
                      onClick={() => setConfirmOpen(true)}
                      disabled={!canConfirm || printing}
                      size="sm"
                      className="w-full"
                    >
                      {printing ? "Menyimpan..." : "Selesaikan dan Cetak!"}
                    </BrutalistButton>
                  </div>
                </div>
              </BrutalistCard>
            </div>
          </div>
        </div>
      </div>

      {previewOpen && previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl border-4 border-black max-w-md w-full">
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

      {/* Modal Preview Foto Gallery */}
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
              className="w-full rounded-lg border-4 border-black aspect-[4/6] object-cover"
            />
            <div className="flex gap-4 mt-4">
              <BrutalistButton
                className="w-full"
                variant="outline"
                disabled={previewPhotoIndex === 0}
                onClick={() => {
                  const i = previewPhotoIndex - 1;
                  setPreviewPhotoIndex(i);
                  setPreviewPhotoUrl(photoGallery[i].full);
                }}
              >
                ← Previous
              </BrutalistButton>
              <BrutalistButton
                className="w-full"
                variant="outline"
                disabled={previewPhotoIndex === photoGallery.length - 1}
                onClick={() => {
                  const i = previewPhotoIndex + 1;
                  setPreviewPhotoIndex(i);
                  setPreviewPhotoUrl(photoGallery[i].full);
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

      {/* Modal Konfirmasi */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl border-4 border-black max-w-3xl w-full">
            <h2 className="text-3xl font-bold mb-2 text-center">
              Konfirmasi Cetak
            </h2>
            <p className="text-xl text-gray-600 mb-6 text-center">
              Apakah kamu sudah yakin dengan foto gantungan kunci ini?
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

      {/* Modal Sukses */}
      {successOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl border-4 border-black max-w-md w-full text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-2">Berhasil!</h2>
            <p className="text-xl text-gray-600 mb-6">
              Foto gantungan kunci berhasil disimpan dan siap diproses.
            </p>
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
              Otomatis lanjut dalam {countdown} detik...
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
    </div>
  );
}
