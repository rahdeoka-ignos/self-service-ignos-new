import { isIllustratedPack } from "../../utils/illustratedTheme";
import { HTMLAttributes, ReactNode } from "react";
import { useKioskTheme } from "../../context/KioskThemeContext";

interface BrutalistCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  selected?: boolean;
  "data-kiosk-ui"?: string;
  "data-kiosk-selected"?: boolean;
}

export function BrutalistCard({
  children,
  interactive = false,
  selected = false,
  className = "",
  style,
  ...props
}: BrutalistCardProps) {
  let theme;
  try {
    theme = useKioskTheme().theme;
  } catch {
    // Rendered outside KioskThemeProvider
  }

  const isDefault = !theme;

  if (isDefault) {
    const baseClasses = "relative bg-white border-4 border-black rounded-2xl";
    const interactiveClasses = interactive
      ? "cursor-pointer transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-2 active:translate-y-2"
      : "";
    const selectedClasses = selected ? "bg-black text-white" : "";

    return (
      <div
        className={`${baseClasses} ${interactiveClasses} ${selectedClasses} ${className}`}
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  }

  // All configured presets share the same theme tokens as the preview.
  const interactiveClasses = interactive
    ? "cursor-pointer transition-all hover:-translate-y-1 active:translate-y-0"
    : "";

  const dynamicStyle: React.CSSProperties = {
    borderRadius: "var(--kiosk-radius, 16px)",
    borderWidth: "var(--kiosk-border-w, 4px)",
    borderColor: "var(--kiosk-border, #000000)",
    backgroundColor: selected
      ? "var(--kiosk-primary, #000000)"
      : "var(--kiosk-card-bg, #ffffff)",
    color: selected
      ? "var(--kiosk-primary-text, #ffffff)"
      : "var(--kiosk-text, #171717)",
    boxShadow: "var(--kiosk-shadow, none)",
    fontFamily: "var(--kiosk-font, inherit)",
    ...(isIllustratedPack(theme.assetPack) && props["data-kiosk-ui"] === "surface" ? {
      borderRadius: theme.assetPack === "studio-cats" ? "12px" : theme.assetPack === "analog-archive" ? "8px" : theme.assetPack === "riso-zine" ? "10px" : "28px",
      borderWidth: "1px",
      borderColor: selected || props["data-kiosk-selected"] ? "var(--kiosk-primary)" : theme.assetPack === "studio-cats" ? "var(--woset-line)" : "#25282059",
      backgroundColor: theme.assetPack === "studio-cats"
        ? (selected || props["data-kiosk-selected"] ? "#12388b10" : "var(--kiosk-card-bg)")
        : theme.assetPack === "analog-archive"
        ? (selected || props["data-kiosk-selected"] ? "#3e3b2e" : "#232723")
        : theme.assetPack === "riso-zine"
        ? (selected || props["data-kiosk-selected"] ? "#df644f1f" : "#294c9b0d")
        : (selected || props["data-kiosk-selected"] ? "#d6c57440" : "#6278a41a"),
      color: "var(--kiosk-text)",
      boxShadow: "none",
    } : {}),
    ...style,
  };

  return (
    <div
      data-kiosk-selected={selected || undefined}
      className={`kiosk-card relative border transition-all ${interactiveClasses} ${className}`}
      style={dynamicStyle}
      {...props}
    >
      {children}
    </div>
  );
}
