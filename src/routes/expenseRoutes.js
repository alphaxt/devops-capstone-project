const express = require("express");
const { requireSameOrigin } = require("../middleware/sameOrigin");
const {
  parseExpenseId,
  validateExpenseInput,
} = require("../validation/expenseValidation");

const STATUS_MESSAGES = Object.freeze({
  created: "Expense added successfully.",
  updated: "Expense updated successfully.",
  deleted: "Expense deleted successfully.",
});

function emptyForm() {
  return {
    description: "",
    amount: "",
    category: "",
    expenseDate: "",
  };
}

function expenseToForm(expense) {
  return {
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    expenseDate: expense.expense_date,
  };
}

function renderNotFound(res) {
  return res.status(404).render("404", { title: "Expense not found" });
}

function createExpenseRouter(repository) {
  const router = express.Router();

  router.get("/", async (req, res) => {
    const dashboard = await repository.getDashboard();
    const statusMessage = STATUS_MESSAGES[req.query.status] ?? "";

    res.render("expenses/index", {
      title: "Expenses",
      ...dashboard,
      form: emptyForm(),
      errors: {},
      statusMessage,
    });
  });

  router.post("/", requireSameOrigin, async (req, res) => {
    const validation = validateExpenseInput(req.body);

    if (!validation.isValid) {
      const dashboard = await repository.getDashboard();
      return res.status(422).render("expenses/index", {
        title: "Expenses",
        ...dashboard,
        form: validation.values,
        errors: validation.errors,
        statusMessage: "",
      });
    }

    await repository.create(validation.expense);
    return res.redirect(303, "/expenses?status=created");
  });

  router.get("/:id/edit", async (req, res) => {
    const id = parseExpenseId(req.params.id);
    if (id === null) {
      return renderNotFound(res);
    }

    const expense = await repository.findById(id);
    if (!expense) {
      return renderNotFound(res);
    }

    return res.render("expenses/edit", {
      title: "Edit expense",
      expenseId: id,
      form: expenseToForm(expense),
      errors: {},
    });
  });

  router.post("/:id", requireSameOrigin, async (req, res) => {
    const id = parseExpenseId(req.params.id);
    if (id === null) {
      return renderNotFound(res);
    }

    const existingExpense = await repository.findById(id);
    if (!existingExpense) {
      return renderNotFound(res);
    }

    const validation = validateExpenseInput(req.body);
    if (!validation.isValid) {
      return res.status(422).render("expenses/edit", {
        title: "Edit expense",
        expenseId: id,
        form: validation.values,
        errors: validation.errors,
      });
    }

    const updatedExpense = await repository.update(id, validation.expense);
    if (!updatedExpense) {
      return renderNotFound(res);
    }

    return res.redirect(303, "/expenses?status=updated");
  });

  router.post("/:id/delete", requireSameOrigin, async (req, res) => {
    const id = parseExpenseId(req.params.id);
    if (id === null) {
      return renderNotFound(res);
    }

    const deleted = await repository.delete(id);
    if (!deleted) {
      return renderNotFound(res);
    }

    return res.redirect(303, "/expenses?status=deleted");
  });

  return router;
}

module.exports = { createExpenseRouter };
