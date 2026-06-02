const knex = require('knex');
const getConfig = require('../knexfile');

let db = null;

const getDB = () => {
  if (!db) {
    const config = getConfig();
    db = knex(config);
  }
  return db;
};

const destroyDB = async () => {
  if (db) {
    await db.destroy();
    db = null;
  }
};

module.exports = { getDB, destroyDB };
