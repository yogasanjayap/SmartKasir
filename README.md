# 🛒 SmartKasir — Aplikasi Kasir Toko

Aplikasi kasir (POS / Point of Sale) sederhana untuk **warung, kafe, dan toko kecil**. Berjalan langsung di browser, **tanpa biaya, tanpa server berbayar**. Semua data tersimpan otomatis di perangkat Anda. Secara opsional, aktifkan **login** agar data yang sama (produk, kategori, foto QRIS, riwayat) otomatis ikut saat dibuka di HP/komputer lain — semua lewat Google Sheet milik Anda sendiri.

> Cocok dipakai di HP maupun komputer. Bisa dipasang ke layar utama (Home Screen) seperti aplikasi.

---

## ✨ Fitur

- **Mesin Kasir** — katalog produk dengan pencarian & filter kategori, keranjang belanja, dan checkout.
- **Kategori produk dinamis** — tambah & hapus kategori sendiri (mis. Makanan, Minuman, Snack, Rokok). Saat kategori dihapus, produk di dalamnya otomatis dipindah ke kategori lain.
- **Pembayaran** — Tunai (tombol uang cepat, uang pas, hitung kembalian otomatis) atau **QRIS**.
- **Pelanggan (modul tersendiri) + Open Bill / Close Bill** — tab **Pelanggan** untuk kelola nama, no. HP &amp; catatan pelanggan. Saat pesan: isi keranjang → **Simpan sebagai Bill** dengan memilih pelanggan. Untuk menutup, cukup **klik nama pelanggan** (di tab Pelanggan atau daftar Bill Terbuka) → bill termuat ke kasir → bayar Tunai/QRIS. Nama pelanggan muncul di struk &amp; Sheet.
- **Upload foto QRIS toko** — unggah gambar QRIS asli toko Anda di Pengaturan; saat pelanggan bayar QRIS, foto itu yang ditampilkan untuk dipindai. (Jika belum diunggah, ditampilkan QR demo.)
- **Struk** — struk otomatis yang bisa dicetak. Nama, alamat, telepon, dan catatan toko bisa diatur sendiri.
- **Riwayat Transaksi** — daftar semua penjualan, filter per tanggal, lihat/cetak ulang struk, hapus transaksi.
- **Kelola Produk** — tambah, ubah, dan hapus produk kapan saja, lengkap dengan **foto produk** (opsional) yang tampil di katalog kasir.
- **Laporan Pemasukan** — total pemasukan, perbandingan Cash vs QRIS, grafik harian, rekap per hari, dan **Top 10 produk terlaris** yang bisa difilter **per hari, per minggu, dan per bulan**.
- **Login & data per toko** *(opsional, Opsi A)* — masuk dengan akun yang sama di perangkat mana pun; data tiap toko (produk, kategori, foto QRIS, pelanggan, bill, riwayat) tersimpan di **Google Sheet milik toko itu sendiri**, sementara sheet registry admin hanya mencatat **nama toko + login terakhir**. Ditenagai Google Sheets + Apps Script, gratis. Panduan: [PANDUAN_GOOGLE_SHEETS.md](PANDUAN_GOOGLE_SHEETS.md).
- **Cadangan & Pulihkan Data** — unduh seluruh data sebagai file `.json` dan pulihkan kapan pun. Ekspor laporan ke CSV.
- **Mobile friendly + PWA** — tampilan dioptimalkan untuk HP, keranjang muncul sebagai panel geser, bisa dipasang sebagai aplikasi.

---

## 🚀 Cara Pakai (Paling Cepat)

Buka file `index.html` lewat browser (klik dua kali). Aplikasi langsung jalan.

> Catatan: agar fitur "pasang sebagai aplikasi" (PWA) dan mode offline aktif, aplikasi perlu diakses lewat **https** — gunakan GitHub Pages di bawah.

---

## 🌐 Publikasikan Gratis dengan GitHub Pages

Supaya bisa diakses siapa pun lewat tautan (mis. `https://namaanda.github.io/smartkasir/`):

1. **Buat repository baru** di GitHub (mis. `smartkasir`), set ke **Public**.
2. **Upload semua file** di folder ini (`index.html`, `manifest.json`, `sw.js`, folder `icons/`, dll). Lewat tombol **Add file → Upload files**, lalu **Commit**.
3. Buka **Settings → Pages**.
4. Pada **Build and deployment → Source**, pilih **Deploy from a branch**.
5. Pilih branch **main** dan folder **/ (root)**, lalu **Save**.
6. Tunggu ±1 menit. Tautan situs Anda muncul di halaman yang sama. Selesai! 🎉

Di HP, buka tautan lalu pilih menu browser → **"Tambahkan ke Layar Utama" / "Install app"**.

---

## 📁 Struktur File

```
smartkasir/
├── index.html                  # Seluruh aplikasi (HTML, CSS, JavaScript)
├── Code_Registry.gs            # Apps Script REGISTRY (dipasang admin: login + login terakhir)
├── Code_DataToko.gs            # Apps Script DATA per toko (dipasang tiap toko di Sheet sendiri)
├── PANDUAN_GOOGLE_SHEETS.md    # Panduan menghubungkan ke Google Sheets
├── manifest.json               # Konfigurasi PWA
├── sw.js                       # Service worker (dukungan offline)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── README.md
└── LICENSE
```

---

## 📊 Login & Sinkron Antar-Perangkat (Opsional)

Secara default aplikasi berjalan **mode lokal** (data di satu perangkat, tanpa login). Untuk **login + data tiap toko di Google Sheet milik toko itu sendiri**, ikuti **[PANDUAN_GOOGLE_SHEETS.md](PANDUAN_GOOGLE_SHEETS.md)**. Ringkasnya (arsitektur "Opsi A", dua skrip):

1. **Admin (sekali):** pasang **`Code_Registry.gs`** di satu Google Sheet → Deploy Web app → tempel URL `/exec` ke `const BACKEND_URL` di `index.html` (lalu commit). Registry hanya mengurus login & mencatat **nama toko + login terakhir + penunjuk** ke Sheet tiap toko.
2. **Tiap toko (sekali):** pasang **`Code_DataToko.gs`** di Google Sheet **milik toko sendiri** → Deploy Web app → salin URL `/exec`.
3. Di aplikasi: **Daftar/Masuk**, lalu **⚙️ Pengaturan → Sinkron Sheet Toko** → tempel URL `/exec` Sheet toko (+ secret bila ada) → **Sambungkan**. Buka di perangkat lain cukup **Masuk** akun sama — Sheet toko otomatis tersambung.

Catatan teknis: data dikirim memakai `Content-Type: text/plain` agar lolos CORS. Produk, kategori, profil toko (termasuk foto QRIS), **pelanggan, dan bill terbuka** disinkron sebagai "state"; transaksi (**1 item = 1 baris**, plus kolom Pelanggan) dikirim dengan antrian + anti-dobel berbasis ID. **Sheet Registry admin hanya berisi nama toko + login terakhir + penunjuk URL** — data bisnis ada di Sheet milik tiap toko. Password & secret disimpan sebagai hash/teks di Sheet — cukup untuk toko kecil, bukan sekelas perbankan.

---

## 💾 Tentang Penyimpanan Data

Data (produk, kategori, transaksi, profil toko, foto QRIS) disimpan di **localStorage browser** pada perangkat yang dipakai:

- Dalam mode lokal, data **tidak dikirim ke mana-mana** — sepenuhnya privat di perangkat itu.
- Mode lokal **terikat pada satu browser/perangkat**. Membersihkan data browser atau pindah perangkat = data tidak otomatis ikut.
- Untuk pindah/akses dari banyak perangkat, **aktifkan login** (lihat panduan) atau **rutin gunakan "Unduh Cadangan"** lalu "Pulihkan Data" dari file cadangan.

---

## 🛠️ Teknologi

Tailwind CSS · Chart.js · Plus Jakarta Sans · Vanilla JavaScript · Google Apps Script (opsional). Tanpa proses build.

---

## 📄 Lisensi

Dirilis di bawah **Lisensi MIT** — bebas digunakan, dimodifikasi, dan disebarluaskan, termasuk untuk keperluan komersial. Lihat [LICENSE](LICENSE).
