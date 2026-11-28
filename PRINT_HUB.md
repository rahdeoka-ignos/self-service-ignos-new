# Pusat Print (MacBook) untuk Beberapa Kiosk

Setiap Mac mini tetap menjalankan sistem IGNOS-nya sendiri: kamera, foto, sesi, dan laporan.
Saat customer selesai menyusun foto, file cetaknya **dikirim lewat LAN ke MacBook**, lalu MacBook
mencetaknya ke printer yang tersambung lewat USB.

```
Mac mini 1 ─┐
Mac mini 2 ─┼── LAN ──► MacBook Pro (pusat print) ── USB ──► EPSON L8050 / L3250
Mac mini 3 ─┘
```

- Profil printer dan kompensasi pinggir (`printInset`) **cukup diatur di MacBook**.
- Alert printer (kertas habis, tray, offline) dari MacBook **ikut muncul di semua kiosk**.
- Di antrean print MacBook, setiap job diberi nama asal booth-nya, misalnya `Booth 2 - 4r`.
- Kalau MacBook mati atau tidak terhubung, file tetap tersimpan di Mac mini. Kiosk akan menampilkan
  pesan gagal print dan alert "Pusat Print Tidak Terhubung".

Semua pengaturan dilakukan lewat **Admin → Printer & Kertas → Pusat Print**. Tidak perlu mengedit file.

---

## 1. MacBook Pro (pusat print)

1. Sambungkan printer lewat USB, lalu install driver Epson (jangan pakai AirPrint).
2. Jalankan server: `node server.js`. Tampilan kiosk tidak perlu dibuka di MacBook.
3. Buka **Admin → Printer & Kertas**, lalu di kartu **Pusat Print** pilih **Pusat Print** dan klik **Simpan**.
4. Akan muncul daftar **Kode sambung untuk kiosk**, satu per alamat MacBook (alamat `.local` dan alamat IP).
   Klik **Salin Kode** pada salah satunya.
5. Atur juga profil printer dan kompensasi pinggir di halaman yang sama (MacBook).
6. Supaya MacBook tidak putus:
   - **System Settings → Battery/Energy:** aktifkan *Prevent automatic sleeping when the display is off*,
     dan biarkan charger selalu tersambung.
   - **Firewall:** saat server pertama kali jalan dan muncul popup, pilih **Allow** untuk `node`.

## 2. Setiap Mac mini (kiosk)

1. Buka **Admin → Printer & Kertas → Pusat Print**, lalu pilih **Kiosk**.
2. Tempel kode sambung dari MacBook. Alamat dan token akan terisi otomatis.
3. Isi **Nama booth** (Booth 1, Booth 2, Booth 3).
4. Klik **Tes Koneksi**. Kalau berhasil, muncul daftar printer yang ada di MacBook.
   - Kalau alamat `.local` gagal, salin ulang kode dengan alamat IP dari MacBook.
5. Klik **Simpan**. Cetakan berikutnya dari booth ini akan keluar di printer MacBook.

## 3. Kalau ada masalah

| Pesan saat Tes Koneksi | Artinya |
|---|---|
| `Token pusat print salah` | Kode sambung sudah lama. Mungkin token di MacBook sudah diganti; salin ulang kode dari MacBook |
| `Komputer ini bukan pusat print` | MacBook belum disimpan sebagai **Pusat Print** |
| `tidak bisa dihubungi` | Server MacBook mati, MacBook sleep, alamat salah, atau diblokir firewall |

- **Buat Token Baru** di MacBook memutus semua kiosk. Setelah itu, salin ulang kode sambung ke tiap Mac mini.
- Untuk kembali mencetak ke printer milik Mac mini itu sendiri, pilih **Cetak Sendiri** lalu **Simpan**.

Setting ini disimpan di `data/print-hub.json` di tiap komputer. File ini tidak ikut git, jadi aman untuk push/pull.
