import { handler } from './dist-backend/backend/index.js';

const rawCall = async (method, path, body, token) => handler.handle({
  method,
  path,
  headers: token ? { authorization: 'Bearer ' + token } : {},
  body,
});

const call = async (method, path, body, token) => {
  const result = await rawCall(method, path, body, token);
  if (result.status >= 400) {
    throw new Error(method + ' ' + path + ' failed: ' + result.status + ' ' + JSON.stringify(result.body));
  }
  return result.body;
};

const master = await call('POST', '/api/auth/login', {
  mode: 'empresa',
  email: process.env.ADMIN_EMAIL || 'admin@tapfood.com.br',
  password: process.env.ADMIN_PASSWORD || 'TapFood@2026',
});
if (!master?.token || master.role !== 'Super Admin') throw new Error('Master login failed');

const suffix = Date.now().toString(36);
const companyA = await call('POST', '/api/companies', { name: 'Tenant QA A ' + suffix, status: 'Ativa' }, master.token);
const companyB = await call('POST', '/api/companies', { name: 'Tenant QA B ' + suffix, status: 'Ativa' }, master.token);

const password = 'TenantQA@2026';
const userAEmail = 'qa-a-' + suffix + '@tapfood.local';
const userBEmail = 'qa-b-' + suffix + '@tapfood.local';

await call('POST', '/api/platform-users', {
  companyId: companyA.id, name: 'QA Empresa A', email: userAEmail, password, role: 'Administrador', status: 'Ativo',
}, master.token);
await call('POST', '/api/platform-users', {
  companyId: companyB.id, name: 'QA Empresa B', email: userBEmail, password, role: 'Administrador', status: 'Ativo',
}, master.token);

const loginA = await call('POST', '/api/auth/login', { mode: 'empresa', email: userAEmail, password });
const loginB = await call('POST', '/api/auth/login', { mode: 'empresa', email: userBEmail, password });

if (loginA.companyId !== companyA.id || loginB.companyId !== companyB.id) throw new Error('Company binding failed');

const uniqueProduct = 'Produto Privado A ' + suffix;
await call('POST', '/api/products', {
  name: uniqueProduct,
  category: 'Outros',
  price: 19.9,
  stock: 5,
  cost: 8,
  prepTime: 10,
  active: true,
}, loginA.token);

const stateA = await call('GET', '/api/state', undefined, loginA.token);
const stateB = await call('GET', '/api/state', undefined, loginB.token);

if (!stateA.products.some(product => product.name === uniqueProduct)) throw new Error('Company A cannot read its own data');
if (stateB.products.some(product => product.name === uniqueProduct)) throw new Error('TENANT LEAK: Company B can read Company A product');

const companiesA = await call('GET', '/api/companies', undefined, loginA.token);
const companiesB = await call('GET', '/api/companies', undefined, loginB.token);
if (companiesA.length !== 1 || companiesA[0].id !== companyA.id) throw new Error('Company A company scope failed');
if (companiesB.length !== 1 || companiesB[0].id !== companyB.id) throw new Error('Company B company scope failed');

const usersA = await call('GET', '/api/platform-users', undefined, loginA.token);
const usersB = await call('GET', '/api/platform-users', undefined, loginB.token);
if (usersA.some(user => user.companyId !== companyA.id)) throw new Error('TENANT LEAK: Company A can read foreign users');
if (usersB.some(user => user.companyId !== companyB.id)) throw new Error('TENANT LEAK: Company B can read foreign users');

const versionBefore = await call('GET', '/api/state/version', undefined, loginA.token);
const accessA = await call('POST', '/api/customer/access', { tableName: 'Mesa 01' }, loginA.token);
if (!accessA.token || !String(accessA.token).startsWith('q.')) throw new Error('Signed QR token was not generated');

const publicTableA = await call('GET', '/api/customer/table/' + encodeURIComponent(accessA.token));
if (publicTableA.table?.name !== 'Mesa 01') throw new Error('Signed QR did not resolve Company A table');

const activeProductA = stateA.products.find(product => product.active && product.stock > 0);
if (!activeProductA) throw new Error('Company A has no active product for QR order test');

const customerOrder = await call(
  'POST',
  '/api/customer/table/' + encodeURIComponent(accessA.token) + '/orders',
  { customer: 'Cliente QA', items: [{ productId: activeProductA.id, qty: 1 }] }
);
if (customerOrder.companyId !== companyA.id || customerOrder.tableId !== publicTableA.table.id) {
  throw new Error('Customer order was not bound to the correct company/table');
}

const versionAfter = await call('GET', '/api/state/version', undefined, loginA.token);
if (versionBefore.version === versionAfter.version) throw new Error('State version did not change after customer order');

const stateAAfter = await call('GET', '/api/state', undefined, loginA.token);
const stateBAfter = await call('GET', '/api/state', undefined, loginB.token);
if (!stateAAfter.orders.some(order => order.id === customerOrder.id)) throw new Error('Company A did not receive its customer order');
if (stateBAfter.orders.some(order => order.id === customerOrder.id)) throw new Error('TENANT LEAK: Company B received Company A customer order');

const tampered = accessA.token.slice(0, -1) + (accessA.token.endsWith('a') ? 'b' : 'a');
const tamperedResponse = await rawCall('GET', '/api/customer/table/' + encodeURIComponent(tampered));
if (tamperedResponse.status !== 401) throw new Error('Tampered QR token was accepted');

console.log('Tenant isolation + signed QR + order routing test passed:', companyA.id, companyB.id);
