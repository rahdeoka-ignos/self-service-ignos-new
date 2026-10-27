import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { BrutalistButton } from "../components/BrutalistButton";
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
      <div className="p-8">
        {/* ── Page Header ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black leading-tight">Template Manager</h1>
            <p className="text-gray-500 font-medium mt-1">
              Kelola semua layout template foto studio
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/templates/new")}
            className="flex items-center gap-2 px-5 py-3 bg-black text-white font-bold border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all text-base"
          >
            <Plus size={18} strokeWidth={2.5} />
            Tambah Template
          </button>
        </div>

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Template</p>
            <p className="text-3xl font-black">{totalTemplates}</p>
          </div>
          <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Kategori</p>
            <p className="text-3xl font-black">{data?.categories.length ?? 0}</p>
          </div>
          <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Custom Layout</p>
            <p className="text-3xl font-black">
              {data
                ? Object.values(data.templates)
                    .flat()
                    .filter((t) => t.layout === "custom").length
                : 0}
            </p>
          </div>
        </div>

        {/* ── Category Tabs ── */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {data?.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-5 py-2.5 font-bold border-2 border-black rounded-xl transition-all text-sm ${
                activeCategory === cat.id
                  ? "bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]"
                  : "bg-white text-black hover:bg-gray-50"
              }`}
            >
              <Layers size={14} strokeWidth={2.5} />
              {cat.name}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-md font-black ${
                  activeCategory === cat.id
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500"
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
              <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-lg font-bold text-gray-400">Memuat templates...</p>
            </div>
          </div>
        ) : currentTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border-4 border-dashed border-black rounded-2xl bg-white">
            <div className="w-16 h-16 bg-gray-100 border-4 border-black rounded-2xl flex items-center justify-center mb-4">
              <Layers size={28} strokeWidth={2} className="text-gray-400" />
            </div>
            <p className="text-xl font-bold text-gray-400 mb-2">Belum ada template</p>
            <p className="text-sm text-gray-400 mb-6">Tambahkan template pertama untuk kategori ini</p>
            <button
              onClick={() => navigate("/admin/templates/new")}
              className="flex items-center gap-2 px-5 py-3 bg-black text-white font-bold border-4 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              <Plus size={18} strokeWidth={2.5} />
              Tambah Template Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
            {currentTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all group"
              >
                {/* Preview image */}
                <div className="aspect-[2/3] bg-gray-100 border-b-4 border-black overflow-hidden relative">
                  <ImageWithFallback
                    src={tpl.previewTemplate}
                    alt={tpl.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Layout badge */}
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded-md uppercase tracking-wide">
                      {tpl.layout}
                    </span>
                  </div>
                  {/* Overlay indicator */}
                  {tpl.overlay && (
                    <div className="absolute top-2 right-2">
                      <span className="text-[10px] font-black bg-white border-2 border-black text-black px-1.5 py-0.5 rounded-md">
                        OVL
                      </span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-3">
                  <p className="font-black text-sm truncate mb-0.5">{tpl.name}</p>
                  {tpl.slots ? (
                    <p className="text-xs text-blue-600 font-bold mb-3">
                      {tpl.slots.length} custom slot
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 font-medium mb-3">
                      Built-in layout
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => navigate(`/admin/templates/edit/${tpl.id}`)}
                      className="flex-1 flex items-center justify-center gap-1 border-2 border-black rounded-lg py-1.5 text-xs font-bold hover:bg-black hover:text-white transition-colors"
                    >
                      <Pencil size={11} strokeWidth={2.5} />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(tpl)}
                      className="flex-1 flex items-center justify-center gap-1 border-2 border-red-500 text-red-500 rounded-lg py-1.5 text-xs font-bold hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 size={11} strokeWidth={2.5} />
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-100 border-4 border-red-500 rounded-xl flex items-center justify-center mb-4">
              <Trash2 size={22} className="text-red-500" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black mb-2">Hapus Template?</h3>
            <p className="text-gray-600 mb-1">
              Template <strong>&ldquo;{deleteConfirm.name}&rdquo;</strong> akan dihapus dari daftar.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              File gambar di /public/templates/ tidak akan dihapus.
            </p>
            <div className="flex gap-3">
              <BrutalistButton
                size="md"
                className="flex-1 !bg-red-500 !border-red-700"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Ya, Hapus
              </BrutalistButton>
              <BrutalistButton
                size="md"
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
              >
                Batal
              </BrutalistButton>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
