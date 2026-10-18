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
const assignmentPath = prefix + '/assignment';
const assignment = { driverName: 'Motoboy Teste', driverPhone: '11999990000', recipient: 'Destinatário de teste',
  address: 'Endereço fictício para teste isolado, 123', notes: 'Referência privada de teste' };
assert((await raw('PUT', assignmentPath, assignment)).status === 401, 'Anônimo cadastrou entrega');
assert((await raw('PUT', assignmentPath, { ...assignment, address: '' }, master.token)).status === 400, 'Endereço vazio aceito');
assert((await raw('PUT', assignmentPath, { ...assignment, driverPhone: '123' }, master.token)).status === 400, 'Telefone inválido aceito');
await ok('PUT', assignmentPath, assignment, master.token);
const privateView = await ok('GET', '/api/delivery/track/' + encodeURIComponent(created.driverToken));
assert(privateView.assignment.address === assignment.address, 'Motoboy não recebeu destino');
const publicView = await ok('GET', viewPath);
assert(!publicView.assignment && !JSON.stringify(publicView).includes(assignment.address) && !JSON.stringify(publicView).includes(assignment.driverPhone), 'Dados privados expostos no link do cliente');
const driverApi = '/api/delivery/driver/' + encodeURIComponent(created.driverToken);
const viewerApi = '/api/delivery/driver/' + encodeURIComponent(created.viewerToken);
assert((await raw('POST', viewerApi + '/profile', assignment)).status === 401, 'Cliente alterou cadastro do motoboy');
assert((await raw('POST', viewerApi + '/complete', {})).status === 401, 'Cliente confirmou entrega');
assert((await raw('POST', driverApi + '/complete', {})).status === 409, 'Entrega concluída antes da saída');
await ok('POST', driverApi + '/profile', { driverName: 'Motoboy confirmado', driverPhone: '(11) 99999-1111', address: 'não sobrescrever' });
const profile = await ok('GET', '/api/delivery/track/' + encodeURIComponent(created.driverToken));
assert(profile.assignment.driverName === 'Motoboy confirmado' && profile.assignment.address === assignment.address, 'Cadastro do motoboy alterou dados do estabelecimento');
assert((await raw('POST', '/api/delivery/location/' + encodeURIComponent(created.viewerToken),
  { lat: -26.3044, lng: -48.8487, accuracy: 10 })).status === 401, 'Cliente alterou GPS');
assert((await raw('POST', driverPath, { lat: -26.3044, lng: -48.8487, accuracy: 10 })).status === 409,
  'GPS foi aceito antes da saída');
await ok('PUT', '/api/orders/' + order.id + '/status', { status: 'Pronto' }, master.token);
assert((await raw('POST', driverPath, { lat: 200, lng: 0, accuracy: 10 })).status === 400, 'GPS inválido foi aceito');
assert((await raw('POST', driverPath, { lat: null, lng: '', accuracy: true })).status === 400, 'GPS vazio foi aceito como zero');
await ok('POST', driverPath, { lat: -26.3044, lng: -48.8487, accuracy: 10 });
const update = await ok('GET', viewPath);
assert(update.position?.lat === -26.3044 && update.position?.lng === -48.8487, 'Cliente não recebeu localização');
const forged = created.viewerToken.slice(0, -1) + (created.viewerToken.endsWith('A') ? 'B' : 'A');
assert((await raw('GET', '/api/delivery/track/' + encodeURIComponent(forged))).status === 404,
  'Link adulterado foi aceito');
assert(update.departedAt, 'Primeiro GPS não registrou saída');
await ok('POST', driverApi + '/complete', {});
await ok('POST', driverApi + '/complete', {});
const finalState = await ok('GET', '/api/state', undefined, master.token);
assert(finalState.orders.find(item => item.id === order.id).status === 'Entregue', 'Confirmação do motoboy não atualizou o pedido');
assert((await raw('PUT', assignmentPath, assignment, master.token)).status === 409, 'Entrega encerrada foi reativada pelo cadastro');
const completed = await ok('GET', viewPath);
assert(!completed.active && !completed.position, 'GPS continuou público após conclusão');
const endedDriver = await ok('GET', '/api/delivery/track/' + encodeURIComponent(created.driverToken));
assert(!endedDriver.assignment, 'Endereço permaneceu disponível no link encerrado');
assert((await raw('POST', driverPath, { lat: -26.3044, lng: -48.8487, accuracy: 10 })).status === 403,
  'GPS aceito após entrega');
console.log('Delivery tracking: links, privacidade, GPS, encerramento e integridade OK');
const trackingModule = await import('./dist-backend/backend/delivery-tracking.js');
const racing = await trackingModule.enableDeliveryTracking('qa-company', 'qa-unit', 'race-order');
await Promise.all([
  trackingModule.stopDeliveryTracking('qa-company', 'qa-unit', 'race-order'),
  trackingModule.saveDeliveryPosition('qa-company', 'qa-unit', racing, { lat: 1, lng: 2, accuracy: 5, updatedAt: new Date().toISOString() }),
]);
const stopped = await trackingModule.readDeliveryTracking('qa-company', 'qa-unit', 'race-order');
assert(!stopped.active && !stopped.position, 'GPS concorrente reativou rastreamento encerrado');
assert(await trackingModule.readDeliveryTracking('qa-company', 'other-unit', 'race-order') === null, 'Tracking vazou entre unidades');
console.log('Motoboy: cadastro, dados privados, confirmação, isolamento e concorrência OK');
