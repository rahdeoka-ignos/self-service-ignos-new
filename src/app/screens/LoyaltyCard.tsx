import { useRef, useState } from "react";
import { Download, Check } from "lucide-react";

const CARD_W = 1004;
const CARD_H = 626;

const REWARDS = [
  { id: 1, label: "Booking\nPertama", isFirst: true },
  { id: 2, label: "Gratis 2\nCetak 4R" },
  { id: 3, label: "Gratis 2\nKeychain\nPlastik" },
  { id: 4, label: "Gratis\nWaktu\n10 Menit" },
  { id: 5, label: "Gratis 2\nFrame 4R" },
  { id: 6, label: "Gratis\nFoto 1\nSesi", isFinal: true },
];

export function LoyaltyCard() {
  const [names, setNames] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [checkedRewards, setCheckedRewards] = useState<number[]>([1]);

  const toggleReward = (id: number) => {
    if (id === 1) return;
    setCheckedRewards((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const handleDownload = async () => {
    if (!names.trim()) return;
    setDownloading(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = CARD_W;
      canvas.height = CARD_H;
      const ctx = canvas.getContext("2d")!;

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      // Outer border
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.strokeRect(14, 14, CARD_W - 28, CARD_H - 28);

      // 4-pointed star helper
      const draw4Star = (cx: number, cy: number, size: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.bezierCurveTo(
          size * 0.15,
          -size * 0.15,
          size * 0.15,
          -size * 0.15,
          size,
          0,
        );
        ctx.bezierCurveTo(
          size * 0.15,
          size * 0.15,
          size * 0.15,
          size * 0.15,
          0,
          size,
        );
        ctx.bezierCurveTo(
          -size * 0.15,
          size * 0.15,
          -size * 0.15,
          size * 0.15,
          -size,
          0,
        );
        ctx.bezierCurveTo(
          -size * 0.15,
          -size * 0.15,
          -size * 0.15,
          -size * 0.15,
          0,
          -size,
        );
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };

      draw4Star(65, 48, 16);
      draw4Star(90, 32, 10);
      draw4Star(CARD_W - 65, 48, 16);
      draw4Star(CARD_W - 90, 32, 10);

      // ── TITLE ──
      ctx.fillStyle = "#000000";
      ctx.font = "bold 78px 'Times New Roman', Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("LOYALTY CARD", CARD_W / 2, 102);

      // Underline
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(CARD_W / 2 - 210, 114);
      ctx.lineTo(CARD_W / 2 + 210, 114);
      ctx.stroke();

      // Subtitle
      ctx.fillStyle = "#555";
      ctx.font = "italic 21px 'Times New Roman', Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "loyalty card bisa digunakan jika fotoan kembali dengan :",
        CARD_W / 2,
        148,
      );

      // Names
      ctx.fillStyle = "#000";
      ctx.font = "bold 26px 'Times New Roman', Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText(names || "Nama Member", CARD_W / 2, 180);

      // ── CIRCLES ──
      const circleR = 70;
      const cols = 3;
      const startX = CARD_W / 2 - 210;
      const startY = 278;
      const gapX = 210;
      const gapY = 162;

      REWARDS.forEach((reward, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = startX + col * gapX;
        const cy = startY + row * gapY;
        const isChecked = checkedRewards.includes(reward.id);
        const isFinal = !!reward.isFinal;

        // Fill
        if (isChecked) {
          ctx.fillStyle = "#f8f8f8";
          ctx.beginPath();
          ctx.arc(cx, cy, circleR - 1, 0, Math.PI * 2);
          ctx.fill();
        }

        if (isFinal) {
          // Triple ring for final
          [circleR + 10, circleR, circleR - 9].forEach((r, i) => {
            ctx.strokeStyle = "#000";
            ctx.lineWidth = i === 1 ? 2.5 : 1;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
          });
          // Dots between outer rings
          for (let a = 0; a < 360; a += 45) {
            const rad = (a * Math.PI) / 180;
            const dr = circleR + 5;
            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(
              cx + dr * Math.cos(rad),
              cy + dr * Math.sin(rad),
              2.5,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        } else {
          // Double ring
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx, cy, circleR - 8, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Content inside circle
        // Selalu render teks dulu
        const lines = reward.label.split("\n");
        const fs = isFinal ? 18 : 16;
        ctx.fillStyle = "#000";
        ctx.font = `${isFinal ? "bold" : "normal"} ${fs}px Arial, sans-serif`;
        ctx.textAlign = "center";
        const lineH = fs + 5;
        const totalH = (lines.length - 1) * lineH;
        lines.forEach((line, li) => {
          ctx.fillText(
            line.toUpperCase(),
            cx,
            cy - totalH / 2 + li * lineH + fs / 3,
          );
        });

        // Overlay semi-transparan + checkmark di atasnya jika checked
        if (isChecked) {
          ctx.fillStyle = "rgba(0,0,0,0.18)";
          ctx.beginPath();
          ctx.arc(cx, cy, circleR - 1, 0, Math.PI * 2);
          ctx.fill();

          // Checkmark
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(cx - 20, cy + 2);
          ctx.lineTo(cx - 4, cy + 18);
          ctx.lineTo(cx + 24, cy - 16);
          ctx.stroke();
        }
      });

      // ── FOOTER ──
      const footerY = CARD_H - 70;
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, footerY);
      ctx.lineTo(CARD_W - 40, footerY);
      ctx.stroke();

      ctx.fillStyle = "#000";
      ctx.font = "bold 28px 'Times New Roman', Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("IGNOS STUDIO", CARD_W / 2, footerY + 26);

      ctx.fillStyle = "#777";
      ctx.font = "15px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        "instagram : @ignos.studio  |  tiktok : @ignosstudio  |  website : ignosstudio.com",
        CARD_W / 2,
        footerY + 50,
      );

      const link = document.createElement("a");
      link.download = `loyalty-card-${names.toLowerCase().replace(/\s+/g, "-") || "member"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 pt-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-6xl font-bold mb-3">Loyalty Card</h1>
          <p className="text-2xl text-gray-600">
            Buat loyalty card untuk pelanggan
          </p>
        </div>

        <div className="grid grid-cols-5 gap-8">
          {/* ── LEFT INPUT ── */}
          <div className="col-span-2 space-y-5">
            <div className="bg-white border-4 border-black rounded-2xl p-7 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-bold mb-5">Detail Member</h2>

              <div className="mb-5">
                <label className="block text-base font-bold mb-2 text-gray-700">
                  Nama Member
                </label>
                <input
                  type="text"
                  value={names}
                  onChange={(e) => setNames(e.target.value)}
                  placeholder="Contoh: Adi, Kiara"
                  className="w-full border-4 border-black rounded-xl px-4 py-3 text-lg font-medium outline-none focus:bg-gray-50 transition-colors"
                />
                <p className="text-sm text-gray-400 mt-1">
                  Pisahkan koma jika lebih dari 1 orang
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-base font-bold mb-3 text-gray-700">
                  Reward yang Sudah Didapat
                </label>
                <div className="space-y-2">
                  {REWARDS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => toggleReward(r.id)}
                      disabled={r.id === 1}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                        checkedRewards.includes(r.id)
                          ? "border-black bg-black text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-black"
                      } ${r.id === 1 ? "opacity-60 cursor-default" : "cursor-pointer"}`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          checkedRewards.includes(r.id)
                            ? "border-white"
                            : "border-gray-400"
                        }`}
                      >
                        {checkedRewards.includes(r.id) && (
                          <Check size={12} strokeWidth={3} />
                        )}
                      </div>
                      <span className="font-medium text-sm">
                        {r.label.replace(/\n/g, " ")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleDownload}
                disabled={!names.trim() || downloading}
                className="w-full text-lg font-bold border-4 border-black px-6 py-4 bg-black text-white hover:bg-white hover:text-black transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download size={20} strokeWidth={2.5} />
                {downloading ? "Membuat..." : "Download PNG"}
              </button>
            </div>
          </div>

          {/* ── RIGHT PREVIEW ── */}
          <div className="col-span-3">
            <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-xl font-bold mb-4">Preview Kartu</h2>

              {/* Card preview */}
              <div
                className="relative w-full bg-white overflow-hidden"
                style={{
                  aspectRatio: `${CARD_W}/${CARD_H}`,
                  border: "2px solid #e5e5e5",
                  fontFamily: "'Times New Roman', Georgia, serif",
                }}
              >
                {/* Inner border */}
                <div className="absolute inset-2 border border-black pointer-events-none z-10" />

                {/* Stars */}
                {[
                  { top: "6%", left: "6%", size: 14 },
                  { top: "3%", left: "9%", size: 9 },
                  { top: "6%", right: "6%", size: 14 },
                  { top: "3%", right: "9%", size: 9 },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="absolute text-black select-none"
                    style={{ ...s, fontSize: s.size, lineHeight: 1 }}
                  >
                    ✦
                  </div>
                ))}

                <div className="absolute inset-0 flex flex-col items-center">
                  {/* Header */}
                  <div className="text-center mt-5 mb-1 px-4">
                    <h2
                      className="font-black text-black leading-none tracking-tight"
                      style={{ fontSize: "clamp(18px, 4.5vw, 38px)" }}
                    >
                      LOYALTY CARD
                    </h2>
                    <div
                      className="w-36 mx-auto my-1"
                      style={{ height: 1, backgroundColor: "#000" }}
                    />
                    <p
                      className="text-gray-500 italic"
                      style={{ fontSize: "clamp(7px, 1.1vw, 11px)" }}
                    >
                      loyalty card bisa digunakan jika fotoan kembali dengan :
                    </p>
                    <p
                      className="font-bold text-black"
                      style={{ fontSize: "clamp(8px, 1.3vw, 13px)" }}
                    >
                      {names || "Nama Member"}
                    </p>
                  </div>

                  {/* Circles */}
                  <div className="grid grid-cols-3 gap-x-3 gap-y-1 flex-1 items-center w-full px-6">
                    {REWARDS.map((reward) => {
                      const isChecked = checkedRewards.includes(reward.id);
                      const isFinal = !!reward.isFinal;
                      const sz = "clamp(52px, 9vw, 80px)";

                      return (
                        <div key={reward.id} className="flex justify-center">
                          <div
                            className="relative flex items-center justify-center rounded-full"
                            style={{
                              width: sz,
                              height: sz,
                              backgroundColor: isChecked ? "#f8f8f8" : "#fff",
                              border: `${isFinal ? 2.5 : 1.5}px solid #000`,
                              boxShadow: isFinal
                                ? "0 0 0 3px #fff, 0 0 0 5px #000, 0 0 0 8px #fff, 0 0 0 9.5px #000"
                                : "0 0 0 3px #fff, 0 0 0 4.5px #000",
                            }}
                          >
                            {/* Teks reward selalu tampil */}
                            <div className="text-center px-1">
                              {reward.label.split("\n").map((line, li) => (
                                <div
                                  key={li}
                                  className={`leading-tight text-black ${isFinal ? "font-bold" : ""}`}
                                  style={{
                                    fontSize: "clamp(5px, 0.8vw, 8px)",
                                    letterSpacing: "0.04em",
                                  }}
                                >
                                  {line.toUpperCase()}
                                </div>
                              ))}
                            </div>

                            {/* Overlay checklist di atas teks */}
                            {isChecked && (
                              <div
                                className="absolute inset-0 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: "rgba(0,0,0,0.18)" }}
                              >
                                <Check
                                  strokeWidth={3.5}
                                  className="text-black"
                                  style={{ width: "40%", height: "40%" }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div
                    className="w-full text-center py-2 px-4"
                    style={{ borderTop: "1px solid #e5e5e5" }}
                  >
                    <p
                      className="font-black text-black"
                      style={{ fontSize: "clamp(9px, 1.6vw, 15px)" }}
                    >
                      IGNOS STUDIO
                    </p>
                    <p
                      className="text-gray-500"
                      style={{
                        fontSize: "clamp(5px, 0.8vw, 8px)",
                        fontFamily: "Arial, sans-serif",
                      }}
                    >
                      instagram : @ignos.studio | tiktok : @ignosstudio |
                      website : ignosstudio.com
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-400 mt-2 text-center">
                Toggle reward di panel kiri untuk update preview
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
