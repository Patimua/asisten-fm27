// Build rilis Asisten FM27: staging bersih → app.zip + jembatan.zip → Setup.exe (installer) + ZIP portabel.
// Jalankan:  node native\setup\build.js      (dari folder "Asisten FM27")
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const SRC = path.resolve(__dirname, '..', '..');                 // folder sumber "Asisten FM27"
const RILIS = path.resolve(SRC, '..', 'Rilis');
const VER = /version: '([^']+)'/.exec(fs.readFileSync(path.join(SRC, 'lib', 'versi.js'), 'utf8'))[1];
const STAGE = path.join(RILIS, 'Asisten FM27');
const WORK = path.join(__dirname, 'build'); fs.rmSync(WORK, { recursive: true, force: true }); fs.mkdirSync(WORK, { recursive: true });
const TEKNIKODA_URL = process.env.TEKNIKODA_URL || (fs.existsSync(path.join(__dirname, 'teknikoda-url.txt')) ? fs.readFileSync(path.join(__dirname, 'teknikoda-url.txt'), 'utf8').trim() : '');

// 1) Staging bersih (tanpa data pribadi, cadangan, atau alat debug)
const SKIP = /(\.bak[^\\/]*$|\.log$|JANGAN|fmprobe|\.new\.exe$|\.build\.exe$|[\\/]data[\\/]|[\\/]jembatan[\\/]|[\\/]setup[\\/]|[\\/]\.claude[\\/])/i;
const KEEP_EXTRA = ['BACA-SAYA.txt', 'Pasang (jalankan sekali).vbs', 'Panduan (gambar)']; // dikelola di folder rilis
for (const e of fs.readdirSync(STAGE)) if (!KEEP_EXTRA.includes(e)) fs.rmSync(path.join(STAGE, e), { recursive: true, force: true });
const ROOT_FILES = ['Asisten FM27 - FM 27.1.vbs', 'Pengawas Teknik Oda.vbs', 'asisten.ico', 'server.js', 'CHANGELOG.md'];
for (const f of ROOT_FILES) fs.copyFileSync(path.join(SRC, f), path.join(STAGE, f));
const copyDir = (d, filter) => { for (const f of fs.readdirSync(path.join(SRC, d), { withFileTypes: true })) { const rel = path.join(d, f.name), full = path.join(SRC, rel); if (SKIP.test(full)) continue; if (f.isDirectory()) copyDir(rel, filter); else if (!filter || filter(f.name)) { fs.mkdirSync(path.join(STAGE, d), { recursive: true }); fs.copyFileSync(full, path.join(STAGE, rel)); } } };
copyDir('lib'); copyDir('public');
copyDir('native', n => /^(balon|capa|fmmem|fokus)\.(cs|exe)$/i.test(n));
// versi di BACA-SAYA.txt
const bs = path.join(STAGE, 'BACA-SAYA.txt'); fs.writeFileSync(bs, fs.readFileSync(bs, 'utf8').replace(/v27\.\d+\.\d+/, 'v' + VER));

// 2) app.zip (isi untuk installer; tanpa pemasang VBS lama) & jembatan.zip
const ps = cmd => cp.execFileSync('powershell', ['-NoProfile', '-Command', cmd], { stdio: 'inherit' });
const appDir = path.join(WORK, 'app'); fs.cpSync(STAGE, appDir, { recursive: true }); fs.rmSync(path.join(appDir, 'Pasang (jalankan sekali).vbs'), { force: true });
ps(`Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory('${appDir}', '${path.join(WORK, 'app.zip')}', 'Optimal', $false)`);
const jb = path.join(WORK, 'jb'); fs.mkdirSync(jb);
for (const f of ['Asisten.Jembatan.dll', 'Asisten.Jembatan.Logika.dll', 'Jembatan.cs', 'Logika.cs']) fs.copyFileSync(path.join(SRC, 'native', 'jembatan', f), path.join(jb, f));
ps(`Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory('${jb}', '${path.join(WORK, 'jembatan.zip')}', 'Optimal', $false)`);
fs.copyFileSync(path.join(SRC, 'CHANGELOG.md'), path.join(WORK, 'CHANGELOG.md'));
fs.writeFileSync(path.join(WORK, 'teknikoda-url.txt'), TEKNIKODA_URL);

// 3) Kompilasi Setup.exe (versi installer disamakan dengan versi aplikasi)
const setupSrc = path.join(WORK, 'Setup.cs');
fs.writeFileSync(setupSrc, fs.readFileSync(path.join(__dirname, 'Setup.cs'), 'utf8').replace(/public const string Version = "[^"]+";/, `public const string Version = "${VER}";`));
const out = path.join(RILIS, `Setup Asisten FM27 v${VER}.exe`);
for (const f of fs.readdirSync(RILIS)) if (/^Setup Asisten FM27 v.*\.exe$/.test(f) || /^Asisten FM27 v.*\.zip$/.test(f)) fs.rmSync(path.join(RILIS, f), { force: true });
cp.execFileSync('C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe', ['/nologo', '/optimize+', '/target:winexe', `/out:${out}`, `/win32icon:${path.join(SRC, 'asisten.ico')}`,
  '/r:System.Windows.Forms.dll', '/r:System.Drawing.dll', '/r:System.IO.Compression.dll', '/r:System.IO.Compression.FileSystem.dll', '/r:System.Management.dll',
  `/resource:${path.join(WORK, 'app.zip')},app.zip`, `/resource:${path.join(WORK, 'jembatan.zip')},jembatan.zip`, `/resource:${path.join(WORK, 'CHANGELOG.md')},CHANGELOG.md`, `/resource:${path.join(WORK, 'teknikoda-url.txt')},teknikoda-url.txt`, setupSrc], { stdio: 'inherit' });

// 4) ZIP portabel (alternatif tanpa installer)
const zip = path.join(RILIS, `Asisten FM27 v${VER}.zip`);
ps(`Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory('${STAGE}', '${zip}', 'Optimal', $true)`);
fs.copyFileSync(path.join(SRC, 'CHANGELOG.md'), path.join(RILIS, 'CHANGELOG.md'));
console.log(`OK v${VER}\n  ${out} (${(fs.statSync(out).size / 1024) | 0} KB)\n  ${zip} (${(fs.statSync(zip).size / 1024) | 0} KB)\n  Teknik Oda URL: ${TEKNIKODA_URL || '(belum diisi → pencarian Google)'}`);
