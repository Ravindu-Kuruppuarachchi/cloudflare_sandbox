-- Remove old sandbox tables
DROP TABLE IF EXISTS execution_logs;
DROP TABLE IF EXISTS users;

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT    NOT NULL UNIQUE
);

-- Inventory items
CREATE TABLE IF NOT EXISTS items (
  id                  TEXT    PRIMARY KEY,
  name                TEXT    NOT NULL,
  description         TEXT    NOT NULL DEFAULT '',
  category_id         INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  quantity            INTEGER NOT NULL DEFAULT 0,
  unit                TEXT    NOT NULL DEFAULT 'unit',
  price               REAL    DEFAULT NULL,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  created_at          INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at          INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_name     ON items(name);

INSERT OR IGNORE INTO categories (name) VALUES
  ('Electronics'),
  ('Furniture'),
  ('Office Supplies'),
  ('Hardware'),
  ('Other');
