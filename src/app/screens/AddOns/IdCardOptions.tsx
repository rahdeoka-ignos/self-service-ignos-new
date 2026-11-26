import { KioskQuantityControl } from "../../components/KioskQuantityControl";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { BrutalistCard } from "../../components/BrutalistCard";
import { BrutalistButton } from "../../components/BrutalistButton";
import { Navigation } from "../../components/Navigation";
import { Minus, Plus } from "lucide-react";
import { usePricing } from "../../../context/PricingContext";
import { DEFAULT_PRICING } from "../../../types/pricing";

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
  const location = useLocation();
  const { pricing, formatPrice } = usePricing();

  const idCardList = (
    pricing?.idCards && pricing.idCards.length > 0
      ? pricing.idCards
      : DEFAULT_PRICING.idCards
  ).filter((c) => c.enabled !== false);

  const [quantities, setQuantities] = useState<{ [id: string]: number }>({});

  const setQty = (id: string, val: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, val) }));
  };

  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);

  const totalPrice = idCardList.reduce(
    (sum, opt) => sum + opt.price * (quantities[opt.id] || 0),
    0,
  );

  const handleNext = () => {
    const orders: IdCardOrder[] = idCardList
      .filter((opt) => (quantities[opt.id] || 0) > 0)
      .map((opt) => ({
        id: opt.id,
        name: opt.name,
        subtitle: opt.subtitle || "",
        price: opt.price,
        qty: quantities[opt.id] || 0,
        image: opt.image || "",
        orientation: opt.orientation || "portrait",
      }));

    navigate("/idcard-arrangement", {
      state: {
        ...location.state,
        idCardOrders: orders,
      },
    });
  };

  return (
    <div className="kiosk-screen min-h-screen bg-gray-100">
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
            {idCardList.map((opt) => {
              const qty = quantities[opt.id] || 0;
              return (
                <BrutalistCard data-kiosk-ui="surface" data-kiosk-selected={qty > 0}
                  key={opt.id}
                  className={`woset-product-card p-0 overflow-hidden flex flex-col ${qty > 0 ? "border-8" : ""}`}
                >
                  {/* Image */}
                  <div data-kiosk-ui="divider" className="w-full aspect-square overflow-hidden border-b-4 border-black">
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

                    <KioskQuantityControl value={qty} label={opt.name} onChange={value => setQty(opt.id, value)} />
                  </div>
                </BrutalistCard>
              );
            })}
          </div>

          {/* Summary */}
          {totalQty > 0 && (
            <div data-kiosk-ui="surface" className="border-4 border-black bg-white p-6 mb-8 rounded-xl">
              <h3 className="text-2xl font-bold mb-3">Ringkasan Pesanan</h3>
              <div className="space-y-2">
                {idCardList.filter((o) => (quantities[o.id] || 0) > 0).map(
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
                <div data-kiosk-ui="divider" className="border-t-4 border-black pt-2 flex justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-6">
            <button data-kiosk-ui="control"
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
