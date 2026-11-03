// Dates manipulees en chaines 'YYYY-MM-DD' (colonnes DATE) pour eviter
// tout decalage de fuseau horaire. "Aujourd'hui" = date locale (TZ du .env).

const pad = (n) => String(n).padStart(2, '0');

function toDateStr(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function today() {
  return toDateStr(new Date());
}

function monthOf(dateStr) {
  const [annee, mois] = dateStr.split('-').map(Number);
  return { annee, mois };
}

function addMonths({ annee, mois }, n) {
  const index = annee * 12 + (mois - 1) + n;
  return { annee: Math.floor(index / 12), mois: (index % 12) + 1 };
}

function monthBounds({ annee, mois }) {
  const lastDay = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  return { debut: `${annee}-${pad(mois)}-01`, fin: `${annee}-${pad(mois)}-${pad(lastDay)}` };
}

// Tous les jours du mois avec leur jour de semaine ISO (1 = lundi ... 7 = dimanche)
function daysOfMonth({ annee, mois }) {
  const lastDay = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  const days = [];
  for (let d = 1; d <= lastDay; d += 1) {
    const weekday = new Date(Date.UTC(annee, mois - 1, d)).getUTCDay();
    days.push({ date: `${annee}-${pad(mois)}-${pad(d)}`, jourSemaine: weekday === 0 ? 7 : weekday });
  }
  return days;
}

// 'HH:MM' ou 'HH:MM:SS' -> minutes depuis minuit
function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

module.exports = { toDateStr, today, monthOf, addMonths, monthBounds, daysOfMonth, timeToMinutes };
