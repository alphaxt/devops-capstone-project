const { config } = require("./config");
const { createApp } = require("./app");
const { prepareDatabase } = require("./db/migrate");
const { createDatabaseHealthCheck, createPool } = require("./db/pool");
const { ExpenseRepository } = require("./repositories/expenseRepository");

function listen(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);

    function cleanupStartupListeners() {
      server.off("error", onError);
      server.off("listening", onListening);
    }

    function onError(error) {
      cleanupStartupListeners();
      reject(error);
    }

    function onListening() {
      cleanupStartupListeners();
      resolve(server);
    }

    server.once("error", onError);
    server.once("listening", onListening);
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function closeResources(server, pool) {
  const errors = [];

  try {
    await closeServer(server);
  } catch (error) {
    errors.push(error);
  }

  try {
    await pool.end();
  } catch (error) {
    errors.push(error);
  }

  return errors;
}

function registerGracefulShutdown(server, pool, logger = console) {
  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info(`${signal} received; shutting down gracefully.`);

    const forceShutdown = setTimeout(() => {
      logger.error("Graceful shutdown timed out.");
      process.exit(1);
    }, 10000);
    forceShutdown.unref();

    const errors = await closeResources(server, pool);
    if (errors.length === 0) {
      clearTimeout(forceShutdown);
      logger.info("Application shutdown complete.");
      return;
    }

    logger.error(
      `Application shutdown encountered ${errors.length} cleanup error(s).`,
    );
    process.exitCode = 1;
    // Keep the unreferenced force timer active if failed resources keep the process alive.
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

async function start({ logger = console } = {}) {
  const pool = createPool(config.database);
  pool.on("error", (error) => {
    logger.error(`Unexpected database connection error: ${error.message}`);
  });

  try {
    await prepareDatabase(pool, {
      ...config.databaseStartup,
      logger,
    });

    const expenseRepository = new ExpenseRepository(pool);
    const app = createApp({
      expenseRepository,
      healthCheck: createDatabaseHealthCheck(
        pool,
        config.database.healthCheckTimeoutMillis,
      ),
      logger,
    });
    const server = await listen(app, config.port);
    server.on("error", (error) => {
      logger.error(`HTTP server error: ${error.message}`);
    });

    registerGracefulShutdown(server, pool, logger);
    logger.info(`PocketLedger is listening on port ${config.port}.`);

    return { app, server, pool };
  } catch (error) {
    await pool.end().catch(() => {});
    throw error;
  }
}

if (require.main === module) {
  start().catch((error) => {
    console.error(`Application failed to start: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  closeResources,
  listen,
  registerGracefulShutdown,
  start,
};
