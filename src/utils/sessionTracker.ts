const RAW_PHOTOS_KEY = "ignos_session_raw_photos";
const PRINT_FILES_KEY = "ignos_session_print_files";

export function getSessionRawPhotos(): string[] {
  try {
    const data = sessionStorage.getItem(RAW_PHOTOS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function trackRawPhotos(urls: string[]) {
  try {
    const current = getSessionRawPhotos();
    const updated = Array.from(new Set([...current, ...urls.filter(Boolean)]));
    sessionStorage.setItem(RAW_PHOTOS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Gagal menyimpan session raw photos:", err);
  }
}

export function trackRawPhoto(url: string) {
  if (url) trackRawPhotos([url]);
}

export function getSessionPrintFiles(): string[] {
  try {
    const data = sessionStorage.getItem(PRINT_FILES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function trackPrintFile(filenameOrUrl: string) {
  if (!filenameOrUrl) return;
  try {
    const current = getSessionPrintFiles();
    const updated = Array.from(new Set([...current, filenameOrUrl]));
    sessionStorage.setItem(PRINT_FILES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Gagal menyimpan session print files:", err);
  }
}

export const DRIVE_LINK_KEY = "ignos_current_drive_link";

export function clearSessionData() {
  try {
    sessionStorage.removeItem(RAW_PHOTOS_KEY);
    sessionStorage.removeItem(PRINT_FILES_KEY);
    sessionStorage.removeItem(DRIVE_LINK_KEY);
  } catch (err) {
    console.error("Gagal reset session data:", err);
  }
}
