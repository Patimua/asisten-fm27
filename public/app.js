'use strict';
/* Asisten FM27 — antarmuka */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (u, opt) => { const r = await fetch(u, opt); const j = await r.json(); if (!r.ok) throw new Error(j.error || r.statusText); return j; };
const post = (u, b) => api(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
let YI = null, STATUS = null, SHORT = new Set(), COMPARE = [], PLUGIN = { ok: false };
const CUR = { GBP: '£', EUR: '€', USD: '$' };
const cur = () => CUR[STATUS?.meta?.currency] || '£';
const money = v => { if (v == null || v < 0) return '—'; if (v === 0) return cur() + '0'; if (v >= 1e6) return cur() + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + ' jt'; if (v >= 1e3) return cur() + Math.round(v / 1e3) + ' rb'; return cur() + v; };
const wage = v => (v ? money(v) + '/mg' : '—');
const sCls = r => (r >= 90 ? 's6' : r >= 80 ? 's5' : r >= 70 ? 's4' : r >= 60 ? 's3' : r >= 50 ? 's2' : 's1');
const aCls = v => (v >= 18 ? 'a6' : v >= 15 ? 'a5' : v >= 12 ? 'a4' : v >= 9 ? 'a3' : v >= 6 ? 'a2' : 'a1');
const HUES = [162, 210, 28, 262, 340, 190, 8, 120];
const ava = (name, size, id) => { const h = HUES[[...name].reduce((t, c) => t + c.charCodeAt(0), 0) % HUES.length]; const ini = name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase(); return `<span class="ava" style="background:hsl(${h} 42% 42%)${size ? `;width:${size}px;height:${size}px` : ''}">${esc(ini)}${id ? `<img class="ava-img" src="/face/${id}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`; };
const logo = (id, cls = 'mini-logo') => (id ? `<img class="${cls}" src="/logo/${id}" onerror="this.style.display='none'" alt="">` : '');
const capa = (ca, pa) => `<div class="capa"><div class="t"><span>${ca}</span><span class="muted">${pa}</span></div><div class="bar b-${sCls(ca / 2)}"><i class="pa" style="width:${pa / 2}%"></i><i class="ca" style="width:${ca / 2}%"></i></div></div>`;
const toast = (m, kind) => {
  const t = $('#toast'); const k = kind || (/^(gagal|error)|tidak berjalan|tidak ditemukan/i.test(m) ? 'err' : /^✓|✓|berhasil|dibuka|disimpan|selesai/i.test(m) ? 'ok' : 'info');
  t.className = 'toast ' + k; t.innerHTML = `<span class="ti">${k === 'ok' ? '✓' : k === 'err' ? '!' : 'i'}</span><span>${esc(String(m).replace(/^✓\s*/, ''))}</span>`;
  requestAnimationFrame(() => t.classList.add('show')); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), k === 'err' ? 5000 : 3200);
};
// Dialog konfirmasi: ask({ icon, title, body, ok, tone }) → Promise<boolean>
function ask({ icon = '⚡', title, body = '', ok = 'Lanjutkan', cancel = 'Batal', tone = '', noEnter = false }) {
  return new Promise(res => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal ${tone}" role="dialog" aria-modal="true" aria-labelledby="mT"><div class="mi">${icon}</div><h2 id="mT">${esc(title)}</h2><div class="mb">${body}</div><div class="ma"><button class="btn" data-a="0">${esc(cancel)}</button><button class="btn primary" data-a="1">${esc(ok)}</button></div></div>`;
    const done = v => { bg.remove(); document.removeEventListener('keydown', key, true); res(v); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } if (e.key === 'Enter' && !noEnter) { e.preventDefault(); done(true); } };
    bg.onclick = e => { if (e.target === bg) done(false); const b = e.target.closest('[data-a]'); if (b) done(b.dataset.a === '1'); };
    document.addEventListener('keydown', key, true); document.body.appendChild(bg); bg.querySelector(noEnter ? '[data-a="0"]' : '[data-a="1"]').focus();
  });
}
window.ask = ask;
// Catatan perubahan (CHANGELOG.md) — dibuka dari nomor versi di menu samping
async function showChangelog() {
  let md = ''; try { md = (await api('/api/changelog')).md; } catch { }
  const fmt = t => t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const html = esc(md || 'Catatan perubahan tidak ditemukan.').split(/\r?\n/).map(l =>
    l.startsWith('## ') ? `<h3 style="margin:14px 0 4px;font-size:16px">${fmt(l.slice(3))}</h3>` :
    l.startsWith('# ') ? '' :
    l.startsWith('  - ') ? `<div style="margin:2px 0 2px 22px">◦ ${fmt(l.slice(4))}</div>` :
    l.startsWith('- ') ? `<div style="margin:2px 0 2px 4px">• ${fmt(l.slice(2))}</div>` :
    l ? `<p class="muted" style="margin:4px 0">${fmt(l)}</p>` : '').join('');
  await ask({ icon: '📝', title: 'Apa yang baru di Asisten FM27', body: `<div style="max-height:60vh;overflow:auto;text-align:left;font-size:13px;line-height:1.5">${html}</div>`, ok: 'Tutup', cancel: 'OK' });
}
window.showChangelog = showChangelog;
const fmBtn = (id, kind = 'P', name = '') => `<button class="fmq" data-fm="${id}" data-fmk="${kind}" data-fmn="${esc(name)}" title="Buka di FM27" aria-label="Buka ${esc(name)} di FM27">${ic('play', 15)}</button>`;
const loading = (t = 'Memuat…') => `<div class="loading"><div class="spinner"></div>${t}</div>`;
// Kotak error untuk bagian yang dimuat terpisah (supaya tidak "loading terus" saat server gagal / lambat)
const apiT = (u, ms = 30000) => api(u, { signal: AbortSignal.timeout(ms) }).catch(e => { throw new Error(e.name === 'TimeoutError' ? 'Server tidak menjawab dalam ' + ms / 1000 + ' detik.' : e.message); });
function failBox(el, e, retry) {
  const m = String(e && e.message || e);
  const hint = /dump|tidak ada|ENOENT|503|belum|Teknik Oda/i.test(m) ? 'Pastikan Teknik Oda berjalan dan save sudah dimuat di FM, lalu tunggu Teknik Oda selesai membaca.' : /tidak menjawab|Failed to fetch|NetworkError/i.test(m) ? 'Server Asisten mungkin tertutup. Klik shortcut Asisten FM27 lagi.' : 'Coba lagi. Bila tetap gagal, kirim isi berkas data\\asisten.log ke pembuat Asisten.';
  el.innerHTML = `<div class="empty" style="padding:28px"><div style="font-size:36px">⚠️</div><h2 style="font-size:18px">Gagal memuat daftar pemain</h2><p>${esc(m)}</p><p class="muted">${esc(hint)}</p><button class="btn primary">${ic('refresh', 16)} Coba lagi</button></div>`;
  el.querySelector('button').onclick = retry;
}
const persBadge = (p, tone) => `<span class="badge ${tone || 'ok'}">${esc(p)}</span>`;
const expTxt = p => (p.exp == null ? '—' : p.exp <= 0 ? '<span class="badge bad">Habis</span>' : p.exp <= 6 ? `<span class="badge warn">${p.expires}</span>` : esc(p.expires));

const I = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  squad: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5c2.6 0 4.6 1.6 5.4 4.5"/>',
  xi: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/><circle cx="12" cy="12" r="3"/>',
  scout: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8 11h6M11 8v6"/>',
  role: '<path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.6 6.5 19.5l1-6.3L3 8.9 9 8z"/>',
  youth: '<path d="M12 22V12"/><path d="M12 12C12 7 8 4 4 4c0 5 3 8 8 8z"/><path d="M12 14c0-4 3-7 8-7 0 4-3 7-8 7z"/>',
  staff: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  list: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  cmp: '<path d="M8 3v18M16 3v18"/><path d="M3 8h5M16 16h5"/>',
  cheat: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  set: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14h3v3H8z"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5l4 2.9-1.5 4.6h-5L8 10.4z"/><path d="M12 3v4.5M16 10.4l4.3-1.4M14.5 15l2.6 3.7M9.5 15l-2.6 3.7M8 10.4 3.7 9"/>',
  shirt: '<path d="M8.5 3 3 6l2 4.2 2.2-1V21h9.6V9.2l2.2 1L21 6l-5.5-3c-.6 1.6-1.9 2.6-3.5 2.6S9.1 4.6 8.5 3z"/>',
  whistle: '<circle cx="9" cy="14.5" r="5"/><path d="M12.6 11 21 6.5v4.2l-6.5 2.1"/><path d="M4.5 5.5 6.3 7.3M9.5 3v3"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3.2 3.2 0 0 0 3.4 4M17 6h3a3.2 3.2 0 0 1-3.4 4"/><path d="M12 14v4M8 21h8M9.5 18h5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  coin: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  chart: '<path d="M4 20V11M10 20V5M16 20v-6M2 20.5h20"/>', star: '<path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.6 6.5 19.5l1-6.3L3 8.9 9 8z"/>',
};
const ic = (n, w = 18) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;

const ROUTES = [
  { sec: 'Hari Ini' },
  { id: 'beranda', hint: 'Ringkasan klub, lawan berikutnya & tugas hari ini', name: 'Ruang Manajer', icon: 'ball', fn: pBeranda },
  { id: 'latihan', hint: 'Jadwal latihan mingguan otomatis & daftar tindakan', name: 'Latihan', icon: 'cal', fn: pLatihan },
  { sec: 'Tim' },
  { id: 'skuad', hint: 'Semua pemain klub Anda', name: 'Skuad', icon: 'shirt', fn: pSkuad },
  { id: 'xi', hint: 'Formasi & susunan terbaik', name: 'Susunan Terbaik', icon: 'xi', fn: pXI },
  { id: 'akademi', hint: 'Pemain muda & potensinya', name: 'Akademi', icon: 'youth', fn: pAkademi },
  { sec: 'Pasar' },
  { id: 'scout', hint: 'Cari pemain di seluruh database', name: 'Scouting', icon: 'scout', fn: pScout },
  { id: 'panduan', hint: 'Atribut kunci per posisi & standar kelas dunia', name: 'Panduan Rekrutmen', icon: 'trophy', fn: pPanduan },
  { id: 'peran', hint: 'Cari pemain untuk peran tertentu', name: 'Pencari Peran', icon: 'target', fn: pPeran },
  { id: 'target', hint: 'Incaran transfer & sesi minta DoF menawar', name: 'Target Transfer', icon: 'star', fn: pTarget },
  { id: 'pantau', hint: 'Pemain yang Anda tandai', name: 'Daftar Pantau', icon: 'list', fn: pPantau },
  { id: 'banding', hint: 'Bandingkan hingga 3 pemain', name: 'Bandingkan', icon: 'cmp', fn: pBanding },
  { sec: 'Klub' },
  { id: 'staf', hint: 'Cari pelatih, scout & staf medis', name: 'Staf', icon: 'whistle', fn: pStaf },
  { sec: 'Alat' },
  { id: 'cheat', hint: 'Ubah data langsung di FM27', name: 'Pusat Cheat', icon: 'cheat', fn: pCheat },
  { id: 'atur', hint: 'Lokasi file & sumber data', name: 'Pengaturan', icon: 'set', fn: pAtur, hide: true }, // tidak tampil di menu (lokasi terdeteksi otomatis); tetap bisa dibuka lewat #atur
];

// Menu samping ringkas: halaman sejenis digabung jadi satu entri; di halamannya muncul tab untuk berpindah.
const NAV_GRP = { skuad: 'skuad', xi: 'skuad', akademi: 'skuad', scout: 'cari', database: 'cari', peran: 'cari', panduan: 'cari', target: 'transfer', pantau: 'transfer', banding: 'transfer' };
const NAV_GRP_META = { skuad: { name: 'Skuad', icon: 'shirt', hint: 'Pemain, susunan terbaik & akademi' }, cari: { name: 'Cari Pemain', icon: 'scout', hint: 'Scouting, database, pencari peran & panduan' }, transfer: { name: 'Transfer', icon: 'star', hint: 'Target, daftar pantau & bandingkan' } };
let KT_SUM = null, KT_REQ = false;
const navBadge = id => { const k = KT_SUM; if (!k || !k.ok) return ''; const v = { skuad: [k.squadN, 0], latihan: [k.training && k.training.issues, 1], target: [k.targetsN, 0], pantau: [k.shortlistN, 0], beranda: [k.jobs && k.jobs.length, 0], akademi: [k.youthN, 0] }[id]; return v && v[0] ? `<span class="nb${v[1] ? ' r' : ''}">${v[0]}</span>` : ''; };
const navLast = g => { try { return localStorage.getItem('navLast_' + g); } catch { return null; } };
// Menu samping datar (gaya daftar berkelompok): setiap halaman tampil, judul kelompok berwarna, angka kecil di kanan
const SEC_CLS = { 'Hari Ini': 'hi', 'Tim': 'tim', 'Pasar': 'pasar', 'Klub': 'klub', 'Alat': 'alat' };
function renderNav() {
  const cur = (location.hash.slice(1).split('?')[0]) || 'beranda';
  if (!KT_SUM && !KT_REQ && STATUS && STATUS.ok) { KT_REQ = true; api('/api/kantor').then(k => { KT_SUM = k; renderNav(); }).catch(() => { }); }
  const html = []; let sc = '';
  for (const r of ROUTES) {
    if (r.hide) continue;
    if (r.sec) { sc = SEC_CLS[r.sec] || ''; html.push(`<div class="nav-label s-${sc}">${r.sec}</div>`); continue; }
    const on = r.id === cur;
    html.push(`<a href="#${r.id}" class="nv s-${sc}${on ? ' on' : ''}" title="${esc(r.hint || r.name)}"${on ? ' aria-current="page"' : ''}>${ic(r.icon, 17)}<span>${r.name}</span>${navBadge(r.id)}</a>`);
  }
  $('#nav').innerHTML = html.join('');
}
function hubTabs() { } // tab hub tidak dipakai lagi: semua halaman ada di menu samping
async function route() {
  renderNav();
  const id = (location.hash.slice(1).split('?')[0]) || 'beranda';
  const r = ROUTES.find(x => x.id === id) || ROUTES[1];
  const page = $('#page'); page.scrollTop = 0; page.dataset.p = id;
  if (STATUS && !STATUS.ok && !['cheat', 'atur'].includes(id)) { page.innerHTML = noData(); return; }
  page.innerHTML = loading();
  try { await r.fn(page); hubTabs(page, r.id); buildSubnav(page); } catch (e) { page.innerHTML = `<div class="empty"><div style="font-size:46px">🙈</div><h2>Ups, ada yang tidak beres</h2><p>${esc(e.message)}</p><button class="btn primary" onclick="reload()">${ic('refresh', 16)} Coba lagi</button></div>`; }
}
// Sub-menu yang menempel di atas halaman panjang (Pusat Cheat, Panduan, dll.)
const secLabel = h => { const t = (h.childNodes[0] ? h.childNodes[0].textContent : h.textContent) || ''; return t.replace(/^[^A-Za-z0-9À-ÿ]+/, '').replace(/^\d+\s*·\s*/, '').replace(/\s*\(.*\)\s*$/, '').trim().slice(0, 24); };
// Mode TAB: kartu bertanda [data-tab] — hanya tab aktif yang tampil ([data-keep] selalu tampil)
let TAB_CUR = {};
const TAB_SHORT = [[/^Atribut Tanpa Filter/, 'Atribut Tanpa Filter'], [/^Board/, 'Board'], [/^Tim:/, 'Tim'], [/^Push CA/, 'Push CA→PA'], [/^Potensi/, 'Potensi'], [/^Kontrak/, 'Kontrak'], [/^Kondisi/, 'Kondisi'], [/^Izin Kerja/, 'Izin & Klausul'], [/^Klub Menerima/, 'Klub Terima Tawaran'], [/^Klub Superstar/, 'Klub Superstar'], [/^Manajer Disukai Staf/, 'Disukai Staf'], [/^Manajer Disukai/, 'Manajer Disukai'], [/^Registrasi/, 'Registrasi'], [/^Youth/, 'Youth Intake'], [/^Edit per/, 'Edit Atribut'], [/^Riwayat/, 'Riwayat'], [/^Sedang Dipetakan/, 'Segera Hadir'], [/^Mode Comeback/, 'Mode Comeback'], [/^Maksimalkan Atribut Staf/, 'Atribut Staf']];
// Pusat Cheat: kelompok + penjelasan singkat tiap tab [kelompok, penjelasan, kata kunci]
const TAB_GROUPS = [['Klub & Board', '🏛️', 'fasilitas, uang, suasana tim'], ['Pertandingan', '⚽', 'bantu menang di laga'], ['Kontrak & Transfer', '🤝', 'beli, jual, gaji, izin'], ['Staf', '🧑‍💼', 'pelatih, scout, fisio'], ['Kuatkan Pemain', '💪', 'pemain Anda jadi lebih bagus'], ['Lawan', '💥', 'buat tim lain mudah dikalahkan'], ['Lainnya', '🧰', 'tampilan FM & riwayat']];
// Cheat yang tidak memakai kartu "Pilih Cakupan" (punya target sendiri / selalu klub saya)
const NO_SCOPE = new Set(['Klub Superstar', 'Board', 'Keuangan Klub', 'Youth Intake', 'Hancurkan Tim', 'Mode Comeback', 'Riwayat', 'Segera Hadir', 'Atribut Tanpa Filter']);
const TAB_META = {
  'Push CA→PA': ['Kuatkan Pemain', 'Naikkan kemampuan sekarang mendekati potensi', 'ca kemampuan naik cepat'],
  'Potensi': ['Kuatkan Pemain', 'Ubah potensi maksimal (PA)', 'pa bakat'],
  'Pemain Legenda': ['Kuatkan Pemain', 'Jadikan pemain seperti legenda dunia', 'legend'],
  'Edit Atribut': ['Kuatkan Pemain', 'Ubah satu atribut tertentu', 'atribut nilai'],
  'Kondisi': ['Kuatkan Pemain', 'Sembuhkan cedera, segarkan, bikin bahagia', 'cedera kebugaran moral senang'],
  'Youth Intake': ['Kuatkan Pemain', 'Pemain muda baru otomatis berbakat', 'akademi muda intake'],
  'Kontrak': ['Kontrak & Transfer', 'Atur gaji & lama kontrak', 'gaji kontrak'],
  'Izin & Klausul': ['Kontrak & Transfer', 'Izin kerja, klausul rilis, trait', 'work permit klausul trait'],
  'Klub Terima Tawaran': ['Kontrak & Transfer', 'Klub lain mau menjual ke Anda', 'transfer beli tawaran'],
  'Klub Superstar': ['Kontrak & Transfer', 'Pemain top mau bergabung walau klub Anda kecil', 'yamal mau gabung minat reputasi semua suka'],
  'Registrasi': ['Kontrak & Transfer', 'Daftarkan pemain di kompetisi', 'registrasi daftar liga'],
  'Board': ['Klub & Board', 'Selesaikan permintaan fasilitas yang sudah disetujui board (board selalu setuju: belum tersedia)', 'board dewan fasilitas'],
  'Keuangan Klub': ['Klub & Board', 'Saldo, anggaran transfer & gaji', 'uang saldo anggaran'],
  'Tim': ['Klub & Board', 'Latihan & kekompakan tim', 'kekompakan latihan'],
  'Manajer Disukai': ['Klub & Board', 'Semua pemain menyukai Anda', 'hubungan suka'],
  'Mode Comeback': ['Pertandingan', 'Tim Anda jadi super & lawan dilemahkan untuk satu laga', 'comeback menang laga power boost balik'],
  'Hancurkan Tim': ['Lawan', 'Rusak mental tim/liga lawan', 'destroy lawan mental'],
  'Disukai Staf': ['Staf', 'Semua staf menyukai Anda', 'staf suka'],
  'Atribut Staf': ['Staf', 'Maksimalkan atribut staf', 'pelatih staf'],
  'Atribut Tanpa Filter': ['Lainnya', 'Angka atribut pasti tampil di FM', 'masking scout angka'],
  'Riwayat': ['Lainnya', 'Lihat & batalkan perubahan', 'undo batal'],
  'Segera Hadir': ['Lainnya', 'Cheat yang sedang dikerjakan', ''],
};
function buildTabs(page) {
  page.querySelectorAll('.subnav').forEach(n => n.remove());
  const key = location.hash.split('?')[0];
  const all = [...page.querySelectorAll('[data-tab]')].filter(c => !c.closest('[data-panel-off]'));
  if (!all.length) return false;
  const names = [...new Set(all.map(c => c.dataset.tab))];
  if (!names.includes(TAB_CUR[key]) && TAB_CUR[key] !== '*') TAB_CUR[key] = null;
  const nav = document.createElement('nav'); nav.className = 'subnav tabs-mode';
  const grouped = names.filter(n => TAB_META[n]).length >= 4;
  const M = n => TAB_META[n] || ['Lainnya', '', ''];
  const gs = TAB_GROUPS.map(([g, ic, sub]) => [g, ic, sub, names.filter(n => M(n)[0] === g)]).filter(x => x[3].length);
  const qOf = n => (n + ' ' + M(n)[1] + ' ' + M(n)[2]).toLowerCase();
  if (grouped && gs.length && TAB_CUR[key] !== '*' && !gs.some(x => x[3].includes(TAB_CUR[key]))) TAB_CUR[key] = gs[0][3][0]; // mulai dari kelompok pertama (Klub & Board)
  if (TAB_CUR[key] == null) TAB_CUR[key] = names[0];
  if (grouped) {
    // Bar atas 2 tingkat: baris 1 = kelompok, baris 2 = cheat di kelompok terpilih saja
    nav.className = 'subnav cgbar';
    nav.innerHTML = `<div class="cg-groups">${gs.map(([g, ic, sub]) => `<button class="cg-g" data-grp="${esc(g)}" title="${esc(sub)}"><span>${ic}</span>${esc(g)}</button>`).join('')}<input class="inp cg-q" placeholder="🔎 Cari cheat…"></div>
      <div class="cg-items"></div><div class="cg-hint"></div>`;
  } else nav.innerHTML = names.map(n => `<button data-tabgo="${esc(n)}">${esc(n)}</button>`).join('') + '<button data-tabgo="*" class="all">Semua</button>';
  const head = page.querySelector('.page-head');
  const anchor = grouped && head ? head : (page.querySelector('[data-keep]') || head); anchor.after(nav);
  const items = nav.querySelector('.cg-items'), hint = nav.querySelector('.cg-hint');
  const show = n => {
    TAB_CUR[key] = n;
    page.querySelectorAll('[data-tab]').forEach(c => { const on = n === '*' || c.dataset.tab === n; c.classList.toggle('tab-hide', !on); c.classList.toggle('tab-solo', on && n !== '*'); });
    page.querySelectorAll('.sec-h').forEach(h => h.classList.toggle('tab-hide', n !== '*'));
    nav.querySelectorAll('[data-tabgo]').forEach(b => b.classList.toggle('on', b.dataset.tabgo === n));
    if (hint) hint.textContent = n !== '*' && M(n)[1] ? 'ℹ️ ' + M(n)[1] : '';
    const keep = page.querySelector('[data-keep]'); if (keep && grouped) keep.classList.toggle('tab-hide', n !== '*' && NO_SCOPE.has(n)); const at = page.querySelector('#autoTgt'); if (at && grouped) at.classList.toggle('tab-hide', n !== '*' && NO_SCOPE.has(n));
  };
  const bind = () => nav.querySelectorAll('[data-tabgo]').forEach(b => b.onclick = () => { show(b.dataset.tabgo); });
  const fill = list => { items.innerHTML = list.map(n => `<button data-tabgo="${esc(n)}" title="${esc(M(n)[1])}">${esc(n)}</button>`).join('') || '<span class="muted">Tidak ada cheat yang cocok</span>'; bind(); };
  const pickGroup = (g, keep) => {
    TAB_CUR[key + '#g'] = g;
    nav.querySelectorAll('.cg-g').forEach(b => b.classList.toggle('on', b.dataset.grp === g));
    const ns = (gs.find(x => x[0] === g) || [, , , []])[3]; fill(ns);
    show(keep && ns.includes(TAB_CUR[key]) ? TAB_CUR[key] : ns[0]);
  };
  if (grouped) {
    nav.querySelectorAll('.cg-g').forEach(b => b.onclick = () => { nav.querySelector('.cg-q').value = ''; pickGroup(b.dataset.grp); });
    const q = nav.querySelector('.cg-q');
    q.oninput = () => { const s = q.value.trim().toLowerCase(); if (!s) return pickGroup(TAB_CUR[key + '#g'] || gs[0][0], true); nav.querySelectorAll('.cg-g').forEach(b => b.classList.remove('on')); const hit = names.filter(n => qOf(n).includes(s)); fill(hit); if (hit.length) show(hit[0]); };
    const qt = new URLSearchParams(location.hash.split('?')[1] || '').get('tab'); if (qt && names.includes(qt)) TAB_CUR[key] = qt;
    const cur = TAB_CUR[key] && TAB_CUR[key] !== '*' ? TAB_CUR[key] : names[0];
    TAB_CUR[key] = cur; pickGroup(M(cur)[0], true);
    return true;
  }
  bind();
  show(TAB_CUR[key]);
  return true;
}
function buildSubnav(page) {
  if (page.querySelector('[data-tab]')) return buildTabs(page);
  const heads = [...page.querySelectorAll('.sec-h, .card > h3')].filter(h => h.offsetParent !== null);
  if (heads.length < 6) return;
  const label = secLabel;
  const items = heads.map((h, i) => { h.id = h.id || 'sec-' + i; return { id: h.id, t: label(h), el: h }; }).filter(x => x.t);
  const nav = document.createElement('nav'); nav.className = 'subnav';
  nav.innerHTML = items.map(x => `<button data-go="${x.id}">${esc(x.t)}</button>`).join('');
  const head = page.querySelector('.page-head'); (head ? head.after(nav) : page.prepend(nav));
  nav.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const el = document.getElementById(b.dataset.go); if (!el) return; const y = el.getBoundingClientRect().top - page.getBoundingClientRect().top + page.scrollTop - nav.offsetHeight - 14; page.scrollTo({ top: y, behavior: 'smooth' }); });
  const spy = () => { let cur = items[0]; for (const x of items) { if (x.el.offsetParent && x.el.getBoundingClientRect().top - page.getBoundingClientRect().top < nav.offsetHeight + 40) cur = x; } nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.go === cur.id)); };
  page.onscroll = spy; spy();
}
function noData() {
  return `<div class="empty"><div style="font-size:46px">⚽</div><h2>Belum ada data save</h2>
  <p style="max-width:520px;margin:8px auto 20px">${esc(STATUS?.error || '')}<br>Buka Football Manager, muat save Anda, lalu jalankan pembaca data. Aplikasi akan memuat ulang otomatis.</p>
  <div class="row-flex" style="justify-content:center"><button class="btn primary" onclick="launch('reader')">${ic('play', 16)} Jalankan Pembaca Data</button><button class="btn" onclick="reload()">${ic('refresh', 16)} Muat Ulang</button></div></div>`;
}

// ---------- Status & header ----------
async function refreshStatus() {
  try { STATUS = await api('/api/status'); } catch { STATUS = { ok: false, error: 'Server tidak merespons' }; }
  try { PLUGIN = await api('/api/plugin'); } catch { PLUGIN = { ok: false }; }
  try { VERSI = await api('/api/versi'); } catch { VERSI = null; }
  try { YI = await api('/api/youth'); } catch { YI = null; }
  if (VERSI && VERSI.app) document.title = 'Asisten FM27 v' + VERSI.app.version;
  const m = STATUS.meta || {};
  $('#clubChip').innerHTML = STATUS.ok ? `${m.clubIds ? '' : ''}<img src="/logo/${STATUS.clubId || ''}" onerror="this.outerHTML='<span class=logo-ph>${esc((STATUS.club || '?')[0])}</span>'" id="clubLogo"><div><b>${esc(STATUS.club)}</b><span>${esc(m.manager || '')} · ${m.gameDate ? new Date(m.gameDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span></div>` : '<div><b>Asisten FM27</b><span>Menunggu data</span></div>';
  const age = STATUS.dumpAge != null ? Math.round(STATUS.dumpAge / 60000) : null;
  // Status: yang normal digabung jadi satu kapsul "Semua siap"; hanya yang bermasalah tampil dengan label
  const st = [
    { tone: STATUS.fm ? 'ok' : 'bad', label: 'FM ' + (STATUS.fm ? 'aktif' : 'tertutup') },
    VERSI && VERSI.mode !== 'tanpa-fm' ? { tone: VERSI.mode === 'cocok' ? 'ok' : VERSI.mode === 'baru-lolos' ? 'warn' : 'bad', label: VERSI.mode === 'cocok' ? 'Versi cocok' : VERSI.mode === 'baru-lolos' ? 'Update FM · lolos uji' : /Menunggu save/.test(VERSI.msg || '') ? 'Menunggu save' : 'Update FM · cheat dikunci', title: VERSI.msg } : null,
    { tone: STATUS.reader ? 'ok' : 'warn', label: 'Pembaca ' + (STATUS.reader ? 'aktif' : 'mati'), title: 'Pembaca memori (Teknik Oda / FMSuperScout)' },
    { tone: PLUGIN.ok ? 'ok' : 'warn', label: 'Buka di FM ' + (PLUGIN.ok ? 'siap' : 'manual'), title: PLUGIN.ok ? 'Profil bisa dibuka langsung di FM27' : PLUGIN.why },
    { tone: age == null ? 'bad' : age < 30 ? 'ok' : 'warn', label: age == null ? 'Tanpa data' : age < 1 ? 'Data baru saja' : age < 60 ? `Data ${age} mnt lalu` : `Data ${Math.round(age / 60)} jam lalu` },
  ].filter(Boolean);
  if (YI && YI.active) st.push({ tone: 'warn', label: '🌱 Youth intake aktif · ' + (YI.label || '') + ' · PA ' + YI.min + '–' + YI.max, title: 'Youth intake emas berjalan otomatis. Klik untuk mengatur / mematikan di Pusat Cheat.', yi: true });
  const okS = st.filter(x => x.tone === 'ok'), badS = st.filter(x => x.tone !== 'ok');
  $('#pills').innerHTML = badS.map(x => `<span class="pill ${x.tone}" title="${esc(x.title || x.label)}"${x.yi ? ' style="cursor:pointer" onclick="location.hash=&quot;cheat&quot;"' : ''}><i></i>${esc(x.label)}</span>`).join('')
    + (okS.length ? `<span class="pill ok" title="${esc(okS.map(x => '✓ ' + x.label).join('\n'))}"><i></i>${badS.length ? okS.length + ' siap' : 'Semua siap'}</span>` : '');
  const av = VERSI && VERSI.app ? `<br><b class="app-ver" style="cursor:pointer;text-decoration:underline dotted" title="Lihat catatan perubahan" onclick="showChangelog()">Asisten v${esc(VERSI.app.version)}</b> · untuk FM ${esc(VERSI.app.fm)}${VERSI.fp && VERSI.fp.built ? ` · build FM ${esc(VERSI.fp.built)}` : ''}` : '';
  renderStatbar();
  $('#sideFoot').innerHTML = (STATUS.ok ? `${(STATUS.players || 0).toLocaleString('id')} pemain · ${(STATUS.staff || 0).toLocaleString('id')} staf<br>${esc(m.game || '')} v${esc(m.gameVersion || '')}` : 'Data belum dimuat') + av;
}
// ---------- Status bar bawah (gaya Teknik Oda): klik = muat ulang data ----------
function renderStatbar() {
  const el = $('#statbar'); if (!el || !STATUS) return;
  const o = STATUS.oda || {}; const m = STATUS.meta || {}; const y = STATUS.youth;
  const reading = o.state && o.state !== 'done' && o.state !== 'idle';
  const pct = o.progress != null ? Math.round(o.progress) + '%' : '';
  const last = o.at ? new Date(o.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—';
  let yt = '';
  if (y && !y.unknown) {
    const rng = `${fmtDM(y.start)}–${fmtDM(y.end)}`;
    yt = y.phase === 'berlangsung' ? `<span class="sb-y now" title="Youth intake ${esc(y.nation)} sedang berlangsung">⚽ Youth intake ${esc(y.nation)} berlangsung · ${rng}</span>`
      : `<span class="sb-y ${y.phase === 'segera' ? 'soon' : ''}" title="Jadwal youth intake ${esc(y.nation)} (${esc(y.div || '')})">⚽ Youth intake ${esc(y.nation)}: ${rng} · ${y.daysToStart} hari lagi</span>`;
  } else if (y && y.unknown) yt = `<span class="sb-y" title="Jadwal negara ini belum ada di tabel">⚽ Youth intake ${esc(y.nation)}: jadwal tidak diketahui</span>`;
  el.innerHTML = `<button class="sb-st ${reading ? 'busy' : STATUS.reader ? 'ok' : 'off'}" id="sbReload" title="Klik untuk memuat ulang data sekarang"><i></i>${reading ? 'Membaca… ' + pct : STATUS.reader ? 'Siap' : 'Pembaca mati'}</button>
    <span>Terakhir dibaca ${last}</span><span>Tanggal game ${fmtDate(m.gameDate) || '—'}</span>${o.players ? `<span>${o.players.toLocaleString('id')} pemain · ${(o.staff || 0).toLocaleString('id')} staf</span>` : ''}${yt}`;
  $('#sbReload').onclick = async () => { const b = $('#sbReload'); b.classList.add('spin'); try { await reload(); } finally { b.classList.remove('spin'); } };
  const sy = el.querySelector('.sb-y'); if (sy) sy.onclick = () => { location.hash = '#cheat'; };
  if (y && !y.unknown && (y.phase === 'segera' || y.phase === 'berlangsung')) { // pengingat sekali per tahap
    const d = y.daysToStart; const k = 'yt|' + y.club + '|' + y.start + '|' + (y.phase === 'berlangsung' ? 0 : d <= 1 ? 1 : d <= 7 ? 7 : d <= 14 ? 14 : 30);
    let seen = ''; try { seen = localStorage.getItem(k); } catch { }
    if (!seen) { try { localStorage.setItem(k, '1'); } catch { } youthPrompt(y); }
  }
}
const fmtDM = d => { const t = new Date(d + 'T00:00:00'); return isNaN(t) ? d : t.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); };
async function youthPrompt(y) {
  const c = await api('/api/youth').catch(() => ({}));
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" role="dialog"><div class="mi">⚽</div><h2>${y.phase === 'berlangsung' ? 'Youth intake sedang berlangsung' : 'Youth intake ' + (y.daysToStart <= 1 ? 'besok' : 'dalam ' + y.daysToStart + ' hari')}</h2>
    <div class="mb"><b>${esc(y.club)}</b> · ${esc(y.div || '')} (${esc(y.nation)})<br>Jadwal FM: <b>${fmtDM(y.start)} – ${fmtDM(y.end)}</b>
    <p style="margin:10px 0 0">${c.active ? `✅ Booster aktif: PA <b>${c.min}–${c.max}</b> · cakupan ${esc(c.label || '')}` : '⚠️ Booster youth intake <b>belum diatur</b>. Atur sekarang supaya regen dari intake ini langsung mendapat PA tinggi.'}</p></div>
    <div class="ma"><button class="btn" data-a="0">Nanti</button><button class="btn primary" data-a="1">${c.active ? 'Lihat pengaturan' : 'Atur sekarang'}</button></div></div>`;
  document.body.appendChild(bg);
  bg.querySelector('[data-a="0"]').onclick = () => bg.remove();
  bg.querySelector('[data-a="1"]').onclick = () => { bg.remove(); location.hash = '#cheat'; setTimeout(() => { const t = document.querySelector('[data-tab-btn*="youth" i], [data-tab="youth"]'); if (t) t.click(); }, 400); };
}
const fmtDate = d => { if (!d) return ''; const t = new Date(d); return isNaN(t) ? d : t.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); };
async function launch(what) { try { const r = await post('/api/launch', { what }); toast(r.ok ? 'Dijalankan ✓' : r.error); } catch (e) { toast(e.message); } }
async function reload() { await api('/api/reload'); await refreshStatus(); route(); toast('Data dimuat ulang'); }
window.launch = launch; window.reload = reload;

// ---------- Tabel pemain generik ----------
function playerTable(rows, opts = {}) {
  const cols = opts.cols || ['name', 'pos', 'age', 'capa', 'rating', 'pers', 'value', 'wage', 'exp'];
  const H = { name: 'Pemain', pos: 'Posisi', age: 'Usia', capa: 'CA / PA', rating: 'Rating', pers: 'Kepribadian', value: 'Nilai', wage: 'Gaji', exp: 'Kontrak', club: 'Klub', role: 'Skor Peran', gap: 'Ruang Tumbuh', sim: 'Kemiripan', join: 'Mau Gabung?' };
  const sortKey = { age: 'age', capa: 'ca', rating: 'rating', value: 'value', wage: 'wage', exp: 'exp', gap: 'gap', name: 'name', join: 'join' };
  const C = {
    name: p => `<td><div class="pname">${ava(p.name, 0, p.id)}<div><b${p.noName ? ' class="muted" title="Pemain buatan FM saat karier dimulai — namanya tidak terbaca oleh Teknik Oda. Tekan ▶ untuk melihat namanya di FM."' : ''}>${esc(p.name)}</b><small>${logo(p.clubId)}${esc(p.club)} · ${esc(p.nat)}</small></div>${fmBtn(p.id, 'P', p.name)}</div></td>`,
    pos: p => `<td><span class="badge pos">${esc(p.pos)}</span></td>`,
    age: p => `<td class="num">${p.age}</td>`,
    capa: p => `<td>${capa(p.ca, p.pa)}</td>`,
    rating: p => `<td><span class="score ${sCls(p.rating)}" title="${esc(p.bpLabel)}">${p.rating.toFixed(0)}</span> <small class="muted">${esc(p.bp)}</small></td>`,
    pers: p => `<td>${persBadge(p.pers, p.persTone)}</td>`,
    value: p => `<td class="num">${money(p.value)}</td>`,
    wage: p => `<td class="num">${wage(p.wage)}</td>`,
    exp: p => `<td>${expTxt(p)}</td>`,
    club: p => `<td>${logo(p.clubId)}${esc(p.club)}</td>`,
    role: p => `<td><span class="score ${sCls(p.roleScore)}">${p.roleScore.toFixed(1)}</span></td>`,
    gap: p => `<td class="num"><b style="color:var(--brand)">+${p.pa - p.ca}</b></td>`,
    sim: p => `<td class="num">${p.sim}%</td>`,
    join: p => p.join == null ? '<td class="muted">—</td>' : `<td title="${esc('Perkiraan ' + p.join + '/100' + (p.joinWhy ? ': ' + p.joinWhy : ''))}"><span class="badge ${p.join >= 70 ? 'good' : p.join >= 50 ? 'ok' : p.join >= 30 ? 'warn' : 'bad'}">${p.join >= 70 ? 'Sangat mungkin' : p.join >= 50 ? 'Mungkin' : p.join >= 30 ? 'Sulit' : 'Hampir mustahil'}</span> <small class="muted">${p.join}</small></td>`,
  };
  if (!rows.length) return `<div class="empty" style="padding:36px"><div style="font-size:34px">🔍</div><b style="color:var(--ink)">Tidak ada pemain yang cocok</b><p style="margin:6px 0 0">Coba longgarkan filter, misalnya batas usia atau nilai.</p></div>`;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${cols.map(c => `<th data-sort="${sortKey[c] || ''}" class="${opts.sort === sortKey[c] ? 'sorted' : ''} ${['age', 'value', 'wage', 'gap', 'sim'].includes(c) ? 'num' : ''}">${H[c]}${opts.sort === sortKey[c] ? (opts.dir === 'asc' ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(p => `<tr class="click" data-id="${p.id}">${cols.map(c => C[c](p)).join('')}</tr>`).join('')}</tbody></table></div>`;
}
document.addEventListener('click', e => {
  const fb = e.target.closest('[data-fm]');
  if (fb) { e.stopPropagation(); openInFM(fb.dataset.fmn, Number(fb.dataset.fm), fb.dataset.fmk); return; }
  const tr = e.target.closest('[data-id]');
  if (tr && !e.target.closest('button')) openPlayer(Number(tr.dataset.id));
});

// ---------- Halaman: Beranda ----------
const greet = () => { const h = new Date().getHours(); return h < 11 ? ['Selamat pagi', '🌤️'] : h < 15 ? ['Selamat siang', '☀️'] : h < 18 ? ['Selamat sore', '🌇'] : ['Selamat malam', '🌙']; };
async function pBeranda(page) {
  const k = await api('/api/kantor');
  const d = k.dash || {}, m = d.meta || {};
  KT_SUM = k; renderNav();
  if (k.unemployed) { // manajer tanpa klub: jangan tampilkan data karier lain — tampilkan lowongan
    const v = k.vacancies || [];
    page.innerHTML = `<div class="rm-head"><div><h1>Ruang Manajer</h1><p>${greet()[0]}, ${esc((k.manager || 'Manajer').split(' ')[0])} · ${esc(fmtDate(k.gameDate))}</p></div><div class="row-flex"><button class="btn" onclick="reload()">${ic('refresh', 16)} Muat ulang</button></div></div>
      <div class="card" style="margin-bottom:14px"><h3>💼 Anda sedang tanpa klub</h3><p class="muted" style="margin:0;line-height:1.6">Fitur skuad, latihan & cheat klub aktif kembali begitu Anda menerima pekerjaan di FM (lalu Teknik Oda membaca save lagi). Sementara itu, berikut <b>klub yang belum punya manajer</b> — lamar lewat FM: <b>Profil Anda → Lowongan Pekerjaan</b>. Klub dengan reputasi tinggi biasanya menolak manajer baru tanpa pengalaman; mulailah dari klub yang realistis.</p></div>
      <div class="card"><h3>Lowongan Manajer <small>${v.length} klub · urut reputasi</small></h3>${v.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Klub</th><th>Liga</th><th class="num">Reputasi</th><th class="num">Kekuatan (CA 16 terbaik)</th><th class="num">Pemain senior</th></tr></thead><tbody>${v.map(c => `<tr><td>${logo(c.clubId)} <b>${esc(c.club)}</b></td><td>${esc(c.div || '—')}</td><td class="num">${c.rep ? (c.rep / 100).toFixed(0) : '—'}</td><td class="num">${c.ca}</td><td class="num">${c.n}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Tidak ada klub tanpa manajer yang terbaca saat ini.</p>'}</div>`;
    return;
  }
  const kpi = `<div class="rm-kpi">
    <div><small>Kekuatan skuad</small><b>${d.avgCa ?? '—'}</b><span>CA rata-rata · #${d.leagueRank || '—'} di liga</span></div>
    <div><small>Nilai skuad</small><b>${money(d.squadValue)}</b><span>${d.squadSize || 0} pemain</span></div>
    <div><small>Beban gaji</small><b>${money(d.wageBill)}</b><span>per minggu</span></div>
    <div><small>Kondisi tim</small><b>${k.fitness && k.fitness.avgCond != null ? k.fitness.avgCond + '%' : '—'}</b><span>${k.fitness ? k.fitness.tired + ' pemain lelah' : 'menunggu data'}</span></div></div>`;
  const head = `<div class="rm-head"><div><h1>Ruang Manajer</h1><p>${greet()[0]}, ${esc((m.manager || 'Manajer').split(' ')[0])} · ${esc(k.todayTxt ? k.todayTxt + ' ' + String(k.today).slice(0, 4) : fmtDate(m.gameDate))}${k.updated ? ` · dibaca dari FM ${esc(String(k.updated).slice(11, 16))}` : ''}</p></div>
    <div class="row-flex"><button class="btn" onclick="reload()">${ic('refresh', 16)} Muat ulang</button><a class="btn primary" href="#latihan">${ic('cal', 16)} Latihan minggu ini</a></div></div>`;
  if (!k.ok) {
    page.innerHTML = head + kpi + `<div class="card"><h3>Data karier belum tersedia</h3><p class="muted">${esc(k.error)}</p></div><div class="grid g-main" style="margin-top:14px"><div class="card"><h3>Pemain Bintang</h3><div class="list">${(d.stars || []).map(liPlayer).join('')}</div></div><div class="card"><h3>Saran Asisten</h3>${(d.alerts || []).map(a => `<div class="alert ${a.tone}" data-id="${a.id}"><span class="dot"></span><span>${esc(a.text)}</span></div>`).join('')}</div></div>`;
    return;
  }
  const RES = { G: 'Menang', M: 'Kalah', B: 'Imbang' };
  const card = (icon, lbl, ttl, meta, body, href) => `<${href ? `a href="${href}"` : 'div'} class="rm-card"><div class="rm-lbl">${ic(icon, 13)}<span>${lbl}</span></div><div class="rm-ttl">${ttl}</div>${meta ? `<div class="rm-meta">${meta}</div>` : ''}${body || ''}</${href ? 'a' : 'div'}>`;
  const n = k.next, t = k.tactic, f = k.fitness, l = k.last, tb = k.table;
  const left = [
    n ? card('target', 'Lawan berikutnya', esc(n.rakip), `${n.inDays === 0 ? 'hari ini' : n.inDays === 1 ? 'besok' : n.inDays + ' hari lagi'} · ${n.evde ? 'kandang' : 'tandang'} · ${esc(n.kisa || n.turnuva)}${n.theirPos ? ` · peringkat ${n.theirPos}` : ''}`, `<div class="rm-txt clamp">${esc(n.note)}${n.importance ? ' ' + esc(n.importance) + '.' : ''}</div>`) : '',
    t ? card('xi', 'Taktik', esc(t.name), `${esc(t.shape || '')} · ${esc(t.mentality || '')}${t.pressing ? ` · pressing ${t.pressing}` : ''}`, t.captain ? `<div class="rm-txt">Kapten: <b>${esc(t.captain)}</b></div>` : '', '#xi') : '',
    f ? card('squad', 'Kebugaran & absen', `${f.injured.length} cedera${f.bans.length ? ` · ${f.bans.length} larangan` : ''}`, f.lowXI ? `Terendah di XI: ${esc(f.lowXI.name)} ${f.lowXI.cond}%` : '', `<div class="rm-txt">${f.injured.length ? 'Cedera: ' + f.injured.map(x => esc(x.name)).join(', ') + '. ' : ''}${f.bans.length ? 'Larangan: ' + f.bans.map(x => esc(x.name)).join(', ') + '. ' : ''}${f.tired} pemain senior lelah / kondisi &lt; 85%.</div>`, '#latihan') : '',
    l ? card('ball', 'Laga terakhir', `${RES[l.res] || ''} ${l.gf}-${l.ga} ${l.evde ? 'vs' : 'di'} ${esc(l.rakip)}`, `${l.xgF != null ? `xG ${l.xgF}–${l.xgA} · ` : ''}${l.shots != null ? l.shots + ' tembakan · ' : ''}${l.tgl}${l.form.length ? `<span class="rm-form">${l.form.map(r => `<i class="${r}">${r === 'G' ? 'M' : r === 'M' ? 'K' : 'S'}</i>`).join('')}</span>` : ''}`, `<div class="rm-txt clamp">${esc(l.summary)}</div>`) : '',
    tb ? card('trophy', 'Target musim', `${esc(tb.league)}: #${tb.pos}, ${tb.pts} poin`, `${tb.played} laga · selisih gol ${tb.gd > 0 ? '+' : ''}${tb.gd}${tb.vs ? ` · ${tb.pos === 1 ? 'unggul' : 'tertinggal'} ${Math.abs(tb.gap)} poin dari ${esc(tb.vs)}` : ''}`, `<div class="rm-txt">${esc(k.target.text || '')}${k.target.board ? `<br><span class="muted">Dewan: ${esc(k.target.board.text)}</span>` : ''}</div>${k.target.board ? `<div class="rm-meter" title="Kepuasan dewan ${k.target.board.note}/10"><i style="width:${Math.max(0, Math.min(10, k.target.board.note)) * 10}%"></i></div>` : ''}`) : '',
  ].join('');
  const tr = k.training, w = k.window;
  const right = [
    tr ? card('cal', 'Latihan', tr.today ? esc(tr.today.label) : 'Jadwal minggu ini', tr.today ? esc(tr.today.sessions.join(' · ')) : '', `<div class="rm-txt">Fokus minggu ini: <b>${esc(tr.focus)}</b>${tr.rating ? ` · rating latihan FM ${tr.rating} (${esc(tr.status || '')})` : ''}.${tr.issue ? `<br><span style="color:var(--red)">⚠ ${esc(tr.issue)}</span>` : ''}</div>`, '#latihan') : '',
    card('list', 'Kontrak', k.contractsN ? `${k.contractsN} kontrak habis ≤ 6 bln` : k.contracts.length ? `${k.contracts.length} habis dalam setahun` : 'Kontrak aman', '', k.contracts.length ? `<div class="rm-mini">${k.contracts.slice(0, 3).map(c => `<div data-id="${c.id}"><b>${esc(c.name)}</b><span>${esc(c.expires)}</span></div>`).join('')}</div>` : '<div class="rm-txt">Tidak ada kontrak senior yang habis dalam 12 bulan.</div>'),
    card('star', 'Transfer', k.targets.length ? esc(k.targets[0].name) : 'Belum ada target', w ? (w.open ? `Jendela transfer terbuka · tutup ${w.days} hari lagi` : `Jendela tutup · buka ${w.days} hari lagi`) : '', k.targets.length ? `<div class="rm-mini">${k.targets.slice(0, 3).map(x => `<div data-id="${x.id}"><b>${esc(x.name)}</b><span>${esc(x.club)}</span></div>`).join('')}</div>` : `<div class="rm-txt">Cari pemain yang realistis mau bergabung lewat preset 🤝 Mau Gabung.</div>`, k.targets.length ? '#target' : '#scout?preset=mau'),
    k.need.length ? card('scout', 'Kebutuhan skuad', esc(k.need[0].label), `${k.need[0].depth} pemain natural · rating terbaik ${k.need[0].top}`, k.need[1] ? `<div class="rm-txt">Berikutnya: ${esc(k.need[1].label)} (${k.need[1].top}).</div>` : '', `#peran?pos=${k.need[0].k}`) : '',
    card('youth', 'Akademi', `${k.youthN} prospek muda`, k.youth[0] ? `Terbaik: ${esc(k.youth[0].name)} (${k.youth[0].age} th)` : '', k.youth.length ? `<div class="rm-mini">${k.youth.map(y => `<div data-id="${y.id}"><b>${esc(y.name)}</b><span>CA ${y.ca} · PA ${y.pa}</span></div>`).join('')}</div>` : '', '#akademi'),
  ].join('');
  const col = c => c >= 85 ? '#22d47f' : c >= 75 ? '#f6a623' : '#ff4d5e';
  const lu = k.lineup;
  const pitch = lu ? `<div class="rm-pitch"><span class="cap">${esc(t ? t.name : 'Susunan FM')}</span><i class="ln half"></i><i class="ln circ"></i><i class="ln box1"></i><i class="ln box2"></i>
    ${lu.players.map(p => `<div class="rm-pl" data-id="${p.id}" style="left:${p.x}%;top:${p.y}%;--c:${p.cond == null ? '#cbd3e0' : col(p.cond)}" title="${esc(p.name)} · ${esc(p.pos)}${p.cond != null ? ' · kondisi ' + p.cond + '%' : ''}"><span class="dot">${p.no || ''}</span><span class="nm">${esc(p.short)}</span>${p.cond != null ? `<span class="cd">${p.cond}%</span>` : ''}</div>`).join('')}
    </div><div class="rm-legend">Susunan dari taktik FM · warna = kondisi (hijau ≥85 · kuning ≥75 · merah)</div>` : `<div class="rm-pitch" style="display:grid;place-items:center"><span style="font-size:13px;opacity:.8">Susunan taktik belum terbaca</span></div>`;
  const ini = String(k.club || '?').split(/\s+/).map(x => x[0]).join('').slice(0, 3).toUpperCase();
  const hero = `<div class="rm-hero"><div class="rm-club">
      <div><div class="rm-crest"><span class="cr">${k.clubId ? `<img src="/logo/${k.clubId}" alt="" onerror="this.replaceWith(document.createTextNode('${esc(ini)}'))">` : esc(ini)}</span><div><h2>${esc(k.club)}</h2><p>${esc(m.manager || '')} · ${esc(d.div || (tb && tb.league) || '')}</p></div></div>
      ${tb ? `<div class="rm-pos"><span>Posisi ${tb.pos} dari ${tb.size}</span><span>${tb.pts} poin</span><span>${k.in7} laga dalam 7 hari</span></div>` : ''}</div>
      ${n ? `<div class="rm-note"><div class="k">Catatan laga berikutnya · ${esc(n.rakip)}</div><div class="v">${esc(n.note || 'Belum ada penilaian dari FM.')}</div><div class="s">${esc([n.expect, n.weather ? 'Cuaca ' + n.weather : ''].filter(Boolean).join(' · '))}</div></div>` : ''}
      <div class="rm-next">${k.upcoming.map(u => `<span><b>${u.evde ? 'K' : 'T'}</b> ${esc(u.rakip)} · ${esc(u.kisa || '')} · ${u.tgl}</span>`).join('')}</div>
    </div><div class="rm-pw">${pitch}</div></div>`;
  const jobs = k.jobs.length ? `<div class="rm-sec">Tugas hari ini</div><div class="rm-jobs">${k.jobs.map((j, i) => `<div class="rm-job"><div class="h"><span class="n">${i + 1}</span>${esc(j.kind)}</div><div class="t">${esc(j.title)}</div><details><summary>Kenapa?</summary>${esc(j.why || '')}</details><div class="a"><a href="${j.link}">${esc(j.linkText)} ›</a>${j.fm ? fmBtn(j.fm, 'P', '') : ''}</div></div>`).join('')}</div>` : '';
  const ask = `<div class="rm-sec">Tanya asisten</div><div class="rm-ask"><input id="rmQ" placeholder="Ketik lalu Enter: siapa yang perlu istirahat? kapan laga berikutnya?"><button class="btn primary" id="rmGo">Tanya</button></div>
    <div class="rm-chips">${['Siapa perlu istirahat?', 'Kapan laga berikutnya?', 'Siapa yang cedera?', 'Posisi apa yang perlu dibeli?', 'Kontrak siapa yang habis?', 'Bagaimana laga terakhir?'].map(q => `<button data-q="${q}">${q}</button>`).join('')}</div><div id="rmA"></div>`;
  page.innerHTML = head + kpi + `<div class="rm-grid"><div class="rm-col">${left}</div><div class="rm-center">${hero}${jobs}${ask}</div><div class="rm-col rm-right">${right}</div></div>`;
  const answer = q => {
    const s = q.toLowerCase(), li = a => `<ul>${a.map(x => `<li>${x}</li>`).join('')}</ul>`;
    if (/istirahat|lelah|rotasi|capek|bugar/.test(s)) return k.restList.length ? `<b>Perlu dikurangi bebannya:</b>${li(k.restList.map(esc))}Detailnya ada di halaman <a href="#latihan">Latihan</a>.` : 'Tidak ada pemain senior yang perlu diistirahatkan saat ini.';
    if (/laga|main|jadwal|lawan|pertandingan/.test(s) && !/terakhir|hasil/.test(s)) return n ? `<b>${esc(n.rakip)}</b> · ${n.evde ? 'kandang' : 'tandang'} · ${esc(n.turnuva)} · ${n.tgl} (${n.inDays === 0 ? 'hari ini' : n.inDays + ' hari lagi'}).${li(k.upcoming.slice(1).map(u => `${u.tgl}: ${u.evde ? 'vs' : '@'} ${esc(u.rakip)} (${esc(u.kisa || '')})`))}` : 'Belum ada jadwal laga.';
    if (/cedera|sakit|absen|larangan|kartu/.test(s)) return f && (f.injured.length || f.bans.length) ? li([...f.injured.map(x => `<b>${esc(x.name)}</b> — ${esc(x.txt)}`), ...f.bans.map(x => `<b>${esc(x.name)}</b> — terkena larangan bermain`)]) : 'Tidak ada pemain senior yang cedera atau terkena larangan.';
    if (/beli|posisi|butuh|lemah|rekrut/.test(s)) return k.need.length ? `<b>Posisi terlemah:</b>${li(k.need.map(x => `${esc(x.label)} — rating terbaik ${x.top}, ${x.depth} pemain natural`))}<a href="#peran?pos=${k.need[0].k}">Cari kandidat ${esc(k.need[0].label)} ›</a>` : 'Semua posisi sudah terisi dengan baik.';
    if (/kontrak|habis|perpanjang/.test(s)) return k.contracts.length ? li(k.contracts.map(c => `<b>${esc(c.name)}</b> — habis ${esc(c.expires)}${c.note ? ' · ' + esc(c.note) : ''}`)) : 'Tidak ada kontrak senior yang habis dalam 12 bulan.';
    if (/terakhir|hasil|skor/.test(s)) return l ? `<b>${RES[l.res] || ''} ${l.gf}-${l.ga} ${l.evde ? 'vs' : 'di'} ${esc(l.rakip)}</b>${l.xgF != null ? ` (xG ${l.xgF}–${l.xgA})` : ''}. ${esc(l.summary)}` : 'Belum ada analisis laga.';
    if (/latihan|training/.test(s)) return tr ? `Hari ini: <b>${esc(tr.today ? tr.today.sessions.join(' · ') : '—')}</b>. Fokus minggu ini: ${esc(tr.focus)}. <a href="#latihan">Buka Latihan ›</a>` : 'Data latihan belum tersedia.';
    return 'Saya belum paham pertanyaan itu. Coba salah satu tombol di atas: istirahat, laga berikutnya, cedera, posisi yang perlu dibeli, kontrak, atau laga terakhir.';
  };
  const go = q => { if (!q.trim()) return; $('#rmA').innerHTML = `<div class="rm-ans"><div class="muted" style="font-size:12px;margin-bottom:4px">${esc(q)}</div>${answer(q)}</div>`; };
  $('#rmGo').onclick = () => go($('#rmQ').value);
  $('#rmQ').onkeydown = e => { if (e.key === 'Enter') go(e.target.value); };
  page.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { $('#rmQ').value = b.dataset.q; go(b.dataset.q); });
}

const liPlayer = p => `<div class="li" data-id="${p.id}">${ava(p.name, 0, p.id)}<div class="grow"><b>${esc(p.name)}</b><small>${esc(p.pos)} · ${p.age} th · ${esc(p.pers)}</small></div>${capa(p.ca, p.pa)}<span class="score ${sCls(p.rating)}">${p.rating.toFixed(0)}</span>${fmBtn(p.id, 'P', p.name)}</div>`;
function leagueBars(rows, mine) {
  const max = Math.max(...rows.map(r => r.ca), 1), min = Math.min(...rows.map(r => r.ca)) - 10;
  return `<div style="display:flex;flex-direction:column;gap:6px">${rows.map((r, i) => `<div style="display:grid;grid-template-columns:22px 180px 1fr 34px;gap:10px;align-items:center;font-size:12.5px;${r.club === mine ? 'font-weight:700;color:var(--brand)' : ''}"><span class="muted">${i + 1}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.club)}</span><div class="bar"><i style="width:${((r.ca - min) / (max - min)) * 100}%;${r.club === mine ? 'background:var(--gold)' : ''}"></i></div><span class="num">${r.ca}</span></div>`).join('')}</div>`;
}

// ---------- Skuad ----------
async function pSkuad(page) {
  const d = await api('/api/squad');
  const qs0 = new URLSearchParams(location.hash.split('?')[1] || '');
  let sort = 'rating', dir = 'desc', filter = qs0.get('f') || 'all', team = localStorage.getItem('skTeam') || 'all';
  // Tim di FM27: 0 = senior, 10 = U21/cadangan, 11/12 = U19/U18; kandidat youth intake = belum berkontrak (Agen Bebas).
  const cand = p => !p.expires && !p.wage && p.age <= 17;
  const TEAM = { all: () => true, senior: p => !p.teamType && !cand(p), u21: p => p.teamType === 10, u18: p => [11, 12].includes(p.teamType) && !cand(p), kandidat: cand };
  const draw = () => {
    let rows = d.rows.filter(p => (TEAM[team] || TEAM.all)(p) && (filter === 'all' || (filter === 'muda' ? p.age <= 21 : filter === 'kontrak' ? p.exp != null && p.exp <= 12 : p.bp === filter)));
    const k = { rating: 'rating', ca: 'ca', age: 'age', value: 'value', wage: 'wage', exp: 'exp', name: 'name' }[sort];
    rows = [...rows].sort((a, b) => ((a[k] ?? 999) > (b[k] ?? 999) ? 1 : -1) * (dir === 'asc' ? 1 : -1));
    page.querySelector('#tb').innerHTML = playerTable(rows, { sort, dir }); const nEl = page.querySelector('#skN'); if (nEl) nEl.textContent = rows.length + ' pemain';
    page.querySelectorAll('th[data-sort]').forEach(th => th.onclick = () => { const s = th.dataset.sort; if (!s) return; dir = sort === s && dir === 'desc' ? 'asc' : 'desc'; sort = s; draw(); });
  };
  const F = [['all', 'Semua'], ['GK', 'Kiper'], ['DC', 'Bek Tengah'], ['FB', 'Bek Sayap'], ['DM', 'Gel. Bertahan'], ['MC', 'Gel. Tengah'], ['AMC', 'Gel. Serang'], ['W', 'Sayap'], ['ST', 'Penyerang'], ['muda', 'Usia ≤ 21'], ['kontrak', 'Kontrak habis < 1 th']];
  page.innerHTML = `<div class="page-head"><div><h1>Skuad ${esc(d.club)}</h1><p>${d.rows.length} pemain · rating posisi gaya Genie Scout (0–100) di posisi natural terbaik</p></div></div>
  <div class="sk-bar"><label>Tim <select id="ft" class="inp">${[['all', 'Semua tim'], ['senior', 'Senior'], ['u21', 'U-21'], ['u18', 'U-18'], ['kandidat', 'Kandidat youth']].map(([k, v]) => `<option value="${k}"${k === team ? ' selected' : ''}>${v} (${d.rows.filter(TEAM[k]).length})</option>`).join('')}</select></label>
    <label>Posisi / filter <select id="fc" class="inp">${F.map(([k, v]) => `<option value="${k}"${k === filter ? ' selected' : ''}>${v}</option>`).join('')}</select></label>
    <span class="muted" id="skN"></span></div>
  <div class="card" id="tb"></div>`;
  $('#ft').onchange = e => { team = e.target.value; try { localStorage.setItem('skTeam', team); } catch { } draw(); };
  $('#fc').onchange = e => { filter = e.target.value; draw(); };
  draw();
}

// ---------- Best XI ----------
async function pXI(page) {
  const forms = await api('/api/formations');
  const sel = localStorage.getItem('xi') || '4-3-3';
  page.innerHTML = `<div class="page-head"><div><h1>Susunan Terbaik</h1><p>Asisten memilih XI terbaik berdasarkan rating peran & keakraban posisi</p></div>
  <div class="chips">${forms.map(f => `<button class="chip ${f === sel ? 'on' : ''}" data-f="${f}">${f}</button>`).join('')}</div></div>
  <div class="grid g-main"><div class="card"><div id="pitch">${loading()}</div></div><div class="grid" style="align-content:start" id="xiSide"></div></div>`;
  const load = async f => {
    localStorage.setItem('xi', f);
    const x = await api('/api/bestxi?formation=' + encodeURIComponent(f));
    $('#pitch').innerHTML = `<div class="pitch"><div class="box t"></div><div class="box b"></div>${x.xi.map(s => `<div class="slot ${s.pick && !s.pick.natural ? 'nonnat' : ''}" style="left:${s.x}%;top:${s.y}%" ${s.pick ? `data-id="${s.pick.id}"` : ''}><div class="disc">${s.pick ? Math.round(s.pick.score) : '–'}</div><div class="nm">${esc(s.pick ? s.pick.name : 'Kosong')}</div><div class="rl">${esc(s.role)}</div></div>`).join('')}</div>`;
    const weak = [...x.xi].filter(s => s.pick).sort((a, b) => a.pick.score - b.pick.score).slice(0, 3);
    $('#xiSide').innerHTML = `<div class="card hero stat"><div class="k">Kekuatan XI</div><div class="v">${x.strength}</div><div class="s">Formasi ${esc(x.formation)} · lingkaran oranye = bukan posisi natural</div></div>
    <div class="card"><h3>Titik Lemah</h3>${weak.map(s => `<div class="li" onclick="location.hash='peran?role=${s.roleId}'"><span class="score ${sCls(s.pick.score)}">${Math.round(s.pick.score)}</span><div class="grow"><b>${esc(s.role)}</b><small>${esc(s.pick.name)}${s.pick.natural ? '' : ' · bukan posisi natural'}</small></div><span class="btn sm">Cari pengganti →</span></div>`).join('')}</div>
    <div class="card"><h3>Cadangan Ideal</h3><div class="list">${x.bench.map(b => `<div class="li" data-id="${b.id}"><span class="badge pos">${esc(b.for)}</span><div class="grow"><b>${esc(b.name)}</b></div><span class="score ${sCls(b.score)}">${Math.round(b.score)}</span></div>`).join('')}</div></div>`;
  };
  page.querySelectorAll('.chips .chip').forEach(b => b.onclick = () => { page.querySelectorAll('.chips .chip').forEach(x => x.classList.toggle('on', x === b)); load(b.dataset.f); });
  load(sel);
}

// ---------- Akademi ----------
async function pAkademi(page) {
  const d = await api('/api/squad');
  const young = d.rows.filter(p => p.age <= 21).sort((a, b) => b.pa - a.pa);
  const tier = p => (p.pa >= 170 ? ['Calon Bintang Dunia', 'great'] : p.pa >= 150 ? ['Calon Pemain Inti', 'good'] : p.pa >= 130 ? ['Pemain Rotasi', 'ok'] : ['Kurang Menjanjikan', 'bad']);
  const plan = p => (p.ca >= 130 ? 'Siap tim utama — beri menit bermain rutin' : p.pa - p.ca >= 40 && p.age >= 18 ? 'Pinjamkan ke liga setara/lebih rendah agar bermain reguler' : p.age <= 17 ? 'Fokus latihan individu + mentoring senior' : 'Rotasi di piala domestik & U-21');
  page.innerHTML = `<div class="page-head"><div><h1>Akademi & Pengembangan</h1><p>${young.length} pemain usia ≤21 · urut berdasarkan potensi</p></div><a class="btn" href="#scout?preset=wonderkid">${ic('scout', 16)} Cari wonderkid lain</a></div>
  <div class="grid g3" style="margin-bottom:16px">${young.slice(0, 3).map(p => `<div class="card" data-id="${p.id}" style="cursor:pointer"><div class="row-flex">${ava(p.name, 44, p.id)}<div><b style="font-size:15px">${esc(p.name)}</b><div class="muted">${p.age} th · ${esc(p.pos)}</div></div></div><div style="margin:14px 0 8px">${capa(p.ca, p.pa)}</div><span class="badge ${tier(p)[1]}">${tier(p)[0]}</span> ${persBadge(p.pers, p.persTone)}<p class="muted" style="margin:10px 0 0;font-size:12.5px">💡 ${plan(p)}</p></div>`).join('')}</div>
  <div class="card"><h3>Semua Pemain Muda</h3>${playerTable(young, { cols: ['name', 'pos', 'age', 'capa', 'gap', 'rating', 'pers', 'exp'] })}</div>`;
}

// ---------- Scouting (gaya Genie Scout) ----------
const PRESETS = [['', 'Semua'], ['mau', '🤝 Mau Gabung'], ['wonderkid', '⭐ Wonderkid'], ['permata', '💎 Permata Tersembunyi'], ['murah', '💰 Murah Berkualitas'], ['gratis', '🆓 Kontrak Habis / Bebas'], ['siap', '🏆 Siap Pakai'], ['dijual', '🏷 Dijual / Dipinjamkan'], ['mental', '🧠 Mental Juara'], ['kaca', '🩹 Rawan Cedera']];
const POS = [['', 'Semua posisi'], ['GK', 'Kiper'], ['DC', 'Bek Tengah'], ['FB', 'Bek Sayap'], ['WB', 'Wing Back'], ['DM', 'Gel. Bertahan'], ['MC', 'Gel. Tengah'], ['WM', 'Gel. Sayap'], ['AMC', 'Gel. Serang'], ['W', 'Penyerang Sayap'], ['ST', 'Penyerang']];
async function pScout(page) {
  const qs = new URLSearchParams(location.hash.split('?')[1] || '');
  const st = { preset: qs.get('preset') || '', pos: '', minAge: '', maxAge: '', minCa: '', minPa: '', maxValue: '', maxWage: '', nat: '', div: '', q: '', excludeMine: '1', sort: '', dir: 'desc', offset: 0 };
  page.innerHTML = `<div class="page-head"><div><h1>Scouting Database</h1><p>Seluruh pemain di save Anda — atribut asli, CA/PA & atribut tersembunyi terbuka</p></div></div>
  <div class="chips" id="pre" style="margin-bottom:14px">${PRESETS.map(([k, v]) => `<button class="chip ${k === st.preset ? 'on' : ''}" data-p="${k}">${v}</button>`).join('')}</div>
  <div class="card" style="margin-bottom:16px"><div class="filters">
    <div class="field"><label>Nama / klub</label><input id="f_q" placeholder="Ketik…"></div>
    <div class="field"><label>Posisi</label><select id="f_pos">${POS.map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
    <div class="field"><label>Usia min</label><input id="f_minAge" type="number"></div>
    <div class="field"><label>Usia maks</label><input id="f_maxAge" type="number"></div>
    <div class="field"><label>CA min</label><input id="f_minCa" type="number"></div>
    <div class="field"><label>PA min</label><input id="f_minPa" type="number"></div>
    <div class="field"><label>Nilai maks (${cur()})</label><input id="f_maxValue" type="number" placeholder="mis. 5000000"></div>
    <div class="field"><label>Gaji maks/mg</label><input id="f_maxWage" type="number"></div>
    <div class="field"><label>Negara</label><input id="f_nat"></div>
    <div class="field"><label>Liga</label><input id="f_div"></div>
    <div class="field"><label title="Perkiraan dari reputasi klub & pemain, ambisi, loyalitas, kontrak, status jual, usia">Mau bergabung?</label><select id="f_minJoin"><option value="">Semua</option><option value="50">Mungkin ke atas</option><option value="70">Sangat mungkin</option></select></div>
    <div class="field"><label>&nbsp;</label><label style="text-transform:none;font-size:13px;color:var(--ink-2);display:flex;gap:6px;align-items:center"><input type="checkbox" id="f_ex" checked> Sembunyikan skuad saya</label></div>
  </div><p class="muted" style="margin:8px 0 0;font-size:12px">🤝 <b>Mau bergabung?</b> = perkiraan apakah pemain mau pindah ke klub Anda (reputasi klub asal vs klub Anda, reputasi pemain, ambisi, loyalitas, sisa kontrak, status dijual, usia). Arahkan kursor ke label untuk alasannya. Keputusan akhir tetap di FM.</p></div>
  <div class="card"><h3><span id="cnt">…</span><span class="row-flex"><button class="btn sm" id="prev">← Sebelumnya</button><button class="btn sm" id="next">Berikutnya →</button></span></h3><div id="res">${loading()}</div></div>`;
  let timer;
  const run = async () => { try { await run0(); } catch (e) { $('#cnt').textContent = '—'; failBox($('#res'), e, () => { $('#res').innerHTML = loading(); run(); }); } };
  const run0 = async () => {
    const p = new URLSearchParams(Object.entries(st).filter(([, v]) => v !== '' && v != null));
    const d = await apiT('/api/search?limit=60&' + p);
    $('#cnt').innerHTML = `${d.total.toLocaleString('id')} pemain <small>menampilkan ${d.total ? st.offset + 1 : 0}–${Math.min(st.offset + 60, d.total)}</small>`;
    $('#res').innerHTML = playerTable(d.rows, { cols: ['name', 'pos', 'age', 'capa', 'rating', 'join', 'value', 'wage', 'exp'], sort: st.sort || 'rating', dir: st.dir });
    $('#res').querySelectorAll('th[data-sort]').forEach(th => th.onclick = () => { const s = th.dataset.sort; if (!s) return; st.dir = st.sort === s && st.dir === 'desc' ? 'asc' : 'desc'; st.sort = s; st.offset = 0; run(); });
    $('#prev').disabled = st.offset === 0; $('#next').disabled = st.offset + 60 >= d.total;
  };
  const deb = () => { clearTimeout(timer); timer = setTimeout(() => { st.offset = 0; run(); }, 280); };
  ['q', 'pos', 'minAge', 'maxAge', 'minCa', 'minPa', 'maxValue', 'maxWage', 'nat', 'div', 'minJoin'].forEach(k => { const el = $('#f_' + k); el.oninput = () => { st[k] = el.value; deb(); }; });
  $('#f_ex').onchange = e => { st.excludeMine = e.target.checked ? '1' : ''; deb(); };
  page.querySelectorAll('#pre .chip').forEach(b => b.onclick = () => { st.preset = b.dataset.p; st.sort = ''; page.querySelectorAll('#pre .chip').forEach(x => x.classList.toggle('on', x === b)); deb(); });
  $('#prev').onclick = () => { st.offset = Math.max(0, st.offset - 60); run(); };
  $('#next').onclick = () => { st.offset += 60; run(); };
  run();
}

// ---------- Pencari Peran ----------
async function pPeran(page) {
  const roles = await api('/api/roles');
  const qs = new URLSearchParams(location.hash.split('?')[1] || '');
  let roleId = qs.get('role') || (qs.get('pos') ? (roles.find(r => r.pos === qs.get('pos')) || roles[0]).id : 'af');
  const groups = {}; roles.forEach(r => (groups[r.pos] = groups[r.pos] || []).push(r));
  const PL = Object.fromEntries(POS);
  let posSel = (roles.find(r => r.id === roleId) || roles[0]).pos;
  page.innerHTML = `<div class="page-head"><div><h1>Pencari Peran</h1><p>Pemain paling cocok untuk peran taktik tertentu · atribut kunci ×3, penting ×1,5</p></div></div>
  <div class="card rf">
    <div class="rf-row"><span class="rf-k">Posisi</span><div class="chips" id="rfPos">${Object.keys(groups).map(g => `<button class="chip" data-pos="${g}">${esc(PL[g] || g)}</button>`).join('')}</div></div>
    <div class="rf-row"><span class="rf-k">Peran</span><div class="chips" id="rfRole"></div></div>
    <div class="rf-row rf-f"><span class="rf-k">Filter</span>
      <label class="rf-in">Usia ≤ <input id="r_age" type="number" placeholder="semua"></label>
      <label class="rf-in">Nilai ≤ ${cur()} <input id="r_val" type="number" placeholder="semua"></label>
      <label class="rf-chk"><input type="checkbox" id="r_mine"> Termasuk skuad saya</label></div>
    <div id="rinfo" class="rf-info"></div>
  </div>
  <div class="card" style="margin-top:16px"><div id="rres">${loading()}</div></div>`;
  const drawRoles = () => {
    page.querySelectorAll('[data-pos]').forEach(b => b.classList.toggle('on', b.dataset.pos === posSel));
    $('#rfRole').innerHTML = groups[posSel].map(r => `<button class="chip ${r.id === roleId ? 'on' : ''}" data-role="${r.id}" title="${esc(r.en)}">${esc(r.name)}</button>`).join('');
    $('#rfRole').querySelectorAll('[data-role]').forEach(el => el.onclick = () => { roleId = el.dataset.role; drawRoles(); run(); });
  };
  page.querySelectorAll('[data-pos]').forEach(b => b.onclick = () => { posSel = b.dataset.pos; roleId = groups[posSel][0].id; drawRoles(); run(); });
  const run = async () => {
    const r = roles.find(x => x.id === roleId);
    $('#rinfo').innerHTML = `<div class="row-flex"><b class="rf-name">${esc(r.name)}</b><span class="muted">${esc(r.en)}</span></div><div class="row-flex" style="margin-top:8px"><span class="muted">Kunci:</span>${r.key.map(k => `<span class="badge good">${esc(k)}</span>`).join('')}</div><div class="row-flex" style="margin-top:8px"><span class="muted">Penting:</span>${r.imp.map(k => `<span class="badge">${esc(k)}</span>`).join('')}</div>`;
    const p = new URLSearchParams({ role: roleId, maxAge: $('#r_age').value || 99, includeMine: $('#r_mine').checked ? '1' : '0' }); if ($('#r_val').value) p.set('maxValue', $('#r_val').value);
    const d = await api('/api/role-search?' + p);
    $('#rres').innerHTML = playerTable(d.rows, { cols: ['name', 'role', 'pos', 'age', 'capa', 'value', 'wage', 'exp'] });
  };
  drawRoles();
  let t; ['#r_age', '#r_val'].forEach(s => $(s).oninput = () => { clearTimeout(t); t = setTimeout(run, 300); }); $('#r_mine').onchange = run;
  run();
}

// ---------- Daftar pantau ----------
async function loadShort() { const l = await api('/api/shortlist'); SHORT = new Set(l.map(x => x.id)); return l; }
// ---------- Target Transfer ⭐ + sesi "Minta DoF menawar" ----------
let TARGETS = new Set();
async function loadTargets() { const l = await api('/api/targets'); TARGETS = new Set(l.map(x => x.id)); return l; }
const ST_LBL = { baru: ['Belum ditawar', 'ok'], ditawar: ['DoF menawar', 'warn'], selesai: ['Selesai', 'good'], gagal: ['Gagal', 'bad'] };
async function pTarget(page) {
  const l = await loadTargets();
  const open = l.filter(x => x.p && x.status !== 'selesai');
  page.innerHTML = `<div class="page-head"><div><h1>Target Transfer</h1><p>${l.length} target · ${open.filter(x => x.status === 'baru').length} belum ditawar · urut prioritas</p></div>
    <div class="row-flex">${open.length ? `<button class="btn" id="relAll" title="Klub wajib menerima tawaran ≥ nilai ini (atur nilainya di Pusat Cheat → Klub Menerima Tawaran)">🤝 Klausul rilis ${money(relFeeGet())} ke semua target</button><button class="btn primary" id="dofGo">${ic('play', 16)} Mulai sesi “Minta DoF menawar”</button>` : ''}</div></div>
  <div class="tip">💡 <span>Tambahkan pemain lewat tombol <b>⭐ Target</b> di profil pemain. Sesi DoF membuka profil setiap target langsung di FM27 satu per satu — Anda cukup menekan <b>Transfer → Minta Direktur Sepak Bola menawar</b> di game, lalu klik <b>Berikutnya</b> di sini.</span></div>
  <div id="dofPanel"></div>
  <div class="card">${l.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pemain</th><th>Prioritas</th><th class="num">Usia</th><th>CA / PA</th><th class="num">Nilai</th><th class="num">Harga minta</th><th class="num">Saran tawaran</th><th class="num">Saran gaji</th><th>Status</th><th></th></tr></thead><tbody>
    ${l.map(x => !x.p ? '' : `<tr class="click" data-id="${x.id}"><td><div class="pname">${ava(x.p.name, 0, x.id)}<div><b>${esc(x.p.name)}</b><small>${logo(x.p.clubId)}${esc(x.p.club)} · ${esc(x.p.pos)}</small></div>${fmBtn(x.id, 'P', x.p.name)}</div></td>
      <td><span class="prio" data-prio="${x.id}" title="Klik untuk ubah prioritas">${'★'.repeat(x.prio)}<span class="star-off">${'★'.repeat(3 - x.prio)}</span></span></td>
      <td class="num">${x.p.age}</td><td>${capa(x.p.ca, x.p.pa)}</td><td class="num">${money(x.p.value)}</td><td class="num">${x.askingPrice ? money(x.askingPrice) : '—'}</td>
      <td class="num"><b>${money(x.bid)}</b></td><td class="num">${wage(x.wageOffer)}</td>
      <td><span class="badge ${ST_LBL[x.status]?.[1] || 'ok'}">${ST_LBL[x.status]?.[0] || x.status}</span>${x.notForSale ? ' <span class="badge bad">Tidak dijual</span>' : ''}${x.own ? ' <span class="badge good">Sudah di klub</span>' : ''}</td>
      <td><button class="btn sm ghost" data-rm="${x.id}" title="Hapus dari target">${ic('x', 14)}</button></td></tr>`).join('')}</tbody></table></div>`
    : `<div class="empty"><h2>Belum ada target</h2><p>Buka profil pemain incaran, lalu klik <b>⭐ Target</b>.</p><a class="btn primary" href="#scout">${ic('scout', 16)} Cari pemain</a></div>`}</div>`;
  page.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = e => { if (e.target.closest('[data-rm],[data-prio],[data-fm]')) return; openPlayer(Number(tr.dataset.id)); });
  page.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { await post('/api/targets', { action: 'remove', id: Number(b.dataset.rm) }); toast('Dihapus dari target'); route(); });
  page.querySelectorAll('[data-prio]').forEach(b => b.onclick = async () => { const x = l.find(y => y.id === Number(b.dataset.prio)); await post('/api/targets', { action: 'update', id: x.id, prio: x.prio % 3 + 1 }); route(); });
  const ra = $('#relAll'); if (ra) ra.onclick = async () => { const ids = open.map(x => x.id); let ok = 0, skip = 0; if (!(await ask({ icon: '🤝', title: `Pasang klausul rilis ${money(relFeeGet())}?`, body: `Untuk <b>${ids.length} target</b>. Hanya pemain yang kontraknya sudah punya klausul rilis yang bisa diubah. Bisa dibatalkan di Riwayat Pusat Cheat.`, ok: 'Ya, pasang' }))) return; for (const id of ids) { try { const r = await post('/api/cheat/run', { action: 'cond', scope: { kind: 'P', type: 'person', value: id }, params: { op: 'rilisMurah', value: relFeeGet() } }); if (r.players) ok++; else skip++; } catch { skip++; } } toast(`✓ ${ok} target kini wajib dilepas klubnya di ${money(relFeeGet())} · ${skip} tanpa klausul rilis`, ok ? 'ok' : 'info'); };
  const go = $('#dofGo'); if (go) go.onclick = () => dofSession(open.filter(x => x.status === 'baru').length ? open.filter(x => x.status === 'baru') : open);
}
const relFeeGet = () => { try { const v = Number(localStorage.getItem('relFee')); return v >= 1 ? v : 1000000; } catch { return 1000000; } };
const relFeeSet = v => { try { localStorage.setItem('relFee', String(v)); } catch { } };
function dofSession(queue) {
  let i = 0; const panel = $('#dofPanel');
  const step = async () => {
    if (i >= queue.length) { panel.innerHTML = `<div class="card dof done"><h3>✅ Sesi selesai</h3><p class="muted" style="margin:0">Semua target sudah dibuka. Pantau hasilnya di FM27 (kotak masuk → negosiasi transfer).</p></div>`; return; }
    const x = queue[i];
    panel.innerHTML = `<div class="card dof"><div class="dof-top"><span class="dof-n">${i + 1}<small>/${queue.length}</small></span>${ava(x.p.name, 56, x.id)}<div class="grow"><h3 style="margin:0">${esc(x.p.name)}</h3><div class="muted">${esc(x.p.club)} · ${esc(x.p.pos)} · ${x.p.age} th</div></div>
      <div class="dof-money"><small>Saran tawaran</small><b>${money(x.bid)}</b><small>gaji ${wage(x.wageOffer)}</small></div></div>
      <ol class="dof-steps"><li>Profil sudah dibuka di FM27 (atau klik <b>Buka lagi</b>).</li><li>Di FM: <b>Transfer</b> → <b>Minta Direktur Sepak Bola menawar</b>${x.askingPrice ? ` — harga minta klub ±${money(x.askingPrice)}` : ''}.</li><li>Kembali ke sini, klik <b>Sudah ditawar → berikutnya</b>.</li></ol>
      <div class="row-flex"><button class="btn primary" id="dofDone">${ic('play', 15)} Sudah ditawar → berikutnya</button><button class="btn" id="dofOpen">Buka lagi di FM27</button><button class="btn" id="dofSkip">Lewati</button><button class="btn ghost" id="dofStop">Selesai sesi</button></div></div>`;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    openInFM(x.p.name, x.id, 'P');
    $('#dofOpen').onclick = () => openInFM(x.p.name, x.id, 'P');
    $('#dofDone').onclick = async () => { await post('/api/targets', { action: 'update', id: x.id, status: 'ditawar' }); i++; step(); };
    $('#dofSkip').onclick = () => { i++; step(); };
    $('#dofStop').onclick = () => route();
  };
  step();
}

async function pPantau(page) {
  const l = await loadShort();
  const tags = ['Pantau', 'Target Utama', 'Alternatif', 'Pinjam', 'Bebas Transfer'];
  page.innerHTML = `<div class="page-head"><div><h1>Daftar Pantau</h1><p>${l.length} pemain · tersimpan permanen di komputer Anda</p></div><div class="row-flex">${l.length >= 2 ? `<button class="btn" onclick="COMPARE=${JSON.stringify(l.slice(0, 3).map(x => x.id))};location.hash='banding'">${ic('cmp', 16)} Bandingkan 3 teratas</button>` : ''}</div></div>
  ${l.length ? `<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pemain</th><th>Label</th><th>CA / PA</th><th>Nilai</th><th>Kontrak</th><th>Catatan</th><th></th></tr></thead><tbody>${l.map(x => x.p ? `<tr><td class="click" data-id="${x.id}" style="cursor:pointer"><div class="pname">${ava(x.p.name, 0, x.id)}<div><b>${esc(x.p.name)}</b><small>${esc(x.p.pos)} · ${x.p.age} th · ${esc(x.p.club)}</small></div></div></td>
    <td><select data-tag="${x.id}" class="badge" style="border:0">${tags.map(t => `<option ${t === x.tag ? 'selected' : ''}>${t}</option>`).join('')}</select></td><td>${capa(x.p.ca, x.p.pa)}</td><td class="num">${money(x.p.value)}</td><td>${expTxt(x.p)}</td>
    <td><input data-note="${x.id}" value="${esc(x.note)}" placeholder="Tulis catatan…" style="border:1px solid var(--line);border-radius:8px;padding:6px 9px;width:220px"></td><td><button class="btn sm ghost" data-rm="${x.id}">${ic('x', 14)}</button></td></tr>` : '').join('')}</tbody></table></div></div>`
    : `<div class="empty"><div style="font-size:42px">🔖</div><h2>Belum ada pemain dipantau</h2><p>Buka profil pemain mana pun lalu klik <b>Pantau</b>.</p><a class="btn primary" href="#scout">Mulai scouting</a></div>`}`;
  page.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { await post('/api/shortlist', { action: 'remove', id: Number(b.dataset.rm) }); pPantau(page); });
  page.querySelectorAll('[data-note]').forEach(i => i.onchange = () => post('/api/shortlist', { action: 'note', id: Number(i.dataset.note), note: i.value }).then(() => toast('Catatan disimpan')));
  page.querySelectorAll('[data-tag]').forEach(s => s.onchange = () => { const id = Number(s.dataset.tag); const note = page.querySelector(`[data-note="${id}"]`).value; post('/api/shortlist', { action: 'note', id, note, tag: s.value }).then(() => toast('Label diperbarui')); });
}

// ---------- Bandingkan ----------
async function pBanding(page) {
  if (!COMPARE.length) { page.innerHTML = `<div class="empty"><div style="font-size:42px">⚖️</div><h2>Pilih pemain untuk dibandingkan</h2><p>Buka profil pemain lalu klik <b>Bandingkan</b> (maks. 3 pemain).</p><a class="btn primary" href="#scout">Cari pemain</a></div>`; return; }
  const ps = await api('/api/compare?ids=' + COMPARE.join(','));
  const colors = ['#0f6b5c', '#b98a2e', '#2f5fb3'];
  const allAttrs = ps[0] ? Object.values(ps[0].attrs).flat().filter(a => !['Eccentricity', 'Punching', 'RushingOut'].includes(a.k) || ps[0].bp === 'GK') : [];
  const val = (p, k) => (Object.values(p.attrs).flat().find(a => a.k === k) || {}).v;
  page.innerHTML = `<div class="page-head"><div><h1>Bandingkan Pemain</h1><p>Nilai tertinggi di setiap baris ditandai</p></div><button class="btn" onclick="COMPARE=[];route()">${ic('x', 16)} Kosongkan</button></div>
  <div class="grid g-main"><div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Atribut</th>${ps.map((p, i) => `<th class="num" style="color:${colors[i]}">${esc(p.name)}</th>`).join('')}</tr></thead><tbody>
  ${[['Usia', p => p.age, -1], ['CA', p => p.ca, 1], ['PA', p => p.pa, 1], ['Rating posisi', p => p.rating, 1], ['Nilai', p => p.value, 0, money], ['Gaji', p => p.wage, 0, wage]].map(([l, f, b, fmt]) => cmpRow(l, ps.map(f), b, fmt)).join('')}
  ${allAttrs.map(a => cmpRow(a.label, ps.map(p => val(p, a.k)), a.k === 'InjuryProneness' || a.k === 'Dirtiness' ? -1 : 1)).join('')}</tbody></table></div></div>
  <div class="card" style="align-self:start"><h3>Profil Radar</h3>${radar(ps, colors)}<div class="row-flex" style="justify-content:center;margin-top:8px">${ps.map((p, i) => `<span class="row-flex" style="gap:5px"><i style="width:10px;height:10px;border-radius:3px;background:${colors[i]}"></i>${esc(p.name)} <button class="btn sm ghost" onclick="COMPARE=COMPARE.filter(x=>x!==${p.id});route()">✕</button></span>`).join('')}</div></div></div>`;
}
function cmpRow(label, vals, better, fmt) {
  const nums = vals.map(v => (typeof v === 'number' ? v : null));
  const best = better === 0 ? null : better > 0 ? Math.max(...nums.filter(v => v != null)) : Math.min(...nums.filter(v => v != null));
  return `<tr><td>${esc(label)}</td>${vals.map(v => `<td class="num" style="${v === best && vals.length > 1 ? 'font-weight:800;color:var(--brand)' : ''}">${fmt ? fmt(v) : v ?? '—'}</td>`).join('')}</tr>`;
}
// Radar 6 sumbu
const RADAR = [['Bertahan', ['Tackling', 'Marking', 'Positioning', 'Heading']], ['Fisik', ['Strength', 'Stamina', 'JumpingReach', 'NaturalFitness']], ['Kecepatan', ['Pace', 'Acceleration', 'Agility']], ['Kreativitas', ['Passing', 'Vision', 'Technique', 'Flair']], ['Serangan', ['Finishing', 'OffTheBall', 'Dribbling', 'Composure']], ['Mental', ['Decisions', 'Anticipation', 'Determination', 'Teamwork', 'WorkRate']]];
function radar(ps, colors) {
  const S = 300, c = S / 2, R = 108;
  const pt = (i, r) => [c + r * Math.sin((Math.PI * 2 * i) / 6), c - r * Math.cos((Math.PI * 2 * i) / 6)];
  const val = (p, ks) => { const all = Object.values(p.attrs).flat(); const xs = ks.map(k => (all.find(a => a.k === k) || {}).v || 0); return xs.reduce((t, x) => t + x, 0) / xs.length / 20; };
  let g = '';
  [0.25, 0.5, 0.75, 1].forEach(f => g += `<polygon points="${RADAR.map((_, i) => pt(i, R * f).join(',')).join(' ')}" fill="none" style="stroke:var(--line-2)"/>`);
  RADAR.forEach(([l], i) => { const [x, y] = pt(i, R + 22); g += `<line x1="${c}" y1="${c}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" style="stroke:var(--line)"/><text x="${x}" y="${y + 4}" text-anchor="middle">${l}</text>`; });
  ps.forEach((p, j) => { const pts = RADAR.map(([, ks], i) => pt(i, R * val(p, ks)).join(',')).join(' '); g += `<polygon points="${pts}" fill="${colors[j]}" fill-opacity=".14" stroke="${colors[j]}" stroke-width="2"/>`; });
  return `<svg class="radar" viewBox="0 0 ${S} ${S}" style="width:100%;max-width:340px;display:block;margin:auto">${g}</svg>`;
}

// ---------- Staf ----------
async function pStaf(page) {
  const st = { role: '', q: '', free: '', mine: '', cls: '', chance: '' };
  page.innerHTML = `<div class="page-head"><div><h1>Staf & Pelatih</h1><p>Cari staf terbaik per peran — bintang dihitung dari atribut utama + tekad & motivasi</p></div></div>
  <div class="card" style="margin-bottom:16px"><div class="filters"><div class="field"><label>Peran</label><select id="s_role"><option value="">Kecocokan terbaik</option></select></div><div class="field"><label>Nama / klub</label><input id="s_q"></div>
  <div class="field"><label>&nbsp;</label><label style="text-transform:none;font-size:13px;display:flex;gap:6px;align-items:center"><input type="checkbox" id="s_free"> Hanya tanpa klub</label></div><div class="field"><label>&nbsp;</label><label style="text-transform:none;font-size:13px;display:flex;gap:6px;align-items:center"><input type="checkbox" id="s_mine"> Hanya staf saya</label></div></div></div>
  <div class="card rf" style="margin-bottom:16px">
    <div class="rf-row"><span class="rf-k">Kelas</span><div class="chips" id="sCls">${[['', 'Semua'], ['dunia', '🌍 Kelas Dunia'], ['elit', '⭐ Elit'], ['sbagus', 'Sangat Bagus'], ['bagus', 'Bagus'], ['standar', 'Standar']].map(([k, v]) => `<button class="chip ${k === '' ? 'on' : ''}" data-cls="${k}">${v}</button>`).join('')}</div></div>
    <div class="rf-row"><span class="rf-k">Peluang</span><div class="chips" id="sCh">${[['', 'Semua'], ['mudah', '✅ Realistis (mau ke klub saya)'], ['sulit', '⚠️ Sulit'], ['ssulit', '⛔ Sangat sulit']].map(([k, v]) => `<button class="chip ${k === '' ? 'on' : ''}" data-ch="${k}">${v}</button>`).join('')}</div></div>
  </div>
  <div class="card"><h3 id="s_cnt">…</h3><div id="s_res">${loading()}</div></div>`;
  let first = true;
  const run = async () => {
    const d = await api('/api/staff?' + new URLSearchParams(st));
    if (first) { $('#s_role').innerHTML += d.roles.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join(''); first = false; }
    $('#s_cnt').innerHTML = `${d.total.toLocaleString('id')} staf <small>menampilkan 200 teratas</small>`;
    $('#s_res').innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama</th><th>Jabatan</th><th>Klub</th><th class="num">Usia</th><th>Reputasi</th><th>Paling cocok</th><th>Bintang</th><th>Kelas</th><th>Mau ke klub Anda?</th><th class="num">Gaji</th><th>Kontrak</th></tr></thead><tbody>${d.rows.map(s => `<tr class="click" data-staff="${s.id}"><td><div class="pname">${ava(s.name, 0, s.id)}<div><b>${esc(s.name)}</b><small>${esc(s.nat || '')}</small></div></div></td><td>${esc(s.job)}</td><td${s.clubNote ? ` title="${esc(s.clubNote)}"` : ''}>${esc(s.club)}</td><td class="num">${s.age || '—'}</td><td><span class="muted" title="Perkiraan dari kemampuan & klubnya">${esc(s.repName || '')}</span></td><td>${esc(s.fit.name)}</td><td><span class="stars">${stars(s.fit.stars)}</span></td><td><span class="cls cls-${s.cls}">${esc(s.clsName)}</span></td><td title="${esc('Perkiraan ' + s.interest + '/100' + (s.interestWhy ? ': ' + s.interestWhy : ''))}"><span class="chn chn-${s.chance}">${esc(s.chanceName)}</span> <small class="muted">${s.interest ?? ''}</small></td><td class="num">${wage(s.wage)}</td><td>${esc(s.expires || '—')}</td></tr>`).join('')}</tbody></table></div>`;
    page.querySelectorAll('[data-staff]').forEach(tr => tr.onclick = () => openStaff(Number(tr.dataset.staff)));
  };
  let t; const deb = () => { clearTimeout(t); t = setTimeout(run, 280); };
  $('#s_role').onchange = e => { st.role = e.target.value; run(); };
  $('#s_q').oninput = e => { st.q = e.target.value; deb(); };
  $('#s_free').onchange = e => { st.free = e.target.checked ? '1' : ''; run(); };
  $('#s_mine').onchange = e => { st.mine = e.target.checked ? '1' : ''; run(); };
  page.querySelectorAll('[data-cls]').forEach(b => b.onclick = () => { st.cls = b.dataset.cls; page.querySelectorAll('[data-cls]').forEach(x => x.classList.toggle('on', x === b)); run(); });
  page.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { st.chance = b.dataset.ch; page.querySelectorAll('[data-ch]').forEach(x => x.classList.toggle('on', x === b)); run(); });
  run();
}
const stars = n => '★'.repeat(Math.floor(n)) + (n % 1 ? '½' : '') + '<span class="star-off">' + '★'.repeat(5 - Math.ceil(n)) + '</span>';
// ---------- Profil pemain (tata letak ala FM27) ----------
const FM_ORDER = {
  technical: ['Corners', 'Crossing', 'Dribbling', 'Finishing', 'FirstTouch', 'FreeKicks', 'Heading', 'LongShots', 'LongThrows', 'Marking', 'Passing', 'PenaltyTaking', 'Tackling', 'Technique'],
  goalkeeping: ['AerialReach', 'CommandOfArea', 'Communication', 'Eccentricity', 'FirstTouch', 'Handling', 'Kicking', 'OneOnOnes', 'Passing', 'Punching', 'Reflexes', 'RushingOut', 'Throwing'],
  mental: ['Aggression', 'Anticipation', 'Bravery', 'Composure', 'Concentration', 'Decisions', 'Determination', 'Flair', 'Leadership', 'OffTheBall', 'Positioning', 'Teamwork', 'Vision', 'WorkRate'],
  physical: ['Acceleration', 'Agility', 'Balance', 'JumpingReach', 'NaturalFitness', 'Pace', 'Stamina', 'Strength'],
};
const PITCH_POS = [['ST', 50, 10], ['AML', 15, 26], ['AMC', 50, 28], ['AMR', 85, 26], ['ML', 15, 44], ['MC', 50, 46], ['MR', 85, 44], ['WBL', 13, 60], ['DM', 50, 62], ['WBR', 87, 60], ['DL', 15, 77], ['DC', 50, 79], ['DR', 85, 77], ['GK', 50, 93]];
const POS_GROUP = { GK: 'GK', DC: 'DC', DL: 'FB', DR: 'FB', WBL: 'WB', WBR: 'WB', DM: 'DM', MC: 'MC', ML: 'WM', MR: 'WM', AMC: 'AMC', AML: 'W', AMR: 'W', ST: 'ST' };
const starsAb = v => { const n = Math.max(0.5, Math.min(5, Math.round((v / 200) * 10) / 2)); return stars(n); };

function fmCol(title, keys, raw, hl) {
  return `<div class="fm-col"><div class="fm-col-h">${title}</div>${keys.filter(k => k in raw).map(k => {
    const v = raw[k]; const h = hl.key.includes(k) ? 'key' : hl.imp.includes(k) ? 'imp' : '';
    return `<div class="fm-attr ${h}"><span>${esc(LBL[k] || k)}</span><b class="${aCls(v)} edit" data-edit="${k}" title="Klik untuk ubah di FM27">${v}</b></div>`;
  }).join('')}</div>`;
}
function posMap(p) {
  const nat = new Set(p.posArr || []);
  const rat = Object.fromEntries(p.positions.map(x => [x.k, x.r]));
  const tier = r => (r >= 80 ? 'r5' : r >= 70 ? 'r4' : r >= 65 ? 'r3' : r >= 55 ? 'r2' : 'r1');
  const lines = '<i class="pl half"></i><i class="pl circle"></i><i class="pl spot"></i><i class="pl box t"></i><i class="pl six t"></i><i class="pl box b"></i><i class="pl six b"></i>';
  return `<div class="posmap">${lines}${PITCH_POS.map(([k, x, y]) => {
    const g = POS_GROUP[k]; const r = Math.round(rat[g] || 0); const isNat = nat.has(k);
    return `<span class="pm ${isNat ? 'nat' : tier(r)}" style="left:${x}%;top:${y}%" title="${k}: rating ${r}${isNat ? ' (natural)' : ''}">${k}</span>`;
  }).join('')}</div><div class="pm-leg"><span><i class="pm nat"></i>Natural</span><span><i class="pm r5"></i>80+</span><span><i class="pm r4"></i>70+</span><span><i class="pm r3"></i>65+</span><span><i class="pm r2"></i>55+</span><span><i class="pm r1"></i>Lemah</span></div>`;
}
let LBL = {};
let VERSI = null;

// Radar 8 sisi ala FM: tiap sumbu = rata-rata atribut kelompoknya (1–20)
const FM_RADAR = [
  ['Bertahan', ['Marking', 'Tackling', 'Positioning']],
  ['Fisik', ['Agility', 'Balance', 'Stamina', 'Strength']],
  ['Kecepatan', ['Acceleration', 'Pace']],
  ['Visi', ['Passing', 'Flair', 'Vision']],
  ['Menyerang', ['Finishing', 'Composure', 'OffTheBall']],
  ['Teknis', ['Dribbling', 'FirstTouch', 'Technique']],
  ['Udara', ['Heading', 'JumpingReach']],
  ['Mental', ['Anticipation', 'Bravery', 'Concentration', 'Decisions', 'Determination', 'Teamwork']],
];
const FM_RADAR_GK = [
  ['Refleks', ['Reflexes', 'OneOnOnes']], ['Fisik', ['Agility', 'Balance', 'Stamina', 'Strength']], ['Kecepatan', ['Acceleration', 'Pace']],
  ['Distribusi', ['Kicking', 'Throwing', 'Passing']], ['Udara', ['AerialReach', 'CommandOfArea', 'JumpingReach']], ['Penanganan', ['Handling', 'FirstTouch']],
  ['Komunikasi', ['Communication', 'Eccentricity', 'RushingOut']], ['Mental', ['Anticipation', 'Bravery', 'Concentration', 'Decisions', 'Positioning']],
];
function fmRadar(raw, isGK) {
  const axes = (isGK ? FM_RADAR_GK : FM_RADAR).map(([l, ks]) => { const xs = ks.map(k => raw[k]).filter(v => v != null); return [l, xs.length ? xs.reduce((t, x) => t + x, 0) / xs.length : 0]; });
  const S = 340, c = S / 2, R = 104, n = axes.length;
  const pt = (i, r) => [c + r * Math.sin((Math.PI * 2 * i) / n), c - r * Math.cos((Math.PI * 2 * i) / n)];
  let g = '';
  [0.25, 0.5, 0.75, 1].forEach(f => g += `<polygon points="${axes.map((_, i) => pt(i, R * f).join(',')).join(' ')}" class="rg${f === 1 ? ' out' : ''}"/>`);
  axes.forEach((_, i) => { const [x, y] = pt(i, R); g += `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" class="rl"/>`; });
  const pts = axes.map(([, v], i) => pt(i, R * Math.max(0.04, v / 20)));
  g += `<polygon points="${pts.map(p => p.join(',')).join(' ')}" class="rv"/>`;
  pts.forEach(([x, y]) => g += `<circle cx="${x}" cy="${y}" r="3.6" class="rd"/>`);
  axes.forEach(([l, v], i) => {
    const [x, y] = pt(i, R + 26); const anchor = Math.abs(x - c) < 8 ? 'middle' : x > c ? 'start' : 'end';
    const top = y < c - R; const bot = y > c + R;
    g += `<text x="${x}" y="${top ? y - 6 : bot ? y + 14 : y + 4}" text-anchor="${anchor}" class="rt">${l} <tspan class="${aCls(v)}t">${Math.round(v)}</tspan></text>`;
  });
  return `<svg class="fm-radar" viewBox="-82 -6 ${S + 164} ${S + 12}" role="img" aria-label="Grafik atribut">${g}</svg>`;
}
const MORALE = v => (v == null ? ['—', '😐', ''] : v >= 17 ? ['Sangat senang', '😄', 'good'] : v >= 12 ? ['Senang', '🙂', 'good'] : v >= 8 ? ['Biasa', '😐', ''] : v >= 5 ? ['Kurang senang', '🙁', 'warn'] : ['Tidak senang', '😠', 'bad']);
const FITNESS = (c, s) => (c == null ? ['—', ''] : c >= 95 && s >= 90 ? ['Puncak', 'good'] : c >= 90 ? ['Bugar', 'good'] : c >= 80 ? ['Cukup bugar', ''] : ['Lelah', 'warn']);
const face = (id, name, size) => `<span class="face" style="width:${size}px;height:${size}px"><img src="/face/${id}" alt="" onload="this.parentNode.classList.add('ok')" onerror="this.remove()">${ava(name, size)}</span>`;
const meter = (v, cls = '') => `<div class="meter ${cls}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`;

// Pemain terakhir yang dibuka di Asisten (dipakai Pusat Cheat untuk deteksi otomatis)
let ASIS_OPEN = null;
async function openPlayer(id) {
  SEL = { kind: 'P', id: Number(id) }; markRow(); ASIS_OPEN = { id: Number(id), at: Date.now() };
  showDrawer(`<div class="drawer-skel"><div class="sk sk-head"></div><div class="sk-row"><div class="sk sk-col"></div><div class="sk sk-col wide"></div><div class="sk sk-col"></div></div></div>`);
  const pP = api('/api/player/' + id);
  const pL = api('/api/live/' + id).catch(() => null); // dibaca di latar belakang — profil tampil dulu
  if (!SHORT.size) loadShort().catch(() => {});
  if (!TARGETS.size) await loadTargets().catch(() => {});
  const p = await pP;
  LBL = Object.fromEntries(Object.values(p.attrs).flat().map(a => [a.k, a.label]));
  let tab = 'profil', live = null;
  let role = p.roles.find(r => r.natural) ? p.roles.find(r => r.natural).id : p.roles[0].id;
  const watched = () => SHORT.has(p.id);
  const isGK = p.bp === 'GK';
  const foot = { Rechts: 'Kanan', Links: 'Kiri', Beide: 'Keduanya' }[p.foot] || '—';
  const head = () => `<div class="drawer-head pro-head">
    <div class="pro-top">
      ${face(p.id, p.name, 92)}
      <div class="pro-id"><h2>${esc(p.name)}</h2><div class="pro-pos">${esc(p.pos)} · ${p.age} tahun</div>
        <div class="row-flex" style="margin-top:8px">${persBadge(p.pers, p.persTone)}${p.assess ? `<span class="badge ${p.assess.tierId === 'dunia' ? 'great' : p.assess.tierId ? 'good' : 'ok'}">${esc(p.assess.posName)}: ${esc(p.assess.tier)}</span>` : ''}${p.listed ? '<span class="badge warn">Daftar transfer</span>' : ''}${p.loanListed ? '<span class="badge warn">Bisa dipinjam</span>' : ''}${p.notForSale ? '<span class="badge bad">Tidak dijual</span>' : ''}</div></div>
      <div class="pro-blk">${logo(p.clubId, 'pro-logo')}<div><b>${esc(p.club || 'Tanpa klub')}</b><small>${esc(p.div || '')}</small></div></div>
      <div class="pro-blk"><div><b>${esc(p.nat)}</b><small>Kaki ${foot.toLowerCase()} · ${p.height || '?'} cm</small></div></div>
      <div class="pro-blk"><div><b>${money(p.value)}</b><small>${wage(p.wage)} · s/d ${esc(p.expires || '—')}</small></div></div>
      <div class="pro-abil"><button class="abil-ed" data-abil="ca" title="Klik untuk ubah CA di FM27"><small>Kemampuan ✎</small><span class="stars">${starsAb(p.ca)}</span><b id="vCA">${p.ca}</b></button><button class="abil-ed" data-abil="pa" title="Klik untuk ubah PA di FM27"><small>Potensi ✎</small><span class="stars">${starsAb(p.pa)}</span><b id="vPA">${p.pa}</b></button><span class="live-tag" id="liveTag" title="Dibaca langsung dari memori FM27" style="display:none">LIVE</span></div>
    </div>
    <div class="pro-bar"><div class="tabs">${[['profil', 'Ringkasan'], ['cheat', '⚡ Cheat'], ['analisis', 'Analisis'], ['peran', 'Peran & Posisi'], ['mirip', 'Pemain Mirip']].map(([k, v]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${v}</button>`).join('')}</div>
      <div class="row-flex"><div class="pnav"><button class="btn sm" id="dPrev" title="Pemain sebelumnya (←)">‹</button><span id="dIdx"></span><button class="btn sm" id="dNext" title="Pemain berikutnya (→)">›</button></div><button class="btn sm ${TARGETS.has(p.id) ? 'gold' : ''}" id="dTarget">${ic('star', 14)} ${TARGETS.has(p.id) ? 'Target ✓' : 'Target'}</button><button class="btn sm ${watched() ? 'gold' : ''}" id="dWatch">${ic('list', 14)} ${watched() ? 'Dipantau' : 'Pantau'}</button><button class="btn sm" id="dCmp">${ic('cmp', 14)} Bandingkan</button><button class="btn sm gold-ol" id="dLeg" title="Jadikan pemain ini seperti legenda (atribut mengikuti usia)">👑 Legenda</button><button class="btn sm fm" id="dFM">${ic('play', 14)} Buka di FM27</button><button class="btn ghost" onclick="hideDrawer()" aria-label="Tutup">${ic('x')}</button></div></div>
  </div>`;
  const status = () => {
    const [ml, mi, mc] = MORALE(live?.morale); const [fl, fc] = FITNESS(live?.condition, live?.sharpness);
    const gap = Math.max(0, p.pa - p.ca); const prog = p.pa ? Math.round((p.ca / p.pa) * 100) : 0;
    return `<div class="pro-cards">
      <div class="card sc"><h4>Kebahagiaan</h4><div class="sc-big"><span class="emo">${mi}</span><b class="${mc}">${live ? ml : 'Memuat…'}</b></div>${live?.morale != null ? `${meter(live.morale * 5, mc)}<small class="muted">Moral ${live.morale}/20</small>` : '<small class="muted">Butuh FM27 berjalan</small>'}</div>
      <div class="card sc"><h4>Kebugaran</h4><div class="sc-big"><span class="emo">${live?.injured ? '🩹' : '💚'}</span><b class="${live?.injured ? 'bad' : fc}">${live ? (live.injured ? 'Cedera' : fl) : 'Memuat…'}</b></div>${live?.condition != null ? `<div class="kv"><span>Kondisi</span><b>${live.condition}%</b></div>${meter(live.condition, fc)}<div class="kv"><span>Ketajaman laga</span><b>${live.sharpness}%</b></div>${meter(live.sharpness)}` : ''}${live?.banned ? '<div class="badge bad" style="margin-top:8px">Sedang dilarang bermain</div>' : ''}</div>
      <div class="card sc"><h4>Perkembangan</h4><div class="sc-big"><span class="emo">📈</span><b>${gap ? `+${gap} ke PA` : 'Sudah maksimal'}</b></div>${meter(prog, prog >= 95 ? 'good' : '')}<small class="muted">CA ${p.ca} dari PA ${p.pa} (${prog}%)</small></div>
      <div class="card sc"><h4>Kontrak</h4><div class="kv"><span>Gaji</span><b>${wage(p.wage)}</b></div><div class="kv"><span>Berakhir</span><b>${esc(p.expires || '—')}</b></div><div class="kv"><span>Nilai</span><b>${money(p.value)}</b></div>${p.askingPrice ? `<div class="kv"><span>Harga minta</span><b>${money(p.askingPrice)}</b></div>` : ''}</div>
      <div class="card sc wide"><h4>Catatan Asisten</h4>${p.advice.length ? p.advice.slice(0, 3).map(a => `<div class="advice">${esc(a)}</div>`).join('') : '<p class="muted" style="margin:0">Tidak ada catatan khusus — pemain dalam kondisi wajar.</p>'}</div>
    </div>`;
  };
  const body = () => {
    if (tab === 'profil') {
      const rk = p.roleKeys[role] || { key: [], imp: [] };
      const hidden = [...p.personality.map(a => ({ label: a.label, v: a.v, inv: a.k === 'controversy' })), ...p.attrs.hidden.map(a => ({ label: a.label, v: a.v, inv: ['InjuryProneness', 'Dirtiness'].includes(a.k) }))];
      const roles = [...p.roles].sort((a, b) => (b.natural - a.natural) || (b.score - a.score)).slice(0, 7);
      return `<div class="pro-grid">
        <div class="pro-left">
          <div class="card"><h4>Posisi <small>${esc(p.pos)}</small></h4>${posMap(p)}</div>
          <div class="card"><h4>Peran <small>klik untuk sorot atribut</small></h4><div class="role-list">${roles.map(r => `<button class="role ${r.id === role ? 'on' : ''}" data-role="${r.id}"><span class="stars">${stars(Math.max(0.5, Math.round((r.score / 100) * 10) / 2))}</span><span class="rn">${esc(r.name)}${r.natural ? '' : ' <small>(non-natural)</small>'}</span><b>${r.score.toFixed(0)}</b></button>`).join('')}</div>
            <div class="pm-leg" style="margin-top:10px"><span><i class="hl key"></i>Kunci</span><span><i class="hl imp"></i>Penting</span></div></div>
        </div>
        <div class="card pro-attrs"><div class="fm-attrs">${isGK ? fmCol('Kiper', FM_ORDER.goalkeeping, p.raw, rk) : fmCol('Teknik', FM_ORDER.technical, p.raw, rk)}${fmCol('Mental', FM_ORDER.mental, p.raw, rk)}${fmCol('Fisik', FM_ORDER.physical, p.raw, rk)}</div>
          <div class="attr-legend"><b class="a6">18–20</b><b class="a5">15–17</b><b class="a4">12–14</b><b class="a3">9–11</b><b class="a2">6–8</b><b class="a1">1–5</b><span>· klik angka untuk mengubah di FM27</span></div></div>
        <div class="pro-right">
          <div class="card"><h4>Grafik Atribut</h4>${fmRadar(p.raw, isGK)}</div>
          <div class="card"><h4>Info</h4><div class="kv"><span>Tinggi</span><b>${p.height || '?'} cm</b></div><div class="kv"><span>Kaki</span><b>${foot}</b></div><div class="kv"><span>Kepribadian</span><b>${esc(p.pers || '—')}</b></div><div class="kv"><span>Reputasi dunia</span><b>${p.worldRep ?? '—'}</b></div>${p.dob ? `<div class="kv"><span>Lahir</span><b>${esc(p.dob)}</b></div>` : ''}</div>
          <details class="card hid"><summary><h4>Atribut Tersembunyi</h4></summary><div class="fm-hidden">${hidden.map(h => `<div class="fm-attr"><span>${esc(h.label)}</span><b class="${aCls(h.inv ? 21 - h.v : h.v)}">${h.v ?? '—'}</b></div>`).join('')}</div></details>
        </div>
      </div>${status()}`;
    }
    if (tab === 'cheat') return `<div class="grid g2"><div class="card"><h3>🚀 Push CA → PA <small>CA ${p.ca} → PA ${p.pa}</small></h3><div class="stage-row">${STAGE_BTNS.map(([k, n, pct], i) => `<button class="stage s${i}" data-pstage="${k}"><b>${n}</b><small>${pct}</small></button>`).join('')}</div><label class="chk"><input type="checkbox" id="pWith" checked> Naikkan atribut juga</label></div><div class="card"><h3>Aksi Cepat</h3><div class="row-flex"><button class="btn" data-pq="pa">PA → 200</button><button class="btn" data-pq="hidden">Tersembunyi terbaik</button><button class="btn" data-pq="pers">Kepribadian teladan</button><button class="btn" data-pq="perpanjang">Kontrak +5 th</button><button class="btn" data-pq="gaji">Gaji −50%</button><button class="btn" data-pc="cedera">Pulihkan cedera</button><button class="btn" data-pc="ban">Hapus larangan</button><button class="btn" data-pc="bahagia">Bikin bahagia</button><button class="btn" data-pc="izinkerja">Work permit ON</button><button class="btn sm" data-pcit="1" title="Tambah kewarganegaraan kedua (negara liga klub Anda, mis. Italia) — tidak lagi dihitung pemain non-UE / asing">🇪🇺 Lolos non-UE</button><button class="btn" data-pc="klausul">Hapus klausul rilis</button><button class="btn" data-pc="trait">Hapus trait</button><button class="btn" data-preg="8,19,0">Daftarkan ke semua kompetisi</button><button class="btn" data-plove="1">❤️ Suka pada saya</button><button class="btn" data-prel="1">🤝 Klausul rilis ${money(relFeeGet())}</button></div><p class="muted" style="font-size:12.5px;margin:12px 0 0">Tip: di tab Ringkasan, klik angka atribut mana pun untuk mengubahnya langsung.</p></div></div>`;
    if (tab === 'analisis') return `<div class="grid g2"><div class="card"><h3>Grafik Atribut</h3>${fmRadar(p.raw, isGK)}</div>
      <div class="card"><h3>Standar ${esc(p.assess?.posName || '')}</h3><p style="margin:0 0 10px">Level saat ini: <b>${esc(p.assess?.tier || '—')}</b></p>
      ${p.assess && p.assess.gaps.length ? `<p class="muted" style="margin:0 0 8px">Agar kelas dunia, atribut kunci ini perlu mencapai 16:</p>${p.assess.gaps.map(g => `<div class="fm-attr"><span>${esc(g.label)}</span><b class="${aCls(g.v)}">${g.v} → ${g.need}</b></div>`).join('')}` : '<div class="advice">Semua atribut kunci sudah di level kelas dunia.</div>'}
      <a class="btn sm" style="margin-top:12px" href="#panduan?pos=${p.bp}">Lihat panduan posisi →</a></div></div>
      <div class="card" style="margin-top:16px"><h3>Analisis Asisten</h3>${p.advice.length ? p.advice.map(a => `<div class="advice">${esc(a)}</div>`).join('') : '<p class="muted">Tidak ada catatan khusus.</p>'}</div>`;
    if (tab === 'peran') return `<div class="grid g2"><div class="card"><h3>Rating per Posisi</h3>${p.positions.map(x => `<div class="li" style="cursor:default"><span class="score ${sCls(x.r)}">${x.r.toFixed(0)}</span><div class="grow"><b>${esc(x.label)}</b><small>${x.fam === 1 ? 'Natural' : x.fam >= 0.9 ? 'Cukup akrab' : 'Asing'}</small></div><div class="bar b-${sCls(x.r)}" style="width:100px"><i style="width:${x.r}%"></i></div></div>`).join('')}</div>
      <div class="card"><h3>Peran Terbaik</h3>${p.roles.map(r => `<div class="li" style="cursor:default"><span class="score ${sCls(r.score)}">${r.score.toFixed(0)}</span><div class="grow"><b>${esc(r.name)}</b><small>${esc(r.en)}${r.natural ? '' : ' · posisi tidak natural'}</small></div></div>`).join('')}</div></div>`;
    if (tab === 'mirip') return `<div class="card"><h3>Pemain dengan profil atribut mirip <small>posisi ${esc(p.bpLabel)}</small></h3>${p.similar ? playerTable(p.similar, { cols: ['name', 'sim', 'age', 'capa', 'rating', 'value', 'wage'] }) : loading('Mencari pemain mirip…')}</div>`;
  };
  const me = { kind: 'P', type: 'person', value: p.id };
  const reopen = () => setTimeout(() => openPlayer(p.id), 300);
  const bindBody = () => {
    const D = $('#drawer');
    D.querySelectorAll('[data-role]').forEach(b => b.onclick = () => { role = b.dataset.role; drawBody(); });
    D.querySelectorAll('[data-pstage]').forEach(b => b.onclick = async () => { if (await runCheat('push', me, { stage: b.dataset.pstage, withAttrs: $('#pWith').checked }, `${p.name}: push CA→PA tahap ${b.querySelector('b').textContent}`)) reopen(); });
    D.querySelectorAll('[data-pq]').forEach(b => b.onclick = async () => { const q = b.dataset.pq; const r = q === 'pa' ? await runCheat('pa', me, { value: 200 }, `${p.name}: PA → 200`) : q === 'perpanjang' ? await runCheat('contract', me, { op: 'perpanjang', n: 5 }, `${p.name}: kontrak +5 tahun`) : q === 'gaji' ? await runCheat('contract', me, { op: 'gaji', n: 50 }, `${p.name}: gaji −50%`) : await runCheat(q, me, {}, `${p.name}: ${b.textContent}`); if (r) reopen(); });
    D.querySelectorAll('[data-pcit]').forEach(b => b.onclick = async () => { const r = await runCheat('citizen', me, {}, `${p.name}: tambah kewarganegaraan kedua (lolos aturan non-UE)`); if (r && r.nat) toast(r.players ? `🇪🇺 ${p.name} kini juga warga ${r.nat} — label nEU hilang setelah layar FM diperbarui` : (r.msg || 'Tidak ada perubahan'), r.players ? 'ok' : 'info'); });
    D.querySelectorAll('[data-pc]').forEach(b => b.onclick = async () => { if (await runCheat('cond', me, { op: b.dataset.pc }, `${p.name}: ${b.textContent}`)) reopen(); });
    D.querySelectorAll('[data-prel]').forEach(b => b.onclick = async () => { const r = await runCheat('cond', me, { op: 'rilisMurah', value: relFeeGet() }, `${p.name}: klausul rilis ${money(relFeeGet())} (klub wajib menerima)`); if (r && r.msg) toast(r.msg, 'info'); });
    D.querySelectorAll('[data-plove]').forEach(b => b.onclick = async () => { await runCheat('love', me, {}, `${p.name}: menyukai manajer`); });
    D.querySelectorAll('[data-preg]').forEach(b => b.onclick = async () => { await runCheat('register', me, { codes: b.dataset.preg.split(',').map(Number) }, `${p.name}: ${b.textContent.toLowerCase()}`); });
    D.querySelectorAll('[data-edit]').forEach(b => b.onclick = async () => { const k = b.dataset.edit; const v = prompt(`Nilai baru untuk ${LBL[k] || k} (1-20):`, b.textContent); if (!v) return; try { await post('/api/cheat/run', { action: 'attr', scope: { kind: 'P', type: 'person', value: p.id }, params: { key: k, value: Number(v) } }); toast('✓ Diubah di FM27'); reopen(); } catch (e) { toast('Gagal: ' + e.message, 'err'); } });
    if (tab === 'mirip' && !p.similar) api('/api/similar/' + p.id).then(s => { p.similar = s; if (tab === 'mirip') drawBody(); });
  };
  const drawBody = () => { const b = $('#drawer .drawer-body'); if (b) { b.innerHTML = body(); bindBody(); } };
  const draw = () => {
    $('#drawer').innerHTML = head() + `<div class="drawer-body">${body()}</div>`;
    $('#drawer').querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; $('#drawer').querySelectorAll('[data-t]').forEach(x => x.classList.toggle('on', x === b)); drawBody(); });
    $('#dFM').onclick = () => openInFM(p.name, p.id, 'P');
    { const rows = rowsOf('P'); const k = rows.findIndex(r => r.id === p.id); const ix = $('#dIdx');
      if (k < 0) { $('#drawer .pnav').style.display = 'none'; } else { ix.textContent = (k + 1) + ' / ' + rows.length; $('#dPrev').disabled = k === 0; $('#dNext').disabled = k === rows.length - 1; }
      $('#dPrev').onclick = () => moveRow(-1, true); $('#dNext').onclick = () => moveRow(1, true); }
    $('#dLeg').onclick = () => legendPick(p, reopen);
    $('#dTarget').onclick = async () => { const on = TARGETS.has(p.id); await post('/api/targets', { action: on ? 'remove' : 'add', id: p.id }); await loadTargets(); toast(on ? 'Dihapus dari Target Transfer' : '⭐ Ditambahkan ke Target Transfer'); draw(); };
    $('#dWatch').onclick = async () => { await post('/api/shortlist', { action: watched() ? 'remove' : 'add', id: p.id }); await loadShort(); toast(watched() ? 'Ditambahkan ke daftar pantau' : 'Dihapus dari daftar pantau'); draw(); };
    $('#dCmp').onclick = () => { if (!COMPARE.includes(p.id)) COMPARE = [...COMPARE, p.id].slice(-3); toast(`Ditambahkan ke perbandingan (${COMPARE.length}/3)`); if (COMPARE.length >= 2) { hideDrawer(true); location.hash = 'banding'; if (location.hash === '#banding') route(); } };
    if (live) { const t = $('#liveTag'); if (t) t.style.display = ''; }
    $('#drawer').querySelectorAll('[data-abil]').forEach(b => b.onclick = () => editAbility(p, b.dataset.abil, reopen));
    bindBody();
  };
  draw();
  // Data live menyusul tanpa menahan tampilan
  pL.then(l => {
    if (!l || l.kind !== 'P' || !$('#drawer').classList.contains('show') || !$('#drawer .pro-head')) return;
    live = l; p.ca = l.ca; p.pa = l.pa; Object.assign(p.raw, l.attrs);
    if ($('#vCA')) { $('#vCA').textContent = p.ca; $('#vPA').textContent = p.pa; }
    const t = $('#liveTag'); if (t) t.style.display = '';
    if (tab === 'profil') drawBody();
  });
}

async function openStaff(id) {
  SEL = { kind: 'S', id: Number(id) }; markRow();
  const s = await api('/api/staffone/' + id);
  const live = await api('/api/live/' + id).catch(() => null);
  if (live && live.kind === 'S') { s.ca = live.ca; s.pa = live.pa; s.groups.forEach(g => g.items.forEach(a => { if (a.k in live.attrs) a.v = live.attrs[a.k]; })); }
  showDrawer(`<div class="drawer-head" style="padding-bottom:18px"><div class="ph">${ava(s.name, 60, s.id)}<div style="flex:1"><h2>${esc(s.name)}</h2><div class="meta">${esc(s.job)} · ${esc(s.club || 'Tanpa klub')} · ${s.age || '?'} th · ${esc((s.nat || [])[0] || '')}</div>
    <div class="row-flex" style="margin-top:8px"><span class="badge good">Paling cocok: ${esc(s.fits[0].name)}</span></div></div>
    <div class="fm-abil"><div><small>Kemampuan</small><span class="stars">${starsAb(s.ca)}</span><b>${s.ca}</b></div><div><small>Potensi</small><span class="stars">${starsAb(s.pa)}</span><b>${s.pa}</b></div></div>
    <button class="btn ghost" onclick="hideDrawer()">${ic('x')}</button></div></div>
  <div class="drawer-body"><div class="fm-grid">
    <div class="fm-attrs">${s.groups.filter(g => g.items.length).map(g => `<div class="fm-col"><div class="fm-col-h">${esc(g.g)}</div>${g.items.map(a => `<div class="fm-attr"><span>${esc(a.label)}</span><b class="${aCls(a.v)} edit" data-sedit="${a.k}" title="Klik untuk ubah di FM27">${a.v}</b></div>`).join('')}</div>`).join('')}</div>
    <div class="fm-side"><div class="card"><h3>⚡ Cheat Staf</h3><div class="row-flex"><button class="btn sm" data-sq="push">CA → PA (instan)</button><button class="btn sm" data-sq="max">Semua atribut 20</button><button class="btn sm" data-sq="melatih">Melatih 20</button><button class="btn sm primary" data-sq="fm">Buka di FM</button></div><p class="muted" style="font-size:12px;margin:8px 0 0">Klik angka atribut untuk mengubahnya.</p></div><div class="card"><h3>Kontrak</h3><div class="fm-attr"><span>Gaji</span><b>${wage(s.wage)}</b></div><div class="fm-attr"><span>Berakhir</span><b>${esc(s.expires || '—')}</b></div></div>
    <div class="card"><h3>Kecocokan Peran</h3>${s.fits.map(f => `<div class="fm-attr"><span>${esc(f.name)}</span><span class="stars">${stars(f.stars)}</span></div>`).join('')}</div></div>
  </div></div>`);
  const me = { kind: 'S', type: 'person', value: s.id }; const reopen = () => setTimeout(() => openStaff(s.id), 300);
  $('#drawer').querySelectorAll('[data-sq]').forEach(b => b.onclick = async () => { const q = b.dataset.sq; if (q === 'fm') return openInFM(s.name, s.id, 'S'); const r = q === 'push' ? await runCheat('staffPush', me, { stage: 'instan' }, `${s.name}: CA → PA`) : await runCheat('staffMax', me, { groups: q === 'max' ? ['melatih', 'mental', 'pengetahuan', 'medis'] : ['melatih'], level: 20 }, `${s.name}: ${b.textContent}`); if (r) reopen(); });
  $('#drawer').querySelectorAll('[data-sedit]').forEach(b => b.onclick = async () => { const v = prompt('Nilai baru (1-20):', b.textContent); if (!v) return; try { await post('/api/cheat/run', { action: 'attr', scope: { kind: 'S', type: 'person', value: s.id }, params: { key: b.dataset.sedit, value: Number(v) } }); toast('✓ Diubah di FM27'); reopen(); } catch (e) { toast('Gagal: ' + e.message); } });
}

// ---------- Panduan Rekrutmen ----------
async function pPanduan(page) {
  const all = await api('/api/guide');
  const qs = new URLSearchParams(location.hash.split('?')[1] || '');
  let pos = qs.get('pos') && all.find(g => g.pos === qs.get('pos')) ? qs.get('pos') : 'FB';
  let tier = 'elite';
  const draw = async () => {
    const g = all.find(x => x.pos === pos);
    page.innerHTML = `<div class="page-head"><div><h1>Panduan Rekrutmen</h1><p>Atribut kunci tiap posisi, alasannya, dan standar minimum dari level menengah sampai kelas dunia</p></div></div>
    <div class="chips" style="margin-bottom:16px">${all.map(x => `<button class="chip ${x.pos === pos ? 'on' : ''}" data-pos="${x.pos}">${esc(x.name)}</button>`).join('')}</div>
    <div class="card ladder"><h3>Tangga Rekrutmen — ${esc(g.name)} <small>klik satu tahap untuk mencari kandidatnya</small></h3>
      <div class="lad">${g.ladder.map((L, i) => `<button class="lad-step ${tier === L.id ? 'on' : ''}" data-tier="${L.id}" style="--i:${i}">
        <span class="lad-age">${L.age[0]}${L.age[1] >= 45 ? '+' : '–' + L.age[1]} th</span><b>${L.name}</b>
        <span class="lad-req">${L.pa ? `<i>PA ≥ ${L.pa}</i>` : ''}<i>CA ≥ ${L.ca}</i><i>Kunci ≥ ${L.keyMin}</i>${L.det ? `<i>Tekad ≥ ${L.det}</i>` : ''}${L.nf ? `<i>Kebugaran ≥ ${L.nf}</i>` : ''}</span>
        ${L.paTop ? `<span class="lad-top">★ kelas dunia: PA ≥ ${L.paTop}</span>` : ''}</button>`).join('')}</div>
      <p class="lad-tip" id="ladTip">${esc((g.ladder.find(L => L.id === tier) || g.ladder[0]).tip)}</p></div>
    <div class="grid g-main">
      <div class="card"><h3>Atribut Kunci — ${esc(g.name)}</h3>
        ${g.key.map((k, i) => `<div class="guide-key"><span class="gk-n">${i + 1}</span><div><b>${esc(k.label)}</b><p>${esc(k.why)}</p></div></div>`).join('')}
        <div style="margin-top:14px"><span class="muted">Atribut penting pendukung:</span><div class="row-flex" style="margin-top:6px">${g.imp.map(k => `<span class="badge">${esc(k.label)}</span>`).join('')}</div></div>
        <div class="advice" style="margin-top:14px">💡 ${esc(g.tips)}</div></div>
      <div class="grid" style="align-content:start">
        <div class="card"><h3>Standar Minimum</h3><table class="tbl std-tbl"><colgroup><col><col style="width:62px"><col style="width:66px"><col style="width:58px"></colgroup><thead><tr><th>Level</th><th class="num">Kunci</th><th class="num">Penting</th><th class="num">CA</th></tr></thead><tbody>
          ${g.tiers.map(t => `<tr><td><b>${esc(t.name)}</b><br><small class="muted">${esc(t.desc)}</small></td><td class="num"><span class="score ${t.key >= 16 ? 's5' : t.key >= 15 ? 's4' : t.key >= 13 ? 's3' : 's2'}">≥${t.key}</span></td><td class="num">≥${t.imp}</td><td class="num">≥${t.ca}</td></tr>`).join('')}</tbody></table>
          <p class="muted" style="font-size:12.5px;margin:10px 0 0">“Kunci ≥16” berarti <b>semua</b> atribut kunci di kiri minimal 16. Atribut penting cukup 60% yang memenuhi.</p></div>
        <div class="card"><h3>Potensi Kelas Dunia (Pemain Muda)</h3><p style="margin:0;line-height:1.6;font-size:13px">${esc(g.youth.note)}</p></div>
      </div></div>
    <div class="card" style="margin-top:16px"><h3>Cari ${esc(g.name)} sesuai standar <span class="chips" id="tiers">${[['dunia', 'Kelas Dunia'], ['elite', 'Elite'], ['atas', 'Papan Atas'], ['menengah', 'Menengah'], ['muda', '⭐ Potensi Kelas Dunia']].map(([k, v]) => `<button class="chip ${k === tier ? 'on' : ''}" data-tier="${k}">${v}</button>`).join('')}</span></h3>
      <div class="filters" style="margin-bottom:12px"><div class="field"><label>Usia maks</label><input id="g_age" type="number"></div><div class="field"><label>Nilai maks (${cur()})</label><input id="g_val" type="number"></div></div>
      <div id="gres">${loading()}</div></div>`;
    page.querySelectorAll('[data-pos]').forEach(b => b.onclick = () => { pos = b.dataset.pos; draw(); });
    page.querySelectorAll('[data-tier]').forEach(b => b.onclick = () => { tier = b.dataset.tier; page.querySelectorAll('[data-tier]').forEach(x => x.classList.toggle('on', x.dataset.tier === tier)); const L = g.ladder.find(x => x.id === tier); if (L) { $('#ladTip').textContent = L.tip; $('#gres').scrollIntoView({ behavior: 'smooth', block: 'start' }); } run(); });
    let t; ['#g_age', '#g_val'].forEach(s => $(s).oninput = () => { clearTimeout(t); t = setTimeout(run, 300); });
    run();
  };
  const run = async () => {
    const p = new URLSearchParams({ pos, tier }); if ($('#g_age').value) p.set('maxAge', $('#g_age').value); if ($('#g_val').value) p.set('maxValue', $('#g_val').value);
    const d = await api('/api/guide-search?' + p);
    $('#gres').innerHTML = `<p class="muted" style="margin:0 0 10px">${d.total.toLocaleString('id')} pemain memenuhi standar · kolom kunci: ${d.keys.map(esc).join(', ')}</p>` + (d.rows.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pemain</th><th class="num">Usia</th><th>CA / PA</th>${d.keys.map(k => `<th class="num" title="${esc(k)}">${esc(k.split(' ')[0].slice(0, 6))}</th>`).join('')}<th class="num">Rata²</th><th class="num">Nilai</th></tr></thead><tbody>
      ${d.rows.map(r => `<tr class="click" data-id="${r.id}"><td><div class="pname">${ava(r.name, 0, r.id)}<div><b>${esc(r.name)}</b><small>${logo(r.clubId)}${esc(r.club)}</small></div></div></td><td class="num">${r.age}</td><td>${capa(r.ca, r.pa)}</td>${r.keyVals.map(v => `<td class="num"><b class="${aCls(v)}" style="padding:1px 6px;border-radius:5px">${v}</b></td>`).join('')}<td class="num"><b>${r.keyAvg}</b></td><td class="num">${money(r.value)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty" style="padding:24px">Tidak ada pemain yang memenuhi standar ini. Coba level di bawahnya.</div>');
  };
  draw();
}

// ---------- Navigasi daftar dengan panah (ala Genie Scout) ----------
let SEL = null;
const rowsOf = kind => { const attr = kind === 'S' ? 'data-staff' : 'data-id'; const seen = new Set(); return [...document.querySelectorAll('#page [' + attr + ']')].filter(el => el.offsetParent !== null).map(el => ({ el, id: Number(el.getAttribute(attr)) })).filter(r => r.id && !seen.has(r.id) && seen.add(r.id)); };
function markRow() {
  document.querySelectorAll('.row-cur').forEach(el => el.classList.remove('row-cur'));
  if (!SEL) return; const r = rowsOf(SEL.kind).find(x => x.id === SEL.id);
  if (r) { r.el.classList.add('row-cur'); r.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}
const openRow = c => (c.kind === 'S' ? openStaff(c.id) : openPlayer(c.id));
function moveRow(step, open) {
  const kind = SEL ? SEL.kind : (rowsOf('P').length ? 'P' : 'S'); const rows = rowsOf(kind); if (!rows.length) return;
  let i = SEL ? rows.findIndex(r => r.id === SEL.id) : -1;
  i = i < 0 ? (step > 0 ? 0 : rows.length - 1) : Math.max(0, Math.min(rows.length - 1, i + step));
  if (SEL && rows[i].id === SEL.id) { toast(step > 0 ? 'Sudah pemain terakhir di daftar' : 'Sudah pemain pertama di daftar', 'info'); return; }
  SEL = { kind, id: rows[i].id }; markRow();
  if (open) openRow(SEL);
}
// Drawer ikut riwayat: tombol Back (mouse/keyboard/←) menutup profil dulu, baru kembali ke halaman sebelumnya
function showDrawer(html) {
  const wasOpen = $('#drawer').classList.contains('show');
  $('#drawer').innerHTML = html; $('#drawer').classList.add('show'); $('#scrim').classList.add('show');
  if (!wasOpen) history.pushState({ drawer: true }, '');
}
function hideDrawer(fromHistory) {
  if (!$('#drawer').classList.contains('show')) return;
  $('#drawer').classList.remove('show'); $('#scrim').classList.remove('show');
  if (!fromHistory && history.state && history.state.drawer) history.back();
}
window.addEventListener('popstate', () => { if ($('#drawer').classList.contains('show')) hideDrawer(true); });
const goBack = () => { if ($('#drawer').classList.contains('show')) hideDrawer(); else history.back(); };
window.hideDrawer = hideDrawer;
$('#scrim').onclick = () => hideDrawer();

// ---------- Pusat Cheat (langsung ke memori FM27) ----------
let LISTS = null;
async function runCheat(action, scope, params, confirmTxt) {
  const sc = await api('/api/cheat/scope?' + new URLSearchParams(Object.entries(scope).filter(([, v]) => v !== '' && v != null)));
  if (!sc.count) { toast('Cakupan kosong'); return null; }
  const many = sc.count > 50;
  if (!(await ask({ icon: many ? '⚠️' : '⚡', tone: many ? 'warn' : '', title: confirmTxt, ok: 'Ya, terapkan', body: `Akan diterapkan ke <b>${sc.count.toLocaleString('id')} ${scope.kind === 'S' ? 'staf' : 'pemain'}</b>${many ? ' — jumlahnya banyak, pastikan cakupannya sudah benar' : ''}.${sc.sample.length ? `<div class="sample">Contoh: ${sc.sample.slice(0, 4).map(esc).join(', ')}${sc.count > 4 ? ', …' : ''}</div>` : ''}<p style="margin:12px 0 0;font-size:13px" class="muted">Nilai asli disimpan otomatis. Anda bisa membatalkannya di Riwayat selama FM27 belum ditutup.</p>` }))) return null;
  // Pengaman: cakupan di luar klub sendiri yang besar / "semua sekaligus" → konfirmasi kedua, tidak bisa disetujui dengan Enter
  const wide = scope.type === 'all' || (!['person', 'myclub'].includes(scope.type) && sc.count > 300);
  if (wide && !(await ask({ icon: '🛑', tone: 'bad', noEnter: true, title: scope.type === 'all' ? 'Ubah SELURUH database FM?' : 'Ubah ' + sc.count.toLocaleString('id') + ' pemain di luar klub Anda?', ok: 'Ya, ubah ' + sc.count.toLocaleString('id') + ' ' + (scope.kind === 'S' ? 'staf' : 'pemain'), body: `<p>Cakupan saat ini: <b>${esc({ all: 'SEMUA pemain di semua klub & liga', club: 'klub lain', div: 'satu liga', nat: 'satu negara' }[scope.type] || scope.type)}</b> — <b>${sc.count.toLocaleString('id')}</b> orang akan berubah, bukan hanya skuad Anda.</p><p class="muted">Bila Anda hanya ingin skuad sendiri, tekan Batal lalu pilih cakupan <b>Klub saya</b>.</p>` }))) return null;
  toast('Menerapkan ke FM27…', 'info');
  try {
    const r = await post('/api/cheat/run', { action, scope, params });
    toast(r.msg && !r.ok ? r.msg : `✓ Selesai: ${r.players ?? r.ok} diubah${r.avgGain ? ` · rata-rata CA +${r.avgGain}` : ''}${r.full ? ` · ${r.full} tidak muat (slot penuh)` : ''}${r.bad ? ` · ${r.bad} gagal` : ''}`, r.msg && !r.ok ? 'info' : 'ok');
    return r;
  } catch (e) { toast('Gagal: ' + e.message); return null; }
}
window.runCheat = runCheat;
const STAGE_BTNS = [['halus', 'Halus', '10%'], ['ringan', 'Ringan', '25%'], ['sedang', 'Sedang', '50%'], ['cepat', 'Cepat', '75%'], ['instan', 'Instan', '100%']];

async function pCheat(page) {
  const [st, hist] = await Promise.all([api('/api/cheat/status'), api('/api/cheat/history')]);
  if (!LISTS) LISTS = await api('/api/lists').catch(() => ({ clubs: [], divs: [], nats: [] }));
  const S = { kind: 'P', type: 'myclub', value: '', minAge: '', maxAge: '' };
  page.innerHTML = `<div class="page-head"><div><h1>Pusat Cheat</h1><p>Diterapkan langsung ke memori Football Manager 27 · tanpa Cheat Engine</p></div>
    <div class="row-flex"><span class="pill ${st.ok ? 'ok' : 'bad'}"><i></i>${st.ok ? `FM27 terhubung (pid ${st.pid})` : esc(st.error || 'FM27 tidak berjalan')}</span><button class="btn" id="reidx">${ic('refresh', 16)} Pindai ulang</button></div></div>
  ${VERSI && VERSI.mode !== 'cocok' && VERSI.mode !== 'tanpa-fm' ? `<div class="note ${VERSI.mode === 'terkunci' ? 'bad-note' : 'warn'} cheat-note">${VERSI.mode === 'terkunci' ? '⛔' : '🆕'} <b>${esc(VERSI.msg)}</b> ${(VERSI.test && VERSI.test.checks || []).map(c => `<span class="vchk ${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '✗'} ${esc(c.name)}</span>`).join('')}</div>` : ''}<div class="note warn cheat-note">⚠️ <b>Cadangkan save dulu.</b> Perubahan baru permanen saat Anda menyimpan game · bisa dibatalkan di tab Riwayat selama FM27 belum ditutup.</div>
  <div class="auto-tgt" id="autoTgt" style="display:none"></div>
  <div class="card" data-keep="1" style="margin-bottom:16px"><h3>1 · Pilih Cakupan <small id="scCount">…</small></h3>
    <div class="chips" style="margin-bottom:12px"><button class="chip on" data-kind="P">Pemain</button><button class="chip" data-kind="S">Staf</button></div>
    <div class="filters">
      <div class="field"><label>Cakupan</label><select id="scType"><option value="person">Satu orang</option><option value="myclub" selected>Klub saya</option><option value="club">Klub tertentu</option><option value="div">Liga / region</option><option value="nat">Negara</option><option value="all">Semua sekaligus</option></select></div>
      <div class="field" id="scValWrap" style="grid-column:span 2;display:none"><label id="scValLbl">Nama</label><input id="scVal" list="scList" placeholder="Ketik untuk mencari…"><datalist id="scList"></datalist></div>
      <div class="field"><label>Usia min</label><input id="scMin" type="number"></div>
      <div class="field"><label>Usia maks</label><input id="scMax" type="number" placeholder="mis. 21"></div>
    </div></div>
  <div id="actP"><h3 class="sec-h">2 · Aksi Pemain</h3><div class="grid g2">
    <div class="card"><h3>🚀 Push CA → PA <small>pilih kecepatan</small></h3><p class="muted" style="margin:0 0 12px;font-size:13px">Menaikkan kemampuan saat ini mendekati potensi. Persentase = porsi jarak CA→PA yang ditutup sekali klik. Bisa diklik berulang untuk naik bertahap.</p>
      <div class="stage-row">${STAGE_BTNS.map(([k, n, pct], i) => `<button class="stage s${i}" data-stage="${k}"><b>${n}</b><small>${pct}</small></button>`).join('')}</div>
      <label class="chk"><input type="checkbox" id="withAttrs" checked> Naikkan atribut juga (langsung terlihat). Tanpa ini, atribut naik perlahan lewat latihan.</label></div>
    <div class="card"><h3>💎 Potensi (PA)</h3><p class="muted" style="margin:0 0 12px;font-size:13px">Tetapkan potensi maksimal. 200 = batas tertinggi FM.</p>
      <div class="row-flex"><input id="paVal" type="number" value="200" min="1" max="200" class="inp" style="width:90px"><button class="btn primary" id="paBtn">Terapkan PA</button></div>
      <h3 style="margin-top:18px">🧠 Mental & Tersembunyi</h3><div class="row-flex"><button class="btn" id="hidBtn">Atribut tersembunyi terbaik</button><button class="btn" id="persBtn">Kepribadian teladan</button></div>
      <p class="muted" style="margin:8px 0 0;font-size:12px">Konsistensi, Laga Penting, Fleksibilitas & Tekad → 20 · Rawan Cedera & Bermain Kotor → 1 · Profesionalisme, Ambisi, dll → 20, Kontroversi → 1.</p></div>
    <div class="card"><h3>📄 Kontrak</h3><div class="row-flex"><button class="btn" data-con="gaji" data-n="50">Gaji −50%</button><button class="btn" data-con="gaji" data-n="75">Gaji −75%</button><button class="btn" data-con="perpanjang" data-n="1">Kontrak +1 th</button><button class="btn" data-con="perpanjang" data-n="5">Kontrak +5 th</button><button class="btn" data-con="bisadijual">Hapus “tidak dijual”</button><button class="btn" data-con="daftarjual">Masukkan daftar transfer</button></div></div>
    <div class="card"><h3>🩹 Kondisi & Kebahagiaan</h3><div class="row-flex"><button class="btn" data-cond="cedera">Pulihkan semua cedera</button><button class="btn" data-cond="ban">Hapus larangan bertanding</button><button class="btn" data-cond="bahagia">Hapus ketidakbahagiaan</button></div>
      <p class="muted" style="margin:8px 0 0;font-size:12px">Cedera: daftar cedera dikosongkan, kondisi & ketajaman laga 100%. Ketidakbahagiaan: keluhan yang masih berjalan diakhiri hari ini + moral maksimum.</p></div>
    <div class="card"><h3>👑 Pemain Legenda</h3><div id="legBox" class="muted">Memuat…</div>
      <p class="muted" style="margin:8px 0 0;font-size:12px">Buka profil pemain (mis. regen) → tombol <b>👑 Legenda</b> → pilih dari 417 legenda (Messi, Maldini, Pirlo, …). Atribut, kepribadian, posisi, kaki & trait disalin sesuai usianya; CA naik tiap hari game hingga penuh di usia puncak. PA = PA legenda.</p></div>
    <div class="card"><h3>🔭 Atribut Tanpa Filter di FM</h3><div class="row-flex"><button class="btn primary" id="knowBtn">Pengetahuan scouting 100%</button></div>
      <p class="muted" style="margin:8px 0 0;font-size:12px">Pengetahuan scouting semua staf klub Anda (dan Anda sendiri) dibuat 100% di setiap negara yang mereka kenal, sehingga FM menampilkan angka atribut asli, bukan rentang. Untuk negara yang belum dikenal staf mana pun, kirim scout ke sana dulu.</p></div>
    <div class="card"><h3>🏛️ Board</h3>
      <div class="bp-box"><div><b>Board selalu setuju</b> <span class="badge" id="bpSt">belum tersedia</span><p class="muted" style="margin:4px 0 0;font-size:12.5px">Sedang dikembangkan. Kode keputusan board di FM 27.1 belum ditemukan, jadi tombol ini dikunci sampai Asisten diperbarui. Fitur fasilitas di bawah tetap bisa dipakai.</p></div>
        <label class="sw" style="opacity:.4;pointer-events:none" title="Belum tersedia"><input type="checkbox" id="bpOn" disabled><span></span></label></div>
      <hr style="border:0;border-top:1px solid var(--line);margin:12px 0">
      <div class="row-flex"><button class="btn" id="boardBtn">Selesaikan permintaan fasilitas sekarang</button></div>
      <p class="muted" style="margin:8px 0 0;font-size:12px">Bonus: permintaan fasilitas yang sudah disetujui (lapangan latihan, akademi, dll.) langsung rampung hari ini, tanpa menunggu berbulan-bulan. Ajukan dulu permintaannya ke board di FM.</p></div>
    <div class="card"><h3>🏟️ Tim: Latihan & Kekompakan</h3><div class="row-flex"><button class="btn" data-cond="latih">Kebahagiaan latihan maksimal</button><button class="btn" data-cond="kompak">Kekompakan tim maksimal</button><button class="btn" data-cond="bugar">Kondisi & ketajaman 100%</button></div>
      <p class="muted" style="margin:8px 0 0;font-size:12px">Berlaku untuk pemain dalam cakupan (biasanya "Klub saya"). Kekompakan = keakraban pemain satu sama lain di skuad.</p></div>
    <div class="card"><h3>🛂 Izin Kerja, Klausul & Trait</h3><div class="row-flex"><button class="btn primary" id="citBtn" title="Tambah kewarganegaraan kedua = negara liga klub Anda (mis. Italia)">🇪🇺 Lolos aturan non-UE</button><button class="btn" data-cond="izinkerja">Work permit ON</button><button class="btn" data-cond="tanpaizin">Work permit OFF</button><button class="btn" data-cond="klausul">Hapus klausul rilis</button><button class="btn" data-cond="trait">Hapus semua trait</button></div>
      <p class="muted" style="margin:8px 0 0;font-size:12px"><b>🇪🇺 Lolos aturan non-UE</b> = pemain diberi kewarganegaraan kedua negara liga klub Anda (mis. Italia untuk Serie A), jadi tidak lagi memakai slot pemain non-UE / asing. Bisa dibatalkan di Riwayat. Work permit ON = pemain dianggap sudah punya izin kerja (berguna sebelum membeli pemain asing). Klausul rilis: semua jenis klausul harga pelepasan dihapus dari kontrak.</p></div>
    <div class="card"><h3>🤝 Klub Menerima Tawaran Saya</h3><div class="row-flex"><span class="muted">Klausul rilis →</span><select id="relFee" class="inp"><option value="1">£1</option><option value="1000">£1 rb</option><option value="10000">£10 rb</option><option value="100000">£100 rb</option><option value="1000000">£1 jt</option><option value="5000000">£5 jt</option><option value="10000000">£10 jt</option></select><button class="btn primary" id="relBtn">Pasang klausul rilis murah</button></div>
      <p class="muted" style="margin:8px 0 0;font-size:12px">Klausul rilis di kontrak pemain dalam cakupan diubah menjadi <b>biaya minimum</b> senilai pilihan. Aturan FM: tawaran yang memenuhi klausul ini <b>wajib diterima klub</b> (keputusan akhir tetap di tangan pemain). Bila kontrak tidak punya klausul rilis, satu klausul bonus (bayaran tampil/cadangan) diubah menjadi klausul rilis. Tidak berlaku bila kontrak tak punya keduanya.</p></div>
    <div class="card"><h3>⭐ Klub Superstar <small>pemain top mau bergabung</small></h3><div class="row-flex"><span class="muted">Reputasi klub →</span><select id="repVal" class="inp"><option value="9999" selected>9999 · terbesar di dunia</option><option value="9000">9000 · elite Eropa</option><option value="8000">8000 · papan atas</option></select><button class="btn primary" id="repBtn">Terapkan ke klub saya</button></div>
      <p class="muted" style="margin:8px 0 0;font-size:12px">Pemain FM memutuskan mau/tidak berunding terutama dari <b>reputasi klub tujuan</b> dibanding klubnya sekarang. Reputasi tim utama Anda dinaikkan, jadi bintang seperti Yamal mau datang walau Anda di League One. Gabungkan dengan <b>Klub Menerima Tawaran</b> (klub penjual) dan <b>Manajer Disukai</b>. Efek samping: ekspektasi board & media ikut naik — kembalikan lewat <b>Riwayat → Batalkan</b> setelah transfer selesai.</p></div>
    <div class="card"><h3>❤️ Manajer Disukai Semua</h3><div class="row-flex"><button class="btn primary" id="loveBtn">Buat semua menyukai saya</button></div>
      <p class="muted" style="margin:8px 0 0;font-size:12px">Hubungan setiap orang dalam cakupan dengan Anda (sebagai manajer) dinaikkan ke tingkat tertinggi; yang belum punya hubungan ditambahkan. Berlaku untuk pemain <b>dan</b> staf — pilih "Staf" di Cakupan untuk staf.</p></div>
    <div class="card"><h3>📝 Registrasi Kompetisi <small>tetap bisa walau masa daftar sudah tutup</small></h3><div class="row-flex"><button class="btn" data-reg="8">Liga domestik</button><button class="btn" data-reg="19">Piala domestik</button><button class="btn" data-reg="0">Kompetisi Eropa</button><button class="btn primary" data-reg="8,19,0">Semua kompetisi</button></div>
      <p class="muted" style="margin:8px 0 0;font-size:12px">Mendaftarkan pemain dalam cakupan ke skuad kompetisi tim mereka sendiri. Pemain yang sudah terdaftar dilewati. Cek di layar Registrasi Skuad FM setelahnya.</p></div>
    <div class="card" id="youthCard"><h3>🌱 Youth Intake Emas <small id="yStat">memuat…</small></h3>
      <p class="muted" style="margin:0 0 10px;font-size:13px">Pemain hasil youth intake otomatis mendapat PA di rentang pilihan, <b>tepat di hari intake sesuai jadwal FM</b>. Aktifkan sebelum tanggal intake, lalu lanjutkan game seperti biasa.</p>
      <div class="ybox"><div class="field"><label>1 · Berlaku untuk</label><select id="yType"><option value="myclub">Klub saya</option><option value="club">Klub tertentu</option><option value="div">Liga</option><option value="nat">Negara / wilayah</option><option value="all">Semua klub di dunia</option></select></div>
        <div class="field" id="yValWrap" style="display:none"><label id="yValLbl">Nama klub</label><input id="yVal" list="yList" placeholder="Ketik untuk mencari…"><datalist id="yList"></datalist></div></div>
      <div class="field" style="margin:12px 0 6px"><label>2 · Rentang potensi (PA)</label></div>
      <div class="stage-row yrange">${[[150, 165, 'Bagus'], [166, 180, 'Bintang'], [181, 200, 'Kelas dunia']].map(([a, b, n], i) => `<button class="stage s${i + 1}" data-yr="${a},${b}"><b>${a}–${b}</b><small>${n}</small></button>`).join('')}</div>
      <div class="row-flex" style="margin-top:12px"><button class="btn primary" id="yToggle">Aktifkan</button><span class="muted" id="yClub" style="font-size:12.5px"></span></div>
      <div id="ySched" class="ysched"></div>
      <div id="yLog" style="margin-top:10px"></div>
      <p class="muted" style="margin:8px 0 0;font-size:12px">Setiap klub di-boost <b>tepat saat youth intake-nya sendiri tiba</b> (jadwal per negara). Pemain intake yang sudah datang sebelum booster diaktifkan tidak disentuh. Asisten harus tetap terbuka saat hari intake lewat. Mengganti pilihan saat aktif langsung tersimpan. Kemampuan saat ini (CA) dibiarkan, jadi mereka berkembang lewat latihan. Bisa dibatalkan di Riwayat.</p></div>
    <div class="card" id="cbCard"><h3>⚡ Mode Comeback <small class="muted" id="cbInfo"></small></h3>
      <p class="muted" style="margin:0 0 10px;font-size:13px">Untuk membalikkan laga: <b>tim Anda</b> dibuat super (atribut ×power sampai maks 20, mental & tersembunyi terbaik, kondisi & ketajaman 100%, moral maksimum), dan <b>lawan</b> bisa sekalian dilemahkan (CA, atribut, mental). Aktifkan saat jeda/sebelum laga atau ketika tertinggal. <b>Hanya untuk laga ini:</b> semua perubahan (termasuk CA/PA sementara) <b>dikembalikan otomatis</b> begitu tanggal game berganti — atau tekan <b>Kembalikan</b> sendiri. ⚠️ Jangan simpan game saat mode aktif.</p>
      <div class="field" style="margin:4px 0 6px"><label>Power tim saya</label></div>
      <div class="stage-row">${[[1.5, 'Kuat', '×150%'], [2, 'Super', '×200%'], ['max', 'Dewa', 'semua 20']].map(([v, n, s], i) => `<button class="stage s${i + 2}${i === 1 ? ' on' : ''}" data-cb="${v}"><b>${n}</b><small>${s}</small></button>`).join('')}</div>
      <div class="ybox" style="margin-top:12px"><div class="field"><label>Lawan (opsional)</label><input id="cbOpp" list="cbList" placeholder="Ketik nama klub lawan…"><datalist id="cbList"></datalist></div>
        <div class="field"><label>Lemahkan lawan</label><select id="cbOf"><option value="0.6">Sedikit (×0,6)</option><option value="0.4" selected>Banyak (×0,4)</option><option value="0.2">Lumpuh (×0,2)</option></select></div></div>
      <div class="row-flex" style="margin-top:12px;gap:10px"><button class="btn primary" id="cbGo">⚡ Aktifkan Mode Comeback</button><button class="btn" id="cbBack">↩️ Kembalikan (setelah laga)</button></div></div>
    <div class="card" id="dsCard"><h3>💥 Hancurkan Tim <small class="muted" id="dsInfo"></small></h3>
      <p class="muted" style="margin:0 0 10px;font-size:13px">Merusak <b>mental</b> pemain lawan supaya mudah dikalahkan: keputusan, ketenangan, konsentrasi, kerja sama, tekad, kepemimpinan, dll. diturunkan; mereka jadi tidak konsisten, ciut di laga besar, rawan cedera & kartu, dan kepribadiannya rapuh di bawah tekanan. <b>CA, teknik & fisik tidak disentuh.</b> Pilih satu klub, atau satu liga untuk menghancurkan semua klub di dalamnya. <b>Klub Anda selalu dilewati.</b></p>
      <div class="ybox"><div class="field"><label>Target</label><select id="dsType"><option value="club">Klub tertentu</option><option value="div">Satu liga (semua klub)</option></select></div>
        <div class="field"><label id="dsLbl">Nama klub</label><input id="dsVal" list="dsList" placeholder="Ketik untuk mencari…"><datalist id="dsList"></datalist></div></div>
      <div class="field" style="margin:12px 0 6px"><label>Tingkat kehancuran</label></div>
      <div class="stage-row">${[[0.8, 'Goyah', 'mental ×0,8'], [0.6, 'Rapuh', 'mental ×0,6'], [0.4, 'Hancur', 'mental ×0,4'], [0.2, 'Lebur', 'mental ×0,2']].map(([v, n, s], i) => `<button class="stage s${i + 1}${i === 1 ? ' on' : ''}" data-ds="${v}"><b>${n}</b><small>${s}</small></button>`).join('')}</div>
      <div class="row-flex" style="margin-top:10px;gap:16px;flex-wrap:wrap"><label class="chk"><input type="checkbox" id="dsSenior" checked> Tim senior saja</label><label class="chk"><input type="checkbox" id="dsHid" checked> Tersembunyi terburuk (tidak konsisten, ciut di laga besar, rawan cedera, kasar)</label><label class="chk"><input type="checkbox" id="dsPers" checked> Kepribadian rapuh (tekanan, profesionalisme, temperamen rendah)</label><label class="chk"><input type="checkbox" id="dsFull"> Juga turunkan CA, teknik & fisik</label></div>
      <div class="row-flex" style="margin-top:12px"><button class="btn danger" id="dsGo">💥 Hancurkan</button></div>
      <p class="muted" style="margin:8px 0 0;font-size:12px">Nilai asli disimpan; batalkan di Riwayat selama FM27 belum ditutup.</p></div>
    <div class="card"><h3>✏️ Edit per atribut</h3><p class="muted" style="margin:0;font-size:13px">Buka profil pemain mana pun, lalu klik angka atribut untuk mengubahnya langsung di FM27.</p></div>
  </div>
  <h3 class="sec-h">💰 Keuangan Klub <small id="finClub" class="muted"></small></h3>
  <div class="card" id="finCard"><div id="finRead" class="muted">Membaca keuangan…</div>
    <div class="row-flex" style="margin-top:12px"><button class="btn" data-fin="saldoPersen" data-v="50">Saldo +50%</button><button class="btn" data-fin="saldoPersen" data-v="75">Saldo +75%</button><button class="btn" data-fin="saldoTambah" data-v="10000000">Saldo +£10 jt</button><button class="btn" data-fin="saldoTambah" data-v="100000000">Saldo +£100 jt</button><button class="btn" data-fin="lunasi">Saldo minus → 0</button></div>
    <div class="row-flex" style="margin-top:8px"><button class="btn" data-fin="transferTambah" data-v="10000000">Anggaran transfer +£10 jt</button><button class="btn" data-fin="transferTambah" data-v="50000000">Anggaran transfer +£50 jt</button><button class="btn" data-fin="gajiTambah" data-v="50000">Anggaran gaji +£50 rb/mgg</button><button class="btn" data-fin="gajiTambah" data-v="250000">Anggaran gaji +£250 rb/mgg</button></div>
    <p class="muted" style="margin:8px 0 0;font-size:12px">Berlaku untuk <b>klub saya</b>, atau klub yang dipilih di Cakupan bila cakupan = “Klub tertentu”. Cocokkan angka di atas dengan layar Keuangan FM sebelum memakai tombol anggaran.</p></div>
  </div>
  <div id="actS" style="display:none"><h3 class="sec-h">2 · Aksi Staf</h3><div class="grid g2">
    <div class="card"><h3>❤️ Manajer Disukai Staf</h3><div class="row-flex"><button class="btn primary" id="loveBtnS">Buat semua staf menyukai saya</button></div><p class="muted" style="margin:8px 0 0;font-size:12px">Hubungan staf dalam cakupan dengan Anda dinaikkan ke tingkat tertinggi.</p></div>
    <div class="card"><h3>🚀 Push CA → PA Staf</h3><div class="stage-row">${STAGE_BTNS.map(([k, n, pct], i) => `<button class="stage s${i}" data-sstage="${k}"><b>${n}</b><small>${pct}</small></button>`).join('')}</div></div>
    <div class="card"><h3>⭐ Maksimalkan Atribut Staf</h3><div class="row-flex" style="margin-bottom:10px"><span class="muted">Nilai:</span><input id="sLvl" type="number" value="20" min="1" max="20" class="inp" style="width:70px"></div>
      <div class="row-flex"><button class="btn" data-sg="melatih">Melatih</button><button class="btn" data-sg="mental">Mental</button><button class="btn" data-sg="pengetahuan">Pengetahuan</button><button class="btn" data-sg="medis">Medis</button><button class="btn primary" data-sg="melatih,mental,pengetahuan,medis">Semua</button></div>
      <p class="muted" style="margin:8px 0 0;font-size:12px">Melatih: menyerang, bertahan, kebugaran, kiper, mental, taktik, teknik, bola mati, pemain muda · Pengetahuan: menilai kemampuan/potensi/staf, negosiasi, taktik, analisis data.</p></div>
  </div></div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>↩️ Riwayat & Batalkan</h3><div id="hist">${histHtml(hist)}</div></div>
    <div class="card"><h3>🗺️ Sedang Dipetakan untuk FM27</h3><p class="muted" style="margin:0 0 10px;font-size:13px">Fitur ini butuh lokasi memori/kode FM27 yang belum terverifikasi. Supaya save Anda aman, fitur ini belum diaktifkan sampai lokasinya terbukti benar.</p>
      ${['Board selalu menyetujui permintaan baru (bukan hanya mempercepat yang disetujui)', 'Hapus hutang & pinjaman klub', 'Atribut tanpa filter untuk negara yang belum dikenal staf'].map(t => `<div class="cheat-item">${ic('bolt', 13)}<span>${t}</span><span class="g">segera</span></div>`).join('')}
      <p class="muted" style="margin:10px 0 0;font-size:12px">Catatan: di Asisten ini semua atribut pemain (termasuk tersembunyi) sudah tampil penuh tanpa filter scouting.</p></div>
  </div>`;
  const scope = () => ({ kind: S.kind, type: S.type, value: S.value, minAge: S.minAge, maxAge: S.maxAge });
  const fillList = () => {
    const wrap = $('#scValWrap'), dl = $('#scList');
    const need = ['person', 'club', 'div', 'nat'].includes(S.type); wrap.style.display = need ? '' : 'none';
    $('#scValLbl').textContent = { person: S.kind === 'S' ? 'Nama staf' : 'Nama pemain', club: 'Klub', div: 'Liga / divisi', nat: 'Negara' }[S.type] || '';
    const src = S.type === 'club' ? LISTS.clubs : S.type === 'div' ? LISTS.divs : S.type === 'nat' ? LISTS.nats : [];
    dl.innerHTML = src.slice(0, 600).map(x => `<option value="${esc(x.k)}">${x.n} pemain</option>`).join('');
  };
  let pt;
  const refreshCount = async () => {
    if (S.type === 'person') {
      const v = $('#scVal').value.trim();
      if (v.length >= 2) { const d = await api((S.kind === 'S' ? '/api/staff?q=' : '/api/search?limit=8&q=') + encodeURIComponent(v)); $('#scList').innerHTML = d.rows.slice(0, 12).map(x => `<option value="${esc(x.name)} #${x.id}">${esc(x.club)}</option>`).join(''); }
      const m = v.match(/#(\d+)$/); S.value = m ? m[1] : '';
    } else S.value = $('#scVal').value.trim();
    const sc = await api('/api/cheat/scope?' + new URLSearchParams(Object.entries(scope()).filter(([, v]) => v !== '')));
    $('#scCount').textContent = `${sc.count.toLocaleString('id')} ${S.kind === 'S' ? 'staf' : 'pemain'} dalam cakupan${sc.sample.length ? ' · ' + sc.sample.slice(0, 3).join(', ') : ''}`;
  };
  page.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => { S.kind = b.dataset.kind; page.querySelectorAll('[data-kind]').forEach(x => x.classList.toggle('on', x === b)); $('#actP').style.display = S.kind === 'P' ? '' : 'none'; $('#actS').style.display = S.kind === 'S' ? '' : 'none'; markPanels(); buildTabs(page); refreshCount(); });
  $('#scType').onchange = e => { S.type = e.target.value; $('#scVal').value = ''; fillList(); refreshCount(); };
  $('#scVal').oninput = () => { clearTimeout(pt); pt = setTimeout(refreshCount, 250); };
  $('#scMin').oninput = e => { S.minAge = e.target.value; clearTimeout(pt); pt = setTimeout(refreshCount, 250); };
  $('#scMax').oninput = e => { S.maxAge = e.target.value; clearTimeout(pt); pt = setTimeout(refreshCount, 250); };
  // ---- Deteksi otomatis: pemain yang sedang dibuka di FM (via Teknik Oda) atau di Asisten → jadi cakupan ----
  let AUTO_ON = true; try { AUTO_ON = localStorage.getItem('cheatAuto') !== '0'; } catch { }
  let autoSeen = null, autoCur = null;
  const autoBox = $('#autoTgt');
  const usePerson = (t) => {
    const kindBtn = page.querySelector(`[data-kind="${t.staff ? 'S' : 'P'}"]`); if (S.kind !== (t.staff ? 'S' : 'P') && kindBtn) kindBtn.click();
    S.type = 'person'; $('#scType').value = 'person'; fillList(); $('#scVal').value = `${t.name} #${t.id}`; S.value = String(t.id); refreshCount();
    autoCur = t; drawAuto();
  };
  const backToClub = () => { S.type = 'myclub'; $('#scType').value = 'myclub'; $('#scVal').value = ''; S.value = ''; fillList(); refreshCount(); autoCur = null; drawAuto(); };
  const drawAuto = () => {
    const t = autoSeen; if (!t) { autoBox.style.display = 'none'; return; }
    const active = autoCur && autoCur.id === t.id && S.type === 'person' && S.value === String(t.id);
    autoBox.style.display = ''; autoBox.classList.toggle('on', !!active);
    autoBox.innerHTML = `<div class="at-ic">${active ? '🎯' : '👀'}</div><div class="at-tx"><small>${active ? 'Cheat diterapkan ke pemain yang dibuka' : 'Terdeteksi dibuka'} ${t.src === 'fm' ? 'di FM' : 'di Asisten'}</small><b>${esc(t.name)}</b><span>${esc(t.club || '')}${t.ca != null ? ` · CA <b>${t.ca}</b> · PA <b>${t.pa}</b>` : ''}${t.age ? ` · ${t.age} th` : ''}</span></div>
      <div class="at-act">${active ? '<button class="btn sm" data-at="club">Kembali ke Klub saya</button>' : '<button class="btn primary sm" data-at="use">🎯 Pakai pemain ini</button>'}<label class="chk" title="Setiap kali Anda membuka profil pemain lain, cakupan ikut berganti"><input type="checkbox" id="atAuto"${AUTO_ON ? ' checked' : ''}> Otomatis</label></div>`;
    const u = autoBox.querySelector('[data-at="use"]'); if (u) u.onclick = () => usePerson(t);
    const c = autoBox.querySelector('[data-at="club"]'); if (c) c.onclick = backToClub;
    autoBox.querySelector('#atAuto').onchange = e => { AUTO_ON = e.target.checked; try { localStorage.setItem('cheatAuto', AUTO_ON ? '1' : '0'); } catch { } };
  };
  const pollAuto = async () => {
    if (!document.body.contains(autoBox)) return; // halaman sudah berganti
    let t = null;
    try {
      const o = await api('/api/fmopen');
      if (o && o.found) t = { src: 'fm', key: 'fm' + o.zaman, at: o.zaman, id: o.id, name: o.name, club: o.club, ca: o.ca, pa: o.pa, age: o.age, staff: !!o.staff };
    } catch { }
    if (ASIS_OPEN && (!t || ASIS_OPEN.at > t.at)) { const p = await api('/api/player/' + ASIS_OPEN.id).catch(() => null); if (p && p.name) t = { src: 'asisten', key: 'as' + ASIS_OPEN.at, at: ASIS_OPEN.at, id: ASIS_OPEN.id, name: p.name, club: p.club, ca: p.ca, pa: p.pa, age: p.age, staff: false }; }
    if (t && Date.now() - t.at > 30 * 60000 && !autoSeen) t = null; // abaikan profil yang dibuka lama sekali sebelum halaman ini
    if (t && (!autoSeen || autoSeen.key !== t.key)) {
      const isNew = !!autoSeen || Date.now() - t.at < 5 * 60000; autoSeen = t;
      if (AUTO_ON && isNew) { usePerson(t); toast(`🎯 Cakupan: ${t.name}`, 'info'); } else drawAuto();
    } else if (t && autoSeen && (t.ca !== autoSeen.ca || t.pa !== autoSeen.pa)) { autoSeen = t; drawAuto(); }
    setTimeout(pollAuto, 2000);
  };
  pollAuto();
  const after = async () => { $('#hist').innerHTML = histHtml(await api('/api/cheat/history')); bindHist(); };
  page.querySelectorAll('[data-stage]').forEach(b => b.onclick = async () => { await runCheat('push', scope(), { stage: b.dataset.stage, withAttrs: $('#withAttrs').checked }, `Push CA→PA tahap ${b.querySelector('b').textContent} (${b.querySelector('small').textContent} jarak)`); after(); });
  $('#paBtn').onclick = async () => { await runCheat('pa', scope(), { value: Number($('#paVal').value) }, `Tetapkan PA = ${$('#paVal').value}`); after(); };
  $('#hidBtn').onclick = async () => { await runCheat('hidden', scope(), {}, 'Atribut tersembunyi terbaik'); after(); };
  $('#persBtn').onclick = async () => { await runCheat('pers', scope(), {}, 'Kepribadian teladan'); after(); };
  page.querySelectorAll('[data-con]').forEach(b => b.onclick = async () => { await runCheat('contract', scope(), { op: b.dataset.con, n: Number(b.dataset.n || 0) }, b.textContent); after(); });
  page.querySelectorAll('[data-sstage]').forEach(b => b.onclick = async () => { await runCheat('staffPush', scope(), { stage: b.dataset.sstage }, `Staf: push CA→PA tahap ${b.querySelector('b').textContent}`); after(); });
  page.querySelectorAll('[data-sg]').forEach(b => b.onclick = async () => { await runCheat('staffMax', scope(), { groups: b.dataset.sg.split(','), level: Number($('#sLvl').value) }, `Staf: atribut ${b.textContent} → ${$('#sLvl').value}`); after(); });
  let Y = null;
  const yDraw = () => {
    if (!Y) return; const on = Y.active;
    page.querySelectorAll('[data-yr]').forEach(b => b.classList.toggle('on', b.dataset.yr === `${Y.min},${Y.max}`));
    $('#yToggle').textContent = on ? 'Matikan' : 'Aktifkan'; $('#yToggle').classList.toggle('primary', !on);
    $('#yStat').innerHTML = on ? `<span class="good">● aktif · PA ${Y.min}–${Y.max}</span>` : 'nonaktif';
    $('#yClub').textContent = 'Cakupan: ' + (Y.label || '—') + (on && Y.last && Y.last.error ? ' · ' + Y.last.error : on ? ' · menunggu hari intake' : '');
    const S = Y.schedule || [], dm = s => { const [, m, d] = s.split('-'); return `${+d} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][m - 1]}`; };
    $('#ySched').innerHTML = S.length ? `<div class="ysch-h">Jadwal intake dalam cakupan</div>` + S.slice(0, 8).map(s => `<div class="ysch"><b>${esc(s.nat)}</b><span class="muted">${s.clubs} klub${s.clubs <= 3 ? ' · ' + s.sample.map(esc).join(', ') : ''}</span><span>${s.unknown ? '<span class="muted">jadwal tidak diketahui</span>' : `${dm(s.start)} – ${dm(s.end)}`}</span><span class="ych ${s.phase || ''}">${s.unknown ? '—' : s.phase === 'berlangsung' ? 'berlangsung' : 'H-' + s.daysToStart}</span></div>`).join('') + (S.length > 8 ? `<div class="muted" style="font-size:12px">+${S.length - 8} negara lain</div>` : '') : '';
    $('#yLog').innerHTML = (Y.log || []).slice(0, 4).map(l => { const by = {}; l.players.forEach(x => (by[x.club || 'Klub'] = by[x.club || 'Klub'] || []).push(x)); return `<div class="advice">✓ ${new Date(l.at).toLocaleString('id')} — ${l.players.length} pemain intake${Object.entries(by).slice(0, 6).map(([k, v]) => `<br><b>${esc(k)}</b>: ${v.map(x => (x.name ? esc(x.name.split(' ').pop()) + ' ' : '') + 'PA ' + (x.from != null ? x.from + '→' : '') + x.pa).join(', ')}`).join('')}${Object.keys(by).length > 6 ? `<br><span class="muted">+${Object.keys(by).length - 6} klub lain</span>` : ''}</div>`; }).join('');
  };
  // Cakupan youth intake sendiri (tidak bergantung kartu Cakupan di atas)
  const yScope = () => ({ type: $('#yType').value, value: $('#yVal').value.trim() });
  const yFill = () => {
    const t = $('#yType').value; $('#yValWrap').style.display = ['club', 'div', 'nat'].includes(t) ? '' : 'none';
    $('#yValLbl').textContent = t === 'div' ? 'Nama liga' : t === 'nat' ? 'Negara / wilayah liga' : 'Nama klub';
    if (t === 'nat') { $('#yList').innerHTML = ((Y && Y.nats) || []).map(x => `<option value="${esc(x)}">`).join(''); return; }
    const src = t === 'club' ? LISTS.clubs : t === 'div' ? LISTS.divs : [];
    $('#yList').innerHTML = src.slice(0, 800).map(x => `<option value="${esc(x.k)}">${x.n} pemain</option>`).join('');
  };
  const yLoad = async () => {
    Y = await api('/api/youth').catch(() => null); if (!Y) return;
    const sc = Y.scope || { type: 'myclub' }; $('#yType').value = sc.type || 'myclub'; $('#yVal').value = sc.value || ''; yFill(); yDraw();
  };
  const ySet = async o => {
    // Pengaman: youth intake otomatis untuk klub lain / liga / negara / semua klub mengubah pemain muda di banyak klub
    if (o.active && o.scope && o.scope.type !== 'myclub' && !(Y && Y.active && Y.scope && Y.scope.type === o.scope.type && Y.scope.value === o.scope.value)) {
      const what = { all: 'SEMUA klub di database', div: 'satu liga penuh', nat: 'semua klub satu negara', club: 'klub lain' }[o.scope.type] || o.scope.type;
      if (!(await ask({ icon: '🛑', tone: 'bad', noEnter: true, title: 'Youth intake otomatis untuk ' + what + '?', ok: 'Ya, aktifkan', body: '<p>Selama aktif, Asisten <b>terus-menerus</b> (±30 dtk sekali) menaikkan PA setiap pemain muda baru di <b>' + esc(what) + '</b>, bukan hanya klub Anda. Perubahannya ikut tersimpan saat game disimpan.</p><p class="muted">Bila hanya untuk akademi sendiri, tekan Batal lalu pilih <b>Klub saya</b>.</p>' }))) { yDraw(); return; }
    }
    Y = { ...Y, ...(await post('/api/youth', o)) }; yDraw(); refreshStatus();
  };
  const yValid = () => { const s = yScope(); if (['club', 'div', 'nat'].includes(s.type) && !s.value) { toast(s.type === 'div' ? 'Ketik nama liga dulu' : s.type === 'nat' ? 'Ketik nama negara dulu' : 'Ketik nama klub dulu', 'info'); return null; } return s; };
  $('#yType').onchange = async () => { yFill(); $('#yVal').value = ''; if (Y && Y.active && !['club', 'div', 'nat'].includes($('#yType').value)) { await ySet({ active: true, scope: yScope() }); toast('Cakupan youth intake: ' + Y.label); } };
  $('#yVal').onchange = async () => { if (Y && Y.active && yValid()) { try { await ySet({ active: true, scope: yScope() }); toast('Cakupan youth intake: ' + Y.label); } catch (e) { toast(e.message, 'err'); } } };
  page.querySelectorAll('[data-yr]').forEach(b => b.onclick = async () => { const [a, c] = b.dataset.yr.split(',').map(Number); await ySet({ min: a, max: c }); toast(`Rentang PA youth intake: ${a}–${c}`); });
  $('#yToggle').onclick = async () => { const on = !Y.active; const s = on ? yValid() : null; if (on && !s) return; try { await ySet(on ? { active: true, scope: s } : { active: false }); } catch (e) { return toast(e.message, 'err'); } toast(Y.active ? `🌱 Youth intake emas aktif untuk ${Y.label} — lanjutkan game sampai hari intake` : 'Youth intake emas dimatikan', Y.active ? 'ok' : 'info'); };
  yLoad();
  // ---- Hancurkan Tim ----
  let cbP = 2;
  $('#cbList').innerHTML = LISTS.clubs.slice(0, 1500).map(x => `<option value="${esc(x.k)}">`).join('');
  const cbStat = async () => { const s = await api('/api/comeback').catch(() => null); $('#cbInfo').textContent = s && s.active ? `AKTIF${s.opp ? ' · lawan ' + s.opp : ''}` : ''; $('#cbBack').disabled = !(s && s.active); };
  cbStat();
  page.querySelectorAll('[data-cb]').forEach(b => b.onclick = () => { cbP = b.dataset.cb === 'max' ? 'max' : Number(b.dataset.cb); page.querySelectorAll('[data-cb]').forEach(x => x.classList.toggle('on', x === b)); });
  $('#cbGo').onclick = async () => {
    const opp = $('#cbOpp').value.trim();
    if (!(await ask({ icon: '⚡', tone: 'warn', title: 'Aktifkan Mode Comeback?', ok: 'Ya, aktifkan', body: `Tim Anda: power <b>${cbP === 'max' ? 'Dewa (semua 20)' : cbP * 100 + '%'}</b>, kondisi 100%, moral maksimum.${opp ? `<br>Lawan <b>${esc(opp)}</b> dilemahkan ×${$('#cbOf').value.replace('.', ',')}.` : ''}<p class="muted" style="margin:10px 0 0;font-size:13px">Tekan <b>Kembalikan</b> setelah laga untuk memulihkan semuanya.</p>` }))) return;
    toast('Mengaktifkan…', 'info');
    try { const r = await post('/api/comeback', { power: cbP, opp, oppFactor: Number($('#cbOf').value) }); toast(`⚡ ${r.mine.players} pemain: atribut rata-rata ${r.mine.avgBefore} → ${r.mine.avgAfter}${r.opp ? ` · lawan CA ${r.opp.caBefore} → ${r.opp.caAfter}` : ''}`, 'ok'); cbStat(); after(); }
    catch (e) { toast('Gagal: ' + e.message); }
  };
  $('#cbBack').onclick = async () => { try { const r = await post('/api/comeback/restore', {}); toast(`↩️ Dikembalikan (${r.ok} penulisan)`, 'ok'); cbStat(); after(); } catch (e) { toast('Gagal: ' + e.message); } };
  let dsF = 0.6;
  const dsFill = () => { const t = $('#dsType').value; $('#dsLbl').textContent = t === 'div' ? 'Nama liga' : 'Nama klub'; $('#dsList').innerHTML = (t === 'div' ? LISTS.divs : LISTS.clubs).slice(0, 800).map(x => `<option value="${esc(x.k)}">${x.n} pemain</option>`).join(''); };
  const dsQ = () => ({ type: $('#dsType').value, value: $('#dsVal').value.trim(), senior: $('#dsSenior').checked ? '1' : '0' });
  const dsPrev = async () => { const q = dsQ(); if (!q.value) { $('#dsInfo').textContent = ''; return null; } const r = await api('/api/destroy?' + new URLSearchParams(q)).catch(() => null); $('#dsInfo').textContent = r ? `${r.count} pemain · ${r.clubs} klub · rata-rata CA ${r.avgCa}` : ''; return r; };
  $('#dsType').onchange = () => { $('#dsVal').value = ''; dsFill(); dsPrev(); }; $('#dsVal').onchange = dsPrev; $('#dsSenior').onchange = dsPrev; dsFill();
  page.querySelectorAll('[data-ds]').forEach(b => b.onclick = () => { dsF = Number(b.dataset.ds); page.querySelectorAll('[data-ds]').forEach(x => x.classList.toggle('on', x === b)); });
  $('#dsGo').onclick = async () => {
    const q = dsQ(); if (!q.value) return toast('Pilih klub / liga dulu', 'info');
    const pv = await dsPrev(); if (!pv || !pv.count) return toast('Tidak ada pemain di target ini', 'info');
    if (!(await ask({ icon: '💥', tone: 'warn', title: `Hancurkan ${q.type === 'div' ? 'liga ' : ''}${q.value}?`, ok: 'Ya, hancurkan', body: `<b>${pv.count.toLocaleString('id')} pemain</b> di ${pv.clubs} klub (${pv.sample.map(esc).join(', ')}${pv.clubs > 6 ? ', …' : ''}). Atribut mental ×${String(dsF).replace('.', ',')}${$('#dsHid').checked ? ', tersembunyi terburuk' : ''}${$('#dsPers').checked ? ', kepribadian rapuh' : ''}. ${$('#dsFull').checked ? `CA juga turun: rata-rata ${pv.avgCa} → ${Math.round(pv.avgCa * dsF)}.` : `CA tetap (${pv.avgCa}).`}${pv.skippedMine ? '<br>Klub Anda di liga ini dilewati.' : ''}<p class="muted" style="margin:10px 0 0;font-size:13px">Bisa dibatalkan di Riwayat selama FM27 belum ditutup.</p>` }))) return;
    toast('Menghancurkan…', 'info');
    try { const r = await post('/api/destroy', { ...q, factor: dsF, hidden: $('#dsHid').checked, pers: $('#dsPers').checked, full: $('#dsFull').checked, lockPA: $('#dsFull').checked }); toast(`💥 ${r.players} pemain di ${r.clubs} klub: mental rata-rata ${r.mentalBefore} → ${r.mentalAfter}${r.caAfter !== r.caBefore ? ` · CA ${r.caBefore} → ${r.caAfter}` : ''}`, 'ok'); dsPrev(); after(); }
    catch (e) { toast('Gagal: ' + e.message); }
  };
  $('#loveBtnS').onclick = async () => { await runCheat('love', scope(), {}, 'Staf dalam cakupan menyukai manajer'); after(); };
  { const rf = $('#relFee'); rf.value = String(relFeeGet()); if (!rf.value) rf.value = '1000000'; rf.onchange = () => relFeeSet(Number(rf.value)); }
  $('#relBtn').onclick = async () => { const v = Number($('#relFee').value); relFeeSet(v); await runCheat('cond', scope(), { op: 'rilisMurah', value: v }, `Klausul rilis murah ${money(v)} (klub wajib menerima)`); after(); };
  const legBox = async () => { const el = $('#legBox'); if (!el) return; const c = await api('/api/legenda').catch(() => ({ players: {} })); const l = Object.entries(c.players || {});
    el.innerHTML = l.length ? `<div class="leg-act">${l.map(([u, x]) => `<div><span>👑 <b>${esc(x.name)}</b> → ${esc(x.legName)}</span><span class="muted">CA ${x.ca}/${x.pa} · penuh di usia ${x.peak}</span><button class="btn sm ghost" data-legoff="${u}" title="Hentikan pertumbuhan otomatis">✕</button></div>`).join('')}</div>${c.last ? `<p class="muted" style="font-size:12px;margin:6px 0 0">Terakhir tumbuh: ${c.last.grown.map(g => esc(g.name) + ' CA ' + g.ca).join(', ')}</p>` : ''}` : 'Belum ada pemain legenda yang sedang tumbuh.';
    el.querySelectorAll('[data-legoff]').forEach(b => b.onclick = async () => { await post('/api/legenda', { uid: b.dataset.legoff }); legBox(); }); };
  legBox();
  $('#knowBtn').onclick = async () => { const r = await runCheat('know', { kind: 'S', type: 'myclub' }, {}, 'Pengetahuan scouting 100% (staf klub saya + manajer)'); if (r && r.msg) toast(r.msg, 'info'); after(); };
  const bpShow = r => { const s = $('#bpSt'); if (!s) return; $('#bpOn').checked = !!r.active; s.textContent = r.active ? 'AKTIF (matikan)' : r.disabled ? 'belum tersedia' : r.error ? 'tidak tersedia' : 'mati'; $('#bpOn').disabled = !!r.disabled && !r.active; { const L = $('#bpOn').closest('label'); L.style.opacity = $('#bpOn').disabled ? '.4' : ''; L.style.pointerEvents = $('#bpOn').disabled ? 'none' : ''; } s.title = r.disabled || ''; s.className = 'badge ' + (r.active ? 'ok' : ''); if (r.error) s.title = r.error; };
  api('/api/board').then(bpShow).catch(() => bpShow({ error: 'server' }));
  $('#bpOn').onchange = async e => { const on = e.target.checked; $('#bpSt').textContent = 'memasang…'; try { const r = await post('/api/board', { on }); bpShow(r); if (r.error) toast(r.error); else toast(r.active ? '🏛️ Board selalu setuju: AKTIF' : 'Board kembali normal', 'ok'); } catch (er) { toast('Gagal: ' + er.message); bpShow({ error: er.message }); } };
  $('#boardBtn').onclick = async () => { const r = await runCheat('board', { kind: 'P', type: 'myclub' }, {}, 'Selesaikan permintaan fasilitas board klub saya'); if (r && r.msg) toast(r.msg, 'info'); after(); };
  { const rb = $('#repBtn'); if (rb) rb.onclick = async () => { const v = Number($('#repVal').value); const r = await runCheat('rep', { kind: 'P', type: 'myclub', value: '' }, { value: v }, `Reputasi klub saya → ${v} (hanya klub Anda)`); if (r && r.before) toast(`⭐ Reputasi klub ${r.before} → ${r.after}. Batalkan di Riwayat setelah transfer selesai.`, 'ok'); after(); }; }
  $('#loveBtn').onclick = async () => { await runCheat('love', scope(), {}, 'Manajer disukai semua orang dalam cakupan'); after(); };
  page.querySelectorAll('[data-reg]').forEach(b => b.onclick = async () => { await runCheat('register', scope(), { codes: b.dataset.reg.split(',').map(Number) }, 'Daftarkan ke ' + b.textContent.toLowerCase()); after(); });
  const COND_LBL = { latih: 'Kebahagiaan latihan maksimal', kompak: 'Kekompakan tim maksimal', bugar: 'Kondisi & ketajaman 100%', cedera: 'Pulihkan semua cedera', ban: 'Hapus larangan bertanding', bahagia: 'Hapus ketidakbahagiaan + moral maksimum', izinkerja: 'Work permit ON', tanpaizin: 'Work permit OFF', klausul: 'Hapus klausul rilis', trait: 'Hapus semua trait' };
  { const cb = $('#citBtn'); if (cb) cb.onclick = async () => { const r = await runCheat('citizen', scope(), {}, 'Tambah kewarganegaraan kedua (lolos aturan non-UE / pemain asing)'); if (r && r.nat && r.players) toast(`🇪🇺 ${r.players} pemain kini juga warga ${r.nat}`, 'ok'); after(); }; }
  page.querySelectorAll('[data-cond]').forEach(b => b.onclick = async () => { await runCheat('cond', scope(), { op: b.dataset.cond }, COND_LBL[b.dataset.cond]); after(); });
  const gbp = v => (v < 0 ? '−' : '') + '£' + Math.abs(v).toLocaleString('en-GB');
  const finClub = () => (S.type === 'club' && S.value ? S.value : '');
  const loadFin = async () => {
    const f = await api('/api/cheat/finance' + (finClub() ? '?club=' + encodeURIComponent(finClub()) : ''));
    $('#finClub').textContent = '· ' + (f.club || '');
    $('#finRead').innerHTML = f.error ? `<span class="bad">${esc(f.error)}</span>` : `<div class="grid g4"><div><small class="muted">Saldo bank</small><div class="big">${gbp(f.balance)}</div></div><div><small class="muted">Anggaran transfer</small><div class="big">${gbp(f.transfer)}</div></div><div><small class="muted">Anggaran gaji / minggu</small><div class="big">${gbp(f.wageBudget)}</div></div><div><small class="muted">Total gaji saat ini / minggu</small><div class="big">${gbp(f.wageBill)}</div></div></div>`;
    return f;
  };
  page.querySelectorAll('[data-fin]').forEach(b => b.onclick = async () => {
    const club = finClub();
    await runCheat('finance', club ? { kind: 'P', type: 'club', value: club } : { kind: 'P', type: 'myclub' }, { op: b.dataset.fin, value: Number(b.dataset.v || 0) }, `Keuangan ${club || 'klub saya'}: ${b.textContent}`);
    loadFin(); after();
  });
  $('#scVal').addEventListener('change', () => { if (S.type === 'club') loadFin(); });
  if (st.ok) loadFin(); else $('#finRead').textContent = 'FM27 tidak berjalan';
  $('#reidx').onclick = async () => { toast('Memindai FM27…'); await api('/api/cheat/status'); route(); };
  const bindHist = () => page.querySelectorAll('[data-undo]').forEach(b => b.onclick = async () => { if (!(await ask({ icon: '↩️', title: 'Batalkan perubahan ini?', body: 'Nilai di FM27 akan dikembalikan seperti sebelum perubahan.', ok: 'Ya, kembalikan' }))) return; try { const r = await post('/api/cheat/undo', { id: Number(b.dataset.undo) }); toast(`↩️ ${r.ok} nilai dikembalikan`); } catch (e) { toast(e.message); } after(); });
  bindHist(); fillList(); refreshCount();
  // Tab: setiap kartu aksi = satu tab
  page.querySelectorAll('#actP .card, #actS .card, .grid.g2 > .card').forEach(c => { const h = c.querySelector(':scope > h3'); if (h && !c.dataset.keep) { const full = (h.childNodes[0] ? h.childNodes[0].textContent : h.textContent).replace(/^[^A-Za-z0-9À-ÿ]+/, '').trim(); c.dataset.tab = TAB_SHORT.find(([re]) => re.test(full))?.[1] || secLabel(h); } });
  const fc = $('#finCard'); if (fc) fc.dataset.tab = 'Keuangan Klub';
  const fh = fc && fc.previousElementSibling; if (fh && fh.classList.contains('sec-h')) fh.classList.add('fin-h');
  function markPanels() { $('#actP').toggleAttribute('data-panel-off', S.kind !== 'P'); $('#actS').toggleAttribute('data-panel-off', S.kind !== 'S'); if (fc) fc.toggleAttribute('data-panel-off', S.kind !== 'P'); }
  markPanels();
}
function histHtml(h) {
  if (!h.length) return '<p class="muted" style="margin:0">Belum ada perubahan.</p>';
  return h.map(x => `<div class="li" style="cursor:default"><div class="grow"><b>${esc(x.label)}</b><small>${new Date(x.at).toLocaleString('id-ID')} · ${x.n} nilai</small></div>${x.samePid !== false ? `<button class="btn sm" data-undo="${x.id}">Batalkan</button>` : '<span class="badge">sesi lama</span>'}</div>`).join('');
}

// Buka di FM27: fokuskan jendela FM + salin nama ke clipboard untuk kotak pencarian FM
async function openInFM(name, id, kind) {
  const r = await post('/api/openfm', { id, kind });
  if (r.ok && r.direct) return toast('🎮 Profil ' + name + ' dibuka langsung di FM27');
  try { await navigator.clipboard.writeText(name); } catch {}
  toast(r.ok ? `FM27 dibuka · "${name}" disalin — klik kotak cari di FM lalu Ctrl+V${r.why ? ' (buka langsung belum bisa: ' + r.why + ')' : ''}` : 'FM27 tidak berjalan');
}
window.openInFM = openInFM;

// ---------- Pengaturan ----------
// ---------- Latihan: jadwal mingguan otomatis ----------
async function pLatihan(page) {
  const ltTab = (() => { try { return localStorage.getItem('ltTab') || 'tim'; } catch { return 'tim'; } })();
  if (ltTab !== 'tim') return pLatihanIndividu(page, ltTab);
  let w = Number(localStorage.getItem('ltWeek') || 0) || 0, cmp = localStorage.getItem('ltCmp') !== '0', open = {};
  const LOADTXT = ['istirahat', 'ringan', 'sedang', 'tinggi'];
  const cls = c => 'c-' + String(c).replace(/\s+/g, '-');
  const SLOT = ['Sesi 1', 'Sesi 2', 'Ekstra'];
  const draw = d => {
    if (!d.ok) { page.innerHTML = `<div class="empty"><div style="font-size:46px">🏋️</div><h2>Data latihan belum tersedia</h2><p>${esc(d.error)}</p><button class="btn primary" id="ltRe">${ic('refresh', 16)} Coba lagi</button></div>`; $('#ltRe').onclick = load; return; }
    const total = d.checklist.reduce((t, g) => t + g.items.length, 0);
    const done = d.checklist.reduce((t, g) => t + g.items.filter(x => d.cek[g.id + ':' + x.id]).length, 0);
    const day = x => `<div class="lt-day${x.date === d.today ? ' today' : x.date < d.today ? ' past' : ''}">
      <div class="dh"><b>${x.gun}</b><small>${x.tgl}${x.date === d.today ? ' · hari ini' : x.date < d.today ? ' · lewat' : ''}</small></div>
      <div class="lt-type ${x.type}" title="${esc(x.label)}">${esc(x.label)}</div>
      ${x.sessions.map((s, i) => `<div class="lt-s ${cls(s.cat)}"><div class="sl"><span>${SLOT[i]}</span>${s.cat === 'Laga' || s.cat === 'Pemulihan' ? '' : `<span class="dots" title="Intensitas ${LOADTXT[s.load]}">${'●'.repeat(s.load)}${'○'.repeat(3 - s.load)}</span>`}</div><div class="sn">${esc(s.name)}</div><div class="sc">${esc(s.cat)}</div>${s.weakCoach ? `<span class="weak" title="Pelatih terbaik di area ini hanya bernilai ${s.weakCoach} (< 60): efek sesi lebih kecil">⚠</span>` : ''}</div>`).join('')}
      <div class="note">${esc(x.note)}</div>
      <div class="lt-load" title="Beban latihan hari ini"><span>Beban</span><span class="bar"><i class="${x.load >= 7 ? 'h' : x.load >= 5 ? 'm' : ''}" style="width:${Math.min(100, x.load / 9 * 100)}%"></i></span><b>${x.load}</b></div>
      ${cmp && x.fm ? `<div class="lt-fm${x.same ? ' same' : ''}">${x.same ? '✓ Sama dengan jadwal FM' : `<b>FM sekarang:</b> ${x.fm.map(s => esc(s.name)).join(' · ')} <span title="beban">(${x.fmLoad})</span>`}</div>` : ''}
    </div>`;
    const grp = g => {
      const lim = open[g.id] ? g.items.length : 5;
      return `<div class="lt-grp"><div class="gt ${g.tone}"><span>${esc(g.title)} · ${g.items.length}</span><small>${esc(g.hint)}</small></div>
      ${g.items.slice(0, lim).map(x => { const k = g.id + ':' + x.id; return `<label class="lt-ck${d.cek[k] ? ' done' : ''}"><input type="checkbox" data-k="${k}"${d.cek[k] ? ' checked' : ''}><span class="t"><b>${esc(x.name)}</b> <span class="muted" style="font-size:12px">${esc(x.pos || '')}</span><small>${esc(x.reason)}</small></span>${fmBtn(x.id, 'P', x.name)}</label>`; }).join('')}
      ${g.items.length > 5 ? `<button class="lt-more" data-more="${g.id}">${open[g.id] ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${g.items.length})`}</button>` : ''}</div>`;
    };
    page.innerHTML = `${ltTabs('tim')}
    <div class="page-head"><div><h1>Latihan Mingguan</h1><p>Disusun otomatis dari jadwal laga, kondisi skuad, laporan performa, taktik & kualitas pelatih Anda.</p>
      <div class="lt-head-meta"><span class="badge ok">📅 ${esc(d.week.label)}</span>${d.tactic ? `<span class="badge ok" title="Taktik aktif di FM">♟ ${esc(d.tactic.name)} · ${esc(d.tactic.mentality || '')}</span>` : ''}${d.congested ? '<span class="badge bad">Jadwal padat</span>' : ''}${d.needs && d.needs.mode && d.needs.mode !== 'normal' ? `<span class="badge ${d.needs.mode === 'bagus' ? 'good' : 'bad'}" title="Disesuaikan otomatis dari 5 laga resmi terakhir">${{ perbaikan: '🚨 Mode perbaikan', waspada: '⚠️ Tren menurun', bagus: '🔥 Tim sedang bagus' }[d.needs.mode]} · ${d.needs.form.w}M ${d.needs.form.d}S ${d.needs.form.l}K</span>` : ''}<span class="badge ok" title="Waktu Teknik Oda terakhir membaca FM">Data Teknik Oda ${esc(String(d.updated || '').slice(11, 16))}</span></div></div>
      <div class="row-flex lt-noprint"><div class="lt-weeks">${['Minggu ini', 'Minggu depan', '+2 minggu'].map((t, i) => `<button data-w="${i}" class="${i === w ? 'on' : ''}">${t}</button>`).join('')}</div>
      ${d.fm ? `<button class="btn" id="ltCmp">${cmp ? 'Sembunyikan' : 'Bandingkan'} jadwal FM</button>` : ''}<button class="btn primary" id="ltApplyTim" title="Pasang rencana ke FM lewat plugin Jembatan">✅ Terapkan ke FM</button><button class="btn" id="ltCopy">📋 Salin jadwal</button><button class="btn" id="ltRe">${ic('refresh', 16)} Muat ulang</button></div></div>
    ${d.fixtures.length ? `<div class="lt-fx">${d.fixtures.map(f => `<div class="f" title="${esc(f.turnuva)}"><span class="ha ${f.evde ? '' : 'a'}">${f.evde ? 'K' : 'T'}</span><div><b>${esc(f.rakip)}</b> <small>${esc(f.kisa || '')}</small><br><small>${f.gun} ${f.tgl}</small></div>${f.gap != null ? `<span class="gap ${f.gap <= 3 ? 'tight' : f.gap <= 4 ? 'mid' : ''}" title="Jarak dari laga sebelumnya">+${f.gap} hr</span>` : ''}</div>`).join('')}</div>` : ''}
    <div class="lt-grid">${d.days.map(day).join('')}</div>
    <div class="lt-legend">${[['Menyerang', 'var(--red)'], ['Penguasaan', 'var(--blue)'], ['Bertahan', 'var(--lt-purple)'], ['Bola Mati', 'var(--gold)'], ['Kebugaran', 'var(--lt-teal)'], ['Pengembangan', 'var(--brand)'], ['Pemulihan', 'var(--lt-grey)']].map(([n, c]) => `<span><i style="--c:${c}"></i>${n}</span>`).join('')}<span>● intensitas sesi</span><span>⚠ pelatih area &lt; 60</span><span>Total beban minggu: <b>${d.load}</b>${d.fm ? ` · FM sekarang: <b>${d.fmLoad}</b>` : ''}</span></div>
    <div class="lt-cols">
      <div class="card"><h3>Daftar Tindakan <span class="lt-prog">${done} / ${total} selesai</span></h3><p class="muted" style="margin:2px 0 0;font-size:12.5px">Pemain senior · centang setelah Anda atur di FM (tersimpan per minggu).</p>${d.checklist.length ? d.checklist.map(grp).join('') : '<p class="muted">Tidak ada pemain yang perlu perhatian khusus. 👍</p>'}</div>
      <div class="grid" style="align-content:start">
        ${d.fm ? `<div class="card"><h3>Audit Jadwal FM Anda <small>vs jadwal laga minggu ini</small></h3><div class="lt-audit">${d.fm.notes.map(n => `<div class="a ${n.tone}"><span>${n.tone === 'bad' ? '⛔' : n.tone === 'warn' ? '⚠️' : n.tone === 'ok' ? '✅' : 'ℹ️'}</span><span>${esc(n.text)}</span></div>`).join('')}</div></div>` : ''}
        <div class="card"><h3>Briefing Asisten</h3><div class="lt-brief">${d.briefing.map(b => `<div class="lt-b ${b.tone || ''}"><h4><span>${b.icon}</span><span>${esc(b.title)}</span></h4><p>${esc(b.text)}</p></div>`).join('')}</div></div>
        <div class="card"><h3>Pelatih Terbaik per Area <small>perkiraan 0–100 · &lt; 60 = efek sesi berkurang</small></h3>${d.coaches.map(c => `<div class="lt-coach"><div><b>${esc(c.area)}</b><small>${esc(c.coach || '—')}</small></div><span class="bar"><i class="${c.score < 60 ? 'w' : ''}" style="width:${c.score}%"></i></span><span class="num">${c.score || '—'}</span></div>`).join('')}</div>
      </div>
    </div>`;
    bindLtTabs(page);
    page.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { w = Number(b.dataset.w); try { localStorage.setItem('ltWeek', w); } catch { } load(); });
    $('#ltRe').onclick = load;
    if ($('#ltCmp')) $('#ltCmp').onclick = () => { cmp = !cmp; try { localStorage.setItem('ltCmp', cmp ? '1' : '0'); } catch { } draw(d); };
    page.querySelectorAll('[data-more]').forEach(b => b.onclick = () => { open[b.dataset.more] = !open[b.dataset.more]; draw(d); });
    page.querySelectorAll('.lt-ck input').forEach(i => i.onchange = async () => { const k = i.dataset.k; if (i.checked) d.cek[k] = true; else delete d.cek[k]; draw(d); try { await post('/api/latihan/cek', { week: d.week.start, key: k, on: i.checked }); } catch (e) { toast('Gagal menyimpan: ' + e.message); } });
    page.querySelectorAll('.lt-ck .fmq').forEach(b => b.addEventListener('click', e => e.preventDefault()));
    $('#ltApplyTim').onclick = async () => {
      if (!await ask({ icon: '✅', title: 'Terapkan latihan tim ke FM?', ok: 'Terapkan', body: '<p><b>Sekarang:</b> Fokus Tambahan individu seluruh <b>skuad senior</b> dipasang di FM sesuai rekomendasi (kiper & regen dilewati).</p><p><b>Jadwal mingguan tim:</b> belum bisa dipasang otomatis — Asisten perlu satu rekaman <b>membuat jadwal custom</b> di FM (Latihan → Jadwal → buat baru → isi sesi → simpan). Sampai itu ada, atur sesi minggu ini memakai tombol 📋 Salin jadwal.</p><p class="muted">Simpan game di FM agar permanen.</p>' })) return;
      const btn = $('#ltApplyTim'); btn.disabled = true; btn.textContent = 'Menerapkan…';
      try {
        const r = await post('/api/latihan/terapkan-individu', { team: 'senior' });
        if (!r.ok) toast('Gagal: ' + r.error); else toast(`✓ Fokus ${r.applied} pemain senior diterapkan ke FM${r.failed ? ` · ${r.failed} gagal` : ''} · jadwal tim: menunggu rekaman jadwal custom`);
      } catch (e) { toast('Gagal: ' + e.message); }
      btn.disabled = false; btn.textContent = '✅ Terapkan ke FM';
    };
    $('#ltCopy').onclick = async () => {
      const txt = `Jadwal latihan ${d.week.label} — Asisten FM27\n` + d.days.map(x => `${x.gun} ${x.tgl} [${x.label}]: ${x.sessions.map(s => s.name).join(' | ')}`).join('\n');
      try { await navigator.clipboard.writeText(txt); toast('✓ Jadwal disalin. Atur sesinya di FM: Latihan → Jadwal.'); } catch { toast('Gagal menyalin ke clipboard'); }
    };
  };
  async function load() { page.innerHTML = loading('Menyusun jadwal latihan…'); try { draw(await api('/api/latihan?w=' + w)); } catch (e) { draw({ ok: false, error: e.message }); } }
  await load();
}

// ---------- Latihan: tab Tim Junior & Individu ----------
const ltTabs = act => `<div class="lt-tabs lt-noprint">${[['tim', '👥 Tim Utama'], ['junior', '🌱 Tim Junior'], ['individu', '🎯 Individu']].map(([k, v]) => `<button data-ltt="${k}" class="${k === act ? 'on' : ''}">${v}</button>`).join('')}</div>`;
function bindLtTabs(page) { page.querySelectorAll('[data-ltt]').forEach(b => b.onclick = () => { try { localStorage.setItem('ltTab', b.dataset.ltt); } catch { } route(); }); }
const INT_CLS = { Ganda: 'good', Normal: 'ok', Setengah: 'warn', Istirahat: 'bad' };
async function pLatihanIndividu(page, tab) {
  const d = await apiT('/api/latihan/individu', 45000);
  let team = (() => { try { return localStorage.getItem('ltTeam') || 'all'; } catch { return 'all'; } })();
  const cls = c => 'c-' + String(c).replace(/\s+/g, '-');
  const prioBar = r => `<span class="lt-prio" title="Prioritas pengembangan = ruang tumbuh × usia × (profesionalisme+tekad)"><i style="width:${Math.min(100, r.prio * 2)}%"></i></span>`;
  const row = r => `<tr class="click" data-id="${r.id}">
      <td><div class="pname">${ava(r.name, 0, r.id)}<div><b${r.noName ? ' class="muted"' : ''}>${esc(r.name)}</b><small>${esc(r.teamName)} · ${r.age} th · ${esc(r.pos || '')}</small></div>${fmBtn(r.id, 'P', r.name)}</div></td>
      <td>${capa(r.ca, r.pa)}</td><td class="num"><b style="color:var(--brand)">+${r.gap}</b>${prioBar(r)}</td>
      <td>${r.role ? esc(r.role.name) : '—'}</td>
      <td>${r.fmFocus ? `<span class="badge good" title="Fokus Tambahan FM yang paling menutup kekurangan atribut peran ini">${esc(r.fmFocus.name)}</span>${d.applied && d.applied[r.id] && d.applied[r.id].id === r.fmFocus.id ? ' <span title="Sudah diterapkan ke FM" style="color:var(--brand)">✓</span>' : ''}` : `<span class="muted" title="${r.role && r.role.pos === 'GK' ? 'Katalog fokus kiper belum direkam' : !r.pers ? 'Regen: nomor internal belum diketahui' : ''}">—</span>`}<div class="muted" style="font-size:11px;margin-top:3px">Terlemah: ${r.focus.map(f => `${esc(f.label)} ${f.v}`).join(', ')} · target ${r.cap}</div></td>
      <td><span class="badge ${INT_CLS[r.intensity]}" title="${esc(r.intWhy)}">${r.intensity}</span></td>
      <td class="lt-notes">${r.notes.length ? r.notes.map(n => `<div>• ${esc(n.t)}</div>`).join('') : '<span class="muted">—</span>'}</td></tr>`;
  const draw = () => {
    const rows = d.rows.filter(r => team === 'all' || r.team === team || (team === 'muda' && r.age <= 21));
    const yp = d.youth;
    const youthHtml = `<div class="card" style="margin-bottom:14px"><h3>Faktor Perkembangan Pemain Muda <small>yang menentukan seberapa cepat mendekati PA</small></h3>
        <div class="lt-factors">${d.factors.map(f => `<div class="${f.ok ? 'ok' : 'warn'}"><b>${esc(f.k)}</b><span>${esc(f.v)}</span></div>`).join('')}</div>
        <p class="muted" style="font-size:12.5px;margin:10px 0 0">Kunci di FM: (1) fokus individu ke atribut kunci terlemah, (2) intensitas ganda untuk pemain muda yang segar, (3) menit bermain rutin (tim junior/pinjaman), (4) mentor profesional, (5) pelatih & fasilitas junior bagus.</p></div>
      <div class="lt-cols" style="margin-top:0">${['u21', 'u18'].map(k => `<div class="card"><h3>Jadwal ${esc(yp[k].title)} <small>${yp[k].devSlots} slot pengembangan individu</small></h3><p class="muted" style="font-size:12.5px;margin:0 0 10px">${esc(yp[k].why)}</p>
        <div class="lt-mini-week">${yp[k].days.map(x => `<div><b>${x.gun.slice(0, 3)}</b>${x.sessions.map(s => `<span class="lt-s ${cls(s.cat)}"><span class="sn">${esc(s.name)}</span></span>`).join('')}</div>`).join('')}</div>
        <p class="muted" style="font-size:12px;margin:8px 0 0">Laga junior diasumsikan Sabtu — geser bila jadwal tim junior berbeda.</p></div>`).join('')}</div>
      <div class="card" style="margin-top:14px"><h3>Prioritas Pengembangan <small>pemain ≤21 th yang paling cepat bisa naik</small></h3>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pemain</th><th>CA / PA</th><th class="num">Ruang</th><th>Peran latihan</th><th>Fokus tambahan (FM)</th><th>Intensitas</th><th>Saran</th></tr></thead><tbody>${d.youthTop.map(row).join('') || '<tr><td colspan="7" class="muted">Belum ada pemain ≤21 tahun.</td></tr>'}</tbody></table></div></div>`;
    const indivHtml = `<div class="sk-bar"><label>Tim <select id="ltTeam" class="inp">${[['all', 'Semua tim'], ['senior', 'Senior'], ['u21', 'U-21'], ['u18', 'U-18'], ['muda', 'Usia ≤ 21']].map(([k, v]) => `<option value="${k}"${k === team ? ' selected' : ''}>${v}${d.counts[k] != null ? ` (${d.counts[k]})` : ''}</option>`).join('')}</select></label><span class="muted">${rows.length} pemain · arahkan kursor ke fokus/intensitas untuk alasannya</span></div>
      <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pemain</th><th>CA / PA</th><th class="num">Ruang</th><th>Peran latihan</th><th>Fokus tambahan (FM)</th><th>Intensitas</th><th>Saran</th></tr></thead><tbody>${rows.map(row).join('')}</tbody></table></div></div>`;
    page.innerHTML = `${ltTabs(tab)}<div class="page-head"><div><h1>${tab === 'junior' ? 'Pengembangan Junior' : 'Latihan Individu'}</h1><p>${tab === 'junior' ? 'Jadwal tim U-21 & U-18 yang memaksimalkan perkembangan, plus pemain muda prioritas.' : 'Peran latihan, fokus tambahan & intensitas tiap pemain — atur di FM: profil pemain → Latihan.'}</p></div>
      <div class="row-flex lt-noprint"><button class="btn" id="ltCopyI">📋 Salin rencana</button><button class="btn primary" id="ltApply" title="Pasang Fokus Tambahan ke semua pemain di daftar ini langsung di FM (lewat plugin Jembatan)">✅ Terapkan fokus ke FM</button></div></div>
      ${tab === 'junior' ? youthHtml : indivHtml}`;
    bindLtTabs(page);
    const sel = $('#ltTeam'); if (sel) sel.onchange = e => { team = e.target.value; try { localStorage.setItem('ltTeam', team); } catch { } draw(); };
    $('#ltApply').onclick = async () => {
      const list = (tab === 'junior' ? d.youthTop : rows).filter(r => r.fmFocus && r.pers);
      if (!list.length) return toast('Tidak ada pemain yang bisa diterapkan di daftar ini');
      if (!await ask({ icon: '🎯', title: 'Terapkan fokus latihan ke FM?', body: `<p>Fokus Tambahan <b>${list.length} pemain</b> akan diganti langsung di FM sesuai rekomendasi Asisten.</p><p class="muted">Intensitas & peran belum diubah. Simpan game di FM agar permanen. Kiper & regen dilewati.</p>`, ok: 'Terapkan' })) return;
      const btn = $('#ltApply'); btn.disabled = true; btn.textContent = 'Menerapkan…';
      try {
        const r = await post('/api/latihan/terapkan-individu', { ids: list.map(x => x.id) });
        if (!r.ok) toast('Gagal: ' + r.error); else toast(`✓ Fokus ${r.applied} pemain diterapkan ke FM${r.failed ? ` · ${r.failed} gagal` : ''}${r.skipped && r.skipped.length ? ` · ${r.skipped.length} dilewati` : ''}`);
      } catch (e) { toast('Gagal: ' + e.message); }
      route();
    };
    $('#ltCopyI').onclick = async () => {
      const list = tab === 'junior' ? d.youthTop : rows;
      const txt = `Rencana latihan ${tab === 'junior' ? 'junior' : 'individu'} — Asisten FM27\n` + list.map(r => `${r.name} (${r.teamName}, ${r.age}): peran ${r.role ? r.role.name : '-'} · fokus ${r.focus.map(f => f.label).join(' + ')} · intensitas ${r.intensity}`).join('\n')
        + (tab === 'junior' ? '\n\n' + ['u21', 'u18'].map(k => d.youth[k].title + ':\n' + d.youth[k].days.map(x => `${x.gun}: ${x.sessions.map(s => s.name).join(' | ')}`).join('\n')).join('\n\n') : '');
      try { await navigator.clipboard.writeText(txt); toast('✓ Rencana disalin'); } catch { toast('Gagal menyalin'); }
    };
  };
  draw();
}

async function pAtur(page) {
  const s = await api('/api/settings');
  const st = STATUS?.paths || {};
  const F = [['dumpPath', 'File data pembaca (dump.json)', 'Ditulis oleh Teknik Oda / FMSuperScout saat FM terbuka'], ['readerExe', 'Program pembaca data', 'TeknikOda.exe'], ['genieDir', 'Folder Genie Scout (opsional)', 'Hanya untuk logo klub. Tanpa Genie Scout, semua fitur tetap jalan.']];
  page.innerHTML = `<div class="page-head"><div><h1>Pengaturan</h1><p>Lokasi file & sumber data</p></div></div>
  <div class="grid g-main"><div class="card">${F.map(([k, l, h]) => `<div class="field" style="margin-bottom:14px"><label>${l} ${st[k] ? (st[k].exists ? '<span class="badge good">ditemukan</span>' : '<span class="badge bad">tidak ada</span>') : ''}</label><input id="c_${k}" value="${esc(s[k])}"><small class="muted">${h}</small></div>`).join('')}
    <div class="field" style="margin-bottom:14px"><label>Klub yang dianalisis</label><select id="c_club"><option value="">Otomatis (klub manajer)</option>${(STATUS?.clubs || []).map(c => `<option ${c === s.club ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><small class="muted">Berguna untuk menganalisis klub lawan</small></div>
    <button class="btn primary" id="saveCfg">Simpan</button></div>
  <div class="card" style="align-self:start"><h3>Tentang Sumber Data</h3><p style="line-height:1.6;margin:0">Asisten FM27 memakai:</p>
    <div class="step"><b class="n">1</b><div><b>Teknik Oda</b> (wajib) — membaca semua pemain, staf, jadwal laga & latihan dari save yang sedang terbuka.</div></div>
    <div class="step"><b class="n">2</b><div><b>Pembaca memori Asisten</b> (folder native) — untuk cheat & angka live. Tidak butuh Cheat Engine maupun cheat table.</div></div>
    <div class="step"><b class="n">3</b><div><b>Genie Scout</b> (opsional) — hanya logo klub.</div></div>
    <p class="muted" style="margin-top:12px">Data dimuat ulang otomatis setiap kali file dump berubah.</p>
    <button class="btn" onclick="launch('reader')">${ic('play', 16)} Jalankan pembaca data</button></div></div>`;
  $('#saveCfg').onclick = async () => { const b = {}; F.forEach(([k]) => b[k] = $('#c_' + k).value); b.club = $('#c_club').value; await post('/api/settings', b); await refreshStatus(); toast('Pengaturan disimpan'); pAtur(page); };
}

// ---------- Pencarian global ----------
let gt;
$('#gq').oninput = e => {
  clearTimeout(gt); const v = e.target.value.trim();
  if (v.length < 2) { $('#gres').classList.remove('show'); return; }
  gt = setTimeout(async () => {
    const d = await api('/api/search?limit=8&sort=ca&q=' + encodeURIComponent(v)).catch(() => ({ rows: [] }));
    $('#gres').innerHTML = d.rows.map(p => `<div class="row" data-id="${p.id}">${ava(p.name, 0, p.id)}<div style="flex:1;min-width:0"><b>${esc(p.name)}</b><div class="muted" style="font-size:12px">${esc(p.pos)} · ${esc(p.club)} · ${p.age} th</div></div>${capa(p.ca, p.pa)}${fmBtn(p.id, 'P', p.name)}</div>`).join('') || '<div class="row muted">Tidak ditemukan</div>';
    $('#gres').classList.add('show');
  }, 200);
};
document.addEventListener('click', e => { if (!e.target.closest('.gsearch')) $('#gres').classList.remove('show'); else if (e.target.closest('[data-id]')) $('#gres').classList.remove('show'); });
document.addEventListener('keydown', e => {
  if (e.key === '/' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); $('#gq').focus(); }
  if (e.key === 'Escape') { hideDrawer(); $('#gres').classList.remove('show'); }
  if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) && !document.querySelector('.modal-bg') && !e.altKey && !e.ctrlKey) {
    const open = $('#drawer').classList.contains('show');
    const step = { ArrowDown: 1, ArrowUp: -1, ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (step && (open || e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); moveRow(step, open); }
    if (e.key === 'Enter' && !open && !['BUTTON', 'A'].includes(document.activeElement.tagName) && SEL && document.querySelector('.row-cur')) { e.preventDefault(); openRow(SEL); }
  }
  const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.querySelector('.modal-bg');
  if (!typing && (e.key === 'Backspace' || e.key === 'BrowserBack')) { e.preventDefault(); goBack(); }
});

// ---------- Mulai ----------
window.addEventListener('hashchange', () => { hideDrawer(true); route(); });
{ const b = document.getElementById('backBtn'); if (b) b.onclick = goBack; }
(async () => {
  await refreshStatus();
  route();
  loadShort().catch(() => {});
  let lastLoaded = STATUS.loadedAt;
  setInterval(async () => { await refreshStatus(); if (STATUS.loadedAt && STATUS.loadedAt !== lastLoaded) { lastLoaded = STATUS.loadedAt; toast('Data save terbaru dimuat'); if (!$('#drawer').classList.contains('show')) route(); } }, 20000);
})();

// ---------- Tema terang / gelap ----------
(() => {
  const btn = document.getElementById('themeTg'); if (!btn) return;
  btn.onclick = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('tema', next); } catch (e) { }
    toast(next === 'dark' ? '🌙 Tema malam (gelap)' : '☀️ Tema siang (terang)', 'info');
  };
})();

// ---------- Editor CA / PA di profil ----------
// ---------- Legenda 👑: salin profil pemain legenda ke pemain ini, disesuaikan usia ----------
const LEG_GRP = { '': 'Semua', GK: 'Kiper', DC: 'Bek tengah', DW: 'Bek sayap', MC: 'Gelandang', MW: 'Sayap', ST: 'Penyerang' };
function legendPick(p, reopen) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal leg-modal" role="dialog"><div class="mi">👑</div><h2>Jadikan Legenda</h2>
    <div class="mb"><b>${esc(p.name)}</b> · usia ${p.age} · CA ${p.ca} / PA ${p.pa}
      <div class="leg-bar"><input id="lgQ" placeholder="Cari legenda… (Messi, Maldini, Pirlo)"><div class="leg-grp">${Object.entries(LEG_GRP).map(([k, v]) => `<button class="chip${k === '' ? ' on' : ''}" data-g="${k}">${v}</button>`).join('')}</div></div>
      <div class="leg-list" id="lgList"><div class="muted">Memuat…</div></div>
      <div class="leg-opt" id="lgOpt" hidden></div></div>
    <div class="ma"><button class="btn" data-a="0">Batal</button><button class="btn primary" data-a="1" disabled>Terapkan di FM27</button></div></div>`;
  document.body.appendChild(bg);
  let grp = '', sel = null, timer;
  const list = bg.querySelector('#lgList'), opt = bg.querySelector('#lgOpt'), go = bg.querySelector('[data-a="1"]');
  const preview = () => {
    if (!sel) return;
    const peak = Number(bg.querySelector('#lgPeak').value);
    const a0 = sel.age, c0 = sel.ca, pk = Math.max(peak, a0 + 0.5), age = p.age;
    const ca = Math.round(age >= pk ? sel.pa : age >= a0 ? c0 + (sel.pa - c0) * (age - a0) / (pk - a0) : c0 * Math.max(0.45, 1 - 0.07 * (a0 - age)));
    bg.querySelector('#lgPrev').innerHTML = `Sekarang (usia ${age}): <b>CA ${Math.min(200, ca)}</b> / PA <b>${sel.pa}</b> → CA penuh <b>${sel.pa}</b> di usia <b>${peak}</b>`;
  };
  const pick = l => {
    sel = l; list.querySelectorAll('.leg-it').forEach(x => x.classList.toggle('on', Number(x.dataset.id) === l.id)); go.disabled = false; opt.hidden = false;
    opt.innerHTML = `<div class="leg-sel">👑 <b>${esc(l.name)}</b> <span class="muted">· data usia ${l.age} (CA ${l.ca}) · PA ${l.pa} · ${(l.best || []).join(', ')}</span></div>
      <label>Usia CA penuh <select id="lgPeak">${[20, 21, 22, 23, 24, 25, 26, 27].map(a => `<option${a === 24 ? ' selected' : ''}>${a}</option>`).join('')}</select></label>
      <div class="leg-prev" id="lgPrev"></div>
      <div class="leg-chk"><label class="chk"><input type="checkbox" id="lgGrow" checked> Tumbuh otomatis tiap hari game sampai usia puncak</label>
      <label class="chk"><input type="checkbox" id="lgPers" checked> Kepribadian</label><label class="chk"><input type="checkbox" id="lgPos" checked> Posisi & kaki</label><label class="chk"><input type="checkbox" id="lgTr" checked> Trait / kebiasaan</label></div>`;
    bg.querySelector('#lgPeak').onchange = preview; preview();
  };
  const load = async () => {
    const q = bg.querySelector('#lgQ').value.trim();
    const l = await api('/api/legends?grp=' + grp + '&q=' + encodeURIComponent(q));
    list.innerHTML = l.length ? l.sort((a, b) => b.pa - a.pa).map(x => `<button class="leg-it${sel && sel.id === x.id ? ' on' : ''}" data-id="${x.id}"><b>${esc(x.name)}</b><span>${x.nat || ''} · ${(x.best || []).join('/')}</span><em class="${sCls(Math.round(x.pa / 2))}">${x.pa}</em></button>`).join('') : '<div class="muted">Tidak ada legenda cocok.</div>';
    list.querySelectorAll('.leg-it').forEach(b => b.onclick = () => pick(l.find(x => x.id === Number(b.dataset.id))));
  };
  bg.querySelector('#lgQ').oninput = () => { clearTimeout(timer); timer = setTimeout(load, 200); };
  bg.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { grp = b.dataset.g; bg.querySelectorAll('[data-g]').forEach(x => x.classList.toggle('on', x === b)); load(); });
  const close = () => { bg.remove(); document.removeEventListener('keydown', key, true); };
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', key, true);
  bg.onclick = e => { if (e.target === bg) close(); };
  bg.querySelector('[data-a="0"]').onclick = close;
  go.onclick = async () => {
    if (!sel) return; const v = id => bg.querySelector(id).checked;
    const params = { legend: sel.id, peak: Number(bg.querySelector('#lgPeak').value), grow: v('#lgGrow'), pers: v('#lgPers'), pos: v('#lgPos'), feet: v('#lgPos'), traits: v('#lgTr') };
    close();
    try {
      const r = await post('/api/cheat/run', { action: 'legend', scope: { kind: 'P', type: 'person', value: p.id }, params });
      toast(`👑 ${p.name} kini mengikuti ${r.legend}: CA ${r.ca}/${r.pa}${r.grow ? ' · tumbuh otomatis' : ''}`, 'ok'); reopen();
    } catch (e) { toast('Gagal: ' + e.message, 'err'); }
  };
  load(); bg.querySelector('#lgQ').focus();
}
function editAbility(p, which, reopen) {
  const isCA = which === 'ca'; const cur = isCA ? p.ca : p.pa;
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  const quick = isCA ? [['+5', cur + 5], ['+10', cur + 10], ['+20', cur + 20], ['= PA', p.pa], ['Maks 200', 200]] : [['+10', cur + 10], ['+20', cur + 20], ['170', 170], ['185', 185], ['Maks 200', 200]];
  bg.innerHTML = `<div class="modal abil-modal" role="dialog"><div class="mi">${isCA ? '💪' : '💎'}</div><h2>Ubah ${isCA ? 'Kemampuan (CA)' : 'Potensi (PA)'}</h2>
    <div class="mb"><b>${esc(p.name)}</b> · sekarang CA ${p.ca} / PA ${p.pa}
      <div class="abil-quick">${quick.map(([l, v]) => `<button class="chip" data-v="${Math.min(200, v)}">${l}</button>`).join('')}</div>
      <div class="abil-in"><input id="abVal" type="number" min="1" max="200" value="${cur}"><span class="muted">1–200</span></div>
      ${isCA ? `<label class="chk"><input type="checkbox" id="abAttr" checked> Atribut ikut naik/turun sebanding (langsung terlihat)</label><p class="muted" style="font-size:12.5px;margin:6px 0 0">Bila CA melebihi PA, PA ikut dinaikkan agar FM tidak membuat ulang pemain.</p>` : `<p class="muted" style="font-size:12.5px;margin:6px 0 0">PA = batas perkembangan. Pemain naik ke sana lewat latihan & menit bermain.</p>`}</div>
    <div class="ma"><button class="btn" data-a="0">Batal</button><button class="btn primary" data-a="1">Terapkan di FM27</button></div></div>`;
  document.body.appendChild(bg);
  const inp = bg.querySelector('#abVal'); inp.focus(); inp.select();
  bg.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { inp.value = b.dataset.v; bg.querySelectorAll('[data-v]').forEach(x => x.classList.toggle('on', x === b)); });
  const close = () => { bg.remove(); document.removeEventListener('keydown', key, true); };
  const apply = async () => {
    const v = Math.max(1, Math.min(200, Math.round(Number(inp.value)))); if (!v) return;
    const withAttrs = isCA ? bg.querySelector('#abAttr').checked : false; close();
    try {
      await post('/api/cheat/run', { action: isCA ? 'ca' : 'pa', scope: { kind: 'P', type: 'person', value: p.id }, params: { value: v, withAttrs } });
      toast(`✓ ${p.name}: ${isCA ? 'CA' : 'PA'} → ${v}`, 'ok'); reopen();
    } catch (e) { toast('Gagal: ' + e.message, 'err'); }
  };
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } if (e.key === 'Enter') { e.preventDefault(); apply(); } };
  document.addEventListener('keydown', key, true);
  bg.onclick = e => { if (e.target === bg) close(); };
  bg.querySelector('[data-a="0"]').onclick = close; bg.querySelector('[data-a="1"]').onclick = apply;
}

// Menu samping bisa diperkecil (mode mini: hanya ikon), diingat di localStorage
(function () {
  const set = on => { document.body.classList.toggle('side-mini', on); try { localStorage.setItem('sideMini', on ? '1' : ''); } catch { } };
  let on = false; try { on = localStorage.getItem('sideMini') === '1'; } catch { }
  set(on);
  const b = document.getElementById('sideTg'); if (b) b.onclick = () => set(!document.body.classList.contains('side-mini'));
})();
