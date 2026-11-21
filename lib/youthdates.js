'use strict';
// Jendela youth intake per negara (hari/bulan), dari daftar FM26 Passion4FM — FM27 memakai kalender yang sama.
// Format: [awal, akhir] sebagai "DD/MM". Nama negara mengikuti nama di dump (bahasa Indonesia).
const D = {
  'Austria': ['03/03', '07/03'], 'Albania': ['08/04', '29/04'], 'Andorra': ['08/04', '20/04'], 'Azerbaijan': ['08/04', '27/04'],
  'Belarusia': ['05/10', '31/10'], 'Belgia': ['19/03', '16/04'], 'Bosnia & Herzegovina': ['08/04', '30/04'], 'Bulgaria': ['07/03', '16/04'],
  'Kroasia': ['09/03', '20/03'], 'Republik Ceko': ['19/03', '10/04'], 'Siprus': ['08/04', '30/04'], 'Denmark': ['19/03', '31/03'],
  'Inggris': ['14/03', '31/03'], 'Finlandia': ['03/09', '10/09'], 'Kepulauan Faroe': ['21/09', '30/09'], 'Prancis': ['09/03', '24/03'],
  'Jerman': ['09/03', '31/03'], 'Yunani': ['09/03', '10/03'], 'Gibraltar': ['09/03', '21/03'], 'Belanda': ['26/03', '31/03'],
  'Hungaria': ['09/03', '14/03'], 'Islandia': ['29/08', '26/09'], 'Irlandia': ['22/09', '30/09'], 'Israel': ['09/03', '27/03'],
  'Italia': ['19/03', '31/03'], 'Kosovo': ['08/04', '30/04'], 'Latvia': ['21/09', '30/09'], 'Lituania': ['21/09', '30/09'],
  'Luksemburg': ['08/04', '30/04'], 'Malta': ['08/04', '27/04'], 'Montenegro': ['08/04', '30/04'], 'Irlandia Utr': ['14/03', '30/03'],
  'Makedonia Utara': ['08/04', '30/04'], 'Norwegia': ['06/02', '15/02'], 'Polandia': ['17/03', '31/03'], 'Portugal': ['19/03', '31/03'],
  'Rumania': ['19/03', '27/03'], 'Rusia': ['01/03', '28/03'], 'San Marino': ['06/04', '23/04'], 'Skotlandia': ['14/03', '23/03'],
  'Serbia': ['05/03', '16/03'], 'Slowakia': ['18/03', '31/03'], 'Slovenia': ['20/03', '24/03'], 'Spanyol': ['29/03', '26/04'],
  'Swedia': ['14/09', '12/10'], 'Swiss': ['19/03', '22/03'], 'Turki': ['09/03', '18/03'], 'Ukraina': ['16/03', '31/03'], 'Wales': ['14/03', '19/03'],
  'Argentina': ['27/04', '30/04'], 'Bolivia': ['21/09', '30/09'], 'Brasil': ['22/09', '20/10'], 'Cile': ['21/09', '19/10'],
  'Kolombia': ['17/01', '31/01'], 'Ekuador': ['22/09', '19/10'], 'Paraguay': ['24/09', '25/09'], 'Peru': ['28/09', '03/10'],
  'Uruguay': ['18/01', '15/02'], 'Venezuela': ['21/09', '19/10'], 'Kanada': ['21/09', '21/09'], 'Kosta Rika': ['08/04', '21/04'],
  'Meksiko': ['28/02', '02/03'], 'AS': ['21/09', '23/09'], 'Afrika Selatan': ['03/04', '05/04'], 'Aljazair': ['08/04', '08/04'],
  'Mesir': ['08/04', '08/04'], 'Pantai Gading': ['08/04', '11/04'], 'Kenya': ['08/04', '08/04'], 'Senegal': ['08/04', '11/04'],
  'Australia': ['04/10', '04/10'], 'Tiongkok': ['05/10', '05/10'], 'India': ['18/04', '18/04'], 'Indonesia': ['04/07', '04/07'],
  'Jepang': ['05/10', '31/10'], 'Korea Selatan': ['15/09', '15/09'], 'Afganistan': ['21/09', '22/09'], 'Iran': ['08/04', '08/04'],
  'Irak': ['08/04', '09/04'], 'Selandia Baru': ['08/04', '08/04'], 'Qatar': ['08/04', '08/04'], 'Arab Saudi': ['09/03', '09/03'],
};
const md = s => { const [d, m] = s.split('/').map(Number); return { d, m }; };
// Hitung status youth intake untuk negara pada tanggal game (string YYYY-MM-DD).
function youthInfo(nation, gameDate) {
  const w = D[nation]; if (!w || !gameDate) return null;
  const today = new Date(gameDate + 'T00:00:00Z');
  const mk = (y, s) => { const { d, m } = md(s); return new Date(Date.UTC(y, m - 1, d)); };
  let y = today.getUTCFullYear(); let a = mk(y, w[0]), b = mk(y, w[1]); if (b < a) b = mk(y + 1, w[1]);
  if (today > b) { y++; a = mk(y, w[0]); b = mk(y, w[1]); if (b < a) b = mk(y + 1, w[1]); }
  const day = 86400000; const toStart = Math.round((a - today) / day);
  const phase = toStart > 0 ? (toStart <= 30 ? 'segera' : 'nanti') : 'berlangsung';
  const iso = x => x.toISOString().slice(0, 10);
  return { nation, start: iso(a), end: iso(b), daysToStart: toStart, phase };
}
module.exports = { youthInfo, YOUTH_DATES: D };
