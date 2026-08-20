const config = require('../config');
const { createSqliteRepository } = require('./sqlite');
const { createSqlServerRepository } = require('./sqlserver');

async function createRepository() {
  if (config.dbProvider === 'sqlserver') return createSqlServerRepository(config.sql);
  return createSqliteRepository(config.sqlitePath);
}

module.exports = { createRepository };
