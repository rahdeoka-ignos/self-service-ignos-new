import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { BrutalistCard } from "../components/BrutalistCard";
import { BrutalistButton } from "../components/BrutalistButton";
import { Navigation } from "../components/Navigation";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

const categories = [
  {
    id: "kpop",
    name: "K-Pop",
    image:
      "https://images.unsplash.com/photo-1647795739144-1ae54d6ed146?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxrcG9wJTIwYWVzdGhldGljJTIwY29sb3JmdWx8ZW58MXx8fHwxNzcyODUxNDg2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "retro",
    name: "Retro",
    image:
      "https://images.unsplash.com/photo-1701115126398-7e52d5686726?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwcmV0cm8lMjBwb2xhcm9pZHxlbnwxfHx8fDE3NzI4NTYwODl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "basic",
    name: "Basic",
    image:
      "https://images.unsplash.com/photo-1516902628124-1db92f2976ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwYmFzaWMlMjBzaW1wbGV8ZW58MXx8fHwxNzcyODU2MDg5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "vintage",
    name: "Vintage",
    image:
      "https://images.unsplash.com/photo-1682718619474-2f7af6b12c01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwZmlsbSUyMHBob3RvZ3JhcGh5fGVufDF8fHx8MTc3Mjc4NDc4MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "cute",
    name: "Cute",
    image:
      "https://images.unsplash.com/photo-1770389356351-3406c6d7f629?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjdXRlJTIwa2F3YWlpJTIwcGFzdGVsfGVufDF8fHx8MTc3Mjg1NjA5MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
  {
    id: "wedding",
    name: "Wedding",
    image:
      "https://images.unsplash.com/photo-1753559319967-8f959ad78b2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWRkaW5nJTIwZWxlZ2FudCUyMGZsb3JhbHxlbnwxfHx8fDE3NzI4NTE2MTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  },
];

const templates = {
  kpop: [
    {
      id: 1,
      name: "grid-satu",
      preview: "/templates/grid-satu/background.png",
      layout: "1",
    },
    {
      id: 2,
      name: "grid-empat",
      preview: "/templates/grid-empat/background.png",
      layout: "4",
    },
    {
      id: 4,
      name: "grid-dua",
      preview: "/templates/grid-dua/background.png",
      layout: "2",
    },
    { id: 6, name: "grid-enam", preview: "/templates/grid-enam/background.png", layout: "6" },
    { id: 6, name: "ribuan-memori", preview: "/templates/ribuan-memori/background.png", layout: "6" },
    {
      id: 8,
      name: "Isi Delapan",
      preview: "/templates/kpop/8.jpg",
      layout: "4",
    },
  ],

  retro: [
    { id: 7, name: "Isi Satu", preview: "/templates/retro/1.jpg" },
    { id: 8, name: "Isi Dua", preview: "/templates/retro/2.jpg" },
    { id: 9, name: "Isi Tiga", preview: "/templates/retro/3.jpg" },
    { id: 10, name: "Isi Empat", preview: "/templates/retro/4.jpg" },
    { id: 11, name: "Isi Lima", preview: "/templates/retro/5.jpg" },
    { id: 12, name: "Isi Enam", preview: "/templates/retro/6.jpg" },
  ],

  basic: [
    { id: 13, name: "Isi Satu", preview: "/templates/basic/1.jpg" },
    { id: 14, name: "Isi Dua", preview: "/templates/basic/2.jpg" },
    { id: 15, name: "Isi Tiga", preview: "/templates/basic/3.jpg" },
    { id: 16, name: "Isi Empat", preview: "/templates/basic/4.jpg" },
    { id: 17, name: "Isi Lima", preview: "/templates/basic/5.jpg" },
    { id: 18, name: "Isi Enam", preview: "/templates/basic/6.jpg" },
  ],

  vintage: [
    { id: 19, name: "Isi Satu", preview: "/templates/vintage/1.jpg" },
    { id: 20, name: "Isi Dua", preview: "/templates/vintage/2.jpg" },
    { id: 21, name: "Isi Tiga", preview: "/templates/vintage/3.jpg" },
    { id: 22, name: "Isi Empat", preview: "/templates/vintage/4.jpg" },
    { id: 23, name: "Isi Lima", preview: "/templates/vintage/5.jpg" },
    { id: 24, name: "Isi Enam", preview: "/templates/vintage/6.jpg" },
  ],

  cute: [
    { id: 25, name: "Isi Satu", preview: "/templates/cute/1.jpg" },
    { id: 26, name: "Isi Dua", preview: "/templates/cute/2.jpg" },
    { id: 27, name: "Isi Tiga", preview: "/templates/cute/3.jpg" },
    { id: 28, name: "Isi Empat", preview: "/templates/cute/4.jpg" },
    { id: 29, name: "Isi Lima", preview: "/templates/cute/5.jpg" },
    { id: 30, name: "Isi Enam", preview: "/templates/cute/6.jpg" },
  ],

  wedding: [
    { id: 31, name: "Isi Satu", preview: "/templates/wedding/1.jpg" },
    { id: 32, name: "Isi Dua", preview: "/templates/wedding/2.jpg" },
    { id: 33, name: "Isi Tiga", preview: "/templates/wedding/3.jpg" },
    { id: 34, name: "Isi Empat", preview: "/templates/wedding/4.jpg" },
    { id: 35, name: "Isi Lima", preview: "/templates/wedding/5.jpg" },
    { id: 36, name: "Isi Enam", preview: "/templates/wedding/6.jpg" },
  ],
};
export function TemplateSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const peopleCount = location.state?.peopleCount || 1;
  const joinedBonus = location.state?.joinedBonus || false;
  const totalSelections = joinedBonus
    ? peopleCount <= 3
      ? peopleCount * 2
      : peopleCount + 1
    : peopleCount;

  const [selectedCategory, setSelectedCategory] = useState("kpop");
  const [userTemplates, setUserTemplates] = useState<{ [key: number]: any }>(
    {},
  );
  const [currentUser, setCurrentUser] = useState(1);

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
        templates: selectedTemplates,
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
    <div className="h-[100dvh] bg-gray-100 flex flex-col overflow-hidden">
      <Navigation currentStep={3} totalSteps={5} />

      <div className="pt-32 pb-8 px-8 flex-1 overflow-hidden">
        <div className="max-w-[1800px] mx-auto h-full flex flex-col">
          <h1 className="text-6xl font-bold mb-8 text-center">
            Select Templates
          </h1>
          <p className="text-2xl text-center mb-8 text-gray-700">
            Selecting for: <span className="font-bold">User {currentUser}</span>{" "}
            of {totalSelections}
          </p>

          <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden">
            {/* LEFT PANEL - Categories */}
            <div className="col-span-2 space-y-4 overflow-y-auto pr-2">
              <h2 className="text-2xl font-bold mb-4">Categories</h2>
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
            <div className="col-span-7 overflow-y-auto pr-2">
              <h2 className="text-2xl font-bold mb-4">
                {categories.find((c) => c.id === selectedCategory)?.name}{" "}
                Templates
              </h2>
              <div className="grid grid-cols-3 gap-6">
                {templates[selectedCategory as keyof typeof templates].map(
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
                        className={`p-6 cursor-pointer !text-black ${isSelected ? "scale-95" : "hover:scale-105"}`}
                      >
                        <div className="aspect-square bg-gray-200 rounded-lg mb-4 border-4 border-black flex items-center justify-center">
                          <ImageWithFallback
                            src={template.preview}
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
            </div>

            {/* RIGHT PANEL - Selected Templates */}
            <div className="col-span-3 overflow-y-auto scrollbar-thin pr-2">
              <h2 className="text-2xl font-bold mb-4">Your Selections</h2>
              <div className="space-y-4">
                {Array.from({ length: peopleCount }, (_, i) => i + 1).map(
                  (userNum) => (
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
                                  src={userTemplates[userNum].preview}
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
                              Not selected
                            </p>
                          )}
                        </div>
                      </div>
                    </BrutalistCard>
                  ),
                )}
              </div>

              {joinedBonus && (
                <h2 className="text-2xl font-bold my-4">Your Bonus</h2>
              )}

              <div className="space-y-4">
                {joinedBonus &&
                  Array.from(
                    { length: totalSelections - peopleCount },
                    (_, i) => peopleCount + i + 1,
                  ).map((slotNum) => (
                    <BrutalistCard key={slotNum} className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-pink-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
                          🎁
                        </div>

                        <div className="flex-1">
                          {userTemplates[slotNum] ? (
                            <div className="flex items-center gap-3 relative">
                              {/* tombol batal */}
                              <button
                                onClick={() => handleRemoveTemplate(slotNum)}
                                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white font-bold rounded-full border-2 border-black hover:scale-110"
                              >
                                ✕
                              </button>

                              <div className="w-16 h-16 border-4 border-black rounded-lg overflow-hidden">
                                <ImageWithFallback
                                  src={userTemplates[slotNum].preview}
                                  alt={userTemplates[slotNum].name}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              <div>
                                <p className="font-bold text-lg">
                                  {userTemplates[slotNum].name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Bonus Template #{userTemplates[slotNum].id}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-400 font-bold">
                              Bonus not selected
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
  );
}
