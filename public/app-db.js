'use strict';
// ---------- Database 🗂️ (gaya Teknik Oda): semua pemain dalam tabel, kolom & filter bebas ----------
(function () {
  const AB = { Crossing: 'Cro', Dribbling: 'Dri', Finishing: 'Fin', Heading: 'Hea', LongShots: 'Lon', Marking: 'Mar', OffTheBall: 'OtB', Passing: 'Pas', PenaltyTaking: 'Pen', Tackling: 'Tck', Vision: 'Vis', FirstTouch: 'Fir', Technique: 'Tec', Corners: 'Cor', FreeKicks: 'Fre', LongThrows: 'L Th',
    Anticipation: 'Ant', Decisions: 'Dec', Teamwork: 'Tea', WorkRate: 'Wor', Flair: 'Fla', Leadership: 'Ldr', Bravery: 'Bra', Aggression: 'Agg', Composure: 'Cmp', Concentration: 'Cnt', Determination: 'Det', Positioning: 'Pos',
    Acceleration: 'Acc', Agility: 'Agi', Balance: 'Bal', JumpingReach: 'Jum', NaturalFitness: 'Nat', Pace: 'Pac', Stamina: 'Sta', Strength: 'Str',
    Handling: 'Han', AerialReach: 'Aer', CommandOfArea: 'Cmd', Communication: 'Com', Kicking: 'Kic', Throwing: 'Thr', OneOnOnes: '1v1', Reflexes: 'Ref', Eccentricity: 'Ecc', RushingOut: 'Rus', Punching: 'Pun',
    Consistency: 'Kon', Dirtiness: 'Kot', ImportantMatches: 'LgP', InjuryProneness: 'Cdr', Versatility: 'Flk' };
  const PERS = [['ambition', 'Ambisi'], ['professionalism', 'Profesional'], ['loyalty', 'Loyalitas'], ['pressure', 'Tekanan'], ['sportsmanship', 'Sportif'], ['temperament', 'Temperamen'], ['adaptability', 'Adaptasi'], ['controversy', 'Kontroversi']];
  const SETS = { umum: 'Umum', technical: 'Teknik', mental: 'Mental', physical: 'Fisik', goalkeeping: 'Kiper', hidden: 'Tersembunyi', pers: 'Kepribadian', semua: 'Semua atribut' };
  const POS = ['', 'GK', 'DC', 'DL', 'DR', 'WBL', 'WBR', 'DM', 'MC', 'ML', 'MR', 'AMC', 'AML', 'AMR', 'ST'];
  let META = null;
  let ST = (() => { try { return JSON.parse(localStorage.getItem('dbState') || 'null'); } catch { return null; } })() || { set: 'umum', sort: 'ca', dir: 'desc', page: 0, f: { excludeMine: '1' } };
  const save = () => { try { localStorage.setItem('dbState', JSON.stringify(ST)); } catch { } };

  const aCell = v => `<td class="num"><span class="dba ${typeof aCls === 'function' ? aCls(v) : ''}">${v ?? '–'}</span></td>`;
  function cols() {
    const base = [
      { k: 'name', h: 'Pemain', td: p => `<td><div class="pname">${ava(p.name, 0, p.id)}<div><b>${esc(p.name)}</b><small>${logo(p.clubId)}${esc(p.club)}</small></div></div></td>` },
      { k: 'pos', h: 'Posisi', s: null, td: p => `<td><span class="badge pos">${esc(p.pos)}</span></td>` },
      { k: 'age', h: 'Usia', td: p => `<td class="num">${p.age}</td>` },
      { k: 'ca', h: 'CA', td: p => `<td class="num"><b>${p.ca}</b></td>` },
      { k: 'pa', h: 'PA', td: p => `<td class="num"><b>${p.pa}</b></td>` },
    ];
    if (ST.set === 'umum') return base.concat([
      { k: 'nat', h: 'Negara', td: p => `<td>${esc(p.nat)}</td>` },
      { k: 'div', h: 'Liga', s: null, td: p => `<td class="dbdiv">${esc(p.div)}</td>` },
      { k: 'rating', h: 'Rating', td: p => `<td class="num"><span class="score ${sCls(p.rating)}">${p.rating.toFixed(0)}</span> <small class="muted">${esc(p.bp)}</small></td>` },
      { k: 'value', h: 'Nilai', td: p => `<td class="num">${money(p.value)}</td>` },
      { k: 'askingPrice', h: 'Harga Minta', td: p => `<td class="num">${money(p.askingPrice)}</td>` },
      { k: 'wage', h: 'Gaji', td: p => `<td class="num">${money(p.wage)}</td>` },
      { k: 'exp', h: 'Kontrak', td: p => `<td class="num">${esc(p.expires || '–')}</td>` },
      { k: 'height', h: 'Tinggi', td: p => `<td class="num">${p.height || '–'}</td>` },
      { k: 'pers', h: 'Kepribadian', s: null, td: p => `<td><small>${esc(p.pers || '')}</small></td>` },
    ]);
    if (ST.set === 'pers') return base.concat(PERS.map(([k, h]) => ({ k, h: h.slice(0, 5), t: h, td: p => aCell(p.persn[k]) })));
    const keys = ST.set === 'semua' ? Object.values(META.groups).flat() : META.groups[ST.set] || [];
    return base.concat(keys.map(k => ({ k: 'a.' + k, h: AB[k] || k.slice(0, 3), t: META.labels[k] || k, td: p => aCell(p.attrs[k]) })));
  }

  async function pDatabase(page) {
    if (!META) META = await api('/api/attrmeta');
    const f = ST.f;
    page.innerHTML = `<div class="page-head"><div><h1>Database</h1><p>Semua pemain di save · klik judul kolom untuk mengurutkan · ↑↓ pilih, Enter buka profil</p></div>
      <div class="row-flex"><button class="btn" id="dbCsv">⬇ Ekspor CSV</button></div></div>
      <div class="card db-filter">
        <input id="dbQ" class="inp" placeholder="Cari nama / klub / negara…" value="${esc(f.q || '')}">
        <select id="dbPos" class="inp">${POS.map(x => `<option value="${x}"${f.pos === x ? ' selected' : ''}>${x || 'Semua posisi'}</option>`).join('')}</select>
        <label>Usia <input id="dbAmin" class="inp n" type="number" placeholder="min" value="${f.minAge || ''}">–<input id="dbAmax" class="inp n" type="number" placeholder="maks" value="${f.maxAge || ''}"></label>
        <label>CA ≥ <input id="dbCa" class="inp n" type="number" value="${f.minCa || ''}"></label>
        <label>PA ≥ <input id="dbPa" class="inp n" type="number" value="${f.minPa || ''}"></label>
        <input id="dbDiv" class="inp" list="dbDivs" placeholder="Liga" value="${esc(f.div || '')}"><datalist id="dbDivs">${META.divs.map(d => `<option value="${esc(d)}">`).join('')}</datalist>
        <input id="dbNat" class="inp" list="dbNats" placeholder="Negara" value="${esc(f.nat || '')}"><datalist id="dbNats">${META.nats.map(d => `<option value="${esc(d)}">`).join('')}</datalist>
        <label class="chk"><input type="checkbox" id="dbMine"${f.excludeMine === '1' ? ' checked' : ''}> Tanpa klub saya</label>
        <button class="btn ghost sm" id="dbReset">Reset</button>
      </div>
      <div class="db-sets">${Object.entries(SETS).map(([k, v]) => `<button class="chip${ST.set === k ? ' on' : ''}" data-set="${k}">${v}</button>`).join('')}</div>
      <div class="card db-wrap"><div id="dbBody">${loading()}</div></div>`;
    const read = () => {
      const v = id => page.querySelector(id).value.trim();
      ST.f = { q: v('#dbQ'), pos: v('#dbPos'), minAge: v('#dbAmin'), maxAge: v('#dbAmax'), minCa: v('#dbCa'), minPa: v('#dbPa'), div: v('#dbDiv'), nat: v('#dbNat'), excludeMine: page.querySelector('#dbMine').checked ? '1' : '' };
      ST.page = 0; save(); load();
    };
    let tm; page.querySelectorAll('.db-filter input, .db-filter select').forEach(el => { el.oninput = el.onchange = () => { clearTimeout(tm); tm = setTimeout(read, 300); }; });
    page.querySelector('#dbReset').onclick = () => { ST.f = { excludeMine: '1' }; ST.page = 0; save(); pDatabase(page); };
    page.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { ST.set = b.dataset.set; save(); page.querySelectorAll('[data-set]').forEach(x => x.classList.toggle('on', x === b)); load(); });
    page.querySelector('#dbCsv').onclick = async () => {
      const r = await api('/api/search?' + qs({ limit: 5000, offset: 0 }));
      const C = cols(); const cell = (c, p) => { const k = c.k; const v = k.startsWith('a.') ? p.attrs[k.slice(2)] : PERS.some(x => x[0] === k) ? p.persn[k] : k === 'nat' ? (p.nats || []).join('/') : p[k]; return `"${String(v ?? '').replace(/"/g, '""')}"`; };
      const csv = [C.map(c => `"${c.t || c.h}"`).join(','), ...r.rows.map(p => C.map(c => cell(c, p)).join(','))].join('\r\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); a.download = `database-fm27-${ST.set}.csv`; a.click();
      toast(`CSV: ${r.rows.length.toLocaleString('id')} pemain`);
    };
    const qs = extra => new URLSearchParams(Object.fromEntries(Object.entries({ ...ST.f, sort: ST.sort, dir: ST.dir, full: '1', ...extra }).filter(([, v]) => v !== '' && v != null))).toString();
    async function load() {
      const body = page.querySelector('#dbBody'); if (!body) return;
      try { await load0(body); } catch (e) { failBox(body, e, () => { body.innerHTML = loading(); load(); }); }
    }
    async function load0(body) {
      const size = 100; const r = await apiT('/api/search?' + qs({ limit: size, offset: ST.page * size }));
      const C = cols(); const pages = Math.max(1, Math.ceil(r.total / size));
      body.innerHTML = `<div class="db-scroll"><table class="tbl db-tbl"><thead><tr>${C.map(c => `<th class="${c.s === null ? '' : 'sortable'}${ST.sort === c.k ? ' on ' + ST.dir : ''}" data-k="${c.s === null ? '' : c.k}" title="${esc(c.t || c.h)}">${esc(c.h)}${ST.sort === c.k ? (ST.dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
        <tbody>${r.rows.map(p => `<tr data-id="${p.id}" class="row-click">${C.map(c => c.td(p)).join('')}</tr>`).join('')}</tbody></table></div>
        <div class="db-pg"><span class="muted">${r.total.toLocaleString('id')} pemain · halaman ${ST.page + 1}/${pages}</span><button class="btn sm" id="dbPrev"${ST.page ? '' : ' disabled'}>‹ Sebelumnya</button><button class="btn sm" id="dbNext"${ST.page + 1 < pages ? '' : ' disabled'}>Berikutnya ›</button></div>`;
      body.querySelectorAll('th[data-k]').forEach(th => { if (!th.dataset.k) return; th.onclick = () => { const k = th.dataset.k; if (ST.sort === k) ST.dir = ST.dir === 'asc' ? 'desc' : 'asc'; else { ST.sort = k; ST.dir = ['name', 'club', 'nat', 'age', 'exp'].includes(k) ? 'asc' : 'desc'; } ST.page = 0; save(); load(); }; });
      body.querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openPlayer(Number(tr.dataset.id)));
      const pv = body.querySelector('#dbPrev'), nx = body.querySelector('#dbNext');
      pv.onclick = () => { ST.page--; save(); load(); body.scrollIntoView({ block: 'start' }); };
      nx.onclick = () => { ST.page++; save(); load(); body.scrollIntoView({ block: 'start' }); };
    }
    await load();
  }
  const i = ROUTES.findIndex(r => r.id === 'scout');
  ROUTES.splice(i + 1, 0, { id: 'database', hint: 'Semua pemain dalam tabel lengkap (gaya Teknik Oda)', name: 'Database', icon: 'list', fn: pDatabase });
  window.pDatabase = pDatabase;
})();
