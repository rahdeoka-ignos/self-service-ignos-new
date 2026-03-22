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
  fields?: {
    name: string;
    dob: string;
    age: string;
    address: string;
    date: string;
  };
}

// ID Card dimensions @ 300 DPI
// Standard ID card: 85.6mm × 54mm
// ID Card Landscape: 8.5cm × 5.3cm @ 300 DPI
const ID_CARD_LANDSCAPE_W = Math.round((8.5 / 2.54) * 300); // ~1004px
const ID_CARD_LANDSCAPE_H = Math.round((5.3 / 2.54) * 300); // ~626px
const ID_CARD_PORTRAIT_W = ID_CARD_LANDSCAPE_H; // ~626px
const ID_CARD_PORTRAIT_H = ID_CARD_LANDSCAPE_W; // ~1004px

// Ganti seluruh isi generatePrintIdCard dengan ini:

export async function generatePrintIdCard(
  photoUrl: string,
  options: PrintIdCardOptions = {},
): Promise<string | void> {
  const transform = options.transform || { scale: 1, x: 0, y: 0 };
  const orientation = options.orientation || "landscape";
  const cardId = options.cardId || "landscape-full";

  const W =
    orientation === "portrait" ? ID_CARD_PORTRAIT_W : ID_CARD_LANDSCAPE_W;
  const H =
    orientation === "portrait" ? ID_CARD_PORTRAIT_H : ID_CARD_LANDSCAPE_H;

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // ─────────────────────────────────────────
  // LANDSCAPE BLUE — foto di dalam kotak
  // ─────────────────────────────────────────
  if (cardId === "landscape-blue") {
    // 1. Draw background
    const bg = await loadImage("/addons/idcard/background-blue.png");
    ctx.drawImage(bg, 0, 0, W, H);

    // 2. Koordinat foto slot (dari Figma, relatif ke canvas 1004×626)
    // Input design: 1004×626, koordinat: x=80, y=155, w=285, h=378, r=40
    const slotX = 80;
    const slotY = 155;
    const slotW = 285;
    const slotH = 378;
    const radius = 40;

    // 3. Draw foto dengan clip rounded rect
    const img = await loadImage(photoUrl);
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

    const ratioX = options.uiSlotW ? slotW / options.uiSlotW : 1;
    const ratioY = options.uiSlotH ? slotH / options.uiSlotH : 1;

    const scaledW = drawW * transform.scale;
    const scaledH = drawH * transform.scale;

    const drawX = slotX + (slotW - scaledW) / 2 + transform.x * ratioX;
    const drawY = slotY + (slotH - scaledH) / 2 + transform.y * ratioY;

    // Clip rounded rect
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(slotX + radius, slotY);
    ctx.lineTo(slotX + slotW - radius, slotY);
    ctx.quadraticCurveTo(slotX + slotW, slotY, slotX + slotW, slotY + radius);
    ctx.lineTo(slotX + slotW, slotY + slotH - radius);
    ctx.quadraticCurveTo(
      slotX + slotW,
      slotY + slotH,
      slotX + slotW - radius,
      slotY + slotH,
    );
    ctx.lineTo(slotX + radius, slotY + slotH);
    ctx.quadraticCurveTo(slotX, slotY + slotH, slotX, slotY + slotH - radius);
    ctx.lineTo(slotX, slotY + radius);
    ctx.quadraticCurveTo(slotX, slotY, slotX + radius, slotY);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, scaledW, scaledH);
    ctx.restore();
    // Render teks fields di atas canvas
    const fields = options.fields ?? {
      name: "",
      dob: "",
      age: "",
      address: "",
      date: "",
    };

    const textItems = [
      { label: fields.name, y: 195 },
      { label: fields.dob, y: 272 },
      { label: fields.age, y: 340 },
      { label: fields.address, y: 415 },
      { label: fields.date, y: 490 },
    ];

    ctx.fillStyle = "#1a1aff"; // warna biru sesuai design
    ctx.font = "bold 38px Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const textStartX = 400; // mulai dari kanan kotak foto
    const textMaxW = 540; // max width teks

    for (const item of textItems) {
      if (item.label) {
        ctx.fillText(item.label, textStartX, item.y, textMaxW);
      }
    }
  } else {
    // ─────────────────────────────────────────
    // FULL FOTO (portrait & landscape)
    // ─────────────────────────────────────────
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, W, H);

    const img = await loadImage(photoUrl);
    const imgAspect = img.width / img.height;
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

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, W - 2, H - 2);
  }

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => {
        if (!b) reject("Failed");
        else resolve(b);
      },
      "image/png",
      1,
    ),
  );

  const url = URL.createObjectURL(blob);
  if (options.preview) return url;

  const formData = new FormData();
  formData.append("file", blob, `idcard-${cardId}-${Date.now()}.png`);
  await fetch("http://localhost:5000/api/save-print", {
    method: "POST",
    body: formData,
  });
}
