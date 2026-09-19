function cloneExpense(expense) {
  return { ...expense };
}

class FakeExpenseRepository {
  constructor(initialExpenses = []) {
    this.expenses = initialExpenses.map(cloneExpense);
    this.nextId =
      this.expenses.reduce((highest, expense) => Math.max(highest, expense.id), 0) +
      1;
  }

  async getDashboard() {
    const expenses = this.expenses
      .slice()
      .sort((left, right) => {
        const dateComparison = right.expense_date.localeCompare(left.expense_date);
        return dateComparison || right.id - left.id;
      })
      .map(cloneExpense);
    const total = this.expenses
      .reduce((sum, expense) => sum + Number(expense.amount), 0)
      .toFixed(2);

    return { expenses, total };
  }

  async findById(id) {
    const expense = this.expenses.find((candidate) => candidate.id === id);
    return expense ? cloneExpense(expense) : null;
  }

  async create(expense) {
    const now = new Date().toISOString();
    const created = {
      id: this.nextId,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      expense_date: expense.expenseDate,
      created_at: now,
      updated_at: now,
    };

    this.nextId += 1;
    this.expenses.push(created);
    return cloneExpense(created);
  }

  async update(id, expense) {
    const index = this.expenses.findIndex((candidate) => candidate.id === id);
    if (index === -1) {
      return null;
    }

    this.expenses[index] = {
      ...this.expenses[index],
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      expense_date: expense.expenseDate,
      updated_at: new Date().toISOString(),
    };

    return cloneExpense(this.expenses[index]);
  }

  async delete(id) {
    const index = this.expenses.findIndex((candidate) => candidate.id === id);
    if (index === -1) {
      return false;
    }

    this.expenses.splice(index, 1);
    return true;
  }

  snapshot() {
    return this.expenses.map(cloneExpense);
  }
}

module.exports = { FakeExpenseRepository };
