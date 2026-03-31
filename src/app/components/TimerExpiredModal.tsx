import { Timer } from "lucide-react";
import { BrutalistButton } from "./BrutalistButton";

type Props = {
  onContinue: () => void;
};

export function TimerExpiredModal({ onContinue }: Props) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999]">
      <div className="bg-white border-4 border-black rounded-2xl p-10 max-w-lg w-full mx-4 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Timer size={48} className="text-white" strokeWidth={2} />
        </div>

        <h2 className="text-4xl font-bold mb-3">Waktu Habis!</h2>
        <p className="text-xl text-gray-600 mb-8">
          Sesi foto kamu telah berakhir. Silakan selesaikan dan cetak foto kamu
          sekarang.
        </p>

        {/* Timer display shows 00:00 */}
        <div className="border-4 border-black rounded-2xl p-6 mb-8 bg-gray-50">
          <p className="text-8xl font-bold tracking-tight text-red-500">
            00:00
          </p>
          <p className="text-2xl font-bold text-gray-500 mt-2">menit</p>
        </div>

        <BrutalistButton onClick={onContinue} className="w-full text-2xl">
          Selesaikan Sesi →
        </BrutalistButton>
      </div>
    </div>
  );
}
