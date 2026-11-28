// One way to tell the user what happened, on every page.
//
//   notify.success("Profil printer tersimpan");
//   notify.error("Gagal menyimpan", err);              // Error objects become their message
//   notify.warning("Nama pelanggan wajib diisi", "Isi nama sebelum menerbitkan e-receipt.");
//   const id = notify.loading("Mengunggah antrean...");
//   notify.success("Antrean terunggah", undefined, { id });   // replaces the loading toast
//
// Toasts are for results and short warnings. Decisions ("Hapus sesi?") stay in AdminConfirmModal.
import { toast } from "sonner";

export type NotifyVariant = "success" | "error" | "danger" | "warning" | "info";
type Detail = string | Error | unknown;
type Options = { id?: string | number; duration?: number };

// Errors stay longer so they can be read; success disappears quickly.
const DURATION: Record<"success" | "info" | "warning" | "error", number> = {
  success: 4000,
  info: 5000,
  warning: 6500,
  error: 8000,
};

export function errorMessage(detail: Detail): string | undefined {
  if (detail === undefined || detail === null || detail === "") return undefined;
  if (detail instanceof Error) return detail.message;
  if (typeof detail === "string") return detail;
  return String(detail);
}

function show(kind: keyof typeof DURATION, title: string, detail?: Detail, options: Options = {}) {
  return toast[kind](title, {
    id: options.id,
    description: errorMessage(detail),
    duration: options.duration ?? DURATION[kind],
  });
}

export const notify = {
  success: (title: string, detail?: Detail, options?: Options) => show("success", title, detail, options),
  error: (title: string, detail?: Detail, options?: Options) => show("error", title, detail, options),
  warning: (title: string, detail?: Detail, options?: Options) => show("warning", title, detail, options),
  info: (title: string, detail?: Detail, options?: Options) => show("info", title, detail, options),
  /** Shows a spinner until replaced (pass its id to success/error) or dismissed. */
  loading: (title: string, detail?: Detail) => toast.loading(title, { description: errorMessage(detail) }),
  /** For code that still speaks in modal variants ("danger" = error). */
  show: (variant: NotifyVariant, title: string, detail?: Detail, options?: Options) =>
    show(variant === "danger" ? "error" : variant, title, detail, options),
  dismiss: (id?: string | number) => toast.dismiss(id),
};
