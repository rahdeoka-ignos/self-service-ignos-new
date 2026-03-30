import { useNavigate, useLocation } from "react-router";
import { Gift, X } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import { BrutalistCard } from "../components/BrutalistCard";
import { Navigation } from "../components/Navigation";
import { useEffect } from "react";

export function BonusSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const peopleCount = location.state?.peopleCount || 1;
  const skipBonus = location.state?.skipBonus;
  const coupleMode = location.state?.coupleMode ?? false;

  useEffect(() => {
    if (skipBonus) {
      navigate("/templates", {
        state: { peopleCount, joinedBonus: false },
        replace: true,
      });
    }
  }, []);

  const handleJoinBonus = () => {
    navigate("/bonus-guide", { state: { peopleCount, coupleMode } });
  };

  const handleSkipBonus = () => {
    navigate("/templates", {
      state: { peopleCount, joinedBonus: false, coupleMode },
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation currentStep={2} totalSteps={5} />

      <div className="flex items-center justify-center min-h-screen p-8 pt-32">
        <div className="max-w-7xl w-full">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold mb-6">
              {t("bonusSelection.title")}
            </h1>
            <p className="text-3xl text-gray-700">
              {t("bonusSelection.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <BrutalistCard
              interactive
              onClick={handleJoinBonus}
              className="flex flex-col items-center justify-center text-center p-16 min-h-[450px] hover:scale-105"
            >
              <div className="w-32 h-32 bg-black rounded-full flex items-center justify-center mb-8 border-4 border-black">
                <Gift size={64} className="text-white" strokeWidth={3} />
              </div>
              <h2 className="text-5xl font-bold mb-6">
                {t("bonusSelection.join.title")}
              </h2>
              <p className="text-2xl text-gray-600">
                {/* Trans dipakai karena ada tag <b> di dalam teks */}
                <Trans
                  i18nKey="bonusSelection.join.description"
                  values={{ count: peopleCount, double: peopleCount * 2 }}
                  components={{ b: <b /> }}
                />
              </p>
            </BrutalistCard>

            <BrutalistCard
              interactive
              onClick={handleSkipBonus}
              className="flex flex-col items-center justify-center text-center p-16 min-h-[450px] hover:scale-105"
            >
              <div className="w-32 h-32 bg-white border-4 border-black rounded-full flex items-center justify-center mb-8">
                <X size={64} className="text-black" strokeWidth={3} />
              </div>
              <h2 className="text-5xl font-bold mb-6">
                {t("bonusSelection.skip.title")}
              </h2>
              <p className="text-2xl text-gray-600">
                {t("bonusSelection.skip.description")}
              </p>
            </BrutalistCard>
          </div>
        </div>
      </div>
    </div>
  );
}
