import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { BrutalistCard } from "../components/BrutalistCard";
import { BrutalistButton } from "../components/BrutalistButton";
import { useLocation } from "react-router";

export function BingkaiA4Page() {
  const navigate = useNavigate();
  const location = useLocation();

  const colors = [
    { id: "brown", name: "Coklat", class: "bg-[#8B5A2B]" },
    { id: "white", name: "Putih", class: "bg-white" },
    { id: "black", name: "Hitam", class: "bg-black" },
  ];

  // quantity per warna
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({
    brown: 0,
    white: 0,
    black: 0,
  });

  const [step, setStep] = useState<0 | 1 | 2>(0);

  // Gallery untuk pilih foto
  const [gallery, setGallery] = useState<{ thumb: string; full: string }[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [framePhotos, setFramePhotos] = useState<{
    [frameIndex: number]: { thumb: string; full: string };
  }>({});
  const [activeFrameIndex, setActiveFrameIndex] = useState<number | null>(null);

  useEffect(() => {
    if (location.pathname === "/bingkai4r") {
      setLoadingGallery(true);
      fetch("http://localhost:5000/api/photos")
        .then((res) => res.json())
        .then((data) => {
          // Filter cetak / bonus
          const printed = data.filter(
            (p: any) => p.full.includes("cetak-") || p.full.includes("bonus-")
          );
          setGallery(printed.length > 0 ? printed : data);
        })
        .catch((err) => console.error("Failed to fetch photos:", err))
        .finally(() => setLoadingGallery(false));
    }
  }, [location.pathname]);

  const updateQty = (colorId: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [colorId]: Math.max(0, (prev[colorId] || 0) + delta),
    }));
  };

  const totalSelected = Object.values(quantities).reduce((a, b) => a + b, 0);

  // Buat list frame datar berdasarkan kuantitas yang dipilih
  const selectedFramesList: {
    index: number;
    colorId: string;
    colorName: string;
    colorClass: string;
  }[] = [];
  colors.forEach((color) => {
    const qty = quantities[color.id] || 0;
    for (let i = 0; i < qty; i++) {
      selectedFramesList.push({
        index: selectedFramesList.length,
        colorId: color.id,
        colorName: color.name,
        colorClass: color.class,
      });
    }
  });

  const handleSubmit = () => {
    if (totalSelected === 0) return;
    if (location.pathname === "/bingkai4r") {
      setStep(1); // lanjut ke pilih foto
    } else {
      setStep(2); // langsung ke sukses untuk A4
    }
  };

  const allPhotosSelected =
    location.pathname !== "/bingkai4r" ||
    Object.keys(framePhotos).length === selectedFramesList.length;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            {location.pathname === "/bingkai4r" ? "Bingkai 4R" : "Bingkai A4"}
          </h1>
          <p className="text-xl text-gray-700">
            {step === 0 && "Pilih jumlah untuk setiap warna bingkai"}
            {step === 1 && "Pilih foto yang ingin dimasukkan ke setiap bingkai"}
            {step === 2 && "Tambahan Berhasil!"}
          </p>
        </div>

        {step === 0 && (
          <BrutalistCard className="p-8">
            {/* Color Selection with Quantity */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold mb-6">Pilih Warna & Jumlah</h2>
              <div className="grid grid-cols-3 gap-6">
                {colors.map((color) => (
                  <div
                    key={color.id}
                    className="border-4 border-black rounded-xl p-4 flex flex-col items-center gap-4 bg-white"
                  >
                    <div
                      className={`w-24 h-24 rounded-lg border-2 border-black ${color.class}`}
                    />

                    <span className="text-lg font-bold">{color.name}</span>

                    {/* Quantity Control */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQty(color.id, -1)}
                        className="border-4 border-black px-3 py-1 text-lg font-bold bg-white active:bg-gray-100 cursor-pointer"
                      >
                        -
                      </button>
                      <div className="text-xl font-bold w-10 text-center">
                        {quantities[color.id]}
                      </div>
                      <button
                        onClick={() => updateQty(color.id, 1)}
                        className="border-4 border-black px-3 py-1 text-lg font-bold bg-white active:bg-gray-100 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <BrutalistButton
                variant="outline"
                className="w-full"
                onClick={() => navigate(-1)}
              >
                Kembali
              </BrutalistButton>
              <BrutalistButton
                className="w-full"
                onClick={handleSubmit}
                disabled={totalSelected === 0}
              >
                Lanjutkan
              </BrutalistButton>
            </div>
          </BrutalistCard>
        )}

        {step === 1 && (
          <BrutalistCard className="p-8">
            <h2 className="text-2xl font-bold mb-6">Pilih Foto untuk Bingkai</h2>

            {loadingGallery ? (
              <div className="text-center py-10 font-bold text-xl">Loading foto...</div>
            ) : (
              <div className="space-y-4 mb-10">
                {selectedFramesList.map((frame) => {
                  const selectedPhoto = framePhotos[frame.index];
                  return (
                    <div
                      key={frame.index}
                      className="border-4 border-black rounded-xl p-6 flex items-center justify-between bg-white"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded border-2 border-black ${frame.colorClass}`}
                        />
                        <div>
                          <p className="text-2xl font-bold">Bingkai {frame.colorName}</p>
                          <p className="text-gray-500 font-medium">Bingkai #{frame.index + 1}</p>
                        </div>
                      </div>

                      {selectedPhoto ? (
                        <div className="flex items-center gap-4">
                          <img
                            src={selectedPhoto.thumb}
                            alt="Selected"
                            className="w-20 h-28 object-cover border-4 border-black rounded-lg"
                          />
                          <button
                            onClick={() => setActiveFrameIndex(frame.index)}
                            className="border-4 border-black bg-yellow-300 hover:bg-yellow-400 font-bold px-6 py-2 text-lg cursor-pointer transition-colors"
                          >
                            Ganti Foto
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveFrameIndex(frame.index)}
                          className="border-4 border-black bg-black text-white hover:bg-gray-800 font-bold px-6 py-3 text-lg cursor-pointer transition-colors"
                        >
                          Pilih Foto
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <BrutalistButton
                variant="outline"
                className="w-full"
                onClick={() => setStep(0)}
              >
                Kembali
              </BrutalistButton>
              <BrutalistButton
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!allPhotosSelected}
              >
                Selesai
              </BrutalistButton>
            </div>

            {/* Gallery Selection Modal */}
            {activeFrameIndex !== null && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-8">
                <div className="bg-white border-4 border-black rounded-2xl w-full max-w-4xl p-8 flex flex-col max-h-[85vh] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <h3 className="text-3xl font-bold mb-6">
                    Pilih Foto untuk Bingkai {selectedFramesList[activeFrameIndex]?.colorName}
                  </h3>
                  
                  {gallery.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center font-bold text-xl py-12">
                      Belum ada foto yang dicetak di sesi ini.
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-6 p-2">
                      {gallery.map((photo, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setFramePhotos((prev) => ({
                              ...prev,
                              [activeFrameIndex]: photo,
                            }));
                            setActiveFrameIndex(null);
                          }}
                          className="border-4 border-black rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform bg-gray-50 aspect-[2/3] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <img
                            src={photo.thumb}
                            alt="Gallery print"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setActiveFrameIndex(null)}
                    className="mt-6 border-4 border-black bg-white hover:bg-gray-100 font-bold py-3 text-xl w-full cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </BrutalistCard>
        )}

        {step === 2 && (
          <BrutalistCard className="p-10 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-3xl font-bold mb-4">Tambahan Berhasil!</h2>
            <p className="text-xl text-gray-700 mb-6">
              Tambahan anda berhasil, silahkan panggil staff di kasir.
            </p>

            {/* Detail Pesanan */}
            <div className="border-4 border-black rounded-xl p-6 mb-6 text-left bg-white">
              <h3 className="text-2xl font-bold mb-4 text-center">
                Detail Tambahan
              </h3>

              <div className="space-y-4">
                {location.pathname === "/bingkai4r" ? (
                  selectedFramesList.map((frame) => {
                    const photo = framePhotos[frame.index];
                    return (
                      <div
                        key={frame.index}
                        className="flex items-center justify-between border-b-2 border-gray-100 pb-2"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded border border-black ${frame.colorClass}`}
                          />
                          <span className="text-lg font-bold">Bingkai {frame.colorName}</span>
                        </div>
                        {photo && (
                          <img
                            src={photo.thumb}
                            alt="Selected"
                            className="w-12 h-18 object-cover border-2 border-black rounded"
                          />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-2 text-lg font-semibold">
                    <div className="flex justify-between">
                      <span>Coklat</span>
                      <span>{quantities.brown}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Putih</span>
                      <span>{quantities.white}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hitam</span>
                      <span>{quantities.black}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <BrutalistButton
              className="w-full"
              onClick={() => {
                const addonName =
                  location.pathname === "/bingkai4r"
                    ? "Bingkai 4R"
                    : "Bingkai A4";

                const bingkaiItems =
                  location.pathname === "/bingkai4r"
                    ? selectedFramesList.map((frame) => {
                        const photo = framePhotos[frame.index];
                        return {
                          name: `${addonName} - ${frame.colorName}`,
                          qty: 1,
                          photoUrl: photo?.full || "",
                          photoThumb: photo?.thumb || "",
                        };
                      })
                    : colors
                        .filter((c) => quantities[c.id] > 0)
                        .map((c) => ({
                          name: `${addonName} - ${c.name}`,
                          qty: quantities[c.id],
                        }));

                navigate("/add-ons", {
                  state: {
                    ...location.state,
                    miscAddons: [
                      ...(location.state?.miscAddons ?? []),
                      ...bingkaiItems,
                    ],
                  },
                });
              }}
            >
              Kembali ke Add-ons
            </BrutalistButton>
          </BrutalistCard>
        )}
      </div>
    </div>
  );
}
