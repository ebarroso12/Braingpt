import { createHmac } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const salt = process.env.SENDER_HASH_SALT?.trim();
if (!salt || salt.length < 32) {
  console.error('Configure SENDER_HASH_SALT com pelo menos 32 caracteres no ambiente privado.');
  process.exitCode = 1;
} else {
  const input = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const raw = await input.question('Telefone com código do país (não será gravado): ');
    const phone = raw.replace(/[+\s()-]/g, '');
    if (!/^[1-9]\d{7,14}$/.test(phone)) throw new Error('invalid_phone');
    console.log(createHmac('sha256', salt).update(phone).digest('hex'));
  } catch { console.error('Telefone inválido ou entrada indisponível.'); process.exitCode = 1; }
  finally { input.close(); }
}
