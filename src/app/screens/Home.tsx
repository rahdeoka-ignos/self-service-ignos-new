import { useNavigate } from "react-router";
import { Camera, Users } from "lucide-react";
import { BrutalistCard } from "../components/BrutalistCard";
import { useEffect } from "react";

export function Home() {
  const navigate = useNavigate();
  useEffect(() => {
    fetch("http://localhost:5000/api/photos")
      .then((res) => res.json())
      .then((data) => {
        const photos = data.reverse().slice(0, 400);
        sessionStorage.setItem("gallery", JSON.stringify(photos));
      })
      .catch((err) => console.error("Prefetch failed:", err));
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
        <div className="text-center mb-16">
          <h1 className="text-7xl font-bold mb-6">IGNOS STUDIO</h1>
          <p className="text-3xl text-gray-700">Select your service</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {services.map((service) => (
            <BrutalistCard
              key={service.id}
              interactive
              onClick={() =>
                navigate("/people-count", { state: { serviceId: service.id } })
              }
              className="flex flex-col items-center justify-center text-center p-12 min-h-[400px] hover:scale-105"
            >
              <div className="w-32 h-32 bg-black rounded-full flex items-center justify-center mb-8 border-4 border-black">
                <service.icon
                  size={64}
                  className="text-white"
                  strokeWidth={3}
                />
              </div>
              <h2 className="text-4xl font-bold mb-4">{service.title}</h2>
              <p className="text-xl text-gray-600">{service.subtitle}</p>
            </BrutalistCard>
          ))}
        </div>
      </div>
    </div>
  );
}
