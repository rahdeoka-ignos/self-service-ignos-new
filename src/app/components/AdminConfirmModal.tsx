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
        return "bg-[var(--admin-alert,#3b2d3c)] text-[var(--admin-danger,#f18e9a)]";
      case "success":
        return "bg-[var(--admin-raised,#292b2f)] text-[var(--admin-accent-text,#c0d0e7)]";
      case "info":
        return "bg-[var(--admin-raised,#292b2f)] text-[var(--admin-accent-text,#c0d0e7)]";
      case "warning":
      default:
        return "bg-[var(--admin-alert,#3b2d3c)] text-[var(--admin-pending,#d7b8d6)]";
    }
  };

  const getConfirmButtonStyle = () => {
    if (currentVariant === "danger" || isDangerous) {
      return "bg-rose-600 hover:bg-rose-700 text-white";
    }
    return "bg-[#c0d0e7] hover:bg-[#d2def0] text-[#111b23]";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70  p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border-interactive,#34373b)] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getIconContainerStyle()}`}>
            {getIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[18px] font-semibold text-[var(--admin-text,#f4f4f5)] leading-tight">
              {title}
            </h3>
            <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">{category}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-secondary,#c3c7ca)] p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-[13px] text-[var(--admin-secondary,#c3c7ca)] leading-relaxed">
          {description}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2  border-[var(--admin-border-interactive,#34373b)]">
          {!singleButton && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-[var(--admin-secondary,#c3c7ca)] hover:text-[var(--admin-text,#f4f4f5)] bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border-interactive,#34373b)] rounded-lg hover:bg-[var(--admin-card,#1c1f20)] transition-colors cursor-pointer"
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
