import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { InboxStore } from '../app/store.ts';
import { tempDir } from './helpers.ts';
import { spawn } from 'node:child_process';

test('two database connections reserve a message only once', async t => {
  const tmp = await tempDir();
  const path = join(tmp.dir, 'test.sqlite');
  const first = new InboxStore(path);
  const second = new InboxStore(path);
  t.after(async () => { first.close(); second.close(); await tmp.cleanup(); });
  assert.equal(first.reserve('id', 'sender', 20), 'new');
  assert.equal(second.reserve('id', 'sender', 20), 'duplicate');
});

test('independent processes sharing SQLite claim exactly one execution', async t => {
  const tmp = await tempDir();
  t.after(() => tmp.cleanup());
  const path = join(tmp.dir, 'shared.sqlite');
  const moduleUrl = new URL('../app/store.ts', import.meta.url).href;
  const script = `
    const { InboxStore } = await import(${JSON.stringify(moduleUrl)});
    const store = new InboxStore(process.argv[1]);
    console.log(store.reserve('shared-id', 'sender', 20));
    store.close();
  `;
  const worker = () => new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script, path], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; let errors = '';
    child.stdout.on('data', chunk => output += chunk);
    child.stderr.on('data', chunk => errors += chunk);
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(output.trim()) : reject(new Error(errors)));
  });
  const results = await Promise.all(Array.from({ length: 8 }, worker));
  assert.equal(results.filter(r => r === 'new').length, 1);
  assert.equal(results.filter(r => r === 'duplicate').length, 7);
});

for (const phase of ['processing', 'sending'] as const) {
  test(`an interrupted ${phase} reservation survives reopening without reexecution`, async t => {
    const tmp = await tempDir();
    const path = join(tmp.dir, 'test.sqlite');
    const first = new InboxStore(path);
    assert.equal(first.reserve('interrupted', 'sender', 20), 'new');
    if (phase === 'sending') first.transition('interrupted', 'sending');
    first.close();
    const resumed = new InboxStore(path);
    t.after(async () => { resumed.close(); await tmp.cleanup(); });
    assert.equal(resumed.reserve('interrupted', 'sender', 20), 'duplicate');
  });
}
