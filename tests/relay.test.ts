import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { installRelay } from '../app/relay/install.ts';
import { loadRelayConfig } from '../app/relay/config.ts';
import { tempDir, phone, salt } from './helpers.ts';

const ownerJid = `${phone}@s.whatsapp.net`;
const raw = (id: string, text = 'Olá', overrides: any = {}) => ({ key: { id, remoteJid: ownerJid, fromMe: true }, messageTimestamp: Math.floor(Date.now() / 1000), message: { conversation: text }, ...overrides });

async function setup(t: any) {
  const tmp = await tempDir();
  const sent: any[] = []; const native: any[] = []; const prompts: any[] = [];
  let count = 0;
  const bridge = {
    runtime: { socket: { user: { id: `${phone}:4@s.whatsapp.net` } }, ensureConnected: async () => ({ sendMessage: async (chat: string, body: any, options?: any) => {
      const id = options?.messageId || `out-${++count}`;
      sent.push({ chat, body, id }); return { key: { id, remoteJid: chat, fromMe: true } };
    } }) },
    configStore: { load: async () => ({ enabled: true }), findControllerByJid: async (jid: string) => jid === ownerJid ? { phoneKey: phone } : null },
    handleIncomingMessage: async (m: any) => { native.push(m); },
    sendTextMessage: async (_chat: string, _text: string) => {},
    sendReply: async function(chat: string, text: string) { await this.sendTextMessage(chat, text); },
    rememberOutgoingMessage: (_id: string) => {},
    handleMessagesUpsert: async function(payload: any) { for (const m of payload.messages || []) await this.handleIncomingMessage(m); },
    sendVoiceNoteMessage: async function(chat: string, audio: Buffer, options: any = {}) {
      const socket = await this.runtime.ensureConnected();
      const sent = await socket.sendMessage(chat, { audio, ptt: true, ...options });
      this.rememberOutgoingMessage(sent.key.id);
    },
  };
  const options = { databasePath: join(tmp.dir, 'relay.sqlite'), salt, namespace: 'main', rateLimit: 20, sendTimeoutMs: 10000 };
  const agent = { reply: async (scope: string, text: string) => { prompts.push({ scope, text }); return 'Resposta do assistente'; } };
  let installation = installRelay(bridge, agent, options);
  t.after(async () => { installation.dispose(); await tmp.cleanup(); });
  return { bridge, sent, prompts, native, options, agent, drain: () => installation.drain(), reinstall: () => { installation.dispose(); installation = installRelay(bridge, agent, options); } };
}

test('a message written to myself reaches Braingpt through the existing session', async t => {
  const s = await setup(t);
  await s.bridge.handleIncomingMessage(raw('self'));
  assert.equal(s.prompts.length, 1);
  assert.equal(s.prompts[0].text, 'Olá');
  assert.equal(s.sent[0].chat, ownerJid);
  assert.match(s.sent[0].body.text, /^\[Braingpt\]/);
  assert.equal(s.native.length, 0);
});

test('protocol events and the bot own replies never create a response loop', async t => {
  const s = await setup(t);
  await s.bridge.handleIncomingMessage(raw('protocol', '', { message: { protocolMessage: {} } }));
  await s.bridge.handleIncomingMessage(raw('placeholder', '[protocolMessage]'));
  await s.bridge.handleIncomingMessage(raw('self'));
  await s.bridge.handleIncomingMessage(raw(s.sent[0].id, 'Resposta do assistente'));
  await s.bridge.handleIncomingMessage(raw('unknown-id-before-ack', '[Braingpt] Resposta do assistente'));
  assert.equal(s.prompts.length, 1);
  assert.equal(s.sent.length, 1);
  assert.equal(s.native.length, 0);
});

test('duplicate messages and outgoing echoes remain ignored after adapter restart', async t => {
  const s = await setup(t);
  await s.bridge.handleIncomingMessage(raw('same'));
  s.reinstall();
  await s.bridge.handleIncomingMessage(raw('same'));
  await s.bridge.handleIncomingMessage(raw(s.sent[0].id, 'text without marker'));
  assert.equal(s.prompts.length, 1);
  assert.equal(s.sent.length, 1);
});

test('outbound messages to somebody else and unknown contacts cannot trigger the agent', async t => {
  const s = await setup(t);
  const jid = '15555550199@s.whatsapp.net';
  s.bridge.configStore.findControllerByJid = async () => ({ phoneKey: '15555550199' });
  await s.bridge.handleIncomingMessage(raw('outgoing-other', 'Olá', { key: { id: 'outgoing-other', remoteJid: jid, fromMe: true } }));
  s.bridge.configStore.findControllerByJid = async () => null;
  await s.bridge.handleIncomingMessage(raw('untrusted', 'Olá', { key: { id: 'untrusted', remoteJid: jid, fromMe: false } }));
  assert.equal(s.prompts.length, 0);
  assert.equal(s.native.length, 0);
});

test('native slash commands and voice notes stay in the existing Codex flow', async t => {
  const s = await setup(t);
  await s.bridge.handleIncomingMessage(raw('status', '/status'));
  await s.bridge.handleIncomingMessage(raw('voice', '', { message: { audioMessage: { mimetype: 'audio/ogg' } } }));
  assert.equal(s.native.length, 2);
  assert.equal(s.prompts.length, 0);
});

test('all chunks of native replies carry the echo marker', async t => {
  const s = await setup(t);
  await s.bridge.sendTextMessage(ownerJid, 'a'.repeat(8000));
  assert.ok(s.sent.length >= 3);
  for (const part of s.sent) assert.match(part.body.text, /^\[Braingpt\]/);
});

test('a failed existing socket send does not rerun the agent on a duplicate event', async t => {
  const s = await setup(t);
  s.bridge.runtime.ensureConnected = async () => { throw new Error('private provider failure'); };
  await s.bridge.handleIncomingMessage(raw('failed'));
  await s.bridge.handleIncomingMessage(raw('failed'));
  assert.equal(s.prompts.length, 1);
});

test('relay configuration does not require Evolution keys and requires the existing model configuration', () => {
  const cfg = loadRelayConfig({ RELAY_ROOT: '/opt/codex-whatsapp-relay', DATABASE_PATH: '/tmp/relay.sqlite', SENDER_HASH_SALT: salt,
    OPENAI_API_KEY: 'synthetic-only-model-key', OPENAI_MODEL: 'test-model', STATE_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') });
  assert.equal(cfg.root, '/opt/codex-whatsapp-relay');
  assert.equal(cfg.model.model, 'test-model');
  assert.throws(() => loadRelayConfig({}));
});

test('wrapped voice notes continue into the existing native transcription flow', async t => {
  const s = await setup(t);
  for (const wrapper of ['viewOnceMessageV2', 'documentWithCaptionMessage']) {
    await s.bridge.handleIncomingMessage(raw(wrapper, '', { message: { [wrapper]: { message: { audioMessage: { mimetype: 'audio/ogg' } } } } }));
  }
  assert.equal(s.native.length, 2);
});

test('shutdown drains every message of a batch already accepted by the bridge', async t => {
  const s = await setup(t);
  let release!: () => void;
  let entered!: () => void;
  const gate = new Promise<void>(r => release = r);
  const started = new Promise<void>(r => entered = r);
  s.agent.reply = async (_scope, text) => { s.prompts.push({ text }); entered(); if (text === 'first') await gate; return 'Resposta'; };
  const batch = s.bridge.handleMessagesUpsert({ messages: [raw('first', 'first'), raw('second', 'second')] });
  await started;
  const draining = s.drain();
  release();
  await Promise.all([batch, draining]);
  assert.deepEqual(s.prompts.map(p => p.text), ['first', 'second']);
});

test('connection waiting is bounded and a timed-out reply cannot start sending later', async t => {
  const s = await setup(t);
  s.options.sendTimeoutMs = 20;
  s.reinstall();
  let release!: (socket: any) => void;
  const gate = new Promise<any>(r => release = r);
  s.bridge.runtime.ensureConnected = () => gate;
  const job = s.bridge.handleIncomingMessage(raw('waiting'));
  const finished = await Promise.race([job.then(() => true), new Promise<boolean>(r => setTimeout(() => r(false), 100))]);
  release({ sendMessage: async () => { s.sent.push('unexpected late send'); return { key: { id: 'late' } }; } });
  await job;
  await new Promise(r => setTimeout(r, 5));
  assert.equal(finished, true);
  assert.equal(s.sent.length, 0);
});

test('a voice reply echoed before its send acknowledgement cannot become a voice command', async t => {
  const s = await setup(t);
  s.bridge.runtime.ensureConnected = async () => ({ sendMessage: async (_chat: string, _body: any, options?: any) => {
    const id = options?.messageId || 'echo-before-ack';
    await s.bridge.handleIncomingMessage(raw(id, '', { message: { audioMessage: { mimetype: 'audio/ogg' } } }));
    return { key: { id, remoteJid: ownerJid, fromMe: true } };
  } });
  await s.bridge.sendVoiceNoteMessage(ownerJid, Buffer.from('synthetic-audio'));
  assert.equal(s.native.length, 0);
});
