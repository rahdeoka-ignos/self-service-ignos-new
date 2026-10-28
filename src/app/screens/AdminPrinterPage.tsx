import { useEffect, useState } from "react";
import {
  Plus,
  Printer,
  Trash2,
  Pencil,
  X,
  RefreshCw,
  Ban,
  Check,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
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
  { value: "struk", label: "Struk" },
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

  const fetchData = () => {
    fetch(`${API}/api/printers`)
      .then((r) => r.json())
      .then((d: PrintersData) => setData(d));
  };

  const fetchSystemPrinters = () => {
    fetch(`${API}/api/system-printers`)
      .then((r) => {
        if (!r.ok) throw new Error("Gagal memuat daftar printer sistem");
        return r.json();
      })
      .then((list: SystemPrinter[]) => {
        setSystemPrinters(list);
        setSystemPrinterError(null);
      })
      .catch((err) => setSystemPrinterError(err.message));
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
    } finally {
      setMonitorLoading(false);
    }
  };

  const handleClearJobs = async () => {
    if (!confirm("Bersihkan semua antrean cetak yang macet di Windows Spooler?")) return;
    try {
      setClearingJobs(true);
      const res = await fetch(`${API}/api/printers/clear-jobs`, { method: "POST" });
      if (res.ok) {
        await fetchMonitorStatus();
      }
    } catch (err) {
      alert("Gagal membersihkan antrean: " + err);
    } finally {
      setClearingJobs(false);
    }
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

  useEffect(() => {
    fetchData();
    fetchSystemPrinters();
    fetchMonitorStatus();

    const interval = setInterval(fetchMonitorStatus, 3500);
    return () => clearInterval(interval);
  }, []);

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
    if (!form.label.trim() || !form.printerName.trim() || form.appliesTo.length === 0) return;
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
    await fetch(`${API}/api/printers/${profile.id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchData();
  };

  const profiles = data?.profiles || [];

  return (
    <AdminLayout>
      <div className="w-full p-6 md:p-8 space-y-6">
        {/* ── 1. HEADER (Amara: dash-heading) ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
          <div>
            <p className="text-[10px] tracking-[0.14em] text-[#999] uppercase font-medium">
              HARDWARE DISPATCH & SPOOLER
            </p>
            <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-[-0.045em] text-[#202020] leading-[1.25] mt-1.5">
              Printer & Kertas
            </h1>
            <p className="text-[13px] text-[#888] leading-[1.8] mt-1">
              Kelola profil auto-print per jenis produk dan monitor antrean cetak Windows Spooler.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#171717] text-white hover:bg-black rounded-[7px] text-[13px] font-medium transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Tambah Profil</span>
          </button>
        </div>

        {systemPrinterError && (
          <div className="p-3.5 border border-[#fed7aa] rounded-[9px] bg-[#fffaf5] text-[#9a3412] text-[13px]">
            ⚠ {systemPrinterError} — pastikan server.js berjalan di Windows dan SumatraPDF terpasang.
          </div>
        )}

        {/* ── 2. LIVE PRINTER MONITOR PANEL (Amara: dash-panel) ── */}
        <section
          aria-label="Live Printer Monitor"
          className="bg-white border border-[#e5e5e5] rounded-[14px] p-6 space-y-5"
        >
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#eee]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[8px] bg-[#f4f4f4] border border-[#e8e8e8] flex items-center justify-center text-[#444] shrink-0">
                <Printer size={16} strokeWidth={1.5} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[17px] font-semibold text-[#202020] tracking-[-0.03em]">
                    Monitor Status Printer
                  </h2>
                  {monitorData?.hasError ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-[11px] bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
                      Ada Masalah
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-[11px] bg-[#f1f1f1] text-[#444]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                      Normal
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#888] mt-0.5">
                  Deteksi otomatis kertas habis, tray tertutup, dan antrean cetak Windows Spooler
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Clear Spooler Jobs */}
              <button
                type="button"
                onClick={handleClearJobs}
                disabled={clearingJobs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#444] border border-[#e6e6e6] hover:bg-[#f4f4f4] hover:text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                title="Batalkan antrean cetak yang macet di Windows"
              >
                <Ban size={13} strokeWidth={1.5} />
                <span>{clearingJobs ? "Membersihkan..." : "Bersihkan Antrean"}</span>
              </button>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={fetchMonitorStatus}
                disabled={monitorLoading}
                className="w-[32px] h-[32px] rounded-full border border-[#e6e6e6] bg-white hover:bg-[#f4f4f4] inline-flex items-center justify-center text-[#666] cursor-pointer transition-colors"
                title="Perbarui status printer"
              >
                <RefreshCw
                  size={14}
                  strokeWidth={1.5}
                  className={monitorLoading ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          {/* Active Alert Banner (Clean Editorial Amara Style) */}
          {monitorData?.alert && (
            <div className="p-4 border border-[#e8e8e8] rounded-[10px] bg-[#fafafa] text-[#202020] space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-[11px] bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
                    Peringatan
                  </span>
                  <strong className="text-[13px] font-semibold text-[#202020]">
                    {monitorData.alert.title}
                  </strong>
                </div>

                {monitorData.alert.isSimulated && (
                  <span className="text-[10px] font-medium text-[#777] uppercase tracking-[0.08em] bg-[#f0f0f0] border border-[#e4e4e4] px-2 py-0.5 rounded">
                    MODE SIMULASI
                  </span>
                )}
              </div>

              <p className="text-[13px] text-[#555] leading-relaxed">
                {monitorData.alert.adminMessage}
              </p>

              <div className="bg-white border border-[#eee] rounded-[7px] p-2.5 text-[12px] text-[#666]">
                <span className="text-[#999] block text-[11px] mb-0.5 uppercase tracking-wider font-medium">
                  Teks di Layar Kiosk Customer:
                </span>
                <p className="font-medium text-[#333]">"{monitorData.alert.customerMessage}"</p>
              </div>
            </div>
          )}

          {/* Monitored Printers Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(monitorData?.printers || []).map((pr) => {
              const hasProfiles = pr.profiles.length > 0;
              const isError = pr.statusCode !== "ready" && pr.statusCode !== "printing";

              return (
                <div
                  key={pr.name}
                  className="bg-white border border-[#e8e8e8] rounded-[10px] p-4 hover:border-[#d0d0d0] transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p
                        className="font-medium text-[13px] text-[#202020] truncate"
                        title={pr.name}
                      >
                        {pr.name}
                      </p>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-[11px] font-medium shrink-0 ${
                          pr.statusCode === "ready"
                            ? "bg-[#f1f1f1] text-[#444]"
                            : pr.statusCode === "printing"
                              ? "bg-[#e0f2fe] text-[#0369a1]"
                              : "bg-[#f4f4f4] text-[#777]"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            pr.statusCode === "ready"
                              ? "bg-[#10b981]"
                              : pr.statusCode === "printing"
                                ? "bg-[#0284c7]"
                                : "bg-[#9ca3af]"
                          }`}
                        />
                        {pr.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[12px] pt-1 border-t border-[#f5f5f5]">
                      <div className="flex justify-between">
                        <span className="text-[#888]">Profil Ignos:</span>
                        <span className="text-[#444] font-medium truncate ml-2">
                          {hasProfiles
                            ? pr.profiles.map((p) => p.label).join(", ")
                            : "(Belum dipetakan)"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#888]">Antrean Spooler:</span>
                        <span
                          className={`font-mono ${
                            pr.jobsCount > 0 ? "text-[#b91c1c] font-semibold" : "text-[#444]"
                          }`}
                        >
                          {pr.jobsCount} dokumen
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 3. TEST SIMULATOR CONTROLS (Clean Monochrome Segmented Pills) ── */}
          <div className="p-3.5 bg-[#fafafa] border border-[#e8e8e8] rounded-[10px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold text-[#202020]">
                  Uji Coba Tampilan Modal di Layar Kiosk
                </p>
                <p className="text-[11px] text-[#888] mt-0.5">
                  Tes tampilan modal customer tanpa perlu sengaja membuat printer fisik error
                </p>
              </div>

              {/* Clean Segmented Control (Zero Emojis, Zero Rainbow Colors) */}
              <div className="flex items-center gap-1 bg-[#ebebeb]/70 p-1 rounded-[8px] border border-[#e2e2e2] flex-wrap">
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
                      className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#171717] text-white shadow-xs"
                          : "text-[#666] hover:text-[#171717] hover:bg-white/60"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. STATS OVERVIEW CARDS (Amara Metric Cards) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <article className="bg-white border border-[#e5e5e5] rounded-[12px] p-5 hover:border-[#d0d0d0] transition-colors flex flex-col justify-between">
            <span className="text-[10px] tracking-[0.14em] text-[#999] uppercase font-medium">
              PROFIL PRINTER TERPASANG
            </span>
            <div className="mt-3">
              <p className="text-[32px] leading-tight tracking-[-0.05em] font-semibold text-[#202020]">
                {profiles.length}
                <small className="text-[16px] text-[#aaa] font-normal tracking-[-0.02em] ml-1">
                  profil
                </small>
              </p>
              <p className="text-[12px] text-[#999] leading-[1.7] mt-1.5">
                Profil auto-print terkonfigurasi untuk transaksi di kiosk
              </p>
            </div>
          </article>

          <article className="bg-white border border-[#e5e5e5] rounded-[12px] p-5 hover:border-[#d0d0d0] transition-colors flex flex-col justify-between">
            <span className="text-[10px] tracking-[0.14em] text-[#999] uppercase font-medium">
              PRINTER TERDETEKSI (WINDOWS)
            </span>
            <div className="mt-3">
              <p className="text-[32px] leading-tight tracking-[-0.05em] font-semibold text-[#202020]">
                {systemPrinters.length}
                <small className="text-[16px] text-[#aaa] font-normal tracking-[-0.02em] ml-1">
                  driver
                </small>
              </p>
              <p className="text-[12px] text-[#999] leading-[1.7] mt-1.5">
                Perangkat printer fisik/virtual aktif di sistem operasi Windows
              </p>
            </div>
          </article>
        </div>

        {/* ── 5. PROFILES LIST (Amara Panel) ── */}
        <section aria-label="Daftar Profil Printer" className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-[18px] font-semibold text-[#202020] tracking-[-0.03em] flex items-center gap-2">
              <span>Daftar Profil Auto-Print</span>
              <span className="text-[12px] bg-[#f4f4f4] border border-[#e8e8e8] rounded-[5px] px-2 py-0.5 text-[#888] font-normal">
                {profiles.length}
              </span>
            </h2>
          </div>

          {!data ? (
            <div className="flex items-center justify-center py-20 bg-white border border-[#e5e5e5] rounded-[14px]">
              <div className="text-center">
                <RefreshCw size={20} className="animate-spin text-[#999] mx-auto mb-2" />
                <p className="text-[13px] text-[#888]">Memuat profil printer...</p>
              </div>
            </div>
          ) : profiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#dcdcdc] rounded-[14px] bg-white text-center p-6">
              <div className="w-10 h-10 bg-[#f4f4f4] rounded-full flex items-center justify-center mb-3 text-[#888]">
                <Printer size={18} strokeWidth={1.5} />
              </div>
              <p className="text-[14px] font-semibold text-[#202020] mb-0.5">
                Belum ada profil printer
              </p>
              <p className="text-[12px] text-[#888] mb-4">
                Tambah profil untuk mengaktifkan cetak otomatis foto dari kiosk
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#171717] text-white hover:bg-black rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer"
              >
                <Plus size={14} strokeWidth={2} />
                <span>Tambah Profil Pertama</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="bg-white border border-[#e5e5e5] rounded-[12px] p-4 hover:border-[#d0d0d0] transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-8 h-8 bg-[#f4f4f4] border border-[#e8e8e8] text-[#444] rounded-[7px] flex items-center justify-center shrink-0">
                        <Printer size={15} strokeWidth={1.5} />
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(profile)}
                          className="w-7 h-7 flex items-center justify-center rounded-md border border-[#e8e8e8] hover:bg-[#f4f4f4] text-[#666] hover:text-[#171717] transition-colors cursor-pointer"
                          title="Edit profil"
                        >
                          <Pencil size={12} strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(profile)}
                          className="w-7 h-7 flex items-center justify-center rounded-md border border-[#e8e8e8] hover:bg-[#fee2e2] hover:border-[#fecaca] text-[#888] hover:text-[#b91c1c] transition-colors cursor-pointer"
                          title="Hapus profil"
                        >
                          <Trash2 size={12} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    <p className="font-semibold text-[14px] text-[#202020] mb-0.5">
                      {profile.label}
                    </p>
                    <p className="text-[11px] text-[#888] font-mono mb-2.5 truncate">
                      {profile.printerName}
                    </p>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {profile.appliesTo.map((type) => (
                        <span
                          key={type}
                          className="text-[10px] font-medium px-2 py-0.5 bg-[#f4f4f4] text-[#555] border border-[#e8e8e8] rounded-[5px]"
                        >
                          {PRODUCT_TYPE_OPTIONS.find((o) => o.value === type)?.label || type}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[#f5f5f5] text-[11px] text-[#888] flex justify-between">
                    <span>Jumlah Cetak:</span>
                    <span className="font-medium text-[#202020]">{profile.copies || 1} copy</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 6. FOOTER ── */}
        <footer className="flex justify-between items-center text-[12px] text-[#aaa] pt-2 pb-6 border-t border-[#eee]">
          <p>© 2026 Ignos Studio. Photobooth Station.</p>
          <span className="hidden sm:inline">Tenang di depan. Tertata di balik layar.</span>
        </footer>
      </div>

      {/* ── Create/Edit Dialog (Clean Amara Dialog) ── */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#e5e5e5] rounded-[14px] shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between p-5 border-b border-[#eee]">
              <h2 className="text-[16px] font-semibold text-[#202020]">
                {editProfile ? "Edit Profil Printer" : "Tambah Profil Printer"}
              </h2>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f4f4f4] text-[#888] hover:text-[#202020] cursor-pointer"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-[13px]">
              <div>
                <label className="font-medium text-[#333] mb-1 block text-[12px]">
                  Nama Profil
                </label>
                <input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Contoh: 4R Glossy"
                  className="w-full px-3 py-2 border border-[#e2e2e2] rounded-[7px] text-[13px] outline-none focus:border-[#999] bg-white transition-colors"
                />
              </div>

              <div>
                <label className="font-medium text-[#333] mb-1 block text-[12px]">
                  Printer Windows
                </label>
                {systemPrinters.length > 0 ? (
                  <select
                    value={form.printerName}
                    onChange={(e) => setForm((f) => ({ ...f, printerName: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#e2e2e2] rounded-[7px] text-[13px] outline-none focus:border-[#999] bg-white cursor-pointer"
                  >
                    <option value="">Pilih printer...</option>
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
                    placeholder="Nama persis printer di Windows"
                    className="w-full px-3 py-2 border border-[#e2e2e2] rounded-[7px] text-[13px] outline-none focus:border-[#999] bg-white transition-colors"
                  />
                )}
                <p className="text-[11px] text-[#888] mt-1">
                  Media type (glossy/plain/dll) diatur lewat Windows Printer Preferences untuk instance printer ini.
                </p>
              </div>

              <div>
                <label className="font-medium text-[#333] mb-1.5 block text-[12px]">
                  Berlaku Untuk Produk
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRODUCT_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleProductType(opt.value)}
                      className={`text-[12px] font-medium px-2.5 py-1 rounded-[6px] transition-colors cursor-pointer ${
                        form.appliesTo.includes(opt.value)
                          ? "bg-[#171717] text-white shadow-xs"
                          : "bg-[#f4f4f4] text-[#555] hover:bg-[#eaeaea]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-medium text-[#333] mb-1 block text-[12px]">
                  Jumlah Copies
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.copies}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, copies: Math.max(1, Number(e.target.value) || 1) }))
                  }
                  className="w-full px-3 py-2 border border-[#e2e2e2] rounded-[7px] text-[13px] outline-none focus:border-[#999] bg-white transition-colors"
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
                className="flex-1 bg-[#171717] text-white hover:bg-black rounded-[7px] py-2 text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Profil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#e5e5e5] rounded-[14px] shadow-xl max-w-sm w-full p-5 animate-fadeIn">
            <h2 className="text-[16px] font-semibold text-[#202020] mb-1">Hapus Profil?</h2>
            <p className="text-[12px] text-[#666] mb-5 leading-relaxed">
              Profil "{deleteConfirm.label}" akan dihapus. Auto-print untuk produk terkait akan berhenti sampai profil baru dibuat.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-[#b91c1c] text-white hover:bg-[#991b1b] rounded-[7px] py-2 text-[12px] font-medium transition-colors cursor-pointer"
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-white text-[#555] border border-[#e2e2e2] hover:bg-[#f4f4f4] rounded-[7px] py-2 text-[12px] font-medium transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
