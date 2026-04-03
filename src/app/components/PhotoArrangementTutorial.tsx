import { BrutalistButton } from "./BrutalistButton";

const tips = [
  {
    emoji: "🖱️",
    title: "Drag / Klik",
    desc: "Seret foto atau klik langsung dari galeri untuk memasukkan foto ke slot",
  },
  {
    emoji: "🔍",
    title: "Zoom",
    desc: "Scroll mouse untuk perbesar/perkecil foto",
  },
  {
    emoji: "✋",
    title: "Geser foto",
    desc: "Klik & tahan foto di slot untuk menggesernya",
  },
  {
    emoji: "👁️",
    title: "Preview",
    desc: "Hover foto di galeri lalu klik Preview",
  },
];

export function PhotoArrangementTutorial({ onDone }: { onDone: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center">
      <div className="bg-white border-4 border-black rounded-2xl p-10 max-w-2xl w-full mx-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-2">Cara Menyusun Foto</h2>
        </div>
        <div className="grid grid-cols-2 gap-5 mb-8">
          {tips.map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-4 bg-gray-50 border-2 border-black rounded-xl p-5"
            >
              <div className="text-4xl flex-shrink-0">{tip.emoji}</div>
              <div>
                <p className="text-xl font-bold mb-1">{tip.title}</p>
                <p className="text-lg text-gray-600">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <BrutalistButton onClick={onDone} className="w-full text-2xl">
          Mengerti, mulai susun foto →
        </BrutalistButton>
      </div>
    </div>
  );
}
