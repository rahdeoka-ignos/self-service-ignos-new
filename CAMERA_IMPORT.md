# Impor foto setelah sesi self-photo

Pelanggan memotret dengan remote. Setelah sesi selesai, staf menghubungkan kamera USB atau SD card, membuka impor dari logo studio, memilih sumber dan durasi, lalu memeriksa foto awal dan akhir sebelum impor.

- Rekomendasi durasi dihitung mundur dari waktu foto terbaru pada sumber. Ini bukan deteksi identitas pelanggan atau pencatatan waktu sesi remote.
- SD card memakai EXIF DateTimeOriginal/DateTimeDigitized; USB memakai Windows System.Photo.DateTaken. Jika tidak tersedia, gunakan waktu modifikasi, dengan peringatan di tampilan staf.
- Toleransi ditampilkan sebagai kandidat, tidak dipilih otomatis. Rentang awal–akhir dapat diperluas staf. Foto tanpa waktu memerlukan pilihan manual.
- Pilihan terikat hasil scan selama 30 menit. Impor tidak menghitung ulang rentang berdasarkan foto terbaru yang mungkin baru masuk.
- File disalin ke storage/camera_imports, diperiksa ukuran dan hasil decode, lalu thumbnail dibuat sebelum galeri diganti. Foto asli kamera/SD tidak dihapus.
- Galeri lama disimpan dalam storage/camera_imports/<job>/previous-gallery. Kegagalan pertukaran direktori memicu rollback. Ini bukan jaminan pemulihan otomatis jika PC mati di tengah pertukaran direktori.
- Impor gagal dan cadangan dipertahankan untuk pemulihan; retensi/pembersihan otomatis belum dibuat. Pantau kapasitas storage/camera_imports dan storage/camera_cache.
- Unggah manual juga melewati staging dan pemeriksaan sebelum penggantian galeri.

## Verifikasi sebelum dipakai operasional

1. Restart backend dan muat ulang aplikasi setelah perubahan.
2. Uji kamera USB sebenarnya dan SD card berisi dua sesi berdekatan, termasuk nama file sama di folder berbeda.
3. Cocokkan waktu foto yang tampil dengan waktu pengambilan di kamera; periksa fallback pada model kamera yang tidak menyediakan properti Windows.
4. Uji durasi bawaan/kustom, batas awal–akhir dan toleransi. Pastikan foto pelanggan lain tidak terpilih.
5. Cabut perangkat selama transfer. Pastikan galeri lama tetap tersedia dan ulangi setelah tersambung.
6. Jalankan impor sukses, pastikan foto/thumbnail tampil pada kiosk dan cadangan galeri lama tersedia.

Tes otomatis memakai foto JPEG sungguhan pada folder sementara dan simulasi MTP, bukan kamera fisik. Deteksi otomatis saat perangkat baru dicolok (hot-plug) belum termasuk implementasi ini; staf masih membuka modal dan melakukan scan.
