const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
  }
  return transporter;
}

// Sans SMTP configure (dev), l'email est simplement affiche dans la console
async function sendMail({ to, subject, text }) {
  const smtp = getTransporter();
  if (!smtp) {
    console.log(`[email non envoye : SMTP non configure]\nA : ${to}\nObjet : ${subject}\n\n${text}\n`);
    return false;
  }
  await smtp.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
  return true;
}

function frontUrl(path) {
  return `${(process.env.FRONT_URL || 'http://localhost:3000').replace(/\/$/, '')}${path}`;
}

function invitationLink(token) {
  return frontUrl(`/invitation?token=${encodeURIComponent(token)}`);
}

function sendInvitation(user, token) {
  return sendMail({
    to: user.email,
    subject: 'Bienvenue sur AlloProf - activez votre compte professeur',
    text: [
      `Bonjour ${user.prenom},`,
      '',
      'Votre compte professeur AlloProf a ete cree.',
      'Cliquez sur ce lien pour choisir votre mot de passe (valable 7 jours) :',
      invitationLink(token),
      '',
      "L'equipe AlloProf",
    ].join('\n'),
  });
}

function sendPasswordReset(user, token) {
  return sendMail({
    to: user.email,
    subject: 'AlloProf - reinitialisation de votre mot de passe',
    text: [
      `Bonjour ${user.prenom},`,
      '',
      'Pour choisir un nouveau mot de passe, cliquez sur ce lien (valable 1 heure) :',
      frontUrl(`/reset-password?token=${encodeURIComponent(token)}`),
      '',
      "Si vous n'etes pas a l'origine de cette demande, ignorez cet email.",
    ].join('\n'),
  });
}

module.exports = { sendInvitation, sendPasswordReset, invitationLink };
