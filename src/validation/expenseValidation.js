const { CATEGORIES } = require("../constants/categories");

const AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ID_PATTERN = /^[1-9]\d*$/;

function stringValue(value) {
  return typeof value === "string" ? value : "";
}

function isCalendarDate(value) {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1900) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseExpenseId(rawId) {
  const value = String(rawId ?? "");
  if (!ID_PATTERN.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function validateExpenseInput(input = {}) {
  const values = {
    description: stringValue(input.description).trim(),
    amount: stringValue(input.amount).trim(),
    category: stringValue(input.category),
    expenseDate: stringValue(input.expenseDate),
  };
  const errors = {};

  if (!values.description) {
    errors.description = "Description is required.";
  } else if (values.description.length > 120) {
    errors.description = "Description must be 120 characters or fewer.";
  }

  if (!values.amount) {
    errors.amount = "Amount is required.";
  } else if (!AMOUNT_PATTERN.test(values.amount) || Number(values.amount) <= 0) {
    errors.amount =
      "Enter a positive amount with no more than 10 whole digits and 2 decimal places.";
  }

  if (!CATEGORIES.includes(values.category)) {
    errors.category = "Choose a valid category.";
  }

  if (!values.expenseDate) {
    errors.expenseDate = "Expense date is required.";
  } else if (!isCalendarDate(values.expenseDate)) {
    errors.expenseDate = "Enter a valid expense date.";
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    values,
    expense: isValid
      ? {
          description: values.description,
          amount: Number(values.amount).toFixed(2),
          category: values.category,
          expenseDate: values.expenseDate,
        }
      : null,
  };
}

module.exports = {
  isCalendarDate,
  parseExpenseId,
  validateExpenseInput,
};
