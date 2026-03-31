import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { BrutalistCard } from "../components/BrutalistCard";
import { BrutalistButton } from "../components/BrutalistButton";
import { Navigation } from "../components/Navigation";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useTranslation } from "react-i18next";
import { useCountdownTimer } from "../../hooks/useCountdownTimer";
import { TimerBar } from "../components/TimerBar";
import { TimerExpiredModal } from "../components/TimerExpiredModal";

const categories = [
  {
    id: "basic",
    name: "Basic",
    image:
      "https://i.pinimg.com/736x/38/9f/f8/389ff84e41cf3ebe424716ee3547b9f9.jpg",
  },
  {
    id: "aboutU",
    name: "About U",
    image:
      "https://i.pinimg.com/1200x/61/9e/bf/619ebf1684c5cca88d2450e4003a8ad6.jpg",
  },
];

const templates = {
  basic: [
    {
      id: 1,
      name: "grid-satu",
      preview: "/templates/grid-satu/background.png",
      layout: "1",
      previewTemplate: "/templates/grid-satu/preview.png",
    },
    {
      id: 2,
      name: "grid-empat",
      preview: "/templates/grid-empat/background.png",
      layout: "4",
      previewTemplate: "/templates/grid-empat/preview.png",
    },
    {
      id: 4,
      name: "grid-dua",
      preview: "/templates/grid-dua/background.png",
      layout: "2",
      previewTemplate: "/templates/grid-dua/preview.png",
    },
    {
      id: 6,
      name: "grid-enam",
      preview: "/templates/grid-enam/background.png",
      layout: "6",
      previewTemplate: "/templates/grid-enam/preview.png",
    },
    {
      id: 7,
      name: "ribuan-memori",
      preview: "/templates/ribuan-memori/background.png",
      layout: "6",
      previewTemplate: "/templates/ribuan-memori/preview.png",
    },
    {
      id: 8,
      name: "grid-delapan",
      preview: "/templates/grid-delapan/background.png",
      layout: "8",
      previewTemplate: "/templates/grid-delapan/preview.png",
    },
  ],

  aboutU: [
    {
      id: 9,
      name: "newspaper-1975",
      preview: "/templates/newspaper-1975/background.png",
      layout: "newspaper",
      previewTemplate: "/templates/newspaper-1975/preview.png",
    },
    {
      id: 10,
      name: "wannabeyours-1975",
      preview: "/templates/wannabeyours-1975/background.png",
      layout: "wannabeyours",
      previewTemplate: "/templates/wannabeyours-1975/preview.png",
    },
    {
      id: 11,
      name: "aboutU-1975",
      preview: "/templates/aboutU-1975/background.png",
      layout: "newspaper",
      previewTemplate: "/templates/aboutU-1975/preview.png",
    },
    {
      id: 12,
      name: "300days-1975",
      preview: "/templates/300days-1975/background.png",
      layout: "300days",
      previewTemplate: "/templates/300days-1975/preview.png",
    },
  ],
};

export function TemplateSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const peopleCount = location.state?.peopleCount || 1;
  const joinedBonus = location.state?.joinedBonus || false;
  const coupleMode = location.state?.coupleMode ?? false;
  const { t } = useTranslation();
  const timerDuration = location.state?.timerDuration ?? 20 * 60;
  const timer = useCountdownTimer(timerDuration);

  useEffect(() => {
    timer.start();
  }, []);

  // SESUDAH
  const totalSelections = joinedBonus
    ? coupleMode
      ? 2 // coupleMode + bonus → 1 template utama + 1 bonus
      : peopleCount <= 3
        ? peopleCount * 2
        : peopleCount + 1
    : coupleMode
      ? 1
      : peopleCount;
  const [selectedCategory, setSelectedCategory] = useState("basic");
  const [userTemplates, setUserTemplates] = useState<{ [key: number]: any }>(
    {},
  );
  const [currentUser, setCurrentUser] = useState(1);
  const comingSoonCategories = [""];
  const isComingSoon = comingSoonCategories.includes(selectedCategory);
  const handleTemplateSelect = (template: any) => {
    if (currentUser <= totalSelections) {
      setUserTemplates({ ...userTemplates, [currentUser]: template });
      if (currentUser < totalSelections) {
        setCurrentUser(currentUser + 1);
      }
    }
  };

  const handleContinue = () => {
    const selectedTemplates = Object.values(userTemplates).map((tpl: any) => ({
      background: `/templates/${tpl.name}/background.png`,
      overlay: `/templates/${tpl.name}/overlay.png`,
      layout: tpl.layout,
    }));

    navigate("/arrange-photos", {
      state: {
        peopleCount,
        joinedBonus,
        coupleMode,
        templates: selectedTemplates,
        // timerDuration,
      },
    });
  };

  const canContinue = Object.keys(userTemplates).length === totalSelections;

  const handleRemoveTemplate = (userNum: number) => {
    const updated = { ...userTemplates };
    delete updated[userNum];

    setUserTemplates(updated);

    if (userNum < currentUser) {
      setCurrentUser(userNum);
    }
  };

  return (
    <>
      <TimerBar
        minutes={timer.minutes}
        seconds={timer.seconds}
        timeLeft={timer.timeLeft}
      />
      {timer.isExpired && (
        <TimerExpiredModal
          onContinue={() =>
            navigate("/arrange-photos", {
              state: {
                peopleCount,
                joinedBonus,
                coupleMode,
                // templates: selectedTemplates,
              },
            })
          }
        />
      )}
      <div className="h-[100dvh] bg-gray-100 flex flex-col overflow-hidden">
        <Navigation currentStep={3} totalSteps={5} />

        <div className="pt-32 pb-8 px-8 flex-1 overflow-hidden">
          <div className="max-w-[1800px] mx-auto h-full flex flex-col">
            <h1 className="text-6xl font-bold mb-8 mt-10 text-center">
              {t("templateSelection.title")}
            </h1>
            <p className="text-2xl text-center mb-8 text-gray-700">
              {t("templateSelection.selectingFor")}{" "}
              <span className="font-bold">User {currentUser}</span> of{" "}
              {totalSelections}
            </p>

            <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden">
              {/* LEFT PANEL - Categories */}
              <div className="col-span-1 space-y-4 overflow-y-auto pr-2">
                <h2 className="text-2xl font-bold mb-4">
                  {t("templateSelection.categories")}
                </h2>
                {categories.map((category) => (
                  <BrutalistCard
                    key={category.id}
                    interactive
                    selected={selectedCategory === category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className="p-4 cursor-pointer !text-black"
                  >
                    <ImageWithFallback
                      src={category.image}
                      alt={category.name}
                      className="w-full h-24 object-cover rounded-lg mb-2 border-2 border-black"
                    />
                    <p className="text-lg font-bold text-center">
                      {category.name}
                    </p>
                  </BrutalistCard>
                ))}
              </div>

              {/* CENTER PANEL - Templates */}
              <div className="col-span-8 overflow-y-auto pr-2">
                <h2 className="text-2xl font-bold mb-4">
                  {categories.find((c) => c.id === selectedCategory)?.name}{" "}
                  {t("templateSelection.templates")}
                </h2>
                {isComingSoon ? (
                  <div className="flex items-center justify-center h-[400px] w-full border-4 border-dashed border-black rounded-2xl">
                    <div className="text-center">
                      <p className="text-3xl font-bold mb-2">
                        🚧 {t("templateSelection.comingSoon")}
                      </p>
                      <p className="text-gray-600">
                        {t("templateSelection.comingSoonDesc")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-6">
                    {templates[selectedCategory as keyof typeof templates]?.map(
                      (template) => {
                        const isSelected = Object.values(userTemplates).some(
                          (t) => t?.id === template.id,
                        );

                        return (
                          <BrutalistCard
                            key={template.id}
                            interactive
                            selected={isSelected}
                            onClick={() => handleTemplateSelect(template)}
                            className={`p-6 cursor-pointer !text-black ${isSelected ? "scale-95" : "hover:scale-105"} transition-none! hover:!translate-x-0 hover:!translate-y-0 active:!translate-x-0 active:!translate-y-0 hover:!scale-100`}
                          >
                            <div className="aspect-4/6 bg-gray-200 rounded-lg mb-4 border-4 border-black flex items-center justify-center">
                              <ImageWithFallback
                                src={template.previewTemplate}
                                alt={template.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <p className="text-xl font-bold text-center">
                              {template.name}
                            </p>
                          </BrutalistCard>
                        );
                      },
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT PANEL - Selected Templates */}
              {/* RIGHT PANEL - Selected Templates */}
              <div className="col-span-3 overflow-y-auto scrollbar-thin pr-2">
                <h2 className="text-2xl font-bold mb-4">
                  {coupleMode
                    ? t("templateSelection.rightPanel.allTemplate")
                    : t("templateSelection.rightPanel.yourSelections")}
                </h2>

                {/* Your Selections */}
                <div className="space-y-4">
                  {Array.from(
                    { length: coupleMode ? 1 : peopleCount },
                    (_, i) => i + 1,
                  ).map((userNum) => (
                    <BrutalistCard
                      key={userNum}
                      className={`p-4 ${userNum === currentUser ? "border-8" : ""}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">
                          {userNum}
                        </div>
                        <div className="flex-1">
                          {userTemplates[userNum] ? (
                            <div className="flex items-center gap-3 relative">
                              <button
                                onClick={() => handleRemoveTemplate(userNum)}
                                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white font-bold rounded-full border-2 border-black hover:scale-110"
                              >
                                ✕
                              </button>
                              <div className="w-16 h-16 border-4 border-black rounded-lg overflow-hidden">
                                <ImageWithFallback
                                  src={userTemplates[userNum].previewTemplate}
                                  alt={userTemplates[userNum].name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="font-bold text-lg">
                                  {userTemplates[userNum].name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Template #{userTemplates[userNum].id}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-400 font-bold">
                              {t("templateSelection.rightPanel.notSelected")}
                            </p>
                          )}
                        </div>
                      </div>
                    </BrutalistCard>
                  ))}
                </div>

                {/* Your Bonus */}
                {joinedBonus && (
                  <h2 className="text-2xl font-bold my-4">
                    {t("templateSelection.bonus.title")}
                  </h2>
                )}
                <div className="space-y-4">
                  {joinedBonus &&
                    Array.from(
                      {
                        length:
                          totalSelections - (coupleMode ? 1 : peopleCount),
                      },
                      (_, i) => (coupleMode ? 1 : peopleCount) + i + 1,
                    ).map((slotNum) => (
                      <BrutalistCard
                        key={slotNum}
                        className={`p-4 ${slotNum === currentUser ? "border-8" : ""}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-pink-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
                            🎁
                          </div>
                          <div className="flex-1">
                            {userTemplates[slotNum] ? (
                              <div className="flex items-center gap-3 relative">
                                <button
                                  onClick={() => handleRemoveTemplate(slotNum)}
                                  className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white font-bold rounded-full border-2 border-black hover:scale-110"
                                >
                                  ✕
                                </button>
                                <div className="w-16 h-16 border-4 border-black rounded-lg overflow-hidden">
                                  <ImageWithFallback
                                    src={userTemplates[slotNum].previewTemplate}
                                    alt={userTemplates[slotNum].name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <p className="font-bold text-lg">
                                    {userTemplates[slotNum].name}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {t(
                                      "templateSelection.bonus.bonusTemplate",
                                      {
                                        id: userTemplates[slotNum].id,
                                      },
                                    )}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-400 font-bold">
                                {t("templateSelection.bonus.notSelected")}
                              </p>
                            )}
                          </div>
                        </div>
                      </BrutalistCard>
                    ))}
                </div>

                <div className="mt-8">
                  <BrutalistButton
                    onClick={handleContinue}
                    disabled={!canContinue}
                    className="w-full"
                    size="md"
                  >
                    Continue
                  </BrutalistButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
