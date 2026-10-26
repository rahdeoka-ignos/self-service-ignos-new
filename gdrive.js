import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PARENT_FOLDER_ID = "1-mTsA_nr0uxSzOdjdhYa_QziTUzJztJl";
const TOKEN_FILE_PATH = path.join(__dirname, "oauth-token.json");
const CLIENT_SECRET_FILE_PATH = path.join(
  __dirname,
  "client_secret_121489758121-s8m191i7udi7is484l0cog3v4nio42gu.apps.googleusercontent.com.json"
);
const SERVICE_KEY_FILE_PATH = path.join(__dirname, "ignos-kiosk-960d579fddd3.json");

// Inisialisasi Google Drive Client (Menggunakan OAuth 2.0 user credentials)
export function getDriveClient() {
  if (fs.existsSync(TOKEN_FILE_PATH) && fs.existsSync(CLIENT_SECRET_FILE_PATH)) {
    const secretData = JSON.parse(fs.readFileSync(CLIENT_SECRET_FILE_PATH, "utf8"));
    const creds = secretData.installed || secretData.web;
    const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE_PATH, "utf8"));

    const oauth2Client = new google.auth.OAuth2(
      creds.client_id,
      creds.client_secret,
      "http://localhost:3123/oauth2callback"
    );

    oauth2Client.setCredentials(tokens);

    // Otomatis update token jika refresh
    oauth2Client.on("tokens", (newTokens) => {
      const merged = { ...tokens, ...newTokens };
      fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(merged, null, 2), "utf8");
    });

    return google.drive({ version: "v3", auth: oauth2Client });
  }

  // Fallback to Service Account jika OAuth belum dibuat
  if (fs.existsSync(SERVICE_KEY_FILE_PATH)) {
    const auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_KEY_FILE_PATH,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    return google.drive({ version: "v3", auth });
  }

  throw new Error("Kredensial Google Drive (OAuth atau Service Account) tidak ditemukan.");
}

/**
 * Tes koneksi ke parent folder
 */
export async function testFolderAccess(folderId = PARENT_FOLDER_ID) {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId: folderId,
    fields: "id, name, mimeType",
    supportsAllDrives: true,
  });
  return res.data;
}

const MONTH_NAMES = [
  "januari", "februari", "maret", "april", "mei", "juni",
  "juli", "agustus", "september", "oktober", "november", "desember"
];

const MONTH_SHORTS = [
  "JAN", "FEB", "MAR", "APR", "MEI", "JUN",
  "JUL", "AGU", "SEP", "OKT", "NOV", "DES"
];

/**
 * Cari folder di dalam parentId secara case-insensitive. Jika belum ada, buat baru.
 * @param {import("googleapis").drive_v3.Drive} drive
 * @param {string} folderName - Nama folder yang dicari / dibuat
 * @param {string} parentId - ID folder induk
 * @param {string[]} [alternativeMatches] - Variasi nama lain yang cocok jika ada
 * @returns {Promise<string>} folderId
 */
export async function getOrCreateSubfolder(drive, folderName, parentId, alternativeMatches = []) {
  const q = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const listRes = await drive.files.list({
    q,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const allMatches = [folderName, ...alternativeMatches].map((m) => m.toLowerCase());
  const existing = (listRes.data.files || []).find((f) =>
    allMatches.includes(f.name.toLowerCase())
  );

  if (existing) {
    return existing.id;
  }

  const createRes = await drive.files.create({
    resource: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id, name",
    supportsAllDrives: true,
  });

  return createRes.data.id;
}

/**
 * Membuat subfolder khusus untuk sesi customer dengan struktur hirarki:
 * Root -> Folder Bulan (contoh: "oktober") -> Folder Tanggal (contoh: "26 - OKT") -> Folder Sesi Customer
 * Format folder sesi customer:
 * - Jika ada nama: IGNOS STUDIO - 16.37 (arikulantariiii)
 * - Jika nama kosong: IGNOS STUDIO - 16.37
 * @param {string} customerName - Nama customer (opsional)
 * @param {string} [parentFolderId] - ID folder induk root
 * @returns {Promise<{ folderId: string, folderName: string, webViewLink: string }>}
 */
export async function createCustomerFolder(customerName = "", parentFolderId = PARENT_FOLDER_ID) {
  const drive = getDriveClient();

  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const timeStr = `${hours}.${minutes}`;

  const monthIndex = now.getMonth();
  const monthName = MONTH_NAMES[monthIndex]; // e.g. "oktober"
  const day = now.getDate();
  const dayPadded = String(day).padStart(2, "0");
  const monthShort = MONTH_SHORTS[monthIndex]; // e.g. "OKT"
  const dateFolderName = `${day} - ${monthShort}`; // e.g. "26 - OKT"

  // 1. Dapatkan atau buat folder bulan di dalam root (misal: "oktober")
  const monthFolderId = await getOrCreateSubfolder(drive, monthName, parentFolderId);

  // 2. Dapatkan atau buat folder tanggal di dalam folder bulan (misal: "26 - OKT" atau "05 - OKT")
  const dateFolderId = await getOrCreateSubfolder(
    drive,
    dateFolderName,
    monthFolderId,
    [`${dayPadded} - ${monthShort}`, `${day} - ${monthShort}`]
  );

  // 3. Tentukan nama folder sesi customer
  const cleanName = customerName ? customerName.trim() : "";
  const folderName = cleanName
    ? `IGNOS STUDIO - ${timeStr} (${cleanName})`
    : `IGNOS STUDIO - ${timeStr}`;

  // 4. Buat folder sesi customer di dalam folder tanggal
  const folderMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: [dateFolderId],
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });

  const folderId = folder.data.id;

  // 5. Set permission: anyone with link can view/download
  await drive.permissions.create({
    fileId: folderId,
    resource: {
      role: "reader",
      type: "anyone",
    },
    supportsAllDrives: true,
  });

  // 6. Buat subfolder untuk membungkus hasil foto customer: "FOTONYA DI SINI KAKAK"
  const photosFolderId = await getOrCreateSubfolder(
    drive,
    "FOTONYA DI SINI KAKAK",
    folderId,
    ["FOTONYA DISINI KAK", "FOTOYA DI SINI KAKAK", "FOTONYA DISINI KAKAK"]
  );

  // 7. Upload gambar izin posting ke dalam folder sesi customer jika file ada di public/img
  const IZIN_POSTING_PATH = path.join(__dirname, "public", "img", "izin_posting.jpg");
  if (fs.existsSync(IZIN_POSTING_PATH)) {
    try {
      await uploadFileToDrive(
        IZIN_POSTING_PATH,
        folderId,
        "IZIN POSTING FOTO KAKAK 🥰.jpg"
      );
      console.log(`[GDrive] Uploaded izin_posting to session folder: ${folderName}`);
    } catch (err) {
      console.error("[GDrive] Gagal upload izin_posting:", err.message);
    }
  }

  // 8. Ambil webViewLink yang valid
  const folderInfo = await drive.files.get({
    fileId: folderId,
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });

  return {
    folderId,
    photosFolderId,
    folderName,
    webViewLink: folderInfo.data.webViewLink,
  };
}

/**
 * Upload satu file ke folder tertentu di Google Drive
 * @param {string} localFilePath - Path file di disk lokal
 * @param {string} targetFolderId - ID folder Google Drive tujuan
 * @param {string} [fileName] - Nama file di Google Drive (opsional)
 */
export async function uploadFileToDrive(localFilePath, targetFolderId, fileName) {
  const drive = getDriveClient();
  const name = fileName || path.basename(localFilePath);

  const fileMetadata = {
    name,
    parents: [targetFolderId],
  };

  const media = {
    body: fs.createReadStream(localFilePath),
  };

  const res = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });

  return res.data;
}

/**
 * Upload banyak file sekaligus ke folder sesi dengan progress callback
 * @param {string[]} filePaths - Array path file lokal
 * @param {string} targetFolderId - ID folder Google Drive tujuan
 * @param {Function} [onProgress] - Callback (currentCount, totalCount, fileName, status)
 */
export async function uploadMultipleFiles(filePaths, targetFolderId, onProgress = null) {
  const results = [];
  const total = filePaths.length;

  for (let i = 0; i < total; i++) {
    const filePath = filePaths[i];
    const fileName = path.basename(filePath);

    if (fs.existsSync(filePath)) {
      if (onProgress) onProgress(i, total, fileName, "uploading");
      try {
        const uploaded = await uploadFileToDrive(filePath, targetFolderId);
        results.push(uploaded);
        if (onProgress) onProgress(i + 1, total, fileName, "done");
      } catch (err) {
        console.error(`Gagal upload file ${filePath}:`, err.message);
        if (onProgress) onProgress(i + 1, total, fileName, "failed");
      }
    } else {
      if (onProgress) onProgress(i + 1, total, fileName, "missing");
    }
  }

  return results;
}
