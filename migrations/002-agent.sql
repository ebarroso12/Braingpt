BEGIN IMMEDIATE;
CREATE TABLE IF NOT EXISTS memory_items (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  content_cipher TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS memory_scope ON memory_items(scope, created_at);
CREATE TABLE IF NOT EXISTS pending_confirmations (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('remember', 'forget')),
  payload_cipher TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS confirmation_scope ON pending_confirmations(scope, status);
CREATE TABLE IF NOT EXISTS conversation_context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content_cipher TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS context_scope ON conversation_context(scope, id);
PRAGMA user_version=2;
COMMIT;
