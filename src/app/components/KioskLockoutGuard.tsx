import { useState } from "react";
import { Lock, ShieldAlert, KeyRound, ExternalLink, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";
import { useLicense } from "../../context/LicenseContext";
import { useNavigate } from "react-router";

export function KioskLockoutGuard() {
  const { license, loading, isLocked, activateLicense, refreshLicense } = useLicense();
  const [showInputModal, setShowInputModal] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  // If loading and no cached license, or if active and valid, don't show lockout
  if (loading && !license) return null;
  if (!isLocked) return null;

  const handleActivate = async () => {
    if (!inputKey.trim()) {
      setErrorMessage("Silakan masukkan kode lisensi.");
      return;
    }
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const result = await activateLicense(inputKey.trim());
    setSubmitting(false);

    if (result.success) {
      setSuccessMessage(result.message);
      setTimeout(() => {
        setShowInputModal(false);
        setInputKey("");
        setSuccessMessage("");
      }, 1500);
    } else {
      setErrorMessage(result.message);
    }
  };

  const isTampered = license?.isClockTampered;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0f0f11]/98 backdrop-blur-xl text-white flex flex-col items-center justify-center p-6 select-none font-['Manrope',sans-serif]">
      {/* Central Card */}
      <div className="max-w-xl w-full bg-[#18181b] border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
        {/* Micro status header */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span>{isTampered ? "Proteksi Keamanan Aktif" : "Sistem Terkunci — Sewa Berakhir"}</span>
        </div>

        {/* Lock Icon */}
        <div className="w-20 h-20 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/90 shadow-inner">
          {isTampered ? (
            <AlertTriangle size={38} className="text-amber-400" />
          ) : (
            <Lock size={38} className="text-white" />
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {isTampered
              ? "Pengaturan Jam Tidak Sesuai"
              : "Masa Sewa Software Telah Berakhir"}
          </h1>
          <p className="text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
            {isTampered
              ? "Sistem mendeteksi tanggal atau jam komputer telah dimundurkan. Harap sesuaikan waktu Windows ke waktu yang tepat atau masukkan kode lisensi baru."
              : `Bilik foto untuk ${license?.clientName || "Studio"} saat ini terkunci. Silakan hubungi vendor untuk melakukan perpanjangan sewa bulanan.`}
          </p>
        </div>

        {/* Quick Info Box */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs space-y-2 text-left">
          <div className="flex justify-between text-neutral-400">
            <span>Studio:</span>
            <span className="font-semibold text-white">{license?.clientName || "—"}</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>Paket Terakhir:</span>
            <span className="text-white">{license?.plan || "Paket Sewa Studio"}</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>Status Lisensi:</span>
            <span className="text-rose-400 font-medium">
              {isTampered ? "Waktu PC Tidak Sinkron" : "Kedaluwarsa (Expired)"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {license?.supportContact?.whatsappUrl && (
            <a
              href={license.supportContact.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[#25d366] hover:bg-[#20ba59] text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-[#25d366]/20 cursor-pointer"
            >
              <ExternalLink size={16} />
              <span>Hubungi Vendor (WA)</span>
            </a>
          )}

          <button
            onClick={() => setShowInputModal(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white text-[#171717] hover:bg-neutral-200 font-semibold text-sm rounded-xl transition-all cursor-pointer shadow-lg"
          >
            <KeyRound size={16} />
            <span>Masukkan Kode Baru</span>
          </button>
        </div>

        {/* Link to Admin Portal */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-center">
          <button
            onClick={() => navigate("/admin/license")}
            className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>Buka Halaman Admin Lisensi</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Input License Modal Overlay */}
      {showInputModal && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#1e1e24] border border-white/15 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Aktivasi Lisensi Sewa
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Masukkan kode lisensi IGNOS-V1 yang Anda dapatkan dari vendor software.
              </p>
            </div>

            <div className="space-y-2">
              <textarea
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setErrorMessage("");
                }}
                rows={4}
                placeholder="IGNOS-V1.eyJjbGllbnQiOiJ..."
                className="w-full p-3 bg-black/40 border border-white/20 rounded-xl font-mono text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-white transition-colors resize-none"
              />

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  {successMessage}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowInputModal(false);
                  setErrorMessage("");
                }}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleActivate}
                disabled={submitting || !inputKey.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white text-[#171717] hover:bg-neutral-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Verifikasi...</span>
                  </>
                ) : (
                  <span>Aktifkan Sekarang</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
