import { db, router, json, error } from '@appdeploy/sdk';

type P = { id: string; name: string; category: string; price: number; stock: number; active: boolean };
type T = { id: string; name: string; seats: number; status: 'Livre' | 'Ocupada' | 'Aguardando' | 'Fechamento'; total: number; waiter?: string };
type I = { productId: string; name: string; qty: number; price: number };
type O = { id: string; code: string; channel: string; table?: string; customer?: string; items: I[]; total: number; status: string; createdAt: string; paymentMethod?: string };
type C = { id: string; name: string; phone: string; orders: number; totalSpent: number; lastOrder: string };
type StockItem = { id: string; name: string; unit: string; current: number; minimum: number; cost: number };
type Tx = { id: string; description: string; type: 'Entrada' | 'Saída'; amount: number; date: string; category: string };
type S = { products: P[]; tables: T[]; orders: O[]; customers: C[]; stock: StockItem[]; transactions: Tx[]; settings: { restaurantName: string; unit: string } };

const seed = (): S => ({
  settings: { restaurantName: 'Mesa Restaurante', unit: 'Unidade Centro' },
  products: [
    ['p1', 'Smash Bacon', 'Hambúrgueres', 34.9, 42],
    ['p2', 'Cheese Salada', 'Hambúrgueres', 29.9, 38],
    ['p3', 'Batata Crocante', 'Porções', 19.9, 54],
    ['p4', 'Onion Rings', 'Porções', 22.9, 31],
    ['p5', 'Coca-Cola Lata', 'Bebidas', 7, 96],
    ['p6', 'Suco de Laranja', 'Bebidas', 12, 28],
    ['p7', 'Brownie com Sorvete', 'Sobremesas', 18.9, 20],
    ['p8', 'Combo Família', 'Combos', 89.9, 16],
  ].map(value => ({ id: String(value[0]), name: String(value[1]), category: String(value[2]), price: Number(value[3]), stock: Number(value[4]), active: true })),
  tables: Array.from({ length: 14 }, (_, index) => ({
    id: 't' + (index + 1),
    name: 'Mesa ' + String(index + 1).padStart(2, '0'),
    seats: index % 3 === 0 ? 6 : 4,
    status: (index === 1 || index === 5 || index === 8 ? 'Ocupada' : index === 10 ? 'Aguardando' : 'Livre') as T['status'],
    total: index === 1 ? 86.7 : index === 5 ? 129.4 : index === 8 ? 54.9 : 0,
    waiter: index === 1 ? 'Marina' : index === 5 ? 'João' : index === 8 ? 'Carlos' : undefined,
  })),
  orders: [
    { id: 'o1', code: '#1048', channel: 'Mesa', table: 'Mesa 02', customer: 'Cliente balcão', items: [{ productId: 'p1', name: 'Smash Bacon', qty: 2, price: 34.9 }, { productId: 'p5', name: 'Coca-Cola Lata', qty: 2, price: 7 }], total: 83.8, status: 'Preparando', createdAt: new Date(Date.now() - 720000).toISOString(), paymentMethod: 'Cartão' },
    { id: 'o2', code: '#1049', channel: 'Delivery', customer: 'Ana Paula', items: [{ productId: 'p8', name: 'Combo Família', qty: 1, price: 89.9 }], total: 89.9, status: 'Novo', createdAt: new Date(Date.now() - 420000).toISOString(), paymentMethod: 'Pix' },
    { id: 'o3', code: '#1050', channel: 'Balcão', customer: 'Rafael', items: [{ productId: 'p2', name: 'Cheese Salada', qty: 1, price: 29.9 }, { productId: 'p3', name: 'Batata Crocante', qty: 1, price: 19.9 }], total: 49.8, status: 'Pronto', createdAt: new Date(Date.now() - 180000).toISOString(), paymentMethod: 'Dinheiro' },
  ],
  customers: [
    ['c1', 'Ana Paula', '(47) 99921-4401', 18, 1240.5, 'Hoje'],
    ['c2', 'Rafael Martins', '(47) 98820-7120', 11, 742.3, 'Hoje'],
    ['c3', 'Camila Souza', '(47) 99770-3191', 27, 1860.9, 'Ontem'],
    ['c4', 'Bruno Lima', '(47) 99118-2104', 7, 401.2, '18/09'],
  ].map(value => ({ id: String(value[0]), name: String(value[1]), phone: String(value[2]), orders: Number(value[3]), totalSpent: Number(value[4]), lastOrder: String(value[5]) })),
  stock: [
    ['s1', 'Pão brioche', 'un', 82, 40, 2.1],
    ['s2', 'Carne bovina 160g', 'un', 38, 30, 8.4],
    ['s3', 'Bacon fatiado', 'kg', 4.2, 5, 31.8],
    ['s4', 'Batata congelada', 'kg', 12.5, 8, 14.2],
    ['s5', 'Coca-Cola lata', 'un', 96, 48, 3.85],
  ].map(value => ({ id: String(value[0]), name: String(value[1]), unit: String(value[2]), current: Number(value[3]), minimum: Number(value[4]), cost: Number(value[5]) })),
  transactions: [
    { id: 'f1', description: 'Vendas do dia', type: 'Entrada', amount: 2847.6, date: 'Hoje', category: 'Vendas' },
    { id: 'f2', description: 'Fornecedor de carnes', type: 'Saída', amount: 680, date: 'Hoje', category: 'Compras' },
    { id: 'f3', description: 'iFood / delivery', type: 'Entrada', amount: 934.2, date: 'Ontem', category: 'Delivery' },
    { id: 'f4', description: 'Energia elétrica', type: 'Saída', amount: 412.8, date: 'Ontem', category: 'Despesas' },
  ],
});

async function get() {
  const result = await db.list<S>('mesa_state', { limit: 1 });
  if (result.items.length) {
    const { id, ...state } = result.items[0];
    return { id, state: state as S };
  }
  const state = seed();
  const [id] = await db.add('mesa_state', [state as unknown as Record<string, unknown>]);
  if (!id) throw new Error('seed');
  return { id, state };
}

async function save(id: string, state: S) {
  const [ok] = await db.update('mesa_state', [{ id, record: state as unknown as Record<string, unknown> }]);
  if (!ok) throw new Error('save');
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'GET /api/state': [async () => json((await get()).state)],
  'POST /api/reset': [async () => { const current = await get(); const state = seed(); await save(current.id, state); return json(state); }],
  'POST /api/products': [async ({ body }) => {
    const value = body as Partial<P>;
    if (!value.name?.trim() || Number(value.price) <= 0) return error('Nome e preço são obrigatórios', 400);
    const current = await get();
    const product: P = { id: 'p' + Date.now(), name: value.name.trim(), category: value.category || 'Outros', price: Number(value.price), stock: Number(value.stock || 0), active: true };
    current.state.products.unshift(product);
    await save(current.id, current.state);
    return json(product, 201);
  }],
  'DELETE /api/products/:id': [async ({ params }) => {
    const current = await get();
    const before = current.state.products.length;
    current.state.products = current.state.products.filter(product => product.id !== params.id);
    if (current.state.products.length === before) return error('Produto não encontrado', 404);
    await save(current.id, current.state);
    return json({ deleted: true });
  }],
  'PUT /api/tables/:id/status': [async ({ params, body }) => {
    const value = body as { status?: T['status'] };
    const current = await get();
    const table = current.state.tables.find(item => item.id === params.id);
    if (!table || !value.status) return error('Mesa/status inválido', 400);
    table.status = value.status;
    if (value.status === 'Livre') { table.total = 0; table.waiter = undefined; }
    if (value.status === 'Ocupada' && !table.waiter) table.waiter = 'Equipe';
    await save(current.id, current.state);
    return json(table);
  }],
  'POST /api/orders': [async ({ body }) => {
    const value = body as { channel?: string; table?: string; customer?: string; paymentMethod?: string; items?: I[] };
    if (!value.items?.length) return error('Pedido sem itens', 400);
    const current = await get();
    const total = Number(value.items.reduce((sum, item) => sum + item.price * item.qty, 0).toFixed(2));
    const sequence = 1051 + current.state.orders.filter(order => Number(order.code.slice(1)) >= 1051).length;
    const order: O = { id: 'o' + Date.now(), code: '#' + sequence, channel: value.channel || 'Balcão', table: value.table, customer: value.customer || 'Cliente balcão', items: value.items, total, status: 'Novo', createdAt: new Date().toISOString(), paymentMethod: value.paymentMethod || 'Não informado' };
    current.state.orders.unshift(order);
    current.state.transactions.unshift({ id: 'f' + Date.now(), description: 'Venda ' + order.code, type: 'Entrada', amount: total, date: 'Hoje', category: 'Vendas' });
    if (value.table) {
      const table = current.state.tables.find(item => item.name === value.table);
      if (table) { table.status = 'Ocupada'; table.total = Number((table.total + total).toFixed(2)); }
    }
    await save(current.id, current.state);
    return json(order, 201);
  }],
  'PUT /api/orders/:id/status': [async ({ params, body }) => {
    const value = body as { status?: string };
    const current = await get();
    const order = current.state.orders.find(item => item.id === params.id);
    if (!order || !value.status) return error('Pedido/status inválido', 400);
    order.status = value.status;
    await save(current.id, current.state);
    return json(order);
  }],
  'POST /api/customers': [async ({ body }) => {
    const value = body as Partial<C>;
    if (!value.name?.trim() || !value.phone?.trim()) return error('Nome e telefone obrigatórios', 400);
    const current = await get();
    const customer: C = { id: 'c' + Date.now(), name: value.name.trim(), phone: value.phone.trim(), orders: 0, totalSpent: 0, lastOrder: 'Sem pedidos' };
    current.state.customers.unshift(customer);
    await save(current.id, current.state);
    return json(customer, 201);
  }],
  'POST /api/stock/:id/adjust': [async ({ params, body }) => {
    const value = body as { delta?: number };
    const delta = Number(value.delta);
    if (!Number.isFinite(delta) || delta === 0) return error('Movimentação inválida', 400);
    const current = await get();
    const item = current.state.stock.find(stock => stock.id === params.id);
    if (!item) return error('Item de estoque não encontrado', 404);
    const next = Number((item.current + delta).toFixed(3));
    if (next < 0) return error('Estoque não pode ficar negativo', 400);
    item.current = next;
    await save(current.id, current.state);
    return json(item);
  }],
  'POST /api/transactions': [async ({ body }) => {
    const value = body as Partial<Tx>;
    if (!value.description?.trim() || !['Entrada', 'Saída'].includes(String(value.type)) || Number(value.amount) <= 0) return error('Lançamento financeiro inválido', 400);
    const current = await get();
    const transaction: Tx = { id: 'f' + Date.now(), description: value.description.trim(), type: value.type as 'Entrada' | 'Saída', amount: Number(value.amount), date: 'Hoje', category: value.category || 'Outros' };
    current.state.transactions.unshift(transaction);
    await save(current.id, current.state);
    return json(transaction, 201);
  }],
  'PUT /api/settings': [async ({ body }) => {
    const value = body as { restaurantName?: string; unit?: string };
    if (!value.restaurantName?.trim() || !value.unit?.trim()) return error('Nome e unidade são obrigatórios', 400);
    const current = await get();
    current.state.settings = { restaurantName: value.restaurantName.trim(), unit: value.unit.trim() };
    await save(current.id, current.state);
    return json(current.state.settings);
  }],
});
