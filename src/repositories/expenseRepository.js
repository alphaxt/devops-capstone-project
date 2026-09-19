const EXPENSE_COLUMNS = `
  id,
  description,
  amount::TEXT AS amount,
  category,
  expense_date::TEXT AS expense_date,
  created_at,
  updated_at
`;

class ExpenseRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async getDashboard() {
    const result = await this.pool.query(`
      SELECT
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', id,
              'description', description,
              'amount', amount::TEXT,
              'category', category,
              'expense_date', expense_date::TEXT,
              'created_at', created_at,
              'updated_at', updated_at
            )
            ORDER BY expense_date DESC, created_at DESC, id DESC
          ),
          '[]'::JSON
        ) AS expenses,
        COALESCE(SUM(amount), 0)::TEXT AS total
      FROM expenses
    `);

    return result.rows[0];
  }

  async findById(id) {
    const result = await this.pool.query(
      `SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE id = $1`,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async create(expense) {
    const result = await this.pool.query(
      `
        INSERT INTO expenses (description, amount, category, expense_date)
        VALUES ($1, $2, $3, $4)
        RETURNING ${EXPENSE_COLUMNS}
      `,
      [
        expense.description,
        expense.amount,
        expense.category,
        expense.expenseDate,
      ],
    );

    return result.rows[0];
  }

  async update(id, expense) {
    const result = await this.pool.query(
      `
        UPDATE expenses
        SET description = $1,
            amount = $2,
            category = $3,
            expense_date = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING ${EXPENSE_COLUMNS}
      `,
      [
        expense.description,
        expense.amount,
        expense.category,
        expense.expenseDate,
        id,
      ],
    );

    return result.rows[0] ?? null;
  }

  async delete(id) {
    const result = await this.pool.query(
      "DELETE FROM expenses WHERE id = $1",
      [id],
    );

    return result.rowCount > 0;
  }
}

module.exports = { ExpenseRepository };
