import { HTMLAttributes, ReactNode } from "react";
import { useKioskTheme } from "../../context/KioskThemeContext";

interface BrutalistCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
  selected?: boolean;
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

  const isDefault = !theme || theme.presetId === "neo-brutalism";

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

  // Non-default custom / alternative theme
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
    ...style,
  };

  return (
    <div
      className={`relative border transition-all ${interactiveClasses} ${className}`}
      style={dynamicStyle}
      {...props}
    >
      {children}
    </div>
  );
}
