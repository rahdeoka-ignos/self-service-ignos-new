import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Star, MapPin, TabletSmartphone, Timer, Instagram } from "lucide-react";
import { BrutalistCard } from "../components/BrutalistCard";
import { BrutalistButton } from "../components/BrutalistButton";
import { Navigation } from "../components/Navigation";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";

export function BonusGuide() {
  const navigate = useNavigate();
  const location = useLocation();
  const peopleCount = location.state?.peopleCount || 1;
  const reviewLink = "https://share.google/M0a3bc8DtyZzDmaBx";
  const coupleMode = location.state?.coupleMode ?? false;
  const { t } = useTranslation();
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [duration, setDuration] = useState(30 * 60);
  const [showDuration, setShowDuration] = useState(false);

  const handleContinue = () => {
    setShowTimerModal(true);
  };

  const handleStartSession = () => {
    sessionStorage.removeItem("session_timer_end");
    setShowTimerModal(false);
    navigate("/templates", {
      state: {
        peopleCount,
        joinedBonus: true,
        coupleMode,
        timerDuration: duration,
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Navigation currentStep={2} totalSteps={5} />

      <div className="pt-32 pb-12 px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6">{t("bonusGuide.title")}</h1>

          <p className="text-3xl text-gray-700 mb-12">
            {t("bonusGuide.subtitle")}
          </p>

          <BrutalistCard className="p-12 mb-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* QR Code */}
              <div className="flex flex-col items-center">
                <div className="bg-white p-6 border-4 border-black">
                  <QRCodeSVG value={reviewLink} size={220} />
                </div>
                <p className="text-2xl font-bold mt-6">
                  {t("bonusGuide.scan")}
                </p>
              </div>

              {/* Steps */}
              <div className="text-left space-y-8">
                <div className="flex items-start gap-4">
                  <MapPin size={36} />
                  <p className="text-2xl font-bold">
                    {t("bonusGuide.steps.step1")}
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <Star size={36} />
                  <p className="text-2xl font-bold">
                    {t("bonusGuide.steps.step2")}
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <Instagram size={36} />
                  <p className="text-2xl font-bold">
                    {t("bonusGuide.steps.step4")}
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <TabletSmartphone size={49} />
                  <p className="text-2xl font-bold">
                    {t("bonusGuide.steps.step3")}
                  </p>
                </div>
              </div>
            </div>
          </BrutalistCard>

          <BrutalistButton
            onClick={handleContinue}
            className="text-3xl px-16 py-6"
          >
            {t("bonusGuide.continue")}
          </BrutalistButton>
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
              Kamu memiliki waktu untuk menyusun foto yang akan kamu cetak selama:
            </p>

            <div className="border-4 border-black rounded-2xl p-8 mb-8 bg-gray-50">
              <p className="text-8xl font-bold tracking-tight">30:00</p>
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

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setShowTimerModal(false)}
                className="flex-1 text-xl font-bold border-4 border-black px-6 py-4 bg-white hover:bg-black hover:text-white transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
              >
                Kembali
              </button>
              <BrutalistButton
                onClick={handleStartSession}
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
