# Perbaikan prioritas operasional

## Menjalankan dan memeriksa

- Restart backend (`npm run server`) setelah pembaruan; sesi admin lama akan berakhir.
- Jalankan `npm test` untuk uji regresi terisolasi dan `npm run build` untuk build frontend.
- PIN admin sekarang dikonfirmasi dengan tombol **Masuk** atau Enter, mendukung 4–8 digit. Import kamera juga meminta login admin.
- PIN master bawaan telah dihapus. Pemulihan hanya tersedia jika operator menetapkan `IGNOS_MASTER_KEY` melalui environment backend. Jangan simpan recovery key di repositori.
- Origin frontend default yang diizinkan: `http://localhost:5173`, `http://127.0.0.1:5173`, dan kedua host pada port `4173`. Jika memakai origin lain, isi `IGNOS_ALLOWED_ORIGINS` dengan daftar origin lengkap yang dipisahkan koma. URL backend frontend saat ini tetap menggunakan localhost untuk sebagian besar fitur.

## Perilaku setelah perubahan

- API admin memvalidasi sesi backend selama satu jam. Logout, perubahan PIN, dan restart server membatalkan sesi.
- Penghapusan arsip hanya menerima nama tanggal dan menolak path yang keluar dari direktori arsip, termasuk symlink/junction ke luar folder.
- Upload Drive menyimpan daftar file yang selesai dalam `session_info.json`. Retry memakai folder Drive yang sama dan hanya mengunggah file yang belum selesai. Kegagalan upload atau pemindahan arsip mempertahankan foto di antrean lokal.
- PDF struk yang dilacak sesi ikut masuk arsip/Drive setelah proses penyimpanannya selesai.
- Harga sesi dan add-on kiosk dihitung dari konfigurasi server. Harga nol tidak diganti harga default. Data transaksi lama tidak ditulis ulang karena nilai historisnya perlu direkonsiliasi dengan bukti pembayaran.
- Kasir menerbitkan e-receipt hanya setelah penyimpanan transaksi berhasil. Percobaan ulang dengan isi yang sama memakai ID transaksi yang sama.
- Status cetak `submitted` berarti driver menerima perintah, bukan bukti bahwa kertas sudah keluar. Kegagalan driver atau koneksi ditampilkan; file yang berhasil disimpan tetap tersedia. Periksa antrean printer sebelum retry agar tidak menggandakan cetakan yang mungkin sudah diproses driver.

## Pemeriksaan perangkat setelah restart

1. Login dengan PIN yang digunakan studio; buka kasir, printer, arsip, dan import kamera.
2. Gunakan foto uji untuk satu cetakan 4R; cocokkan status dan hasil printer. Ulangi saat printer tidak tersedia untuk memastikan error terlihat.
3. Buat sesi uji berisi add-on dengan harga berbeda, lalu cocokkan nominal dan rekap.
4. Putuskan koneksi Drive pada sesi uji; pastikan antrean tetap ada. Sambungkan kembali dan gunakan tombol upload antrean di admin.

Uji otomatis tidak mengirim foto pelanggan ke Google Drive dan tidak menjalankan printer atau kamera fisik.
