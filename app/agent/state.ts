import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { openStateDatabase } from '../store.ts';
import type { DatabaseSync } from 'node:sqlite';

export class AgentState {
  private db: DatabaseSync;
  private key: Buffer;

  constructor(path: string, key: string) {
    this.key = Buffer.from(key, 'base64');
    if (this.key.length !== 32) throw new Error('Invalid state encryption key');
    this.db = openStateDatabase(path);
  }

  private seal(scope: string, text: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(scope));
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
  }

  private open(scope: string, data: string): string {
    const raw = Buffer.from(data, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.key, raw.subarray(0, 12));
    decipher.setAAD(Buffer.from(scope));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
  }

  private cleanup() {
    const now = Date.now();
    this.db.prepare('DELETE FROM conversation_context WHERE expires_at<=?').run(now);
    this.db.prepare("UPDATE pending_confirmations SET status='expired',payload_cipher='' WHERE status='pending' AND expires_at<=?").run(now);
  }

  memories(scope: string): { id: string; content: string }[] {
    return (this.db.prepare('SELECT id,content_cipher FROM memory_items WHERE scope=? ORDER BY created_at,id LIMIT 20').all(scope) as any[])
      .map(row => ({ id: row.id, content: this.open(scope, row.content_cipher) }));
  }

  history(scope: string): { role: 'user' | 'assistant'; content: string }[] {
    this.cleanup();
    return (this.db.prepare('SELECT role,content_cipher FROM conversation_context WHERE scope=? ORDER BY id DESC LIMIT 12').all(scope) as any[])
      .reverse().map(row => ({ role: row.role, content: this.open(scope, row.content_cipher) }));
  }

  append(scope: string, role: 'user' | 'assistant', text: string) {
    this.cleanup();
    this.db.prepare('INSERT INTO conversation_context(scope,role,content_cipher,expires_at) VALUES(?,?,?,?)').run(scope, role, this.seal(scope, text.slice(0, 4000)), Date.now() + 86400000);
    this.db.prepare('DELETE FROM conversation_context WHERE scope=? AND id NOT IN (SELECT id FROM conversation_context WHERE scope=? ORDER BY id DESC LIMIT 12)').run(scope, scope);
  }

  propose(scope: string, action: 'remember' | 'forget', payload: string, ttlMs = 600000) {
    this.cleanup();
    if (!payload.trim() || payload.length > 500 || ttlMs < 1 || ttlMs > 600000) throw new Error('Invalid proposal');
    if (action === 'remember' && this.memories(scope).length >= 20) throw new Error('Memory limit');
    if (action === 'forget' && !this.memories(scope).some(m => m.id === payload)) throw new Error('Unknown fact');
    const id = randomBytes(8).toString('hex');
    this.db.prepare("INSERT INTO pending_confirmations(id,scope,action,payload_cipher,status,expires_at,created_at) VALUES(?,?,?,?,'pending',?,?)").run(id, scope, action, this.seal(scope, payload), Date.now() + ttlMs, Date.now());
    return { id, action, payload };
  }

  confirm(scope: string, id: string): 'remember' | 'forget' | null {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const now = Date.now();
      const row = this.db.prepare("SELECT action,payload_cipher,expires_at FROM pending_confirmations WHERE id=? AND scope=? AND status='pending'").get(id, scope) as any;
      if (!row || row.expires_at <= now) { this.db.exec('COMMIT'); return null; }
      const payload = this.open(scope, row.payload_cipher);
      if (row.action === 'remember') {
        const n = this.db.prepare('SELECT COUNT(*) AS n FROM memory_items WHERE scope=?').get(scope) as any;
        if (n.n >= 20) throw new Error('Memory limit');
        this.db.prepare('INSERT INTO memory_items(id,scope,content_cipher,created_at) VALUES(?,?,?,?)').run(id, scope, this.seal(scope, payload), now);
      } else {
        const result = this.db.prepare('DELETE FROM memory_items WHERE id=? AND scope=?').run(payload, scope);
        if (result.changes !== 1) throw new Error('Fact unavailable');
        this.db.prepare('DELETE FROM conversation_context WHERE scope=?').run(scope);
      }
      this.db.prepare("UPDATE pending_confirmations SET status='confirmed',payload_cipher='' WHERE id=? AND scope=?").run(id, scope);
      this.db.prepare('INSERT INTO audit_events(message_ref,event_type,created_at) VALUES(?,?,?)').run(scope, `memory_${row.action}`, now);
      this.db.exec('COMMIT');
      return row.action;
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }

  cancel(scope: string, id: string) {
    const result = this.db.prepare("UPDATE pending_confirmations SET status='cancelled',payload_cipher='' WHERE id=? AND scope=? AND status='pending'").run(id, scope);
    return result.changes === 1;
  }

  close() { this.db.close(); this.key.fill(0); }
}
