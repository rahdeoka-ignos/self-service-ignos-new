export interface Photo {
  thumb: string;
  full: string;
}

const loadedThumbnails = new Set<string>();
const loadingThumbnails = new Set<string>();
const failedThumbnails = new Set<string>();

export interface PreloadProgress {
  loaded: number;
  total: number;
  isDone: boolean;
}

type ProgressCallback = (progress: PreloadProgress) => void;
const listeners = new Set<ProgressCallback>();

let lastProgress: PreloadProgress = { loaded: 0, total: 0, isDone: false };

export function subscribeToProgress(callback: ProgressCallback) {
  listeners.add(callback);
  callback(lastProgress);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners(total: number) {
  const loadedCount = Array.from(loadingThumbnails).filter((url) => loadedThumbnails.has(url)).length;
  const failedCount = Array.from(loadingThumbnails).filter((url) => failedThumbnails.has(url)).length;
  const processed = loadedCount + failedCount;
  const isDone = processed >= total && total > 0;

  lastProgress = { loaded: loadedCount, total, isDone };
  listeners.forEach((cb) => cb(lastProgress));
}

export function getLoadedCount(): number {
  return loadedThumbnails.size;
}

export function isPhotoLoaded(thumbUrl: string): boolean {
  return loadedThumbnails.has(thumbUrl);
}

export function preloadPhoto(photo: Photo, totalCount: number): Promise<void> {
  const url = photo.thumb;
  if (loadedThumbnails.has(url) || failedThumbnails.has(url)) {
    return Promise.resolve();
  }

  if (loadingThumbnails.has(url)) {
    // If it's already loading, resolve once it's done or on timeout
    return new Promise((resolve) => {
      let elapsed = 0;
      const checkInterval = setInterval(() => {
        elapsed += 100;
        if (loadedThumbnails.has(url) || failedThumbnails.has(url) || elapsed > 10000) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  loadingThumbnails.add(url);

  return new Promise((resolve) => {
    const img = new Image();
    
    // Safety timeout of 10 seconds
    const timeoutId = setTimeout(() => {
      failedThumbnails.add(url);
      notifyListeners(totalCount);
      resolve();
    }, 10000);

    img.onload = () => {
      clearTimeout(timeoutId);
      loadedThumbnails.add(url);
      notifyListeners(totalCount);
      resolve();
    };
    img.onerror = () => {
      clearTimeout(timeoutId);
      failedThumbnails.add(url);
      notifyListeners(totalCount);
      resolve();
    };
    img.src = url;
  });
}

let isPreloading = false;

export async function preloadGallery(limit = 200) {
  if (isPreloading) return;
  isPreloading = true;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch("http://localhost:5000/api/photos", { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const data = await res.json();
    const photos: Photo[] = data.reverse().slice(0, limit);
    try {
      sessionStorage.setItem("gallery", JSON.stringify(photos));
    } catch (err) {
      console.warn("Storage quota exceeded, skipping preloaded gallery cache update:", err);
    }

    notifyListeners(photos.length);

    // Preload in batches of 10
    const batchSize = 10;
    for (let i = 0; i < photos.length; i += batchSize) {
      const batch = photos.slice(i, i + batchSize);
      await Promise.all(batch.map((p) => preloadPhoto(p, photos.length)));
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("Failed to preload gallery:", err);
  } finally {
    isPreloading = false;
  }
}
