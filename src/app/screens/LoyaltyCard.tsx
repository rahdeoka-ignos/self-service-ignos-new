import { useEffect, useRef, useState } from "react";
import { Download, Check } from "lucide-react";
import { usePageTitle } from "../../hooks/usePageTitle";

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

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatId(n) {
  return "IGNOS/CUST-" + String(n).padStart(3, "0");
}

function getExpiryLabel() {
  const now = new Date();
  const exp = new Date(now.getFullYear(), now.getMonth() + 6, 1);
  return MONTHS_ID[exp.getMonth()] + " " + exp.getFullYear();
}

function draw4Star(ctx, cx, cy, size) {
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
}

function drawCardToCanvas(canvas, { counter, checkedRewards, expiry }) {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Outer border
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, CARD_W - 28, CARD_H - 28);

  // Stars
  draw4Star(ctx, 65, 48, 16);
  draw4Star(ctx, 90, 32, 10);
  draw4Star(ctx, CARD_W - 65, 48, 16);
  draw4Star(ctx, CARD_W - 90, 32, 10);

  // Title
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

  // Subtitle with expiry
  ctx.fillStyle = "#555";
  ctx.font = "italic 21px 'Times New Roman', Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "loyalty card hanya berlaku sampai bulan : " + expiry,
    CARD_W / 2,
    148,
  );

  // Member ID
  ctx.fillStyle = "#000";
  ctx.font = "bold 26px 'Times New Roman', Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(formatId(counter), CARD_W / 2, 180);

  // Circles
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

    // Circle fill if checked
    if (isChecked) {
      ctx.fillStyle = "#f8f8f8";
      ctx.beginPath();
      ctx.arc(cx, cy, circleR - 1, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isFinal) {
      // Triple ring
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

    // Label text
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

    // Overlay + checkmark if checked
    if (isChecked) {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.arc(cx, cy, circleR - 1, 0, Math.PI * 2);
      ctx.fill();

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

  // Footer
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
}

export function LoyaltyCard() {
  usePageTitle("Kartu Loyalty");
  const [counter, setCounter] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [checkedRewards, setCheckedRewards] = useState([1]);
  const previewRef = useRef(null);

  // Load counter from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("ignos_card_counter");
    if (saved) setCounter(parseInt(saved) || 1);
  }, []);

  // Re-render preview whenever counter or checkedRewards changes
  useEffect(() => {
    if (!previewRef.current) return;
    drawCardToCanvas(previewRef.current, {
      counter,
      checkedRewards,
      expiry: getExpiryLabel(),
    });
  }, [counter, checkedRewards]);

  const toggleReward = (id) => {
    if (id === 1) return;
    setCheckedRewards((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const expiry = getExpiryLabel(); // capture at click time
      const currentId = formatId(counter);

      const canvas = document.createElement("canvas");
      drawCardToCanvas(canvas, { counter, checkedRewards, expiry });

      const link = document.createElement("a");
      link.download = `loyalty-card-${currentId.replace(/\//g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      // Increment counter and persist
      const next = counter + 1;
      setCounter(next);
      localStorage.setItem("ignos_card_counter", String(next));
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
            Generator kartu member Ignos Studio
          </p>
        </div>

        <div className="grid grid-cols-5 gap-8">
          {/* LEFT PANEL */}
          <div className="col-span-2 space-y-5">
            <div className="bg-white border-4 border-black rounded-2xl p-7 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-2xl font-bold mb-5">Detail Member</h2>

              {/* ID Display */}
              <div className="mb-5">
                <label className="block text-base font-bold mb-2 text-gray-700">
                  ID Member
                </label>
                <div className="w-full border-4 border-black rounded-xl px-4 py-3 text-center bg-gray-50">
                  <span className="text-2xl font-bold tracking-widest font-mono">
                    {formatId(counter)}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  ID otomatis naik setiap kali download
                </p>
              </div>

              {/* Reward Toggles */}
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

              {/* Download Button */}
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full text-lg font-bold border-4 border-black px-6 py-4 bg-black text-white hover:bg-white hover:text-black transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download size={20} strokeWidth={2.5} />
                {downloading ? "Membuat..." : "Download PNG"}
              </button>
            </div>
          </div>

          {/* RIGHT PANEL - Preview */}
          <div className="col-span-3">
            <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h2 className="text-xl font-bold mb-4">Preview Kartu</h2>
              <div
                className="relative w-full bg-white overflow-hidden"
                style={{
                  aspectRatio: `${CARD_W}/${CARD_H}`,
                  border: "2px solid #e5e5e5",
                }}
              >
                <canvas
                  ref={previewRef}
                  style={{ display: "block", width: "100%", height: "100%" }}
                />
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
