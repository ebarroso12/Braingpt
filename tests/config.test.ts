import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../app/config.ts';
import { configEnv } from './helpers.ts';

test('loads only a valid explicit instance, webhook secret and allowlist', () => {
  const c = loadConfig(configEnv('https://evo.example', '/tmp/test.sqlite'));
  assert.equal(c.instance, 'braingpt-test');
  assert.equal(c.timezone, 'America/Sao_Paulo');
});

for (const [name, patch] of [
  ['missing key', { EVOLUTION_API_KEY: '' }],
  ['weak secret', { EVOLUTION_WEBHOOK_SECRET: 'short' }],
  ['empty allowlist', { ALLOWED_PHONE_HASHES: '' }],
  ['bad hash', { ALLOWED_PHONE_HASHES: 'phone-number' }],
  ['weak salt', { SENDER_HASH_SALT: 'short' }],
  ['plain external http', { EVOLUTION_BASE_URL: 'http://evo.example' }],
  ['URL credential', { EVOLUTION_BASE_URL: 'https://user:password@evo.example' }],
  ['URL query', { EVOLUTION_BASE_URL: 'https://evo.example?apikey=test' }],
  ['invalid instance', { EVOLUTION_INSTANCE: '../other' }],
  ['bad port', { PORT: '-1' }],
  ['bad timeout', { EVOLUTION_TIMEOUT_MS: '0' }],
] as const) {
  test(`fails closed for ${name}`, () => assert.throws(() => loadConfig({ ...configEnv('https://evo.example', '/tmp/test.sqlite'), ...patch })));
}

test('openai mode requires the existing key, an explicit model and a state encryption key', () => {
  const env = { ...configEnv('https://evo.example', '/tmp/test.sqlite'), AGENT_MODE: 'openai' };
  assert.throws(() => loadConfig(env));
  assert.throws(() => loadConfig({ ...env, OPENAI_API_KEY: 'synthetic-key', OPENAI_MODEL: 'test-model' }));
  const cfg = loadConfig({ ...env, OPENAI_API_KEY: 'synthetic-key', OPENAI_MODEL: 'test-model', STATE_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') });
  assert.equal(cfg.agentMode, 'openai');
  assert.equal(cfg.model?.model, 'test-model');
});

test('unknown agent mode does not silently fall back to transport', () => {
  assert.throws(() => loadConfig({ ...configEnv('https://evo.example', '/tmp/test.sqlite'), AGENT_MODE: 'claude' }));
});
