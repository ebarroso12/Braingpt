export interface InboundText {
  instance: string;
  conversationId: string;
  phone: string;
  messageId: string;
  text: string;
}

export function normalizeEvent(input: unknown, expectedInstance: string): InboundText | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const e = input as Record<string, any>;
  if (!['messages.upsert', 'MESSAGES_UPSERT'].includes(e.event) || e.instance !== expectedInstance) return null;
  const data = e.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const k = data.key;
  if (!k || k.fromMe !== false || typeof k.id !== 'string' || !k.id.trim() || k.id.length > 256) return null;
  if (typeof k.remoteJid !== 'string' || !/^[1-9]\d{7,14}@s\.whatsapp\.net$/.test(k.remoteJid)) return null;
  let m = data.message;
  for (let depth = 0; depth < 3 && m && typeof m === 'object'; depth++) {
    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    else if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    else break;
  }
  if (!m || typeof m !== 'object' || m.protocolMessage) return null;
  const raw = m.conversation ?? m.extendedTextMessage?.text;
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!text || text.length > 8000 || /^\[protocolMessage\]$/i.test(text)) return null;
  return { instance: e.instance, conversationId: k.remoteJid, phone: k.remoteJid.split('@')[0], messageId: k.id, text };
}
