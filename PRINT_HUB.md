# Pusat Print (MacBook) untuk Beberapa Kiosk

Setiap Mac mini tetap menjalankan sistem IGNOS-nya sendiri: kamera, foto, sesi, dan laporan.
Saat customer selesai menyusun foto, file cetaknya **dikirim lewat LAN ke MacBook**, lalu MacBook
mencetaknya ke printer yang tersambung lewat USB.

```
Mac mini 1 ─┐
Mac mini 2 ─┼── LAN ──► MacBook Pro (pusat print) ── USB ──► EPSON L8050 / L3250
Mac mini 3 ─┘
```

- Setting printer (`printers.json`: profil, `cupsOptions`, `printInset`) **cukup diatur di MacBook**.
- Alert printer (kertas habis, tray, offline) dari MacBook **ikut muncul di semua kiosk**.
- Di antrean print MacBook, setiap job diberi nama asal booth-nya, misalnya `Booth 2 - 4r`.
- Kalau MacBook mati atau tidak terhubung, file tetap tersimpan di Mac mini. Kiosk akan menampilkan
  pesan gagal print dan alert "Pusat Print Tidak Terhubung".

---

## 1. Buat token rahasia (sekali saja)

Token ini dipakai bersama oleh MacBook dan semua Mac mini. Buat dengan Terminal di Mac mana saja:

```bash
openssl rand -hex 24
```

Simpan hasilnya. Token yang **sama persis** dipakai di semua komputer.

## 2. MacBook Pro (pusat print)

1. Sambungkan printer lewat USB, lalu install driver Epson (jangan pakai AirPrint).
2. Atur profil printer di `public/printers.json` (atau lewat halaman Admin → Printer di MacBook):
   `cupsOptions`, `printInset`, dan sebagainya.
3. Buat file `data/print-hub.json`:
   ```json
   { "role": "hub", "token": "TOKEN-DARI-LANGKAH-1" }
   ```
4. Jalankan server: `node server.js`
5. Supaya MacBook tidak putus:
   - **System Settings → Battery/Energy:** aktifkan *Prevent automatic sleeping when the display is off*,
     dan biarkan charger selalu tersambung.
   - **System Settings → Network → Firewall:** kalau firewall aktif, izinkan `node` menerima koneksi masuk.
     Biasanya muncul popup saat server pertama kali jalan; pilih **Allow**.
6. Catat alamat MacBook, pilih salah satu:
   - **IP tetap (disarankan):** set *DHCP reservation* di router untuk MacBook, misalnya `192.168.1.20`.
   - Atau pakai **Local hostname** dari *System Settings → General → Sharing*, misalnya `macs-MacBook-Pro.local`.

## 3. Setiap Mac mini (kiosk)

1. Buat file `data/print-hub.json`, dan bedakan `name` untuk setiap booth:
   ```json
   {
     "role": "kiosk",
     "url": "http://192.168.1.20:5000",
     "token": "TOKEN-DARI-LANGKAH-1",
     "name": "Booth 1"
   }
   ```
2. Restart server (`node server.js`).
3. `printers.json` di Mac mini **tidak dipakai lagi untuk mencetak**, karena semua setting printer ada di MacBook.

## 4. Tes koneksi dari Mac mini

```bash
curl -H "x-ignos-hub-token: TOKEN-DARI-LANGKAH-1" http://192.168.1.20:5000/api/print-hub/status
```

| Hasil | Artinya |
|---|---|
| JSON berisi `"printers": [...]` | Koneksi dan token benar |
| `Token pusat print salah` | Token di Mac mini berbeda dengan token di MacBook |
| `Komputer ini bukan pusat print` | `data/print-hub.json` di MacBook belum di-set `"role": "hub"`, atau server belum di-restart |
| `Connection refused` / timeout | Server MacBook mati, IP salah, atau diblokir firewall |

Setelah itu, lakukan 1 transaksi 4R dari kiosk. Hasilnya harus keluar di printer MacBook, dan di
terminal server MacBook muncul baris `[print-hub] Booth 1: 4r ... dikirim ke printer`.

## Kembali ke print lokal

Hapus `data/print-hub.json` atau ubah isinya menjadi `{ "role": "off" }`. Kiosk akan kembali mencetak ke
printer yang tersambung ke komputer itu sendiri.
