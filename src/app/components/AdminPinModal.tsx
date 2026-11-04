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
        onClose();
        if (onSuccess) {
          onSuccess();
        } else {
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

  // Auto-verify when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4) {
      handleVerify(pin);
    }
  }, [pin, handleVerify]);

  const handleKeyPress = useCallback(
    (digit: string) => {
      if (isVerifying || isLockedOut) return;
      if (pin.length < 6) {
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
      } else if (e.key === "Backspace") {
        handleDelete();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyPress, handleDelete, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 select-none font-['Manrope',sans-serif] animate-in fade-in duration-150">
      <div className="max-w-sm w-full bg-white border border-[#e5e5e5] rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 text-[#171717]">
        {/* Top Header Row */}
        <div className="flex items-center justify-between text-[#888]">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-[#171717] hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Batal / Kembali"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 text-[11px] font-semibold tracking-wider uppercase">
            <span>Akses Staf Studio</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-[#171717] hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lock Icon & Title */}
        <div className="space-y-1.5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[#171717] shadow-2xs mb-2">
            <Lock size={24} strokeWidth={2} />
          </div>
          <h2 className="text-xl font-bold text-[#171717] tracking-tight">
            Masukkan PIN Admin
          </h2>
          <p className="text-xs text-[#737373]">
            Ketik 4-digit PIN keamanan untuk membuka portal studio.
          </p>
        </div>

        {/* PIN Dots Display */}
        <div className="py-2">
          <div className="flex items-center justify-center gap-3">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                    isFilled
                      ? "bg-[#171717] scale-110 shadow-sm"
                      : "border-2 border-neutral-300 bg-transparent"
                  }`}
                />
              );
            })}
          </div>

          {/* Feedback / Lockout message */}
          {errorMsg && (
            <div className="mt-3 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {isLockedOut && (
            <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium inline-flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-amber-600" />
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
              className="h-14 rounded-2xl bg-[#fafafa] hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 border border-[#e5e5e5] text-[#171717] font-bold text-xl transition-all cursor-pointer shadow-2xs flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {digit}
            </button>
          ))}

          {/* Bottom Row: Clear, 0, Backspace */}
          <button
            type="button"
            disabled={isVerifying || isLockedOut || pin.length === 0}
            onClick={handleClear}
            className="h-14 rounded-2xl bg-white hover:bg-neutral-100 active:scale-95 border border-[#e5e5e5] text-neutral-400 hover:text-neutral-700 font-medium text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Clear
          </button>

          <button
            type="button"
            disabled={isVerifying || isLockedOut}
            onClick={() => handleKeyPress("0")}
            className="h-14 rounded-2xl bg-[#fafafa] hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 border border-[#e5e5e5] text-[#171717] font-bold text-xl transition-all cursor-pointer shadow-2xs flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          >
            0
          </button>

          <button
            type="button"
            disabled={isVerifying || isLockedOut || pin.length === 0}
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-white hover:bg-neutral-100 active:scale-95 border border-[#e5e5e5] text-neutral-400 hover:text-neutral-700 transition-all cursor-pointer flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Footer Hint */}
        <p className="text-[11px] text-neutral-400 leading-tight">
          Hanya untuk pemilik dan staf kasir studio.
        </p>
      </div>
    </div>
  );
}
