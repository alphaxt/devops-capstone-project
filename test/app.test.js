const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../src/app");
const {
  FakeExpenseRepository,
} = require("./support/fakeExpenseRepository");

const exampleExpense = Object.freeze({
  id: 1,
  description: "Train ticket",
  amount: "24.50",
  category: "Transport",
  expense_date: "2026-09-18",
  created_at: "2026-09-18T10:00:00.000Z",
  updated_at: "2026-09-18T10:00:00.000Z",
});

const validForm = Object.freeze({
  description: "Lunch",
  amount: "12.75",
  category: "Food",
  expenseDate: "2026-09-19",
});

function buildTestApp({ expenses = [], healthCheck = async () => {}, repository } = {}) {
  const expenseRepository = repository ?? new FakeExpenseRepository(expenses);
  const logEntries = [];
  const logger = {
    info: (...args) => logEntries.push(["info", ...args]),
    warn: (...args) => logEntries.push(["warn", ...args]),
    error: (...args) => logEntries.push(["error", ...args]),
  };

  return {
    app: createApp({ expenseRepository, healthCheck, logger }),
    repository: expenseRepository,
    logEntries,
  };
}

test("health check reports a connected database", async () => {
  const { app } = buildTestApp();

  const response = await request(app).get("/health").expect(200);

  assert.deepEqual(response.body, { status: "ok", database: "connected" });
  assert.equal(response.headers["x-powered-by"], undefined);
  assert.equal(response.headers["x-content-type-options"], "nosniff");
});

test("health check safely reports a database failure", async () => {
  const { app, logEntries } = buildTestApp({
    healthCheck: async () => {
      throw new Error("password=do-not-expose");
    },
  });

  const response = await request(app).get("/health").expect(503);

  assert.deepEqual(response.body, {
    status: "unhealthy",
    database: "unavailable",
  });
  assert.doesNotMatch(response.text, /do-not-expose/);
  assert.equal(logEntries.some(([level]) => level === "warn"), true);
});

test("root redirects to the expense dashboard", async () => {
  const { app } = buildTestApp();

  await request(app)
    .get("/")
    .expect(302)
    .expect("Location", "/expenses");
});

test("empty dashboard displays zero total and a useful empty state", async () => {
  const { app } = buildTestApp();

  const response = await request(app).get("/expenses").expect(200);

  assert.match(response.text, /\$0\.00/);
  assert.match(response.text, /No expenses yet/);
  assert.match(response.text, /Add an expense/);
});

test("dashboard lists expenses, calculates total, and escapes user content", async () => {
  const maliciousDescription = '<script>alert("unsafe")</script>';
  const { app } = buildTestApp({
    expenses: [
      exampleExpense,
      {
        ...exampleExpense,
        id: 2,
        description: maliciousDescription,
        amount: "5.25",
        category: "Other",
      },
    ],
  });

  const response = await request(app).get("/expenses").expect(200);

  assert.match(response.text, /\$29\.75/);
  assert.match(response.text, /Train ticket/);
  assert.match(response.text, /&lt;script&gt;/);
  assert.doesNotMatch(response.text, /<script>alert\("unsafe"\)<\/script>/);
});

test("valid form creates a normalized expense", async () => {
  const { app, repository } = buildTestApp();

  await request(app)
    .post("/expenses")
    .type("form")
    .send({ ...validForm, description: "  Lunch  " })
    .expect(303)
    .expect("Location", "/expenses?status=created");

  assert.deepEqual(repository.snapshot()[0], {
    id: 1,
    description: "Lunch",
    amount: "12.75",
    category: "Food",
    expense_date: "2026-09-19",
    created_at: repository.snapshot()[0].created_at,
    updated_at: repository.snapshot()[0].updated_at,
  });
});

test("invalid create returns 422 with field errors and escaped submitted values", async () => {
  const { app, repository } = buildTestApp();

  const response = await request(app)
    .post("/expenses")
    .type("form")
    .send({
      description: "<b>Rent</b>",
      amount: "0",
      category: "Unknown",
      expenseDate: "2026-02-30",
    })
    .expect(422);

  assert.match(response.text, /positive amount/);
  assert.match(response.text, /Choose a valid category/);
  assert.match(response.text, /valid expense date/);
  assert.match(response.text, /&lt;b&gt;Rent&lt;\/b&gt;/);
  assert.doesNotMatch(response.text, /<b>Rent<\/b>/);
  assert.equal(repository.snapshot().length, 0);
});

test("edit page loads existing data and valid update persists changes", async () => {
  const { app, repository } = buildTestApp({ expenses: [exampleExpense] });

  const editResponse = await request(app).get("/expenses/1/edit").expect(200);
  assert.match(editResponse.text, /Edit expense/);
  assert.match(editResponse.text, /value="Train ticket"/);

  await request(app)
    .post("/expenses/1")
    .type("form")
    .send({
      description: "Monthly train pass",
      amount: "80",
      category: "Transport",
      expenseDate: "2026-09-19",
    })
    .expect(303)
    .expect("Location", "/expenses?status=updated");

  const updated = repository.snapshot()[0];
  assert.equal(updated.description, "Monthly train pass");
  assert.equal(updated.amount, "80.00");
  assert.equal(updated.expense_date, "2026-09-19");
});

test("invalid update returns 422 and preserves submitted values", async () => {
  const { app, repository } = buildTestApp({ expenses: [exampleExpense] });

  const response = await request(app)
    .post("/expenses/1")
    .type("form")
    .send({ ...validForm, description: "   " })
    .expect(422);

  assert.match(response.text, /Description is required/);
  assert.match(response.text, /value="12\.75"/);
  assert.equal(repository.snapshot()[0].description, "Train ticket");
});

test("delete removes an existing expense", async () => {
  const { app, repository } = buildTestApp({ expenses: [exampleExpense] });

  await request(app)
    .post("/expenses/1/delete")
    .expect(303)
    .expect("Location", "/expenses?status=deleted");

  assert.equal(repository.snapshot().length, 0);
});

test("invalid IDs render a 404 instead of reaching the repository", async (t) => {
  const { app } = buildTestApp({ expenses: [exampleExpense] });

  for (const requestDetails of [
    ["get", "/expenses/not-a-number/edit"],
    ["post", "/expenses/0"],
    ["post", "/expenses/-1/delete"],
  ]) {
    await t.test(`${requestDetails[0].toUpperCase()} ${requestDetails[1]}`, async () => {
      const response = await request(app)[requestDetails[0]](requestDetails[1]).expect(404);
      assert.match(response.text, /That page is not in the ledger/);
    });
  }
});

test("missing expenses render a 404 for edit, update, and delete", async (t) => {
  const { app } = buildTestApp();

  await t.test("edit", () => request(app).get("/expenses/99/edit").expect(404));
  await t.test("update", () =>
    request(app).post("/expenses/99").type("form").send(validForm).expect(404),
  );
  await t.test("delete", () => request(app).post("/expenses/99/delete").expect(404));
});

test("unknown routes use the custom 404 page", async () => {
  const { app } = buildTestApp();

  const response = await request(app).get("/missing-page").expect(404);
  assert.match(response.text, /That page is not in the ledger/);
});

test("cross-origin browser mutations are rejected", async () => {
  const { app, repository } = buildTestApp();

  const response = await request(app)
    .post("/expenses")
    .set("Host", "localhost")
    .set("Origin", "https://malicious.example")
    .type("form")
    .send(validForm)
    .expect(403);

  assert.match(response.text, /That request was blocked/);
  assert.equal(repository.snapshot().length, 0);
});

test("unexpected errors use a safe custom error page", async () => {
  const repository = new FakeExpenseRepository();
  repository.getDashboard = async () => {
    throw new Error("database password=super-secret");
  };
  const { app, logEntries } = buildTestApp({ repository });

  const response = await request(app).get("/expenses").expect(500);

  assert.match(response.text, /We could not open the ledger/);
  assert.doesNotMatch(response.text, /super-secret/);
  assert.equal(logEntries.some(([level]) => level === "error"), true);
});
