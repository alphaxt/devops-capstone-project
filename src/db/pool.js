const { Pool } = require("pg");

function createPool(databaseConfig) {
  return new Pool({
    host: databaseConfig.host,
    port: databaseConfig.port,
    user: databaseConfig.user,
    password: databaseConfig.password,
    database: databaseConfig.database,
    max: databaseConfig.max,
    idleTimeoutMillis: databaseConfig.idleTimeoutMillis,
    connectionTimeoutMillis: databaseConfig.connectionTimeoutMillis,
  });
}

function createDatabaseHealthCheck(pool, timeoutMillis = 3000) {
  return async function checkDatabaseHealth() {
    await pool.query({
      text: "SELECT 1",
      query_timeout: timeoutMillis,
    });
  };
}

module.exports = { createPool, createDatabaseHealthCheck };
