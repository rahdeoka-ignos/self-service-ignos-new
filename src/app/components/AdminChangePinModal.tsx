import { useState } from "react";
import { KeyRound, X, Check, AlertTriangle, ShieldCheck } from "lucide-react";
import { useSecurity } from "../../context/SecurityContext";

interface AdminChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AdminChangePinModal({
  isOpen,
  onClose,
  onSuccess,
}: AdminChangePinModalProps) {
  const { changePin, isDefaultPin } = useSecurity();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!currentPin.trim()) {
      setErrorMsg("Masukkan PIN saat ini.");
      return;
    }

    if (!/^\d{4,8}$/.test(newPin.trim())) {
      setErrorMsg("PIN baru harus berupa 4 hingga 8 digit angka.");
      return;
    }

    if (newPin.trim() !== confirmPin.trim()) {
      setErrorMsg("Konfirmasi PIN baru tidak cocok.");
      return;
    }

    if (newPin.trim() === currentPin.trim()) {
      setErrorMsg("PIN baru tidak boleh sama dengan PIN saat ini.");
      return;
    }

    setSubmitting(true);
    const result = await changePin(currentPin.trim(), newPin.trim());
    setSubmitting(false);

    if (result.success) {
      setSuccessMsg(result.message);
      setTimeout(() => {
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
        setSuccessMsg("");
        onClose();
        if (onSuccess) onSuccess();
      }, 1200);
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70  flex items-center justify-center p-4 font-['Inter',sans-serif] animate-in fade-in duration-150">
      <div className="max-w-md w-full bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3  border-[var(--admin-border,#2a2d2f)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--admin-raised,#292b2f)] flex items-center justify-center text-[var(--admin-text,#f4f4f5)]">
              <KeyRound size={17} />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-tight">
                Ganti PIN Admin
              </h2>
              <p className="text-xs text-[var(--admin-muted,#92989d)]">
                Keamanan akses portal kasir & dashboard studio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-secondary,#c3c7ca)] hover:bg-[var(--admin-raised,#292b2f)] transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Notice if still default PIN */}
        {isDefaultPin && (
          <div className="p-3 rounded-lg bg-[var(--admin-alert,#3b2d3c)] border border-amber-200 text-[var(--admin-pending,#d7b8d6)] text-xs flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-[var(--admin-pending,#d7b8d6)] shrink-0 mt-0.5" />
            <span>
              Sistem saat ini masih menggunakan PIN default bawaan (<strong>1234</strong>). Segera ganti dengan PIN rahasia Anda.
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--admin-text,#f4f4f5)] uppercase tracking-wider">
              PIN Saat Ini
            </label>
            <input
              type="password"
              maxLength={8}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Ketik PIN saat ini (default: 1234)"
              className="w-full px-3 py-2.5 bg-[var(--admin-canvas,#111114)] border border-[var(--admin-border,#2a2d2f)] rounded-lg font-mono text-sm text-[var(--admin-text,#f4f4f5)] placeholder:text-[var(--admin-muted,#92989d)] focus:bg-[var(--admin-canvas,#111114)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-focus,#c0d0e7)] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--admin-text,#f4f4f5)] uppercase tracking-wider">
              PIN Baru (4-8 Digit Angka)
            </label>
            <input
              type="password"
              maxLength={8}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Ketik 4-8 digit angka baru"
              className="w-full px-3 py-2.5 bg-[var(--admin-canvas,#111114)] border border-[var(--admin-border,#2a2d2f)] rounded-lg font-mono text-sm text-[var(--admin-text,#f4f4f5)] placeholder:text-[var(--admin-muted,#92989d)] focus:bg-[var(--admin-canvas,#111114)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-focus,#c0d0e7)] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--admin-text,#f4f4f5)] uppercase tracking-wider">
              Konfirmasi PIN Baru
            </label>
            <input
              type="password"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Ketik ulang PIN baru"
              className="w-full px-3 py-2.5 bg-[var(--admin-canvas,#111114)] border border-[var(--admin-border,#2a2d2f)] rounded-lg font-mono text-sm text-[var(--admin-text,#f4f4f5)] placeholder:text-[var(--admin-muted,#92989d)] focus:bg-[var(--admin-canvas,#111114)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-focus,#c0d0e7)] transition-all"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-[var(--admin-alert,#3b2d3c)] border border-rose-200 text-[var(--admin-danger,#f18e9a)] text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-lg bg-[var(--admin-raised,#292b2f)] border border-emerald-200 text-[var(--admin-accent-text,#c0d0e7)] text-xs font-medium flex items-center gap-2">
              <Check size={14} className="text-[var(--admin-accent-text,#c0d0e7)] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 pt-3  border-[var(--admin-border,#2a2d2f)]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-[var(--admin-border,#2a2d2f)] hover:bg-[var(--admin-card,#1c1f20)] text-[var(--admin-text,#f4f4f5)] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !currentPin || !newPin || !confirmPin}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#c0d0e7] hover:bg-[#d2def0] text-[#111b23] text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Menyimpan..." : "Simpan PIN Baru"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
