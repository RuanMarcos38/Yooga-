import { db, router, json, error } from '@appdeploy/sdk';
type P = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  active: boolean;
};
type T = {
  id: string;
  name: string;
  seats: number;
  status: 'Livre' | 'Ocupada' | 'Aguardando' | 'Fechamento';
  total: number;
  waiter?: string;
};
type I = { productId: string; name: string; qty: number; price: number };
type O = {
  id: string;
  code: string;
  channel: string;
  table?: string;
  customer?: string;
  items: I[];
  total: number;
  status: string;
  createdAt: string;
};
type C = {
  id: string;
  name: string;
  phone: string;
  orders: number;
  totalSpent: number;
  lastOrder: string;
};
type S = {
  products: P[];
  tables: T[];
  orders: O[];
  customers: C[];
  stock: Array<{
    id: string;
    name: string;
    unit: string;
    current: number;
    minimum: number;
    cost: number;
  }>;
  transactions: Array<{
    id: string;
    description: string;
    type: 'Entrada' | 'Saída';
    amount: number;
    date: string;
    category: string;
  }>;
  settings: { restaurantName: string; unit: string };
};
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
  ].map(x => ({
    id: String(x[0]),
    name: String(x[1]),
    category: String(x[2]),
    price: Number(x[3]),
    stock: Number(x[4]),
    active: true,
  })),
  tables: Array.from({ length: 14 }, (_, i) => ({
    id: `t${i + 1}`,
    name: `Mesa ${String(i + 1).padStart(2, '0')}`,
    seats: i % 3 === 0 ? 6 : 4,
    status: (i === 1 || i === 5 || i === 8
      ? 'Ocupada'
      : i === 10
        ? 'Aguardando'
        : 'Livre') as T['status'],
    total: i === 1 ? 86.7 : i === 5 ? 129.4 : i === 8 ? 54.9 : 0,
    waiter:
      i === 1 ? 'Marina' : i === 5 ? 'João' : i === 8 ? 'Carlos' : undefined,
  })),
  orders: [
    {
      id: 'o1',
      code: '#1048',
      channel: 'Mesa',
      table: 'Mesa 02',
      customer: 'Cliente balcão',
      items: [
        { productId: 'p1', name: 'Smash Bacon', qty: 2, price: 34.9 },
        { productId: 'p5', name: 'Coca-Cola Lata', qty: 2, price: 7 },
      ],
      total: 83.8,
      status: 'Preparando',
      createdAt: new Date(Date.now() - 720000).toISOString(),
    },
    {
      id: 'o2',
      code: '#1049',
      channel: 'Delivery',
      customer: 'Ana Paula',
      items: [{ productId: 'p8', name: 'Combo Família', qty: 1, price: 89.9 }],
      total: 89.9,
      status: 'Novo',
      createdAt: new Date(Date.now() - 420000).toISOString(),
    },
    {
      id: 'o3',
      code: '#1050',
      channel: 'Balcão',
      customer: 'Rafael',
      items: [
        { productId: 'p2', name: 'Cheese Salada', qty: 1, price: 29.9 },
        { productId: 'p3', name: 'Batata Crocante', qty: 1, price: 19.9 },
      ],
      total: 49.8,
      status: 'Pronto',
      createdAt: new Date(Date.now() - 180000).toISOString(),
    },
  ],
  customers: [
    ['c1', 'Ana Paula', '(47) 99921-4401', 18, 1240.5, 'Hoje'],
    ['c2', 'Rafael Martins', '(47) 98820-7120', 11, 742.3, 'Hoje'],
    ['c3', 'Camila Souza', '(47) 99770-3191', 27, 1860.9, 'Ontem'],
    ['c4', 'Bruno Lima', '(47) 99118-2104', 7, 401.2, '18/09'],
  ].map(x => ({
    id: String(x[0]),
    name: String(x[1]),
    phone: String(x[2]),
    orders: Number(x[3]),
    totalSpent: Number(x[4]),
    lastOrder: String(x[5]),
  })),
  stock: [
    ['s1', 'Pão brioche', 'un', 82, 40, 2.1],
    ['s2', 'Carne bovina 160g', 'un', 38, 30, 8.4],
    ['s3', 'Bacon fatiado', 'kg', 4.2, 5, 31.8],
    ['s4', 'Batata congelada', 'kg', 12.5, 8, 14.2],
    ['s5', 'Coca-Cola lata', 'un', 96, 48, 3.85],
  ].map(x => ({
    id: String(x[0]),
    name: String(x[1]),
    unit: String(x[2]),
    current: Number(x[3]),
    minimum: Number(x[4]),
    cost: Number(x[5]),
  })),
  transactions: [
    {
      id: 'f1',
      description: 'Vendas do dia',
      type: 'Entrada',
      amount: 2847.6,
      date: 'Hoje',
      category: 'Vendas',
    },
    {
      id: 'f2',
      description: 'Fornecedor de carnes',
      type: 'Saída',
      amount: 680,
      date: 'Hoje',
      category: 'Compras',
    },
    {
      id: 'f3',
      description: 'iFood / delivery',
      type: 'Entrada',
      amount: 934.2,
      date: 'Ontem',
      category: 'Delivery',
    },
    {
      id: 'f4',
      description: 'Energia elétrica',
      type: 'Saída',
      amount: 412.8,
      date: 'Ontem',
      category: 'Despesas',
    },
  ],
});
async function get() {
  const r = await db.list<S>('mesa_state', { limit: 1 });
  if (r.items.length) {
    const { id, ...state } = r.items[0];
    return { id, state: state as S };
  }
  const state = seed();
  const [id] = await db.add('mesa_state', [
    state as unknown as Record<string, unknown>,
  ]);
  if (!id) throw new Error('seed');
  return { id, state };
}
async function save(id: string, state: S) {
  const [ok] = await db.update('mesa_state', [
    { id, record: state as unknown as Record<string, unknown> },
  ]);
  if (!ok) throw new Error('save');
}
export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'GET /api/state': [async () => json((await get()).state)],
  'POST /api/reset': [
    async () => {
      const x = await get();
      const state = seed();
      await save(x.id, state);
      return json(state);
    },
  ],
  'POST /api/products': [
    async ({ body }) => {
      const b = body as Partial<P>;
      if (!b.name?.trim() || Number(b.price) <= 0)
        return error('Nome e preço são obrigatórios', 400);
      const x = await get();
      const p: P = {
        id: `p${Date.now()}`,
        name: b.name.trim(),
        category: b.category || 'Outros',
        price: Number(b.price),
        stock: Number(b.stock || 0),
        active: true,
      };
      x.state.products.unshift(p);
      await save(x.id, x.state);
      return json(p, 201);
    },
  ],
  'DELETE /api/products/:id': [
    async ({ params }) => {
      const x = await get();
      const n = x.state.products.length;
      x.state.products = x.state.products.filter(p => p.id !== params.id);
      if (x.state.products.length === n)
        return error('Produto não encontrado', 404);
      await save(x.id, x.state);
      return json({ deleted: true });
    },
  ],
  'PUT /api/tables/:id/status': [
    async ({ params, body }) => {
      const b = body as { status?: T['status'] };
      const x = await get();
      const t = x.state.tables.find(v => v.id === params.id);
      if (!t || !b.status) return error('Mesa/status inválido', 400);
      t.status = b.status;
      if (b.status === 'Livre') {
        t.total = 0;
        t.waiter = undefined;
      }
      if (b.status === 'Ocupada' && !t.waiter) t.waiter = 'Equipe';
      await save(x.id, x.state);
      return json(t);
    },
  ],
  'POST /api/orders': [
    async ({ body }) => {
      const b = body as {
        channel?: string;
        table?: string;
        customer?: string;
        items?: I[];
      };
      if (!b.items?.length) return error('Pedido sem itens', 400);
      const x = await get();
      const total = Number(
        b.items.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)
      );
      const code = `#${1051 + x.state.orders.filter(o => Number(o.code.slice(1)) >= 1051).length}`;
      const o: O = {
        id: `o${Date.now()}`,
        code,
        channel: b.channel || 'Balcão',
        table: b.table,
        customer: b.customer || 'Cliente balcão',
        items: b.items,
        total,
        status: 'Novo',
        createdAt: new Date().toISOString(),
      };
      x.state.orders.unshift(o);
      x.state.transactions.unshift({
        id: `f${Date.now()}`,
        description: `Venda ${code}`,
        type: 'Entrada',
        amount: total,
        date: 'Hoje',
        category: 'Vendas',
      });
      if (b.table) {
        const t = x.state.tables.find(v => v.name === b.table);
        if (t) {
          t.status = 'Ocupada';
          t.total = Number((t.total + total).toFixed(2));
        }
      }
      await save(x.id, x.state);
      return json(o, 201);
    },
  ],
  'PUT /api/orders/:id/status': [
    async ({ params, body }) => {
      const b = body as { status?: string };
      const x = await get();
      const o = x.state.orders.find(v => v.id === params.id);
      if (!o || !b.status) return error('Pedido/status inválido', 400);
      o.status = b.status;
      await save(x.id, x.state);
      return json(o);
    },
  ],
  'POST /api/customers': [
    async ({ body }) => {
      const b = body as Partial<C>;
      if (!b.name?.trim() || !b.phone?.trim())
        return error('Nome e telefone obrigatórios', 400);
      const x = await get();
      const c: C = {
        id: `c${Date.now()}`,
        name: b.name.trim(),
        phone: b.phone.trim(),
        orders: 0,
        totalSpent: 0,
        lastOrder: 'Sem pedidos',
      };
      x.state.customers.unshift(c);
      await save(x.id, x.state);
      return json(c, 201);
    },
  ],
});
