import { useRef, useState } from "react";
import { Download, Star, Sparkles } from "lucide-react";

const CARD_W = 1004;
const CARD_H = 626;

const TIERS = [
  { name: "Silver", min: 0, color: "#C0C0C0", accent: "#888", stars: 1 },
  { name: "Gold", min: 3, color: "#FFD700", accent: "#B8860B", stars: 2 },
  { name: "Platinum", min: 10, color: "#E5E4E2", accent: "#333", stars: 3 },
];

export function LoyaltyCard() {
  const [name, setName] = useState("");
  const [visits, setVisits] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const tier = [...TIERS].reverse().find((t) => visits >= t.min) ?? TIERS[0];
  const nextTier = TIERS[TIERS.findIndex((t) => t.name === tier.name) + 1];
  const progressToNext = nextTier
    ? Math.min(((visits - tier.min) / (nextTier.min - tier.min)) * 100, 100)
    : 100;

  const handleDownload = async () => {
    if (!name.trim()) return;
    setDownloading(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = CARD_W;
      canvas.height = CARD_H;
      const ctx = canvas.getContext("2d")!;

      // Background
      const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
      if (tier.name === "Gold") {
        bg.addColorStop(0, "#1a1200");
        bg.addColorStop(0.5, "#2d1f00");
        bg.addColorStop(1, "#1a1200");
      } else if (tier.name === "Platinum") {
        bg.addColorStop(0, "#0a0a0a");
        bg.addColorStop(0.5, "#1a1a1a");
        bg.addColorStop(1, "#0a0a0a");
      } else {
        bg.addColorStop(0, "#0a0a14");
        bg.addColorStop(0.5, "#0f0f20");
        bg.addColorStop(1, "#0a0a14");
      }
      ctx.fillStyle = bg;
      ctx.roundRect(0, 0, CARD_W, CARD_H, 32);
      ctx.fill();

      // Border
      ctx.strokeStyle = tier.color;
      ctx.lineWidth = 6;
      ctx.roundRect(3, 3, CARD_W - 6, CARD_H - 6, 30);
      ctx.stroke();

      // Decorative circles
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = tier.color;
      ctx.beginPath();
      ctx.arc(CARD_W - 80, 80, 180, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(60, CARD_H - 60, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Corner accent lines
      ctx.strokeStyle = tier.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.4;
      // Top left corner
      ctx.beginPath();
      ctx.moveTo(50, 30);
      ctx.lineTo(50, 80);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(30, 50);
      ctx.lineTo(80, 50);
      ctx.stroke();
      // Bottom right corner
      ctx.beginPath();
      ctx.moveTo(CARD_W - 50, CARD_H - 30);
      ctx.lineTo(CARD_W - 50, CARD_H - 80);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(CARD_W - 30, CARD_H - 50);
      ctx.lineTo(CARD_W - 80, CARD_H - 50);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Studio name
      ctx.fillStyle = tier.color;
      ctx.font = "bold 28px Arial";
      ctx.letterSpacing = "8px";
      ctx.fillText("IGNOS STUDIO", 60, 90);

      // Loyalty badge
      ctx.fillStyle = tier.color;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(60, 110, 220, 40);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = tier.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 110, 220, 40);
      ctx.fillStyle = tier.color;
      ctx.font = "bold 16px Arial";
      ctx.letterSpacing = "4px";
      ctx.fillText("LOYALTY CARD", 80, 136);

      // Tier badge
      ctx.fillStyle = tier.color;
      ctx.globalAlpha = 0.9;
      ctx.roundRect(CARD_W - 220, 50, 160, 50, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#000";
      ctx.font = "bold 22px Arial";
      ctx.letterSpacing = "3px";
      ctx.fillText(tier.name.toUpperCase(), CARD_W - 200, 82);

      // Member name
      ctx.fillStyle = "#ffffff";
      ctx.font = "300 22px Arial";
      ctx.letterSpacing = "2px";
      ctx.fillText("MEMBER NAME", 60, 240);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 52px Arial";
      ctx.letterSpacing = "1px";
      ctx.fillText(name.toUpperCase(), 60, 310);

      // Divider line
      ctx.strokeStyle = tier.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(60, 330);
      ctx.lineTo(CARD_W - 60, 330);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Visits
      ctx.fillStyle = tier.color;
      ctx.font = "300 18px Arial";
      ctx.letterSpacing = "2px";
      ctx.fillText("TOTAL KUNJUNGAN", 60, 380);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 64px Arial";
      ctx.fillText(`${visits}x`, 60, 460);

      // Stars
      const starX = CARD_W - 200;
      const starY = 380;
      for (let s = 0; s < tier.stars; s++) {
        ctx.fillStyle = tier.color;
        ctx.font = "40px Arial";
        ctx.fillText("★", starX + s * 52, starY + 50);
      }

      // Bottom strip
      ctx.fillStyle = tier.color;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(0, CARD_H - 70, CARD_W, 70);
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#000";
      ctx.font = "bold 18px Arial";
      ctx.letterSpacing = "6px";
      ctx.fillText("FOTO STUDIO BALI", 60, CARD_H - 35);

      ctx.fillStyle = "#000";
      ctx.font = "16px Arial";
      ctx.letterSpacing = "1px";
      ctx.fillText("www.ignos.studio", CARD_W - 260, CARD_H - 35);

      // Download
      const link = document.createElement("a");
      link.download = `loyalty-card-${name.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 pt-20">
      <div className="max-w-5xl mx-auto">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-6xl font-bold mb-3">Loyalty Card</h1>
          <p className="text-2xl text-gray-600">
            Buat kartu loyalitas eksklusif kamu
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Left — Input */}
          <div className="space-y-6">
            <div className="bg-white border-4 border-black rounded-2xl p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-bold mb-6">Detail Member</h2>

              {/* Name */}
              <div className="mb-6">
                <label className="block text-base font-bold mb-2 text-gray-700">
                  Nama Member
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama..."
                  className="w-full border-4 border-black rounded-xl px-5 py-4 text-xl font-medium outline-none focus:bg-gray-50 transition-colors"
                />
              </div>

              {/* Visits */}
              <div className="mb-8">
                <label className="block text-base font-bold mb-2 text-gray-700">
                  Jumlah Kunjungan
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setVisits((v) => Math.max(0, v - 1))}
                    className="w-14 h-14 border-4 border-black rounded-xl font-bold text-2xl hover:bg-black hover:text-white transition-colors flex items-center justify-center"
                  >
                    −
                  </button>
                  <div className="flex-1 border-4 border-black rounded-xl py-3 text-center text-3xl font-bold bg-gray-50">
                    {visits}
                  </div>
                  <button
                    onClick={() => setVisits((v) => v + 1)}
                    className="w-14 h-14 border-4 border-black rounded-xl font-bold text-2xl hover:bg-black hover:text-white transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Tier info */}
              <div className="border-4 border-black rounded-xl p-5 mb-6 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-lg">Tier Saat Ini</span>
                  <span
                    className="font-black text-lg px-4 py-1 rounded-full border-2 border-black"
                    style={{ backgroundColor: tier.color, color: "#000" }}
                  >
                    {tier.name}
                  </span>
                </div>
                {nextTier && (
                  <>
                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                      <span>{tier.name}</span>
                      <span>
                        {nextTier.min - visits} kunjungan lagi ke{" "}
                        {nextTier.name}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 border-2 border-black overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progressToNext}%`,
                          backgroundColor: tier.color,
                        }}
                      />
                    </div>
                  </>
                )}
                {!nextTier && (
                  <p className="text-sm font-bold text-gray-600">
                    ✦ Tier tertinggi — Platinum Member
                  </p>
                )}
              </div>

              {/* Download button */}
              <button
                onClick={handleDownload}
                disabled={!name.trim() || downloading}
                className="w-full text-xl font-bold border-4 border-black px-8 py-5 bg-black text-white hover:bg-white hover:text-black transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <Download size={24} strokeWidth={2.5} />
                {downloading ? "Membuat kartu..." : "Download Loyalty Card"}
              </button>
            </div>

            {/* Tier guide */}
            <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="text-xl font-bold mb-4">Panduan Tier</h3>
              <div className="space-y-3">
                {TIERS.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-center gap-4 p-3 rounded-xl border-2 border-black"
                    style={{
                      backgroundColor:
                        tier.name === t.name ? t.color + "22" : "transparent",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center font-bold"
                      style={{ backgroundColor: t.color }}
                    >
                      {"★".repeat(t.stars)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{t.name}</p>
                      <p className="text-sm text-gray-500">
                        {t.min}+ kunjungan
                      </p>
                    </div>
                    {tier.name === t.name && (
                      <span className="text-sm font-bold bg-black text-white px-3 py-1 rounded-full">
                        Tier kamu
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Card Preview */}
          <div>
            <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-bold mb-4">Preview Kartu</h2>

              {/* Card preview */}
              <div
                ref={cardRef}
                className="relative w-full rounded-2xl overflow-hidden border-4 border-black"
                style={{
                  aspectRatio: `${CARD_W}/${CARD_H}`,
                  background:
                    tier.name === "Gold"
                      ? "linear-gradient(135deg, #1a1200, #2d1f00, #1a1200)"
                      : tier.name === "Platinum"
                        ? "linear-gradient(135deg, #0a0a0a, #1a1a1a, #0a0a0a)"
                        : "linear-gradient(135deg, #0a0a14, #0f0f20, #0a0a14)",
                }}
              >
                {/* Border glow */}
                <div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    border: `3px solid ${tier.color}`,
                    opacity: 0.8,
                  }}
                />

                {/* Decorative circles */}
                <div
                  className="absolute rounded-full"
                  style={{
                    width: "45%",
                    height: "145%",
                    right: "-15%",
                    top: "-20%",
                    backgroundColor: tier.color,
                    opacity: 0.06,
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    width: "30%",
                    height: "96%",
                    left: "-8%",
                    bottom: "-20%",
                    backgroundColor: tier.color,
                    opacity: 0.06,
                  }}
                />

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p
                        className="text-xs font-black tracking-[0.3em] mb-1"
                        style={{ color: tier.color }}
                      >
                        IGNOS STUDIO
                      </p>
                      <div
                        className="inline-block px-3 py-1 text-xs font-bold tracking-widest border"
                        style={{
                          borderColor: tier.color,
                          color: tier.color,
                          backgroundColor: tier.color + "20",
                        }}
                      >
                        LOYALTY CARD
                      </div>
                    </div>
                    <div
                      className="px-4 py-1 rounded font-black text-sm tracking-widest"
                      style={{ backgroundColor: tier.color, color: "#000" }}
                    >
                      {tier.name.toUpperCase()}
                    </div>
                  </div>

                  {/* Name */}
                  <div className="flex-1 flex flex-col justify-center">
                    <p
                      className="text-xs font-light tracking-[0.2em] mb-1"
                      style={{ color: tier.color + "aa" }}
                    >
                      MEMBER NAME
                    </p>
                    <p className="text-3xl font-black text-white tracking-wide truncate">
                      {name || "NAMA MEMBER"}
                    </p>
                    <div
                      className="mt-2 h-0.5 w-full"
                      style={{ backgroundColor: tier.color, opacity: 0.4 }}
                    />
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-end justify-between">
                    <div>
                      <p
                        className="text-xs tracking-widest mb-1"
                        style={{ color: tier.color + "99" }}
                      >
                        TOTAL KUNJUNGAN
                      </p>
                      <p className="text-5xl font-black text-white">
                        {visits}
                        <span className="text-2xl ml-1 font-bold">x</span>
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: tier.stars }).map((_, i) => (
                        <Star
                          key={i}
                          size={24}
                          fill={tier.color}
                          stroke="none"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom strip */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-6 py-2 flex items-center justify-between"
                  style={{ backgroundColor: tier.color }}
                >
                  <span className="text-xs font-black tracking-widest text-black">
                    FOTO STUDIO BALI
                  </span>
                  <span className="text-xs font-medium text-black opacity-70">
                    www.ignos.studio
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-3 text-center font-medium">
                Preview — ukuran asli {CARD_W}×{CARD_H}px saat didownload
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
