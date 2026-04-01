import { useLocation, useNavigate } from "react-router";
import { Navigation } from "../../components/Navigation";
import {
  CheckCircle,
  MapPin,
  ArrowRight,
  Instagram,
  Users,
  Printer,
  Gift,
  Scissors,
  LayoutTemplate,
  Key,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

type KeychainOrder = {
  id: string;
  name: string;
  qty: number;
};

export function CompletePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // ── Data dari state ──────────────────────────────────────────
  const makeStory: boolean = location.state?.makeStory ?? false;
  const instagramUsernames: string[] = location.state?.instagramUsernames ?? [];
  const peopleCount: number = location.state?.peopleCount ?? 1;
  const joinedBonus: boolean = location.state?.joinedBonus ?? false;
  const coupleMode: boolean = location.state?.coupleMode ?? false;
  const totalPrint: number = location.state?.totalPrint ?? peopleCount;
  const templates: { layout: string }[] = location.state?.templates ?? [];
  const keychainOrder: KeychainOrder[] = location.state?.orders ?? [];
  const a4Count: number = location.state?.a4Count ?? 0;
  console.log(coupleMode);

  const layoutLabels: { [key: string]: string } = {
    "1": "1 Foto",
    "2": "2 Foto",
    "4": "4 Foto",
    "6": "6 Foto",
    "8": "8 Foto",
    newspaper: "Newspaper",
    wannabeyours: "Wanna Be Yours",
    "300days": "300 Days",
  };

  const regularPrint = coupleMode ? 1 : peopleCount;
  const bonusPrint = joinedBonus ? totalPrint - regularPrint : 0;

  // ── Reusable receipt components ──────────────────────────────

  const Divider = () => (
    <div className="relative my-3">
      <div className="border-t-4 border-dashed border-gray-300" />
      <div className="absolute -left-9 -top-3 w-6 h-6 bg-gray-100 border-4 border-black rounded-full" />
      <div className="absolute -right-9 -top-3 w-6 h-6 bg-gray-100 border-4 border-black rounded-full" />
    </div>
  );

  const SectionHeader = ({
    icon,
    label,
  }: {
    icon: React.ReactNode;
    label: string;
  }) => (
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <p className="text-base font-black uppercase tracking-widest text-gray-400">
        {label}
      </p>
    </div>
  );

  const Row = ({
    label,
    value,
    sub,
    highlight = false,
  }: {
    label: string;
    value: string;
    sub?: string;
    highlight?: boolean;
  }) => (
    <div
      className={`flex items-start justify-between py-2
      ${highlight ? "bg-black text-white -mx-8 px-8" : ""}`}
    >
      <div>
        <p
          className={`text-xl font-bold ${highlight ? "text-white" : "text-gray-700"}`}
        >
          {label}
        </p>
        {sub && <p className="text-base text-gray-400 font-medium">{sub}</p>}
      </div>
      <p
        className={`text-xl font-black tabular-nums ${highlight ? "text-yellow-300" : ""}`}
      >
        {value}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation currentStep={5} totalSteps={5} />

      <div className="flex items-center justify-center min-h-screen p-12 pt-36 pb-20">
        <div className="max-w-xl w-full">
          {/* ── Success heading ── */}
          <div className="text-center mb-10">
            <div className="relative inline-flex mb-8">
              <div className="w-36 h-36 bg-black rounded-full flex items-center justify-center border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)]">
                <CheckCircle size={72} className="text-white" strokeWidth={2} />
              </div>
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-300 border-2 border-black rounded-full" />
              <span className="absolute -bottom-1 -left-3 w-4 h-4 bg-green-400 border-2 border-black rounded-full" />
            </div>
            <h1 className="text-7xl font-bold mb-5 leading-tight">
              {t("complete.title")}
            </h1>
            <p className="text-3xl text-gray-600 leading-relaxed">
              <Trans
                i18nKey="complete.subtitle"
                components={{ 1: <span className="font-bold text-black" /> }}
              />
            </p>
          </div>

          {/* ── RECEIPT ── */}
          <div className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden mb-8">
            {/* Header */}
            <div className="bg-black text-white px-8 py-6 text-center">
              <p className="text-3xl font-black tracking-widest uppercase">
                IGNOS STUDIO
              </p>
              <p className="text-base text-gray-400 mt-1 tracking-[0.3em] uppercase">
                Session Summary
              </p>
            </div>

            {/* Top zigzag */}
            <div
              className="h-4"
              style={{
                background:
                  "radial-gradient(circle at 10px 0, #f3f4f6 10px, white 10px)",
                backgroundSize: "20px 100%",
              }}
            />

            <div className="px-8 py-2 space-y-1">
              {/* ── SESI ── */}
              <SectionHeader
                icon={
                  <Users
                    size={16}
                    strokeWidth={2.5}
                    className="text-gray-400"
                  />
                }
                label="Sesi"
              />
              <Row
                label={coupleMode ? "Couple Mode" : "Regular"}
                value={coupleMode ? "1 pasang" : `${peopleCount} orang`}
              />

              <Divider />

              {/* ── TEMPLATE ── */}
              <SectionHeader
                icon={
                  <LayoutTemplate
                    size={16}
                    strokeWidth={2.5}
                    className="text-gray-400"
                  />
                }
                label="Template"
              />
              {templates.length > 0 ? (
                templates.map((tpl, i) => (
                  <Row
                    key={i}
                    label={`Template ${i + 1}`}
                    value={layoutLabels[tpl.layout] ?? tpl.layout}
                  />
                ))
              ) : (
                <Row label="Template" value="-" />
              )}

              <Divider />

              {/* ── KEYCHAIN ── */}
              <SectionHeader
                icon={
                  <Key size={16} strokeWidth={2.5} className="text-gray-400" />
                }
                label="Gantungan Kunci"
              />
              {keychainOrder.length > 0 ? (
                <>
                  {keychainOrder.map((order, i) => (
                    <Row key={i} label={order.name} value={`${order.qty}x`} />
                  ))}
                  <div className="pt-1">
                    <Row
                      label="Total keychain"
                      value={`${keychainOrder.reduce((sum, o) => sum + o.qty, 0)} pcs`}
                      highlight
                    />
                  </div>
                </>
              ) : (
                <Row label="Gantungan kunci" value="❌ Tidak" />
              )}
              {/* ── PRINT ── */}
              <SectionHeader
                icon={
                  <Printer
                    size={16}
                    strokeWidth={2.5}
                    className="text-gray-400"
                  />
                }
                label="Print"
              />
              <Row
                label={
                  coupleMode
                    ? `Print reguler (${peopleCount} orang)`
                    : "Print reguler"
                }
                value={`${regularPrint}x`}
              />
              {joinedBonus && (
                <Row
                  label="Bonus print 🎁"
                  value={`+${bonusPrint}x`}
                  sub="Dari program bonus"
                />
              )}
              <div className="pt-1">
                <Row
                  label="Total print"
                  value={`${totalPrint} lembar`}
                  highlight
                />
              </div>

              {a4Count > 0 && (
                <>
                  <Divider /> {/* ← tambah ini */}
                  <SectionHeader
                    icon={
                      <Printer
                        size={16}
                        strokeWidth={2.5}
                        className="text-gray-400"
                      />
                    }
                    label="Cetak A4"
                  />
                  <Row label="Cetak Foto A4" value={`${a4Count} lembar`} />
                </>
              )}

              <Divider />

              {/* ── BONUS ── */}
              <SectionHeader
                icon={
                  <Gift size={16} strokeWidth={2.5} className="text-gray-400" />
                }
                label="Bonus"
              />
              <Row
                label="Program bonus"
                value={joinedBonus ? "✅ Ikut" : "❌ Tidak"}
              />

              <Divider />

              {/* ── ADD-ONS ── */}
              <SectionHeader
                icon={
                  <Instagram
                    size={16}
                    strokeWidth={2.5}
                    className="text-gray-400"
                  />
                }
                label="Add-ons"
              />
              <Row
                label="Instagram Story"
                value={makeStory ? "✅ Ya" : "❌ Tidak"}
              />
              {makeStory && instagramUsernames.length > 0 && (
                <div className="mt-2 space-y-2 mb-2">
                  {instagramUsernames.map((username, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-gray-50 border-2 border-black rounded-xl px-4 py-2"
                    >
                      <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-base font-bold shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-lg font-medium">
                        <span className="text-gray-400">@</span>
                        {username}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom zigzag + scissors */}
            <div className="mt-4">
              <div
                className="h-4"
                style={{
                  background:
                    "radial-gradient(circle at 10px 100%, #f3f4f6 10px, white 10px)",
                  backgroundSize: "20px 100%",
                }}
              />
              <div className="flex items-center gap-2 px-8 py-3 border-t-4 border-dashed border-gray-300">
                <Scissors size={16} className="text-gray-400" />
                <p className="text-sm text-gray-400 font-bold tracking-widest uppercase">
                  Tunjukkan ke kasir
                </p>
              </div>
            </div>

            {/* Kasir CTA */}
            <div className="bg-black text-white px-8 py-6 flex items-center gap-5">
              <div className="w-14 h-14 bg-yellow-300 rounded-full border-4 border-white flex items-center justify-center shrink-0">
                <MapPin size={28} strokeWidth={2.5} className="text-black" />
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold">
                  {t("complete.cashier.title")}
                </p>
                <p className="text-lg text-gray-400">
                  {t("complete.cashier.description")}
                </p>
              </div>
              <ArrowRight
                size={32}
                strokeWidth={2.5}
                className="text-yellow-300 shrink-0"
              />
            </div>
          </div>

          {/* Back home */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                sessionStorage.removeItem("session_timer_end");
                navigate("/");
              }}
              className="text-2xl font-bold border-4 border-black px-16 py-5 bg-white hover:bg-black hover:text-white transition-colors rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
            >
              {t("complete.actions.backHome")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
