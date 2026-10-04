import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
const testAdminPassword = randomBytes(24).toString('hex');
process.env.ADMIN_PASSWORD = testAdminPassword;
import { handler } from './dist-backend/backend/index.js';
let token;
let checks = 0;
const call = async (method, path, body, expected = 200, headers = {}) => {
  const result = await handler.handle({ method, path, body, headers: { ...(token ? { authorization: 'Bearer ' + token } : {}), ...headers } });
  assert.equal(result.status, expected, `${method} ${path}: ${JSON.stringify(result.body)}`);
  checks++;
  return result.body;
};
const login = await call('POST', '/api/auth/login', { mode: 'empresa', email: 'admin@tapfood.com.br', password: testAdminPassword });
token = login.token;
const qr = await call('POST', '/api/customer/access', { tableName: 'Mesa 01' });
assert.equal(qr.companyId, '__master__');
await call('GET', '/api/customer/table/' + encodeURIComponent(qr.token));
const state = () => call('GET', '/api/state');
let initial = await state();
await call('POST', '/api/cash/close', {});
await call('POST', '/api/cash/close', {}, 400);
await call('POST', '/api/cash/open', { openingAmount: -1 }, 400);
await call('POST', '/api/cash/open', { openingAmount: 20 });
await call('POST', '/api/cash/open', {}, 400);
for (const type of ['Entrada', 'Saída']) {
  await call('POST', '/api/transactions', { description: 'QA ' + type, type, amount: 5, category: 'Caixa' }, 201);
}
await call('POST', '/api/transactions', { description: 'QA inválida', type: 'Entrada', amount: -1 }, 400);
const category = await call('POST', '/api/menu/categories', { name: 'Categoria QA', order: 6 }, 201);
const product = await call('POST', '/api/products', { name: 'Produto QA', category: category.name, price: 12.5, cost: 4, stock: 10 }, 201);
await call('PUT', '/api/menu/categories/' + category.id, { name: 'Categoria QA editada', active: true });
assert.equal((await state()).products.find(p => p.id === product.id).category, 'Categoria QA editada');
await call('PUT', '/api/products/' + product.id, { name: 'Produto QA editado', featured: true, channels: ['Mesa', 'Balcão', 'Delivery', 'QR/Totem'] });
await call('PUT', '/api/products/' + product.id, { stock: -1 }, 400);
assert.equal((await state()).products.find(p => p.id === product.id).stock, 10);
const image = { contentType: 'image/png', content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+c1ioAAAAASUVORK5CYII=' };
for (const path of ['/api/products/' + product.id + '/image', '/api/menu/categories/' + category.id + '/image', '/api/settings/branding/logo']) {
  const uploaded = await call('POST', path, image);
  assert.ok(uploaded.imageUrl || uploaded.brandLogoUrl);
}
await call('POST', '/api/products/' + product.id + '/image', { contentType: 'text/plain', content: 'x' }, 400);
const stock = initial.stock[0];
await call('POST', '/api/stock/' + stock.id + '/adjust', { delta: 2 });
await call('POST', '/api/stock/' + stock.id + '/adjust', { delta: -1 });
assert.equal((await state()).stock.find(s => s.id === stock.id).current, stock.current + 1);
await call('POST', '/api/stock/' + stock.id + '/adjust', { delta: -100000 }, 400);
await call('POST', '/api/customers', { name: 'Cliente QA', phone: '47999997777', email: 'cliente@qa.local' }, 201);
await call('POST', '/api/customers', { name: 'Cliente QA', phone: '47999997777' }, 409);
await call('POST', '/api/customers', { name: 'Cliente QA', phone: '1' }, 400);
await call('PUT', '/api/settings', { serviceFee: 12, printCopies: 2, brandName: 'Marca QA', pixEnabled: false });
assert.equal((await state()).settings.serviceFee, 12);
await call('PUT', '/api/settings', { serviceFee: -1 }, 400);
await call('PUT', '/api/settings', initial.settings);
for (const station of ['Cozinha QA', 'Balcão QA', 'Bar QA']) await call('POST', '/api/printers/test', { station });
await call('POST', '/api/printers/test', {}, 400);
for (const channel of ['Mesa', 'Balcão', 'Delivery']) {
  const table = initial.tables.find(t => t.status === 'Livre');
  const order = await call('POST', '/api/orders', { channel, table: channel === 'Mesa' ? table.name : undefined, items: [{ productId: product.id, qty: 1 }], paymentMethod: 'Pix' }, 201);
  const details = await call('GET', '/api/orders/' + order.id);
  assert.equal(details.total, channel === 'Mesa' && initial.settings.automaticServiceFee ? Number((12.5 * (1 + initial.settings.serviceFee / 100)).toFixed(2)) : 12.5);
  if (channel === 'Mesa') assert.equal(details.table.name, table.name);
  for (const status of ['Preparando', 'Pronto', 'Entregue']) await call('PUT', '/api/orders/' + order.id + '/status', { status });
  if (channel === 'Mesa') await call('PUT', '/api/tables/' + table.id + '/status', { status: 'Livre' });
}
for (const type of ['orders', 'products', 'customers', 'transactions', 'stock']) {
  const file = await call('GET', '/api/exports/' + type);
  assert.match(file.filename, /\.csv$/);
  assert.ok(file.content.length > 10);
}
await call('GET', '/api/reports/summary');
await call('GET', '/api/state/version');
const key = await call('POST', '/api/open/v1/keys', { name: 'API QA' }, 201);
for (const type of ['menu', 'tables', 'orders']) await call('GET', '/api/open/v1/' + type, undefined, 200, { 'x-api-key': key.key });
await call('POST', '/api/open/v1/orders', { channel: 'Balcão', items: [{ productId: product.id, qty: 1 }] }, 201, { 'x-api-key': key.key });
await call('DELETE', '/api/open/v1/keys/' + key.id);
await call('GET', '/api/open/v1/menu', undefined, 401, { 'x-api-key': key.key });
for (const id of ['totem', 'kds', 'open-api', 'pix-auto', 'ifood', '99food', 'keeta', 'wallet-pay', 'pos', 'zapturbo', 'boletim', 'driver-app', 'foody-delivery', 'meta-capi', 'custom-domain', 'google-analytics', 'google-tag-manager', 'facebook-pixel', 'n8n']) {
  await call('PUT', '/api/integrations/' + id, { fields: {} });
  const tested = await call('POST', '/api/integrations/' + id + '/test', { fields: {} });
  assert.ok(tested.status);
  if (['pix-auto', 'ifood', '99food', 'keeta', 'wallet-pay', 'pos', 'meta-capi', 'n8n'].includes(id)) assert.equal(tested.enabled, false);
  await call('DELETE', '/api/integrations/' + id);
}
for (const scope of ['quick', 'operation', 'integrations', 'customer', 'api', 'full']) {
  const qa = await call('POST', '/api/qa/run', { scope });
  assert.ok(qa.checks.length);
}
const tableName = initial.tables.find(t => t.status === 'Livre').name;
const customerPath = '/api/customer/table/' + encodeURIComponent(tableName);
await call('GET', customerPath);
await call('POST', customerPath + '/register', { name: 'Cliente mesa QA', phone: '47999998888', email: 'mesa@qa.local' }, 201);
await call('POST', customerPath + '/orders', { items: [{ productId: product.id, qty: 1 }] }, 201);
for (const type of ['waiter', 'bill']) {
  const request = await call('POST', customerPath + '/request', { type }, 201);
  if (type === 'bill') {
    const notified = await state();
    assert.ok(notified.serviceRequests.some(r => r.id === request.id && r.type === 'bill' && r.status === 'pending'));
    assert.notEqual(notified.tables.find(t => t.name === tableName).status, 'Livre');
    const duplicate = await call('POST', customerPath + '/request', { type });
    assert.equal(duplicate.id, request.id);
    assert.ok((await call('GET', customerPath)).pendingRequests.some(r => r.id === request.id));
  }
  await call('PUT', '/api/service-requests/' + request.id + '/resolve', {});
  if (type === 'bill') assert.ok(!(await state()).serviceRequests.some(r => r.id === request.id && r.status === 'pending'));
}
for (const method of ['Pix', 'Cartão', 'Dinheiro']) await call('POST', customerPath + '/payment', { method }, 201);
await call('DELETE', '/api/products/' + product.id);
await call('DELETE', '/api/menu/categories/' + category.id);
await call('DELETE', '/api/settings/branding/logo');
await call('POST', '/api/cash/close', {});
console.log(`PASS: ${checks} verificações de ações e validações pela API, com dados isolados.`);

