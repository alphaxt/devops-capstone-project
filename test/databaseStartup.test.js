const test = require("node:test");
const assert = require("node:assert/strict");
const {
  retryMigrations,
  waitForDatabase,
} = require("../src/db/migrate");
const { createDatabaseHealthCheck } = require("../src/db/pool");

const silentLogger = Object.freeze({
  info() {},
  warn() {},
  error() {},
});

test("database startup retries until PostgreSQL becomes available", async () => {
  let attempts = 0;
  const pool = {
    async query() {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("not ready");
      }
      return { rows: [{ "?column?": 1 }] };
    },
  };

  await waitForDatabase(pool, {
    maxAttempts: 3,
    delayMillis: 0,
    logger: silentLogger,
  });

  assert.equal(attempts, 3);
});

test("database startup fails clearly after the configured attempts", async () => {
  let attempts = 0;
  const pool = {
    async query() {
      attempts += 1;
      throw new Error("still unavailable");
    },
  };

  await assert.rejects(
    waitForDatabase(pool, {
      maxAttempts: 2,
      delayMillis: 0,
      logger: silentLogger,
    }),
    /Database did not become ready after 2 attempts/,
  );
  assert.equal(attempts, 2);
});

test("migration execution retries after a transient failure", async () => {
  let attempts = 0;
  const migrationRunner = async () => {
    attempts += 1;
    if (attempts < 3) {
      throw new Error("connection reset");
    }
  };

  await retryMigrations(
    {},
    {
      maxAttempts: 3,
      delayMillis: 0,
      logger: silentLogger,
      migrationRunner,
    },
  );

  assert.equal(attempts, 3);
});

test("migration execution fails clearly after bounded retries", async () => {
  let attempts = 0;

  await assert.rejects(
    retryMigrations(
      {},
      {
        maxAttempts: 2,
        delayMillis: 0,
        logger: silentLogger,
        migrationRunner: async () => {
          attempts += 1;
          throw new Error("migration unavailable");
        },
      },
    ),
    /Database migrations failed after 2 attempts/,
  );
  assert.equal(attempts, 2);
});

test("database health checks include an explicit query timeout", async () => {
  const calls = [];
  const pool = {
    async query(queryConfig) {
      calls.push(queryConfig);
    },
  };

  await createDatabaseHealthCheck(pool, 1750)();

  assert.deepEqual(calls, [
    {
      text: "SELECT 1",
      query_timeout: 1750,
    },
  ]);
});
