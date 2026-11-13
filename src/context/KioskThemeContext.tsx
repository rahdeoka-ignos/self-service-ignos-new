import { apiFetch as fetch } from "../utils/api";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { KioskThemeConfig, THEME_PRESETS } from "../types/kioskTheme";
import { isValidTheme, normalizeTheme, themeVariables } from "../utils/kioskTheme";

interface KioskThemeContextType {
  theme: KioskThemeConfig;
  saveTheme: (config: KioskThemeConfig) => Promise<boolean>;
  resetTheme: () => Promise<boolean>;
  loading: boolean;
  saving: boolean;
}
const API = "http://localhost:5000";
const LOCAL_STORAGE_KEY = "ignos_kiosk_theme_config";
const KioskThemeContext = createContext<KioskThemeContextType | undefined>(undefined);

export function KioskThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<KioskThemeConfig>(() => {
    try { return normalizeTheme(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || 'null')); }
    catch { return { ...THEME_PRESETS['neo-brutalism'] }; }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const revision = useRef(0);
  const mutating = useRef(false);

  const commit = (value: unknown) => {
    const next = normalizeTheme(value);
    setTheme(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      if (mutating.current) return;
      const request = ++revision.current;
      try {
        const res = await fetch(`${API}/api/kiosk-theme`);
        if (!res.ok) return;
        const data = await res.json();
        if (!disposed && request === revision.current && !mutating.current) commit(data);
      } catch {
        // Keep the last confirmed configuration when the server is unavailable.
      } finally {
        if (!disposed) setLoading(false);
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_STORAGE_KEY) void refresh();
    };
    void refresh();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 15000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const persist = async (config?: KioskThemeConfig): Promise<boolean> => {
    if (mutating.current || (config && !isValidTheme(config))) return false;
    mutating.current = true;
    ++revision.current; // Invalidate reads started before this mutation.
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/kiosk-theme${config ? '' : '/reset'}`, {
        method: config ? 'PUT' : 'POST',
        ...(config ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) } : {}),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.success !== true || !data.theme) return false;
      commit(data.theme);
      return true;
    } catch {
      return false;
    } finally {
      mutating.current = false;
      setSaving(false);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    const variables = themeVariables(theme);
    for (const [key, value] of Object.entries(variables)) root.style.setProperty(key, value);
    return () => { for (const key of Object.keys(variables)) root.style.removeProperty(key); };
  }, [theme]);

  return <KioskThemeContext.Provider value={{ theme, saveTheme: persist, resetTheme: () => persist(), loading, saving }}>{children}</KioskThemeContext.Provider>;
}

export function useKioskTheme() {
  const context = useContext(KioskThemeContext);
  if (!context) throw new Error("useKioskTheme must be used within a KioskThemeProvider");
  return context;
}
