const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isCalendarDate,
  parseExpenseId,
  validateExpenseInput,
} = require("../src/validation/expenseValidation");

const validInput = Object.freeze({
  description: "  Weekly groceries  ",
  amount: "84.5",
  category: "Food",
  expenseDate: "2026-09-19",
});

test("valid expense input is normalized for persistence", () => {
  const result = validateExpenseInput(validInput);

  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.expense, {
    description: "Weekly groceries",
    amount: "84.50",
    category: "Food",
    expenseDate: "2026-09-19",
  });
});

test("required expense fields return field-level errors", () => {
  const result = validateExpenseInput({});

  assert.equal(result.isValid, false);
  assert.equal(result.errors.description, "Description is required.");
  assert.equal(result.errors.amount, "Amount is required.");
  assert.equal(result.errors.category, "Choose a valid category.");
  assert.equal(result.errors.expenseDate, "Expense date is required.");
  assert.equal(result.expense, null);
});

test("description is trimmed and limited to 120 characters", () => {
  const result = validateExpenseInput({
    ...validInput,
    description: "x".repeat(121),
  });

  assert.equal(result.isValid, false);
  assert.match(result.errors.description, /120 characters/);
});

test("amount must be positive and fit NUMERIC(12,2)", async (t) => {
  for (const amount of ["0", "-1", "1.234", "1e2", "10000000000.00", "01.50"]) {
    await t.test(`rejects ${amount}`, () => {
      const result = validateExpenseInput({ ...validInput, amount });
      assert.equal(result.isValid, false);
      assert.match(result.errors.amount, /positive amount/);
    });
  }

  const maximum = validateExpenseInput({
    ...validInput,
    amount: "9999999999.99",
  });
  assert.equal(maximum.isValid, true);
});

test("category must be in the supported allowlist", () => {
  const result = validateExpenseInput({
    ...validInput,
    category: "Cryptocurrency",
  });

  assert.equal(result.isValid, false);
  assert.equal(result.errors.category, "Choose a valid category.");
});

test("expense date must be a real calendar date", () => {
  assert.equal(isCalendarDate("2024-02-29"), true);
  assert.equal(isCalendarDate("2026-02-29"), false);
  assert.equal(isCalendarDate("2026-13-01"), false);
  assert.equal(isCalendarDate("not-a-date"), false);

  const result = validateExpenseInput({
    ...validInput,
    expenseDate: "2026-02-29",
  });
  assert.equal(result.isValid, false);
  assert.equal(result.errors.expenseDate, "Enter a valid expense date.");
});

test("expense IDs must be positive safe integers", () => {
  assert.equal(parseExpenseId("1"), 1);
  assert.equal(parseExpenseId("9007199254740991"), Number.MAX_SAFE_INTEGER);
  assert.equal(parseExpenseId("0"), null);
  assert.equal(parseExpenseId("-1"), null);
  assert.equal(parseExpenseId("1.5"), null);
  assert.equal(parseExpenseId("abc"), null);
  assert.equal(parseExpenseId("9007199254740992"), null);
});
