import { PRINT_PADDING, PRINT_GAP } from "../utils/printlayout";

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

  //  BACKGROUND LAYER
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

  const drawCover = (
    img: HTMLImageElement,
    slotNumber: number,
    x: number,
    y: number,
    w: number,
    h: number,
    uiSlotW?: number,
    uiSlotH?: number,
    contain?: boolean,
    uiCenterOffsetY?: number,
  ) => {
    const transform = transforms[slotNumber] || { scale: 1, x: 0, y: 0 };

    console.log(`[drawCover] slot ${slotNumber}`, {
      transform,
      uiSlotW,
      uiSlotH,
      uiCenterOffsetY,
      ratioX: uiSlotW ? w / uiSlotW : 1,
      ratioY: uiSlotH ? h / uiSlotH : 1,
    });

    const imgAspect = img.width / img.height;
    const frameAspect = w / h;

    let drawW, drawH;

    if (contain) {
      if (imgAspect > frameAspect) {
        drawW = w;
        drawH = w / imgAspect;
      } else {
        drawH = h;
        drawW = imgAspect * h;
      }
    } else {
      if (imgAspect > frameAspect) {
        drawH = h;
        drawW = imgAspect * h;
      } else {
        drawW = w;
        drawH = w / imgAspect;
      }
    }

    const ratioX = uiSlotW ? w / uiSlotW : 1;
    const ratioY = uiSlotH ? h / uiSlotH : 1;

    const uiW = uiSlotW ?? w;
    const uiH = uiSlotH ?? h;

    // ✅ centerOffsetY dari parameter, default 0
    const centerOffsetY = uiCenterOffsetY ?? 0;

    const panX = (transform.x + (uiW * (transform.scale - 1)) / 2) * ratioX;
    const panY =
      (transform.y + centerOffsetY + (uiH * (transform.scale - 1)) / 2) *
      ratioY;

    const scaledW = drawW * transform.scale;
    const scaledH = drawH * transform.scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    const cx = x + w / 2;
    const cy = y + h / 2;

    ctx.drawImage(
      img,
      cx - scaledW / 2 + panX,
      cy - scaledH / 2 + panY,
      scaledW,
      scaledH,
    );
    ctx.restore();
  };

  const padding = PRINT_PADDING;
  const gap = PRINT_GAP;

  // PHOTO SLOT LAYER

  // if (layout === "1") {
  //   const h = HEIGHT * 0.86 - padding;
  //   const w = h * (3 / 4);
  //   const x = (WIDTH - w) / 2;

  //   const uiContentH = options.uiSlotW ? options.uiSlotW * 0 : undefined;

  //   drawCover(
  //     images[0],
  //     orderedSlots[0],
  //     x,
  //     padding,
  //     w,
  //     h,
  //     options.uiSlotW,
  //     uiContentH,
  //     false,
  //   );
  // }

  if (layout === "1") {
    const h = HEIGHT * 0.86 - padding;
    const w = h * (3 / 4);
    const x = (WIDTH - w) / 2;

    // UI: paddingBottom "150%", centerOnInit=true
    // contentH = uiSlotW * 1.5, centerOffset = (contentH - slotH) / 2
    const uiContentH = options.uiSlotW ? options.uiSlotW * 1.5 : 0;
    const centerOffsetY = options.uiSlotH
      ? (uiContentH - options.uiSlotH) / 2
      : 0;

    drawCover(
      images[0],
      orderedSlots[0],
      x,
      padding,
      w,
      h,
      options.uiSlotW,
      options.uiSlotH,
      false,
      centerOffsetY, // ✅
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

  const uiSlotW = options.uiSlotW ?? 0;
  const uiSlotH = options.uiSlotH ?? 0;

  images.slice(0, 2).forEach((img, i) => {
    const slotNumber = orderedSlots[i];
    drawCover(
      img,
      slotNumber,
      x0,
      y0 + i * (slotH + gapY),
      slotW,
      slotH,
      uiSlotW,
      uiSlotH,  // ✅ actual slot height, no content tricks
      true,
      0,        // ✅ centerOffsetY = 0, tidak ada centering
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

    // UI: paddingBottom "150%", centerOnInit=true
    const uiContentH = options.uiSlotW ? options.uiSlotW * 1.5 : 0;
    const centerOffsetY = options.uiSlotH
      ? (uiContentH - options.uiSlotH) / 2
      : 0;

    images.slice(0, 4).forEach((img, i) => {
      const slotNumber = orderedSlots[i];
      const row = Math.floor(i / 2);
      const col = i % 2;
      drawCover(
        img,
        slotNumber,
        x0 + col * (slotW + gapX),
        y0 + row * (slotH + gapY),
        slotW,
        slotH,
        options.uiSlotW,
        options.uiSlotH,
        false,
        centerOffsetY, // ✅
      );
    });
  }

  if (layout === "6") {
    const w = (WIDTH - padding * 2 - gap) / 2;
    const h = (HEIGHT - padding * 2 - gap * 2) / 3;

    // UI: belum ada centerOnInit khusus → centerOffsetY = 0
    images.slice(0, 6).forEach((img, i) => {
      const row = Math.floor(i / 2);
      const col = i % 2;
      drawCover(
        img,
        i,
        padding + col * (w + gap),
        padding + row * (h + gap),
        w,
        h,
        options.uiSlotW,
        options.uiSlotH,
        false,
        0, // ✅ tidak ada center offset
      );
    });
  }

  //  FRAME OVERLAY LAYER
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

  //  PREVIEW MODE
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
