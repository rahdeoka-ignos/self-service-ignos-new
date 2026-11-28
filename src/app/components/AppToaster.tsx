import { Toaster } from "sonner";
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";

// Shared look for every toast (see src/utils/notify.ts). Mounted once in App.tsx.
// Colours follow the admin palette; the left accent and icon tell the type apart.
const base =
  "group relative flex w-[360px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-xl border border-[#2a2d2f] border-l-4 " +
  "bg-[#1c1f20] p-4 pr-10 text-[13px] text-[#f4f4f5] shadow-[0_12px_32px_rgba(0,0,0,0.35)] font-sans";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      offset={20}
      gap={10}
      visibleToasts={4}
      // Show every toast in full, one under another, instead of a collapsed pile.
      expand
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: base,
          icon: "mt-0.5 shrink-0",
          content: "min-w-0 flex-1",
          title: "font-semibold leading-snug",
          description: "mt-1 text-[12px] leading-relaxed text-[#c3c7ca] break-words",
          closeButton:
            "!absolute !left-auto !right-2.5 !top-2.5 !translate-x-0 !translate-y-0 !h-6 !w-6 !rounded-full !border-0 " +
            "!bg-transparent !text-[#92989d] hover:!bg-[#292b2f] hover:!text-[#f4f4f5] flex items-center justify-center cursor-pointer",
          success: "border-l-[#5fb98a] [&_[data-icon]]:text-[#9fd8b4]",
          error: "border-l-[#e06c7a] [&_[data-icon]]:text-[#f18e9a]",
          warning: "border-l-[#d9a440] [&_[data-icon]]:text-[#f0c36a]",
          info: "border-l-[#7f9fc9] [&_[data-icon]]:text-[#c0d0e7]",
          loading: "border-l-[#7f9fc9] [&_[data-icon]]:text-[#c0d0e7]",
        },
      }}
      icons={{
        success: <CheckCircle2 size={18} />,
        error: <XCircle size={18} />,
        warning: <AlertTriangle size={18} />,
        info: <Info size={18} />,
        loading: <Loader2 size={18} className="animate-spin" />,
        close: <X size={13} />,
      }}
    />
  );
}
