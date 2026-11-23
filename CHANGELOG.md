# Catatan Perubahan — Asisten FM27

Format versi: `27.1.x` = untuk **Football Manager 27 versi 27.1**, build Asisten ke-x.

## 27.1.19 — 23 Nov 2026
- **Perbaikan izin kerja:** tombol lama *Work permit ON/OFF* ternyata tidak berpengaruh di FM27 (bit yang diubah memang sudah menyala di semua pemain). Diganti dengan **🛂 Lolos izin kerja & non-UE**: pemain diberi kewarganegaraan kedua sesuai negara *liga* klub Anda (Inggris untuk Premier League), sehingga tidak perlu izin kerja. Untuk izin yang sudah ditolak: terapkan, lalu ajukan banding di FM.
- **Baru — menu Tawaran Saya** (Pasar): semua pemain yang Anda tawar, dekati (bebas transfer) atau negosiasikan kontraknya di FM dirangkum **per posisi**, beserta status *Sudah bergabung / Kontrak disepakati / Negosiasi / Tawaran dikirim / Pindah ke klub lain* dan jumlah pemain skuad di posisi itu, sehingga terlihat posisi mana yang belum terisi. Setiap posisi juga menampilkan **skuad saat ini (Inti/Pelapis)** dan penilaian kebutuhan: *Aman*, *Butuh pelapis*, *Butuh pemain inti lebih bagus* (dibanding rata-rata 11 terbaik), atau *Kosong*. Dicatat otomatis lewat plugin Jembatan.
- **Perbaikan Keuangan Klub** (diuji langsung di layar Keuangan FM):
  - **Anggaran transfer** kini mengubah angka *Anggaran yang Tersedia* yang tampil di FM. Sebelumnya yang berubah anggaran awal musim, jadi di game seolah tidak berubah.
  - **Anggaran gaji** kini menambah anggaran. Sebelumnya cheat ini keliru menaikkan *pengeluaran* gaji, sehingga sisa anggaran malah makin minus.
  - Panel Keuangan di Asisten menampilkan *Pengeluaran gaji* dan sisa *Tersedia*, sama seperti FM.
  - **Editor keuangan baru (setara editor dalam-game FM):** ketik angka bebas (280jt, 1M, 500rb, -50jt) atau pilih cepat, lalu **Tetapkan** angka persis / **Tambah** / **Kurangi**. Rentang mengikuti editor FM: saldo & anggaran transfer (−£1 M) s/d £1 M, anggaran gaji £0 s/d £5 jt/mgg. Tombol baru **Cukupkan anggaran gaji** (pengeluaran + 10%).
  - Saldo sudah benar sejak awal. Layar Keuangan FM baru memperbarui angka setelah dibuka ulang (pindah tab lalu kembali).

## 27.1.18 — 23 Nov 2026
- **Latihan → Terapkan ke FM tidak lagi berhenti dengan error "FM belum punya contoh perintah".** Bila FM baru dibuka, Asisten menampilkan langkah singkat (ganti Fokus Tambahan satu pemain di FM), menunggu, lalu **melanjutkan sendiri** ke semua pemain begitu FM merekamnya.
- Perbaikan: hasil dari plugin Jembatan kadang terbaca kosong (berkas berisi karakter non-ASCII), sehingga jumlah pemain yang berhasil diterapkan bisa salah.
- Plugin Jembatan: logika 1.3 (dimuat otomatis tanpa menutup FM).

## 27.1.17 — 23 Nov 2026
- **Baru — angka CA/PA langsung di tabel pemain FM** (skuad, U20/U18, pemilihan tim, pencarian…). Angkanya ditempel rata kanan di ujung kolom Posisi. Asisten membaca nama di layar dengan OCR bawaan Windows (kolom.exe), termasuk nama singkat seperti "N. Noll". Saat layar pertandingan, pemeriksaan dijarangkan supaya FM tetap ringan.
- **Baru — 🇪🇺 Lolos aturan non-UE:** pemain diberi kewarganegaraan kedua sesuai negara liga klub Anda (mis. Italia untuk Serie A), jadi tidak lagi memakai slot non-UE / pemain asing. Tombolnya ada di Pusat Cheat → Izin & Klausul dan di profil pemain. Bisa dibatalkan di Riwayat.
- Tombol klausul rilis di profil pemain kini memakai nilai yang Anda pilih (mulai £1).

## 27.1.16 — 23 Nov 2026
- **Perbaikan: membuka Teknik Oda kini selalu ikut membuka Asisten**, juga bila Teknik Oda sudah berjalan di tray lalu dibuka lagi. Sebelumnya pembukaan ulang itu hanya berlangsung ±0,4 detik sehingga terlewat. Pengawas baru (pengawas.exe) hanya membuka Asisten bila jendelanya belum ada.
- Label **"Buka di FM manual"** tidak lagi muncul hanya karena FM sedang sibuk beberapa detik (sering terjadi di database besar). Arahkan kursor ke label untuk melihat alasannya.
- Database raksasa diuji ulang: 524 ribu pemain (dump 757 MB) terbaca tanpa error *"Cannot create a string longer than 0x1fffffe8"*. Bila error ini masih muncul, perbarui ke versi ini.

## 27.1.15 — 22 Nov 2026
- **Perbaikan penting — regen tiba-tiba PA 200:** Youth Intake otomatis bisa terbawa ke save lain dan, setelah game baru/save lain dimuat, menganggap *semua* regen sebagai "pemain intake" lalu menaikkan PA-nya.
  - Pengaturan youth intake kini terikat ke karier masing-masing (klub harus cocok).
  - Muat save lain / tanggal game mundur = daftar pemain dihitung ulang, tidak ada yang ditulis.
  - Ribuan "pemain baru" sekaligus dianggap pergantian save dan diabaikan.
  - Label kuning di header selama Youth Intake aktif, dan konfirmasi merah untuk cakupan di luar klub sendiri.
- **Baru — ⭐ Klub Superstar:** naikkan reputasi klub Anda (bisa dibatalkan) supaya pemain top mau bergabung walau klub Anda kecil.
- **Klub Menerima Tawaran:** nilai klausul rilis bisa dipilih mulai £1. Nilai yang dipilih dipakai juga di profil pemain dan Target Transfer.
- **Badge CA/PA di profil FM muncul lagi** di layar resolusi tinggi / skala Windows 125%+ (tombol Teknik Oda sebelumnya dianggap terlalu kecil).
- Ruang Manajer & Latihan: tidak lagi menampilkan data karier lama saat Anda menganggur / memulai game baru.

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
