import { useEffect } from "react";

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — Ignos Studio` : "Ignos Studio";
    return () => {
      document.title = "Ignos Studio";
    };
  }, [title]);
}
