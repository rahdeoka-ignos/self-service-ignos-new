import { useState } from "react";
import { useNavigate } from "react-router";
import { BrutalistCard } from "../../components/BrutalistCard";
import { BrutalistButton } from "../../components/BrutalistButton";
import { useLocation } from "react-router";

const contentMap: {
  [key: string]: { title: string; question: string; emoji: string };
} = {
  "/flower-hotwheels": { title: "Flower Hotwheels", question: "...", emoji: "🌸" },
  "/cetak-bingkai3d-10r": { title: "Cetak Bingkai 3D 10R", question: "...", emoji: "🖼️" },
  "/cermin-foto-3d": { title: "Cermin Foto 3D", question: "...", emoji: "🪞" },
  "/boneka-tabung": { title: "Boneka Tabung", question: "...", emoji: "🧸" },
  "/puzzle-foto": { title: "Puzzle Foto", question: "...", emoji: "🧩" },
};

export function FlowerHotwheelsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [quantity, setQuantity] = useState(0);
  const [step, setStep] = useState<"input" | "result">("input");
  const currentContent =
    contentMap[location.pathname] || contentMap["/flower-hotwheels"];

  const handleNext = () => {
    if (quantity <= 0) return;
    setStep("result");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="max-w-3xl w-full">
        {step === "input" ? (
          <>
            {/* Title */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold mb-4">
                {currentContent.title}
              </h1>
              <p className="text-xl text-gray-700">{currentContent.question}</p>
            </div>

            <BrutalistCard className="p-10 text-center">
              {/* Quantity Control */}
              <div className="flex items-center justify-center gap-6 mb-10">
                <button
                  onClick={() => setQuantity((q) => Math.max(0, q - 1))}
                  className="border-4 border-black px-6 py-3 text-2xl font-bold"
                >
                  -
                </button>

                <div className="text-5xl font-bold w-24 text-center">
                  {quantity}
                </div>

                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="border-4 border-black px-6 py-3 text-2xl font-bold"
                >
                  +
                </button>
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
                  onClick={handleNext}
                  disabled={quantity === 0}
                >
                  Next
                </BrutalistButton>
              </div>
            </BrutalistCard>
          </>
        ) : (
          <>
            {/* Result */}
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold mb-4">{currentContent.title}</h1>
            </div>

            <BrutalistCard className="p-10 text-center">
              <div className="text-6xl mb-4">{currentContent.emoji}</div>

              <h2 className="text-3xl font-bold mb-6">Total Tambahan</h2>

              <div className="text-6xl font-bold mb-6">{quantity}</div>

              <p className="text-2xl text-gray-700 mb-8">
                Panggil staf untuk melanjutkan
              </p>

              <BrutalistButton
                className="w-full"
                onClick={() => navigate("/add-ons")}
              >
                Kembali ke Add-ons
              </BrutalistButton>
            </BrutalistCard>
          </>
        )}
      </div>
    </div>
  );
}
