# Design System — maydin.co Workspace

Dokumen acuan desain untuk dashboard Users pada `index.html`.

**Versi:** 1.0 · **Diperbarui:** 25 November 2026 · **Bahasa antarmuka:** Inggris.

Nilai dalam dokumen ini berasal dari HTML dan JavaScript yang diimplementasikan, termasuk komponen yang dibuat saat runtime. Nama token semantik di bawah adalah nama acuan dokumentasi; implementasi saat ini menggunakan utility Tailwind langsung, belum menggunakan variabel token terpusat.

## 1. Arah visual

Dashboard administrasi dengan tema gelap, permukaan charcoal, aksen pastel biru dan lilac, serta kepadatan informasi yang cukup tinggi. Kesan visual yang dituju adalah tenang, rapi, dan mudah dipindai.

Prinsip desain:

- Gunakan lapisan background, border tipis, dan ruang untuk membentuk hierarki.
- Jadikan judul halaman dan angka statistik sebagai titik fokus.
- Gunakan warna pastel untuk area sorotan, kategori paket, dan informasi status.
- Pertahankan bentuk membulat: kartu berbentuk rounded rectangle; kontrol, tab, dan badge berbentuk pill.
- Pertahankan label kelompok sidebar lebih kecil dari menu, dan ukuran menu jauh lebih kecil dari judul halaman.
- Gunakan gerakan singkat untuk menjelaskan perpindahan konteks dan hasil suatu aksi.

Tidak ada gradient, tekstur, atau efek glass pada implementasi saat ini. Tiga titik dekoratif menyerupai kontrol jendela sudah dihapus dari sidebar.

## 2. Fondasi implementasi

| Aspek | Implementasi |
| --- | --- |
| Halaman | Satu `index.html`, berisi markup dan JavaScript perilaku |
| Styling | Tailwind CSS v4 melalui browser CDN |
| Font | Inter melalui Google Fonts; weight 400, 500, 600, 700 |
| Ikon | SVG inline dengan `viewBox="0 0 24 24"`; tombol buka sidebar memakai karakter ☰ |
| Foto | Avatar dummy dari `i.pravatar.cc` |
| Data | 16 pengguna dummy awal; undangan baru ditambahkan secara lokal |
| Penyimpanan | `localStorage`, key `maydin-users-demo-v1`; fallback ke sesi berjalan jika penyimpanan tidak tersedia |

Semua styling dan animasi memakai utility Tailwind. Jangan menambahkan atribut `style`, blok `<style>`, CSS eksternal buatan sendiri, atau JavaScript yang mengubah properti style. JavaScript mengelola state, class, fokus, timer, dan atribut aksesibilitas.

## 3. Warna

### 3.1 Permukaan dan border

| Token acuan | Nilai | Penggunaan |
| --- | --- | --- |
| `surface.canvas` | `#111114` | Background halaman dan input dialog |
| `surface.sidebar` | `#17191b` | Sidebar |
| `surface.card` | `#1c1f20` | Kartu statistik, tabel, kartu pengguna, dialog |
| `surface.control` | `#1c1e20` | Breadcrumb, pencarian, sort, notifikasi |
| `surface.control-alt` | `#1e2022` | Grup tab dan tombol filter |
| `surface.raised` | `#292b2f` | Menu sidebar aktif, storage, panel item dialog |
| `surface.row-selected` | `#232529` | Baris pengguna yang dipilih |
| `surface.tab-active` | `#343638` | Tab status aktif dan hover tombol tutup dialog |
| `surface.view-active` | `#34373a` | Toggle Table/Cards aktif |
| `border.sidebar` | `#27292b` | Pemisah sidebar dan breadcrumb |
| `border.divider` | `#2a2d2f` | Pembatas baris tabel dan kartu |
| `border.subtle` | `#202325` | Bingkai luar tabel |
| `border.interactive` | `#34373b` | Kartu, empty state, kontrol sekunder |
| `border.strong` | `#3c4144` | Dialog dan checkbox |
| `border.input` | `#41474e` | Input dialog, tombol sekunder, toast |

Beberapa border memiliki variasi charcoal yang sangat dekat untuk mengikuti referensi. Lampiran mencatat seluruh nilai hex dalam sumber. Untuk komponen baru, prioritaskan token acuan di atas agar variasi tidak terus bertambah.

### 3.2 Teks

| Token acuan | Nilai | Penggunaan |
| --- | --- | --- |
| `text.primary` | `#f4f4f5` | Teks utama halaman dan dialog |
| `text.name` | `#e4e6e8` | Nama pengguna |
| `text.secondary` | `#c3c7ca` | Data dan teks tombol sekunder |
| `text.data` | `#bcc0c3` / `#bcc1c6` | Perusahaan dan status |
| `text.muted` | `#92989d` | Metadata, waktu terakhir aktif, bantuan |
| `text.sidebar` | `#96999b` | Menu sidebar nonaktif |
| `text.email` | `#858b8e` | Email pengguna |
| `text.label` | `#737779` | Label kelompok sidebar |
| `text.summary` | `#65696f` | Ringkasan hasil daftar |
| `text.on-accent` | `#111b23` | Teks pada permukaan biru muda |

Teks dengan warna paling redup digunakan sebagai metadata, bukan satu-satunya penanda aksi atau informasi penting. Kontras warna belum diaudit secara formal.

### 3.3 Aksen dan status

| Token acuan | Nilai | Pasangan / peran |
| --- | --- | --- |
| `accent.primary` | `#c0d0e7` | Kartu hero, tombol aksi dialog, fokus, toast, border seleksi kartu |
| `accent.primary-hover` | `#d2def0` | Hover tombol aksi dialog |
| `action.invite` | `#f5f5f7` | Tombol Invite user, teks `#202124` |
| `plan.free` | `#cec3c3` | Lingkaran Free, teks `#29282b` |
| `plan.pro` | `#c3d1e8` | Lingkaran Pro, teks `#263a50` |
| `plan.team` | `#dfb9de` | Lingkaran Team, teks `#644362` |
| `plan.enterprise` | `#303337` | Lingkaran Enterprise, teks `#b6b8be` |
| `badge.enterprise` | `#c4d0e2` | Badge Enterprise pada daftar, teks `#273342` |
| `badge.default` | `#2a2d30` | Badge Free/Pro/Team, teks `#b9bdc0` |
| `status.active` | `#c9d2e1` | Dot Active |
| `status.pending` | `#d7b8d6` | Dot Invited dan Trial |
| `status.inactive` | `#72777c` | Dot Inactive |
| `status.attention` | `#f18e9a` | Badge notifikasi dan pesan validasi undangan |
| `status.expiring-bg` | `#3b2d3c` | Badge undangan segera kedaluwarsa |
| `status.expiring-text` | `#c5a6c2` | Teks badge kedaluwarsa |

Status selalu disertai label teks. Warna paket pada grafik berbeda dari badge paket dalam daftar; Free, Pro, dan Team memakai badge netral yang sama dalam tabel/kartu pengguna.

## 4. Tipografi

Font utama adalah **Inter**, menggunakan `font-['Inter']` dan `antialiased`. Fallback font eksplisit belum ditentukan dalam markup.

| Peran | Ukuran / line-height | Weight | Tracking |
| --- | --- | --- | --- |
| Judul halaman | 44 / 53px | 600 | -1.8px |
| Angka hero | 60 / 67px | 400 | -3.6px |
| Angka kartu kecil | 36 / 42px | 400 | -1.7px |
| Nama workspace | 20 / 27px | 700 | -0.5px |
| Judul dialog | 20 / 28px (`text-xl`) | 600 | Default |
| Ringkasan halaman | 17 / 25px | 400 | Default |
| Menu sidebar | 16 / 22px | 500 | Default |
| Judul Overview | 16 / 21px, diwarisi | 500 | Default |
| Judul daftar All users | 14 / 20px | 500 | Default |
| Isi dialog | 14 / 24px | 400 | Default |
| Isi kartu pengguna | 14 / 20px | 400; nama 600 | Default |
| Isi tabel | 13 / 19px | 400; nama 500 | Default |
| Judul kartu statistik | 13 / 20px | 400–500 | Default |
| Tab status | 13 / 18px, ditambah padding | 500 | Default |
| Label kelompok sidebar | 12 / 20px | 500 | +0.6px |
| Metadata tabel | 12 / 18–19px | 400 | Default |
| Toggle Table/Cards | 12 / 18px | 500 | Default |
| Badge paket | 11 / 16px | 400 runtime; 500–600 pada markup awal | Default |
| Label grafik kecil | 8–11 / 12–17px | 400 | Default |

Ukuran tambahan 15px dan 18px dipakai pada angka kategori grafik; 25px dipakai pada tanda tiga titik di logo workspace. Ukuran 8–11px adalah pengecualian untuk visualisasi dan badge kecil, bukan ukuran teks isi komponen baru.

Nama dan email panjang memakai `truncate`. Status, jumlah sesi, dan waktu tabel memakai `whitespace-nowrap`. Salinan teks antarmuka menggunakan sentence case, sedangkan label kelompok sidebar menggunakan uppercase.

## 5. Layout dan grid

### 5.1 Shell halaman

| Bagian | Spesifikasi |
| --- | --- |
| Acuan gambar awal | 1442 × 1163px pada skala 1× |
| Lebar minimum body | 1280px |
| Tinggi shell | Minimal satu viewport (`min-h-screen`) |
| Sidebar | Fixed kiri, lebar 301px, penuh tinggi viewport, `z-10` |
| Padding sidebar | Horizontal 21px, bawah 22px |
| Header workspace | Tinggi 79px, padding atas 10px, gap 13px |
| Area utama | Margin kiri 301px ketika sidebar terbuka; 0 ketika ditutup |
| Padding area utama | Kiri 34px, kanan 10px, atas 20px, bawah 32px |
| Header atas | Tinggi 39px; breadcrumb kiri, notifikasi kanan |
| Toolbar pengguna | Tinggi 40px, gap 11px, margin atas 24px |

Sidebar memiliki kelompok Workspace, Finance, People, lalu Settings dan storage di bagian bawah dengan `mt-auto`. Tombol untuk membuka sidebar muncul di header utama saat sidebar tertutup. Tidak ada dekorasi titik warna di atas logo.

### 5.2 Overview

- Margin atas bagian: 25px; jarak header ke kartu: 13px.
- Grid utama: `minmax(0,2.06fr) minmax(0,1fr) minmax(0,1fr)`.
- Tinggi grid: 294px; gap antarkolom: 14px.
- Kolom pertama berisi kartu pengguna aktif berlatar biru muda.
- Kolom kedua berisi visualisasi Users by plan.
- Kolom ketiga berisi dua kartu sama tinggi dengan gap 12px.
- Padding kartu statistik: 19px.

Avatar hero ditata absolute di dalam bidang 225 × 207px. Diameter lingkaran paket adalah Free 121px, Pro 84px, Team 70px, dan Enterprise 61px. Posisi serta diameter tersebut tetap; hanya angkanya yang diperbarui oleh data. Grafik ini merupakan ilustrasi komposisi, belum merupakan bubble chart dengan luas yang proporsional terhadap nilai.

### 5.3 Direktori pengguna

Bagian daftar memiliki margin atas 23px. Toolbar daftar setinggi 36px, gap 14px, dan jarak ke hasil 13px. Table, Cards, dan empty state berbagi pembungkus `#results-stage` agar transisi konsisten.

Tampilan Cards memakai tiga kolom dengan gap 16px. Belum ada pagination atau virtualisasi.

### 5.4 Batas responsivitas

Implementasi saat ini berorientasi desktop. Lebar minimum 1280px, tiga kolom kartu pengguna, dan grid Overview tetap berlaku; belum ada breakpoint mobile/tablet. Pada viewport lebih sempit dapat muncul scroll horizontal. Dialog dibatasi `max-w-[90vw]` dan `max-h-[85vh]` dengan scroll internal. Sidebar belum memiliki penanganan overflow khusus untuk viewport pendek.

## 6. Spacing, radius, border, dan elevasi

### Spacing

Gunakan utility skala 4px ketika sesuai: 4, 8, 12, 16, 20, 24, 32px. Nilai arbitrary mempertahankan ukuran spesifik referensi, terutama 7, 9, 10, 11, 13, 14, 17, 18, 19, 21, 22, 23, 25, 26, dan 34px. Offset avatar serta label grafik bukan token spacing umum.

### Radius

| Bentuk | Radius |
| --- | --- |
| Checkbox tabel | 5px |
| Input dialog, tombol ikon, item panel | 8px (`rounded-lg`) |
| Toast | 12px (`rounded-xl`) |
| Menu sidebar | 13px |
| Kartu statistik sekunder | 15px |
| Hero, tabel, kartu pengguna, dialog, empty state | 16px |
| Kartu storage | 19px |
| Tab, badge, tombol pill, avatar | `rounded-full` |

### Border dan elevasi

Border umumnya 1px; checkbox tabel 2px. Avatar memakai border 2–3px; avatar fokus hero memakai border 11px dan ring 7px. Permukaan utama tidak memakai shadow. Shadow dipakai pada avatar agregat (`shadow-lg`), toast (`shadow-xl`), dan dialog (`shadow-2xl`). Backdrop dialog adalah hitam dengan opacity 70%.

Sidebar berada pada `z-10`; toast pada `z-50`. Dialog native yang dibuka melalui `showModal()` berada di top layer browser, di atas stacking context biasa.

## 7. Spesifikasi komponen

### 7.1 Navigasi sidebar

Item menu setinggi 48px, padding horizontal 14px, gap ikon-teks 13px, ikon 21px, dan radius 13px. State aktif Users memakai background `#292b2f` dan teks utama. Menu lain memakai teks `#96999b`. Badge penghitung berukuran 11px dan berlatar `#2b2e30`.

Tombol tutup sidebar memakai ikon 19px dan focus outline 2px berwarna aksen. Ketika tertutup, sidebar tetap berada di DOM untuk menyelesaikan animasi, tetapi dibuat `inert` dan `aria-hidden`.

### 7.2 Breadcrumb dan notifikasi

Breadcrumb berbentuk pill setinggi 38px, padding horizontal 14px, gap 12px, dan teks 14px. Label parent redup, label halaman lebih terang. Tombol notifikasi berbentuk lingkaran 40px dengan ikon 20px. Badge unread berdiameter 21px, ditempatkan di kanan atas.

### 7.3 Tombol dan segmented controls

| Varian | Spesifikasi |
| --- | --- |
| Invite user | Pill 40px, putih lembut, teks gelap 13px/600, ikon 14px |
| Filter | Pill 40px, charcoal, border tipis, teks 13px/500, ikon 15px |
| Aksi dialog | Biru muda, teks 14px/500, padding 16px horizontal dan 8px vertikal; hover biru lebih terang |
| Sekunder dialog | Transparan, border `#41474e`, padding sama; hover `#292b2f` |
| Sort | Lingkaran 35px, ikon 19px |
| Tab status | Grup pill 40px; item runtime px 15px / py 7px; aktif diberi background dan teks terang |
| Table/Cards | Grup pill 36px; item px 10px / py 4px; ikon 13px |

State aktif segmented control menggunakan `aria-pressed`. Gunakan state visual dan label aksesibel secara bersamaan. Transisi warna tombol dan link berdurasi 200ms; hover spesifik hanya tersedia pada komponen yang memiliki utility `hover:`.

### 7.4 Pencarian dan form

Pencarian berbentuk pill berukuran 258 × 40px, ikon 16px, gap 9px, padding horizontal 13px, teks 12px. Query mencakup nama, email, dan perusahaan; tidak membedakan huruf besar/kecil dan mengabaikan spasi awal/akhir.

Input/select dialog menggunakan background canvas, border `#41474e`, radius 8px, padding 12 × 8px, dan teks 14px. Jarak label ke input 4px; antarfield 16px. Fokus input dialog mengubah warna border menjadi aksen.

Form undangan berisi nama, email, perusahaan opsional, dan paket. Validasi menggunakan constraint native dan pemeriksaan JavaScript; error ditampilkan dalam teks pink 12px dengan `role="alert"`. Batas nama 80 karakter, email 254 karakter, perusahaan 100 karakter. Email duplikat ditolak tanpa membedakan kapitalisasi.

### 7.5 Tabel pengguna

Tabel menggunakan `table-fixed`, lebar 100%, border collapse, dan container radius 16px. Header setinggi 44px; baris data 62px. Baris dipisahkan border 1px, kecuali baris terakhir.

| Kolom | Lebar |
| --- | --- |
| Seleksi | 4.3% |
| User | 27% |
| Plan | 12.1% |
| Company | 14.6% |
| Status | 12.5% |
| Usage · 30d | 19.2% |
| Last seen | 10.3% |

Avatar tabel 35px. Nama dan email ditumpuk dengan gap avatar-teks 10px. Nama merupakan tombol menuju detail pengguna. Checkbox tabel berukuran 17px; checked memakai fill terang dan tanda centang SVG.

Usage ditampilkan sebagai bar 51 × 4px dan jumlah sesi. Runtime memakai enam tingkat lebar bar: 0, 20, 40, 60, 80, 100%, berdasarkan bucket sekitar 30 sesi. Angka sesi tetap menjadi nilai sebenarnya. Pengguna tanpa sesi menampilkan em dash.

### 7.6 Kartu pengguna

Kartu beradius 16px, padding 20px, border 1px, background kartu, avatar 48px, dan checkbox 16px. Susun konten: avatar/seleksi, nama/email, perusahaan, paket/status, lalu usage/waktu di footer dengan border atas. Kartu terpilih memakai border aksen. Data, filter, dan seleksi sama dengan tabel.

### 7.7 Badge dan status

Badge paket memakai pill, teks 11px, padding 9px horizontal dan 4px vertikal. Dot status berdiameter 7px. Trial ditampilkan sebagai `Trial · 9d left` dalam demo. Angka hari tersebut masih statis.

### 7.8 Dialog

Satu dialog native dipakai ulang untuk Filter, Sort, Invite user, User details, Notifications, Workspace report, Settings, dan panel demo menu lain. Lebar 440px, padding 24px, radius 16px. Header berisi judul dan tombol tutup, dengan margin bawah 20px.

Dialog ditutup melalui tombol ×, tombol Cancel, Escape, klik di luar batas dialog, atau aksi submit yang berhasil. Semua jalur penutupan melewati animasi yang sama. Modalitas dan pemulihan fokus dasar mengikuti perilaku dialog native browser.

### 7.9 Toast dan empty state

Toast berada 24px dari kanan dan bawah viewport, lebar maksimal 384px, padding 20 × 12px, radius 12px. Background biru muda dengan teks gelap 14px; tampil selama sekitar empat detik sebelum animasi keluar. Pesan baru menggantikan pesan sebelumnya.

Empty state memakai border dashed, radius 16px, padding vertikal 56px, judul 18px/500, deskripsi 14px, dan tombol Reset filters. Tidak ada pagination placeholder ketika hasil kosong.

### 7.10 Storage dan aset visual

Panel storage memakai radius 19px, padding 17px, label 13px, metadata 12px, dan bar setinggi 6px. Nilai 72% dan 36.2 GB dari 50 GB merupakan data dekoratif statis.

Avatar selalu lingkaran dengan `object-cover`. Avatar kecil bertumpuk memakai overlap 10px. Ikon SVG menggunakan `fill-current` atau `stroke-current`; stroke umumnya 1.8 dengan linecap/linejoin round. Ikon dan foto saat ini adalah pendekatan visual terhadap referensi, bukan aset brand final.

## 8. State dan perilaku

| Aksi | Perilaku |
| --- | --- |
| Close/Open sidebar | Sidebar bergeser; margin area utama berubah; fokus dipindah ke tombol yang tersedia |
| All users / Active / Invited | Memilih subset status; filter dan pencarian lain tetap berlaku |
| Search | Memperbarui hasil ketika mengetik; tidak memakai tombol submit |
| Filter | Menggabungkan paket, status, dan minimum sesi dengan tab serta query saat ini |
| Filter aktif | Tombol menampilkan jumlah kriteria dialog aktif dan border aksen; tab/query tidak masuk hitungan badge |
| Reset filters | Mengosongkan query, paket, status, minimum sesi; kembali ke All users; sort dan bentuk tampilan tetap |
| Sort | Newest activity, oldest activity, name A–Z, name Z–A, highest usage, lowest usage |
| Table/Cards | Mengubah bentuk penyajian tanpa membuang query, filter, sort, atau seleksi |
| Select all | Memilih/melepas pengguna pada hasil yang sedang terlihat; seleksi di luar hasil tetap tersimpan |
| Seleksi parsial | Checkbox header memakai state indeterminate |
| Clear selection | Mengosongkan seluruh seleksi lintas tampilan dan filter |
| Nama pengguna | Membuka detail pengguna dalam dialog |
| Invite user | Membuat pengguna berstatus Invited secara lokal; reset filter/query, pilih tab Invited, sort terbaru |
| View report / Reports | Ringkasan hasil terfilter dan ekspor CSV |
| Notifications | Panel dummy; Mark all as read menghilangkan badge unread selama sesi |
| Settings | Memilih tampilan Table atau Cards |
| Overview / Users sidebar | Scroll halus ke bagian terkait |
| Menu sidebar lainnya | Membuka panel informasi dummy; belum menavigasi ke modul penuh |

Data pengguna dipersistensikan jika storage tersedia. Bentuk tampilan, filter, pilihan pengguna, posisi sidebar, dan state unread belum dipersistensikan. Saat reload, direktori kembali ke All users, pencarian kosong, sort aktivitas terbaru, dan tampilan Table.

Ringkasan pelanggan, perusahaan, pengguna aktif, paket, dan undangan diperbarui dari data dummy keseluruhan. Filter daftar tidak mengubah angka Overview. Sebagian label waktu, avatar agregat, jumlah online, dan badge kedaluwarsa masih bersifat ilustratif; jangan menafsirkan semuanya sebagai metrik real-time.

## 9. Motion system

Animasi memakai transisi utility Tailwind; JavaScript hanya mengganti state/class dan mengatur waktu commit. Hindari animasi dekoratif yang berjalan terus-menerus.

| Interaksi | Properti / rentang | Durasi | Easing |
| --- | --- | --- | --- |
| Sidebar | `translate`: 0 ↔ -100% sumbu X; opacity 1 ↔ 0 | 300ms | ease-in-out |
| Area utama | `margin-left`: 301px ↔ 0 | 300ms | ease-in-out |
| Hasil daftar | Opacity 1 → 0 → 1; translate Y 0 → 8px → 0 | 150ms keluar + 150ms masuk | ease-out |
| Dialog | Opacity 0 ↔ 1; scale 0.95 ↔ 1 | 200ms | ease-out |
| Backdrop dialog | Opacity 0 ↔ 1, dengan background black/70 | 200ms | Default Tailwind |
| Toast | Opacity 0 ↔ 1; translate Y 12px ↔ 0 | 200ms | ease-out |
| Tombol/link, baris dan border kartu | Warna teks/background/border yang berubah | 200ms | Default Tailwind |
| Scroll bagian | `scrollIntoView` | Dikelola browser | Dikelola browser |

Aturan transisi:

- Saat hasil berubah, fade-out selesai sebelum isi Table/Cards diganti, kemudian fade-in berjalan. Tinggi konten tidak memakai animasi interpolasi khusus.
- Jika hasil dan bentuk tampilan tidak berubah, render tidak memicu ulang fade seluruh daftar. Seleksi memakai perubahan warna/border.
- `createTransitionQueue` membatalkan commit tertunda dari aksi lama; aksi terakhir menjadi sumber tampilan.
- Saat transisi hasil berjalan, stage memakai `inert` dan `aria-busy="true"` agar hasil lama tidak dioperasikan.
- Sidebar tidak langsung diberi `hidden`, agar slide keluar tetap terlihat.
- Dialog baru dan toast menggunakan dua frame awal untuk memberi kesempatan browser menggambar state awal.
- Dialog tetap modal sampai animasi keluar selesai; penutupan ganda dicegah.
- Fokus checkbox/nama pengguna dipulihkan setelah baris dirender ulang jika kontrol tersebut masih tersedia.
- Utility `translate-*` Tailwind v4 memakai properti `translate`; transisi harus menargetkan `translate`, bukan hanya `transform`.

### Reduced motion

Semua transisi terkait memakai `motion-reduce:transition-none`. JavaScript membaca `prefers-reduced-motion: reduce` melalui `matchMedia`, menjadikan waktu tunggu animasi nol dan melewati penjadwalan frame pembuka. Scroll memakai perilaku instan ketika reduced motion aktif. Timer baca toast tetap empat detik karena berfungsi sebagai waktu tampil pesan.

## 10. Aksesibilitas dan content style

Yang telah tersedia:

- Landmark `aside`, `nav`, `main`, `header`, `section` dan tabel dengan caption untuk screen reader.
- Label aksesibel pada tombol ikon, pencarian, checkbox, dan dialog.
- `aria-pressed` pada tab/toggle; `aria-expanded` dan `aria-controls` pada kontrol sidebar.
- `aria-live="polite"` untuk ringkasan hasil dan seleksi; `role="status"` untuk toast.
- Dot status disertai teks; seleksi disertai checkbox.
- Native form constraint, error `role="alert"`, dialog native, dan dukungan Escape.
- Focus outline pada kontrol sidebar dan segmented controls; border fokus pada input dialog.
- Dukungan reduced motion serta pemindahan/pemulihan fokus pada interaksi tertentu.

Batas yang masih perlu diperiksa sebelum penggunaan produksi: audit kontras seluruh token redup, keterbacaan label grafik 8–11px, fokus pencarian yang saat ini memakai `outline-none` tanpa ring khusus, konsistensi focus state seluruh tombol, target sentuh kecil, dan layout pada zoom/viewport sempit. Dokumen ini tidak menyatakan kepatuhan WCAG telah diverifikasi.

Gunakan teks aksi yang konkret seperti Invite user, Apply filters, Reset filters, dan Download CSV. Jelaskan simulasi lokal pada alur undangan; jangan menampilkan pesan seolah email benar-benar terkirim. Gunakan angka sesi dan label status sebagai informasi utama, sementara bar dan warna menjadi pendamping.

## 11. Pola penggunaan kembali

Contoh tombol aksi mengikuti implementasi dialog:

```html
<button type="button"
  class="rounded-full bg-[#c0d0e7] px-4 py-2 text-sm font-medium text-[#111b23] hover:bg-[#d2def0]">
  Apply filters
</button>
```

Contoh fondasi kartu pengguna:

```html
<article class="rounded-2xl border border-[#2a2d2f] bg-[#1c1f20] p-5 text-sm leading-5 transition-colors duration-200 motion-reduce:transition-none">
  <!-- Avatar, identitas, paket/status, usage, dan waktu -->
</article>
```

Contoh input dialog:

```html
<label class="block">
  Email
  <input type="email" required
    class="mt-1 w-full rounded-lg border border-[#41474e] bg-[#111114] px-3 py-2 text-sm text-[#f4f4f5] outline-none focus:border-[#c0d0e7]" />
</label>
```

Pertahankan urutan hierarki halaman, ukuran font sidebar 16px, bentuk pill kontrol, dan radius kartu saat menambah modul. Gunakan palette inti sebelum membuat variasi warna baru. Pisahkan angka dummy dari klaim data aktual pada salinan produk.

## 12. Validasi dan pemeliharaan

Pengujian otomatis tersedia di `tests/dashboard.test.cjs` dan dijalankan dengan:

```sh
node --test tests/dashboard.test.cjs
```

Sepuluh pengujian saat dokumentasi dibuat mencakup tab status, pencarian, kombinasi filter, enam sort, undangan, validasi input/duplikasi, aturan Tailwind-only, pembatalan transisi lama, pembatalan penutupan elemen yang dibuka kembali, dan commit tanpa delay untuk reduced motion. Ini adalah pengujian logika dan sumber, bukan verifikasi visual browser.

Checklist review perubahan desain:

- Pastikan font, padding, radius, border, dan warna mengikuti tabel acuan.
- Periksa Table dan Cards memakai data/state yang sama.
- Periksa hasil kosong, seleksi parsial, error form, teks panjang, dan status nonaktif.
- Coba klik cepat saat sidebar/dialog/hasil sedang bertransisi.
- Periksa keyboard, fokus, Escape, dan reduced motion.
- Periksa layout pada viewport desktop dan catat bila menambah breakpoint baru.
- Perbarui dokumen ketika token, komponen, perilaku, atau durasi berubah.

Dokumentasi ini ditinjau dari sumber implementasi. Perbandingan visual otomatis terhadap screenshot dan audit interaksi di browser belum dilakukan karena akses browser ke preview `file://` dibatasi pada sesi pengerjaan.

## Lampiran A. Inventaris warna sumber

Bagian ini mencatat seluruh literal hex enam digit yang ditemukan pada `index.html`, termasuk SVG dan komponen runtime. Kolom kategori menyebut utility pemakainya, bukan nama variabel CSS. Nilai-nilai dekat merupakan detail implementasi yang belum dinormalisasi menjadi token terpusat.

| Warna | Kategori pemakaian |
| --- | --- |
| `#0d1822` | `bg` |
| `#10171e` | `bg` |
| `#111114` | `bg`, `text` |
| `#111b23` | `text` |
| `#17191b` | `bg`, `text` |
| `#1b1d20` | `bg` |
| `#1c1e20` | `bg` |
| `#1c1f20` | `bg`, `border` |
| `#1e2022` | `bg` |
| `#202124` | `text` |
| `#202325` | `border` |
| `#232529` | `bg` |
| `#263a50` | `text` |
| `#27292b` | `border` |
| `#273342` | `text` |
| `#282a2d` | `border` |
| `#29282b` | `text` |
| `#292b2e` | `border` |
| `#292b2f` | `bg` |
| `#292c2f` | `border` |
| `#2a2c2e` | `border` |
| `#2a2d2f` | `border` |
| `#2a2d30` | `bg` |
| `#2b2e30` | `bg`, `border` |
| `#2c2e30` | `border` |
| `#2e3135` | `bg` |
| `#303337` | `bg` |
| `#343638` | `bg` |
| `#34373a` | `bg` |
| `#34373b` | `border` |
| `#34383b` | `bg` |
| `#3b2d3c` | `bg` |
| `#3c4144` | `border` |
| `#41474e` | `border` |
| `#515558` | `text` |
| `#576d82` | `text` |
| `#5a6e7f` | `text` |
| `#644362` | `text` |
| `#652631` | `text` |
| `#65696f` | `text` |
| `#66716e` | `border` |
| `#6a7e95` | `text` |
| `#6d7176` | `text` |
| `#72777b` | `text` |
| `#72777c` | `bg` |
| `#737779` | `text` |
| `#73787c` | `text` |
| `#746d70` | `text` |
| `#777b7d` | `text` |
| `#777b7e` | `text` |
| `#777c80` | `text` |
| `#777d80` | `text` |
| `#797d80` | `text` |
| `#797d81` | `text` |
| `#7f8488` | `text` |
| `#85888f` | `text` |
| `#85898e` | `text` |
| `#858b8e` | `text` |
| `#88969e` | `text` |
| `#8c9093` | `text` |
| `#8d9297` | `text` |
| `#929397` | `text` |
| `#929599` | `text` |
| `#92989d` | `text` |
| `#96999b` | `text` |
| `#986e95` | `text` |
| `#999ca0` | `text` |
| `#a76e9d` | `text` |
| `#a9bed1` | `border` |
| `#b4c4da` | `border` |
| `#b6b8be` | `text` |
| `#b7c9df` | `ring` |
| `#b9bdc0` | `text` |
| `#bcc0c3` | `text` |
| `#bcc1c6` | `text` |
| `#c0d0e7` | `accent`, `bg`, `border`, `outline` |
| `#c2c4c7` | `text` |
| `#c3c7ca` | `text` |
| `#c3d1e8` | `bg` |
| `#c4d0e2` | `bg` |
| `#c4d3e9` | `bg` |
| `#c5a6c2` | `text` |
| `#c7d5e9` | `border` |
| `#c9d2e1` | `bg` |
| `#cec3c3` | `bg` |
| `#cfdbec` | `border` |
| `#d1dded` | `border` |
| `#d2def0` | `bg` |
| `#d3d5d7` | `text` |
| `#d4dfed` | `border` |
| `#d6dfed` | `border` |
| `#d7b8d6` | `bg` |
| `#d7e1eb` | `bg` |
| `#d7e1ef` | `border` |
| `#dfb9de` | `bg` |
| `#e0e2e4` | `text` |
| `#e1c6e4` | `bg` |
| `#e4e6e8` | `text` |
| `#e6eaec` | `bg` |
| `#ecf0f1` | `bg`, `border` |
| `#f0f0f1` | `text` |
| `#f0f3f6` | `text` |
| `#f18e9a` | `bg`, `text` |
| `#f1f5f7` | `bg` |
| `#f3f6f7` | `bg` |
| `#f4f4f5` | `text` |
| `#f5f5f7` | `bg` |
