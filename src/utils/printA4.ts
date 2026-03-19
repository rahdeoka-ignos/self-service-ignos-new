type SlotTransform = {
  scale: number;
  x: number;
  y: number;
};

interface PrintA4Options {
  preview?: boolean;
  transform?: SlotTransform;
  uiSlotW?: number;
  uiSlotH?: number;
  filter?: string;
}

// A4 at 300 DPI: 2480 x 3508 px
const WIDTH = 2480;
const HEIGHT = 3508;

export async function generatePrintA4(
  photoUrl: string,
  options: PrintA4Options = {},
): Promise<string | void> {
  const transform = options.transform || { scale: 1, x: 0, y: 0 };

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

  // Background putih
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const img = await loadImage(photoUrl);

  const slotX = 0;
  const slotY = 0;
  const slotW = WIDTH;
  const slotH = HEIGHT;

  const imgAspect = img.width / img.height;
  const frameAspect = slotW / slotH;

  let drawW: number, drawH: number;
  if (imgAspect > frameAspect) {
    drawH = slotH;
    drawW = imgAspect * slotH;
  } else {
    drawW = slotW;
    drawH = slotW / imgAspect;
  }

  const scaledW = drawW * transform.scale;
  const scaledH = drawH * transform.scale;

  const ratioX = options.uiSlotW ? slotW / options.uiSlotW : 1;
  const ratioY = options.uiSlotH ? slotH / options.uiSlotH : 1;

  const drawX = slotX + (slotW - scaledW) / 2 + transform.x * ratioX;
  const drawY = slotY + (slotH - scaledH) / 2 + transform.y * ratioY;

  ctx.save();
  ctx.beginPath();
  ctx.rect(slotX, slotY, slotW, slotH);
  ctx.clip();
  ctx.filter = options.filter || "none";
  ctx.drawImage(img, drawX, drawY, scaledW, scaledH);
  ctx.filter = "none";
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

  if (options.preview) {
    return url;
  }

  const formData = new FormData();
  formData.append("file", blob, `print-a4-${Date.now()}.png`);

  await fetch("http://localhost:5000/api/save-print", {
    method: "POST",
    body: formData,
  });
}
