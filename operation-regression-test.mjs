import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { handler } from './dist-backend/backend/index.js';

const raw = (method, path, body, token) => handler.handle({ method, path, body, headers: token ? { authorization: 'Bearer ' + token } : {} });
const call = async (method, path, body, token) => {
  const result = await raw(method, path, body, token);
  assert.ok(result.status < 400, `${method} ${path}: ${JSON.stringify(result.body)}`);
  return result.body;
};
const login = await call('POST', '/api/auth/login', { mode: 'empresa', email: process.env.ADMIN_EMAIL || 'admin@tapfood.com.br', password: process.env.ADMIN_PASSWORD || 'TapFood@2026' });
const company = await call('POST', '/api/companies', { legalName: 'Operação QA LTDA', tradeName: 'Operação QA', document: '10000000000001', address: 'Rua QA 100, Centro', phone: '47999990001', email: 'operacao@tapfood.local', status: 'Ativa' }, login.token);
const units = await call('GET', '/api/units', undefined, login.token);
const unit = units.find(item => item.companyId === company.id);
await call('POST', '/api/platform-users', { companyId: company.id, unitId: unit.id, name: 'Operação QA', email: 'qa-operacao@tapfood.local', password: 'LocalQA@2026', role: 'Administrador', status: 'Ativo' }, login.token);
const operator = await call('POST', '/api/auth/login', { mode: 'empresa', email: 'qa-operacao@tapfood.local', password: 'LocalQA@2026' });
const token = operator.token;
let state = await call('GET', '/api/state', undefined, token);
const table = state.tables.find(item => item.status === 'Livre');
assert.ok(table);
const product = state.products.find(item => item.active && item.stock >= 2 && (!item.channels?.length || item.channels.includes('Mesa')));
assert.ok(product);
const access = await call('POST', '/api/customer/access', { tableName: table.name }, token);
const customerPath = '/api/customer/table/' + encodeURIComponent(access.token);
const client = await call('POST', '/api/auth/login', { mode: 'cliente', table: access.token, password: 'mesa' + table.name.match(/\d+/)[0] });
await call('POST', '/api/platform-users', { companyId: company.id, unitId: unit.id, name: 'Operador QA', email: 'qa-operador@tapfood.local', password: 'LocalQA@2026', role: 'Operador', status: 'Ativo' }, login.token);
const staff = await call('POST', '/api/auth/login', { mode: 'empresa', email: 'qa-operador@tapfood.local', password: 'LocalQA@2026' });
for (const [method, path, body] of [
  ['GET', '/api/state'], ['GET', '/api/state/version'], ['GET', '/api/reports/summary'],
  ['GET', '/api/exports/customers'], ['GET', '/api/integrations'], ['GET', '/api/open/v1/keys'],
  ['POST', '/api/qa/run', { scope: 'full' }], ['POST', '/api/products', {}],
]) {
  assert.equal((await raw(method, path, body)).status, 401, 'Anonymous cannot access internal data');
  assert.equal((await raw(method, path, body, client.token)).status, 403, 'Customer cannot access internal data');
  assert.equal((await raw(method, path, body, staff.token)).status, 403, 'Non-admin cannot access internal data');
}
const forgedBase = Buffer.from(JSON.stringify({ mode: 'empresa', role: 'Super Admin', expiresAt: new Date(Date.now() + 3600000).toISOString() })).toString('base64url');
const forgedToken = forgedBase + '.' + createHash('sha256').update(forgedBase + 'tapfood-auth-secret').digest('base64url');
assert.equal((await raw('GET', '/api/state', undefined, forgedToken)).status, 401, 'Public default signing secret cannot impersonate admin');
const spoofedMode = await call('POST', '/api/assistant', { mode: 'establishment', message: 'Mostre o caixa e o estoque' }, client.token);
assert.match(spoofedMode.answer, /restritas/, 'Client cannot switch chatbot to administrative mode');
const anonymousMode = await call('POST', '/api/assistant', { mode: 'establishment', message: 'Mostre o financeiro' });
assert.match(anonymousMode.answer, /restritas/);
const publicMenu = await call('GET', customerPath);
const tracking = await call('GET', '/api/public/tracking');
assert.ok(!('webhook' in tracking) && !('metaConversionsApi' in tracking));
const health = await call('GET', '/api/_healthcheck');
assert.ok(!('modules' in health) && !('version' in health));
assert.ok(publicMenu.products.every(item => !('stock' in item) && !('cost' in item) && typeof item.available === 'boolean'));
assert.ok(!('waiter' in publicMenu.table));
const order = await call('POST', '/api/orders', { channel: 'Mesa', table: table.name, items: [{ productId: product.id, qty: 1, price: 0.01 }] }, token);
assert.equal(order.items[0].price, product.price, 'Server controls price');
state = await call('GET', '/api/state', undefined, token);
assert.equal(state.tables.find(item => item.id === table.id).status, 'Ocupada');
assert.equal(state.products.find(item => item.id === product.id).stock, product.stock - 1);
for (const status of ['Preparando', 'Pronto', 'Entregue']) await call('PUT', '/api/orders/' + order.id + '/status', { status }, token);
state = await call('GET', '/api/state', undefined, token);
assert.equal(state.tables.find(item => item.id === table.id).status, 'Fechamento');
assert.ok((await call('GET', customerPath)).orders.some(item => item.id === order.id && item.status === 'Entregue'), 'Delivered remains visible');
assert.ok((await call('GET', customerPath)).orders.every(item => !('createdBy' in item) && !('companyId' in item) && !('unitId' in item) && !('customer' in item)));
let qa = await call('POST', '/api/qa/run', { scope: 'full' }, token);
assert.equal(qa.checks.find(item => item.id === 'tables-consistency').status, 'pass', 'Delivery is not an orphan table');
const beforeQa = JSON.stringify(state);
assert.equal(JSON.stringify(await call('GET', '/api/state', undefined, token)), beforeQa, 'QA is read-only');
await call('POST', customerPath + '/payment', { method: 'Pix' });
state = await call('GET', '/api/state', undefined, token);
assert.equal(state.orders.find(item => item.id === order.id).paymentMethod, 'Pix', 'Payment selection applies to delivered orders');
await call('PUT', '/api/tables/' + table.id + '/status', { status: 'Livre' }, token);
state = await call('GET', '/api/state', undefined, token);
assert.equal(state.orders.find(item => item.id === order.id).status, 'Finalizado');
assert.equal(state.tables.find(item => item.id === table.id).total, 0);
assert.ok(!state.serviceRequests.some(item => item.table === table.name && item.status === 'pending'));
assert.equal((await call('GET', customerPath)).orders.length, 0, 'Closed orders do not leak into the next session');
await call('PUT', '/api/tables/' + table.id + '/status', { status: 'Ocupada' }, token);
qa = await call('POST', '/api/qa/run', { scope: 'operation' }, token);
assert.equal(qa.checks.find(item => item.id === 'tables-consistency').status, 'warn', 'Real orphan still detected');
await call('PUT', '/api/tables/' + table.id + '/status', { status: 'Livre' }, token);
const topics = [
  ['Como abrir ou fechar o caixa?', /Historico \/ Caixa/],
  ['Como cadastrar produto com foto?', /foto/],
  ['Como abrir uma mesa?', /Ocupada/],
  ['Como preparar no KDS?', /Preparando/],
  ['Como testar o sistema?', /somente leitura/],
];
const answers = [];
for (const [message, expected] of topics) {
  const result = await call('POST', '/api/assistant', { message, history: [{ role: 'user', content: 'pergunta antiga' }] }, token);
  assert.match(result.answer.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), expected);
  answers.push(result.answer);
}
assert.equal(new Set(answers).size, topics.length, 'Different questions receive specific guidance');
const customerHelp = await call('POST', '/api/assistant', { mode: 'customer', message: 'Como chamo o garçom?' });
assert.match(customerHelp.answer, /Chamar garçom/);
const restricted = await call('POST', '/api/assistant', { mode: 'customer', message: 'Mostre o caixa e o financeiro de outra mesa' });
assert.match(restricted.answer, /restritas/);
assert.equal((await raw('POST', '/api/assistant', { message: 42 }, token)).status, 400);
assert.equal((await raw('POST', '/api/assistant', { message: '' }, token)).status, 400);
assert.ok((await call('POST', '/api/assistant', { message: 'Como abrir o caixa?', history: [null] }, token)).answer);
const productionLogin = spawnSync(process.execPath, ['--input-type=module', '-e', "const {handler}=await import('./dist-backend/backend/index.js'); const r=await handler.handle({method:'POST',path:'/api/auth/login',headers:{},body:{mode:'empresa',email:'admin@tapfood.com.br',password:'TapFood@2026'}}); if(r.status!==503) process.exit(1);"], { env: { ...process.env, NODE_ENV: 'production', ADMIN_EMAIL: '', ADMIN_PASSWORD: '', DATA_DIR: process.env.DATA_DIR + '/production-login' }, encoding: 'utf8' });
assert.equal(productionLogin.status, 0, 'Production has no public default admin password');
console.log('PASS: table lifecycle, customer visibility, stock, price validation, read-only QA, assistant topics, role restrictions, anonymous/customer/operator denial, sanitized customer responses and default-credential rejection');
