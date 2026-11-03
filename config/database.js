require('dotenv').config({ quiet: true });

// Utilise a la fois par l'application (models/index.js) et par sequelize-cli (.sequelizerc)
const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  dialect: 'mysql',
  timezone: process.env.DB_TIMEZONE || '+01:00',
  logging: false,
  define: {
    underscored: true,
    freezeTableName: true,
    timestamps: false,
  },
};

module.exports = {
  development: { ...base, logging: process.env.DB_LOGGING === 'true' ? console.log : false },
  test: { ...base, database: process.env.DB_NAME_TEST || `${process.env.DB_NAME}_test` },
  production: base,
};
