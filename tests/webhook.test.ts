import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { createBackend } from '../app/backend.ts';
import { loadConfig } from '../app/config.ts';
import { configEnv, event, evolutionFixture, key, listen, phone, secret, tempDir } from './helpers.ts';

async function setup(t: any, fixture?: Parameters<typeof evolutionFixture>[0], patch: Record<string, string> = {}) {
  const temp = await tempDir();
  const evo = await evolutionFixture(fixture);
  const path = join(temp.dir, 'state.sqlite');
  const logs: any[] = [];
  const config = loadConfig({ ...configEnv(evo.url, path), ...patch });
  let backend = createBackend(config, { log: (item: any) => logs.push(item) });
  let url = await listen(backend.server);
  t.after(async () => { await backend.close(); await evo.close(); await temp.cleanup(); });
  const post = (body: any, token: string = secret) => fetch(`${url}/webhooks/evolution`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-webhook-secret': token }, body: JSON.stringify(body),
  });
  const status = () => {
    const db = new DatabaseSync(path);
    const rows = db.prepare('SELECT status FROM messages ORDER BY created_at').all();
    db.close();
    return rows.map((r: any) => r.status);
  };
  return { evo, logs, post, status, config, url, restart: async () => {
    await backend.close(); backend = createBackend(config, { log: (item: any) => logs.push(item) }); url = await listen(backend.server);
  } };
}

test('health identifies transport-only mode without exposing configuration', async t => {
  const s = await setup(t);
  const r = await fetch(`${s.url}/health`);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { name: 'Braingpt', status: 'ok', stage: 'transport-only', modelConnected: false });
});

test('authorized text sends one honest Braingpt transport response', async t => {
  const s = await setup(t);
  const r = await s.post(event());
  assert.equal(r.status, 200);
  assert.equal(((await r.json()) as { result: string }).result, 'accepted');
  assert.equal(s.evo.requests.length, 1);
  const sent = s.evo.requests[0];
  assert.equal(sent.url, '/message/sendText/braingpt-test');
  assert.equal(sent.method, 'POST');
  assert.equal(sent.headers.apikey, key);
  assert.equal(sent.body.number, phone);
  assert.match(sent.body.text, /Braingpt/);
  assert.match(sent.body.text, /ainda/);
  assert.deepEqual(s.status(), ['accepted']);
});

test('duplicate concurrent events and replay after restart do not resend', async t => {
  const s = await setup(t);
  const results = await Promise.all(Array.from({ length: 8 }, () => s.post(event())));
  assert.ok(results.every(r => r.status === 200));
  assert.equal(s.evo.requests.length, 1);
  await s.restart();
  assert.equal(((await (await s.post(event())).json()) as { result: string }).result, 'duplicate');
  assert.equal(s.evo.requests.length, 1);
});

test('the same provider id in another direct conversation is a separate message', async t => {
  const { createHmac } = await import('node:crypto');
  const { salt, senderHash } = await import('./helpers.ts');
  const second = '15555550101';
  const secondHash = createHmac('sha256', salt).update(second).digest('hex');
  const s = await setup(t, req => ({ status: 201, body: { key: { id: 'out', fromMe: true, remoteJid: `${req.body.number}@s.whatsapp.net` } } }), { ALLOWED_PHONE_HASHES: `${senderHash},${secondHash}` });
  await s.post(event());
  await s.post(event('message-1', { key: { id: 'message-1', fromMe: false, remoteJid: `${second}@s.whatsapp.net` } }));
  assert.equal(s.evo.requests.length, 2);
});

test('bad webhook auth and unauthorized senders cannot trigger outbound requests', async t => {
  const s = await setup(t);
  assert.equal((await s.post(event(), 'invalid')).status, 401);
  assert.equal((await s.post(event(), '')).status, 401);
  const foreign = event('foreign', { key: { id: 'foreign', remoteJid: '15555550199@s.whatsapp.net', fromMe: false } });
  assert.equal(((await (await s.post(foreign)).json()) as { result: string }).result, 'ignored');
  assert.equal(s.evo.requests.length, 0);
  assert.deepEqual(s.status(), []);
});

test('protocol, own, media and other-instance events produce no outbound reply', async t => {
  const s = await setup(t);
  for (const input of [event('p', { message: { protocolMessage: {} } }), event('o', { key: { id: 'o', fromMe: true } }), event('a', { message: { audioMessage: {} } }), { ...event(), instance: 'other' }]) {
    assert.equal((await s.post(input)).status, 200);
  }
  assert.equal(s.evo.requests.length, 0);
});

test('per-sender rate limit is enforced without sending more messages', async t => {
  const s = await setup(t, undefined, { RATE_LIMIT_PER_MINUTE: '2' });
  await s.post(event('one')); await s.post(event('two'));
  assert.equal((await s.post(event('three'))).status, 429);
  assert.equal((await s.post(event('one'))).status, 200);
  assert.equal(s.evo.requests.length, 2);
});

test('a provider error is recorded without claiming success or retrying', async t => {
  const s = await setup(t, () => ({ status: 500, body: { message: `private error ${key} ${phone}` } }));
  const r = await s.post(event());
  assert.equal(r.status, 200);
  assert.equal(((await r.json()) as { result: string }).result, 'delivery_unconfirmed');
  assert.deepEqual(s.status(), ['uncertain']);
  await s.post(event());
  assert.equal(s.evo.requests.length, 1);
  assert.doesNotMatch(JSON.stringify(s.logs), new RegExp(`${key}|${phone}|private error`));
});

test('HTTP success without an outgoing id is not accepted as send success', async t => {
  const s = await setup(t, () => ({ status: 200, body: { success: true } }));
  const result = await (await s.post(event())).json() as { result: string };
  assert.equal(result.result, 'delivery_unconfirmed');
  assert.deepEqual(s.status(), ['uncertain']);
});

test('an outgoing id for the wrong recipient is rejected', async t => {
  const s = await setup(t, () => ({ status: 201, body: { key: { id: 'out', fromMe: true, remoteJid: 'other@s.whatsapp.net' } } }));
  assert.equal(((await (await s.post(event())).json()) as { result: string }).result, 'delivery_unconfirmed');
});

test('Evolution redirects are not followed with API credentials', async t => {
  const s = await setup(t, () => ({ status: 302, headers: { location: '/capture' }, body: {} }));
  assert.equal(((await (await s.post(event())).json()) as { result: string }).result, 'delivery_unconfirmed');
  assert.equal(s.evo.requests.length, 1);
});

test('a timed-out send remains uncertain across restart and is not resent', async t => {
  const s = await setup(t, async () => { await new Promise(r => setTimeout(r, 250)); return { status: 201, body: {} }; }, { EVOLUTION_TIMEOUT_MS: '50' });
  assert.equal(((await (await s.post(event())).json()) as { result: string }).result, 'delivery_unconfirmed');
  await s.restart(); await s.post(event());
  assert.equal(s.evo.requests.length, 1);
  assert.deepEqual(s.status(), ['uncertain']);
});

test('malformed JSON, content type and oversized requests do not invoke Evolution', async t => {
  const s = await setup(t);
  const send = (body: string, contentType = 'application/json') => fetch(`${s.url}/webhooks/evolution`, { method: 'POST', headers: { 'x-webhook-secret': secret, 'content-type': contentType }, body });
  assert.equal((await send('{')).status, 400);
  assert.equal((await send('{}', 'text/plain')).status, 415);
  assert.equal((await send('x'.repeat(70000))).status, 413);
  assert.equal(s.evo.requests.length, 0);
});

test('raw message content never enters SQLite or operational logs', async t => {
  const s = await setup(t);
  const text = 'private-message-content-not-for-storage';
  await s.post(event('private', { message: { conversation: text } }));
  assert.doesNotMatch(JSON.stringify(s.logs), new RegExp(`${text}|${phone}|${secret}|${key}`));
  const { readFile } = await import('node:fs/promises');
  const bytes = await readFile(s.config.databasePath);
  assert.equal(bytes.includes(Buffer.from(text)), false);
  assert.equal(bytes.includes(Buffer.from(phone)), false);
});

test('a chunked oversized body returns 413 instead of dropping the connection', async t => {
  const s = await setup(t);
  const { request } = await import('node:http');
  const status = await new Promise<number | undefined>((resolve, reject) => {
    const req = request(`${s.url}/webhooks/evolution`, { method: 'POST', headers: { 'x-webhook-secret': secret, 'content-type': 'application/json', 'transfer-encoding': 'chunked' } }, res => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.write('x'.repeat(40000)); req.end('x'.repeat(40000));
  });
  assert.equal(status, 413);
  assert.equal(s.evo.requests.length, 0);
});

test('agent mode uses the model and sends its answer through Evolution without exposing the key', async t => {
  const temp = await tempDir();
  const evo = await evolutionFixture();
  const apiKey = 'private-test-openai-key';
  const modelCalls: any[] = [];
  const config = loadConfig({ ...configEnv(evo.url, join(temp.dir, 'agent.sqlite')), AGENT_MODE: 'openai',
    OPENAI_API_KEY: apiKey, OPENAI_MODEL: 'test-model', STATE_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') });
  const backend = createBackend(config, { log: () => {}, modelFetch: async (_url, options) => {
    modelCalls.push(JSON.parse(String(options?.body)));
    return new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Bom dia, Dr. Edson.' }] }] }));
  } });
  const url = await listen(backend.server);
  t.after(async () => { await backend.close(); await evo.close(); await temp.cleanup(); });
  const r = await fetch(`${url}/webhooks/evolution`, { method: 'POST', headers: { 'x-webhook-secret': secret, 'content-type': 'application/json' }, body: JSON.stringify(event()) });
  assert.equal(r.status, 200);
  assert.equal(evo.requests[0].body.text, 'Bom dia, Dr. Edson.');
  assert.equal(modelCalls.length, 1);
  assert.doesNotMatch(JSON.stringify(modelCalls), new RegExp(apiKey));
  const health = await (await fetch(`${url}/health`)).json() as any;
  assert.equal(health.stage, 'agent');
  assert.equal(health.modelConfigured, true);
  assert.equal(health.modelConnected, false);
});
