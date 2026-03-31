import { useNavigate, useLocation } from "react-router";
import { Gift, Timer, X } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import { BrutalistCard } from "../components/BrutalistCard";
import { Navigation } from "../components/Navigation";
import { useEffect, useState } from "react";
import { BrutalistButton } from "../components/BrutalistButton";

export function BonusSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const peopleCount = location.state?.peopleCount || 1;
  const skipBonus = location.state?.skipBonus;
  const coupleMode = location.state?.coupleMode ?? false;
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [duration, setDuration] = useState(30 * 60);
  const [showDuration, setShowDuration] = useState(false);

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

  const handleContinue = () => {
    setShowTimerModal(true);
  };

  const handleSkipBonus = () => {
    sessionStorage.removeItem("session_timer_end");
    setShowTimerModal(false);
    navigate("/templates", {
      state: {
        peopleCount,
        joinedBonus: false,
        coupleMode,
        timerDuration: duration,
      },
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
              onClick={handleContinue}
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

      {/* Timer Modal */}
      {showTimerModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white border-4 border-black rounded-2xl p-10 max-w-lg w-full mx-4 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            {/* Icon */}
            <div
              onClick={() => setShowDuration((v) => !v)}
              className="w-24 h-24 bg-black rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <Timer size={48} className="text-white" strokeWidth={2} />
            </div>

            {/* Title */}
            <h2 className="text-4xl font-bold mb-3">Sesi Dimulai!</h2>
            <p className="text-xl text-gray-600 mb-8">
              Kamu memiliki waktu untuk menyelesaikan sesi foto ini
            </p>

            {/* Timer display — dinamis seperti BonusGuide */}
            <div className="border-4 border-black rounded-2xl p-8 mb-8 bg-gray-50">
              <p className="text-8xl font-bold tracking-tight">
                {String(Math.floor(duration / 60)).padStart(2, "0")}:00
              </p>
              <p className="text-2xl font-bold text-gray-500 mt-2">menit</p>
            </div>

            {/* Info */}
            <p className="text-lg text-gray-500 mb-8 leading-relaxed">
              Timer akan mulai berjalan setelah kamu menekan tombol di bawah.
              Gunakan waktu dengan bijak!
            </p>

            {showDuration && (
              <div className="flex items-center justify-center gap-4 mb-6">
                <p className="text-lg font-bold text-gray-600">Durasi Sesi:</p>
                {[10, 15, 20, 30].map((min) => (
                  <button
                    key={min}
                    onClick={() => setDuration(min * 60)}
                    className={`border-4 border-black px-4 py-2 rounded-xl font-bold text-lg transition-all
        ${
          duration === min * 60
            ? "bg-black text-white shadow-none translate-x-1 translate-y-1"
            : "bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
        }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            )}

            {/* Actions — sama */}
            <div className="flex gap-4">
              <button
                onClick={() => setShowTimerModal(false)}
                className="flex-1 text-xl font-bold border-4 border-black px-6 py-4 bg-white hover:bg-black hover:text-white transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
              >
                Kembali
              </button>
              <BrutalistButton
                onClick={handleSkipBonus}
                className="flex-1 text-xl"
                size="md"
              >
                Mulai Sekarang →
              </BrutalistButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
