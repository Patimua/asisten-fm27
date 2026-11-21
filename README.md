# Asisten FM27

Aplikasi pendamping **Football Manager 27 (versi 27.1)** untuk Windows. Asisten membaca save yang sedang terbuka lewat **Teknik Oda**, lalu menampilkan ruang manajer, scouting, perencanaan latihan, dan Pusat Cheat dalam satu jendela.

> Proyek penggemar, tidak berafiliasi dengan Sports Interactive atau SEGA. Gunakan cheat hanya untuk permainan offline / pribadi, dan **cadangkan save** sebelum memakainya.

## Fitur utama
- **Ruang Manajer**: lawan berikutnya, susunan taktik FM dengan warna kondisi, kebugaran, laga terakhir, target musim, 3 tugas hari ini, dan Tanya Asisten.
- **Latihan**:
  - Jadwal 7 hari × 3 sesi otomatis dari jadwal laga, kondisi, performa, dan 5 laga terakhir.
  - Audit jadwal FM.
  - Tab **Tim Junior** (U-21/U-18) dan **Individu** (peran, fokus tambahan, intensitas).
  - *Terapkan ke FM* (eksperimental, lewat plugin Jembatan).
- **Pasar**: scouting seluruh database, filter *Mau Gabung*, pencari peran, panduan rekrutmen, target transfer, daftar pantau, bandingkan.
- **Staf**: kelas, reputasi, dan minat bergabung ala FM.
- **Pusat Cheat**: board/klub, pertandingan (Mode Comeback), kontrak, kuatkan pemain, lawan, youth intake. Semua bisa dibatalkan selama FM belum ditutup.
- Data per karier, badge CA/PA di profil FM, dan deteksi update FM (cheat dikunci bila struktur memori berubah).

## Memasang
1. Pasang **[Node.js LTS](https://nodejs.org/id/download)** dan **Teknik Oda**.
2. Unduh `Setup Asisten FM27 vX.Y.Z.exe` dari halaman **Releases**, lalu jalankan. Installer memeriksa Node.js & Teknik Oda dan menawarkan halaman unduhannya bila belum ada.
3. Buka FM27, muat save, lalu buka **Asisten FM27** dari Desktop / Start Menu.

Alternatif tanpa installer: unduh `Asisten FM27 vX.Y.Z.zip`, ekstrak, lalu jalankan `Pasang (jalankan sekali).vbs`.

## Struktur
| Folder | Isi |
|---|---|
| `server.js` | Server lokal (Node.js, tanpa dependensi), port 2728 |
| `lib/` | Mesin analisis, latihan, ruang manajer, cheat, deteksi versi |
| `public/` | Antarmuka web (dibuka sebagai jendela aplikasi Edge) |
| `native/` | Alat kecil C#: pembaca/penulis memori (`fmmem`), badge CA/PA (`capa`), notifikasi (`balon`), fokus jendela FM (`fokus`), plugin BepInEx Jembatan, installer |

## Build rilis
Kebutuhan: Windows 10/11, Node.js, dan .NET Framework 4.x (bawaan Windows).

```powershell
node native\setup\build.js
```

Hasil ada di folder `..\Rilis`: `Setup Asisten FM27 v<versi>.exe` dan `Asisten FM27 v<versi>.zip`. Alat native (`native\*.cs`) dikompilasi dengan `csc.exe` bawaan .NET Framework.

## Catatan perubahan
Lihat [CHANGELOG.md](CHANGELOG.md).
