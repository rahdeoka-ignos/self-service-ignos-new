import { useState } from "react";
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

  const [success, setSuccess] = useState(false);

  const updateQty = (colorId: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [colorId]: Math.max(0, (prev[colorId] || 0) + delta),
    }));
  };

  const totalSelected = Object.values(quantities).reduce((a, b) => a + b, 0);

  const handleSubmit = () => {
    if (totalSelected === 0) return;
    setSuccess(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            {location.pathname === "/bingkai4r" ? "Bingkai 4R" : "Bingkai A4"}
          </h1>
          <p className="text-xl text-gray-700">
            Pilih jumlah untuk setiap warna bingkai
          </p>
        </div>

        {!success ? (
          <BrutalistCard className="p-8">
            {/* Color Selection with Quantity */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold mb-6">Pilih Warna & Jumlah</h2>
              <div className="grid grid-cols-3 gap-6">
                {colors.map((color) => (
                  <div
                    key={color.id}
                    className="border-4 border-black rounded-xl p-4 flex flex-col items-center gap-4"
                  >
                    <div
                      className={`w-24 h-24 rounded-lg border-2 border-black ${color.class}`}
                    />

                    <span className="text-lg font-bold">{color.name}</span>

                    {/* Quantity Control */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQty(color.id, -1)}
                        className="border-4 border-black px-3 py-1 text-lg font-bold"
                      >
                        -
                      </button>
                      <div className="text-xl font-bold w-10 text-center">
                        {quantities[color.id]}
                      </div>
                      <button
                        onClick={() => updateQty(color.id, 1)}
                        className="border-4 border-black px-3 py-1 text-lg font-bold"
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
                Selesai
              </BrutalistButton>
            </div>
          </BrutalistCard>
        ) : (
          <BrutalistCard className="p-10 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-3xl font-bold mb-4">Tambahan Berhasil!</h2>
            <p className="text-xl text-gray-700 mb-6">
              Tambahan anda berhasil, silahkan panggil staff di kasir.
            </p>

            {/* Detail Pesanan */}
            <div className="border-4 border-black rounded-xl p-6 mb-6 text-left">
              <h3 className="text-2xl font-bold mb-4 text-center">
                Detail Tambahan
              </h3>

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
            </div>

            <BrutalistButton
              className="w-full"
              onClick={() => navigate("/add-ons")}
            >
              Kembali ke Add-ons
            </BrutalistButton>
          </BrutalistCard>
        )}
      </div>
    </div>
  );
}
