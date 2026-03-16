import { useRef, useCallback } from "react";

export function useDraggableSlot(
  onOffsetChange: (offsetY: number) => void,
  initialOffsetY = 0,
) {
  const isDragging = useRef(false);
  const startY = useRef(0);
  const currentOffsetY = useRef(initialOffsetY);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY - currentOffsetY.current;

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newOffset = e.clientY - startY.current;
      currentOffsetY.current = newOffset;
      onOffsetChange(newOffset);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [onOffsetChange]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    isDragging.current = true;
    startY.current = touch.clientY - currentOffsetY.current;

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      const touch = e.touches[0];
      const newOffset = touch.clientY - startY.current;
      currentOffsetY.current = newOffset;
      onOffsetChange(newOffset);
    };

    const onTouchEnd = () => {
      isDragging.current = false;
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };

    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
  }, [onOffsetChange]);

  return { onMouseDown, onTouchStart };
}