import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useSecurity } from "../../context/SecurityContext";
import { Lock, ArrowLeft, Shield } from "lucide-react";
import { AdminPinModal } from "./AdminPinModal";

import { adminThemeClasses, useAdminTheme } from "../../hooks/useAdminTheme";

export function AdminRouteGuard() {
  const { theme } = useAdminTheme();
  const { isAuthenticated, loading } = useSecurity();
  const [showPinModal, setShowPinModal] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div data-admin-theme={theme} className={`${adminThemeClasses} fixed inset-0 bg-[var(--admin-card,#1c1f20)] flex items-center justify-center`}>
        <div className="w-5 h-5 border-2 border-[var(--admin-border-interactive,#34373b)] border-t-neutral-800 rounded-full animate-spin" />
      </div>
    );
  }

  // If already authenticated, allow access to admin routes!
  if (isAuthenticated) {
    return <Outlet />;
  }

  // If not authenticated, display protection screen & PIN modal
  return (
    <div data-admin-theme={theme} className={`${adminThemeClasses} fixed inset-0 bg-[var(--admin-card,#1c1f20)] text-[var(--admin-text,#f4f4f5)] flex flex-col items-center justify-center p-6 select-none font-['Inter',sans-serif]`}>
      <div className="max-w-md w-full bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-6">
        {/* Security Badge */}
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--admin-raised,#292b2f)] border border-[var(--admin-border-interactive,#34373b)] text-[var(--admin-secondary,#c3c7ca)] text-[12px] font-semibold tracking-wider uppercase">
          <span>Keamanan Portal Studio</span>
        </div>

        {/* Shield Icon */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[var(--admin-raised,#292b2f)] border border-[var(--admin-border-interactive,#34373b)] flex items-center justify-center text-[var(--admin-text,#f4f4f5)] ">
          <Shield size={32} />
        </div>

        {/* Headline & Description */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--admin-text,#f4f4f5)]">
            Portal Admin Terlindungi
          </h1>
          <p className="text-sm text-[var(--admin-muted,#92989d)] leading-relaxed">
            Halaman ini memuat data keuangan studio dan pengaturan sensitif. Masukkan PIN keamanan staf untuk melanjutkan.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowPinModal(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#c0d0e7] hover:bg-[#d2def0] text-[#111b23] font-bold text-sm rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Lock size={16} />
            <span>Buka dengan PIN Admin</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-[var(--admin-muted,#92989d)] hover:text-[var(--admin-text,#f4f4f5)] hover:bg-[var(--admin-raised,#292b2f)] font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Kembali ke Layar Kiosk</span>
          </button>
        </div>
      </div>

      <AdminPinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        targetPath={location.pathname}
      />
    </div>
  );
}
