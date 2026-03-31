import { Timer } from "lucide-react";

type TimerBarProps = {
  minutes: string;
  seconds: string;
  timeLeft: number;
};

export function TimerBar({ minutes, seconds, timeLeft }: TimerBarProps) {
  const isUrgent = timeLeft <= 5 * 60; // < 5 menit → kuning
  const isCritical = timeLeft <= 60; // < 1 menit → merah + pulse

  return (
    <div
      className={`fixed top-37 right-3 z-50 flex items-center gap-3 
        border-4 border-black px-7 py-3 rounded-2xl font-extrabold text-xl
        shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors duration-500
        ${
          isCritical
            ? "bg-red-500 text-white animate-pulse"
            : isUrgent
              ? "bg-yellow-400 text-black"
              : "bg-white text-black"
        }`}
    >
      <Timer size={22} strokeWidth={2.5} />
      <span className="tabular-nums tracking-widest text-3xl font-extrabold">
        {minutes}:{seconds}
      </span>
    </div>
  );
}
