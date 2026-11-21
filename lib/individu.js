'use strict';
// Latihan individu & pengembangan junior.
// Untuk setiap pemain klub: peran latihan, fokus tambahan (atribut kunci terlemah untuk perannya, dibanding target dari PA),
// intensitas (ganda/normal/setengah/istirahat) dari usia + kondisi + rawan cedera, prioritas pengembangan (ruang tumbuh × usia
// × kepribadian), serta saran mentor, pinjaman, promosi tim, dan peringatan. Plus jadwal tim junior yang memaksimalkan perkembangan.
const SESI = (cat, load) => ({ cat, load });
const S = {
  'Pengembangan Individu': SESI('Pengembangan', 2), 'Gaya Operan': SESI('Penguasaan', 2), 'Aliran Bola': SESI('Penguasaan', 2),
  'Membangun Serangan': SESI('Menyerang', 2), 'Menciptakan Peluang': SESI('Menyerang', 3), 'Posisi Bertahan': SESI('Bertahan', 1),
  'Bentuk Saat Tidak Menguasai Bola': SESI('Bertahan', 2), 'Intensitas Pressing': SESI('Bertahan', 3), 'Sepak Pojok': SESI('Bola Mati', 1),
  'Tendangan Bebas': SESI('Bola Mati', 1), 'Pengondisian Fisik Ringan': SESI('Kebugaran', 1), 'Pemulihan': SESI('Pemulihan', 0),
  'Istirahat': SESI('Pemulihan', 0), 'Pertandingan': SESI('Laga', 0),
};
const GUN = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
// Template jadwal tim junior: slot "Pengembangan Individu" sebanyak mungkin (fokus individu = pendorong utama naiknya CA),
// sesi teknik/penguasaan bola, beban sedang, pemulihan setelah laga (laga junior umumnya akhir pekan).
const YOUTH = {
  u21: { title: 'U-21 / Cadangan', why: 'Lebih taktis: menyiapkan pemain untuk tim utama, tetap 6 slot pengembangan individu.', week: [
    ['Pemulihan', 'Pengembangan Individu', 'Pengondisian Fisik Ringan'], ['Gaya Operan', 'Membangun Serangan', 'Pengembangan Individu'],
    ['Menciptakan Peluang', 'Bentuk Saat Tidak Menguasai Bola', 'Pengembangan Individu'], ['Aliran Bola', 'Posisi Bertahan', 'Pengembangan Individu'],
    ['Sepak Pojok', 'Tendangan Bebas', 'Pengembangan Individu'], ['Istirahat', 'Pertandingan', 'Istirahat'], ['Pemulihan', 'Istirahat', 'Pengembangan Individu']] },
  u18: { title: 'U-18 / U-19', why: 'Lebih teknis: kontrol bola, operan, & kreativitas tumbuh paling cepat di usia muda; 7 slot pengembangan individu.', week: [
    ['Pemulihan', 'Pengembangan Individu', 'Pengondisian Fisik Ringan'], ['Gaya Operan', 'Aliran Bola', 'Pengembangan Individu'],
    ['Membangun Serangan', 'Menciptakan Peluang', 'Pengembangan Individu'], ['Gaya Operan', 'Posisi Bertahan', 'Pengembangan Individu'],
    ['Pengembangan Individu', 'Sepak Pojok', 'Pengembangan Individu'], ['Istirahat', 'Pertandingan', 'Istirahat'], ['Pemulihan', 'Istirahat', 'Pengembangan Individu']] },
};
// Katalog "Fokus Tambahan" FM27 (ID & atribut, direkam dari layar latihan pemain lewat plugin Jembatan)
const FOKUS = [
  [9, 'Kecepatan', ['Pace', 'Acceleration']], [10, 'Kelincahan dan Keseimbangan', ['Agility', 'Balance']], [11, 'Ketahanan', ['Strength', 'JumpingReach']],
  [12, 'Daya Tahan', ['Stamina', 'WorkRate']], [13, 'Konversi Peluang', ['Finishing', 'Heading', 'LongShots', 'Technique', 'Anticipation', 'Composure', 'OffTheBall']],
  [14, 'Menciptakan Peluang', ['Crossing', 'Passing', 'Technique', 'Decisions', 'Flair', 'Vision']], [15, 'Menjaga Penguasaan Bola', ['FirstTouch', 'Concentration', 'Composure', 'Decisions', 'Teamwork']],
  [16, 'Aliran Serangan', ['Dribbling', 'Passing', 'Anticipation', 'Decisions', 'Teamwork', 'Vision']], [17, 'Pressing', ['Tackling', 'Aggression', 'Anticipation', 'Decisions', 'WorkRate']],
  [18, 'Menahan', ['Marking', 'Anticipation', 'Concentration', 'Positioning', 'Teamwork']], [19, 'Penempatan Posisi Bertahan', ['Concentration', 'Positioning', 'Decisions']],
  [20, 'Pergerakan Menyerang', ['OffTheBall', 'Anticipation', 'Decisions']], [21, 'Sepertiga Akhir', ['Composure', 'Decisions', 'Vision']],
  [22, 'Menembak', ['Finishing', 'LongShots', 'Technique']], [23, 'Operan', ['Passing', 'Technique']], [24, 'Umpan Silang', ['Crossing', 'Technique']],
  [25, 'Kontrol Bola', ['FirstTouch', 'Dribbling', 'Technique']], [26, 'Tekel', ['Tackling', 'Aggression']], [27, 'Penjagaan', ['Marking', 'Concentration']],
  [28, 'Duel Udara', ['Heading', 'Bravery']],
].map(([id, name, attrs]) => ({ id, name, attrs }));
// Pilih fokus FM yang paling menutup kekurangan atribut peran (kunci ×3, penting ×1,5) terhadap target dari PA
function pilihFokus(p, role, cap) {
  if (!role || role.pos === 'GK') return null; // katalog kiper berbeda — belum direkam
  const a = p.attrs || {}, w = {}; role.key.forEach(k => (w[k] = 3)); role.imp.forEach(k => (w[k] = (w[k] || 0) + 1.5));
  let best = null;
  for (const f of FOKUS) {
    const sc = f.attrs.reduce((t, k) => t + (w[k] || 0.3) * Math.max(0, cap - (a[k] || 0)), 0) / Math.sqrt(f.attrs.length);
    if (!best || sc > best.sc + 1e-9) best = { id: f.id, name: f.name, attrs: f.attrs, sc };
  }
  return best && best.sc > 0 ? { id: best.id, name: best.name, attrs: best.attrs, score: Math.round(best.sc * 10) / 10 } : null;
}

const TEAM = p => (!p.teamType ? 'senior' : p.teamType === 10 ? 'u21' : 'u18');
const TEAMN = { senior: 'Senior', u21: 'U-21', u18: 'U-18' };

function youthPlans() {
  const out = {};
  for (const [k, v] of Object.entries(YOUTH)) {
    out[k] = { title: v.title, why: v.why, days: v.week.map((s, i) => ({ gun: GUN[i], sessions: s.map(n => ({ name: n, ...(S[n] || SESI('Lainnya', 1)) })), load: s.reduce((t, n) => t + ((S[n] || {}).load || 0), 0) })) };
    out[k].devSlots = v.week.flat().filter(n => n === 'Pengembangan Individu').length;
  }
  return out;
}

function build({ E, players, staff, season, club }) {
  const SS = (season && season.oyuncular) || {};
  const st = id => (SS[id] || SS[String(id)] || {});
  const senior = players.filter(p => !p.teamType);
  const xiCa = senior.map(p => p.ca).sort((a, b) => b - a).slice(0, 11);
  const xiAvg = xiCa.length ? xiCa.reduce((t, x) => t + x, 0) / xiCa.length : 120;
  // Mentor: pemain senior berpengalaman dengan profesionalisme & tekad tertinggi
  const mentors = senior.filter(p => p.age >= 26).map(p => ({ p, sc: (p.professionalism || 10) + ((p.attrs || {}).Determination || 10) })).sort((a, b) => b.sc - a.sc).slice(0, 3).map(x => x.p);
  // Pelatih akademi terbaik (atribut Jeugd = bekerja dengan pemain muda)
  const yc = staff.filter(s => s.staffAttrs && ['Trainer', 'Hoofd jeugdopleiding', 'Assistent-manager', 'Manager'].includes(s.job)).map(s => ({ s, v: (s.staffAttrs.Jeugd || 0) })).sort((a, b) => b.v - a.v)[0];
  const rows = players.map(p => {
    const a = p.attrs || {}, s = st(p.id), d = s.durum || {}, team = TEAM(p);
    const roles = E.allRoles(p); const role = roles[0] && E.ROLES.find(r => r.id === roles[0].id);
    const cap = Math.max(10, Math.min(20, Math.round((p.pa || p.ca) / 10))); // target atribut kunci dari PA
    const keys = role ? role.key.map(k => ({ k, v: a[k] || 0 })).sort((x, y) => x.v - y.v) : [];
    const weak = keys.filter(x => x.v < cap - 1).slice(0, 2);
    const focus = weak.length ? weak : keys.slice(0, 1);
    const gap = Math.max(0, (p.pa || 0) - (p.ca || 0));
    const pro = p.professionalism || 10, det = a.Determination || 10, inj = a.InjuryProneness || 10;
    const injured = !!d.sakat, cond = d.kondisyon, fat = d.yorgunluk;
    let intensity = 'Normal', intWhy = '';
    if (injured) { intensity = 'Istirahat'; intWhy = 'sedang cedera'; }
    else if ((cond >= 0 && cond < 80) || fat >= 120) { intensity = 'Setengah'; intWhy = 'kondisi/kelelahan'; }
    else if (p.age <= 21 && gap >= 15 && inj <= 12 && (cond == null || cond < 0 || cond >= 90) && !(fat >= 60)) { intensity = 'Ganda'; intWhy = 'muda, segar & tidak rawan cedera → percepat perkembangan'; }
    else if (inj >= 15) { intensity = 'Normal'; intWhy = 'rawan cedera — jangan ganda'; }
    const ageF = p.age <= 18 ? 1.3 : p.age <= 21 ? 1 : p.age <= 23 ? 0.6 : p.age <= 26 ? 0.25 : 0.05;
    const prio = Math.round(gap * ageF * ((pro + det) / 30));
    const notes = [];
    if (p.age <= 21 && (pro < 13 || det < 13) && mentors.length) notes.push({ k: 'mentor', t: `Masukkan ke kelompok mentor bersama ${mentors.map(m => m.name).slice(0, 2).join(' / ')} (profesionalisme ${pro}, tekad ${det} masih rendah)` });
    const minutes = s.toplam ? s.toplam.Minutes || 0 : null;
    if (p.age >= 18 && p.age <= 21 && team !== 'senior' && p.ca >= xiAvg - 30 && p.ca < xiAvg - 8) notes.push({ k: 'pinjam', t: 'Pinjamkan ke klub yang memberi menit reguler — kemampuan sudah cukup untuk laga senior level bawah' });
    if (team === 'u18' && p.age <= 19 && p.ca >= xiAvg - 25) notes.push({ k: 'naik', t: 'Naikkan ke U-21/latihan tim utama — sudah melebihi level U-18' });
    if (team === 'senior' && p.age <= 21 && minutes != null && minutes < 90 && p.ca < xiAvg - 15) notes.push({ k: 'menit', t: 'Hampir tidak bermain di senior: pertimbangkan pinjam atau turunkan ke U-21 agar tetap berkembang' });
    if (inj >= 15) notes.push({ k: 'cedera', t: `Rawan cedera (${inj}) — hindari intensitas ganda & sesi berat beruntun` });
    if (p.age >= 30 && gap < 5) notes.push({ k: 'jaga', t: 'Usia senior: fokus menjaga atribut fisik (Kecepatan/Stamina) & intensitas normal' });
    return {
      id: p.id, name: p.name, noName: !!p._noName, age: p.age, team, teamName: TEAMN[team], pos: p.pos, ca: p.ca, pa: p.pa, gap, prio,
      role: role ? { id: role.id, name: role.name } : null, cap,
      focus: focus.map(x => ({ k: x.k, label: E.ATTR_LABEL[x.k] || x.k, v: x.v })),
      intensity, intWhy, pro, det, inj, cond: cond >= 0 ? cond : null, injured, minutes, notes,
      fmFocus: pilihFokus(p, role, cap), pers: p.dbi > 0 && p.dbi < 4294967295 ? 0x01000000 + p.dbi : null,
    };
  });
  const youthRows = rows.filter(r => r.age <= 21).sort((x, y) => y.prio - x.prio);
  const factors = [
    { k: 'Pelatih muda', v: yc ? `${yc.s.name} (kerja dengan pemain muda ${yc.v}/20)` : '—', ok: yc && yc.v >= 15 },
    { k: 'Slot pengembangan individu', v: 'U-21: 6 · U-18: 7 per minggu (template di bawah)', ok: true },
    { k: 'Intensitas ganda', v: `${rows.filter(r => r.intensity === 'Ganda').length} pemain muda memenuhi syarat`, ok: true },
    { k: 'Mentor senior', v: mentors.map(m => `${m.name} (prof ${m.professionalism})`).join(', ') || '—', ok: mentors.length > 0 },
    { k: 'Menit bermain', v: `${rows.filter(r => r.notes.some(n => n.k === 'pinjam' || n.k === 'menit')).length} pemain muda butuh menit (pinjam/turun tim)`, ok: true },
  ];
  return {
    ok: true, club, counts: { all: rows.length, senior: rows.filter(r => r.team === 'senior').length, u21: rows.filter(r => r.team === 'u21').length, u18: rows.filter(r => r.team === 'u18').length },
    rows: rows.sort((x, y) => (x.team === y.team ? 0 : x.team === 'senior' ? -1 : y.team === 'senior' ? 1 : x.team === 'u21' ? -1 : 1) || y.prio - x.prio || y.ca - x.ca),
    youthTop: youthRows.slice(0, 8), youth: youthPlans(), factors, xiAvg: Math.round(xiAvg),
  };
}

module.exports = { build, FOKUS };
