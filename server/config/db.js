const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const isLocalDatabase = /localhost|127\.0\.0\.1/.test(connectionString || '');
const forceSsl = process.env.PG_FORCE_SSL;

const ssl = forceSsl === 'true'
  ? { rejectUnauthorized: false }
  : forceSsl === 'false'
    ? false
    : isLocalDatabase
      ? false
      : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString,
  ssl
});

module.exports = pool;