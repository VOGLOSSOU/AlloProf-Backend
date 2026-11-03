const request = require('supertest');
const app = require('../app');
const models = require('../models');

afterAll(() => models.sequelize.close());

describe('API', () => {
  it("GET / affiche un message d'accueil", async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: "Bienvenue sur l'API AlloProf", statut: 'en ligne', sante: '/api/health' });
  });

  it('GET /api/health repond ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('renvoie 404 en JSON sur une route inconnue', async () => {
    const res = await request(app).get('/api/inexistante');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Route introuvable/);
  });

  it('renvoie 400 sur un JSON mal forme', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{mauvais json');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('JSON invalide');
  });
});

describe('Modeles', () => {
  it('charge les 13 modeles et leurs associations', () => {
    const { Professeur, Demande, Assignation, User, Seance } = models;
    expect(Object.keys(Professeur.associations)).toEqual(
      expect.arrayContaining(['user', 'specialites', 'villes', 'niveaux', 'assignations']),
    );
    expect(Object.keys(Demande.associations)).toEqual(
      expect.arrayContaining(['client', 'ville', 'niveau', 'admin', 'specialites', 'assignations']),
    );
    expect(Object.keys(Assignation.associations)).toEqual(
      expect.arrayContaining(['demande', 'professeur', 'creneaux', 'seances', 'paiements']),
    );
    expect(User.getAttributes().passwordHash.field).toBe('password_hash');
    expect(Seance.getAttributes().dateSeance.field).toBe('date_seance');
  });

  it('les tables de liaison utilisent les bonnes colonnes', () => {
    const through = models.Professeur.associations.specialites.through.model;
    expect(through.getTableName()).toBe('professeur_specialites');
    expect(Object.values(through.getAttributes()).map((a) => a.field).sort())
      .toEqual(['professeur_id', 'specialite_id']);
  });

  it('ne serialise jamais le hash du mot de passe ni le code secret', () => {
    const user = models.User.build({ email: 'a@b.c', passwordHash: 'hash' });
    const seance = models.Seance.build({ codeSecret: '123456' });
    expect(user.toJSON()).not.toHaveProperty('passwordHash');
    expect(seance.toJSON()).not.toHaveProperty('codeSecret');
  });
});
