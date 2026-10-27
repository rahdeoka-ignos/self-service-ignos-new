import React, { createContext, useContext, useEffect, useState } from "react";
import {
  KioskThemeConfig,
  THEME_PRESETS,
  ThemePresetId,
} from "../types/kioskTheme";

interface KioskThemeContextType {
  theme: KioskThemeConfig;
  setTheme: React.Dispatch<React.SetStateAction<KioskThemeConfig>>;
  applyPreset: (presetId: ThemePresetId) => void;
  saveTheme: (customConfig?: KioskThemeConfig) => Promise<boolean>;
  resetTheme: () => Promise<boolean>;
  loading: boolean;
  saving: boolean;
}

const API = "http://localhost:5000";
const LOCAL_STORAGE_KEY = "ignos_kiosk_theme_config";

const KioskThemeContext = createContext<KioskThemeContextType | undefined>(
  undefined,
);

export function KioskThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<KioskThemeConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return { ...THEME_PRESETS["neo-brutalism"], ...JSON.parse(saved) };
      }
    } catch {}
    return THEME_PRESETS["neo-brutalism"];
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTheme = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/kiosk-theme`);
      if (res.ok) {
        const data = await res.json();
        setTheme(data);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        } catch {}
      }
    } catch {
      // Fallback: theme is already initialized from localStorage or default preset
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTheme();
  }, []);

  const applyPreset = (presetId: ThemePresetId) => {
    if (THEME_PRESETS[presetId]) {
      setTheme({ ...THEME_PRESETS[presetId] });
    }
  };

  const saveTheme = async (customConfig?: KioskThemeConfig): Promise<boolean> => {
    const toSave = customConfig || theme;
    // Always persist to localStorage first so it works immediately across the app
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
    setTheme(toSave);

    try {
      setSaving(true);
      const res = await fetch(`${API}/api/kiosk-theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      if (res.ok) {
        return true;
      }
      console.warn("Backend /api/kiosk-theme returned", res.status, "- Theme preserved in browser storage.");
      return true;
    } catch (err) {
      console.warn("Backend unreachable. Theme preserved in browser storage:", err);
      return true;
    } finally {
      setSaving(false);
    }
  };

  const resetTheme = async (): Promise<boolean> => {
    const defaultTheme = THEME_PRESETS["neo-brutalism"];
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultTheme));
    } catch {}
    setTheme(defaultTheme);

    try {
      setSaving(true);
      await fetch(`${API}/api/kiosk-theme/reset`, {
        method: "POST",
      });
      return true;
    } catch {
      return true;
    } finally {
      setSaving(false);
    }
  };

  // Dynamically inject CSS variables for Kiosk rendering
  useEffect(() => {
    const root = document.documentElement;

    if (!theme || theme.presetId === "neo-brutalism") {
      // Clean up any custom variables so default styles are 100% untouched
      root.style.removeProperty("--kiosk-bg");
      root.style.removeProperty("--kiosk-card-bg");
      root.style.removeProperty("--kiosk-primary");
      root.style.removeProperty("--kiosk-primary-text");
      root.style.removeProperty("--kiosk-text");
      root.style.removeProperty("--kiosk-accent");
      root.style.removeProperty("--kiosk-border");
      root.style.removeProperty("--kiosk-radius");
      root.style.removeProperty("--kiosk-border-w");
      root.style.removeProperty("--kiosk-shadow");
      root.style.removeProperty("--kiosk-font");
      return;
    }

    root.style.setProperty("--kiosk-bg", theme.backgroundColor);
    root.style.setProperty("--kiosk-card-bg", theme.cardBackgroundColor);
    root.style.setProperty("--kiosk-primary", theme.primaryColor);
    root.style.setProperty("--kiosk-primary-text", theme.primaryTextColor);
    root.style.setProperty("--kiosk-text", theme.textColor);
    root.style.setProperty("--kiosk-accent", theme.accentColor);
    root.style.setProperty("--kiosk-border", theme.borderColor);

    // Border radius
    const radiusMap = {
      none: "0px",
      sm: "8px",
      md: "12px",
      lg: "16px",
      full: "28px",
    };
    root.style.setProperty(
      "--kiosk-radius",
      radiusMap[theme.borderRadius] || "16px",
    );

    // Border width
    const widthMap = {
      none: "0px",
      thin: "1px",
      medium: "2px",
      thick: "4px",
    };
    root.style.setProperty(
      "--kiosk-border-w",
      widthMap[theme.borderWidth] || "4px",
    );

    // Shadow style
    const shadowMap = {
      none: "none",
      soft: "0 2px 10px rgba(0,0,0,0.06)",
      "hard-offset": `4px 4px 0px 0px ${theme.borderColor || "#000"}`,
      elevated: "0 10px 30px rgba(0,0,0,0.12)",
    };
    root.style.setProperty(
      "--kiosk-shadow",
      shadowMap[theme.shadowStyle] || "none",
    );

    // Font family
    const fontMap = {
      manrope: "'Manrope', sans-serif",
      "space-grotesk": "'Space Grotesk', sans-serif",
      poppins: "'Poppins', sans-serif",
    };
    root.style.setProperty(
      "--kiosk-font",
      fontMap[theme.fontFamily] || "'Space Grotesk', sans-serif",
    );
  }, [theme]);

  return (
    <KioskThemeContext.Provider
      value={{
        theme,
        setTheme,
        applyPreset,
        saveTheme,
        resetTheme,
        loading,
        saving,
      }}
    >
      {children}
    </KioskThemeContext.Provider>
  );
}

export function useKioskTheme() {
  const context = useContext(KioskThemeContext);
  if (!context) {
    throw new Error("useKioskTheme must be used within a KioskThemeProvider");
  }
  return context;
}
