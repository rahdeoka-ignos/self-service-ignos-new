import { useRef, useCallback, useEffect, useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface SlotImageProps {
  src: string;
  slotW: number;
  slotH: number;
  transform: { scale: number; x: number; y: number };
  onTransformChange: (t: { scale: number; x: number; y: number }) => void;
  filter?: string;
}

export function SlotImage({
  src,
  slotW,
  slotH,
  transform,
  onTransformChange,
  filter = "",
}: SlotImageProps) {
  const { scale, x, y } = transform;
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);

  // Ukuran foto setelah fit-width (object-cover behavior)
  const coverW = slotW;
  const coverH = imgSize ? (slotW / imgSize.w) * imgSize.h : slotH;

  const clamp = useCallback(
    (newScale: number, newX: number, newY: number) => {
      const scaledW = coverW * newScale;
      const scaledH = coverH * newScale;

      // Batas X: foto tidak keluar slot horizontal
      const maxX = Math.max(0, (scaledW - slotW) / 2);
      // Batas Y: foto boleh geser sampai batas foto asli (atas & bawah)
      const maxY = Math.max(0, (scaledH - slotH) / 2);

      return {
        scale: newScale,
        x: Math.min(maxX, Math.max(-maxX, newX)),
        y: Math.min(maxY, Math.max(-maxY, newY)),
      };
    },
    [coverW, coverH, slotW, slotH],
  );

  // Re-clamp saat imgSize berubah
  useEffect(() => {
    if (!imgSize) return;
    const clamped = clamp(transform.scale, transform.x, transform.y);
    onTransformChange(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSize]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newScale = Math.min(3, Math.max(1, scale + delta));
      onTransformChange(clamp(newScale, x, y));
    },
    [scale, x, y, clamp, onTransformChange],
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      onTransformChange(clamp(scale, x + dx, y + dy));
    },
    [scale, x, y, clamp, onTransformChange],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Posisi foto: center slot + pan
  // Foto di-render dengan width=slotW, height=coverH (natural ratio)
  // lalu di-translate dari center slot
  const offsetX = (slotW - coverW * scale) / 2 + x;
  const offsetY = (slotH - coverH * scale) / 2 + y;

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: "grab" }}
    >
      {/* Foto di-render dengan ukuran natural (fit width), bukan object-cover */}
      <div
        style={{
          position: "absolute",
          width: coverW * scale,
          height: coverH * scale,
          left: offsetX,
          top: offsetY,
          pointerEvents: "none",
        }}
      >
        <ImageWithFallback
          src={src}
          alt="slot"
          className="w-full h-full select-none"
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          style={{
            display: "block",
            objectFit: "fill",
            filter: filter,
          }}
        />
      </div>
    </div>
  );
}
