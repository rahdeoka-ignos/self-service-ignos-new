import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  LayoutTemplate,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  Camera,
  Printer,
  LayoutDashboard,
  ArrowUpRight,
  Bell,
  Palette,
  HardDrive,
} from "lucide-react";

const NAV_WORKSPACE = [
  {
    path: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    desc: "Ringkasan sesi & omset",
  },
  {
    path: "/admin/templates",
    label: "Templates",
    icon: LayoutTemplate,
    desc: "Desain frame & slot foto",
  },
];

const NAV_PREFERENCES = [
  {
    path: "/admin/kiosk-theme",
    label: "Tema & Alur Kiosk",
    icon: Palette,
    desc: "Preset, warna & alur",
  },
  {
    path: "/admin/printers",
    label: "Printer & Kertas",
    icon: Printer,
    desc: "Monitor spooler cetak",
  },
  {
    path: "/admin/message",
    label: "Pesan Softcopy",
    icon: MessageSquare,
    desc: "Format teks WhatsApp",
  },
  {
    path: "/admin/storage",
    label: "Penyimpanan & Disk",
    icon: HardDrive,
    desc: "Kapasitas & pembersihan disk",
  },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [printerAlert, setPrinterAlert] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const checkAlert = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/printer-status");
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted) {
          setPrinterAlert(data.hasError && data.alert ? data.alert : null);
        }
      } catch {}
    };
    checkAlert();
    const interval = setInterval(checkAlert, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const getPageTitle = () => {
    if (location.pathname === "/admin") return "Dashboard";
    if (location.pathname.startsWith("/admin/templates")) return "Templates";
    if (location.pathname.startsWith("/admin/kiosk-theme")) return "Tema & Alur Kiosk";
    if (location.pathname.startsWith("/admin/printers")) return "Printers";
    if (location.pathname.startsWith("/admin/message")) return "Pesan Softcopy";
    if (location.pathname.startsWith("/admin/storage")) return "Penyimpanan & Disk";
    return "Admin";
  };

  return (
    <div className="flex h-screen bg-[#fafafa] overflow-hidden text-[#202020] antialiased font-['Manrope',sans-serif]">
      {/* ── Sidebar (Amara Villa Minimal Style) ── */}
      <aside className="w-[236px] bg-white border-r border-[#e8e8e8] flex flex-col shrink-0 h-full overflow-y-auto">
        {/* Brand row */}
        <div className="pt-7 px-5 pb-5 border-b border-[#e8e8e8] mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#171717] text-white flex items-center justify-center shrink-0">
              <Camera size={16} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-sm tracking-tight text-[#171717] leading-none block">
                IGNOS
              </span>
              <small className="text-[9px] tracking-[0.16em] text-[#888] font-medium block mt-0.5">
                ADMIN PORTAL
              </small>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 px-3 py-1 space-y-5">
          {/* Section 1: Workspace */}
          <div>
            <p className="text-[10px] tracking-[0.13em] text-[#9a9a9a] font-medium uppercase px-2 mb-1.5">
              WORKSPACE
            </p>
            <nav className="space-y-1">
              {NAV_WORKSPACE.map(({ path, label, icon: Icon }) => {
                const isActive =
                  path === "/admin"
                    ? location.pathname === "/admin"
                    : location.pathname.startsWith(path);
                return (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] text-left transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[#f2f2f2] text-[#171717] font-semibold"
                        : "text-[#555] hover:bg-[#f6f6f6] hover:text-[#171717]"
                    }`}
                  >
                    <Icon
                      size={16}
                      strokeWidth={1.5}
                      className={isActive ? "text-[#171717]" : "text-[#898989]"}
                    />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Section 2: Preferensi */}
          <div>
            <p className="text-[10px] tracking-[0.13em] text-[#9a9a9a] font-medium uppercase px-2 mb-1.5">
              PREFERENSI
            </p>
            <nav className="space-y-1">
              {NAV_PREFERENCES.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname.startsWith(path);
                return (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] text-[13px] text-left transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[#f2f2f2] text-[#171717] font-semibold"
                        : "text-[#555] hover:bg-[#f6f6f6] hover:text-[#171717]"
                    }`}
                  >
                    <Icon
                      size={16}
                      strokeWidth={1.5}
                      className={isActive ? "text-[#171717]" : "text-[#898989]"}
                    />
                    <span className="truncate">{label}</span>
                    {path === "/admin/printers" && printerAlert && (
                      <span className="ml-auto bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] text-[10px] font-medium px-1.5 py-0.2 rounded shrink-0 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
                        Alert
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Bottom */}
        <div className="p-3 border-t border-[#e8e8e8] mt-auto">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-2 px-2.5 py-2 text-[13px] text-[#888] hover:text-[#202020] transition-colors rounded-[7px] hover:bg-[#f6f6f6] cursor-pointer"
          >
            <ArrowLeft size={15} strokeWidth={1.5} />
            <span>Kembali ke Kiosk</span>
          </button>
        </div>
      </aside>

      {/* ── Main Shell with Amara Topbar ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#fafafa]">
        {/* Topbar (Amara style: dash-topbar) */}
        <header className="h-[70px] border-b border-[#e8e8e8] px-8 flex items-center justify-between gap-6 bg-white shrink-0">
          <div className="flex items-center gap-3.5 text-[14px] text-[#999]">
            <span>Admin</span>
            <span className="text-[#ccc]">/</span>
            <span className="text-[#333] font-medium">{getPageTitle()}</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="hidden sm:inline-flex items-center gap-1.5 text-[13px] text-[#777] hover:text-[#171717] transition-colors cursor-pointer mr-1"
            >
              <span>Buka Kiosk</span>
              <ArrowUpRight size={14} strokeWidth={1.5} />
            </button>

            {printerAlert && (
              <button
                onClick={() => navigate("/admin/printers")}
                className="w-[34px] h-[34px] rounded-full border border-[#e6e6e6] bg-white hover:bg-[#f4f4f4] flex items-center justify-center text-[#ef4444] relative cursor-pointer"
                title="Peringatan Printer Aktif"
              >
                <Bell size={15} strokeWidth={1.5} />
                <span className="w-2 h-2 rounded-full bg-[#ef4444] absolute top-2 right-2 border border-white" />
              </button>
            )}

            <div
              className="w-[32px] h-[32px] rounded-full bg-[#171717] text-white flex items-center justify-center text-[12px] font-medium tracking-[0.03em] select-none"
              title="Admin User"
            >
              AD
            </div>
          </div>
        </header>

        {/* Printer Error Banner if any */}
        {printerAlert && (
          <div className="bg-white border-b border-[#e8e8e8] px-6 md:px-8 py-2.5 flex items-center justify-between gap-4 text-[13px] shrink-0 transition-all">
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-[10px] tracking-[0.06em] font-semibold bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] uppercase shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse" />
                Peringatan
              </span>
              <div className="flex items-center gap-2 min-w-0 truncate">
                <strong className="text-[13px] font-semibold text-[#202020] shrink-0">
                  {printerAlert.title}
                </strong>
                <span className="text-[#ccc] hidden md:inline shrink-0">·</span>
                <span className="text-[13px] text-[#666] truncate font-normal">
                  {printerAlert.adminMessage}
                </span>
              </div>
            </div>

            {location.pathname !== "/admin/printers" && (
              <button
                type="button"
                onClick={() => navigate("/admin/printers")}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#e5e5e5] hover:border-[#171717] hover:bg-[#171717] hover:text-white text-[#333] rounded-[6px] text-[12px] font-medium transition-all cursor-pointer shadow-2xs shrink-0"
              >
                <span>Pengaturan Printer</span>
                <ArrowRight size={13} strokeWidth={1.5} />
              </button>
            )}
          </div>
        )}

        {/* Page Content Scrollable Container */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
