import { apiFetch as fetch } from "../../utils/api";
import { notify } from "../../utils/notify";
import { useEffect, useState } from "react";
import { Check, FolderTree, Pencil, Plus, Trash2, X } from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfirmModal } from "../components/AdminConfirmModal";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useBranding } from "../../context/BrandingContext";

const API = "http://localhost:5000";
const MONTHS = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
const MONTH_SHORTS = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];

type Branch = { id: string; name: string; addressLine1: string; addressLine2: string; phone: string; instagram: string };
type Form = Omit<Branch, "id">;
const emptyForm = (): Form => ({ name: "", addressLine1: "", addressLine2: "", phone: "", instagram: "" });

const card = "bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl";
const inputClass =
  "w-full px-3 py-2 border border-[var(--admin-border,#2a2d2f)] focus:border-[var(--admin-focus,#c0d0e7)] rounded-lg text-[13px] outline-none bg-[var(--admin-canvas,#111114)] text-[var(--admin-text,#f4f4f5)] transition-colors";
const secondaryButton =
  "inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] text-[var(--admin-secondary,#c3c7ca)] hover:bg-[var(--admin-raised,#292b2f)] hover:text-[var(--admin-text,#f4f4f5)] rounded-full text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40";
const primaryButton =
  "inline-flex items-center gap-1.5 px-4 py-2 bg-[#c0d0e7] text-[#111b23] hover:bg-[#d2def0] rounded-full text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-50";

export function AdminBranchesPage() {
  usePageTitle("Cabang — Ignos");
  const { branding, refreshEffectiveBranding } = useBranding();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ mode: "create" | "edit"; id?: string } | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Branch | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`${API}/api/branches`);
      // An older server.js (not restarted after git pull) answers with Express's HTML 404 page.
      if (!res.headers.get("content-type")?.includes("application/json")) {
        throw new Error("Server masih versi lama. Restart server (hentikan lalu jalankan lagi node server.js), kemudian muat ulang halaman ini.");
      }
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || "Gagal memuat cabang.");
      setBranches(body.branches);
      setActiveId(body.activeBranchId);
      setSelectedId(body.activeBranchId);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const afterChange = async (text: string) => {
    await load();
    await refreshEffectiveBranding();
    notify.success(text);
  };

  const saveActive = async () => {
    const res = await fetch(`${API}/api/branch`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId: selectedId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) return void notify.error("Gagal Menyimpan Cabang Komputer Ini", body.error);
    const name = branches.find((b) => b.id === selectedId)?.name;
    await afterChange(name ? `Komputer ini sekarang cabang ${name}.` : "Cabang komputer ini dikosongkan.");
  };

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setDialog({ mode: "create" });
  };

  const openEdit = (b: Branch) => {
    setForm({ name: b.name, addressLine1: b.addressLine1, addressLine2: b.addressLine2, phone: b.phone, instagram: b.instagram });
    setFormError(null);
    setDialog({ mode: "edit", id: b.id });
  };

  const saveBranch = async () => {
    if (!dialog) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(dialog.mode === "create" ? `${API}/api/branches` : `${API}/api/branches/${dialog.id}`, {
        method: dialog.mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.error || `Gagal menyimpan (HTTP ${res.status}).`);
      setDialog(null);
      await afterChange(dialog.mode === "create" ? `Cabang ${body.branch.name} ditambahkan.` : `Cabang ${body.branch.name} diperbarui.`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    const res = await fetch(`${API}/api/branches/${target.id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) return void notify.error("Gagal Menghapus Cabang", body.error);
    await afterChange(`Cabang ${target.name} dihapus. Sesi lama tetap menyimpan nama cabangnya.`);
  };

  const now = new Date();
  const selected = branches.find((b) => b.id === selectedId);
  const drivePath = ["Folder Induk", ...(selected ? [selected.name] : []), MONTHS[now.getMonth()], `${now.getDate()} - ${MONTH_SHORTS[now.getMonth()]}`, "IGNOS STUDIO - 14.05 (nama)"];
  const renaming = dialog?.mode === "edit" && branches.find((b) => b.id === dialog.id)?.name.toLowerCase() !== form.name.trim().toLowerCase();

  return (
    <AdminLayout>
      <div className="w-full px-5 pb-8 pt-3 lg:px-[34px] space-y-7 text-[13px]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[var(--admin-border,#2a2d2f)]">
          <div>
            <p className="text-[12px] tracking-[0.14em] text-[var(--admin-muted,#92989d)] uppercase font-medium">Pengaturan Studio</p>
            <h1 className="text-[28px] sm:text-[30px] font-semibold tracking-[-0.04em] text-[var(--admin-text,#f4f4f5)] leading-[1.25] mt-1.5">Cabang Studio</h1>
            <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.8] mt-1 max-w-2xl">
              Alamat, nomor WA, dan Instagram tiap cabang dipakai di struk, pesan softcopy, folder Google Drive, dan dicatat di setiap sesi.
            </p>
          </div>
          <button type="button" onClick={openCreate} className={primaryButton}>
            <Plus size={13} />
            Tambah Cabang
          </button>
        </div>

        {loadError && (
          <div className="p-4 rounded-[8px] bg-[var(--admin-alert,#3b2d3c)] text-[var(--admin-pending,#d7b8d6)]">{loadError}</div>
        )}
        {/* ── This computer ── */}
        <div className={`${card} p-5 space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--admin-text,#f4f4f5)]">Komputer Ini</h2>
              <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">Diatur terpisah di tiap komputer (Mac mini, MacBook, PC Windows).</p>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--admin-border,#2a2d2f)] text-[var(--admin-secondary,#c3c7ca)]">
              Aktif: <strong className="text-[var(--admin-text,#f4f4f5)]">{branches.find((b) => b.id === activeId)?.name || "Belum diatur"}</strong>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Cabang komputer ini">
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                role="radio"
                aria-checked={selectedId === b.id}
                onClick={() => setSelectedId(b.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-medium border transition-colors cursor-pointer ${
                  selectedId === b.id
                    ? "border-[#c0d0e7] bg-[var(--admin-raised,#292b2f)] text-[var(--admin-text,#f4f4f5)]"
                    : "border-[var(--admin-border,#2a2d2f)] text-[var(--admin-secondary,#c3c7ca)] hover:bg-[var(--admin-raised,#292b2f)]"
                }`}
              >
                {selectedId === b.id && <Check size={12} />}
                {b.name}
              </button>
            ))}
            <button type="button" onClick={saveActive} disabled={selectedId === activeId} className={`${primaryButton} ml-auto`}>
              Simpan
            </button>
          </div>
          <div className="flex items-start gap-2 text-[12px] text-[var(--admin-muted,#92989d)]">
            <FolderTree size={14} className="mt-0.5 shrink-0" />
            <span className="font-mono break-all">{drivePath.join("  ›  ")}</span>
          </div>
          {!activeId && (
            <p className="text-[12px] text-[var(--admin-pending,#d7b8d6)]">
              Belum diatur: struk & pesan memakai data Identitas Studio, dan upload Drive memakai struktur folder lama tanpa cabang.
            </p>
          )}
        </div>

        {/* ── Branch list ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div key={b.id} className={`${card} p-5 space-y-3 ${b.id === activeId ? "border-[#c0d0e7]" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-[15px] font-semibold text-[var(--admin-text,#f4f4f5)] truncate">{b.name}</h3>
                  {b.id === activeId && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c0d0e7] text-[#111b23] font-medium shrink-0">Komputer ini</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => openEdit(b)} className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-[var(--admin-raised,#292b2f)] text-[var(--admin-secondary,#c3c7ca)] cursor-pointer" aria-label={`Edit ${b.name}`}>
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(b)}
                    disabled={b.id === activeId}
                    title={b.id === activeId ? "Sedang dipakai komputer ini" : `Hapus ${b.name}`}
                    className="w-8 h-8 rounded-full inline-flex items-center justify-center hover:bg-[var(--admin-raised,#292b2f)] text-[var(--admin-secondary,#c3c7ca)] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label={`Hapus ${b.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <dl className="space-y-1.5 text-[12px]">
                {[
                  ["Alamat", [b.addressLine1, b.addressLine2].filter(Boolean).join(", "), branding.address],
                  ["WA / Telepon", b.phone, branding.phone],
                  ["Instagram", b.instagram, branding.instagram],
                ].map(([label, value, fallback]) => (
                  <div key={label} className="flex gap-2">
                    <dt className="w-[92px] shrink-0 text-[var(--admin-muted,#92989d)]">{label}</dt>
                    <dd className={value ? "text-[var(--admin-text,#f4f4f5)]" : "text-[var(--admin-muted,#92989d)] italic"}>
                      {value || `Ikut Identitas Studio${fallback ? ` (${fallback})` : ""}`}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        {/* ── Create / edit dialog ── */}
        {dialog && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className={`${card} shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto`}>
              <div className="flex items-center justify-between p-5">
                <h2 className="text-[16px] font-semibold text-[var(--admin-text,#f4f4f5)]">{dialog.mode === "create" ? "Tambah Cabang" : "Edit Cabang"}</h2>
                <button type="button" onClick={() => setDialog(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--admin-raised,#292b2f)] text-[var(--admin-muted,#92989d)] cursor-pointer" aria-label="Tutup">
                  <X size={15} />
                </button>
              </div>
              <div className="px-6 pb-2 space-y-3">
                {(
                  [
                    ["name", "Nama cabang", "contoh: Tabanan"],
                    ["addressLine1", "Alamat baris 1", "contoh: Jl. Raya Tabanan No. 5"],
                    ["addressLine2", "Alamat baris 2", "contoh: Tabanan, Bali"],
                    ["phone", "Nomor WA / telepon", branding.phone ? `kosong = ${branding.phone}` : "contoh: 081234567890"],
                    ["instagram", "Instagram", branding.instagram ? `kosong = ${branding.instagram}` : "contoh: @ignos.tabanan"],
                  ] as [keyof Form, string, string][]
                ).map(([key, label, placeholder]) => (
                  <label key={key} className="block">
                    <span className="font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block text-[12px]">{label}</span>
                    <input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className={inputClass} />
                  </label>
                ))}
                <p className="text-[11px] text-[var(--admin-muted,#92989d)] leading-relaxed">
                  Kolom yang dikosongkan otomatis memakai nilai di Identitas Studio.
                </p>
                {renaming && (
                  <p className="text-[11px] text-[var(--admin-pending,#d7b8d6)] leading-relaxed">
                    Mengganti nama membuat folder Google Drive baru untuk sesi berikutnya. Folder dan sesi lama tetap memakai nama sebelumnya.
                  </p>
                )}
                {formError && <p className="text-[12px] text-[var(--admin-pending,#d7b8d6)]">{formError}</p>}
              </div>
              <div className="flex gap-2.5 p-4">
                <button type="button" onClick={() => setDialog(null)} className={`${secondaryButton} flex-1 justify-center`}>Batal</button>
                <button type="button" onClick={saveBranch} disabled={saving || !form.name.trim()} className={`${primaryButton} flex-1 justify-center`}>
                  {saving ? "Menyimpan..." : "Simpan Cabang"}
                </button>
              </div>
            </div>
          </div>
        )}

        <AdminConfirmModal
          isOpen={!!deleting}
          onClose={() => setDeleting(null)}
          onConfirm={confirmDelete}
          title={`Hapus cabang ${deleting?.name ?? ""}?`}
          category="Cabang"
          description="Cabang akan dihapus dari daftar. Sesi lama tetap menyimpan nama cabangnya, dan folder Google Drive tidak ikut terhapus."
          confirmText="Hapus"
          isDangerous
          variant="danger"
        />
      </div>
    </AdminLayout>
  );
}
