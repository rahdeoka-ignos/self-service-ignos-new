import { useState } from "react";
import { useNavigate } from "react-router";
import { BrutalistCard } from "../../components/BrutalistCard";
import { BrutalistButton } from "../../components/BrutalistButton";
import { Navigation } from "../../components/Navigation";
import { Minus, Plus } from "lucide-react";

const IDCARD_OPTIONS = [
  {
    id: "portrait-full",
    name: "ID Card Portrait",
    subtitle: "Full Foto",
    price: 35000,
    image: "/addons/idcard-portrait-full.png",
    orientation: "portrait" as const,
  },
  {
    id: "landscape-full",
    name: "ID Card Landscape",
    subtitle: "Full Foto",
    price: 35000,
    image: "/addons/idcard-landscape-full.png",
    orientation: "landscape" as const,
  },
  {
    id: "landscape-blue",
    name: "ID Card Landscape",
    subtitle: "Design Biru",
    price: 35000,
    image: "/addons/idcard-blue.png",
    orientation: "landscape" as const,
  },
  {
    id: "landscape-red",
    name: "ID Card Landscape",
    subtitle: "Design Merah",
    price: 35000,
    image: "/addons/idcard-red.png",
    orientation: "landscape" as const,
  },
];

export type IdCardOrder = {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  qty: number;
  image: string;
  orientation: "portrait" | "landscape";
};

export function IdCardOptions() {
  const navigate = useNavigate();

  const [quantities, setQuantities] = useState<{ [id: string]: number }>(
    Object.fromEntries(IDCARD_OPTIONS.map((o) => [o.id, 0])),
  );

  const setQty = (id: string, val: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, val) }));
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);

  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);

  const totalPrice = IDCARD_OPTIONS.reduce(
    (sum, opt) => sum + opt.price * (quantities[opt.id] || 0),
    0,
  );

  const handleNext = () => {
    const orders: IdCardOrder[] = IDCARD_OPTIONS.filter(
      (opt) => quantities[opt.id] > 0,
    ).map((opt) => ({
      id: opt.id,
      name: opt.name,
      subtitle: opt.subtitle,
      price: opt.price,
      qty: quantities[opt.id],
      image: opt.image,
      orientation: opt.orientation,
    }));

    navigate("/idcard-arrangement", { state: { orders } });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation currentStep={4} totalSteps={5} />

      <div className="flex flex-col items-center justify-center min-h-screen p-8 pt-32">
        <div className="max-w-6xl w-full">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4">
              Pilih Jenis dan Jumlah ID Card
            </h1>
            <p className="text-2xl text-gray-700">
              Pilih jenis dan jumlah ID card yang kamu inginkan
            </p>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {IDCARD_OPTIONS.map((opt) => {
              const qty = quantities[opt.id];
              return (
                <BrutalistCard
                  key={opt.id}
                  className={`p-0 overflow-hidden flex flex-col ${qty > 0 ? "border-8" : ""}`}
                >
                  {/* Image */}
                  <div className="w-full aspect-square overflow-hidden border-b-4 border-black">
                    <img
                      src={opt.image}
                      alt={`${opt.name} ${opt.subtitle}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/400x400/e5e7eb/6b7280?text=" +
                          encodeURIComponent(opt.name);
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="text-2xl font-bold mb-1">{opt.name}</h2>
                    <p className="text-gray-500 text-lg mb-1">{opt.subtitle}</p>
                    <p className="text-xl font-bold mb-4">
                      {formatPrice(opt.price)}
                    </p>

                    {/* Qty control */}
                    <div className="flex items-center gap-3 mt-auto">
                      <button
                        onClick={() => setQty(opt.id, qty - 1)}
                        disabled={qty <= 0}
                        className="w-10 h-10 border-4 border-black font-bold text-xl flex items-center justify-center disabled:opacity-30 hover:bg-black hover:text-white transition cursor-pointer"
                      >
                        <Minus size={16} strokeWidth={4} />
                      </button>
                      <div className="flex-1 text-center text-3xl font-bold border-4 border-black py-1">
                        {qty}
                      </div>
                      <button
                        onClick={() => setQty(opt.id, qty + 1)}
                        className="w-10 h-10 border-4 border-black font-bold text-xl flex items-center justify-center hover:bg-black hover:text-white transition cursor-pointer"
                      >
                        <Plus size={16} strokeWidth={4} />
                      </button>
                    </div>
                  </div>
                </BrutalistCard>
              );
            })}
          </div>

          {/* Summary */}
          {totalQty > 0 && (
            <div className="border-4 border-black bg-white p-6 mb-8 rounded-xl">
              <h3 className="text-2xl font-bold mb-3">Ringkasan Pesanan</h3>
              <div className="space-y-2">
                {IDCARD_OPTIONS.filter((o) => quantities[o.id] > 0).map(
                  (opt) => (
                    <div key={opt.id} className="flex justify-between text-xl">
                      <span>
                        {opt.name} {opt.subtitle} × {quantities[opt.id]}
                      </span>
                      <span className="font-bold">
                        {formatPrice(opt.price * quantities[opt.id])}
                      </span>
                    </div>
                  ),
                )}
                <div className="border-t-4 border-black pt-2 flex justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-6">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 text-xl font-bold border-4 border-black px-10 py-4 bg-white hover:bg-black hover:text-white transition"
            >
              ← Kembali
            </button>
            <BrutalistButton
              onClick={handleNext}
              disabled={totalQty === 0}
              className="flex-1"
              size="md"
            >
              Lanjutkan ({totalQty} item) →
            </BrutalistButton>
          </div>
        </div>
      </div>
    </div>
  );
}