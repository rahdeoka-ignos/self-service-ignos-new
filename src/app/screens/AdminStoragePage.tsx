import { useState, useEffect } from "react";
import {
  HardDrive,
  FolderArchive,
  Trash2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Camera,
  Layers,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Database,
  Sliders,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
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

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    confirmText: string;
    isDangerous?: boolean;
    action: () => Promise<void>;
  } | null>(null);

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
  }) => {
    setCleaningAction(payload.action + (payload.date || payload.days || ""));
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
      <div className="p-6 md:p-8 space-y-6 max-w-6xl">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-950 leading-tight">
                Penyimpanan & Disk
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Monitor
              </span>
            </div>
            <p className="text-zinc-500 text-xs md:text-sm mt-0.5">
              Kelola kapasitas memori PC studio, bersihkan arsip foto kadaluarsa, dan atur pembersihan otomatis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-zinc-500" : "text-zinc-500"} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert if any */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs animate-in fade-in ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === "success" ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <XCircle size={16} className="text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-zinc-400 hover:text-zinc-700 cursor-pointer text-sm leading-none"
            >
              &times;
            </button>
          </div>
        )}

        {/* ── Summary Cards Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: PC Disk Storage */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">Disk PC Admin</span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isDiskFullWarning
                    ? "bg-rose-100 text-rose-700"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                <HardDrive size={15} />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-zinc-950 font-mono">
                {stats?.disk ? stats.disk.freeFormatted : "—"}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Ruang bebas dari total {stats?.disk ? stats.disk.totalFormatted : "—"}
              </p>
            </div>
            {/* Progress bar */}
            <div className="space-y-1 pt-1">
              <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden border border-zinc-200/50">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isDiskFullWarning ? "bg-rose-500" : "bg-zinc-900"
                  }`}
                  style={{ width: `${Math.min(diskUsedPercent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                <span>{diskUsedPercent}% Terpakai</span>
                <span>{stats?.disk ? stats.disk.usedFormatted : ""}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Studio Storage */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">Penyimpanan Foto Studio</span>
              <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <Database size={15} />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-zinc-950 font-mono">
                {stats?.studioStorage.totalFormatted || "0 B"}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Total foto, antrian & arsip studio
              </p>
            </div>
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Arsip: {stats?.studioStorage.archive.formatted || "0 B"}</span>
              <span>Kamera: {stats?.studioStorage.camera.formatted || "0 B"}</span>
            </div>
          </div>

          {/* Card 3: Local Archive */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">Arsip Softcopy Lokal</span>
              <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <FolderArchive size={15} />
              </div>
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-zinc-950 font-mono">
                {stats?.studioStorage.archive.formatted || "0 B"}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {stats?.studioStorage.archive.sessionCount || 0} sesi ({stats?.studioStorage.archive.totalFiles || 0} file)
              </p>
            </div>
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
              <span>{stats?.studioStorage.archive.dateFolders.length || 0} Tanggal arsip</span>
              <span className="text-emerald-600 font-medium">100% G-Drive</span>
            </div>
          </div>

          {/* Card 4: Auto-Clean Policy */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">Auto-Clean Retensi</span>
              <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <ShieldCheck size={15} />
              </div>
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-zinc-950 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    stats?.retentionPolicy.autoCleanEnabled
                      ? "bg-emerald-500"
                      : "bg-zinc-400"
                  }`}
                />
                {stats?.retentionPolicy.autoCleanEnabled
                  ? `Aktif (> ${stats.retentionPolicy.retentionDays} Hari)`
                  : "Dinonaktifkan"}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {stats?.retentionPolicy.lastCleanedAt
                  ? `Terakhir dicek: ${new Date(
                      stats.retentionPolicy.lastCleanedAt
                    ).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Berjalan setiap 6 jam"}
              </p>
            </div>
            <div className="pt-2 border-t border-zinc-100 text-[11px] text-zinc-400 truncate">
              Aman: Tidak menyentuh antrian upload aktif
            </div>
          </div>
        </div>

        {/* ── Main Two-Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Quick Actions & Configuration (col-span-1) */}
          <div className="space-y-6">
            {/* Box 1: Quick Cleanup */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-zinc-800" />
                <h2 className="text-sm font-semibold text-zinc-950">
                  Pembersihan Cepat
                </h2>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Pilih batas usia arsip softcopy lokal yang ingin dibersihkan dari PC admin. Semua foto ini sudah sukses terunggah ke Google Drive customer.
              </p>

              {/* Retention selector buttons */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wider">
                  Batas Usia Arsip:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[3, 7, 14, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => setSelectedDays(days)}
                      className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        selectedDays === days
                          ? "bg-zinc-950 text-white border-zinc-950 shadow-2xs"
                          : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      {days} Hari
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button: Clean Older Than Selected */}
              <button
                onClick={() => {
                  setConfirmModal({
                    title: `Bersihkan Arsip > ${selectedDays} Hari?`,
                    description: `File arsip softcopy lokal yang dibuat lebih dari ${selectedDays} hari lalu akan dihapus permanen dari hardisk PC untuk membebaskan ruang memori.`,
                    confirmText: `Hapus Arsip > ${selectedDays} Hari`,
                    action: () => handleClean({ action: "archive_by_days", days: selectedDays }),
                  });
                }}
                disabled={!!cleaningAction}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>
                  {cleaningAction === `archive_by_days${selectedDays}`
                    ? "Sedang Membersihkan..."
                    : `Hapus Arsip Lebih Dari ${selectedDays} Hari`}
                </span>
              </button>

              <div className="pt-3 border-t border-zinc-100 space-y-2">
                <div className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wider">
                  Aksi Tambahan:
                </div>

                {/* Clean Camera & Thumbs */}
                <button
                  onClick={() => {
                    setConfirmModal({
                      title: "Kosongkan Folder Kamera & Thumbnail?",
                      description: "Semua foto jepretan kamera sesi aktif yang ada di folder public/photos dan thumbnail akan dihapus untuk persiapan customer baru.",
                      confirmText: "Kosongkan Kamera",
                      action: () => handleClean({ action: "camera_all" }),
                    });
                  }}
                  disabled={!!cleaningAction}
                  className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Camera size={14} className="text-zinc-500" />
                    <span>Kosongkan Kamera & Thumbnail</span>
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {stats?.studioStorage.camera.formatted || "0 B"}
                  </span>
                </button>

                {/* Clean Stale Queue */}
                <button
                  onClick={() => {
                    setConfirmModal({
                      title: "Bersihkan Antrian Upload Gantung?",
                      description: "Folder sesi di antrian upload yang sudah selesai atau terputus akan dibersihkan. Folder yang sedang aktif diupload ke Google Drive saat ini tetap aman dan tidak disentuh.",
                      confirmText: "Bersihkan Antrian",
                      action: () => handleClean({ action: "queue_stale" }),
                    });
                  }}
                  disabled={!!cleaningAction}
                  className="w-full flex items-center justify-between px-3 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 border border-zinc-200 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <Layers size={14} className="text-zinc-500" />
                    <span>Bersihkan Antrian Stale</span>
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {stats?.studioStorage.queue.formatted || "0 B"}
                  </span>
                </button>

                {/* Danger: Purge All Local Archives */}
                <button
                  onClick={() => {
                    setConfirmModal({
                      title: "Kosongkan SELURUH Arsip Lokal?",
                      description: "PERINGATAN: Semua folder arsip foto sesi lokal di storage/archive akan dihapus permanen. Pastikan semua file sudah sukses terunggah ke Google Drive.",
                      confirmText: "Ya, Hapus Semua Arsip",
                      isDangerous: true,
                      action: () => handleClean({ action: "archive_all" }),
                    });
                  }}
                  disabled={!!cleaningAction}
                  className="w-full flex items-center justify-between px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-rose-600" />
                    <span>Kosongkan Semua Arsip Lokal</span>
                  </span>
                  <span className="text-[11px] font-mono text-rose-700">
                    {stats?.studioStorage.archive.formatted || "0 B"}
                  </span>
                </button>
              </div>
            </div>

            {/* Box 2: Automated Retention Policy Settings */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-zinc-800" />
                <h2 className="text-sm font-semibold text-zinc-950">
                  Otomatisasi Retensi Disk
                </h2>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Server studio akan otomatis memeriksa dan menghapus folder arsip lokal yang melampaui batas hari secara berkala (setiap 6 jam).
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-zinc-900">
                      Pembersihan Otomatis
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Jalankan auto-clean di background
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoCleanEnabled}
                    onChange={(e) => setAutoCleanEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-zinc-950 border-zinc-300 focus:ring-0 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Hapus Arsip Otomatis Setelah:
                  </label>
                  <select
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    disabled={!autoCleanEnabled}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs font-medium bg-white outline-none focus:border-zinc-400 transition-colors disabled:opacity-50"
                  >
                    <option value={3}>3 Hari (Studio sangat ramai / disk kecil)</option>
                    <option value={5}>5 Hari</option>
                    <option value={7}>7 Hari (Standar Rekomendasi)</option>
                    <option value={14}>14 Hari (2 Minggu)</option>
                    <option value={30}>30 Hari (1 Bulan)</option>
                  </select>
                </div>

                <button
                  onClick={handleSavePolicy}
                  disabled={savingPolicy}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck size={14} />
                  <span>{savingPolicy ? "Menyimpan..." : "Simpan Pengaturan Otomatis"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Breakdown of Archive Folders by Date (col-span-2) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderArchive size={16} className="text-zinc-800" />
                  <h2 className="text-sm font-semibold text-zinc-950">
                    Rincian Arsip Softcopy Berdasarkan Tanggal
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">
                  {stats?.studioStorage.archive.dateFolders.length || 0} Tanggal Tersimpan
                </span>
              </div>

              <p className="text-xs text-zinc-500">
                Berikut adalah folder arsip lokal per tanggal yang tersimpan di PC. Anda dapat menghapus arsip tanggal tertentu secara satuan jika ingin menghemat memori spesifik.
              </p>

              {/* Date folders list */}
              <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-lg overflow-hidden">
                {!stats?.studioStorage.archive.dateFolders ||
                stats.studioStorage.archive.dateFolders.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 text-xs">
                    Belum ada folder arsip lokal tersimpan di hardisk.
                  </div>
                ) : (
                  stats.studioStorage.archive.dateFolders.map((item) => {
                    const isToday = item.ageDays === 0;
                    const isOlderThanSelected = item.ageDays >= selectedDays;

                    return (
                      <div
                        key={item.date}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isOlderThanSelected ? "bg-amber-50/40" : "hover:bg-zinc-50/60"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-zinc-900 font-mono">
                              📅 {item.date}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isToday
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : isOlderThanSelected
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                              }`}
                            >
                              {isToday
                                ? "Hari Ini"
                                : `${item.ageDays} hari yang lalu`}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                            <span>{item.sessionCount} Sesi Selesai</span>
                            <span>•</span>
                            <span>{item.files} File Softcopy</span>
                            <span>•</span>
                            <span className="font-mono font-medium text-zinc-800">
                              {item.formatted}
                            </span>
                          </div>

                          {item.sessionNames.length > 0 && (
                            <div className="text-[10px] text-zinc-400 truncate max-w-md pt-0.5">
                              Sesi: {item.sessionNames.join(", ")}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            onClick={() => {
                              setConfirmModal({
                                title: `Hapus Arsip Tanggal ${item.date}?`,
                                description: `Seluruh file arsip softcopy untuk tanggal ${item.date} (${item.formatted}, ${item.sessionCount} sesi) akan dihapus permanen dari hardisk.`,
                                confirmText: "Hapus Arsip Tanggal Ini",
                                action: () => handleClean({ action: "archive_date", date: item.date }),
                              });
                            }}
                            disabled={!!cleaningAction}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-zinc-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                            title={`Hapus arsip ${item.date}`}
                          >
                            <Trash2 size={13} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Safety Guarantee Info Card */}
            <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-zinc-600">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-zinc-900">
                  Proteksi Keamanan Upload Aktif
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-500">
                  Sistem pembersihan storage memiliki proteksi otomatis. Folder sesi customer yang saat ini sedang dalam proses pengunggahan ke Google Drive (<code className="bg-zinc-200/60 px-1 py-0.5 rounded text-[10px] text-zinc-800">storage/upload_queue</code>) akan otomatis dilindungi dan tidak akan pernah terhapus selama proses upload masih berjalan.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Confirmation Modal ── */}
        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    confirmModal.isDangerous
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">
                    {confirmModal.title}
                  </h3>
                  <p className="text-[11px] text-zinc-500">Konfirmasi Pembersihan</p>
                </div>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed">
                {confirmModal.description}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-950 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const action = confirmModal.action;
                    setConfirmModal(null);
                    await action();
                  }}
                  className={`px-3.5 py-2 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer ${
                    confirmModal.isDangerous
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-zinc-950 hover:bg-zinc-800"
                  }`}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
