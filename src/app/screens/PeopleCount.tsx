import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Minus, Plus, Users } from "lucide-react";
import { BrutalistCard } from "../components/BrutalistCard";
import { BrutalistButton } from "../components/BrutalistButton";
import { Navigation } from "../components/Navigation";

export function PeopleCount() {
  const navigate = useNavigate();
  const location = useLocation();

  const serviceId = location.state?.serviceId || "photo-box";
  const skipBonus = location.state?.skipBonus;
  const maxCount = serviceId === "photo-studio" ? 15 : 8; // ← max sesuai service

  const [count, setCount] = useState(1);
  const minCount = 1;

  const handleDecrement = () => {
    if (count > minCount) setCount(count - 1);
  };

  const handleIncrement = () => {
    if (count < maxCount) setCount(count + 1);
  };

  const handleContinue = () => {
    navigate("/bonus", {
      state: { peopleCount: count, serviceId, skipBonus },
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation currentStep={1} totalSteps={5} />

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
