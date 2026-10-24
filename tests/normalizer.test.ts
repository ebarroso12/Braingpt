import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvent } from '../app/normalizer.ts';
import { event, phone } from './helpers.ts';

test('accepts direct text and retains the provider message identity', () => {
  const m = normalizeEvent(event(), 'braingpt-test');
  assert.equal(m?.text, 'Olá');
  assert.equal(m?.phone, phone);
  assert.equal(m?.messageId, 'message-1');
});

test('unwraps an ephemeral extended text without treating protocol as text', () => {
  const e = event('e', { message: { ephemeralMessage: { message: { extendedTextMessage: { text: 'Bom dia' } } } } });
  assert.equal(normalizeEvent(e, 'braingpt-test')?.text, 'Bom dia');
});

const ignored = [
  ['protocol', event('p', { message: { protocolMessage: { type: 0 } } })],
  ['own message', event('o', { key: { id: 'o', remoteJid: `${phone}@s.whatsapp.net`, fromMe: true } })],
  ['unknown direction', event('u', { key: { id: 'u', remoteJid: `${phone}@s.whatsapp.net` } })],
  ['group', event('g', { key: { id: 'g', remoteJid: '12345@g.us', fromMe: false } })],
  ['LID not securely resolved', event('l', { key: { id: 'l', remoteJid: '12345@lid', fromMe: false } })],
  ['image', event('i', { message: { imageMessage: { caption: 'Olá' } } })],
  ['literal protocol placeholder', event('t', { message: { conversation: '[protocolMessage]' } })],
  ['blank text', event('b', { message: { conversation: '  ' } })],
  ['oversized text', event('b', { message: { conversation: 'a'.repeat(9000) } })],
  ['missing id', event('m', { key: { remoteJid: `${phone}@s.whatsapp.net`, fromMe: false } })],
  ['different instance', { ...event(), instance: 'other' }],
  ['delivery receipt', { ...event(), event: 'messages.update' }],
  ['null', null], ['array', []],
];
for (const [name, input] of ignored) {
  test(`ignores ${name} without a reply`, () => assert.equal(normalizeEvent(input, 'braingpt-test'), null));
}
