'use strict';
// Panduan rekrutmen per posisi: atribut kunci + alasan + standar minimum per level (skala FM 1-20).

const TIERS = [
  { id: 'dunia', name: 'Kelas Dunia', desc: 'Pemain inti klub Liga Champions / timnas papan atas', key: 16, imp: 14, ca: 165 },
  { id: 'elite', name: 'Elite', desc: 'Pemain inti klub papan atas 5 liga top Eropa', key: 15, imp: 13, ca: 150 },
  { id: 'atas', name: 'Papan Atas', desc: 'Inti klub Premier League papan tengah / promosi Championship', key: 13, imp: 12, ca: 135 },
  { id: 'menengah', name: 'Menengah', desc: 'Rotasi Championship / inti League One', key: 11, imp: 10, ca: 115 },
];

// Standar talenta muda (≤21 th) yang berpeluang menjadi kelas dunia
const YOUTH = {
  pa: 170,
  keyAt18: 12,
  mental: [['Determination', 15], ['professionalism', 15], ['ambition', 14]],
  note: 'Untuk potensi kelas dunia: PA minimal 170, atribut kunci sudah ≥12 di usia 17–18, dan kepribadian kuat (Tekad ≥15, Profesionalisme ≥15, Ambisi ≥14). Atribut fisik bawaan (Kecepatan, Akselerasi, Kelincahan) sulit naik setelah usia ±24, jadi pastikan sudah ≥13 sejak muda. Kebugaran Alami tinggi membuat pemain berkembang lebih stabil dan menua lebih lambat.',
};

const G = {
  GK: {
    name: 'Kiper', match: ['GK'],
    key: [['Reflexes', 'Refleks menentukan seberapa banyak tembakan jarak dekat yang bisa diselamatkan; atribut terpenting kiper.'],
      ['Handling', 'Tangkapan yang aman mencegah bola muntah yang berujung gol.'],
      ['OneOnOnes', 'Menghadapi penyerang yang lolos — sangat sering terjadi di FM modern.'],
      ['Positioning', 'Posisi yang benar membuat penyelamatan terlihat mudah dan mengurangi gol dari sudut sempit.'],
      ['AerialReach', 'Menguasai bola silang dan sepak pojok.']],
    imp: ['CommandOfArea', 'Communication', 'Concentration', 'Decisions', 'Agility', 'Kicking', 'Composure'],
    tips: 'Untuk taktik membangun dari belakang, cari juga Mengoper, Kontrol Pertama, dan Ketenangan ≥13 (Kiper Penyapu). Eksentrik tinggi = sering keluar sarang secara berisiko.',
  },
  DC: {
    name: 'Bek Tengah', match: ['DC'],
    key: [['Positioning', 'Posisi adalah pertahanan pertama: menutup ruang sebelum tekel dibutuhkan.'],
      ['Marking', 'Mengawal penyerang di kotak penalti, terutama saat bola mati.'],
      ['Tackling', 'Merebut bola bersih tanpa pelanggaran/kartu.'],
      ['Heading', 'Memenangkan duel udara melawan target man dan umpan silang.'],
      ['JumpingReach', 'Menentukan siapa yang sampai lebih dulu di bola udara (dipadukan dengan Sundulan).'],
      ['Anticipation', 'Membaca umpan terobosan sebelum terjadi — memotong bola, bukan mengejar.']],
    imp: ['Strength', 'Concentration', 'Decisions', 'Bravery', 'Composure', 'Pace'],
    tips: 'Garis pertahanan tinggi WAJIB Kecepatan & Akselerasi ≥14. Untuk Bek Pengatur Bola tambahkan Mengoper, Ketenangan, dan Visi ≥13. Konsentrasi rendah = kesalahan fatal di menit akhir.',
  },
  FB: {
    name: 'Bek Kiri / Kanan (LB/RB)', match: ['DL', 'DR'],
    key: [['Tackling', 'Menghentikan winger satu lawan satu di sisi lapangan.'],
      ['Positioning', 'Tidak terjebak terlalu maju; menutup tiang jauh saat bola di sisi lain.'],
      ['Pace', 'Mengejar winger cepat dan kembali bertahan setelah overlap.'],
      ['Acceleration', 'Reaksi beberapa langkah pertama — penting melawan winger yang menggiring.'],
      ['Stamina', 'Naik-turun sepanjang 90 menit tanpa kehabisan tenaga.'],
      ['WorkRate', 'Kemauan kembali bertahan setelah ikut menyerang.']],
    imp: ['Marking', 'Crossing', 'Anticipation', 'Concentration', 'Teamwork', 'Passing', 'Decisions'],
    tips: 'Bek sayap menyerang: tambahkan Umpan Silang & Menggiring ≥13. Bek sayap inverted (masuk ke tengah): Mengoper, Ketenangan, Keputusan, Kontrol Pertama ≥13. Kaki kiri untuk LB memudahkan umpan silang.',
  },
  WB: {
    name: 'Wing Back', match: ['WBL', 'WBR'],
    key: [['Stamina', 'Wing back menutup seluruh sisi lapangan — stamina adalah syarat mutlak.'],
      ['WorkRate', 'Turun bertahan setiap kali bola hilang.'],
      ['Crossing', 'Sumber utama umpan silang di formasi 3 bek.'],
      ['Pace', 'Overlap cepat dan recovery run.'],
      ['Acceleration', 'Melewati lawan dalam jarak pendek.'],
      ['Dribbling', 'Membawa bola ke sepertiga akhir.']],
    imp: ['Tackling', 'OffTheBall', 'Teamwork', 'Technique', 'Positioning', 'Decisions', 'Agility'],
    tips: 'Kebugaran Alami ≥14 membantu bermain penuh tiap pekan. Untuk wing back inverted, prioritaskan Mengoper & Keputusan.',
  },
  DM: {
    name: 'Gelandang Bertahan (DM)', match: ['DM'],
    key: [['Anticipation', 'Membaca permainan dan memotong umpan sebelum sampai.'],
      ['Positioning', 'Menjaga ruang di depan bek tengah (zona 14).'],
      ['Tackling', 'Merebut bola di lini tengah.'],
      ['Teamwork', 'Menjaga struktur saat rekan maju menyerang.'],
      ['Concentration', 'Tidak lengah saat transisi.'],
      ['Decisions', 'Kapan menekan, kapan menahan posisi.']],
    imp: ['Marking', 'Passing', 'Stamina', 'Strength', 'Composure', 'WorkRate'],
    tips: 'Pengatur serangan dalam (DLP/Regista): Mengoper, Visi, Kontrol Pertama, Ketenangan ≥15. Perebut bola: Agresi, Etos Kerja, Stamina tinggi.',
  },
  MC: {
    name: 'Gelandang Tengah (MC)', match: ['MC'],
    key: [['Passing', 'Mengalirkan bola dari belakang ke depan — inti gelandang.'],
      ['Decisions', 'Memilih opsi terbaik di bawah tekanan.'],
      ['FirstTouch', 'Menerima bola di ruang sempit tanpa kehilangan.'],
      ['Teamwork', 'Bergerak sesuai instruksi taktik.'],
      ['WorkRate', 'Menekan dan menutup ruang.'],
      ['Stamina', 'Lini tengah berlari paling jauh.']],
    imp: ['Vision', 'Technique', 'Composure', 'Anticipation', 'Tackling', 'OffTheBall'],
    tips: 'Box-to-box: Stamina, Etos Kerja, Tanpa Bola, Tendangan Jarak Jauh. Mezzala / channel: Menggiring, Tanpa Bola, Teknik. Untuk tim penguasaan bola, Mengoper & Visi ≥16 di level kelas dunia.',
  },
  WM: {
    name: 'Gelandang Sayap (ML/MR)', match: ['ML', 'MR'],
    key: [['Crossing', 'Umpan silang dari garis tepi.'],
      ['WorkRate', 'Membantu bek sayap saat bertahan.'],
      ['Stamina', 'Bolak-balik sepanjang sisi lapangan.'],
      ['Passing', 'Kombinasi dengan bek sayap dan gelandang.'],
      ['Teamwork', 'Disiplin menjaga lebar formasi.']],
    imp: ['Dribbling', 'Pace', 'Acceleration', 'Decisions', 'OffTheBall', 'Tackling'],
    tips: 'Di FM modern pemain sayap lini tengah sering lebih efektif di AML/AMR; cek juga rating Penyerang Sayap-nya.',
  },
  AMC: {
    name: 'Gelandang Serang (AMC)', match: ['AMC'],
    key: [['Vision', 'Melihat umpan kunci yang tidak terlihat pemain lain.'],
      ['Passing', 'Mengeksekusi umpan terobosan.'],
      ['FirstTouch', 'Menerima bola di antara lini.'],
      ['Technique', 'Kualitas eksekusi umpan, tembakan, dan giringan.'],
      ['OffTheBall', 'Menemukan ruang di antara lini lawan.'],
      ['Composure', 'Tetap tenang di sepertiga akhir.']],
    imp: ['Decisions', 'Dribbling', 'Flair', 'Anticipation', 'LongShots', 'Agility', 'Finishing'],
    tips: 'Penyerang bayangan (shadow striker): Penyelesaian, Tanpa Bola, Antisipasi lebih penting daripada Visi.',
  },
  W: {
    name: 'Penyerang Sayap (AML/AMR)', match: ['AML', 'AMR'],
    key: [['Acceleration', 'Atribut paling berpengaruh di mesin pertandingan FM untuk pemain sayap.'],
      ['Pace', 'Berlari melewati bek di ruang terbuka.'],
      ['Dribbling', 'Melewati lawan satu lawan satu.'],
      ['Technique', 'Kualitas sentuhan saat berlari cepat.'],
      ['OffTheBall', 'Lari ke belakang garis pertahanan.'],
      ['FirstTouch', 'Mengontrol umpan panjang sambil berlari.']],
    imp: ['Crossing', 'Agility', 'Flair', 'Composure', 'Finishing', 'Decisions'],
    tips: 'Winger klasik (kaki sama dengan sisi): Umpan Silang tinggi. Inside forward (kaki berlawanan): Penyelesaian, Ketenangan, Tendangan Jarak Jauh ≥14.',
  },
  ST: {
    name: 'Penyerang (ST)', match: ['ST'],
    key: [['Finishing', 'Mengubah peluang menjadi gol.'],
      ['Composure', 'Tenang saat berhadapan dengan kiper.'],
      ['OffTheBall', 'Pergerakan untuk mendapatkan peluang.'],
      ['Anticipation', 'Tiba lebih dulu di bola muntah dan umpan silang.'],
      ['Acceleration', 'Lari ke belakang bek — sangat dominan di mesin pertandingan FM.'],
      ['FirstTouch', 'Mengontrol bola di kotak penalti.']],
    imp: ['Pace', 'Dribbling', 'Technique', 'Decisions', 'Heading', 'Strength', 'Balance'],
    tips: 'Target man: Sundulan, Lompatan, Kekuatan ≥15. False 9 / penyerang komplet: Mengoper, Visi, Teknik ≥14. Poacher cukup fokus pada Penyelesaian, Ketenangan, Tanpa Bola, Antisipasi.',
  },
};

function forPosition(pos, label) {
  const g = G[pos];
  if (!g) return null;
  return {
    pos, name: g.name, tips: g.tips,
    key: g.key.map(([k, why]) => ({ k, label: label[k] || k, why })),
    imp: g.imp.map(k => ({ k, label: label[k] || k })),
    tiers: TIERS, youth: YOUTH,
  };
}

// Bandingkan pemain dengan standar: tier tertinggi yang terpenuhi + kekurangan
function assess(p, pos, label) {
  const g = G[pos]; if (!g) return null;
  const a = p.attrs || {};
  const keys = g.key.map(x => x[0]);
  let reached = null;
  for (const t of TIERS) {
    const okKey = keys.every(k => (a[k] || 0) >= t.key);
    const okImp = g.imp.filter(k => (a[k] || 0) >= t.imp).length >= Math.ceil(g.imp.length * 0.6);
    if (okKey && okImp) { reached = t; break; }
  }
  const target = TIERS[0];
  const gaps = keys.filter(k => (a[k] || 0) < target.key).map(k => ({ k, label: label[k] || k, v: a[k] || 0, need: target.key }));
  return { pos, posName: g.name, tier: reached ? reached.name : 'Di bawah standar', tierId: reached ? reached.id : null, gaps };
}

// Tangga rekrutmen per usia — patokan minimum untuk SEMUA posisi (atribut kunci posisi tsb.)
// keyMin = atribut kunci (boleh 1 yang meleset), det/prof = Tekad & Profesionalisme minimal.
const LADDER = [
  { id: 'L0', name: 'Regen', age: [15, 17], pa: 150, paTop: 170, ca: 80, keyMin: 9, det: 13, prof: 12, tip: 'Cari potensi, bukan kemampuan sekarang. PA ≥150 = calon pemain inti; ≥170 = calon kelas dunia. Tekad & Profesionalisme tinggi = berkembang cepat.' },
  { id: 'L1', name: 'Muda', age: [18, 19], pa: 155, paTop: 172, ca: 105, keyMin: 11, det: 13, prof: 12, tip: 'Mulai terlihat di atribut kunci. Pinjamkan ke liga level menengah kalau belum dapat menit bermain.' },
  { id: 'L2', name: 'Berkembang', age: [20, 21], pa: 160, paTop: 175, ca: 120, keyMin: 12, det: 12, prof: 11, tip: 'Sudah layak rotasi tim utama. Atribut kunci ≥12 dengan sisa jarak ke PA masih besar.' },
  { id: 'L3', name: 'Siap Pakai', age: [22, 24], pa: 0, paTop: 0, ca: 140, keyMin: 14, det: 0, prof: 0, tip: 'Langsung jadi pemain inti klub papan atas. Fisik (Kecepatan/Akselerasi) masih bisa sedikit naik.' },
  { id: 'L4', name: 'Puncak', age: [25, 29], pa: 0, paTop: 0, ca: 155, keyMin: 15, det: 0, prof: 0, tip: 'Usia emas. Harga mahal tapi performa langsung — pilih yang Konsistensi & Laga Penting tinggi.' },
  { id: 'L5', name: 'Veteran', age: [30, 45], pa: 0, paTop: 0, ca: 150, keyMin: 15, det: 0, prof: 0, nf: 14, tip: 'Kontrak pendek & gaji efisien. Kebugaran Alami ≥14 agar penurunan fisik lambat.' },
];
module.exports = { G, TIERS, YOUTH, LADDER, forPosition, assess };
