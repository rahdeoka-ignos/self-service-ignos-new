import { useState, useEffect, useCallback } from "react";
import { Lock, Delete, X, ShieldAlert, ArrowLeft } from "lucide-react";
import { useSecurity } from "../../context/SecurityContext";
import { useNavigate } from "react-router";

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  targetPath?: string;
}

export function AdminPinModal({
  isOpen,
  onClose,
  onSuccess,
  targetPath = "/admin",
}: AdminPinModalProps) {
  const { verifyPin } = useSecurity();
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const navigate = useNavigate();

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setErrorMsg("");
      setIsVerifying(false);
    }
  }, [isOpen]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimer > 0) {
      const interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutTimer]);

  const handleVerify = useCallback(
    async (pinToVerify: string) => {
      if (isVerifying || isLockedOut || pinToVerify.length < 4) return;

      setIsVerifying(true);
      setErrorMsg("");

      const result = await verifyPin(pinToVerify);
      setIsVerifying(false);

      if (result.success) {
        setPin("");
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
          navigate(targetPath);
        }
      } else {
        setPin("");
        if (result.isLockedOut && result.remainingSeconds) {
          setIsLockedOut(true);
          setLockoutTimer(result.remainingSeconds);
        }
        setErrorMsg(result.message || "PIN salah.");
      }
    },
    [isVerifying, isLockedOut, verifyPin, onClose, onSuccess, navigate, targetPath]
  );

  const handleKeyPress = useCallback(
    (digit: string) => {
      if (isVerifying || isLockedOut) return;
      if (pin.length < 8) {
        setPin((prev) => prev + digit);
        setErrorMsg("");
      }
    },
    [isVerifying, isLockedOut, pin.length]
  );

  const handleDelete = useCallback(() => {
    if (isVerifying || isLockedOut) return;
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg("");
  }, [isVerifying, isLockedOut]);

  const handleClear = useCallback(() => {
    if (isVerifying || isLockedOut) return;
    setPin("");
    setErrorMsg("");
  }, [isVerifying, isLockedOut]);

  // Physical keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleKeyPress(e.key);
      } else if (e.key === "Enter") {
        handleVerify(pin);
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyPress, handleDelete, onClose, handleVerify, pin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/70  flex items-center justify-center p-4 select-none font-['Inter',sans-serif] animate-in fade-in duration-150">
      <div className="max-w-sm w-full bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 text-[var(--admin-text,#f4f4f5)]">
        {/* Top Header Row */}
        <div className="flex items-center justify-between text-[var(--admin-muted,#92989d)]">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-text,#f4f4f5)] hover:bg-[var(--admin-raised,#292b2f)] transition-colors cursor-pointer"
            title="Batal / Kembali"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--admin-raised,#292b2f)] border border-[var(--admin-border-interactive,#34373b)] text-[var(--admin-secondary,#c3c7ca)] text-[12px] font-semibold tracking-wider uppercase">
            <span>Akses Staf Studio</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-text,#f4f4f5)] hover:bg-[var(--admin-raised,#292b2f)] transition-colors cursor-pointer"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lock Icon & Title */}
        <div className="space-y-1.5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--admin-raised,#292b2f)] border border-[var(--admin-border-interactive,#34373b)] flex items-center justify-center text-[var(--admin-text,#f4f4f5)]  mb-2">
            <Lock size={24} strokeWidth={2} />
          </div>
          <h2 className="text-[18px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-tight">
            Masukkan PIN Admin
          </h2>
          <p className="text-xs text-[var(--admin-muted,#92989d)]">
            Ketik PIN 4-8 digit, lalu tekan Masuk.
          </p>
        </div>

        {/* PIN Dots Display */}
        <div className="py-2">
          <div className="flex items-center justify-center gap-3">
            {Array.from({ length: Math.max(4, pin.length) }, (_, i) => i).map((idx) => {
              const isFilled = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                    isFilled
                      ? "bg-[#c0d0e7] scale-110 shadow-sm"
                      : "border-2 border-[var(--admin-border-interactive,#34373b)] bg-transparent"
                  }`}
                />
              );
            })}
          </div>

          {/* Feedback / Lockout message */}
          {errorMsg && (
            <div className="mt-3 p-2 rounded-lg bg-[var(--admin-alert,#3b2d3c)] border border-rose-200 text-[var(--admin-danger,#f18e9a)] text-xs font-medium animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {isLockedOut && (
            <div className="mt-3 p-2 rounded-lg bg-[var(--admin-alert,#3b2d3c)] border border-amber-200 text-[var(--admin-pending,#d7b8d6)] text-xs font-medium inline-flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-[var(--admin-pending,#d7b8d6)]" />
              <span>Sistem terkunci sementara ({lockoutTimer}s)</span>
            </div>
          )}
        </div>

        {/* Virtual Numpad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto pt-1">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isVerifying || isLockedOut}
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] active:bg-[var(--admin-raised,#292b2f)] active:scale-95 border border-[var(--admin-border,#2a2d2f)] text-[var(--admin-text,#f4f4f5)] font-bold text-xl transition-all cursor-pointer  flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {digit}
            </button>
          ))}

          {/* Bottom Row: Clear, 0, Backspace */}
          <button
            type="button"
            disabled={isVerifying || isLockedOut || pin.length === 0}
            onClick={handleClear}
            className="h-14 rounded-2xl bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] active:scale-95 border border-[var(--admin-border,#2a2d2f)] text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-secondary,#c3c7ca)] font-medium text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Clear
          </button>

          <button
            type="button"
            disabled={isVerifying || isLockedOut}
            onClick={() => handleKeyPress("0")}
            className="h-14 rounded-2xl bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] active:bg-[var(--admin-raised,#292b2f)] active:scale-95 border border-[var(--admin-border,#2a2d2f)] text-[var(--admin-text,#f4f4f5)] font-bold text-xl transition-all cursor-pointer  flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          >
            0
          </button>

          <button
            type="button"
            disabled={isVerifying || isLockedOut || pin.length === 0}
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] active:scale-95 border border-[var(--admin-border,#2a2d2f)] text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-secondary,#c3c7ca)] transition-all cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Delete size={20} />
          </button>
        </div>

        <button type="button" disabled={pin.length < 4 || isVerifying || isLockedOut}
          onClick={() => handleVerify(pin)} className="w-full rounded-xl bg-black text-white p-3 disabled:opacity-40">
          {isVerifying ? "Memeriksa..." : "Masuk"}
        </button>
        {/* Footer Hint */}
        <p className="text-[12px] text-[var(--admin-muted,#92989d)] leading-tight">
          Hanya untuk pemilik dan staf kasir studio.
        </p>
      </div>
    </div>
  );
}
