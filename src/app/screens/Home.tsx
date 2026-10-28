import { clearSessionData } from "../../utils/sessionTracker";
import { useNavigate } from "react-router";
import { Camera, Users } from "lucide-react";
import { BrutalistCard } from "../components/BrutalistCard";
import { useEffect, useState } from "react";
import { BrutalistButton } from "../components/BrutalistButton";
import { preloadGallery } from "../../utils/photoPreloader";
import { useKioskTheme } from "../../context/KioskThemeContext";
import { CameraImportModal } from "../components/CameraImportModal";

export function Home() {
  const navigate = useNavigate();
  const { theme } = useKioskTheme();
  const [cameraImportOpen, setCameraImportOpen] = useState(false);

  useEffect(() => {
    clearSessionData();
    preloadGallery(200);
    const interval = setInterval(() => {
      preloadGallery(200);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const services = [
    {
      id: "photo-studio",
      title: "Photo Studio",
      subtitle: "Professional photo sessions with our expert photographers",
      icon: Camera,
    },
    {
      id: "photo-box",
      title: "Photo Box",
      subtitle: "Self-service fun photo box with instant prints",
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="max-w-7xl w-full">
        {/* Secret Double Click Trigger for Staff */}
        <div
          onDoubleClick={() => setCameraImportOpen(true)}
          className="text-center mb-16 cursor-default select-none"
          title={theme.studioName || "IGNOS STUDIO"}
        >
          {theme.logoUrl && (
            <img
              src={theme.logoUrl}
              alt={theme.studioName}
              className="h-16 mx-auto mb-5 object-contain"
            />
          )}
          <h1 className="text-7xl font-bold mb-6 tracking-tight">
            {theme.studioName || "IGNOS STUDIO"}
          </h1>
          <p className="text-3xl opacity-80">
            {theme.homeHeadline || "Kamu Habis Fotoan Dimana?"}
          </p>
          {theme.homeSubheadline && (
            <p className="text-xl opacity-60 mt-2">
              {theme.homeSubheadline}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {services.map((service) => (
            <BrutalistCard
              key={service.id}
              interactive
              onClick={() =>
                navigate("/people-count", { state: { serviceId: service.id } })
              }
              className="cursor-pointer flex flex-col items-center justify-center text-center p-12 min-h-[400px] hover:scale-105"
            >
              <div className="w-32 h-32 bg-black rounded-full flex items-center justify-center mb-8 border-4 border-black">
                <service.icon
                  size={64}
                  className="text-white"
                  strokeWidth={3}
                />
              </div>
              <h2 className="text-4xl font-bold mb-4">{service.title}</h2>
              <BrutalistButton size="sm">Yuk Lanjut</BrutalistButton>
            </BrutalistCard>
          ))}
        </div>
      </div>

      {/* Secret Camera Import Modal */}
      <CameraImportModal
        isOpen={cameraImportOpen}
        onClose={() => setCameraImportOpen(false)}
      />
    </div>
  );
}
