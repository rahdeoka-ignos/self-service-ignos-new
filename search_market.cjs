const fs = require("fs");
const text = fs.readFileSync("C:\\Users\\LABA\\.gemini\\antigravity\\brain\\31b22bbf-220e-4227-ab06-c1bb04f3c5eb\\.system_generated\\steps\\3835\\output.txt", "utf-8");
const matches = text.split("-----------------------------------------");
matches.forEach(m => {
  const lower = m.toLowerCase();
  if (lower.includes("jual") || lower.includes("sewa") || lower.includes("target") || lower.includes("market") || lower.includes("franchise") || lower.includes("bisnis") || lower.includes("b2b") || lower.includes("wedding") || lower.includes("photobooth")) {
    console.log(m.trim());
    console.log("=========================================");
  }
});
