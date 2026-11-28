import { apiFetch as fetch } from "../../utils/api";
import { notify } from "../../utils/notify";
import { useEffect, useState } from "react";
import { AdminConfirmModal } from "./AdminConfirmModal";
import { Check, Copy, Eye, EyeOff, Monitor, Plug, Printer, RefreshCw, Server } from "lucide-react";

const API = "http://localhost:5000";
const CODE_PREFIX = "IGNOS-HUB:";

type Role = "off" | "hub" | "kiosk";
type HubConfig = { role: Role; token?: string; url?: string; name?: string };
type TestResult = { success: boolean; error?: string; printers?: { name: string; status: string }[] };

// A connect code bundles the hub address and token so a kiosk is set up with one paste.
const encodeConnectCode = (url: string, token: string) =>
  CODE_PREFIX + btoa(JSON.stringify({ u: url, t: token })).replace(/=+$/, "");

function decodeConnectCode(code: string): { url: string; token: string } | null {
  const raw = code.trim();
  if (!raw.toUpperCase().startsWith(CODE_PREFIX)) return null;
  try {
    const b64 = raw.slice(CODE_PREFIX.length).replace(/\s+/g, "");
    const data = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
    return typeof data.u === "string" && typeof data.t === "string" ? { url: data.u, token: data.t } : null;
  } catch {
    return null;
  }
}

const ROLE_OPTIONS: { value: Role; title: string; desc: string; icon: typeof Printer }[] = [
  { value: "off", title: "Cetak Sendiri", desc: "Printer tersambung langsung ke komputer ini.", icon: Printer },
  { value: "hub", title: "Pusat Print", desc: "Komputer ini (MacBook) mencetak untuk kiosk lain.", icon: Server },
  { value: "kiosk", title: "Kiosk", desc: "Kirim cetakan ke pusat print lewat jaringan.", icon: Monitor },
];

const inputClass =
  "w-full px-3 py-2 border border-[var(--admin-border,#2a2d2f)] focus:border-[var(--admin-focus,#c0d0e7)] rounded-lg text-[13px] outline-none bg-[var(--admin-canvas,#111114)] text-[var(--admin-text,#f4f4f5)] transition-colors";
const secondaryButton =
  "inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] text-[var(--admin-secondary,#c3c7ca)] hover:bg-[var(--admin-raised,#292b2f)] hover:text-[var(--admin-text,#f4f4f5)] rounded-full text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-40";
const primaryButton =
  "inline-flex items-center gap-1.5 px-4 py-2 bg-[#c0d0e7] text-[#111b23] hover:bg-[#d2def0] rounded-full text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-50";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers that block the async clipboard API.
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function PrintHubSettings({ onSaved }: { onSaved?: () => void }) {
  const [saved, setSaved] = useState<HubConfig>({ role: "off" });
  const [addresses, setAddresses] = useState<string[]>([]);
  const [role, setRole] = useState<Role>("off");
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${API}/api/print-hub/config`);
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || "Gagal membaca setting pusat print.");
      const config: HubConfig = body.config;
      setSaved(config);
      setAddresses(body.addresses || []);
      setRole(config.role);
      setUrl(config.url || "");
      setToken(config.role === "kiosk" ? config.token || "" : "");
      setName(config.name || "");
      if (body.configError) {
        notify.warning("File Setting Pusat Print Rusak", `${body.configError}. Simpan ulang untuk memperbaiki.`, { id: "print-hub-config" });
      }
    } catch (err) {
      notify.error("Gagal Membaca Setting Pusat Print", err, { id: "print-hub-config" });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const applyCode = (value: string) => {
    setCode(value);
    const decoded = decodeConnectCode(value);
    if (decoded) {
      setUrl(decoded.url);
      setToken(decoded.token);
      setTest(null);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTest(null);
    try {
      const res = await fetch(`${API}/api/print-hub/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, token, name }),
      });
      setTest(await res.json());
    } catch (err) {
      setTest({ success: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  };

  const save = async (regenerateToken = false) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/print-hub/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, url, token, name, regenerateToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.error || `Gagal menyimpan (HTTP ${res.status}).`);
      await load();
      if (regenerateToken) notify.success("Token Baru Dibuat", "Salin kode sambung baru ke semua kiosk.");
      else if (role === "hub") notify.success("Pusat Print Aktif", "Komputer ini sekarang mencetak untuk kiosk lain.");
      else if (role === "kiosk") notify.success("Mode Kiosk Tersimpan", "Cetakan dari kiosk ini akan dikirim ke pusat print.");
      else notify.success("Cetak Sendiri Tersimpan", "Kiosk ini mencetak ke printernya sendiri.");
      onSaved?.();
    } catch (err) {
      notify.error("Gagal Menyimpan Pusat Print", err);
    } finally {
      setSaving(false);
    }
  };

  const copy = async (key: string, text: string) => {
    if (await copyText(text)) {
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    }
  };

  const decodedCode = code ? decodeConnectCode(code) : null;
  const savedRoleTitle = ROLE_OPTIONS.find((o) => o.value === saved.role)?.title;
  const hubReady = saved.role === "hub" && role === "hub" && !!saved.token;

  return (
    <div className="bg-[var(--admin-card,#1c1f20)] border border-[var(--admin-border,#2a2d2f)] rounded-2xl p-5 space-y-4 text-[13px]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--admin-text,#f4f4f5)]">Pusat Print</h2>
          <p className="text-[12px] text-[var(--admin-muted,#92989d)] mt-0.5">
            Pilih apakah komputer ini mencetak sendiri, menjadi pusat print, atau mengirim cetakan ke pusat print.
          </p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--admin-border,#2a2d2f)] text-[var(--admin-secondary,#c3c7ca)]">
          Aktif: <strong className="text-[var(--admin-text,#f4f4f5)]">{savedRoleTitle}</strong>
          {saved.role === "kiosk" && saved.name ? ` · ${saved.name}` : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Mode print">
        {ROLE_OPTIONS.map(({ value, title, desc, icon: Icon }) => {
          const active = role === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setRole(value);
                setTest(null);
              }}
              className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                active
                  ? "border-[#c0d0e7] bg-[var(--admin-raised,#292b2f)]"
                  : "border-[var(--admin-border,#2a2d2f)] hover:bg-[var(--admin-raised,#292b2f)]"
              }`}
            >
              <div className="flex items-center gap-2 font-medium text-[var(--admin-text,#f4f4f5)]">
                <Icon size={14} />
                {title}
                {active && <Check size={13} className="ml-auto text-[#c0d0e7]" />}
              </div>
              <p className="text-[11px] text-[var(--admin-muted,#92989d)] mt-1 leading-snug">{desc}</p>
            </button>
          );
        })}
      </div>

      {role === "off" && (
        <p className="text-[12px] text-[var(--admin-muted,#92989d)] leading-relaxed">
          Cetakan dikirim ke printer yang terpasang di komputer ini, sesuai profil printer di bawah.
        </p>
      )}

      {role === "hub" && !hubReady && (
        <p className="text-[12px] text-[var(--admin-muted,#92989d)] leading-relaxed">
          Klik <strong>Simpan</strong> untuk menjadikan komputer ini pusat print. Setelah itu kode sambung untuk tiap kiosk akan muncul di sini.
          Pastikan printer USB dan profil printernya diatur di komputer ini.
        </p>
      )}

      {hubReady && (
        <div className="space-y-3">
          <div>
            <p className="font-medium text-[var(--admin-secondary,#c3c7ca)] text-[12px] mb-1">Kode sambung untuk kiosk</p>
            <p className="text-[11px] text-[var(--admin-muted,#92989d)] mb-2 leading-relaxed">
              Salin salah satu kode, lalu tempel di <strong>Admin → Printer → Pusat Print → Kiosk</strong> pada tiap Mac mini.
              Coba alamat <code>.local</code> dulu; kalau tes koneksinya gagal, pakai alamat IP.
            </p>
            {addresses.length === 0 ? (
              <p className="text-[12px] text-[var(--admin-pending,#d7b8d6)]">
                Komputer ini belum terhubung ke jaringan. Sambungkan ke LAN/Wi-Fi studio lalu muat ulang halaman.
              </p>
            ) : (
              <div className="space-y-1.5">
                {addresses.map((address) => (
                  <div
                    key={address}
                    className="flex items-center gap-2 p-2 pl-3 rounded-lg border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-canvas,#111114)]"
                  >
                    <span className="font-mono text-[12px] text-[var(--admin-text,#f4f4f5)] truncate flex-1" title={address}>
                      {address}
                    </span>
                    <button type="button" className={secondaryButton} onClick={() => copy(address, encodeConnectCode(address, saved.token!))}>
                      {copied === address ? <Check size={13} /> : <Copy size={13} />}
                      {copied === address ? "Tersalin" : "Salin Kode"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="font-medium text-[var(--admin-secondary,#c3c7ca)] text-[12px] mb-1.5">Token</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12px] px-3 py-2 rounded-lg border border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-canvas,#111114)] text-[var(--admin-text,#f4f4f5)] break-all flex-1 min-w-0">
                {showToken ? saved.token : "•".repeat(24)}
              </span>
              <button type="button" className={secondaryButton} onClick={() => setShowToken((s) => !s)}>
                {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                {showToken ? "Sembunyikan" : "Lihat"}
              </button>
              <button
                type="button"
                className={secondaryButton}
                disabled={saving}
                onClick={() => setConfirmRotate(true)}
              >
                <RefreshCw size={13} />
                Buat Token Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {role === "kiosk" && (
        <div className="space-y-3">
          <div>
            <label className="font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block text-[12px]">
              Tempel kode sambung dari pusat print
            </label>
            <input
              value={code}
              onChange={(e) => applyCode(e.target.value)}
              placeholder="IGNOS-HUB:..."
              className={`${inputClass} font-mono`}
            />
            {code && (
              <p className={`text-[11px] mt-1 ${decodedCode ? "text-[#9fd8b4]" : "text-[var(--admin-pending,#d7b8d6)]"}`}>
                {decodedCode ? `Kode terbaca: ${decodedCode.url}` : "Kode tidak dikenali. Salin ulang dari halaman Admin → Printer di pusat print."}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block text-[12px]">Nama booth</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Booth 1" className={inputClass} />
            </label>
            <label className="block">
              <span className="font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block text-[12px]">Alamat pusat print</span>
              <input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setTest(null);
                }}
                placeholder="http://macbook.local:5000"
                className={`${inputClass} font-mono`}
              />
            </label>
          </div>

          <label className="block">
            <span className="font-medium text-[var(--admin-secondary,#c3c7ca)] mb-1.5 block text-[12px]">Token</span>
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setTest(null);
              }}
              className={`${inputClass} font-mono`}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={secondaryButton} onClick={runTest} disabled={testing || !url || !token}>
              <Plug size={13} />
              {testing ? "Menguji..." : "Tes Koneksi"}
            </button>
            <button type="button" className={secondaryButton} onClick={() => setShowToken((s) => !s)}>
              {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
              {showToken ? "Sembunyikan token" : "Lihat token"}
            </button>
          </div>

          {test && (
            <div
              className={`p-3 rounded-lg border text-[12px] leading-relaxed ${
                test.success
                  ? "border-[#2f5a40] bg-[#16261d] text-[#9fd8b4]"
                  : "border-[var(--admin-border,#2a2d2f)] bg-[var(--admin-alert,#3b2d3c)] text-[var(--admin-pending,#d7b8d6)]"
              }`}
            >
              {test.success ? (
                <>
                  Terhubung ke pusat print.
                  {test.printers && test.printers.length > 0
                    ? ` Printer: ${test.printers.map((p) => `${p.name} (${p.status})`).join(", ")}.`
                    : " Belum ada printer terdeteksi di pusat print."}
                </>
              ) : (
                <>Gagal: {test.error}</>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" className={primaryButton} disabled={saving || (role === "kiosk" && (!url || !token))} onClick={() => save()}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>

      <AdminConfirmModal
        isOpen={confirmRotate}
        onClose={() => setConfirmRotate(false)}
        onConfirm={() => save(true)}
        title="Buat Token Baru?"
        category="Pusat Print"
        description="Semua kiosk akan terputus dari pusat print sampai kode sambung yang baru ditempel di masing-masing kiosk."
        confirmText="Buat Token Baru"
        variant="warning"
      />
    </div>
  );
}
