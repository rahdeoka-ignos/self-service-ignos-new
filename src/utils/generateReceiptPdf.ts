import type { jsPDF } from "jspdf";

export interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptData {
  invoiceNumber: string;
  dateStr: string;
  timeStr: string;
  customerName: string;
  customerPhone?: string;
  notes?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  total: number;
  paymentMethod: "cash" | "qris" | "transfer";
  cashReceived?: number;
  cashChange?: number;
  studioName?: string;
  studioTagline?: string;
  studioAddress?: string;
  studioPhone?: string;
  studioInstagram?: string;
  footerNote?: string;
}

function formatRupiahPdf(num: number): string {
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

export async function generateReceiptPdf(data: ReceiptData): Promise<{
  pdf: jsPDF;
  blob: Blob;
  blobUrl: string;
  fileName: string;
  download: () => void;
}> {
  const { jsPDF } = await import("jspdf");
  const W = 80; // Standard receipt width in mm

  // Generous height calculation so layout breathes beautifully without cramping
  const itemsCount = Math.max(1, data.items?.length || 1);
  const H = Math.max(200, 175 + itemsCount * 13 + (data.notes ? 10 : 0));

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [W, H],
  });

  const margin = 7;
  const contentWidth = W - margin * 2;
  let y = 12; // 12mm top breathing room

  // 1. HEADER BRANDING
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13.5);
  pdf.setTextColor(23, 23, 23);
  const studioTitle = (data.studioName || "IGNOS STUDIO").toUpperCase();
  pdf.text(studioTitle, W / 2, y, { align: "center" });
  y += 5.5;

  if (data.studioTagline) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.8);
    pdf.setTextColor(110, 110, 110);
    pdf.text(data.studioTagline, W / 2, y, { align: "center" });
    y += 4.5;
  }

  if (data.studioAddress) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(125, 125, 125);
    const splitAddr = pdf.splitTextToSize(data.studioAddress, contentWidth);
    pdf.text(splitAddr, W / 2, y, { align: "center" });
    y += splitAddr.length * 3.8;
  }

  const phoneStr = formatContactPhone(data.studioPhone);
  const igStr = formatContactIg(data.studioInstagram);
  if (phoneStr || igStr) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(125, 125, 125);
    const contactStr = [phoneStr, igStr].filter(Boolean).join("  •  ");
    pdf.text(contactStr, W / 2, y, { align: "center" });
    y += 4.5;
  }

  // Dashed divider 1
  y += 2.5;
  pdf.setDrawColor(215, 215, 215);
  pdf.setLineWidth(0.2);
  pdf.setLineDashPattern([1.5, 1.5], 0);
  pdf.line(margin, y, W - margin, y);
  y += 6.5;

  // 2. TRANSACTION META & STATUS
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.setTextColor(30, 30, 30);
  pdf.text("NOTA E-RECEIPT DIGITAL", margin, y);

  // Status LUNAS badge on top right
  pdf.setFillColor(23, 23, 23);
  pdf.roundedRect(W - margin - 20, y - 4, 20, 5.5, 1.2, 1.2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  pdf.text("LUNAS", W - margin - 10, y - 0.3, { align: "center" });
  y += 6.5;

  const drawMetaRow = (label: string, value: string) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.8);
    pdf.setTextColor(115, 115, 115);
    pdf.text(label, margin, y);
    pdf.setFont("helvetica", "medium");
    pdf.setTextColor(30, 30, 30);
    pdf.text(value, W - margin, y, { align: "right" });
    y += 5.2; // Generous row height
  };

  drawMetaRow("No. Invoice", data.invoiceNumber);
  drawMetaRow("Waktu", `${data.dateStr}  ${data.timeStr}`);
  drawMetaRow("Customer", data.customerName);
  if (data.customerPhone) {
    drawMetaRow("No. WhatsApp", data.customerPhone);
  }
  if (data.notes) {
    drawMetaRow("Catatan", data.notes);
  }

  // Dashed divider 2
  y += 2;
  pdf.setDrawColor(215, 215, 215);
  pdf.setLineWidth(0.2);
  pdf.setLineDashPattern([1.5, 1.5], 0);
  pdf.line(margin, y, W - margin, y);
  y += 6.5;

  // 3. ITEM LIST HEADER
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(110, 110, 110);
  pdf.text("RINCIAN ITEM", margin, y);
  pdf.text("TOTAL", W - margin, y, { align: "right" });
  y += 5;

  // Items List
  data.items.forEach((item) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(30, 30, 30);
    const itemTitle = item.name;
    const splitTitle = pdf.splitTextToSize(itemTitle, contentWidth - 19);
    pdf.text(splitTitle[0], margin, y);
    pdf.text(formatRupiahPdf(item.total), W - margin, y, { align: "right" });
    y += 4.2;

    for (let i = 1; i < splitTitle.length; i++) {
      pdf.text(splitTitle[i], margin, y);
      y += 4.2;
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(125, 125, 125);
    pdf.text(`${item.qty}x @ ${formatRupiahPdf(item.unitPrice)}`, margin, y);
    y += 5.8; // Generous space before next item
  });

  // Solid Divider for Totals
  y += 1;
  pdf.setDrawColor(215, 215, 215);
  pdf.setLineDashPattern([], 0);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, W - margin, y);
  y += 5.5;

  // 4. TOTALS
  const drawSummaryRow = (label: string, value: string, bold = false, size = 8) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(bold ? 23 : 110, bold ? 23 : 110, bold ? 23 : 110);
    pdf.text(label, margin, y);
    pdf.text(value, W - margin, y, { align: "right" });
    y += bold ? 5.5 : 4.8;
  };

  drawSummaryRow("Subtotal", formatRupiahPdf(data.subtotal));
  if (data.discount && data.discount > 0) {
    drawSummaryRow("Potongan Diskon", `-${formatRupiahPdf(data.discount)}`);
  }

  y += 1.5;
  pdf.setDrawColor(23, 23, 23);
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, W - margin, y);
  y += 6;

  drawSummaryRow("TOTAL TAGIHAN", formatRupiahPdf(data.total), true, 10);

  // 5. PAYMENT BREAKDOWN
  y += 2;
  pdf.setDrawColor(215, 215, 215);
  pdf.setLineWidth(0.2);
  pdf.setLineDashPattern([1.5, 1.5], 0);
  pdf.line(margin, y, W - margin, y);
  y += 6;

  const methodLabel =
    data.paymentMethod === "cash"
      ? "TUNAI (CASH)"
      : data.paymentMethod === "qris"
      ? "QRIS (NON-TUNAI)"
      : "TRANSFER BANK";

  drawSummaryRow("Metode Pembayaran", methodLabel);

  if (data.paymentMethod === "cash" && typeof data.cashReceived === "number") {
    drawSummaryRow("Uang Diterima", formatRupiahPdf(data.cashReceived));
    drawSummaryRow("Uang Kembalian", formatRupiahPdf(data.cashChange || 0), true, 8.5);
  }

  // 6. FOOTER
  y += 3;
  pdf.setDrawColor(215, 215, 215);
  pdf.setLineWidth(0.2);
  pdf.setLineDashPattern([1.5, 1.5], 0);
  pdf.line(margin, y, W - margin, y);
  y += 7;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(30, 30, 30);
  const footerNote = data.footerNote || "Terima kasih telah berfoto bersama kami!";
  pdf.text(footerNote, W / 2, y, { align: "center" });
  y += 4.5;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.8);
  pdf.setTextColor(130, 130, 130);
  const infoText = "Simpan nota digital ini sebagai bukti pemesanan & pengambilan foto.";
  pdf.text(infoText, W / 2, y, { align: "center" });
  y += 3.8;

  if (data.studioInstagram) {
    const cleanIg = data.studioInstagram.replace(/^(ig|instagram)\s*:\s*/i, "").trim();
    const formattedIg = cleanIg.startsWith("@") ? cleanIg : `@${cleanIg}`;
    pdf.text(`Tag kami di Instagram: ${formattedIg}`, W / 2, y, { align: "center" });
  }

  // Export blob and helper
  const cleanInv = data.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `E-Receipt_${cleanInv}_${(data.customerName || "Customer").replace(/\s+/g, "_")}.pdf`;

  const blob = pdf.output("blob");
  const blobUrl = URL.createObjectURL(blob);

  const download = () => {
    pdf.save(fileName);
  };

  return {
    pdf,
    blob,
    blobUrl,
    fileName,
    download,
  };
}
