export interface SessionItemBreakdown {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface SessionRecord {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone?: string;
  notes?: string;
  invoiceNumber?: string;
  source?: "cashier" | "kiosk";
  paymentMethod?: "cash" | "qris" | "transfer";
  cashReceived?: number;
  cashChange?: number;
  discount?: number;
  packageName?: string;
  items?: SessionItemBreakdown[];
  peopleCount: number;
  coupleMode: boolean;
  joinedBonus: boolean;
  makeStory: boolean;
  softcopyType: "story_free" | "paid" | "none";
  softcopyCharge: number;
  prints: {
    regular: number;
    bonus: number;
    total: number;
  };
  a4Count: number;
  miscAddons: { name: string; qty: number; price?: number }[];
  basePrice: number;
  totalAddonsPrice: number;
  totalPrice: number;
  driveFolderName?: string;
  driveWebViewLink?: string;
}

export interface SessionsSummary {
  totalSessions: number;
  totalPeople: number;
  totalOmset: number;
  paymentSummary?: {
    cash: number;
    qris: number;
  };
  totalPrints: {
    regular: number;
    bonus: number;
    total4R: number;
    a4: number;
  };
  softcopy: {
    storyFree: number;
    paid: number;
    paidRevenue: number;
  };
  addonsSummary: { name: string; qty: number; revenue: number }[];
}

export interface SessionsResponse {
  success: boolean;
  date: string;
  summary: SessionsSummary;
  sessions: SessionRecord[];
  allAvailableDates: string[];
}
