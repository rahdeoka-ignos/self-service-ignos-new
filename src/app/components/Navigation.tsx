import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { BrutalistButton } from "./BrutalistButton";

interface NavigationProps {
  currentStep: number;
  totalSteps: number;
  showBack?: boolean;
}

export function Navigation({
  currentStep,
  totalSteps,
  showBack = true,
}: NavigationProps) {
  const navigate = useNavigate();

  return (
    <div className="fixed top-0 left-0 right-0 bg-white border-b-4 border-black z-50">
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          {showBack && (
            <BrutalistButton
              size="sm"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={24} />
              Back
            </BrutalistButton>
          )}
        </div>

        <div className="flex items-center gap-3">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`w-12 h-12 border-4 border-black rounded-full flex items-center justify-center text-xl font-bold ${
                i + 1 <= currentStep
                  ? "bg-black text-white"
                  : "bg-white text-black"
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <div className="w-40 flex items-center justify-end">
          <span className="text-2xl font-black tracking-widest">
            IGNOS STUDIO
          </span>
        </div>
      </div>
    </div>
  );
}
