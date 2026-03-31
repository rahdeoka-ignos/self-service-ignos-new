import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "session_timer_end"; // timestamp kapan timer habis

export function useCountdownTimer(initialSeconds: number) {
  const getTimeLeft = () => {
    const endTime = sessionStorage.getItem(STORAGE_KEY);
    if (endTime) {
      const remaining = Math.round((parseInt(endTime) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return initialSeconds;
  };

  const [timeLeft, setTimeLeft] = useState(getTimeLeft);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpired, setIsExpired] = useState(() => getTimeLeft() === 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start — simpan end timestamp ke sessionStorage
  const start = useCallback(
    (seconds?: number) => {
      const existing = sessionStorage.getItem(STORAGE_KEY);
      if (!existing) {
        // Belum ada timer → buat baru
        const endTime = Date.now() + (seconds ?? initialSeconds) * 1000;
        sessionStorage.setItem(STORAGE_KEY, endTime.toString());
      }
      setIsRunning(true);
    },
    [initialSeconds],
  );

  const pause = useCallback(() => setIsRunning(false), []);

  const reset = useCallback(
    (seconds?: number) => {
      sessionStorage.removeItem(STORAGE_KEY);
      const dur = seconds ?? initialSeconds;
      setTimeLeft(dur);
      setIsRunning(false);
      setIsExpired(false);
    },
    [initialSeconds],
  );

  // Tick — hitung dari end timestamp, bukan decrement
  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current!);
      return;
    }
    intervalRef.current = setInterval(() => {
      const remaining = getTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(intervalRef.current!);
        setIsRunning(false);
        setIsExpired(true);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }, 500); // 500ms supaya lebih responsif

    return () => clearInterval(intervalRef.current!);
  }, [isRunning]);

  // Auto-resume jika sessionStorage sudah ada (pindah halaman)
  useEffect(() => {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing) {
      const remaining = Math.round((parseInt(existing) - Date.now()) / 1000);
      if (remaining > 0) {
        setTimeLeft(remaining);
        setIsRunning(true); // ← langsung resume
      } else {
        setIsExpired(true);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const minutes = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");

  return {
    timeLeft,
    minutes,
    seconds,
    isRunning,
    isExpired,
    start,
    pause,
    reset,
  };
}
