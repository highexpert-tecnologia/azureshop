const path = require('node:path');
require('dotenv').config();

const root = path.resolve(__dirname, '..');

module.exports = {
  port: Number(process.env.PORT || 3000),
  environment: process.env.APP_ENV || 'development',
  dbProvider: process.env.DB_PROVIDER || 'sqlite',
  sqlitePath: path.resolve(root, process.env.SQLITE_PATH || './data/loja.db'),
  sql: {
    server: process.env.AZURE_SQL_SERVER,
    database: process.env.AZURE_SQL_DATABASE,
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    auth: process.env.AZURE_SQL_AUTH || 'sql'
  },
  aiEnabled: process.env.AI_ENABLED === 'true',
  ai: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-10-21'
  }
};
