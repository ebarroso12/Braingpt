import { loadConfig } from './config.ts';
import { createBackend } from './backend.ts';

try {
  const config = loadConfig();
  const backend = createBackend(config);
  backend.server.on('error', () => { console.error(JSON.stringify({ event: 'server_error' })); process.exitCode = 1; });
  backend.server.listen(config.port, config.host, () => console.info(JSON.stringify({ event: 'started', name: 'Braingpt', stage: 'transport-only' })));
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    const deadline = setTimeout(() => process.exit(1), 20000);
    deadline.unref();
    try { await backend.close(); clearTimeout(deadline); }
    catch { process.exitCode = 1; }
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} catch {
  // Configuration errors must not print values or the process environment.
  console.error(JSON.stringify({ event: 'startup_failed', hint: 'Verifique as variáveis exigidas em .env.example e o acesso ao banco.' }));
  process.exitCode = 1;
}
