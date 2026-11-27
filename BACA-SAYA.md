# Asisten FM27 — v27.1.23 (untuk Football Manager 27, versi 27.1)

## Membuka
1. Jalankan FM27 dan muat save.
2. Klik dua kali **"Asisten FM27 (FM 27.1)"** di Desktop
   (atau `Asisten FM27 - FM 27.1.vbs` di folder ini).
   Teknik Oda ikut terbuka otomatis; sebaliknya, membuka Teknik Oda juga membuka Asisten
   (lewat `Pengawas Teknik Oda.vbs` yang menyala saat Windows dinyalakan).

## Nama versi
`27.1.21` = untuk **FM 27.1**, build Asisten ke-**21**. Nama berkas peluncur & shortcut ikut versi FM.

## Deteksi update FM
FM hanya melaporkan "27.1", jadi Asisten memeriksa:
- **Sidik jari** `game_plugin.dll` (tanggal build + ukuran) — dicatat di `data/versi-fm.json`.
- **Uji struktur memori** otomatis (UID, CA/PA, kontrak, relasi) setiap FM dibuka.

Status tampil di header: **Versi cocok** · **Update FM · lolos uji** (cheat tetap aktif) ·
**Update FM · cheat dikunci** (struktur berubah — cheat dimatikan demi keamanan save sampai Asisten diperbarui).

## Update Asisten
Minta perubahan di sesi Claude. Setelah berkas diubah, klik shortcut lagi — versi lama ditutup otomatis.

## Data
Semua data ada di folder `data/` (riwayat cheat & batal, daftar pantau, target transfer, youth intake,
log error `asisten.log` & `server.log`). Folder ini ikut terbawa bila Windows diinstal ulang.
Setelah instal ulang Windows: pasang **Node.js**, lalu jalankan peluncurnya.

## Peringatan
Cadangkan save sebelum memakai cheat. Perubahan baru permanen saat game disimpan;
semua cheat bisa dibatalkan di Riwayat selama FM27 belum ditutup.
