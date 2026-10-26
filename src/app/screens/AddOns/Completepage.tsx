import { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  getSessionRawPhotos,
  getSessionPrintFiles,
  trackPrintFile,
  clearSessionData,
  DRIVE_LINK_KEY,
} from "../../../utils/sessionTracker";
import { useLocation, useNavigate } from "react-router";
import { Navigation } from "../../components/Navigation";
import {
  MapPin,
  ArrowRight,
  Instagram,
  Users,
  Printer,
  Gift,
  Scissors,
  LayoutTemplate,
  Key,
  ShoppingBag,
  QrCode,
  ExternalLink,
  Loader2,
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
  const totalPrint: number =
    location.state?.totalPrint ??
    (joinedBonus ? peopleCount * 2 : peopleCount);
  const templates: { layout: string }[] = location.state?.templates ?? [];
  const keychainOrder: KeychainOrder[] = location.state?.orders ?? [];
  const a4Count: number = location.state?.a4Count ?? 0;
  const miscAddons: { name: string; qty: number; photoUrl?: string; photoThumb?: string }[] = [
    ...keychainOrder.map((o) => ({ name: o.name, qty: o.qty })),
    ...(location.state?.miscAddons ?? []),
  ];
  // Di dalam komponen, tambah ref:
  const receiptRef = useRef<HTMLDivElement>(null);

  const autoUploadReceipt = async () => {
    try {
      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const W = 210; // A4 width mm
      const margin = 20;
      const contentW = W - margin * 2;
      let y = 20;

      const addText = (
        text: string,
        x: number,
        yPos: number,
        opts: {
          fontSize?: number;
          fontStyle?: "normal" | "bold";
          color?: [number, number, number];
          align?: "left" | "center" | "right";
        } = {},
      ) => {
        const {
          fontSize = 11,
          fontStyle = "normal",
          color = [30, 30, 30],
          align = "left",
        } = opts;
        pdf.setFontSize(fontSize);
        pdf.setFont("helvetica", fontStyle);
        pdf.setTextColor(...color);
        pdf.text(text, x, yPos, { align });
      };

      // ── HEADER ──
      pdf.setFillColor(0, 0, 0);
      pdf.roundedRect(margin, y, contentW, 28, 4, 4, "F");
      addText("IGNOS STUDIO", W / 2, y + 10, {
        fontSize: 18,
        fontStyle: "bold",
        color: [255, 255, 255],
        align: "center",
      });
      addText("SESSION SUMMARY", W / 2, y + 20, {
        fontSize: 9,
        color: [180, 180, 180],
        align: "center",
      });
      y += 36;

      // ── DIVIDER ──
      const drawDivider = () => {
        pdf.setDrawColor(210, 210, 210);
        pdf.setLineDashPattern([2, 2], 0);
        pdf.line(margin, y, W - margin, y);
        pdf.setLineDashPattern([], 0);
        y += 6;
      };

      // ── SECTION HEADER ──
      const drawSectionHeader = (label: string) => {
        addText(label.toUpperCase(), margin, y, {
          fontSize: 8,
          color: [150, 150, 150],
          fontStyle: "bold",
        });
        y += 6;
      };

      // ── ROW ──
      const drawRow = (label: string, value: string, highlight = false) => {
        if (highlight) {
          pdf.setFillColor(0, 0, 0);
          pdf.rect(margin, y - 5, contentW, 10, "F");
          addText(label, margin + 3, y + 1, {
            fontSize: 11,
            fontStyle: "bold",
            color: [255, 255, 255],
          });
          addText(value, W - margin - 3, y + 1, {
            fontSize: 11,
            fontStyle: "bold",
            color: [255, 204, 0],
            align: "right",
          });
        } else {
          addText(label, margin, y + 1, {
            fontSize: 11,
            fontStyle: "bold",
            color: [60, 60, 60],
          });
          addText(value, W - margin, y + 1, {
            fontSize: 11,
            fontStyle: "bold",
            align: "right",
          });
        }
        y += 10;
      };

      // ── SESI ──
      drawSectionHeader("Sesi");
      drawRow(
        coupleMode ? "Couple Mode" : "Regular",
        coupleMode ? "1 pasang" : `${peopleCount} orang`,
      );
      y += 2;
      drawDivider();

      // ── TEMPLATE ──
      drawSectionHeader("Template");
      if (templates.length > 0) {
        templates.forEach((tpl, i) => {
          drawRow(`Template ${i + 1}`, layoutLabels[tpl.layout] ?? tpl.layout);
        });
      } else {
        drawRow("Template", "-");
      }
      y += 2;
      drawDivider();

      // ── PRINT ──
      drawSectionHeader("Print");
      drawRow(
        coupleMode ? `Print reguler (${peopleCount} orang)` : "Print reguler",
        `${regularPrint}x`,
      );
      if (joinedBonus) drawRow("Bonus print", `+${bonusPrint}x`);
      y += 1;
      drawRow("Total print", `${totalPrint} lembar`, true);
      y += 2;

      // ── CETAK A4 ──
      if (a4Count > 0) {
        drawDivider();
        drawSectionHeader("Cetak A4");
        drawRow("Cetak Foto A4", `${a4Count} lembar`);
        y += 2;
      }

      // ── ADDON LAINNYA ──
      if (miscAddons.length > 0) {
        drawDivider();
        drawSectionHeader("Addon Lainnya");
        const loadImage = (src: string): Promise<HTMLImageElement> =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
          });

        for (const addon of miscAddons) {
          drawRow(addon.name, `${addon.qty}x`);
          if (addon.photoUrl) {
            try {
              const img = await loadImage(addon.photoUrl);
              pdf.addImage(img, "PNG", W - margin - 16, y - 9, 16, 24);
              y += 16;
            } catch (err) {
              console.error("Failed to add image to PDF:", err);
            }
          }
        }
        y += 2;
      }

      drawDivider();

      // ── BONUS ──
      drawSectionHeader("Bonus");
      drawRow("Program bonus", joinedBonus ? "✓ Ikut" : "✗ Tidak");
      y += 2;
      drawDivider();

      // ── ADD-ONS ──
      drawSectionHeader("Instagram Story");
      drawRow("Instagram Story", makeStory ? "✓ Ya (Gratis)" : "✗ Bayar (+Rp 25.000)");
      if (makeStory && instagramUsernames.length > 0) {
        instagramUsernames.forEach((username, i) => {
          addText(`  ${i + 1}. @${username}`, margin, y + 1, {
            fontSize: 10,
            color: [80, 80, 80],
          });
          y += 8;
        });
      } else if (!makeStory && customerName) {
        drawRow("Nama Customer", customerName);
      }
      y += 2;
      drawDivider();

      const now = new Date();
      const timeStr = `${now.getDate().toString().padStart(2, "0")}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}.${now.getMinutes().toString().padStart(2, "0")}`;
      const filename =
        customerName
          ? `struk-tambahan-${customerName}.pdf`
          : `struk-tambahan-sesi ${timeStr}.pdf`;

      // ── FOOTER ──
      y += 4;
      pdf.setFillColor(0, 0, 0);
      pdf.roundedRect(margin, y, contentW, 18, 4, 4, "F");
      addText("Terima kasih sudah datang ke Ignos Studio", W / 2, y + 7, {
        fontSize: 10,
        fontStyle: "bold",
        color: [255, 255, 255],
        align: "center",
      });
      addText("jangan lupa datang kembali ya!", W / 2, y + 14, {
        fontSize: 9,
        color: [180, 180, 180],
        align: "center",
      });

      // Get PDF as blob and upload to api/save-print
      const blob = pdf.output("blob");
      const formData = new FormData();
      formData.append("file", blob, filename);
      trackPrintFile(filename);

      await fetch(
        "http://localhost:5000/api/save-print?label=struk&printProfile=struk",
        {
          method: "POST",
          body: formData,
        },
      );
      console.log("Receipt saved to server successfully.");
    } catch (err) {
      console.error("Failed to generate/upload receipt PDF:", err);
    }
  };

  const [driveData, setDriveData] = useState<{
    folderName: string;
    webViewLink: string;
  } | null>(() => {
    try {
      const cached = sessionStorage.getItem(DRIVE_LINK_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [driveLoading, setDriveLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    isUploading: boolean;
    total: number;
    uploaded: number;
    percent: number;
    currentFile: string;
  } | null>(null);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      fetch("http://localhost:5000/api/gdrive-upload-status")
        .then((r) => r.json())
        .then((data) => {
          if (data && data.total > 0) {
            setUploadProgress(data);
          }
        })
        .catch(() => {});
    }, 2000);

    return () => clearInterval(checkInterval);
  }, []);

  const customerName = (
    location.state?.customerName ||
    instagramUsernames[0] ||
    ""
  ).replace(/^@+/, "").trim();

  const autoUploadDrive = async () => {
    const cached = sessionStorage.getItem(DRIVE_LINK_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setDriveData(parsed);
        setDriveLoading(false);
        return;
      } catch (e) {}
    }

    try {
      setDriveLoading(true);
      // Ambil SEMUA foto dari galeri jepretan studio sesi ini
      let allGalleryPhotos: string[] = [];
      try {
        const cachedGallery = sessionStorage.getItem("gallery");
        if (cachedGallery) {
          const parsed = JSON.parse(cachedGallery);
          allGalleryPhotos = parsed.map((item: any) => item.full);
        }
      } catch (e) {}

      const chosenPhotos = getSessionRawPhotos();
      const rawPhotos = Array.from(new Set([...allGalleryPhotos, ...chosenPhotos]));
      const printFiles = getSessionPrintFiles();

      const res = await fetch("http://localhost:5000/api/upload-session-gdrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          rawPhotos,
          printFiles,
          peopleCount,
          coupleMode,
          joinedBonus,
          makeStory,
          extraCharge: location.state?.extraCharge ?? (makeStory ? 0 : 25000),
          totalPrint,
          regularPrint,
          bonusPrint,
          a4Count,
          miscAddons,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        const result = {
          folderName: data.folderName,
          webViewLink: data.webViewLink,
        };
        setDriveData(result);
        sessionStorage.setItem(DRIVE_LINK_KEY, JSON.stringify(result));
      }
    } catch (err) {
      console.error("Gagal auto upload Google Drive:", err);
    } finally {
      setDriveLoading(false);
    }
  };

  const uploadStarted = useRef(false);

  useEffect(() => {
    if (uploadStarted.current) return;
    uploadStarted.current = true;
    autoUploadReceipt();
    autoUploadDrive();
  }, []);

  const layoutLabels: { [key: string]: string } = {
    "1": "1 Slot",
    "2": "2 Slot",
    "4": "4 Slot",
    "6": "6 Slot",
    "8": "8 Slot",
    newspaper: "Newspaper",
    wannabeyours: "Wanna Be Yours",
    "300days": "300 Days",
  };

  const regularPrint = peopleCount;
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
        <div className="max-w-6xl w-full">
          {/* ── JUDUL & SUBJUDUL HALAMAN ── */}
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-black mb-2 text-black tracking-tight">
              Sesi Selesai! 🎉
            </h1>
            <p className="text-lg text-gray-600 font-medium max-w-xl mx-auto">
              Scan QR Code untuk mengunduh softcopy foto, dan tunjukkan struk ke kasir untuk transaksi.
            </p>
          </div>

          {/* ── DUA KOLOM SEIMBANG: SOFTCOPY & STRUK KASIR ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-12">
            {/* ── KOLOM 1: SOFTCOPY QR CODE (BACKGROUND PUTIH & BALANCED HEIGHT) ── */}
            <div className="bg-white border-4 border-black rounded-3xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center relative overflow-hidden flex flex-col items-center">
              {/* Header Card */}
              <div>
                <div className="inline-flex items-center bg-black text-white px-5 py-2 rounded-full font-black text-sm tracking-wider uppercase mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)]">
                  <span>Softcopy Foto Kamu</span>
                </div>
                <h2 className="text-3xl font-black mb-2 text-black leading-tight">
                  Scan & Download Foto!
                </h2>
                <p className="text-sm text-gray-600 font-semibold max-w-sm mx-auto mb-4">
                  Arahkan kamera HP ke QR Code di bawah untuk mengunduh semua foto mentah & hasil cetak:
                </p>
              </div>

              {/* Center Content (QR Code & Actions) */}
              <div className="w-full flex flex-col items-center">
                {driveLoading ? (
                  <div className="bg-gray-50 border-4 border-black rounded-2xl p-8 flex flex-col items-center justify-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full">
                    <Loader2 size={44} className="animate-spin text-black" />
                    <p className="text-base font-bold text-gray-800">Menyiapkan link Google Drive kamu...</p>
                  </div>
                ) : driveData?.webViewLink ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    {/* QR Code Container */}
                    <div className="bg-white p-4 border-4 border-black rounded-3xl shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] inline-block">
                      <QRCodeSVG
                        value={driveData.webViewLink}
                        size={230}
                        level="M"
                        includeMargin={false}
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Folder Google Drive:
                      </p>
                      <p className="text-sm font-black bg-gray-50 px-4 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] inline-block">
                        {driveData.folderName}
                      </p>
                    </div>

                    <a
                      href={driveData.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-black text-black bg-yellow-300 hover:bg-black hover:text-white px-5 py-2.5 rounded-xl border-3 border-black transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                    >
                      <span>Buka Link Folder Drive</span>
                      <ExternalLink size={16} />
                    </a>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border-4 border-black rounded-2xl text-black text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full">
                    Link Google Drive sedang disiapkan server. Kasir dapat membantu memeriksa softcopy foto Anda.
                  </div>
                )}
              </div>

              {/* Bottom Footer (Upload Progress) */}
              <div className="w-full mt-4 pt-3 border-t-2 border-dashed border-gray-200">
                {uploadProgress && uploadProgress.total > 0 ? (
                  <div className="w-full bg-gray-50 p-3 border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-left">
                    <div className="flex justify-between items-center mb-1 text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        {uploadProgress.isUploading ? (
                          <>
                            <Loader2 size={13} className="animate-spin text-black" />
                            <span>Mengunggah foto ke Drive...</span>
                          </>
                        ) : (
                          <span className="text-green-700 font-black">✓ Selesai Diunggah</span>
                        )}
                      </span>
                      <span className="font-black text-black text-xs">
                        {uploadProgress.uploaded} / {uploadProgress.total} ({uploadProgress.percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden border border-black">
                      <div
                        className={`h-full transition-all duration-300 ${uploadProgress.isUploading ? "bg-yellow-400" : "bg-green-500"}`}
                        style={{ width: `${Math.max(uploadProgress.percent, 5)}%` }}
                      />
                    </div>
                    {uploadProgress.isUploading && uploadProgress.currentFile && (
                      <p className="text-[10px] text-gray-500 mt-1 truncate font-medium">
                        File: {uploadProgress.currentFile}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-medium">
                    Semua foto sesi ini tersimpan aman di cloud.
                  </p>
                )}
              </div>
            </div>

            {/* ── KOLOM 2: STRUK KASIR (BALANCED HEIGHT) ── */}
            <div
              ref={receiptRef}
              className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
            >
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

              {miscAddons.length > 0 && (
                <>
                  <Divider />
                  <SectionHeader
                    icon={
                      <ShoppingBag
                        size={16}
                        strokeWidth={2.5}
                        className="text-gray-400"
                      />
                    }
                    label="Addon Lainnya"
                  />
                  {miscAddons.map((addon, i) => (
                    <div key={i} className="mb-2">
                      <Row label={addon.name} value={`${addon.qty}x`} />
                      {addon.photoThumb && (
                        <div className="mt-1 flex justify-start pl-2">
                          <img
                            src={addon.photoThumb}
                            alt="Frame Content"
                            className="w-16 h-24 object-cover border-4 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          />
                        </div>
                      )}
                    </div>
                  ))}
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
                value={makeStory ? "✅ Ya (Gratis)" : "❌ Bayar (+Rp 25.000)"}
              />
              {!makeStory && customerName && (
                <Row
                  label="Nama Customer"
                  value={customerName}
                />
              )}
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
        </div>

        {/* Back home */}
        <div className="flex justify-center">
            <button
              onClick={() => {
                clearSessionData();
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
