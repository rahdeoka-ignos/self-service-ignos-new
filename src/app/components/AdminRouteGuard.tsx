import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { useSecurity } from "../../context/SecurityContext";
import { Lock, ArrowLeft, Shield } from "lucide-react";
import { AdminPinModal } from "./AdminPinModal";

export function AdminRouteGuard() {
  const { isAuthenticated, loading } = useSecurity();
  const [showPinModal, setShowPinModal] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#fafafa] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin" />
      </div>
    );
  }

  // If already authenticated, allow access to admin routes!
  if (isAuthenticated) {
    return <Outlet />;
  }

  // If not authenticated, display protection screen & PIN modal
  return (
    <div className="fixed inset-0 bg-[#fafafa] text-[#171717] flex flex-col items-center justify-center p-6 select-none font-['Manrope',sans-serif]">
      <div className="max-w-md w-full bg-white border border-[#e5e5e5] rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-6">
        {/* Security Badge */}
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 text-[11px] font-semibold tracking-wider uppercase">
          <span>Keamanan Portal Studio</span>
        </div>

        {/* Shield Icon */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-[#171717] shadow-2xs">
          <Shield size={32} />
        </div>

        {/* Headline & Description */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-[#171717]">
            Portal Admin Terlindungi
          </h1>
          <p className="text-sm text-[#737373] leading-relaxed">
            Halaman ini memuat data keuangan studio dan pengaturan sensitif. Masukkan PIN keamanan staf untuk melanjutkan.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowPinModal(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#171717] hover:bg-[#333] text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Lock size={16} />
            <span>Buka dengan PIN Admin</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-[#737373] hover:text-[#171717] hover:bg-neutral-100 font-semibold text-xs rounded-xl transition-all cursor-pointer"
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
