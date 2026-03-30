import { useNavigate, useLocation } from "react-router";
import { Star, MapPin, TabletSmartphone } from "lucide-react";
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

  const handleContinue = () => {
    navigate("/templates", {
      state: { peopleCount, joinedBonus: true, coupleMode },
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
                  <TabletSmartphone size={36} />
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
    </div>
  );
}
