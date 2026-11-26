'use strict';
// Versi Asisten & deteksi update FM27.
// Nomor versi Asisten = <versi FM yang didukung>.<build Asisten>, mis. 27.1.3 = untuk FM 27.1, build ke-3.
// FM hanya melaporkan "27.1", jadi patch kecil dideteksi lewat SIDIK JARI game_plugin.dll
// (stempel waktu build PE + ukuran berkas) dan UJI STRUKTUR memori otomatis.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const APP = { version: '27.1.21', fm: '27.1', name: 'Asisten FM27' };

function fmPath() {
  return new Promise(res => execFile('powershell.exe', ['-NoProfile', '-Command', '(Get-Process fm -ErrorAction SilentlyContinue | Select-Object -First 1).Path'], { windowsHide: true, timeout: 8000 }, (e, out) => res(String(out || '').trim() || null)));
}
function peStamp(file) { // TimeDateStamp dari header PE
  const fd = fs.openSync(file, 'r');
  try { const h = Buffer.alloc(0x400); fs.readSync(fd, h, 0, 0x400, 0); const off = h.readUInt32LE(0x3c); return h.readUInt32LE(off + 8); } finally { fs.closeSync(fd); }
}
async function fingerprint() {
  const exe = await fmPath(); if (!exe) return null;
  const gp = path.join(path.dirname(exe), 'fm_Data', 'Plugins', 'x86_64', 'game_plugin.dll');
  if (!fs.existsSync(gp)) return { exe, gp: null };
  const st = fs.statSync(gp); const stamp = peStamp(gp);
  return { exe, gp, size: st.size, stamp, built: new Date(stamp * 1000).toISOString().slice(0, 10), fp: `${stamp.toString(16)}-${st.size}` };
}

class Versi {
  constructor(dataDir, cheats) { this.file = path.join(dataDir, 'versi-fm.json'); this.CH = cheats; this.cache = null; }
  db() { try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { return { known: [] }; } }
  save(d) { fs.writeFileSync(this.file, JSON.stringify(d, null, 2)); }
  // Uji struktur: cek sampel objek pemain dengan aturan yang harus selalu benar bila tata letak memori masih cocok
  async selfTest() {
    const CH = this.CH; const idx = await CH.index();
    const sample = [...idx].filter(([, v]) => v.kind === 'P').map(([u]) => u);
    const pick = []; for (let i = 0; i < 40 && sample.length; i++) pick.push(sample[Math.floor((i + 0.5) * sample.length / 40)]);
    const ents = await CH.verified(pick, 'P');
    const caPa = await CH.readMany(ents.map(e => [e.base + 0x264, 4]));
    const okCa = caPa.filter(b => b && b.length >= 4 && b.readUInt16LE(0) >= 1 && b.readUInt16LE(0) <= 200 && b.readUInt16LE(2) >= 1 && b.readUInt16LE(2) <= 200 && b.readUInt16LE(0) <= b.readUInt16LE(2) + 5).length;
    const cp = await CH.readMany(ents.map(e => [e.p + 0xA8, 8]));
    const cons = cp.map(b => (b && b.length >= 8 ? Number(b.readBigUInt64LE(0)) : 0)).filter(c => c > 0x10000);
    const names = await CH.rtti(cons.slice(0, 25));
    const okCon = names.filter(n => /CONTRACT/.test(n || '')).length;
    const vp = await CH.readMany(ents.map(e => [e.p + 0x78, 8]));
    const hd = await CH.readMany(vp.map(b => [b && b.length >= 8 ? Number(b.readBigUInt64LE(0)) : 0, 24]));
    const okRel = hd.filter(b => { if (!b || b.length < 24) return false; const s = Number(b.readBigUInt64LE(0)), e = Number(b.readBigUInt64LE(8)), c = Number(b.readBigUInt64LE(16)); return s > 0x10000 && e >= s && c >= e && (e - s) % 16 === 0 && e - s < 400 * 16; }).length;
    const r = (a, b) => (b ? a / b : 0);
    const checks = [
      { name: 'Identitas pemain (UID)', ok: r(ents.length, pick.length) >= 0.9, v: `${ents.length}/${pick.length}` },
      { name: 'Kemampuan & potensi', ok: r(okCa, ents.length) >= 0.9, v: `${okCa}/${ents.length}` },
      { name: 'Kontrak', ok: r(okCon, Math.min(25, cons.length)) >= 0.8, v: `${okCon}/${Math.min(25, cons.length)}` },
      { name: 'Relasi & registrasi', ok: r(okRel, ents.length) >= 0.8, v: `${okRel}/${ents.length}` },
    ];
    return { pass: checks.every(c => c.ok), checks, at: new Date().toISOString() };
  }
  async status(force) {
    const st = await this.CH.status();
    if (!st.ok) return { app: APP, fmRunning: false, mode: 'tanpa-fm', msg: 'FM27 belum berjalan' };
    // hasil gagal/belum-siap hanya disimpan 20 dtk (mis. FM baru dibuka & save belum dimuat), hasil lolos disimpan selama proses FM sama
    if (!force && this.cache && this.cache.pid === st.pid && (this.cache.mode !== 'terkunci' || Date.now() - this.cache.t < 20000)) return this.cache;
    const fp = await fingerprint().catch(() => null);
    const d = this.db();
    // versi pertama yang diuji bersama Asisten ini dianggap terverifikasi
    if (fp && fp.fp && !d.known.length) { d.known.push({ fp: fp.fp, fm: APP.fm, built: fp.built, how: 'diverifikasi manual', at: new Date().toISOString() }); this.save(d); }
    const known = fp && d.known.find(k => k.fp === fp.fp);
    let test = null, mode, msg;
    try { test = await this.selfTest(); } catch (e) { test = { pass: false, checks: [], error: e.message }; }
    if (st.version && !String(st.version).startsWith('27.')) { mode = 'terkunci'; msg = `Game_plugin versi ${st.version} bukan FM27`; }
    else if (known && test.pass) { mode = 'cocok'; msg = `FM ${APP.fm} (build ${fp.built}) — terverifikasi`; }
    else if (!known && test.pass) {
      mode = 'baru-lolos'; msg = `Update FM terdeteksi (build ${fp ? fp.built : '?'}). Uji struktur lolos — cheat tetap aktif, tetap cadangkan save.`;
      if (fp) { d.known.push({ fp: fp.fp, fm: APP.fm, built: fp.built, how: 'lolos uji otomatis', at: new Date().toISOString() }); this.save(d); }
    } else if (test.error || (test.checks.length && test.checks.every(c => /^0\/0$/.test(String(c.v))))) {
      // 0/0 = tidak ada pemain di memori (save belum/tidak dimuat, mis. FM di menu utama) — bukan tanda FM diupdate
      mode = 'terkunci'; msg = `Menunggu save dimuat di FM — muat save Anda, cheat aktif otomatis setelah pemeriksaan${test.error ? ` (${test.error})` : ''}.`;
    }
    else { mode = 'terkunci'; msg = `FM tampaknya sudah diupdate (build ${fp ? fp.built : '?'}) dan struktur memorinya berubah. Cheat dikunci demi keamanan save — perbarui Asisten.`; }
    this.cache = { t: Date.now(), app: APP, fmRunning: true, pid: st.pid, plugin: st.version, fp, known: !!known, test, mode, msg };
    return this.cache;
  }
  locked() { return this.cache && this.cache.mode === 'terkunci'; }
}
module.exports = { Versi, APP };
