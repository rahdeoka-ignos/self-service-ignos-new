import { useState } from "react";
import { useNavigate } from "react-router";
import { BrutalistCard } from "../../components/BrutalistCard";
import { BrutalistButton } from "../../components/BrutalistButton";
import { Navigation } from "../../components/Navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";

const KEYCHAIN_OPTIONS = [
  {
    id: "kotak-plastik",
    name: "Kotak Plastik",
    price: 20000,
    description: "Full Foto",
    image: "/addons/keychain-kotak-plastik.jpg",
  },
  {
    id: "kotak-metal",
    name: "Kotak Metal",
    price: 30000,
    description: "Full Foto",
    image: "/addons/keychain-kotak-metal.jpg",
  },
  {
    id: "oval-metal",
    name: "Oval Metal",
    price: 30000,
    description: "Full Foto",
    image: "/addons/keychain-oval-metal.jpg",
  },
  {
    id: "love-metal",
    name: "Love Metal",
    price: 30000,
    description: "Full Foto",
    image: "/addons/keychain-love-metal.jpg",
  },
];

export type KeychainOrder = {
  id: string;
  name: string;
  price: number;
  qty: number;
  image: string;
};

export function KeychainOptions() {
  const navigate = useNavigate();

  const [quantities, setQuantities] = useState<{ [id: string]: number }>(
    Object.fromEntries(KEYCHAIN_OPTIONS.map((o) => [o.id, 0])),
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

  const totalPrice = KEYCHAIN_OPTIONS.reduce(
    (sum, opt) => sum + opt.price * (quantities[opt.id] || 0),
    0,
  );

  const handleNext = () => {
    const orders: KeychainOrder[] = KEYCHAIN_OPTIONS.filter(
      (opt) => quantities[opt.id] > 0,
    ).map((opt) => ({
      id: opt.id,
      name: opt.name,
      price: opt.price,
      qty: quantities[opt.id],
      image: opt.image,
    }));

    navigate("/keychain-arrangement", { state: { orders } });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation currentStep={4} totalSteps={5} />

      <div className="flex flex-col items-center justify-center min-h-screen p-8 pt-32 pb-16">
        <div className="max-w-6xl w-full">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4">
              Pilih Tipe Gantungan Kunci
            </h1>
            <p className="text-2xl text-gray-600">
              Pilih tipe dan jumlah gantungan kunci yang kamu inginkan
            </p>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {KEYCHAIN_OPTIONS.map((opt) => {
              const qty = quantities[opt.id];
              const isSelected = qty > 0;
              return (
                <div
                  key={opt.id}
                  className={`
                    flex flex-col bg-white rounded-2xl overflow-hidden transition-all duration-200
                    border-4 border-black
                    ${
                      isSelected
                        ? "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] -translate-y-1"
                        : "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    }
                  `}
                >
                  {/* Selected badge */}
                  <div className="relative">
                    <div className="w-full aspect-square overflow-hidden border-b-4 border-black">
                      <img
                        src={opt.image}
                        alt={opt.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/400x400/e5e7eb/6b7280?text=" +
                            encodeURIComponent(opt.name);
                        }}
                      />
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-black text-white text-sm font-bold px-3 py-1 rounded-full border-2 border-black">
                        ×{qty}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5 flex flex-col flex-1">
                    <h2 className="text-xl font-bold mb-0.5">{opt.name}</h2>
                    <p className="text-gray-500 text-base mb-1">
                      {opt.description}
                    </p>
                    <p className="text-lg font-bold mb-5">
                      {formatPrice(opt.price)}
                    </p>

                    {/* Qty control */}
                    <div className="flex items-center gap-2 mt-auto">
                      <button
                        onClick={() => setQty(opt.id, qty - 1)}
                        disabled={qty <= 0}
                        className="w-10 h-10 border-4 border-black font-bold flex items-center justify-center disabled:opacity-25 hover:bg-black hover:text-white transition-colors cursor-pointer rounded-lg"
                      >
                        <Minus size={16} strokeWidth={4} />
                      </button>
                      <div className="flex-1 text-center text-2xl font-bold border-4 border-black py-1.5 rounded-lg bg-gray-50">
                        {qty}
                      </div>
                      <button
                        onClick={() => setQty(opt.id, qty + 1)}
                        className="w-10 h-10 border-4 border-black font-bold flex items-center justify-center hover:bg-black hover:text-white transition-colors cursor-pointer rounded-lg"
                      >
                        <Plus size={16} strokeWidth={4} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {totalQty > 0 && (
            <div className="border-4 border-black bg-white rounded-2xl p-7 mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center shrink-0">
                  <ShoppingBag
                    size={20}
                    className="text-white"
                    strokeWidth={2.5}
                  />
                </div>
                <h3 className="text-2xl font-bold">Ringkasan Pesanan</h3>
              </div>
              <div className="space-y-2">
                {KEYCHAIN_OPTIONS.filter((o) => quantities[o.id] > 0).map(
                  (opt) => (
                    <div
                      key={opt.id}
                      className="flex justify-between items-center text-lg"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={opt.image}
                          alt={opt.name}
                          className="w-10 h-10 object-cover border-2 border-black rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://placehold.co/40x40/e5e7eb/6b7280?text=?";
                          }}
                        />
                        <span>
                          {opt.name}{" "}
                          <span className="text-gray-500">
                            ×{quantities[opt.id]}
                          </span>
                        </span>
                      </div>
                      <span className="font-bold">
                        {formatPrice(opt.price * quantities[opt.id])}
                      </span>
                    </div>
                  ),
                )}
                <div className="border-t-4 border-black pt-3 mt-3 flex justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-5">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 text-xl font-bold border-4 border-black px-10 py-4 bg-white hover:bg-black hover:text-white transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
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
