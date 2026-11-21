'use strict';
// Perencana latihan mingguan — membaca data Teknik Oda (istatistik/<karier>/ofis.json + musim) lalu menyusun
// jadwal 7 hari × 3 sesi mengikuti jadwal laga, kondisi skuad, laporan performa, taktik & kualitas pelatih.
// Tanpa AI / internet: semua aturan ada di berkas ini.
const fs = require('fs');
const path = require('path');

// Nama sesi = nama asli di FM27 (bahasa Indonesia), dipelajari dari jadwal FM. load: 0 istirahat · 1 ringan · 2 sedang · 3 tinggi
const SES = {
  'Menciptakan Peluang': { cat: 'Menyerang', load: 3, area: 'att' },
  'Membangun Serangan': { cat: 'Menyerang', load: 2, area: 'att' },
  'Gaya Operan': { cat: 'Penguasaan', load: 2, area: 'pos' },
  'Aliran Bola': { cat: 'Penguasaan', load: 2, area: 'pos' },
  'Intensitas Pressing': { cat: 'Bertahan', load: 3, area: 'def' },
  'Jebakan Pressing': { cat: 'Bertahan', load: 3, area: 'def' },
  'Intensitas Bertahan': { cat: 'Bertahan', load: 3, area: 'def' },
  'Bentuk Saat Tidak Menguasai Bola': { cat: 'Bertahan', load: 2, area: 'def' },
  'Posisi Bertahan': { cat: 'Bertahan', load: 1, area: 'def' },
  'Sepak Pojok': { cat: 'Bola Mati', load: 1, area: 'set' },
  'Tendangan Bebas': { cat: 'Bola Mati', load: 1, area: 'set' },
  'Penalti': { cat: 'Bola Mati', load: 1, area: 'set' },
  'Pengondisian Fisik Ringan': { cat: 'Kebugaran', load: 1, area: 'fit' },
  'Pengembangan Individu': { cat: 'Pengembangan', load: 2, area: null },
  'Pemulihan': { cat: 'Pemulihan', load: 0, area: null },
  'Istirahat': { cat: 'Pemulihan', load: 0, area: null },
  'Perjalanan': { cat: 'Laga', load: 0, area: null },
  'Pertandingan': { cat: 'Laga', load: 0, area: null },
};
const SOFTER = { 'Intensitas Pressing': 'Bentuk Saat Tidak Menguasai Bola', 'Jebakan Pressing': 'Posisi Bertahan', 'Intensitas Bertahan': 'Posisi Bertahan', 'Menciptakan Peluang': 'Membangun Serangan' };
const AREAS = [
  { id: 'att', name: 'Menyerang', p: ['Aanvallen', 'Tactisch'] },
  { id: 'def', name: 'Bertahan', p: ['Verdedigen', 'Tactisch'] },
  { id: 'pos', name: 'Penguasaan Bola', p: ['Balbezit', 'Technisch'] },
  { id: 'set', name: 'Bola Mati', p: ['Standaardsituaties', 'Technisch'] },
  { id: 'fit', name: 'Kebugaran', p: ['Fitheid', 'Sportwetenschap'] },
  { id: 'gk', name: 'Kiper', p: ['KV_vangen', 'KV_reflexen', 'KV_distributie'] },
];
const COACH_JOBS = new Set(['Trainer', 'Keeperstrainer', 'Conditietrainer', 'Assistent-manager', 'Manager']);
const GUN = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const EURO = /UCL|UEL|UECL|Champions|Europa|Conference|Liga Champions|Liga Europa/i;

const D = s => new Date(s + 'T00:00:00Z');
const iso = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const diff = (a, b) => Math.round((D(a) - D(b)) / 864e5);
const monday = s => { const d = D(s); return addDays(s, -((d.getUTCDay() + 6) % 7)); };
const tgl = s => { const d = D(s); return d.getUTCDate() + ' ' + BULAN[d.getUTCMonth()]; };
const sesi = n => ({ name: n, ...(SES[n] || { cat: 'Lainnya', load: 1, area: null }) });

// Folder statistik Teknik Oda: pilih karier dengan ofis.json paling baru
// Folder statistik Teknik Oda untuk karier yang SEDANG dimainkan: dipilih yang klubnya sama dengan klub manajer sekarang
// (folder lain = karier/save lain → diabaikan). Tanpa klub (menganggur) → null.
const slug = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function findSrc(local, club) {
  if (club === '' || club === null) return null;
  const root = path.join(local, 'TeknikOda', 'istatistik');
  let best = null;
  try {
    for (const d of fs.readdirSync(root)) {
      const f = path.join(root, d, 'ofis.json');
      let m; try { m = fs.statSync(f).mtimeMs; } catch { continue; }
      if (club !== undefined) {
        let ok = d.includes('-' + slug(club) + '-');
        if (!ok) { try { const o = JSON.parse(fs.readFileSync(f, 'utf8')); ok = ((o.tablo || []).find(r => r.biz) || {}).kulup === club; } catch { } }
        if (!ok) continue;
      }
      if (!best || m > best.m) best = { dir: path.join(root, d), m };
    }
  } catch { }
  if (!best) return null;
  const seasons = fs.readdirSync(best.dir).filter(f => /^d{4}-d{2}.json$/.test(f)).map(f => ({ f, m: fs.statSync(path.join(best.dir, f)).mtimeMs })).sort((a, b) => b.m - a.m);
  return { dir: best.dir, ofis: path.join(best.dir, 'ofis.json'), season: seasons[0] ? path.join(best.dir, seasons[0].f) : null, mtime: best.m };
}

function coachAreas(staff) {
  const coaches = staff.filter(s => COACH_JOBS.has(s.job) && s.staffAttrs);
  return AREAS.map(a => {
    let best = null;
    for (const s of coaches) {
      const x = s.staffAttrs, prim = a.p.reduce((t, k) => t + (x[k] || 0), 0) / a.p.length;
      const sc = Math.round((prim * 0.75 + ((x.Vastberadenheid || 0) + (x.Motiveren || 0)) / 2 * 0.25) * 5);
      if (!best || sc > best.score) best = { score: sc, coach: s.name, coachId: s.id, job: s.job };
    }
    return { id: a.id, area: a.name, ...(best || { score: 0, coach: null }) };
  });
}

function needs(ofis) {
  const L = (ofis.rapor && ofis.rapor.lig) || [];
  const g = n => L.find(x => x.ad === n);
  const rel = (n, neg) => { const x = g(n); if (!x || !x.lig) return null; return neg ? (x.deger - x.lig) / x.lig : (x.lig - x.deger) / x.lig; };
  const avg = a => { const v = a.filter(x => x != null); return v.length ? v.reduce((t, x) => t + x, 0) / v.length : 0; };
  const attack = avg([rel('Gol per Laga'), rel('Ekspektasi Gol Tanpa Penalti per 90')]);
  const defend = avg([rel('Kebobolan per Laga', true), rel('Expected Goals Against per Laga', true)]);
  const possession = rel('Rasio Akurasi Umpan (%)') || 0;
  const why = [];
  const fmt = (n, neg) => { const x = g(n); return x ? `${n.toLowerCase()} ${x.deger} vs rata-rata liga ${x.lig}` : ''; };
  if (defend > 0.05) why.push('Bertahan perlu diasah: ' + fmt('Kebobolan per Laga', true) + '.');
  if (attack > 0.05) why.push('Serangan perlu diasah: ' + fmt('Gol per Laga') + '.');
  if (possession > 0.01) why.push('Akurasi umpan di bawah rata-rata liga (' + (g('Rasio Akurasi Umpan (%)') || {}).deger + '% vs ' + (g('Rasio Akurasi Umpan (%)') || {}).lig + '%).');
  const primary = defend >= attack ? 'def' : 'att';
  return { attack, defend, possession, primary, secondary: primary === 'def' ? 'att' : 'def', why };
}

// Performa 5 laga resmi terakhir → latihan ikut menyesuaikan (mode perbaikan saat banyak kalah, jaga ritme saat bagus)
function recentForm(ofis) {
  const played = (ofis.fikstur || []).filter(f => f.oynandi && !/Persahabatan|Friendly|Pramusim/i.test(f.turnuva)).slice(-5);
  const n = played.length, w = played.filter(f => f.sonuc === 'G').length, l = played.filter(f => f.sonuc === 'M').length;
  const gf = played.reduce((t, f) => t + (f.atilan || 0), 0), ga = played.reduce((t, f) => t + (f.yenilen || 0), 0);
  return { n, w, d: n - w - l, l, gf, ga, seq: played.map(f => f.sonuc).join(''), list: played.map(f => ({ rakip: f.rakip, res: f.sonuc, gf: f.atilan, ga: f.yenilen })) };
}
function adaptToForm(nd, fm) {
  nd.form = fm; nd.mode = 'normal';
  if (fm.n < 3) return nd;
  const weak = fm.ga > fm.gf || fm.ga / fm.n >= 1.6 ? 'def' : 'att';
  const ctx = `${fm.w}M ${fm.d}S ${fm.l}K dari ${fm.n} laga terakhir (gol ${fm.gf}-${fm.ga})`;
  if (fm.l >= 3 || (fm.l >= 2 && fm.w === 0)) {
    nd.mode = 'perbaikan'; nd.primary = weak; nd.secondary = weak;
    nd.why.unshift(`Mode perbaikan: ${ctx}. Kedua hari intensitas tinggi difokuskan ke ${weak === 'def' ? 'pertahanan (terlalu banyak kebobolan)' : 'serangan (terlalu sedikit gol)'}, H-2 juga.`);
  } else if (fm.l === 2) {
    nd.mode = 'waspada'; nd.primary = weak; nd.secondary = weak === 'def' ? 'att' : 'def';
    nd.why.unshift(`Tren menurun: ${ctx}. Fokus utama dipindah ke ${weak === 'def' ? 'pertahanan' : 'serangan'}.`);
  } else if (fm.w >= 4) {
    nd.mode = 'bagus';
    nd.why.unshift(`Tim sedang bagus: ${ctx}. Ritme dijaga, beban tidak ditambah, lebih banyak pengembangan individu.`);
  }
  return nd;
}

function squadState(ofis, season, players) {
  const S = (season && season.oyuncular) || {};
  const ban = new Map((ofis.cezalilar || []).map(c => [String(c.id), c]));
  const rows = players.map(p => {
    const s = S[p.id] || S[String(p.id)] || null, d = (s && s.durum) || {};
    const tags = d.etiketler || [];
    return {
      id: p.id, name: p.name, pos: p.pos, ca: p.ca, age: p.age, senior: !p.teamType,
      injured: !!d.sakat, cond: d.kondisyon, sharp: d.keskinlik, fatigue: d.yorgunluk, load: d.macYuku, risk: d.riskDuzeyi,
      happy: d.mutlu, minutes: s && s.toplam ? s.toplam.Minutes : 0, apps: s && s.toplam ? s.toplam.OverallAppearances : 0,
      injTxt: (tags.find(t => t.kisa === 'Cdr') || {}).neden || null,
      moodTxt: (tags.find(t => /Tidak Senang|Kekhawatiran/i.test(t.ad || '')) || {}).neden || null,
      ban: ban.get(String(p.id)) || null, known: !!s,
    };
  });
  const fit = rows.filter(r => r.senior && !r.injured && r.known);
  const tired = fit.filter(r => (r.cond != null && r.cond >= 0 && r.cond < 85) || r.fatigue >= 100);
  return { rows, tiredShare: fit.length ? tired.length / fit.length : 0, tired: tired.length, fit: fit.length };
}

function buildChecklist(st) {
  const sen = st.rows.filter(r => r.senior && r.known);
  const it = (r, reason, extra) => ({ id: r.id, name: r.name, pos: r.pos, reason, ...extra });
  const groups = [];
  const inj = sen.filter(r => r.injured).map(r => it(r, r.injTxt || 'Cedera'));
  const ban = sen.filter(r => r.ban).map(r => it(r, `Larangan ${r.ban.mac} laga · ${r.ban.kapsam || ''}`));
  const rest = sen.filter(r => !r.injured && ((r.cond >= 0 && r.cond < 85) || r.fatigue >= 100 || (r.risk >= 250 && r.load >= 2))).map(r => {
    const w = [];
    if (r.cond >= 0 && r.cond < 85) w.push(`kondisi ${r.cond}%`);
    if (r.fatigue >= 100) w.push('kelelahan tinggi');
    if (r.risk >= 250) w.push('risiko cedera tinggi');
    if (r.load >= 2) w.push('beban laga berat');
    return it(r, w.join(' · '), { sev: (r.cond < 80 ? 2 : 0) + (r.fatigue >= 120 ? 1 : 0) + (r.risk >= 250 ? 1 : 0) });
  }).sort((a, b) => b.sev - a.sev);
  const sharp = sen.filter(r => !r.injured && !r.ban && r.sharp != null && r.sharp < 75).sort((a, b) => a.sharp - b.sharp).map(r => it(r, `ketajaman ${r.sharp}%${r.minutes ? ` · ${r.minutes} menit musim ini` : ' · belum bermain musim ini'}`));
  const mood = sen.filter(r => (r.happy != null && r.happy < 40) || r.moodTxt).map(r => it(r, r.moodTxt || `kebahagiaan rendah (${r.happy})`));
  groups.push({ id: 'rest', title: 'Kurangi beban / rotasi', tone: 'bad', hint: 'Latihan ringan atau istirahatkan dari starting XI', items: rest });
  groups.push({ id: 'sharp', title: 'Beri menit bermain', tone: 'info', hint: 'Ketajaman laga rendah: mainkan sebagai pengganti atau di tim U21', items: sharp });
  groups.push({ id: 'inj', title: 'Cedera', tone: 'warn', hint: 'Pastikan tidak dijadwalkan latihan berat', items: inj });
  if (ban.length) groups.push({ id: 'ban', title: 'Larangan bermain', tone: 'warn', hint: 'Tidak bisa dimainkan', items: ban });
  groups.push({ id: 'mood', title: 'Ajak bicara', tone: 'gold', hint: 'Moral / keluhan yang bisa mengganggu latihan', items: mood });
  return groups.filter(g => g.items.length);
}

function strengthOf(ofis, club) {
  const t = (ofis.tablo || []).find(r => r.kulup === club);
  return t ? t.sira : null;
}

function planWeek(ofis, nd, st, start, coaches) {
  const fx = (ofis.fikstur || []).slice().sort((a, b) => a.tarih.localeCompare(b.tarih));
  const ourPos = ((ofis.tablo || []).find(r => r.biz) || {}).sira || null;
  const pressing = ((ofis.taktik || {}).yogunluk || 0) >= 5;
  const end = addDays(start, 6);
  const weekMatches = fx.filter(f => f.tarih >= start && f.tarih <= end);
  const allDates = fx.map(f => f.tarih);
  const gaps = []; for (let i = 1; i < allDates.length; i++) if (allDates[i] >= start && allDates[i - 1] <= end) gaps.push(diff(allDates[i], allDates[i - 1]));
  const congested = weekMatches.length >= 3 || gaps.some(g => g <= 3);
  const soften = congested || st.tiredShare > 0.3;
  const highSets = {
    att: nd.possession > 0.01 ? ['Menciptakan Peluang', 'Gaya Operan', 'Pengembangan Individu'] : ['Menciptakan Peluang', 'Membangun Serangan', 'Pengembangan Individu'],
    def: pressing ? ['Intensitas Pressing', 'Jebakan Pressing', 'Pengembangan Individu'] : ['Intensitas Bertahan', 'Bentuk Saat Tidak Menguasai Bola', 'Pengembangan Individu'],
  };
  const altSets = { att: ['Membangun Serangan', 'Menciptakan Peluang', 'Aliran Bola'], def: pressing ? ['Intensitas Bertahan', 'Bentuk Saat Tidak Menguasai Bola', 'Posisi Bertahan'] : ['Jebakan Pressing', 'Posisi Bertahan', 'Bentuk Saat Tidak Menguasai Bola'] };
  const days = []; let highIdx = 0, streak = 0;
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const match = fx.find(f => f.tarih === date) || null;
    const prev = [...fx].reverse().find(f => f.tarih < date) || null;
    const next = fx.find(f => f.tarih >= date) || null;
    const dPrev = prev ? diff(date, prev.tarih) : 99, dNext = next ? diff(next.tarih, date) : 99;
    const nextAway = next && !next.evde, nextEuro = next && EURO.test(next.turnuva + ' ' + next.turnuvaKisa);
    const cup = next && !/Premier League|Championship|League One|League Two|Liga/i.test(next.turnuva) || nextEuro;
    const rk = next ? strengthOf(ofis, next.rakipKulup) : null;
    const strong = next && (nextEuro || (rk != null && ourPos != null && (rk <= Math.max(4, ourPos))));
    let s, type, label, note = '';
    if (match) {
      type = 'match'; label = 'Hari Laga';
      s = match.evde ? ['Istirahat', 'Pertandingan', 'Istirahat'] : (nextEuro ? ['Istirahat', 'Pertandingan', 'Perjalanan'] : ['Perjalanan', 'Pertandingan', 'Perjalanan']);
      note = `${match.evde ? 'Kandang' : 'Tandang'} vs ${match.rakip} (${match.turnuvaKisa || match.turnuva})`;
    } else if (dPrev === 1 && dNext === 1) {
      type = 'prep'; label = 'Pulih + Persiapan';
      s = ['Pemulihan', 'Sepak Pojok', nextAway && nextEuro ? 'Perjalanan' : 'Istirahat'];
      note = `Laga beruntun: pulihkan tenaga, cukup bola mati ringan sebelum vs ${next.rakip}.`;
    } else if (dPrev === 1) {
      type = 'recovery'; label = 'Pemulihan';
      s = ['Pemulihan', 'Istirahat', dNext >= 3 ? 'Pengembangan Individu' : 'Istirahat'];
      note = `Sehari setelah laga vs ${prev.rakip}: pulihkan kondisi pemain yang bermain.`;
    } else if (dNext === 1) {
      type = 'prep'; label = 'Persiapan Laga';
      s = [strong ? 'Posisi Bertahan' : 'Aliran Bola', 'Sepak Pojok', nextAway && nextEuro ? 'Perjalanan' : (cup ? 'Penalti' : 'Tendangan Bebas')];
      note = `H-1 vs ${next.rakip}: intensitas rendah, ${strong ? 'rapikan posisi bertahan (lawan kuat)' : 'jaga ritme umpan'} + bola mati${cup ? ' & penalti (laga piala)' : ''}.`;
    } else if (dNext === 2) {
      type = 'tactical'; label = 'Taktik';
      const defH2 = nd.mode === 'perbaikan' ? nd.primary === 'def' : strong;
      s = [defH2 ? 'Bentuk Saat Tidak Menguasai Bola' : 'Membangun Serangan', defH2 ? 'Posisi Bertahan' : 'Gaya Operan', 'Pengembangan Individu'];
      note = `H-2 vs ${next.rakip}: kerja taktik intensitas sedang${defH2 ? ', fokus bentuk tanpa bola' : ', fokus membangun serangan'}${nd.mode === 'perbaikan' ? ' (mode perbaikan)' : ''}.`;
    } else if (dPrev === 2) {
      type = 'medium'; label = 'Sedang';
      s = ['Pengondisian Fisik Ringan', nd.secondary === 'att' ? 'Membangun Serangan' : 'Bentuk Saat Tidak Menguasai Bola', 'Pengembangan Individu'];
      note = 'Dua hari setelah laga: kembalikan kebugaran, belum intensitas penuh.';
    } else if (streak >= 5) {
      type = 'rest'; label = 'Hari Libur';
      s = ['Pemulihan', 'Istirahat', 'Istirahat'];
      note = 'Enam hari latihan beruntun: beri satu hari libur untuk mencegah kelelahan.';
    } else {
      const focus = highIdx % 2 === 0 ? nd.primary : nd.secondary; highIdx++;
      type = 'high'; label = focus === 'def' ? 'Tinggi · Bertahan' : 'Tinggi · Menyerang';
      s = (nd.mode === 'perbaikan' && highIdx % 2 === 0 ? altSets[focus] : highSets[focus]).slice();
      if (nd.mode === 'bagus') s[2] = 'Pengembangan Individu';
      note = focus === 'def' ? (pressing ? 'Taktik Anda menekan tinggi: latih intensitas & jebakan pressing.' : 'Latih organisasi dan intensitas bertahan.') : 'Latih penciptaan peluang & penyelesaian.';
      if (nd.mode === 'perbaikan') { label += ' · Perbaikan'; note += ' Mode perbaikan dari hasil buruk terakhir.'; }
      if (soften || nd.mode === 'bagus') { s[0] = SOFTER[s[0]] || s[0]; label = label.replace('Tinggi', 'Sedang'); note += congested ? ' Diturunkan ke intensitas sedang karena jadwal padat.' : nd.mode === 'bagus' && !soften ? ' Tim sedang bagus: beban dijaga, tidak ditambah.' : ' Diturunkan ke intensitas sedang karena banyak pemain lelah.'; }
    }
    const sessions = s.map(sesi);
    streak = sessions.every(x => x.load === 0 && x.cat !== 'Laga') || type === 'match' || type === 'recovery' ? 0 : streak + 1;
    const load = sessions.reduce((t, x) => t + x.load, 0);
    days.push({ date, gun: GUN[i], tgl: tgl(date), type, label, note, load, sessions, match: match ? { rakip: match.rakip, evde: match.evde, turnuva: match.turnuva, kisa: match.turnuvaKisa, oynandi: match.oynandi, skor: match.skorMetni || null } : null });
  }
  // Peringatan sesi di area yang pelatihnya lemah
  const weak = new Map(coaches.filter(c => c.score && c.score < 60).map(c => [c.id, c]));
  days.forEach(d => d.sessions.forEach(x => { if (x.area && weak.has(x.area)) x.weakCoach = weak.get(x.area).score; }));
  return { days, weekMatches, congested, soften, pressing };
}

function auditFm(ofis, plan) {
  const A = ofis.antrenman || {};
  const hafta = (A.hafta || []).map(h => ({ gun: h.gun, sessions: (h.seanslar || []).map(sesi) }));
  if (!hafta.length) return { days: [], notes: [] };
  const notes = [];
  plan.days.forEach((d, i) => {
    const f = hafta.find(h => h.gun === d.gun) || hafta[i]; if (!f) return;
    const fl = f.sessions.reduce((t, x) => t + x.load, 0), hasMatch = f.sessions.some(x => x.name === 'Pertandingan');
    const hi = f.sessions.filter(x => x.load >= 3).map(x => x.name);
    if (d.type === 'match' && !hasMatch) notes.push({ tone: 'bad', text: `${d.gun} ${d.tgl} ada laga vs ${d.match.rakip}, tapi jadwal FM tidak menaruh "Pertandingan" di hari itu.` });
    if (d.type !== 'match' && hasMatch) notes.push({ tone: 'warn', text: `Jadwal FM menaruh "Pertandingan" di ${d.gun}, padahal tidak ada laga hari itu minggu ini.` });
    if (d.type === 'prep' && (hi.length || fl >= 6)) notes.push({ tone: 'bad', text: `${d.gun} (H-1 laga): jadwal FM berisi ${hi.length ? 'sesi intensitas tinggi (' + hi.join(', ') + ')' : 'beban ' + fl} — risiko pemain lelah saat bertanding.` });
    if (d.type === 'recovery' && !f.sessions.some(x => x.name === 'Pemulihan')) notes.push({ tone: 'warn', text: `${d.gun} (sehari setelah laga): jadwal FM belum berisi sesi Pemulihan.` });
    d.fm = f.sessions; d.fmLoad = fl; d.same = f.sessions.map(x => x.name).join('|') === d.sessions.map(x => x.name).join('|');
  });
  if (!hafta.some(h => h.sessions.some(x => x.name === 'Pengembangan Individu'))) notes.push({ tone: 'info', text: 'Jadwal FM belum punya sesi Pengembangan Individu — fokus latihan individu pemain tidak berjalan.' });
  if (!notes.length) notes.push({ tone: 'ok', text: 'Jadwal FM Anda sudah selaras dengan jadwal laga minggu ini.' });
  return { days: hafta, notes, rating: A.ortPuan, durum: A.durum, month: A.ay, lastWeek: A.sonHafta, up: A.gelisen, down: A.gerileyen };
}

function briefing(ofis, nd, st, plan, coaches, week0) {
  const B = [];
  const A = ofis.antrenman || {};
  if (A.ortPuan != null) B.push({ icon: '📈', title: 'Latihan minggu lalu (FM)', text: `Rating rata-rata ${A.ortPuan} (${A.durum || '—'}) · fokus: ${A.sonHafta || '—'}. ${A.ay || ''}${A.gelisen || A.gerileyen ? ` ${A.gelisen} pemain berkembang, ${A.gerileyen} menurun.` : ''}`.trim() });
  const last = (ofis.analiz || [])[0];
  if (last) B.push({ icon: last.sonuc === 'G' ? '✅' : last.sonuc === 'M' ? '❌' : '➖', title: `Laga terakhir: ${last.sonuc === 'G' ? 'menang' : last.sonuc === 'M' ? 'kalah' : 'imbang'} ${last.atilan}-${last.yenilen} ${last.evde ? 'vs' : 'di kandang'} ${last.rakip}`, text: last.ozet || '' });
  const nx = ofis.siradaki;
  if (nx) B.push({ icon: '🎯', title: `Berikutnya: ${nx.evde ? 'kandang' : 'tandang'} vs ${nx.rakip} · ${tgl(nx.tarih)} (${nx.turnuvaKisa || nx.turnuva})`, text: [nx.degerlendirme, ofis.beklenti && ofis.beklenti.yonetim].filter(Boolean).join(' ') });
  const ws = plan.weekMatches.length;
  const hi = plan.days.filter(d => d.type === 'high').length;
  if (nd.form && nd.form.n) B.push({ icon: nd.mode === 'perbaikan' ? '🚨' : nd.mode === 'waspada' ? '⚠️' : nd.mode === 'bagus' ? '🔥' : '📊', title: `Penyesuaian dari ${nd.form.n} laga terakhir: ${nd.form.seq.replace(/G/g, 'M·').replace(/M(?!·)/g, 'K·').replace(/B/g, 'S·').replace(/·$/, '')}`, tone: nd.mode === 'perbaikan' || nd.mode === 'waspada' ? 'warn' : nd.mode === 'bagus' ? 'ok' : '', text: nd.mode === 'normal' ? `Hasil ${nd.form.w} menang, ${nd.form.d} seri, ${nd.form.l} kalah (gol ${nd.form.gf}-${nd.form.ga}) — jadwal normal mengikuti data performa.` : nd.why[0] });
  B.push({ icon: '⚖️', title: 'Strategi beban minggu ini', tone: plan.soften ? 'warn' : '', text: `${ws ? ws + ' laga minggu ini' : 'Tidak ada laga minggu ini'}${plan.congested ? ' (jadwal padat)' : ''}. ${hi ? hi + ' hari intensitas ' + (plan.soften ? 'terkendali' : 'tinggi') : 'Tidak ada hari intensitas tinggi'}, sisanya taktik, persiapan & pemulihan. ${st.tired} dari ${st.fit} pemain senior yang fit sedang lelah / kondisinya < 85%.` });
  if (nd.why.length) B.push({ icon: '🔎', title: `Fokus dari data (${(ofis.fikstur || []).filter(f => f.oynandi && !/Persahabatan|Friendly/i.test(f.turnuva)).length} laga resmi)`, text: nd.why.join(' ') + (plan.pressing ? ' Taktik Anda memakai pressing tinggi, jadi sesi pressing diprioritaskan.' : '') });
  const weak = coaches.filter(c => c.id !== 'gk' && c.score && c.score < 60);
  B.push({ icon: '🧑‍🏫', title: 'Kualitas pelatih', tone: weak.length ? 'warn' : 'ok', text: weak.length ? `Area dengan pelatih terbaik di bawah 60: ${weak.map(c => `${c.area} (${c.score})`).join(', ')}. Sesi di area itu efeknya lebih kecil — pertimbangkan merekrut pelatih atau tandai sesinya (⚠).` : 'Setiap area punya pelatih dengan nilai ≥ 60.' });
  return B;
}

function build({ ofis, season, players, staff, offset = 0, gameDate }) {
  const today = ofis.oyunTarihi || gameDate;
  const start = addDays(monday(today), 7 * offset);
  const nd = adaptToForm(needs(ofis), recentForm(ofis));
  const st = squadState(ofis, season, players);
  const coaches = coachAreas(staff);
  const plan = planWeek(ofis, nd, st, start, coaches);
  const fm = offset === 0 ? auditFm(ofis, plan) : null;
  const fixtures = (ofis.fikstur || []).filter(f => f.tarih >= today).slice(0, 10).map((f, i, a) => ({ date: f.tarih, tgl: tgl(f.tarih), gun: GUN[(D(f.tarih).getUTCDay() + 6) % 7], rakip: f.rakip, evde: f.evde, kisa: f.turnuvaKisa, turnuva: f.turnuva, gap: i ? diff(f.tarih, a[i - 1].tarih) : null }));
  const load = plan.days.reduce((t, d) => t + d.load, 0), fmLoad = plan.days.reduce((t, d) => t + (d.fmLoad || 0), 0);
  return {
    ok: true, today, week: { start, end: addDays(start, 6), offset, label: `${tgl(start)} – ${tgl(addDays(start, 6))}` },
    days: plan.days, congested: plan.congested, soften: plan.soften, load, fmLoad,
    fm, checklist: buildChecklist(st), coaches, briefing: briefing(ofis, nd, st, plan, coaches, offset === 0), fixtures,
    needs: { attack: +nd.attack.toFixed(2), defend: +nd.defend.toFixed(2), possession: +nd.possession.toFixed(2), primary: nd.primary, mode: nd.mode, form: nd.form },
    tactic: ofis.taktik ? { name: ofis.taktik.ad, mentality: ofis.taktik.mentalite, pressing: ofis.taktik.yogunluk } : null,
    catalog: Object.entries(SES).map(([name, v]) => ({ name, ...v })),
  };
}

module.exports = { findSrc, build, SES, GUN };
