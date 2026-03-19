import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { BrutalistCard } from "../components/BrutalistCard";
import { BrutalistButton } from "../components/BrutalistButton";
import { Navigation } from "../components/Navigation";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { SlotImage } from "../components/SlotImage";
import { generatePrintA4 } from "../../utils/printA4";

export function PhotoArrangementA4() {
  const location = useLocation();
  const navigate = useNavigate();

  const peopleCount = location.state?.peopleCount || 1;

  const [photoGallery, setPhotoGallery] = useState<
    { thumb: string; full: string }[]
  >([]);
  const [printing, setPrinting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [previewPhotoOpen, setPreviewPhotoOpen] = useState(false);
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(0);

  const [filledSlots, setFilledSlots] = useState<{
    [userIndex: number]: string;
  }>({});
  const [transforms, setTransforms] = useState<{
    [userIndex: number]: { scale: number; x: number; y: number };
  }>({});
  const [activeUser, setActiveUser] = useState(0);

  const slotRef = useRef<HTMLDivElement>(null);
  const [uiSlotSize, setUiSlotSize] = useState<{ w: number; h: number } | null>(
    null,
  );

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
        setUiSlotSize({ w: rect.width, h: rect.height });
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [activeUser, filledSlots]);

  useEffect(() => {
    if (!successOpen) return;
    setCountdown(5);
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
    const emptyUser = Array.from({ length: peopleCount }, (_, i) => i).find(
      (i) => !filledSlots[i],
    );
    if (emptyUser !== undefined) {
      setFilledSlots((prev) => ({ ...prev, [emptyUser]: photo.full }));
    } else {
      setFilledSlots((prev) => ({ ...prev, [activeUser]: photo.full }));
      setTransforms((prev) => {
        const updated = { ...prev };
        delete updated[activeUser];
        return updated;
      });
    }
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);
      for (let i = 0; i < peopleCount; i++) {
        if (!filledSlots[i]) continue;
        await generatePrintA4(filledSlots[i], {
          transform: transforms[i],
          uiSlotW: uiSlotSize?.w,
          uiSlotH: uiSlotSize?.h,
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

  const handlePreviewPrint = async () => {
    if (!filledSlots[activeUser]) return;
    try {
      const url = await generatePrintA4(filledSlots[activeUser], {
        preview: true,
        transform: transforms[activeUser],
        uiSlotW: uiSlotSize?.w,
        uiSlotH: uiSlotSize?.h,
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

  const canConfirm = Array.from({ length: peopleCount }, (_, i) => i).every(
    (i) => filledSlots[i],
  );

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-100 flex flex-col">
      <Navigation currentStep={4} totalSteps={5} />

      <div className="pt-32 px-8 flex-1 overflow-hidden">
        <div className="w-full mx-auto h-full flex flex-col">
          <div className="my-5">
            <h1 className="text-6xl font-bold mb-2 text-center">
              Cetak Foto A4
            </h1>
            <p className="text-2xl text-center text-gray-700">
              Pilih foto dari galeri untuk dicetak ukuran A4
            </p>
          </div>

          <div className="grid grid-cols-12 gap-8 flex-1 overflow-hidden mb-5">
            {/* LEFT - Gallery */}
            <div className="col-span-9 h-[80dvh]">
              <BrutalistCard className="p-6 h-full flex flex-col overflow-y-auto">
                <h2 className="text-3xl font-bold mb-6">Photo Gallery</h2>
                <div className="grid grid-cols-5 gap-4 flex-1 overflow-y-auto pr-2">
                  {photoGallery.map((photo, index) => (
                    <BrutalistCard
                      key={index}
                      interactive
                      onClick={() => handlePhotoClick(photo)}
                      className="p-0  cursor-pointer group"
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

            {/* RIGHT - A4 Slot */}
            <div className="col-span-3 h-full flex flex-col gap-4 overflow-y-auto">
              {/* Tab user */}
              {peopleCount > 1 && (
                <BrutalistCard className="p-4 flex gap-2 flex-wrap flex-shrink-0">
                  {Array.from({ length: peopleCount }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveUser(i)}
                      className={`px-4 py-2 border-4 border-black font-bold text-lg cursor-pointer transition-all ${
                        activeUser === i
                          ? "bg-black text-white"
                          : "bg-white text-black hover:bg-black hover:text-white"
                      }`}
                    >
                      User {i + 1}
                    </button>
                  ))}
                </BrutalistCard>
              )}

              <BrutalistCard className="p-4 flex flex-col flex-shrink-0">
                <h2 className="text-2xl font-bold mb-3">
                  Tampilan A4
                  {peopleCount > 1 ? ` — User ${activeUser + 1}` : ""}
                </h2>

                {/* A4 preview: height 60dvh, width auto ikut ratio A4 */}
                <div className="flex justify-center">
                  <div
                    ref={slotRef}
                    className="border-4 border-black h-full w-full rounded-xl overflow-hidden bg-white shadow-lg"
                    style={{
                      aspectRatio: "210/297",
                    }}
                  >
                    {filledSlots[activeUser] ? (
                      <SlotImage
                        key={`a4-${activeUser}-${filledSlots[activeUser]}-${uiSlotSize?.w ?? 0}`}
                        src={filledSlots[activeUser]}
                        slotW={uiSlotSize?.w ?? 300}
                        slotH={uiSlotSize?.h ?? 424}
                        transform={
                          transforms[activeUser] ?? { scale: 1, x: 0, y: 0 }
                        }
                        onTransformChange={(t) =>
                          setTransforms((prev) => ({
                            ...prev,
                            [activeUser]: t,
                          }))
                        }
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                        <div className="text-6xl mb-3">📷</div>
                        <p className="text-xl font-bold text-center px-4">
                          Klik foto untuk menempatkan
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tombol */}
                <div className="flex gap-3 mt-4">
                  <BrutalistButton
                    onClick={handlePreviewPrint}
                    disabled={!filledSlots[activeUser]}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    Lihat Preview Cetak
                  </BrutalistButton>
                  <BrutalistButton
                    onClick={() => setConfirmOpen(true)}
                    disabled={!canConfirm || printing}
                    size="sm"
                    className="w-full"
                  >
                    {printing ? "Mencetak..." : "Selesaikan dan Cetak!"}
                  </BrutalistButton>
                </div>
              </BrutalistCard>
            </div>
          </div>
        </div>
      </div>

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

      {/* Modal Preview Print */}
      {previewOpen && previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl border-4 border-black max-w-2xl w-full">
            <h2 className="text-3xl font-bold mb-4 text-center">
              Print Preview A4
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

      {/* Modal Konfirmasi */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl border-4 border-black max-w-3xl w-full">
            <h2 className="text-3xl font-bold mb-2 text-center">
              Konfirmasi Cetak
            </h2>
            <p className="text-xl text-gray-600 mb-6 text-center">
              Apakah kamu sudah yakin? Foto akan langsung dicetak ukuran A4.
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
            <h2 className="text-3xl font-bold mb-2">Print Berhasil!</h2>
            <p className="text-xl text-gray-600 mb-6">
              Foto A4 berhasil disimpan dan siap dicetak.
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
                    strokeDashoffset={100 - (countdown / 5) * 100}
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
