# MyBakery Inventory

Sistem manajemen inventori untuk bisnis roti/bakery yang punya **banyak cabang**. Aplikasi ini membantu mengontrol stok bahan dan produk di tiap cabang, mencatat produksi, mengelola pembelian ke supplier, sampai memantau barang yang mau habis atau mau kedaluwarsa — semuanya dari satu dashboard.

## Latar Belakang

Toko roti dengan beberapa cabang biasanya kesulitan memantau stok: bahan yang dipakai di dapur mana, stok mana yang tinggal sedikit, mana yang lewat tanggal, dan berapa kerugian karena barang rusak/expire. MyBakery Inventory menjawab masalah itu dengan data stok yang selalu tercatat per cabang, riwayat setiap pergerakan barang, dan peringatan otomatis supaya admin bisa cepat restock.

## Fitur

**Autentikasi & Hak Akses**
- Login dengan 3 role: Super Admin (semua cabang), Admin Cabang (cabangnya saja), dan Staf (operasional harian).
- Data tiap cabang otomatis di-scoping — admin cabang tidak bisa melihat/mengubah data cabang lain.

**Dashboard**
- Statistik real-time: total item, stok menipis, mau expired, stok habis.
- Grafik aliran stok masuk/keluar (bisa pilih bar atau line chart).
- Kartu "Segera Habis" — item yang estimasi stoknya habis dalam ≤7 hari.
- Pengatur cabang (branch switcher) untuk melihat data per cabang atau semua cabang.

**Master Data**
- Cabang, Kategori, Item (dengan gambar, barcode/QR otomatis `MYB-XXXXX`, harga beli/jual), Supplier (termasuk lead time pengiriman), dan data Karyawan.

**Inventori & Stock Movement**
- Ringkasan stok semua cabang dengan status otomatis: *good, low stock, expired,* atau *out of stock*.
- Input stok masuk/keluar — bisa satu per satu atau **bulk** (banyak item sekaligus dalam satu form).
- Indikator **Estimasi Habis** per item (rata-rata pemakaian harian → perkiraan hari habis).
- Riwayat lengkap setiap pergerakan stok dengan filter tanggal, cabang, dan tipe.

**Operasional & Produksi**
- **Catat Produksi**: pilih resep → sistem potong bahan dari stok cabang otomatis (gagal total kalau bahan kurang).
- **Rencana Produksi**: kalkulator kebutuhan bahan per batch.
- **Batch/Lot Tracking**: stok dicatat per batch dengan konsumsi FIFO.
- **Stock Opname**: input hasil hitung fisik → approve → selisih otomatis dicatat sebagai stock movement.
- **Transfer Stok Antar Cabang**: alur request → approve → diterima, stok dua cabang terpotong/masuk otomatis.

**Pembelian & Keuangan**
- **Purchase Order** ke supplier: draft → sent → received.
- **Saran Pemesanan**: daftar item yang perlu restock berdasarkan titik reorder (reorder point) — satu klik untuk prefill draft PO.
- **Resep/BOM** + hitung **HPP** otomatis dari harga bahan terbaru.
- **Laporan Kerugian**: nominal kerugian dari barang expired/rusak (bukan cuma jumlah qty).

**Laporan, Notifikasi & Lainnya**
- Laporan stok movement dengan filter tanggal + export **CSV** (dashboard, laporan, kerugian, HPP).
- **Notifikasi in-app** otomatis: stok mencapai batas minimum dan item mendekati tanggal expired (7 hari sebelum).
- **Activity Log**: jejak siapa melakukan apa dan kapan.
- Dark mode, fully responsive di HP, fuzzy search di semua halaman, toast & konfirmasi dialog.

## Akun Demo

Saat `db:seed` dijalankan, data dummy beserta akun berikut dibuat (password semua: `password`):

| Role | Email |
|------|-------|
| Super Admin | `admin@mybakery.com` |
| Admin Cabang 1–5 | `admin1@mybakery.com` … `admin5@mybakery.com` |
| Staf 1–5 | `staf1@mybakery.com` … `staf5@mybakery.com` |

## Teknologi

| | |
|---|---|
| **Frontend** | Next.js 16 (App Router) + TypeScript, Tailwind CSS v4, shadcn/ui, lucide-react, Recharts, Fuse.js |
| **Backend** | Laravel (PHP 8.3) + Laravel Sanctum (auth cookie-based), API Resources + Form Requests + Policies |
| **Database** | MySQL (compatible dengan TiDB Cloud untuk deploy gratis) |

Arsitektur **decoupled**: Laravel menjadi REST API murni di prefix `/api`, Next.js mengonsumsinya lewat axios (`withCredentials`). Di production, request API di-proxy oleh Next.js rewrites (`/api/*` → backend) sehingga cookie session tetap same-origin.

## Menjalankan Secara Lokal

Prasyarat: PHP ≥ 8.3 + Composer, Node.js ≥ 18, MySQL.

**Terminal 1 — Backend:**
```bash
cd backend
composer install
cp .env.example .env          # lalu isi kredensial MySQL di .env
php artisan key:generate
php artisan migrate --seed
php artisan serve             # http://localhost:8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

Secara default frontend meng-proxy `/api` dan `/sanctum` ke `http://localhost:8000` (diubah lewat env `BACKEND_URL` untuk production).

## Struktur Repo

```
mybakery-inventory/
├── backend/    # Laravel API (app/, database/, routes/, Dockerfile untuk deploy)
└── frontend/   # Next.js App Router (app/, components/, lib/)
```

## Deploy

Sudah disiapkan untuk deploy gratis:
- **Frontend** → Vercel (set root directory `frontend`, env `BACKEND_URL` ke URL backend).
- **Backend** → Render (root directory `backend`, runtime Docker — Dockerfile sudah ada, health check `/up`).
- **Database** → TiDB Cloud Starter (region Singapore) atau MySQL biasa.

## License

Untuk projek random dummy.
