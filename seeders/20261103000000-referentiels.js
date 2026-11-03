'use strict';

// Referentiels de depart (modifiables ensuite par l'admin)
const villes = ['Cotonou', 'Abomey-Calavi', 'Porto-Novo', 'Parakou'];

const specialites = [
  'Mathematiques', 'Physique-Chimie', 'SVT', 'Francais', 'Anglais',
  'Philosophie', 'Histoire-Geographie', 'Informatique',
];

const niveaux = [
  'CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2',
  '6e', '5e', '4e', '3e', '2nde', '1ere', 'Terminale', 'Universite',
];

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('villes', villes.map((nom) => ({ nom })), { ignoreDuplicates: true });
    await queryInterface.bulkInsert('specialites', specialites.map((libelle) => ({ libelle })), { ignoreDuplicates: true });
    await queryInterface.bulkInsert(
      'niveaux',
      niveaux.map((libelle, index) => ({ libelle, ordre: (index + 1) * 10 })),
      { ignoreDuplicates: true },
    );
  },

  async down(queryInterface, Sequelize) {
    const { Op } = Sequelize;
    await queryInterface.bulkDelete('niveaux', { libelle: { [Op.in]: niveaux } });
    await queryInterface.bulkDelete('specialites', { libelle: { [Op.in]: specialites } });
    await queryInterface.bulkDelete('villes', { nom: { [Op.in]: villes } });
  },
};
