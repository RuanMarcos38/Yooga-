import { handler } from './dist-backend/backend/index.js';

const raw = (method, path, body, token) => handler.handle({
  method, path, body,
  headers: token ? { authorization: 'Bearer ' + token } : {},
});
const ok = async (method, path, body, token) => {
  const response = await raw(method, path, body, token);
  if (response.status >= 400) throw new Error(method + ' ' + path + ' - ' + response.status + ': ' + JSON.stringify(response.body));
  return response.body;
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const master = await ok('POST', '/api/auth/login', {
  mode: 'empresa',
  email: process.env.ADMIN_EMAIL || 'admin@tapfood.com.br',
  password: process.env.ADMIN_PASSWORD || 'TapFood@2026',
});
assert(master.token, 'Login administrativo falhou');
const state = await ok('GET', '/api/state', undefined, master.token);
const order = state.orders.find(item => item.channel === 'Delivery' && !['Entregue', 'Finalizado', 'Cancelado'].includes(item.status));
assert(order, 'Pedido de delivery para teste não encontrado');
const prefix = '/api/delivery/' + order.id;
assert((await raw('POST', prefix + '/tracking', {})).status === 401, 'Rastreamento aceitou usuário anônimo');
const created = await ok('POST', prefix + '/tracking', {}, master.token);
assert(created.active && created.viewerToken && created.driverToken, 'Links de rastreamento não criados');
assert(created.viewerToken !== created.driverToken, 'Links de cliente e entregador devem ser diferentes');
const viewPath = '/api/delivery/track/' + encodeURIComponent(created.viewerToken);
const driverPath = '/api/delivery/location/' + encodeURIComponent(created.driverToken);
const initial = await ok('GET', viewPath);
assert(initial.code === order.code && initial.position === null, 'Acesso público expôs dados inesperados');
assert((await raw('POST', '/api/delivery/location/' + encodeURIComponent(created.viewerToken),
  { lat: -26.3044, lng: -48.8487, accuracy: 10 })).status === 401, 'Cliente alterou GPS');
assert((await raw('POST', driverPath, { lat: -26.3044, lng: -48.8487, accuracy: 10 })).status === 409,
  'GPS foi aceito antes da saída');
await ok('PUT', '/api/orders/' + order.id + '/status', { status: 'Pronto' }, master.token);
assert((await raw('POST', driverPath, { lat: 200, lng: 0, accuracy: 10 })).status === 400, 'GPS inválido foi aceito');
await ok('POST', driverPath, { lat: -26.3044, lng: -48.8487, accuracy: 10 });
const update = await ok('GET', viewPath);
assert(update.position?.lat === -26.3044 && update.position?.lng === -48.8487, 'Cliente não recebeu localização');
const forged = created.viewerToken.slice(0, -1) + (created.viewerToken.endsWith('A') ? 'B' : 'A');
assert((await raw('GET', '/api/delivery/track/' + encodeURIComponent(forged))).status === 404,
  'Link adulterado foi aceito');
await ok('PUT', '/api/orders/' + order.id + '/status', { status: 'Entregue' }, master.token);
const completed = await ok('GET', viewPath);
assert(!completed.active && !completed.position, 'GPS continuou público após conclusão');
assert((await raw('POST', driverPath, { lat: -26.3044, lng: -48.8487, accuracy: 10 })).status === 403,
  'GPS aceito após entrega');
console.log('Delivery tracking: links, privacidade, GPS, encerramento e integridade OK');
