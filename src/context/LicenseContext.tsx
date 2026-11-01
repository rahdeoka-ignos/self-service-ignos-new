import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { LicenseStatusResponse } from "../types/license";

interface LicenseContextType {
  license: LicenseStatusResponse | null;
  loading: boolean;
  refreshLicense: () => Promise<LicenseStatusResponse | null>;
  activateLicense: (key: string) => Promise<{ success: boolean; message: string }>;
  isLocked: boolean;
  isWarning: boolean;
}

const API = "http://localhost:5000";
const LOCAL_STORAGE_KEY = "ignos_license_cache";

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [license, setLicense] = useState<LicenseStatusResponse | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  });

  const [loading, setLoading] = useState(true);

  const refreshLicense = useCallback(async (): Promise<LicenseStatusResponse | null> => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/license/status`);
      if (res.ok) {
        const data: LicenseStatusResponse = await res.json();
        setLicense(data);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        } catch {}
        return data;
      }
    } catch (err) {
      console.warn("Gagal menghubungi server lisensi:", err);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  const activateLicense = async (key: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API}/api/license/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: key }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.status) {
          setLicense(data.status);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.status));
          } catch {}
        } else {
          await refreshLicense();
        }
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || "Gagal mengaktivasi lisensi." };
      }
    } catch (err: any) {
      return { success: false, message: err.message || "Gagal menghubungi server lokal." };
    }
  };

  useEffect(() => {
    refreshLicense();

    // Cek ulang lisensi setiap 5 menit secara background
    const interval = setInterval(() => {
      refreshLicense();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshLicense]);

  const isLocked = !license || !license.isValid || license.isExpired || license.isClockTampered;
  const isWarning = Boolean(license && license.status === "warning_expiring_soon");

  return (
    <LicenseContext.Provider
      value={{
        license,
        loading,
        refreshLicense,
        activateLicense,
        isLocked,
        isWarning,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error("useLicense must be used within a LicenseProvider");
  }
  return context;
}
