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
    // If it's already loading, resolve once it's done
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (loadedThumbnails.has(url) || failedThumbnails.has(url)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  loadingThumbnails.add(url);

  return new Promise((resolve) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      loadedThumbnails.add(url);
      notifyListeners(totalCount);
      resolve();
    };
    img.onerror = () => {
      failedThumbnails.add(url);
      notifyListeners(totalCount);
      resolve();
    };
  });
}

let isPreloading = false;

export async function preloadGallery(limit = 200) {
  if (isPreloading) return;
  isPreloading = true;

  try {
    const res = await fetch("http://localhost:5000/api/photos");
    const data = await res.json();
    const photos: Photo[] = data.reverse().slice(0, limit);
    sessionStorage.setItem("gallery", JSON.stringify(photos));

    notifyListeners(photos.length);

    // Preload in batches of 10
    const batchSize = 10;
    for (let i = 0; i < photos.length; i += batchSize) {
      const batch = photos.slice(i, i + batchSize);
      await Promise.all(batch.map((p) => preloadPhoto(p, photos.length)));
    }
  } catch (err) {
    console.error("Failed to preload gallery:", err);
  } finally {
    isPreloading = false;
  }
}
