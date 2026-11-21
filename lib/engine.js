'use strict';
// Mesin analisis Asisten FM27: rating posisi (gaya Genie Scout), rating peran,
// perkiraan kepribadian, rating staf, dan Best XI.

const ATTR_LABEL = {
  Crossing: 'Umpan Silang', Dribbling: 'Menggiring', Finishing: 'Penyelesaian', Heading: 'Sundulan',
  LongShots: 'Tendangan Jarak Jauh', Marking: 'Mengawal', OffTheBall: 'Tanpa Bola', Passing: 'Mengoper',
  PenaltyTaking: 'Penalti', Tackling: 'Tekel', Vision: 'Visi', FirstTouch: 'Kontrol Pertama',
  Technique: 'Teknik', Flair: 'Kreativitas', Corners: 'Sepak Pojok', Teamwork: 'Kerja Sama',
  WorkRate: 'Etos Kerja', LongThrows: 'Lemparan Jauh', FreeKicks: 'Tendangan Bebas',
  Anticipation: 'Antisipasi', Decisions: 'Keputusan', Positioning: 'Posisi', Composure: 'Ketenangan',
  Concentration: 'Konsentrasi', Leadership: 'Kepemimpinan', Bravery: 'Keberanian', Aggression: 'Agresi',
  Determination: 'Tekad', Acceleration: 'Akselerasi', Pace: 'Kecepatan', Strength: 'Kekuatan',
  Stamina: 'Stamina', JumpingReach: 'Lompatan', Balance: 'Keseimbangan', Agility: 'Kelincahan',
  NaturalFitness: 'Kebugaran Alami',
  Handling: 'Tangkapan', AerialReach: 'Jangkauan Udara', CommandOfArea: 'Kuasai Area',
  Communication: 'Komunikasi', Kicking: 'Tendangan', Throwing: 'Lemparan', OneOnOnes: 'Satu Lawan Satu',
  Reflexes: 'Refleks', RushingOut: 'Keluar Sarang', Punching: 'Meninju', Eccentricity: 'Eksentrik',
  Consistency: 'Konsistensi', ImportantMatches: 'Laga Penting', InjuryProneness: 'Rawan Cedera',
  Versatility: 'Fleksibilitas', Dirtiness: 'Bermain Kotor',
};

const GROUPS = {
  technical: ['Corners', 'Crossing', 'Dribbling', 'Finishing', 'FirstTouch', 'FreeKicks', 'Heading', 'LongShots', 'LongThrows', 'Marking', 'Passing', 'PenaltyTaking', 'Tackling', 'Technique'],
  mental: ['Aggression', 'Anticipation', 'Bravery', 'Composure', 'Concentration', 'Decisions', 'Determination', 'Flair', 'Leadership', 'OffTheBall', 'Positioning', 'Teamwork', 'Vision', 'WorkRate'],
  physical: ['Acceleration', 'Agility', 'Balance', 'JumpingReach', 'NaturalFitness', 'Pace', 'Stamina', 'Strength'],
  goalkeeping: ['AerialReach', 'CommandOfArea', 'Communication', 'Eccentricity', 'Handling', 'Kicking', 'OneOnOnes', 'Punching', 'Reflexes', 'RushingOut', 'Throwing'],
  hidden: ['Consistency', 'ImportantMatches', 'InjuryProneness', 'Versatility', 'Dirtiness'],
};

// Bobot rating posisi ala Genie Scout (atribut 1-20 -> 0-100)
const POSITIONS = {
  GK: { label: 'Kiper', match: ['GK'], w: { Handling: 5, Reflexes: 5, OneOnOnes: 4, AerialReach: 4, CommandOfArea: 3, Communication: 3, Kicking: 2, Throwing: 2, Positioning: 3, Concentration: 3, Decisions: 2, Anticipation: 2, Agility: 3, RushingOut: 2, Composure: 2 } },
  DC: { label: 'Bek Tengah', match: ['DC'], w: { Marking: 5, Tackling: 5, Heading: 5, Positioning: 5, JumpingReach: 4, Strength: 4, Anticipation: 3, Concentration: 3, Decisions: 3, Bravery: 2, Composure: 2, Pace: 2, Acceleration: 1, Passing: 1 } },
  FB: { label: 'Bek Sayap', match: ['DL', 'DR'], w: { Tackling: 4, Marking: 3, Positioning: 4, Pace: 4, Acceleration: 3, Stamina: 3, Crossing: 3, WorkRate: 3, Teamwork: 2, Anticipation: 2, Concentration: 2, Decisions: 2, Passing: 2, Dribbling: 1 } },
  WB: { label: 'Wing Back', match: ['WBL', 'WBR'], w: { Crossing: 4, Pace: 4, Stamina: 4, Acceleration: 3, WorkRate: 3, Dribbling: 3, Tackling: 3, Positioning: 2, Teamwork: 2, OffTheBall: 2, Passing: 2, Technique: 1, Agility: 1 } },
  DM: { label: 'Gelandang Bertahan', match: ['DM'], w: { Tackling: 4, Positioning: 4, Anticipation: 4, Decisions: 4, Marking: 3, Passing: 3, Concentration: 3, Teamwork: 3, WorkRate: 3, Stamina: 2, Strength: 2, Composure: 2, FirstTouch: 1 } },
  MC: { label: 'Gelandang Tengah', match: ['MC'], w: { Passing: 5, Decisions: 4, Vision: 4, FirstTouch: 3, Technique: 3, Composure: 3, Teamwork: 3, WorkRate: 3, Stamina: 3, Anticipation: 2, OffTheBall: 2, Tackling: 2, Dribbling: 1, LongShots: 1 } },
  WM: { label: 'Gelandang Sayap', match: ['ML', 'MR'], w: { Crossing: 4, Pace: 4, Dribbling: 3, Acceleration: 3, Stamina: 3, WorkRate: 3, Passing: 3, OffTheBall: 3, Technique: 2, FirstTouch: 2, Teamwork: 2, Decisions: 2 } },
  AMC: { label: 'Gelandang Serang', match: ['AMC'], w: { Vision: 5, Passing: 4, FirstTouch: 4, Technique: 4, Decisions: 3, Composure: 3, OffTheBall: 3, Dribbling: 3, Flair: 2, LongShots: 2, Anticipation: 2, Agility: 2, Finishing: 2 } },
  W: { label: 'Penyerang Sayap', match: ['AML', 'AMR'], w: { Dribbling: 5, Acceleration: 5, Pace: 4, Crossing: 3, Technique: 3, FirstTouch: 3, OffTheBall: 3, Agility: 3, Flair: 2, Finishing: 2, Composure: 2, Decisions: 2 } },
  ST: { label: 'Penyerang', match: ['ST'], w: { Finishing: 5, OffTheBall: 4, Composure: 4, Acceleration: 4, Anticipation: 3, FirstTouch: 3, Pace: 3, Heading: 2, Dribbling: 2, Technique: 2, Strength: 2, Decisions: 2, JumpingReach: 1, Balance: 1, Agility: 1 } },
};
const POS_OF = {}; // 'DL' -> 'FB'
for (const [k, v] of Object.entries(POSITIONS)) v.match.forEach(m => (POS_OF[m] = k));

// Peran: key (bobot 3) & penting (bobot 1.5) — gaya FM26 (in possession / out of possession)
const ROLES = [
  { id: 'gk', pos: 'GK', name: 'Kiper', en: 'Goalkeeper', key: ['Handling', 'Reflexes', 'OneOnOnes', 'AerialReach', 'Positioning'], imp: ['CommandOfArea', 'Communication', 'Concentration', 'Kicking', 'Agility', 'Decisions'] },
  { id: 'sk', pos: 'GK', name: 'Kiper Penyapu', en: 'Sweeper Keeper', key: ['Reflexes', 'OneOnOnes', 'RushingOut', 'Passing', 'Composure'], imp: ['Handling', 'Kicking', 'FirstTouch', 'Vision', 'Anticipation', 'Acceleration'] },
  { id: 'cd', pos: 'DC', name: 'Bek Tengah', en: 'Centre-Back', key: ['Marking', 'Tackling', 'Heading', 'Positioning', 'JumpingReach'], imp: ['Strength', 'Anticipation', 'Concentration', 'Decisions', 'Bravery'] },
  { id: 'bpd', pos: 'DC', name: 'Bek Pengatur Bola', en: 'Ball-Playing Centre-Back', key: ['Passing', 'Composure', 'Marking', 'Tackling', 'Positioning'], imp: ['Heading', 'FirstTouch', 'Vision', 'Decisions', 'Technique', 'Anticipation'] },
  { id: 'stp', pos: 'DC', name: 'Bek Penekan', en: 'Stopping Centre-Back', key: ['Tackling', 'Aggression', 'Bravery', 'Anticipation', 'Strength'], imp: ['Marking', 'Heading', 'Decisions', 'Pace', 'JumpingReach'] },
  { id: 'fb', pos: 'FB', name: 'Bek Sayap', en: 'Full-Back', key: ['Tackling', 'Marking', 'Positioning', 'Anticipation', 'Concentration'], imp: ['Crossing', 'Pace', 'Stamina', 'Teamwork', 'WorkRate', 'Passing'] },
  { id: 'ifb', pos: 'FB', name: 'Bek Sayap Inverted', en: 'Inverted Full-Back', key: ['Passing', 'Tackling', 'Positioning', 'Composure', 'Decisions'], imp: ['FirstTouch', 'Marking', 'Teamwork', 'Technique', 'Anticipation'] },
  { id: 'wb', pos: 'WB', name: 'Wing Back', en: 'Wing-Back', key: ['Crossing', 'Stamina', 'WorkRate', 'Pace', 'Dribbling'], imp: ['Tackling', 'OffTheBall', 'Teamwork', 'Acceleration', 'Technique', 'Positioning'] },
  { id: 'iwb', pos: 'WB', name: 'Wing Back Inverted', en: 'Inverted Wing-Back', key: ['Passing', 'Decisions', 'FirstTouch', 'Teamwork', 'Stamina'], imp: ['Technique', 'Vision', 'Tackling', 'Composure', 'WorkRate'] },
  { id: 'dm', pos: 'DM', name: 'Gelandang Bertahan', en: 'Defensive Midfielder', key: ['Tackling', 'Positioning', 'Anticipation', 'Teamwork', 'Concentration'], imp: ['Marking', 'Passing', 'Decisions', 'Stamina', 'Strength', 'Composure'] },
  { id: 'dlp', pos: 'DM', name: 'Pengatur Serangan Dalam', en: 'Deep-Lying Playmaker', key: ['Passing', 'Vision', 'Decisions', 'Composure', 'FirstTouch'], imp: ['Technique', 'Teamwork', 'Anticipation', 'Positioning', 'Balance'] },
  { id: 'bwm', pos: 'DM', name: 'Perebut Bola', en: 'Ball-Winning Midfielder', key: ['Tackling', 'Aggression', 'WorkRate', 'Stamina', 'Anticipation'], imp: ['Teamwork', 'Bravery', 'Strength', 'Pace', 'Positioning'] },
  { id: 'cm', pos: 'MC', name: 'Gelandang Tengah', en: 'Central Midfielder', key: ['Passing', 'Decisions', 'Teamwork', 'FirstTouch', 'WorkRate'], imp: ['Tackling', 'Technique', 'Vision', 'Stamina', 'Composure', 'Anticipation'] },
  { id: 'b2b', pos: 'MC', name: 'Box to Box', en: 'Box-to-Box Midfielder', key: ['Stamina', 'WorkRate', 'Passing', 'Tackling', 'OffTheBall'], imp: ['Teamwork', 'Decisions', 'Finishing', 'LongShots', 'Acceleration', 'Strength'] },
  { id: 'mez', pos: 'MC', name: 'Mezzala / Channel', en: 'Channel Midfielder', key: ['Dribbling', 'OffTheBall', 'Passing', 'Technique', 'Acceleration'], imp: ['Vision', 'Decisions', 'FirstTouch', 'Composure', 'Flair', 'Stamina'] },
  { id: 'wm', pos: 'WM', name: 'Gelandang Sayap', en: 'Wide Midfielder', key: ['Crossing', 'WorkRate', 'Stamina', 'Passing', 'Teamwork'], imp: ['Dribbling', 'Pace', 'Tackling', 'Decisions', 'OffTheBall'] },
  { id: 'wp', pos: 'WM', name: 'Playmaker Sayap', en: 'Wide Playmaker', key: ['Passing', 'Vision', 'FirstTouch', 'Technique', 'Decisions'], imp: ['Dribbling', 'Composure', 'Teamwork', 'OffTheBall', 'Agility'] },
  { id: 'am', pos: 'AMC', name: 'Gelandang Serang', en: 'Attacking Midfielder', key: ['Passing', 'Vision', 'FirstTouch', 'Technique', 'OffTheBall'], imp: ['Dribbling', 'Composure', 'Decisions', 'Flair', 'LongShots', 'Anticipation'] },
  { id: 'ss', pos: 'AMC', name: 'Penyerang Bayangan', en: 'Shadow Striker', key: ['OffTheBall', 'Finishing', 'Anticipation', 'Composure', 'Acceleration'], imp: ['Dribbling', 'FirstTouch', 'Technique', 'WorkRate', 'Decisions'] },
  { id: 'w', pos: 'W', name: 'Winger', en: 'Winger', key: ['Crossing', 'Dribbling', 'Acceleration', 'Pace', 'Technique'], imp: ['FirstTouch', 'OffTheBall', 'Agility', 'Flair', 'Stamina'] },
  { id: 'if', pos: 'W', name: 'Penyerang Dalam', en: 'Inside Forward', key: ['Dribbling', 'Finishing', 'Acceleration', 'OffTheBall', 'FirstTouch'], imp: ['Technique', 'Composure', 'Pace', 'Agility', 'Flair', 'Anticipation'] },
  { id: 'iw', pos: 'W', name: 'Winger Inverted', en: 'Inverted Winger', key: ['Dribbling', 'Passing', 'Technique', 'Acceleration', 'Vision'], imp: ['FirstTouch', 'Crossing', 'Flair', 'Agility', 'Decisions'] },
  { id: 'af', pos: 'ST', name: 'Penyerang Depan', en: 'Advanced Forward', key: ['Finishing', 'OffTheBall', 'Acceleration', 'Composure', 'Pace'], imp: ['Dribbling', 'FirstTouch', 'Technique', 'Anticipation', 'Decisions'] },
  { id: 'tm', pos: 'ST', name: 'Target Man', en: 'Target Forward', key: ['Heading', 'JumpingReach', 'Strength', 'Balance', 'Bravery'], imp: ['Finishing', 'Composure', 'FirstTouch', 'Teamwork', 'OffTheBall'] },
  { id: 'cf', pos: 'ST', name: 'Penyerang Komplet', en: 'Complete Forward', key: ['Finishing', 'FirstTouch', 'Passing', 'Technique', 'Composure'], imp: ['Heading', 'Dribbling', 'Vision', 'OffTheBall', 'Strength', 'Decisions'] },
  { id: 'f9', pos: 'ST', name: 'False 9', en: 'False Nine', key: ['Passing', 'Vision', 'FirstTouch', 'Technique', 'OffTheBall'], imp: ['Dribbling', 'Composure', 'Decisions', 'Flair', 'Finishing'] },
  { id: 'p', pos: 'ST', name: 'Poacher', en: 'Poacher', key: ['Finishing', 'OffTheBall', 'Anticipation', 'Composure'], imp: ['Acceleration', 'FirstTouch', 'Heading', 'Decisions'] },
  { id: 'pf', pos: 'ST', name: 'Penyerang Penekan', en: 'Pressing Forward', key: ['WorkRate', 'Stamina', 'Aggression', 'Acceleration', 'Anticipation'], imp: ['Finishing', 'Teamwork', 'Bravery', 'Decisions', 'OffTheBall'] },
];

const v = (p, a) => (p.attrs && p.attrs[a]) || 0;

function weighted(p, w) {
  let s = 0, t = 0;
  for (const [a, k] of Object.entries(w)) { s += v(p, a) * k; t += k; }
  return t ? Math.round((s / t) * 5 * 10) / 10 : 0; // 0-100
}

function roleScore(p, role) {
  const w = {};
  role.key.forEach(a => (w[a] = 3));
  role.imp.forEach(a => (w[a] = (w[a] || 0) + 1.5));
  return weighted(p, w);
}

function familiarity(p, posKey) {
  const arr = p.posArr || [];
  const m = POSITIONS[posKey].match;
  if (arr.some(x => m.includes(x))) return 1;
  const near = { FB: ['WB', 'DC'], WB: ['FB', 'WM'], DM: ['MC', 'DC'], MC: ['DM', 'AMC'], WM: ['W', 'WB'], AMC: ['MC', 'ST'], W: ['WM', 'ST'], ST: ['AMC', 'W'], DC: ['DM', 'FB'], GK: [] };
  if (arr.some(x => near[posKey].includes(POS_OF[x]))) return 0.9;
  return posKey === 'GK' || arr.includes('GK') ? 0.3 : 0.72;
}

function positionRatings(p) {
  const out = {};
  for (const [k, pos] of Object.entries(POSITIONS)) out[k] = weighted(p, pos.w);
  return out;
}

function bestPosition(p) {
  const r = positionRatings(p);
  let best = null;
  for (const k of Object.keys(r)) {
    const nat = familiarity(p, k) === 1;
    if (!nat) continue;
    if (!best || r[k] > r[best]) best = k;
  }
  if (!best) best = Object.keys(r).sort((a, b) => r[b] - r[a])[0];
  return { pos: best, rating: r[best], all: r };
}

function allRoles(p) {
  return ROLES.map(r => ({ id: r.id, name: r.name, en: r.en, pos: r.pos, score: roleScore(p, r), natural: familiarity(p, r.pos) === 1 }))
    .sort((a, b) => (b.natural - a.natural) || b.score - a.score);
}

// Perkiraan kepribadian dari atribut tersembunyi (mirip aturan FM)
function personality(p) {
  const a = p.attrs || {};
  const det = a.Determination || 10, amb = p.ambition || 10, pro = p.professionalism || 10, loy = p.loyalty || 10,
    pre = p.pressure || 10, spo = p.sportsmanship || 10, tem = p.temperament || 10, con = p.controversy || 10;
  if (det >= 14 && amb >= 12 && pro >= 15 && loy >= 14 && pre >= 12 && spo >= 15 && tem >= 12) return { label: 'Warga Teladan', en: 'Model Citizen', tone: 'great' };
  if (pro >= 20 && tem >= 10) return { label: 'Profesional Teladan', en: 'Model Professional', tone: 'great' };
  if (pro >= 18 && det >= 14 && amb >= 14) return { label: 'Perfeksionis', en: 'Perfectionist', tone: 'great' };
  if (det >= 18 && amb >= 18) return { label: 'Sangat Ambisius & Gigih', en: 'Driven', tone: 'great' };
  if (pro >= 15) return { label: 'Profesional', en: 'Professional', tone: 'good' };
  if (det >= 15 && pre >= 15) return { label: 'Tangguh', en: 'Resolute', tone: 'good' };
  if (amb >= 18) return { label: 'Sangat Ambisius', en: 'Very Ambitious', tone: 'good' };
  if (det >= 17) return { label: 'Bertekad Kuat', en: 'Determined', tone: 'good' };
  if (loy >= 18) return { label: 'Sangat Setia', en: 'Very Loyal', tone: 'good' };
  if (tem <= 4 && con >= 15) return { label: 'Mudah Tersulut', en: 'Temperamental', tone: 'bad' };
  if (pro <= 5) return { label: 'Santai', en: 'Casual', tone: 'bad' };
  if (amb <= 5) return { label: 'Tidak Ambisius', en: 'Unambitious', tone: 'bad' };
  if (pre <= 5) return { label: 'Kurang Percaya Diri', en: 'Low Self-Belief', tone: 'bad' };
  if (loy <= 4 && amb >= 14) return { label: 'Tentara Bayaran', en: 'Mercenary', tone: 'bad' };
  if (pro >= 12) return { label: 'Cukup Profesional', en: 'Fairly Professional', tone: 'ok' };
  return { label: 'Seimbang', en: 'Balanced', tone: 'ok' };
}

// ---------- Staf ----------
const STAFF_LABEL = {
  Aanvallen: 'Menyerang', Verdedigen: 'Bertahan', Fitheid: 'Kebugaran', Balbezit: 'Mental (melatih)',
  Technisch: 'Teknik', Tactisch: 'Taktik', Standaardsituaties: 'Bola Mati', Vastberadenheid: 'Tekad',
  'Man-management': 'Manajemen Pemain', Motiveren: 'Motivasi', Oordeel_vermogen: 'Menilai Kemampuan',
  Oordeel_potentie: 'Menilai Potensi', Oordeel_staf: 'Menilai Staf', Onderhandelen: 'Negosiasi',
  Tactische_kennis: 'Pengetahuan Taktik', Fysiotherapie: 'Fisioterapi', Sportwetenschap: 'Ilmu Olahraga',
  Data_analyse: 'Analisis Data', Jeugd: 'Membina Pemain Muda', KV_distributie: 'Kiper: Distribusi',
  KV_vangen: 'Kiper: Tangkapan', KV_reflexen: 'Kiper: Refleks', Aanpassingsvermogen: 'Adaptasi',
  Discipline: 'Disiplin', Adaptability: 'Adaptasi',
};
const JOB_LABEL = {
  Staflid: 'Staf (bebas)', Manager: 'Manajer', Scout: 'Pemandu Bakat', Fysiotherapeut: 'Fisioterapis', Trainer: 'Pelatih',
  Directeur: 'Direktur', Conditietrainer: 'Pelatih Fisik', 'Prestatie analist': 'Analis Performa', Keeperstrainer: 'Pelatih Kiper',
  'Assistent-manager': 'Asisten Manajer', Sportwetenschapper: 'Ilmuwan Olahraga', 'Analist rekrutering': 'Analis Rekrutmen',
  'Hoofd fysiotherapie': 'Kepala Fisioterapi', Voorzitter: 'Ketua', Hoofdscout: 'Kepala Pemandu Bakat', Clubarts: 'Dokter Klub',
  Arts: 'Dokter', 'Directeur voetbalzaken': 'Direktur Olahraga', 'Hoofd jeugdopleiding': 'Kepala Akademi', 'Media-analist': 'Analis Media',
  'Hoofd performance analyse': 'Kepala Analisis Performa', 'Algemeen directeur': 'CEO', 'Hoofd sportwetenschap': 'Kepala Ilmu Olahraga',
  'Technisch directeur': 'Direktur Teknik', '(Ver)huurmanager': 'Manajer Peminjaman', President: 'Presiden', Eigenaar: 'Pemilik',
  'Algemeen manager': 'Manajer Umum',
};
const STAFF_GROUPS = [
  ['Melatih', ['Aanvallen', 'Verdedigen', 'Fitheid', 'KV_distributie', 'KV_vangen', 'KV_reflexen', 'Balbezit', 'Standaardsituaties', 'Tactisch', 'Technisch', 'Jeugd']],
  ['Mental', ['Aanpassingsvermogen', 'Vastberadenheid', 'Man-management', 'Motiveren']],
  ['Pengetahuan', ['Oordeel_vermogen', 'Oordeel_potentie', 'Oordeel_staf', 'Onderhandelen', 'Tactische_kennis', 'Data_analyse']],
  ['Medis', ['Fysiotherapie', 'Sportwetenschap']],
];
const STAFF_ROLES = [
  { id: 'att', name: 'Pelatih Menyerang', p: ['Aanvallen', 'Tactisch'] },
  { id: 'def', name: 'Pelatih Bertahan', p: ['Verdedigen', 'Tactisch'] },
  { id: 'tec', name: 'Pelatih Teknik', p: ['Technisch', 'Balbezit'] },
  { id: 'tac', name: 'Pelatih Taktik', p: ['Tactisch', 'Tactische_kennis'] },
  { id: 'fit', name: 'Pelatih Fisik', p: ['Fitheid', 'Sportwetenschap'] },
  { id: 'gk', name: 'Pelatih Kiper', p: ['KV_vangen', 'KV_reflexen', 'KV_distributie'] },
  { id: 'set', name: 'Pelatih Bola Mati', p: ['Standaardsituaties', 'Technisch'] },
  { id: 'yth', name: 'Pelatih Akademi', p: ['Jeugd', 'Technisch', 'Man-management'] },
  { id: 'ass', name: 'Asisten Manajer', p: ['Tactische_kennis', 'Man-management', 'Motiveren', 'Oordeel_vermogen'] },
  { id: 'sct', name: 'Pemandu Bakat', p: ['Oordeel_vermogen', 'Oordeel_potentie', 'Aanpassingsvermogen'] },
  { id: 'phy', name: 'Fisioterapis', p: ['Fysiotherapie', 'Sportwetenschap'] },
  { id: 'ana', name: 'Analis Performa', p: ['Data_analyse', 'Tactische_kennis'] },
  { id: 'dof', name: 'Direktur Olahraga', p: ['Onderhandelen', 'Oordeel_vermogen', 'Oordeel_potentie', 'Oordeel_staf'] },
];
function staffScore(s, role) {
  const a = s.staffAttrs || {};
  const prim = role.p.reduce((t, k) => t + (a[k] || 0), 0) / role.p.length;
  const support = ['att', 'def', 'tec', 'tac', 'fit', 'gk', 'set', 'yth'].includes(role.id)
    ? ((a.Vastberadenheid || 0) + (a.Motiveren || 0)) / 2 : (a.Vastberadenheid || 0);
  const r = prim * 0.75 + support * 0.25; // 1-20
  return { score: Math.round(r * 50) / 10, stars: Math.max(0.5, Math.round((r / 20) * 10) / 2) };
}
function staffBest(s) {
  if (!s.staffAttrs) return null;
  let best = null;
  for (const r of STAFF_ROLES) { const sc = staffScore(s, r); if (!best || sc.score > best.score) best = { ...sc, id: r.id, name: r.name }; }
  return best;
}

// ---------- Formasi & Best XI ----------
const FORMATIONS = {
  '4-3-3': [['GK', 'gk', 50, 92], ['FB', 'fb', 12, 72], ['DC', 'cd', 36, 76], ['DC', 'bpd', 64, 76], ['FB', 'fb', 88, 72], ['DM', 'dm', 50, 58], ['MC', 'b2b', 30, 44], ['MC', 'mez', 70, 44], ['W', 'if', 15, 20], ['ST', 'af', 50, 12], ['W', 'w', 85, 20]],
  '4-2-3-1': [['GK', 'gk', 50, 92], ['FB', 'fb', 12, 72], ['DC', 'cd', 36, 76], ['DC', 'bpd', 64, 76], ['FB', 'fb', 88, 72], ['DM', 'dlp', 36, 56], ['DM', 'bwm', 64, 56], ['W', 'w', 14, 30], ['AMC', 'am', 50, 34], ['W', 'if', 86, 30], ['ST', 'af', 50, 12]],
  '4-4-2': [['GK', 'gk', 50, 92], ['FB', 'fb', 12, 72], ['DC', 'cd', 36, 76], ['DC', 'cd', 64, 76], ['FB', 'fb', 88, 72], ['WM', 'wm', 12, 42], ['MC', 'b2b', 37, 46], ['MC', 'cm', 63, 46], ['WM', 'wm', 88, 42], ['ST', 'tm', 37, 14], ['ST', 'af', 63, 14]],
  '3-5-2': [['GK', 'gk', 50, 92], ['DC', 'stp', 26, 76], ['DC', 'cd', 50, 78], ['DC', 'bpd', 74, 76], ['WB', 'wb', 10, 50], ['DM', 'dlp', 50, 58], ['MC', 'b2b', 32, 42], ['MC', 'mez', 68, 42], ['WB', 'wb', 90, 50], ['ST', 'cf', 37, 14], ['ST', 'af', 63, 14]],
  '3-4-3': [['GK', 'gk', 50, 92], ['DC', 'cd', 26, 76], ['DC', 'cd', 50, 78], ['DC', 'bpd', 74, 76], ['WB', 'wb', 10, 48], ['MC', 'dlp', 37, 50], ['MC', 'b2b', 63, 50], ['WB', 'wb', 90, 48], ['W', 'if', 18, 20], ['ST', 'af', 50, 12], ['W', 'if', 82, 20]],
  '4-1-4-1': [['GK', 'gk', 50, 92], ['FB', 'fb', 12, 72], ['DC', 'cd', 36, 76], ['DC', 'bpd', 64, 76], ['FB', 'fb', 88, 72], ['DM', 'dm', 50, 58], ['WM', 'wm', 12, 38], ['MC', 'b2b', 36, 40], ['MC', 'mez', 64, 40], ['WM', 'wm', 88, 38], ['ST', 'cf', 50, 12]],
};
const ROLE_BY_ID = Object.fromEntries(ROLES.map(r => [r.id, r]));

function bestXI(players, formation) {
  const slots = FORMATIONS[formation] || FORMATIONS['4-3-3'];
  const cand = [];
  slots.forEach((s, i) => {
    const role = ROLE_BY_ID[s[1]];
    for (const p of players) {
      const fam = familiarity(p, s[0]);
      cand.push({ i, p, score: roleScore(p, role) * fam, raw: roleScore(p, role), fam });
    }
  });
  cand.sort((a, b) => b.score - a.score);
  const used = new Set(), filled = {};
  for (const c of cand) {
    if (filled[c.i] || used.has(c.p.id)) continue;
    filled[c.i] = c; used.add(c.p.id);
    if (Object.keys(filled).length === slots.length) break;
  }
  const xi = slots.map((s, i) => ({ pos: s[0], role: ROLE_BY_ID[s[1]].name, roleId: s[1], x: s[2], y: s[3], pick: filled[i] ? { id: filled[i].p.id, name: filled[i].p.name, score: Math.round(filled[i].score * 10) / 10, natural: filled[i].fam === 1, age: filled[i].p.age, ca: filled[i].p.ca } : null }));
  // Cadangan: per slot, pemain terbaik berikutnya
  const bench = [];
  slots.forEach((s, i) => {
    const alt = cand.find(c => c.i === i && !used.has(c.p.id) && !bench.some(b => b.id === c.p.id));
    if (alt) bench.push({ id: alt.p.id, name: alt.p.name, for: s[0], score: Math.round(alt.score * 10) / 10 });
  });
  const avg = xi.reduce((t, s) => t + (s.pick ? s.pick.score : 0), 0) / xi.length;
  return { formation, xi, bench: bench.slice(0, 9), strength: Math.round(avg * 10) / 10 };
}

module.exports = { ATTR_LABEL, GROUPS, POSITIONS, POS_OF, ROLES, STAFF_LABEL, STAFF_GROUPS, JOB_LABEL, STAFF_ROLES, FORMATIONS,
  positionRatings, bestPosition, allRoles, roleScore, personality, familiarity, staffScore, staffBest, bestXI, weighted };
