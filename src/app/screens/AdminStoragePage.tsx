import { useState, useEffect } from "react";
import {
  RefreshCw,
  FolderOpen,
  Trash2,
  Clock,
  Camera,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfirmModal } from "../components/AdminConfirmModal";
import { usePageTitle } from "../../hooks/usePageTitle";

interface DateFolderStat {
  date: string;
  bytes: number;
  formatted: string;
  files: number;
  sessionCount: number;
  sessionNames: string[];
  ageDays: number;
}

interface CameraCacheItem {
  name: string;
  size: number;
  formattedSize: string;
  mtime: string;
  timeFormatted: string;
}

interface StorageStats {
  disk: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    usedPercent: number;
    totalFormatted: string;
    freeFormatted: string;
    usedFormatted: string;
  } | null;
  studioStorage: {
    totalBytes: number;
    totalFormatted: string;
    camera: {
      bytes: number;
      formatted: string;
      photoFiles: number;
      thumbFiles: number;
    };
    cameraCache?: {
      bytes: number;
      formatted: string;
      files: number;
      items: CameraCacheItem[];
    };
    queue: {
      bytes: number;
      formatted: string;
      folderCount: number;
      folders: string[];
      isUploading: boolean;
      activeFolder: string | null;
    };
    archive: {
      bytes: number;
      formatted: string;
      totalFiles: number;
      sessionCount: number;
      dateFolders: DateFolderStat[];
    };
  };
  retentionPolicy: {
    autoCleanEnabled: boolean;
    retentionDays: number;
    lastCleanedAt: string | null;
  };
}

const API = "http://localhost:5000";

export function AdminStoragePage() {
  usePageTitle("Manajemen Penyimpanan");

  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"cleanup" | "cache" | "archive">("cleanup");
  const [cleaningAction, setCleaningAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Retention preset selection
  const [selectedDays, setSelectedDays] = useState<number>(7);

  // Policy form state
  const [autoCleanEnabled, setAutoCleanEnabled] = useState(true);
  const [retentionDays, setRetentionDays] = useState(7);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Reusable confirmation modal state
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

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/storage-stats`);
      if (res.ok) {
        const data: StorageStats = await res.json();
        setStats(data);
        if (data.retentionPolicy) {
          setAutoCleanEnabled(data.retentionPolicy.autoCleanEnabled ?? true);
          setRetentionDays(data.retentionPolicy.retentionDays ?? 7);
        }
      }
    } catch (err) {
      console.error("Gagal memuat status penyimpanan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleClean = async (payload: {
    action: string;
    days?: number;
    date?: string;
    fileName?: string;
  }) => {
    setCleaningAction(payload.action + (payload.fileName || payload.date || payload.days || ""));
    setFeedback(null);
    try {
      const res = await fetch(`${API}/api/storage-clean`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: data.message || "Penyimpanan berhasil dibersihkan!",
        });
        if (data.stats) {
          setStats(data.stats);
        } else {
          fetchStats();
        }
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Gagal membersihkan penyimpanan",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: "Koneksi ke server gagal: " + err.message,
      });
    } finally {
      setCleaningAction(null);
    }
  };

  const handleOpenFolder = async (target: "camera_cache" | "photos" | "archive" = "camera_cache") => {
    try {
      await fetch(`${API}/api/camera-import/open-folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
    } catch (err) {
      console.error("Gagal membuka folder:", err);
    }
  };

  const handleSavePolicy = async () => {
    try {
      setSavingPolicy(true);
      const res = await fetch(`${API}/api/storage-policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoCleanEnabled, retentionDays }),
      });
      if (res.ok) {
        setFeedback({
          type: "success",
          message: `Kebijakan auto-cleanup disimpan: ${autoCleanEnabled ? `Aktif (${retentionDays} hari)` : "Dinonaktifkan"}`,
        });
        fetchStats();
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Gagal menyimpan kebijakan penyimpanan",
      });
    } finally {
      setSavingPolicy(false);
    }
  };

  const diskUsedPercent = stats?.disk?.usedPercent ?? 0;
  const isDiskFullWarning = diskUsedPercent >= 85;

  return (
    <AdminLayout>
      <div className="w-full p-6 md:p-8 space-y-8">
        {/* ── Page Header (Minimal Editorial) ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#e8e8e8]">
          <div>
            <p className="text-[10px] tracking-[0.14em] text-[#999] uppercase font-medium">
              SISTEM & PENYIMPANAN DISK
            </p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.04em] text-[#202020] leading-[1.25] mt-1.5">
              Penyimpanan & Disk
            </h1>
            <p className="text-[13px] text-[#777] leading-[1.8] mt-1 max-w-2xl">
              Pantau sisa kapasitas hardisk PC admin, kelola pembersihan file arsip softcopy kadaluarsa, serta atur retensi otomatis.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-[#e6e6e6] text-[#444] hover:bg-[#f6f6f6] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-[#888]" : "text-[#888]"} />
              <span>{loading ? "Menyinkronkan..." : "Segarkan Status"}</span>
            </button>
          </div>
        </div>

        {/* ── Feedback Notification (Quiet & Clean) ── */}
        {feedback && (
          <div className="p-3.5 rounded-[8px] border border-[#e8e8e8] bg-white text-[#202020] text-[13px] flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${feedback.type === "success" ? "bg-[#10b981]" : "bg-[#ef4444]"}`} />
              <span className="font-normal">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-[12px] text-[#888] hover:text-[#171717] cursor-pointer ml-4 shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── 4 Calm Metric Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Ruang Hardisk PC */}
          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#777]">Sisa Ruang Disk PC</span>
              <span className={`w-2 h-2 rounded-full ${isDiskFullWarning ? "bg-[#ef4444]" : "bg-[#10b981]"}`} />
            </div>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] font-mono tracking-tight">
                {stats?.disk ? stats.disk.freeFormatted : "—"}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                Bebas dari total {stats?.disk ? stats.disk.totalFormatted : "—"}
              </p>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="w-full bg-[#f0f0f0] h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isDiskFullWarning ? "bg-[#ef4444]" : "bg-[#171717]"}`}
                  style={{ width: `${Math.min(diskUsedPercent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#999] font-mono">
                <span>{diskUsedPercent}% terpakai</span>
                <span>{stats?.disk ? stats.disk.usedFormatted : ""}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Penyimpanan Studio */}
          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Data Foto Studio</span>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] font-mono tracking-tight">
                {stats?.studioStorage.totalFormatted || "0 B"}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                Total foto, antrian & arsip lokal
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Kiosk: {stats?.studioStorage.camera.formatted || "0 B"}</span>
              <span>Cache: {stats?.studioStorage.cameraCache?.formatted || "0 B"}</span>
            </div>
          </div>

          {/* Card 3: Arsip Softcopy */}
          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Arsip Softcopy Lokal</span>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] font-mono tracking-tight">
                {stats?.studioStorage.archive.formatted || "0 B"}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                {stats?.studioStorage.archive.sessionCount || 0} sesi ({stats?.studioStorage.archive.totalFiles || 0} file)
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>{stats?.studioStorage.archive.dateFolders.length || 0} tanggal tersimpan</span>
              <span className="text-[#10b981] font-medium">Synced G-Drive</span>
            </div>
          </div>

          {/* Card 4: Retensi Otomatis */}
          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Jadwal Auto-Clean</span>
            <div>
              <div className="text-[16px] font-semibold text-[#171717] tracking-tight">
                {stats?.retentionPolicy.autoCleanEnabled
                  ? `Aktif (> ${stats.retentionPolicy.retentionDays} Hari)`
                  : "Dinonaktifkan"}
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                {stats?.retentionPolicy.lastCleanedAt
                  ? `Terakhir cek: ${new Date(stats.retentionPolicy.lastCleanedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                  : "Pemeriksaan berkala aktif"}
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] text-[11px] text-[#888] truncate">
              Antrian upload aktif terlindungi
            </div>
          </div>
        </div>

        {/* ── Minimal Tabs (No Icons, No Badges) ── */}
        <div className="flex border-b border-[#e8e8e8] gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("cleanup")}
            className={`pb-3 text-[13px] tracking-[-0.01em] transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === "cleanup"
                ? "border-[#171717] font-semibold text-[#171717]"
                : "border-transparent text-[#777] hover:text-[#171717]"
            }`}
          >
            Pembersihan & Retensi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cache")}
            className={`pb-3 text-[13px] tracking-[-0.01em] transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === "cache"
                ? "border-[#171717] font-semibold text-[#171717]"
                : "border-transparent text-[#777] hover:text-[#171717]"
            }`}
          >
            Cache Foto Kamera ({stats?.studioStorage.cameraCache?.files || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("archive")}
            className={`pb-3 text-[13px] tracking-[-0.01em] transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === "archive"
                ? "border-[#171717] font-semibold text-[#171717]"
                : "border-transparent text-[#777] hover:text-[#171717]"
            }`}
          >
            Daftar Arsip per Tanggal ({stats?.studioStorage.archive.dateFolders.length || 0})
          </button>
        </div>

        {/* ── TAB 1: PEMBERSIHAN & RETENSI ── */}
        {activeTab === "cleanup" && (
          <div className="space-y-8">
            {/* Box 1: Pembersihan Cepat Berdasarkan Usia */}
            <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-8 sm:p-10 space-y-6">
              <div className="pb-4 border-b border-[#f0f0f0]">
                <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                  Pembersihan Arsip Softcopy Cepat
                </h2>
                <p className="text-[13px] text-[#888] leading-[1.7] mt-1">
                  Hapus arsip foto lokal lama dari hardisk PC untuk membebaskan ruang memori. Semua foto ini sudah sukses terunggah ke Google Drive pelanggan.
                </p>
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-1">
                <div className="space-y-2.5">
                  <label className="text-[12px] font-medium text-[#444] block">
                    Pilih Batas Usia Arsip:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[3, 7, 14, 30].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setSelectedDays(days)}
                        className={`px-3.5 py-2 text-[12px] font-medium rounded-[7px] border transition-colors cursor-pointer ${
                          selectedDays === days
                            ? "bg-[#171717] text-white border-[#171717]"
                            : "bg-white text-[#555] border-[#e0e0e0] hover:text-[#171717] hover:bg-[#fafafa]"
                        }`}
                      >
                        Lebih Dari {days} Hari
                      </button>
                    ))}
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setModalConfig({
                        isOpen: true,
                        title: `Bersihkan Arsip > ${selectedDays} Hari?`,
                        category: "Konfirmasi Pembersihan",
                        description: `File arsip softcopy lokal yang berumur lebih dari ${selectedDays} hari akan dihapus permanen dari hardisk PC. File di Google Drive tetap aman.`,
                        confirmText: `Hapus Arsip > ${selectedDays} Hari`,
                        cancelText: "Batal",
                        isDangerous: true,
                        variant: "danger",
                        onConfirm: () => handleClean({ action: "archive_by_days", days: selectedDays }),
                      });
                    }}
                    disabled={!!cleaningAction}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#171717] hover:bg-black text-white rounded-[7px] text-[13px] font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                    <span>
                      {cleaningAction === `archive_by_days${selectedDays}`
                        ? "Sedang Membersihkan..."
                        : `Hapus Arsip Lebih Dari ${selectedDays} Hari`}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Box 2: Aksi Pembersihan Khusus */}
            <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-8 sm:p-10 space-y-6">
              <div className="pb-4 border-b border-[#f0f0f0]">
                <h3 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                  Aksi Pembersihan Tambahan
                </h3>
                <p className="text-[13px] text-[#888] leading-[1.7] mt-1">
                  Tindakan perawatan mandiri untuk membersihkan cache pratinjau, foto sesi kerja aktif, atau antrian tersangkut.
                </p>
              </div>

              <div className="divide-y divide-[#f2f2f2]">
                {/* 1. Cache Kamera */}
                <div className="py-4.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[13px] font-medium text-[#202020]">
                      Cache Foto Kamera (MTP Preview)
                    </div>
                    <div className="text-[12px] text-[#888] mt-0.5">
                      Sampel foto sementara dari kabel USB kamera saat proses scan pratinjau.
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[12px] font-mono text-[#888]">
                      {stats?.studioStorage.cameraCache?.formatted || "0 B"} ({stats?.studioStorage.cameraCache?.files || 0} file)
                    </span>
                    <button
                      onClick={() => {
                        setModalConfig({
                          isOpen: true,
                          title: "Kosongkan Cache Foto Kamera?",
                          category: "Konfirmasi Pembersihan",
                          description: "File foto sampel preview kamera di storage/camera_cache akan dihapus untuk mengosongkan ruang disk.",
                          confirmText: "Kosongkan Cache",
                          cancelText: "Batal",
                          variant: "warning",
                          onConfirm: () => handleClean({ action: "camera_cache" }),
                        });
                      }}
                      disabled={!!cleaningAction || (stats?.studioStorage.cameraCache?.files ?? 0) === 0}
                      className="px-3.5 py-1.5 bg-white border border-[#e6e6e6] text-[#444] hover:bg-[#f6f6f6] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                {/* 2. Kamera & Thumbnail Sesi Aktif */}
                <div className="py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[13px] font-medium text-[#202020]">
                      Folder Foto Sesi Kiosk & Thumbnail
                    </div>
                    <div className="text-[12px] text-[#888] mt-0.5">
                      Foto jepretan sesi customer aktif saat ini di folder public/photos.
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[12px] font-mono text-[#888]">
                      {stats?.studioStorage.camera.formatted || "0 B"}
                    </span>
                    <button
                      onClick={() => {
                        setModalConfig({
                          isOpen: true,
                          title: "Kosongkan Foto Sesi Kiosk?",
                          category: "Konfirmasi Pembersihan",
                          description: "Semua foto sesi aktif yang ada di folder public/photos akan dihapus untuk persiapan customer baru.",
                          confirmText: "Kosongkan Folder",
                          cancelText: "Batal",
                          variant: "warning",
                          onConfirm: () => handleClean({ action: "camera_all" }),
                        });
                      }}
                      disabled={!!cleaningAction}
                      className="px-3.5 py-1.5 bg-white border border-[#e6e6e6] text-[#444] hover:bg-[#f6f6f6] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                {/* 3. Antrian Stale */}
                <div className="py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[13px] font-medium text-[#202020]">
                      Antrian Upload Tersangkut (Stale Queue)
                    </div>
                    <div className="text-[12px] text-[#888] mt-0.5">
                      Sesi yang terputus atau telah selesai diunggah. Folder yang sedang aktif diupload tetap aman.
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[12px] font-mono text-[#888]">
                      {stats?.studioStorage.queue.formatted || "0 B"}
                    </span>
                    <button
                      onClick={() => {
                        setModalConfig({
                          isOpen: true,
                          title: "Bersihkan Antrian Upload Gantung?",
                          category: "Konfirmasi Pembersihan",
                          description: "Folder antrian yang sudah selesai atau terputus akan dibersihkan. Folder yang sedang aktif diupload saat ini tidak disentuh.",
                          confirmText: "Bersihkan Antrian",
                          cancelText: "Batal",
                          variant: "warning",
                          onConfirm: () => handleClean({ action: "queue_stale" }),
                        });
                      }}
                      disabled={!!cleaningAction}
                      className="px-3.5 py-1.5 bg-white border border-[#e6e6e6] text-[#444] hover:bg-[#f6f6f6] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Bersihkan
                    </button>
                  </div>
                </div>

                {/* 4. Kosongkan Seluruh Arsip Lokal */}
                <div className="py-4.5 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[13px] font-medium text-[#dc2626]">
                      Hapus Seluruh Arsip Softcopy Lokal
                    </div>
                    <div className="text-[12px] text-[#888] mt-0.5">
                      Menghapus seluruh folder arsip lokal di storage/archive. Pastikan semua file sudah sukses terunggah ke Google Drive.
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[12px] font-mono text-[#dc2626]">
                      {stats?.studioStorage.archive.formatted || "0 B"}
                    </span>
                    <button
                      onClick={() => {
                        setModalConfig({
                          isOpen: true,
                          title: "Kosongkan SELURUH Arsip Lokal?",
                          category: "Tindakan Berisiko Tinggi",
                          description: "PERINGATAN: Semua folder arsip foto sesi lokal di storage/archive akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.",
                          confirmText: "Ya, Hapus Semua Arsip",
                          cancelText: "Batal",
                          isDangerous: true,
                          variant: "danger",
                          onConfirm: () => handleClean({ action: "archive_all" }),
                        });
                      }}
                      disabled={!!cleaningAction}
                      className="px-3.5 py-1.5 bg-white border border-[#fecaca] text-[#dc2626] hover:bg-[#fef2f2] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Hapus Semua
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 3: Pengaturan Retensi Otomatis */}
            <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-8 sm:p-10 space-y-6">
              <div className="pb-4 border-b border-[#f0f0f0]">
                <h3 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                  Otomatisasi Retensi Disk
                </h3>
                <p className="text-[13px] text-[#888] leading-[1.7] mt-1">
                  Server studio akan secara otomatis memeriksa dan menghapus folder arsip lokal yang melampaui batas hari secara berkala di latar belakang (setiap 6 jam).
                </p>
              </div>

              <div className="divide-y divide-[#f2f2f2]">
                <div className="py-4.5 first:pt-0 flex items-center justify-between gap-4">
                  <div>
                    <label className="text-[13px] font-medium text-[#202020] block">
                      Aktifkan Pembersihan Otomatis
                    </label>
                    <p className="text-[12px] text-[#888] mt-0.5">
                      Jalankan pembersihan background tanpa perlu tindakan manual staf.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoCleanEnabled}
                      onChange={(e) => setAutoCleanEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-[#e0e0e0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#171717] relative" />
                  </label>
                </div>

                <div className="py-4.5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-7">
                    <label className="text-[13px] font-medium text-[#202020] block">
                      Batas Retensi Otomatis
                    </label>
                    <p className="text-[12px] text-[#888] mt-0.5">
                      Hapus arsip lokal yang usianya melebihi batas waktu ini.
                    </p>
                  </div>
                  <div className="md:col-span-5">
                    <select
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(Number(e.target.value))}
                      disabled={!autoCleanEnabled}
                      className="w-full border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] px-3.5 py-2 text-[13px] text-[#202020] outline-none transition-colors bg-white cursor-pointer disabled:opacity-40"
                    >
                      <option value={3}>3 Hari (Studio sangat ramai / disk kecil)</option>
                      <option value={5}>5 Hari</option>
                      <option value={7}>7 Hari (Standar Rekomendasi)</option>
                      <option value={14}>14 Hari (2 Minggu)</option>
                      <option value={30}>30 Hari (1 Bulan)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSavePolicy}
                    disabled={savingPolicy}
                    className="px-5 py-2 bg-[#171717] hover:bg-black text-white rounded-[7px] text-[13px] font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {savingPolicy ? "Menyimpan..." : "Simpan Pengaturan Otomatis"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: CACHE FOTO KAMERA ── */}
        {activeTab === "cache" && (
          <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-8 sm:p-10 space-y-6">
            <div className="pb-4 border-b border-[#f0f0f0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                  Cache Foto Kamera (MTP Preview)
                </h2>
                <p className="text-[13px] text-[#888] leading-[1.7] mt-1">
                  Sampel foto sementara dari kabel USB kamera untuk pratinjau thumbnail sebelum disalin ke Kiosk.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => handleOpenFolder("camera_cache")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e6e6e6] text-[#444] hover:bg-[#f6f6f6] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer"
                  title="Buka folder storage/camera_cache di File Explorer Windows"
                >
                  <FolderOpen size={13} className="text-[#888]" />
                  <span>Buka di Explorer</span>
                </button>

                <button
                  onClick={() => {
                    setModalConfig({
                      isOpen: true,
                      title: "Kosongkan Semua Cache Foto Kamera?",
                      category: "Konfirmasi Pembersihan",
                      description: "Semua file sampel foto di dalam folder storage/camera_cache akan dihapus permanen. Tindakan ini aman dan tidak akan menghapus arsip foto pelanggan.",
                      confirmText: "Kosongkan Cache",
                      cancelText: "Batal",
                      variant: "warning",
                      onConfirm: () => handleClean({ action: "camera_cache" }),
                    });
                  }}
                  disabled={!!cleaningAction || (stats?.studioStorage.cameraCache?.files ?? 0) === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#fecaca] text-[#dc2626] hover:bg-[#fef2f2] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Trash2 size={13} />
                  <span>Kosongkan Cache ({stats?.studioStorage.cameraCache?.files || 0})</span>
                </button>
              </div>
            </div>

            {/* List or Empty State */}
            {(!stats?.studioStorage.cameraCache?.items || stats.studioStorage.cameraCache.items.length === 0) ? (
              <div className="py-12 text-center space-y-1">
                <p className="text-[13px] font-medium text-[#202020]">Folder cache kamera bersih</p>
                <p className="text-[12px] text-[#888]">
                  Tidak ada file sampel sementara yang tersimpan. Foto akan terisi saat melakukan scan kamera via kabel USB.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[12px] text-[#888] pb-1">
                  <span>Total {stats.studioStorage.cameraCache.items.length} file sampel</span>
                  <span className="font-mono">Ukuran disk: {stats.studioStorage.cameraCache.formatted}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                  {stats.studioStorage.cameraCache.items.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between gap-3 p-3 rounded-[8px] border border-[#e8e8e8] bg-white hover:border-[#ccc] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-mono text-[#202020] truncate font-medium" title={file.name}>
                          {file.name}
                        </div>
                        <div className="text-[11px] text-[#888] font-mono mt-0.5">
                          {file.formattedSize} · {file.timeFormatted}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setModalConfig({
                            isOpen: true,
                            title: `Hapus foto ${file.name}?`,
                            category: "Konfirmasi Hapus File",
                            description: `File sampel "${file.name}" (${file.formattedSize}) akan dihapus dari storage/camera_cache.`,
                            confirmText: "Hapus Foto",
                            cancelText: "Batal",
                            variant: "warning",
                            onConfirm: () => handleClean({ action: "camera_cache_file", fileName: file.name }),
                          });
                        }}
                        disabled={!!cleaningAction}
                        className="p-1.5 text-[#888] hover:text-[#dc2626] rounded-[5px] transition-colors cursor-pointer shrink-0"
                        title="Hapus foto ini dari cache"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: DAFTAR ARSIP PER TANGGAL ── */}
        {activeTab === "archive" && (
          <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-8 sm:p-10 space-y-6">
            <div className="pb-4 border-b border-[#f0f0f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                  Daftar Arsip Softcopy Berdasarkan Tanggal
                </h2>
                <p className="text-[13px] text-[#888] leading-[1.7] mt-1">
                  Rincian folder sesi per tanggal yang tersimpan di PC. Anda dapat menghapus tanggal tertentu jika ingin menghemat memori spesifik.
                </p>
              </div>
              <span className="text-[12px] text-[#888] shrink-0 font-normal">
                {stats?.studioStorage.archive.dateFolders.length || 0} tanggal tersimpan
              </span>
            </div>

            <div className="divide-y divide-[#f2f2f2]">
              {!stats?.studioStorage.archive.dateFolders ||
              stats.studioStorage.archive.dateFolders.length === 0 ? (
                <div className="py-12 text-center text-[#888] text-[13px]">
                  Belum ada folder arsip lokal tersimpan di hardisk.
                </div>
              ) : (
                stats.studioStorage.archive.dateFolders.map((item) => {
                  const isToday = item.ageDays === 0;

                  return (
                    <div
                      key={item.date}
                      className="py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-[13px] text-[#202020] font-mono">
                            {item.date}
                          </span>
                          <span className="text-[11px] text-[#888]">
                            ({isToday ? "Hari Ini" : `${item.ageDays} hari lalu`})
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 text-[12px] text-[#888]">
                          <span>{item.sessionCount} Sesi</span>
                          <span>·</span>
                          <span>{item.files} File</span>
                          <span>·</span>
                          <span className="font-mono text-[#202020] font-medium">{item.formatted}</span>
                        </div>

                        {item.sessionNames.length > 0 && (
                          <div className="text-[11px] text-[#aaa] truncate max-w-lg">
                            Sesi: {item.sessionNames.join(", ")}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={() => {
                            setModalConfig({
                              isOpen: true,
                              title: `Hapus Arsip Tanggal ${item.date}?`,
                              category: "Konfirmasi Hapus Arsip",
                              description: `Seluruh file arsip softcopy untuk tanggal ${item.date} (${item.formatted}, ${item.sessionCount} sesi) akan dihapus permanen dari hardisk.`,
                              confirmText: "Hapus Arsip Ini",
                              cancelText: "Batal",
                              isDangerous: true,
                              variant: "danger",
                              onConfirm: () => handleClean({ action: "archive_date", date: item.date }),
                            });
                          }}
                          disabled={!!cleaningAction}
                          className="px-3 py-1.5 bg-white border border-[#e6e6e6] text-[#dc2626] hover:bg-[#fef2f2] hover:border-[#fecaca] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                        >
                          Hapus Arsip
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── Standard Admin Confirmation Modal ── */}
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
    </AdminLayout>
  );
}
