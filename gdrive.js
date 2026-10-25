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

/**
 * Membuat subfolder khusus untuk sesi customer dan mengatur agar bisa diakses via link
 * Format:
 * - Jika ada nama: IGNOS STUDIO - 11.00 (Nita danianti)
 * - Jika nama kosong: IGNOS STUDIO - 11.00
 * @param {string} customerName - Nama customer (opsional)
 * @param {string} [parentFolderId] - ID folder induk
 * @returns {Promise<{ folderId: string, folderName: string, webViewLink: string }>}
 */
export async function createCustomerFolder(customerName = "", parentFolderId = PARENT_FOLDER_ID) {
  const drive = getDriveClient();

  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const timeStr = `${hours}.${minutes}`;

  const cleanName = customerName ? customerName.trim() : "";
  const folderName = cleanName
    ? `IGNOS STUDIO - ${timeStr} (${cleanName})`
    : `IGNOS STUDIO - ${timeStr}`;

  // 1. Buat folder di dalam parentFolder
  const folderMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: [parentFolderId],
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });

  const folderId = folder.data.id;

  // 2. Set permission: anyone with link can view/download
  await drive.permissions.create({
    fileId: folderId,
    resource: {
      role: "reader",
      type: "anyone",
    },
    supportsAllDrives: true,
  });

  // 3. Ambil webViewLink yang valid
  const folderInfo = await drive.files.get({
    fileId: folderId,
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });

  return {
    folderId,
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
