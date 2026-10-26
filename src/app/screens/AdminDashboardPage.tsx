import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Printer,
  DollarSign,
  Gift,
  Calendar,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  FileText,
  Clock,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { AdminLayout } from "../components/AdminLayout";
import type { SessionsResponse, SessionRecord } from "../../types/session";

const API = "http://localhost:5000";

function formatRupiah(num: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateIndo(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function AdminDashboardPage() {
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [printingReceipt, setPrintingReceipt] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSessions = async (date = selectedDate) => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/sessions?date=${date}`);
      if (res.ok) {
        const json: SessionsResponse = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Gagal memuat sesi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions(selectedDate);
    const interval = setInterval(() => fetchSessions(selectedDate), 5000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const handleDeleteSession = async (id: string, name: string) => {
    if (!confirm(`Hapus riwayat sesi customer "${name}"?`)) return;
    try {
      const res = await fetch(`${API}/api/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSessions(selectedDate);
      }
    } catch (err) {
      alert("Gagal menghapus sesi: " + err);
    }
  };

  const handleCopyWhatsAppText = () => {
    if (!data) return;
    const { summary, sessions, date } = data;

    let text = `*REKAP PENJUALAN IGNOS STUDIO*\n`;
    text += `Tanggal: ${formatDateIndo(date)}\n`;
    text += `------------------------------------\n`;
    text += `👥 Total Sesi: ${summary.totalSessions} Sesi (${summary.totalPeople} Orang)\n`;
    text += `🖨️ Kertas 4R: ${summary.totalPrints.total4R} Lembar (${summary.totalPrints.regular} Reguler + ${summary.totalPrints.bonus} Bonus)\n`;
    if (summary.totalPrints.a4 > 0) {
      text += `📄 Kertas A4: ${summary.totalPrints.a4} Lembar\n`;
    }
    text += `🎁 Softcopy: ${summary.softcopy.storyFree} Story Gratis | ${summary.softcopy.paid} Bayar (+${formatRupiah(summary.softcopy.paidRevenue)})\n`;
    text += `------------------------------------\n`;
    text += `💰 *TOTAL OMSET: ${formatRupiah(summary.totalOmset)}*\n`;
    text += `------------------------------------\n\n`;

    text += `*Rincian Sesi Hari Ini:*\n`;
    sessions.forEach((s, idx) => {
      const softcopyLabel = s.makeStory ? "Story Gratis" : `Softcopy Bayar (+${formatRupiah(s.softcopyCharge)})`;
      const addonsStr = s.miscAddons?.length > 0 ? `, Addon: ${s.miscAddons.map((a) => `${a.name} (${a.qty}x)`).join(", ")}` : "";
      text += `${idx + 1}. [${s.time}] ${s.customerName} - ${s.coupleMode ? "Couple" : `${s.peopleCount} org`} (${s.prints.total} lembar 4R, ${softcopyLabel}${addonsStr}) -> ${formatRupiah(s.totalPrice)}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrintClosingReceipt = async () => {
    if (!data || data.sessions.length === 0) {
      alert("Belum ada data sesi untuk dicetak struk rekapnya!");
      return;
    }
    try {
      setPrintingReceipt(true);
      const { jsPDF } = await import("jspdf");

      // 80mm thermal receipt
      const W = 80;
      const H = 160 + data.sessions.length * 12;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [W, H],
      });

      let y = 10;
      const margin = 5;
      const contentW = W - margin * 2;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.text("IGNOS STUDIO", W / 2, y, { align: "center" });
      y += 6;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("REKAP CLOSING SHIFT", W / 2, y, { align: "center" });
      y += 5;
      pdf.text(formatDateIndo(data.date), W / 2, y, { align: "center" });
      y += 6;

      // Divider
      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(margin, y, W - margin, y);
      y += 5;

      const drawRow = (label: string, val: string, bold = false) => {
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(9);
        pdf.text(label, margin, y);
        pdf.text(val, W - margin, y, { align: "right" });
        y += 5;
      };

      drawRow("Total Sesi:", `${data.summary.totalSessions} sesi`);
      drawRow("Total Orang:", `${data.summary.totalPeople} orang`);
      drawRow("Kertas 4R:", `${data.summary.totalPrints.total4R} lembar`);
      if (data.summary.totalPrints.a4 > 0) {
        drawRow("Cetak A4:", `${data.summary.totalPrints.a4} lembar`);
      }
      drawRow("Softcopy Story:", `${data.summary.softcopy.storyFree}x (gratis)`);
      drawRow("Softcopy Bayar:", `${data.summary.softcopy.paid}x (+${formatRupiah(data.summary.softcopy.paidRevenue)})`);

      y += 2;
      pdf.line(margin, y, W - margin, y);
      y += 6;

      drawRow("TOTAL OMSET:", formatRupiah(data.summary.totalOmset), true);

      y += 4;
      pdf.line(margin, y, W - margin, y);
      y += 6;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("DAFTAR TRANSAKSI:", margin, y);
      y += 5;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      data.sessions.forEach((s, idx) => {
        pdf.text(`${idx + 1}. [${s.time}] ${s.customerName}`, margin, y);
        pdf.text(formatRupiah(s.totalPrice), W - margin, y, { align: "right" });
        y += 4.5;
      });

      y += 6;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("Tanda Tangan Kasir:", margin, y);
      y += 18;
      pdf.text("(...................................)", margin, y);

      const blob = pdf.output("blob");
      const formData = new FormData();
      const filename = `rekap-shift-${data.date}.pdf`;
      formData.append("file", blob, filename);

      await fetch(`${API}/api/save-print?label=rekap-shift&printProfile=struk`, {
        method: "POST",
        body: formData,
      });

      alert("Struk Rekap Shift berhasil dikirim ke printer struk!");
    } catch (err: any) {
      alert("Gagal mencetak struk: " + err.message);
    } finally {
      setPrintingReceipt(false);
    }
  };

  const filteredSessionsList = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.sessions;
    const q = searchQuery.toLowerCase();
    return data.sessions.filter(
      (s) =>
        s.customerName.toLowerCase().includes(q) ||
        s.time.includes(q) ||
        (s.driveFolderName && s.driveFolderName.toLowerCase().includes(q)),
    );
  }, [data, searchQuery]);

  return (
    <AdminLayout>
      <div className="w-full p-6 md:p-8 lg:p-10 space-y-6 md:space-y-8 min-w-0">
        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-black leading-tight flex items-center gap-3">
              <span>Dashboard Rekap & Penjualan</span>
            </h1>
            <p className="text-gray-500 font-medium mt-1">
              Rekap harian sesi foto, pemakaian kertas, softcopy, dan estimasi omset Ignos Studio
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Salin ke WA Button */}
            <button
              onClick={handleCopyWhatsAppText}
              disabled={!data || data.sessions.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white font-bold border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-green-600 transition-all cursor-pointer text-sm disabled:opacity-50"
              title="Salin rekap ke format WhatsApp"
            >
              {copied ? <Check size={18} strokeWidth={3} /> : <Copy size={18} strokeWidth={2.5} />}
              <span>{copied ? "Tersalin ke Clipboard!" : "Salin ke WA"}</span>
            </button>

            {/* Cetak Struk Rekap */}
            <button
              onClick={handlePrintClosingReceipt}
              disabled={printingReceipt || !data || data.sessions.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-yellow-300 text-black font-bold border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-400 transition-all cursor-pointer text-sm disabled:opacity-50"
            >
              <FileText size={18} strokeWidth={2.5} />
              <span>{printingReceipt ? "Mencetak..." : "Cetak Struk Rekap"}</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchSessions(selectedDate)}
              disabled={loading}
              className="p-2.5 bg-white text-black font-bold border-3 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all cursor-pointer"
              title="Perbarui data"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── DATE FILTER BAR ── */}
        <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-gray-400 mr-1">
              Pilih Tanggal:
            </span>
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer ${
                selectedDate === todayStr
                  ? "bg-black text-white"
                  : "bg-gray-100 text-black hover:bg-gray-200"
              }`}
            >
              Hari Ini
            </button>

            {data?.allAvailableDates
              ?.filter((d) => d !== todayStr)
              .slice(0, 3)
              .map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 border-black transition-all cursor-pointer ${
                    selectedDate === d
                      ? "bg-black text-white"
                      : "bg-gray-100 text-black hover:bg-gray-200"
                  }`}
                >
                  {d}
                </button>
              ))}

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1 border-2 border-black rounded-xl text-xs font-bold outline-none bg-white cursor-pointer"
            />
          </div>

          <div className="text-xs font-bold text-gray-500">
            Menampilkan data: <strong className="text-black">{formatDateIndo(selectedDate)}</strong>
          </div>
        </div>

        {/* ── 4 METRIC CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6">
          {/* Card 1: Total Sesi */}
          <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col justify-between">
            <div className="w-12 h-12 bg-blue-300 border-3 border-black rounded-2xl flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Users size={24} strokeWidth={2.5} className="text-black" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
              Total Sesi Foto
            </p>
            <p className="text-4xl font-black text-black">
              {data?.summary.totalSessions ?? 0} Sesi
            </p>
            <p className="text-xs text-gray-500 font-bold mt-2">
              Total {data?.summary.totalPeople ?? 0} orang berfoto
            </p>
          </div>

          {/* Card 2: Estimasi Omset */}
          <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col justify-between">
            <div className="w-12 h-12 bg-green-300 border-3 border-black rounded-2xl flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <DollarSign size={24} strokeWidth={2.5} className="text-black" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
              Estimasi Omset Hari Ini
            </p>
            <p className="text-3xl sm:text-4xl font-black text-green-700">
              {formatRupiah(data?.summary.totalOmset ?? 0)}
            </p>
            <p className="text-xs text-gray-500 font-bold mt-2">
              Sesi dasar + addon + softcopy
            </p>
          </div>

          {/* Card 3: Kertas Terpakai */}
          <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col justify-between">
            <div className="w-12 h-12 bg-yellow-300 border-3 border-black rounded-2xl flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Printer size={24} strokeWidth={2.5} className="text-black" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
              Kertas Foto Terpakai
            </p>
            <p className="text-4xl font-black text-black">
              {data?.summary.totalPrints.total4R ?? 0} Lembar
            </p>
            <p className="text-xs text-gray-500 font-bold mt-2 truncate">
              {data?.summary.totalPrints.regular ?? 0} Reguler + {data?.summary.totalPrints.bonus ?? 0} Bonus
              {(data?.summary.totalPrints.a4 ?? 0) > 0 && ` | ${data?.summary.totalPrints.a4} A4`}
            </p>
          </div>

          {/* Card 4: Softcopy Story vs Bayar */}
          <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col justify-between">
            <div className="w-12 h-12 bg-pink-300 border-3 border-black rounded-2xl flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Gift size={24} strokeWidth={2.5} className="text-black" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
              Softcopy Story vs Bayar
            </p>
            <p className="text-3xl font-black text-black">
              {data?.summary.softcopy.storyFree ?? 0} / {data?.summary.softcopy.paid ?? 0}
            </p>
            <p className="text-xs text-gray-500 font-bold mt-2">
              {data?.summary.softcopy.storyFree ?? 0} Story Gratis | {data?.summary.softcopy.paid ?? 0} Bayar ({formatRupiah(data?.summary.softcopy.paidRevenue ?? 0)})
            </p>
          </div>
        </div>

        {/* ── ADD-ONS SUMMARY PILLS (IF ANY) ── */}
        {(data?.summary.addonsSummary?.length ?? 0) > 0 && (
          <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
              <ShoppingBag size={14} />
              <span>Rincian Add-ons Terjual:</span>
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {data?.summary.addonsSummary.map((item) => (
                <span
                  key={item.name}
                  className="bg-gray-100 border-2 border-black rounded-xl px-3 py-1 text-xs font-black flex items-center gap-2"
                >
                  <span>{item.name}</span>
                  <span className="bg-black text-white px-1.5 py-0.5 rounded text-[10px]">
                    {item.qty}x
                  </span>
                  <span className="text-green-700 font-bold">
                    {formatRupiah(item.revenue)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── SESSION LOG TABLE ── */}
        <div className="bg-white border-4 border-black rounded-3xl p-6 lg:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b-3 border-gray-200 gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black leading-tight">
                Log Transaksi Sesi Foto
              </h2>
              <p className="text-xs text-gray-500 font-bold mt-0.5">
                Total {filteredSessionsList.length} transaksi pada tanggal ini
              </p>
            </div>

            <div className="w-full sm:w-80">
              <input
                type="text"
                placeholder="Cari nama / jam sesi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-black rounded-xl text-xs font-bold outline-none placeholder:text-gray-400 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black transition-all"
              />
            </div>
          </div>

          {filteredSessionsList.length === 0 ? (
            <div className="py-16 text-center border-4 border-dashed border-gray-300 rounded-2xl">
              <Clock size={36} className="text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-bold text-gray-500">
                Belum ada sesi foto yang tercatat pada tanggal ini.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Data akan otomatis masuk setiap customer menyelesaikan sesi di kiosk.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-3 border-black text-xs font-black uppercase tracking-wider text-gray-400">
                    <th className="py-3.5 px-4">Jam</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Paket Sesi</th>
                    <th className="py-3.5 px-4">Lembar Print</th>
                    <th className="py-3.5 px-4">Softcopy</th>
                    <th className="py-3.5 px-4">Add-ons</th>
                    <th className="py-3.5 px-4 text-right">Total Transaksi</th>
                    <th className="py-3.5 px-4 text-center">Google Drive</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-gray-100 text-sm font-bold">
                  {filteredSessionsList.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                      {/* Jam */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="bg-gray-100 border border-black px-2 py-1 rounded-md text-xs font-mono font-bold">
                          {session.time}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <p className="font-black text-black">{session.customerName}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{session.id}</p>
                      </td>

                      {/* Paket Sesi */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {session.coupleMode ? (
                          <span className="bg-pink-100 text-pink-800 border border-pink-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                            Couple ({session.peopleCount} org)
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-800 border border-blue-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                            {session.peopleCount} Orang
                          </span>
                        )}
                      </td>

                      {/* Lembar Print */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-black font-black">
                          {session.prints?.total ?? session.peopleCount}x Lembar
                        </span>
                        <span className="text-xs text-gray-400 ml-1 block font-normal">
                          ({session.prints?.regular ?? session.peopleCount} reg + {session.prints?.bonus ?? 0} bonus)
                        </span>
                      </td>

                      {/* Softcopy */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {session.makeStory ? (
                          <span className="bg-green-100 text-green-800 border border-green-400 text-xs px-2 py-0.5 rounded-full font-bold">
                            ✓ Story Gratis
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 border border-yellow-400 text-xs px-2 py-0.5 rounded-full font-bold">
                            +Rp 25.000 Bayar
                          </span>
                        )}
                      </td>

                      {/* Addons */}
                      <td className="py-3.5 px-4">
                        {session.miscAddons?.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {session.miscAddons.map((a, i) => (
                              <span key={i} className="text-xs text-gray-700">
                                • {a.name} ({a.qty}x)
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="text-base font-black text-black">
                          {formatRupiah(session.totalPrice)}
                        </span>
                      </td>

                      {/* Google Drive */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {session.driveWebViewLink ? (
                          <a
                            href={session.driveWebViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold bg-yellow-200 hover:bg-black hover:text-white px-2.5 py-1 rounded-lg border border-black transition-colors"
                            title="Buka Folder Drive"
                          >
                            <span>Drive</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteSession(session.id, session.customerName)}
                          className="w-8 h-8 rounded-lg border border-gray-300 hover:border-red-500 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors inline-flex items-center justify-center cursor-pointer"
                          title="Hapus sesi"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
