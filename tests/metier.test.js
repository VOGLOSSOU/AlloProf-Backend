const models = require('../models');
const { daysOfMonth, addMonths, monthBounds, timeToMinutes } = require('../utils/dates');
const { overlaps, assertNoInternalOverlap } = require('../services/planningService');
const { montantDu, buildRecap } = require('../services/paiementService');
const assignationSchemas = require('../validators/assignation');

afterAll(() => models.sequelize.close());

describe('dates', () => {
  it('liste les jours du mois avec le jour de semaine ISO', () => {
    const jours = daysOfMonth({ annee: 2026, mois: 11 });
    expect(jours).toHaveLength(30);
    expect(jours[0]).toEqual({ date: '2026-11-01', jourSemaine: 7 }); // dimanche
    expect(jours[1]).toEqual({ date: '2026-11-02', jourSemaine: 1 }); // lundi
  });

  it('gere les annees bissextiles et le passage d annee', () => {
    expect(daysOfMonth({ annee: 2028, mois: 2 })).toHaveLength(29);
    expect(addMonths({ annee: 2026, mois: 12 }, 1)).toEqual({ annee: 2027, mois: 1 });
    expect(monthBounds({ annee: 2027, mois: 2 })).toEqual({ debut: '2027-02-01', fin: '2027-02-28' });
    expect(timeToMinutes('09:30:00')).toBe(570);
  });
});

describe('planning', () => {
  const c = (jourSemaine, heureDebut, heureFin) => ({ jourSemaine, heureDebut, heureFin });

  it('detecte les chevauchements sur le meme jour uniquement', () => {
    expect(overlaps(c(1, '10:00:00', '12:00:00'), c(1, '11:00:00', '13:00:00'))).toBe(true);
    expect(overlaps(c(1, '10:00:00', '12:00:00'), c(1, '12:00:00', '14:00:00'))).toBe(false); // bout a bout
    expect(overlaps(c(1, '10:00:00', '12:00:00'), c(2, '10:00:00', '12:00:00'))).toBe(false);
  });

  it('refuse un planning qui se chevauche', () => {
    expect(() => assertNoInternalOverlap([c(3, '08:00:00', '10:00:00'), c(3, '09:00:00', '11:00:00')]))
      .toThrow(/mercredi 08:00-10:00/);
    expect(() => assertNoInternalOverlap([c(3, '08:00:00', '10:00:00'), c(5, '08:00:00', '10:00:00')])).not.toThrow();
  });

  it('valide et normalise les creneaux recus', () => {
    const parsed = assignationSchemas.replaceCreneaux.parse({ creneaux: [{ jourSemaine: '2', heureDebut: '08:00', heureFin: '10:30' }] });
    expect(parsed.creneaux[0]).toEqual({ jourSemaine: 2, heureDebut: '08:00:00', heureFin: '10:30:00' });
    expect(assignationSchemas.replaceCreneaux.safeParse({ creneaux: [{ jourSemaine: 1, heureDebut: '10:00', heureFin: '09:00' }] }).success).toBe(false);
  });
});

describe('paiements', () => {
  const realise = { seancesEffectuees: 3, minutesEffectuees: 270 };

  it('calcule le montant du selon l unite du tarif (en centimes)', () => {
    expect(montantDu('SEANCE', '5000.00', realise)).toBe(1500000);
    expect(montantDu('HEURE', '3000.00', realise)).toBe(1350000); // 4h30
    expect(montantDu('MOIS', '40000.00', realise)).toBe(4000000);
  });

  it('construit le recap du mois', () => {
    const assignation = { uniteTarif: 'SEANCE', tarifClient: '5000.00', tarifProf: '3500.00' };
    const seances = [
      { statut: 'EFFECTUEE', heureDebut: '10:00:00', heureFin: '12:00:00' },
      { statut: 'EFFECTUEE', heureDebut: '10:00:00', heureFin: '11:30:00' },
      { statut: 'MANQUEE', heureDebut: '10:00:00', heureFin: '12:00:00' },
      { statut: 'ANNULEE', heureDebut: '10:00:00', heureFin: '12:00:00' },
    ];
    const paiements = [
      { sens: 'CLIENT_VERS_ADMIN', statut: 'PAYE', montant: '6000.00' },
      { sens: 'CLIENT_VERS_ADMIN', statut: 'EN_ATTENTE', montant: '4000.00' },
      { sens: 'ADMIN_VERS_PROF', statut: 'PAYE', montant: '7000.00' },
    ];

    const recap = buildRecap(assignation, { annee: 2020, mois: 1 }, seances, paiements);

    expect(recap.seances).toEqual({ prevues: 0, effectuees: 2, manquees: 1, annulees: 1, heuresEffectuees: 3.5 });
    expect(recap.client).toEqual({ du: 10000, paye: 6000, enAttente: 4000, reste: 4000 });
    expect(recap.prof).toEqual({ du: 7000, paye: 7000, enAttente: 0, reste: 0 });
    expect(recap.marge).toBe(3000);
    expect(recap.moisComplet).toBe(true);
  });
});
