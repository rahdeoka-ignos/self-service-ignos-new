import { apiFetch as fetch } from "../../utils/api";
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
  MapPin,
  ShieldCheck,
  Lock,
  KeyRound,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  FileSpreadsheet,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";
import { CameraImportModal } from "./CameraImportModal";
import { AdminChangePinModal } from "./AdminChangePinModal";
import { useBranding } from "../../context/BrandingContext";
import { useLicense } from "../../context/LicenseContext";
import { useSecurity } from "../../context/SecurityContext";

import { adminThemeClasses, useAdminTheme } from "../../hooks/useAdminTheme";

const NAV_WORKSPACE = [
  {
    path: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    desc: "Ringkasan sesi & omset",
  },
  {
    path: "/admin/cashier",
    label: "Kasir & E-Receipt",
    icon: Receipt,
    desc: "Transaksi & nota digital",
  },
  {
    path: "/admin/reports",
    label: "Laporan & Ekspor",
    icon: FileSpreadsheet,
    desc: "Rekap periode & unduh Excel",
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
    path: "/admin/branches",
    label: "Cabang",
    icon: MapPin,
    desc: "Alamat, WA & cabang komputer ini",
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
  const { theme, toggleTheme } = useAdminTheme();
  const { isLocked, isWarning } = useLicense();
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
    if (location.pathname.startsWith("/admin/cashier")) return "Kasir & E-Receipt";
    if (location.pathname.startsWith("/admin/reports")) return "Laporan & Ekspor";
    if (location.pathname.startsWith("/admin/pricing")) return "Harga & Paket";
    if (location.pathname.startsWith("/admin/templates")) return "Templates";
    if (location.pathname.startsWith("/admin/branding")) return "Identitas Studio";
    if (location.pathname.startsWith("/admin/branches")) return "Cabang";
    if (location.pathname.startsWith("/admin/license")) return "Lisensi Sewa";
    if (location.pathname.startsWith("/admin/kiosk-theme")) return "Tema & Alur Kiosk";
    if (location.pathname.startsWith("/admin/printers")) return "Printers";
    if (location.pathname.startsWith("/admin/message")) return "Pesan Softcopy";
    if (location.pathname.startsWith("/admin/storage")) return "Penyimpanan & Disk";
    return "Admin";
  };

  const navGroups = [
    { label: "Workspace", items: NAV_WORKSPACE },
    { label: "Pengaturan studio", items: NAV_PREFERENCES },
  ];
  const iconButton = "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--admin-control,#1c1e20)] text-[var(--admin-muted,#92989d)] transition-colors duration-200 hover:bg-[var(--admin-raised,#292b2f)] hover:text-[var(--admin-text,#f4f4f5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--admin-focus,#c0d0e7)]";

  return (
    <div data-admin-theme={theme} className={`${adminThemeClasses} fixed inset-0 flex overflow-hidden bg-[var(--admin-canvas,#111114)] font-['Inter',sans-serif] text-[var(--admin-text,#f4f4f5)] antialiased [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button]:duration-200 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-[var(--admin-focus,#c0d0e7)] [&_input:focus-visible]:border-[var(--admin-focus,#c0d0e7)] [&_select:focus-visible]:border-[var(--admin-focus,#c0d0e7)] motion-reduce:[&_*]:transition-none`}>
      <aside id="admin-sidebar" aria-label="Navigasi admin" className={`${sidebarOpen ? "w-[270px] xl:w-[301px]" : "w-[76px]"} flex h-full shrink-0 flex-col overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--admin-border-strong,#41474e)] [&::-webkit-scrollbar-thumb:hover]:bg-[var(--admin-muted,#92989d)] [&::-webkit-scrollbar-button]:hidden supports-[not_selector(::-webkit-scrollbar)]:[scrollbar-width:thin] supports-[not_selector(::-webkit-scrollbar)]:[scrollbar-color:var(--admin-border-strong,#41474e)_transparent] border-r border-[var(--admin-border,#27292b)] bg-[var(--admin-sidebar,#17191b)] transition-[width] duration-300 ease-in-out motion-reduce:transition-none`}>
        <div className={`flex min-h-[88px] items-center gap-3 ${sidebarOpen ? "px-[21px]" : "justify-center px-3"}`}>
          {!sidebarOpen && (branding?.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.studioName} className="size-10 shrink-0 rounded-xl bg-[var(--admin-raised,#292b2f)] object-contain p-1" />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#c0d0e7] text-[#111b23]"><Camera size={23} strokeWidth={1.8} /></div>
          ))}
          {sidebarOpen && <><div className="min-w-0 flex-1"><p className="truncate text-[18px] font-semibold tracking-[-0.3px]" title={branding?.studioName || "IGNOS"}>{branding?.studioName || "IGNOS"}</p><p className="mt-0.5 text-[12px] text-[var(--admin-muted,#92989d)]">Self service workspace</p></div><button type="button" onClick={toggleSidebar} aria-label="Ciutkan sidebar" aria-expanded={sidebarOpen} aria-controls="admin-sidebar" className="rounded-lg p-1 text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-text,#f4f4f5)]"><PanelLeftClose size={19} /></button></>}
        </div>
        {!sidebarOpen && <button type="button" onClick={toggleSidebar} aria-label="Perluas sidebar" aria-expanded={sidebarOpen} aria-controls="admin-sidebar" className="mx-auto mb-5 rounded-lg p-2 text-[var(--admin-muted,#92989d)] hover:bg-[var(--admin-raised,#292b2f)]"><PanelLeftOpen size={19} /></button>}
        <div className={`flex-1 space-y-7 pb-6 ${sidebarOpen ? "px-[21px]" : "px-3"}`}>
          {navGroups.map((group) => (
            <div key={group.label}>
              {sidebarOpen && <p className="mb-3 mt-3 px-3.5 text-[12px] font-medium uppercase tracking-[0.6px] text-[var(--admin-label,#737779)]">{group.label}</p>}
              <nav aria-label={group.label} className="space-y-1">
                {group.items.map(({ path, label, icon: Icon }) => {
                  const active = path === "/admin" ? location.pathname === path : location.pathname.startsWith(path);
                  const alert = (path === "/admin/printers" && printerAlert) || (path === "/admin/license" && (isLocked || isWarning));
                  return <button key={path} type="button" onClick={() => navigate(path)} aria-current={active ? "page" : undefined} aria-label={label} title={sidebarOpen ? undefined : label} className={`relative flex min-h-11 w-full items-center rounded-[13px] text-left text-[14px] font-medium transition-colors ${sidebarOpen ? "gap-[13px] px-3.5" : "justify-center"} ${active ? "bg-[var(--admin-raised,#292b2f)] text-[var(--admin-text,#f4f4f5)]" : "text-[var(--admin-muted,#96999b)] hover:bg-[var(--admin-border,#202325)] hover:text-[var(--admin-text,#f4f4f5)]"}`}><Icon size={18} strokeWidth={1.8} className="shrink-0" />{sidebarOpen && <span className="truncate">{label}</span>}{alert && <span aria-label="Perlu perhatian" className={`${sidebarOpen ? "ml-auto" : "absolute right-2 top-2"} size-1.5 shrink-0 rounded-full bg-[#f18e9a]`} />}</button>;
                })}
              </nav>
            </div>
          ))}
        </div>
        <div className={`mt-auto space-y-2 border-t border-[var(--admin-border,#27292b)] py-5 ${sidebarOpen ? "px-[21px]" : "px-3"}`}>
          {sidebarOpen && <div className="mb-4 rounded-[19px] bg-[var(--admin-raised,#292b2f)] p-4"><div className="mb-2 flex items-center gap-2 text-[13px]"><ShieldCheck size={16} className={isLocked ? "text-[var(--admin-danger,#f18e9a)]" : "text-[var(--admin-accent-text,#c0d0e7)]"} /><span>Lisensi studio</span></div><p className="text-[12px] leading-5 text-[var(--admin-muted,#92989d)]">{isLocked ? "Perpanjang lisensi untuk melanjutkan." : isWarning ? "Masa aktif segera berakhir." : "Kelola aktivasi dan masa sewa studio."}</p><button type="button" onClick={() => navigate("/admin/license")} className="mt-3 flex items-center gap-1 text-[12px] font-medium text-[var(--admin-accent-text,#c0d0e7)]">Lihat lisensi <ArrowUpRight size={13} /></button></div>}
          <button type="button" onClick={() => navigate("/")} aria-label="Kembali ke Kiosk" title="Kembali ke Kiosk" className={`flex min-h-10 w-full items-center rounded-[13px] text-[13px] text-[var(--admin-muted,#96999b)] hover:bg-[var(--admin-raised,#292b2f)] hover:text-[var(--admin-text,#f4f4f5)] ${sidebarOpen ? "gap-3 px-3.5" : "justify-center"}`}><ArrowLeft size={18} />{sidebarOpen && "Kembali ke Kiosk"}</button>
          <button type="button" onClick={() => { logout(); navigate("/"); }} aria-label="Kunci dan keluar" title="Kunci dan keluar" className={`flex min-h-10 w-full items-center rounded-[13px] text-[13px] text-[var(--admin-danger,#f18e9a)] hover:bg-[var(--admin-alert,#3b2d3c)] ${sidebarOpen ? "gap-3 px-3.5" : "justify-center"}`}><Lock size={18} />{sidebarOpen && "Kunci & keluar"}</button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-[79px] shrink-0 flex-wrap items-center justify-between gap-3 px-5 py-4 lg:px-[34px]">
          <div className="flex h-[38px] items-center gap-3 rounded-full bg-[var(--admin-control,#1c1e20)] px-3.5 text-[13px]">
            <span className="text-[var(--admin-muted,#92989d)]">Workspace</span><ChevronRight size={14} className="text-[var(--admin-label,#737779)]" /><span>{getPageTitle()}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setCameraImportOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f5f5f7] px-4 text-[12px] font-semibold text-[#202124] hover:bg-[#c0d0e7]" title="Tarik foto otomatis dari kamera atau card reader"><Camera size={15} /><span className="hidden sm:inline">Tarik foto kamera</span></button>
            <button type="button" onClick={toggleTheme} className={iconButton} aria-label={theme === "dark" ? "Aktifkan light mode" : "Aktifkan dark mode"} title={theme === "dark" ? "Aktifkan light mode" : "Aktifkan dark mode"}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button type="button" onClick={() => setChangePinOpen(true)} className={iconButton} aria-label="Atur PIN keamanan" title="Atur PIN keamanan"><KeyRound size={18} />{isDefaultPin && <span className="ml-0.5 size-1.5 rounded-full bg-[#d7b8d6]" />}</button>
            {printerAlert && <button type="button" onClick={() => navigate("/admin/printers")} className={iconButton} aria-label="Peringatan printer" title="Peringatan printer"><Bell size={18} className="text-[var(--admin-danger,#f18e9a)]" /></button>}
            <button type="button" onClick={toggleFullscreen} className={iconButton} aria-label={isFullscreen ? "Keluar layar penuh" : "Layar penuh"} title={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}>{isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
            <div className="ml-1 flex size-9 items-center justify-center rounded-full border border-[var(--admin-border-strong,#41474e)] bg-[#dfb9de] text-[12px] font-semibold text-[#644362]" title="Admin studio">AD</div>
          </div>
        </header>
        {printerAlert && <div role="status" className="mx-5 mb-2 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-[var(--admin-alert,#3b2d3c)] bg-[var(--admin-alert,#3b2d3c)] px-4 py-3 text-[13px] lg:mx-[34px]"><div className="min-w-0"><strong className="text-[var(--admin-danger,#f18e9a)]">{printerAlert.title}</strong><p className="truncate text-[var(--admin-secondary,#c3c7ca)]">{printerAlert.adminMessage}</p></div><button type="button" onClick={() => navigate("/admin/printers")} className="shrink-0 text-[var(--admin-danger,#f18e9a)]">Periksa printer <ArrowRight size={14} className="inline" /></button></div>}
        <main id="admin-content" className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
      <CameraImportModal isOpen={cameraImportOpen} onClose={() => setCameraImportOpen(false)} />
      <AdminChangePinModal isOpen={changePinOpen} onClose={() => setChangePinOpen(false)} />
    </div>
  );
}
