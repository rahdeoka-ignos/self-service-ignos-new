type SlotTransform = {
  scale: number;
  x: number;
  y: number;
};

interface PrintIdCardOptions {
  preview?: boolean;
  transform?: SlotTransform;
  uiSlotW?: number;
  uiSlotH?: number;
  orientation?: "portrait" | "landscape";
  cardId?: string;
}

// ID Card dimensions @ 300 DPI
// Standard ID card: 85.6mm × 54mm
// Portrait: 85.6mm × 54mm rotated → 54mm × 85.6mm
const ID_CARD_SHORT = Math.round((54 / 25.4) * 300);   // ~638px
const ID_CARD_LONG  = Math.round((85.6 / 25.4) * 300); // ~1010px

export async function generatePrintIdCard(
  photoUrl: string,
  options: PrintIdCardOptions = {},
): Promise<string | void> {
  const transform  = options.transform  || { scale: 1, x: 0, y: 0 };
  const orientation = options.orientation || "portrait";

  const W = orientation === "portrait" ? ID_CARD_SHORT : ID_CARD_LONG;
  const H = orientation === "portrait" ? ID_CARD_LONG  : ID_CARD_SHORT;

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin   = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.src    = src;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Background putih
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, W, H);

  // Draw foto (object-cover, full area)
  const img = await loadImage(photoUrl);
  const imgAspect   = img.width / img.height;
  const frameAspect = W / H;

  let drawW: number, drawH: number;
  if (imgAspect > frameAspect) {
    drawH = H;
    drawW = imgAspect * H;
  } else {
    drawW = W;
    drawH = W / imgAspect;
  }

  const ratioX = options.uiSlotW ? W / options.uiSlotW : 1;
  const ratioY = options.uiSlotH ? H / options.uiSlotH : 1;

  const scaledW = drawW * transform.scale;
  const scaledH = drawH * transform.scale;

  const drawX = (W - scaledW) / 2 + transform.x * ratioX;
  const drawY = (H - scaledH) / 2 + transform.y * ratioY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  ctx.drawImage(img, drawX, drawY, scaledW, scaledH);
  ctx.restore();

  // Border tipis
  ctx.strokeStyle = "#000000";
  ctx.lineWidth   = 3;
  ctx.strokeRect(1, 1, W - 2, H - 2);

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
  formData.append(
    "file",
    blob,
    `idcard-${options.cardId || orientation}-${Date.now()}.png`,
  );
  await fetch("http://localhost:5000/api/save-print", {
    method: "POST",
    body: formData,
  });
}