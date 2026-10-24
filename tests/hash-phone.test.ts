import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { salt, senderHash } from './helpers.ts';

test('hash utility emits only the allowlist HMAC and rejects invalid phone input', () => {
  const run = (input: string, configured = salt) => spawnSync(process.execPath, ['scripts/hash-phone.ts'], { cwd: new URL('..', import.meta.url), env: { ...process.env, SENDER_HASH_SALT: configured }, input, encoding: 'utf8' });
  const valid = run('+1 (555) 555-0100\n');
  assert.equal(valid.status, 0);
  assert.equal(valid.stdout.trim(), senderHash);
  assert.doesNotMatch(valid.stderr, /555/);
  assert.equal(run('not-a-phone\n').status, 1);
  assert.equal(run('15555550100\n', '').status, 1);
});
