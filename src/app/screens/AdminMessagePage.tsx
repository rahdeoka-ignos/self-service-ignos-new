import { useState, useEffect } from "react";
import { Copy, Check, MessageCircle, Sparkles, User, Link } from "lucide-react";
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-black leading-tight">Kirim Softcopy</h1>
        <p className="text-gray-500 font-medium mt-1">Generate pesan WhatsApp untuk customer</p>
      </div>
      <div className="max-w-4xl">

        {/* ── LIVE UPLOAD STATUS PANEL ── */}
        {uploadStatus && uploadStatus.total > 0 && (
          <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4">
                  {uploadStatus.isUploading && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-4 w-4 ${uploadStatus.isUploading ? "bg-yellow-400" : "bg-green-500"}`}></span>
                </span>
                <h3 className="text-xl font-black">
                  {uploadStatus.isUploading
                    ? "Status Upload Google Drive (Live)"
                    : "Upload Google Drive Selesai 100%"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold bg-gray-100 px-3 py-1.5 rounded-full border border-black">
                  📁 {uploadStatus.folderName}
                </span>
                <span className={`text-xs font-black px-3 py-1.5 rounded-full border border-black ${uploadStatus.isUploading ? "bg-yellow-300" : "bg-green-300"}`}>
                  {uploadStatus.uploaded} / {uploadStatus.total} Foto ({uploadStatus.percent}%)
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-gray-200 h-5 rounded-full overflow-hidden border-2 border-black">
                <div
                  className={`h-full transition-all duration-300 flex items-center justify-center text-xs font-black text-black ${uploadStatus.isUploading ? "bg-yellow-400" : "bg-green-400"}`}
                  style={{ width: `${Math.max(uploadStatus.percent, 8)}%` }}
                >
                  {uploadStatus.percent}%
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-600 mt-1 font-bold">
                <span>
                  {uploadStatus.isUploading
                    ? `Sedang mengunggah: ${uploadStatus.currentFile || "..."}`
                    : "✓ Semua foto telah berhasil tersimpan di Google Drive!"}
                </span>
                <span>{uploadStatus.uploaded} dari {uploadStatus.total} file selesai</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* ── FORM ── */}
          <div className="bg-white border-4 border-black rounded-2xl p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Sparkles size={22} strokeWidth={2.5} />
              Input Data
            </h2>

            {/* Nama Customer */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-base font-bold mb-2 text-gray-700">
                <User size={16} strokeWidth={2.5} />
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
                className={`w-full border-4 rounded-xl px-4 py-3 text-lg font-medium outline-none transition-colors ${
                  errors.name
                    ? "border-red-500 bg-red-50"
                    : "border-black focus:bg-gray-50"
                }`}
              />
              {errors.name && (
                <p className="text-red-500 text-sm font-bold mt-1">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Link Google Drive */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-base font-bold text-gray-700">
                  <Link size={16} strokeWidth={2.5} />
                  Link Google Drive
                </label>
                {latestSession?.webViewLink && (
                  <button
                    type="button"
                    onClick={() => {
                      setDriveLink(latestSession.webViewLink || "");
                      if (latestSession.customerName) setName(latestSession.customerName);
                    }}
                    className="text-xs bg-yellow-300 hover:bg-yellow-400 font-bold px-2 py-1 border-2 border-black rounded-lg transition-colors cursor-pointer"
                  >
                    ⚡ Sesi Terakhir ({latestSession.customerName || "Tanpa Nama"})
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
                className={`w-full border-4 rounded-xl px-4 py-3 text-lg font-medium outline-none transition-colors ${
                  errors.driveLink
                    ? "border-red-500 bg-red-50"
                    : "border-black focus:bg-gray-50"
                }`}
              />
              {errors.driveLink && (
                <p className="text-red-500 text-sm font-bold mt-1">
                  {errors.driveLink}
                </p>
              )}
            </div>

            <div className="mb-8">
              <label className="flex items-center gap-2 text-base font-bold mb-2 text-gray-700">
                <MessageCircle size={16} strokeWidth={2.5} />
                Nomor WhatsApp Customer
              </label>
              <div className="flex items-center border-4 border-black rounded-xl overflow-hidden">
                <span className="bg-gray-100 border-r-4 border-black px-4 py-3 text-lg font-bold text-gray-500 shrink-0">
                  +62
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    // Hanya angka
                    const val = e.target.value.replace(/\D/g, "");
                    setPhone(val);
                    if (errors.phone)
                      setErrors((p) => ({ ...p, phone: undefined }));
                  }}
                  placeholder="8123456789"
                  className={`flex-1 px-4 py-3 text-lg font-medium outline-none transition-colors ${
                    errors.phone ? "bg-red-50" : "focus:bg-gray-50"
                  }`}
                />
              </div>
              {errors.phone && (
                <p className="text-red-500 text-sm font-bold mt-1">
                  {errors.phone}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Tanpa angka 0 di depan. Contoh: 81234567890
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              className="w-full text-xl font-bold border-4 border-black px-6 py-4 bg-black text-white hover:bg-white hover:text-black transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 flex items-center justify-center gap-2"
            >
              <Sparkles size={20} strokeWidth={2.5} />
              Generate Pesan
            </button>

            {/* Action Buttons */}
            {message && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCopy}
                  className={`flex-1 text-base font-bold border-4 border-black px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 ${
                    copied
                      ? "bg-green-400 text-black border-green-600"
                      : "bg-white text-black hover:bg-gray-50"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={18} strokeWidth={3} />
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <Copy size={18} strokeWidth={2.5} />
                      Copy Pesan
                    </>
                  )}
                </button>

                <button
                  onClick={handleWhatsApp}
                  className="flex-1 text-base font-bold border-4 border-black px-4 py-3 bg-green-500 text-white hover:bg-green-600 transition-colors rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} strokeWidth={2.5} />
                  Buka WhatsApp
                </button>
              </div>
            )}
            {message && (
              <p className="text-xs text-orange-500 font-bold mt-2 text-center">
                ⚡ Pesan otomatis ter-copy — langsung Ctrl+V di WhatsApp
              </p>
            )}
          </div>

          {/* ── PREVIEW ── */}
          <div className="bg-white border-4 border-black rounded-2xl p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-bold mb-6">Preview Pesan</h2>

            {message ? (
              <div className="relative">
                {/* WhatsApp-style bubble */}
                <div className="bg-gray-50 border-4 border-black rounded-2xl p-5 min-h-48">
                  {/* WA header */}
                  <div className="flex items-center gap-3 pb-3 mb-3 border-b-2 border-gray-200">
                    <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">IS</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">Ignos Studio</p>
                      <p className="text-xs text-gray-400">Preview pesan</p>
                    </div>
                  </div>

                  {/* Message bubble */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl rounded-tl-none p-4 shadow-sm">
                    <p className="text-sm leading-relaxed whitespace-pre-line text-gray-800 font-medium">
                      {message}
                    </p>
                    <p className="text-xs text-gray-400 text-right mt-2">
                      {new Date().toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* Copy overlay hint */}
                {copied && (
                  <div className="absolute inset-0 bg-green-400/20 border-4 border-green-500 rounded-2xl flex items-center justify-center">
                    <div className="bg-green-500 text-white font-bold text-xl px-6 py-3 rounded-xl border-4 border-black flex items-center gap-2">
                      <Check size={24} strokeWidth={3} />
                      Pesan tersalin!
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-48 text-gray-400 border-4 border-dashed border-gray-300 rounded-2xl">
                <MessageCircle
                  size={48}
                  strokeWidth={1.5}
                  className="mb-3 opacity-40"
                />
                <p className="font-bold text-lg">Pesan belum digenerate</p>
                <p className="text-sm mt-1">
                  Isi form lalu klik Generate Pesan
                </p>
              </div>
            )}

            {/* Raw text area for easy copy */}
            {message && (
              <div className="mt-4">
                <label className="text-sm font-bold text-gray-500 mb-2 block">
                  Raw text (bisa di-select manual):
                </label>
                <textarea
                  readOnly
                  value={message}
                  rows={10}
                  className="w-full border-4 border-black rounded-xl px-4 py-3 text-sm font-medium bg-gray-50 resize-none outline-none leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}
