import type { Config } from '../config.ts';
import type { InboundText } from '../normalizer.ts';

export class DeliveryUnconfirmed extends Error {
  constructor() { super('Evolution delivery unconfirmed'); }
}

export async function sendText(config: Config, message: InboundText, text: string): Promise<string> {
  try {
    const response = await fetch(`${config.baseUrl}/message/sendText/${encodeURIComponent(config.instance)}`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(config.timeoutMs),
      headers: { apikey: config.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ number: message.phone, text }),
    });
    if (!response.ok) { await response.body?.cancel(); throw new DeliveryUnconfirmed(); }
    // Bound the response too: never load unbounded third-party error/output data.
    let raw = '';
    let bytes = 0;
    const reader = response.body?.getReader();
    if (!reader) throw new DeliveryUnconfirmed();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 65536) { await reader.cancel(); throw new DeliveryUnconfirmed(); }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    const body = JSON.parse(raw);
    if (typeof body?.key?.id !== 'string' || !body.key.id.trim() || body.key.id.length > 256 || body.key.fromMe !== true ||
        body.key.remoteJid !== message.conversationId || ['ERROR', 'FAILED'].includes(body.status)) {
      throw new DeliveryUnconfirmed();
    }
    return body.key.id;
  } catch { throw new DeliveryUnconfirmed(); }
}
