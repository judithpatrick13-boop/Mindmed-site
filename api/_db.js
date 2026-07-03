const { neon } = require('@neondatabase/serverless');

function getDb() {
  const connStr =
    process.env.STORAGE_DATABASE_URL ||
    process.env.STORAGE_POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.STORAGE_URL;

  if (!connStr) {
    throw new Error('No database connection string found in environment variables.');
  }
  return neon(connStr);
}

module.exports = { getDb };
