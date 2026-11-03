const { z } = require('zod');
const { email, telephone, password, nom, token } = require('./common');

const register = z.object({
  nom,
  prenom: nom,
  email,
  telephone,
  password,
  adresse: z.string().trim().max(255).optional(),
});

// identifiant = email ou numero de telephone
const login = z.object({
  identifiant: z.string().trim().min(1, 'Email ou telephone requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const changePassword = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: password,
});

const forgotPassword = z.object({ email });

const resetPassword = z.object({ token, password });

const acceptInvitation = z.object({ token, password });

module.exports = { register, login, changePassword, forgotPassword, resetPassword, acceptInvitation };
