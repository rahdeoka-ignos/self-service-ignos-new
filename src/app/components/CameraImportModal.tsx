import { useState, useEffect } from "react";
import {
  Camera,
  FolderSync,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  RefreshCw,
  X,
  Sliders,
  Check,
  ChevronRight,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface CameraPreset {
  id: string;
  name: string;
  path: string;
  defaultMinutes: number;
  isConnected?: boolean;
  detectedFolders?: string[];
}

interface ScanResult {
  success: boolean;
  error?: string;
  activeFolder?: string;
  activeFolderPath?: string;
  totalFound: number;
  totalBytes?: number;
  formattedTotalSize?: string;
  earliestTime?: string | null;
  latestTime?: string | null;
  previews?: Array<{
    name: string;
    fullPath: string;
    timeFormatted: string;
    previewUrl: string;
  }>;
}

interface CameraImportConfig {
  selectedPreset: string;
  presets: Record<string, CameraPreset>;
  lastImport: {
    timestamp: string;
    preset: string;
    count: number;
    bytes: number;
    formattedSize: string;
    earliestTime?: string;
    latestTime?: string;
  } | null;
}

const DEFAULT_CONFIG: CameraImportConfig = {
  selectedPreset: "studio",
  presets: {
    studio: {
      id: "studio",
      name: "Foto Studio (Fujifilm X-S10)",
      path: "D:\\DCIM",
      defaultMinutes: 30,
      isConnected: false,
    },
    fotobox: {
      id: "fotobox",
      name: "Fotobox (Card Reader E:)",
      path: "E:\\DCIM",
      defaultMinutes: 30,
      isConnected: false,
    },
    custom: {
      id: "custom",
      name: "Folder Kustom",
      path: "",
      defaultMinutes: 30,
      isConnected: false,
    },
  },
  lastImport: null,
};

const API =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? `http://${window.location.hostname}:5000`
    : "http://localhost:5000";

interface CameraImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export function CameraImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: CameraImportModalProps) {
  const [config, setConfig] = useState<CameraImportConfig>(DEFAULT_CONFIG);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("studio");
  const [timeFilter, setTimeFilter] = useState<string>("30_min");
  const [clearExisting, setClearExisting] = useState<boolean>(true);

  // Path editor
  const [editingPath, setEditingPath] = useState(false);
  const [customPathInput, setCustomPathInput] = useState("D:\\DCIM");

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API}/api/camera-import/config`);
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setConfig(data);
          if (data.selectedPreset) {
            setSelectedPresetId(data.selectedPreset);
            const activePreset = data.presets?.[data.selectedPreset];
            if (activePreset?.path) {
              setCustomPathInput(activePreset.path);
            }
          }
        } catch {}
      }
    } catch (err) {
      console.warn("Backend /api/camera-import/config belum merespon:", err);
    }
  };

  const handleScan = async (presetId = selectedPresetId, filter = timeFilter) => {
    try {
      setScanning(true);
      setStatusMessage(null);
      const res = await fetch(`${API}/api/camera-import/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId,
          filter,
          minutes: filter === "30_min" ? 30 : filter === "45_min" ? 45 : 60,
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        if (!res.ok) {
          setStatusMessage({
            type: "error",
            text:
              res.status === 404
                ? "Backend server (server.js) belum di-restart. Silakan restart terminal 'node server.js' agar endpoint import aktif."
                : `Server merespon dengan status ${res.status}. Pastikan server.js sedang berjalan.`,
          });
          return;
        }
      }

      if (data) {
        setScanResult(data);
        if (!data.success && data.error) {
          setStatusMessage({ type: "error", text: data.error });
        }
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: "Koneksi ke backend gagal. Pastikan 'node server.js' sedang berjalan di port 5000.",
      });
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      handleScan(selectedPresetId, timeFilter);
    }
  }, [isOpen]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (config?.presets?.[presetId]) {
      setCustomPathInput(config.presets[presetId].path);
    }
    handleScan(presetId, timeFilter);
  };

  const handleFilterChange = (filter: string) => {
    setTimeFilter(filter);
    handleScan(selectedPresetId, filter);
  };

  const handleSavePath = async () => {
    if (!config) return;
    try {
      const updatedPresets = { ...config.presets };
      if (updatedPresets[selectedPresetId]) {
        updatedPresets[selectedPresetId].path = customPathInput;
      }
      const res = await fetch(`${API}/api/camera-import/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedPreset: selectedPresetId,
          presets: updatedPresets,
        }),
      });
      if (res.ok) {
        setEditingPath(false);
        fetchConfig();
        handleScan(selectedPresetId, timeFilter);
      }
    } catch {}
  };

  const handleExecuteImport = async () => {
    if (!scanResult || scanResult.totalFound === 0) return;
    try {
      setImporting(true);
      setStatusMessage(null);
      const res = await fetch(`${API}/api/camera-import/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId: selectedPresetId,
          filter: timeFilter,
          minutes: timeFilter === "30_min" ? 30 : timeFilter === "45_min" ? 45 : 60,
          clearExistingPhotos: clearExisting,
        }),
      });
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        setStatusMessage({
          type: "error",
          text: `Gagal membaca respon server (${res.status}). Pastikan server.js telah di-restart.`,
        });
        return;
      }

      if (data?.success) {
        setStatusMessage({
          type: "success",
          text: data.message || `Berhasil menyalin ${data.count} foto ke Kiosk!`,
        });
        if (onImportSuccess) onImportSuccess();
        fetchConfig();
        // Rescan after clearing
        setTimeout(() => handleScan(selectedPresetId, timeFilter), 1500);
      } else {
        setStatusMessage({
          type: "error",
          text: data?.error || "Gagal menyalin foto.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: "Gagal import: " + err.message,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleOpenFolderExplorer = async () => {
    try {
      await fetch(`${API}/api/camera-import/open-folder`, { method: "POST" });
    } catch {}
  };

  if (!isOpen) return null;

  const currentPreset = config?.presets?.[selectedPresetId];
  const isConnected = currentPreset?.isConnected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white border border-zinc-200 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
              <Camera size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                Import Foto Kamera
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  Smart Ingest
                </span>
              </h2>
              <p className="text-[11px] text-zinc-500">
                Pilih otomatis foto customer sesi ini dan salin ke Kiosk dalam 1 klik
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-zinc-200/60 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body Scrollable */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status Message Alert */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-2">
                {statusMessage.type === "success" ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                &times;
              </button>
            </div>
          )}

          {/* Preset Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wider">
              Sumber Kamera:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {config &&
                Object.values(config.presets).map((p) => {
                  const isSelected = selectedPresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPreset(p.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                          : "bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold leading-tight">
                          {p.name}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            p.isConnected
                              ? "bg-emerald-400 animate-pulse"
                              : "bg-zinc-300"
                          }`}
                          title={p.isConnected ? "Terhubung" : "Belum dicolok"}
                        />
                      </div>
                      <div
                        className={`text-[10px] font-mono truncate ${
                          isSelected ? "text-zinc-400" : "text-zinc-500"
                        }`}
                      >
                        {p.path || "(Belum ada path)"}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Path Location & Edit Tool */}
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-600 min-w-0">
                <HardDrive size={14} className="text-zinc-500 shrink-0" />
                <span className="font-medium truncate">
                  Path Terpilih:{" "}
                  <code className="text-zinc-900 font-mono text-[11px]">
                    {currentPreset?.path || "Belum diatur"}
                  </code>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingPath(!editingPath)}
                className="text-[11px] text-zinc-600 hover:text-zinc-950 font-semibold underline underline-offset-2 cursor-pointer shrink-0 ml-2"
              >
                {editingPath ? "Tutup" : "Ubah Path"}
              </button>
            </div>

            {editingPath && (
              <div className="pt-2 border-t border-zinc-200/60 flex items-center gap-2">
                <input
                  type="text"
                  value={customPathInput}
                  onChange={(e) => setCustomPathInput(e.target.value)}
                  placeholder="Contoh: D:\DCIM atau E:\DCIM"
                  className="flex-1 bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:border-zinc-500"
                />
                <button
                  type="button"
                  onClick={handleSavePath}
                  className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            )}
          </div>

          {/* Filter Rentang Waktu Sesi */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={12} className="text-zinc-500" />
                <span>Filter Durasi Sesi Foto:</span>
              </label>
              <button
                type="button"
                onClick={() => handleScan(selectedPresetId, timeFilter)}
                disabled={scanning}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={11} className={scanning ? "animate-spin" : ""} />
                <span>Scan Ulang</span>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: "30_min", label: "30 Menit (Default)" },
                { id: "45_min", label: "45 Menit" },
                { id: "60_min", label: "60 Menit" },
                { id: "today", label: "Hari Ini" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFilterChange(f.id)}
                  className={`py-2 px-2 text-center text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    timeFilter === f.id
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-2xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scan Results & Verification Preview */}
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-900">
                  Hasil Deteksi Foto
                </span>
                {scanResult?.activeFolder && (
                  <span className="text-[10px] font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md border border-zinc-200">
                    📁 {scanResult.activeFolder}
                  </span>
                )}
              </div>
              <span className="text-xs font-mono font-bold text-zinc-950">
                {scanning
                  ? "Memindai..."
                  : scanResult?.success
                  ? `${scanResult.totalFound} Foto JPG (${scanResult.formattedTotalSize})`
                  : "0 Foto"}
              </span>
            </div>

            {scanning ? (
              <div className="py-8 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
                <RefreshCw size={18} className="animate-spin text-zinc-500" />
                <span>Memindai folder kamera...</span>
              </div>
            ) : !isConnected ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  ⚠️ Kamera atau Card Reader belum terdeteksi di path{" "}
                  <code>{currentPreset?.path}</code>. Pastikan kabel sudah dicolok ke PC.
                </p>
              </div>
            ) : scanResult && scanResult.totalFound === 0 ? (
              <div className="py-6 text-center text-zinc-400 text-xs space-y-1">
                <p className="font-medium text-zinc-600">
                  Tidak ada foto baru yang ditemukan dalam rentang waktu ini.
                </p>
                <p className="text-[11px]">
                  Coba ubah filter ke 45/60 menit atau periksa jam pada kamera.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Time Range Information */}
                {scanResult?.earliestTime && (
                  <div className="text-[11px] text-zinc-500 flex items-center justify-between bg-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-100">
                    <span>
                      🕒 Waktu Pengambilan:{" "}
                      <strong className="text-zinc-800">
                        {scanResult.earliestTime} — {scanResult.latestTime}
                      </strong>
                    </span>
                    <span className="text-emerald-700 font-medium">
                      ✓ Foto Sesi Terkini
                    </span>
                  </div>
                )}

                {/* Thumbnail Verification Grid */}
                {scanResult?.previews && scanResult.previews.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5">
                      Verifikasi Visual Customer (Foto Awal & Akhir):
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {scanResult.previews.map((pv, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-square rounded-lg overflow-hidden border border-zinc-200 bg-zinc-100"
                        >
                          <img
                            src={pv.previewUrl}
                            alt={pv.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-mono px-1 py-0.5 truncate text-center">
                            {pv.timeFormatted}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Option: Clear Existing Photos */}
          <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200/80">
            <div>
              <div className="text-xs font-semibold text-zinc-900">
                Kosongkan Foto Kamera Sesi Sebelumnya
              </div>
              <div className="text-[11px] text-zinc-500">
                Otomatis hapus foto customer lama di Kiosk sebelum foto baru disalin
              </div>
            </div>
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              className="w-4 h-4 rounded text-zinc-950 border-zinc-300 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Fallback Manual Button */}
          <button
            type="button"
            onClick={handleOpenFolderExplorer}
            className="text-[11px] font-medium text-zinc-600 hover:text-zinc-950 flex items-center gap-1.5 underline underline-offset-2 cursor-pointer self-start sm:self-auto"
            title="Buka folder tujuan di Windows Explorer jika ingin copy manual"
          >
            <FolderOpen size={13} className="text-zinc-500" />
            <span>Buka Folder di Windows (Manual)</span>
          </button>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-950 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={
                importing ||
                scanning ||
                !scanResult?.success ||
                scanResult?.totalFound === 0
              }
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-40"
            >
              {importing ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Menyalin ke Kiosk...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>
                    Import ke Kiosk{" "}
                    {scanResult?.totalFound ? `(${scanResult.totalFound} Foto)` : ""}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
