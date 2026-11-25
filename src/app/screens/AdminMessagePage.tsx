import { apiFetch as fetch } from "../../utils/api";
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
      <div className="w-full px-5 pb-8 pt-3 lg:px-[34px] space-y-7">
        {/* ── 1. HEADER & CONTROL ACTIONS ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[var(--admin-border,#2a2d2f)]">
          <div>
            <p className="text-[12px] tracking-[0.14em] text-[var(--admin-muted,#92989d)] uppercase font-medium">
              PENGIRIMAN & CLOUD DISK
            </p>
            <h1 className="text-[28px] sm:text-[30px] font-semibold tracking-[-0.04em] text-[var(--admin-text,#f4f4f5)] leading-[1.25] mt-1.5">
              Pesan Softcopy & Google Drive
            </h1>
            <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.8] mt-1 max-w-2xl">
              Generate format pesan WhatsApp, pantau antrean upload Google Drive, serta kelola sinkronisasi sesi kamera.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setCameraImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#c0d0e7] text-[#111b23] hover:bg-[#d2def0] rounded-full text-[12px] font-medium transition-colors cursor-pointer "
            >
              <Camera size={13} />
              <span>Tarik Foto Kamera</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/storage")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] text-[var(--admin-secondary,#c3c7ca)] hover:bg-[var(--admin-raised,#292b2f)] hover:text-[var(--admin-text,#f4f4f5)] rounded-full text-[12px] font-medium transition-colors cursor-pointer"
            >
              <HardDrive size={13} />
              <span>Storage PC</span>
            </button>

            <button
              type="button"
              onClick={handleClearPhotos}
              disabled={clearingPhotos}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] text-[var(--admin-secondary,#c3c7ca)] hover:bg-[var(--admin-raised,#292b2f)] hover:text-[var(--admin-text,#f4f4f5)] rounded-full text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
              title="Bersihkan folder jepretan kamera aktif untuk sesi customer baru"
            >
              <RefreshCw size={13} className={clearingPhotos ? "animate-spin" : ""} />
              <span>{clearingPhotos ? "Mengosongkan..." : "Reset Kamera"}</span>
            </button>
          </div>
        </div>

        {/* ── 2. 4 EXECUTIVE STATUS METRICS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-5 space-y-3">
            <span className="text-[12px] font-medium text-[var(--admin-muted,#92989d)]">Koneksi Google Drive</span>
            <div>
              <div className="text-[18px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-tight flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    gdriveAuthStatus?.connected ? "bg-[#c9d2e1]" : "bg-[#d7b8d6]"
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
              <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                {gdriveAuthStatus?.connected
                  ? `Folder cloud: ${gdriveAuthStatus.folderName || "Aktif"}`
                  : "Token kedaluwarsa atau server offline"}
              </p>
            </div>
            <div className="pt-2  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between text-[12px] text-[var(--admin-muted,#92989d)]">
              <span>Otorisasi: {gdriveAuthStatus?.connected ? "Valid" : "Perlu Aksi"}</span>
            </div>
          </div>

          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-5 space-y-3">
            <span className="text-[12px] font-medium text-[var(--admin-muted,#92989d)]">Antrean Upload Disk</span>
            <div>
              <div className="text-[28px] font-semibold text-[var(--admin-text,#f4f4f5)] font-mono tracking-tight">
                {pendingQueue.length}
                <span className="text-[14px] text-[var(--admin-muted,#92989d)] font-normal font-sans ml-1">sesi</span>
              </div>
              <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                {pendingQueue.length > 0
                  ? "Tersimpan aman di folder antrean lokal"
                  : "Seluruh foto telah terunggah ke cloud"}
              </p>
            </div>
            <div className="pt-2  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between text-[12px] text-[var(--admin-muted,#92989d)]">
              <span>Staging Antrean: Aman</span>
            </div>
          </div>

          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-5 space-y-3">
            <span className="text-[12px] font-medium text-[var(--admin-muted,#92989d)]">Sesi Customer Terakhir</span>
            <div>
              <div className="text-[18px] font-semibold text-[var(--admin-text,#f4f4f5)] truncate tracking-tight">
                {latestSession?.customerName || "Belum Ada"}
              </div>
              <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5 truncate">
                {latestSession?.webViewLink ? "Link Drive siap dibagikan" : "Menunggu sesi Kiosk"}
              </p>
            </div>
            <div className="pt-2  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between text-[12px] text-[var(--admin-muted,#92989d)]">
              <span>Status: {latestSession?.webViewLink ? "Tersedia" : "Standby"}</span>
            </div>
          </div>

          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-5 space-y-3">
            <span className="text-[12px] font-medium text-[var(--admin-muted,#92989d)]">Format Pesan WhatsApp</span>
            <div>
              <div className="text-[18px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-tight">
                {message ? "Pesan Siap" : "Form Input"}
              </div>
              <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                {message ? "Teks telah digenerate" : "Lengkapi form customer"}
              </p>
            </div>
            <div className="pt-2  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between text-[12px] text-[var(--admin-muted,#92989d)]">
              <span>Auto-copy clipboard: Aktif</span>
            </div>
          </div>
        </div>

        {/* ── 3. GOOGLE DRIVE BANNERS & LIVE UPLOAD PROGRESS ── */}
        <div className="space-y-4">
          {/* Drive Auth Warning Banner */}
          {gdriveAuthStatus && !gdriveAuthStatus.connected && (
            <div className="p-5 border border-[var(--admin-border,#2a2d2f)] rounded-2xl bg-[var(--admin-card,#1c1f20)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#d7b8d6]" />
                  <strong className="text-[14px] font-semibold text-[var(--admin-text,#f4f4f5)]">
                    {gdriveAuthStatus.isTokenExpired
                      ? "Token Google Drive Kedaluwarsa (Perlu Login Ulang)"
                      : "Koneksi Google Drive Terputus"}
                  </strong>
                </div>
                <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-1 leading-[1.6] max-w-2xl">
                  {gdriveAuthStatus.isTokenExpired
                    ? "Masa aktif login Google Drive telah habis. Klik tombol di samping untuk login ulang agar foto sesi otomatis ter-upload ke Google Drive pelanggan."
                    : `Koneksi Google Drive bermasalah (${gdriveAuthStatus.error || "Periksa koneksi internet"}). Foto sesi saat ini aman disimpan di antrean lokal PC.`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleTriggerAuth}
                disabled={authorizingDrive}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#c0d0e7] text-[#111b23] hover:bg-[#d2def0] rounded-full text-[12px] font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50 "
              >
                <ExternalLink size={13} />
                <span>{authorizingDrive ? "Membuka Browser..." : "Login Ulang Drive"}</span>
              </button>
            </div>
          )}

          {/* Pending Queue Banner */}
          {pendingQueue.length > 0 && (
            <div className="p-5 border border-[var(--admin-border,#2a2d2f)] rounded-2xl bg-[var(--admin-card,#1c1f20)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0284c7]" />
                  <strong className="text-[14px] font-semibold text-[var(--admin-text,#f4f4f5)]">
                    Ada {pendingQueue.length} Antrean Sesi Foto di Disk PC
                  </strong>
                </div>
                <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-1 leading-[1.6]">
                  Foto dari sesi customer sebelumnya tersimpan aman di disk lokal PC dan siap diunggah ke Google Drive.
                </p>
              </div>

              <button
                type="button"
                onClick={handleUploadPendingQueue}
                disabled={uploadingQueue || !gdriveAuthStatus?.connected}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#c0d0e7] text-[#111b23] hover:bg-[#d2def0] rounded-full text-[12px] font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-40 "
              >
                <HardDrive size={13} />
                <span>{uploadingQueue ? "Mengunggah Antrean..." : "Unggah Antrean ke Drive"}</span>
              </button>
            </div>
          )}

          {/* Live Upload Status Panel */}
          {uploadStatus && uploadStatus.total > 0 && (
            <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      uploadStatus.isUploading ? "bg-[#d7b8d6]" : "bg-[#c9d2e1]"
                    }`}
                  />
                  <h3 className="text-[13px] font-semibold text-[var(--admin-text,#f4f4f5)]">
                    {uploadStatus.isUploading
                      ? "Status Upload Google Drive (Live)"
                      : "Upload Google Drive Selesai (100%)"}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-mono text-[var(--admin-secondary,#c3c7ca)] bg-[var(--admin-card,#1c1f20)] px-2 py-0.5 rounded-[4px]">
                    {uploadStatus.folderName}
                  </span>
                  <span className="text-[12px] font-mono text-[var(--admin-text,#f4f4f5)] font-medium">
                    {uploadStatus.uploaded} / {uploadStatus.total} File ({uploadStatus.percent}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[var(--admin-raised,#292b2f)] h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#c0d0e7] transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(uploadStatus.percent, 3)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[12px] text-[var(--admin-muted,#92989d)]">
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
          <div className="lg:col-span-6 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="pb-4  border-[var(--admin-border,#2a2d2f)]">
              <h2 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-[-0.02em]">
                Input Data Customer
              </h2>
              <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.7] mt-0.5">
                Masukkan identitas dan link folder Google Drive untuk generate pesan softcopy.
              </p>
            </div>

            <div className="space-y-4 text-[13px]">
              {/* Nama Customer */}
              <div>
                <label className="font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block text-[12px]">
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
                  className={`w-full px-3 py-2 border rounded-full text-[13px] outline-none transition-colors ${
                    errors.name
                      ? "border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-alert,#3b2d3c)]"
                      : "border-[var(--admin-border,#2a2d2f)] focus:border-[var(--admin-focus,#c0d0e7)] bg-[var(--admin-card,#1c1f20)]"
                  }`}
                />
                {errors.name && (
                  <p className="text-[var(--admin-danger,#f18e9a)] text-[12px] mt-1 font-medium">{errors.name}</p>
                )}
              </div>

              {/* Link Google Drive */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-medium text-[var(--admin-secondary,#c3c7ca)] text-[12px]">
                    Link Google Drive
                  </label>
                  {latestSession?.webViewLink && (
                    <button
                      type="button"
                      onClick={() => {
                        setDriveLink(latestSession.webViewLink || "");
                        if (latestSession.customerName) setName(latestSession.customerName);
                      }}
                      className="text-[12px] text-[var(--admin-secondary,#c3c7ca)] hover:text-[var(--admin-text,#f4f4f5)] bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] px-2 py-0.5 rounded-[4px] border border-[var(--admin-border,#2a2d2f)] transition-colors cursor-pointer"
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
                  className={`w-full px-3 py-2 border rounded-full text-[13px] outline-none font-mono transition-colors ${
                    errors.driveLink
                      ? "border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-alert,#3b2d3c)]"
                      : "border-[var(--admin-border,#2a2d2f)] focus:border-[var(--admin-focus,#c0d0e7)] bg-[var(--admin-card,#1c1f20)]"
                  }`}
                />
                {errors.driveLink && (
                  <p className="text-[var(--admin-danger,#f18e9a)] text-[12px] mt-1 font-medium">{errors.driveLink}</p>
                )}
              </div>

              {/* Nomor WhatsApp */}
              <div>
                <label className="font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block text-[12px]">
                  Nomor WhatsApp Customer
                </label>
                <div className="flex items-center border border-[var(--admin-border,#2a2d2f)] focus-within:border-[var(--admin-focus,#c0d0e7)] rounded-full overflow-hidden bg-[var(--admin-card,#1c1f20)]">
                  <span className="bg-[var(--admin-card,#1c1f20)] border-r border-[var(--admin-border,#2a2d2f)] px-3 py-2 text-[12px] font-mono text-[var(--admin-secondary,#c3c7ca)] shrink-0 font-medium">
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
                  <p className="text-[var(--admin-danger,#f18e9a)] text-[12px] mt-1 font-medium">{errors.phone}</p>
                )}
                <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-1">
                  Ketik tanpa angka 0 di depan (contoh: 81234567890)
                </p>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                className="w-full py-2.5 bg-[#c0d0e7] text-[#111b23] hover:bg-[#d2def0] rounded-full text-[12px] font-medium transition-colors cursor-pointer "
              >
                <span>Generate Format Pesan</span>
              </button>

              {/* Quick Actions after generated */}
              {message && (
                <div className="flex gap-2.5 pt-3  border-[var(--admin-border,#2a2d2f)]">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 py-2 text-[12px] font-medium border border-[var(--admin-border,#2a2d2f)] rounded-full bg-[var(--admin-card,#1c1f20)] text-[var(--admin-text,#f4f4f5)] hover:bg-[var(--admin-raised,#292b2f)] hover:text-[var(--admin-text,#f4f4f5)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check size={13} className="text-[var(--admin-accent-text,#c9d2e1)]" />
                        <span className="text-[var(--admin-accent-text,#c9d2e1)] font-semibold">Tersalin</span>
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
                    className="flex-1 py-2 text-[12px] font-medium rounded-full bg-[#c9d2e1] text-[#111b23] hover:bg-[#c9d2e1] transition-colors flex items-center justify-center gap-1.5 cursor-pointer "
                  >
                    <Send size={13} />
                    <span>Buka WhatsApp</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: WhatsApp Preview (6 cols) */}
          <div className="lg:col-span-6 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="pb-4  border-[var(--admin-border,#2a2d2f)]">
              <h2 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)] tracking-[-0.02em]">
                Pratinjau Pesan WhatsApp
              </h2>
              <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.7] mt-0.5">
                Simulasi tampilan teks yang akan diterima oleh customer di ponsel mereka.
              </p>
            </div>

            {message ? (
              <div className="space-y-4">
                {/* Bubble Container */}
                <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-4">
                  {/* Sender Header */}
                  <div className="flex items-center gap-2.5 pb-2.5 mb-2.5  border-[var(--admin-border,#2a2d2f)]">
                    <div className="w-7 h-7 bg-[#c0d0e7] rounded-full flex items-center justify-center shrink-0">
                      <span className="text-white text-[12px] font-semibold">
                        {branding?.studioName ? branding.studioName.slice(0, 2).toUpperCase() : "IG"}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-[13px] text-[var(--admin-text,#f4f4f5)] leading-tight">
                        {branding?.studioName || "Ignos Studio"}
                      </p>
                      <p className="text-[12px] text-[var(--admin-muted,#92989d)]">Pesan Keluar</p>
                    </div>
                  </div>

                  {/* Message Bubble */}
                  <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl rounded-tl-none p-4 ">
                    <p className="text-[12px] leading-relaxed whitespace-pre-line text-[var(--admin-text,#f4f4f5)]">
                      {message}
                    </p>
                    <p className="text-[12px] text-[var(--admin-muted,#92989d)] text-right mt-2 font-mono">
                      {new Date().toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* Raw Textbox */}
                <div>
                  <label className="text-[12px] font-medium text-[var(--admin-muted,#92989d)] mb-1 block">
                    Teks Mentah (Clipboard):
                  </label>
                  <textarea
                    readOnly
                    value={message}
                    rows={6}
                    className="w-full border border-[var(--admin-border,#2a2d2f)] rounded-lg px-3 py-2 text-[12px] font-mono text-[var(--admin-secondary,#c3c7ca)] bg-[var(--admin-canvas,#111114)] resize-none outline-none leading-relaxed"
                  />
                </div>
              </div>
            ) : (
              <div className="py-20 text-center space-y-2 border border-dashed border-[var(--admin-border,#2a2d2f)] rounded-2xl bg-[var(--admin-card,#1c1f20)] p-6">
                <p className="text-[14px] font-medium text-[var(--admin-text,#f4f4f5)]">
                  Pesan belum digenerate
                </p>
                <p className="text-[12px] text-[var(--admin-muted,#92989d)] max-w-sm mx-auto">
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
