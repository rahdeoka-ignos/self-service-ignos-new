import { useEffect, useState } from "react";
import { AdminConfirmModal } from "./AdminConfirmModal";

export function PrintErrorModal() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    const receive = (event: Event) => setMessage((event as CustomEvent<string>).detail);
    window.addEventListener("ignos-print-error", receive);
    return () => window.removeEventListener("ignos-print-error", receive);
  }, []);
  return <AdminConfirmModal isOpen={!!message} onClose={() => setMessage("")}
    title="Cetakan belum berhasil dikirim" description={message} singleButton variant="warning" />;
}
