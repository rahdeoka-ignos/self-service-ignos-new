import React, { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_PRICING, PricingConfig } from "../types/pricing";

export interface SavePricingResult {
  success: boolean;
  serverSynced: boolean;
}

interface PricingContextType {
  pricing: PricingConfig;
  setPricing: React.Dispatch<React.SetStateAction<PricingConfig>>;
  savePricing: (customConfig?: PricingConfig) => Promise<SavePricingResult>;
  resetPricing: () => Promise<boolean>;
  refreshPricing: () => Promise<void>;
  formatPrice: (amount: number) => string;
  loading: boolean;
  saving: boolean;
}

const API = "http://localhost:5000";
const LOCAL_STORAGE_KEY = "ignos_pricing_config";

const PricingContext = createContext<PricingContextType | undefined>(undefined);

export function PricingProvider({ children }: { children: React.ReactNode }) {
  const [pricing, setPricing] = useState<PricingConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_PRICING, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_PRICING;
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/pricing`);
      if (res.ok) {
        const data: PricingConfig = await res.json();
        setPricing(data);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        } catch {}
      }
    } catch {
      // Fallback is already initialized in useState
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const savePricing = async (customConfig?: PricingConfig): Promise<SavePricingResult> => {
    const toSave = customConfig || pricing;
    // 1. Simpan selalu ke localStorage terlebih dahulu (jaminan instan & offline-safe)
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
    setPricing(toSave);

    // 2. Sinkronkan ke server backend
    let serverSynced = false;
    try {
      setSaving(true);
      const res = await fetch(`${API}/api/pricing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });

      if (res.ok) {
        serverSynced = true;
      } else {
        console.warn(
          `[Pricing] Backend mengembalikan status ${res.status}. Data tersimpan di browser storage. Restart 'node server.js' di terminal agar sync ke disk.`
        );
      }
    } catch (err) {
      console.warn("[Pricing] Backend offline / belum terhubung. Data tetap aman di browser storage:", err);
    } finally {
      setSaving(false);
    }

    return { success: true, serverSynced };
  };

  const resetPricing = async (): Promise<boolean> => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_PRICING));
    } catch {}
    setPricing(DEFAULT_PRICING);

    try {
      setSaving(true);
      await fetch(`${API}/api/pricing/reset`, { method: "POST" });
      return true;
    } catch {
      return true;
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (amount: number): string => {
    try {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: pricing.currency || "IDR",
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `Rp ${Number(amount).toLocaleString("id-ID")}`;
    }
  };

  return (
    <PricingContext.Provider
      value={{
        pricing,
        setPricing,
        savePricing,
        resetPricing,
        refreshPricing: fetchPricing,
        formatPrice,
        loading,
        saving,
      }}
    >
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing() {
  const context = useContext(PricingContext);
  if (!context) {
    throw new Error("usePricing must be used within a PricingProvider");
  }
  return context;
}
