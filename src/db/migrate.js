const fs = require("node:fs/promises");
const path = require("node:path");

const MIGRATION_LOCK_ID = 2_024_091;
const DEFAULT_MIGRATIONS_DIRECTORY = path.resolve(
  __dirname,
  "..",
  "..",
  "db",
  "migrations",
);

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForDatabase(
  pool,
  { maxAttempts = 10, delayMillis = 1000, logger = console } = {},
) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        logger.warn(
          `Database is not ready; retrying (${attempt}/${maxAttempts})...`,
        );
        await sleep(delayMillis);
      }
    }
  }

  throw new Error(
    `Database did not become ready after ${maxAttempts} attempts`,
    { cause: lastError },
  );
}

async function loadMigrations(migrationsDirectory = DEFAULT_MIGRATIONS_DIRECTORY) {
  const fileNames = (await fs.readdir(migrationsDirectory))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    fileNames.map(async (fileName) => ({
      fileName,
      sql: await fs.readFile(path.join(migrationsDirectory, fileName), "utf8"),
    })),
  );
}

async function runMigrations(
  pool,
  { migrationsDirectory = DEFAULT_MIGRATIONS_DIRECTORY, logger = console } = {},
) {
  const migrations = await loadMigrations(migrationsDirectory);
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;
    await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        file_name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const migration of migrations) {
      const result = await client.query(
        "SELECT 1 FROM schema_migrations WHERE file_name = $1",
        [migration.fileName],
      );

      if (result.rowCount > 0) {
        continue;
      }

      await client.query(migration.sql);
      await client.query(
        "INSERT INTO schema_migrations (file_name) VALUES ($1)",
        [migration.fileName],
      );
      logger.info(`Applied database migration: ${migration.fileName}`);
    }

    await client.query("COMMIT");
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK").catch(() => {
        logger.error("Database migration rollback failed.");
      });
    }
    throw error;
  } finally {
    client.release();
  }
}

async function retryMigrations(
  pool,
  {
    maxAttempts = 10,
    delayMillis = 1000,
    logger = console,
    migrationRunner = runMigrations,
    ...migrationOptions
  } = {},
) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await migrationRunner(pool, { ...migrationOptions, logger });
      return;
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        logger.warn(
          `Database migration failed; retrying (${attempt}/${maxAttempts})...`,
        );
        await sleep(delayMillis);
      }
    }
  }

  throw new Error(`Database migrations failed after ${maxAttempts} attempts`, {
    cause: lastError,
  });
}

async function prepareDatabase(pool, options = {}) {
  await waitForDatabase(pool, options);
  await retryMigrations(pool, options);
}

module.exports = {
  DEFAULT_MIGRATIONS_DIRECTORY,
  loadMigrations,
  prepareDatabase,
  retryMigrations,
  runMigrations,
  waitForDatabase,
};
