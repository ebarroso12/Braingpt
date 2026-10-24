import { createServer } from 'node:http';
import { once } from 'node:events';
import { createHmac } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';

export const phone = '15555550100';
export const salt = 'test-only-sender-salt-32-characters';
export const secret = 'test-only-webhook-secret-32-characters';
export const key = 'test-only-evolution-key';
export const senderHash = createHmac('sha256', salt).update(phone).digest('hex');

export function event(id = 'message-1', patch: any = {}) {
  return {
    event: 'messages.upsert', instance: 'braingpt-test',
    data: { key: { id, remoteJid: `${phone}@s.whatsapp.net`, fromMe: false },
      message: { conversation: 'Olá' }, messageTimestamp: 1792850400, ...patch },
  };
}

export async function listen(server: Server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No address');
  return `http://127.0.0.1:${address.port}`;
}

export async function evolutionFixture(reply?: (request: any) => any) {
  const requests: any[] = [];
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const request = { url: req.url, method: req.method, headers: req.headers, body: JSON.parse(body) };
    requests.push(request);
    const result = reply ? await reply(request) : {
      status: 201, body: { key: { id: 'out-1', fromMe: true, remoteJid: `${phone}@s.whatsapp.net` }, status: 'PENDING' },
    };
    res.writeHead(result.status, { 'content-type': 'application/json', ...result.headers });
    res.end(JSON.stringify(result.body));
  });
  const url = await listen(server);
  return { url, requests, close: async () => { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); } };
}

export function configEnv(baseUrl: string, dbPath: string) {
  return {
    EVOLUTION_BASE_URL: baseUrl, EVOLUTION_API_KEY: key, EVOLUTION_INSTANCE: 'braingpt-test',
    EVOLUTION_WEBHOOK_SECRET: secret, SENDER_HASH_SALT: salt,
    ALLOWED_PHONE_HASHES: senderHash, DATABASE_PATH: dbPath,
    HOST: '127.0.0.1', PORT: '3030', EVOLUTION_TIMEOUT_MS: '1000',
  };
}

export async function tempDir() {
  const dir = await mkdtemp(join(tmpdir(), 'braingpt-test-'));
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}
