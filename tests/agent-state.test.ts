import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { AgentState } from '../app/agent/state.ts';
import { tempDir } from './helpers.ts';
import { spawn } from 'node:child_process';

const encryptionKey = Buffer.alloc(32, 7).toString('base64');
async function setup(t: any) {
  const tmp = await tempDir();
  const path = join(tmp.dir, 'agent.sqlite');
  const state = new AgentState(path, encryptionKey);
  t.after(async () => { state.close(); await tmp.cleanup(); });
  return { state, path };
}

test('facts are proposals until explicit confirmation from the same conversation', async t => {
  const { state } = await setup(t);
  const pending = state.propose('scope-a', 'remember', 'Prefiro reuniões de manhã');
  assert.deepEqual(state.memories('scope-a'), []);
  assert.equal(state.confirm('scope-b', pending.id), null);
  assert.equal(state.confirm('scope-a', pending.id), 'remember');
  assert.deepEqual(state.memories('scope-a').map(m => m.content), ['Prefiro reuniões de manhã']);
  assert.deepEqual(state.memories('scope-b'), []);
  assert.equal(state.confirm('scope-a', pending.id), null);
});

test('expired and cancelled confirmations never change durable memory', async t => {
  const { state } = await setup(t);
  const expired = state.propose('scope', 'remember', 'fato', 1);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(state.confirm('scope', expired.id), null);
  const cancelled = state.propose('scope', 'remember', 'outro fato');
  assert.equal(state.cancel('scope', cancelled.id), true);
  assert.equal(state.confirm('scope', cancelled.id), null);
  assert.deepEqual(state.memories('scope'), []);
});

test('forgetting a fact also requires a single-use confirmed proposal', async t => {
  const { state } = await setup(t);
  const p = state.propose('a', 'remember', 'Um fato');
  state.confirm('a', p.id);
  const id = state.memories('a')[0].id;
  const forget = state.propose('a', 'forget', id);
  assert.equal(state.memories('a').length, 1);
  assert.equal(state.confirm('a', forget.id), 'forget');
  assert.deepEqual(state.memories('a'), []);
});

test('history and pending facts are encrypted and short context is scoped and bounded', async t => {
  const { state, path } = await setup(t);
  const privateText = 'private-fact-and-conversation-content';
  state.propose('a', 'remember', privateText);
  for (let i = 0; i < 20; i++) state.append('a', 'user', `${privateText}-${i}`);
  assert.ok(state.history('a').length <= 12);
  assert.deepEqual(state.history('b'), []);
  const data = await readFile(path);
  const wal = await readFile(`${path}-wal`);
  assert.equal(Buffer.concat([data, wal]).includes(Buffer.from(privateText)), false);
});

test('corrupt ciphertext does not silently become empty approved memory', async t => {
  const { state, path } = await setup(t);
  const p = state.propose('scope', 'remember', 'Secret fact');
  state.confirm('scope', p.id);
  const wrongKeyState = new AgentState(path, Buffer.alloc(32, 8).toString('base64'));
  t.after(() => wrongKeyState.close());
  assert.throws(() => wrongKeyState.memories('scope'));
});

test('existing inbox data survives the agent schema migration without reopening a delivery', async t => {
  const tmp = await tempDir();
  const path = join(tmp.dir, 'old.sqlite');
  const { DatabaseSync } = await import('node:sqlite');
  const { readFile } = await import('node:fs/promises');
  const old = new DatabaseSync(path);
  old.exec(await readFile(new URL('../migrations/001-inbox.sql', import.meta.url), 'utf8'));
  old.prepare("INSERT INTO messages(id,sender_hash,status,created_at,updated_at) VALUES('old','sender','accepted',1,1)").run();
  old.close();
  const state = new AgentState(path, encryptionKey);
  t.after(async () => { state.close(); await tmp.cleanup(); });
  const check = new DatabaseSync(path);
  assert.equal(check.prepare("SELECT status FROM messages WHERE id='old'").get()?.status, 'accepted');
  assert.equal(check.prepare('PRAGMA user_version').get()?.user_version, 3);
  check.close();
});

test('forgetting a fact removes its content from the short conversation context too', async t => {
  const { state } = await setup(t);
  const pending = state.propose('scope', 'remember', 'Prefiro reuniões de manhã');
  state.confirm('scope', pending.id);
  state.append('scope', 'assistant', 'Proposta: Prefiro reuniões de manhã');
  const forget = state.propose('scope', 'forget', state.memories('scope')[0].id);
  state.confirm('scope', forget.id);
  assert.deepEqual(state.history('scope'), []);
});

test('confirmation expiring while waiting for a database lock cannot be applied', async t => {
  const { state, path } = await setup(t);
  const p = state.propose('scope', 'remember', 'Um fato', 1000);
  const code = `const { DatabaseSync } = await import('node:sqlite'); const db = new DatabaseSync(process.argv[1]); db.exec('BEGIN IMMEDIATE'); console.log('locked'); setTimeout(() => { db.exec('COMMIT'); db.close(); }, 1500);`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', code, path], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) child.kill(); });
  await new Promise<void>((resolve, reject) => { child.stdout.once('data', () => resolve()); child.once('error', reject); });
  const result = state.confirm('scope', p.id);
  assert.equal(result, null);
  assert.deepEqual(state.memories('scope'), []);
});
