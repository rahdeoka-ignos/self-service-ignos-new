type SlotTransform = {
  scale: number;
  x: number;
  y: number;
};

interface PrintKeychainOptions {
  preview?: boolean;
  transform?: SlotTransform;
  uiSlotW?: number;
  uiSlotH?: number;
  keychainType?: string;
}

// ─────────────────────────────────────────
// Kotak Plastik: 2.68cm x 4.33cm @ 600 DPI
// ─────────────────────────────────────────
const KOTAK_PLASTIK_W = 633; // 2.68cm × 236dpi
const KOTAK_PLASTIK_H = 1023; // 4.33cm × 236dpi

// ─────────────────────────────────────────
// Default keychain: square 1000x1000px
// ─────────────────────────────────────────
const DEFAULT_SIZE = 1000;

export async function generatePrintKeychain(
  photoUrl: string,
  options: PrintKeychainOptions = {},
): Promise<string | void> {
  const transform = options.transform || { scale: 1, x: 0, y: 0 };
  const keychainType = options.keychainType || "default";

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

  // ─────────────────────────────────────────
  // KOTAK PLASTIK layout
  // ─────────────────────────────────────────
  if (keychainType === "kotak-plastik") {
    const W = KOTAK_PLASTIK_W;
    const H = KOTAK_PLASTIK_H;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Background putih
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, W, H);

    // Border tipis
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // Area foto: atas, sisakan bawah untuk teks
    // Teks area = ~15% dari total tinggi
    const textAreaH = Math.round(H * 0.15);
    const photoAreaH = H - textAreaH;
    const photoAreaW = W;

    // Draw foto (object-cover di photo area)
    const img = await loadImage(photoUrl);
    const imgAspect = img.width / img.height;
    const frameAspect = photoAreaW / photoAreaH;

    let drawW: number, drawH: number;
    if (imgAspect > frameAspect) {
      drawH = photoAreaH;
      drawW = imgAspect * photoAreaH;
    } else {
      drawW = photoAreaW;
      drawH = photoAreaW / imgAspect;
    }

    const ratioX = options.uiSlotW ? photoAreaW / options.uiSlotW : 1;
    const ratioY = options.uiSlotH ? photoAreaH / options.uiSlotH : 1;

    const scaledW = drawW * transform.scale;
    const scaledH = drawH * transform.scale;

    const drawX = (photoAreaW - scaledW) / 2 + transform.x * ratioX;
    const drawY = (photoAreaH - scaledH) / 2 + transform.y * ratioY;

    // Clip ke area foto
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, photoAreaW, photoAreaH);
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, scaledW, scaledH);
    ctx.restore();

    // Garis pemisah antara foto dan teks
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, photoAreaH);
    ctx.lineTo(W, photoAreaH);
    ctx.stroke();

    // Teks "IGNOS STUDIO"
    const fontSize = Math.round(textAreaH * 0.45);
    ctx.fillStyle = "#000000";
    ctx.font = `900 ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("IGNOS STUDIO", W / 2, photoAreaH + textAreaH / 2);

    // Export
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => {
          if (!b) reject("Failed to generate image");
          else resolve(b);
        },
        "image/png",
        1,
      ),
    );

    const url = URL.createObjectURL(blob);
    if (options.preview) return url;

    const formData = new FormData();
    formData.append("file", blob, `keychain-kotak-plastik-${Date.now()}.png`);
    await fetch("http://localhost:5000/api/save-print", {
      method: "POST",
      body: formData,
    });
    return;
  }

  // ─────────────────────────────────────────
  // DEFAULT layout (kotak-metal, oval-metal, love-metal)
  // Square 1000x1000px
  // ─────────────────────────────────────────
  const SIZE = DEFAULT_SIZE;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, SIZE, SIZE);

  const img = await loadImage(photoUrl);
  const imgAspect = img.width / img.height;

  let drawW: number, drawH: number;
  if (imgAspect > 1) {
    drawH = SIZE;
    drawW = imgAspect * SIZE;
  } else {
    drawW = SIZE;
    drawH = SIZE / imgAspect;
  }

  const scaledW = drawW * transform.scale;
  const scaledH = drawH * transform.scale;

  const ratioX = options.uiSlotW ? SIZE / options.uiSlotW : 1;
  const ratioY = options.uiSlotH ? SIZE / options.uiSlotH : 1;

  const drawX = (SIZE - scaledW) / 2 + transform.x * ratioX;
  const drawY = (SIZE - scaledH) / 2 + transform.y * ratioY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, SIZE, SIZE);
  ctx.clip();
  ctx.drawImage(img, drawX, drawY, scaledW, scaledH);
  ctx.restore();

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => {
        if (!b) reject("Failed to generate image");
        else resolve(b);
      },
      "image/png",
      1,
    ),
  );

  const url = URL.createObjectURL(blob);
  if (options.preview) return url;

  const formData = new FormData();
  formData.append("file", blob, `keychain-${keychainType}-${Date.now()}.png`);
  await fetch("http://localhost:5000/api/save-print", {
    method: "POST",
    body: formData,
  });
}
