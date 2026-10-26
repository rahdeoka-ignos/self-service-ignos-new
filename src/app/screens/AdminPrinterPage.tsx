import { useEffect, useState } from "react";
import { Plus, Printer, Trash2, Pencil, X, RefreshCw, AlertTriangle, CheckCircle2, AlertCircle, Ban, Play, ShieldAlert, FileText, Check } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { BrutalistButton } from "../components/BrutalistButton";
import type { PrinterProfile, PrintersData, ProductType, SystemPrinter, PrinterMonitorResponse, PrinterStatusInfo, PrinterAlertInfo } from "../../types/printer";

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
      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black leading-tight">Printer Manager</h1>
            <p className="text-gray-500 font-medium mt-1">
              Kelola profil auto-print per jenis produk (media type diatur di Windows Printer Preferences)
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-3 bg-black text-white font-bold border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-base"
          >
            <Plus size={18} strokeWidth={2.5} />
            Tambah Profil
          </button>
        </div>

        {systemPrinterError && (
          <div className="mb-6 p-4 border-4 border-black rounded-xl bg-yellow-100 font-bold text-sm">
            ⚠ {systemPrinterError} — pastikan server.js jalan di Windows dan SumatraPDF terpasang.
          </div>
        )}

        {/* ── LIVE PRINTER MONITOR CARD ── */}
        <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b-3 border-gray-200 gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center font-black">
                  <Printer size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-2xl font-black leading-tight flex items-center gap-2">
                    <span>Live Printer Monitor</span>
                    {monitorData?.hasError ? (
                      <span className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                        <AlertTriangle size={12} strokeWidth={3} /> Ada Masalah
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-800 border-2 border-green-500 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={12} strokeWidth={3} /> Normal
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-gray-500 font-bold mt-0.5">
                    Deteksi otomatis kertas habis, tray tertutup, dan antrean cetak Windows Spooler
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Clear spooler jobs */}
              <button
                onClick={handleClearJobs}
                disabled={clearingJobs}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-700 hover:border-red-500 border-2 border-black rounded-xl text-xs font-black transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                title="Batalkan antrean cetak yang macet di Windows"
              >
                <Ban size={14} />
                <span>{clearingJobs ? "Membersihkan..." : "Bersihkan Antrean"}</span>
              </button>

              {/* Refresh button */}
              <button
                onClick={fetchMonitorStatus}
                disabled={monitorLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-black text-white hover:bg-yellow-300 hover:text-black border-2 border-black rounded-xl text-xs font-black transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <RefreshCw size={14} className={monitorLoading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Active Alert Banner if any */}
          {monitorData?.alert && (
            <div className="mb-6 p-4 border-3 border-black rounded-2xl bg-red-50 text-red-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={22} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-base">{monitorData.alert.title}</span>
                    {monitorData.alert.isSimulated && (
                      <span className="bg-yellow-300 text-black text-[10px] font-black px-2 py-0.5 rounded border border-black uppercase">
                        Mode Simulasi
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-red-800 mb-2">
                    {monitorData.alert.adminMessage}
                  </p>
                  <p className="text-xs bg-white/80 p-2.5 rounded-lg border border-red-300 text-gray-700 font-medium">
                    <strong className="text-black">Teks di layar kiosk customer:</strong> "{monitorData.alert.customerMessage}"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Grid of Monitored Printers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {(monitorData?.printers || []).map((pr) => {
              const hasProfiles = pr.profiles.length > 0;
              const isError = pr.statusCode !== "ready" && pr.statusCode !== "printing";

              return (
                <div
                  key={pr.name}
                  className={`border-3 rounded-2xl p-4 transition-all ${
                    isError
                      ? "bg-red-50/50 border-red-500 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]"
                      : "bg-gray-50 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-black text-base truncate max-w-[200px]" title={pr.name}>
                      {pr.name}
                    </p>
                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                        pr.statusCode === "ready"
                          ? "bg-green-100 text-green-800 border-green-600"
                          : pr.statusCode === "printing"
                            ? "bg-blue-100 text-blue-800 border-blue-600 animate-pulse"
                            : pr.statusCode === "offline"
                              ? "bg-gray-200 text-gray-700 border-gray-400"
                              : "bg-red-500 text-white border-black animate-pulse"
                      }`}
                    >
                      {pr.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs font-bold text-gray-600 mb-3">
                    <p className="flex justify-between">
                      <span className="text-gray-400 uppercase tracking-wider text-[10px]">Profil Ignos:</span>
                      <span className="text-black">
                        {hasProfiles ? pr.profiles.map((p) => p.label).join(", ") : "(Belum dipetakan)"}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400 uppercase tracking-wider text-[10px]">Antrean Spooler:</span>
                      <span className={pr.jobsCount > 0 ? "text-red-600 font-black" : "text-black"}>
                        {pr.jobsCount} dokumen
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── TEST SIMULATOR CONTROLS ── */}
          <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-yellow-900 flex items-center gap-1.5">
                  <Play size={14} className="text-yellow-700" />
                  <span>Uji Coba Tampilan Peringatan Layar Kiosk:</span>
                </p>
                <p className="text-[11px] text-yellow-800 font-medium">
                  Tes tampilan modal customer tanpa perlu sengaja membuat printer fisik error
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => handleSimulateAlert("normal")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer ${
                    simulatingType === "normal"
                      ? "bg-black text-white shadow-none"
                      : "bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  ✓ Normal
                </button>
                <button
                  onClick={() => handleSimulateAlert("paper_out")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer ${
                    simulatingType === "paper_out"
                      ? "bg-red-500 text-white shadow-none"
                      : "bg-white text-red-600 hover:bg-red-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  ⚠️ Kertas Habis
                </button>
                <button
                  onClick={() => handleSimulateAlert("door_open")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer ${
                    simulatingType === "door_open"
                      ? "bg-yellow-400 text-black shadow-none"
                      : "bg-white text-black hover:bg-yellow-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  🚪 Tray Tertutup
                </button>
                <button
                  onClick={() => handleSimulateAlert("paper_jam")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer ${
                    simulatingType === "paper_jam"
                      ? "bg-orange-500 text-white shadow-none"
                      : "bg-white text-orange-600 hover:bg-orange-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  📄 Paper Jam
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── STATS & PROFILES ── */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Profil</p>
            <p className="text-3xl font-black">{profiles.length}</p>
          </div>
          <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Printer Terdeteksi (Windows)</p>
            <p className="text-3xl font-black">{systemPrinters.length}</p>
          </div>
        </div>

        {!data ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-lg font-bold text-gray-400">Memuat printer profiles...</p>
            </div>
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border-4 border-dashed border-black rounded-2xl bg-white">
            <div className="w-16 h-16 bg-gray-100 border-4 border-black rounded-2xl flex items-center justify-center mb-4">
              <Printer size={28} strokeWidth={2} className="text-gray-400" />
            </div>
            <p className="text-lg font-bold text-gray-400 mb-1">Belum ada profil printer</p>
            <p className="text-sm text-gray-400">Tambah profil untuk mengaktifkan auto-print</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-white border-4 border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shrink-0">
                    <Printer size={18} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(profile)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-black hover:bg-black hover:text-white transition-colors"
                    >
                      <Pencil size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(profile)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-black hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                    >
                      <Trash2 size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
                <p className="font-black text-lg leading-tight mb-1">{profile.label}</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-3">
                  {profile.printerName}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {profile.appliesTo.map((type) => (
                    <span
                      key={type}
                      className="text-[10px] font-black px-2 py-1 bg-gray-100 border-2 border-black rounded-md uppercase"
                    >
                      {PRODUCT_TYPE_OPTIONS.find((o) => o.value === type)?.label || type}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 font-bold">Copies: {profile.copies || 1}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create/Edit Dialog ── */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b-4 border-black">
              <h2 className="text-xl font-black">
                {editProfile ? "Edit Profil Printer" : "Tambah Profil Printer"}
              </h2>
              <button
                onClick={() => setDialogOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                  Nama Profil
                </label>
                <input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Contoh: 4R Glossy"
                  className="w-full px-4 py-2.5 border-2 border-black rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                  Printer Windows
                </label>
                {systemPrinters.length > 0 ? (
                  <select
                    value={form.printerName}
                    onChange={(e) => setForm((f) => ({ ...f, printerName: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-black rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-black"
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
                    className="w-full px-4 py-2.5 border-2 border-black rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-black"
                  />
                )}
                <p className="text-xs text-gray-400 mt-1.5">
                  Media type (glossy/plain/dll) diatur lewat Windows Printer Preferences untuk instance printer ini, bukan dari sini.
                </p>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                  Berlaku Untuk Produk
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRODUCT_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleProductType(opt.value)}
                      className={`text-xs font-bold px-3 py-1.5 border-2 border-black rounded-lg transition-colors ${
                        form.appliesTo.includes(opt.value)
                          ? "bg-black text-white"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                  Jumlah Copies
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.copies}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, copies: Math.max(1, Number(e.target.value) || 1) }))
                  }
                  className="w-full px-4 py-2.5 border-2 border-black rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t-4 border-black">
              <BrutalistButton
                size="sm"
                variant="secondary"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
              >
                Batal
              </BrutalistButton>
              <BrutalistButton
                size="sm"
                onClick={handleSave}
                className="flex-1"
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </BrutalistButton>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full p-6">
            <h2 className="text-xl font-black mb-2">Hapus Profil?</h2>
            <p className="text-gray-500 font-medium mb-6">
              Profil "{deleteConfirm.label}" akan dihapus. Auto-print untuk produk terkait akan berhenti sampai profil baru dibuat.
            </p>
            <div className="flex gap-3">
              <BrutalistButton
                size="sm"
                variant="secondary"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1"
              >
                Batal
              </BrutalistButton>
              <BrutalistButton
                size="sm"
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-red-500! hover:bg-red-600! border-red-500!"
              >
                Hapus
              </BrutalistButton>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
