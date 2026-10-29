import { useState, useEffect, useRef } from "react";
import {
  Camera,
  FolderOpen,
  X,
  UploadCloud,
  Trash2,
  HardDrive,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
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

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

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
  const [activeTab, setActiveTab] = useState<"dragdrop" | "auto">("dragdrop");

  const [config, setConfig] = useState<CameraImportConfig>(DEFAULT_CONFIG);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("studio");
  const [timeFilter, setTimeFilter] = useState<string>("30_min");
  const [clearExisting, setClearExisting] = useState<boolean>(true);

  // Path editor
  const [editingPath, setEditingPath] = useState(false);
  const [customPathInput, setCustomPathInput] = useState("D:\\DCIM");

  // Auto-Scan state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Drag & Drop State
  const [draggedFiles, setDraggedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<Array<{ name: string; url: string; size: number }>>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload & Progress state
  const [importing, setImporting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
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
      console.warn("Backend /api/camera-import/config belum siap:", err);
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
                ? "Backend server belum di-restart. Silakan restart terminal 'node server.js' agar endpoint import aktif."
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
      if (activeTab === "auto") {
        handleScan(selectedPresetId, timeFilter);
      }
    }
  }, [isOpen, activeTab]);

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

  // Drag & Drop
  const handleFilesAdded = (files: FileList | File[]) => {
    const validImages = Array.from(files).filter((f) =>
      /\.(jpg|jpeg|png|webp)$/i.test(f.name)
    );
    if (validImages.length === 0) {
      setStatusMessage({
        type: "error",
        text: "Hanya file gambar (.jpg, .jpeg, .png) yang didukung.",
      });
      return;
    }

    setDraggedFiles(validImages);
    setStatusMessage(null);

    const previews = validImages.slice(0, 6).map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
    }));
    setFilePreviews(previews);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleUploadDraggedFiles = async () => {
    if (draggedFiles.length === 0) return;
    try {
      setImporting(true);
      setUploadPercent(5);
      setStatusMessage(null);

      if (clearExisting) {
        try {
          await fetch(`${API}/api/clear-photos`, { method: "POST" });
        } catch {}
      }

      const formData = new FormData();
      draggedFiles.forEach((file) => {
        formData.append("photos", file);
      });

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API}/api/upload-photos`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadPercent(percent);
        }
      };

      xhr.onload = () => {
        setImporting(false);
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success) {
            setStatusMessage({
              type: "success",
              text: `Berhasil mengunggah ${draggedFiles.length} foto ke Kiosk!`,
            });
            setDraggedFiles([]);
            setFilePreviews([]);
            if (onImportSuccess) onImportSuccess();
          } else {
            setStatusMessage({
              type: "error",
              text: res.error || "Gagal mengunggah foto.",
            });
          }
        } catch {
          setStatusMessage({
            type: "error",
            text: `Server mengembalikan respon error (${xhr.status}). Pastikan server.js sudah di-restart.`,
          });
        }
      };

      xhr.onerror = () => {
        setImporting(false);
        setStatusMessage({
          type: "error",
          text: "Koneksi ke backend gagal. Pastikan 'node server.js' sedang berjalan di port 5000.",
        });
      };

      xhr.send(formData);
    } catch (err: any) {
      setImporting(false);
      setStatusMessage({
        type: "error",
        text: "Gagal upload: " + err.message,
      });
    }
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
  const totalDraggedBytes = draggedFiles.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in font-['Manrope',sans-serif]">
      <div className="bg-white border border-[#e8e8e8] rounded-[14px] max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[#202020]">
        
        {/* Header (Amara Villa Clean Style) */}
        <div className="px-6 py-4.5 border-b border-[#e8e8e8] flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-[#171717] tracking-tight leading-none">
              Import Foto Kamera
            </h2>
            <p className="text-[12px] text-[#888] mt-1 font-normal">
              Salin foto customer sesi ini langsung ke galeri Kiosk
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[7px] hover:bg-[#f5f5f5] flex items-center justify-center text-[#888] hover:text-[#171717] transition-colors cursor-pointer"
            title="Tutup"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* ── Tabs (Amara Villa Minimal Underline Style) ── */}
        <div className="flex border-b border-[#e8e8e8] px-6 bg-white gap-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("dragdrop")}
            className={`py-3 text-[13px] font-medium border-b-2 transition-all cursor-pointer -mb-px ${
              activeTab === "dragdrop"
                ? "border-[#171717] text-[#171717] font-semibold"
                : "border-transparent text-[#777] hover:text-[#171717]"
            }`}
          >
            Tarik & Lepas (Drag & Drop) File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("auto")}
            className={`py-3 text-[13px] font-medium border-b-2 transition-all cursor-pointer -mb-px ${
              activeTab === "auto"
                ? "border-[#171717] text-[#171717] font-semibold"
                : "border-transparent text-[#777] hover:text-[#171717]"
            }`}
          >
            Scan Kabel Kamera / SD Card
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 bg-white">
          {/* Status Message Alert */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-[9px] border flex items-center justify-between text-[12px] font-medium animate-in fade-in ${
                statusMessage.type === "success"
                  ? "bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]"
                  : "bg-[#fff1f2] border-[#fecdd3] text-[#9f1239]"
              }`}
            >
              <div className="flex items-center gap-2">
                {statusMessage.type === "success" ? (
                  <CheckCircle2 size={15} className="text-[#059669] shrink-0" />
                ) : (
                  <AlertTriangle size={15} className="text-[#e11d48] shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-[#999] hover:text-[#333] cursor-pointer"
              >
                &times;
              </button>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* TAB 1: DRAG & DROP ZONE (Clean Amara Style)                  */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeTab === "dragdrop" && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-[12px] p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px] ${
                  isDragOver
                    ? "border-[#171717] bg-[#f8f8f8]"
                    : "border-[#e0e0e0] hover:border-[#171717] bg-[#fafafa] hover:bg-[#f6f6f6]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFilesAdded(e.target.files);
                  }}
                />

                <div className="w-12 h-12 rounded-[10px] bg-[#171717] text-white flex items-center justify-center mb-3">
                  <UploadCloud size={22} strokeWidth={1.75} />
                </div>

                <h3 className="text-[14px] font-semibold text-[#171717] mb-1">
                  Tarik & Lepas (Drag & Drop) File Foto ke Sini
                </h3>
                <p className="text-[12px] text-[#777] max-w-sm mb-4 leading-relaxed font-normal">
                  Buka folder foto customer di Windows Explorer, lalu seret file JPG ke dalam kotak ini
                </p>

                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#e5e5e5] hover:border-[#171717] text-[#333] hover:text-[#171717] rounded-[6px] text-[12px] font-medium transition-all shadow-2xs"
                >
                  <FolderOpen size={13} className="text-[#666]" />
                  <span>Pilih File Manual</span>
                </button>
              </div>

              {/* Selected Files Preview */}
              {draggedFiles.length > 0 && (
                <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#171717]">
                        {draggedFiles.length} File Foto Terpilih
                      </span>
                      <span className="text-[11px] font-mono text-[#888]">
                        ({formatBytes(totalDraggedBytes)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDraggedFiles([]);
                        setFilePreviews([]);
                      }}
                      className="text-[11px] text-[#e11d48] hover:text-[#9f1239] flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>Batalkan</span>
                    </button>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-[#999] mb-1.5">
                      Sampel Foto:
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {filePreviews.map((p, idx) => (
                        <div
                          key={idx}
                          className="aspect-square rounded-[6px] overflow-hidden border border-[#e8e8e8] bg-[#f9f9f9] relative"
                        >
                          <img
                            src={p.url}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-mono px-1 py-0.5 truncate text-center">
                            {formatBytes(p.size)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {importing && (
                    <div className="space-y-1.5 pt-2 border-t border-[#f0f0f0]">
                      <div className="w-full bg-[#f0f0f0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#171717] transition-all duration-200 rounded-full"
                          style={{ width: `${uploadPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-[#777] font-mono">
                        <span>Sedang mengunggah ke Kiosk...</span>
                        <span>{uploadPercent}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* TAB 2: AUTO CABLE SCAN (Clean Amara Style)                   */}
          {/* ═════════════════════════════════════════════════════════════ */}
          {activeTab === "auto" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] tracking-[0.14em] uppercase font-semibold text-[#888]">
                  SUMBER KAMERA
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {config &&
                    Object.values(config.presets).map((p) => {
                      const isSelected = selectedPresetId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSelectPreset(p.id)}
                          className={`p-3 rounded-[9px] border text-left transition-all cursor-pointer relative ${
                            isSelected
                              ? "bg-[#171717] text-white border-[#171717] shadow-2xs"
                              : "bg-white text-[#202020] border-[#e8e8e8] hover:bg-[#fafafa]"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[13px] font-semibold leading-tight">
                              {p.name}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                p.isConnected
                                  ? "bg-[#10b981]"
                                  : "bg-[#d4d4d8]"
                              }`}
                              title={p.isConnected ? "Terhubung" : "Belum dicolok"}
                            />
                          </div>
                          <div
                            className={`text-[10px] font-mono truncate ${
                              isSelected ? "text-[#a1a1aa]" : "text-[#888]"
                            }`}
                          >
                            {p.path || "(Belum ada path)"}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Path Location */}
              <div className="bg-[#fafafa] border border-[#e8e8e8] rounded-[9px] p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2 text-[#666] min-w-0">
                    <HardDrive size={13} className="text-[#888] shrink-0" />
                    <span className="font-medium truncate">
                      Path:{" "}
                      <code className="text-[#171717] font-mono text-[11px]">
                        {currentPreset?.path || "Belum diatur"}
                      </code>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingPath(!editingPath)}
                    className="text-[11px] text-[#666] hover:text-[#171717] font-semibold underline underline-offset-2 cursor-pointer shrink-0 ml-2"
                  >
                    {editingPath ? "Tutup" : "Ubah Path"}
                  </button>
                </div>

                {editingPath && (
                  <div className="pt-2 border-t border-[#e8e8e8] flex items-center gap-2">
                    <input
                      type="text"
                      value={customPathInput}
                      onChange={(e) => setCustomPathInput(e.target.value)}
                      placeholder="Contoh: D:\DCIM atau E:\DCIM"
                      className="flex-1 bg-white border border-[#e0e0e0] rounded-[6px] px-2.5 py-1.5 text-[12px] font-mono outline-none focus:border-[#171717]"
                    />
                    <button
                      type="button"
                      onClick={handleSavePath}
                      className="px-3 py-1.5 bg-[#171717] text-white rounded-[6px] text-[12px] font-medium hover:bg-[#333] transition-colors cursor-pointer"
                    >
                      Simpan
                    </button>
                  </div>
                )}
              </div>

              {/* Filter Durasi */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] tracking-[0.14em] uppercase font-semibold text-[#888] flex items-center gap-1.5">
                    <Clock size={11} className="text-[#888]" />
                    <span>DURASI SESI FOTO</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleScan(selectedPresetId, timeFilter)}
                    disabled={scanning}
                    className="text-[11px] text-[#777] hover:text-[#171717] flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={11} className={scanning ? "animate-spin" : ""} />
                    <span>Scan Ulang</span>
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "30_min", label: "30 Menit" },
                    { id: "45_min", label: "45 Menit" },
                    { id: "60_min", label: "60 Menit" },
                    { id: "today", label: "Hari Ini" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleFilterChange(f.id)}
                      className={`py-2 px-2 text-center text-[12px] font-medium rounded-[7px] border transition-all cursor-pointer ${
                        timeFilter === f.id
                          ? "bg-[#171717] text-white border-[#171717] shadow-2xs"
                          : "bg-white text-[#555] border-[#e5e5e5] hover:bg-[#fafafa]"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scan Results */}
              <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[#171717]">
                      Hasil Deteksi Foto
                    </span>
                    {scanResult?.activeFolder && (
                      <span className="text-[10px] font-mono bg-[#f4f4f5] text-[#52525b] px-2 py-0.5 rounded-[5px] border border-[#e4e4e7]">
                        📁 {scanResult.activeFolder}
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] font-mono font-medium text-[#171717]">
                    {scanning
                      ? "Memindai..."
                      : scanResult?.success
                      ? `${scanResult.totalFound} Foto (${scanResult.formattedTotalSize})`
                      : "0 Foto"}
                  </span>
                </div>

                {scanning ? (
                  <div className="py-8 text-center text-[#888] text-[12px] flex flex-col items-center gap-2">
                    <RefreshCw size={16} className="animate-spin text-[#888]" />
                    <span>Memindai folder kamera...</span>
                  </div>
                ) : !isConnected ? (
                  <div className="py-5 text-center space-y-2">
                    <p className="text-[12px] text-[#92400e] bg-[#fef3c7] border border-[#fde68a] rounded-[8px] p-3 font-medium">
                      Kamera atau Card Reader belum terdeteksi di path{" "}
                      <code>{currentPreset?.path}</code>. Pastikan kabel sudah dicolok ke PC.
                    </p>
                  </div>
                ) : scanResult && scanResult.totalFound === 0 ? (
                  <div className="py-6 text-center text-[#888] text-[12px] space-y-1">
                    <p className="font-medium text-[#555]">
                      Tidak ada foto baru yang ditemukan dalam rentang waktu ini.
                    </p>
                    <p className="text-[11px] text-[#999]">
                      Coba ubah filter durasi ke 45/60 menit atau periksa jam kamera.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scanResult?.earliestTime && (
                      <div className="text-[11px] text-[#666] flex items-center justify-between bg-[#fafafa] px-2.5 py-1.5 rounded-[6px] border border-[#e8e8e8]">
                        <span>
                          Waktu:{" "}
                          <strong className="text-[#171717] font-medium">
                            {scanResult.earliestTime} — {scanResult.latestTime}
                          </strong>
                        </span>
                        <span className="text-[#059669] font-medium">
                          ✓ Foto Sesi Terkini
                        </span>
                      </div>
                    )}

                    {scanResult?.previews && scanResult.previews.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-[#999] mb-1.5">
                          Sampel Foto:
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {scanResult.previews.map((pv, idx) => (
                            <div
                              key={idx}
                              className="aspect-square rounded-[6px] overflow-hidden border border-[#e8e8e8] bg-[#f9f9f9] relative"
                            >
                              <img
                                src={pv.previewUrl}
                                alt={pv.name}
                                className="w-full h-full object-cover"
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
            </div>
          )}

          {/* Option: Clear Existing Photos */}
          <div className="flex items-center justify-between p-3 bg-[#fafafa] rounded-[9px] border border-[#e8e8e8]">
            <div>
              <div className="text-[13px] font-medium text-[#171717]">
                Kosongkan Foto Kamera Sesi Sebelumnya
              </div>
              <div className="text-[11px] text-[#888] mt-0.5">
                Hapus foto customer lama di Kiosk sebelum foto baru disalin
              </div>
            </div>
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              className="w-4 h-4 rounded text-[#171717] border-[#d4d4d8] focus:ring-0 cursor-pointer accent-[#171717]"
            />
          </div>
        </div>

        {/* Footer Actions (Clean Amara Style, NO ICONS on Action Button) */}
        <div className="px-6 py-4 border-t border-[#e8e8e8] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleOpenFolderExplorer}
            className="text-[12px] font-medium text-[#777] hover:text-[#171717] flex items-center gap-1.5 underline underline-offset-2 cursor-pointer self-start sm:self-auto"
            title="Buka folder tujuan di Windows Explorer jika ingin copy manual"
          >
            <FolderOpen size={13} className="text-[#888]" />
            <span>Buka Folder di Windows (Manual)</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-medium text-[#666] hover:text-[#171717] bg-white border border-[#e5e5e5] rounded-[7px] hover:bg-[#fafafa] transition-colors cursor-pointer"
            >
              Tutup
            </button>

            {activeTab === "dragdrop" ? (
              <button
                type="button"
                onClick={handleUploadDraggedFiles}
                disabled={importing || draggedFiles.length === 0}
                className="inline-flex items-center justify-center px-4.5 py-2 bg-[#171717] hover:bg-[#333] text-white rounded-[7px] text-[12px] font-medium transition-all cursor-pointer shadow-2xs disabled:opacity-40"
              >
                {importing ? (
                  <span>Mengunggah {uploadPercent}%...</span>
                ) : (
                  <span>
                    Upload ke Kiosk{" "}
                    {draggedFiles.length > 0 ? `(${draggedFiles.length} Foto)` : ""}
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={
                  importing ||
                  scanning ||
                  !scanResult?.success ||
                  scanResult?.totalFound === 0
                }
                className="inline-flex items-center justify-center px-4.5 py-2 bg-[#171717] hover:bg-[#333] text-white rounded-[7px] text-[12px] font-medium transition-all cursor-pointer shadow-2xs disabled:opacity-40"
              >
                {importing ? (
                  <span>Menyalin ke Kiosk...</span>
                ) : (
                  <span>
                    Import ke Kiosk{" "}
                    {scanResult?.totalFound ? `(${scanResult.totalFound} Foto)` : ""}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
