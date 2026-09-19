function readInteger(name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }

  return value;
}

function readString(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

const config = Object.freeze({
  port: readInteger("PORT", 3000, { max: 65535 }),
  database: Object.freeze({
    host: readString("DB_HOST", "localhost"),
    port: readInteger("DB_PORT", 5432, { max: 65535 }),
    user: readString("DB_USER", "postgres"),
    password: readString("DB_PASSWORD", "postgres"),
    database: readString("DB_NAME", "expenses"),
    max: readInteger("DB_POOL_MAX", 10, { max: 100 }),
    idleTimeoutMillis: readInteger("DB_IDLE_TIMEOUT_MS", 30000),
    connectionTimeoutMillis: readInteger("DB_CONNECTION_TIMEOUT_MS", 5000),
    healthCheckTimeoutMillis: readInteger("DB_HEALTHCHECK_TIMEOUT_MS", 3000),
  }),
  databaseStartup: Object.freeze({
    maxAttempts: readInteger("DB_STARTUP_MAX_ATTEMPTS", 10, { max: 100 }),
    delayMillis: readInteger("DB_STARTUP_DELAY_MS", 1000, { min: 0 }),
  }),
});

module.exports = { config, readInteger, readString };
