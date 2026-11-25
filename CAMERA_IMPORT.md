# Impor foto setelah sesi self-photo

Pelanggan memotret dengan remote. Setelah sesi selesai, staf mencolok kamera (USB) atau SD card (card reader) ke PC yang menjalankan backend. Pop-up impor terbuka otomatis, menampilkan semua foto di perangkat dengan foto sesi terakhir sudah terpilih. Staf merapikan pilihan, lalu klik Import.

## Deteksi colok otomatis

- `scripts/device-events.ps1` berjalan bersama backend dan meneruskan event perangkat Windows. Backend lalu memeriksa kamera X-S10 (MTP) dan drive mana pun (selain drive sistem) yang punya folder `DCIM`.
- Setiap layar aplikasi menerima notifikasi lewat `GET /api/camera-import/events` (SSE). Endpoint ini publik dan hanya berisi "perangkat dicolok/dicabut", tanpa data foto.
- Kiosk di halaman awal atau halaman admin: pop-up langsung terbuka. Ada sesi customer berjalan: hanya muncul badge "Kamera terdeteksi" di kiri bawah. Badge bisa diklik, dan pop-up terbuka sendiri saat kiosk kembali ke halaman awal.
- Perangkat yang sudah tercolok saat backend dinyalakan tidak memicu pop-up; buka lewat logo seperti biasa.
- Impor tetap memerlukan PIN admin.
- Card reader di huruf drive yang berbeda dari preset (mis. F: bukan E:) tetap dipindai dari drive yang terdeteksi.

## Grid foto dan pemilihan

- Foto dikelompokkan per jeda pemotretan 8 menit atau lebih, dengan judul seperti "Sel, 24 Nov · 14.50–15.16 · 65 foto". Kelompok yang berisi rekomendasi diberi tanda "rekomendasi durasi".
- Pemilihan: klik (pilih satu), Ctrl+klik (tambah/kurangi), Shift+klik (rentang), Ctrl+Shift+klik (tambah rentang), seret (rentang), Ctrl+A (semua), Esc (kosongkan), checkbox per foto, checkbox per kelompok. Klik dua kali membuka tampilan besar (panah = pindah foto, Spasi = pilih) tanpa mengubah pilihan.
- Tombol "Kembali ke rekomendasi", "Pilih semua", dan "Kosongkan".
- Grid hanya memuat thumbnail yang terlihat. Lewat USB, thumbnail diambil dari thumbnail yang sudah disimpan kamera (tanpa menyalin foto penuh), dalam satu batch per tampilan. Jika kamera tidak punya thumbnail untuk sebuah foto, foto itu disalin penuh sebagai gantinya.

## Rekomendasi dan label

- Rekomendasi durasi dihitung mundur dari waktu foto terbaru pada sumber. Ini bukan deteksi identitas pelanggan.
- SD card memakai EXIF DateTimeOriginal/DateTimeDigitized; USB memakai Windows System.Photo.DateTaken, dikonversi dari UTC ke waktu lokal agar sama dengan jam kamera. Jika tidak tersedia, dipakai waktu modifikasi (dihitung di ringkasan).
- Foto yang pernah diimpor diberi label "Sudah pernah diimpor". Label tidak mengubah rekomendasi. Jika foto berlabel ikut dipilih, tombol Import meminta konfirmasi sekali lagi.
- Riwayat ada di `data/import-history.json`, disimpan 180 hari. Identitas foto = folder/nama + waktu ambil + ukuran, sama untuk USB maupun card reader, dan tidak tertukar saat nomor DSCF berulang.

## Keamanan impor

- Impor hanya mengambil ID foto yang dipilih dari hasil scan (berlaku 30 menit), tidak menghitung ulang rentang waktu.
- File disalin ke `storage/camera_imports`, diperiksa ukuran dan hasil decode, lalu thumbnail dibuat sebelum galeri diganti. Foto asli kamera/SD tidak dihapus.
- Galeri lama disimpan dalam `storage/camera_imports/<job>/previous-gallery`. Kegagalan pertukaran direktori memicu rollback. Ini bukan jaminan pemulihan otomatis jika PC mati di tengah pertukaran direktori.
- Retensi/pembersihan otomatis untuk `storage/camera_imports` belum dibuat; pantau kapasitasnya. Cache thumbnail/preview di `storage/camera_cache` dibersihkan saat hasil scan kedaluwarsa dan bisa dikosongkan dari halaman Storage.
- Unggah manual juga melewati staging dan pemeriksaan sebelum penggantian galeri.

## Jika kamera USB bermasalah

- Semua akses ke kamera berjalan satu per satu (antrean di backend). Jangan buka kamera di Windows Explorer selama memakai aplikasi; X-S10 menolak akses jika dua program membaca bersamaan.
- Pesan "Kamera menolak akses ke file foto" atau Windows "USB device not recognized": cabut kabel, matikan kamera, nyalakan lagi, colok lagi. Jika masih gagal, restart PC (driver USB kamera di Windows bisa tersangkut).
- Alternatif tercepat dan paling stabil: keluarkan SD card dan pakai card reader; pop-up impor terbuka otomatis.
- Waktu impor didominasi kecepatan transfer USB kamera (±330 MB untuk 81 foto). Verifikasi dan thumbnail galeri dibuat dalam satu langkah paralel.

## Verifikasi sebelum dipakai operasional

1. Restart backend dan muat ulang aplikasi setelah perubahan.
2. Colok kamera X-S10 saat kiosk di halaman awal: pop-up harus terbuka sendiri. Ulangi saat customer di tengah sesi: hanya badge.
3. Ukur kecepatan thumbnail di grid dengan kartu berisi banyak foto. Ini satu-satunya bagian yang belum diuji dengan kamera asli.
4. Cocokkan jam foto di grid dengan jam pengambilan di kamera, lewat USB maupun card reader.
5. Uji pilihan tidak berurutan (Ctrl+klik) dan pastikan hanya foto itu yang masuk galeri.
6. Impor, lalu scan ulang: foto tadi harus berlabel "Sudah pernah diimpor".
7. Cabut perangkat selama transfer. Pastikan galeri lama tetap tersedia dan ulangi setelah tersambung.

Tes otomatis memakai foto JPEG sungguhan pada folder sementara dan simulasi MTP, bukan kamera fisik.
