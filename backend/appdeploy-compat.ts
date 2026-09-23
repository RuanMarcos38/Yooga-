import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

type StoredRecord = Record<string, unknown> & { id: string };
type PersistedRecord<T> = T & { id: string };

export type ApiResult = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

export type HandlerContext = {
  params: Record<string, string>;
  body: unknown;
  event: {
    headers: Record<string, string | undefined>;
    method: string;
    path: string;
  };
};

type RouteHandler = (context: HandlerContext) => ApiResult | Promise<ApiResult>;
type RouteTable = Record<string, [RouteHandler]>;

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'backend', 'data');
const uploadsDir = path.join(dataDir, 'uploads');
const collectionLocks = new Map<string, Promise<unknown>>();

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

export function json(body: unknown, status = 200): ApiResult {
  return { status, body, headers: jsonHeaders };
}

export function error(message: string, status = 500): ApiResult {
  return json({ message, error: message }, status);
}

function collectionPath(collection: string) {
  return path.join(dataDir, collection.replace(/[^a-z0-9_-]/gi, '_') + '.json');
}

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

async function readCollection(collection: string): Promise<StoredRecord[]> {
  await ensureDataDir();
  try {
    const content = await readFile(collectionPath(collection), 'utf8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

async function writeCollection(collection: string, records: StoredRecord[]) {
  await ensureDataDir();
  const target = collectionPath(collection);
  const temporary = target + '.tmp';
  await writeFile(temporary, JSON.stringify(records, null, 2), 'utf8');
  await rename(temporary, target);
}

function withCollectionLock<T>(collection: string, operation: () => Promise<T>): Promise<T> {
  const previous = collectionLocks.get(collection) || Promise.resolve();
  const next = previous.then(operation, operation);
  collectionLocks.set(collection, next.catch(() => undefined));
  return next;
}

function makeId() {
  return Date.now().toString(36) + '-' + randomBytes(4).toString('hex');
}

export const db = {
  async list<T>(collection: string, options?: { limit?: number }) {
    const records = await readCollection(collection);
    return {
      items: records.slice(0, options?.limit || records.length) as Array<PersistedRecord<T>>,
    };
  },

  async add(collection: string, records: Array<Record<string, unknown>>) {
    return withCollectionLock(collection, async () => {
      const current = await readCollection(collection);
      const ids: string[] = [];
      for (const record of records) {
        const id = makeId();
        ids.push(id);
        current.push({ id, ...record });
      }
      await writeCollection(collection, current);
      return ids;
    });
  },

  async update(collection: string, updates: Array<{ id: string; record: Record<string, unknown> }>) {
    return withCollectionLock(collection, async () => {
      const current = await readCollection(collection);
      const results = updates.map(update => {
        const index = current.findIndex(item => item.id === update.id);
        if (index < 0) return false;
        current[index] = { id: update.id, ...update.record };
        return true;
      });
      await writeCollection(collection, current);
      return results;
    });
  },

  async delete(collection: string, ids: string[]) {
    return withCollectionLock(collection, async () => {
      const current = await readCollection(collection);
      const idSet = new Set(ids);
      const results = ids.map(id => current.some(item => item.id === id));
      await writeCollection(collection, current.filter(item => !idSet.has(item.id)));
      return results;
    });
  },
};

function safeStoragePath(input: string) {
  const normalized = input.replace(/\\/g, '/').split('/').filter(part => part && part !== '.' && part !== '..').join('/');
  if (!normalized) throw new Error('invalid storage path');
  return normalized;
}

function publicStorageUrl(relativePath: string) {
  const base = (process.env.PUBLIC_API_URL || process.env.BACKEND_PUBLIC_URL || '').replace(/\/+$/, '');
  const encodedPath = safeStoragePath(relativePath).split('/').map(encodeURIComponent).join('/');
  return (base || '') + '/uploads/' + encodedPath;
}

export const storage = {
  async write(files: Array<{ path: string; content: string; contentType: string }>) {
    const results: boolean[] = [];
    for (const file of files) {
      const relativePath = safeStoragePath(file.path);
      const target = path.join(uploadsDir, relativePath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, Buffer.from(file.content, 'base64'));
      await writeFile(target + '.meta.json', JSON.stringify({ contentType: file.contentType }), 'utf8');
      results.push(true);
    }
    return results;
  },

  async delete(paths: string[]) {
    const results: boolean[] = [];
    for (const item of paths) {
      const target = path.join(uploadsDir, safeStoragePath(item));
      await rm(target, { force: true });
      await rm(target + '.meta.json', { force: true });
      results.push(true);
    }
    return results;
  },

  async url(paths: string[]) {
    return paths.map(item => ({ path: item, url: publicStorageUrl(item) }));
  },
};

export const ai = {
  async generate(options: { messages?: Array<{ role?: string; content?: string }>; system?: string; [key: string]: unknown }) {
    const lastMessage = options.messages?.slice().reverse().find(item => item.role === 'user')?.content?.trim();
    const scope = options.system?.includes('Modo Cliente') ? 'cliente' : 'operacao';
    const text = scope === 'cliente'
      ? 'Posso ajudar com o acompanhamento do pedido, chamada do garçom e solicitação da conta. Para dados administrativos, fale com a equipe do estabelecimento.'
      : 'Use o menu lateral para acessar o módulo desejado. Para pedidos, entre em Pedidos / PDV, selecione produtos e finalize. Para operação, acompanhe Mesas, KDS, Caixa, Estoque e Relatórios.';
    return { text: lastMessage ? text + ' Pergunta recebida: "' + lastMessage.slice(0, 120) + '".' : text };
  },
};

function normalizeRoutePath(value: string) {
  const pathOnly = value.split('?')[0] || '/';
  const trimmed = pathOnly.replace(/\/+$/, '');
  return trimmed || '/';
}

function matchRoute(routePath: string, requestPath: string) {
  const routeParts = normalizeRoutePath(routePath).split('/').filter(Boolean);
  const requestParts = normalizeRoutePath(requestPath).split('/').filter(Boolean);
  if (routeParts.length !== requestParts.length) return null;

  const params: Record<string, string> = {};
  for (let index = 0; index < routeParts.length; index += 1) {
    const routePart = routeParts[index];
    const requestPart = requestParts[index];
    if (routePart.startsWith(':')) {
      params[routePart.slice(1)] = decodeURIComponent(requestPart);
    } else if (routePart !== requestPart) {
      return null;
    }
  }
  return params;
}

export function router(routes: RouteTable) {
  const entries = Object.entries(routes).map(([key, handlers]) => {
    const [method, ...pathParts] = key.split(' ');
    return { method: method.toUpperCase(), path: pathParts.join(' '), handler: handlers[0] };
  });

  return {
    async handle(request: { method: string; path: string; headers: Record<string, string | undefined>; body: unknown }) {
      for (const entry of entries) {
        if (entry.method !== request.method.toUpperCase()) continue;
        const params = matchRoute(entry.path, request.path);
        if (!params) continue;
        return entry.handler({
          params,
          body: request.body,
          event: {
            headers: request.headers,
            method: request.method,
            path: request.path,
          },
        });
      }
      return error('Rota não encontrada', 404);
    },
  };
}

export async function resolveUpload(relativePath: string) {
  const target = path.join(uploadsDir, safeStoragePath(relativePath));
  const root = path.resolve(uploadsDir);
  const resolved = path.resolve(target);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null;
  try {
    await stat(resolved);
    let contentType = 'application/octet-stream';
    try {
      const meta = JSON.parse(await readFile(resolved + '.meta.json', 'utf8')) as { contentType?: string };
      contentType = meta.contentType || contentType;
    } catch {
      const ext = path.extname(resolved).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      if (ext === '.png') contentType = 'image/png';
      if (ext === '.webp') contentType = 'image/webp';
    }
    return { path: resolved, contentType };
  } catch {
    return null;
  }
}

export function etagFor(value: string) {
  return createHash('sha1').update(value).digest('hex');
}
