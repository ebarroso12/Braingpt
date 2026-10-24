import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { AgentState } from '../app/agent/state.ts';
import { ExecutiveAgent } from '../app/agent/orchestrator.ts';
import { ResponsesModel } from '../app/adapters/openai.ts';
import { tempDir } from './helpers.ts';

const modelSettings = { apiKey: 'synthetic-private-api-key', model: 'test-model', timeoutMs: 1000 };
const answer = (text: string) => ({ status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] }] });
const call = (name: string, args: object) => ({ status: 'completed', output: [{ type: 'function_call', name, arguments: JSON.stringify(args), call_id: 'call-1', id: 'fc-1' }] });

async function setup(t: any, replies: any[]) {
  const tmp = await tempDir();
  const state = new AgentState(join(tmp.dir, 'agent.sqlite'), Buffer.alloc(32, 7).toString('base64'));
  const requests: any[] = [];
  const model = new ResponsesModel(modelSettings, async (url, options) => {
    assert.equal(String(url), 'https://api.openai.com/v1/responses');
    assert.equal(new Headers(options?.headers).get('authorization'), `Bearer ${modelSettings.apiKey}`);
    requests.push(JSON.parse(String(options?.body)));
    return new Response(JSON.stringify(replies.shift() ?? answer('Resposta curta.')), { status: 200 });
  });
  const agent = new ExecutiveAgent(state, model, { timezone: 'America/Sao_Paulo', secrets: [modelSettings.apiKey] });
  t.after(async () => { state.close(); await tmp.cleanup(); });
  return { state, requests, agent };
}

test('conversation uses the configured model and transmits no API key in input or instructions', async t => {
  const s = await setup(t, [answer('Bom dia, Dr. Edson.')]);
  assert.equal(await s.agent.reply('a', 'Bom dia'), 'Bom dia, Dr. Edson.');
  const req = s.requests[0];
  assert.equal(req.model, 'test-model');
  assert.equal(req.store, false);
  assert.match(req.instructions, /Braingpt/);
  assert.doesNotMatch(JSON.stringify(req), /synthetic-private-api-key/);
});

test('a proposed memory returns a backend-generated confirmation and cannot self-approve', async t => {
  const s = await setup(t, [call('remember_fact', { field: 'meeting_period', value: 'morning' })]);
  const reply = await s.agent.reply('a', 'Lembre minha preferência');
  const code = reply.match(/Confirmo ([a-f0-9]{16})/)?.[1];
  assert.ok(code);
  assert.deepEqual(s.state.memories('a'), []);
  assert.match(await s.agent.reply('b', `Confirmo ${code}`), /não|expir/i);
  assert.deepEqual(s.state.memories('a'), []);
  assert.match(await s.agent.reply('a', `Confirmo ${code}`), /guardad/i);
  assert.equal(s.state.memories('a').length, 1);
  assert.match(await s.agent.reply('a', `Confirmo ${code}`), /não|expir/i);
  assert.equal(s.requests.length, 1);
});

test('vague approval is not accepted as permission to change memory', async t => {
  const s = await setup(t, [call('remember_fact', { field: 'reply_style', value: 'concise' }), answer('Confirme o código apresentado.')]);
  await s.agent.reply('a', 'lembre');
  await s.agent.reply('a', 'sim');
  assert.deepEqual(s.state.memories('a'), []);
});

test('tool outputs and reasoning items return to the model without enabling unknown functions', async t => {
  const first = call('email_send', { recipient: 'third-party' });
  first.output.unshift({ type: 'reasoning', id: 'reason-1', summary: [] } as any);
  const s = await setup(t, [first, answer('O conector de e-mail não está habilitado.')]);
  const result = await s.agent.reply('a', 'Envie um e-mail');
  assert.match(result, /não está habilitado/);
  assert.ok(s.requests[1].input.some((i: any) => i.type === 'reasoning'));
  const toolOutput = s.requests[1].input.find((i: any) => i.type === 'function_call_output');
  assert.match(toolOutput.output, /not_enabled/);
});

test('unknown arguments cannot make the memory tool execute a different action', async t => {
  const s = await setup(t, [call('remember_fact', { field: 'reply_style', value: 'concise', approved: true }), answer('Preciso confirmar os dados.')]);
  await s.agent.reply('a', 'lembre');
  assert.deepEqual(s.state.memories('a'), []);
  assert.match(s.requests[1].input.find((i: any) => i.type === 'function_call_output').output, /invalid_arguments/);
});

test('secrets are blocked before reaching the model and never enter history', async t => {
  const s = await setup(t, []);
  assert.match(await s.agent.reply('a', `Minha chave ${modelSettings.apiKey}`), /credencia|chave/i);
  assert.equal(s.requests.length, 0);
  assert.deepEqual(s.state.history('a'), []);
});

test('a model failure is a short honest error and stores no raw provider error', async t => {
  const tmp = await tempDir();
  const state = new AgentState(join(tmp.dir, 'state.sqlite'), Buffer.alloc(32, 7).toString('base64'));
  t.after(async () => { state.close(); await tmp.cleanup(); });
  const model = new ResponsesModel(modelSettings, async () => new Response(JSON.stringify({ error: { message: modelSettings.apiKey } }), { status: 401 }));
  const agent = new ExecutiveAgent(state, model, { timezone: 'America/Sao_Paulo', secrets: [modelSettings.apiKey] });
  const result = await agent.reply('a', 'Olá');
  assert.match(result, /não consegui/i);
  assert.doesNotMatch(result, /synthetic-private/);
});

test('the tool loop is bounded and does not keep calling the model forever', async t => {
  const s = await setup(t, Array.from({ length: 10 }, () => call('capabilities', {})));
  assert.match(await s.agent.reply('a', 'continue'), /limite|não consegui/i);
  assert.ok(s.requests.length <= 4);
});

test('free-form clinical facts cannot be proposed as personal memory', async t => {
  const s = await setup(t, [call('remember_fact', { content: 'Pessoa Exemplo tem diabetes e toma insulina diariamente' }), answer('Esse conteúdo não pode ser guardado na memória pessoal.')]);
  const reply = await s.agent.reply('a', 'Lembre isto');
  assert.doesNotMatch(reply, /Confirmo [a-f0-9]{16}/);
  assert.deepEqual(s.state.memories('a'), []);
});
