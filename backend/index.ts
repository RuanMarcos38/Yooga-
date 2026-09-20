import { ai, db, storage, router, json, error } from '@appdeploy/sdk';

type P = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  active: boolean;
  description?: string;
  cost?: number;
  code?: string;
  featured?: boolean;
  prepTime?: number;
  channels?: string[];
  addons?: string[];
  ingredients?: string[];
  imageUrl?: string;
  imagePath?: string;
};

type MenuCategory = {
  id: string;
  name: string;
  active: boolean;
  order: number;
  imageUrl?: string;
  imagePath?: string;
};

type AppSettings = {
  restaurantName: string;
  unit: string;
  serviceFee: number;
  automaticServiceFee: boolean;
  qrMenuEnabled: boolean;
  selfServiceEnabled: boolean;
  waiterAppEnabled: boolean;
  autoAcceptDelivery: boolean;
  lowStockAlerts: boolean;
  prepAlerts: boolean;
  loyaltyEnabled: boolean;
  pixEnabled: boolean;
  cardEnabled: boolean;
  cashEnabled: boolean;
  autoPrint: boolean;
  kdsEnabled: boolean;
  fiscalEnabled: boolean;
  deliveryMinimum: number;
  freeDeliveryFrom: number;
  openingHours: string;
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
  updatedAt?: string;
  startedAt?: string;
  readyAt?: string;
  deliveredAt?: string;
  paymentMethod?: string;
};
type C = {
  id: string;
  name: string;
  phone: string;
  orders: number;
  totalSpent: number;
  lastOrder: string;
};
type StockItem = {
  id: string;
  name: string;
  unit: string;
  current: number;
  minimum: number;
  cost: number;
};
type Tx = {
  id: string;
  description: string;
  type: 'Entrada' | 'Saída';
  amount: number;
  date: string;
  category: string;
  createdAt?: string;
};
type CashRegister = { status: 'Aberto' | 'Fechado'; openingAmount: number; openedAt: string; closedAt?: string; closingAmount?: number };
type ServiceRequest = { id: string; table: string; type: 'waiter' | 'bill'; status: 'pending' | 'resolved'; createdAt: string; resolvedAt?: string };
type AuditEvent = { id: string; entity: string; entityId: string; action: string; detail: string; user: string; createdAt: string };
type S = {
  products: P[];
  menuCategories: MenuCategory[];
  tables: T[];
  orders: O[];
  customers: C[];
  stock: StockItem[];
  transactions: Tx[];
  cashRegister: CashRegister;
  serviceRequests: ServiceRequest[];
  auditLog: AuditEvent[];
  settings: AppSettings;
};

const defaultSettings = (): AppSettings => ({
  restaurantName: 'Mesa Restaurante',
  unit: 'Unidade Centro',
  serviceFee: 10,
  automaticServiceFee: true,
  qrMenuEnabled: true,
  selfServiceEnabled: false,
  waiterAppEnabled: true,
  autoAcceptDelivery: false,
  lowStockAlerts: true,
  prepAlerts: true,
  loyaltyEnabled: true,
  pixEnabled: true,
  cardEnabled: true,
  cashEnabled: true,
  autoPrint: false,
  kdsEnabled: true,
  fiscalEnabled: false,
  deliveryMinimum: 20,
  freeDeliveryFrom: 80,
  openingHours: '11:00 às 23:00',
});

const defaultCategories = (): MenuCategory[] => [
  { id: 'cat1', name: 'Hambúrgueres', active: true, order: 1 },
  { id: 'cat2', name: 'Porções', active: true, order: 2 },
  { id: 'cat3', name: 'Bebidas', active: true, order: 3 },
  { id: 'cat4', name: 'Sobremesas', active: true, order: 4 },
  { id: 'cat5', name: 'Combos', active: true, order: 5 },
];

const seed = (): S => ({
  settings: defaultSettings(),
  menuCategories: defaultCategories(),
  products: [
    ['p1', 'Smash Bacon', 'Hambúrgueres', 34.9, 42, 12.2],
    ['p2', 'Cheese Salada', 'Hambúrgueres', 29.9, 38, 10.8],
    ['p3', 'Batata Crocante', 'Porções', 19.9, 54, 6.2],
    ['p4', 'Onion Rings', 'Porções', 22.9, 31, 7.4],
    ['p5', 'Coca-Cola Lata', 'Bebidas', 7, 96, 3.1],
    ['p6', 'Suco de Laranja', 'Bebidas', 12, 28, 4.2],
    ['p7', 'Brownie com Sorvete', 'Sobremesas', 18.9, 20, 6.5],
    ['p8', 'Combo Família', 'Combos', 89.9, 16, 36.5],
  ].map(value => ({
    id: String(value[0]),
    name: String(value[1]),
    category: String(value[2]),
    price: Number(value[3]),
    stock: Number(value[4]),
    cost: Number(value[5]),
    active: true,
    featured: String(value[0]) === 'p1' || String(value[0]) === 'p8',
    prepTime: String(value[2]) === 'Bebidas' ? 3 : 15,
    channels: ['Mesa', 'Balcão', 'Delivery', 'QR/Totem'],
    addons: [],
    ingredients: [],
  })),
  tables: Array.from({ length: 14 }, (_, index) => ({
    id: 't' + (index + 1),
    name: 'Mesa ' + String(index + 1).padStart(2, '0'),
    seats: index % 3 === 0 ? 6 : 4,
    status: (index === 0 ? 'Ocupada' : index === 1 || index === 4 ? 'Aguardando' : 'Livre') as T['status'],
    total: index === 0 ? 86.7 : index === 1 ? 49.8 : index === 4 ? 129.4 : 0,
    waiter: index === 0 ? 'Marina' : index === 1 ? 'João' : index === 4 ? 'Carlos' : undefined,
  })),
  orders: [
    {
      id: 'o1',
      code: '#1048',
      channel: 'Mesa',
      table: 'Mesa 01',
      customer: 'Cliente balcão',
      items: [
        { productId: 'p1', name: 'Smash Bacon', qty: 2, price: 34.9 },
        { productId: 'p5', name: 'Coca-Cola Lata', qty: 2, price: 7 },
      ],
      total: 83.8,
      status: 'Preparando',
      createdAt: new Date(Date.now() - 720000).toISOString(),
      paymentMethod: 'Cartão',
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
      paymentMethod: 'Pix',
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
      paymentMethod: 'Dinheiro',
    },
  ],
  customers: [
    ['c1', 'Ana Paula', '(47) 99921-4401', 18, 1240.5, 'Hoje'],
    ['c2', 'Rafael Martins', '(47) 98820-7120', 11, 742.3, 'Hoje'],
    ['c3', 'Camila Souza', '(47) 99770-3191', 27, 1860.9, 'Ontem'],
    ['c4', 'Bruno Lima', '(47) 99118-2104', 7, 401.2, '18/09'],
  ].map(value => ({
    id: String(value[0]),
    name: String(value[1]),
    phone: String(value[2]),
    orders: Number(value[3]),
    totalSpent: Number(value[4]),
    lastOrder: String(value[5]),
  })),
  stock: [
    ['s1', 'Pão brioche', 'un', 82, 40, 2.1],
    ['s2', 'Carne bovina 160g', 'un', 38, 30, 8.4],
    ['s3', 'Bacon fatiado', 'kg', 4.2, 5, 31.8],
    ['s4', 'Batata congelada', 'kg', 12.5, 8, 14.2],
    ['s5', 'Coca-Cola lata', 'un', 96, 48, 3.85],
  ].map(value => ({
    id: String(value[0]),
    name: String(value[1]),
    unit: String(value[2]),
    current: Number(value[3]),
    minimum: Number(value[4]),
    cost: Number(value[5]),
  })),
  transactions: [
    { id: 'f1', description: 'Vendas do dia', type: 'Entrada', amount: 2847.6, date: 'Hoje', category: 'Vendas', createdAt: new Date().toISOString() },
    { id: 'f2', description: 'Fornecedor de carnes', type: 'Saída', amount: 680, date: 'Hoje', category: 'Compras', createdAt: new Date().toISOString() },
    { id: 'f3', description: 'iFood / delivery', type: 'Entrada', amount: 934.2, date: 'Ontem', category: 'Delivery', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'f4', description: 'Energia elétrica', type: 'Saída', amount: 412.8, date: 'Ontem', category: 'Despesas', createdAt: new Date(Date.now() - 86400000).toISOString() },
  ],
  cashRegister: { status: 'Aberto', openingAmount: 0, openedAt: new Date().toISOString() },
  serviceRequests: [],
  auditLog: [
    { id: 'a1', entity: 'cash', entityId: 'cash', action: 'Caixa aberto', detail: 'Abertura inicial da operação', user: 'Administrador', createdAt: new Date().toISOString() },
  ],
});

function normalizeState(raw: Partial<S>): S {
  const base = seed();
  return {
    products: (raw.products || base.products).map(product => ({
      active: true,
      featured: false,
      prepTime: 15,
      channels: ['Mesa', 'Balcão', 'Delivery', 'QR/Totem'],
      addons: [],
      ingredients: [],
      ...product,
    })),
    menuCategories: raw.menuCategories?.length ? raw.menuCategories : base.menuCategories,
    tables: raw.tables || base.tables,
    orders: (raw.orders || base.orders).map(order => ({
      updatedAt: order.createdAt,
      ...order,
    })),
    customers: raw.customers || base.customers,
    stock: raw.stock || base.stock,
    transactions: raw.transactions || base.transactions,
    cashRegister: raw.cashRegister || base.cashRegister,
    serviceRequests: raw.serviceRequests || [],
    auditLog: raw.auditLog || base.auditLog,
    settings: { ...base.settings, ...(raw.settings || {}) },
  };
}

async function get() {
  const result = await db.list<S>('mesa_state', { limit: 1 });
  if (result.items.length) {
    const { id, ...state } = result.items[0];
    return { id, state: normalizeState(state as Partial<S>) };
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

async function withSignedImages(state: S): Promise<S> {
  const productPaths = state.products.map(item => item.imagePath).filter((value): value is string => Boolean(value));
  const categoryPaths = state.menuCategories.map(item => item.imagePath).filter((value): value is string => Boolean(value));
  const paths = [...new Set([...productPaths, ...categoryPaths])];
  if (!paths.length) return state;

  const urls = await storage.url(paths);
  const urlMap = new Map(urls.map(item => [item.path, item.url]));
  return {
    ...state,
    products: state.products.map(item => item.imagePath ? { ...item, imageUrl: urlMap.get(item.imagePath) || item.imageUrl } : item),
    menuCategories: state.menuCategories.map(item => item.imagePath ? { ...item, imageUrl: urlMap.get(item.imagePath) || item.imageUrl } : item),
  };
}

function audit(state: S, entity: string, entityId: string, action: string, detail: string, user = 'Administrador') {
  state.auditLog.unshift({
    id: 'a' + Date.now() + Math.random().toString(36).slice(2, 6),
    entity,
    entityId,
    action,
    detail,
    user,
    createdAt: new Date().toISOString(),
  });
  state.auditLog = state.auditLog.slice(0, 200);
}

function tableFromCode(state: S, code: string) {
  const normalized = decodeURIComponent(code).replace(/-/g, ' ').trim().toLowerCase();
  return state.tables.find(table => table.name.toLowerCase() === normalized);
}

function applyProduct(product: P, value: Partial<P>): P {
  return {
    ...product,
    name: value.name?.trim() || product.name,
    category: value.category || product.category,
    price: value.price === undefined ? product.price : Number(value.price),
    stock: value.stock === undefined ? product.stock : Number(value.stock),
    active: value.active === undefined ? product.active : Boolean(value.active),
    description: value.description ?? product.description,
    cost: value.cost === undefined ? product.cost : Number(value.cost),
    code: value.code ?? product.code,
    featured: value.featured === undefined ? product.featured : Boolean(value.featured),
    prepTime: value.prepTime === undefined ? product.prepTime : Number(value.prepTime),
    channels: value.channels ?? product.channels,
    addons: value.addons ?? product.addons,
    ingredients: value.ingredients ?? product.ingredients,
    imageUrl: value.imageUrl ?? product.imageUrl,
  };
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],

  'POST /api/assistant': [async ({ body }) => {
    const value = body as {
      mode?: 'establishment' | 'customer';
      message?: string;
      page?: string;
      table?: string;
      history?: Array<{ role?: string; content?: string }>;
    };

    const mode = value.mode === 'customer' ? 'customer' : 'establishment';
    const message = value.message?.trim();
    if (!message) return error('Mensagem obrigatória', 400);

    const safeHistory = (value.history || [])
      .slice(-8)
      .filter(item => (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
      .map(item => ({
        role: item.role as 'user' | 'assistant',
        content: String(item.content).slice(0, 1200),
      }));

    const establishmentGuide = [
      'Dashboard: métricas de pedidos, mesas ocupadas, tempos, alertas e caixa.',
      'Pedidos/PDV: selecionar canal, mesa, produtos, quantidades, pagamento e salvar pedido.',
      'Mesas: abrir cardápio da mesa, chamar garçom, copiar link do cliente e atender alertas.',
      'Histórico/Caixa: abrir/fechar caixa, entradas, saídas, vendas, pagamentos e movimentações.',
      'Montar cardápio: categorias, produtos, imagens, preço, custo, margem, canais, complementos e ficha técnica.',
      'Cozinha/KDS: acompanhar e avançar pedidos entre Novo, Preparando, Pronto e Entregue.',
      'Delivery: pedidos de entrega.',
      'Produtos: cadastrar, editar, excluir e enviar foto.',
      'Estoque: acompanhar e ajustar quantidades.',
      'Financeiro: entradas e saídas.',
      'Clientes/CRM: cadastro e histórico comercial.',
      'Relatórios: indicadores da operação.',
      'Configurações: taxas, QR, garçom, totem, pagamentos, KDS e alertas.',
    ].join('\n');

    const customerGuide = [
      'O cliente só pode receber ajuda sobre sua própria experiência.',
      'Pode acompanhar o status do pedido e os itens da própria mesa.',
      'Pode ativar notificações do navegador.',
      'Pode chamar o garçom.',
      'Pode solicitar a conta.',
      'Não pode receber instruções, valores internos ou dados sobre Dashboard, caixa, financeiro, estoque, CRM, relatórios, configurações, custos, margens, outras mesas ou administração.',
      'Se perguntarem sobre uma área administrativa, explique que ela é restrita ao estabelecimento e oriente a falar com a equipe.',
    ].join('\n');

    const system = mode === 'customer'
      ? `Você é o Assistente de IA do Modo Cliente do Mesa Restaurant OS. Responda em português do Brasil, de forma curta, clara e acolhedora. Nunca invente status, preço, prazo ou ação que não esteja no contexto. Não execute ações. Sua função é explicar como usar a interface do cliente. Regras e recursos permitidos:\n${customerGuide}\nMesa atual: ${value.table || 'não informada'}.`
      : `Você é o Assistente de IA operacional do Mesa Restaurant OS. Responda em português do Brasil, com instruções práticas, curtas e passo a passo. Ajude o estabelecimento a usar o sistema sem inventar recursos que não existem e sem afirmar que executou ações. Quando for útil, indique o nome exato do módulo. Recursos atuais:\n${establishmentGuide}\nTela atual: ${value.page || 'não informada'}.`;

    try {
      const response = await ai.generate({
        system,
        messages: safeHistory.length ? safeHistory : [{ role: 'user', content: message }],
        maxTokens: 650,
        temperature: 0.2,
        thinkingMode: 'FAST',
      });

      return json({ answer: response.text.trim() || 'Não consegui gerar uma orientação agora.' });
    } catch (err) {
      console.error('AI assistant error', err);
      return error('Assistente temporariamente indisponível', 503);
    }
  }],

  'GET /api/state': [async () => json(await withSignedImages((await get()).state))],

  'GET /api/customer/table/:code': [async ({ params }) => {
    const current = await get();
    const table = tableFromCode(current.state, params.code);
    if (!table) return error('Mesa não encontrada', 404);
    const orders = current.state.orders
      .filter(order => order.table === table.name && !['Entregue', 'Finalizado', 'Cancelado'].includes(order.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const pendingRequests = current.state.serviceRequests.filter(request => request.table === table.name && request.status === 'pending');
    return json({
      store: {
        restaurantName: current.state.settings.restaurantName,
        unit: current.state.settings.unit,
        serviceFee: current.state.settings.serviceFee,
        automaticServiceFee: current.state.settings.automaticServiceFee,
      },
      table,
      orders,
      pendingRequests,
    });
  }],

  'POST /api/customer/table/:code/request': [async ({ params, body }) => {
    const value = body as { type?: 'waiter' | 'bill' };
    if (!value.type || !['waiter', 'bill'].includes(value.type)) return error('Solicitação inválida', 400);
    const current = await get();
    const table = tableFromCode(current.state, params.code);
    if (!table) return error('Mesa não encontrada', 404);
    const existing = current.state.serviceRequests.find(request => request.table === table.name && request.type === value.type && request.status === 'pending');
    if (existing) return json(existing);
    const request: ServiceRequest = {
      id: 'sr' + Date.now(),
      table: table.name,
      type: value.type,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    current.state.serviceRequests.unshift(request);
    audit(current.state, 'table', table.id, value.type === 'bill' ? 'Conta solicitada pelo cliente' : 'Garçom solicitado pelo cliente', table.name, 'Cliente');
    await save(current.id, current.state);
    return json(request, 201);
  }],

  'PUT /api/service-requests/:id/resolve': [async ({ params }) => {
    const current = await get();
    const request = current.state.serviceRequests.find(item => item.id === params.id);
    if (!request) return error('Solicitação não encontrada', 404);
    request.status = 'resolved';
    request.resolvedAt = new Date().toISOString();
    audit(current.state, 'table', request.table, 'Solicitação atendida', (request.type === 'bill' ? 'Conta' : 'Garçom') + ' · ' + request.table);
    await save(current.id, current.state);
    return json(request);
  }],

  'POST /api/cash/open': [async ({ body }) => {
    const value = body as { openingAmount?: number };
    const current = await get();
    if (current.state.cashRegister.status === 'Aberto') return error('Caixa já está aberto', 400);
    current.state.cashRegister = {
      status: 'Aberto',
      openingAmount: Number(value.openingAmount || 0),
      openedAt: new Date().toISOString(),
    };
    audit(current.state, 'cash', 'cash', 'Caixa aberto', 'Valor de abertura ' + Number(value.openingAmount || 0).toFixed(2));
    await save(current.id, current.state);
    return json(current.state.cashRegister);
  }],

  'POST /api/cash/close': [async () => {
    const current = await get();
    if (current.state.cashRegister.status === 'Fechado') return error('Caixa já está fechado', 400);
    const sales = current.state.orders.filter(order => order.status !== 'Cancelado').reduce((sum, order) => sum + order.total, 0);
    const entries = current.state.transactions.filter(tx => tx.type === 'Entrada' && tx.category !== 'Vendas').reduce((sum, tx) => sum + tx.amount, 0);
    const exits = current.state.transactions.filter(tx => tx.type === 'Saída').reduce((sum, tx) => sum + tx.amount, 0);
    const closingAmount = Number((current.state.cashRegister.openingAmount + sales + entries - exits).toFixed(2));
    current.state.cashRegister = {
      ...current.state.cashRegister,
      status: 'Fechado',
      closedAt: new Date().toISOString(),
      closingAmount,
    };
    audit(current.state, 'cash', 'cash', 'Caixa fechado', 'Saldo de fechamento ' + closingAmount.toFixed(2));
    await save(current.id, current.state);
    return json(current.state.cashRegister);
  }],

  'POST /api/reset': [async () => {
    const current = await get();
    const state = seed();
    await save(current.id, state);
    return json(await withSignedImages(state));
  }],

  'POST /api/products': [async ({ body }) => {
    const value = body as Partial<P>;
    if (!value.name?.trim() || Number(value.price) <= 0) return error('Nome e preço são obrigatórios', 400);
    const current = await get();
    const product: P = {
      id: 'p' + Date.now(),
      name: value.name.trim(),
      category: value.category || 'Outros',
      price: Number(value.price),
      stock: Number(value.stock || 0),
      active: value.active ?? true,
      description: value.description || '',
      cost: Number(value.cost || 0),
      code: value.code || '',
      featured: value.featured ?? false,
      prepTime: Number(value.prepTime || 15),
      channels: value.channels || ['Mesa', 'Balcão', 'Delivery', 'QR/Totem'],
      addons: value.addons || [],
      ingredients: value.ingredients || [],
      imageUrl: value.imageUrl || '',
    };
    current.state.products.unshift(product);
    await save(current.id, current.state);
    return json(product, 201);
  }],

  'PUT /api/products/:id': [async ({ params, body }) => {
    const value = body as Partial<P>;
    const current = await get();
    const index = current.state.products.findIndex(product => product.id === params.id);
    if (index < 0) return error('Produto não encontrado', 404);
    const updated = applyProduct(current.state.products[index], value);
    if (!updated.name.trim() || updated.price <= 0) return error('Nome e preço são obrigatórios', 400);
    current.state.products[index] = updated;
    await save(current.id, current.state);
    return json(updated);
  }],

  'POST /api/products/:id/image': [async ({ params, body }) => {
    const value = body as { content?: string; contentType?: string };
    if (!value.content || !value.contentType?.startsWith('image/')) return error('Imagem inválida', 400);
    const current = await get();
    const product = current.state.products.find(item => item.id === params.id);
    if (!product) return error('Produto não encontrado', 404);
    const path = 'catalog/products/' + params.id + '-' + Date.now() + '.jpg';
    const [ok] = await storage.write([{ path, content: value.content, contentType: value.contentType }]);
    if (!ok) return error('Falha ao salvar imagem', 500);
    if (product.imagePath) await storage.delete([product.imagePath]);
    product.imagePath = path;
    product.imageUrl = '';
    await save(current.id, current.state);
    const [{ url }] = await storage.url([path]);
    return json({ ...product, imageUrl: url });
  }],

  'DELETE /api/products/:id': [async ({ params }) => {
    const current = await get();
    const product = current.state.products.find(item => item.id === params.id);
    if (!product) return error('Produto não encontrado', 404);
    current.state.products = current.state.products.filter(item => item.id !== params.id);
    if (product.imagePath) await storage.delete([product.imagePath]);
    await save(current.id, current.state);
    return json({ deleted: true });
  }],

  'POST /api/menu/categories': [async ({ body }) => {
    const value = body as Partial<MenuCategory>;
    if (!value.name?.trim()) return error('Nome da categoria é obrigatório', 400);
    const current = await get();
    const category: MenuCategory = {
      id: 'cat' + Date.now(),
      name: value.name.trim(),
      active: value.active ?? true,
      order: Number(value.order || current.state.menuCategories.length + 1),
      imageUrl: value.imageUrl || '',
    };
    current.state.menuCategories.push(category);
    await save(current.id, current.state);
    return json(category, 201);
  }],

  'PUT /api/menu/categories/:id': [async ({ params, body }) => {
    const value = body as Partial<MenuCategory>;
    const current = await get();
    const category = current.state.menuCategories.find(item => item.id === params.id);
    if (!category) return error('Categoria não encontrada', 404);
    const oldName = category.name;
    category.name = value.name?.trim() || category.name;
    category.active = value.active === undefined ? category.active : Boolean(value.active);
    category.order = value.order === undefined ? category.order : Number(value.order);
    category.imageUrl = value.imageUrl ?? category.imageUrl;
    if (oldName !== category.name) {
      current.state.products = current.state.products.map(product => product.category === oldName ? { ...product, category: category.name } : product);
    }
    await save(current.id, current.state);
    return json(category);
  }],

  'POST /api/menu/categories/:id/image': [async ({ params, body }) => {
    const value = body as { content?: string; contentType?: string };
    if (!value.content || !value.contentType?.startsWith('image/')) return error('Imagem inválida', 400);
    const current = await get();
    const category = current.state.menuCategories.find(item => item.id === params.id);
    if (!category) return error('Categoria não encontrada', 404);
    const path = 'catalog/categories/' + params.id + '-' + Date.now() + '.jpg';
    const [ok] = await storage.write([{ path, content: value.content, contentType: value.contentType }]);
    if (!ok) return error('Falha ao salvar imagem', 500);
    if (category.imagePath) await storage.delete([category.imagePath]);
    category.imagePath = path;
    category.imageUrl = '';
    await save(current.id, current.state);
    const [{ url }] = await storage.url([path]);
    return json({ ...category, imageUrl: url });
  }],

  'DELETE /api/menu/categories/:id': [async ({ params }) => {
    const current = await get();
    const category = current.state.menuCategories.find(item => item.id === params.id);
    if (!category) return error('Categoria não encontrada', 404);
    current.state.menuCategories = current.state.menuCategories.filter(item => item.id !== params.id);
    current.state.products = current.state.products.map(product => product.category === category.name ? { ...product, category: 'Outros' } : product);
    if (category.imagePath) await storage.delete([category.imagePath]);
    await save(current.id, current.state);
    return json({ deleted: true });
  }],

  'PUT /api/tables/:id/status': [async ({ params, body }) => {
    const value = body as { status?: T['status'] };
    const current = await get();
    const table = current.state.tables.find(item => item.id === params.id);
    if (!table || !value.status) return error('Mesa/status inválido', 400);
    table.status = value.status;
    if (value.status === 'Livre') {
      table.total = 0;
      table.waiter = undefined;
    }
    if (value.status === 'Ocupada' && !table.waiter) table.waiter = 'Equipe';
    audit(current.state, 'table', table.id, 'Status da mesa alterado', table.name + ' · ' + value.status);
    await save(current.id, current.state);
    return json(table);
  }],

  'POST /api/orders': [async ({ body }) => {
    const value = body as { channel?: string; table?: string; customer?: string; paymentMethod?: string; items?: I[] };
    if (!value.items?.length) return error('Pedido sem itens', 400);
    const current = await get();
    const subtotal = Number(value.items.reduce((sum, item) => sum + item.price * item.qty, 0).toFixed(2));
    const fee = value.channel === 'Mesa' && current.state.settings.automaticServiceFee ? subtotal * (current.state.settings.serviceFee / 100) : 0;
    const total = Number((subtotal + fee).toFixed(2));
    const sequence = 1051 + current.state.orders.filter(order => Number(order.code.slice(1)) >= 1051).length;
    const createdAt = new Date().toISOString();
    const order: O = {
      id: 'o' + Date.now(),
      code: '#' + sequence,
      channel: value.channel || 'Balcão',
      table: value.table,
      customer: value.customer || 'Cliente balcão',
      items: value.items,
      total,
      status: 'Novo',
      createdAt,
      updatedAt: createdAt,
      paymentMethod: value.paymentMethod || 'Não informado',
    };
    current.state.orders.unshift(order);
    current.state.transactions.unshift({
      id: 'f' + Date.now(),
      description: 'Venda ' + order.code,
      type: 'Entrada',
      amount: total,
      date: 'Hoje',
      category: 'Vendas',
    });
    if (value.table) {
      const table = current.state.tables.find(item => item.name === value.table);
      if (table) {
        table.status = 'Ocupada';
        table.total = Number((table.total + total).toFixed(2));
      }
    }
    audit(current.state, 'order', order.id, 'Pedido criado', order.code + ' · ' + order.channel + (order.table ? ' · ' + order.table : ''));
    await save(current.id, current.state);
    return json(order, 201);
  }],

  'PUT /api/orders/:id/status': [async ({ params, body }) => {
    const value = body as { status?: string };
    const current = await get();
    const order = current.state.orders.find(item => item.id === params.id);
    if (!order || !value.status) return error('Pedido/status inválido', 400);
    const changedAt = new Date().toISOString();
    order.status = value.status;
    order.updatedAt = changedAt;
    if (value.status === 'Preparando' && !order.startedAt) order.startedAt = changedAt;
    if (value.status === 'Pronto' && !order.readyAt) order.readyAt = changedAt;
    if (value.status === 'Entregue' && !order.deliveredAt) order.deliveredAt = changedAt;
    audit(current.state, 'order', order.id, 'Status do pedido alterado', order.code + ' · ' + value.status);
    await save(current.id, current.state);
    return json(order);
  }],

  'POST /api/customers': [async ({ body }) => {
    const value = body as Partial<C>;
    if (!value.name?.trim() || !value.phone?.trim()) return error('Nome e telefone obrigatórios', 400);
    const current = await get();
    const customer: C = {
      id: 'c' + Date.now(),
      name: value.name.trim(),
      phone: value.phone.trim(),
      orders: 0,
      totalSpent: 0,
      lastOrder: 'Sem pedidos',
    };
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
    if (!value.description?.trim() || !['Entrada', 'Saída'].includes(String(value.type)) || Number(value.amount) <= 0) {
      return error('Lançamento financeiro inválido', 400);
    }
    const current = await get();
    const transaction: Tx = {
      id: 'f' + Date.now(),
      description: value.description.trim(),
      type: value.type as 'Entrada' | 'Saída',
      amount: Number(value.amount),
      date: 'Hoje',
      category: value.category || 'Outros',
      createdAt: new Date().toISOString(),
    };
    current.state.transactions.unshift(transaction);
    audit(current.state, 'cash', transaction.id, transaction.type + ' adicionada ao caixa', transaction.description + ' · ' + transaction.amount.toFixed(2));
    await save(current.id, current.state);
    return json(transaction, 201);
  }],

  'PUT /api/settings': [async ({ body }) => {
    const value = body as Partial<AppSettings>;
    if (value.restaurantName !== undefined && !value.restaurantName.trim()) return error('Nome é obrigatório', 400);
    if (value.unit !== undefined && !value.unit.trim()) return error('Unidade é obrigatória', 400);
    const current = await get();
    current.state.settings = {
      ...current.state.settings,
      ...value,
      restaurantName: value.restaurantName?.trim() || current.state.settings.restaurantName,
      unit: value.unit?.trim() || current.state.settings.unit,
    };
    await save(current.id, current.state);
    return json(current.state.settings);
  }],
});
