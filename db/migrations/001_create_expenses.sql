CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  description VARCHAR(120) NOT NULL
    CHECK (CHAR_LENGTH(BTRIM(description)) BETWEEN 1 AND 120),
  amount NUMERIC(12, 2) NOT NULL
    CHECK (amount > 0),
  category VARCHAR(32) NOT NULL
    CHECK (
      category IN (
        'Food',
        'Transport',
        'Housing',
        'Utilities',
        'Health',
        'Entertainment',
        'Shopping',
        'Education',
        'Other'
      )
    ),
  expense_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX expenses_date_created_idx
  ON expenses (expense_date DESC, created_at DESC);
