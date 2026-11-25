import { apiFetch as fetch } from "../../utils/api";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { Plus, Pencil, Trash2, RefreshCw, Search } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AdminLayout } from "../components/AdminLayout";
import { AdminConfirmModal } from "../components/AdminConfirmModal";
import { usePageTitle } from "../../hooks/usePageTitle";
import type {
  TemplateEntry,
  TemplatesData,
} from "../../types/template";

const API = "http://localhost:5000";

export function AdminTemplatePage() {
  usePageTitle("Kelola Template Foto — Ignos");
  const navigate = useNavigate();

  const [data, setData] = useState<TemplatesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("basic");
  const [deleteConfirm, setDeleteConfirm] = useState<TemplateEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [layoutFilter, setLayoutFilter] = useState<string>("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/templates`);
      if (res.ok) {
        const d: TemplatesData = await res.json();
        setData(d);
        if (!d.templates[activeCategory] && d.categories.length > 0) {
          setActiveCategory(d.categories[0].id);
        }
      }
    } catch (err) {
      console.error("Gagal memuat template:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (tpl: TemplateEntry) => {
    try {
      await fetch(`${API}/api/templates/${tpl.id}?deleteFiles=false`, {
        method: "DELETE",
      });
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      console.error("Gagal menghapus template:", err);
    }
  };

  const totalTemplates = useMemo(() => {
    if (!data) return 0;
    return Object.values(data.templates).reduce((sum, list) => sum + list.length, 0);
  }, [data]);

  const customLayoutCount = useMemo(() => {
    if (!data) return 0;
    return Object.values(data.templates)
      .flat()
      .filter((t) => t.layout === "custom").length;
  }, [data]);

  const standardLayoutCount = useMemo(() => {
    return totalTemplates - customLayoutCount;
  }, [totalTemplates, customLayoutCount]);

  const currentCategoryObj = useMemo(() => {
    return data?.categories.find((c) => c.id === activeCategory);
  }, [data, activeCategory]);

  const filteredTemplates = useMemo(() => {
    if (!data) return [];
    let list = data.templates[activeCategory] || [];

    if (layoutFilter === "custom") {
      list = list.filter((t) => t.layout === "custom");
    } else if (layoutFilter === "builtin") {
      list = list.filter((t) => t.layout !== "custom");
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((t) => t.name.toLowerCase().includes(q));
  }, [data, activeCategory, layoutFilter, searchQuery]);

  return (
    <AdminLayout>
      <div className="w-full px-5 pb-8 pt-3 lg:px-[34px] space-y-7">
        {/* ── 1. HEADER & ACTIONS ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[var(--admin-border,#2a2d2f)]">
          <div>
            <p className="text-[12px] tracking-[0.14em] text-[var(--admin-muted,#92989d)] uppercase font-medium">
              KATALOG & TATA LETAK FOTO
            </p>
            <h1 className="text-[28px] sm:text-[30px] font-semibold tracking-[-0.04em] text-[var(--admin-text,#f4f4f5)] leading-[1.25] mt-1.5">
              Koleksi Template Bilik
            </h1>
            <p className="text-[13px] text-[var(--admin-muted,#92989d)] leading-[1.8] mt-1 max-w-2xl">
              Atur desain frame grafis, slot penempatan foto, serta layout cetak yang tersedia untuk customer di bilik foto.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="w-[34px] h-[34px] rounded-full border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] inline-flex items-center justify-center text-[var(--admin-secondary,#c3c7ca)] cursor-pointer transition-colors"
              title="Segarkan data template"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-[var(--admin-muted,#92989d)]" : "text-[var(--admin-muted,#92989d)]"} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/admin/templates/new")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#c0d0e7] text-[#111b23] hover:bg-[#d2def0] rounded-full text-[12px] font-medium transition-colors cursor-pointer "
            >
              <Plus size={13} />
              <span>Tambah Template</span>
            </button>
          </div>
        </div>

        {/* ── 2. 4 EXECUTIVE KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-5 space-y-3">
            <span className="text-[12px] font-medium text-[var(--admin-muted,#92989d)]">Total Desain Frame</span>
            <div>
              <div className="text-[28px] font-semibold text-[var(--admin-text,#f4f4f5)] font-mono tracking-tight">
                {totalTemplates}
                <span className="text-[14px] text-[var(--admin-muted,#92989d)] font-normal font-sans ml-1">desain</span>
              </div>
              <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                Akumulasi seluruh kategori aktif
              </p>
            </div>
            <div className="pt-2  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between text-[12px] text-[var(--admin-muted,#92989d)]">
              <span>Format Cetak 4R (2400×3600px)</span>
            </div>
          </div>

          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-5 space-y-3">
            <span className="text-[12px] font-medium text-[var(--admin-muted,#92989d)]">Kategori Bilik Foto</span>
            <div>
              <div className="text-[28px] font-semibold text-[var(--admin-text,#f4f4f5)] font-mono tracking-tight">
                {data?.categories.length ?? 0}
                <span className="text-[14px] text-[var(--admin-muted,#92989d)] font-normal font-sans ml-1">grup</span>
              </div>
              <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                Pilihan tema untuk pengunjung
              </p>
            </div>
            <div className="pt-2  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between text-[12px] text-[var(--admin-muted,#92989d)]">
              <span>Kategori: {currentCategoryObj?.name || "Semua"}</span>
            </div>
          </div>

          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-5 space-y-3">
            <span className="text-[12px] font-medium text-[var(--admin-muted,#92989d)]">Custom Layout Canvas</span>
            <div>
              <div className="text-[28px] font-semibold text-[var(--admin-text,#f4f4f5)] font-mono tracking-tight">
                {customLayoutCount}
                <span className="text-[14px] text-[var(--admin-muted,#92989d)] font-normal font-sans ml-1">frame</span>
              </div>
              <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                Slot koordinat presisi & rotasi bebas
              </p>
            </div>
            <div className="pt-2  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between text-[12px] text-[var(--admin-muted,#92989d)]">
              <span>Kanvas Interaktif</span>
            </div>
          </div>

          <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-5 space-y-3">
            <span className="text-[12px] font-medium text-[var(--admin-muted,#92989d)]">Grid Standar Otomatis</span>
            <div>
              <div className="text-[28px] font-semibold text-[var(--admin-text,#f4f4f5)] font-mono tracking-tight">
                {standardLayoutCount}
                <span className="text-[14px] text-[var(--admin-muted,#92989d)] font-normal font-sans ml-1">frame</span>
              </div>
              <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
                Susunan 1, 2, 4, 6, 8 slot foto
              </p>
            </div>
            <div className="pt-2  border-[var(--admin-border,#2a2d2f)] flex items-center justify-between text-[12px] text-[var(--admin-muted,#92989d)]">
              <span>Distribusi simetris</span>
            </div>
          </div>
        </div>

        {/* ── 3. CATEGORY TABS (TYPOGRAPHY-FIRST) & FILTER BAR ── */}
        <div className=" border-[var(--admin-border,#2a2d2f)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Typography-First Navigation Tabs conforming to GEMINI.md Rule 2 */}
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-none">
            {data?.categories.map((cat) => {
              const count = data.templates[cat.id]?.length ?? 0;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearchQuery("");
                  }}
                  className={`rounded-full px-4 py-2 text-[13px] transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? " bg-[var(--admin-tab,#343638)] font-medium text-[var(--admin-text,#f4f4f5)]"
                      : " border-transparent font-medium text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-text,#f4f4f5)]"
                  }`}
                >
                  {cat.name}
                  <span className="ml-1.5 text-[12px] font-mono text-[var(--admin-muted,#92989d)]">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Quick Filter & Search */}
          <div className="flex items-center gap-2.5 pb-2.5 shrink-0">
            <div className="flex items-center gap-2 border border-[var(--admin-border,#2a2d2f)] focus-within:border-[var(--admin-focus,#c0d0e7)] rounded-full px-3 py-1.5 bg-[var(--admin-card,#1c1f20)] text-[12px] transition-colors w-full sm:w-56">
              <Search size={13} className="text-[var(--admin-muted,#92989d)] shrink-0" />
              <input
                type="search"
                placeholder="Cari nama template..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-0 outline-none text-[var(--admin-text,#f4f4f5)] placeholder:text-[var(--admin-muted,#92989d)] text-[12px] p-0"
              />
            </div>

            <select
              value={layoutFilter}
              onChange={(e) => setLayoutFilter(e.target.value)}
              className="border border-[var(--admin-border,#2a2d2f)] focus:border-[var(--admin-focus,#c0d0e7)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--admin-secondary,#c3c7ca)] bg-[var(--admin-canvas,#111114)] outline-none cursor-pointer"
            >
              <option value="all">Semua Layout</option>
              <option value="custom">Custom Slot Saja</option>
              <option value="builtin">Grid Standar</option>
            </select>
          </div>
        </div>

        {/* ── 4. TEMPLATE CARDS GRID ── */}
        {!data && loading ? (
          <div className="py-24 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-[var(--admin-focus,#c0d0e7)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[13px] text-[var(--admin-muted,#92989d)]">Memuat daftar template...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="py-20 text-center space-y-3 border border-dashed border-[var(--admin-border,#2a2d2f)] rounded-2xl bg-[var(--admin-card,#1c1f20)] p-8">
            <p className="text-[15px] font-medium text-[var(--admin-text,#f4f4f5)]">Belum ada template yang sesuai</p>
            <p className="text-[13px] text-[var(--admin-muted,#92989d)] max-w-md mx-auto">
              {searchQuery || layoutFilter !== "all"
                ? "Tidak ada template yang cocok dengan filter atau kata kunci pencarian Anda."
                : `Kategori "${currentCategoryObj?.name || activeCategory}" belum memiliki template foto aktif.`}
            </p>
            {searchQuery || layoutFilter !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setLayoutFilter("all");
                }}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--admin-text,#f4f4f5)] hover:underline cursor-pointer"
              >
                Reset filter pencarian
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/admin/templates/new")}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#c0d0e7] text-[#111b23] hover:bg-[#d2def0] rounded-full text-[12px] font-medium transition-colors cursor-pointer "
              >
                <Plus size={13} />
                <span>Tambah Template Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] hover:border-[#cfcfcf] rounded-2xl overflow-hidden  hover: transition-all flex flex-col justify-between group"
              >
                {/* Preview Frame (4R 2:3 ratio) */}
                <div className="aspect-[2/3] bg-[var(--admin-card,#1c1f20)] relative overflow-hidden flex items-center justify-center  border-[var(--admin-border,#2a2d2f)]">
                  <ImageWithFallback
                    src={tpl.previewTemplate}
                    alt={tpl.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />

                  {/* Layout Badge */}
                  <div className="absolute top-2 left-2">
                    <span className="text-[12px] font-medium font-mono bg-[#c0d0e7]/85  text-[#111b23] px-2 py-0.5 rounded-[4px] uppercase tracking-wider">
                      {tpl.layout === "custom" ? "Custom" : `${tpl.layout} Slot`}
                    </span>
                  </div>

                  {/* Overlay Tag */}
                  {tpl.overlay && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[12px] font-medium bg-[var(--admin-card,#1c1f20)]/90  border border-[var(--admin-border,#2a2d2f)] text-[var(--admin-text,#f4f4f5)] px-1.5 py-0.5 rounded-[4px]">
                        Overlay
                      </span>
                    </div>
                  )}
                </div>

                {/* Details & Actions */}
                <div className="p-3.5 space-y-3">
                  <div>
                    <h3 className="font-medium text-[13px] text-[var(--admin-text,#f4f4f5)] truncate" title={tpl.name}>
                      {tpl.name}
                    </h3>
                    <p className="text-[12px] text-[var(--admin-muted,#92989d)] font-mono mt-0.5">
                      {tpl.slots ? `${tpl.slots.length} custom slot` : "Built-in layout"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-2  border-[var(--admin-border,#2a2d2f)]">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/templates/edit/${tpl.id}`)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[var(--admin-card,#1c1f20)] hover:bg-[var(--admin-raised,#292b2f)] border border-[var(--admin-border,#2a2d2f)] text-[var(--admin-text,#f4f4f5)] hover:text-[var(--admin-text,#f4f4f5)] text-[12px] font-medium rounded-[6px] transition-colors cursor-pointer"
                    >
                      <Pencil size={11} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(tpl)}
                      className="w-7 h-7 inline-flex items-center justify-center border border-[var(--admin-border,#2a2d2f)] hover:border-[var(--admin-border,#2a2d2f)] hover:bg-[var(--admin-alert,#3b2d3c)] text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-danger,#f18e9a)] rounded-[6px] transition-colors cursor-pointer"
                      title="Hapus template"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Standard Admin Confirmation Modal conforming to GEMINI.md Rule 5 ── */}
        <AdminConfirmModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
          title={`Hapus Template "${deleteConfirm?.name}"?`}
          category="Konfirmasi Hapus Template"
          description={`Template foto ini akan dihapus dari daftar pilihan Kiosk untuk kategori "${currentCategoryObj?.name || activeCategory}". File template master di server tidak akan terhapus fisik.`}
          confirmText="Hapus Template"
          cancelText="Batal"
          isDangerous={true}
          variant="danger"
        />
      </div>
    </AdminLayout>
  );
}
