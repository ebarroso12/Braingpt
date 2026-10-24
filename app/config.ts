import { resolve } from 'node:path';

export interface Config {
  baseUrl: string;
  apiKey: string;
  instance: string;
  webhookSecret: string;
  senderHashSalt: string;
  allowedHashes: ReadonlySet<string>;
  databasePath: string;
  host: string;
  port: number;
  timezone: string;
  timeoutMs: number;
  rateLimit: number;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const required = (name: string, minimum = 1) => {
    const value = env[name]?.trim();
    if (!value || value.length < minimum || value.includes('[armazenar') || value.includes('[nome')) {
      throw new Error(`Configuração inválida: ${name}`);
    }
    return value;
  };
  const integer = (name: string, fallback: number, min: number, max: number) => {
    const raw = env[name] ?? String(fallback);
    if (!/^\d+$/.test(raw)) throw new Error(`Configuração inválida: ${name}`);
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(`Configuração inválida: ${name}`);
    return n;
  };
  let url: URL;
  try { url = new URL(required('EVOLUTION_BASE_URL')); }
  catch { throw new Error('Configuração inválida: EVOLUTION_BASE_URL'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) {
    throw new Error('Configuração inválida: EVOLUTION_BASE_URL');
  }
  const instance = required('EVOLUTION_INSTANCE');
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(instance)) throw new Error('Configuração inválida: EVOLUTION_INSTANCE');
  const hashes = required('ALLOWED_PHONE_HASHES').split(',').map(h => h.trim().toLowerCase());
  if (hashes.some(h => !/^[a-f0-9]{64}$/.test(h))) throw new Error('Configuração inválida: ALLOWED_PHONE_HASHES');
  const timezone = env.TIMEZONE || 'America/Sao_Paulo';
  try { new Intl.DateTimeFormat('pt-BR', { timeZone: timezone }); }
  catch { throw new Error('Configuração inválida: TIMEZONE'); }
  return {
    baseUrl: url.toString().replace(/\/+$/, ''), apiKey: required('EVOLUTION_API_KEY'), instance,
    webhookSecret: required('EVOLUTION_WEBHOOK_SECRET', 32), senderHashSalt: required('SENDER_HASH_SALT', 32),
    allowedHashes: new Set(hashes), databasePath: resolve(env.DATABASE_PATH || 'data/braingpt.sqlite'),
    host: env.HOST || '127.0.0.1', port: integer('PORT', 3030, 1, 65535), timezone,
    timeoutMs: integer('EVOLUTION_TIMEOUT_MS', 10000, 20, 60000),
    rateLimit: integer('RATE_LIMIT_PER_MINUTE', 20, 1, 1000),
  };
}
