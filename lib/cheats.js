'use strict';
// Mesin cheat FM27 — menulis langsung ke memori fm.exe (Football Manager 27 saja).
// Layout memori FM27 dari FMSuperScout (MIT, mavarobli) — diverifikasi 100% terhadap dump.
// Setiap penulisan: verifikasi UID dulu, simpan nilai asli (undo), lalu tulis berkelompok.
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const EXE = path.join(__dirname, '..', 'native', 'fmmem.exe');
const L = {
  UID: 0x0C, PERS: 0x70, CONTRACT: 0xA8,
  P_CA: 0x264, P_PA: 0x266, P_ATTRS: 0x15F,
  S_CA: 0xDA, S_PA: 0xDC, S_ATTRS: 0x10,
  C_WAGE: 0x20, C_EXPIRY: 0x48, C_FLAGS: 0x57,
};
const PATTR = { Crossing: 0, Dribbling: 1, Finishing: 2, Heading: 3, LongShots: 4, Marking: 5, OffTheBall: 6, Passing: 7, PenaltyTaking: 8, Tackling: 9, Vision: 10, Handling: 11, AerialReach: 12, CommandOfArea: 13, Communication: 14, Kicking: 15, Throwing: 16, Anticipation: 17, Decisions: 18, OneOnOnes: 19, Positioning: 20, Reflexes: 21, FirstTouch: 22, Technique: 23, Flair: 26, Corners: 27, Teamwork: 28, WorkRate: 29, LongThrows: 30, Eccentricity: 31, RushingOut: 32, Punching: 33, Acceleration: 34, FreeKicks: 35, Strength: 36, Stamina: 37, Pace: 38, JumpingReach: 39, Leadership: 40, Dirtiness: 41, Balance: 42, Bravery: 43, Consistency: 44, Aggression: 45, Agility: 46, ImportantMatches: 47, InjuryProneness: 48, Versatility: 49, NaturalFitness: 50, Determination: 51, Composure: 52, Concentration: 53 };
const GK_ONLY = ['Handling', 'AerialReach', 'CommandOfArea', 'Communication', 'Kicking', 'Throwing', 'OneOnOnes', 'Reflexes', 'Eccentricity', 'RushingOut', 'Punching'];
const HIDDEN = ['Dirtiness', 'Consistency', 'ImportantMatches', 'InjuryProneness', 'Versatility'];
const SATTR = { Aanvallen: 0x22, Verdedigen: 0x23, Fitheid: 0x24, Balbezit: 0x25, Technisch: 0x26, Tactisch: 0x27, Standaardsituaties: 0x33, Vastberadenheid: 0x0D, 'Man-management': 0x1E, Motiveren: 0x1F, Oordeel_vermogen: 0x1C, Oordeel_potentie: 0x1D, Oordeel_staf: 0x32, Onderhandelen: 0x31, Tactische_kennis: 0x21, Fysiotherapie: 0x20, Sportwetenschap: 0x2F, Data_analyse: 0x2C, Jeugd: 0x0C, KV_distributie: 0x2A, KV_reflexen: 0x1B };
const S_GROUPS = {
  melatih: ['Aanvallen', 'Verdedigen', 'Fitheid', 'Balbezit', 'Technisch', 'Tactisch', 'Standaardsituaties', 'KV_distributie', 'KV_reflexen', 'Jeugd'],
  mental: ['Vastberadenheid', 'Man-management', 'Motiveren'],
  pengetahuan: ['Oordeel_vermogen', 'Oordeel_potentie', 'Oordeel_staf', 'Onderhandelen', 'Tactische_kennis', 'Data_analyse'],
  medis: ['Fysiotherapie', 'Sportwetenschap'],
};
const STAGES = { halus: 0.1, ringan: 0.25, sedang: 0.5, cepat: 0.75, instan: 1 };
const LEG = require('./legends.json');
const LPOS_MEM = ['GK', 'SW', 'DL', 'DC', 'DR', 'DM', 'ML', 'MC', 'MR', 'AML', 'AMC', 'AMR', 'ST', 'WBL', 'WBR'];
const L_GK_GROW = ['Anticipation', 'Decisions', 'Positioning', 'Concentration', 'Composure', 'Agility', 'FirstTouch', 'Passing', 'Acceleration', 'JumpingReach', 'Bravery', 'Kicking', 'Throwing'];
// Profil legenda pada usia tertentu. Data legenda = kondisi pada usia leg.age (CA leg.ca). CA naik lurus ke PA tepat di usia puncak;
// di bawah usia data, CA turun ±7%/tahun. Atribut yang "tumbuh" bergerak dari nilai data ke nilai puncak (×PA/CA, maks. 20);
// kiper/tersembunyi/tekad tetap sama dengan data.
function legendAt(leg, age, peak) {
  const a0 = leg.age, c0 = leg.ca, PA = leg.pa, pk = Math.max(peak, a0 + 0.5);
  let ca;
  if (age >= pk) ca = PA;
  else if (age >= a0) ca = c0 + (PA - c0) * (age - a0) / (pk - a0);
  else ca = c0 * Math.max(0.45, 1 - 0.07 * (a0 - age));
  ca = Math.max(1, Math.min(200, Math.round(ca)));
  const gk = leg.grp === 'GK'; const f = PA / c0; const attrs = {};
  for (const [k, v] of Object.entries(leg.attrs)) {
    const grow = !HIDDEN.includes(k) && k !== 'Determination' && (gk ? (GK_ONLY.includes(k) || L_GK_GROW.includes(k)) : !GK_ONLY.includes(k));
    if (!grow) { attrs[k] = v; continue; }
    if (ca >= c0) { const top = Math.min(20, v * f); attrs[k] = v + (top - v) * (PA > c0 ? (ca - c0) / (PA - c0) : 1); }
    else attrs[k] = Math.max(1, v * ca / c0);
  }
  return { ca, attrs };
}

function run(args) {
  return new Promise((res, rej) => execFile(EXE, args, { windowsHide: true, timeout: 120000 }, (e, out) => {
    const s = String(out || '').trim();
    if (s.startsWith('err')) return rej(new Error(s.slice(4)));
    if (e && !s) return rej(e);
    res(s);
  }));
}

class Cheats {
  constructor(dataDir) {
    this.dir = path.join(dataDir, 'cheat'); fs.mkdirSync(this.dir, { recursive: true });
    this.idx = null; this.idxAt = 0; this.pid = null; this.version = null;
  }
  async status() {
    try { const r = await run(['ping']); this.pidNow = Number(r.split(' ')[1]); return { ok: true, pid: this.pidNow, indexed: this.idx ? this.idx.size : 0, version: this.version, indexedAt: this.idxAt }; }
    catch (e) { return { ok: false, error: e.message }; }
  }
  async index(force) {
    const st = await this.status(); if (!st.ok) throw new Error(st.error);
    if (!force && this.idx && this.pid === st.pid) return this.idx; // indeks tetap dipakai selama proses FM sama; verified() memindai ulang bila UID tidak cocok
    if (this._idxP) return this._idxP; // satu pemindaian sekaligus (berkas index.txt dipakai bersama)
    this._idxP = this._indexScan(st).finally(() => { this._idxP = null; });
    return this._idxP;
  }
  async _indexScan(st) {
    const f = path.join(this.dir, 'index.txt');
    const r = await run(['index', f]); // "ok np ns versi"
    const [, , , ver] = r.split(' '); this.version = ver;
    if (!/^27\./.test(ver || '')) throw new Error(`Versi game_plugin ${ver} bukan FM27 — penulisan dibatalkan demi keamanan.`);
    const m = new Map();
    for (const l of fs.readFileSync(f, 'utf8').split('\n')) { const t = l.split(' '); if (t.length < 6) continue; m.set(Number(t[0]), { kind: t[1], off: parseInt(t[2], 16), p: parseInt(t[3], 16) }); }
    this.idx = m; this.idxAt = Date.now(); this.pid = st.pid;
    return m;
  }
  async readMany(list) { // list: [addr, len]
    const k = (this._rk = ((this._rk || 0) + 1) % 1e6); const fin = path.join(this.dir, 'r-in-' + k + '.txt'), fout = path.join(this.dir, 'r-out-' + k + '.txt'); // berkas unik: pembacaan paralel tidak saling menimpa
    fs.writeFileSync(fin, list.map(([a, n]) => a.toString(16) + ' ' + n).join('\n'));
    try {
      await run(['rfile', fin, fout]);
      return fs.readFileSync(fout, 'utf8').split('\n').slice(0, list.length).map(h => (h && h !== 'null' ? Buffer.from(h, 'hex') : null));
    } finally { fs.unlink(fin, () => {}); fs.unlink(fout, () => {}); }
  }
  async writeMany(writes, label) { // writes: [addr, Buffer, uid]
    if (!writes.length) return { ok: 0, bad: 0 };
    const orig = await this.readMany(writes.map(([a, b]) => [a, b.length]));
    const undo = writes.map(([a, b, uid], i) => ({ a: a.toString(16), o: orig[i] ? orig[i].toString('hex') : null, uid })).filter(x => x.o);
    const id = Date.now();
    fs.writeFileSync(path.join(this.dir, `undo-${id}.json`), JSON.stringify({ id, label, pid: this.pid, at: new Date().toISOString(), undo }));
    const f = path.join(this.dir, `w-${id}.txt`);
    fs.writeFileSync(f, writes.filter((w, i) => orig[i]).map(([a, b]) => a.toString(16) + ' ' + b.toString('hex')).join('\n'));
    let r; try { r = await run(['wfile', f]); } finally { fs.unlink(f, () => {}); } const [, ok, bad] = r.split(' ');
    return { ok: Number(ok), bad: Number(bad), undoId: id };
  }
  history() {
    return fs.readdirSync(this.dir).filter(f => f.startsWith('undo-')).sort().reverse().slice(0, 30).map(f => { const j = JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf8')); return { id: j.id, label: j.label, at: j.at, n: j.undo.length, samePid: j.pid === this.pid }; });
  }
  async undo(id) {
    const f = path.join(this.dir, `undo-${id}.json`); if (!fs.existsSync(f)) throw new Error('Riwayat tidak ditemukan');
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    await this.index();
    if (j.pid !== this.pid) throw new Error('FM sudah dimulai ulang sejak perubahan ini — tidak bisa dibatalkan (alamat memori berubah). Muat ulang save tanpa menyimpan untuk membatalkan.');
    const wf = path.join(this.dir, `w-undo-${id}.txt`);
    fs.writeFileSync(wf, j.undo.map(u => u.a + ' ' + u.o).join('\n'));
    let r; try { r = await run(['wfile', wf]); } finally { fs.unlink(wf, () => {}); }
    fs.renameSync(f, f.replace('undo-', 'done-'));
    return { ok: Number(r.split(' ')[1]) };
  }

  // Ambil entri terverifikasi (UID cocok) untuk daftar uid
  async verified(uids, kind, retried) {
    const idx = await this.index();
    const ent = uids.map(u => [u, idx.get(u)]).filter(([, e]) => e && (!kind || (kind === 'P' ? e.kind === 'P' : e.kind !== 'P')));
    const chk = await this.readMany(ent.map(([, e]) => [e.p + L.UID, 4]));
    const ok = ent.filter(([u], i) => chk[i] && chk[i].readUInt32LE(0) === u).map(([u, e]) => ({ uid: u, ...e, base: e.p - e.off }));
    // Objek berpindah / pemain baru belum terindeks → pindai ulang sekali (maks. tiap 60 dtk)
    if (!retried && ok.length < uids.length && (ok.length < ent.length || ent.length < uids.length) && Date.now() - this.idxAt > 60000) { await this.index(true); return this.verified(uids, kind, true); }
    return ok;
  }

  // ---------------- Pemain ----------------
  async playerBlocks(ents) {
    const r = await this.readMany(ents.flatMap(e => [[e.base + L.P_CA, 4], [e.base + L.P_ATTRS, 0x37]]));
    return ents.map((e, i) => ({ ...e, ca: r[2 * i]?.readUInt16LE(0), pa: r[2 * i]?.readUInt16LE(2), attrs: r[2 * i + 1] }));
  }
  async pushCA(uids, stage, withAttrs, isGKSet) {
    const frac = STAGES[stage] ?? 0.5;
    const ents = await this.playerBlocks(await this.verified(uids, 'P'));
    const writes = []; let changed = 0, gained = 0;
    for (const e of ents) {
      if (!e.ca || !e.pa || e.pa <= e.ca) continue;
      const gap = e.pa - e.ca; const add = Math.max(1, Math.round(gap * frac)); const nca = Math.min(e.pa, e.ca + add);
      const b = Buffer.alloc(2); b.writeUInt16LE(nca); writes.push([e.base + L.P_CA, b, e.uid]);
      changed++; gained += nca - e.ca;
      if (withAttrs && e.attrs) {
        const f = Math.min(1.6, nca / e.ca);
        const gk = isGKSet && isGKSet.has(e.uid);
        const nb = Buffer.from(e.attrs);
        for (const [k, o] of Object.entries(PATTR)) {
          if (HIDDEN.includes(k) || k === 'Determination') continue;
          if (!gk && GK_ONLY.includes(k)) continue;
          if (gk && !GK_ONLY.includes(k) && !['Anticipation', 'Decisions', 'Positioning', 'Concentration', 'Composure', 'Agility', 'FirstTouch', 'Passing', 'Acceleration', 'JumpingReach', 'Bravery'].includes(k)) continue;
          const v = nb[o]; if (!v) continue;
          nb[o] = Math.min(100, Math.max(v, Math.round(v * f)));
        }
        if (!nb.equals(e.attrs)) writes.push([e.base + L.P_ATTRS, nb, e.uid]);
      }
    }
    const r = await this.writeMany(writes, `Push CA→PA (${stage}${withAttrs ? ' + atribut' : ''}) · ${changed} pemain`);
    return { ...r, players: changed, avgGain: changed ? Math.round((gained / changed) * 10) / 10 : 0 };
  }
  // Set CA ke angka tertentu (PA ikut naik bila perlu, karena CA > PA membuat FM membuat ulang pemain); atribut diskalakan sebanding
  async setCA(uids, value, withAttrs, isGKSet) {
    const ents = await this.playerBlocks(await this.verified(uids, 'P'));
    const nca = Math.max(1, Math.min(200, Math.round(value)));
    const writes = []; let n = 0;
    for (const e of ents) {
      if (!e.ca) continue;
      const b = Buffer.alloc(2); b.writeUInt16LE(nca); writes.push([e.base + L.P_CA, b, e.uid]); n++;
      if (e.pa < nca) { const p = Buffer.alloc(2); p.writeUInt16LE(nca); writes.push([e.base + L.P_PA, p, e.uid]); }
      if (withAttrs && e.attrs && nca !== e.ca) {
        const f = Math.max(0.5, Math.min(1.8, nca / e.ca)); const gk = isGKSet && isGKSet.has(e.uid); const nb = Buffer.from(e.attrs);
        for (const [k, o] of Object.entries(PATTR)) {
          if (HIDDEN.includes(k) || k === 'Determination') continue;
          if (!gk && GK_ONLY.includes(k)) continue;
          if (gk && !GK_ONLY.includes(k) && !['Anticipation', 'Decisions', 'Positioning', 'Concentration', 'Composure', 'Agility', 'FirstTouch', 'Passing', 'Acceleration', 'JumpingReach', 'Bravery'].includes(k)) continue;
          const v = nb[o]; if (!v) continue;
          nb[o] = Math.min(100, Math.max(5, Math.round(v * f)));
        }
        if (!nb.equals(e.attrs)) writes.push([e.base + L.P_ATTRS, nb, e.uid]);
      }
    }
    return { ...(await this.writeMany(writes, `Set CA ${nca}${withAttrs ? ' + atribut' : ''} · ${n} pemain`)), players: n };
  }
  // Hancurkan tim (mental): CA, teknik & fisik TIDAK disentuh. Atribut mental ×faktor, tersembunyi dibuat terburuk
  // (tidak konsisten, ciut di laga besar, rawan cedera, kasar), kepribadian dibuat rapuh (tekanan, profesionalisme,
  // temperamen, ambisi rendah; kontroversi tinggi). o.full = juga CA & semua atribut ×faktor (+ kunci PA). Bisa dibatalkan.
  async destroyTeam(uids, factor, o = {}, label = '') {
    const f = Math.max(0.1, Math.min(0.95, Number(factor) || 0.5));
    const MENTAL = ['Aggression', 'Anticipation', 'Bravery', 'Composure', 'Concentration', 'Decisions', 'Determination', 'Flair', 'Leadership', 'OffTheBall', 'Positioning', 'Teamwork', 'Vision', 'WorkRate'];
    const lo = Math.max(5, Math.round(100 * f * 0.25)); // nilai terburuk (skala ×5): faktor 0,2 → 5 (=1)
    const HID = { Consistency: lo, ImportantMatches: lo, InjuryProneness: 100 - lo + 5, Dirtiness: 100 - lo + 5 };
    const ents = await this.playerBlocks(await this.verified(uids, 'P'));
    const pers = o.pers === false ? [] : await this.readMany(ents.map(e => [e.p + L.PERS, 8]));
    const writes = []; let n = 0, mBefore = 0, mAfter = 0, before = 0, after = 0;
    ents.forEach((e, i) => {
      if (!e.ca || !e.attrs) return; n++;
      const nb = Buffer.from(e.attrs);
      for (const k of MENTAL) { const off = PATTR[k], v = nb[off]; if (!v) continue; const nv = Math.max(5, Math.round(v * f)); mBefore += v; mAfter += nv; nb[off] = nv; }
      if (o.hidden !== false) for (const [k, v] of Object.entries(HID)) nb[PATTR[k]] = v;
      let nca = e.ca;
      if (o.full) {
        nca = Math.max(1, Math.round(e.ca * f));
        for (const [k, off] of Object.entries(PATTR)) if (!MENTAL.includes(k) && !HIDDEN.includes(k) && nb[off]) nb[off] = Math.max(5, Math.round(nb[off] * f));
        const b = Buffer.alloc(2); b.writeUInt16LE(nca); writes.push([e.base + L.P_CA, b, e.uid]);
        if (o.lockPA) { const p = Buffer.alloc(2); p.writeUInt16LE(Math.min(e.pa || nca, Math.max(nca, Math.round(nca * 1.05)))); writes.push([e.base + L.P_PA, p, e.uid]); }
      }
      before += e.ca; after += nca;
      if (!nb.equals(e.attrs)) writes.push([e.base + L.P_ATTRS, nb, e.uid]);
      const pb = pers[i];
      if (pb && pb.length === 8) {
        // adaptasi, ambisi, loyalitas, tekanan, profesionalisme, sportivitas, temperamen, kontroversi (1–20)
        const bad = Math.max(1, Math.round(20 * f * 0.25)), np = Buffer.from(pb);
        np[1] = Math.min(np[1], bad); np[3] = Math.min(np[3], bad); np[4] = Math.min(np[4], bad); np[5] = Math.min(np[5], bad); np[6] = Math.min(np[6], bad); np[7] = Math.max(np[7], 21 - bad);
        if (!np.equals(pb)) writes.push([e.p + L.PERS, np, e.uid]);
      }
    });
    const r = await this.writeMany(writes, `Hancurkan mental ${label} · ×${f}${o.hidden !== false ? ' + tersembunyi' : ''}${o.pers !== false ? ' + kepribadian' : ''}${o.full ? ' + CA/atribut' : ''} · ${n} pemain`);
    const m = x => n ? Math.round(x / n / 14 / 5 * 10) / 10 : 0; // rata-rata mental skala 1–20
    return { ...r, players: n, mentalBefore: m(mBefore), mentalAfter: m(mAfter), caBefore: n ? Math.round(before / n) : 0, caAfter: n ? Math.round(after / n) : 0 };
  }
  // Mode Comeback: tim saya dibuat super untuk satu laga. Atribut ×power (maks 20), mental & tersembunyi terbaik,
  // CA 200, kondisi/ketajaman 100%, moral maksimum. Semua bisa dikembalikan (undo) setelah laga.
  async comeback(uids, power) {
    const pw = power === 'max' ? 99 : Math.max(1.1, Math.min(3, Number(power) || 2));
    const BEST = { Consistency: 100, ImportantMatches: 100, InjuryProneness: 5, Dirtiness: 5, Determination: 100, Composure: 100, Concentration: 100, Decisions: 100, Anticipation: 100, Teamwork: 100, WorkRate: 100, Bravery: 100, Leadership: 100, Positioning: 100, Stamina: 100, NaturalFitness: 100 };
    const ents = await this.playerBlocks(await this.verified(uids, 'P'));
    const writes = []; let n = 0, cnt = 0, before = 0, after = 0;
    for (const e of ents) {
      if (!e.ca || !e.attrs) continue; n++;
      const nb = Buffer.from(e.attrs);
      const gk = (nb[PATTR.Handling] + nb[PATTR.Reflexes] + nb[PATTR.OneOnOnes]) > (nb[PATTR.Finishing] + nb[PATTR.Tackling] + nb[PATTR.Passing]) * 1.3;
      for (const [k, off] of Object.entries(PATTR)) {
        const v = nb[off]; if (!v || HIDDEN.includes(k)) continue;
        if (!gk && GK_ONLY.includes(k)) continue;
        cnt++; before += v; nb[off] = Math.min(100, Math.max(v, Math.round(v * pw))); after += nb[off];
      }
      for (const [k, v] of Object.entries(BEST)) nb[PATTR[k]] = v;
      if (!nb.equals(e.attrs)) writes.push([e.base + L.P_ATTRS, nb, e.uid]);
      if (e.ca < 200) { const b = Buffer.alloc(4); b.writeUInt16LE(200); b.writeUInt16LE(Math.max(200, e.pa || 0), 2); writes.push([e.base + L.P_CA, b, e.uid]); }
      const c = Buffer.alloc(2); c.writeUInt16LE(10000); writes.push([e.base + 0x258, c, e.uid]); writes.push([e.base + 0x25C, Buffer.from(c), e.uid]);
      writes.push([e.base + 0x26C, Buffer.from([20]), e.uid]);
    }
    const r = await this.writeMany(writes, `Mode Comeback · power ${power === 'max' ? 'MAKS' : pw * 100 + '%'} · ${n} pemain`);
    return { ...r, players: n, avgBefore: cnt ? Math.round(before / cnt / 5 * 10) / 10 : 0, avgAfter: cnt ? Math.round(after / cnt / 5 * 10) / 10 : 0 };
  }
  async setPA(uids, value) {
    const ents = await this.verified(uids, 'P');
    const writes = ents.map(e => { const b = Buffer.alloc(2); b.writeUInt16LE(Math.max(1, Math.min(200, value))); return [e.base + L.P_PA, b, e.uid]; });
    return { ...(await this.writeMany(writes, `Set PA ${value} · ${ents.length} pemain`)), players: ents.length };
  }
  async hiddenBest(uids) {
    const ents = await this.verified(uids, 'P');
    const writes = [];
    for (const e of ents) {
      for (const [k, v] of [['Consistency', 100], ['ImportantMatches', 100], ['Versatility', 100], ['InjuryProneness', 5], ['Dirtiness', 5], ['Determination', 100]])
        writes.push([e.base + L.P_ATTRS + PATTR[k], Buffer.from([v]), e.uid]);
    }
    return { ...(await this.writeMany(writes, `Atribut tersembunyi terbaik · ${ents.length} pemain`)), players: ents.length };
  }
  async personality(uids) {
    const ents = await this.verified(uids);
    // adaptasi, ambisi, loyalitas, tekanan, profesionalisme, sportivitas, temperamen, kontroversi
    const writes = ents.map(e => [e.p + L.PERS, Buffer.from([20, 20, 20, 20, 20, 20, 20, 1]), e.uid]);
    return { ...(await this.writeMany(writes, `Kepribadian teladan · ${ents.length} orang`)), players: ents.length };
  }
  async setAttr(uid, key, val) {
    const [e] = await this.verified([uid]); if (!e) throw new Error('Orang tidak ditemukan di memori FM27');
    if (e.kind === 'P') {
      if (!(key in PATTR)) throw new Error('atribut?');
      return this.writeMany([[e.base + L.P_ATTRS + PATTR[key], Buffer.from([Math.max(1, Math.min(20, val)) * 5]), uid]], `Atribut ${key}=${val}`);
    }
    if (!(key in SATTR)) throw new Error('atribut staf?');
    const raw = key === 'Jeugd' ? Math.max(1, Math.min(20, val)) : Math.max(1, Math.min(20, val)) * 5;
    return this.writeMany([[e.base + L.S_ATTRS + SATTR[key], Buffer.from([raw]), uid]], `Atribut staf ${key}=${val}`);
  }
  async contract(uids, op, n) {
    const ents = await this.verified(uids);
    const ptrs = await this.readMany(ents.map(e => [e.p + L.CONTRACT, 8]));
    const cons = ents.map((e, i) => ({ e, c: ptrs[i] ? Number(ptrs[i].readBigUInt64LE(0)) : 0 })).filter(x => x.c > 0x10000);
    const blocks = await this.readMany(cons.map(x => [x.c, 0x60]));
    const writes = [];
    cons.forEach((x, i) => {
      const b = blocks[i]; if (!b) return;
      if (op === 'gaji') { const w = b.readUInt32LE(L.C_WAGE); const nb = Buffer.alloc(4); nb.writeUInt32LE(Math.round(w * (1 - n / 100))); writes.push([x.c + L.C_WAGE, nb, x.e.uid]); }
      if (op === 'perpanjang') { const d = b.readUInt32LE(L.C_EXPIRY); const y = d >>> 16; if (y < 1990 || y > 2200) return; const nb = Buffer.alloc(4); nb.writeUInt32LE((((y + n) & 0xffff) << 16) | (d & 0xffff)); writes.push([x.c + L.C_EXPIRY, nb, x.e.uid]); }
      if (op === 'bisadijual') { const fl = b[L.C_FLAGS]; writes.push([x.c + L.C_FLAGS, Buffer.from([fl & ~0x10]), x.e.uid]); }
      if (op === 'daftarjual') { const fl = b[L.C_FLAGS]; writes.push([x.c + L.C_FLAGS, Buffer.from([(fl | 0x01) & ~0x10]), x.e.uid]); }
    });
    const lbl = { gaji: `Gaji −${n}%`, perpanjang: `Kontrak +${n} th`, bisadijual: 'Hapus status tidak dijual', daftarjual: 'Masukkan daftar transfer' }[op];
    return { ...(await this.writeMany(writes, `${lbl} · ${writes.length} kontrak`)), players: writes.length };
  }
  // ---------------- Kondisi pemain (struktur dari CT tdg6661, diverifikasi di FM27) ----------------
  // ops: cedera | ban | bahagia | trait | klausul | izinkerja | tanpaizin
  async gameDate() { // tanggal game live: [datTimeRoot] via pola kode "movzx eax,[rip+x]; xor ax,[r15+..]"
    const h = (await run(['aob', '0FB705????????66413387', '1'])).split(' ')[1]; if (!h) throw new Error('Tanggal game tidak ditemukan');
    const a = Number(BigInt(h)); const [ins] = await this.readMany([[a, 7]]);
    const [d] = await this.readMany([[a + 7 + ins.readInt32LE(3), 4]]); const v = d.readUInt32LE(0);
    const y = v >>> 16; if (y < 2000 || y > 2300) throw new Error('Tanggal game tidak valid'); return v;
  }
  async financeMgr() { // FINANCE_MANAGER via pola "mov rcx,[rip+x]; mov r8,[rcx+18]"
    const h = (await run(['aob', '488B0D????????4C8B4118', '1'])).split(' ')[1]; if (!h) throw new Error('Pengelola keuangan FM tidak ditemukan');
    const a = Number(BigInt(h)); const [ins] = await this.readMany([[a, 7]]);
    const [p] = await this.readMany([[a + 7 + ins.readInt32LE(3), 8]]); const mgr = Number(p.readBigUInt64LE(0));
    const [nm] = await this.rtti([mgr]); if (!/FINANCE_MANAGER/.test(nm || '')) throw new Error('Pengelola keuangan tidak valid'); return mgr;
  }
  // Permintaan fasilitas ke board (FACILITY_UPGRADE di FINANCE_MANAGER+0x20): rek+0x08 = klub, rek+0x10 = tanggal selesai → hari ini
  async boardComplete(clubUids) {
    const club = await this.clubPtrOf(clubUids); const mgr = await this.financeMgr(); const today = await this.gameDate();
    const q64 = b => (b ? Number(b.readBigUInt64LE(0)) : 0);
    const [xp] = await this.readMany([[mgr + 0x20, 8]]); const x = q64(xp);
    const [hd] = await this.readMany([[x, 16]]); const b = q64(hd), en = hd ? Number(hd.readBigUInt64LE(8)) : 0; const n = (en - b) / 8;
    if (!(n > 0 && n < 5000)) return { ok: 0, bad: 0, players: 0, msg: 'Tidak ada permintaan fasilitas yang sedang berjalan' };
    const [ptrs] = await this.readMany([[b, n * 8]]); const recs = []; for (let i = 0; i < n; i++) recs.push(Number(ptrs.readBigUInt64LE(i * 8)));
    const names = await this.rtti(recs); const raw = await this.readMany(recs.map(r => [r, 0x18]));
    const key = d => (d >>> 16) * 512 + (d & 0x1ff); const tb = Buffer.alloc(4); tb.writeUInt32LE(today);
    const writes = []; recs.forEach((r, i) => { const rb = raw[i]; if (!rb || !/FACILITY_UPGRADE/.test(names[i] || '')) return; if (q64(rb.subarray(8)) !== club) return; const d = rb.readUInt32LE(0x10); if (key(d) > key(today)) writes.push([r + 0x10, tb, clubUids[0]]); });
    if (!writes.length) return { ok: 0, bad: 0, players: 0, msg: 'Tidak ada permintaan fasilitas klub Anda yang sedang dikerjakan — ajukan dulu ke board di FM' };
    return { ...(await this.writeMany(writes, `Permintaan fasilitas board selesai hari ini · ${writes.length}`)), players: writes.length };
  }
  async rtti(objs) { // nama kelas MSVC dari vtable; null bila gagal
    const vt = await this.readMany(objs.map(o => [o, 8]));
    const vts = vt.map(b => (b ? Number(b.readBigUInt64LE(0)) : 0));
    const uniq = [...new Set(vts.filter(Boolean))]; const names = new Map();
    const cols = await this.readMany(uniq.map(v => [v - 8, 8]));
    const colA = cols.map(b => (b ? Number(b.readBigUInt64LE(0)) : 0));
    const hd = await this.readMany(colA.map(c => [c, 0x18]));
    const nmA = hd.map((h, i) => (h ? colA[i] - h.readUInt32LE(0x14) + h.readUInt32LE(0xC) + 0x10 : 0));
    const nm = await this.readMany(nmA.map(a => [a, 64]));
    uniq.forEach((v, i) => names.set(v, nm[i] ? nm[i].toString('latin1').split('\0')[0] : null));
    return vts.map(v => names.get(v) || null);
  }
  async condition(uids, op, fee0) {
    const ents = await this.verified(uids, 'P');
    const q64 = b => (b ? Number(b.readBigUInt64LE(0)) : 0);
    const writes = []; let n = 0; const put64 = v => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(v)); return b; };
    if (op === 'cedera' || op === 'ban') {
      const vp = await this.readMany(ents.map(e => [e.base + 0xF8, 8]));
      const list = ents.map((e, i) => ({ e, v: q64(vp[i]) })).filter(x => x.v > 0x10000);
      const vb = await this.readMany(list.map(x => [x.v, 0x28]));
      list.forEach((x, i) => {
        const b = vb[i]; if (!b) return;
        const o = op === 'cedera' ? 0 : 0x18; const beg = b.readBigUInt64LE(o), end = b.readBigUInt64LE(o + 8);
        if (end > beg && end - beg < 0x400n) { writes.push([x.v + o + 8, put64(beg), x.e.uid]); n++; }
        if (op === 'cedera') { const c = Buffer.alloc(2); c.writeUInt16LE(10000); writes.push([x.e.base + 0x258, c, x.e.uid]); writes.push([x.e.base + 0x25C, Buffer.from(c), x.e.uid]); } // kondisi & ketajaman 100%
      });
      return { ...(await this.writeMany(writes, `${op === 'cedera' ? 'Pulihkan cedera + kondisi 100%' : 'Hapus larangan bertanding'} · ${n} pemain`)), players: n };
    }
    if (op === 'bahagia') { // akhiri peristiwa ketidakbahagiaan yang masih berjalan + moral maksimum
      const today = await this.gameDate();
      const cp = await this.readMany(ents.map(e => [e.p + L.CONTRACT, 8]));
      const cons = ents.map((e, i) => ({ e, c: q64(cp[i]) })).filter(x => x.c > 0x10000);
      const up = await this.readMany(cons.map(x => [x.c + 0x30, 8]));
      const lists = cons.map((x, i) => ({ ...x, u: q64(up[i]) })).filter(x => x.u > 0x10000);
      const cnt = await this.readMany(lists.map(x => [x.u, 4]));
      const slots = []; lists.forEach((x, i) => { const k = cnt[i] ? cnt[i].readInt32LE(0) : 0; if (k > 0 && k < 64) for (let j = 1; j <= k; j++) slots.push({ x, a: x.u + 8 * j }); });
      const recP = await this.readMany(slots.map(s => [s.a, 8]));
      const recs = slots.map((s, i) => ({ ...s, r: q64(recP[i]) })).filter(s => s.r > 0x10000);
      const dates = await this.readMany(recs.map(s => [s.r + 4, 4]));
      const tb = Buffer.alloc(4); tb.writeUInt32LE(today);
      const key = d => (d >>> 16) * 512 + (d & 0x1ff);
      recs.forEach((s, i) => { if (!dates[i]) return; const d = dates[i].readUInt32LE(0); if (d === 0x076C0001 || (d >>> 16) < 1990) return; if (key(d) > key(today)) writes.push([s.r + 4, tb, s.x.e.uid]); });
      for (const e of ents) writes.push([e.base + 0x26C, Buffer.from([20]), e.uid]);
      return { ...(await this.writeMany(writes, `Hapus ketidakbahagiaan + moral maksimum · ${ents.length} pemain`)), players: ents.length };
    }
    if (op === 'trait') {
      for (const e of ents) writes.push([e.p + 0xC0, Buffer.alloc(8), e.uid]);
      return { ...(await this.writeMany(writes, `Hapus semua trait · ${ents.length} pemain`)), players: ents.length };
    }
    if (op === 'izinkerja' || op === 'tanpaizin') {
      const fl = await this.readMany(ents.map(e => [e.p + 0x18, 1]));
      ents.forEach((e, i) => { if (!fl[i]) return; const v = op === 'izinkerja' ? fl[i][0] | 0x04 : fl[i][0] & ~0x04; if (v !== fl[i][0]) { writes.push([e.p + 0x18, Buffer.from([v]), e.uid]); n++; } });
      return { ...(await this.writeMany(writes, `Izin kerja ${op === 'izinkerja' ? 'ON' : 'OFF'} · ${n} pemain`)), players: n };
    }
    if (op === 'klausul') { // hapus klausul rilis (tipe 0,1,2,16,17,18,27,31,55,56,57) dari vektor klausul kontrak
      const REL = new Set([0, 1, 2, 16, 17, 18, 27, 31, 55, 56, 57]);
      const cp = await this.readMany(ents.map(e => [e.p + L.CONTRACT, 8]));
      const cons = ents.map((e, i) => ({ e, c: q64(cp[i]) })).filter(x => x.c > 0x10000);
      const nm = await this.rtti(cons.map(x => x.c));
      const full = cons.filter((x, i) => nm[i] === '.?AVFULL_CONTRACT@db@@');
      const vv = await this.readMany(full.map(x => [x.c + 0x68, 16]));
      const vecs = full.map((x, i) => ({ ...x, b: vv[i] ? Number(vv[i].readBigUInt64LE(0)) : 0, en: vv[i] ? Number(vv[i].readBigUInt64LE(8)) : 0 })).filter(x => x.b > 0x10000 && x.en > x.b && x.en - x.b <= 64 * 8 && (x.en - x.b) % 8 === 0);
      const arr = await this.readMany(vecs.map(x => [x.b, x.en - x.b]));
      vecs.forEach((x, i) => {
        const a = arr[i]; if (!a) return; const keep = [];
        for (let o = 0; o < a.length; o += 8) if (!REL.has(a.readUInt16LE(o + 6))) keep.push(a.slice(o, o + 8));
        if (keep.length === a.length / 8) return;
        const nb = Buffer.concat([...keep, a.slice(keep.length * 8)]); // isi baru + sisa lama (di luar end, tidak dipakai)
        writes.push([x.b, nb, x.e.uid]); writes.push([x.c + 0x70, put64(x.b + keep.length * 8), x.e.uid]); n++;
      });
      return { ...(await this.writeMany(writes, `Hapus klausul rilis · ${n} kontrak`)), players: n };
    }
    if (op === 'latih' || op === 'kompak') {
      // latih : rekaman relasi tipe 71 (target kosong) → nilai byte +12 = 127 (maks)
      // kompak: vektor ke-2 di objek relasi (+0x18/+0x20, rekaman 8 byte) → byte +5 = 100
      const vp = await this.readMany(ents.map(e => [e.p + 0x78, 8]));
      const list = ents.map((e, i) => ({ e, v: q64(vp[i]) })).filter(x => x.v > 0x10000);
      const hd = await this.readMany(list.map(x => [x.v, 0x28]));
      const vecs = list.map((x, i) => { const h = hd[i]; if (!h) return null; const o = op === 'latih' ? 0 : 0x18; return { ...x, b: Number(h.readBigUInt64LE(o)), en: Number(h.readBigUInt64LE(o + 8)) }; })
        .filter(x => x && x.b > 0x10000 && x.en > x.b && x.en - x.b <= 400 * 16);
      const raws = await this.readMany(vecs.map(x => [x.b, x.en - x.b]));
      vecs.forEach((x, i) => {
        const raw = raws[i]; if (!raw) return; let did = false;
        if (op === 'latih') { for (let o = 0; o + 16 <= raw.length; o += 16) if (raw[o + 11] === 0x47 && raw.readBigUInt64LE(o) === 0n && raw[o + 12] < 127) { writes.push([x.b + o + 12, Buffer.from([127]), x.e.uid]); did = true; } }
        else { for (let o = 0; o + 8 <= raw.length; o += 8) if (raw[o + 5] < 100) { writes.push([x.b + o + 5, Buffer.from([100]), x.e.uid]); did = true; } }
        if (did) n++;
      });
      if (!writes.length) return { ok: 0, bad: 0, players: 0, msg: op === 'latih' ? 'Kebahagiaan latihan semua pemain sudah maksimal' : 'Kekompakan sudah maksimal' };
      return { ...(await this.writeMany(writes, `${op === 'latih' ? 'Kebahagiaan latihan maksimal' : 'Kekompakan tim maksimal'} · ${n} pemain`)), players: n };
    }
    if (op === 'bugar') { // kondisi & ketajaman laga 100% (tanpa menyentuh cedera)
      const c = Buffer.alloc(2); c.writeUInt16LE(10000);
      for (const e of ents) { writes.push([e.base + 0x258, c, e.uid]); writes.push([e.base + 0x25C, Buffer.from(c), e.uid]); }
      return { ...(await this.writeMany(writes, `Kondisi & ketajaman 100% · ${ents.length} pemain`)), players: ents.length };
    }
    if (op === 'rilisMurah') { // klausul rilis → "biaya minimum" (tipe 0) bernilai murah → klub WAJIB menerima tawaran ≥ nilai itu
      const REL = new Set([0, 1, 2, 16, 17, 18, 27, 31, 55, 56, 57]);
      const fee = Math.max(1, Math.min(4e9, Math.round(fee0 || 100000)));
      const cp = await this.readMany(ents.map(e => [e.p + L.CONTRACT, 8]));
      const cons = ents.map((e, i) => ({ e, c: q64(cp[i]) })).filter(x => x.c > 0x10000);
      const nm = await this.rtti(cons.map(x => x.c));
      const full = cons.filter((x, i) => nm[i] === '.?AVFULL_CONTRACT@db@@');
      const vv = await this.readMany(full.map(x => [x.c + 0x68, 16]));
      const vecs = full.map((x, i) => ({ ...x, b: vv[i] ? Number(vv[i].readBigUInt64LE(0)) : 0, en: vv[i] ? Number(vv[i].readBigUInt64LE(8)) : 0 })).filter(x => x.b > 0x10000 && x.en > x.b && x.en - x.b <= 64 * 8 && (x.en - x.b) % 8 === 0);
      const arr = await this.readMany(vecs.map(x => [x.b, x.en - x.b]));
      let none = ents.length - vecs.length, conv = 0;
      vecs.forEach((x, i) => {
        const a = arr[i]; if (!a) { none++; return; } let done = false;
        for (let o = 0; o < a.length; o += 8) {
          if (!REL.has(a.readUInt16LE(o + 6))) continue;
          const rec = Buffer.from(a.subarray(o, o + 8)); rec.writeUInt32LE(fee, 0); rec.writeUInt16LE(0, 6);
          writes.push([x.b + o, rec, x.e.uid]); done = true; // semua klausul rilis dibuat murah (yang lain tidak tersisa sebagai penghalang)
        }
        if (!done) { // tidak ada klausul rilis & vektor penuh → satu klausul bonus dikorbankan jadi klausul rilis
          const SAC = [38, 33, 34, 39, 32, 40];
          for (const t of SAC) {
            let o = -1; for (let k = 0; k < a.length; k += 8) if (a.readUInt16LE(k + 6) === t) { o = k; break; }
            if (o < 0) continue;
            const rec = Buffer.from(a.subarray(o, o + 8)); rec.writeUInt32LE(fee, 0); rec.writeUInt16LE(0, 6);
            writes.push([x.b + o, rec, x.e.uid]); done = true; conv++; break;
          }
        }
        if (done) n++; else none++;
      });
      if (!writes.length) return { ok: 0, bad: 0, players: 0, msg: `Kontrak ${none} pemain ini tidak punya klausul rilis maupun klausul bonus yang bisa diubah` };
      return { ...(await this.writeMany(writes, `Klausul rilis murah (£${fee.toLocaleString('en-GB')}) · ${n} pemain${conv ? ` (${conv} dari klausul bonus)` : ''}`)), players: n, skipped: none, converted: conv };
    }
    throw new Error('aksi?');
  }
  // ---------------- Youth intake booster ----------------
  // FM27 tidak punya titik kode yang sama dengan hook FM26, jadi dipakai pengawas: setiap tanggal game berganti, memori dipindai
  // (±6 dtk); pemain BARU (UID belum pernah terlihat) milik klub target = hasil youth intake FM → PA diacak di rentang pilihan.
  youthCfgFile() { return this.cfgFile ? this.cfgFile('youth.json') : path.join(this.dir, 'youth.json'); } // per karier (diset server)
  youthCfg() { try { return JSON.parse(fs.readFileSync(this.youthCfgFile(), 'utf8')); } catch { return { active: false, min: 150, max: 165, scope: { type: 'myclub', value: '' }, label: '', log: [] }; } }
  youthSave(c) { fs.writeFileSync(this.youthCfgFile(), JSON.stringify(c, null, 1)); }
  async clubPtrOf(uids) {
    const ents = (await this.verified(uids.slice(0, 60), 'P')).slice(0, 40);
    const q64 = b => (b ? Number(b.readBigUInt64LE(0)) : 0);
    const cp = await this.readMany(ents.map(e => [e.p + L.CONTRACT, 8]));
    const tp = await this.readMany(cp.map(b => [q64(b) + 0x10, 8]));
    const cl = await this.readMany(tp.map(b => [q64(b) + 0x30, 8]));
    const cnt = {}; cl.forEach(b => { const c = q64(b); if (c) cnt[c] = (cnt[c] || 0) + 1; });
    const club = Number(Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || 0);
    const [cn] = club ? await this.rtti([club]) : ['']; if (cn !== '.?AVCLUB@db@@') throw new Error('Klub tidak ditemukan di memori');
    return club;
  }
  // Kandidat youth intake FM27 = pemain tanpa kontrak (status "Agen Bebas") yang ditautkan ke klub → tidak terdeteksi lewat
  // pointer kontrak. Daftarnya diambil dari dump (klub, gaji 0, tanpa tanggal kontrak); PA dinaikkan sekali per pemain.
  async youthBoost(uids, force, info) {
    const c = this.youthCfg(); if (!c.active && !force) return null;
    const done = new Set(c.done || []); const todo = uids.filter(u => !done.has(u)); if (!todo.length) return { candidates: uids.length, mine: 0 };
    const ents = await this.verified(todo, 'P'); if (!ents.length) return { candidates: uids.length, mine: 0 };
    const cur = await this.readMany(ents.flatMap(e => [[e.base + L.P_CA, 2], [e.base + L.P_PA, 2]]));
    const lo = Math.max(1, Math.min(c.min, c.max)), hi = Math.min(200, Math.max(c.min, c.max));
    const writes = [], got = [];
    ents.forEach((e, i) => {
      const ca = cur[2 * i] ? cur[2 * i].readUInt16LE(0) : 0, old = cur[2 * i + 1] ? cur[2 * i + 1].readUInt16LE(0) : 0;
      const pa = lo + Math.floor(Math.random() * (hi - lo + 1)); done.add(e.uid);
      if (pa <= Math.max(ca, old)) return; const b = Buffer.alloc(2); b.writeUInt16LE(pa); writes.push([e.base + L.P_PA, b, e.uid]); got.push({ uid: e.uid, ca, from: old, pa, ...((info && info[e.uid]) || {}) });
    });
    let undoId = null; if (writes.length) undoId = (await this.writeMany(writes, `Youth intake ${c.label || 'cakupan'} (kandidat): PA ${lo}–${hi} · ${got.length} pemain`)).undoId;
    const c2 = this.youthCfg(); c2.done = [...done].slice(-20000);
    if (got.length) c2.log = [{ at: new Date().toISOString(), players: got, undoId, kandidat: true }, ...(c2.log || [])].slice(0, 20);
    this.youthSave(c2); return { candidates: uids.length, mine: got.length, players: got };
  }
  async liveCaPa(uid) { // CA/PA langsung dari memori (dump Teknik Oda bisa tertinggal beberapa menit)
    const [e] = await this.verified([uid], 'P'); if (!e) return null;
    const [a, b] = await this.readMany([[e.base + L.P_CA, 2], [e.base + L.P_PA, 2]]);
    return a && b ? { ca: a.readUInt16LE(0), pa: b.readUInt16LE(0) } : null;
  }
  async youthTick(groupsOf, saveKey = '') { // groupsOf(scope) → null (semua klub) atau [[UID pemain klub A], [UID klub B], ...]
    const c = this.youthCfg(); if (!c.active) return null;
    const st = await this.status(); if (!st.ok) return null;
    const date = await this.gameDate().catch(() => 0); if (!date) return null;
    const key = JSON.stringify(c.scope || {}) + '|' + saveKey; let fresh = this.yw && this.yw.pid === st.pid && this.yw.key === key;
    if (fresh && date < this.yw.date) fresh = false; // tanggal mundur = save lain dimuat → baseline ulang
    if (fresh && this.yw.date === date) return null;
    const idx = await this.index(true);
    const pl = [...idx].filter(([, v]) => v.kind === 'P').map(([k]) => k);
    if (!fresh) { // baseline: semua pemain yang ada sekarang dianggap lama
      const groups = groupsOf(c.scope || {}); let clubs = null;
      if (groups) { clubs = new Set(); for (const g of groups) { try { clubs.add(await this.clubPtrOf(g)); } catch { } } if (!clubs.size) throw new Error('Klub dalam cakupan tidak ditemukan di memori'); }
      this.yw = { pid: st.pid, key, date, known: new Set(pl), clubs };
      return { baseline: pl.length, clubs: clubs ? clubs.size : 'semua' };
    }
    this.yw.date = date;
    const nu = pl.filter(u => !this.yw.known.has(u)); nu.forEach(u => this.yw.known.add(u));
    if (!nu.length) return { fresh: 0 };
    // Pengaman: ribuan "pemain baru" sekaligus = save/game lain dimuat (bukan youth intake) → anggap baseline, jangan tulis apa pun
    if (nu.length > Math.max(1500, pl.length * 0.08)) return { fresh: nu.length, mine: 0, rebaseline: true };
    const q64 = b => (b ? Number(b.readBigUInt64LE(0)) : 0);
    const ents = await this.verified(nu, 'P');
    const cp = await this.readMany(ents.map(e => [e.p + L.CONTRACT, 8]));
    const tp = await this.readMany(cp.map(b => [q64(b) + 0x10, 8]));
    const cl = await this.readMany(tp.map(b => [q64(b) + 0x30, 8]));
    const mine = ents.filter((e, i) => q64(cl[i]) > 0x10000 && (!this.yw.clubs || this.yw.clubs.has(q64(cl[i]))));
    if (!mine.length) return { fresh: nu.length, mine: 0 };
    const cur = await this.readMany(mine.map(e => [e.base + L.P_CA, 4]));
    const lo = Math.max(1, Math.min(c.min, c.max)), hi = Math.min(200, Math.max(c.min, c.max));
    const writes = []; const got = [];
    mine.forEach((e, i) => {
      const ca = cur[i] ? cur[i].readUInt16LE(0) : 0; const pa = lo + Math.floor(Math.random() * (hi - lo + 1));
      if (pa <= ca) return; const b = Buffer.alloc(2); b.writeUInt16LE(pa); writes.push([e.base + L.P_PA, b, e.uid]); got.push({ uid: e.uid, ca, pa });
    });
    const r = await this.writeMany(writes, `Youth intake ${c.label || 'cakupan'}: PA ${lo}–${hi} · ${got.length} pemain`);
    c.log = [{ at: new Date().toISOString(), date, players: got, undoId: r.undoId }, ...(c.log || [])].slice(0, 20); this.youthSave(c);
    return { fresh: nu.length, mine: got.length, players: got };
  }
  // ---------------- Legenda: salin profil pemain legenda (data CT tdg6661), disesuaikan usia ----------------
  // FM27: posisi = 15 bait tepat sebelum atribut (P_ATTRS-15): GK SW DL DC DR DM ML MC MR AML AMC AMR ST WBL WBR (1–20);
  // kaki kiri/kanan = atribut indeks 24/25 (×5); kepribadian = person+0x70 (8 bait); trait = person+0xC0 (64 bit, susunan sama dengan CT).
  legends() { return LEG; }
  legCfg() { try { return JSON.parse(fs.readFileSync(path.join(this.dir, '..', 'legenda.json'), 'utf8')); } catch { return { players: {} }; } }
  legSave(c) { fs.writeFileSync(path.join(this.dir, '..', 'legenda.json'), JSON.stringify(c, null, 1)); }
  async legendApply(uid, legId, o = {}) {
    const leg = LEG.find(x => x.id === Number(legId)); if (!leg) throw new Error('Legenda tidak ditemukan');
    const [e] = await this.playerBlocks(await this.verified([uid], 'P')); if (!e || !e.attrs) throw new Error('Pemain tidak ditemukan di memori FM27');
    const age = Number(o.age) || leg.age, peak = Math.max(16, Math.min(32, Number(o.peak) || 24));
    const t = legendAt(leg, age, peak);
    const writes = [];
    const ca = Buffer.alloc(4); ca.writeUInt16LE(t.ca); ca.writeUInt16LE(leg.pa, 2); writes.push([e.base + L.P_CA, ca, uid]);
    const nb = Buffer.from(e.attrs);
    for (const [k, v] of Object.entries(t.attrs)) nb[PATTR[k]] = Math.max(5, Math.min(100, Math.round(v * 5)));
    if (o.feet !== false) { nb[24] = Math.max(5, leg.lf * 5); nb[25] = Math.max(5, leg.rf * 5); }
    writes.push([e.base + L.P_ATTRS, nb, uid]);
    if (o.pos !== false) writes.push([e.base + L.P_ATTRS - 15, Buffer.from(LPOS_MEM.map(p => Math.max(1, Math.min(20, leg.pos[p] || 1)))), uid]);
    if (o.pers !== false) writes.push([e.p + L.PERS, Buffer.from(leg.pers.map(v => Math.max(1, Math.min(20, v)))), uid]);
    if (o.traits !== false) { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt('0x' + leg.traits)); writes.push([e.p + 0xC0, b, uid]); }
    const r = await this.writeMany(writes, `Legenda ${leg.name} → ${o.name || uid} (usia ${Math.floor(age)}, CA ${t.ca}/${leg.pa}, puncak ${peak})`);
    const c = this.legCfg();
    if (o.grow !== false && t.ca < leg.pa) {
      const date = await this.gameDate().catch(() => 0);
      c.players[uid] = { leg: leg.id, legName: leg.name, name: o.name || String(uid), peak, age, date, ca: t.ca, pa: leg.pa, at: new Date().toISOString() };
    } else delete c.players[uid];
    this.legSave(c);
    return { ...r, players: 1, ca: t.ca, pa: leg.pa, legend: leg.name, grow: !!c.players[uid] };
  }
  // Dipanggil berkala: saat tanggal game berganti, pemain legenda dinaikkan mengikuti kurva usianya (tidak pernah diturunkan).
  async legendTick() {
    const c = this.legCfg(); const ids = Object.keys(c.players); if (!ids.length) return null;
    const st = await this.status(); if (!st.ok) return null;
    const date = await this.gameDate().catch(() => 0); if (!date || date === this.legDate) return null; this.legDate = date;
    const yr = d => (d >>> 16) + (d & 0x1ff) / 366; // u32: tahun<<16 | hari-ke (9 bit bawah)
    const ents = await this.playerBlocks(await this.verified(ids.map(Number), 'P'));
    const writes = []; const grown = [];
    for (const e of ents) {
      const x = c.players[e.uid]; const leg = LEG.find(l => l.id === x.leg); if (!leg || !e.attrs) continue;
      const age = x.age + (x.date ? Math.max(0, yr(date) - yr(x.date)) : 0);
      const t = legendAt(leg, age, x.peak);
      if (t.ca <= e.ca) { if (age >= x.peak) delete c.players[e.uid]; continue; }
      const ca = Buffer.alloc(2); ca.writeUInt16LE(t.ca); writes.push([e.base + L.P_CA, ca, e.uid]);
      if (e.pa < t.ca) { const pa = Buffer.alloc(2); pa.writeUInt16LE(t.ca); writes.push([e.base + L.P_PA, pa, e.uid]); }
      const nb = Buffer.from(e.attrs);
      for (const [k, v] of Object.entries(t.attrs)) nb[PATTR[k]] = Math.max(nb[PATTR[k]], Math.min(100, Math.round(v * 5)));
      if (!nb.equals(e.attrs)) writes.push([e.base + L.P_ATTRS, nb, e.uid]);
      x.ca = t.ca; x.lastAge = Math.round(age * 10) / 10; grown.push({ uid: e.uid, name: x.name, ca: t.ca });
      if (t.ca >= leg.pa) delete c.players[e.uid];
    }
    if (writes.length) { const r = await this.writeMany(writes, `Legenda tumbuh · ${grown.map(g => `${g.name} CA ${g.ca}`).join(', ')}`); c.last = { at: new Date().toISOString(), grown, undoId: r.undoId }; }
    this.legSave(c);
    return { grown };
  }
  // ---------------- Pengetahuan scouting maksimal (atribut tampil tanpa filter) ----------------
  // FM27: [person+0x1F0] → vektor rekaman pengetahuan per negara; byte +0x24 = persen pengetahuan (0–100).
  async knowledgeMax(staffUids, clubUids) {
    const q64 = b => (b ? Number(b.readBigUInt64LE(0)) : 0);
    const ents = await this.verified(staffUids); const people = ents.map(e => ({ p: e.p, uid: e.uid }));
    try { const mgr = await this.humanManagerPtr(clubUids); if (mgr) people.push({ p: mgr, uid: null }); } catch { }
    const cp = await this.readMany(people.map(x => [x.p + 0x1F0, 8]));
    const cons = people.map((x, i) => ({ ...x, c: q64(cp[i]) })).filter(x => x.c > 0x10000);
    const hd = await this.readMany(cons.map(x => [x.c, 16]));
    const vecs = cons.map((x, i) => ({ ...x, b: hd[i] ? Number(hd[i].readBigUInt64LE(0)) : 0, en: hd[i] ? Number(hd[i].readBigUInt64LE(8)) : 0 })).filter(x => x.b > 0x10000 && x.en > x.b && (x.en - x.b) % 8 === 0 && x.en - x.b <= 400 * 8);
    const ptrs = await this.readMany(vecs.map(x => [x.b, x.en - x.b]));
    const recs = []; vecs.forEach((x, i) => { const pb = ptrs[i]; if (!pb) return; for (let o = 0; o < pb.length; o += 8) recs.push({ r: Number(pb.readBigUInt64LE(o)), x }); });
    const rb = await this.readMany(recs.map(z => [z.r, 0x28]));
    const nat = await this.rtti(rb.map(b => (b ? Number(b.readBigUInt64LE(0)) : 0)));
    const writes = []; const touched = new Set();
    recs.forEach((z, i) => { const b = rb[i]; if (!b || !/NATIONAL_TEAM_CONTAINER|NATION/.test(nat[i] || '')) return; if (b[0x24] < 100) { writes.push([z.r + 0x24, Buffer.from([100]), z.x.uid || staffUids[0]]); touched.add(z.x.p); } });
    if (!writes.length) return { ok: 0, bad: 0, players: 0, msg: 'Pengetahuan scouting staf Anda sudah 100% di semua negara yang mereka kenal' };
    return { ...(await this.writeMany(writes, `Pengetahuan scouting 100% · ${touched.size} orang, ${writes.length} negara`)), players: touched.size, nations: writes.length };
  }
  // ---------------- Manajer disukai semua ----------------
  // Relasi pribadi di vektor person+0x78: [target u64][i16 jenis=6 "Manajer"][a=3][tipe=1][nilai 0–100][00 00 ff].
  // Target = objek HUMAN_NON_PLAYER milik manajer Anda (dicari dari relasi pemain klub sendiri).
  async humanManagerPtr(clubUids) {
    const ents = (await this.verified(clubUids.slice(0, 60), 'P')).slice(0, 40);
    const q64 = b => (b ? Number(b.readBigUInt64LE(0)) : 0);
    const vp = await this.readMany(ents.map(e => [e.p + 0x78, 8]));
    const hd = await this.readMany(vp.map(b => [q64(b), 16]));
    const vecs = hd.map(b => (b ? { b: Number(b.readBigUInt64LE(0)), en: Number(b.readBigUInt64LE(8)) } : null)).filter(v => v && v.b > 0x10000 && v.en > v.b && v.en - v.b <= 200 * 16);
    const raws = await this.readMany(vecs.map(v => [v.b, v.en - v.b]));
    const cnt = {};
    raws.forEach(raw => { if (!raw) return; for (let o = 0; o + 16 <= raw.length; o += 16) if (raw[o + 11] === 1 && raw.readInt16LE(o + 8) === 6) { const t = Number(raw.readBigUInt64LE(o)); cnt[t] = (cnt[t] || 0) + 1; } });
    for (const [t] of Object.entries(cnt).sort((a, b) => b[1] - a[1])) { const [nm] = await this.rtti([Number(t)]); if (/HUMAN/.test(nm || '')) return Number(t); }
    throw new Error('Objek manajer Anda tidak ditemukan di relasi pemain');
  }
  async managerLove(uids, clubUids) {
    const mgr = await this.humanManagerPtr(clubUids);
    const ents = await this.verified(uids); // pemain & staf
    const q64 = b => (b ? Number(b.readBigUInt64LE(0)) : 0);
    const put64 = v => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(v)); return b; };
    const vp = await this.readMany(ents.map(e => [e.p + 0x78, 8]));
    const list = ents.map((e, i) => ({ e, v: q64(vp[i]) })).filter(x => x.v > 0x10000);
    const hd = await this.readMany(list.map(x => [x.v, 24]));
    const ok = list.map((x, i) => ({ ...x, b: hd[i] ? Number(hd[i].readBigUInt64LE(0)) : 0, en: hd[i] ? Number(hd[i].readBigUInt64LE(8)) : 0, cap: hd[i] ? Number(hd[i].readBigUInt64LE(16)) : 0 }))
      .filter(x => x.b > 0x10000 && x.en >= x.b && x.cap >= x.en && (x.en - x.b) % 16 === 0 && x.en - x.b <= 200 * 16);
    const raws = await this.readMany(ok.map(x => [x.b, Math.max(16, x.en - x.b)]));
    const writes = []; let raised = 0, added = 0, full = 0;
    ok.forEach((x, i) => {
      const raw = raws[i]; if (!raw) return; const n = (x.en - x.b) / 16; let found = false; let spare = -1;
      for (let j = 0; j < n; j++) {
        const o = j * 16; const t = Number(raw.readBigUInt64LE(o));
        if (raw[o + 11] === 1 && t === mgr) { found = true; if (raw[o + 12] < 100) { writes.push([x.b + o + 12, Buffer.from([100]), x.e.uid]); raised++; } }
        if (spare < 0 && raw[o + 11] === 0x6a) spare = j; // tipe 106 saja — tipe 71 = kebahagiaan latihan, jangan ditimpa
      }
      if (found) return;
      const rec = Buffer.alloc(16); rec.writeBigUInt64LE(BigInt(mgr)); rec.writeInt16LE(6, 8); rec[10] = 3; rec[11] = 1; rec[12] = 100; rec[15] = 0xff;
      if (x.en + 16 <= x.cap) { writes.push([x.en, rec, x.e.uid]); writes.push([x.v + 8, put64(x.en + 16), x.e.uid]); added++; }
      else if (spare >= 0) { writes.push([x.b + spare * 16, rec, x.e.uid]); added++; }
      else full++;
    });
    if (!writes.length) return { ok: 0, bad: 0, players: 0, msg: full ? `${full} orang tidak punya slot relasi kosong` : 'Semua sudah sangat menyukai Anda' };
    return { ...(await this.writeMany(writes, `Manajer disukai · ${raised} dinaikkan, ${added} relasi baru`)), players: raised + added, full };
  }
  // ---------------- Reputasi klub (TEAM+0xA8, u16 0–10000; diverifikasi 60/60 tim vs dump) ----------------
  // Pemain menilai mau/tidaknya pindah terutama dari reputasi klub tujuan vs klub sekarang. Reputasi tim utama Anda dinaikkan
  // (mis. 9999 = setara klub terbesar dunia) → pemain top mau berunding. Bisa dikembalikan lewat Riwayat (Batalkan).
  async teamRep(clubUids, value) {
    const ents = (await this.verified(clubUids.slice(0, 60), 'P')).slice(0, 40);
    const q64 = b => (b ? Number(b.readBigUInt64LE(0)) : 0);
    const cp = await this.readMany(ents.map(e => [e.p + L.CONTRACT, 8]));
    const tp = await this.readMany(cp.map(b => [q64(b) + 0x10, 8]));
    const cnt = {}; tp.forEach((b, i) => { const t = q64(b); if (t) (cnt[t] = cnt[t] || []).push(ents[i].uid); });
    const [team, us] = Object.entries(cnt).sort((a, b) => b[1].length - a[1].length)[0] || []; if (!team) throw new Error('Tim Anda tidak ditemukan di memori');
    const [nm] = await this.rtti([Number(team)]); if (nm !== '.?AVTEAM@db@@') throw new Error('Objek tim tidak valid (' + nm + ')');
    const [cur] = await this.readMany([[Number(team) + 0xA8, 2]]); const before = cur.readUInt16LE(0);
    if (!(before > 0 && before <= 10000)) throw new Error('Reputasi tim tidak terbaca (' + before + ')');
    const v = Math.max(1, Math.min(10000, Math.round(value))); const b = Buffer.alloc(2); b.writeUInt16LE(v);
    return { ...(await this.writeMany([[Number(team) + 0xA8, b, us[0]]], `Reputasi klub ${before} → ${v}`)), players: 1, before, after: v };
  }
  // ---------------- Kewarganegaraan kedua (lolos aturan non-UE / pemain asing) ----------------
  // FM27: kewarganegaraan utama = person+0x68 (→ NATION). Kewarganegaraan lain = rekaman relasi 16 bait di vektor person+0x78:
  // [NATION u64][00 00][08][46h][01][ff 00 ff] (contoh nyata: Vinícius Júnior → Spanyol). natUid = UID pemain yang
  // kewarganegaraan utamanya adalah negara tujuan (mis. pemain Italia) — dipakai untuk mengambil objek NATION-nya.
  async citizenship(uids, natUid) {
    const q64 = b => (b ? Number(b.readBigUInt64LE(0)) : 0);
    const put64 = v => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(v)); return b; };
    const [src] = await this.verified([natUid]); if (!src) throw new Error('Pemain acuan negara tujuan tidak ditemukan di memori');
    const [np] = await this.readMany([[src.p + 0x68, 8]]); const nat = q64(np);
    const [nn] = await this.rtti([nat]); if (nn !== '.?AVNATION@db@@') throw new Error('Objek negara tidak valid (' + nn + ')');
    const ents = await this.verified(uids, 'P');
    const prim = await this.readMany(ents.map(e => [e.p + 0x68, 8]));
    const vp = await this.readMany(ents.map(e => [e.p + 0x78, 8]));
    const list = ents.map((e, i) => ({ e, prim: q64(prim[i]), v: q64(vp[i]) })).filter(x => x.v > 0x10000);
    const hd = await this.readMany(list.map(x => [x.v, 24]));
    const ok = list.map((x, i) => ({ ...x, b: hd[i] ? Number(hd[i].readBigUInt64LE(0)) : 0, en: hd[i] ? Number(hd[i].readBigUInt64LE(8)) : 0, cap: hd[i] ? Number(hd[i].readBigUInt64LE(16)) : 0 }))
      .filter(x => x.b > 0x10000 && x.en >= x.b && x.cap >= x.en && (x.en - x.b) % 16 === 0 && x.en - x.b <= 200 * 16);
    const raws = await this.readMany(ok.map(x => [x.b, Math.max(16, x.en - x.b)]));
    const writes = []; let n = 0, has = 0, full = 0;
    ok.forEach((x, i) => {
      if (x.prim === nat) { has++; return; }
      const raw = raws[i]; if (!raw) return; const cnt = (x.en - x.b) / 16; let spare = -1, got = false;
      for (let j = 0; j < cnt; j++) { const o = j * 16; if (raw[o + 11] === 0x46 && Number(raw.readBigUInt64LE(o)) === nat) got = true; if (spare < 0 && raw[o + 11] === 0x6a) spare = j; }
      if (got) { has++; return; }
      const rec = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x08, 0x46, 0x01, 0xff, 0x00, 0xff]); rec.writeBigUInt64LE(BigInt(nat));
      if (x.en + 16 <= x.cap) { writes.push([x.en, rec, x.e.uid]); writes.push([x.v + 8, put64(x.en + 16), x.e.uid]); n++; }
      else if (spare >= 0) { writes.push([x.b + spare * 16, rec, x.e.uid]); n++; }
      else full++;
    });
    if (!writes.length) return { ok: 0, bad: 0, players: 0, msg: has ? 'Pemain ini sudah berkewarganegaraan negara tersebut' : full ? `${full} pemain tidak punya slot kosong` : 'Tidak ada yang diubah' };
    return { ...(await this.writeMany(writes, `Kewarganegaraan kedua · ${n} pemain`)), players: n, has, full };
  }
  // ---------------- Registrasi kompetisi (FM27: vektor relasi inline di person+0x78, rekaman 16 byte) ----------------
  // Rekaman registrasi: [tim u64][i16 0][04][19h][kode][00 00 ff]. Kode: 8 = liga domestik, 0 = Eropa (UEFA), 19 = piala domestik.
  // Slot: tambah di akhir bila kapasitas cukup; kalau penuh, pakai ulang rekaman tipe 71 (target kosong) atau 106 — sama seperti cheat table.
  async register(uids, codes) {
    const ents = await this.verified(uids, 'P');
    const q64 = b => (b ? Number(b.readBigUInt64LE(0)) : 0);
    const put64 = v => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(v)); return b; };
    const cp = await this.readMany(ents.map(e => [e.p + L.CONTRACT, 8]));
    const tp = await this.readMany(cp.map(b => [q64(b) + 0x10, 8]));
    const vp = await this.readMany(ents.map(e => [e.p + 0x78, 8]));
    const list = ents.map((e, i) => ({ e, team: q64(tp[i]), v: q64(vp[i]) })).filter(x => q64(cp[ents.indexOf(x.e)]) > 0x10000 && x.team > 0x10000 && x.v > 0x10000);
    const hd = await this.readMany(list.map(x => [x.v, 24]));
    const ok = list.map((x, i) => ({ ...x, b: hd[i] ? Number(hd[i].readBigUInt64LE(0)) : 0, en: hd[i] ? Number(hd[i].readBigUInt64LE(8)) : 0, cap: hd[i] ? Number(hd[i].readBigUInt64LE(16)) : 0 }))
      .filter(x => x.b > 0x10000 && x.en >= x.b && x.cap >= x.en && (x.en - x.b) % 16 === 0 && x.en - x.b <= 200 * 16);
    const raws = await this.readMany(ok.map(x => [x.b, Math.max(16, x.en - x.b)]));
    const writes = []; let n = 0, added = 0, full = 0;
    ok.forEach((x, i) => {
      const raw = raws[i]; if (!raw) return; const cnt = (x.en - x.b) / 16; const has = new Set(); const spare = [];
      for (let j = 0; j < cnt; j++) {
        const r = raw.subarray(j * 16, j * 16 + 16); const tgt = Number(r.readBigUInt64LE(0));
        if (r[11] === 0x19 && tgt === x.team) has.add(r[12]);
        if (r[11] === 0x6a) spare.unshift(j); else if (r[11] === 0x47 && tgt === 0) spare.push(j); // 106 dulu; 71 (kebahagiaan latihan) terakhir
      }
      let end = x.en; let did = false;
      for (const code of codes) {
        if (has.has(code)) continue;
        const rec = Buffer.alloc(16); rec.writeBigUInt64LE(BigInt(x.team)); rec[10] = 4; rec[11] = 0x19; rec[12] = code; rec[15] = 0xff;
        if (end + 16 <= x.cap) { writes.push([end, rec, x.e.uid]); end += 16; }
        else if (spare.length) writes.push([x.b + spare.shift() * 16, rec, x.e.uid]);
        else { full++; continue; }
        did = true; added++;
      }
      if (end !== x.en) writes.push([x.v + 8, put64(end), x.e.uid]);
      if (did) n++;
    });
    const lbl = codes.map(c => ({ 8: 'Liga', 0: 'Eropa', 19: 'Piala' }[c] || 'kode ' + c)).join('+');
    if (!writes.length) return { ok: 0, bad: 0, players: 0, msg: full ? `${full} registrasi tidak muat (slot penuh)` : 'Semua pemain sudah terdaftar' };
    return { ...(await this.writeMany(writes, `Daftarkan ke kompetisi (${lbl}) · ${n} pemain`)), players: n, added, full };
  }
  // ---------------- Keuangan klub (FM27: saldo +0x0C; anggaran gaji +0x814; anggaran transfer TERSEDIA +0x7C4 = angka di layar Keuangan FM; anggaran gaji +0x808, pengeluaran gaji +0x814;
  // +0x7CC = anggaran transfer awal musim — diverifikasi 23/11 dengan layar FM: tersedia £214.259 = +0x7C4) ----------------
  async clubFinance(uids) { // klub dari kontrak pemain → tim → klub → [klub+0x150] CLUB_FINANCE
    const ents = (await this.verified(uids, 'P')).slice(0, 40);
    const q64 = b => (b ? Number(b.readBigUInt64LE(0)) : 0);
    const cp = await this.readMany(ents.map(e => [e.p + L.CONTRACT, 8]));
    const tp = await this.readMany(cp.map(b => [q64(b) + 0x10, 8]));
    const cl = await this.readMany(tp.map(b => [q64(b) + 0x30, 8]));
    const cnt = {}; cl.forEach(b => { const c = q64(b); if (c) cnt[c] = (cnt[c] || 0) + 1; });
    const club = Number(Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || 0); if (!club) throw new Error('Klub tidak ditemukan di memori');
    const [cn] = await this.rtti([club]); if (cn !== '.?AVCLUB@db@@') throw new Error('Objek klub tidak valid (' + cn + ')');
    const [fp] = await this.readMany([[club + 0x150, 8]]); const fin = q64(fp);
    const [fnm] = await this.rtti([fin]); if (!/CLUB_FINANCE/.test(fnm || '')) throw new Error('Objek keuangan tidak valid (' + fnm + ')');
    const [b] = await this.readMany([[fin, 0x820]]);
    return { fin, uid: ents[0].uid, balance: b.readInt32LE(0x0C), transfer: b.readInt32LE(0x7C4), transferStart: b.readInt32LE(0x7CC), wageBudget: b.readInt32LE(0x808), wageBill: b.readInt32LE(0x814), playerWages: b.readInt32LE(0x810) }; // 0x808 anggaran gaji, 0x814 pengeluaran gaji total (dihitung ulang FM), 0x810 gaji pemain — diverifikasi 23/11 dgn layar FM
  }
  // Rentang sama dengan editor dalam-game FM27: saldo & anggaran transfer (−£1 M)…£1 M, anggaran gaji £0…£5 jt/mgg.
  // Set* = tetapkan angka persis; Tambah = tambah/kurangi (nilai negatif). Anggaran transfer ditulis di +0x7C4 saja (seperti editor FM).
  async finance(uids, op, val) {
    const f = await this.clubFinance(uids); const B = 1000000000;
    const RNG = { saldo: [-B, B], transfer: [-B, B], gaji: [0, 5000000] };
    const i32 = (v, k) => { const [lo, hi] = RNG[k]; const b = Buffer.alloc(4); b.writeInt32LE(Math.max(lo, Math.min(hi, Math.round(v)))); return b; };
    const OFF = { saldo: 0x0C, transfer: 0x7C4, gaji: 0x808 }, CUR = { saldo: f.balance, transfer: f.transfer, gaji: f.wageBudget };
    const NAME = { saldo: 'Saldo', transfer: 'Anggaran transfer', gaji: 'Anggaran gaji' };
    const gbp = v => (v < 0 ? '−' : '') + '£' + Math.abs(Math.round(v)).toLocaleString('en-GB');
    const w = []; let lbl = '';
    const m = /^(saldo|transfer|gaji)(Set|Tambah)$/.exec(op);
    if (m) {
      const k = m[1], nv = m[2] === 'Set' ? val : CUR[k] + val;
      const bb = i32(nv, k); w.push([f.fin + OFF[k], bb]);
      lbl = `${NAME[k]} ${m[2] === 'Set' ? '→ ' + gbp(bb.readInt32LE(0)) : (val >= 0 ? '+' : '−') + gbp(Math.abs(val)).replace('−', '')}${k === 'gaji' ? '/mgg' : ''}`;
    }
    if (op === 'saldoPersen') { w.push([f.fin + 0x0C, i32(f.balance + Math.abs(f.balance) * val / 100, 'saldo')]); lbl = `Saldo +${val}%`; }
    if (op === 'lunasi' && f.balance < 0) { w.push([f.fin + 0x0C, i32(0, 'saldo')]); lbl = 'Saldo minus → 0'; }
    if (op === 'gajiCukup') { const nv = Math.ceil(f.wageBill * 1.1 / 1000) * 1000; if (nv > f.wageBudget) { w.push([f.fin + 0x808, i32(nv, 'gaji')]); lbl = `Anggaran gaji → ${gbp(Math.min(nv, 5000000))}/mgg (pengeluaran + 10%)`; } }
    if (!w.length) return { ok: 0, bad: 0, info: f, msg: op === 'lunasi' ? 'Saldo tidak minus' : op === 'gajiCukup' ? 'Anggaran gaji sudah cukup' : 'Tidak ada yang diubah' };
    return { ...(await this.writeMany(w.map(([a, b]) => [a, b, f.uid]), lbl)), before: f };
  }
  // ---------------- Staf ----------------
  async staffPush(uids, stage) {
    const frac = STAGES[stage] ?? 0.5;
    const ents = await this.verified(uids, 'S');
    const r = await this.readMany(ents.map(e => [e.base + L.S_CA, 4]));
    const writes = []; let n = 0;
    ents.forEach((e, i) => { if (!r[i]) return; const ca = r[i].readUInt16LE(0), pa = r[i].readUInt16LE(2); if (pa <= ca) return; const nca = Math.min(pa, ca + Math.max(1, Math.round((pa - ca) * frac))); const b = Buffer.alloc(2); b.writeUInt16LE(nca); writes.push([e.base + L.S_CA, b, e.uid]); n++; });
    return { ...(await this.writeMany(writes, `Staf CA→PA (${stage}) · ${n} staf`)), players: n };
  }
  async staffMax(uids, groups, level = 20) {
    const ents = await this.verified(uids, 'S');
    const keys = groups.flatMap(g => S_GROUPS[g] || []);
    const writes = [];
    for (const e of ents) for (const k of keys) writes.push([e.base + L.S_ATTRS + SATTR[k], Buffer.from([k === 'Jeugd' ? level : level * 5]), e.uid]);
    return { ...(await this.writeMany(writes, `Staf: ${groups.join('+')} → ${level} · ${ents.length} staf`)), players: ents.length };
  }
  // ---------------- Baca langsung (live) ----------------
  async live(uid) {
    const [e] = await this.verified([uid]); if (!e) return null;
    if (e.kind === 'P') {
      const [ca, at, pe, cond, vp, tr] = await this.readMany([[e.base + L.P_CA, 4], [e.base + L.P_ATTRS, 0x37], [e.p + L.PERS, 8], [e.base + 0x258, 0x18], [e.base + 0xF8, 8], [e.p + 0xC0, 8]]);
      const attrs = {}; for (const [k, o] of Object.entries(PATTR)) attrs[k] = Math.round(at[o] / 5);
      const out = { kind: 'P', ca: ca.readUInt16LE(0), pa: ca.readUInt16LE(2), attrs, pers: [...pe] };
      if (cond) { out.condition = Math.round(cond.readUInt16LE(0) / 100); out.sharpness = Math.round(cond.readUInt16LE(4) / 100); out.morale = cond[0x14]; }
      const v = vp ? Number(vp.readBigUInt64LE(0)) : 0;
      if (v > 0x10000) { const [vb] = await this.readMany([[v, 0x28]]); if (vb) { const n = (o) => { const d = Number(vb.readBigUInt64LE(o + 8) - vb.readBigUInt64LE(o)); return d > 0 && d < 0x400 ? 1 : 0; }; out.injured = n(0); out.banned = n(0x18); } }
      out.traits = tr ? tr.readBigUInt64LE(0) !== 0n : false;
      return out;
    }
    const [ca, at] = await this.readMany([[e.base + L.S_CA, 4], [e.base + L.S_ATTRS, 0x40]]);
    const attrs = {}; for (const [k, o] of Object.entries(SATTR)) attrs[k] = k === 'Jeugd' ? at[o] : Math.round(at[o] / 5);
    return { kind: 'S', ca: ca.readUInt16LE(0), pa: ca.readUInt16LE(2), attrs };
  }
  async focus() { return run(['focus']); }
}
Cheats.STAGES = STAGES; Cheats.S_GROUPS = S_GROUPS;
module.exports = Cheats;
