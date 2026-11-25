import { useEffect, useState } from "react";

type AdminTheme = "dark" | "light";
const STORAGE_KEY = "ignos_admin_theme";
const CHANGE_EVENT = "ignos-admin-theme-change";

function readTheme(): AdminTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

// Scoped to admin surfaces. Utilities have dark fallbacks so shared dialogs also
// work outside the admin shell without changing the customer kiosk theme.
export const adminThemeClasses = `
  [color-scheme:dark] data-[admin-theme=light]:[color-scheme:light]
  data-[admin-theme=light]:[--admin-canvas:#f5f6f8]
  data-[admin-theme=light]:[--admin-sidebar:#ffffff]
  data-[admin-theme=light]:[--admin-card:#ffffff]
  data-[admin-theme=light]:[--admin-control:#edeff3]
  data-[admin-theme=light]:[--admin-raised:#e8ebf0]
  data-[admin-theme=light]:[--admin-selected:#edf1f7]
  data-[admin-theme=light]:[--admin-tab:#dce2eb]
  data-[admin-theme=light]:[--admin-border:#e0e4eb]
  data-[admin-theme=light]:[--admin-border-interactive:#cbd2dc]
  data-[admin-theme=light]:[--admin-border-strong:#b7c1cf]
  data-[admin-theme=light]:[--admin-text:#20242c]
  data-[admin-theme=light]:[--admin-secondary:#4b5563]
  data-[admin-theme=light]:[--admin-muted:#657080]
  data-[admin-theme=light]:[--admin-label:#707987]
  data-[admin-theme=light]:[--admin-accent-text:#45628a]
  data-[admin-theme=light]:[--admin-focus:#647fa6]
  data-[admin-theme=light]:[--admin-danger:#ac3d58]
  data-[admin-theme=light]:[--admin-pending:#81587e]
  data-[admin-theme=light]:[--admin-alert:#f8edf2]
`;

export function useAdminTheme() {
  const [theme, setTheme] = useState<AdminTheme>(readTheme);

  useEffect(() => {
    const syncTheme = () => setTheme(readTheme());
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) syncTheme();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, syncTheme);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, syncTheme);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      // Switching remains available when browser storage is disabled.
    }
  };

  return { theme, toggleTheme };
}
