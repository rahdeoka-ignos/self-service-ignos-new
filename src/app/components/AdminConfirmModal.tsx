import { AlertTriangle, Info, CheckCircle2, X } from "lucide-react";

export interface AdminConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  category?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  variant?: "danger" | "warning" | "info" | "success";
  singleButton?: boolean;
}

export function AdminConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  category = "Konfirmasi Aksi",
  description,
  confirmText = "Lanjutkan",
  cancelText = "Batal",
  isDangerous = false,
  variant,
  singleButton = false,
}: AdminConfirmModalProps) {
  if (!isOpen) return null;

  const currentVariant = variant || (isDangerous ? "danger" : "warning");

  const getIcon = () => {
    switch (currentVariant) {
      case "danger":
        return <AlertTriangle size={20} />;
      case "success":
        return <CheckCircle2 size={20} />;
      case "info":
        return <Info size={20} />;
      case "warning":
      default:
        return <AlertTriangle size={20} />;
    }
  };

  const getIconContainerStyle = () => {
    switch (currentVariant) {
      case "danger":
        return "bg-rose-100 text-rose-700";
      case "success":
        return "bg-emerald-100 text-emerald-700";
      case "info":
        return "bg-blue-100 text-blue-700";
      case "warning":
      default:
        return "bg-amber-100 text-amber-700";
    }
  };

  const getConfirmButtonStyle = () => {
    if (currentVariant === "danger" || isDangerous) {
      return "bg-rose-600 hover:bg-rose-700 text-white";
    }
    return "bg-zinc-950 hover:bg-zinc-800 text-white";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getIconContainerStyle()}`}>
            {getIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-zinc-950 leading-tight">
              {title}
            </h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">{category}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed">
          {description}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
          {!singleButton && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-950 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={async () => {
              if (onConfirm) {
                await onConfirm();
              }
              onClose();
            }}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${getConfirmButtonStyle()}`}
          >
            {singleButton ? "Mengerti" : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
