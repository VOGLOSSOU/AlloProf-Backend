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

module.exports = { email, telephone, password, nom, ids, token };
