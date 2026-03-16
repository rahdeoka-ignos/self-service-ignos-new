import { ButtonHTMLAttributes } from "react";

interface ButtonTemplateProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export function ButtonTemplate({
  variant = "primary",
  size = "sm",
  className = "",
  children,
  ...props
}: ButtonTemplateProps) {
  const baseClasses =
    "border-4 border-black transition-all active:translate-x-1 active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary: "bg-black text-white hover:bg-gray-900",
    secondary: "bg-white text-black hover:bg-gray-100",
    outline: "bg-white text-black hover:bg-gray-50",
  };

  const sizeClasses = {
    sm: "px-3 py-1 text-sm font-bold rounded-lg",
    md: "px-8 py-4 text-xl font-bold rounded-xl",
    lg: "px-12 py-6 text-2xl font-bold rounded-2xl",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
