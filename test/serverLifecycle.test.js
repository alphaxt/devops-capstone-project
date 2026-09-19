const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { closeResources, listen } = require("../src/server");

test("listen removes temporary startup listeners after success", async () => {
  const server = new EventEmitter();
  const app = {
    listen() {
      queueMicrotask(() => server.emit("listening"));
      return server;
    },
  };

  assert.equal(await listen(app, 3000), server);
  assert.equal(server.listenerCount("listening"), 0);
  assert.equal(server.listenerCount("error"), 0);
});

test("shutdown attempts pool cleanup even when the HTTP server fails to close", async () => {
  let poolEnded = false;
  const server = {
    close(callback) {
      callback(new Error("server close failed"));
    },
  };
  const pool = {
    async end() {
      poolEnded = true;
    },
  };

  const errors = await closeResources(server, pool);

  assert.equal(poolEnded, true);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /server close failed/);
});

test("shutdown reports both cleanup failures", async () => {
  const server = {
    close(callback) {
      callback(new Error("server failure"));
    },
  };
  const pool = {
    async end() {
      throw new Error("pool failure");
    },
  };

  const errors = await closeResources(server, pool);

  assert.deepEqual(
    errors.map((error) => error.message),
    ["server failure", "pool failure"],
  );
});
