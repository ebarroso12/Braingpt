import test from 'node:test';
import assert from 'node:assert/strict';
import { ResponsesModel } from '../app/adapters/openai.ts';

const settings = { apiKey: 'test-only-private-key', model: 'test-model', timeoutMs: 100 };

test('a model timeout is bounded and returns a sanitized error', async () => {
  const model = new ResponsesModel(settings, async (_url, options) => new Promise((_resolve, reject) => {
    // Keep the test event loop alive until the synthetic network operation ends.
    const timer = setTimeout(() => reject(new Error('late network failure')), 500);
    options?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error(settings.apiKey)); });
  }));
  await assert.rejects(model.complete('instructions', [], [], model.deadline()), { message: 'Model unavailable' });
});

for (const [name, body] of [
  ['incomplete response', { status: 'incomplete', output: [] }],
  ['malformed output', { status: 'completed', output: 'not an array' }],
  ['oversized output', { status: 'completed', output: [{ type: 'message', text: 'x'.repeat(270000) }] }],
] as const) {
  test(`rejects ${name} without returning provider data`, async () => {
    const model = new ResponsesModel(settings, async () => new Response(JSON.stringify(body)));
    await assert.rejects(model.complete('instructions', [], [], model.deadline()), { message: 'Model unavailable' });
  });
}
