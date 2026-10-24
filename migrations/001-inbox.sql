CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'sending', 'accepted', 'uncertain')),
  outgoing_id_hash TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_sender_time ON messages(sender_hash, created_at);
CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY,
  message_ref TEXT,
  event_type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
PRAGMA user_version = 1;
