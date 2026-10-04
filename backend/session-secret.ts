import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

let cachedSecret: string | undefined;
export function sessionSigningSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (cachedSecret) return cachedSecret;
  const directory = process.env.DATA_DIR || path.join(process.cwd(), 'backend', 'data');
  const filename = path.join(directory, '.session-secret');
  mkdirSync(directory, { recursive: true });
  try {
    writeFileSync(filename, randomBytes(48).toString('base64url'), { flag: 'wx', mode: 0o600 });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
  }
  cachedSecret = readFileSync(filename, 'utf8').trim();
  if (cachedSecret.length < 32) throw new Error('Invalid session signing configuration');
  return cachedSecret;
}
