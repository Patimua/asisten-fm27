'use strict';
// Asisten FM27 — server lokal tanpa dependensi (Node 18+).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');
const E = require('./lib/engine');
const GD = require('./lib/guide');
const LT = require('./lib/latihan');
const KT = require('./lib/kantor');
const ID = require('./lib/individu');

const PORT = Number(process.argv[2] || process.env.ASISTEN_PORT || 2728);
const HOME = process.env.USERPROFILE || process.env.HOME || '';
const LOCAL = process.env.LOCALAPPDATA || path.join(HOME, 'AppData', 'Local');
const APPDATA = process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming');
// Data (riwayat cheat, daftar pantau, pengaturan, youth intake) disimpan di folder aplikasi sendiri
// supaya ikut terbawa saat Windows diinstal ulang / folder dipindah.
const DATA_DIR = path.join(__dirname, 'data');
const OLD_DATA = path.join(APPDATA, 'AsistenFM27');
if (!fs.existsSync(DATA_DIR) && fs.existsSync(OLD_DATA)) { try { fs.cpSync(OLD_DATA, DATA_DIR, { recursive: true }); console.log('[data] dipindah dari AppData ke folder aplikasi'); } catch (e) { console.error('[data] gagal menyalin data lama:', e.message); } }
fs.mkdirSync(DATA_DIR, { recursive: true });
// Catatan error ke berkas + server tidak ikut mati bila ada error tak terduga
const LOG_FILE = path.join(DATA_DIR, 'asisten.log');
function logLine(kind, msg) { try { if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 2e6) fs.renameSync(LOG_FILE, LOG_FILE + '.lama'); fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${kind} ${msg}\n`); } catch { } }
process.on('uncaughtException', e => logLine('ERROR', e && e.stack || e));
process.on('unhandledRejection', e => logLine('REJECT', e && e.stack || e));
process.on('exit', c => logLine('EXIT', 'kode ' + c));
logLine('START', `pid ${process.pid} port ${process.argv[2] || 2728}`);
const CFG_FILE = path.join(DATA_DIR, 'pengaturan.json');
// Data per karier (target transfer, daftar pantau, centang latihan, youth intake) di data/karier/<karier>.
// Kunci karier = folder karier Teknik Oda yang sedang aktif (manajer-klub-game); berganti save = berganti folder.
const KARIER_DIR = path.join(DATA_DIR, 'karier');
function careerKey() {
  try { const src = LT.findSrc(LOCAL, myClub()); if (src) return path.basename(src.dir); } catch { }
  const m = DB.meta || {};
  return (String(m.manager || 'umum') + '-' + String(myClub() || '')).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'umum';
}
function cfile(name) {
  const d = path.join(KARIER_DIR, careerKey()); fs.mkdirSync(d, { recursive: true });
  const f = path.join(d, name), old = path.join(DATA_DIR, name);
  if (!fs.existsSync(f) && fs.existsSync(old)) { try { fs.renameSync(old, f); logLine('INFO', 'data ' + name + ' dipindah ke karier ' + path.basename(d)); } catch { } }
  return f;
}
const SHORT_FILE = () => cfile('daftar-pantau.json');
const LT_FILE = () => cfile('latihan.json');
const TF_FILE = () => cfile('target-transfer.json');

const DEFAULTS = {
  dumpPath: path.join(LOCAL, 'TeknikOda', 'okuma', 'dump.json'),
  readerExe: path.join(LOCAL, 'Programs', 'Teknik Oda', 'TeknikOda.exe'),
  genieDir: 'C:\\FM Genie Scout 26g',
  ctPath: '', // tidak dipakai fitur mana pun lagi (dulu: referensi struktur dari cheat table tdg6661)
  cePath: 'C:\\Program Files\\Cheat Engine\\cheatengine-x86_64.exe',
  club: '',
};
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
let cfg = { ...DEFAULTS, ...readJSON(CFG_FILE, {}) };
const saveCfg = () => fs.writeFileSync(CFG_FILE, JSON.stringify(cfg, null, 2));

// ---------------- Data ----------------
let DB = { meta: null, players: [], staff: [], byId: new Map(), staffById: new Map(), mtime: 0, loadedAt: null, error: null, clubs: [] };

function monthsUntil(dateStr, ref) {
  if (!dateStr) return null;
  const d = new Date(dateStr), r = new Date(ref);
  if (isNaN(d) || isNaN(r)) return null;
  return Math.round(((d - r) / (1000 * 60 * 60 * 24 * 30.44)) * 10) / 10;
}

// Pembaca dump.json bertahap: database FM yang sangat besar (ratusan ribu pemain) membuat file >512 MB, melebihi batas
// panjang teks Node ("Cannot create a string longer than 0x1fffffe8"). Setiap pemain/staf diurai satu per satu.
function readDumpStream(f) {
  const { StringDecoder } = require('string_decoder'); const dec = new StringDecoder('utf8');
  const fd = fs.openSync(f, 'r'), B = Buffer.alloc(8 << 20), out = { meta: {}, players: [], staff: [] };
  let s = '', i = 0, depth = 0, inStr = false, esc = false, strStart = -1, lastStr = '', section = null, elStart = -1, objStart = -1;
  try {
    for (;;) {
      const n = fs.readSync(fd, B, 0, B.length, null);
      s += n ? dec.write(B.subarray(0, n)) : dec.end();
      for (; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (inStr) { if (esc) esc = false; else if (c === 92) esc = true; else if (c === 34) { inStr = false; if (depth === 1) lastStr = s.slice(strStart + 1, i); } continue; }
        if (c === 34) { inStr = true; strStart = i; continue; }
        if (c === 123 || c === 91) {
          if (depth === 1) { section = lastStr; if (!Array.isArray(out[section]) || c === 123) objStart = i; }
          else if (depth === 2 && c === 123 && Array.isArray(out[section]) && objStart < 0) elStart = i;
          depth++; continue;
        }
        if (c === 125 || c === 93) {
          depth--;
          if (depth === 2 && elStart >= 0 && c === 125) { out[section].push(JSON.parse(s.slice(elStart, i + 1))); elStart = -1; }
          else if (depth === 1 && objStart >= 0) { out[section] = JSON.parse(s.slice(objStart, i + 1)); objStart = -1; }
        }
      }
      const keep = elStart >= 0 ? elStart : objStart >= 0 ? objStart : inStr ? strStart : i;
      if (keep > 0) { s = s.slice(keep); i -= keep; if (elStart >= 0) elStart -= keep; if (objStart >= 0) objStart -= keep; strStart -= keep; }
      if (!n) break;
    }
  } finally { fs.closeSync(fd); }
  return out;
}

function loadDump() {
  const f = cfg.dumpPath;
  try {
    const st = fs.statSync(f);
    if (st.mtimeMs === DB.mtime && DB.players.length) return;
    const t0 = Date.now();
    const raw = st.size > 200e6 ? readDumpStream(f) : JSON.parse(fs.readFileSync(f, 'utf8')); // file raksasa (database besar) dibaca bertahap
    const meta = raw.meta || {};
    const ref = meta.gameDate || new Date().toISOString().slice(0, 10);
    const players = (raw.players || []).map(p => {
      // Pemain buatan FM saat karier dimulai (dbi -1): namanya tidak terbaca Teknik Oda → beri label yang jelas
      if (!p.name || !/[A-Za-zÀ-ž]/.test(p.name)) { p._noName = true; p.name = 'Regen tanpa nama #' + String(p.id).slice(-4); }
      const bp = E.bestPosition(p);
      const pers = E.personality(p);
      return Object.assign(p, {
        _bp: bp.pos, _bpr: bp.rating, _pers: pers.label, _persTone: pers.tone,
        _exp: monthsUntil(p.expires, ref), _gap: (p.pa || 0) - (p.ca || 0),
        _search: (p.name + ' ' + (p.club || '') + ' ' + (p.nat || []).join(' ')).toLowerCase(),
      });
    });
    const staff = (raw.staff || []).filter(s => s.name && s.name.trim() && !s.name.startsWith('(')).map(s => {
      const b = E.staffBest(s);
      return Object.assign(s, { _jobLabel: E.JOB_LABEL[s.job] || s.job || 'Staf', _best: b, _search: (s.name + ' ' + (s.club || '')).toLowerCase() });
    });
    const clubCount = {};
    players.forEach(p => { if (p.club) clubCount[p.club] = (clubCount[p.club] || 0) + 1; });
    DB = {
      meta, players, staff, mtime: st.mtimeMs, loadedAt: new Date().toISOString(), error: null,
      byId: new Map(players.map(p => [p.id, p])), staffById: new Map(staff.map(s => [s.id, s])),
      clubs: Object.entries(clubCount).filter(([, n]) => n >= 11).map(([c]) => c).sort(),
    };
    console.log(`[data] ${players.length} pemain, ${staff.length} staf dimuat (${Date.now() - t0} ms)`);
  } catch (e) {
    DB.error = e.code === 'ENOENT' ? 'File dump belum ada. Jalankan pembaca data (Teknik Oda) saat save FM terbuka.' : String(e.message || e);
    console.log('[data] gagal:', DB.error);
  }
}
loadDump();
setInterval(loadDump, 15000);

const myClub = () => cfg.club || (DB.meta && DB.meta.myClub) || '';
// Pencocokan nama hasil OCR (kolom.exe) → pemain: tanpa aksen/huruf kecil, toleran 1–2 salah huruf; klub saya diutamakan
let KOLOM = { key: null, map: new Map(), byLast: new Map() };
const kNorm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function kDist(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { const cur = [i]; let lo = i; for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); lo = Math.min(lo, cur[j]); } if (lo > max) return max + 1; prev = cur; }
  return prev[b.length];
}
function kolomMatch(raw) {
  if (KOLOM.key !== DB.mtime) {
    const map = new Map(), byLast = new Map();
    for (const p of DB.players) { if (!p.name || p.noName) continue; const k = kNorm(p.name); (map.get(k) || map.set(k, []).get(k)).push(p); const l = k.split(' ').pop(); (byLast.get(l) || byLast.set(l, []).get(l)).push(p); }
    KOLOM = { key: DB.mtime, map, byLast, cache: new Map() };
  }
  const n = kNorm(raw.replace(/^\W+/, '').replace(/^[A-Za-z]\s+(?=[A-Z])/, '')); if (n.length < 3) return null;
  if (KOLOM.cache.has(n)) return KOLOM.cache.get(n);
  const me = myClub(); const best = l => l && l.length ? (l.find(p => p.club === me) || l.slice().sort((a, b) => b.ca - a.ca)[0]) : null;
  let r = best(KOLOM.map.get(n));
  const ab = !r && raw.match(/^\s*\W*([A-Za-zÀ-ÿ])\.\s*(.+)$/); // nama singkat FM: "N. Noll", "K. Sildillia"
  if (ab) {
    const ini = kNorm(ab[1]), rest = kNorm(ab[2]), last = rest.split(' ').pop();
    const pool = [...(KOLOM.byLast.get(last) || []), ...DB.players.filter(p => p.club === me)];
    const hit = pool.filter(p => { const k = kNorm(p.name); return k.startsWith(ini) && (k.endsWith(' ' + rest) || kDist(k.slice(k.length - rest.length), rest, 1) <= 1 && k.endsWith(last.slice(-3))); });
    r = best(hit);
  }
  if (!r) { // salah baca OCR: cari nama dengan jarak edit kecil, mulai dari pemain bernama belakang sama, lalu klub saya
    const max = n.length > 12 ? 2 : 1; let cand = [];
    const pool = [...(KOLOM.byLast.get(n.split(' ').pop()) || []), ...DB.players.filter(p => p.club === me)];
    for (const p of pool) { const d = kDist(n, kNorm(p.name), max); if (d <= max) cand.push([d, p]); }
    if (!cand.length && n.split(' ').length > 1) { const first = n.split(' ')[0]; for (const [k, l] of KOLOM.map) if (k.startsWith(first + ' ')) { const d = kDist(n, k, max); if (d <= max) for (const p of l) cand.push([d, p]); } }
    cand.sort((a, b) => a[0] - b[0] || (b[1].club === me) - (a[1].club === me)); r = cand.length ? cand[0][1] : null;
  }
  const out = r ? { ca: r.ca, pa: r.pa } : null; KOLOM.cache.set(n, out); return out;
}

// ---------------- Status pembaca Teknik Oda + youth intake ----------------
const { youthInfo } = require('./lib/youthdates');
function odaStatus() { try { return JSON.parse(fs.readFileSync(path.join(path.dirname(cfg.dumpPath), 'status.json'), 'utf8')); } catch { return null; } }
const NAT_CACHE = new Map();
function nationOfDiv(div) { // negara liga = kewarganegaraan terbanyak pemain di liga itu
  if (!div) return null; if (NAT_CACHE.has(div + DB.loadedAt)) return NAT_CACHE.get(div + DB.loadedAt);
  const c = {}; for (const p of DB.players) if (p.div === div && p.nat && p.nat[0]) c[p.nat[0]] = (c[p.nat[0]] || 0) + 1;
  const n = Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || null; NAT_CACHE.set(div + DB.loadedAt, n); return n;
}
// Klub → {div utama tim senior, negara liga} (sekali per muat dump)
let CN_CACHE = null;
function clubNations() {
  if (CN_CACHE && CN_CACHE.at === DB.loadedAt) return CN_CACHE.m;
  const divNat = {}, cnt = {}, cd = {};
  for (const p of DB.players) {
    if (p.div && p.nat && p.nat[0]) { const c = cnt[p.div] || (cnt[p.div] = {}); c[p.nat[0]] = (c[p.nat[0]] || 0) + 1; }
    if (p.club && p.div && !p.teamType) { const c = cd[p.club] || (cd[p.club] = {}); c[p.div] = (c[p.div] || 0) + 1; }
  }
  for (const d in cnt) divNat[d] = Object.entries(cnt[d]).sort((a, b) => b[1] - a[1])[0][0];
  const m = new Map(); for (const club in cd) { const div = Object.entries(cd[club]).sort((a, b) => b[1] - a[1])[0][0]; m.set(club, { div, nat: divNat[div] || null }); }
  CN_CACHE = { at: DB.loadedAt, m }; return m;
}
function myYouth() {
  const club = myClub(); if (!club || !DB.meta) return null;
  const counts = {}; for (const p of DB.players) if (p.club === club && p.div) counts[p.div] = (counts[p.div] || 0) + 1;
  const div = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const nat = nationOfDiv(div); const y = youthInfo(nat, DB.meta.gameDate);
  return y ? { ...y, club, div, manager: DB.meta.manager } : (nat ? { nation: nat, club, div, unknown: true } : null);
}
// Notifikasi Windows (balon) — muncul di atas FM bila FM berjalan dalam mode jendela/borderless.
function winToast(title, text) {
  const x = s => String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
  const ps = `[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime]|Out-Null;[Windows.Data.Xml.Dom.XmlDocument,Windows.Data.Xml.Dom.XmlDocument,ContentType=WindowsRuntime]|Out-Null;$d=New-Object Windows.Data.Xml.Dom.XmlDocument;$d.LoadXml('<toast scenario="reminder"><visual><binding template="ToastGeneric"><text>${x(title)}</text><text>${x(text)}</text></binding></visual><actions><action content="Tutup" arguments="x" activationType="system"/></actions></toast>');[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show([Windows.UI.Notifications.ToastNotification]::new($d))`;
  require('child_process').execFile('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', ps], { windowsHide: true }, e => e && logLine('WARN', 'toast: ' + e.message));
}
// Balon di dalam jendela FM (pojok kanan bawah); cadangan: toast Windows.
function notify(title, text) {
  const exe = path.join(__dirname, 'native', 'balon.exe');
  if (fs.existsSync(exe)) { try { require('child_process').spawn(exe, [title, text, '15', 'http://localhost:' + PORT], { detached: true, stdio: 'ignore', windowsHide: false }).unref(); return; } catch (e) { logLine('WARN', 'balon: ' + e.message); } }
  winToast(title, text);
}
const NOTIF_FILE = path.join(DATA_DIR, 'notif.json');
let NOTIF_LAST = null;
function youthNotifyTick() {
  const y = myYouth(); if (!y || y.unknown) return;
  const marks = [30, 14, 7, 1, 0]; const d = y.daysToStart;
  const m = y.phase === 'berlangsung' ? 0 : marks.find(k => k > 0 && d <= k && d > (marks[marks.indexOf(k) + 1] ?? -1));
  if (m === undefined) return;
  const seen = readJSON(NOTIF_FILE, {}); const key = [y.manager, y.club, y.start, m].join('|'); if (seen[key]) return;
  const ys = CH.youthCfg ? CH.youthCfg() : {}; const set = ys && ys.active ? `Booster aktif: PA ${ys.min}–${ys.max}.` : 'Booster youth intake BELUM diatur — buka Asisten → Pusat Cheat → Youth Intake.';
  const title = m === 0 ? `⚽ Youth intake ${y.nation} sedang berlangsung` : `⚽ Youth intake ${y.nation} ${m === 1 ? 'besok' : 'dalam ' + d + ' hari'}`;
  const text = `${y.club}: ${y.start.split('-').reverse().join('/')} – ${y.end.split('-').reverse().join('/')}. ${set}`;
  seen[key] = new Date().toISOString(); fs.writeFileSync(NOTIF_FILE, JSON.stringify(seen, null, 1));
  NOTIF_LAST = { at: Date.now(), title, text, key }; notify(title, text); logLine('INFO', 'notif: ' + title);
}
// Badge CA/PA di atas profil pemain FM (native/capa.exe; satu instance, keluar sendiri bila server mati).
// Badge CA/PA (capa.exe, satu salinan): salinan lama dihentikan dulu supaya yang berjalan selalu baru (salinan lama bisa
// macet setelah FM ditutup-buka berkali-kali). Salinan baru juga dijalankan ulang otomatis bila keluar.
function startCapa() {
  for (const nm of ['capa', 'kolom']) { // capa = badge di profil; kolom = angka CA/PA di tabel pemain FM
    const exe = path.join(__dirname, 'native', nm + '.exe'); if (!fs.existsSync(exe)) continue;
    try { require('child_process').execFileSync('taskkill', ['/F', '/IM', nm + '.exe'], { stdio: 'ignore', windowsHide: true }); } catch { }
    setTimeout(() => { try { require('child_process').spawn(exe, ['http://localhost:' + PORT].concat(fs.existsSync(path.join(DATA_DIR, 'capa-debug')) ? ['debug'] : []), { detached: true, stdio: 'ignore' }).unref(); } catch (e) { logLine('WARN', nm + ': ' + e.message); } }, 800);
  }
}
if (PORT === 2728) setTimeout(startCapa, 3000);
// Bawa jendela FM ke depan (setelah "Buka di FM") supaya tidak perlu pindah manual
function focusFM(delay) { const exe = path.join(__dirname, 'native', 'fokus.exe'); if (!fs.existsSync(exe)) return; try { require('child_process').spawn(exe, [String(delay || 0)], { detached: true, stdio: 'ignore' }).unref(); } catch (e) { logLine('WARN', 'fokus: ' + e.message); } }
setInterval(() => { try { youthNotifyTick(); } catch (e) { logLine('WARN', 'notif: ' + e.message); } }, 60000);
setTimeout(() => { try { youthNotifyTick(); } catch { } }, 8000);

// ---------------- Helpers ----------------
function lite(p) {
  return {
    id: p.id, name: p.name, noName: !!p._noName, age: p.age, nat: (p.nat || [])[0] || '', club: p.club || 'Tanpa Klub', div: p.div || '',
    ca: p.ca, pa: p.pa, pos: p.pos, bp: p._bp, bpLabel: E.POSITIONS[p._bp].label, rating: p._bpr,
    value: p.value, wage: p.wage, expires: p.expires, exp: p._exp, pers: p._pers, persTone: p._persTone,
    listed: p.listed, loanListed: p.loanListed, foot: p.foot, height: p.height, teamType: p.teamType,
    clubId: DB.meta && DB.meta.clubIds ? DB.meta.clubIds[p.club] : null,
    inj: (p.attrs || {}).InjuryProneness, cons: (p.attrs || {}).Consistency,
    ...(p.club !== myClub() ? (() => { const j = joinEst(p, true); return { join: j.score, joinWhy: j.why.join(' · ') }; })() : {}),
  };
}

// ---- Perkiraan "mau bergabung ke klub saya" (0–100) ----
// FM tidak menyimpan keputusan ini sebagai angka; ini perkiraan dari faktor yang dipakai FM: reputasi klub asal vs
// klub saya, reputasi pemain, ambisi, loyalitas, sisa kontrak, status dijual/dilepas & usia.
let JOIN_REP = { key: '', rep: 0 }, CLUB_REP = { key: '', map: {} };
// Reputasi klub = clubRep tim utama (tim B / junior punya angka sendiri yang lebih kecil)
function clubReps() {
  if (CLUB_REP.key === DB.mtime) return CLUB_REP.map;
  const sen = {}, other = {};
  for (const p of DB.players) {
    if (!p.club || !(p.clubRep > 0)) continue;
    const t = p.teamType ? other : sen; t[p.club] = Math.max(t[p.club] || 0, p.clubRep);
  }
  CLUB_REP = { key: DB.mtime, map: { ...other, ...sen } };
  return CLUB_REP.map;
}
function myRep() {
  const club = myClub(), key = club + '|' + DB.mtime;
  if (JOIN_REP.key === key) return JOIN_REP.rep;
  let rep = !cfg.club && DB.meta && DB.meta.myClubRep ? DB.meta.myClubRep : 0;
  if (!rep) { const r = DB.players.filter(p => p.club === club && p.clubRep > 0).map(p => p.clubRep); rep = r.length ? r.reduce((t, x) => t + x, 0) / r.length : 5000; }
  JOIN_REP = { key, rep };
  return rep;
}
function joinEst(p, withWhy) {
  const mr = myRep() / 100, why = [];
  const free = !p.club || p.club === 'Tanpa Klub';
  const amb = p.ambition || 10, af = 0.55 + amb * 0.05; // ambisi 1 → 0.6×, 20 → 1.55×
  let s = 55;
  const cr = free ? 0 : (p.clubRep || 0) / 100;
  if (!free && cr > mr) { const d = (cr - mr) * 1.1 * af; s -= d; if (withWhy && d >= 5) why.push(`klubnya lebih besar (reputasi ${Math.round(cr)} vs ${Math.round(mr)})`); }
  if (!free && cr < mr) { const b = Math.min(15, (mr - cr) * 0.4); s += b; if (withWhy && b >= 5) why.push('naik kelas ke klub Anda'); }
  const pr = p.worldRep > 0 && p.worldRep <= 10000 ? p.worldRep / 100 : null;
  if (pr != null && pr > mr + 10) { const d = (pr - mr - 10) * 1.0 * af; s -= d; if (withWhy && d >= 5) why.push('reputasinya lebih tinggi dari klub Anda'); }
  if (amb >= 16 && withWhy && cr > mr) why.push(`ambisi tinggi (${amb})`);
  if (free) { s += 15; if (withWhy) why.push('tanpa klub'); }
  else if (p._exp != null && p._exp <= 6) { s += 10; if (withWhy) why.push('kontrak hampir habis'); }
  else if (p._exp != null && p._exp <= 12) s += 5;
  if (p.setForRelease) { s += 15; if (withWhy) why.push('akan dilepas klubnya'); }
  else if (p.listed) { s += 12; if (withWhy) why.push('masuk daftar jual'); }
  else if (p.loanListed) { s += 4; if (withWhy) why.push('bisa dipinjam'); }
  if (!free && !p.listed && (p.loyalty || 0) >= 16 && (p._exp == null || p._exp > 12)) { s -= 8; if (withWhy) why.push(`setia pada klubnya (loyalitas ${p.loyalty})`); }
  if (p.age >= 32) { s += 8; if (withWhy) why.push('usia senior, lebih terbuka'); } else if (p.age >= 30) s += 4;
  const score = Math.max(0, Math.min(100, Math.round(s)));
  return withWhy ? { score, why } : score;
}

function presetFilter(preset) {
  switch (preset) {
    case 'mau': return p => p.club !== myClub() && joinEst(p) >= 65;
    case 'wonderkid': return p => p.age <= 21 && p.pa >= 150;
    case 'permata': return p => p.age <= 23 && p._gap >= 30 && p.pa >= 125 && (p.value || 0) <= 3e6;
    case 'murah': return p => p.ca >= 120 && p.value > 0 && p.value <= 1.5e6;
    case 'gratis': return p => !p.club || (p._exp !== null && p._exp <= 6);
    case 'siap': return p => p.age >= 23 && p.age <= 30 && p.ca >= 145;
    case 'dijual': return p => p.listed || p.loanListed;
    case 'mental': return p => (p.attrs || {}).Determination >= 16 && p.professionalism >= 15 && p.ambition >= 14;
    case 'kaca': return p => (p.attrs || {}).InjuryProneness >= 15;
    default: return null;
  }
}

function search(q) {
  const f = [];
  if (q.q) { const s = q.q.toLowerCase(); f.push(p => p._search.includes(s)); }
  if (q.pos) { const g = q.pos; f.push(p => q.natural === '0' ? p._bp === g : E.familiarity(p, g) === 1); }
  const num = k => (q[k] !== undefined && q[k] !== '' ? Number(q[k]) : null);
  const minAge = num('minAge'), maxAge = num('maxAge'), minCa = num('minCa'), minPa = num('minPa'), maxValue = num('maxValue'), maxWage = num('maxWage'), minRating = num('minRating');
  if (minAge !== null) f.push(p => p.age >= minAge);
  if (maxAge !== null) f.push(p => p.age <= maxAge);
  if (minCa !== null) f.push(p => p.ca >= minCa);
  if (minPa !== null) f.push(p => p.pa >= minPa);
  if (maxValue !== null) f.push(p => (p.value || 0) <= maxValue);
  if (maxWage !== null) f.push(p => (p.wage || 0) <= maxWage);
  if (minRating !== null) f.push(p => p._bpr >= minRating);
  const minJoin = num('minJoin'); if (minJoin !== null) f.push(p => joinEst(p) >= minJoin);
  if (q.nat) { const n = q.nat.toLowerCase(); f.push(p => (p.nat || []).some(x => x.toLowerCase().includes(n))); }
  if (q.div) { const d = q.div.toLowerCase(); f.push(p => (p.div || '').toLowerCase().includes(d)); }
  if (q.club) f.push(p => p.club === q.club);
  if (q.excludeMine === '1') { const m = myClub(); f.push(p => p.club !== m); }
  if (q.foot) f.push(p => p.foot === q.foot);
  const pf = presetFilter(q.preset); if (pf) f.push(pf);
  if (q.attrMin) {
    const mins = q.attrMin.split(',').map(s => s.split(':')).filter(x => x.length === 2).map(([k, v]) => [k, Number(v)]);
    const PERS = ['ambition', 'professionalism', 'loyalty', 'pressure', 'sportsmanship', 'temperament', 'adaptability'];
    f.push(p => mins.every(([k, v]) => (PERS.includes(k) ? p[k] : (p.attrs || {})[k] || 0) >= v));
  }
  let rows = DB.players.filter(p => f.every(fn => fn(p)));
  const sort = q.sort || (q.preset === 'murah' ? 'valueRatio' : q.preset === 'permata' || q.preset === 'wonderkid' ? 'pa' : 'rating');
  if (sort === 'join') { const jc = new Map(); rows.forEach(p => jc.set(p, joinEst(p))); const d0 = q.dir === 'asc' ? 1 : -1; rows.sort((a, b) => (jc.get(a) - jc.get(b)) * d0 || b._bpr - a._bpr); }
  const dir = q.dir === 'asc' ? 1 : -1;
  const key = {
    rating: p => p._bpr, ca: p => p.ca, pa: p => p.pa, age: p => p.age, value: p => p.value || 0, wage: p => p.wage || 0,
    gap: p => p._gap, name: p => p.name, exp: p => (p._exp === null ? 999 : p._exp), valueRatio: p => p.ca / Math.max(1, Math.log10((p.value || 1) + 10)),
  }[sort] || (sort && sort.startsWith('a.') ? (p => (p.attrs || {})[sort.slice(2)] || 0) : ['ambition', 'professionalism', 'loyalty', 'pressure', 'sportsmanship', 'temperament', 'adaptability', 'controversy', 'height', 'askingPrice', 'worldRep', 'clubRep'].includes(sort) ? (p => p[sort] || 0) : sort === 'club' ? (p => p.club || '') : sort === 'nat' ? (p => (p.nat || [])[0] || '') : (p => p._bpr));
  if (sort !== 'join') rows.sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * dir; });
  const total = rows.length, offset = Number(q.offset || 0), limit = Math.min(q.full === '1' ? 5000 : 500, Number(q.limit || 100));
  const PK = ['ambition', 'professionalism', 'loyalty', 'pressure', 'sportsmanship', 'temperament', 'adaptability', 'controversy'];
  const mapR = q.full === '1' ? (p => ({ ...lite(p), attrs: p.attrs || {}, persn: Object.fromEntries(PK.map(k => [k, p[k]])), askingPrice: p.askingPrice, worldRep: p.worldRep, nats: p.nat || [] })) : lite;
  return { total, rows: rows.slice(offset, offset + limit).map(mapR) };
}

function similar(p, n = 8) {
  const keys = Object.keys(p.attrs || {}).filter(k => !E.GROUPS.hidden.includes(k) && !(p._bp !== 'GK' && E.GROUPS.goalkeeping.includes(k)));
  const vec = x => keys.map(k => (x.attrs || {})[k] || 0);
  const a = vec(p), na = Math.hypot(...a);
  return DB.players.filter(x => x.id !== p.id && x._bp === p._bp).map(x => {
    const b = vec(x); let dot = 0; for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return { x, sim: dot / (na * Math.hypot(...b) || 1) };
  }).sort((u, w) => w.sim - u.sim).slice(0, n).map(({ x, sim }) => ({ ...lite(x), sim: Math.round(sim * 1000) / 10 }));
}

function playerDetail(id) {
  const p = DB.byId.get(Number(id));
  if (!p) return null;
  const pos = E.positionRatings(p);
  const groups = {};
  for (const [g, list] of Object.entries(E.GROUPS)) groups[g] = list.filter(k => p.attrs && k in p.attrs).map(k => ({ k, label: E.ATTR_LABEL[k] || k, v: p.attrs[k] }));
  const hiddenPers = [['ambition', 'Ambisi'], ['professionalism', 'Profesionalisme'], ['loyalty', 'Loyalitas'], ['pressure', 'Tahan Tekanan'], ['sportsmanship', 'Sportivitas'], ['temperament', 'Temperamen'], ['controversy', 'Kontroversi'], ['adaptability', 'Adaptasi']]
    .map(([k, label]) => ({ k, label, v: p[k] }));
  const advice = [];
  const a = p.attrs || {};
  if (p.age <= 21 && p._gap >= 25) advice.push('Potensi besar: beri menit bermain rutin (atau pinjamkan ke liga level sedang) dan pasangkan dengan mentor berpengaruh.');
  if (p.professionalism <= 8) advice.push('Profesionalisme rendah — perkembangan bisa lambat. Coba mentoring dengan senior berkepribadian kuat.');
  if (a.InjuryProneness >= 14) advice.push('Rawan cedera tinggi — kurangi intensitas latihan dan rotasi lebih sering.');
  if (a.Consistency <= 8) advice.push('Konsistensi rendah — performa naik-turun; kurang cocok jadi pemain inti di laga besar.');
  if (a.ImportantMatches >= 15) advice.push('Bersinar di laga penting — andalkan di final/derby.');
  if (p._exp !== null && p._exp <= 6 && p.club) advice.push(`Kontrak habis dalam ±${Math.max(0, p._exp)} bulan — peluang pre-contract / transfer murah.`);
  if (p.listed) advice.push('Pemain masuk daftar transfer — klub kemungkinan mau menerima tawaran di bawah nilai pasar.');
  if (a.Versatility >= 15) advice.push('Sangat fleksibel — cepat belajar posisi baru.');
  return {
    ...lite(p), dob: p.dob, posArr: p.posArr, attrs: groups, personality: hiddenPers, roles: E.allRoles(p).slice(0, 12),
    positions: Object.entries(pos).map(([k, r]) => ({ k, label: E.POSITIONS[k].label, r, fam: E.familiarity(p, k) })).sort((x, y) => y.r - x.r),
    raw: p.attrs || {}, assess: GD.assess(p, p._bp, E.ATTR_LABEL),
    roleKeys: Object.fromEntries(E.ROLES.map(r => [r.id, { key: r.key, imp: r.imp, name: r.name, pos: r.pos }])),
    similar: null, advice, askingPrice: p.askingPrice, worldRep: p.worldRep, clubRep: p.clubRep, notForSale: p.notForSale,
  };
}

// ---- Board selalu setuju: patch 2 byte di kode keputusan board FM27 (js → nop). Disimpan di data/cheat/board.json,
// dipasang ulang otomatis bila FM dibuka ulang. Mati = byte asli (78 78) dikembalikan.
const BP = { exe: path.join(__dirname, 'native', 'fmmem.exe'), file: path.join(__dirname, 'data', 'cheat', 'board.json'), OFF: '01C17878C6466704', ON: '01C19090C6466704' };
const bpRun = args => new Promise(r => execFile(BP.exe, args, { windowsHide: true, timeout: 60000 }, (e, out) => r(e ? 'err ' + e.message : String(out).trim())));
// Dimatikan 2026-11-21: pola kode ini ada di game_plugin.dll (offset ~0x1D95C0D) tetapi tidak pernah dijalankan saat
// board menolak permintaan, jadi patch-nya tidak berefek. Dikunci sampai kode keputusan yang benar ditemukan.
// Hanya mematikan (mengembalikan 7878) yang masih diizinkan.
const BP_DISABLED = 'Fitur ini belum berfungsi: kode keputusan board di FM 27.1 belum ditemukan, jadi tombolnya dikunci sampai Asisten diperbarui.';
const bpWant = () => { try { return !!JSON.parse(fs.readFileSync(BP.file, 'utf8')).on; } catch { return false; } };
async function boardState() {
  const on = (await bpRun(['aob', BP.ON, '2'])).match(/0x[0-9a-f]+/g) || [];
  const off = on.length ? [] : ((await bpRun(['aob', BP.OFF, '2'])).match(/0x[0-9a-f]+/g) || []);
  return { want: false, active: on.length > 0, found: on.length + off.length === 1, on, off, disabled: BP_DISABLED };
}
async function boardSet(want) {
  fs.mkdirSync(path.dirname(BP.file), { recursive: true });
  if (!(want && BP_DISABLED)) fs.writeFileSync(BP.file, JSON.stringify({ on: !!want, at: Date.now() }));
  const st = await boardState();
  if (!st.found) return { ...st, error: st.on.length + st.off.length > 1 ? 'Pola kode board ditemukan lebih dari sekali; dibatalkan demi aman.' : 'Kode keputusan board tidak ditemukan (FM belum terbuka / versi lain).' };
  if (want && BP_DISABLED) return { ...st, error: BP_DISABLED };
  if (want && !st.active) { const ad = '0x' + (BigInt(st.off[0]) + 2n).toString(16); const r = await bpRun(['wcode', ad, '9090']); logLine('INFO', 'board patch ON ' + ad + ' ' + r); }
  if (!want && st.active) { const ad = '0x' + (BigInt(st.on[0]) + 2n).toString(16); const r = await bpRun(['wcode', ad, '7878']); logLine('INFO', 'board patch OFF ' + ad + ' ' + r); }
  return boardState();
}
// Plugin Jembatan (BepInEx): pasang / perbarui otomatis ke folder FM. Saat FM terbuka file-nya terkunci,
// jadi penyalinan dicoba ulang tiap 20 dtk dan berhasil begitu FM ditutup.
const FMDIR_FILE = path.join(DATA_DIR, 'fm-dir.json');
let FM_DIR = readJSON(FMDIR_FILE, {}).dir || null;
setInterval(() => {
  try {
    const exe = VS && VS.cache && VS.cache.fp && VS.cache.fp.exe;
    if (exe) { const d = path.dirname(exe); if (d !== FM_DIR) { FM_DIR = d; fs.writeFileSync(FMDIR_FILE, JSON.stringify({ dir: d })); } }
    if (!FM_DIR || !fs.existsSync(path.join(FM_DIR, 'BepInEx'))) return;
    const src = path.join(__dirname, 'native', 'jembatan', 'Asisten.Jembatan.dll'); if (!fs.existsSync(src)) return;
    const dstDir = path.join(FM_DIR, 'BepInEx', 'plugins', 'AsistenFM27'), dst = path.join(dstDir, 'Asisten.Jembatan.dll');
    // Logika: dimuat ulang FM dari bytes (tidak terkunci) → salin kapan saja
    try { const ls = path.join(__dirname, 'native', 'jembatan', 'Asisten.Jembatan.Logika.dll'), ld = path.join(JB_DIR, 'Asisten.Jembatan.Logika.dll'); if (fs.existsSync(ls) && !(fs.existsSync(ld) && fs.readFileSync(ld).equals(fs.readFileSync(ls)))) { fs.mkdirSync(JB_DIR, { recursive: true }); fs.copyFileSync(ls, ld); logLine('INFO', 'logika Jembatan diperbarui'); } } catch { }
    if (fs.existsSync(dst) && fs.readFileSync(dst).equals(fs.readFileSync(src))) return;
    fs.mkdirSync(dstDir, { recursive: true }); fs.copyFileSync(src, dst); logLine('INFO', 'plugin Jembatan dipasang/diperbarui di ' + dstDir);
  } catch { /* terkunci (FM terbuka) — coba lagi nanti */ }
}, 5000);
const JB_DIR = path.join(LOCAL, 'AsistenFM27', 'jembatan');
// Kirim perintah ke logika Jembatan di dalam FM lalu tunggu hasilnya (maks ±6 dtk)
async function jembatan(lines) {
  const hf = path.join(JB_DIR, 'hasil.txt'); const before = fs.existsSync(hf) ? fs.statSync(hf).size : 0;
  fs.mkdirSync(JB_DIR, { recursive: true }); fs.writeFileSync(path.join(JB_DIR, 'perintah.txt'), lines.join('\n'));
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    if (!fs.existsSync(path.join(JB_DIR, 'perintah.txt')) && fs.existsSync(hf) && fs.statSync(hf).size > before) {
      await new Promise(r => setTimeout(r, 150));
      return { ok: true, hasil: fs.readFileSync(hf).subarray(before).toString('utf8').trim() }; // potong per BYTE (berkas berisi karakter non-ASCII)
    }
  }
  return { ok: false, error: 'FM tidak menjawab — pastikan FM terbuka dengan save dimuat dan plugin Jembatan v0.2 aktif (tutup-buka FM sekali).' };
}
function jembatanStatus() { try { return fs.readFileSync(path.join(JB_DIR, 'status.txt'), 'utf8'); } catch { return null; } }
// Mode Comeback hanya untuk satu laga: otomatis dikembalikan begitu tanggal game berganti (laga selesai)
setInterval(async () => {
  try {
    const F = path.join(__dirname, 'data', 'cheat', 'comeback.json');
    const st = readJSON(F, { undo: [] }); if (!(st.undo || []).length || !st.gameDate) return;
    const now = DB.meta && DB.meta.gameDate; if (!now || now <= st.gameDate) return;
    let ok = 0; for (const id of [...st.undo].reverse()) { try { const u = await CH.undo(id); ok += u.ok || 0; } catch (e) { logLine('WARN', 'comeback auto-undo ' + e.message); } }
    fs.writeFileSync(F, JSON.stringify({ undo: [] }));
    logLine('INFO', `comeback dikembalikan otomatis (tanggal ${st.gameDate} → ${now}): ${ok} penulisan`);
    notify && notify('Mode Comeback selesai', 'Laga sudah lewat — kemampuan pemain & lawan dikembalikan ke semula.');
  } catch { }
}, 30000);
let bpBusy = false;
if (!BP_DISABLED) setInterval(async () => { if (bpBusy || !bpWant()) return; bpBusy = true; try { const st = await boardState(); if (st.found && !st.active) await boardSet(true); } catch { } bpBusy = false; }, 30000);

function dashboard() {
  const club = myClub();
  const squad = DB.players.filter(p => p.club === club);
  const first = squad.filter(p => !p.teamType || p.teamType === 0);
  const avg = (arr, f) => (arr.length ? Math.round(arr.reduce((t, x) => t + f(x), 0) / arr.length) : 0);
  const alerts = [];
  squad.filter(p => p._exp !== null && p._exp <= 6).forEach(p => alerts.push({ type: 'kontrak', tone: 'warn', id: p.id, text: `${p.name} — kontrak habis ${p.expires}` }));
  squad.filter(p => p.age <= 21 && p.pa >= 140).forEach(p => alerts.push({ type: 'bakat', tone: 'good', id: p.id, text: `${p.name} (${p.age}) — potensi ${p.pa}, pastikan dapat menit bermain` }));
  squad.filter(p => (p.attrs || {}).InjuryProneness >= 15).forEach(p => alerts.push({ type: 'cedera', tone: 'bad', id: p.id, text: `${p.name} — sangat rawan cedera (${p.attrs.InjuryProneness})` }));
  squad.filter(p => p.age >= 32 && p.ca < avg(first, x => x.ca) - 10).forEach(p => alerts.push({ type: 'tua', tone: 'warn', id: p.id, text: `${p.name} (${p.age}) — performa menurun, pertimbangkan dijual` }));
  // Kebutuhan posisi: posisi dengan rating terbaik terendah
  const need = Object.keys(E.POSITIONS).map(k => {
    const best = squad.filter(p => E.familiarity(p, k) === 1).sort((a, b) => b._bpr - a._bpr);
    const top = best.slice(0, k === 'GK' || k === 'ST' || k === 'AMC' || k === 'DM' ? 2 : 2);
    return { k, label: E.POSITIONS[k].label, depth: best.length, top: top.length ? Math.round(top.reduce((t, p) => t + E.positionRatings(p)[k], 0) / top.length) : 0 };
  }).sort((a, b) => a.top - b.top);
  const div = (first.find(p => p.div) || {}).div || '';
  const league = DB.players.filter(p => p.div === div && p.club);
  const clubAvg = {};
  league.forEach(p => { (clubAvg[p.club] = clubAvg[p.club] || []).push(p.ca); });
  const ranking = Object.entries(clubAvg).map(([c, arr]) => ({ club: c, ca: Math.round(arr.sort((a, b) => b - a).slice(0, 16).reduce((t, x) => t + x, 0) / Math.min(16, arr.length)) }))
    .sort((a, b) => b.ca - a.ca);
  const rank = ranking.findIndex(r => r.club === club) + 1;
  return {
    meta: DB.meta && { gameDate: DB.meta.gameDate, manager: DB.meta.manager, club, game: DB.meta.game, gameVersion: DB.meta.gameVersion, currency: DB.meta.currency, clubId: DB.meta.clubIds && DB.meta.clubIds[club] },
    div, squadSize: squad.length, avgCa: avg(first, p => p.ca), avgPa: avg(first, p => p.pa), avgAge: avg(first, p => p.age),
    wageBill: squad.reduce((t, p) => t + (p.wage || 0), 0), squadValue: squad.reduce((t, p) => t + Math.max(0, p.value || 0), 0),
    stars: [...squad].sort((a, b) => b.ca - a.ca).slice(0, 5).map(lite), prospects: squad.filter(p => p.age <= 21).sort((a, b) => b.pa - a.pa).slice(0, 5).map(lite),
    alerts: alerts.slice(0, 14), need: need.slice(0, 4), leagueRank: rank, leagueSize: ranking.length, ranking: ranking.slice(0, 24),
  };
}

// ---------------- Cheat table ----------------
let CT_CACHE = null;
function parseCT() {
  if (CT_CACHE && CT_CACHE.path === cfg.ctPath) return CT_CACHE;
  try {
    const s = fs.readFileSync(cfg.ctPath, 'utf8');
    const root = { name: 'root', children: [] }; const stack = [root]; let cur = null;
    const re = /<CheatEntry>|<\/CheatEntry>|<Description>"([^"]*)"<\/Description>/g; let m;
    const dec = t => t.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
    while ((m = re.exec(s))) {
      if (m[0] === '<CheatEntry>') { cur = { name: '', children: [] }; stack[stack.length - 1].children.push(cur); stack.push(cur); }
      else if (m[0] === '</CheatEntry>') { stack.pop(); }
      else if (stack.length > 1 && !stack[stack.length - 1].name) stack[stack.length - 1].name = dec(m[1]).replace(/\s*>$/, '').trim();
    }
    const clean = n => ({ name: n.name, children: n.children.filter(c => c.name && !/^[-=]+$/.test(c.name)).map(clean) });
    const run = clean(root).children.find(c => c.name === 'Run Table') || clean(root);
    const cats = [];
    for (const c of run.children) {
      if (['Table Settings', 'Freezer', 'Database List'].includes(c.name)) continue;
      const presets = c.children.find(x => x.name === 'Presets');
      const flat = [];
      const walk = (n, group) => n.children.forEach(ch => (ch.children.length ? walk(ch, ch.name) : flat.push({ group, name: ch.name })));
      if (presets) walk(presets, 'Umum');
      else if (!c.children.some(x => x.children.length)) c.children.forEach(ch => flat.push({ group: 'Umum', name: ch.name }));
      const sections = c.children.filter(x => x.name !== 'Presets' && x.children.length).map(x => ({ name: x.name, count: x.children.length }));
      cats.push({ name: c.name, presets: flat.filter(x => x.name !== '<Not Available>'), sections });
    }
    const total = (s.match(/<CheatEntry>/g) || []).length;
    CT_CACHE = { path: cfg.ctPath, ok: true, total, cats, built: 'FM26 (tdg6661)' };
  } catch (e) { CT_CACHE = { path: cfg.ctPath, ok: false, error: String(e.message || e), cats: [] }; }
  return CT_CACHE;
}

// ---------------- Cakupan cheat ----------------
const Cheats = require('./lib/cheats');
const CH = new Cheats(path.join(DATA_DIR));
CH.cfgFile = cfile; // youth intake per karier
const { Versi, APP } = require('./lib/versi');
const VS = new Versi(DATA_DIR, CH);
logLine('INFO', `Asisten v${APP.version} untuk FM ${APP.fm}`);
// Pengawas youth intake: cek tiap 30 dtk; hanya memindai saat tanggal game berganti.
let YOUTH_LAST = null, youthBusy = false;
function youthGroups(sc) { // cakupan → kelompok UID per klub (null = semua klub)
  const t = sc.type || 'myclub';
  if (t === 'all') return null;
  const byClub = list => { const m = new Map(); for (const p of list) if (p.club) { if (!m.has(p.club)) m.set(p.club, []); m.get(p.club).push(p.id); } return [...m.values()]; };
  const ok = youthClubFilter(sc); return byClub(DB.players.filter(p => p.club && !p.teamType && p.expires && ok(p.club)));
}
// Kandidat/hasil youth intake tahun ini di cakupan: tim muda (U18/U19) kelahiran (tahun game − 16) ke atas, atau tanpa kontrak & usia ≤ 17.
// Klub dalam cakupan: myclub | club | div (liga tim senior) | nat (negara liga) | all
function youthClubFilter(sc) {
  const t = sc.type || 'myclub', CN = clubNations();
  if (t === 'all') return () => true;
  if (t === 'club') return c => c === sc.value;
  if (t === 'div') return c => (CN.get(c) || {}).div === sc.value;
  if (t === 'nat') return c => (CN.get(c) || {}).nat === sc.value;
  const me = myClub(); return c => c === me;
}
function youthCands(sc, withInfo) {
  if (!DB.players.length || !DB.meta) return withInfo ? {} : [];
  const gy = DB.meta.gameYear || Number(String(DB.meta.gameDate).slice(0, 4)), ok = youthClubFilter(sc);
  const l = DB.players.filter(p => p.club && p.age <= 17 && ok(p.club) && ((p.birthYear >= gy - 16 && [11, 12].includes(p.teamType)) || (!p.expires && !p.wage)));
  if (!withInfo) return l.map(p => p.id);
  const o = {}; for (const p of l) o[p.id] = { name: p.name, club: p.club }; return o;
}
// Jadwal intake untuk cakupan: per negara → jendela, jumlah klub, status
function youthSchedule(sc) {
  if (!DB.meta) return [];
  const ok = youthClubFilter(sc), CN = clubNations(), by = {};
  for (const [club, v] of CN) if (v.nat && ok(club)) (by[v.nat] = by[v.nat] || []).push(club);
  return Object.entries(by).map(([nat, clubs]) => { const y = youthInfo(nat, DB.meta.gameDate); return { nat, clubs: clubs.length, sample: clubs.slice(0, 3), ...(y || { unknown: true }) }; })
    .sort((a, b) => (a.unknown ? 1e9 : a.daysToStart) - (b.unknown ? 1e9 : b.daysToStart));
}
// Pemain yang sedang dibuka di layar FM (ditulis plugin Teknik Oda) → CA/PA untuk badge di atas profil FM.
const OPEN_FILE = path.join(LOCAL, 'TeknikOda', 'eklenti', 'acik-oyuncu.json');
let FMOPEN_C = null, LIVE_C = null;
function fmOpen() {
  let o; try { o = JSON.parse(fs.readFileSync(OPEN_FILE, 'utf8')); } catch { return null; }
  const ck = o.zaman + '|' + DB.loadedAt; if (FMOPEN_C && FMOPEN_C.k === ck) return FMOPEN_C.v;
  const v = fmOpenFind(o); FMOPEN_C = { k: ck, v }; return v;
}
function fmOpenFind(o) {
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const n = norm(o.ad); const [y, m, d] = String(o.dogum || '').split('-').map(Number);
  const doy = y ? Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5) + 1 : 0;
  const pool = [...DB.players, ...DB.staff.filter(s => s.ca)];
  let c = pool.filter(p => norm(p.name) === n); if (y && c.length > 1) { const c2 = c.filter(p => p.birthYear === y); if (c2.length) c = c2; }
  if (doy && c.length > 1) c.sort((a, b) => Math.abs((a.birthDoy || 0) - doy) - Math.abs((b.birthDoy || 0) - doy));
  const p = c[0];
  return { zaman: o.zaman, ad: o.ad, found: !!p, id: p && p.id, name: p && p.name, ca: p && p.ca, pa: p && p.pa, age: p && p.age, club: p && p.club, staff: !!(p && !DB.byId.get(p.id)) };
}
function youthLabel(sc) { const t = sc.type || 'myclub'; return t === 'all' ? 'Semua klub' : t === 'club' ? sc.value : t === 'div' ? 'Liga ' + sc.value : t === 'nat' ? 'Negara ' + sc.value : myClub(); }
setTimeout(() => CH.index().catch(() => {}), 1500); // panaskan indeks memori supaya profil pertama langsung cepat
setInterval(async () => {
  if (youthBusy || VS.locked()) return; youthBusy = true;
  try { const r = await CH.youthTick(youthGroups, careerKey()); if (r) YOUTH_LAST = { at: Date.now(), ...r }; }
  catch (e) { YOUTH_LAST = { at: Date.now(), error: e.message }; }
  try { const c = CH.youthCfg(); if (c.active) { const r = await CH.youthBoost(youthCands(c.scope || {}), false, youthCands(c.scope || {}, true)); if (r && r.mine) { YOUTH_LAST = { at: Date.now(), kandidat: true, ...r }; logLine('INFO', `youth kandidat: ${r.mine} pemain dinaikkan PA`); } } }
  catch (e) { YOUTH_LAST = { at: Date.now(), error: 'kandidat: ' + e.message }; }
  try { await CH.legendTick(); } catch (e) { logLine('WARN', 'legenda: ' + e.message); }
  finally { youthBusy = false; }
}, 30000);
function resolveScope(s) {
  const pool = s.kind === 'S' ? DB.staff : DB.players;
  const maxAge = s.maxAge ? Number(s.maxAge) : 999, minAge = s.minAge ? Number(s.minAge) : 0;
  let rows;
  switch (s.type) {
    case 'person': rows = pool.filter(x => x.id === Number(s.value)); break;
    case 'myclub': rows = pool.filter(x => x.club === myClub()); break;
    case 'club': rows = pool.filter(x => x.club === s.value); break;
    case 'div': rows = pool.filter(x => x.div === s.value); break;
    case 'nat': rows = pool.filter(x => (x.nat || []).includes(s.value)); break;
    case 'all': rows = pool; break;
    default: rows = [];
  }
  return rows.filter(x => (x.age || 0) <= maxAge && (x.age || 0) >= minAge);
}


// ---------------- Buka di game lewat plugin dalam-game Teknik Oda (format flag v1.0.10) ----------------
const EKLENTI = path.join(process.env.LOCALAPPDATA || '', 'TeknikOda', 'eklenti');
let OPEN_BUSY = false;
function odaPlugin() {
  const kalp = path.join(EKLENTI, 'kalp.txt');
  if (!fs.existsSync(kalp)) return { ok: false, why: 'Plugin dalam-game Teknik Oda belum terpasang' };
  const age = (Date.now() - fs.statSync(kalp).mtimeMs) / 1000;
  let game = ''; try { game = JSON.parse(fs.readFileSync(kalp, 'utf8')).oyun || ''; } catch {}
  if (age > 90) return { ok: false, why: 'Plugin dalam-game Teknik Oda tidak memberi sinyal sejak ' + Math.round(age) + ' dtk — FM sedang sibuk/tertutup, atau plugin Teknik Oda di FM belum aktif (Teknik Oda → Settings → Cards inside FM). Profil tetap bisa dibuka: FM difokuskan, lalu cari pemainnya manual.', game };
  if (game && !/^27./.test(game)) return { ok: false, why: 'Plugin Teknik Oda berjalan di FM ' + game + ', bukan FM27', game };
  return { ok: true, game };
}
async function openInGame(person, kind) {
  const st = odaPlugin(); if (!st.ok) return { ok: false, pesan: st.why };
  if (!person || person.dbi == null) return { ok: false, pesan: 'Nomor database (dbi) orang ini tidak ada di data' };
  if (OPEN_BUSY) return { ok: false, pesan: 'Permintaan sebelumnya masih diproses' };
  OPEN_BUSY = true;
  try {
    const anchor = (DB.players.find(x => x.club === myClub() && x.teamType === 0 && x.dbi !== person.dbi) || person).dbi;
    const flag = path.join(EKLENTI, 'oyunda-ac.flag'), yanit = path.join(EKLENTI, 'oyunda-ac-yanit.json');
    const t0 = Date.now(); fs.writeFileSync(flag, `ac;${person.dbi};<link=;${anchor}`);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    while (fs.existsSync(flag) && Date.now() - t0 < 6000) await sleep(50);
    if (fs.existsSync(flag)) { try { fs.unlinkSync(flag); } catch {} return { ok: false, pesan: 'FM tidak merespons (jangan minimalkan jendela FM)' }; }
    let r = {};
    while (Date.now() - t0 < 8000) { try { r = JSON.parse(fs.readFileSync(yanit, 'utf8')); if ((r.zaman || 0) >= t0 - 1000) break; } catch {} await sleep(100); }
    if (r.tamam) return { ok: true, pesan: 'Profil dibuka di FM27' };
    let why = r.hata || 'plugin tidak memberi jawaban';
    if (/durumu/.test(why)) why = 'status laga belum terbaca, coba sekali lagi';
    else if (/yok/.test(why)) why = 'layar FM tidak memuat nama yang bisa diklik; buka layar Skuad atau Portal';
    return { ok: false, pesan: why };
  } finally { OPEN_BUSY = false; }
}

// ---------------- Proses ----------------
function processRunning(name) {
  return new Promise(res => execFile('tasklist', ['/FI', `IMAGENAME eq ${name}`, '/NH'], { windowsHide: true }, (e, out) => res(!e && out.toLowerCase().includes(name.toLowerCase()))));
}
function launch(exe, args = []) {
  if (!fs.existsSync(exe)) return { ok: false, error: 'File tidak ditemukan: ' + exe };
  const ch = spawn(exe, args, { detached: true, stdio: 'ignore', cwd: path.dirname(exe) });
  ch.on('error', () => {}); ch.unref();
  return { ok: true };
}

// ---------------- HTTP ----------------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const body = req => new Promise(r => { let b = ''; req.on('data', c => (b += c)); req.on('end', () => { try { r(JSON.parse(b || '{}')); } catch { r({}); } }); });

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const q = Object.fromEntries(u.searchParams);
  const p = u.pathname;
  try {
    if (p === '/api/status') {
      const [fm, reader] = await Promise.all([processRunning('fm.exe'), processRunning('TeknikOda.exe')]);
      let dumpAge = null; try { dumpAge = Date.now() - fs.statSync(cfg.dumpPath).mtimeMs; } catch {}
      return send(res, 200, { ok: !DB.error, error: DB.error, meta: DB.meta && { ...DB.meta, clubIds: undefined }, players: DB.players.length, staff: DB.staff.length, loadedAt: DB.loadedAt, dumpAge, fm, reader, club: myClub(), clubId: DB.meta && DB.meta.clubIds ? DB.meta.clubIds[myClub()] : null, clubs: DB.clubs, oda: odaStatus(), youth: myYouth(), notif: NOTIF_LAST,
        paths: Object.fromEntries(Object.keys(DEFAULTS).filter(k => k !== 'club').map(k => [k, { value: cfg[k], exists: fs.existsSync(cfg[k]) }])) });
    }
    if (p === '/api/shutdown' && req.method === 'POST') { send(res, 200, { ok: true }); setTimeout(() => process.exit(0), 200); return; }
    // Kolom CA/PA di tabel FM (native/kolom.exe): nama hasil OCR → "ca pa" per baris ("-" bila tidak dikenali)
    if (p === '/api/kolom' && req.method === 'POST') {
      const b = await body(req); const names = Array.isArray(b.names) ? b.names.slice(0, 200) : [];
      return send(res, 200, { rows: names.map(n => { const x = kolomMatch(String(n || ''), b.pos); return x ? x.ca + ' ' + x.pa : '-'; }) });
    }
    if (p === '/api/fmopen') {
      const o = fmOpen() || { found: false };
      if (o.found && !o.staff) {
        if (!LIVE_C || LIVE_C.id !== o.id || Date.now() - LIVE_C.at > 1500) { try { const l = await CH.liveCaPa(o.id); LIVE_C = { id: o.id, at: Date.now(), l }; } catch { LIVE_C = { id: o.id, at: Date.now(), l: null }; } }
        if (LIVE_C.l) return send(res, 200, { ...o, ...LIVE_C.l, live: true });
      }
      return send(res, 200, o);
    }
    if (p === '/api/notif-test') { notify('⚽ Uji notifikasi', 'Balon Asisten FM27 tampil di pojok kanan bawah jendela FM.'); return send(res, 200, { ok: true }); }
    if (p === '/api/reload') { DB.mtime = 0; loadDump(); return send(res, 200, { ok: !DB.error, error: DB.error }); }
    if (DB.error && p.startsWith('/api/') && !['/api/settings', '/api/cheats', '/api/launch'].includes(p)) return send(res, 503, { error: DB.error });
    if (p === '/api/dashboard') return send(res, 200, dashboard());
    if (p === '/api/kantor') {
      if (!myClub()) { // menganggur: tampilkan lowongan manajer, bukan data karier lain
        const reps = clubReps(), hasMgr = new Set(DB.staff.filter(x => x.job === 'Manager' && x.club).map(x => x.club));
        const clubs = {}; for (const pl of DB.players) if (pl.club && !pl.teamType) (clubs[pl.club] = clubs[pl.club] || { club: pl.club, div: pl.div || '', cas: [] }).cas.push(pl.ca || 0);
        const vac = Object.values(clubs).filter(c => !hasMgr.has(c.club) && c.cas.length >= 11).map(c => { const top = c.cas.sort((x, y) => y - x).slice(0, 16); return { club: c.club, div: c.div, rep: reps[c.club] || 0, ca: Math.round(top.reduce((t, x) => t + x, 0) / top.length), n: c.cas.length, clubId: DB.meta && DB.meta.clubIds ? DB.meta.clubIds[c.club] : null }; }).sort((x, y) => y.rep - x.rep).slice(0, 60);
        return send(res, 200, { ok: false, unemployed: true, manager: DB.meta && DB.meta.manager, gameDate: DB.meta && DB.meta.gameDate, vacancies: vac, dash: dashboard() });
      }
      const src = LT.findSrc(LOCAL, myClub()), ofis = src ? readJSON(src.ofis, null) : null;
      const dash = dashboard();
      if (!ofis) return send(res, 200, { ok: false, error: 'Data karier Teknik Oda (ofis.json) belum ada — buka Teknik Oda & muat save.', dash });
      const season = src.season ? readJSON(src.season, null) : null, club = myClub();
      let latihan = null; try { latihan = LT.build({ ofis, season, players: DB.players.filter(x => x.club === club), staff: DB.staff.filter(x => x.club === club), offset: 0, gameDate: DB.meta && DB.meta.gameDate }); } catch (e) { logLine('WARN', 'kantor/latihan: ' + e.message); }
      return send(res, 200, { ...KT.build({ E, DB, club, lite, dash, ofis, season, targets: readJSON(TF_FILE(), []), shortlist: readJSON(SHORT_FILE(), []), latihan }), dash });
    }
    if (p === '/api/search') return send(res, 200, search(q));
    if (p === '/api/attrmeta') return send(res, 200, { groups: E.GROUPS, labels: E.ATTR_LABEL, divs: [...new Set(DB.players.map(x => x.div).filter(Boolean))].sort(), nats: [...new Set(DB.players.flatMap(x => x.nat || []))].sort() });
    if (p === '/api/latihan') {
      const src = LT.findSrc(LOCAL, myClub());
      if (!src) return send(res, 200, { ok: false, error: !myClub() ? 'Anda sedang tanpa klub di save ini. Jadwal latihan muncul lagi setelah Anda menerima pekerjaan di FM — lihat daftar lowongan di Ruang Manajer.' : 'Data karier Teknik Oda untuk klub ini belum ada. Buka Teknik Oda, muat save di FM, lalu tunggu Teknik Oda selesai membaca.' });
      const ofis = readJSON(src.ofis, null), season = src.season ? readJSON(src.season, null) : null;
      if (!ofis) return send(res, 200, { ok: false, error: 'Berkas ofis.json Teknik Oda tidak terbaca. Coba lagi beberapa detik lagi.' });
      const club = myClub();
      const r = LT.build({ ofis, season, players: DB.players.filter(x => x.club === club), staff: DB.staff.filter(x => x.club === club), offset: Math.max(0, Math.min(3, Number(q.w) || 0)), gameDate: DB.meta && DB.meta.gameDate });
      r.updated = ofis.zaman || new Date(src.mtime).toISOString();
      r.cek = ((readJSON(LT_FILE(), {}).cek) || {})[r.week.start] || {};
      return send(res, 200, r);
    }
    if (p === '/api/changelog') { try { return send(res, 200, { md: fs.readFileSync(path.join(__dirname, 'CHANGELOG.md'), 'utf8') }); } catch { return send(res, 200, { md: '' }); } }
    if (p === '/api/jembatan') {
      if (req.method === 'POST') { const b = await body(req); const lines = (b.lines || []).map(String).filter(Boolean).slice(0, 200); if (!lines.length) return send(res, 400, { error: 'tidak ada perintah' }); return send(res, 200, await jembatan(lines)); }
      return send(res, 200, { status: jembatanStatus() });
    }
    // Cetakan event di plugin Jembatan sudah ada untuk save ini? (dipakai UI untuk menunggu pengguna mengganti fokus sekali)
    if (p === '/api/jembatan/punya') { const r = await jembatan(['punya ' + Number(q.id || 1280659764)]); const m = r.ok && r.hasil.match(/punya [0-9]+ (ya|tidak|lain)/); return send(res, 200, { ok: !!m, punya: m ? m[1] === 'ya' : false, status: m ? m[1] : null, error: r.ok ? (m ? null : 'Plugin Jembatan perlu diperbarui (versi logika 1.3)') : r.error }); }
    if (p === '/api/latihan/terapkan-individu' && req.method === 'POST') {
      // Pasang "Fokus Tambahan" rekomendasi ke FM lewat plugin Jembatan (memutar ulang event ganti-fokus FM sendiri)
      const b = await body(req); const ids = Array.isArray(b.ids) && b.ids.length ? new Set(b.ids.map(Number)) : null;
      const src = LT.findSrc(LOCAL, myClub()), season = src && src.season ? readJSON(src.season, null) : null, club = myClub();
      const d = ID.build({ E, players: DB.players.filter(x => x.club === club), staff: DB.staff.filter(x => x.club === club), season, club });
      const pick = d.rows.filter(r => (!ids || ids.has(r.id)) && (!b.team || r.team === b.team));
      const ok = pick.filter(r => r.pers && r.fmFocus), skipped = pick.filter(r => !(r.pers && r.fmFocus)).map(r => ({ name: r.name, why: !r.pers ? 'regen (nomor internal belum diketahui)' : r.role && r.role.pos === 'GK' ? 'kiper (katalog fokus kiper belum direkam)' : 'tidak ada fokus yang dibutuhkan' }));
      if (!ok.length) return send(res, 200, { ok: false, error: 'Tidak ada pemain yang bisa diterapkan.', skipped });
      const r = await jembatan(ok.map(x => `replay 1280659764 pers=${x.pers} set=1916366157/1886680684:n:${x.fmFocus.id};1916366157/1903577654:s:${x.fmFocus.name}`));
      if (!r.ok) return send(res, 200, { ok: false, error: r.error, skipped });
      const lines = r.hasil.split('\n').filter(l => /^(OK replay|GAGAL)/.test(l)), fail = lines.filter(l => l.startsWith('GAGAL'));
      if (fail.length && /belum ada cetakan/.test(fail[0])) return send(res, 200, { ok: false, needTemplate: true, error: 'FM belum punya contoh perintah ganti fokus di sesi ini. Di FM: buka profil satu pemain → Latihan → ganti Fokus Tambahan sekali.', skipped });
      const log = readJSON(cfile('fokus-diterapkan.json'), {}); const at = new Date().toISOString();
      ok.forEach((x, i) => { if (lines[i] && lines[i].startsWith('OK')) log[x.id] = { id: x.fmFocus.id, name: x.fmFocus.name, at }; });
      fs.writeFileSync(cfile('fokus-diterapkan.json'), JSON.stringify(log));
      logLine('INFO', `fokus individu diterapkan ke FM: ${ok.length - fail.length} pemain, gagal ${fail.length}`);
      return send(res, 200, { ok: true, applied: ok.length - fail.length, failed: fail.length, failDetail: fail.slice(0, 5), skipped });
    }
    if (p === '/api/latihan/individu') {
      const src = LT.findSrc(LOCAL, myClub()), season = src && src.season ? readJSON(src.season, null) : null, club = myClub();
      return send(res, 200, { ...ID.build({ E, players: DB.players.filter(x => x.club === club), staff: DB.staff.filter(x => x.club === club), season, club }), applied: readJSON(cfile('fokus-diterapkan.json'), {}), jembatan: jembatanStatus() });
    }
    if (p === '/api/latihan/cek' && req.method === 'POST') {
      const b = await body(req); const d = readJSON(LT_FILE(), {}); d.cek = d.cek || {};
      const w = d.cek[b.week] = d.cek[b.week] || {}; if (b.on) w[b.key] = true; else delete w[b.key];
      const keep = Object.keys(d.cek).sort().slice(-12); d.cek = Object.fromEntries(keep.map(k => [k, d.cek[k]]));
      fs.writeFileSync(LT_FILE(), JSON.stringify(d)); return send(res, 200, { ok: true });
    }
    if (p === '/api/squad') { const c = q.club || myClub(); return send(res, 200, { club: c, rows: DB.players.filter(x => x.club === c).sort((a, b) => b._bpr - a._bpr).map(lite) }); }
    if (p.startsWith('/api/similar/')) { const x = DB.byId.get(Number(p.split('/').pop())); return send(res, 200, x ? similar(x) : []); }
    if (p.startsWith('/api/player/')) { const d = playerDetail(p.split('/').pop()); return d ? send(res, 200, d) : send(res, 404, { error: 'Pemain tidak ditemukan' }); }
    if (p === '/api/compare') return send(res, 200, (q.ids || '').split(',').filter(Boolean).slice(0, 3).map(playerDetail).filter(Boolean));
    if (p === '/api/bestxi') { const c = q.club || myClub(); return send(res, 200, E.bestXI(DB.players.filter(x => x.club === c), q.formation || '4-3-3')); }
    if (p === '/api/formations') return send(res, 200, Object.keys(E.FORMATIONS));
    if (p === '/api/guide') return send(res, 200, Object.keys(GD.G).map(k => ({ ...GD.forPosition(k, E.ATTR_LABEL), ladder: GD.LADDER })));
    if (p === '/api/guide-search') {
      const g = GD.G[q.pos]; const t = GD.TIERS.find(x => x.id === q.tier);
      if (!g) return send(res, 400, { error: 'posisi?' });
      const keys = g.key.map(x => x[0]); const mine = myClub();
      const maxAge = Number(q.maxAge || 99), maxValue = q.maxValue ? Number(q.maxValue) : Infinity;
      let rows = DB.players.filter(x => E.familiarity(x, q.pos) === 1 && x.age <= maxAge && (x.value || 0) <= maxValue && (q.includeMine === '1' || x.club !== mine));
      const L = GD.LADDER.find(x => x.id === q.tier);
      if (L) {
        rows = rows.filter(x => x.age >= L.age[0] && x.age <= L.age[1] && (x.ca || 0) >= L.ca && (!L.pa || (x.pa || 0) >= L.pa)
          && keys.filter(k => (x.attrs[k] || 0) >= L.keyMin).length >= keys.length - 1
          && (!L.det || (x.attrs.Determination || 0) >= L.det) && (!L.prof || (x.professionalism || 0) >= L.prof) && (!L.nf || (x.attrs.NaturalFitness || 0) >= L.nf));
      } else if (q.tier === 'muda') {
        const Y = GD.YOUTH;
        rows = rows.filter(x => x.age <= 21 && x.pa >= Y.pa && keys.filter(k => (x.attrs[k] || 0) >= Y.keyAt18).length >= keys.length - 2 && (x.attrs.Determination || 0) >= 14 && (x.professionalism || 0) >= 13);
      } else if (t) {
        rows = rows.filter(x => keys.every(k => (x.attrs[k] || 0) >= t.key));
      }
      const sum = x => keys.reduce((s, k) => s + (x.attrs[k] || 0), 0);
      rows.sort((a, b) => (q.tier === 'muda' || (L && L.pa) ? b.pa - a.pa || sum(b) - sum(a) : sum(b) - sum(a)));
      return send(res, 200, { total: rows.length, rows: rows.slice(0, 80).map(x => ({ ...lite(x), keyAvg: Math.round((sum(x) / keys.length) * 10) / 10, keyVals: keys.map(k => x.attrs[k] || 0) })), keys: keys.map(k => E.ATTR_LABEL[k]) });
    }
    if (p === '/api/roles') return send(res, 200, E.ROLES.map(r => ({ id: r.id, name: r.name, en: r.en, pos: r.pos, key: r.key.map(k => E.ATTR_LABEL[k]), imp: r.imp.map(k => E.ATTR_LABEL[k]) })));
    if (p === '/api/role-search') {
      const role = E.ROLES.find(r => r.id === q.role); if (!role) return send(res, 400, { error: 'peran?' });
      const maxAge = Number(q.maxAge || 99), maxValue = q.maxValue ? Number(q.maxValue) : Infinity, mine = myClub();
      const rows = DB.players.filter(x => x.age <= maxAge && (x.value || 0) <= maxValue && E.familiarity(x, role.pos) === 1 && (q.includeMine === '1' || x.club !== mine))
        .map(x => ({ x, s: E.roleScore(x, role) })).sort((a, b) => b.s - a.s).slice(0, 60).map(({ x, s }) => ({ ...lite(x), roleScore: s }));
      return send(res, 200, { role: role.name, rows });
    }
    if (p === '/api/staff') {
      let rows = DB.staff;
      if (q.q) { const s = q.q.toLowerCase(); rows = rows.filter(x => x._search.includes(s)); }
      if (q.job) rows = rows.filter(x => x.job === q.job);
      else if (q.mine !== '1') { const BOARD = ['President', 'Voorzitter', 'Eigenaar', 'Algemeen directeur', 'Directeur', 'Algemeen manager']; rows = rows.filter(x => !BOARD.includes(x.job)); }
      if (q.mine === '1') rows = rows.filter(x => x.club === myClub());
      if (q.free === '1') rows = rows.filter(x => !x.club);
      const role = E.STAFF_ROLES.find(r => r.id === q.role);
      let out = rows.map(x => ({ id: x.id, name: x.name, age: x.age, nat: (x.nat || [])[0], club: x.club || 'Tanpa Klub', job: x._jobLabel, wage: x.wage, expires: x.expires,
        best: x._best, fit: role ? { ...E.staffScore(x, role), name: role.name } : x._best }));
      out = out.filter(x => x.fit);
      // Kelas (dari bintang peran) & peluang direkrut (reputasi klub Anda vs. tuntutan staf)
      const repOf = clubReps();
      const mr = myRep() / 100;
      const CLS = st => (st >= 4.5 ? ['dunia', 'Kelas Dunia'] : st >= 4 ? ['elit', 'Elit'] : st >= 3.5 ? ['sbagus', 'Sangat Bagus'] : st >= 3 ? ['bagus', 'Bagus'] : ['standar', 'Standar']);
      const REPN = r => (r >= 85 ? 'Dunia' : r >= 70 ? 'Kontinental' : r >= 55 ? 'Nasional' : r >= 35 ? 'Regional' : 'Lokal');
      // Minat bergabung (0–100), meniru logika FM: reputasi staf vs klub saya, jabatan sekarang, klub asal, kontrak, usia
      const interest = (st, x) => {
        const ca = (st && st.ca) || 0, cr = x.club !== 'Tanpa Klub' ? (repOf[x.club] || 0) / 100 : 0;
        const sr = Math.max(cr * 0.9, Math.min(99, 15 + Math.max(0, ca - 40) * 0.52)); // reputasi staf (perkiraan)
        let s = 55; const why = [];
        if (sr > mr) { const d = (sr - mr) * 1.3; s -= d; if (d >= 6) why.push(`reputasinya lebih tinggi (${REPN(sr)})`); } else { s += Math.min(12, (mr - sr) * 0.3); if (mr - sr >= 10) why.push('naik kelas ke klub Anda'); }
        if (cr > mr + 3) { s -= 10; why.push('klubnya sekarang lebih besar'); } else if (cr && cr < mr - 10) { s += 6; }
        if (st && st.job === 'Manager' && x.club !== 'Tanpa Klub') { s -= 25; why.push('manajer aktif, enggan turun jabatan'); }
        if (x.club === 'Tanpa Klub') { s += 12; why.push('tanpa klub'); }
        const ex = st && st.expires ? monthsUntil(st.expires, DB.meta && DB.meta.gameDate) : null;
        if (ex != null && ex <= 6) { s += 6; why.push('kontrak hampir habis'); }
        if (x.age >= 60) s += 5; else if (x.age < 40 && st && st.pa >= 150) { s -= 5; why.push('pelatih muda berambisi'); }
        return { score: Math.max(0, Math.min(100, Math.round(s))), why, rep: Math.round(sr), repName: REPN(sr) };
      };
      out = out.map(x => {
        const st = DB.staffById.get(x.id);
        if (x.club === myClub()) { const [cid, cname] = CLS(x.fit.stars || 0); return { ...x, cls: cid, clsName: cname, chance: 'milik', chanceName: 'Staf Anda', interest: null, interestWhy: '', repName: '' }; }
        const it = interest(st, x);
        const chance = it.score >= 65 ? ['mudah', 'Realistis'] : it.score >= 40 ? ['sulit', 'Sulit'] : ['ssulit', 'Sangat sulit'];
        const [cid, cname] = CLS(x.fit.stars || 0);
        const club = x.club === 'Tanpa Klub' && st && st.ca >= 150 ? 'Tanpa klub*' : x.club;
        return { ...x, club, clubNote: club === 'Tanpa klub*' ? 'Teknik Oda tidak membaca jabatan tim nasional — staf top tanpa klub bisa jadi sedang melatih tim nasional.' : null, cls: cid, clsName: cname, chance: chance[0], chanceName: chance[1], interest: it.score, interestWhy: it.why.join(' · '), rep: it.rep, repName: it.repName };
      });
      if (q.cls) out = out.filter(x => x.cls === q.cls); // tiap kelas berdiri sendiri (Elit tidak memuat Kelas Dunia)
      if (q.chance) out = out.filter(x => x.chance === q.chance);
      out.sort((a, b) => b.fit.score - a.fit.score);
      return send(res, 200, { total: out.length, rows: out.slice(0, 200), roles: E.STAFF_ROLES.map(r => ({ id: r.id, name: r.name })), jobs: Object.entries(E.JOB_LABEL).map(([k, v]) => ({ k, v })) });
    }
    if (p.startsWith('/api/staffone/')) {
      const s = DB.staffById.get(Number(p.split('/').pop())); if (!s) return send(res, 404, { error: 'tidak ada' });
      return send(res, 200, { id: s.id, name: s.name, age: s.age, nat: s.nat, club: s.club, job: s._jobLabel, wage: s.wage, expires: s.expires, ca: s.ca, pa: s.pa,
        attrs: Object.entries(s.staffAttrs || {}).map(([k, v]) => ({ k, label: E.STAFF_LABEL[k] || k.replace(/_/g, ' '), v })),
        groups: E.STAFF_GROUPS.map(([g, keys]) => ({ g, items: keys.filter(k => s.staffAttrs && k in s.staffAttrs).map(k => ({ k, label: E.STAFF_LABEL[k] || k, v: s.staffAttrs[k] })) })),
        fits: E.STAFF_ROLES.map(r => ({ name: r.name, ...E.staffScore(s, r) })).sort((a, b) => b.score - a.score) });
    }
    if (p === '/api/cheats') { try { return send(res, 200, parseCT()); } catch { return send(res, 200, []); } } // sisa Cheat Table lama (tidak dipakai UI)
    // ---------- Cheat FM27 langsung ke memori ----------
    if (p === '/api/lists') {
      const cnt = f => { const m = {}; DB.players.forEach(x => [].concat(f(x)).forEach(k => k && (m[k] = (m[k] || 0) + 1))); return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ k, n })); };
      return send(res, 200, { clubs: cnt(x => x.club), divs: cnt(x => x.div), nats: cnt(x => x.nat || []) });
    }
    if (p === '/api/cheat/status') return send(res, 200, await CH.status());
    if (p === '/api/cheat/history') return send(res, 200, CH.history());
    if (p === '/api/cheat/undo' && req.method === 'POST') { const b = await body(req); return send(res, 200, await CH.undo(b.id)); }
    if (p === '/api/cheat/finance') { // baca keuangan klub live (default: klub saya)
      const club = q.club || myClub();
      const ids = resolveScope({ kind: 'P', type: 'club', value: club }).map(x => x.id);
      if (!ids.length) return send(res, 400, { error: 'Klub tidak ditemukan' });
      try { const f = await CH.clubFinance(ids); return send(res, 200, { club, balance: f.balance, transfer: f.transfer, wageBudget: f.wageBudget, wageBill: f.wageBill }); } catch (e) { return send(res, 200, { club, error: e.message }); }
    }
    if (p === '/api/cheat/scope') { const s = resolveScope(q); return send(res, 200, { count: s.length, sample: s.slice(0, 5).map(x => x.name) }); }
    if (p === '/api/versi') { try { return send(res, 200, await VS.status(q.force === '1')); } catch (e) { return send(res, 200, { app: APP, mode: 'error', msg: e.message }); } }
    // Hancurkan tim: target = klub tertentu atau semua klub di liga (liga tim senior); klub saya selalu dilewati.
    if (p === '/api/comeback' || p === '/api/comeback/restore') {
      const F = path.join(__dirname, 'data', 'cheat', 'comeback.json');
      const st = (() => { try { return JSON.parse(fs.readFileSync(F, 'utf8')); } catch { return { undo: [] }; } })();
      const save = x => { fs.mkdirSync(path.dirname(F), { recursive: true }); fs.writeFileSync(F, JSON.stringify(x)); };
      if (req.method !== 'POST') return send(res, 200, { active: (st.undo || []).length > 0, ...st });
      const vs = await VS.status().catch(() => null); if (vs && vs.mode === 'terkunci') return send(res, 423, { error: vs.msg });
      try {
        if (p === '/api/comeback/restore') {
          let ok = 0; for (const id of [...(st.undo || [])].reverse()) { try { const u = await CH.undo(id); ok += u.ok || 0; } catch (e) { logLine('WARN', 'comeback undo ' + e.message); } }
          save({ undo: [] }); logLine('INFO', 'comeback dikembalikan: ' + ok + ' penulisan'); return send(res, 200, { ok });
        }
        const b = await body(req); const me = myClub();
        const mine = DB.players.filter(x => x.club === me).map(x => x.id);
        if (!mine.length) return send(res, 400, { error: 'Klub Anda tidak ditemukan' });
        const out = { undo: [...(st.undo || [])], at: Date.now(), power: b.power, opp: b.opp || '', gameDate: (st.undo || []).length ? st.gameDate : (DB.meta && DB.meta.gameDate) || null };
        const r1 = await CH.comeback(mine, b.power); if (r1.undoId) out.undo.push(r1.undoId);
        let r2 = null;
        if (b.opp) {
          const ok = youthClubFilter({ type: 'club', value: String(b.opp) });
          const opp = DB.players.filter(x => x.club && x.club !== me && ok(x.club)).map(x => x.id);
          if (opp.length) { r2 = await CH.destroyTeam(opp, Number(b.oppFactor) || 0.4, { full: true, hidden: true, pers: true }, '(comeback) ' + b.opp); if (r2.undoId) out.undo.push(r2.undoId); }
        }
        save(out); logLine('INFO', 'comeback: ' + r1.players + ' pemain ' + r1.avgBefore + '→' + r1.avgAfter + (r2 ? ', lawan ' + b.opp + ' CA ' + r2.caBefore + '→' + r2.caAfter : ''));
        return send(res, 200, { mine: r1, opp: r2 });
      } catch (e) { return send(res, 500, { error: e.message }); }
    }
    if (p === '/api/board') { try { if (req.method === 'POST') { const b = await body(req); bpBusy = true; try { return send(res, 200, await boardSet(!!b.on)); } finally { bpBusy = false; } } return send(res, 200, await boardState()); } catch (e) { return send(res, 500, { error: e.message }); } }
    if (p === '/api/destroy' ) {
      const b = req.method === 'POST' ? await body(req) : q; const t = b.type === 'div' ? 'div' : 'club', v = String(b.value || '');
      if (!v) return send(res, 400, { error: 'Pilih klub / liga dulu.' });
      const ok = youthClubFilter({ type: t, value: v }), me = myClub(), senior = String(b.senior) !== '0' && b.senior !== false;
      const targets = DB.players.filter(x => x.club && x.club !== me && ok(x.club) && (!senior || !x.teamType));
      const clubs = [...new Set(targets.map(x => x.club))];
      if (req.method !== 'POST') return send(res, 200, { count: targets.length, clubs: clubs.length, sample: clubs.slice(0, 6), avgCa: targets.length ? Math.round(targets.reduce((s, x) => s + x.ca, 0) / targets.length) : 0, skippedMine: t === 'div' && DB.players.some(x => x.club === me && ok(x.club)) });
      if (!targets.length) return send(res, 400, { error: 'Tidak ada pemain di target ini (klub Anda tidak bisa dihancurkan).' });
      const vs = await VS.status().catch(() => null); if (vs && vs.mode === 'terkunci') return send(res, 423, { error: vs.msg });
      try { const r = await CH.destroyTeam(targets.map(x => x.id), Number(b.factor), { lockPA: !!b.lockPA, hidden: b.hidden !== false, pers: b.pers !== false, full: !!b.full }, t === 'div' ? 'liga ' + v : v); logLine('INFO', `destroy ${t}=${v}: ${r.players} pemain mental ${r.mentalBefore}→${r.mentalAfter} CA ${r.caBefore}→${r.caAfter}`); return send(res, 200, { ...r, clubs: clubs.length }); }
      catch (e) { return send(res, 500, { error: e.message }); }
    }
    if (p === '/api/cheat/run' && req.method === 'POST') {
      const vs = await VS.status().catch(() => null);
      if (vs && vs.mode === 'terkunci') return send(res, 423, { error: vs.msg });
      const b = await body(req);
      const people = resolveScope(b.scope || {});
      if (!people.length) return send(res, 400, { error: 'Tidak ada orang dalam cakupan ini.' });
      const uids = people.map(x => x.id);
      const gk = new Set(people.filter(x => x._bp === 'GK').map(x => x.id));
      const a = b.action, P = b.params || {};
      let r;
      if (a === 'push') r = await CH.pushCA(uids, P.stage, !!P.withAttrs, gk);
      else if (a === 'pa') r = await CH.setPA(uids, Number(P.value || 200));
      else if (a === 'ca') r = await CH.setCA(uids, Number(P.value), P.withAttrs !== false, gk);
      else if (a === 'hidden') r = await CH.hiddenBest(uids);
      else if (a === 'pers') r = await CH.personality(uids);
      else if (a === 'contract') r = await CH.contract(uids, P.op, Number(P.n || 0));
      else if (a === 'staffPush') r = await CH.staffPush(uids, P.stage);
      else if (a === 'staffMax') r = await CH.staffMax(uids, P.groups || ['melatih'], Number(P.level || 20));
      else if (a === 'attr') r = await CH.setAttr(Number(b.scope.value), P.key, Number(P.value));
      else if (a === 'cond') r = await CH.condition(uids, P.op, Number(P.value || 0));
      else if (a === 'finance') r = await CH.finance(uids, P.op, Number(P.value || 0));
      else if (a === 'board') r = await CH.boardComplete(DB.players.filter(p => p.club === myClub()).map(p => p.id));
      else if (a === 'know') r = await CH.knowledgeMax(DB.staff.filter(x => x.club === myClub()).map(x => x.id), DB.players.filter(p => p.club === myClub()).map(p => p.id));
      else if (a === 'citizen') { // kewarganegaraan kedua; default = negara terbanyak di klub saya (mis. Italia untuk klub Serie A)
        const cnt = {}; DB.players.filter(p => p.club === myClub() && p.nat && p.nat[0]).forEach(p => cnt[p.nat[0]] = (cnt[p.nat[0]] || 0) + 1);
        const natName = P.nat || Object.entries(cnt).sort((x, y) => y[1] - x[1])[0]?.[0];
        const ref = DB.players.find(p => p.nat && p.nat[0] === natName && p.id < 2000000000) || DB.players.find(p => p.nat && p.nat[0] === natName); // nat[0] = kewarganegaraan utama
        if (!ref) return send(res, 400, { error: 'Negara ' + natName + ' tidak ditemukan' });
        r = { ...(await CH.citizenship(uids, ref.id)), nat: natName };
      }
      else if (a === 'rep') r = await CH.teamRep(DB.players.filter(p => p.club === myClub()).map(p => p.id), Number(P.value || 9999));
      else if (a === 'love') r = await CH.managerLove(uids, DB.players.filter(p => p.club === myClub()).map(p => p.id));
      else if (a === 'legend') { const x = people[0]; r = await CH.legendApply(x.id, P.legend, { ...P, name: x.name, age: P.age || x.age }); }
      else if (a === 'register') r = await CH.register(uids, (Array.isArray(P.codes) ? P.codes : [8]).map(Number).filter(c => [0, 8, 19].includes(c)));
      else return send(res, 400, { error: 'aksi?' });
      return send(res, 200, { ...r, scope: people.length });
    }
    if (p === '/api/legends') { const qq = (q.q || '').toLowerCase(); return send(res, 200, CH.legends().filter(l => (!q.grp || l.grp === q.grp) && (!qq || l.name.toLowerCase().includes(qq))).map(l => ({ id: l.id, name: l.name, age: l.age, nat: l.nat, grp: l.grp, ca: l.ca, pa: l.pa, best: l.best, h: l.h }))); }
    if (p === '/api/legenda' && req.method === 'GET') return send(res, 200, CH.legCfg());
    if (p === '/api/legenda' && req.method === 'POST') { const b = await body(req); const c = CH.legCfg(); delete c.players[b.uid]; CH.legSave(c); return send(res, 200, c); }
    if (p === '/api/youth' && req.method === 'GET') { const c = CH.youthCfg(); const { done, ...rest } = c; return send(res, 200, { ...rest, label: youthLabel(c.scope || {}), last: YOUTH_LAST, watching: !!(CH.yw && c.active), schedule: youthSchedule(c.scope || {}).slice(0, 12), nats: [...new Set([...clubNations().values()].map(v => v.nat).filter(Boolean))].sort() }); }
    if (p === '/api/youth' && req.method === 'POST') {
      const b = await body(req); const c = CH.youthCfg();
      if (b.min != null) c.min = Math.max(1, Math.min(200, Number(b.min))); if (b.max != null) c.max = Math.max(1, Math.min(200, Number(b.max)));
      const before = JSON.stringify(c.scope || {}) + '|' + !!c.active;
      if (b.scope) { const t = ['myclub', 'club', 'div', 'nat', 'all'].includes(b.scope.type) ? b.scope.type : null; if (!t) return send(res, 400, { error: 'Youth intake hanya untuk Klub saya, Klub tertentu, Liga, Negara, atau Semua.' }); if (['club', 'div', 'nat'].includes(t) && !b.scope.value) return send(res, 400, { error: 'Pilih nama klub / liga / negara dulu.' }); c.scope = { type: t, value: String(b.scope.value || '') }; }
      c.label = youthLabel(c.scope || {});
      if (b.active != null) c.active = !!b.active;
      // Sesuai jadwal: pemain intake yang SUDAH datang sebelum booster aktif/cakupan diganti tidak disentuh;
      // hanya kandidat yang muncul saat intake klub masing-masing tiba yang dinaikkan.
      if (c.active && JSON.stringify(c.scope || {}) + '|true' !== before) { const base = youthCands(c.scope || {}); c.done = [...new Set([...(c.done || []), ...base])].slice(-20000); c.baselineAt = DB.meta && DB.meta.gameDate; }
      CH.youthSave(c); CH.yw = null; YOUTH_LAST = null; const { done, ...rest } = c; return send(res, 200, { ...rest, schedule: youthSchedule(c.scope || {}).slice(0, 12) });
    }
    if (p.startsWith('/api/live/')) { try { return send(res, 200, await CH.live(Number(p.split('/').pop()))); } catch (e) { return send(res, 200, null); } }
    if (p === '/api/openfm' && req.method === 'POST') {
      const b = await body(req);
      const person = b.id ? (b.kind === 'S' ? DB.staffById : DB.byId).get(Number(b.id)) : null;
      const g = person ? await openInGame(person, b.kind) : { ok: false, pesan: '' };
      if (g.ok) { focusFM(150); return send(res, 200, { ok: true, direct: true, pesan: g.pesan }); }
      try { await CH.focus(); return send(res, 200, { ok: true, direct: false, why: g.pesan }); } catch (e) { return send(res, 200, { ok: false, error: e.message }); }
    }
    if (p === '/api/plugin') return send(res, 200, odaPlugin());
    if (p === '/api/launch' && req.method === 'POST') {
      const b = await body(req);
      if (b.what === 'ce') return send(res, 200, launch(cfg.cePath, [cfg.ctPath]));
      if (b.what === 'reader') return send(res, 200, launch(cfg.readerExe));
      if (b.what === 'genie') return send(res, 200, launch(path.join(cfg.genieDir, 'FMGenieScout.exe')));
      return send(res, 400, { error: 'apa?' });
    }
    if (p === '/api/settings') {
      if (req.method === 'POST') { const b = await body(req); for (const k of Object.keys(DEFAULTS)) if (typeof b[k] === 'string') cfg[k] = b[k]; saveCfg(); CT_CACHE = null; DB.mtime = 0; loadDump(); }
      return send(res, 200, cfg);
    }
    if (p === '/api/tawaran') { // Tawaran Saya — rangkuman pemain yang ditawar/didekati di FM, per posisi
      const TW = require('./lib/tawaran'); const f = cfile('tawaran.json');
      if (req.method === 'POST') { const b = await body(req); if (b.remove) TW.remove(f, DB.players, b.remove); }
      return send(res, 200, TW.build({ file: f, logFile: path.join(JB_DIR, 'event.log'), players: DB.players, myClub: myClub(), gameDate: DB.meta && DB.meta.gameDate, POS: E.POSITIONS }));
    }
    if (p === '/api/targets') { // Target Transfer ⭐ — daftar terpisah dengan prioritas & status penawaran
      const TF = TF_FILE();
      let list = readJSON(TF, []);
      if (req.method === 'POST') {
        const b = await body(req); const id = Number(b.id);
        if (b.action === 'add' && !list.some(x => x.id === id)) list.push({ id, prio: Number(b.prio || 2), status: 'baru', note: b.note || '', added: new Date().toISOString() });
        if (b.action === 'remove') list = list.filter(x => x.id !== id);
        if (b.action === 'update') list = list.map(x => (x.id === id ? { ...x, ...(b.prio != null ? { prio: Number(b.prio) } : {}), ...(b.status ? { status: String(b.status), statusAt: new Date().toISOString() } : {}), ...(b.note != null ? { note: String(b.note) } : {}) } : x));
        fs.writeFileSync(TF, JSON.stringify(list, null, 2));
      }
      const mine = myClub();
      return send(res, 200, list.map(x => {
        const pl = DB.byId.get(x.id); if (!pl) return { ...x, p: null };
        const l = lite(pl); const base = Math.max(pl.askingPrice || 0, pl.value || 0);
        const bid = pl.listed ? Math.round((pl.value || base) * 0.9) : Math.round(base * (pl._exp != null && pl._exp <= 12 ? 0.85 : 1.1));
        return { ...x, p: l, own: pl.club === mine, askingPrice: pl.askingPrice || null, bid, wageOffer: Math.round((pl.wage || 0) * 1.2), notForSale: pl.notForSale };
      }).sort((a, b) => (a.status === 'selesai') - (b.status === 'selesai') || b.prio - a.prio));
    }
    if (p === '/api/shortlist') {
      let list = readJSON(SHORT_FILE(), []);
      if (req.method === 'POST') {
        const b = await body(req);
        if (b.action === 'add' && !list.some(x => x.id === b.id)) list.push({ id: b.id, note: b.note || '', added: new Date().toISOString(), tag: b.tag || 'Pantau' });
        if (b.action === 'remove') list = list.filter(x => x.id !== b.id);
        if (b.action === 'note') list = list.map(x => (x.id === b.id ? { ...x, note: b.note, tag: b.tag || x.tag } : x));
        fs.writeFileSync(SHORT_FILE(), JSON.stringify(list, null, 2));
      }
      return send(res, 200, list.map(x => ({ ...x, p: DB.byId.get(x.id) ? lite(DB.byId.get(x.id)) : null })));
    }
    if (p.startsWith('/face/')) { // wajah dari facepack FM27/FM26 (DocumentsSports Interactive...graphicsaces)
      const id = p.split('/').pop().replace(/D/g, '');
      const docs = path.join(require('os').homedir(), 'Documents', 'Sports Interactive');
      const f = id && ['Football Manager 27', 'Football Manager 26'].map(v => path.join(docs, v, 'graphics', 'faces', id + '.png')).find(x => fs.existsSync(x));
      if (f) { res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400' }); return fs.createReadStream(f).pipe(res); }
      res.writeHead(404); return res.end();
    }
    if (p.startsWith('/logo/')) {
      const id = p.split('/').pop().replace(/\D/g, '');
      const f = path.join(cfg.genieDir, 'Pictures', 'Clubs', id + '.png');
      if (id && fs.existsSync(f)) { res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400' }); return fs.createReadStream(f).pipe(res); }
      res.writeHead(404); return res.end();
    }
    // statis
    const rel = p === '/' ? 'index.html' : p.slice(1);
    const file = path.join(__dirname, 'public', path.normalize(rel).replace(/^(\.\.[\\/])+/, ''));
    if (file.startsWith(path.join(__dirname, 'public')) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      return fs.createReadStream(file).pipe(res);
    }
    res.writeHead(404); res.end('404');
  } catch (e) { console.error(e); send(res, 500, { error: String(e.message || e) }); }
});

server.on('error', e => { if (e.code === 'EADDRINUSE') { console.log(`Port ${PORT} sudah dipakai — Asisten FM27 mungkin sudah berjalan.`); process.exit(0); } else throw e; });
server.listen(PORT, '127.0.0.1', () => console.log(`Asisten FM27 berjalan di http://localhost:${PORT}`));
