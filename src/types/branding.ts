export interface ReceiptBrandingConfig {
  headerTitle: string;
  headerSub: string;
  addressLine1: string;
  addressLine2: string;
  phoneContact: string;
  footerNote: string;
  socialNote: string;
}

export interface WhatsAppBrandingConfig {
  headerGreeting: string;
  introText: string;
  instagramTag: string;
  footerDisclaimer: string;
  expiryDays: number;
}

export interface WatermarkBrandingConfig {
  enabled: boolean;
  text: string;
  position: "bottom-left" | "bottom-center" | "bottom-right";
  opacity: number;
}

export interface StudioBrandingConfig {
  studioName: string;
  tagline: string;
  logoUrl: string;
  logoDarkUrl: string;
  address: string;
  phone: string;
  instagram: string;
  tiktok: string;
  website: string;
  receipt: ReceiptBrandingConfig;
  whatsapp: WhatsAppBrandingConfig;
  watermark: WatermarkBrandingConfig;
  lastUpdated?: string;
}

export const DEFAULT_BRANDING: StudioBrandingConfig = {
  studioName: "IGNOS STUDIO",
  tagline: "Self-Service Photobooth Station",
  logoUrl: "",
  logoDarkUrl: "",
  address: "Jl. Raya Abiansemal No. 12, Badung, Bali",
  phone: "081234567890",
  instagram: "@ignos.studio",
  tiktok: "@ignos.photobooth",
  website: "https://ignos.id",
  receipt: {
    headerTitle: "IGNOS STUDIO",
    headerSub: "Self-Service Photobooth Station",
    addressLine1: "Jl. Raya Abiansemal No. 12",
    addressLine2: "Badung, Bali",
    phoneContact: "WA: 0812-3456-7890",
    footerNote: "Terima kasih telah berfoto bersama kami!",
    socialNote: "Tag IG kami: @ignos.studio",
  },
  whatsapp: {
    headerGreeting: "Halo Kakak {customerName}",
    introText: "Berikut kami kirimkan link Google Drive softcopy foto hari ini, silahkan dicek ya kak.",
    instagramTag: "@ignos.studio",
    footerDisclaimer:
      "Mohon segera disimpan dikarenakan link akan expired dalam waktu 7 hari. Terima kasih kak, ditunggu kedatangannya yang selanjutnya!",
    expiryDays: 7,
  },
  watermark: {
    enabled: false,
    text: "IGNOS PHOTOBOOTH",
    position: "bottom-right",
    opacity: 0.6,
  },
};
