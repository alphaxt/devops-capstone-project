const test = require("node:test");
const assert = require("node:assert/strict");
const { ExpenseRepository } = require("../src/repositories/expenseRepository");

function createRecordingPool(results) {
  const calls = [];
  return {
    calls,
    async query(text, values) {
      calls.push({ text, values });
      return results.shift();
    },
  };
}

test("repository writes pass every expense value as a SQL parameter", async () => {
  const row = {
    id: 7,
    description: "Books",
    amount: "42.00",
    category: "Education",
    expense_date: "2026-09-19",
  };
  const pool = createRecordingPool([
    { rows: [row], rowCount: 1 },
    { rows: [{ ...row, amount: "45.00" }], rowCount: 1 },
    { rows: [], rowCount: 1 },
  ]);
  const repository = new ExpenseRepository(pool);

  await repository.create({
    description: "Books",
    amount: "42.00",
    category: "Education",
    expenseDate: "2026-09-19",
  });
  await repository.update(7, {
    description: "Books and supplies",
    amount: "45.00",
    category: "Education",
    expenseDate: "2026-09-20",
  });
  const deleted = await repository.delete(7);

  assert.deepEqual(pool.calls[0].values, [
    "Books",
    "42.00",
    "Education",
    "2026-09-19",
  ]);
  assert.match(pool.calls[0].text, /VALUES \(\$1, \$2, \$3, \$4\)/);
  assert.deepEqual(pool.calls[1].values, [
    "Books and supplies",
    "45.00",
    "Education",
    "2026-09-20",
    7,
  ]);
  assert.match(pool.calls[1].text, /WHERE id = \$5/);
  assert.deepEqual(pool.calls[2].values, [7]);
  assert.match(pool.calls[2].text, /WHERE id = \$1/);
  assert.equal(deleted, true);
});

test("repository returns expenses and total from one consistent dashboard query", async () => {
  const row = {
    id: 1,
    description: "Train ticket",
    amount: "24.50",
    category: "Transport",
    expense_date: "2026-09-18",
  };
  const pool = createRecordingPool([
    { rows: [{ expenses: [row], total: "24.50" }] },
    { rows: [row] },
    { rows: [] },
  ]);
  const repository = new ExpenseRepository(pool);

  assert.deepEqual(await repository.getDashboard(), {
    expenses: [row],
    total: "24.50",
  });
  assert.match(pool.calls[0].text, /JSON_AGG/);
  assert.match(pool.calls[0].text, /SUM\(amount\)/);
  assert.deepEqual(await repository.findById(1), row);
  assert.equal(await repository.findById(99), null);
  assert.deepEqual(pool.calls[1].values, [1]);
  assert.deepEqual(pool.calls[2].values, [99]);
});
