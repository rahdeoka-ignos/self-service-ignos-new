import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Copy, Check, MessageCircle, Sparkles, Camera, HardDrive } from "lucide-react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AdminLayout } from "../components/AdminLayout";

const getSapaan = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Selamat Pagi";
  if (hour >= 12 && hour < 15) return "Selamat Siang";
  if (hour >= 15 && hour < 19) return "Selamat Sore";
  return "Selamat Malam";
};

const generateMessage = (
  name: string,
  driveLink: string,
) => `Halo Kakak ${name} ${getSapaan()}✨
Berikut kami kirimkan link G-Drive softcopy foto hari ini, silahkan dicek ya kak.

${driveLink}

Jangan lupa tag kami yaa kak @ignos.studio
Kami meminta izin kedepanya jika kita posting foto kakak yaa🙏😊
Mohon segera disimpan dikarenakan link akan expired dalam waktu 7 hari
Terima kasih kak, ditunggu kedatangannya yang selanjutnya🙏😊`;

export function AdminMessagePage() {
  usePageTitle("Kirim Softcopy");
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    driveLink?: string;
    phone?: string;
  }>({});
  const [uploadStatus, setUploadStatus] = useState<{
    isUploading: boolean;
    folderName: string;
    customerName: string;
    total: number;
    uploaded: number;
    percent: number;
    currentFile: string;
  } | null>(null);

  useEffect(() => {
    const fetchStatus = () => {
      fetch("http://localhost:5000/api/gdrive-upload-status")
        .then((r) => r.json())
        .then((data) => {
          if (data && data.total > 0) {
            setUploadStatus(data);
          }
        })
        .catch(() => {});
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const [latestSession, setLatestSession] = useState<{
    customerName?: string;
    folderName?: string;
    webViewLink?: string;
  } | null>(null);

  const [clearingPhotos, setClearingPhotos] = useState(false);
  const handleClearPhotos = async () => {
    if (
      !confirm(
        "Kosongkan foto jepretan di kamera aktif untuk sesi customer baru?\n\n(Catatan: Antrian upload sesi sebelumnya yang sedang berjalan di background tetap aman & tidak akan terhapus)."
      )
    ) {
      return;
    }
    try {
      setClearingPhotos(true);
      const res = await fetch("http://localhost:5000/api/clear-photos", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert(`Berhasil! ${data.cleared} foto dibersihkan dari folder kamera.`);
      }
    } catch {
      alert("Gagal mengosongkan folder kamera.");
    } finally {
      setClearingPhotos(false);
    }
  };

  useEffect(() => {
    fetch("http://localhost:5000/api/latest-session-drive")
      .then((res) => res.json())
      .then((data) => {
        if (data?.webViewLink) {
          setLatestSession(data);
          setDriveLink((prev) => (prev ? prev : data.webViewLink));
          if (data.customerName) {
            setName((prev) => (prev ? prev : data.customerName));
          }
        }
      })
      .catch(() => {});
  }, []);

  const validate = () => {
    const newErrors: { name?: string; driveLink?: string; phone?: string } = {};
    if (!name.trim()) newErrors.name = "Nama customer tidak boleh kosong";
    if (!driveLink.trim())
      newErrors.driveLink = "Link Google Drive tidak boleh kosong";
    if (!phone.trim()) newErrors.phone = "Nomor telepon tidak boleh kosong";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = () => {
    if (!validate()) return;

    const msg = generateMessage(name.trim(), driveLink.trim());

    // 🔥 normalize unicode
    setMessage(msg.normalize("NFC"));
  };

  const handleCopy = async () => {
    if (!message) return;
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = async () => {
    if (!message || !phone) return;

    const cleanNumber = phone.replace(/^0/, "");
    const number = `62${cleanNumber}`;

    // Copy ke clipboard dulu
    await navigator.clipboard.writeText(message);

    // Buka WhatsApp tanpa ?text parameter
    window.open(`https://wa.me/${number}`, "_blank");
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-950 leading-tight">
              Kirim Softcopy
            </h1>
            <p className="text-zinc-500 text-xs md:text-sm mt-0.5">
              Generate pesan WhatsApp, monitor status Google Drive, dan kelola sesi kamera
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => navigate("/admin/storage")}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              title="Buka Manajemen Storage untuk membersihkan memori disk PC"
            >
              <HardDrive size={14} className="text-zinc-500" />
              <span>Kelola Storage PC</span>
            </button>
            <button
              onClick={handleClearPhotos}
              disabled={clearingPhotos}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Kosongkan kamera aktif tanpa mengganggu proses upload Google Drive"
            >
              <Camera size={14} className="text-zinc-500" />
              <span>{clearingPhotos ? "Mengosongkan..." : "Kosongkan Kamera (Sesi Baru)"}</span>
            </button>
          </div>
        </div>

        <div className="max-w-5xl space-y-6">
          {/* ── LIVE UPLOAD STATUS PANEL ── */}
          {uploadStatus && uploadStatus.total > 0 && (
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    {uploadStatus.isUploading && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        uploadStatus.isUploading
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    ></span>
                  </span>
                  <h3 className="text-xs font-semibold text-zinc-950">
                    {uploadStatus.isUploading
                      ? "Status Upload Google Drive (Live)"
                      : "Upload Google Drive Selesai (100%)"}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium bg-zinc-50 text-zinc-600 px-2.5 py-0.5 rounded-md border border-zinc-200">
                    📁 {uploadStatus.folderName}
                  </span>
                  <span
                    className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-md ${
                      uploadStatus.isUploading
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {uploadStatus.uploaded} / {uploadStatus.total} File (
                    {uploadStatus.percent}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden border border-zinc-200/60">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      uploadStatus.isUploading
                        ? "bg-zinc-900"
                        : "bg-emerald-600"
                    }`}
                    style={{ width: `${Math.max(uploadStatus.percent, 3)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-zinc-500 mt-1">
                  <span>
                    {uploadStatus.isUploading
                      ? `Sedang mengunggah: ${uploadStatus.currentFile || "..."}`
                      : "✓ Semua foto telah berhasil tersimpan di Google Drive!"}
                  </span>
                  <span className="font-mono">
                    {uploadStatus.uploaded} dari {uploadStatus.total} file
                    selesai
                  </span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Antrian Staging Terisolasi: File foto aman dari pembersihan kamera sesi berikutnya.
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* ── FORM ── */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 md:p-6 shadow-xs">
              <h2 className="text-sm font-semibold text-zinc-950 mb-4">
                Input Data Customer
              </h2>

              {/* Nama Customer */}
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1.5 text-zinc-700">
                  Nama Customer
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name)
                      setErrors((p) => ({ ...p, name: undefined }));
                  }}
                  placeholder="Contoh: Sari"
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-medium outline-none transition-colors ${
                    errors.name
                      ? "border-rose-400 bg-rose-50/50"
                      : "border-zinc-200 focus:border-zinc-400 bg-white"
                  }`}
                />
                {errors.name && (
                  <p className="text-rose-600 text-[11px] mt-1 font-medium">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Link Google Drive */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Link Google Drive
                  </label>
                  {latestSession?.webViewLink && (
                    <button
                      type="button"
                      onClick={() => {
                        setDriveLink(latestSession.webViewLink || "");
                        if (latestSession.customerName)
                          setName(latestSession.customerName);
                      }}
                      className="text-[11px] bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium px-2 py-0.5 rounded-md border border-zinc-200 transition-colors cursor-pointer"
                    >
                      ⚡ Sesi Terakhir (
                      {latestSession.customerName || "Tanpa Nama"})
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={driveLink}
                  onChange={(e) => {
                    setDriveLink(e.target.value);
                    if (errors.driveLink)
                      setErrors((p) => ({ ...p, driveLink: undefined }));
                  }}
                  placeholder="https://drive.google.com/..."
                  className={`w-full border rounded-lg px-3 py-2 text-xs font-medium outline-none transition-colors ${
                    errors.driveLink
                      ? "border-rose-400 bg-rose-50/50"
                      : "border-zinc-200 focus:border-zinc-400 bg-white"
                  }`}
                />
                {errors.driveLink && (
                  <p className="text-rose-600 text-[11px] mt-1 font-medium">
                    {errors.driveLink}
                  </p>
                )}
              </div>

              {/* Nomor WhatsApp */}
              <div className="mb-5">
                <label className="block text-xs font-medium mb-1.5 text-zinc-700">
                  Nomor WhatsApp Customer
                </label>
                <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden bg-white focus-within:border-zinc-400">
                  <span className="bg-zinc-50 border-r border-zinc-200 px-3 py-2 text-xs font-mono font-medium text-zinc-500 shrink-0">
                    +62
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setPhone(val);
                      if (errors.phone)
                        setErrors((p) => ({ ...p, phone: undefined }));
                    }}
                    placeholder="81234567890"
                    className={`flex-1 px-3 py-2 text-xs font-medium outline-none ${
                      errors.phone ? "bg-rose-50/50" : ""
                    }`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-rose-600 text-[11px] mt-1 font-medium">
                    {errors.phone}
                  </p>
                )}
                <p className="text-[11px] text-zinc-400 mt-1">
                  Tanpa angka 0 di depan. Contoh: 81234567890
                </p>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                className="w-full py-2.5 bg-zinc-900 text-white hover:bg-black transition-colors rounded-lg text-xs font-medium shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Generate Pesan</span>
              </button>

              {/* Action Buttons */}
              {message && (
                <div className="flex gap-2.5 mt-3 pt-3 border-t border-zinc-100">
                  <button
                    onClick={handleCopy}
                    className="flex-1 py-2 text-xs font-medium border border-zinc-200 rounded-lg bg-white text-zinc-800 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check
                          size={14}
                          strokeWidth={2.5}
                          className="text-emerald-600"
                        />
                        <span className="text-emerald-700 font-semibold">
                          Tersalin!
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} strokeWidth={2} />
                        <span>Copy Pesan</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleWhatsApp}
                    className="flex-1 py-2 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageCircle size={14} strokeWidth={2} />
                    <span>Buka WhatsApp</span>
                  </button>
                </div>
              )}
              {message && (
                <p className="text-[11px] text-zinc-500 font-medium mt-2 text-center">
                  Pesan otomatis disalin ke clipboard saat membuka WhatsApp
                </p>
              )}
            </div>

            {/* ── PREVIEW ── */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 md:p-6 shadow-xs">
              <h2 className="text-sm font-semibold text-zinc-950 mb-4">
                Preview Pesan WhatsApp
              </h2>

              {message ? (
                <div className="space-y-3">
                  {/* WhatsApp-style bubble */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
                    {/* WA header */}
                    <div className="flex items-center gap-2.5 pb-2.5 mb-2.5 border-b border-zinc-200">
                      <div className="w-7 h-7 bg-zinc-900 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-white text-[10px] font-bold">
                          IS
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-zinc-950 leading-tight">
                          Ignos Studio
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          Pesan Keluar
                        </p>
                      </div>
                    </div>

                    {/* Message bubble */}
                    <div className="bg-white border border-zinc-200/80 rounded-xl rounded-tl-none p-3.5 shadow-xs">
                      <p className="text-xs leading-relaxed whitespace-pre-line text-zinc-800 font-normal">
                        {message}
                      </p>
                      <p className="text-[10px] text-zinc-400 text-right mt-2 font-mono">
                        {new Date().toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Raw text area for easy copy */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-400 mb-1 block">
                      Teks Mentah:
                    </label>
                    <textarea
                      readOnly
                      value={message}
                      rows={6}
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-700 bg-zinc-50 resize-none outline-none leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[260px] text-zinc-400 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50 text-center p-6">
                  <MessageCircle
                    size={32}
                    strokeWidth={1.5}
                    className="mb-2 text-zinc-300"
                  />
                  <p className="font-medium text-xs text-zinc-700">
                    Pesan belum digenerate
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Lengkapi form di samping lalu klik "Generate Pesan"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
