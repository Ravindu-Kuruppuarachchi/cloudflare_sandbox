-- Users: tracks who can run code and their daily quota
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  daily_limit  INTEGER NOT NULL DEFAULT 50,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Execution logs: one row per Sandbox run, used for rate limiting + audit
CREATE TABLE IF NOT EXISTS execution_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  code        TEXT NOT NULL,
  stdout      TEXT,
  stderr      TEXT,
  exit_code   INTEGER,
  duration_ms INTEGER,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_exec_user_created
  ON execution_logs(user_id, created_at);

-- Seed a demo user so the PoC works without real auth wired up
INSERT OR IGNORE INTO users (id, email, daily_limit)
VALUES ('demo-user', 'demo@isa.ae', 50);
