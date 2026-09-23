import { createReadStream } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { handler } from './index.js';
import { etagFor, resolveUpload, type ApiResult } from './appdeploy-compat.js';

const port = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

function requestOrigin(origin?: string) {
  if (!origin) return allowedOrigins.includes('*') ? '*' : allowedOrigins[0] || '*';
  if (allowedOrigins.includes('*')) return '*';
  return allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || origin;
}

function setCors(response: ServerResponse, origin?: string) {
  response.setHeader('Access-Control-Allow-Origin', requestOrigin(origin));
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-api-key,authorization');
  response.setHeader('Access-Control-Max-Age', '86400');
  response.setHeader('Vary', 'Origin');
}

async function parseBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return undefined;
  const contentType = request.headers['content-type'] || '';
  if (String(contentType).includes('application/json')) return JSON.parse(raw);
  return raw;
}

function normalizedHeaders(request: IncomingMessage) {
  const headers: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    headers[key.toLowerCase()] = Array.isArray(value) ? value.join(',') : value;
    headers[key] = Array.isArray(value) ? value.join(',') : value;
  }
  return headers;
}

function sendJson(response: ServerResponse, result: ApiResult, origin?: string) {
  setCors(response, origin);
  for (const [key, value] of Object.entries(result.headers || {})) {
    response.setHeader(key, value);
  }
  response.statusCode = result.status;
  response.end(JSON.stringify(result.body));
}

async function sendUpload(response: ServerResponse, relativePath: string, origin?: string) {
  const file = await resolveUpload(relativePath);
  if (!file) {
    sendJson(response, { status: 404, body: { message: 'Arquivo não encontrado' } }, origin);
    return;
  }

  const content = await readFile(file.path);
  setCors(response, origin);
  response.statusCode = 200;
  response.setHeader('Content-Type', file.contentType);
  response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  response.setHeader('ETag', etagFor(file.path + ':' + content.length));
  createReadStream(file.path).pipe(response);
}

const server = createServer(async (request, response) => {
  const origin = Array.isArray(request.headers.origin) ? request.headers.origin[0] : request.headers.origin;
  setCors(response, origin);

  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.end();
    return;
  }

  try {
    const url = new URL(request.url || '/', 'http://localhost');
    if (request.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      await sendUpload(response, decodeURIComponent(url.pathname.slice('/uploads/'.length)), origin);
      return;
    }

    const result = await handler.handle({
      method: request.method || 'GET',
      path: url.pathname,
      headers: normalizedHeaders(request),
      body: await parseBody(request),
    });
    sendJson(response, result, origin);
  } catch (err) {
    console.error('backend error', err);
    sendJson(response, { status: 500, body: { message: 'Erro interno do servidor' } }, origin);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log('Mesa Restaurant OS backend listening on port ' + port);
});
