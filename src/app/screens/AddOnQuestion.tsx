import { useLocation, useNavigate } from "react-router";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useKioskTheme } from "../../context/KioskThemeContext";
import { usePricing } from "../../context/PricingContext";
import { DEFAULT_PRICING } from "../../types/pricing";

export function AddOnQuestion() {
  const location = useLocation();
  const peopleCount = location.state?.peopleCount || 1;
  const a4Count: number = location.state?.a4Count ?? 0;
  const { t } = useTranslation();
  const navigate = useNavigate();

  let themeConfig: any = null;
  try {
    themeConfig = useKioskTheme().theme;
  } catch {}

  const handleSkipOrFinish = () => {
    const nextState = {
      ...location.state,
      peopleCount,
      joinedBonus,
      coupleMode,
      totalPrint,
      templates,
      orders,
      a4Count,
      miscAddons: location.state?.miscAddons ?? [],
    };

    if (themeConfig && (themeConfig.enableStoryQuestion === false || themeConfig.freeEventMode)) {
      navigate("/complete", {
        state: {
          ...nextState,
          makeStory: true,
          customerName: themeConfig.freeEventMode ? (themeConfig.studioName || "Event Guest") : "",
          instagramUsernames: [],
          extraCharge: 0,
        },
      });
      return;
    }

    navigate("/story-question", {
      state: nextState,
    });
  };

  const isVideo = (src: string) =>
    src.endsWith(".mp4") || src.endsWith(".webm");

  const { pricing, formatPrice } = usePricing();

  const rawAddons = pricing?.addons && pricing.addons.length > 0 ? pricing.addons : DEFAULT_PRICING.addons;

  const addons = rawAddons
    .filter((addon) => addon.enabled !== false)
    .map((addon) => {
      let state: any = {};
      let price = addon.price;

      if (addon.id === "4r-print") {
        price = pricing?.prints?.print4rPrice ?? addon.price;
        state = {
          serviceId: "photo-studio",
          skipBonus: true,
          destination: "templates",
          disableModal: true,
        };
      } else if (addon.id === "10r-print") {
        price = pricing?.prints?.printA4Price ?? addon.price;
        state = {
          serviceId: "photo-studio",
          skipBonus: true,
          destination: "arrange-photos-a4",
          disableModal: true,
        };
      }

      return {
        ...addon,
        price,
        state,
        image: addon.image || "/addons/cetak4r.mp4",
        path: addon.path || "/add-ons",
      };
    });

  const joinedBonus = location.state?.joinedBonus ?? false;
  const coupleMode = location.state?.coupleMode ?? false;
  const totalPrint = location.state?.totalPrint ?? peopleCount;
  const templates = location.state?.templates ?? [];
  // const orders = location.state?.orders ?? [];
  const orders = location.state?.orders ?? location.state?.keychainOrders ?? [];

  return (
    <div className="min-h-screen bg-gray-100 p-10 pt-14 pb-20">
      <div className="w-screen-3xl mx-auto">
        {/* Title */}
        <div className="text-center mb-7">
          <h1 className="text-6xl font-bold mb-5">{t("addons.title")}</h1>
          {/* <p className="text-3xl text-gray-600">{t("addons.subtitle")}</p> */}
        </div>

        {/* Addons Grid */}
        <div className="grid grid-cols-6 gap-6">
          {addons.map((addon) => (
            <div
              key={addon.id}
              onClick={() => {
                const baseState = {
                  peopleCount,
                  joinedBonus,
                  coupleMode,
                  totalPrint,
                  templates,
                  orders,
                  a4Count,
                  miscAddons: location.state?.miscAddons ?? [],
                };

                // Untuk addon yang butuh people-count, forward state lama
                if (addon.id === "4r-print" || addon.id === "10r-print") {
                  navigate(addon.path, {
                    state: {
                      ...addon.state,
                      // State lama disimpan di returnState, untuk dikembalikan setelah selesai
                      returnState: baseState,
                    },
                  });
                } else {
                  navigate(addon.path, {
                    state: {
                      ...addon.state,
                      ...baseState,
                    },
                  });
                }
              }}
              className="group flex flex-col bg-white border-4 border-black rounded-2xl overflow-hidden cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-150"
            >
              {/* Image */}
              <div className="relative w-full aspect-square overflow-hidden border-b-4 border-black">
                {isVideo(addon.image) ? (
                  <video
                    src={addon.image}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={addon.image}
                    alt={addon.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://placehold.co/400x400/e5e7eb/6b7280?text=" +
                        encodeURIComponent(addon.title);
                    }}
                  />
                )}
                {addon.isPreorder && (
                  <span className="absolute top-3 left-3 text-sm font-bold bg-yellow-300 border-2 border-black px-3 py-1 rounded-full">
                    PO
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-5 flex flex-col flex-1">
                <h2 className="text-xl font-bold leading-tight mb-2">
                  {t(`addons.items.${addon.id}.title`)}
                </h2>
                <p className="text-lg font-bold text-black mb-4">
                  {formatPrice(addon.price)}
                </p>
                <button className="mt-auto w-full text-base font-bold border-2 border-black py-3 rounded-lg bg-white group-hover:bg-black group-hover:text-white transition-colors flex items-center justify-center gap-2">
                  {t("addons.addButton")}{" "}
                  <ArrowRight size={18} strokeWidth={3} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Skip Button */}
        <div className="flex justify-center mt-7">
          <button
            onClick={handleSkipOrFinish}
            className="text-2xl font-bold border-4 border-black px-16 py-5 bg-white hover:bg-black hover:text-white transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            {t("addons.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
