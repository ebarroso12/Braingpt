import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Config } from './config.ts';
import { authenticate, logAudit, privateHash } from './security.ts';
import type { AuditLogger } from './security.ts';
import { normalizeEvent } from './normalizer.ts';
import { InboxStore } from './store.ts';
import { sendText } from './adapters/evolution.ts';
import { ResponsesModel } from './adapters/openai.ts';
import { AgentState } from './agent/state.ts';
import { ExecutiveAgent } from './agent/orchestrator.ts';

const TRANSPORT_RESPONSE = 'Dr. Edson, o Braingpt recebeu sua mensagem. Este canal está em validação; o modelo e as ferramentas ainda não estão conectados. Nenhuma ação externa foi executada.';

function respond(res: ServerResponse, status: number, body: object) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

class RequestError extends Error {
  status: number;
  constructor(status: number) { super('Request rejected'); this.status = status; }
}

async function readEvent(req: IncomingMessage): Promise<unknown> {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw new RequestError(415);
  const length = Number(req.headers['content-length'] || 0);
  if (length > 65536) throw new RequestError(413);
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) throw new RequestError(413);
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new RequestError(400); }
}

export function createBackend(config: Config, options: { log?: AuditLogger; modelFetch?: typeof fetch } = {}) {
  const store = new InboxStore(config.databasePath);
  const agent = config.agentMode === 'openai' && config.model && config.stateEncryptionKey ? new ExecutiveAgent(
    new AgentState(config.databasePath, config.stateEncryptionKey), new ResponsesModel(config.model, options.modelFetch),
    { timezone: config.timezone, secrets: [config.model.apiKey, config.apiKey, config.webhookSecret, config.senderHashSalt, config.stateEncryptionKey] },
  ) : undefined;
  const writeLog = options.log || logAudit;
  const log: AuditLogger = record => { try { writeLog(record); } catch { /* logging must not repeat side effects */ } };
  const server = createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        respond(res, 200, agent ? { name: 'Braingpt', status: 'ok', stage: 'agent', modelConfigured: true, modelConnected: false } : { name: 'Braingpt', status: 'ok', stage: 'transport-only', modelConnected: false }); return;
      }
      if (req.method !== 'POST' || req.url !== '/webhooks/evolution') { respond(res, 404, { error: 'not_found' }); return; }
      if (!authenticate(req.headers['x-webhook-secret'], config.webhookSecret)) {
        log({ event: 'unauthorized' }); respond(res, 401, { error: 'unauthorized' }); return;
      }
      const input = await readEvent(req);
      const message = normalizeEvent(input, config.instance);
      if (!message) { log({ event: 'ignored' }); respond(res, 200, { result: 'ignored' }); return; }
      const senderHash = privateHash(config.senderHashSalt, message.phone);
      if (!config.allowedHashes.has(senderHash)) {
        log({ event: 'unauthorized' }); respond(res, 200, { result: 'ignored' }); return;
      }
      const messageRef = privateHash(config.senderHashSalt, JSON.stringify([message.instance, message.conversationId, message.messageId]));
      const reservation = store.reserve(messageRef, senderHash, config.rateLimit);
      if (reservation === 'duplicate') {
        log({ event: 'duplicate', messageRef }); respond(res, 200, { result: 'duplicate' }); return;
      }
      if (reservation === 'rate_limited') {
        log({ event: 'rate_limited' }); res.setHeader('retry-after', '60'); respond(res, 429, { error: 'rate_limited' }); return;
      }
      try {
        const scope = privateHash(config.senderHashSalt, JSON.stringify([message.instance, message.conversationId]));
        const reply = agent ? await agent.reply(scope, message.text) : TRANSPORT_RESPONSE;
        store.transition(messageRef, 'sending');
        const id = await sendText(config, message, reply);
        store.transition(messageRef, 'accepted', privateHash(config.senderHashSalt, id));
        log({ event: 'accepted', messageRef }); respond(res, 200, { result: 'accepted' });
      } catch {
        store.transition(messageRef, 'uncertain');
        log({ event: 'delivery_unconfirmed', messageRef });
        // A retry could duplicate a send accepted just before a timeout.
        respond(res, 200, { result: 'delivery_unconfirmed' });
      }
    } catch (e) {
      if (res.headersSent) { res.end(); return; }
      const status = e instanceof RequestError ? e.status : 503;
      if (status === 503) log({ event: 'internal_failure' });
      respond(res, status, { error: status === 503 ? 'temporarily_unavailable' : 'invalid_request' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return {
    server,
    close: async () => {
      if (server.listening) await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
      agent?.close();
      store.close();
    },
  };
}
