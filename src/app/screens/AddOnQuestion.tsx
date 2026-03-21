import { useNavigate } from "react-router";
import { BrutalistCard } from "../components/BrutalistCard";
import { BrutalistButton } from "../components/BrutalistButton";

export function AddOnQuestion() {
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
      state: { serviceId: "photo-studio", skipBonus: true },
    },
    {
      id: "10r-print",
      title: "Cetak Foto A4",
      price: 20000,
      description: "Cetak foto ukuran A4 (10R) dengan kualitas tinggi...",
      image: "/addons/A4.jpg",
      path: "/people-count",
      state: {
        serviceId: "photo-studio",
        skipBonus: true,
        destination: "arrange-photos-a4",
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
      isPreorder: true,
      description: "Photo Calender cocok untuk blablabla",
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className=" mx-auto">
        {/* Title */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4">Tambahan Cetakan</h1>
          <p className="text-2xl text-gray-700">
            Apakah kamu ingin menambahkan cetakan lainnya?
          </p>
        </div>

        {/* Addons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-10 mx-auto items-center">
          {addons.map((addon) => (
            <BrutalistCard
              key={addon.id}
              interactive
              onClick={() => navigate(addon.path, { state: addon.state })}
              className="flex flex-col items-center text-center p-3 hover:scale-105"
            >
              {/* Image */}
              <div className="w-full h-80 mb-6 overflow-hidden border-4 border-black rounded-xl">
                <img
                  src={addon.image}
                  alt={addon.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <h2 className="text-2xl font-bold mb-1">{addon.title}</h2>

              {/* Price */}
              <p className="text-xl font-semibold text-black mb-2">
                {formatPrice(addon.price)}
              </p>

              {/* Preorder badge */}
              {/* {addon.isPreorder && (
                <span className="text-sm bg-yellow-300 px-2 py-1 border-2 border-black mb-2">
                  PO
                </span>
              )} */}

              {/* Description */}
              {/* <p className="text-gray-600 text-lg">{addon.description}</p> */}
              <BrutalistButton size="sm" className="cursor-pointer">
                Tambah
              </BrutalistButton>
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
