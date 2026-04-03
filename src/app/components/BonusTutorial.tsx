import { useState } from "react";

interface BonusTutorialProps {
  peopleCount: number;
  onClose: () => void;
}

const STEPS = [
  { id: 0, dot: "🎁" },
  { id: 1, dot: "⭐" },
  { id: 2, dot: "🖨️" },
  { id: 3, dot: "🚀" },
];

export function BonusTutorial({ peopleCount, onClose }: BonusTutorialProps) {
  const [step, setStep] = useState(0);

  const bonusCount = peopleCount <= 3 ? peopleCount * 2 : peopleCount + 1;

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
    >
      <div className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-10 w-full max-w-lg relative">
        {/* Skip */}
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-sm font-black text-gray-400 hover:text-black underline cursor-pointer"
        >
          Lewati ✕
        </button>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 border-2 border-black rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-black rounded-full transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-3 mb-8">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`w-3 h-3 rounded-full border-[3px] border-black transition-all duration-300
                ${step === s.id ? "bg-black scale-125" : step > s.id ? "bg-yellow-300" : "bg-white"}`}
            />
          ))}
        </div>

        {/* ── Step 0: Apa ini? ── */}
        {step === 0 && (
          <div className="animate-[slideUp_0.35s_ease_forwards]">
            <div className="w-20 h-20 rounded-full bg-yellow-300 border-4 border-black flex items-center justify-center text-4xl mx-auto mb-5 animate-pulse">
              🎁
            </div>
            <h2 className="text-3xl font-black text-center leading-tight mb-3">
              Ada kesempatan dapat
              <br />
              cetak <span className="bg-yellow-300 px-2">GRATIS!</span>
            </h2>
            <p className="text-lg text-gray-600 font-bold text-center leading-relaxed">
              Di halaman ini kamu bisa memilih apakah mau ikut{" "}
              <strong className="text-black">program bonus</strong> atau
              langsung lanjut cetak foto.
            </p>

            {/* Mini illustration */}
            <div className="border-4 border-black rounded-2xl p-4 mt-5 bg-gray-50 relative">
              <div className="grid grid-cols-2 gap-3 relative">
                <div className="border-3 border-black rounded-xl p-4 flex flex-col items-center gap-2 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <span className="text-3xl">🎁</span>
                  <span className="font-black text-sm">Ikut Bonus</span>
                  <span className="text-xs font-black bg-yellow-300 border-2 border-black rounded-full px-3 py-1">
                    GRATIS +print
                  </span>
                </div>
                <div className="border-3 border-black rounded-xl p-4 flex flex-col items-center gap-2 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <span className="text-3xl">✕</span>
                  <span className="font-black text-sm">Lewati</span>
                  <span className="text-xs font-black border-2 border-black rounded-full px-3 py-1">
                    Lanjut saja
                  </span>
                </div>
                {/* VS badge */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-black text-white rounded-full flex items-center justify-center text-xs font-black z-10">
                  VS
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Cara ikut bonus ── */}
        {step === 1 && (
          <div>
            <div
              className="w-20 h-20 rounded-full bg-green-300 border-4 border-black flex items-center justify-center text-4xl mx-auto mb-5"
              style={{ animation: "wiggle 1s ease infinite" }}
            >
              ⭐
            </div>
            <h2 className="text-3xl font-black text-center leading-tight mb-3">
              Cara ikut bonus
              <br />
              sangat mudah!
            </h2>
            <p className="text-lg text-gray-600 font-bold text-center leading-relaxed">
              Selesaikan 2 langkah berikut dan tunjukkan ke kasir.
            </p>

            <div className="border-4 border-black rounded-2xl p-4 mt-5 bg-gray-50">
              <div className="flex flex-col gap-3">
                {[
                  { icon: "📍", text: "Beri ulasan bintang 5 di Google Maps" },
                  { icon: "📸", text: "Tag @ignos.studio di Instagram Story" },
                  { icon: "🎉", text: "Dapat bonus print!", bonus: true },
                ].map((item, i) => (
                  <div key={i}>
                    {i > 0 && (
                      <div className="text-center text-2xl my-1 font-black text-gray-400">
                        ↓
                      </div>
                    )}
                    <div
                      className={`flex items-center gap-3 border-3 border-black rounded-xl px-4 py-3 font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                        ${item.bonus ? "bg-yellow-300" : "bg-white"}`}
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Berapa bonus ── */}
        {step === 2 && (
          <div>
            <div className="w-20 h-20 rounded-full bg-blue-300 border-4 border-black flex items-center justify-center text-4xl mx-auto mb-5">
              🖨️
            </div>
            <h2 className="text-3xl font-black text-center leading-tight mb-3">
              Bonus print yang
              <br />
              kamu dapat
            </h2>
            <p className="text-lg text-gray-600 font-bold text-center leading-relaxed">
              Sesimu sekarang:{" "}
              <strong className="text-black">{peopleCount} orang</strong> →{" "}
              <span className="bg-yellow-300 px-2 border-2 border-black rounded-lg">
                {bonusCount} print total
              </span>
            </p>

            <div className="border-4 border-black rounded-2xl p-4 mt-5 bg-gray-50 flex flex-col gap-3">
              {[
                {
                  range: "1–3 orang",
                  desc: "Dapat 2× lipat print",
                  example: "2 orang → 4 print",
                },
                {
                  range: "4+ orang",
                  desc: "Dapat +1 bonus print",
                  example: "5 orang → 6 print",
                },
              ].map((row, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 border-3 border-black rounded-xl px-4 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                    ${
                      (i === 0 && peopleCount <= 3) ||
                      (i === 1 && peopleCount > 3)
                        ? "bg-yellow-300"
                        : "bg-white"
                    }`}
                >
                  <span className="text-2xl">{i === 0 ? "👤" : "👥"}</span>
                  <div className="flex-1">
                    <p className="font-black text-sm">{row.range}</p>
                    <p className="text-xs text-gray-600 font-bold">
                      {row.example}
                    </p>
                  </div>
                  <span className="text-xs font-black border-2 border-black bg-white rounded-lg px-2 py-1">
                    {row.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Siap! ── */}
        {step === 3 && (
          <div>
            <div className="w-20 h-20 rounded-full bg-yellow-300 border-4 border-black flex items-center justify-center text-4xl mx-auto mb-5 animate-bounce">
              🚀
            </div>
            <h2 className="text-3xl font-black text-center leading-tight mb-3">
              Sekarang kamu
              <br />
              siap memilih!
            </h2>
            <p className="text-lg text-gray-600 font-bold text-center leading-relaxed">
              Pilih <strong className="text-black">"Ikut Bonus"</strong> untuk
              dapat print gratis, atau{" "}
              <strong className="text-black">"Lewati"</strong> untuk langsung
              lanjut.
            </p>

            <div className="border-4 border-black rounded-2xl p-5 mt-5 bg-green-50">
              <p className="text-xs font-black text-gray-500 mb-3 uppercase tracking-widest">
                Checklist jika ikut bonus:
              </p>
              <div className="flex flex-col gap-2">
                {[
                  "Ulasan Google Maps bintang 5",
                  "Tag IG Story sebelum sesi selesai",
                  "Tunjukkan ke kasir",
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 font-black text-sm"
                  >
                    <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">
                      ✓
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation buttons ── */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={prev}
              className="flex-1 py-4 border-4 border-black rounded-xl font-black text-lg bg-white hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 cursor-pointer"
            >
              ← Kembali
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              className="flex-1 py-4 border-4 border-black rounded-xl font-black text-lg bg-black text-white hover:bg-gray-800 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] cursor-pointer"
            >
              Lanjut →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 py-4 border-4 border-black rounded-xl font-black text-lg bg-yellow-300 hover:bg-yellow-400 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 cursor-pointer"
            >
              Mengerti, mulai! 🎉
            </button>
          )}
        </div>
      </div>

      {/* Wiggle animation for step 1 */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
      `}</style>
    </div>
  );
}
