import assert from 'node:assert/strict';
import { handler } from './dist-backend/backend/index.js';

const call = (body, token, path = '/api/i18n/translate') => handler.handle({
  method: 'POST', path, body, headers: token ? { authorization: 'Bearer ' + token } : {},
});
const login = await call({mode: 'empresa', email: process.env.ADMIN_EMAIL || 'admin@tapfood.com.br',
  password: process.env.ADMIN_PASSWORD || 'TapFood@2026'}, undefined, '/api/auth/login');
assert.equal(login.status, 200);
const token = login.body.token;
const input = {text: 'Pedido 123: R$ 20,00', sourceLocale: 'pt-BR', targetLocale: 'en'};
assert.equal((await call(input)).status, 401);
assert.equal((await call({...input, targetLocale: 'invalid'}, token)).status, 400);
assert.equal((await call({...input, text: 'x'.repeat(2001)}, token)).status, 400);
assert.equal((await call({...input, text: ' '}, token)).status, 400);
assert.equal((await call({...input, targetLocale: 'pt-BR'}, token)).body.translatedText, input.text);
// Isolated test credential and mocked transport: no real key or provider traffic.
const originalFetch = globalThis.fetch;
const originalKey = process.env.OPENAI_API_KEY;
const originalAlternative = process.env.TAPFOOD_TRANSLATION_API_KEY;
delete process.env.OPENAI_API_KEY;
delete process.env.TAPFOOD_TRANSLATION_API_KEY;
assert.equal((await call(input, token)).status, 503);
process.env.TAPFOOD_TRANSLATION_API_KEY = 'isolated-test-placeholder';
let requests = 0;
globalThis.fetch = async (url, options) => {
  requests++;
  assert.equal(url, 'https://api.openai.com/v1/chat/completions');
  const payload = JSON.parse(options.body);
  assert.equal(payload.messages[1].content, input.text);
  assert.match(payload.messages[0].content, /Preserve exact prices/);
  return Response.json({choices: [{message: {content: 'Order 123: R$ 20,00'}}]});
};
try {
  const translated = await call(input, token);
  assert.equal(translated.status, 200);
  assert.equal(translated.body.translatedText, 'Order 123: R$ 20,00');
  assert.equal(requests, 1);
  globalThis.fetch = async () => Response.json({error: {code: 'credit_balance_exhausted', type: 'insufficient_quota'}}, {status: 429});
  const exhausted = await call(input, token);
  assert.equal(exhausted.status, 503);
  assert.match(exhausted.body.message, /sem créditos/);
  assert.doesNotMatch(exhausted.body.message, /isolated-test-placeholder/);
  globalThis.fetch = async () => Response.json({error: {code: 'rate_limit_exceeded'}}, {status: 429});
  const limited = await call(input, token);
  assert.equal(limited.status, 429);
  assert.match(limited.body.message, /Aguarde/);
  globalThis.fetch = async () => new Response('', {status: 401});
  assert.match((await call(input, token)).body.message, /chave.*não foi aceita/);
  globalThis.fetch = async () => new Response('', {status: 503});
  assert.equal((await call(input, token)).status, 503);
} finally {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  if (originalAlternative === undefined) delete process.env.TAPFOOD_TRANSLATION_API_KEY; else process.env.TAPFOOD_TRANSLATION_API_KEY = originalAlternative;
}
console.log('Translation: authorization, validation, provider success and failure OK (mock transport)');
