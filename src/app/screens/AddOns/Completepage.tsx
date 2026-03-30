import { useLocation, useNavigate } from "react-router";
import { Navigation } from "../../components/Navigation";
import { CheckCircle, MapPin, ArrowRight, Instagram } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

export function CompletePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const makeStory: boolean = location.state?.makeStory ?? false;
  const instagramUsernames: string[] = location.state?.instagramUsernames ?? [];
  const extraCharge: number = location.state?.extraCharge ?? 0;
  const peopleCount: number = location.state?.peopleCount ?? 1;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation currentStep={5} totalSteps={5} />

      <div className="flex items-center justify-center min-h-screen p-12 pt-36 pb-20">
        <div className="max-w-4xl w-full">
          {/* Success icon + heading */}
          <div className="text-center mb-14">
            <div className="relative inline-flex mb-8">
              <div className="w-36 h-36 bg-black rounded-full flex items-center justify-center border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
                <CheckCircle size={72} className="text-white" strokeWidth={2} />
              </div>
              {/* Decorative dots */}
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-300 border-2 border-black rounded-full" />
              <span className="absolute -bottom-1 -left-3 w-4 h-4 bg-green-400 border-2 border-black rounded-full" />
            </div>

            <h1 className="text-7xl font-bold mb-5 leading-tight">
              {t("complete.title")}
            </h1>
            <p className="text-3xl text-gray-600 leading-relaxed">
              <Trans
                i18nKey="complete.subtitle"
                components={{
                  1: <span className="font-bold text-black" />,
                }}
              />
            </p>
          </div>

          {/* Info cards */}
          <div className="space-y-5 mb-12">
            {/* Kasir direction card */}
            <div className="bg-black text-white border-4 border-black rounded-2xl p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] flex items-center gap-7">
              <div className="w-20 h-20 bg-yellow-300 rounded-full border-4 border-white flex items-center justify-center shrink-0">
                <MapPin size={40} strokeWidth={2.5} className="text-black" />
              </div>
              <div className="flex-1">
                <p className="text-3xl font-bold mb-1">
                  {t("complete.cashier.title")}
                </p>
                <p className="text-xl text-gray-300 leading-relaxed">
                  {t("complete.cashier.description")}
                </p>
              </div>
              <ArrowRight
                size={40}
                strokeWidth={2.5}
                className="text-yellow-300 shrink-0"
              />
            </div>

            {/* Story / softcopy info */}
            {makeStory ? (
              <div className="bg-white border-4 border-black rounded-2xl p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-pink-500 via-red-500 to-yellow-400 rounded-full border-4 border-black flex items-center justify-center shrink-0">
                    <Instagram
                      size={28}
                      className="text-white"
                      strokeWidth={2}
                    />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {t("complete.story.title")}
                    </p>
                    <p className="text-xl text-gray-500">
                      {t("complete.story.description")}
                    </p>
                  </div>
                </div>

                {instagramUsernames.length > 0 && (
                  <div className="space-y-3">
                    {instagramUsernames.map((username, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-gray-50 border-2 border-black rounded-xl px-5 py-3"
                      >
                        <div className="w-9 h-9 bg-black text-white rounded-full flex items-center justify-center text-lg font-bold shrink-0">
                          {i + 1}
                        </div>
                        <p className="text-xl font-medium">
                          <span className="text-gray-400">@</span>
                          {username}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border-4 border-black rounded-2xl p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold mb-1">
                    {t("complete.extraCharge.title")}
                  </p>
                  <p className="text-xl text-gray-500">
                    {t("complete.extraCharge.description")}
                  </p>
                </div>
                <p className="text-4xl font-bold">{formatPrice(extraCharge)}</p>
              </div>
            )}
          </div>

          {/* CTA button */}
          <div className="flex justify-center">
            <button
              onClick={() => navigate("/")}
              className="text-2xl font-bold border-4 border-black px-16 py-5 bg-white hover:bg-black hover:text-white transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
            >
              {t("complete.actions.backHome")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
