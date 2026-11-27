import { KioskQuantityControl } from "../../components/KioskQuantityControl";
import { useState } from "react";
import { useNavigate } from "react-router";
import { BrutalistCard } from "../../components/BrutalistCard";
import { BrutalistButton } from "../../components/BrutalistButton";
import { useLocation } from "react-router";

const contentMap: {
  [key: string]: { title: string; question: string; emoji: string };
} = {
  "/flower-hotwheels": {
    title: "Flower Hotwheels",
    question: "...",
    emoji: "🌸",
  },
  "/cetak-bingkai3d-10r": {
    title: "Cetak Bingkai 3D 10R",
    question: "...",
    emoji: "🖼️",
  },
  "/cermin-foto-3d": { title: "Cermin Foto 3D", question: "...", emoji: "🪞" },
  "/boneka-tabung": { title: "Boneka Tabung", question: "...", emoji: "🧸" },
  "/puzzle-foto": { title: "Puzzle Foto", question: "...", emoji: "🧩" },
  "/photo-calender": { title: "Photo Calender", question: "...", emoji: "📅" },
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
    <div className="kiosk-screen min-h-screen bg-gray-100 flex items-center justify-center p-8">
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

            <BrutalistCard data-kiosk-ui="surface" className="p-10 text-center">
              <div className="mx-auto mb-10 max-w-[280px]">
                <KioskQuantityControl value={quantity} label={currentContent.title} onChange={setQuantity} />
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
              <h1 className="text-5xl font-bold mb-4">
                {currentContent.title}
              </h1>
            </div>

            <BrutalistCard data-kiosk-ui="surface" className="p-10 text-center">
              <div className="text-6xl mb-4">{currentContent.emoji}</div>

              <h2 className="text-3xl font-bold mb-6">Total Tambahan</h2>

              <div className="text-6xl font-bold mb-6">{quantity}</div>

              <p className="text-2xl text-gray-700 mb-8">
                Panggil staf untuk melanjutkan
              </p>

              <BrutalistButton
                className="w-full"
                onClick={() =>
                  navigate("/add-ons", {
                    state: {
                      ...location.state,
                      miscAddons: [
                        ...(location.state?.miscAddons ?? []),
                        { name: currentContent.title, qty: quantity, productId: location.pathname.slice(1), kind: "addon" },
                      ],
                    },
                  })
                }
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
