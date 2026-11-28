import { apiFetch as fetch } from "../../utils/api";
import { notify } from "../../utils/notify";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  User,
  Phone,
  FileText,
  Plus,
  Minus,
  Trash2,
  Check,
  Receipt,
  Download,
  Share2,
  RefreshCw,
  Search,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfirmModal } from "../components/AdminConfirmModal";
import { AdminReceiptPreviewModal } from "../components/AdminReceiptPreviewModal";
import { usePricing } from "../../context/PricingContext";
import { useBranding } from "../../context/BrandingContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { generateReceiptPdf, ReceiptData, ReceiptItem } from "../../utils/generateReceiptPdf";
import type { SessionRecord, SessionsResponse } from "../../types/session";

const API = "http://localhost:5000";

function formatRupiah(num: number): string {
  return "Rp " + (Number(num) || 0).toLocaleString("id-ID");
}

function formatDateIndo(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

interface CustomItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export function AdminCashierPage() {
  usePageTitle("Kasir & E-Receipt Digital — Ignos");
  const { pricing } = usePricing();
  // Branch-aware: address, phone & Instagram of this computer's cabang.
  const { effectiveBranding: branding } = useBranding();

  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");

  // Form States: Customer
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Form States: Base Session Package
  const [packageType, setPackageType] = useState<"standard" | "couple" | "group" | "custom">("standard");
  const [customBasePrice, setCustomBasePrice] = useState<number>(pricing.session.basePrice ?? 100000);
  const [peopleCount, setPeopleCount] = useState<number>(pricing.session.includedPeople ?? 2);

  // Form States: Add-ons & Merchandise
  const [print4rCount, setPrint4rCount] = useState<number>(0);
  const [printA4Count, setPrintA4Count] = useState<number>(0);
  const [softcopyOption, setSoftcopyOption] = useState<"story_free" | "paid" | "none">("story_free");

  // Keychains & ID Cards quantity maps: { [variantId]: qty }
  const [keychainCounts, setKeychainCounts] = useState<Record<string, number>>({});
  const [idCardCounts, setIdCardCounts] = useState<Record<string, number>>({});

  // Custom Line Items
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomPrice, setNewCustomPrice] = useState<number | "">("");

  // Payment
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris" | "transfer">("cash");
  const [cashReceived, setCashReceived] = useState<number | "">("");

  // Receipt Modal State
  const submissionRef = useRef<{ fingerprint: string; id: string; invoiceNumber: string } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [generatedReceiptData, setGeneratedReceiptData] = useState<ReceiptData | null>(null);
  const [generatedBlobUrl, setGeneratedBlobUrl] = useState<string | null>(null);
  const [generatedDownloadFn, setGeneratedDownloadFn] = useState<(() => void) | null>(null);
  const [savingSession, setSavingSession] = useState(false);

  // History Tab States
  const [historySessions, setHistorySessions] = useState<SessionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  // Reusable Alert/Confirm Modal conforming to GEMINI.md
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    category?: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    variant?: "danger" | "warning" | "info" | "success";
    singleButton?: boolean;
    onConfirm?: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    description: "",
  });

  // Calculate Base Session Price
  const basePrice = useMemo(() => {
    if (packageType === "custom") return Number(customBasePrice) || 0;
    return pricing.session.basePrice ?? 100000;
  }, [packageType, customBasePrice, pricing.session.basePrice]);

  const includedPeople = pricing.session.includedPeople ?? 2;
  const extraPersonPrice = pricing.session.extraPersonPrice ?? 15000;
  const extraPeopleCount = Math.max(0, peopleCount - includedPeople);
  const extraPeopleCost = extraPeopleCount * extraPersonPrice;

  // Calculate Add-on Costs
  const print4rCost = print4rCount * (pricing.prints.print4rPrice ?? 10000);
  const printA4Cost = printA4Count * (pricing.prints.printA4Price ?? 20000);
  const softcopyCost = softcopyOption === "paid" ? pricing.session.softcopyCharge ?? 25000 : 0;

  // Keychains Cost
  const keychainsBreakdown = useMemo(() => {
    return (pricing.keychains || [])
      .map((k) => {
        const qty = keychainCounts[k.id] || 0;
        return {
          id: k.id,
          name: `Gantungan Kunci (${k.name})`,
          qty,
          unitPrice: k.price,
          total: qty * k.price,
        };
      })
      .filter((k) => k.qty > 0);
  }, [pricing.keychains, keychainCounts]);

  const keychainsCost = useMemo(() => {
    return keychainsBreakdown.reduce((sum, item) => sum + item.total, 0);
  }, [keychainsBreakdown]);

  // ID Cards Cost
  const idCardsBreakdown = useMemo(() => {
    return (pricing.idCards || [])
      .map((k) => {
        const qty = idCardCounts[k.id] || 0;
        return {
          id: k.id,
          name: `ID Card (${k.name})`,
          qty,
          unitPrice: k.price,
          total: qty * k.price,
        };
      })
      .filter((k) => k.qty > 0);
  }, [pricing.idCards, idCardCounts]);

  const idCardsCost = useMemo(() => {
    return idCardsBreakdown.reduce((sum, item) => sum + item.total, 0);
  }, [idCardsBreakdown]);

  // Custom Items Cost
  const customItemsCost = useMemo(() => {
    return customItems.reduce((sum, it) => sum + it.qty * it.price, 0);
  }, [customItems]);

  // Totals
  const subtotal = useMemo(() => {
    return (
      basePrice +
      extraPeopleCost +
      print4rCost +
      printA4Cost +
      softcopyCost +
      keychainsCost +
      idCardsCost +
      customItemsCost
    );
  }, [
    basePrice,
    extraPeopleCost,
    print4rCost,
    printA4Cost,
    softcopyCost,
    keychainsCost,
    idCardsCost,
    customItemsCost,
  ]);

  const totalBill = useMemo(() => {
    return Math.max(0, subtotal - (Number(discountAmount) || 0));
  }, [subtotal, discountAmount]);

  // Cash Change Calculation
  const cashReceivedNum = typeof cashReceived === "number" ? cashReceived : 0;
  const cashChange = Math.max(0, cashReceivedNum - totalBill);
  const cashShortage = Math.max(0, totalBill - cashReceivedNum);

  // Auto set cash received to total bill if user switches to Cash or total changes
  useEffect(() => {
    if (paymentMethod === "cash" && (cashReceived === "" || cashReceived === 0)) {
      setCashReceived(totalBill);
    }
  }, [paymentMethod, totalBill]);

  // Fetch History Sessions
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`${API}/api/sessions?date=${today}`);
      if (res.ok) {
        const data: SessionsResponse = await res.json();
        setHistorySessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Gagal mengambil riwayat transaksi:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  // Add Custom Item
  const handleAddCustomItem = () => {
    if (!newCustomName.trim()) return;
    const price = Number(newCustomPrice) || 0;
    setCustomItems((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: newCustomName.trim(),
        qty: 1,
        price,
      },
    ]);
    setNewCustomName("");
    setNewCustomPrice("");
  };

  const handleRemoveCustomItem = (id: string) => {
    setCustomItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Reset form
  const handleResetForm = (skipConfirm = false) => {
    const doReset = () => {
      submissionRef.current = null;
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setPackageType("standard");
      setPeopleCount(pricing.session.includedPeople ?? 2);
      setCustomBasePrice(pricing.session.basePrice ?? 100000);
      setPrint4rCount(0);
      setPrintA4Count(0);
      setSoftcopyOption("story_free");
      setKeychainCounts({});
      setIdCardCounts({});
      setCustomItems([]);
      setDiscountAmount(0);
      setPaymentMethod("cash");
      setCashReceived("");
    };

    if (skipConfirm || (!customerName && customItems.length === 0)) {
      doReset();
    } else {
      setModalConfig({
        isOpen: true,
        title: "Reset Formulir Transaksi?",
        category: "Konfirmasi Kasir",
        description: "Seluruh data pelanggan, paket, dan pilihan add-ons yang telah diisi akan dikosongkan.",
        confirmText: "Kosongkan Form",
        cancelText: "Batal",
        isDangerous: false,
        variant: "warning",
        onConfirm: doReset,
      });
    }
  };

  // Compile Itemized Receipt List
  const compileReceiptItems = (): ReceiptItem[] => {
    const items: ReceiptItem[] = [];

    // Base package
    const packageName =
      packageType === "standard"
        ? `Sesi Foto Standar (${includedPeople} Orang)`
        : packageType === "couple"
        ? "Sesi Foto Couple (2 Orang)"
        : packageType === "group"
        ? `Sesi Foto Ramai-ramai (${peopleCount} Orang)`
        : "Sesi Foto Khusus";

    items.push({
      name: packageName,
      qty: 1,
      unitPrice: basePrice,
      total: basePrice,
    });

    // Extra People
    if (extraPeopleCount > 0) {
      items.push({
        name: `Tambahan Orang (+${extraPeopleCount} orang)`,
        qty: extraPeopleCount,
        unitPrice: extraPersonPrice,
        total: extraPeopleCost,
      });
    }

    // Prints
    if (print4rCount > 0) {
      items.push({
        name: "Cetak Foto 4R Tambahan",
        qty: print4rCount,
        unitPrice: pricing.prints.print4rPrice ?? 10000,
        total: print4rCost,
      });
    }
    if (printA4Count > 0) {
      items.push({
        name: "Cetak Foto A4 (10R)",
        qty: printA4Count,
        unitPrice: pricing.prints.printA4Price ?? 20000,
        total: printA4Cost,
      });
    }

    // Softcopy
    if (softcopyOption === "paid") {
      items.push({
        name: "Softcopy All Files (Google Drive)",
        qty: 1,
        unitPrice: pricing.session.softcopyCharge ?? 25000,
        total: softcopyCost,
      });
    } else if (softcopyOption === "story_free") {
      items.push({
        name: "Softcopy All Files (Bonus Story)",
        qty: 1,
        unitPrice: 0,
        total: 0,
      });
    }

    // Keychains
    keychainsBreakdown.forEach((k) => {
      items.push({
        name: k.name,
        qty: k.qty,
        unitPrice: k.unitPrice,
        total: k.total,
      });
    });

    // ID Cards
    idCardsBreakdown.forEach((k) => {
      items.push({
        name: k.name,
        qty: k.qty,
        unitPrice: k.unitPrice,
        total: k.total,
      });
    });

    // Custom items
    customItems.forEach((c) => {
      items.push({
        name: c.name,
        qty: c.qty,
        unitPrice: c.price,
        total: c.qty * c.price,
      });
    });

    return items;
  };

  // Submit Transaction & Generate E-Receipt
  const handleSaveAndGenerateReceipt = async () => {
    if (!customerName.trim()) {
      notify.warning("Nama Pelanggan Wajib Diisi", "Silakan masukkan nama pelanggan terlebih dahulu untuk mencetak bukti transaksi.");
      return;
    }

    if (paymentMethod === "cash" && cashReceivedNum < totalBill) {
      notify.warning("Nominal Uang Tunai Kurang", `Total tagihan adalah ${formatRupiah(totalBill)}, sedangkan uang diterima baru ${formatRupiah(cashReceivedNum)}. Kurang ${formatRupiah(cashShortage)}.`);
      return;
    }

    try {
      setSavingSession(true);

      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const timeStr = `${String(now.getHours()).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}`;
      const randomSeq = String(Math.floor(100 + Math.random() * 900));
      let invoiceNumber = `INV/${dateStr.replace(/-/g, "")}/${randomSeq}`;

      const receiptItems = compileReceiptItems();

      // Misc addons for compatibility with existing reports
      const miscAddons = [
        ...keychainsBreakdown.map((k) => ({ name: k.name, qty: k.qty, price: k.unitPrice })),
        ...idCardsBreakdown.map((k) => ({ name: k.name, qty: k.qty, price: k.unitPrice })),
        ...customItems.map((c) => ({ name: c.name, qty: c.qty, price: c.price })),
      ];

      const totalAddonsPrice =
        extraPeopleCost +
        print4rCost +
        printA4Cost +
        softcopyCost +
        keychainsCost +
        idCardsCost +
        customItemsCost;

      // 1. Prepare session payload for database
      const sessionPayload: Partial<SessionRecord> = {
        id: `SES-${Date.now()}`,
        timestamp: now.toISOString(),
        date: dateStr,
        time: timeStr,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        invoiceNumber,
        source: "cashier",
        paymentMethod,
        cashReceived: paymentMethod === "cash" ? cashReceivedNum : totalBill,
        cashChange: paymentMethod === "cash" ? cashChange : 0,
        discount: discountAmount,
        packageName: packageType,
        items: receiptItems,
        peopleCount,
        coupleMode: packageType === "couple",
        joinedBonus: false,
        makeStory: softcopyOption === "story_free",
        softcopyType: softcopyOption,
        softcopyCharge: softcopyCost,
        prints: {
          regular: includedPeople + print4rCount,
          bonus: 0,
          total: includedPeople + print4rCount,
        },
        a4Count: printA4Count,
        miscAddons,
        basePrice,
        totalAddonsPrice,
        totalPrice: totalBill,
      };

      // Reuse the transaction identity after an ambiguous network/PDF failure.
      const fingerprint = JSON.stringify({ ...sessionPayload, id: undefined, timestamp: undefined, date: undefined, time: undefined, invoiceNumber: undefined });
      if (submissionRef.current?.fingerprint !== fingerprint) {
        submissionRef.current = { fingerprint, id: `CASH-${crypto.randomUUID()}`, invoiceNumber };
      }
      sessionPayload.id = submissionRef.current.id;
      invoiceNumber = submissionRef.current.invoiceNumber;
      sessionPayload.invoiceNumber = invoiceNumber;

      // 2. Save session to backend
      const res = await fetch(`${API}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionPayload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Transaksi gagal disimpan. Struk belum diterbitkan.");
      }

      // 3. Generate PDF E-Receipt
      const receiptData: ReceiptData = {
        invoiceNumber,
        dateStr: formatDateIndo(dateStr),
        timeStr: `${timeStr.replace(".", ":")} WITA`,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        items: receiptItems,
        subtotal,
        discount: discountAmount > 0 ? discountAmount : undefined,
        total: totalBill,
        paymentMethod,
        cashReceived: paymentMethod === "cash" ? cashReceivedNum : undefined,
        cashChange: paymentMethod === "cash" ? cashChange : undefined,
        studioName: branding?.receipt?.headerTitle || branding?.studioName || "IGNOS STUDIO",
        studioTagline: branding?.receipt?.headerSub || branding?.tagline || "Self-Service Photobooth",
        studioAddress: [branding?.receipt?.addressLine1, branding?.receipt?.addressLine2].filter(Boolean).join(", ") || branding?.address,
        studioPhone: branding?.receipt?.phoneContact || branding?.phone,
        studioInstagram: branding?.instagram,
        footerNote: branding?.receipt?.footerNote || "Terima kasih telah berfoto bersama kami!",
      };

      const { blobUrl, download } = await generateReceiptPdf(receiptData);

      setGeneratedReceiptData(receiptData);
      setGeneratedBlobUrl(blobUrl);
      setGeneratedDownloadFn(() => download);
      setPreviewModalOpen(true);

      // Refresh history in background
      fetchHistory();
    } catch (err: any) {
      notify.error("Gagal Menerbitkan E-Receipt", "Terjadi kesalahan saat memproses receipt: " + (err.message || String(err)));
    } finally {
      setSavingSession(false);
    }
  };

  // Re-generate Receipt from History
  const handleRegenerateFromHistory = async (s: SessionRecord) => {
    const items: ReceiptItem[] = s.items && s.items.length > 0
      ? s.items
      : [
          {
            name: s.coupleMode ? "Sesi Foto Couple" : `Sesi Foto (${s.peopleCount} Orang)`,
            qty: 1,
            unitPrice: s.basePrice || s.totalPrice,
            total: s.basePrice || s.totalPrice,
          },
          ...(s.miscAddons || []).map((m) => ({
            name: m.name,
            qty: m.qty,
            unitPrice: m.price || 15000,
            total: m.qty * (m.price || 15000),
          })),
        ];

    const receiptData: ReceiptData = {
      invoiceNumber: s.invoiceNumber || `INV-${s.id.slice(-6)}`,
      dateStr: formatDateIndo(s.date),
      timeStr: `${s.time.replace(".", ":")} WITA`,
      customerName: s.customerName,
      customerPhone: s.customerPhone,
      notes: s.notes,
      items,
      subtotal: s.totalPrice + (s.discount || 0),
      discount: s.discount,
      total: s.totalPrice,
      paymentMethod: s.paymentMethod || "cash",
      cashReceived: s.cashReceived,
      cashChange: s.cashChange,
      studioName: branding?.receipt?.headerTitle || branding?.studioName || "IGNOS STUDIO",
      studioTagline: branding?.receipt?.headerSub || branding?.tagline,
      studioAddress: [branding?.receipt?.addressLine1, branding?.receipt?.addressLine2].filter(Boolean).join(", ") || branding?.address,
      studioPhone: branding?.receipt?.phoneContact || branding?.phone,
      studioInstagram: branding?.instagram,
      footerNote: branding?.receipt?.footerNote,
    };

    const { blobUrl, download } = await generateReceiptPdf(receiptData);
    setGeneratedReceiptData(receiptData);
    setGeneratedBlobUrl(blobUrl);
    setGeneratedDownloadFn(() => download);
    setPreviewModalOpen(true);
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return historySessions;
    const q = historySearch.toLowerCase();
    return historySessions.filter(
      (s) =>
        s.customerName.toLowerCase().includes(q) ||
        (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(q)) ||
        (s.customerPhone && s.customerPhone.includes(q)) ||
        s.time.includes(q),
    );
  }, [historySessions, historySearch]);

  return (
    <AdminLayout>
      <div className="w-full px-5 pb-8 pt-3 lg:px-[34px] space-y-7">
        {/* ── 1. HEADER & CONTROL BAR ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[var(--admin-border,#2a2d2f)]">
          <div>
            <p className="text-[12px] tracking-[0.14em] text-[var(--admin-muted,#92989d)] uppercase font-medium">
              KASIR OPERASIONAL & E-RECEIPT DIGITAL
            </p>
            <h1 className="text-[28px] sm:text-[30px] font-semibold tracking-[-0.04em] text-[var(--admin-text,#f4f4f5)] leading-[1.25] mt-1.5">
              Kasir & E-Receipt Digital
            </h1>
            <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.8] mt-1 max-w-2xl">
              Catat transaksi sesi studio, sesuaikan paket & add-ons merchandise, hitung kembalian tunai atau QRIS, lalu terbitkan e-receipt digital dalam format PDF.
            </p>
          </div>

          {/* Tab Navigation - Typography First (Rule 2) */}
          <div className="flex items-center gap-6  border-transparent">
            <button
              type="button"
              onClick={() => setActiveTab("pos")}
              className={`pb-2.5 text-[14px] transition-colors cursor-pointer ${
                activeTab === "pos"
                  ? " bg-[var(--admin-tab,#343638)] font-medium text-[var(--admin-text,#f4f4f5)]"
                  : "text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-text,#f4f4f5)] font-medium"
              }`}
            >
              Transaksi Baru (POS)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`pb-2.5 text-[14px] transition-colors cursor-pointer ${
                activeTab === "history"
                  ? " bg-[var(--admin-tab,#343638)] font-medium text-[var(--admin-text,#f4f4f5)]"
                  : "text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-text,#f4f4f5)] font-medium"
              }`}
            >
              Riwayat E-Receipt Hari Ini ({historySessions.length})
            </button>
          </div>
        </div>

        {/* ── 2. TAB: TRANSAKSI BARU (POS WORKSPACE) ── */}
        {activeTab === "pos" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ── LEFT COLUMN: INPUTS & SELECTIONS (lg:col-span-7 or 8) ── */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {/* CARD 1: IDENTITAS PELANGGAN */}
              <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)]">
                    1. Data Pelanggan
                  </h3>
                  <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                    Nama dan nomor kontak WhatsApp untuk penerbitan bukti transaksi.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5">
                      Nama Pelanggan / Pasangan <span className="text-[var(--admin-danger,#f18e9a)]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Contoh: Kak Sarah & Ryan"
                        className="w-full px-3.5 py-2.5 bg-[var(--admin-canvas,#111114)] border border-[var(--admin-border,#2a2d2f)] rounded-lg text-[13px] text-[var(--admin-text,#f4f4f5)] focus:bg-[var(--admin-canvas,#111114)] focus:border-[var(--admin-focus,#c0d0e7)] outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5">
                      Nomor WhatsApp Pelanggan
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full px-3.5 py-2.5 bg-[var(--admin-canvas,#111114)] border border-[var(--admin-border,#2a2d2f)] rounded-lg text-[13px] text-[var(--admin-text,#f4f4f5)] focus:bg-[var(--admin-canvas,#111114)] focus:border-[var(--admin-focus,#c0d0e7)] outline-none transition-colors font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5">
                      Catatan Sesi Studio (Opsional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Request backdrop abu-abu / wisuda 4 orang"
                      className="w-full px-3.5 py-2.5 bg-[var(--admin-canvas,#111114)] border border-[var(--admin-border,#2a2d2f)] rounded-lg text-[13px] text-[var(--admin-text,#f4f4f5)] focus:bg-[var(--admin-canvas,#111114)] focus:border-[var(--admin-focus,#c0d0e7)] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* CARD 2: PAKET SESI FOTO & KUOTA ORANG */}
              <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)]">
                    2. Paket Sesi Foto
                  </h3>
                  <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                    Tarif dasar sesi studio dan kalkulasi otomatis penambahan orang.
                  </p>
                </div>

                {/* Package Quick Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPackageType("standard");
                      setPeopleCount(pricing.session.includedPeople ?? 2);
                    }}
                    className={`p-3 rounded-[8px] border text-left transition-colors cursor-pointer ${
                      packageType === "standard"
                        ? "border-[var(--admin-focus,#c0d0e7)] bg-[var(--admin-card,#1c1f20)] "
                        : "border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:border-[var(--admin-border-strong,#41474e)]"
                    }`}
                  >
                    <span className="text-[12px] uppercase tracking-wider text-[var(--admin-muted,#92989d)] font-medium block">
                      Paket Dasar
                    </span>
                    <span className="text-[13px] font-semibold text-[var(--admin-text,#f4f4f5)] block mt-0.5">
                      Standar ({pricing.session.includedPeople ?? 2} Org)
                    </span>
                    <span className="text-[12px] text-[var(--admin-secondary,#c3c7ca)] font-mono mt-1 block">
                      {formatRupiah(pricing.session.basePrice ?? 100000)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPackageType("couple");
                      setPeopleCount(2);
                    }}
                    className={`p-3 rounded-[8px] border text-left transition-colors cursor-pointer ${
                      packageType === "couple"
                        ? "border-[var(--admin-focus,#c0d0e7)] bg-[var(--admin-card,#1c1f20)] "
                        : "border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:border-[var(--admin-border-strong,#41474e)]"
                    }`}
                  >
                    <span className="text-[12px] uppercase tracking-wider text-[var(--admin-muted,#92989d)] font-medium block">
                      Couple Mode
                    </span>
                    <span className="text-[13px] font-semibold text-[var(--admin-text,#f4f4f5)] block mt-0.5">
                      Sesi Couple (2 Org)
                    </span>
                    <span className="text-[12px] text-[var(--admin-secondary,#c3c7ca)] font-mono mt-1 block">
                      {formatRupiah(pricing.session.basePrice ?? 100000)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPackageType("group");
                      if (peopleCount < 3) setPeopleCount(4);
                    }}
                    className={`p-3 rounded-[8px] border text-left transition-colors cursor-pointer ${
                      packageType === "group"
                        ? "border-[var(--admin-focus,#c0d0e7)] bg-[var(--admin-card,#1c1f20)] "
                        : "border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:border-[var(--admin-border-strong,#41474e)]"
                    }`}
                  >
                    <span className="text-[12px] uppercase tracking-wider text-[var(--admin-muted,#92989d)] font-medium block">
                      Group / Rombongan
                    </span>
                    <span className="text-[13px] font-semibold text-[var(--admin-text,#f4f4f5)] block mt-0.5">
                      Grup (3+ Org)
                    </span>
                    <span className="text-[12px] text-[var(--admin-secondary,#c3c7ca)] font-mono mt-1 block">
                      +{formatRupiah(extraPersonPrice)}/org
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPackageType("custom")}
                    className={`p-3 rounded-[8px] border text-left transition-colors cursor-pointer ${
                      packageType === "custom"
                        ? "border-[var(--admin-focus,#c0d0e7)] bg-[var(--admin-card,#1c1f20)] "
                        : "border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:border-[var(--admin-border-strong,#41474e)]"
                    }`}
                  >
                    <span className="text-[12px] uppercase tracking-wider text-[var(--admin-muted,#92989d)] font-medium block">
                      Promo / Khusus
                    </span>
                    <span className="text-[13px] font-semibold text-[var(--admin-text,#f4f4f5)] block mt-0.5">
                      Tarif Custom
                    </span>
                    <span className="text-[12px] text-[var(--admin-secondary,#c3c7ca)] font-mono mt-1 block">
                      Input Bebas
                    </span>
                  </button>
                </div>

                {/* Custom Base Price Input (if custom selected) */}
                {packageType === "custom" && (
                  <div className="p-3.5 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl space-y-1.5">
                    <label className="block text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)]">
                      Nominal Tarif Sesi Dasar Custom (Rp)
                    </label>
                    <input
                      type="number"
                      value={customBasePrice}
                      onChange={(e) => setCustomBasePrice(Number(e.target.value) || 0)}
                      className="w-full max-w-xs px-3 py-2 bg-[var(--admin-canvas,#111114)] border border-[var(--admin-border,#2a2d2f)] rounded-[6px] text-[13px] font-mono outline-none"
                    />
                  </div>
                )}

                {/* People Count Counter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4  border-[var(--admin-border,#2a2d2f)]">
                  <div>
                    <span className="text-[13px] font-medium text-[var(--admin-text,#f4f4f5)] block">
                      Jumlah Pengunjung / Orang Masuk Studio
                    </span>
                    <span className="text-[12px] text-[var(--admin-muted,#92989d)] block">
                      Kapasitas paket dasar: {includedPeople} orang. Extra person: +{formatRupiah(extraPersonPrice)}/orang.
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPeopleCount((p) => Math.max(1, p - 1))}
                      disabled={peopleCount <= 1}
                      className="w-9 h-9 rounded-full border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] flex items-center justify-center text-[var(--admin-secondary,#c3c7ca)] disabled:opacity-40 cursor-pointer"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center font-mono font-semibold text-[16px] text-[var(--admin-text,#f4f4f5)]">
                      {peopleCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPeopleCount((p) => p + 1)}
                      className="w-9 h-9 rounded-full border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] flex items-center justify-center text-[var(--admin-secondary,#c3c7ca)] cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {extraPeopleCount > 0 && (
                  <div className="p-3 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl flex justify-between items-center text-[12px]">
                    <span className="text-[var(--admin-secondary,#c3c7ca)]">
                      Tambahan {extraPeopleCount} orang ({extraPeopleCount} x {formatRupiah(extraPersonPrice)})
                    </span>
                    <span className="font-mono font-semibold text-[var(--admin-text,#f4f4f5)]">
                      +{formatRupiah(extraPeopleCost)}
                    </span>
                  </div>
                )}
              </div>

              {/* CARD 3: ADD-ONS & CETAK FOTO */}
              <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 space-y-6">
                <div>
                  <h3 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)]">
                    3. Cetak Foto & Softcopy
                  </h3>
                  <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                    Opsi cetak lembar foto fisik dan hak unduh softcopy Google Drive.
                  </p>
                </div>

                {/* Print Count Rows */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cetak 4R */}
                  <div className="p-4 border border-[var(--admin-border,#2a2d2f)] rounded-[8px] flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-medium text-[var(--admin-text,#f4f4f5)] block">
                        Cetak Foto 4R Tambahan
                      </span>
                      <span className="text-[11.5px] text-[var(--admin-muted,#92989d)] font-mono">
                        {formatRupiah(pricing.prints.print4rPrice ?? 10000)} / lembar
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPrint4rCount((c) => Math.max(0, c - 1))}
                        disabled={print4rCount <= 0}
                        className="w-8 h-8 rounded-[6px] border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] flex items-center justify-center text-[var(--admin-secondary,#c3c7ca)] disabled:opacity-40 cursor-pointer"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-8 text-center font-mono font-medium text-[14px]">
                        {print4rCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPrint4rCount((c) => c + 1)}
                        className="w-8 h-8 rounded-[6px] border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] flex items-center justify-center text-[var(--admin-secondary,#c3c7ca)] cursor-pointer"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Cetak A4 */}
                  <div className="p-4 border border-[var(--admin-border,#2a2d2f)] rounded-[8px] flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-medium text-[var(--admin-text,#f4f4f5)] block">
                        Cetak Foto A4 (10R)
                      </span>
                      <span className="text-[11.5px] text-[var(--admin-muted,#92989d)] font-mono">
                        {formatRupiah(pricing.prints.printA4Price ?? 20000)} / lembar
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPrintA4Count((c) => Math.max(0, c - 1))}
                        disabled={printA4Count <= 0}
                        className="w-8 h-8 rounded-[6px] border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] flex items-center justify-center text-[var(--admin-secondary,#c3c7ca)] disabled:opacity-40 cursor-pointer"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-8 text-center font-mono font-medium text-[14px]">
                        {printA4Count}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPrintA4Count((c) => c + 1)}
                        className="w-8 h-8 rounded-[6px] border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] flex items-center justify-center text-[var(--admin-secondary,#c3c7ca)] cursor-pointer"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Softcopy Options Segmented */}
                <div className="space-y-2 pt-2">
                  <label className="block text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)]">
                    Ketentuan Softcopy Semua File
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setSoftcopyOption("story_free")}
                      className={`p-3 rounded-[8px] border text-left transition-colors cursor-pointer ${
                        softcopyOption === "story_free"
                          ? "border-[var(--admin-focus,#c0d0e7)] bg-[var(--admin-card,#1c1f20)]"
                          : "border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:border-[var(--admin-border-strong,#41474e)]"
                      }`}
                    >
                      <span className="text-[12.5px] font-semibold text-[var(--admin-text,#f4f4f5)] block">
                        Story IG Gratis
                      </span>
                      <span className="text-[12px] text-[var(--admin-muted,#92989d)] block mt-0.5">
                        Free (Tukarkan tag/story)
                      </span>
                      <span className="text-[11.5px] text-[var(--admin-accent-text,#c9d2e1)] font-mono mt-1 block">
                        Rp 0 (Bonus)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSoftcopyOption("paid")}
                      className={`p-3 rounded-[8px] border text-left transition-colors cursor-pointer ${
                        softcopyOption === "paid"
                          ? "border-[var(--admin-focus,#c0d0e7)] bg-[var(--admin-card,#1c1f20)]"
                          : "border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:border-[var(--admin-border-strong,#41474e)]"
                      }`}
                    >
                      <span className="text-[12.5px] font-semibold text-[var(--admin-text,#f4f4f5)] block">
                        Beli Softcopy All Files
                      </span>
                      <span className="text-[12px] text-[var(--admin-muted,#92989d)] block mt-0.5">
                        Akses Google Drive penuh
                      </span>
                      <span className="text-[11.5px] text-[var(--admin-text,#f4f4f5)] font-mono mt-1 block">
                        +{formatRupiah(pricing.session.softcopyCharge ?? 25000)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSoftcopyOption("none")}
                      className={`p-3 rounded-[8px] border text-left transition-colors cursor-pointer ${
                        softcopyOption === "none"
                          ? "border-[var(--admin-focus,#c0d0e7)] bg-[var(--admin-card,#1c1f20)]"
                          : "border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:border-[var(--admin-border-strong,#41474e)]"
                      }`}
                    >
                      <span className="text-[12.5px] font-semibold text-[var(--admin-text,#f4f4f5)] block">
                        Tanpa Softcopy
                      </span>
                      <span className="text-[12px] text-[var(--admin-muted,#92989d)] block mt-0.5">
                        Hanya cetak foto fisik
                      </span>
                      <span className="text-[11.5px] text-[var(--admin-muted,#92989d)] font-mono mt-1 block">
                        Rp 0
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD 4: MERCHANDISE & ADD-ONS (KEYCHAINS & ID CARDS) */}
              <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 space-y-5">
                <div>
                  <h3 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)]">
                    4. Merchandise Studio
                  </h3>
                  <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                    Gantungan kunci foto, ID Card custom, serta souvenir studio.
                  </p>
                </div>

                {/* Keychains list */}
                {pricing.keychains && pricing.keychains.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] block">
                      Varian Gantungan Kunci
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {pricing.keychains
                        .filter((k) => k.enabled !== false)
                        .map((k) => {
                          const currentQty = keychainCounts[k.id] || 0;
                          return (
                            <div
                              key={k.id}
                              className="p-3 border border-[var(--admin-border,#2a2d2f)] rounded-2xl flex items-center justify-between"
                            >
                              <div>
                                <span className="text-[12.5px] font-medium text-[var(--admin-text,#f4f4f5)] block">
                                  {k.name}
                                </span>
                                <span className="text-[12px] text-[var(--admin-muted,#92989d)] font-mono">
                                  {formatRupiah(k.price)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setKeychainCounts((prev) => ({
                                      ...prev,
                                      [k.id]: Math.max(0, (prev[k.id] || 0) - 1),
                                    }))
                                  }
                                  disabled={currentQty <= 0}
                                  className="w-7 h-7 rounded-lg border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] flex items-center justify-center text-[var(--admin-secondary,#c3c7ca)] disabled:opacity-40 cursor-pointer"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-6 text-center font-mono text-[13px]">
                                  {currentQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setKeychainCounts((prev) => ({
                                      ...prev,
                                      [k.id]: (prev[k.id] || 0) + 1,
                                    }))
                                  }
                                  className="w-7 h-7 rounded-lg border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] flex items-center justify-center text-[var(--admin-secondary,#c3c7ca)] cursor-pointer"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* ID Cards list */}
                {pricing.idCards && pricing.idCards.length > 0 && (
                  <div className="space-y-2.5 pt-3  border-[var(--admin-border,#2a2d2f)]">
                    <span className="text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] block">
                      Varian ID Card Custom
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {pricing.idCards
                        .filter((k) => k.enabled !== false)
                        .map((k) => {
                          const currentQty = idCardCounts[k.id] || 0;
                          return (
                            <div
                              key={k.id}
                              className="p-3 border border-[var(--admin-border,#2a2d2f)] rounded-2xl flex items-center justify-between"
                            >
                              <div>
                                <span className="text-[12.5px] font-medium text-[var(--admin-text,#f4f4f5)] block">
                                  {k.name}
                                </span>
                                <span className="text-[12px] text-[var(--admin-muted,#92989d)] font-mono">
                                  {formatRupiah(k.price)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setIdCardCounts((prev) => ({
                                      ...prev,
                                      [k.id]: Math.max(0, (prev[k.id] || 0) - 1),
                                    }))
                                  }
                                  disabled={currentQty <= 0}
                                  className="w-7 h-7 rounded-lg border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] flex items-center justify-center text-[var(--admin-secondary,#c3c7ca)] disabled:opacity-40 cursor-pointer"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-6 text-center font-mono text-[13px]">
                                  {currentQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setIdCardCounts((prev) => ({
                                      ...prev,
                                      [k.id]: (prev[k.id] || 0) + 1,
                                    }))
                                  }
                                  className="w-7 h-7 rounded-lg border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] flex items-center justify-center text-[var(--admin-secondary,#c3c7ca)] cursor-pointer"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Custom Line Item Addition */}
                <div className="pt-3  border-[var(--admin-border,#2a2d2f)] space-y-3">
                  <span className="text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)] block">
                    Tambah Item / Jasa Tambahan Manual (Opsional)
                  </span>
                  <div className="flex flex-col sm:flex-row items-center gap-2.5">
                    <input
                      type="text"
                      value={newCustomName}
                      onChange={(e) => setNewCustomName(e.target.value)}
                      placeholder="Nama item (contoh: Frame Kaca A4)"
                      className="flex-1 px-3 py-2 bg-[var(--admin-canvas,#111114)] border border-[var(--admin-border,#2a2d2f)] rounded-[6px] text-[12.5px] outline-none"
                    />
                    <input
                      type="number"
                      value={newCustomPrice}
                      onChange={(e) =>
                        setNewCustomPrice(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="Harga (Rp)"
                      className="w-36 px-3 py-2 bg-[var(--admin-canvas,#111114)] border border-[var(--admin-border,#2a2d2f)] rounded-[6px] text-[12.5px] font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomItem}
                      disabled={!newCustomName.trim()}
                      className="px-3.5 py-2 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border-strong,#41474e)] text-[var(--admin-secondary,#c3c7ca)] hover:bg-[#d2def0] hover:text-[#111b23] rounded-[6px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                    >
                      + Tambah Item
                    </button>
                  </div>

                  {customItems.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {customItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-[6px] text-[12.5px]"
                        >
                          <span className="font-medium text-[var(--admin-text,#f4f4f5)]">{item.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[var(--admin-secondary,#c3c7ca)]">{formatRupiah(item.price)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomItem(item.id)}
                              className="text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-danger,#f18e9a)] transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: BILLING & PAYMENT SUMMARY (lg:col-span-5 or 4) ── */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-6">
              {/* BILLING SUMMARY CARD */}
              <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 space-y-5">
                <div className="flex justify-between items-baseline pb-3  border-[var(--admin-border,#2a2d2f)]">
                  <h3 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)]">
                    Rincian Tagihan
                  </h3>
                  <span className="text-[12px] text-[var(--admin-muted,#92989d)] font-mono">
                    {compileReceiptItems().length} item
                  </span>
                </div>

                {/* Breakdown List */}
                <div className="space-y-2.5 text-[12.5px]">
                  <div className="flex justify-between">
                    <span className="text-[var(--admin-secondary,#c3c7ca)]">
                      Sesi Dasar ({includedPeople} orang)
                    </span>
                    <span className="font-mono text-[var(--admin-text,#f4f4f5)]">{formatRupiah(basePrice)}</span>
                  </div>

                  {extraPeopleCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--admin-secondary,#c3c7ca)]">Extra Person (+{extraPeopleCount})</span>
                      <span className="font-mono text-[var(--admin-text,#f4f4f5)]">+{formatRupiah(extraPeopleCost)}</span>
                    </div>
                  )}

                  {print4rCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--admin-secondary,#c3c7ca)]">Cetak 4R ({print4rCount}x)</span>
                      <span className="font-mono text-[var(--admin-text,#f4f4f5)]">+{formatRupiah(print4rCost)}</span>
                    </div>
                  )}

                  {printA4Cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--admin-secondary,#c3c7ca)]">Cetak A4 ({printA4Count}x)</span>
                      <span className="font-mono text-[var(--admin-text,#f4f4f5)]">+{formatRupiah(printA4Cost)}</span>
                    </div>
                  )}

                  {softcopyCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--admin-secondary,#c3c7ca)]">Softcopy All Files</span>
                      <span className="font-mono text-[var(--admin-text,#f4f4f5)]">+{formatRupiah(softcopyCost)}</span>
                    </div>
                  )}

                  {keychainsCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--admin-secondary,#c3c7ca)]">Gantungan Kunci</span>
                      <span className="font-mono text-[var(--admin-text,#f4f4f5)]">+{formatRupiah(keychainsCost)}</span>
                    </div>
                  )}

                  {idCardsCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--admin-secondary,#c3c7ca)]">ID Card Custom</span>
                      <span className="font-mono text-[var(--admin-text,#f4f4f5)]">+{formatRupiah(idCardsCost)}</span>
                    </div>
                  )}

                  {customItemsCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--admin-secondary,#c3c7ca)]">Item Tambahan Khusus</span>
                      <span className="font-mono text-[var(--admin-text,#f4f4f5)]">+{formatRupiah(customItemsCost)}</span>
                    </div>
                  )}

                  {/* Subtotal */}
                  <div className="pt-2  border-[var(--admin-border,#2a2d2f)] flex justify-between font-medium">
                    <span className="text-[var(--admin-secondary,#c3c7ca)]">Subtotal</span>
                    <span className="font-mono text-[var(--admin-text,#f4f4f5)]">{formatRupiah(subtotal)}</span>
                  </div>

                  {/* Discount Input */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <span className="text-[var(--admin-secondary,#c3c7ca)] text-[12px]">Potongan / Diskon</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[var(--admin-muted,#92989d)] font-mono text-[12px]">Rp</span>
                      <input
                        type="number"
                        value={discountAmount || ""}
                        onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-24 px-2 py-1 bg-[var(--admin-canvas,#111114)] border border-[var(--admin-border,#2a2d2f)] rounded text-right font-mono text-[12px] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Big Total Tagihan */}
                <div className="p-4 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-[8px] space-y-1">
                  <span className="text-[12px] font-semibold tracking-wider uppercase text-[var(--admin-muted,#92989d)]">
                    Total Pembayaran
                  </span>
                  <div className="text-[28px] font-bold font-mono tracking-tight text-[var(--admin-text,#f4f4f5)]">
                    {formatRupiah(totalBill)}
                  </div>
                </div>

                {/* METODE PEMBAYARAN */}
                <div className="space-y-3 pt-2  border-[var(--admin-border,#2a2d2f)]">
                  <label className="block text-[12px] font-semibold text-[var(--admin-text,#f4f4f5)]">
                    Pilih Metode Pembayaran
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`py-2 px-1 rounded-[6px] border text-center text-[12px] font-medium transition-colors cursor-pointer ${
                        paymentMethod === "cash"
                          ? "bg-[#c0d0e7] text-[#111b23] border-[var(--admin-focus,#c0d0e7)]"
                          : "bg-[var(--admin-card,#1c1f20)] text-[var(--admin-secondary,#c3c7ca)] border-[var(--admin-border,#2a2d2f)] hover:border-[var(--admin-border-strong,#41474e)]"
                      }`}
                    >
                      Tunai (Cash)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("qris")}
                      className={`py-2 px-1 rounded-[6px] border text-center text-[12px] font-medium transition-colors cursor-pointer ${
                        paymentMethod === "qris"
                          ? "bg-[#c0d0e7] text-[#111b23] border-[var(--admin-focus,#c0d0e7)]"
                          : "bg-[var(--admin-card,#1c1f20)] text-[var(--admin-secondary,#c3c7ca)] border-[var(--admin-border,#2a2d2f)] hover:border-[var(--admin-border-strong,#41474e)]"
                      }`}
                    >
                      QRIS
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("transfer")}
                      className={`py-2 px-1 rounded-[6px] border text-center text-[12px] font-medium transition-colors cursor-pointer ${
                        paymentMethod === "transfer"
                          ? "bg-[#c0d0e7] text-[#111b23] border-[var(--admin-focus,#c0d0e7)]"
                          : "bg-[var(--admin-card,#1c1f20)] text-[var(--admin-secondary,#c3c7ca)] border-[var(--admin-border,#2a2d2f)] hover:border-[var(--admin-border-strong,#41474e)]"
                      }`}
                    >
                      Transfer
                    </button>
                  </div>

                  {/* CASH CALCULATION BOX */}
                  {paymentMethod === "cash" ? (
                    <div className="p-3.5 bg-[var(--admin-canvas,#111114)] border border-[var(--admin-border,#2a2d2f)] rounded-[8px] space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[12px] font-medium text-[var(--admin-secondary,#c3c7ca)]">
                            Nominal Uang Diterima
                          </label>
                          <button
                            type="button"
                            onClick={() => setCashReceived(totalBill)}
                            className="text-[12px] text-[var(--admin-text,#f4f4f5)] font-medium underline cursor-pointer"
                          >
                            Uang Pas
                          </button>
                        </div>
                        <input
                          type="number"
                          value={cashReceived}
                          onChange={(e) =>
                            setCashReceived(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          placeholder={String(totalBill)}
                          className="w-full px-3 py-2 bg-[var(--admin-canvas,#111114)] border border-[var(--admin-border-strong,#41474e)] rounded-[6px] text-[15px] font-mono font-semibold text-[var(--admin-text,#f4f4f5)] outline-none"
                        />
                      </div>

                      {/* Quick Cash Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[50000, 100000, 150000, 200000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setCashReceived(amt)}
                            className="px-2 py-1 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] hover:border-[var(--admin-border-strong,#41474e)] rounded text-[12px] font-mono text-[var(--admin-secondary,#c3c7ca)] cursor-pointer"
                          >
                            {amt / 1000}k
                          </button>
                        ))}
                      </div>

                      {/* Kembalian / Status */}
                      <div className="pt-2  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between text-[13px]">
                        <span className="text-[var(--admin-secondary,#c3c7ca)]">Kembalian:</span>
                        <span
                          className={`font-mono font-bold text-[15px] ${
                            cashShortage > 0 ? "text-[var(--admin-pending,#d7b8d6)]" : "text-[var(--admin-text,#f4f4f5)]"
                          }`}
                        >
                          {cashShortage > 0
                            ? `Kurang ${formatRupiah(cashShortage)}`
                            : formatRupiah(cashChange)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl text-[12px] text-[var(--admin-secondary,#c3c7ca)] space-y-1">
                      <div className="flex items-center gap-1.5 text-[var(--admin-text,#f4f4f5)] font-medium">
                        <Check size={14} className="text-[var(--admin-accent-text,#c9d2e1)]" />
                        <span>Pembayaran {paymentMethod.toUpperCase()} Terverifikasi</span>
                      </div>
                      <p className="text-[12px] text-[var(--admin-muted,#92989d)]">
                        Struk digital otomatis diterbitkan dengan status Lunas sebesar {formatRupiah(totalBill)}.
                      </p>
                    </div>
                  )}
                </div>

                {/* ACTION BUTTONS (Harmonisasi Horisontal - Rule 6) */}
                <div className="pt-4  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleResetForm(false)}
                    className="px-3.5 py-2.5 text-[12px] font-medium text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-text,#f4f4f5)] hover:bg-[var(--admin-raised,#292b2f)] rounded-full transition-colors cursor-pointer"
                  >
                    Reset Form
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAndGenerateReceipt}
                    disabled={savingSession || !customerName.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#c0d0e7] text-[#111b23] hover:bg-[#d2def0] rounded-full text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-40 "
                  >
                    <Receipt size={15} />
                    <span>{savingSession ? "Menerbitkan..." : "Simpan & Buat E-Receipt"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. TAB: RIWAYAT E-RECEIPT HARI INI ── */}
        {activeTab === "history" && (
          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl overflow-hidden space-y-0">
            {/* Control Bar */}
            <div className="p-5  border-[var(--admin-border,#2a2d2f)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)]">
                  Daftar Transaksi & E-Receipt Hari Ini
                </h3>
                <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                  Seluruh transaksi yang tercatat hari ini dapat dicetak ulang PDF-nya atau dikirimkan ke WhatsApp customer.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted,#92989d)]" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Cari nama / invoice..."
                    className="pl-8 pr-3 py-1.5 bg-[var(--admin-canvas,#111114)] border border-[var(--admin-border,#2a2d2f)] rounded-[6px] text-[12px] outline-none w-52"
                  />
                </div>

                <button
                  type="button"
                  onClick={fetchHistory}
                  disabled={loadingHistory}
                  className="w-8 h-8 rounded-[6px] border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] flex items-center justify-center text-[var(--admin-secondary,#c3c7ca)] cursor-pointer"
                  title="Segarkan data"
                >
                  <RefreshCw size={13} className={loadingHistory ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Table */}
            {filteredHistory.length === 0 ? (
              <div className="py-16 text-center space-y-1">
                <p className="text-[14px] font-medium text-[var(--admin-text,#f4f4f5)]">Belum ada transaksi hari ini</p>
                <p className="text-[12px] text-[var(--admin-muted,#92989d)]">
                  Buat transaksi pertama melalui tab &quot;Transaksi Baru (POS)&quot; di atas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[var(--admin-border,#2a2d2f)] text-[12px] font-medium text-[var(--admin-muted,#92989d)] uppercase tracking-[0.06em]">
                      <th className="py-3 px-4">Invoice & Waktu</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Paket & Rincian</th>
                      <th className="py-3 px-4">Metode</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4 text-center">Aksi E-Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border,#2a2d2f)] text-[13px]">
                    {filteredHistory.map((s) => (
                      <tr key={s.id} className="hover:bg-[var(--admin-raised,#292b2f)] transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-medium text-[var(--admin-text,#f4f4f5)] text-[12px] block">
                            {s.invoiceNumber || s.id}
                          </span>
                          <span className="text-[12px] text-[var(--admin-muted,#92989d)] font-mono block">
                            {s.time} WIB
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-medium text-[var(--admin-text,#f4f4f5)] block">
                            {s.customerName}
                          </span>
                          {s.customerPhone && (
                            <span className="text-[12px] text-[var(--admin-muted,#92989d)] font-mono block">
                              {s.customerPhone}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[12px] text-[var(--admin-secondary,#c3c7ca)] block">
                            {s.coupleMode ? "Couple Mode" : `${s.peopleCount} Orang`}
                            {s.prints?.total > 0 && ` • ${s.prints.total} lbr 4R`}
                          </span>
                          {s.miscAddons?.length > 0 && (
                            <span className="text-[12px] text-[var(--admin-muted,#92989d)] block">
                              Addon: {s.miscAddons.map((m) => `${m.name} (${m.qty}x)`).join(", ")}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-[var(--admin-raised,#292b2f)] text-[var(--admin-secondary,#c3c7ca)] text-[12px] font-medium">
                            {s.paymentMethod ? s.paymentMethod.toUpperCase() : "TUNAI"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="font-semibold text-[var(--admin-text,#f4f4f5)] font-mono text-[13px]">
                            {formatRupiah(s.totalPrice)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleRegenerateFromHistory(s)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] hover:border-[var(--admin-focus,#c0d0e7)] text-[var(--admin-text,#f4f4f5)] text-[11.5px] font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            <Receipt size={12} />
                            <span>Buka E-Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 4. E-RECEIPT DIGITAL PREVIEW MODAL ── */}
      <AdminReceiptPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        onNewTransaction={() => {
          setPreviewModalOpen(false);
          handleResetForm(true);
        }}
        receiptData={generatedReceiptData}
        blobUrl={generatedBlobUrl}
        onDownload={() => {
          if (generatedDownloadFn) generatedDownloadFn();
        }}
      />

      {/* ── 5. REUSABLE CONFIRM/ALERT MODAL (Rule 5) ── */}
      <AdminConfirmModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        category={modalConfig.category}
        description={modalConfig.description}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        isDangerous={modalConfig.isDangerous}
        variant={modalConfig.variant}
        singleButton={modalConfig.singleButton}
      />
    </AdminLayout>
  );
}
