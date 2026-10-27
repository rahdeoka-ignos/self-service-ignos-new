import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { AdminLayout } from "../components/AdminLayout";
import type {
  TemplateEntry,
  TemplatesData,
} from "../../types/template";

const API = "http://localhost:5000";

// ── Main Page ────────────────────────────────────────────────
export function AdminTemplatePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<TemplatesData | null>(null);
  const [activeCategory, setActiveCategory] = useState("basic");
  const [deleteConfirm, setDeleteConfirm] = useState<TemplateEntry | null>(null);

  const fetchData = () => {
    fetch(`${API}/api/templates`)
      .then((r) => r.json())
      .then((d: TemplatesData) => {
        setData(d);
        if (!d.templates[activeCategory] && d.categories.length > 0) {
          setActiveCategory(d.categories[0].id);
        }
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (tpl: TemplateEntry) => {
    await fetch(`${API}/api/templates/${tpl.id}?deleteFiles=false`, {
      method: "DELETE",
    });
    setDeleteConfirm(null);
    fetchData();
  };

  const currentTemplates = data?.templates[activeCategory] || [];
  const totalTemplates = data
    ? Object.values(data.templates).reduce((s, arr) => s + arr.length, 0)
    : 0;

  return (
    <AdminLayout>
      <div className="p-6 md:p-8 space-y-6">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-950 leading-tight">
              Template Manager
            </h1>
            <p className="text-zinc-500 text-xs md:text-sm mt-0.5">
              Kelola semua tata letak dan desain template foto Ignos Studio
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/templates/new")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 text-white font-medium rounded-lg hover:bg-black transition-colors text-xs shadow-xs cursor-pointer"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Tambah Template</span>
          </button>
        </div>

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs hover:border-zinc-300 transition-colors">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total Template</p>
            <p className="text-2xl md:text-3xl font-bold text-zinc-950 mt-1">{totalTemplates}</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs hover:border-zinc-300 transition-colors">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Kategori</p>
            <p className="text-2xl md:text-3xl font-bold text-zinc-950 mt-1">{data?.categories.length ?? 0}</p>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs hover:border-zinc-300 transition-colors">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Custom Layout</p>
            <p className="text-2xl md:text-3xl font-bold text-zinc-950 mt-1">
              {data
                ? Object.values(data.templates)
                    .flat()
                    .filter((t) => t.layout === "custom").length
                : 0}
            </p>
          </div>
        </div>

        {/* ── Category Tabs ── */}
        <div className="flex gap-1.5 border-b border-zinc-200 pb-3 flex-wrap">
          {data?.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-lg transition-colors text-xs cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
              }`}
            >
              <Layers size={13} strokeWidth={2} />
              <span>{cat.name}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-medium ${
                  activeCategory === cat.id
                    ? "bg-white/20 text-white"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {data?.templates[cat.id]?.length ?? 0}
              </span>
            </button>
          ))}
        </div>

        {/* ── Template Grid ── */}
        {!data ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-zinc-500">Memuat template...</p>
            </div>
          </div>
        ) : currentTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-300 rounded-xl bg-white text-center p-6">
            <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-3 text-zinc-400">
              <Layers size={22} strokeWidth={1.75} />
            </div>
            <p className="text-sm font-semibold text-zinc-800 mb-1">Belum ada template</p>
            <p className="text-xs text-zinc-400 mb-4">Tambahkan template pertama untuk kategori ini</p>
            <button
              onClick={() => navigate("/admin/templates/new")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 text-white font-medium rounded-lg hover:bg-black transition-colors text-xs cursor-pointer shadow-xs"
            >
              <Plus size={14} strokeWidth={2} />
              Tambah Template Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {currentTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all group flex flex-col justify-between"
              >
                {/* Preview image */}
                <div className="aspect-[2/3] bg-zinc-100 border-b border-zinc-100 overflow-hidden relative">
                  <ImageWithFallback
                    src={tpl.previewTemplate}
                    alt={tpl.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Layout badge */}
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] font-semibold bg-zinc-900/80 backdrop-blur-xs text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {tpl.layout}
                    </span>
                  </div>
                  {/* Overlay indicator */}
                  {tpl.overlay && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[10px] font-semibold bg-white/90 backdrop-blur-xs border border-zinc-200 text-zinc-800 px-1.5 py-0.5 rounded shadow-xs">
                        OVL
                      </span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-3">
                  <p className="font-semibold text-xs text-zinc-950 truncate mb-0.5">{tpl.name}</p>
                  {tpl.slots ? (
                    <p className="text-[11px] text-zinc-500 font-medium mb-2.5">
                      {tpl.slots.length} custom slot
                    </p>
                  ) : (
                    <p className="text-[11px] text-zinc-400 font-normal mb-2.5">
                      Built-in layout
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1.5 pt-1 border-t border-zinc-100">
                    <button
                      onClick={() => navigate(`/admin/templates/edit/${tpl.id}`)}
                      className="flex-1 flex items-center justify-center gap-1 border border-zinc-200 rounded-md py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 transition-colors cursor-pointer"
                    >
                      <Pencil size={11} strokeWidth={2} />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(tpl)}
                      className="flex items-center justify-center border border-zinc-200 rounded-md px-2 py-1 text-xs font-medium text-zinc-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus template"
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-fadeIn">
            <div className="w-10 h-10 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center mb-3">
              <Trash2 size={18} className="text-rose-600" strokeWidth={2} />
            </div>
            <h3 className="text-base font-semibold text-zinc-950 mb-1">Hapus Template?</h3>
            <p className="text-xs text-zinc-600 mb-1">
              Template <strong>&ldquo;{deleteConfirm.name}&rdquo;</strong> akan dihapus dari daftar sistem.
            </p>
            <p className="text-[11px] text-zinc-400 mb-5">
              File gambar di folder /public/templates/ tidak akan terhapus secara fisik.
            </p>
            <div className="flex gap-2">
              <button
                className="flex-1 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 py-2 transition-colors cursor-pointer shadow-xs"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Ya, Hapus
              </button>
              <button
                className="flex-1 bg-white text-zinc-800 border border-zinc-200 rounded-lg text-xs font-medium hover:bg-zinc-50 py-2 transition-colors cursor-pointer"
                onClick={() => setDeleteConfirm(null)}
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
