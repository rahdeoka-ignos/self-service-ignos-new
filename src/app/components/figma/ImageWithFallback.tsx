import React, { useState, useEffect, useRef } from "react";

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==";

export function ImageWithFallback(
  props: React.ImgHTMLAttributes<HTMLImageElement>,
) {
  const [didError, setDidError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  const maxRetries = 10; // Try for up to 20 seconds (10 * 2000ms)

  // Reset loading and error states when src changes
  useEffect(() => {
    setIsLoading(true);
    setDidError(false);
    setRetryCount(0);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [props.src]);

  const handleError = () => {
    if (retryCount < maxRetries) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setRetryCount((prev) => prev + 1);
      }, 2000);
    } else {
      setDidError(true);
      setIsLoading(false);
    }
  };

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLoading(false);
    setDidError(false);
    if (props.onLoad) {
      props.onLoad(e);
    }
  };

  const { src, alt, style, className, ...rest } = props;

  const isDataUrl = src?.startsWith("data:");
  const finalSrc = src && retryCount > 0 && !isDataUrl ? `${src}?retry=${retryCount}` : src;

  if (didError) {
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ""}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img
            src={ERROR_IMG_SRC}
            alt="Error loading image"
            {...rest}
            data-original-url={src}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center z-10 rounded-xl">
          <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={finalSrc}
        alt={alt}
        className={`${className ?? ""} transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        style={style}
        {...rest}
        onLoad={handleLoad}
        onError={handleError}
      />
    </>
  );
}

