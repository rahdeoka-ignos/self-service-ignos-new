import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrutalistButton } from "./BrutalistButton";
import { useKioskTheme } from "../../context/KioskThemeContext";
import { CameraImportModal } from "./CameraImportModal";

interface NavigationProps {
  currentStep: number;
  totalSteps: number;
  showBack?: boolean;
}

export function Navigation({
  currentStep,
  totalSteps,
  showBack = true,
}: NavigationProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [cameraImportOpen, setCameraImportOpen] = useState(false);

  let studioName = "IGNOS STUDIO";
  let logoUrl = "";
  try {
    const { theme } = useKioskTheme();
    if (theme.studioName) studioName = theme.studioName;
    if (theme.logoUrl) logoUrl = theme.logoUrl;
  } catch {}

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "id" ? "en" : "id");
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-white border-b-4 border-black z-50">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            {showBack && (
              <BrutalistButton
                size="sm"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={24} />
                Back
              </BrutalistButton>
            )}
          </div>

          <div className="flex items-center gap-3">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-12 h-12 border-4 border-black rounded-full flex items-center justify-center text-xl font-bold ${
                  i + 1 <= currentStep
                    ? "bg-black text-white"
                    : "bg-white text-black"
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-4 shrink-0">
            {/* Language Switcher */}
            <BrutalistButton
              size="sm"
              variant="outline"
              onClick={toggleLanguage}
              className="flex items-center gap-1 font-black tracking-widest shrink-0"
            >
              {i18n.language === "id" ? "🇮🇩 ID" : "🇬🇧 EN"}
            </BrutalistButton>

            {/* Secret Staff Double Click Trigger */}
            <div
              onDoubleClick={() => setCameraImportOpen(true)}
              className="cursor-default select-none shrink-0"
              title={studioName}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={studioName}
                  className="h-10 max-w-[160px] object-contain shrink-0"
                />
              ) : (
                <div className="flex flex-col text-left leading-none shrink-0 select-none">
                  {studioName.trim().includes(" ") ? (
                    <>
                      <span className="text-xl md:text-2xl font-black tracking-widest leading-none">
                        {studioName.trim().substring(0, studioName.trim().lastIndexOf(" "))}
                      </span>
                      <span className="text-xl md:text-2xl font-black tracking-widest leading-none mt-0.5">
                        {studioName.trim().substring(studioName.trim().lastIndexOf(" ") + 1)}
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-black tracking-widest leading-none">
                      {studioName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Secret Camera Import Modal */}
      <CameraImportModal
        isOpen={cameraImportOpen}
        onClose={() => setCameraImportOpen(false)}
      />
    </>
  );
}
