import { InboxStore } from '../store.ts';
import { privateHash } from '../security.ts';
import type { ExecutiveAgent } from '../agent/orchestrator.ts';
import { randomBytes } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

interface Options { databasePath: string; salt: string; namespace: string; rateLimit: number; sendTimeoutMs?: number }
const marker = '[Braingpt]';
const installed = Symbol.for('braingpt.relay.installation');

function textOf(message: any): { text: string; audio: boolean; protocol: boolean } {
  let m = message;
  for (let n = 0; n < 3; n++) {
    if (m?.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    else if (m?.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    else if (m?.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
    else if (m?.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;
    else break;
  }
  const raw = m?.conversation ?? m?.extendedTextMessage?.text;
  return { text: typeof raw === 'string' ? raw.trim() : '', audio: Boolean(m?.audioMessage), protocol: Boolean(m?.protocolMessage) };
}

export function installRelay(bridge: any, agent: Pick<ExecutiveAgent, 'reply'>, options: Options) {
  if (bridge[installed]) throw new Error('Braingpt is already installed on this bridge');
  for (const key of ['handleIncomingMessage', 'sendTextMessage', 'sendReply', 'rememberOutgoingMessage']) {
    if (typeof bridge[key] !== 'function') throw new Error('Unsupported relay interface');
  }
  if (typeof bridge.configStore?.load !== 'function' || typeof bridge.configStore?.findControllerByJid !== 'function' || typeof bridge.runtime?.ensureConnected !== 'function') throw new Error('Unsupported relay interface');
  const store = new InboxStore(options.databasePath);
  const original = { handle: bridge.handleIncomingMessage, batch: bridge.handleMessagesUpsert, send: bridge.sendTextMessage, voice: bridge.sendVoiceNoteMessage, remember: bridge.rememberOutgoingMessage };
  const startedAt = Date.now();
  const outgoingRef = (id: string) => privateHash(options.salt, JSON.stringify(['outgoing', options.namespace, id]));
  const jobs = new Set<Promise<void>>();
  const acceptedBatch = new AsyncLocalStorage<boolean>();
  let accepting = true;
  let disposed = false;
  bridge[installed] = true;

  bridge.rememberOutgoingMessage = function(id: string) {
    if (typeof id === 'string' && id) store.rememberOutgoing(outgoingRef(id));
    return original.remember.call(this, id);
  };

  const sendParts = async (chatId: string, parts: object[]) => {
    let expired = false;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => { expired = true; reject(new Error('Relay delivery unconfirmed')); }, options.sendTimeoutMs ?? 10000); });
    const send = async () => {
      const socket = await bridge.runtime.ensureConnected();
      for (const body of parts) {
        if (expired) return;
        const messageId = randomBytes(16).toString('hex').toUpperCase();
        // Baileys rc.9 supports options.messageId; reserve BEFORE calling sendMessage.
        bridge.rememberOutgoingMessage(messageId);
        const sent = await socket.sendMessage(chatId, body, { messageId });
        if (!disposed && typeof sent?.key?.id === 'string') bridge.rememberOutgoingMessage(sent.key.id);
        if (sent?.key?.id !== messageId) throw new Error('Relay messageId contract not supported');
      }
    };
    try { await Promise.race([send(), deadline]); }
    finally { clearTimeout(timer!); }
  };

  bridge.sendTextMessage = async function(chatId: string, text: string) {
    if (typeof text !== 'string' || !text.trim()) return;
    const chars = Array.from(text.startsWith(marker) ? text.slice(marker.length).trimStart() : text);
    const parts = [];
    for (let i = 0; i < chars.length; i += 3000) parts.push({ text: `${marker} ${chars.slice(i, i + 3000).join('')}` });
    await sendParts(chatId, parts);
  };

  if (typeof original.voice === 'function') {
    bridge.sendVoiceNoteMessage = async function(chatId: string, audio: Buffer | Uint8Array, options: { mimetype?: string; seconds?: number } = {}) {
      const body: any = { audio: Buffer.from(audio), ptt: true, mimetype: options.mimetype || 'audio/ogg; codecs=opus' };
      if (Number.isFinite(options.seconds) && Number(options.seconds) > 0) body.seconds = options.seconds;
      await sendParts(chatId, [body]);
    };
  }

  const handle = async (message: any) => {
    if (!accepting && !acceptedBatch.getStore()) return;
    const k = message?.key;
    if (typeof k?.id !== 'string' || !k.id || k.id.length > 256 || typeof k.remoteJid !== 'string' ||
        !/^[1-9]\d{7,19}(?::\d+)?@(s\.whatsapp\.net|lid)$/.test(k.remoteJid) || typeof k.fromMe !== 'boolean') return;
    const content = textOf(message.message);
    if (content.protocol || /^\[protocolMessage\]$/i.test(content.text)) return;
    if (k.fromMe && (store.isOutgoing(outgoingRef(k.id)) || content.text.startsWith(marker))) return;
    const rawTime = message.messageTimestamp;
    const timestamp = rawTime && typeof rawTime === 'object' ? (typeof rawTime.toNumber === 'function' ? rawTime.toNumber() : typeof rawTime.low === 'number' ? (rawTime.high >>> 0) * 4294967296 + (rawTime.low >>> 0) : NaN) : Number(rawTime);
    if (!Number.isFinite(timestamp) || timestamp * 1000 < startedAt - 15000 || timestamp * 1000 > Date.now() + 300000) return;
    const config = await bridge.configStore.load();
    const controller = await bridge.configStore.findControllerByJid(k.remoteJid);
    if (!config?.enabled || !controller || !/^[1-9]\d{7,14}$/.test(controller.phoneKey || '')) return;
    if (k.fromMe) {
      const ownId = bridge.runtime.socket?.user?.id;
      const ownPhone = typeof ownId === 'string' ? ownId.match(/^(\d+)(?::\d+)?@s\.whatsapp\.net$/)?.[1] : undefined;
      const ownChat = typeof ownId === 'string' && ownId.replace(/:\d+@/, '@') === k.remoteJid.replace(/:\d+@/, '@');
      if (!ownChat && (!ownPhone || ownPhone !== controller.phoneKey)) return;
    }
    if (content.audio || content.text.startsWith('/')) { await original.handle.call(bridge, message); return; }
    if (!content.text || content.text.length > 8000) return;
    const senderHash = privateHash(options.salt, controller.phoneKey);
    const ref = privateHash(options.salt, JSON.stringify([options.namespace, k.remoteJid, k.id]));
    if (store.reserve(ref, senderHash, options.rateLimit) !== 'new') return;
    try {
      const scope = privateHash(options.salt, JSON.stringify([options.namespace, k.remoteJid]));
      const reply = await agent.reply(scope, content.text);
      store.transition(ref, 'sending');
      await bridge.sendReply(k.remoteJid, reply);
      store.transition(ref, 'accepted');
    } catch {
      store.transition(ref, 'uncertain');
      console.error(JSON.stringify({ event: 'braingpt_relay_delivery_unconfirmed', messageRef: ref }));
    }
  };

  bridge.handleIncomingMessage = function(message: any) {
    const job = handle(message).catch(() => { console.error(JSON.stringify({ event: 'braingpt_relay_processing_failed' })); });
    jobs.add(job);
    void job.finally(() => jobs.delete(job));
    return job;
  };

  if (typeof original.batch === 'function') {
    bridge.handleMessagesUpsert = function(payload: any) {
      if (!accepting) return Promise.resolve();
      const job: Promise<void> = acceptedBatch.run(true, () => Promise.resolve(original.batch.call(this, payload)));
      jobs.add(job); void job.finally(() => jobs.delete(job)).catch(() => {});
      return job;
    };
  }

  return {
    drain: async () => { accepting = false; await Promise.all([...jobs]); },
    dispose: () => {
      if (disposed) return;
      if (jobs.size) throw new Error('Drain Braingpt before disposal');
      accepting = false; disposed = true;
      bridge.handleIncomingMessage = original.handle; bridge.sendTextMessage = original.send; bridge.rememberOutgoingMessage = original.remember;
      if (original.batch) bridge.handleMessagesUpsert = original.batch;
      if (original.voice) bridge.sendVoiceNoteMessage = original.voice;
      delete bridge[installed]; store.close();
    },
  };
}
