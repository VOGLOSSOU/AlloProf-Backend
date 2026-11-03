const { z } = require('zod');

const email = z.string().trim().toLowerCase().pipe(z.email('Email invalide').max(190));

// On retire espaces, points et tirets : "+229 01 97-00-00-00" -> "+2290197000000"
const telephone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s.-]/g, ''))
  .pipe(z.string().regex(/^\+?\d{8,15}$/, 'Numero de telephone invalide'));

// bcrypt ignore tout au-dela de 72 octets
const password = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caracteres')
  .max(72, 'Le mot de passe ne doit pas depasser 72 caracteres');

const nom = z.string().trim().min(1, 'Champ obligatoire').max(100);

const ids = z
  .array(z.coerce.number().int().positive())
  .min(1, 'Au moins un element est requis')
  .transform((values) => [...new Set(values)]);

const token = z.string().trim().min(1, 'Jeton manquant');

const id = z.coerce.number().int().positive();

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ')
  .refine((value) => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().startsWith(value), 'Date invalide');

// 'HH:MM' ou 'HH:MM:SS' -> 'HH:MM:00'
const heure = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Heure attendue au format HH:MM')
  .transform((value) => `${value.slice(0, 5)}:00`);

const montant = z.coerce.number().min(0, 'Le montant doit etre positif').max(9999999999.99);

const periode = {
  annee: z.coerce.number().int().min(2000).max(2100),
  mois: z.coerce.number().int().min(1).max(12),
};

const texteOptionnel = (max) => z.string().trim().max(max).optional().nullable();

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

module.exports = {
  email, telephone, password, nom, ids, token, id, dateStr, heure, montant, periode, texteOptionnel, pagination,
};
