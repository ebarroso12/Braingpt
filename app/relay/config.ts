import { isAbsolute, resolve, sep } from 'node:path';
import { loadModelSettings } from '../agent/config.ts';

export function loadRelayConfig(env: Record<string, string | undefined> = process.env) {
  if (!env.RELAY_ROOT || !isAbsolute(env.RELAY_ROOT)) throw new Error('Configuração inválida: RELAY_ROOT');
  const root = resolve(env.RELAY_ROOT);
  if (root.split(sep).includes('.openclaw')) throw new Error('OpenClaw is outside this integration');
  if (!env.DATABASE_PATH || !isAbsolute(env.DATABASE_PATH)) throw new Error('Use um DATABASE_PATH absoluto e privado para a ponte');
  const salt = env.SENDER_HASH_SALT?.trim();
  if (!salt || salt.length < 32) throw new Error('Configuração inválida: SENDER_HASH_SALT');
  const namespace = env.RELAY_NAMESPACE || 'main';
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(namespace)) throw new Error('Configuração inválida: RELAY_NAMESPACE');
  const rateLimit = Number(env.RATE_LIMIT_PER_MINUTE || '20');
  if (!Number.isInteger(rateLimit) || rateLimit < 1 || rateLimit > 1000) throw new Error('Configuração inválida: RATE_LIMIT_PER_MINUTE');
  const timezone = env.TIMEZONE || 'America/Sao_Paulo';
  new Intl.DateTimeFormat('pt-BR', { timeZone: timezone });
  const sendTimeoutMs = Number(env.RELAY_SEND_TIMEOUT_MS || '10000');
  if (!Number.isInteger(sendTimeoutMs) || sendTimeoutMs < 20 || sendTimeoutMs > 30000) throw new Error('Configuração inválida: RELAY_SEND_TIMEOUT_MS');
  return { root, databasePath: resolve(env.DATABASE_PATH), salt, namespace, rateLimit, sendTimeoutMs, timezone, ...loadModelSettings(env) };
}
