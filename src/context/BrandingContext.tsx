import React, { createContext, useContext, useEffect, useState } from "react";
import {
  StudioBrandingConfig,
  DEFAULT_BRANDING,
} from "../types/branding";

interface BrandingContextType {
  branding: StudioBrandingConfig;
  setBranding: React.Dispatch<React.SetStateAction<StudioBrandingConfig>>;
  updateBrandingField: <K extends keyof StudioBrandingConfig>(
    key: K,
    value: StudioBrandingConfig[K],
  ) => void;
  saveBranding: (customConfig?: StudioBrandingConfig) => Promise<boolean>;
  resetBranding: () => Promise<boolean>;
  uploadLogo: (
    file: File,
    type?: "light" | "dark",
  ) => Promise<{ success: boolean; url?: string; error?: string }>;
  loading: boolean;
  saving: boolean;
}

const API = "http://localhost:5000";
const LOCAL_STORAGE_KEY = "ignos_studio_branding_config";

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<StudioBrandingConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_BRANDING,
          ...parsed,
          receipt: { ...DEFAULT_BRANDING.receipt, ...(parsed.receipt || {}) },
          whatsapp: { ...DEFAULT_BRANDING.whatsapp, ...(parsed.whatsapp || {}) },
          watermark: { ...DEFAULT_BRANDING.watermark, ...(parsed.watermark || {}) },
        };
      }
    } catch {}
    return DEFAULT_BRANDING;
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchBranding = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/branding`);
      if (res.ok) {
        const data = await res.json();
        setBranding(data);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        } catch {}
      }
    } catch {
      // Offline fallback: already set from localStorage or DEFAULT_BRANDING
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  const updateBrandingField = <K extends keyof StudioBrandingConfig>(
    key: K,
    value: StudioBrandingConfig[K],
  ) => {
    setBranding((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveBranding = async (
    customConfig?: StudioBrandingConfig,
  ): Promise<boolean> => {
    const toSave = customConfig || branding;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
    setBranding(toSave);

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/branding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.branding) {
          setBranding(json.branding);
        }
        return true;
      }
      return false;
    } catch {
      // Succeeded locally even if server isn't reached
      return true;
    } finally {
      setSaving(false);
    }
  };

  const resetBranding = async (): Promise<boolean> => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_BRANDING));
    } catch {}
    setBranding(DEFAULT_BRANDING);

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/branding/reset`, { method: "POST" });
      return res.ok;
    } catch {
      return true;
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (
    file: File,
    type: "light" | "dark" = "light",
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch(`${API}/api/branding/logo?type=${type}`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        return { success: false, error: err.error || "Gagal upload logo" };
      }
      const data = await res.json();
      if (data.branding) {
        setBranding(data.branding);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.branding));
        } catch {}
      }
      return { success: true, url: data.url };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return (
    <BrandingContext.Provider
      value={{
        branding,
        setBranding,
        updateBrandingField,
        saveBranding,
        resetBranding,
        uploadLogo,
        loading,
        saving,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
}
