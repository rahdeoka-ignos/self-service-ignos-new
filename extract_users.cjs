const fs = require("fs");
const readline = require("readline");

async function check() {
  const filePath = "C:\\Users\\LABA\\.gemini\\antigravity\\brain\\31b22bbf-220e-4227-ab06-c1bb04f3c5eb\\.system_generated\\logs\\transcript.jsonl";
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.source === "USER_EXPLICIT" && obj.content) {
        // filter out slash commands or very short messages if needed
        const c = obj.content.trim();
        if (c.length > 20) {
          console.log(`[USER ${obj.created_at}]:`);
          console.log(c);
          console.log("-----------------------------------------");
        }
      }
    } catch {}
  }
}
check();
