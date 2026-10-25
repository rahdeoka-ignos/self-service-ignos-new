const { google } = require("googleapis");
const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const CLIENT_SECRET_FILE = path.join(
  __dirname,
  "client_secret_121489758121-s8m191i7udi7is484l0cog3v4nio42gu.apps.googleusercontent.com.json"
);
const TOKEN_FILE = path.join(__dirname, "oauth-token.json");

if (!fs.existsSync(CLIENT_SECRET_FILE)) {
  console.error("File client_secret tidak ditemukan:", CLIENT_SECRET_FILE);
  process.exit(1);
}

const secretData = JSON.parse(fs.readFileSync(CLIENT_SECRET_FILE, "utf8"));
const credentials = secretData.installed || secretData.web;

if (!credentials) {
  console.error("Format client_secret JSON tidak dikenali.");
  process.exit(1);
}

const PORT = 3123;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

const oauth2Client = new google.auth.OAuth2(
  credentials.client_id,
  credentials.client_secret,
  REDIRECT_URI
);

const scopes = [
  "https://www.googleapis.com/auth/drive",
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: scopes,
});

console.log("==================================================");
console.log(" Membuka browser untuk otorisasi Google Drive...");
console.log(" Jika browser tidak terbuka otomatis, buka link ini:");
console.log(authUrl);
console.log("==================================================");

const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/oauth2callback")) {
      const q = url.parse(req.url, true).query;
      if (q.error) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<h2>Login Dibatalkan: ${q.error}</h2>`);
        console.error("Login ditolak:", q.error);
        server.close();
        process.exit(1);
      }

      if (q.code) {
        const { tokens } = await oauth2Client.getToken(q.code);
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), "utf8");

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
          <div style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #10b981;">🎉 Otorisasi Google Drive Berhasil!</h1>
            <p style="font-size: 18px;">Token sudah berhasil disimpan permanen di komputer kiosk Anda.</p>
            <p style="color: #6b7280;">Anda sudah bisa menutup jendela browser ini sekarang.</p>
          </div>
        `);

        console.log("\n✅ Sukses! Token otorisasi disimpan ke: oauth-token.json");
        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1500);
      }
    }
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Terjadi error: " + err.message);
    console.error("Error penukaran token:", err);
  }
});

server.listen(PORT, () => {
  // Buka URL di browser default Windows
  exec(`start "" "${authUrl}"`);
});
