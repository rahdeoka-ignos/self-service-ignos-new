import { useState } from "react";
import { Timer, Lock, Eye, EyeOff } from "lucide-react";
import { BrutalistButton } from "./BrutalistButton";

const ADMIN_PASSWORD = "adminnyarahde";

type Props = {
  onContinue: () => void;
};

export function TimerExpiredModal({ onContinue }: Props) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = () => {
    if (password === ADMIN_PASSWORD) {
      setError(false);
      onContinue();
    } else {
      setError(true);
      setPassword("");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999]">
      <div
        className={`bg-white border-4 border-black rounded-2xl p-10 max-w-lg w-full mx-4 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]
          ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
        style={shake ? { animation: "shake 0.4s ease-in-out" } : {}}
      >
        {/* Icon */}
        <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Timer size={48} className="text-white" strokeWidth={2} />
        </div>

        <h2 className="text-4xl font-bold mb-3">Waktu Habis!</h2>
        <p className="text-xl text-gray-600 mb-6">
          Sesi foto telah berakhir. Masukkan password admin untuk melanjutkan.
        </p>

        {/* Timer display */}
        <div className="border-4 border-black rounded-2xl p-6 mb-8 bg-gray-50">
          <p className="text-8xl font-bold tracking-tight text-red-500">
            00:00
          </p>
          <p className="text-2xl font-bold text-gray-500 mt-2">menit</p>
        </div>

        {/* Password input */}
        <div className="mb-3">
          <div
            className={`flex items-center border-4 rounded-xl overflow-hidden
            ${error ? "border-red-500" : "border-black"}`}
          >
            <div className="px-4 py-4 bg-gray-50 border-r-4 border-inherit">
              <Lock
                size={22}
                strokeWidth={2.5}
                className={error ? "text-red-500" : "text-black"}
              />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Password admin"
              className="flex-1 px-4 py-4 text-xl font-bold outline-none bg-white placeholder:text-gray-300"
            />
            <button
              onClick={() => setShowPassword((v) => !v)}
              className="px-4 py-4 bg-gray-50 border-l-4 border-inherit hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {showPassword ? (
                <EyeOff size={22} strokeWidth={2.5} className="text-gray-500" />
              ) : (
                <Eye size={22} strokeWidth={2.5} className="text-gray-500" />
              )}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-red-500 font-bold text-lg mt-2 text-left">
              Password salah. Coba lagi.
            </p>
          )}
        </div>

        <BrutalistButton
          onClick={handleSubmit}
          disabled={!password}
          className="w-full text-2xl mt-3"
        >
          Lanjutkan →
        </BrutalistButton>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
