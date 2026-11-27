import { isIllustratedPack } from "../../utils/illustratedTheme";
import { useLocation, useNavigate } from "react-router";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useKioskTheme } from "../../context/KioskThemeContext";
import { usePricing } from "../../context/PricingContext";
import { DEFAULT_PRICING } from "../../types/pricing";

import { WosetProductMedia } from "../components/WosetProductMedia";
import { WosetArtwork } from "../components/WosetArtwork";

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

  const illustrated = isIllustratedPack(themeConfig?.assetPack);

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
    <div className="kiosk-screen min-h-screen bg-gray-100 p-10 pt-14 pb-20">
      <div className={illustrated ? "mx-auto max-w-[1440px]" : "w-screen-3xl mx-auto"}>
        {/* Title */}
        <div className="text-center mb-7">
          {isIllustratedPack(themeConfig?.assetPack) && <WosetArtwork scene="keepsake" className="mx-auto mb-2 h-[140px] w-[220px]" />}
          <h1 className="text-6xl font-bold mb-5">{t("addons.title")}</h1>
          {/* <p className="text-3xl text-gray-600">{t("addons.subtitle")}</p> */}
        </div>

        {/* Addons Grid */}
        <div className={illustrated ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid grid-cols-6 gap-6"}>
          {addons.map((addon) => (
            <button data-kiosk-ui="control"
              type="button"
              key={addon.id}
              onClick={() => {
                // Carry the whole session state (e.g. print4rCount), not only these fields, minus the
                // keys that only steer one add-on round (they would pile up round after round).
                const {
                  returnState: _returnState, print4rPeopleCount: _print4r, a4PeopleCount: _a4,
                  destination: _destination, disableModal: _disableModal, skipBonus: _skipBonus,
                  previousKeychainOrders: _previousKeychains, ...sessionState
                } = location.state ?? {};
                const baseState = {
                  ...sessionState,
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
              className={illustrated ? "woset-product-card group flex flex-col overflow-hidden rounded-[28px] border border-[#252820]/35 bg-[#6278a4]/10 text-left text-[#252820] transition-colors hover:border-[#252820] hover:bg-[#d6c574]/15 motion-reduce:transition-none" : "group flex flex-col bg-white border-4 border-black rounded-2xl overflow-hidden cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-150"}
            >
              {/* Image */}
              <div data-kiosk-ui="divider" className={illustrated ? "relative aspect-[4/3] w-full overflow-hidden" : "relative w-full aspect-square overflow-hidden border-b-4 border-black"}>
                {illustrated ? <WosetProductMedia key={addon.image} source={addon.image} title={addon.title} scene={addon.id.includes("print") ? "frames" : addon.id.includes("bingkai") ? "frames" : "keepsake"} /> : isVideo(addon.image) ? (
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
                  <span data-kiosk-ui="badge" className="absolute top-3 left-3 text-sm font-bold bg-yellow-300 border-2 border-black px-3 py-1 rounded-full">
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
                <span data-kiosk-ui="badge" className={illustrated ? "mt-auto flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-[#252820]/35 py-2 text-[13px] font-medium" : "mt-auto w-full text-base font-bold border-2 border-black py-3 rounded-lg bg-white group-hover:bg-black group-hover:text-white transition-colors flex items-center justify-center gap-2"}>
                  {t("addons.addButton")}{" "}
                  <ArrowRight size={18} strokeWidth={3} />
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Skip Button */}
        <div className="flex justify-center mt-7">
          <button data-kiosk-ui="control"
            onClick={handleSkipOrFinish}
            className="woset-plain-button text-2xl font-bold border-4 border-black px-16 py-5 bg-white hover:bg-black hover:text-white transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            {t("addons.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
