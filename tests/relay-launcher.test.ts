import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { tempDir, salt } from './helpers.ts';

test('launcher decorates the existing bridge before its start without a new WhatsApp client', async t => {
  const tmp = await tempDir();
  t.after(() => tmp.cleanup());
  const dir = join(tmp.dir, 'scripts');
  await mkdir(dir);
  await writeFile(join(dir, 'controller-bridge.mjs'), `
    export class WhatsAppControllerBridge {
      runtime = { ensureConnected: async () => { throw new Error('No test should connect WhatsApp'); } };
      configStore = { load: async () => ({ enabled: true }), findControllerByJid: async () => null };
      async handleIncomingMessage() {}
      async sendTextMessage() {}
      async sendReply() {}
      rememberOutgoingMessage() {}
      async start() { console.log(JSON.stringify({ adapted: this[Symbol.for('braingpt.relay.installation')] === true })); }
      async stop() {}
    }
  `);
  await writeFile(join(dir, 'controller-daemon.mjs'), `import { WhatsAppControllerBridge } from './controller-bridge.mjs'; const bridge = new WhatsAppControllerBridge(); await bridge.start(); await bridge.stop();`);
  const result = spawnSync(process.execPath, ['app/relay/launch.ts'], { encoding: 'utf8',
    env: { ...process.env, RELAY_ROOT: tmp.dir, DATABASE_PATH: join(tmp.dir, 'state.sqlite'), SENDER_HASH_SALT: salt,
      OPENAI_API_KEY: 'synthetic-launcher-key', OPENAI_MODEL: 'test-model', STATE_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') } });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { adapted: true });
  assert.doesNotMatch(result.stderr, /synthetic-launcher-key/);
});

test('launcher rejects missing relay roots without printing private configuration', () => {
  const result = spawnSync(process.execPath, ['app/relay/launch.ts'], { encoding: 'utf8', env: { ...process.env, RELAY_ROOT: '/missing-relay-fixture', DATABASE_PATH: '/tmp/braingpt-unused.sqlite', SENDER_HASH_SALT: salt, OPENAI_API_KEY: 'synthetic-launcher-key', OPENAI_MODEL: 'test-model', STATE_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /braingpt_relay_startup_failed/);
  assert.doesNotMatch(result.stderr, /synthetic-launcher-key|missing-relay-fixture/);
});
