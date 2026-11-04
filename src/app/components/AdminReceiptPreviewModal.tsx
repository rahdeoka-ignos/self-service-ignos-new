import { useState } from "react";
import { Download, ExternalLink, Share2, Check, X, RotateCcw } from "lucide-react";
import type { ReceiptData } from "../../utils/generateReceiptPdf";

interface AdminReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewTransaction: () => void;
  receiptData: ReceiptData | null;
  blobUrl: string | null;
  onDownload: () => void;
}

function formatRupiah(num: number): string {
  return "Rp " + (Number(num) || 0).toLocaleString("id-ID");
}

function formatContactPhone(phone?: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/^(wa|whatsapp)\s*:\s*/i, "").trim();
  return cleaned ? `WA: ${cleaned}` : "";
}

function formatContactIg(ig?: string): string {
  if (!ig) return "";
  const cleaned = ig.replace(/^(ig|instagram)\s*:\s*/i, "").trim();
  const withAt = cleaned.startsWith("@") ? cleaned : `@${cleaned}`;
  return `IG: ${withAt}`;
}

export function AdminReceiptPreviewModal({
  isOpen,
  onClose,
  onNewTransaction,
  receiptData,
  blobUrl,
  onDownload,
}: AdminReceiptPreviewModalProps) {
  const [copiedWA, setCopiedWA] = useState(false);

  if (!isOpen || !receiptData) return null;

  const handleSendWhatsApp = () => {
    let cleanPhone = (receiptData.customerPhone || "").replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }

    const itemsSummary = receiptData.items
      .map((it) => `• ${it.name} (${it.qty}x) = ${formatRupiah(it.total)}`)
      .join("\n");

    const methodLabel =
      receiptData.paymentMethod === "cash"
        ? "TUNAI (CASH)"
        : receiptData.paymentMethod === "qris"
        ? "QRIS (NON-TUNAI)"
        : "TRANSFER BANK";

    const cashDetail =
      receiptData.paymentMethod === "cash" && typeof receiptData.cashReceived === "number"
        ? `\nUang Diterima : ${formatRupiah(receiptData.cashReceived)}\nKembalian     : ${formatRupiah(receiptData.cashChange || 0)}`
        : "";

    const message = `*BUKTI TRANSAKSI & E-RECEIPT DIGITAL*
*${(receiptData.studioName || "IGNOS STUDIO").toUpperCase()}*
----------------------------------------
No. Invoice : *${receiptData.invoiceNumber}*
Waktu       : ${receiptData.dateStr} ${receiptData.timeStr}
Pelanggan   : *${receiptData.customerName}*
Status      : *LUNAS* ✅
----------------------------------------
*Rincian Transaksi:*
${itemsSummary}
----------------------------------------
Subtotal    : ${formatRupiah(receiptData.subtotal)}${receiptData.discount ? `\nPotongan    : -${formatRupiah(receiptData.discount)}` : ""}
*TOTAL BAYAR: ${formatRupiah(receiptData.total)}*
Metode      : ${methodLabel}${cashDetail}
----------------------------------------
_Terima kasih telah berfoto bersama kami di ${receiptData.studioName || "IGNOS STUDIO"}! Simpan pesan ini sebagai bukti transaksi & pengambilan softcopy/cetakan._`;

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(waUrl, "_blank", "noopener,noreferrer");
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#e5e5e5] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
          <div>
            <span className="text-[10px] tracking-[0.14em] text-[#999] uppercase font-semibold">
              E-Receipt Digital Berhasil Diterbitkan
            </span>
            <h2 className="text-[17px] font-semibold text-[#171717]">
              {receiptData.invoiceNumber} — {receiptData.customerName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#888] hover:text-[#171717] hover:bg-[#f5f5f5] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body / E-Receipt Paper Preview with generous breathing room */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#f7f7f8] flex justify-center">
          <div className="w-full max-w-[420px] bg-white rounded-xl border border-[#e5e5e5] p-7 sm:p-8 shadow-sm space-y-6 font-sans text-[#171717]">
            {/* Studio Header */}
            <div className="text-center space-y-1.5">
              <h3 className="text-[17px] font-bold tracking-tight text-[#171717]">
                {(receiptData.studioName || "IGNOS STUDIO").toUpperCase()}
              </h3>
              {receiptData.studioTagline && (
                <p className="text-[11.5px] text-[#777]">{receiptData.studioTagline}</p>
              )}
              {receiptData.studioAddress && (
                <p className="text-[11px] text-[#888] leading-relaxed">
                  {receiptData.studioAddress}
                </p>
              )}
              {(receiptData.studioPhone || receiptData.studioInstagram) && (
                <p className="text-[11px] text-[#888] pt-0.5">
                  {[formatContactPhone(receiptData.studioPhone), formatContactIg(receiptData.studioInstagram)].filter(Boolean).join("  •  ")}
                </p>
              )}
            </div>

            {/* Dashed line */}
            <div className="border-b border-dashed border-[#d5d5d5]" />

            {/* Meta */}
            <div className="space-y-2.5 text-[12.5px]">
              <div className="flex justify-between items-center pb-1">
                <span className="text-[12px] font-bold text-[#171717] tracking-wide">
                  NOTA E-RECEIPT DIGITAL
                </span>
                <span className="px-2.5 py-0.5 rounded bg-[#171717] text-white text-[10px] font-semibold tracking-wide">
                  LUNAS
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#888]">No. Invoice</span>
                <span className="font-mono font-medium text-[#171717]">{receiptData.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#888]">Waktu</span>
                <span className="text-[#444]">{receiptData.dateStr}  {receiptData.timeStr}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#888]">Pelanggan</span>
                <span className="font-medium text-[#171717]">{receiptData.customerName}</span>
              </div>
              {receiptData.customerPhone && (
                <div className="flex justify-between items-center">
                  <span className="text-[#888]">No. WhatsApp</span>
                  <span className="text-[#444] font-mono">{receiptData.customerPhone}</span>
                </div>
              )}
              {receiptData.notes && (
                <div className="flex justify-between items-center">
                  <span className="text-[#888]">Catatan</span>
                  <span className="text-[#444] italic">{receiptData.notes}</span>
                </div>
              )}
            </div>

            {/* Dashed line */}
            <div className="border-b border-dashed border-[#d5d5d5]" />

            {/* Items */}
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-semibold text-[#888] uppercase tracking-wider pb-1">
                <span>Rincian Item</span>
                <span>Total</span>
              </div>
              <div className="space-y-3 divide-y divide-[#f2f2f2]">
                {receiptData.items.map((item, idx) => (
                  <div key={idx} className="pt-2.5 first:pt-0 space-y-0.5">
                    <div className="flex justify-between items-baseline text-[13px]">
                      <span className="font-medium text-[#202020]">{item.name}</span>
                      <span className="font-mono font-medium text-[#171717]">{formatRupiah(item.total)}</span>
                    </div>
                    <span className="text-[11.5px] text-[#888] block">
                      {item.qty}x @ {formatRupiah(item.unitPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Solid Divider */}
            <div className="border-b border-[#e5e5e5]" />

            {/* Summary Totals */}
            <div className="space-y-2 text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-[#777]">Subtotal</span>
                <span className="font-mono text-[#444]">{formatRupiah(receiptData.subtotal)}</span>
              </div>
              {receiptData.discount ? (
                <div className="flex justify-between text-[#dc2626]">
                  <span>Potongan Diskon</span>
                  <span className="font-mono">-{formatRupiah(receiptData.discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between items-baseline pt-2 border-t border-[#171717]">
                <span className="text-[13.5px] font-bold text-[#171717]">TOTAL TAGIHAN</span>
                <span className="text-[18px] font-bold font-mono text-[#171717]">
                  {formatRupiah(receiptData.total)}
                </span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-[#fafafa] rounded-lg p-3.5 space-y-2 text-[12px] border border-[#eee]">
              <div className="flex justify-between">
                <span className="text-[#777]">Metode Pembayaran</span>
                <span className="font-semibold text-[#222]">
                  {receiptData.paymentMethod === "cash"
                    ? "TUNAI (CASH)"
                    : receiptData.paymentMethod === "qris"
                    ? "QRIS (NON-TUNAI)"
                    : "TRANSFER BANK"}
                </span>
              </div>
              {receiptData.paymentMethod === "cash" && typeof receiptData.cashReceived === "number" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-[#777]">Uang Diterima</span>
                    <span className="font-mono text-[#444]">{formatRupiah(receiptData.cashReceived)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-[#eee]">
                    <span className="font-medium text-[#171717]">Kembalian</span>
                    <span className="font-mono font-bold text-[#171717]">{formatRupiah(receiptData.cashChange || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer note */}
            <div className="text-center pt-2 space-y-1.5 text-[11px] text-[#888]">
              <p className="font-semibold text-[#333]">{receiptData.footerNote || "Terima kasih telah berfoto bersama kami!"}</p>
              <p className="text-[10.5px]">Simpan nota digital ini sebagai bukti pemesanan & pengambilan foto.</p>
              {receiptData.studioInstagram && (
                <p className="text-[10.5px] text-[#666]">
                  {formatContactIg(receiptData.studioInstagram)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 px-6 bg-white border-t border-[#f0f0f0] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onNewTransaction}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium text-[#666] hover:text-[#171717] hover:bg-[#f5f5f5] rounded-md transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Transaksi Baru</span>
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium text-[#444] hover:text-[#171717] bg-white border border-[#e5e5e5] hover:bg-[#f7f7f7] rounded-md transition-colors"
                title="Buka PDF di tab browser baru"
              >
                <ExternalLink size={13} />
                <span>Buka PDF</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-medium bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 border border-[#25D366]/30 rounded-md transition-colors cursor-pointer"
            >
              {copiedWA ? <Check size={13} /> : <Share2 size={13} />}
              <span>{receiptData.customerPhone ? "Kirim ke WhatsApp" : "Bagikan via WhatsApp"}</span>
            </button>

            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium bg-[#171717] text-white hover:bg-black rounded-md transition-colors cursor-pointer shadow-xs"
            >
              <Download size={13} />
              <span>Unduh PDF E-Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
