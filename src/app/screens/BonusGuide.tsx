import { useNavigate, useLocation } from "react-router";
import { Star, MapPin, TabletSmartphone } from "lucide-react";
import { BrutalistCard } from "../components/BrutalistCard";
import { BrutalistButton } from "../components/BrutalistButton";
import { Navigation } from "../components/Navigation";
import { QRCodeSVG } from "qrcode.react";

export function BonusGuide() {
  const navigate = useNavigate();
  const location = useLocation();
  const peopleCount = location.state?.peopleCount || 1;
  const reviewLink = "https://share.google/M0a3bc8DtyZzDmaBx";

  const handleContinue = () => {
    navigate("/templates", {
      state: { peopleCount, joinedBonus: true },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Navigation currentStep={2} totalSteps={5} />

      <div className="pt-32 pb-12 px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6">Get Your Bonus 🎁</h1>

          <p className="text-3xl text-gray-700 mb-12">
            Leave us a review on Google Maps to receive a bonus!
          </p>

          <BrutalistCard className="p-12 mb-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* QR Code */}
              <div className="flex flex-col items-center">
                <div className="bg-white p-6 border-4 border-black">
                  <QRCodeSVG value={reviewLink} size={220} />
                </div>

                <p className="text-2xl font-bold mt-6">Scan this QR Code</p>
              </div>

              {/* Steps */}
              <div className="text-left space-y-8">
                <div className="flex items-start gap-4">
                  <MapPin size={36} />
                  <p className="text-2xl font-bold">
                    1. Scan the QR code to open Ignos on Google Maps
                  </p>
                </div>

                <div className="flex items-start gap-4">
                  <Star size={36} />
                  <p className="text-2xl font-bold">
                    2. Give us a rating and write a short review
                  </p>
                </div>

                <div className="flex items-start gap-4">
                  <TabletSmartphone size={36} />
                  <p className="text-2xl font-bold">
                    3. Show your review to our staff to claim your bonus
                  </p>
                </div>
              </div>
            </div>
          </BrutalistCard>

          <BrutalistButton
            onClick={handleContinue}
            className="text-3xl px-16 py-6"
          >
            Continue
          </BrutalistButton>
        </div>
      </div>
    </div>
  );
}
