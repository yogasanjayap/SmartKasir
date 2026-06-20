# 📊 Panduan SmartKasir — Login & Data per Toko (Opsi A)

Mulai versi ini, data tiap toko **disimpan di Google Sheet milik toko itu sendiri**. Ada **dua** skrip:

1. **`Code_Registry.gs`** — dipasang **sekali oleh Anda (admin/pemilik aplikasi)**. Mengurus login akun dan mencatat **nama toko + login terakhir + penunjuk** ke Sheet tiap toko. **Tidak menyimpan data bisnis.**
2. **`Code_DataToko.gs`** — dipasang oleh **tiap toko** di Google Sheet **milik mereka sendiri**. Di sinilah produk, kategori, profil toko, foto QRIS, **database pelanggan**, **bill terbuka**, dan **transaksi** disimpan.

Tanpa setup ini, aplikasi tetap jalan dalam mode lokal (data di satu perangkat, tanpa login).

---

## BAGIAN 1 — Admin: pasang Registry (sekali saja)

1. Buka [sheets.new](https://sheets.new), beri nama mis. **"SmartKasir Registry"**.
2. **Extensions → Apps Script** → hapus kode contoh → tempel **seluruh isi `Code_Registry.gs`**.
3. (Opsional) Isi `const REGISTER_CODE = '...'` agar tidak sembarang orang bisa mendaftar.
4. **Deploy → New deployment → Web app**: Execute as **Me**, Who has access **Anyone** → **Deploy** → izinkan akses → salin **URL `/exec`**.
5. Buka **`index.html`**, isi baris:
   ```js
   const BACKEND_URL = ''; // = URL Registry
   ```
   menjadi URL registry tadi, lalu **commit** ke GitHub. Tunggu ±1 menit.

Sekarang aplikasi menampilkan layar **Masuk / Daftar**. Tab **Users** di Sheet Registry hanya berisi: **nama toko (username), password (hash), dibuat, Login Terakhir, Data URL, Data Secret**.

---

## BAGIAN 2 — Tiap Toko: buat Sheet data sendiri

1. Toko buka [sheets.new](https://sheets.new), beri nama mis. **"Data Toko Saya"**.
2. **Extensions → Apps Script** → hapus kode contoh → tempel **seluruh isi `Code_DataToko.gs`**.
3. (Disarankan) Isi `const SECRET = '...'` dengan kata sandi bebas — ini melindungi Sheet toko agar tidak ditulis sembarang orang. Catat secret-nya.
4. **Deploy → New deployment → Web app**: Execute as **Me**, Who has access **Anyone** → **Deploy** → izinkan akses → salin **URL `/exec`**.

> Cek cepat: tempel URL `/exec` di browser. Jika muncul `{"ok":true,...}`, skrip aktif.

---

## BAGIAN 3 — Sambungkan di aplikasi

### Cara client (toko) mendaftar / masuk
1. Buka tautan aplikasi (mis. `https://yogasanjayap.github.io/SmartKasir/`). Akan muncul layar **Masuk**.
2. Klik **"Daftar"** di bawah tombol.
3. Isi **Username** (jadikan ini **nama toko**, min. 3 huruf), **Password** (min. 4 karakter). Jika admin mengaktifkan **Kode Pendaftaran**, isi juga kodenya (minta ke admin).
4. Klik **Daftar** → otomatis masuk. Lain kali cukup **Masuk** dengan username & password yang sama.

> Jika muncul pesan **"Server registry membalas tidak valid…"** atau **"Tidak bisa terhubung ke registry"**, hampir selalu karena **setelan deploy registry**, bukan aplikasinya. Cek: (a) Web App di-deploy **Execute as: Me**, **Who has access: Anyone**; (b) URL di `BACKEND_URL` diakhiri **/exec** (bukan /dev) dan tanpa spasi; (c) `Code_Registry.gs` **dan** `Code_DataToko.gs` ada di **dua project Apps Script terpisah** (jangan ditempel di satu project — bisa bentrok nama fungsi). Setelah memperbaiki, **Deploy ulang → New version**.

### Sambungkan Sheet data toko

1. Toko **Daftar / Masuk** (username = nama toko).
2. Buka **⚙️ Pengaturan → "Sinkron Sheet Toko"**.
3. Tempel **URL `/exec`** Sheet toko + **Secret** (jika diisi di skrip), lalu klik **Sambungkan & Tes**.
4. Selesai. Data lokal yang sudah ada otomatis terunggah ke Sheet toko, dan badge **Tersinkron** muncul.

Mulai sekarang, semua perubahan (produk, pelanggan, bill, transaksi) tersimpan di Sheet milik toko. **Buka di perangkat lain → cukup Masuk dengan akun yang sama**, aplikasi otomatis tahu Sheet toko mana yang dipakai (URL-nya tersimpan di Registry sebagai penunjuk) dan langsung memuat datanya — tanpa setting ulang.

---

## Apa yang tersimpan di mana

**Sheet Registry (punya admin)** — tab **Users**:
nama toko | salt | hash | dibuat | **Login Terakhir** | Data URL | Data Secret. Tidak ada data penjualan di sini.

**Sheet Data Toko (punya toko)**:
- **AppState** — snapshot produk, kategori, profil toko, foto QRIS, pelanggan, dan bill terbuka (JSON, otomatis dipotong jika panjang).
- **Transaksi** — **1 item = 1 baris**:

  | Timestamp | ID Transaksi | Tanggal | Waktu | Toko | Pelanggan | Nama Item | Kategori | Qty | Harga Satuan | Subtotal | Metode | Total Transaksi | Uang Diterima | Kembalian |
  |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

  Satu struk dengan 3 item = 3 baris dengan ID Transaksi sama. Kolom Total/Uang Diterima/Kembalian hanya di baris pertama. Ada kolom tersembunyi **ItemsJSON** (paling kanan) untuk memuat ulang riwayat.

---

## Cara kerja & catatan jujur

- **Offline-first.** Data utama tetap di perangkat; saat online disinkron ke Sheet toko. Transaksi pakai antrian + anti-dobel (ID), jadi aman walau internet putus.
- **Last-write-wins** untuk produk/pelanggan/bill: perubahan tersimpan paling akhir yang menang — hati-hati jika dua perangkat mengubah hal yang sama bersamaan.
- **Secret toko** disimpan di Registry (punya admin) agar perangkat lain bisa otomatis tersambung. Jadi admin secara teknis bisa melihat secret itu. Untuk toko kecil ini wajar; jika tidak nyaman, kosongkan SECRET (Sheet toko jadi bisa ditulis siapa pun yang tahu URL-nya — pilih salah satu).
- **Tiap mengubah `Code_*.gs`** → Deploy → Manage deployments → Edit (pensil) → New version → Deploy, agar perubahan aktif. URL tidak berubah.

## Masalah umum

- **Tidak ada layar login** → `BACKEND_URL` (registry) di index.html masih kosong / situs belum ter-update. Commit & tunggu ±1 menit, lalu refresh (Ctrl+F5).
- **"Tidak bisa terhubung ke Sheet toko"** → pastikan Web App toko **Who has access = Anyone**, URL diakhiri **/exec** (bukan /dev), dan **Secret** di aplikasi sama dengan di `Code_DataToko.gs`.
- **Data tidak ikut di perangkat lain** → pastikan toko sudah **Sambungkan Sheet Toko** minimal sekali (URL-nya akan tersimpan di Registry dan otomatis dipakai perangkat lain).
- **Lupa password** → buka tab **Users** di Sheet Registry, hapus baris akun itu, lalu daftar ulang dengan username sama (Data URL-nya bisa diisi lagi lewat Pengaturan; data di Sheet toko tetap aman).
