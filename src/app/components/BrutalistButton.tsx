import { ButtonHTMLAttributes } from "react";

interface BrutalistButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export function BrutalistButton({
  variant = "primary",
  size = "lg",
  className = "",
  children,
  ...props
}: BrutalistButtonProps) {
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
      {...props}
    >
      {children}
    </button>
  );
}
