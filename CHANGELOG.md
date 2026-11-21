# Catatan Perubahan — Asisten FM27

Format versi: `27.1.x` = untuk **Football Manager 27 versi 27.1**, build Asisten ke-x.

## 27.1.14 — 22 Nov 2026
- **Installer baru** (`Setup Asisten FM27.exe`):
  - Memasang ke `%LOCALAPPDATA%\Programs\Asisten FM27` (bisa diganti) dan membuat shortcut di Desktop + Start Menu.
  - Muncul di **Pengaturan Windows → Aplikasi** dan bisa di-uninstall dari sana.
  - **Memeriksa Node.js & Teknik Oda** saat dipasang. Bila belum ada, menawarkan membuka halaman unduhannya.
  - Pembaruan **tidak menghapus data** (riwayat cheat, target, daftar pantau per karier).
  - Opsional: pengawas Teknik Oda dan plugin Jembatan (eksperimental, untuk "Terapkan ke FM").
- Catatan perubahan bisa dibuka dari Asisten (klik nomor versi di menu samping).

## 27.1.13 — 22 Nov 2026
- **Perbaikan:** error *"Cannot create a string longer than 0x1fffffe8 characters"* pada database sangat besar (ratusan ribu pemain). Data kini dibaca bertahap.
- Asisten boleh memakai memori lebih besar (hingga 6 GB) untuk database raksasa.

## 27.1.12 — 22 Nov 2026
- **Latihan → Terapkan ke FM** (eksperimental, butuh plugin Jembatan):
  - Fokus Tambahan rekomendasi dipasang langsung ke FM, dari tab Individu maupun Tim Utama.
  - Jadwal mingguan tim masih menunggu rekaman jadwal custom.
- **"Buka di FM" kini langsung memindahkan layar ke FM.**
- **Pusat Cheat:** kelompok *Klub & Board* tampil pertama; *Kuatkan Pemain* dipindah ke belakang.
- **Pengaman cheat:** cakupan di luar klub sendiri (>300 orang) atau "Semua sekaligus" meminta konfirmasi kedua berwarna merah yang tidak bisa disetujui dengan Enter.
- **Mode Comeback** kini hanya untuk satu laga: otomatis dikembalikan begitu tanggal game berganti.
- Badge CA/PA di profil FM tidak macet lagi setelah FM ditutup-buka.

## 27.1.11 — 21 Nov 2026
- **Latihan → Tim Junior:**
  - Jadwal U-21 & U-18 yang memaksimalkan perkembangan.
  - Faktor perkembangan (pelatih muda, mentor, menit bermain).
  - Prioritas pemain muda yang paling cepat naik.
- **Latihan → Individu:**
  - Peran latihan, fokus tambahan dari atribut terlemah peran, dan intensitas (ganda/normal/setengah/istirahat).
  - Saran mentor, pinjaman, promosi tim.

## 27.1.10 — 21 Nov 2026
- **Data per karier:** target transfer, daftar pantau, centang latihan, dan youth intake tidak lagi terbawa ke game baru.
- **Latihan menyesuaikan 5 laga terakhir:**
  - Mode perbaikan saat banyak kalah, dengan fokus ke fase terlemah.
  - Beban dijaga saat tim sedang bagus.
- Pemain buatan FM yang namanya tak terbaca tampil sebagai "Regen tanpa nama".

## 27.1.9 — 21 Nov 2026
- **Menu samping datar** dengan kelompok berwarna (Hari Ini, Tim, Pasar, Klub, Alat) dan angka kecil.
- Filter Skuad memakai dropdown.
- **Staf lebih realistis:**
  - Reputasi (Lokal–Dunia) dan minat bergabung ala FM.
  - Manajer aktif enggan turun jabatan; staf klub besar enggan ke klub kecil.
- Tabel Standar Minimum di Panduan Rekrutmen muat di kartu.

## 27.1.8 — 21 Nov 2026
- Header ringkas satu baris: status normal digabung menjadi "Semua siap".
- Filter kelas staf berdiri sendiri (Elit tidak lagi memuat Kelas Dunia).
- Menu Pengaturan disembunyikan (lokasi file terdeteksi otomatis).

## 27.1.7 — 21 Nov 2026
- **Ruang Manajer:** halaman utama baru dengan lawan berikutnya, susunan taktik FM berwarna kondisi, kebugaran, laga terakhir, target musim, 3 tugas hari ini, dan "Tanya Asisten".

## 27.1.6 — 21 Nov 2026
- **Filter "Mau Gabung"** di Scouting: perkiraan pemain yang realistis mau pindah ke klub Anda.
- Perbaikan Cari Pemain yang "loading terus": sekarang muncul pesan penyebab dan tombol Coba lagi.
- Pengaturan tidak lagi memuat Cheat Table / Cheat Engine (tidak dipakai).

## 27.1.5 — 21 Nov 2026
- **Menu Latihan:**
  - Jadwal 7 hari × 3 sesi dari jadwal laga, kondisi skuad, laporan performa, dan taktik.
  - Audit jadwal FM, daftar tindakan per pemain, briefing, dan pelatih terbaik per area.
- Fitur "Board selalu setuju" dikunci (belum berfungsi).

## 27.1.4 — 21 Nov 2026
- Rilis pertama untuk dibagikan:
  - Scouting, database, susunan terbaik, akademi, transfer, staf.
  - Pusat Cheat, badge CA/PA di profil FM, deteksi update FM.
