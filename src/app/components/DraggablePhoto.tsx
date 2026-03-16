import { useState, useRef, useCallback } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface Props {
  src: string;
  slotNum: number;
  templateIndex: number;
  offsetY: number;
  onOffsetChange: (offsetY: number) => void;
}

export function DraggablePhoto({ src, offsetY, onOffsetChange }: Props) {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startOffset = useRef(offsetY);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startY.current = e.clientY;
      startOffset.current = offsetY;

      const onMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = e.clientY - startY.current;
        onOffsetChange(startOffset.current + delta);
      };
      const onUp = () => {
        isDragging.current = false;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [offsetY, onOffsetChange],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      isDragging.current = true;
      startY.current = touch.clientY;
      startOffset.current = offsetY;

      const onMove = (e: TouchEvent) => {
        if (!isDragging.current) return;
        const delta = e.touches[0].clientY - startY.current;
        onOffsetChange(startOffset.current + delta);
      };
      const onEnd = () => {
        isDragging.current = false;
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };
      window.addEventListener("touchmove", onMove, { passive: true });
      window.addEventListener("touchend", onEnd);
    },
    [offsetY, onOffsetChange],
  );

  return (
    <div
      className="absolute inset-0 cursor-grab active:cursor-grabbing select-none"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      <ImageWithFallback
        src={src}
        alt="slot photo"
        draggable={false}
        className="absolute left-0 right-0 w-full pointer-events-none select-none"
        style={{
          top: `calc(50% + ${offsetY}px)`,
          transform: "translateY(-50%)",
          height: "auto",
        }}
      />
    </div>
  );
}