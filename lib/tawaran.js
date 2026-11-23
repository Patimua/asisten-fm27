'use strict';
// Tawaran Saya — rangkuman pemain yang Anda tawar / dekati / negosiasikan di FM27.
// Sumber: rekaman plugin Jembatan (event.log). Disimpan per karier (tawaran.json) dan dibaca bertahap (offset byte),
// pertama kali mulai dari save terakhir yang dimuat. Status "sudah bergabung" dicocokkan dengan klub pemain saat ini.
const fs = require('fs');
const path = require('path');

const ACT = { PersonMakeOfferForPlayer: 'tawar', PersonApproachToSign: 'dekati', PersonOfferContract: 'kontrak', PersonAddPlayersAsTransferTargets: 'target' };
const EV = { EventFmxTransferOfferResponse: 'jawab', EventFmxProceedToContractNegotiations: 'nego', EventFmxSuggestTerms: 'nego', EventFmxConfirmTerms: 'setuju', EventFmxWithdrawContractNegotiationProcess: 'tutup', EventFmxExitNegotiations: 'tutup' };
const RANK = { target: 1, tawar: 2, dekati: 2, jawab: 3, kontrak: 3, nego: 4, setuju: 5 };
const PROSES = ['setuju', 'nego', 'jawab', 'kontrak', 'tawar', 'dekati'];
const LBL = {
  gabung: ['✅ Sudah bergabung', 'good'], setuju: ['📝 Kontrak disepakati — menunggu', 'warn'], nego: ['🗣️ Negosiasi kontrak', 'warn'],
  jawab: ['📨 Tawaran dijawab klub', 'info'], kontrak: ['📨 Kontrak ditawarkan', 'info'], tawar: ['📤 Tawaran dikirim', 'info'],
  dekati: ['📤 Didekati (bebas transfer)', 'info'], target: ['⭐ Hanya diincar', 'muted'], lain: ['❌ Pindah ke klub lain', 'bad'],
};
const ORDER = ['GK', 'DC', 'FB', 'WB', 'DM', 'MC', 'WM', 'AMC', 'W', 'ST'];
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

function ingest(file, logFile, players, gameDate) {
  const st = readJSON(file, { off: -1, list: {} });
  let size; try { size = fs.statSync(logFile).size; } catch { return st; }
  if (st.off > size) st.off = 0; // log dibuat ulang
  if (st.off === size) return st;
  let txt;
  if (st.off < 0) {
    const all = fs.readFileSync(logFile, 'utf8');
    const k = Math.max(all.lastIndexOf('\tEventFmxLoadGame\t'), all.lastIndexOf('\tEventFmxCreateGame\t'));
    txt = all.slice(k < 0 ? 0 : all.lastIndexOf('\n', k) + 1);
  } else {
    const fd = fs.openSync(logFile, 'r'); const b = Buffer.alloc(size - st.off);
    fs.readSync(fd, b, 0, b.length, st.off); fs.closeSync(fd); txt = b.toString('utf8');
  }
  const byDbi = new Map(players.map(p => [p.dbi, p]));
  for (const line of txt.split('\n')) {
    const t = line.split('\t'); if (t.length < 4 || t[3] === '[ASISTEN]') continue;
    let act = null, ids = [];
    if (t[2] === 'EventFmxAuditActionsMenuObjectSelected') {
      const m = line.match(/String:(Person\w+)/); act = m && ACT[m[1]];
      if (act) ids = [...line.matchAll(/1685218662:(\d+)/g)].map(x => Number(x[1]));
    } else if (EV[t[2]]) {
      act = EV[t[2]]; const m = line.match(/541733224=ref\([^)]*1685218662:(\d+)/); if (m) ids = [Number(m[1])];
    }
    if (!act) continue;
    for (const id of ids) {
      if (id < 0x01000000) continue;
      const p = byDbi.get(id - 0x01000000);
      const e = st.list[id] || (st.list[id] = { pers: id, first: gameDate, club0: p ? p.club : null, ev: [] });
      e.ev.push({ a: act, t: t[0], gd: gameDate }); if (e.ev.length > 40) e.ev = e.ev.slice(-40);
      e.last = act; e.lastGd = gameDate;
      if ((RANK[act] || 0) > (RANK[e.best] || 0)) e.best = act;
    }
  }
  st.off = size;
  try { fs.writeFileSync(file, JSON.stringify(st)); } catch { }
  return st;
}

// players: DB.players (punya dbi, club, _bp, _bpr, teamType); POS: E.POSITIONS
function build({ file, logFile, players, myClub, gameDate, POS }) {
  const st = ingest(file, logFile, players, gameDate);
  const byDbi = new Map(players.map(p => [p.dbi, p]));
  const rows = Object.values(st.list).map(e => {
    const p = byDbi.get(e.pers - 0x01000000); if (!p) return null;
    const moved = e.club0 && p.club && p.club !== e.club0 && p.club !== myClub && p.club !== 'Tanpa Klub';
    const status = p.club === myClub ? 'gabung' : moved ? 'lain' : (e.best || e.last);
    const L = LBL[status] || [status, 'muted'];
    return {
      id: p.id, name: p.name, age: p.age, pos: p.pos, bp: p._bp, bpLabel: POS[p._bp] ? POS[p._bp].label : p._bp,
      club: p.club || 'Tanpa klub', club0: e.club0, ca: p.ca, pa: p.pa, value: p.value, wage: p.wage, rating: Math.round(p._bpr || 0),
      status, statusLabel: L[0], tone: L[1], first: e.first, lastGd: e.lastGd, steps: e.ev.length,
    };
  }).filter(Boolean);
  const squad = players.filter(p => p.club === myClub && !p.teamType);
  const sortKey = r => (r.status === 'gabung' ? 10 : r.status === 'lain' ? -1 : RANK[r.status] || 0);
  // Kebutuhan per posisi: jumlah ideal (inti + pelapis) & kualitas pemain terbaik dibanding rata-rata 11 terbaik skuad
  const DEPTH = { GK: 2, DC: 4, FB: 2, WB: 2, DM: 2, MC: 3, WM: 2, AMC: 2, W: 2, ST: 3 };
  const top11 = squad.map(p => p._bpr || 0).sort((a, b) => b - a).slice(0, 11);
  const xiAvg = top11.length ? top11.reduce((t, x) => t + x, 0) / top11.length : 0;
  const positions = ORDER.map(k => {
    const list = rows.filter(r => r.bp === k).sort((a, b) => sortKey(b) - sortKey(a) || b.rating - a.rating);
    const inSquad = squad.filter(p => p._bp === k).sort((a, b) => (b._bpr || 0) - (a._bpr || 0));
    const best = inSquad.length ? Math.round(inSquad[0]._bpr || 0) : 0;
    const proses = list.filter(r => PROSES.includes(r.status)).length;
    let need, needLabel, needTone;
    if (!inSquad.length) { need = 'kosong'; needLabel = 'Kosong — butuh pemain inti'; needTone = 'bad'; }
    else if (best < xiAvg - 6) { need = 'kualitas'; needLabel = `Butuh pemain inti lebih bagus (terbaik ${best} vs rata-rata inti ${Math.round(xiAvg)})`; needTone = 'bad'; }
    else if (inSquad.length < DEPTH[k]) { need = 'pelapis'; needLabel = `Butuh pelapis (${inSquad.length}/${DEPTH[k]})`; needTone = 'warn'; }
    else { need = 'aman'; needLabel = `Aman (${inSquad.length}/${DEPTH[k]})`; needTone = 'good'; }
    return {
      pos: k, label: POS[k] ? POS[k].label : k, squad: inSquad.length, depth: DEPTH[k], squadBest: best,
      need, needLabel, needTone, covered: need !== 'aman' && proses > 0,
      squadPlayers: inSquad.map((p, i) => ({ id: p.id, name: p.name, age: p.age, rating: Math.round(p._bpr || 0), ca: p.ca, pa: p.pa, role: i === 0 || (i < 2 && ['DC', 'MC', 'ST'].includes(k)) ? 'Inti' : 'Pelapis', injured: !!p.injured })),
      joined: list.filter(r => r.status === 'gabung').length, proses, players: list,
    };
  });
  return {
    club: myClub, gameDate, total: rows.length,
    joined: rows.filter(r => r.status === 'gabung').length, proses: rows.filter(r => PROSES.includes(r.status)).length,
    gagal: rows.filter(r => r.status === 'lain').length, xiAvg: Math.round(xiAvg), positions,
    butuh: positions.filter(p => p.need !== 'aman').map(p => ({ pos: p.pos, label: p.label, need: p.need, proses: p.proses })),
  };
}

function remove(file, players, id) {
  const st = readJSON(file, { off: -1, list: {} }); const p = players.find(x => x.id === Number(id));
  if (p) for (const k of Object.keys(st.list)) if (st.list[k].pers - 0x01000000 === p.dbi) delete st.list[k];
  fs.writeFileSync(file, JSON.stringify(st));
}

module.exports = { build, remove };
