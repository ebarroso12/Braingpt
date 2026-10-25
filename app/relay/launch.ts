import { realpath, stat } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadRelayConfig } from './config.ts';
import { installRelay } from './install.ts';
import { AgentState } from '../agent/state.ts';
import { ExecutiveAgent } from '../agent/orchestrator.ts';
import { ResponsesModel } from '../adapters/openai.ts';

try {
  const config = loadRelayConfig();
  const root = await realpath(config.root);
  if (root.split(sep).includes('.openclaw')) throw new Error('OpenClaw excluded');
  // The reported installation uses scripts/. Upstream source uses plugins/.../scripts/.
  const candidates = [join(root, 'scripts'), join(root, 'plugins/whatsapp-relay/scripts')];
  const dirs: string[] = [];
  for (const dir of candidates) {
    if (await stat(join(dir, 'controller-daemon.mjs')).then(s => s.isFile()).catch(() => false)) dirs.push(dir);
  }
  if (dirs.length !== 1) throw new Error('Relay location missing or ambiguous');
  const scriptDir = dirs[0];
  const source = await import(pathToFileURL(join(scriptDir, 'controller-bridge.mjs')).href);
  const prototype = source.WhatsAppControllerBridge?.prototype;
  if (!prototype || typeof prototype.start !== 'function' || typeof prototype.stop !== 'function') throw new Error('Unsupported relay export');
  const originalStart = prototype.start;
  const originalStop = prototype.stop;
  const instances = new WeakMap<object, { installation: ReturnType<typeof installRelay>; agent: ExecutiveAgent }>();
  prototype.start = async function(...args: any[]) {
    if (instances.has(this)) return originalStart.apply(this, args);
    const state = new AgentState(config.databasePath, config.stateEncryptionKey);
    const agent = new ExecutiveAgent(state, new ResponsesModel(config.model), { timezone: config.timezone, secrets: [config.model.apiKey, config.stateEncryptionKey, config.salt] });
    try {
      const installation = installRelay(this, agent, config);
      instances.set(this, { installation, agent });
      return await originalStart.apply(this, args);
    } catch {
      const active = instances.get(this);
      if (active) { await active.installation.drain(); active.installation.dispose(); instances.delete(this); }
      agent.close(); throw new Error('Braingpt relay startup failed');
    }
  };
  prototype.stop = async function(...args: any[]) {
    const active = instances.get(this);
    try { if (active) await active.installation.drain(); return await originalStop.apply(this, args); }
    finally { if (active) { active.installation.dispose(); active.agent.close(); instances.delete(this); } }
  };
  await import(pathToFileURL(join(scriptDir, 'controller-daemon.mjs')).href);
} catch {
  console.error(JSON.stringify({ event: 'braingpt_relay_startup_failed', hint: 'Verifique a versão da ponte, caminhos e configuração privada. Nenhuma credencial foi exibida.' }));
  process.exitCode = 1;
}
