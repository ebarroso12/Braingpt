import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function openStateDatabase(path: string): DatabaseSync {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(path);
    db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
    const version = (db.prepare('PRAGMA user_version').get() as any).user_version;
    if (version > 2) { db.close(); throw new Error('Unsupported database version'); }
    if (version === 0) db.exec(readFileSync(new URL('../migrations/001-inbox.sql', import.meta.url), 'utf8'));
    if (version < 2) db.exec(readFileSync(new URL('../migrations/002-agent.sql', import.meta.url), 'utf8'));
    return db;
}

export class InboxStore {
  private db: DatabaseSync;

  constructor(path: string) {
    this.db = openStateDatabase(path);
  }

  reserve(id: string, senderHash: string, limit: number): 'new' | 'duplicate' | 'rate_limited' {
    const now = Date.now();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.db.prepare('SELECT id FROM messages WHERE id=?').get(id)) {
        this.db.exec('COMMIT'); return 'duplicate';
      }
      const count = this.db.prepare('SELECT COUNT(*) AS n FROM messages WHERE sender_hash=? AND created_at>?').get(senderHash, now - 60000) as any;
      if (count.n >= limit) { this.db.exec('COMMIT'); return 'rate_limited'; }
      this.db.prepare("INSERT INTO messages(id,sender_hash,status,created_at,updated_at) VALUES(?,?,'processing',?,?)").run(id, senderHash, now, now);
      this.db.prepare("INSERT INTO audit_events(message_ref,event_type,created_at) VALUES(?,'reserved',?)").run(id, now);
      this.db.exec('COMMIT'); return 'new';
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }

  transition(id: string, status: 'sending' | 'accepted' | 'uncertain', outgoingIdHash: string | null = null) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const now = Date.now();
      this.db.prepare('UPDATE messages SET status=?,outgoing_id_hash=?,updated_at=? WHERE id=?').run(status, outgoingIdHash, now, id);
      this.db.prepare('INSERT INTO audit_events(message_ref,event_type,created_at) VALUES(?,?,?)').run(id, status, now);
      this.db.exec('COMMIT');
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }

  close() { this.db.close(); }
}
