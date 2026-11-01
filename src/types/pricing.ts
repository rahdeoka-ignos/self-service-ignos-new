export interface AddonItemPricing {
  id: string;
  title: string;
  price: number;
  enabled: boolean;
  isPreorder?: boolean;
  description?: string;
  image?: string;
  path?: string;
}

export interface VariantPricing {
  id: string;
  name: string;
  subtitle?: string;
  price: number;
  enabled: boolean;
  image?: string;
  orientation?: "portrait" | "landscape";
}

export interface PricingConfig {
  currency: string;
  currencySymbol: string;
  // Sesi Dasar
  session: {
    basePrice: number;
    includedPeople: number;
    extraPersonPrice: number;
    softcopyCharge: number;
  };
  // Cetak Foto
  prints: {
    print4rPrice: number;
    printA4Price: number;
  };
  // Varian Gantungan Kunci & ID Card
  keychains: VariantPricing[];
  idCards: VariantPricing[];
  // Add-ons utama
  addons: AddonItemPricing[];
}

export const DEFAULT_PRICING: PricingConfig = {
  currency: "IDR",
  currencySymbol: "Rp",
  session: {
    basePrice: 50000,
    includedPeople: 2,
    extraPersonPrice: 15000,
    softcopyCharge: 25000,
  },
  prints: {
    print4rPrice: 10000,
    printA4Price: 20000,
  },
  keychains: [
    {
      id: "kotak-plastik",
      name: "Kotak Plastik",
      subtitle: "Full Foto",
      price: 15000,
      enabled: true,
      image: "/addons/keychain-kotak-plastik.png",
    },
    {
      id: "kotak-metal",
      name: "Kotak Metal",
      subtitle: "Full Foto",
      price: 30000,
      enabled: true,
      image: "/addons/keychain-kotak-metal.png",
    },
    {
      id: "oval-metal",
      name: "Oval Metal",
      subtitle: "Full Foto",
      price: 30000,
      enabled: true,
      image: "/addons/keychain-oval-metal.png",
    },
    {
      id: "love-metal",
      name: "Love Metal",
      subtitle: "Full Foto",
      price: 30000,
      enabled: true,
      image: "/addons/keychain-love-metal.png",
    },
  ],
  idCards: [
    {
      id: "portrait-full",
      name: "ID Card Portrait",
      subtitle: "Full Foto",
      price: 35000,
      enabled: true,
      image: "/addons/idcard-portrait-full.png",
      orientation: "portrait",
    },
    {
      id: "landscape-full",
      name: "ID Card Landscape",
      subtitle: "Full Foto",
      price: 35000,
      enabled: true,
      image: "/addons/idcard-landscape-full.png",
      orientation: "landscape",
    },
    {
      id: "landscape-blue",
      name: "ID Card Landscape",
      subtitle: "Design Biru",
      price: 35000,
      enabled: true,
      image: "/addons/idcard-blue.png",
      orientation: "landscape",
    },
    {
      id: "landscape-red",
      name: "ID Card Landscape",
      subtitle: "Design Merah",
      price: 35000,
      enabled: true,
      image: "/addons/idcard-red.png",
      orientation: "landscape",
    },
  ],
  addons: [
    {
      id: "4r-print",
      title: "Cetak Foto 4R",
      price: 10000,
      enabled: true,
      description: "Cetak foto ukuran 4R dengan hasil tajam, warna akurat, dan kertas premium.",
      image: "/addons/cetak4r.mp4",
      path: "/people-count",
    },
    {
      id: "10r-print",
      title: "Cetak Foto A4",
      price: 20000,
      enabled: true,
      description: "Cetak foto ukuran A4 (10R) dengan kualitas tinggi.",
      image: "/addons/cetaka4.mp4",
      path: "/people-count",
    },
    {
      id: "keychain",
      title: "Gantungan Kunci",
      price: 15000,
      enabled: true,
      description: "Ubah foto favoritmu jadi gantungan kunci unik dan lucu.",
      image: "/addons/keychain.mp4",
      path: "/keychain",
    },
    {
      id: "id-card",
      title: "ID Card",
      price: 35000,
      enabled: true,
      description: "Cetak foto menjadi ID card custom dengan desain menarik.",
      image: "/addons/idcard.mp4",
      path: "/id-card",
    },
    {
      id: "bingkai-4r",
      title: "Bingkai 4R",
      price: 25000,
      enabled: true,
      description: "Percantik foto 4R dengan bingkai estetik siap pajang.",
      image: "/addons/bingkai4r.mp4",
      path: "/bingkai4r",
    },
    {
      id: "bingkai-a4",
      title: "Bingkai A4",
      price: 40000,
      enabled: true,
      description: "Bingkai elegan untuk foto A4, cocok untuk dekorasi.",
      image: "/addons/bingkaia4.mp4",
      path: "/bingkaiA4",
    },
    {
      id: "flower-hotwheels",
      title: "Flower Hotwheels",
      price: 45000,
      enabled: true,
      description: "Dekorasi unik dengan bunga / miniatur, cocok untuk hadiah spesial.",
      image: "/addons/hotwheel.mp4",
      path: "/flower-hotwheels",
    },
    {
      id: "cetak-bingkai3d-10r",
      title: "Cetak Bingkai 3D 10R",
      price: 90000,
      enabled: true,
      description: "Foto 10R dengan efek bingkai 3D premium.",
      image: "/addons/bingkai3d.mp4",
      path: "/cetak-bingkai3d-10r",
    },
    {
      id: "boneka-tabung",
      title: "Boneka Tabung",
      price: 60000,
      enabled: true,
      description: "Boneka custom dengan foto pilihan, cocok untuk kado.",
      image: "/addons/boneka.mp4",
      path: "/boneka-tabung",
    },
    {
      id: "puzzle-foto",
      title: "Puzzle Foto",
      price: 90000,
      enabled: true,
      isPreorder: true,
      description: "Foto jadi puzzle seru, cocok untuk hadiah unik (PO).",
      image: "/addons/puzzel.mp4",
      path: "/puzzle-foto",
    },
    {
      id: "photo-calender",
      title: "Photo Calender",
      price: 90000,
      enabled: true,
      isPreorder: false,
      description: "Photo Calender custom dengan foto pilihan.",
      image: "/addons/kalender.mp4",
      path: "/photo-calender",
    },
    {
      id: "cermin-foto-3d",
      title: "Cermin Foto 3D",
      price: 70000,
      enabled: true,
      description: "Cermin custom dengan efek foto 3D yang estetik.",
      image: "/addons/cerminfoto.mp4",
      path: "/cermin-foto-3d",
    },
  ],
};
