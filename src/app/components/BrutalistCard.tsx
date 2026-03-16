import { HTMLAttributes, ReactNode } from "react";

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
  ...props
}: BrutalistCardProps) {
  const baseClasses = "bg-white border-4 border-black rounded-2xl";
  const interactiveClasses = interactive
    ? "cursor-pointer transition-all hover:translate-x-1 hover:translate-y-1 active:translate-x-2 active:translate-y-2"
    : "";
  const selectedClasses = selected ? "bg-black text-white" : "";

  return (
    <div
      className={`${baseClasses} ${interactiveClasses} ${selectedClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
