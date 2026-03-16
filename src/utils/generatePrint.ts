import html2canvas from "html2canvas";

export async function generatePrint() {
  const element = document.getElementById("print-area");

  if (!element) return;

  const canvas = await html2canvas(element, {
    width: 1200,
    height: 1800,
    scale: 2,
    useCORS: true,
    backgroundColor: null,
  });

  const image = canvas.toDataURL("image/png", 1.0);

  const link = document.createElement("a");
  link.href = image;
  link.download = `print-${Date.now()}.png`;
  link.click();
}
