import { ButtonHTMLAttributes } from "react";
import { useKioskTheme } from "../../context/KioskThemeContext";

interface BrutalistButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export function BrutalistButton({
  variant = "primary",
  size = "lg",
  className = "",
  children,
  style,
  ...props
}: BrutalistButtonProps) {
  let theme;
  try {
    theme = useKioskTheme().theme;
  } catch {
    // Rendered outside KioskThemeProvider
  }

  const isDefault = !theme || theme.presetId === "neo-brutalism";

  if (isDefault) {
    const baseClasses =
      "border-4 border-black transition-all disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
      primary: "bg-black text-white hover:bg-gray-900",
      secondary: "bg-white text-black hover:bg-gray-100",
      outline: "bg-white text-black hover:bg-gray-50",
    };

    const sizeClasses = {
      sm: "px-6 py-3 text-lg font-bold rounded-lg",
      md: "px-8 py-4 text-xl font-bold rounded-xl",
      lg: "px-12 py-6 text-2xl font-bold rounded-2xl",
    };

    return (
      <button
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        style={style}
        {...props}
      >
        {children}
      </button>
    );
  }

  // Non-default custom / alternative theme
  const sizeClasses = {
    sm: "px-6 py-3 text-lg font-bold rounded-lg",
    md: "px-8 py-4 text-xl font-bold rounded-xl",
    lg: "px-12 py-6 text-2xl font-bold rounded-2xl",
  };

  const dynamicStyle: React.CSSProperties = {
    borderRadius: "var(--kiosk-radius, 16px)",
    borderWidth: "var(--kiosk-border-w, 4px)",
    borderColor: "var(--kiosk-border, #000000)",
    boxShadow: "var(--kiosk-shadow, none)",
    fontFamily: "var(--kiosk-font, inherit)",
    ...(variant === "primary"
      ? {
          backgroundColor: "var(--kiosk-primary, #000000)",
          color: "var(--kiosk-primary-text, #ffffff)",
        }
      : variant === "secondary"
        ? {
            backgroundColor: "var(--kiosk-card-bg, #ffffff)",
            color: "var(--kiosk-text, #171717)",
          }
        : {
            backgroundColor: "transparent",
            color: "var(--kiosk-text, #171717)",
          }),
    ...style,
  };

  return (
    <button
      className={`border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${className}`}
      style={dynamicStyle}
      {...props}
    >
      {children}
    </button>
  );
}
