import { useNavigate } from "react-router";
import { BrutalistCard } from "../components/BrutalistCard";

export function AddOnQuestion() {
  const navigate = useNavigate();

  const addons = [
    {
      id: "4r-print",
      title: "Cetak Foto 4R",
      description: "Cetak foto ukuran 4R dengan kualitas tinggi",
      image: "/addons/4r.jpg",
      path: "/people-count",
      state: { serviceId: "photo-studio" },
    },
    {
      id: "keychain",
      title: "Gantungan Kunci",
      description: "Cetak foto menjadi gantungan kunci lucu",
      image: "/addons/keychain.jpg",
      path: "/keychain",
      state: {},
    },
    {
      id: "id-card",
      title: "ID Card",
      description: "Cetak foto menjadi kartu ID unik",
      image: "/addons/idcard.jpg",
      path: "/id-card",
      state: {},
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="max-w-7xl w-full">
        {/* Title */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4">Tambahan Cetakan</h1>
          <p className="text-2xl text-gray-700">
            Apakah kamu ingin menambahkan cetakan lainnya?
          </p>
        </div>

        {/* Addons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
          {addons.map((addon) => (
            <BrutalistCard
              key={addon.id}
              interactive
              onClick={() => navigate(addon.path, { state: addon.state })}
              className="flex flex-col items-center text-center p-8 hover:scale-105"
            >
              {/* Image */}
              <div className="w-full h-52 mb-6 overflow-hidden border-4 border-black rounded-xl">
                <img
                  src={addon.image}
                  alt={addon.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold mb-2">{addon.title}</h2>

              {/* Description */}
              <p className="text-gray-600 text-lg">{addon.description}</p>
            </BrutalistCard>
          ))}
        </div>

        {/* Skip Button */}
        <div className="flex justify-center mt-16">
          <button
            onClick={() => navigate("/payment")}
            className="text-xl font-bold border-4 border-black px-10 py-4 bg-white hover:bg-black hover:text-white transition"
          >
            Tidak, lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
}
