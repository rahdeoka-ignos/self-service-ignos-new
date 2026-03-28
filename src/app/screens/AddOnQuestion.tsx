import { useLocation, useNavigate } from "react-router";
import { ArrowRight } from "lucide-react";

export function AddOnQuestion() {
  const location = useLocation();
  const peopleCount = location.state?.peopleCount || 1;

  const navigate = useNavigate();

  const addons = [
    {
      id: "4r-print",
      title: "Cetak Foto 4R",
      price: 10000,
      description:
        "Cetak foto ukuran 4R dengan hasil tajam, warna akurat, dan kertas premium.",
      image: "/addons/4r.jpg",
      path: "/people-count",
      state: {
        serviceId: "photo-studio",
        skipBonus: true,
        destination: "templates",
        disableModal: true,
      },
    },
    {
      id: "10r-print",
      title: "Cetak Foto A4",
      price: 20000,
      description: "Cetak foto ukuran A4 (10R) dengan kualitas tinggi.",
      image: "/addons/A4.jpg",
      path: "/people-count",
      state: {
        serviceId: "photo-studio",
        skipBonus: true,
        destination: "arrange-photos-a4",
        disableModal: true,
      },
    },
    {
      id: "keychain",
      title: "Gantungan Kunci",
      price: 25000,
      description: "Ubah foto favoritmu jadi gantungan kunci unik dan lucu.",
      image: "/addons/keychain.jpg",
      path: "/keychain",
      state: {},
    },
    {
      id: "id-card",
      title: "ID Card",
      price: 15000,
      description: "Cetak foto menjadi ID card custom dengan desain menarik.",
      image: "/addons/idcard.jpg",
      path: "/id-card",
      state: {},
    },
    {
      id: "bingkai-4r",
      title: "Bingkai 4R",
      price: 30000,
      description: "Percantik foto 4R dengan bingkai estetik siap pajang.",
      image: "/addons/bingkai4r.jpg",
      path: "/bingkai4r",
      state: {},
    },
    {
      id: "bingkai-a4",
      title: "Bingkai A4",
      price: 40000,
      description: "Bingkai elegan untuk foto A4, cocok untuk dekorasi.",
      image: "/addons/bingkaiA4.jpg",
      path: "/bingkaiA4",
      state: {},
    },
    {
      id: "flower-hotwheels",
      title: "Flower Hotwheels",
      price: 45000,
      description:
        "Dekorasi unik dengan bunga / miniatur, cocok untuk hadiah spesial.",
      image: "/addons/flower-hotwheels.jpg",
      path: "/flower-hotwheels",
      state: {},
    },
    {
      id: "cetak-bingkai3d-10r",
      title: "Cetak Bingkai 3D 10R",
      price: 90000,
      description: "Foto 10R dengan efek bingkai 3D premium.",
      image: "/addons/cetak-bingkai3d-10r.jpg",
      path: "/cetak-bingkai3d-10r",
      state: {},
    },
    {
      id: "cermin-foto-3d",
      title: "Cermin Foto 3D",
      price: 70000,
      description: "Cermin custom dengan efek foto 3D yang estetik.",
      image: "/addons/cermin-foto-3d.jpg",
      path: "/cermin-foto-3d",
      state: {},
    },
    {
      id: "boneka-tabung",
      title: "Boneka Tabung",
      price: 60000,
      description: "Boneka custom dengan foto pilihan, cocok untuk kado.",
      image: "/addons/boneka-tabung.jpg",
      path: "/boneka-tabung",
      state: {},
    },
    {
      id: "puzzle-foto",
      title: "Puzzle Foto",
      price: 90000,
      isPreorder: true,
      description: "Foto jadi puzzle seru, cocok untuk hadiah unik (PO).",
      image: "/addons/puzzle-foto.jpg",
      path: "/puzzle-foto",
      state: {},
    },
    {
      id: "photo-calender",
      title: "Photo Calender",
      price: 90000,
      isPreorder: false,
      description: "Photo Calender cocok untuk blablabla.",
      image: "/addons/photo-calender.jpg",
      path: "/photo-calender",
      state: {},
    },
  ];

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <div className="min-h-screen bg-gray-100 p-10 pt-14 pb-20">
      <div className="w-screen-3xl mx-auto">
        {/* Title */}
        <div className="text-center mb-14">
          <h1 className="text-7xl font-bold mb-5">Tambahan Cetakan</h1>
          <p className="text-3xl text-gray-600">
            Apakah kamu ingin menambahkan cetakan lainnya?
          </p>
        </div>

        {/* Addons Grid */}
        <div className="grid grid-cols-6 gap-6">
          {addons.map((addon) => (
            <div
              key={addon.id}
              onClick={() => navigate(addon.path, { state: addon.state })}
              className="group flex flex-col bg-white border-4 border-black rounded-2xl overflow-hidden cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-150"
            >
              {/* Image */}
              <div className="relative w-full aspect-square overflow-hidden border-b-4 border-black">
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
                {addon.isPreorder && (
                  <span className="absolute top-3 left-3 text-sm font-bold bg-yellow-300 border-2 border-black px-3 py-1 rounded-full">
                    PO
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-5 flex flex-col flex-1">
                <h2 className="text-xl font-bold leading-tight mb-2">
                  {addon.title}
                </h2>
                <p className="text-lg font-bold text-black mb-4">
                  {formatPrice(addon.price)}
                </p>
                <button className="mt-auto w-full text-base font-bold border-2 border-black py-3 rounded-lg bg-white group-hover:bg-black group-hover:text-white transition-colors flex items-center justify-center gap-2">
                  Tambah <ArrowRight size={18} strokeWidth={3} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Skip Button */}
        <div className="flex justify-center mt-14">
          <button
            onClick={() =>
              navigate("/story-question", {
                state: { peopleCount },
              })
            }
            className="text-2xl font-bold border-4 border-black px-16 py-5 bg-white hover:bg-black hover:text-white transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
          >
            Tidak, lanjutkan →
          </button>
        </div>
      </div>
    </div>
  );
}
