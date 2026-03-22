import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Minus, Plus, Users, X, Layout, LayoutGrid } from "lucide-react";
import { BrutalistCard } from "../components/BrutalistCard";
import { BrutalistButton } from "../components/BrutalistButton";
import { Navigation } from "../components/Navigation";

// ─── Template Mode Modal ──────────────────────────────────────────────────────

interface TemplateModeModalProps {
  count: number;
  onSelect: (isCoupleMode: boolean) => void;
  onClose: () => void;
}

function TemplateModeModal({
  count,
  onSelect,
  onClose,
}: TemplateModeModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="bg-white border-4 border-black rounded-3xl px-20 py-16 h-[60%] w-7xl relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-16 h-16 flex items-center justify-center border-2 border-black rounded-full hover:bg-black hover:text-white transition-colors cursor-pointer"
        >
          <X size={28} strokeWidth={3} />
        </button>

        <div className="text-center mb-12">
          <h2 className="text-6xl font-bold mb-4">Template Mode</h2>
          <p className="text-2xl text-gray-600">
            You have{" "}
            <span className="font-bold text-black">{count} people</span>. How
            should the template be applied?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Option A — Single template for everyone */}
          <button
            onClick={() => onSelect(true)}
            className="group flex flex-col items-start gap-6 p-10 border-4 border-black rounded-2xl bg-white hover:bg-black hover:text-white transition-all cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <div className="w-24 h-24 rounded-full border-4 border-black group-hover:border-white flex items-center justify-center bg-yellow-300 group-hover:bg-yellow-400 transition-colors shrink-0">
              <Layout size={48} strokeWidth={2.5} className="text-black" />
            </div>
            <div className="text-left w-full flex-1">
              <p className="font-bold text-4xl leading-tight">1 Template</p>
              <p className="text-xl mt-3 text-gray-500 group-hover:text-gray-300 transition-colors">
                All {count} people share a single template layout
              </p>
            </div>
            <span className="text-base font-bold px-5 py-2 border-2 border-black group-hover:border-white rounded-full">
              GROUP / COUPLE
            </span>
          </button>

          {/* Option B — Template per person / pair */}
          <button
            onClick={() => onSelect(false)}
            className="group flex flex-col items-start gap-6 p-10 border-4 border-black rounded-2xl bg-white hover:bg-black hover:text-white transition-all cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            <div className="w-24 h-24 rounded-full border-4 border-black group-hover:border-white flex items-center justify-center bg-blue-300 group-hover:bg-blue-400 transition-colors shrink-0">
              <LayoutGrid size={48} strokeWidth={2.5} className="text-black" />
            </div>
            <div className="text-left w-full flex-1">
              <p className="font-bold text-4xl leading-tight">
                Multiple Templates
              </p>
              <p className="text-xl mt-3 text-gray-500 group-hover:text-gray-300 transition-colors">
                Choose a different template per person or pair
              </p>
            </div>
            <span className="text-base font-bold px-5 py-2 border-2 border-black group-hover:border-white rounded-full">
              INDIVIDUAL
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function PeopleCount() {
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.destination || "bonus";
  const serviceId = location.state?.serviceId || "photo-box";
  const skipBonus = location.state?.skipBonus;
  const disableModal = location.state?.disableModal;
  const maxCount = serviceId === "photo-studio" ? 15 : 8;

  const [count, setCount] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const minCount = 1;

  const handleDecrement = () => {
    if (count > minCount) setCount(count - 1);
  };

  const handleIncrement = () => {
    if (count < maxCount) setCount(count + 1);
  };

  // Klik Continue → tampilkan modal dulu
  const handleContinue = () => {
    if (disableModal) {
      navigate(`/${destination}`, {
        state: { peopleCount: count, serviceId },
      });
      return;
    }
    if (count === 1) {
      // Count 1 → langsung ke bonus, tidak perlu pilih mode
      const sharedState = { peopleCount: count, serviceId, coupleMode: true };
      if (skipBonus && destination) {
        navigate(`/${destination}`, { state: sharedState });
      } else {
        navigate("/bonus", { state: { ...sharedState, skipBonus } });
      }
    } else {
      setShowModal(true);
    }
  };

  // Setelah user pilih mode template
  const handleTemplateModeSelect = (isCoupleMode: boolean) => {
    setShowModal(false);

    const sharedState = {
      peopleCount: count,
      serviceId,
      coupleMode: isCoupleMode, // ← diteruskan ke halaman berikutnya
    };

    if (skipBonus && destination) {
      navigate(`/${destination}`, { state: sharedState });
    } else {
      navigate("/bonus", { state: { ...sharedState, skipBonus } });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation currentStep={1} totalSteps={5} />

      {showModal && (
        <TemplateModeModal
          count={count}
          onSelect={handleTemplateModeSelect}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="flex items-center justify-center min-h-screen p-8 pt-32">
        <BrutalistCard className="max-w-2xl w-full p-16">
          <div className="text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-black">
                <Users size={48} className="text-white" strokeWidth={3} />
              </div>
              <h1 className="text-5xl font-bold mb-4">How many people?</h1>
              <p className="text-2xl text-gray-600">
                Select the number of people in your group
              </p>
            </div>

            <div className="my-12">
              <div className="flex items-center justify-center gap-8">
                <BrutalistButton
                  size="md"
                  variant="outline"
                  onClick={handleDecrement}
                  disabled={count <= minCount}
                  className="w-20 h-20 p-0 flex items-center justify-center cursor-pointer"
                >
                  <Minus size={32} strokeWidth={4} />
                </BrutalistButton>

                <div className="text-9xl font-bold min-w-[200px] text-center border-8 border-black rounded-3xl py-8 px-12 bg-white">
                  {count}
                </div>

                <BrutalistButton
                  size="md"
                  variant="outline"
                  onClick={handleIncrement}
                  disabled={count >= maxCount}
                  className="w-20 h-20 p-0 flex items-center justify-center cursor-pointer"
                >
                  <Plus size={32} strokeWidth={4} />
                </BrutalistButton>
              </div>
            </div>

            <div className="mt-12">
              <BrutalistButton onClick={handleContinue} className="w-full">
                Continue
              </BrutalistButton>
            </div>
          </div>
        </BrutalistCard>
      </div>
    </div>
  );
}
