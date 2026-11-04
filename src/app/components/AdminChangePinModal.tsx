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
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-['Manrope',sans-serif] animate-in fade-in duration-150">
      <div className="max-w-md w-full bg-white border border-[#e5e5e5] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-[#171717]">
              <KeyRound size={17} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#171717] tracking-tight">
                Ganti PIN Admin
              </h2>
              <p className="text-xs text-[#737373]">
                Keamanan akses portal kasir & dashboard studio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Notice if still default PIN */}
        {isDefaultPin && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              Sistem saat ini masih menggunakan PIN default bawaan (<strong>1234</strong>). Segera ganti dengan PIN rahasia Anda.
            </span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#171717] uppercase tracking-wider">
              PIN Saat Ini
            </label>
            <input
              type="password"
              maxLength={8}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Ketik PIN saat ini (default: 1234)"
              className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#e5e5e5] rounded-lg font-mono text-sm text-[#171717] placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#171717] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#171717] uppercase tracking-wider">
              PIN Baru (4-8 Digit Angka)
            </label>
            <input
              type="password"
              maxLength={8}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Ketik 4-8 digit angka baru"
              className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#e5e5e5] rounded-lg font-mono text-sm text-[#171717] placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#171717] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#171717] uppercase tracking-wider">
              Konfirmasi PIN Baru
            </label>
            <input
              type="password"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Ketik ulang PIN baru"
              className="w-full px-3 py-2.5 bg-[#fafafa] border border-[#e5e5e5] rounded-lg font-mono text-sm text-[#171717] placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#171717] transition-all"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
              <Check size={14} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f0f0f0]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-[#e5e5e5] hover:bg-neutral-50 text-[#171717] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !currentPin || !newPin || !confirmPin}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#171717] hover:bg-neutral-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Menyimpan..." : "Simpan PIN Baru"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
