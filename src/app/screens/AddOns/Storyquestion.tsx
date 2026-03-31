import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Navigation } from "../../components/Navigation";
import {
  Instagram,
  CheckCircle,
  XCircle,
  ChevronRight,
  AtSign,
} from "lucide-react";
import { BrutalistButton } from "../../components/BrutalistButton";
import { Trans, useTranslation } from "react-i18next";

export function StoryQuestion() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const peopleCount: number = location.state?.peopleCount ?? 1;
  const serviceId: string = location.state?.serviceId ?? "photo-box";
  const coupleMode: boolean = location.state?.coupleMode ?? false;
  const keychainOrders: string[] = location.state?.keychainOrder ?? [];
  console.log(keychainOrders);
  
  const getRequiredUsernames = (count: number): number => {
    if (count <= 1) return 1;
    if (count <= 3) return 2;
    if (count <= 5) return 3;
    if (count <= 7) return 4;
    return 5;
  };

  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const requiredUsernames = getRequiredUsernames(peopleCount);
  const [usernames, setUsernames] = useState<string[]>(
    Array(requiredUsernames).fill(""),
  );
  const [errors, setErrors] = useState<boolean[]>(
    Array(requiredUsernames).fill(false),
  );

  const setUsername = (index: number, value: string) => {
    setUsernames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setErrors((prev) => {
      const next = [...prev];
      next[index] = false;
      return next;
    });
  };

  const validate = () => {
    if (choice !== "yes") return true;
    const newErrors = usernames.map((u) => u.trim() === "");
    setErrors(newErrors);
    return !newErrors.some(Boolean);
  };

  const handleContinue = () => {
    if (!choice) return;
    if (!validate()) return;

    navigate("/complete", {
      state: {
        ...location.state,
        keychainOrders,
        peopleCount,
        serviceId,
        coupleMode,
        makeStory: choice === "yes",
        instagramUsernames:
          choice === "yes" ? usernames.map((u) => u.trim()) : [],
        extraCharge: choice === "no" ? 25000 : 0,
      },
    });
  };

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
        <div className="max-w-6xl w-full">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="w-28 h-28 bg-black rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-black">
              <Instagram size={56} className="text-white" strokeWidth={2} />
            </div>
            <h1 className="text-7xl font-bold mb-5">{t("story.title")}</h1>
            <p className="text-3xl text-gray-600 leading-relaxed">
              <Trans
                i18nKey="story.subtitle"
                components={{
                  1: <span className="font-bold text-black" />,
                }}
              />
            </p>
          </div>

          {/* Choice Cards */}
          <div className="grid grid-cols-2 gap-7 mb-10">
            {/* YES */}
            <button
              onClick={() => setChoice("yes")}
              className={`
                group flex flex-col items-start gap-6 p-10 border-4 border-black rounded-2xl text-left transition-all cursor-pointer
                ${
                  choice === "yes"
                    ? "bg-black text-white shadow-none translate-x-1 translate-y-1"
                    : "bg-white hover:bg-black hover:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                }
              `}
            >
              <div
                className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shrink-0 transition-colors
                ${choice === "yes" ? "border-white bg-green-400" : "border-black bg-green-300 group-hover:border-white group-hover:bg-green-400"}`}
              >
                <CheckCircle
                  size={40}
                  strokeWidth={2.5}
                  className="text-black"
                />
              </div>
              <div>
                <p className="font-bold text-4xl leading-tight mb-2">
                  {t("story.choices.yes.title")}
                </p>
                <p
                  className={`text-xl leading-relaxed transition-colors ${choice === "yes" ? "text-gray-300" : "text-gray-500 group-hover:text-gray-300"}`}
                >
                  <Trans
                    i18nKey="story.choices.yes.description"
                    components={{
                      1: <span className="font-bold" />,
                    }}
                  />
                </p>
              </div>
              <span
                className={`text-lg font-bold px-5 py-2 border-2 rounded-full transition-colors mt-1
                ${choice === "yes" ? "border-white text-white" : "border-black group-hover:border-white"}`}
              >
                + Rp 0
              </span>
            </button>

            {/* NO */}
            <button
              onClick={() => setChoice("no")}
              className={`
                group flex flex-col items-start gap-6 p-10 border-4 border-black rounded-2xl text-left transition-all cursor-pointer
                ${
                  choice === "no"
                    ? "bg-black text-white shadow-none translate-x-1 translate-y-1"
                    : "bg-white hover:bg-black hover:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
                }
              `}
            >
              <div
                className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shrink-0 transition-colors
                ${choice === "no" ? "border-white bg-red-400" : "border-black bg-red-300 group-hover:border-white group-hover:bg-red-400"}`}
              >
                <XCircle size={40} strokeWidth={2.5} className="text-black" />
              </div>
              <div>
                <p className="font-bold text-4xl leading-tight mb-2">
                  {t("story.choices.no.title")}
                </p>
                <p
                  className={`text-xl leading-relaxed transition-colors ${choice === "no" ? "text-gray-300" : "text-gray-500 group-hover:text-gray-300"}`}
                >
                  <Trans
                    i18nKey="story.choices.no.description"
                    components={{
                      1: <span className="font-bold" />,
                    }}
                  />
                </p>
              </div>
              <span
                className={`text-lg font-bold px-5 py-2 border-2 rounded-full transition-colors mt-1
                ${choice === "no" ? "border-white text-white" : "border-black group-hover:border-white"}`}
              >
                + {formatPrice(25000)}
              </span>
            </button>
          </div>

          {/* Instagram username inputs — shown when "yes" */}
          {choice === "yes" && (
            <div className="bg-white border-4 border-black rounded-2xl p-10 mb-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {/* Instruction */}
              <div className="flex items-start gap-4 mb-8 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-xl">
                <Instagram
                  size={28}
                  className="text-yellow-600 shrink-0 mt-0.5"
                  strokeWidth={2}
                />
                <p className="text-xl text-yellow-800 leading-relaxed">
                  <span className="font-bold">
                    {t("story.instructions.title")}
                  </span>
                  <br />
                  1. {t("story.instructions.steps.0")}
                  <br />
                  2. {t("story.instructions.steps.1")}
                  <br />
                  3. {t("story.instructions.steps.2")}
                </p>
              </div>

              <h3 className="text-2xl font-bold mb-5">
                {t("story.username.title")}
                <span className="ml-3 text-xl font-normal text-gray-500">
                  {t("story.username.accounts", { count: requiredUsernames })}
                </span>
              </h3>

              <div className="space-y-4">
                {usernames.map((username, i) => (
                  <div key={i} className="flex items-center gap-4">
                    {/* Number badge */}
                    <div className="w-11 h-11 bg-black text-white rounded-full flex items-center justify-center text-lg font-bold shrink-0">
                      {i + 1}
                    </div>
                    {/* Input */}
                    <div
                      className={`flex-1 flex items-center border-4 rounded-xl overflow-hidden transition-colors
                      ${errors[i] ? "border-red-500" : "border-black"}`}
                    >
                      <div className="bg-gray-100 border-r-4 border-black px-4 h-full flex items-center py-4">
                        <AtSign
                          size={24}
                          strokeWidth={2.5}
                          className="text-gray-500"
                        />
                      </div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(i, e.target.value)}
                        placeholder={t("story.username.placeholder", {
                          number: i + 1,
                        })}
                        className="flex-1 px-5 py-4 text-xl font-medium outline-none bg-white placeholder:text-gray-400"
                      />
                    </div>
                    {errors[i] && (
                      <p className="text-red-500 text-base font-bold shrink-0">
                        {errors[i] && <p>{t("story.username.required")}</p>}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extra charge info — shown when "no" */}
          {choice === "no" && (
            <div className="bg-white border-4 border-black rounded-2xl p-8 mb-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-2xl">
                    {t("story.extraCharge.title")}
                  </p>
                  <p className="text-gray-500 text-xl">
                    {t("story.extraCharge.description")}
                  </p>
                </div>
                <p className="text-4xl font-bold">{formatPrice(25000)}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-6">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 text-2xl font-bold border-4 border-black px-10 py-5 bg-white hover:bg-black hover:text-white transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
            >
              {t("story.actions.back")}
            </button>
            <BrutalistButton
              onClick={handleContinue}
              disabled={!choice}
              className="flex-2 min-w-[240px]"
              size="md"
            >
              {t("story.actions.continue")}
              <ChevronRight size={24} strokeWidth={3} className="inline ml-1" />
            </BrutalistButton>
          </div>
        </div>
      </div>
    </div>
  );
}
