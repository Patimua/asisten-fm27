'use strict';
// Ruang Manajer — ringkasan satu layar: lawan berikutnya, taktik & susunan FM, kebugaran, laga terakhir, target musim,
// latihan, kontrak, target transfer, kebutuhan skuad, akademi, plus 3 tugas prioritas hari ini.
// Sumber: dump Teknik Oda (DB), istatistik/<karier>/ofis.json + musim, dan perencana latihan (lib/latihan.js).
const LT = require('./latihan');

const D = s => new Date(s + 'T00:00:00Z');
const days = (a, b) => Math.round((D(a) - D(b)) / 864e5);
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const tgl = s => { const d = D(s); return d.getUTCDate() + ' ' + BULAN[d.getUTCMonth()]; };
const side = p => { const a = p.posArr || []; const L = a.filter(x => /L$/.test(x)).length, R = a.filter(x => /R$/.test(x)).length; return L > R ? 'L' : R > L ? 'R' : ''; };
const short = n => { const w = String(n || '').trim().split(/\s+/); return w.length > 1 ? w[w.length - 1] : w[0]; };

function build({ E, DB, club, lite, dash, ofis, season, targets, shortlist, latihan }) {
  const today = ofis.oyunTarihi || (DB.meta && DB.meta.gameDate);
  const S = (season && season.oyuncular) || {};
  const st = id => (S[id] || S[String(id)] || {}).durum || {};
  const byId = id => DB.byId.get(Number(id));
  const squad = DB.players.filter(p => p.club === club);
  const senior = squad.filter(p => !p.teamType);
  const tab = ofis.tablo || [], me = tab.find(r => r.biz) || null;
  const posOf = name => { const r = tab.find(x => x.kulup === name); return r ? r.sira : null; };

  // ---- Klasemen & target
  let table = null;
  if (me) {
    const other = me.sira === 1 ? tab.find(r => r.sira === 2) : tab.find(r => r.sira === 1);
    table = { pos: me.sira, pts: me.p, played: me.o, gd: me.av, league: ofis.lig, gap: other ? me.p - other.p : null, vs: other ? other.ad : null, size: tab.length };
  }
  const target = { text: ofis.hedef || null, board: ofis.guven ? { note: ofis.guven.yonetimNot, text: ofis.guven.yonetim } : null, fans: ofis.guven ? { note: ofis.guven.taraftarNot, text: ofis.guven.taraftar } : null };

  // ---- Lawan berikutnya
  const nx = ofis.siradaki;
  const next = nx ? { rakip: nx.rakip, club: nx.rakipKulup, evde: nx.evde, turnuva: nx.turnuva, kisa: nx.turnuvaKisa, date: nx.tarih, tgl: tgl(nx.tarih), inDays: days(nx.tarih, today), note: nx.degerlendirme || '', importance: ofis.macBilgi && ofis.macBilgi.onem, weather: ofis.macBilgi && ofis.macBilgi.hava, theirPos: posOf(nx.rakipKulup), expect: ofis.beklenti && ofis.beklenti.yonetim } : null;
  const fut = (ofis.fikstur || []).filter(f => f.tarih >= today && !f.oynandi);
  const upcoming = fut.slice(0, 5).map(f => ({ rakip: f.rakip, evde: f.evde, kisa: f.turnuvaKisa, tgl: tgl(f.tarih), inDays: days(f.tarih, today) }));
  const in7 = fut.filter(f => days(f.tarih, today) <= 7).length;

  // ---- Taktik & susunan dari FM
  const tk = ofis.taktik || null;
  let lineup = null;
  if (tk && tk.slotlar && tk.slotlar.length) {
    const xiP = tk.slotlar.map(s => byId(s.id)).filter(Boolean);
    const fkey = Object.keys(E.FORMATIONS).find(k => String(ofis.dizilis || '').startsWith(k)) || (xiP.length ? '4-2-3-1' : null);
    if (fkey && xiP.length >= 8) {
      const bx = E.bestXI(xiP, fkey);
      // pasangan posisi kiri/kanan: tukar bila sisi kebalikan
      for (let i = 0; i < bx.xi.length; i++) for (let j = i + 1; j < bx.xi.length; j++) {
        const a = bx.xi[i], b = bx.xi[j]; if (a.pos !== b.pos || !a.pick || !b.pick || a.x === b.x) continue;
        const [l, r] = a.x < b.x ? [a, b] : [b, a]; const sl = side(byId(l.pick.id) || {}), sr = side(byId(r.pick.id) || {});
        if (sl === 'R' && sr !== 'R' || sr === 'L' && sl !== 'L') { const t = l.pick; l.pick = r.pick; r.pick = t; }
      }
      lineup = { formation: ofis.dizilis || fkey, players: bx.xi.filter(s => s.pick).map(s => { const p = byId(s.pick.id), d = st(s.pick.id); return { id: s.pick.id, name: p ? p.name : s.pick.name, short: short(p ? p.name : s.pick.name), x: s.x, y: s.y, pos: s.pos, cond: d.kondisyon >= 0 ? d.kondisyon : null, injured: !!d.sakat, no: d.formaNo || null }; }) };
    }
  }
  const tactic = tk ? { name: tk.ad, mentality: tk.mentalite, pressing: tk.yogunluk, shape: ofis.dizilis || null, captain: ofis.kaptan && byId(ofis.kaptan) ? byId(ofis.kaptan).name : null } : null;

  // ---- Kebugaran & absen (pemain senior)
  const sen = senior.map(p => ({ p, d: st(p.id) })).filter(x => x.d && Object.keys(x.d).length);
  const injured = sen.filter(x => x.d.sakat).map(x => ({ id: x.p.id, name: x.p.name, txt: ((x.d.etiketler || []).find(t => t.kisa === 'Cdr') || {}).neden || 'Cedera' }));
  const bans = (ofis.cezalilar || []).map(c => byId(c.id)).filter(p => p && p.club === club).map(p => ({ id: p.id, name: p.name }));
  const xiIds = new Set(lineup ? lineup.players.map(x => x.id) : []);
  const fit = sen.filter(x => !x.d.sakat && x.d.kondisyon >= 0);
  const lowXI = fit.filter(x => xiIds.has(x.p.id)).sort((a, b) => a.d.kondisyon - b.d.kondisyon)[0] || null;
  const tired = fit.filter(x => x.d.kondisyon < 85 || x.d.yorgunluk >= 100).length;
  const fitness = { injured, bans, tired, lowXI: lowXI ? { id: lowXI.p.id, name: lowXI.p.name, cond: lowXI.d.kondisyon } : null, avgCond: fit.length ? Math.round(fit.reduce((t, x) => t + x.d.kondisyon, 0) / fit.length) : null };

  // ---- Laga terakhir
  const a = (ofis.analiz || [])[0];
  const last = a ? { rakip: a.rakip, evde: a.evde, kisa: a.turnuvaKisa, date: a.tarih, tgl: tgl(a.tarih), res: a.sonuc, gf: a.atilan, ga: a.yenilen, xgF: a.biz && a.biz.xg != null ? +a.biz.xg.toFixed(1) : null, xgA: a.on && a.on.xg != null ? +a.on.xg.toFixed(1) : null, shots: a.biz && a.biz.sut, summary: a.ozet || '', motm: a.macinOyuncusuBizden ? a.macinOyuncusuAd : null, form: (ofis.fikstur || []).filter(f => f.oynandi && !/Persahabatan|Friendly/i.test(f.turnuva)).slice(-5).map(f => f.sonuc) } : null;

  // ---- Kolom kanan
  const todayPlan = latihan ? latihan.days.find(d => d.date === today) || latihan.days[0] : null;
  const auditBad = latihan && latihan.fm ? latihan.fm.notes.filter(n => n.tone === 'bad' || n.tone === 'warn') : [];
  const training = latihan ? { today: todayPlan ? { label: todayPlan.label, sessions: todayPlan.sessions.map(s => s.name) } : null, focus: latihan.needs.primary === 'def' ? 'Bertahan' : 'Menyerang', issues: auditBad.length, issue: auditBad[0] ? auditBad[0].text : null, rating: latihan.fm ? latihan.fm.rating : null, status: latihan.fm ? latihan.fm.durum : null } : null;
  const contracts = senior.filter(p => p._exp !== null && p._exp <= 12).sort((x, y) => x._exp - y._exp).map(p => ({ id: p.id, name: p.name, expires: p.expires, months: p._exp, note: ((st(p.id).etiketler || []).find(t => t.kisa === 'Ops') || {}).neden || null }));
  const tgts = (targets || []).map(t => ({ t, p: t && byId(t.id) })).filter(x => x.p && x.p.club !== club).map(({ t, p }) => ({ id: p.id, name: p.name, club: p.club || 'Tanpa Klub', status: t.status, prio: t.prio, ca: p.ca, pa: p.pa })).sort((x, y) => (y.prio || 0) - (x.prio || 0));
  const need = (dash.need || []).slice(0, 2);
  const youthIds = (ofis.gelisim && ofis.gelisim.aday) || [];
  const youth = youthIds.map(byId).filter(p => p && p.club === club).sort((x, y) => y.pa - x.pa);
  const window = ofis.gozlem ? { open: !!ofis.gozlem.pencereAcik, days: ofis.gozlem.pencereGun, youthDays: ofis.gozlem.gencAlimGun } : null;

  // ---- 3 tugas prioritas
  const jobs = [];
  if (lowXI && lowXI.d.kondisyon < 90 && next) jobs.push({ kind: 'Kebugaran', icon: 'fit', title: `${lowXI.p.name} di kondisi ${lowXI.d.kondisyon}%, laga berikutnya ${next.inDays === 0 ? 'hari ini' : next.inDays + ' hari lagi'}.`, why: `Dia ada di susunan taktik FM Anda. ${in7 > 1 ? in7 + ' laga dalam 7 hari — ' : ''}pertimbangkan rotasi atau latihan ringan untuknya.`, link: '#latihan', linkText: 'Buka Latihan', fm: lowXI.p.id });
  if (injured.length) jobs.push({ kind: 'Cedera', icon: 'med', title: `${injured.length} pemain senior cedera: ${injured.slice(0, 2).map(x => x.name).join(', ')}${injured.length > 2 ? '…' : ''}.`, why: injured[0].txt, link: '#skuad', linkText: 'Lihat skuad', fm: injured[0].id });
  if (auditBad.length) jobs.push({ kind: 'Latihan', icon: 'cal', title: auditBad[0].text, why: `Ada ${auditBad.length} catatan pada jadwal latihan FM minggu ini dibanding jadwal laga.`, link: '#latihan', linkText: 'Lihat usulan jadwal' });
  if (contracts.length && contracts[0].months <= 6) jobs.push({ kind: 'Kontrak', icon: 'pen', title: `Kontrak ${contracts[0].name} habis ${contracts[0].expires}.`, why: contracts[0].note || `${contracts.filter(c => c.months <= 6).length} pemain senior kontraknya habis ≤ 6 bulan.`, link: '#skuad', linkText: 'Lihat skuad', fm: contracts[0].id });
  if (window && window.open && need[0]) jobs.push({ kind: 'Transfer', icon: 'scout', title: `Jendela transfer terbuka ${window.days} hari lagi — posisi terlemah: ${need[0].label}.`, why: `Rating 2 pemain terbaik di posisi itu rata-rata ${need[0].top}. Cari yang realistis mau bergabung.`, link: '#scout?preset=mau', linkText: 'Cari pemain' });
  if (last && last.xgA != null && last.xgA > last.xgF) jobs.push({ kind: 'Analisis', icon: 'chart', title: `Laga terakhir xG lawan ${last.xgA} lebih tinggi dari kita (${last.xgF}).`, why: last.summary, link: '#latihan', linkText: 'Fokus latihan' });

  return {
    ok: true, today, todayTxt: tgl(today), updated: ofis.zaman || null, club, clubId: dash.meta && dash.meta.clubId, manager: dash.meta && dash.meta.manager,
    table, target, next, upcoming, in7, tactic, lineup, fitness, last, training, contracts: contracts.slice(0, 4), contractsN: contracts.filter(c => c.months <= 6).length,
    targets: tgts.slice(0, 3), targetsN: tgts.length, shortlistN: (shortlist || []).length, need, youth: youth.slice(0, 3).map(p => ({ id: p.id, name: p.name, age: p.age, ca: p.ca, pa: p.pa })), youthN: youth.length,
    window, jobs: jobs.slice(0, 3), restList: latihan ? ((latihan.checklist.find(g => g.id === 'rest') || {}).items || []).slice(0, 6).map(x => x.name) : [],
    squadN: squad.length, seniorN: senior.length,
  };
}

module.exports = { build };
