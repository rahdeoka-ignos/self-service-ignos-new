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
  Maximize2,
  Minimize2,
  Tag,
  Building2,
  ShieldCheck,
  Lock,
  KeyRound,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { CameraImportModal } from "./CameraImportModal";
import { AdminChangePinModal } from "./AdminChangePinModal";
import { useBranding } from "../../context/BrandingContext";
import { useLicense } from "../../context/LicenseContext";
import { useSecurity } from "../../context/SecurityContext";

const NAV_WORKSPACE = [
  {
    path: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    desc: "Ringkasan sesi & omset",
  },
  {
    path: "/admin/pricing",
    label: "Harga & Paket",
    icon: Tag,
    desc: "Tarif sesi & add-ons",
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
    path: "/admin/branding",
    label: "Identitas Studio",
    icon: Building2,
    desc: "Profil, logo & struk",
  },
  {
    path: "/admin/license",
    label: "Lisensi Sewa",
    icon: ShieldCheck,
    desc: "Masa aktif & aktivasi",
  },
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
  const { branding } = useBranding();
  const { license, isLocked, isWarning } = useLicense();
  const { logout, isDefaultPin } = useSecurity();
  const [printerAlert, setPrinterAlert] = useState<any>(null);
  const [cameraImportOpen, setCameraImportOpen] = useState(false);
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("ignos_admin_sidebar_open");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });
  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ignos_admin_sidebar_open", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

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
    if (location.pathname.startsWith("/admin/pricing")) return "Harga & Paket";
    if (location.pathname.startsWith("/admin/templates")) return "Templates";
    if (location.pathname.startsWith("/admin/branding")) return "Identitas Studio";
    if (location.pathname.startsWith("/admin/license")) return "Lisensi Sewa";
    if (location.pathname.startsWith("/admin/kiosk-theme")) return "Tema & Alur Kiosk";
    if (location.pathname.startsWith("/admin/printers")) return "Printers";
    if (location.pathname.startsWith("/admin/message")) return "Pesan Softcopy";
    if (location.pathname.startsWith("/admin/storage")) return "Penyimpanan & Disk";
    return "Admin";
  };

  return (
    <div className="fixed inset-0 flex bg-[#fafafa] overflow-hidden text-[#202020] antialiased font-['Manrope',sans-serif]">
      {/* ── Sidebar (Amara Villa Minimal Style with Icon-Only Collapse) ── */}
      <aside
        className={`${
          sidebarOpen ? "w-[236px]" : "w-[68px]"
        } bg-white border-r border-[#e8e8e8] flex flex-col shrink-0 h-full overflow-y-auto overflow-x-hidden transition-all duration-200 ease-in-out`}
      >
        {/* Brand row */}
        {sidebarOpen ? (
          <div className="pt-6 px-4 pb-4 border-b border-[#e8e8e8] mb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {branding?.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt={branding.studioName}
                    className="w-8 h-8 rounded-lg object-contain bg-white border border-[#e8e8e8] shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[#171717] text-white flex items-center justify-center shrink-0 font-bold text-xs tracking-wider">
                    {(branding?.studioName || "IG").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <span
                    className="font-bold text-[14px] tracking-tight text-[#171717] leading-tight block truncate"
                    title={branding?.studioName || "IGNOS"}
                  >
                    {branding?.studioName || "IGNOS"}
                  </span>
                  <small className="text-[9px] tracking-[0.16em] text-[#888] font-semibold block mt-0.5">
                    ADMIN PORTAL
                  </small>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-[#171717] hover:bg-neutral-100 transition-colors shrink-0 cursor-pointer"
                title="Ciutkan Sidebar (Ctrl+B)"
              >
                <PanelLeftClose size={16} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-5 px-2 pb-4 border-b border-[#e8e8e8] mb-3 flex flex-col items-center gap-2.5">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.studioName}
                className="w-8 h-8 rounded-lg object-contain bg-white border border-[#e8e8e8] shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#171717] text-white flex items-center justify-center shrink-0 font-bold text-xs tracking-wider">
                {(branding?.studioName || "IG").slice(0, 2).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={toggleSidebar}
              className="w-10 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-[#171717] hover:bg-neutral-100 transition-colors cursor-pointer"
              title="Perluas Sidebar (Ctrl+B)"
            >
              <PanelLeftOpen size={16} strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <div className={`flex-1 ${sidebarOpen ? "px-3" : "px-2"} py-1 space-y-4`}>
          {/* Section 1: Workspace */}
          <div>
            {sidebarOpen ? (
              <p className="text-[10px] tracking-[0.13em] text-[#9a9a9a] font-medium uppercase px-2 mb-1.5 truncate">
                WORKSPACE
              </p>
            ) : (
              <div className="h-2" />
            )}
            <nav className="space-y-1">
              {NAV_WORKSPACE.map(({ path, label, icon: Icon }) => {
                const isActive =
                  path === "/admin"
                    ? location.pathname === "/admin"
                    : location.pathname.startsWith(path);

                if (!sidebarOpen) {
                  return (
                    <div key={path} className="relative group flex justify-center">
                      <button
                        onClick={() => navigate(path)}
                        className={`w-10 h-10 flex items-center justify-center rounded-[8px] transition-colors cursor-pointer relative ${
                          isActive
                            ? "bg-[#f2f2f2] text-[#171717]"
                            : "text-[#555] hover:bg-[#f6f6f6] hover:text-[#171717]"
                        }`}
                      >
                        <Icon
                          size={17}
                          strokeWidth={isActive ? 2 : 1.5}
                          className={isActive ? "text-[#171717]" : "text-[#777]"}
                        />
                      </button>
                      {/* Floating tooltip */}
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#171717] text-white text-[11px] font-medium rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        {label}
                      </div>
                    </div>
                  );
                }

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
            {sidebarOpen ? (
              <p className="text-[10px] tracking-[0.13em] text-[#9a9a9a] font-medium uppercase px-2 mb-1.5 truncate">
                PREFERENSI
              </p>
            ) : (
              <div className="my-2 border-t border-[#f0f0f0] w-6 mx-auto" />
            )}
            <nav className="space-y-1">
              {NAV_PREFERENCES.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname.startsWith(path);

                if (!sidebarOpen) {
                  return (
                    <div key={path} className="relative group flex justify-center">
                      <button
                        onClick={() => navigate(path)}
                        className={`w-10 h-10 flex items-center justify-center rounded-[8px] transition-colors cursor-pointer relative ${
                          isActive
                            ? "bg-[#f2f2f2] text-[#171717]"
                            : "text-[#555] hover:bg-[#f6f6f6] hover:text-[#171717]"
                        }`}
                      >
                        <Icon
                          size={17}
                          strokeWidth={isActive ? 2 : 1.5}
                          className={isActive ? "text-[#171717]" : "text-[#777]"}
                        />
                        {path === "/admin/printers" && printerAlert && (
                          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                        )}
                        {path === "/admin/license" && (isLocked || isWarning) && (
                          <span
                            className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${
                              isLocked ? "bg-[#ef4444]" : "bg-[#f59e0b]"
                            }`}
                          />
                        )}
                      </button>
                      {/* Floating Tooltip */}
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#171717] text-white text-[11px] font-medium rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        {label}
                      </div>
                    </div>
                  );
                }

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
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ef4444] shrink-0" title="Printer Perlu Perhatian" />
                    )}
                    {path === "/admin/license" && (isLocked || isWarning) && (
                      <span
                        className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${
                          isLocked ? "bg-[#ef4444]" : "bg-[#f59e0b]"
                        }`}
                        title={isLocked ? "Lisensi Perlu Diperpanjang" : "Lisensi Mendekati Jatuh Tempo"}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Bottom */}
        <div className={`border-t border-[#e8e8e8] mt-auto space-y-1 ${sidebarOpen ? "p-3" : "px-2 py-3"}`}>
          {sidebarOpen ? (
            <>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-[13px] text-rose-600 hover:text-rose-700 transition-colors rounded-[7px] hover:bg-rose-50 cursor-pointer"
                title="Kunci sesi admin dan kembali ke Kiosk"
              >
                <Lock size={15} strokeWidth={1.5} />
                <span>Kunci & Keluar</span>
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-[13px] text-[#888] hover:text-[#202020] transition-colors rounded-[7px] hover:bg-[#f6f6f6] cursor-pointer"
              >
                <ArrowLeft size={15} strokeWidth={1.5} />
                <span>Kembali ke Kiosk</span>
              </button>
            </>
          ) : (
            <>
              <div className="relative group flex justify-center">
                <button
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-[8px] text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Lock size={16} strokeWidth={1.5} />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#171717] text-white text-[11px] font-medium rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Kunci & Keluar
                </div>
              </div>

              <div className="relative group flex justify-center">
                <button
                  onClick={() => navigate("/")}
                  className="w-10 h-10 flex items-center justify-center rounded-[8px] text-neutral-400 hover:text-[#171717] hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={16} strokeWidth={1.5} />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#171717] text-white text-[11px] font-medium rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                  Kembali ke Kiosk
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ── Main Shell with Amara Topbar ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#fafafa]">
        {/* Topbar (Amara style: dash-topbar) */}
        <header className="h-[70px] border-b border-[#e8e8e8] px-6 md:px-8 flex items-center justify-between gap-4 bg-white shrink-0">
          <div className="flex items-center gap-3.5 text-[14px] text-[#999]">
            <span>Admin</span>
            <span className="text-[#ccc]">/</span>
            <span className="text-[#333] font-medium">{getPageTitle()}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCameraImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#171717] hover:bg-[#333] text-white rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer shadow-2xs"
              title="Tarik foto otomatis dari kamera atau card reader"
            >
              <Camera size={13} strokeWidth={2} />
              <span>Tarik Foto Kamera</span>
            </button>

            <button
              onClick={() => navigate("/")}
              className="hidden sm:inline-flex items-center gap-1.5 text-[13px] text-[#777] hover:text-[#171717] transition-colors cursor-pointer mr-1"
            >
              <span>Buka Kiosk</span>
              <ArrowUpRight size={14} strokeWidth={1.5} />
            </button>

            {/* PIN Security Button */}
            <button
              onClick={() => setChangePinOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#e5e5e5] hover:bg-[#f5f5f5] text-[#171717] rounded-[7px] text-[12px] font-medium transition-colors cursor-pointer"
              title="Atur PIN Keamanan Admin"
            >
              <KeyRound size={13} strokeWidth={1.5} />
              <span>PIN Keamanan</span>
              {isDefaultPin && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="PIN masih default (1234)" />
              )}
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

            <button
              onClick={toggleFullscreen}
              className="w-[34px] h-[34px] rounded-full border border-[#e6e6e6] bg-white hover:bg-[#f4f4f4] flex items-center justify-center text-[#666] hover:text-[#171717] transition-colors cursor-pointer"
              title={isFullscreen ? "Keluar Layar Penuh (Exit Fullscreen)" : "Layar Penuh (Fullscreen)"}
            >
              {isFullscreen ? (
                <Minimize2 size={14} strokeWidth={1.75} />
              ) : (
                <Maximize2 size={14} strokeWidth={1.75} />
              )}
            </button>

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
              <span className="w-2 h-2 rounded-full bg-[#ef4444] shrink-0" />
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

      {/* Smart Camera Ingest Modal */}
      <CameraImportModal
        isOpen={cameraImportOpen}
        onClose={() => setCameraImportOpen(false)}
      />

      {/* Change PIN Security Modal */}
      <AdminChangePinModal
        isOpen={changePinOpen}
        onClose={() => setChangePinOpen(false)}
      />
    </div>
  );
}
