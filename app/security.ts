import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export function authenticate(provided: unknown, expected: string): boolean {
  if (typeof provided !== 'string' || provided.length > 1024) return false;
  return timingSafeEqual(createHash('sha256').update(provided).digest(), createHash('sha256').update(expected).digest());
}

export function privateHash(salt: string, value: string): string {
  return createHmac('sha256', salt).update(value).digest('hex');
}

export type AuditCode = 'ignored' | 'unauthorized' | 'accepted' | 'duplicate' | 'rate_limited' | 'delivery_unconfirmed' | 'internal_failure';
export type AuditRecord = { event: AuditCode; messageRef?: string };
export type AuditLogger = (record: AuditRecord) => void;

// Only fixed event codes and HMAC references are passed to the logger.
// Do not pass request bodies, provider errors or headers to this function.
export const logAudit: AuditLogger = record => console.info(JSON.stringify(record));
