import { useLocation, useNavigate } from "react-router";
import { LayoutTemplate, MessageSquare, ArrowLeft, Camera } from "lucide-react";

const NAV_ITEMS = [
  {
    path: "/admin/templates",
    label: "Templates",
    icon: LayoutTemplate,
    desc: "Kelola layout foto",
  },
  {
    path: "/admin/message",
    label: "Kirim Softcopy",
    icon: MessageSquare,
    desc: "Generate pesan WA",
  },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-white border-r-4 border-black flex flex-col shrink-0 h-full overflow-y-auto">
        {/* Brand */}
        <div className="p-5 border-b-4 border-black">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-black rounded-xl flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)]">
              <Camera size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-black text-base leading-tight tracking-tight">
                IGNOS STUDIO
              </p>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                Admin Panel
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1.5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-3">
            Menu
          </p>
          {NAV_ITEMS.map(({ path, label, icon: Icon, desc }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 font-bold text-left transition-all group ${
                  isActive
                    ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.4)]"
                    : "bg-white text-black border-transparent hover:border-black hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? "bg-white/20"
                      : "bg-gray-100 group-hover:bg-black group-hover:text-white"
                  }`}
                >
                  <Icon size={15} strokeWidth={2.5} className={isActive ? "text-white" : ""} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm leading-none mb-0.5">{label}</p>
                  <p
                    className={`text-[10px] font-medium leading-none truncate ${
                      isActive ? "text-white/60" : "text-gray-400"
                    }`}
                  >
                    {desc}
                  </p>
                </div>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t-4 border-black space-y-2">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border-2 border-black font-bold text-black hover:bg-black hover:text-white transition-all text-sm group"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
              <ArrowLeft size={15} strokeWidth={2.5} />
            </div>
            Kembali ke App
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
