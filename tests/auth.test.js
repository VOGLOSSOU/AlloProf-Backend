// Tests sans base de donnees : les acces Sequelize sont simules avec jest.spyOn
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const models = require('../models');
const { hashPassword } = require('../utils/password');
const { signAccessToken } = require('../services/tokenService');

const { User, UserToken } = models;

let passwordHash;

function buildUser(overrides = {}) {
  return User.build({
    id: 1,
    role: 'CLIENT',
    nom: 'Doe',
    prenom: 'Jane',
    email: 'jane@example.com',
    telephone: '+22997000000',
    passwordHash,
    statut: 'ACTIF',
    ...overrides,
  });
}

function bearer(user) {
  return `Bearer ${signAccessToken(user)}`;
}

beforeAll(async () => {
  passwordHash = await hashPassword('motdepasse123');
});

afterEach(() => jest.restoreAllMocks());

afterAll(() => models.sequelize.close());

describe('POST /api/auth/register', () => {
  it('refuse des donnees invalides avec le detail des champs', async () => {
    const res = await request(app).post('/api/auth/register').send({
      nom: 'Doe', prenom: 'Jane', email: 'pas-un-email', telephone: '12', password: 'court',
    });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.champ).sort()).toEqual(['email', 'password', 'telephone']);
  });
});

describe('POST /api/auth/login', () => {
  it('renvoie 401 si le compte est inconnu', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login').send({ identifiant: 'x@y.z', password: 'motdepasse123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Identifiants incorrects');
  });

  it('renvoie 401 si le mot de passe est faux', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(buildUser());
    const res = await request(app).post('/api/auth/login').send({ identifiant: 'jane@example.com', password: 'mauvais' });
    expect(res.status).toBe(401);
  });

  it("renvoie 401 pour un prof qui n'a pas encore active son compte", async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(buildUser({ role: 'PROFESSEUR', passwordHash: null }));
    const res = await request(app).post('/api/auth/login').send({ identifiant: 'jane@example.com', password: 'motdepasse123' });
    expect(res.status).toBe(401);
  });

  it('renvoie 403 si le compte est suspendu', async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(buildUser({ statut: 'SUSPENDU' }));
    const res = await request(app).post('/api/auth/login').send({ identifiant: 'jane@example.com', password: 'motdepasse123' });
    expect(res.status).toBe(403);
  });

  it('connecte par email et renvoie un JWT sans le hash du mot de passe', async () => {
    const user = buildUser();
    const findOne = jest.spyOn(User, 'findOne').mockResolvedValue(user);
    jest.spyOn(User, 'findByPk').mockResolvedValue(user);

    const res = await request(app).post('/api/auth/login').send({ identifiant: 'Jane@Example.com', password: 'motdepasse123' });

    expect(res.status).toBe(200);
    expect(findOne.mock.calls[0][0].where).toEqual({ email: 'jane@example.com' });
    expect(jwt.decode(res.body.token)).toMatchObject({ sub: '1', role: 'CLIENT' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('connecte par telephone en normalisant le format', async () => {
    const user = buildUser();
    const findOne = jest.spyOn(User, 'findOne').mockResolvedValue(user);
    jest.spyOn(User, 'findByPk').mockResolvedValue(user);

    const res = await request(app).post('/api/auth/login').send({ identifiant: '+229 97 00-00-00', password: 'motdepasse123' });

    expect(res.status).toBe(200);
    expect(findOne.mock.calls[0][0].where).toEqual({ telephone: '+22997000000' });
  });
});

describe('Middleware authenticate', () => {
  it('renvoie 401 sans jeton', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('renvoie 401 avec un jeton invalide', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer nimporte.quoi.ici');
    expect(res.status).toBe(401);
  });

  it("renvoie l'utilisateur connecte avec un jeton valide", async () => {
    const user = buildUser();
    jest.spyOn(User, 'findByPk').mockResolvedValue(user);
    const res = await request(app).get('/api/auth/me').set('Authorization', bearer(user));
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('jane@example.com');
  });

  it('refuse un jeton emis avant le dernier changement de mot de passe', async () => {
    const user = buildUser();
    const token = signAccessToken(user);
    jest.spyOn(User, 'findByPk').mockResolvedValue(
      buildUser({ passwordChangedAt: new Date(Date.now() + 5000) }),
    );
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('renvoie 403 si le compte a ete suspendu depuis la connexion', async () => {
    const user = buildUser();
    jest.spyOn(User, 'findByPk').mockResolvedValue(buildUser({ statut: 'SUSPENDU' }));
    const res = await request(app).get('/api/auth/me').set('Authorization', bearer(user));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/auth/password/forgot', () => {
  it("repond pareil que l'email existe ou non", async () => {
    jest.spyOn(User, 'findOne').mockResolvedValue(null);
    const res = await request(app).post('/api/auth/password/forgot').send({ email: 'inconnu@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Si un compte existe/);
  });
});

describe('POST /api/auth/invitation/accept', () => {
  it('refuse un jeton inconnu', async () => {
    jest.spyOn(models.sequelize, 'transaction').mockImplementation((fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
    jest.spyOn(UserToken, 'findOne').mockResolvedValue(null);
    const res = await request(app).post('/api/auth/invitation/accept').send({ token: 'abc', password: 'motdepasse123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Lien invalide ou expire');
  });

  it('refuse un jeton expire', async () => {
    jest.spyOn(models.sequelize, 'transaction').mockImplementation((fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
    jest.spyOn(UserToken, 'findOne').mockResolvedValue(
      UserToken.build({ userId: 1, type: 'INVITATION', expiresAt: new Date(Date.now() - 1000) }),
    );
    const res = await request(app).post('/api/auth/invitation/accept').send({ token: 'abc', password: 'motdepasse123' });
    expect(res.status).toBe(400);
  });
});

describe('findUserWithProfile', () => {
  it('joint chaque referentiel du prof via sa propre table de liaison', async () => {
    const { findUserWithProfile } = require('../controllers/authController');
    const query = jest.spyOn(models.sequelize, 'query').mockResolvedValue(null);
    await findUserWithProfile(1);
    await findUserWithProfile(1);
    for (const [sql] of query.mock.calls) {
      expect(sql).toMatch(/JOIN `specialites`[^)]*professeur_specialites`\.`specialite_id`/);
      expect(sql).toMatch(/JOIN `villes`[^)]*professeur_villes`\.`ville_id`/);
      expect(sql).toMatch(/JOIN `niveaux`[^)]*professeur_niveaux`\.`niveau_id`/);
    }
  });
});

describe('Routes /api/admin', () => {
  it('sont interdites aux non-admins', async () => {
    const client = buildUser();
    jest.spyOn(User, 'findByPk').mockResolvedValue(client);
    const res = await request(app).post('/api/admin/professeurs').set('Authorization', bearer(client)).send({});
    expect(res.status).toBe(403);
  });

  it("valident le corps de la creation d'un prof", async () => {
    const admin = buildUser({ role: 'ADMIN' });
    jest.spyOn(User, 'findByPk').mockResolvedValue(admin);
    const res = await request(app)
      .post('/api/admin/professeurs')
      .set('Authorization', bearer(admin))
      .send({ nom: 'Prof', prenom: 'Test', email: 'prof@example.com', telephone: '+22990000000', specialiteIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.champ).sort()).toEqual(['niveauIds', 'specialiteIds', 'villeIds']);
  });
});
