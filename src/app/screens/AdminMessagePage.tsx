import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Copy,
  Check,
  MessageCircle,
  Camera,
  HardDrive,
  ExternalLink,
  RefreshCw,
  Send,
} from "lucide-react";
import { usePageTitle } from "../../hooks/usePageTitle";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfirmModal } from "../components/AdminConfirmModal";
import { CameraImportModal } from "../components/CameraImportModal";
import { useBranding } from "../../context/BrandingContext";

const API = "http://localhost:5000";

const getSapaan = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Selamat Pagi";
  if (hour >= 12 && hour < 15) return "Selamat Siang";
  if (hour >= 15 && hour < 19) return "Selamat Sore";
  return "Selamat Malam";
};

const generateMessage = (name: string, driveLink: string) =>
  `Halo Kakak ${name} ${getSapaan()}✨
Berikut kami kirimkan link G-Drive softcopy foto hari ini, silahkan dicek ya kak.

${driveLink}

Jangan lupa tag kami yaa kak @ignos.studio
Kami meminta izin kedepanya jika kita posting foto kakak yaa🙏😊
Mohon segera disimpan dikarenakan link akan expired dalam waktu 7 hari
Terima kasih kak, ditunggu kedatangannya yang selanjutnya🙏😊`;

export function AdminMessagePage() {
  usePageTitle("Pesan Softcopy — Ignos");
  const navigate = useNavigate();
  const { branding } = useBranding();

  const [cameraImportOpen, setCameraImportOpen] = useState(false);
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

  const [latestSession, setLatestSession] = useState<{
    customerName?: string;
    folderName?: string;
    webViewLink?: string;
  } | null>(null);

  const [gdriveAuthStatus, setGdriveAuthStatus] = useState<{
    connected: boolean;
    folderName?: string;
    isTokenExpired?: boolean;
    error?: string;
  } | null>(null);

  const [pendingQueue, setPendingQueue] = useState<
    Array<{
      folderName: string;
      fileCount: number;
      sessionInfo?: any;
    }>
  >([]);

  const [uploadingQueue, setUploadingQueue] = useState(false);
  const [authorizingDrive, setAuthorizingDrive] = useState(false);
  const [clearingPhotos, setClearingPhotos] = useState(false);

  // Standard modal state conforming to GEMINI.md Rule 5
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    category?: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    variant?: "danger" | "warning" | "info" | "success";
    singleButton?: boolean;
    onConfirm?: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    description: "",
  });

  const fetchUploadStatus = () => {
    fetch(`${API}/api/gdrive-upload-status`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.total > 0) {
          setUploadStatus(data);
        }
      })
      .catch(() => {});
  };

  const checkGdriveStatus = () => {
    fetch(`${API}/api/gdrive-auth-status`)
      .then((r) => r.json())
      .then((d) => setGdriveAuthStatus(d))
      .catch(() =>
        setGdriveAuthStatus({ connected: false, error: "Server offline" }),
      );

    fetch(`${API}/api/gdrive-pending-queue`)
      .then((r) => r.json())
      .then((d) => setPendingQueue(d.queue || []))
      .catch(() => {});
  };

  const fetchLatestSession = () => {
    fetch(`${API}/api/latest-session-drive`)
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
  };

  useEffect(() => {
    fetchUploadStatus();
    checkGdriveStatus();
    fetchLatestSession();

    const intervalStatus = setInterval(fetchUploadStatus, 2500);
    const intervalAuth = setInterval(checkGdriveStatus, 5000);

    return () => {
      clearInterval(intervalStatus);
      clearInterval(intervalAuth);
    };
  }, []);

  const handleTriggerAuth = async () => {
    try {
      setAuthorizingDrive(true);
      const res = await fetch(`${API}/api/gdrive-trigger-auth`, {
        method: "POST",
      });
      const data = await res.json();
      setModalConfig({
        isOpen: true,
        title: "Otorisasi Google Drive",
        category: "Koneksi Cloud",
        description:
          data.message ||
          "Jendela browser otorisasi Google Drive telah dibuka. Silakan izinkan akses akun Google Drive studio.",
        singleButton: true,
        variant: "info",
      });
    } catch {
      setModalConfig({
        isOpen: true,
        title: "Gagal Memicu Otorisasi",
        category: "Kendala Server",
        description: "Tidak dapat membuka otorisasi Google Drive. Pastikan backend server.js berjalan.",
        singleButton: true,
        variant: "warning",
      });
    } finally {
      setTimeout(() => setAuthorizingDrive(false), 2500);
    }
  };

  const handleUploadPendingQueue = () => {
    setModalConfig({
      isOpen: true,
      title: `Unggah ${pendingQueue.length} Antrian Sesi?`,
      category: "Sinkronisasi Google Drive",
      description: `Folder sesi foto dari antrean staging lokal PC akan segera diunggah ke Google Drive pelanggan.`,
      confirmText: "Mulai Unggah",
      cancelText: "Batal",
      variant: "info",
      onConfirm: async () => {
        try {
          setUploadingQueue(true);
          const res = await fetch(`${API}/api/gdrive-upload-pending`, {
            method: "POST",
          });
          const data = await res.json();
          if (data.success) {
            setModalConfig({
              isOpen: true,
              title: "Antrean Berhasil Diproses",
              category: "Upload Google Drive",
              description: data.message || "Seluruh antrean foto sedang diunggah di latar belakang.",
              singleButton: true,
              variant: "success",
            });
            checkGdriveStatus();
          } else {
            setModalConfig({
              isOpen: true,
              title: "Gagal Mengunggah Antrean",
              category: "Kendala Cloud",
              description: data.error || "Terjadi kesalahan saat memproses antrean upload.",
              singleButton: true,
              variant: "warning",
            });
          }
        } catch (err: any) {
          setModalConfig({
            isOpen: true,
            title: "Gagal Mengirim Perintah",
            category: "Kendala Server",
            description: "Error saat menghubungi backend: " + err.message,
            singleButton: true,
            variant: "warning",
          });
        } finally {
          setUploadingQueue(false);
        }
      },
    });
  };

  const handleClearPhotos = () => {
    setModalConfig({
      isOpen: true,
      title: "Kosongkan Foto Kamera?",
      category: "Persiapan Sesi Baru",
      description:
        "Foto jepretan di folder kamera aktif akan dibersihkan agar siap digunakan oleh customer berikutnya. (File antrian upload Google Drive di background tetap aman & terlindungi).",
      confirmText: "Kosongkan Kamera",
      cancelText: "Batal",
      isDangerous: true,
      variant: "warning",
      onConfirm: async () => {
        try {
          setClearingPhotos(true);
          const res = await fetch(`${API}/api/clear-photos`, {
            method: "POST",
          });
          const data = await res.json();
          if (data.success) {
            setModalConfig({
              isOpen: true,
              title: "Kamera Siap Dipakai",
              category: "Pembersihan Selesai",
              description: `Berhasil mengosongkan ${data.cleared} foto dari folder kamera aktif.`,
              singleButton: true,
              variant: "success",
            });
          } else {
            setModalConfig({
              isOpen: true,
              title: "Gagal Mengosongkan",
              category: "Kendala Sistem",
              description: "Tidak dapat membersihkan foto dari folder kamera.",
              singleButton: true,
              variant: "warning",
            });
          }
        } catch (err: any) {
          setModalConfig({
            isOpen: true,
            title: "Gagal Menghubungi Server",
            category: "Kendala Jaringan",
            description: err.message,
            singleButton: true,
            variant: "warning",
          });
        } finally {
          setClearingPhotos(false);
        }
      },
    });
  };

  const validate = () => {
    const newErrors: { name?: string; driveLink?: string; phone?: string } = {};
    if (!name.trim()) newErrors.name = "Nama customer wajib diisi";
    if (!driveLink.trim()) newErrors.driveLink = "Link Google Drive wajib diisi";
    if (!phone.trim()) newErrors.phone = "Nomor WhatsApp wajib diisi";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = () => {
    if (!validate()) return;
    const greeting = (branding?.whatsapp?.headerGreeting || "Halo Kakak {customerName}")
      .replace("{customerName}", name.trim());
    const intro = branding?.whatsapp?.introText || "Berikut kami kirimkan link Google Drive softcopy foto hari ini, silahkan dicek ya kak.";
    const igTag = branding?.whatsapp?.instagramTag || "@ignos.studio";
    const disclaimer = branding?.whatsapp?.footerDisclaimer || "Mohon segera disimpan dikarenakan link akan expired dalam waktu 7 hari. Terima kasih kak, ditunggu kedatangannya yang selanjutnya!";

    const msg = `${greeting} ${getSapaan()}✨
${intro}

${driveLink.trim()}

Jangan lupa tag kami yaa kak ${igTag}
Kami meminta izin kedepannya jika kita posting foto kakak yaa🙏😊
${disclaimer}`;

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
    await navigator.clipboard.writeText(message);
    window.open(`https://wa.me/${number}`, "_blank");
  };

  return (
    <AdminLayout>
      <div className="w-full p-6 md:p-8 space-y-8">
        {/* ── 1. HEADER & CONTROL ACTIONS ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#e8e8e8]">
          <div>
            <p className="text-[10px] tracking-[0.14em] text-[#999] uppercase font-medium">
              PENGIRIMAN & CLOUD DISK
            </p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.04em] text-[#202020] leading-[1.25] mt-1.5">
              Pesan Softcopy & Google Drive
            </h1>
            <p className="text-[13px] text-[#777] leading-[1.8] mt-1 max-w-2xl">
              Generate format pesan WhatsApp, pantau antrean upload Google Drive, serta kelola sinkronisasi sesi kamera.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setCameraImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#171717] text-white hover:bg-black rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer shadow-xs"
            >
              <Camera size={13} />
              <span>Tarik Foto Kamera</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/storage")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#e6e6e6] text-[#444] hover:bg-[#f6f6f6] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer"
            >
              <HardDrive size={13} />
              <span>Storage PC</span>
            </button>

            <button
              type="button"
              onClick={handleClearPhotos}
              disabled={clearingPhotos}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#e6e6e6] text-[#444] hover:bg-[#f6f6f6] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
              title="Bersihkan folder jepretan kamera aktif untuk sesi customer baru"
            >
              <RefreshCw size={13} className={clearingPhotos ? "animate-spin" : ""} />
              <span>{clearingPhotos ? "Mengosongkan..." : "Reset Kamera"}</span>
            </button>
          </div>
        </div>

        {/* ── 2. 4 EXECUTIVE STATUS METRICS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Koneksi Google Drive</span>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] tracking-tight flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    gdriveAuthStatus?.connected ? "bg-[#10b981]" : "bg-[#f59e0b]"
                  }`}
                />
                <span>
                  {gdriveAuthStatus?.connected
                    ? "Terhubung"
                    : gdriveAuthStatus?.isTokenExpired
                      ? "Perlu Login Ulang"
                      : "Terputus"}
                </span>
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                {gdriveAuthStatus?.connected
                  ? `Folder cloud: ${gdriveAuthStatus.folderName || "Aktif"}`
                  : "Token kedaluwarsa atau server offline"}
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Otorisasi: {gdriveAuthStatus?.connected ? "Valid" : "Perlu Aksi"}</span>
            </div>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Antrean Upload Disk</span>
            <div>
              <div className="text-[26px] font-semibold text-[#171717] font-mono tracking-tight">
                {pendingQueue.length}
                <span className="text-[14px] text-[#888] font-normal font-sans ml-1">sesi</span>
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                {pendingQueue.length > 0
                  ? "Tersimpan aman di folder antrean lokal"
                  : "Seluruh foto telah terunggah ke cloud"}
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Staging Antrean: Aman</span>
            </div>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Sesi Customer Terakhir</span>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] truncate tracking-tight">
                {latestSession?.customerName || "Belum Ada"}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5 truncate">
                {latestSession?.webViewLink ? "Link Drive siap dibagikan" : "Menunggu sesi Kiosk"}
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Status: {latestSession?.webViewLink ? "Tersedia" : "Standby"}</span>
            </div>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Format Pesan WhatsApp</span>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] tracking-tight">
                {message ? "Pesan Siap" : "Form Input"}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                {message ? "Teks telah digenerate" : "Lengkapi form customer"}
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Auto-copy clipboard: Aktif</span>
            </div>
          </div>
        </div>

        {/* ── 3. GOOGLE DRIVE BANNERS & LIVE UPLOAD PROGRESS ── */}
        <div className="space-y-4">
          {/* Drive Auth Warning Banner */}
          {gdriveAuthStatus && !gdriveAuthStatus.connected && (
            <div className="p-5 border border-[#e8e8e8] rounded-[10px] bg-[#fafafa] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                  <strong className="text-[14px] font-semibold text-[#202020]">
                    {gdriveAuthStatus.isTokenExpired
                      ? "Token Google Drive Kedaluwarsa (Perlu Login Ulang)"
                      : "Koneksi Google Drive Terputus"}
                  </strong>
                </div>
                <p className="text-[12px] text-[#777] mt-1 leading-[1.6] max-w-2xl">
                  {gdriveAuthStatus.isTokenExpired
                    ? "Masa aktif login Google Drive telah habis. Klik tombol di samping untuk login ulang agar foto sesi otomatis ter-upload ke Google Drive pelanggan."
                    : `Koneksi Google Drive bermasalah (${gdriveAuthStatus.error || "Periksa koneksi internet"}). Foto sesi saat ini aman disimpan di antrean lokal PC.`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleTriggerAuth}
                disabled={authorizingDrive}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#171717] text-white hover:bg-black rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50 shadow-xs"
              >
                <ExternalLink size={13} />
                <span>{authorizingDrive ? "Membuka Browser..." : "Login Ulang Drive"}</span>
              </button>
            </div>
          )}

          {/* Pending Queue Banner */}
          {pendingQueue.length > 0 && (
            <div className="p-5 border border-[#e8e8e8] rounded-[10px] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
                  <strong className="text-[14px] font-semibold text-[#202020]">
                    Ada {pendingQueue.length} Antrean Sesi Foto di Disk PC
                  </strong>
                </div>
                <p className="text-[12px] text-[#777] mt-1 leading-[1.6]">
                  Foto dari sesi customer sebelumnya tersimpan aman di disk lokal PC dan siap diunggah ke Google Drive.
                </p>
              </div>

              <button
                type="button"
                onClick={handleUploadPendingQueue}
                disabled={uploadingQueue || !gdriveAuthStatus?.connected}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#171717] text-white hover:bg-black rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-40 shadow-xs"
              >
                <HardDrive size={13} />
                <span>{uploadingQueue ? "Mengunggah Antrean..." : "Unggah Antrean ke Drive"}</span>
              </button>
            </div>
          )}

          {/* Live Upload Status Panel */}
          {uploadStatus && uploadStatus.total > 0 && (
            <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      uploadStatus.isUploading ? "bg-[#f59e0b]" : "bg-[#10b981]"
                    }`}
                  />
                  <h3 className="text-[13px] font-semibold text-[#202020]">
                    {uploadStatus.isUploading
                      ? "Status Upload Google Drive (Live)"
                      : "Upload Google Drive Selesai (100%)"}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#555] bg-[#f5f5f5] px-2 py-0.5 rounded-[4px]">
                    {uploadStatus.folderName}
                  </span>
                  <span className="text-[11px] font-mono text-[#202020] font-medium">
                    {uploadStatus.uploaded} / {uploadStatus.total} File ({uploadStatus.percent}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#f0f0f0] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#171717] transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(uploadStatus.percent, 3)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-[#888]">
                <span>
                  {uploadStatus.isUploading
                    ? `Mengunggah: ${uploadStatus.currentFile || "..."}`
                    : "Semua foto berhasil terunggah ke Google Drive."}
                </span>
                <span className="font-mono">
                  {uploadStatus.uploaded} dari {uploadStatus.total} file
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── 4. TWO-COLUMN: INPUT FORM (6 cols) & WA PREVIEW (6 cols) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column 1: Input Data Customer (6 cols) */}
          <div className="lg:col-span-6 bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 space-y-6">
            <div className="pb-4 border-b border-[#f0f0f0]">
              <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                Input Data Customer
              </h2>
              <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                Masukkan identitas dan link folder Google Drive untuk generate pesan softcopy.
              </p>
            </div>

            <div className="space-y-4 text-[13px]">
              {/* Nama Customer */}
              <div>
                <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                  Nama Customer
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                  }}
                  placeholder="Contoh: Sarah"
                  className={`w-full px-3 py-2 border rounded-[7px] text-[13px] outline-none transition-colors ${
                    errors.name
                      ? "border-[#ef4444] bg-[#fef2f2]"
                      : "border-[#e0e0e0] focus:border-[#171717] bg-white"
                  }`}
                />
                {errors.name && (
                  <p className="text-[#dc2626] text-[11px] mt-1 font-medium">{errors.name}</p>
                )}
              </div>

              {/* Link Google Drive */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-medium text-[#444] text-[12px]">
                    Link Google Drive
                  </label>
                  {latestSession?.webViewLink && (
                    <button
                      type="button"
                      onClick={() => {
                        setDriveLink(latestSession.webViewLink || "");
                        if (latestSession.customerName) setName(latestSession.customerName);
                      }}
                      className="text-[11px] text-[#555] hover:text-[#171717] bg-[#f5f5f5] hover:bg-[#eaeaea] px-2 py-0.5 rounded-[4px] border border-[#e2e2e2] transition-colors cursor-pointer"
                    >
                      ⚡ Isi dari Sesi Terakhir ({latestSession.customerName || "Customer"})
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  value={driveLink}
                  onChange={(e) => {
                    setDriveLink(e.target.value);
                    if (errors.driveLink) setErrors((p) => ({ ...p, driveLink: undefined }));
                  }}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className={`w-full px-3 py-2 border rounded-[7px] text-[13px] outline-none font-mono transition-colors ${
                    errors.driveLink
                      ? "border-[#ef4444] bg-[#fef2f2]"
                      : "border-[#e0e0e0] focus:border-[#171717] bg-white"
                  }`}
                />
                {errors.driveLink && (
                  <p className="text-[#dc2626] text-[11px] mt-1 font-medium">{errors.driveLink}</p>
                )}
              </div>

              {/* Nomor WhatsApp */}
              <div>
                <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                  Nomor WhatsApp Customer
                </label>
                <div className="flex items-center border border-[#e0e0e0] focus-within:border-[#171717] rounded-[7px] overflow-hidden bg-white">
                  <span className="bg-[#f7f7f7] border-r border-[#e0e0e0] px-3 py-2 text-[12px] font-mono text-[#666] shrink-0 font-medium">
                    +62
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setPhone(val);
                      if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
                    }}
                    placeholder="81234567890"
                    className="flex-1 px-3 py-2 text-[13px] outline-none font-mono"
                  />
                </div>
                {errors.phone && (
                  <p className="text-[#dc2626] text-[11px] mt-1 font-medium">{errors.phone}</p>
                )}
                <p className="text-[11px] text-[#888] mt-1">
                  Ketik tanpa angka 0 di depan (contoh: 81234567890)
                </p>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                className="w-full py-2.5 bg-[#171717] text-white hover:bg-black rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer shadow-xs"
              >
                <span>Generate Format Pesan</span>
              </button>

              {/* Quick Actions after generated */}
              {message && (
                <div className="flex gap-2.5 pt-3 border-t border-[#f0f0f0]">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 py-2 text-[12px] font-medium border border-[#e2e2e2] rounded-[7px] bg-white text-[#333] hover:bg-[#f6f6f6] hover:text-[#171717] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check size={13} className="text-[#10b981]" />
                        <span className="text-[#10b981] font-semibold">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Salin Pesan</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="flex-1 py-2 text-[12px] font-medium rounded-[7px] bg-[#10b981] text-white hover:bg-[#059669] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Send size={13} />
                    <span>Buka WhatsApp</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: WhatsApp Preview (6 cols) */}
          <div className="lg:col-span-6 bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 space-y-6">
            <div className="pb-4 border-b border-[#f0f0f0]">
              <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                Pratinjau Pesan WhatsApp
              </h2>
              <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                Simulasi tampilan teks yang akan diterima oleh customer di ponsel mereka.
              </p>
            </div>

            {message ? (
              <div className="space-y-4">
                {/* Bubble Container */}
                <div className="bg-[#f7f7f7] border border-[#e8e8e8] rounded-[10px] p-4">
                  {/* Sender Header */}
                  <div className="flex items-center gap-2.5 pb-2.5 mb-2.5 border-b border-[#e2e2e2]">
                    <div className="w-7 h-7 bg-[#171717] rounded-full flex items-center justify-center shrink-0">
                      <span className="text-white text-[10px] font-semibold">
                        {branding?.studioName ? branding.studioName.slice(0, 2).toUpperCase() : "IG"}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-[13px] text-[#202020] leading-tight">
                        {branding?.studioName || "Ignos Studio"}
                      </p>
                      <p className="text-[10px] text-[#888]">Pesan Keluar</p>
                    </div>
                  </div>

                  {/* Message Bubble */}
                  <div className="bg-white border border-[#e0e0e0] rounded-[10px] rounded-tl-none p-4 shadow-2xs">
                    <p className="text-[12px] leading-relaxed whitespace-pre-line text-[#202020]">
                      {message}
                    </p>
                    <p className="text-[10px] text-[#999] text-right mt-2 font-mono">
                      {new Date().toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* Raw Textbox */}
                <div>
                  <label className="text-[11px] font-medium text-[#777] mb-1 block">
                    Teks Mentah (Clipboard):
                  </label>
                  <textarea
                    readOnly
                    value={message}
                    rows={6}
                    className="w-full border border-[#e0e0e0] rounded-[7px] px-3 py-2 text-[12px] font-mono text-[#444] bg-[#fafafa] resize-none outline-none leading-relaxed"
                  />
                </div>
              </div>
            ) : (
              <div className="py-20 text-center space-y-2 border border-dashed border-[#e5e5e5] rounded-[10px] bg-[#fafafa] p-6">
                <p className="text-[14px] font-medium text-[#202020]">
                  Pesan belum digenerate
                </p>
                <p className="text-[12px] text-[#888] max-w-sm mx-auto">
                  Lengkapi nama customer, link Google Drive, dan nomor WhatsApp di form sebelah kiri, lalu klik tombol "Generate Format Pesan".
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Standard Admin Confirmation Modal Conforming to GEMINI.md Rule 5 ── */}
        <AdminConfirmModal
          isOpen={modalConfig.isOpen}
          onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={modalConfig.onConfirm}
          title={modalConfig.title}
          category={modalConfig.category}
          description={modalConfig.description}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
          isDangerous={modalConfig.isDangerous}
          variant={modalConfig.variant}
          singleButton={modalConfig.singleButton}
        />
      </div>

      <CameraImportModal
        isOpen={cameraImportOpen}
        onClose={() => setCameraImportOpen(false)}
      />
    </AdminLayout>
  );
}
