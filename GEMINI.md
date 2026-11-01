# Standar Desain UI & Frontend Workspace (Ignos Self-Service)

Setiap pengerjaan antarmuka pengguna (khususnya Admin Portal dan Kiosk) wajib mematuhi panduan desain dan batasan teknis berikut:

### 1. Eliminasi Visual Noise & Badge Warna-Warni
- DILARANG menggunakan badge berkedip (*pulsing animated dots*), badge warna-warni kontras tinggi (hijau/merah/kuning terang), atau kotak tips/alert berikon bintang yang mengganggu estetika.
- Indikator status cukup direpresentasikan dengan dot berukuran mikro (`w-2 h-2 rounded-full`) yang tenang dan tipografi monokrom yang elegan.

### 2. Tipografi Murni pada Navigasi (No Random Icons)
- Tab navigasi dan header section mengutamakan tipografi murni (*Typography-First*). JANGAN menempelkan ikon Lucide secara acak di setiap label tab atau di depan judul kartu.
- Active state pada tab menggunakan garis bawah halus (`border-b-2 border-[#171717] font-semibold text-[#171717]`).

### 3. Maksimalkan Lebar Layar (Haram `max-w-5xl` pada Halaman Admin)
- JANGAN membatasi kontainer halaman admin dengan `max-w-5xl` atau `max-w-4xl` yang menyisakan ruang kosong putih mubazir di sisi kanan layar.
- Gunakan kontainer penuh yang proporsional: `w-full p-6 md:p-8 space-y-8`.

### 4. Pencegahan Double Scrollbar (Single Scroll Container)
- Pembungkus root layout admin wajib dikunci presisi dengan `fixed inset-0 flex bg-[#fafafa] overflow-hidden`.
- HANYA kontainer konten utama (`<main className="flex-1 overflow-y-auto min-w-0">`) yang diizinkan memiliki scrollbar vertikal. Browser window tidak boleh memiliki scrollbar terluar.

### 5. Konsistensi Komponen Modal (Zero Native Browser `alert` / `confirm`)
- DILARANG KERAS memanggil dialog primitif bawaan browser (`window.alert`, `window.confirm`, `window.prompt`).
- Seluruh kebutuhan konfirmasi aksi, peringatan, atau notifikasi wajib menggunakan komponen modal bersama: `src/app/components/AdminConfirmModal.tsx`.

### 6. Harmonisasi Kontrol & Aksi Horisontal
- Tombol eksekusi yang bergantung pada pilihan parameter (misal: tombol hapus arsip dengan pilihan hari) wajib diletakkan sejajar secara horizontal menggunakan `flex justify-between items-end`. Hindari menumpuk parameter dan tombol besar secara vertikal.

### 7. Arsitektur Tab untuk Halaman Kompleks
- Jangan menumpuk lebih dari 4 kartu modul berbeda di satu viewport yang membuat layout semrawut. Pecah alur kerja menjadi tab yang logis dan terfokus.
