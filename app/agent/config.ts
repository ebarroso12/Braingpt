import type { ModelSettings } from '../adapters/openai.ts';

export function loadModelSettings(env: Record<string, string | undefined>): { model: ModelSettings; stateEncryptionKey: string } {
  const get = (name: string) => {
    const value = env[name]?.trim();
    if (!value || value.includes('[armazenar')) throw new Error(`Configuração inválida: ${name}`);
    return value;
  };
  const rawTimeout = env.OPENAI_TIMEOUT_MS || '20000';
  if (!/^\d+$/.test(rawTimeout) || Number(rawTimeout) < 100 || Number(rawTimeout) > 30000) throw new Error('Configuração inválida: OPENAI_TIMEOUT_MS');
  const stateEncryptionKey = get('STATE_ENCRYPTION_KEY');
  const bytes = Buffer.from(stateEncryptionKey, 'base64');
  if (bytes.length !== 32 || bytes.toString('base64') !== stateEncryptionKey) throw new Error('Configuração inválida: STATE_ENCRYPTION_KEY');
  return { model: { apiKey: get('OPENAI_API_KEY'), model: get('OPENAI_MODEL'), timeoutMs: Number(rawTimeout) }, stateEncryptionKey };
}
