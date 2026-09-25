import { handler } from './dist-backend/backend/index.js';

const call = async (method, path, body, token) => {
  const result = await handler.handle({
    method,
    path,
    headers: token ? { authorization: 'Bearer ' + token } : {},
    body,
  });
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

console.log('Tenant isolation test passed:', companyA.id, companyB.id);
