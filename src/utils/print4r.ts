type Slots = { [key: number]: string };

type SlotTransform = {
  scale: number;
  x: number;
  y: number;
};

interface PrintOptions {
  layout?: "1" | "2" | "4" | "6";
  background?: string;
  frameOverlay?: string;
  watermark?: string;
  preview?: boolean;
  transforms?: { [slotNumber: number]: SlotTransform };
  uiSlotW?: number;
  uiSlotH?: number;
  filter?: string;
}

export async function generatePrint(
  slots: Slots,
  options: PrintOptions = {},
): Promise<string | void> {
  const layout = options.layout || "4";
  const transforms = options.transforms || {};

  const WIDTH = 2400;
  const HEIGHT = 3600;

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

  // BACKGROUND LAYER
  if (options.background) {
    const bg = await loadImage(options.background);
    ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
  } else {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  const orderedSlots = Object.keys(slots)
    .map(Number)
    .sort((a, b) => a - b);

  const images = await Promise.all(
    orderedSlots.map((slot) => loadImage(slots[slot])),
  );

  // ─────────────────────────────────────────────
  // drawCover: mereplikasi SlotImage behavior
  //
  // SlotImage pakai:
  //   - object-cover  → foto fill slot, center secara default
  //   - transform-origin: center center
  //   - transform: translate(x, y) scale(scale)
  //
  // Maka di canvas:
  //   drawX = slotX + (slotW - scaledW) / 2 + transform.x * ratioX
  //   drawY = slotY + (slotH - scaledH) / 2 + transform.y * ratioY
  // ─────────────────────────────────────────────
  const drawCover = (
    img: HTMLImageElement,
    slotNumber: number,
    x: number,
    y: number,
    w: number,
    h: number,
    uiSlotW?: number,
    uiSlotH?: number,
  ) => {
    const transform = transforms[slotNumber] || { scale: 1, x: 0, y: 0 };

    const ratioX = uiSlotW ? w / uiSlotW : 1;
    const ratioY = uiSlotH ? h / uiSlotH : 1;

    const imgAspect = img.width / img.height;
    const frameAspect = w / h;

    // object-cover: sama persis dengan CSS object-cover
    let drawW: number, drawH: number;
    if (imgAspect > frameAspect) {
      // foto lebih lebar → fit height, crop kiri-kanan
      drawH = h;
      drawW = imgAspect * h;
    } else {
      // foto lebih tinggi → fit width, crop atas-bawah
      drawW = w;
      drawH = w / imgAspect;
    }

    const scaledW = drawW * transform.scale;
    const scaledH = drawH * transform.scale;

    // transform-origin: center center
    // posisi default (scale=1, x=0, y=0) = foto di-center dalam slot
    const drawX = x + (w - scaledW) / 2 + transform.x * ratioX;
    const drawY = y + (h - scaledH) / 2 + transform.y * ratioY;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.filter = options.filter || "none"; // ← tambah ini
    ctx.drawImage(img, drawX, drawY, scaledW, scaledH);
    ctx.filter = "none"; // ← reset setelah draw
    ctx.restore();
  };

  // ─────────────────────────────────────────────
  // PHOTO SLOT LAYER
  // Semua dimensi mengacu pada template canvas 1066x1600
  // yang di-scale ke canvas 2400x3600
  // ─────────────────────────────────────────────

  if (layout === "1") {
    const scaleX = WIDTH / 1066;
    const scaleY = HEIGHT / 1600;
    const slotW = 994 * scaleX;
    const slotH = 1320 * scaleY;
    const x = (WIDTH - slotW) / 2;
    const y = 41 * scaleY;

    drawCover(
      images[0],
      orderedSlots[0],
      x,
      y,
      slotW,
      slotH,
      options.uiSlotW,
      options.uiSlotH,
    );
  }

  if (layout === "2") {
    const scaleX = WIDTH / 1066;
    const scaleY = HEIGHT / 1600;
    const x0 = 36 * scaleX;
    const y0 = 41 * scaleY;
    const slotW = 994 * scaleX;
    const slotH = 652 * scaleY;
    const gapY = 26 * scaleY;

    orderedSlots.slice(0, 2).forEach((slotNumber, i) => {
      drawCover(
        images[i],
        slotNumber,
        x0,
        y0 + i * (slotH + gapY),
        slotW,
        slotH,
        options.uiSlotW,
        options.uiSlotH,
      );
    });
  }

  if (layout === "4") {
    const scaleX = WIDTH / 1066;
    const scaleY = HEIGHT / 1600;
    const x0 = 36 * scaleX;
    const y0 = 41 * scaleY;
    const slotW = 484 * scaleX;
    const slotH = 652 * scaleY;
    const gapX = 26 * scaleX;
    const gapY = 26 * scaleY;

    orderedSlots.slice(0, 4).forEach((slotNumber, i) => {
      const row = Math.floor((slotNumber - 1) / 2);
      const col = (slotNumber - 1) % 2;

      drawCover(
        images[i],
        slotNumber,
        x0 + col * (slotW + gapX),
        y0 + row * (slotH + gapY),
        slotW,
        slotH,
        options.uiSlotW,
        options.uiSlotH,
      );
    });
  }

  if (layout === "6") {
    const scaleX = WIDTH / 1066;
    const scaleY = HEIGHT / 1600;
    const x0 = 36 * scaleX;
    const y0 = 41 * scaleY;
    const slotW = 317 * scaleX;
    const slotH = 430 * scaleY;
    const gapX = 26 * scaleX;
    const gapY = 26 * scaleY;

    orderedSlots.slice(0, 6).forEach((slotNumber, i) => {
      const row = Math.floor((slotNumber - 1) / 3);
      const col = (slotNumber - 1) % 3;

      drawCover(
        images[i],
        slotNumber,
        x0 + col * (slotW + gapX),
        y0 + row * (slotH + gapY),
        slotW,
        slotH,
        options.uiSlotW,
        options.uiSlotH,
      );
    });
  }

  // FRAME OVERLAY LAYER
  if (options.frameOverlay) {
    const overlay = await loadImage(options.frameOverlay);
    ctx.drawImage(overlay, 0, 0, WIDTH, HEIGHT);
  }

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

  // PREVIEW MODE
  if (options.preview) {
    return url;
  }

  const formData = new FormData();
  formData.append("file", blob, `print-${Date.now()}.png`);

  await fetch("http://localhost:5000/api/save-print", {
    method: "POST",
    body: formData,
  });
}
