import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Printer,
  Trash2,
  Pencil,
  X,
  RefreshCw,
  Ban,
  Check,
  Search,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfirmModal } from "../components/AdminConfirmModal";
import { usePageTitle } from "../../hooks/usePageTitle";
import type {
  PrinterProfile,
  PrintersData,
  ProductType,
  SystemPrinter,
  PrinterMonitorResponse,
} from "../../types/printer";

const API = "http://localhost:5000";

const PRODUCT_TYPE_OPTIONS: { value: ProductType; label: string }[] = [
  { value: "4r", label: "Foto 4R" },
  { value: "a4", label: "Foto A4" },
  { value: "keychain-default", label: "Keychain Default" },
  { value: "keychain-kotak-plastik", label: "Keychain Kotak Plastik" },
  { value: "keychain-kotak-metal", label: "Keychain Kotak Metal" },
  { value: "keychain-oval-metal", label: "Keychain Oval Metal" },
  { value: "keychain-love-metal", label: "Keychain Love Metal" },
  { value: "idcard", label: "ID Card" },
  { value: "pasfoto", label: "Pas Foto" },
  { value: "struk", label: "Struk Thermal" },
];

type FormState = {
  id: string;
  label: string;
  printerName: string;
  appliesTo: ProductType[];
  copies: number;
};

const defaultForm = (): FormState => ({
  id: "",
  label: "",
  printerName: "",
  appliesTo: [],
  copies: 1,
});

export function AdminPrinterPage() {
  usePageTitle("Printer & Kertas — Ignos");

  const [data, setData] = useState<PrintersData | null>(null);
  const [systemPrinters, setSystemPrinters] = useState<SystemPrinter[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<PrinterProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PrinterProfile | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [systemPrinterError, setSystemPrinterError] = useState<string | null>(null);
  const [monitorData, setMonitorData] = useState<PrinterMonitorResponse | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [clearingJobs, setClearingJobs] = useState(false);
  const [simulatingType, setSimulatingType] = useState<string>("normal");
  const [profileSearch, setProfileSearch] = useState("");

  // Reusable modal state conforming to GEMINI.md Rule 5
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

  const fetchData = async () => {
    try {
      const res = await fetch(`${API}/api/printers`);
      if (res.ok) {
        const d: PrintersData = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error("Gagal memuat profil printer:", err);
    }
  };

  const fetchSystemPrinters = async () => {
    try {
      const res = await fetch(`${API}/api/system-printers`);
      if (!res.ok) throw new Error("Gagal membaca spooler Windows");
      const list: SystemPrinter[] = await res.json();
      setSystemPrinters(list);
      setSystemPrinterError(null);
    } catch (err: any) {
      setSystemPrinterError(err.message);
    }
  };

  const fetchMonitorStatus = async () => {
    try {
      setMonitorLoading(true);
      const res = await fetch(`${API}/api/printer-status`);
      if (res.ok) {
        const json: PrinterMonitorResponse = await res.json();
        setMonitorData(json);
        if (json.alert?.isSimulated) {
          setSimulatingType(json.alert.type);
        } else if (!json.hasError) {
          setSimulatingType("normal");
        }
      }
    } catch {
      // Keep silent on background poll
    } finally {
      setMonitorLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSystemPrinters();
    fetchMonitorStatus();

    const interval = setInterval(fetchMonitorStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleClearJobs = () => {
    setModalConfig({
      isOpen: true,
      title: "Bersihkan Antrean Cetak Windows?",
      category: "Windows Print Spooler",
      description: "Seluruh antrean cetak dokumen yang macet atau menggantung di Windows Spooler akan dibatalkan.",
      confirmText: "Bersihkan Spooler",
      cancelText: "Batal",
      isDangerous: true,
      variant: "danger",
      onConfirm: async () => {
        try {
          setClearingJobs(true);
          const res = await fetch(`${API}/api/printers/clear-jobs`, { method: "POST" });
          if (res.ok) {
            await fetchMonitorStatus();
          } else {
            setModalConfig({
              isOpen: true,
              title: "Gagal Membersihkan Spooler",
              category: "Kendala Sistem",
              description: "Server tidak dapat mengosongkan antrean printer Windows. Pastikan hak akses Administrator terpenuhi.",
              singleButton: true,
              variant: "warning",
            });
          }
        } catch (err: any) {
          setModalConfig({
            isOpen: true,
            title: "Gagal Menghubungi Spooler",
            category: "Kendala Server",
            description: "Terjadi kesalahan saat memicu pembersihan spooler: " + err.message,
            singleButton: true,
            variant: "warning",
          });
        } finally {
          setClearingJobs(false);
        }
      },
    });
  };

  const handleSimulateAlert = async (type: string) => {
    setSimulatingType(type);
    try {
      await fetch(`${API}/api/printer-status/test-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, active: type !== "normal" }),
      });
      fetchMonitorStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const openCreate = () => {
    setEditProfile(null);
    setForm(defaultForm());
    setDialogOpen(true);
  };

  const openEdit = (profile: PrinterProfile) => {
    setEditProfile(profile);
    setForm({
      id: profile.id,
      label: profile.label,
      printerName: profile.printerName,
      appliesTo: profile.appliesTo,
      copies: profile.copies || 1,
    });
    setDialogOpen(true);
  };

  const toggleProductType = (value: ProductType) => {
    setForm((f) => ({
      ...f,
      appliesTo: f.appliesTo.includes(value)
        ? f.appliesTo.filter((v) => v !== value)
        : [...f.appliesTo, value],
    }));
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      setModalConfig({
        isOpen: true,
        title: "Nama Profil Diperlukan",
        category: "Validasi Form",
        description: "Harap isi nama profil sebelum menyimpan (misal: 4R Glossy).",
        singleButton: true,
        variant: "warning",
      });
      return;
    }
    if (!form.printerName.trim()) {
      setModalConfig({
        isOpen: true,
        title: "Printer Windows Diperlukan",
        category: "Validasi Form",
        description: "Harap pilih atau tentukan nama instance printer sistem Windows.",
        singleButton: true,
        variant: "warning",
      });
      return;
    }
    if (form.appliesTo.length === 0) {
      setModalConfig({
        isOpen: true,
        title: "Target Produk Diperlukan",
        category: "Validasi Form",
        description: "Harap pilih minimal satu jenis produk foto/cetak yang berlaku untuk profil ini.",
        singleButton: true,
        variant: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      if (editProfile) {
        await fetch(`${API}/api/printers/${editProfile.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: form.label,
            printerName: form.printerName,
            appliesTo: form.appliesTo,
            copies: form.copies,
          }),
        });
      } else {
        const id = form.label
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        await fetch(`${API}/api/printers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: id || `profile-${Date.now()}`,
            label: form.label,
            printerName: form.printerName,
            appliesTo: form.appliesTo,
            copies: form.copies,
          }),
        });
      }
      setDialogOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profile: PrinterProfile) => {
    try {
      await fetch(`${API}/api/printers/${profile.id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const profiles = data?.profiles || [];

  const filteredProfiles = useMemo(() => {
    if (!profileSearch.trim()) return profiles;
    const q = profileSearch.toLowerCase();
    return profiles.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.printerName.toLowerCase().includes(q) ||
        p.appliesTo.some((t) => t.toLowerCase().includes(q)),
    );
  }, [profiles, profileSearch]);

  const totalSpoolerJobs = useMemo(() => {
    return (monitorData?.printers || []).reduce((sum, p) => sum + (p.jobsCount || 0), 0);
  }, [monitorData]);

  return (
    <AdminLayout>
      <div className="w-full p-6 md:p-8 space-y-8">
        {/* ── 1. HEADER & CONTROL ACTIONS ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#e8e8e8]">
          <div>
            <p className="text-[10px] tracking-[0.14em] text-[#999] uppercase font-medium">
              HARDWARE DISPATCH & SPOOLER
            </p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.04em] text-[#202020] leading-[1.25] mt-1.5">
              Printer & Kertas
            </h1>
            <p className="text-[13px] text-[#777] leading-[1.8] mt-1 max-w-2xl">
              Pantau antrean Windows Spooler secara real-time, atur simulasi error bilik Kiosk, dan kelola pemetaan profil cetak foto.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleClearJobs}
              disabled={clearingJobs}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#e6e6e6] text-[#444] hover:bg-[#f6f6f6] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
              title="Batalkan antrean cetak yang macet di Windows Spooler"
            >
              <Ban size={13} />
              <span>{clearingJobs ? "Membersihkan..." : "Bersihkan Antrean"}</span>
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#171717] text-white hover:bg-black rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer shadow-xs"
            >
              <Plus size={13} />
              <span>Tambah Profil</span>
            </button>

            <button
              type="button"
              onClick={() => {
                fetchMonitorStatus();
                fetchSystemPrinters();
                fetchData();
              }}
              disabled={monitorLoading}
              className="w-[34px] h-[34px] rounded-[7px] border border-[#e6e6e6] bg-white hover:bg-[#f6f6f6] inline-flex items-center justify-center text-[#666] cursor-pointer transition-colors"
              title="Perbarui status printer"
            >
              <RefreshCw size={13} className={monitorLoading ? "animate-spin text-[#888]" : "text-[#888]"} />
            </button>
          </div>
        </div>

        {systemPrinterError && (
          <div className="p-4 border border-[#e8e8e8] rounded-[8px] bg-[#fffaf5] text-[#9a3412] text-[13px] flex items-center justify-between">
            <span>⚠ {systemPrinterError} — pastikan printer terhubung ke PC Windows.</span>
          </div>
        )}

        {/* ── 2. 4 EXECUTIVE STATUS CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Status Spooler Windows</span>
            <div>
              <div className="text-[22px] font-semibold text-[#171717] tracking-tight flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    monitorData?.hasError ? "bg-[#ef4444]" : "bg-[#10b981]"
                  }`}
                />
                <span>{monitorData?.hasError ? "Kendala Terdeteksi" : "Siap Mencetak"}</span>
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                {monitorData?.hasError ? "Peringatan aktif di bilik Kiosk" : "Koneksi hardware normal"}
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Poller otomatis: Aktif (4s)</span>
            </div>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Antrean Dokumen Spooler</span>
            <div>
              <div className="text-[26px] font-semibold text-[#171717] font-mono tracking-tight">
                {totalSpoolerJobs}
                <span className="text-[14px] text-[#888] font-normal font-sans ml-1">dokumen</span>
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                {totalSpoolerJobs > 0 ? "Sedang dalam proses kirim ke printer" : "Spooler kosong dan lancar"}
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Beban Antrean: {totalSpoolerJobs > 3 ? "Tinggi" : "Ringan"}</span>
            </div>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Profil Auto-Print Ignos</span>
            <div>
              <div className="text-[26px] font-semibold text-[#171717] font-mono tracking-tight">
                {profiles.length}
                <span className="text-[14px] text-[#888] font-normal font-sans ml-1">profil</span>
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                Pemetaan produk foto ke perangkat fisik
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>4R, A4, Keychain, Struk</span>
            </div>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 space-y-3">
            <span className="text-[12px] font-medium text-[#777]">Driver Printer Windows</span>
            <div>
              <div className="text-[26px] font-semibold text-[#171717] font-mono tracking-tight">
                {systemPrinters.length}
                <span className="text-[14px] text-[#888] font-normal font-sans ml-1">driver</span>
              </div>
              <p className="text-[11px] text-[#888] mt-0.5">
                Perangkat terinstal di sistem operasi PC
              </p>
            </div>
            <div className="pt-2 border-t border-[#f2f2f2] flex items-center justify-between text-[11px] text-[#888]">
              <span>Printer default terdeteksi</span>
            </div>
          </div>
        </div>

        {/* ── 3. LIVE MONITOR & ACTIVE ALERT ── */}
        <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 space-y-6">
          <div className="pb-4 border-b border-[#f0f0f0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                Status Perangkat Printer Windows
              </h2>
              <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                Deteksi otomatis kondisi kertas habis, tray tertutup, dan antrean cetak aktif.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#777]">Status Bilik Kiosk:</span>
              <span className="text-[12px] font-medium font-mono text-[#202020]">
                {monitorData?.hasError ? "Peringatan Aktif" : "Normal"}
              </span>
            </div>
          </div>

          {/* Active Alert Banner */}
          {monitorData?.alert && (
            <div className="p-4 border border-[#e8e8e8] rounded-[8px] bg-[#fafafa] space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                  <strong className="text-[13px] font-semibold text-[#202020]">
                    {monitorData.alert.title}
                  </strong>
                </div>

                {monitorData.alert.isSimulated && (
                  <span className="text-[10px] font-mono font-medium text-[#777] uppercase tracking-[0.08em] bg-[#f0f0f0] border border-[#e0e0e0] px-2 py-0.5 rounded-[4px]">
                    MODE SIMULASI
                  </span>
                )}
              </div>

              <p className="text-[13px] text-[#555] leading-relaxed">
                {monitorData.alert.adminMessage}
              </p>

              <div className="bg-white border border-[#eee] rounded-[6px] p-3 text-[12px] text-[#666]">
                <span className="text-[#999] block text-[10px] mb-0.5 uppercase tracking-wider font-medium">
                  Teks Muncul di Layar Kiosk Customer:
                </span>
                <p className="font-medium text-[#202020]">"{monitorData.alert.customerMessage}"</p>
              </div>
            </div>
          )}

          {/* Monitored Printers Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(monitorData?.printers || []).map((pr) => {
              const hasProfiles = pr.profiles.length > 0;
              return (
                <div
                  key={pr.name}
                  className="bg-white border border-[#e8e8e8] rounded-[10px] p-4.5 space-y-3 hover:border-[#ccc] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-[13px] text-[#202020] truncate" title={pr.name}>
                      {pr.name}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          pr.statusCode === "ready"
                            ? "bg-[#10b981]"
                            : pr.statusCode === "printing"
                              ? "bg-[#0284c7]"
                              : "bg-[#ef4444]"
                        }`}
                      />
                      <span className="text-[11px] font-medium text-[#555]">{pr.status}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#f5f5f5] space-y-1.5 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-[#888]">Profil Terhubung:</span>
                      <span className="text-[#202020] font-medium truncate ml-2">
                        {hasProfiles ? pr.profiles.map((p) => p.label).join(", ") : "(Belum dipetakan)"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#888]">Antrean Spooler:</span>
                      <span className="font-mono text-[#202020] font-medium">{pr.jobsCount} dokumen</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simulator Segmented Controls */}
          <div className="p-4 bg-[#fafafa] border border-[#e8e8e8] rounded-[8px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-[#202020]">
                Uji Coba Tampilan Peringatan di Layar Kiosk
              </p>
              <p className="text-[11px] text-[#888] mt-0.5">
                Simulasikan modal popup customer tanpa perlu sengaja membuat printer fisik macet.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#ebebeb] p-1 rounded-[7px] border border-[#e0e0e0] flex-wrap">
              {[
                { id: "normal", label: "Normal" },
                { id: "paper_out", label: "Kertas Habis" },
                { id: "door_open", label: "Tray Tertutup" },
                { id: "paper_jam", label: "Paper Jam" },
              ].map((item) => {
                const isActive = simulatingType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSimulateAlert(item.id)}
                    className={`px-3 py-1.5 rounded-[5px] text-[12px] font-medium transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[#171717] text-white shadow-xs font-semibold"
                        : "text-[#666] hover:text-[#171717]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 4. PROFILES LIST ── */}
        <div className="bg-white border border-[#e8e8e8] rounded-[12px] p-6 sm:p-8 space-y-6">
          <div className="pb-4 border-b border-[#f0f0f0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.02em]">
                Daftar Profil Auto-Print Foto
              </h2>
              <p className="text-[13px] text-[#888] leading-[1.7] mt-0.5">
                Pengaturan printer fisik tujuan untuk setiap jenis kertas dan merchandise.
              </p>
            </div>

            <div className="flex items-center gap-2 border border-[#e0e0e0] focus-within:border-[#171717] rounded-[7px] px-3 py-1.5 bg-white text-[12px] transition-colors w-full sm:w-64">
              <Search size={13} className="text-[#999] shrink-0" />
              <input
                type="search"
                placeholder="Cari profil / printer..."
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                className="w-full border-0 outline-none text-[#202020] placeholder:text-[#aaa] text-[12px] p-0"
              />
            </div>
          </div>

          {filteredProfiles.length === 0 ? (
            <div className="py-16 text-center space-y-2 border border-dashed border-[#e5e5e5] rounded-[10px] p-6">
              <p className="text-[14px] font-medium text-[#202020]">
                {profileSearch ? "Tidak ada profil yang cocok" : "Belum ada profil auto-print"}
              </p>
              <p className="text-[12px] text-[#888]">
                {profileSearch
                  ? "Coba gunakan kata kunci pencarian yang lain."
                  : "Tambahkan profil untuk mengaktifkan cetak otomatis foto dari bilik Kiosk."}
              </p>
              {profileSearch ? (
                <button
                  type="button"
                  onClick={() => setProfileSearch("")}
                  className="mt-1 text-[12px] text-[#171717] font-medium hover:underline cursor-pointer"
                >
                  Reset pencarian
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#171717] text-white hover:bg-black rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer shadow-xs"
                >
                  <Plus size={13} />
                  <span>Tambah Profil Pertama</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="bg-white border border-[#e8e8e8] rounded-[10px] p-5 hover:border-[#ccc] transition-colors flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[15px] text-[#202020] truncate">
                          {profile.label}
                        </h3>
                        <p className="text-[11px] text-[#888] font-mono truncate mt-0.5">
                          {profile.printerName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(profile)}
                          className="w-7 h-7 flex items-center justify-center rounded-[5px] border border-[#e2e2e2] hover:bg-[#f6f6f6] text-[#666] hover:text-[#171717] transition-colors cursor-pointer"
                          title="Edit profil"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(profile)}
                          className="w-7 h-7 flex items-center justify-center rounded-[5px] border border-[#e2e2e2] hover:border-[#fca5a5] hover:bg-[#fef2f2] text-[#999] hover:text-[#dc2626] transition-colors cursor-pointer"
                          title="Hapus profil"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-3">
                      {profile.appliesTo.map((type) => (
                        <span
                          key={type}
                          className="text-[10px] font-medium px-2 py-0.5 bg-[#f5f5f5] text-[#555] border border-[#e8e8e8] rounded-[4px]"
                        >
                          {PRODUCT_TYPE_OPTIONS.find((o) => o.value === type)?.label || type}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#f2f2f2] text-[11px] text-[#888] flex justify-between">
                    <span>Jumlah Salinan Cetak:</span>
                    <span className="font-mono text-[#202020] font-medium">{profile.copies || 1} copy</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Create / Edit Dialog ── */}
        {dialogOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-[#e5e5e5] rounded-[12px] shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-[#eee]">
                <div>
                  <h2 className="text-[16px] font-semibold text-[#202020]">
                    {editProfile ? "Edit Profil Printer" : "Tambah Profil Printer"}
                  </h2>
                  <p className="text-[12px] text-[#888] mt-0.5">
                    Hubungkan jenis produk foto ke instance printer Windows
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f4f4f4] text-[#888] hover:text-[#202020] cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-[13px]">
                <div>
                  <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                    Nama Label Profil
                  </label>
                  <input
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="Contoh: Cetak 4R Reguler"
                    className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                    Printer Sistem (Windows)
                  </label>
                  {systemPrinters.length > 0 ? (
                    <select
                      value={form.printerName}
                      onChange={(e) => setForm((f) => ({ ...f, printerName: e.target.value }))}
                      className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white cursor-pointer"
                    >
                      <option value="">Pilih printer terdeteksi...</option>
                      {systemPrinters.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name} {p.isDefault ? "(default)" : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={form.printerName}
                      onChange={(e) => setForm((f) => ({ ...f, printerName: e.target.value }))}
                      placeholder="Nama instance printer di Windows"
                      className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white transition-colors"
                    />
                  )}
                  <p className="text-[11px] text-[#888] mt-1">
                    Pastikan driver printer sudah terpasang di Windows Device Manager.
                  </p>
                </div>

                <div>
                  <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                    Berlaku Untuk Jenis Produk
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRODUCT_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleProductType(opt.value)}
                        className={`text-[12px] font-medium px-2.5 py-1.5 rounded-[6px] border transition-colors cursor-pointer ${
                          form.appliesTo.includes(opt.value)
                            ? "bg-[#171717] text-white border-[#171717]"
                            : "bg-white text-[#555] border-[#e0e0e0] hover:bg-[#f6f6f6]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-medium text-[#444] mb-1.5 block text-[12px]">
                    Jumlah Salinan (Copies)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.copies}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, copies: Math.max(1, Number(e.target.value) || 1) }))
                    }
                    className="w-full px-3 py-2 border border-[#e0e0e0] focus:border-[#171717] rounded-[7px] text-[13px] outline-none bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 p-4 border-t border-[#eee] bg-[#fafafa]">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1 bg-white text-[#555] border border-[#e2e2e2] hover:bg-[#f4f4f4] rounded-[7px] py-2 text-[12px] font-medium transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-[#171717] text-white hover:bg-black rounded-[7px] py-2 text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {saving ? "Menyimpan..." : "Simpan Profil"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Standard Admin Confirmation Modal Conforming to GEMINI.md Rule 5 ── */}
        <AdminConfirmModal
          isOpen={modalConfig.isOpen || !!deleteConfirm}
          onClose={() => {
            setModalConfig((prev) => ({ ...prev, isOpen: false }));
            setDeleteConfirm(null);
          }}
          onConfirm={
            deleteConfirm
              ? () => handleDelete(deleteConfirm)
              : modalConfig.onConfirm
          }
          title={deleteConfirm ? `Hapus Profil "${deleteConfirm.label}"?` : modalConfig.title}
          category={deleteConfirm ? "Konfirmasi Hapus Profil" : modalConfig.category}
          description={
            deleteConfirm
              ? `Profil auto-print "${deleteConfirm.label}" (${deleteConfirm.printerName}) akan dihapus dari sistem bilik Kiosk.`
              : modalConfig.description
          }
          confirmText={deleteConfirm ? "Hapus Profil" : modalConfig.confirmText}
          cancelText={deleteConfirm ? "Batal" : modalConfig.cancelText}
          isDangerous={deleteConfirm ? true : modalConfig.isDangerous}
          variant={deleteConfirm ? "danger" : modalConfig.variant}
          singleButton={modalConfig.singleButton && !deleteConfirm}
        />
      </div>
    </AdminLayout>
  );
}
