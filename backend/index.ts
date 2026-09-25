import { createHash, randomBytes } from 'node:crypto';
import { ai, db, storage, router, json, error, currentRequestHeaders } from './appdeploy-compat.js';

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
  kitchenPrinter: string;
  counterPrinter: string;
  barPrinter: string;
  printCopies: number;
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
  email?: string;
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

type CompanyRecord = {
  id: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  contactName?: string;
  plan?: string;
  status: 'Ativa' | 'Inativa' | 'Teste';
  createdAt: string;
  updatedAt: string;
};

type PlatformUserRecord = {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: 'Administrador' | 'Gestor' | 'Operador';
  status: 'Ativo' | 'Inativo';
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

const tableStatusValues: T['status'][] = ['Livre', 'Ocupada', 'Aguardando', 'Fechamento'];

const defaultSettings = (): AppSettings => ({
  restaurantName: 'TAPFOOD',
  unit: 'Unidade Principal',
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
  kitchenPrinter: 'Cozinha',
  counterPrinter: 'Balcão',
  barPrinter: 'Bar',
  printCopies: 1,
});

const defaultCategories = (): MenuCategory[] => [
  { id: 'cat1', name: 'Hambúrgueres', active: true, order: 1 },
  { id: 'cat2', name: 'Porções', active: true, order: 2 },
  { id: 'cat3', name: 'Bebidas', active: true, order: 3 },
  { id: 'cat4', name: 'Sobremesas', active: true, order: 4 },
  { id: 'cat5', name: 'Combos', active: true, order: 5 },
];

const defaultTables = (): T[] => Array.from({ length: 40 }, (_, index) => ({
  id: 't' + (index + 1),
  name: 'Mesa ' + String(index + 1).padStart(2, '0'),
  seats: index % 3 === 0 ? 6 : 4,
  status: (index === 0 ? 'Ocupada' : index === 1 || index === 4 ? 'Aguardando' : 'Livre') as T['status'],
  total: index === 0 ? 86.7 : index === 1 ? 49.8 : index === 4 ? 129.4 : 0,
  waiter: index === 0 ? 'Marina' : index === 1 ? 'João' : index === 4 ? 'Carlos' : undefined,
}));

const productImages: Record<string, string> = {
  p1: 'https://images.unsplash.com/photo-1559067933-0293effe6133?auto=format&fit=crop&w=900&q=82',
  p2: 'https://images.unsplash.com/photo-1674073117843-5838b44b7ae0?auto=format&fit=crop&w=900&q=82',
  p3: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=900&q=82',
  p4: 'https://images.unsplash.com/photo-1633633514326-2064746ad5b6?auto=format&fit=crop&w=900&q=82',
  p5: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=900&q=82',
  p6: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=900&q=82&sat=-8',
  p7: 'https://images.unsplash.com/photo-1702827402870-7c33dc7b67be?auto=format&fit=crop&w=900&q=82',
  p8: 'https://images.unsplash.com/photo-1565553642973-6afe791aee33?auto=format&fit=crop&w=900&q=82',
};

function defaultProductImage(product: Partial<P>) {
  if (product.id && productImages[product.id]) return productImages[product.id];
  const value = ((product.category || '') + ' ' + (product.name || '')).toLowerCase();
  if (value.includes('bebida') || value.includes('coca') || value.includes('suco')) return productImages.p5;
  if (value.includes('sobremesa') || value.includes('brownie')) return productImages.p7;
  if (value.includes('batata') || value.includes('porção') || value.includes('porcao')) return productImages.p3;
  return productImages.p2;
}

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
    imageUrl: productImages[String(value[0])] || '',
  })),
  tables: defaultTables(),
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
    email: '',
    orders: Number(value[3]),
    totalSpent: Number(value[4]),
    lastOrder: String(value[5]),
  })),
  stock: [
    ['s1', 'Pão brioche', 'un', 82, 40, 2.1],
    ['s2', 'Carne bovina 160g', 'un', 38, 30, 8.4],
    ['s3', 'Bacon fatiado', 'kg', 8.2, 5, 31.8],
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

function normalizeTable(table: Partial<T>, fallback: T): T {
  const seats = Number(table.seats ?? fallback.seats);
  const total = Number(table.total ?? fallback.total);
  const status = table.status && tableStatusValues.includes(table.status) ? table.status : fallback.status;
  const waiter = typeof table.waiter === 'string' && table.waiter.trim() ? table.waiter : fallback.waiter;

  return {
    id: String(table.id || fallback.id),
    name: String(table.name || fallback.name),
    seats: Number.isFinite(seats) && seats > 0 ? seats : fallback.seats,
    status,
    total: Number.isFinite(total) ? Number(total.toFixed(2)) : fallback.total,
    waiter,
  };
}

function normalizeTables(rawTables?: Array<Partial<T>>): T[] {
  const defaults = defaultTables();
  if (!Array.isArray(rawTables) || rawTables.length === 0) return defaults;

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const normalized = rawTables
    .filter(table => table && (table.id || table.name))
    .map((table, index) => {
      const fallback = defaults.find(item => item.id === table.id || item.name === table.name)
        || defaults[index]
        || {
          id: String(table.id || 't-custom-' + (index + 1)),
          name: String(table.name || 'Mesa ' + String(index + 1).padStart(2, '0')),
          seats: 4,
          status: 'Livre' as T['status'],
          total: 0,
        };
      const normalizedTable = normalizeTable(table, fallback);
      seenIds.add(normalizedTable.id);
      seenNames.add(normalizedTable.name.toLowerCase());
      return normalizedTable;
    });

  for (const table of defaults) {
    if (!seenIds.has(table.id) && !seenNames.has(table.name.toLowerCase())) {
      normalized.push(table);
    }
  }

  return normalized;
}

function shouldPersistRepairedTables(rawTables: T[] | undefined, tables: T[]) {
  if (!Array.isArray(rawTables) || rawTables.length === 0) return true;
  return tables.length > rawTables.length;
}

function normalizeState(raw: Partial<S>): S {
  const base = seed();
  return {
    products: (raw.products || base.products).map(product => ({
      ...product,
      active: product.active ?? true,
      featured: product.featured ?? false,
      prepTime: product.prepTime ?? 15,
      channels: product.channels ?? ['Mesa', 'Balcão', 'Delivery', 'QR/Totem'],
      addons: product.addons ?? [],
      ingredients: product.ingredients ?? [],
      imageUrl: product.imageUrl || product.imagePath ? product.imageUrl : defaultProductImage(product),
    })),
    menuCategories: raw.menuCategories?.length ? raw.menuCategories : base.menuCategories,
    tables: normalizeTables(raw.tables),
    orders: (raw.orders || base.orders).map(order => ({
      updatedAt: order.createdAt,
      ...order,
    })),
    customers: (raw.customers || base.customers).map(customer => ({ ...customer, email: customer.email || '' })),
    stock: raw.stock || base.stock,
    transactions: raw.transactions || base.transactions,
    cashRegister: raw.cashRegister || base.cashRegister,
    serviceRequests: raw.serviceRequests || [],
    auditLog: raw.auditLog || base.auditLog,
    settings: { ...base.settings, ...(raw.settings || {}) },
  };
}

function currentTenantId() {
  const session = sessionFromAuthorization();
  return session?.companyId || '__master__';
}

function isMasterSession() {
  const session = sessionFromAuthorization();
  return Boolean(session && session.role === 'Super Admin');
}

function tenantCollection(base: string, tenantId = currentTenantId()) {
  if (!tenantId || tenantId === '__master__') return base;
  return base + '__' + tenantId.replace(/[^a-z0-9_-]/gi, '_');
}

function customerTenantFromCode(code: string) {
  const decoded = decodeURIComponent(code);
  const separator = decoded.indexOf('~');
  if (separator <= 0) return '__master__';
  return decoded.slice(0, separator).replace(/[^a-z0-9_-]/gi, '_') || '__master__';
}

function customerTableCode(code: string) {
  const decoded = decodeURIComponent(code);
  const separator = decoded.indexOf('~');
  return separator > 0 ? decoded.slice(separator + 1) : decoded;
}

async function get(tenantId = currentTenantId()) {
  const collection = tenantCollection('mesa_state', tenantId);
  const result = await db.list<S>(collection, { limit: 1 });
  if (result.items.length) {
    const { id, ...record } = result.items[0];
    const raw = record as Partial<S>;
    const state = normalizeState(raw);
    if (shouldPersistRepairedTables(raw.tables, state.tables)) {
      const [ok] = await db.update(collection, [{ id, record: state as unknown as Record<string, unknown> }]);
      if (!ok) throw new Error('save');
    }
    return { id, state };
  }
  const state = seed();
  const [id] = await db.add(collection, [state as unknown as Record<string, unknown>]);
  if (!id) throw new Error('seed');
  return { id, state };
}

async function save(id: string, state: S, tenantId = currentTenantId()) {
  const [ok] = await db.update(tenantCollection('mesa_state', tenantId), [{ id, record: state as unknown as Record<string, unknown> }]);
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

function sessionFromAuthorization() {
  const headers = currentRequestHeaders();
  const authorization = headers.authorization || headers.Authorization || '';
  const token = String(authorization).replace(/^Bearer\s+/i, '').trim();
  if (!token || !token.includes('.')) return null;
  const [base, signature] = token.split('.');
  const expected = createHash('sha256').update(base + (process.env.AUTH_SECRET || 'tapfood-auth-secret')).digest('base64url');
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(base, 'base64url').toString('utf8')) as {
      name?: string;
      email?: string;
      role?: string;
      userId?: string;
      companyId?: string;
      companyName?: string;
      expiresAt?: string;
    };
    if (payload.expiresAt && Date.parse(payload.expiresAt) < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireMaster() {
  if (!isMasterSession()) return error('Acesso exclusivo do perfil Master', 403);
  return null;
}

function canManageCompany(companyId: string) {
  const session = sessionFromAuthorization();
  if (!session) return false;
  return session.role === 'Super Admin' || (session.companyId === companyId && session.role === 'Administrador');
}

function currentAuditUser() {
  const session = sessionFromAuthorization();
  if (!session) return 'Administrador';
  return session.name || session.email || 'Usuário autenticado';
}

function audit(state: S, entity: string, entityId: string, action: string, detail: string, user?: string) {
  state.auditLog.unshift({
    id: 'a' + Date.now() + Math.random().toString(36).slice(2, 6),
    entity,
    entityId,
    action,
    detail,
    user: user || currentAuditUser(),
    createdAt: new Date().toISOString(),
  });
  state.auditLog = state.auditLog.slice(0, 200);
}

function tableFromCode(state: S, code: string) {
  const normalized = customerTableCode(code).replace(/-/g, ' ').trim().toLowerCase();
  return state.tables.find(table => table.name.toLowerCase() === normalized);
}

function tableLoginPassword(tableName: string) {
  return 'mesa' + (tableName.match(/\d+/)?.[0] || '01').padStart(2, '0');
}

function signSession(payload: Record<string, unknown>) {
  const base = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHash('sha256').update(base + (process.env.AUTH_SECRET || 'tapfood-auth-secret')).digest('base64url');
  return base + '.' + signature;
}

function authSession(payload: { mode: 'empresa' | 'cliente'; name: string; role: string; email?: string; tableCode?: string; userId?: string; companyId?: string; companyName?: string }) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();
  const session = { ...payload, expiresAt };
  return { ...session, token: signSession(session) };
}

function hashPlatformPassword(password: string, salt: string) {
  return createHash('sha256').update(salt + ':' + password + ':' + (process.env.AUTH_SECRET || 'tapfood-auth-secret')).digest('hex');
}

function createPasswordCredentials(password: string) {
  const salt = randomBytes(16).toString('hex');
  return { passwordSalt: salt, passwordHash: hashPlatformPassword(password, salt) };
}

async function findPlatformUserByEmail(email: string) {
  const result = await db.list<PlatformUserRecord>('tapfood_platform_users', { limit: 1000 });
  return result.items.find(item => item.email.toLowerCase() === email.toLowerCase());
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


type IntegrationConfig = {
  providerId: string;
  enabled: boolean;
  status: 'Ativo' | 'Configurado' | 'Aguardando credenciais' | 'Inativo' | 'Erro';
  fields: Record<string, string>;
  updatedAt: string;
  message?: string;
};

type OpenApiKeyRecord = {
  companyId: string;
  name: string;
  prefix: string;
  keyHash: string;
  active: boolean;
  createdAt: string;
};

const integrationIds = [
  'n8n',
  'pix-auto', 'ifood', '99food', 'keeta', 'wallet-pay', 'pos', 'totem', 'zapturbo',
  'boletim', 'kds', 'driver-app', 'foody-delivery', 'meta-capi', 'custom-domain',
  'google-analytics', 'google-tag-manager', 'facebook-pixel', 'open-api',
];

const externalCredentialIntegrations = new Set([
  'pix-auto', 'ifood', '99food', 'keeta', 'wallet-pay', 'pos', 'zapturbo',
  'boletim', 'driver-app', 'foody-delivery', 'meta-capi',
]);

const sanitizeIntegrationFields = (raw: unknown) => {
  const input = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (/(secret|token|password|api.?key|authorization)/i.test(key)) continue;
    output[key] = String(value ?? '').trim().slice(0, 300);
  }
  return output;
};

async function listIntegrationConfigs(tenantId = currentTenantId()) {
  const result = await db.list<IntegrationConfig>(tenantCollection('mesa_integrations', tenantId), { limit: 50 });
  const map = new Map(result.items.map(item => [item.providerId, item]));
  const current = await get(tenantId);

  return integrationIds.map(providerId => {
    const item = map.get(providerId);

    if (!item && providerId === 'kds' && current.state.settings.kdsEnabled) {
      return {
        id: providerId,
        enabled: true,
        status: 'Ativo' as const,
        fields: {},
        updatedAt: current.state.cashRegister.openedAt,
        message: 'KDS nativo ativo pela configuração operacional do estabelecimento.',
      };
    }

    if (!item && providerId === 'totem' && current.state.settings.selfServiceEnabled) {
      return {
        id: providerId,
        enabled: true,
        status: 'Ativo' as const,
        fields: {},
        updatedAt: current.state.cashRegister.openedAt,
        message: 'Totem nativo ativo pela configuração operacional do estabelecimento.',
      };
    }

    return {
      id: providerId,
      enabled: item?.enabled ?? false,
      status: item?.status ?? 'Inativo',
      fields: item?.fields ?? {},
      updatedAt: item?.updatedAt,
      message: item?.message,
    };
  });
}

async function saveIntegrationConfig(providerId: string, patch: Partial<IntegrationConfig>, tenantId = currentTenantId()) {
  const result = await db.list<IntegrationConfig>(tenantCollection('mesa_integrations', tenantId), { limit: 50 });
  const existing = result.items.find(item => item.providerId === providerId);
  const record: IntegrationConfig = {
    providerId,
    enabled: patch.enabled ?? existing?.enabled ?? false,
    status: patch.status ?? existing?.status ?? 'Configurado',
    fields: patch.fields ?? existing?.fields ?? {},
    updatedAt: new Date().toISOString(),
    message: patch.message ?? existing?.message,
  };
  if (existing) {
    const [ok] = await db.update(tenantCollection('mesa_integrations', tenantId), [{ id: existing.id, record: record as unknown as Record<string, unknown> }]);
    if (!ok) throw new Error('integration update failed');
  } else {
    const [id] = await db.add(tenantCollection('mesa_integrations', tenantId), [record as unknown as Record<string, unknown>]);
    if (!id) throw new Error('integration create failed');
  }
  return { id: providerId, ...record };
}

const hashApiKey = (key: string) => createHash('sha256').update(key).digest('hex');

async function validateOpenApiKey(event: any) {
  const headers = event?.headers || {};
  const raw = headers['x-api-key'] || headers['X-Api-Key'] || headers['X-API-KEY'];
  if (!raw || typeof raw !== 'string') return null;
  const hash = hashApiKey(raw);
  const result = await db.list<OpenApiKeyRecord>('mesa_open_api_keys', { limit: 1000 });
  return result.items.find(item => item.active && item.keyHash === hash) || null;
}

function validateIntegration(providerId: string, fields: Record<string, string>) {
  if (providerId === 'n8n') return /^https?:\/\/.+/i.test(fields.webhookUrl || '') ? 'active' : 'invalid';
  if (providerId === 'google-analytics') return /^G-[A-Z0-9]+$/i.test(fields.measurementId || '') ? 'active' : 'invalid';
  if (providerId === 'google-tag-manager') return /^GTM-[A-Z0-9]+$/i.test(fields.containerId || '') ? 'active' : 'invalid';
  if (providerId === 'facebook-pixel') return /^\d{8,25}$/.test(fields.pixelId || '') ? 'active' : 'invalid';
  if (providerId === 'custom-domain') return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(fields.domain || '') ? 'active' : 'invalid';
  if (providerId === 'totem' || providerId === 'kds') return 'active';
  if (externalCredentialIntegrations.has(providerId)) return Object.values(fields).some(Boolean) ? 'credentials' : 'invalid';
  return 'configured';
}

async function notifyN8n(state: S, event: string, payload: Record<string, unknown>, tenantId = currentTenantId()) {
  try {
    const integrations = await listIntegrationConfigs(tenantId);
    const n8n = integrations.find(item => item.id === 'n8n');
    const webhookUrl = n8n?.fields?.webhookUrl;
    if (!n8n?.enabled || !webhookUrl || n8n.status === 'Erro') return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'TAPFOOD',
          event,
          occurredAt: new Date().toISOString(),
          store: {
            restaurantName: state.settings.restaurantName,
            unit: state.settings.unit,
          },
          payload,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    console.error('n8n notification failed', err);
  }
}

const allowedOrderStatuses = new Set(['Novo', 'Preparando', 'Pronto', 'Entregue', 'Finalizado', 'Cancelado']);
const allowedTableStatuses = new Set<T['status']>(tableStatusValues);
const allowedOrderChannels = new Set(['Mesa', 'Balcão', 'Delivery', 'QR/Totem', 'API']);

function validateOrderItems(state: S, rawItems: Array<Partial<I>>) {
  const items: I[] = [];
  const totals = new Map<string, number>();

  for (const raw of rawItems) {
    const productId = String(raw.productId || '');
    const qty = Number(raw.qty);
    if (!productId || !Number.isInteger(qty) || qty <= 0 || qty > 99) {
      return { error: 'Produto/quantidade inválido' as const };
    }

    const product = state.products.find(item => item.id === productId && item.active);
    if (!product) return { error: 'Produto indisponível' as const };

    const accumulated = (totals.get(productId) || 0) + qty;
    if (accumulated > product.stock) return { error: 'Estoque insuficiente para ' + product.name as string };
    totals.set(productId, accumulated);

    items.push({
      productId: product.id,
      name: product.name,
      qty,
      price: product.price,
    });
  }

  return { items };
}

function applyOrderEffects(state: S, order: O) {
  state.orders.unshift(order);

  for (const item of order.items) {
    const product = state.products.find(candidate => candidate.id === item.productId);
    if (product) product.stock = Math.max(0, product.stock - item.qty);
  }

  state.transactions.unshift({
    id: 'f' + Date.now(),
    description: 'Venda ' + order.code,
    type: 'Entrada',
    amount: order.total,
    date: 'Hoje',
    category: 'Vendas',
    createdAt: order.createdAt,
  });

  if (order.table) {
    const table = state.tables.find(item => item.name === order.table);
    if (table) {
      table.status = 'Ocupada';
      table.total = Number((table.total + order.total).toFixed(2));
    }
  }

  const customerName = order.customer?.trim();
  if (customerName && customerName.toLowerCase() !== 'cliente balcão') {
    const customer = state.customers.find(item => item.name.trim().toLowerCase() === customerName.toLowerCase());
    if (customer) {
      customer.orders += 1;
      customer.totalSpent = Number((customer.totalSpent + order.total).toFixed(2));
      customer.lastOrder = 'Hoje';
    }
  }

  audit(state, 'order', order.id, 'Pedido criado', order.code + ' · ' + order.channel + (order.table ? ' · ' + order.table : ''));
}

function validateImagePayload(value: { content?: string; contentType?: string }) {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  if (!value.content || !value.contentType || !extensions[value.contentType]) {
    return { error: 'Imagem inválida. Use JPG, PNG ou WebP.' as const };
  }
  if (value.content.length > 7_000_000) {
    return { error: 'Imagem excede o limite permitido.' as const };
  }
  return { extension: extensions[value.contentType] };
}

function transactionTimestamp(state: S, tx: Tx) {
  if (tx.createdAt) {
    const parsed = Date.parse(tx.createdAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (tx.category === 'Vendas' && tx.description.startsWith('Venda ')) {
    const code = tx.description.slice(6).trim();
    const order = state.orders.find(item => item.code === code);
    if (order) return Date.parse(order.createdAt);
  }
  return 0;
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({
    message: 'Success',
    service: 'TAPFOOD Backend',
    version: '2026.09.20',
    modules: ['auth', 'state', 'orders', 'tables', 'cash', 'catalog', 'stock', 'finance', 'customer', 'companies', 'users', 'audit', 'integrations', 'n8n', 'printers', 'open-api', 'qa', 'support'],
  })],

  'POST /api/auth/login': [async ({ body }) => {
    const value = body as { mode?: 'empresa' | 'cliente'; email?: string; password?: string; table?: string };
    const password = String(value.password || '').trim();

    if (value.mode === 'cliente') {
      const tableCode = value.table || 'Mesa 01';
      const tenantId = customerTenantFromCode(tableCode);
      const current = await get(tenantId);
      const table = tableFromCode(current.state, tableCode);
      if (!table) return error('Mesa não encontrada', 404);
      if (password.toLowerCase() !== tableLoginPassword(table.name)) return error('Senha da mesa inválida', 401);
      return json(authSession({
        mode: 'cliente',
        name: table.name,
        role: 'Cliente',
        tableCode,
        companyId: tenantId === '__master__' ? undefined : tenantId,
      }));
    }

    const email = String(value.email || '').trim().toLowerCase();
    const platformUser = email ? await findPlatformUserByEmail(email) : undefined;
    if (platformUser) {
      if (platformUser.status !== 'Ativo') return error('Usuário inativo', 403);
      if (hashPlatformPassword(password, platformUser.passwordSalt) !== platformUser.passwordHash) return error('Credenciais inválidas', 401);
      const companies = await db.list<CompanyRecord>('tapfood_companies', { limit: 500 });
      const company = companies.items.find(item => item.id === platformUser.companyId);
      if (!company) return error('Empresa vinculada não encontrada', 403);
      if (company.status === 'Inativa') return error('Acesso da empresa está inativo', 403);
      return json(authSession({
        mode: 'empresa',
        name: platformUser.name,
        role: platformUser.role,
        email: platformUser.email,
        userId: platformUser.id,
        companyId: company.id,
        companyName: company.name,
      }));
    }

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@tapfood.com.br').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'TapFood@2026';
    if (email !== adminEmail || password !== adminPassword) {
      return error('Credenciais inválidas', 401);
    }

    return json(authSession({
      mode: 'empresa',
      name: 'Administrador TAPFOOD',
      role: 'Super Admin',
      email: adminEmail,
      companyName: 'TAPFOOD',
    }));
  }],

  'GET /api/platform-users': [async () => {
    const session = sessionFromAuthorization();
    if (!session) return error('Não autenticado', 401);
    const users = await db.list<PlatformUserRecord>('tapfood_platform_users', { limit: 1000 });
    const companies = await db.list<CompanyRecord>('tapfood_companies', { limit: 500 });
    const companyMap = new Map(companies.items.map(item => [item.id, item.name]));
    const visibleUsers = session.role === 'Super Admin' ? users.items : users.items.filter(user => user.companyId === session.companyId);
    return json(visibleUsers
      .map(({ passwordHash, passwordSalt, ...user }) => ({ ...user, companyName: companyMap.get(user.companyId) || 'Empresa não encontrada' }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
  }],

  'POST /api/platform-users': [async ({ body }) => {
    const value = body as Partial<PlatformUserRecord> & { password?: string };
    const name = String(value.name || '').trim();
    const email = String(value.email || '').trim().toLowerCase();
    const password = String(value.password || '');
    const session = sessionFromAuthorization();
    if (!session) return error('Não autenticado', 401);
    const requestedCompanyId = String(value.companyId || '');
    const companyId = session.role === 'Super Admin' ? requestedCompanyId : String(session.companyId || '');
    if (!canManageCompany(companyId)) return error('Sem permissão para esta empresa', 403);
    if (!name || !email || !companyId) return error('Nome, e-mail e empresa são obrigatórios', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('E-mail inválido', 400);
    if (password.length < 6) return error('A senha deve ter no mínimo 6 caracteres', 400);
    const companies = await db.list<CompanyRecord>('tapfood_companies', { limit: 500 });
    if (!companies.items.some(item => item.id === companyId)) return error('Empresa não encontrada', 404);
    if (await findPlatformUserByEmail(email)) return error('Já existe um usuário com este e-mail', 409);
    const credentials = createPasswordCredentials(password);
    const now = new Date().toISOString();
    const ids = await db.add('tapfood_platform_users', [{
      companyId,
      name: name.slice(0, 120),
      email: email.slice(0, 160),
      role: ['Administrador', 'Gestor', 'Operador'].includes(String(value.role)) ? value.role : 'Operador',
      status: value.status === 'Inativo' ? 'Inativo' : 'Ativo',
      ...credentials,
      createdAt: now,
      updatedAt: now,
    }]);
    return json({ id: ids[0], companyId, name, email, role: value.role || 'Operador', status: value.status || 'Ativo', createdAt: now, updatedAt: now }, 201);
  }],

  'PUT /api/platform-users/:id': [async ({ params, body }) => {
    const value = body as Partial<PlatformUserRecord> & { password?: string };
    const result = await db.list<PlatformUserRecord>('tapfood_platform_users', { limit: 1000 });
    const current = result.items.find(item => item.id === params.id);
    if (!current) return error('Usuário não encontrado', 404);
    if (!canManageCompany(current.companyId)) return error('Sem permissão para este usuário', 403);
    const email = String(value.email ?? current.email).trim().toLowerCase();
    const name = String(value.name ?? current.name).trim();
    const session = sessionFromAuthorization();
    const companyId = session?.role === 'Super Admin' ? String(value.companyId ?? current.companyId) : current.companyId;
    if (!name || !email || !companyId) return error('Nome, e-mail e empresa são obrigatórios', 400);
    const duplicate = result.items.find(item => item.id !== current.id && item.email.toLowerCase() === email);
    if (duplicate) return error('Já existe outro usuário com este e-mail', 409);
    let passwordSalt = current.passwordSalt;
    let passwordHash = current.passwordHash;
    if (value.password) {
      if (String(value.password).length < 6) return error('A senha deve ter no mínimo 6 caracteres', 400);
      const credentials = createPasswordCredentials(String(value.password));
      passwordSalt = credentials.passwordSalt;
      passwordHash = credentials.passwordHash;
    }
    const next = {
      companyId,
      name: name.slice(0, 120),
      email: email.slice(0, 160),
      role: ['Administrador', 'Gestor', 'Operador'].includes(String(value.role ?? current.role)) ? (value.role ?? current.role) : current.role,
      status: value.status === 'Inativo' ? 'Inativo' : 'Ativo',
      passwordSalt,
      passwordHash,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await db.update('tapfood_platform_users', [{ id: current.id, record: next }]);
    return json({ id: current.id, ...next, passwordSalt: undefined, passwordHash: undefined });
  }],

  'DELETE /api/platform-users/:id': [async ({ params }) => {
    const result = await db.list<PlatformUserRecord>('tapfood_platform_users', { limit: 1000 });
    const target = result.items.find(item => item.id === params.id);
    if (!target || !canManageCompany(target.companyId)) return error('Usuário não encontrado ou sem permissão', 404);
    const [deleted] = await db.delete('tapfood_platform_users', [params.id]);
    if (!deleted) return error('Usuário não encontrado', 404);
    return json({ success: true });
  }],

  'GET /api/companies': [async () => {
    const session = sessionFromAuthorization();
    if (!session) return error('Não autenticado', 401);
    const result = await db.list<CompanyRecord>('tapfood_companies', { limit: 500 });
    const visible = session.role === 'Super Admin' ? result.items : result.items.filter(item => item.id === session.companyId);
    return json(visible.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
  }],

  'POST /api/companies': [async ({ body }) => {
    const denied = requireMaster(); if (denied) return denied;
    const value = body as Partial<CompanyRecord>;
    const name = String(value.name || '').trim();
    const email = String(value.email || '').trim().toLowerCase();
    const phone = String(value.phone || '').replace(/\D/g, '');
    if (!name) return error('Nome da empresa é obrigatório', 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('E-mail inválido', 400);
    if (phone && (phone.length < 10 || phone.length > 13)) return error('Telefone inválido', 400);
    const now = new Date().toISOString();
    const ids = await db.add('tapfood_companies', [{
      name: name.slice(0, 160),
      document: String(value.document || '').trim().slice(0, 30),
      email: email.slice(0, 160),
      phone,
      contactName: String(value.contactName || '').trim().slice(0, 120),
      plan: String(value.plan || '').trim().slice(0, 80),
      status: ['Ativa', 'Inativa', 'Teste'].includes(String(value.status)) ? value.status : 'Ativa',
      createdAt: now,
      updatedAt: now,
    }]);
    const result = await db.list<CompanyRecord>('tapfood_companies', { limit: 500 });
    const created = result.items.find(item => item.id === ids[0]);
    return json(created, 201);
  }],

  'PUT /api/companies/:id': [async ({ params, body }) => {
    const denied = requireMaster(); if (denied) return denied;
    const value = body as Partial<CompanyRecord>;
    const result = await db.list<CompanyRecord>('tapfood_companies', { limit: 500 });
    const current = result.items.find(item => item.id === params.id);
    if (!current) return error('Empresa não encontrada', 404);
    const name = String(value.name ?? current.name).trim();
    const email = String(value.email ?? current.email ?? '').trim().toLowerCase();
    const phone = String(value.phone ?? current.phone ?? '').replace(/\D/g, '');
    if (!name) return error('Nome da empresa é obrigatório', 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('E-mail inválido', 400);
    if (phone && (phone.length < 10 || phone.length > 13)) return error('Telefone inválido', 400);
    const next: Omit<CompanyRecord, 'id'> = {
      name: name.slice(0, 160),
      document: String(value.document ?? current.document ?? '').trim().slice(0, 30),
      email: email.slice(0, 160),
      phone,
      contactName: String(value.contactName ?? current.contactName ?? '').trim().slice(0, 120),
      plan: String(value.plan ?? current.plan ?? '').trim().slice(0, 80),
      status: ['Ativa', 'Inativa', 'Teste'].includes(String(value.status ?? current.status)) ? (value.status ?? current.status) as CompanyRecord['status'] : current.status,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await db.update('tapfood_companies', [{ id: params.id, record: next }]);
    return json({ id: params.id, ...next });
  }],

  'DELETE /api/companies/:id': [async ({ params }) => {
    const denied = requireMaster(); if (denied) return denied;
    const [deleted] = await db.delete('tapfood_companies', [params.id]);
    if (!deleted) return error('Empresa não encontrada', 404);
    return json({ success: true });
  }],

  'GET /api/integrations': [async () => json(await listIntegrationConfigs())],

  'PUT /api/integrations/:id': [async ({ params, body }) => {
    if (!integrationIds.includes(params.id)) return error('Integração desconhecida', 404);
    const value = body as { fields?: Record<string, unknown> };
    const fields = sanitizeIntegrationFields(value.fields);
    const saved = await saveIntegrationConfig(params.id, {
      fields,
      enabled: false,
      status: 'Configurado',
      message: 'Configuração salva. Use Testar conexão para validar o conector.',
    });
    return json(saved);
  }],

  'POST /api/integrations/:id/test': [async ({ params }) => {
    if (!integrationIds.includes(params.id)) return error('Integração desconhecida', 404);
    const all = await listIntegrationConfigs();
    const current = all.find(item => item.id === params.id);
    const fields = current?.fields || {};

    if (params.id === 'open-api') {
      const tenantId = currentTenantId();
      const keys = await db.list<OpenApiKeyRecord>('mesa_open_api_keys', { limit: 1000 });
      const active = keys.items.some(item => item.active && (item.companyId || '__master__') === tenantId);
      const saved = await saveIntegrationConfig(params.id, {
        fields,
        enabled: active,
        status: active ? 'Ativo' : 'Inativo',
        message: active ? 'API aberta ativa com chave válida.' : 'Crie uma chave para ativar a API aberta.',
      });
      return json(saved);
    }

    const result = validateIntegration(params.id, fields);
    if (result === 'invalid') {
      const saved = await saveIntegrationConfig(params.id, {
        fields,
        enabled: false,
        status: 'Erro',
        message: 'Revise os campos obrigatórios antes de ativar.',
      });
      return json(saved);
    }

    if (result === 'credentials') {
      const saved = await saveIntegrationConfig(params.id, {
        fields,
        enabled: false,
        status: 'Aguardando credenciais',
        message: 'Configuração local validada. Falta a autorização/credencial oficial do provedor para ativar a conexão real.',
      });
      return json(saved);
    }

    const saved = await saveIntegrationConfig(params.id, {
      fields,
      enabled: true,
      status: 'Ativo',
      message: result === 'active' ? 'Configuração validada e ativa no sistema.' : 'Configuração validada.',
    });

    if (params.id === 'totem' || params.id === 'kds') {
      const currentState = await get();
      if (params.id === 'totem') currentState.state.settings.selfServiceEnabled = true;
      if (params.id === 'kds') currentState.state.settings.kdsEnabled = true;
      await save(currentState.id, currentState.state);
    }

    return json(saved);
  }],

  'GET /api/open/v1/keys': [async () => {
    const tenantId = currentTenantId();
    const result = await db.list<OpenApiKeyRecord>('mesa_open_api_keys', { limit: 1000 });
    return json(result.items.filter(item => (item.companyId || '__master__') === tenantId).map(item => ({
      id: item.id,
      name: item.name,
      prefix: item.prefix,
      active: item.active,
      createdAt: item.createdAt,
    })));
  }],

  'POST /api/open/v1/keys': [async ({ body }) => {
    const value = body as { name?: string };
    const name = value.name?.trim();
    if (!name) return error('Nome da chave é obrigatório', 400);
    const key = 'mrf_live_' + randomBytes(24).toString('hex');
    const prefix = key.slice(0, 16);
    const record: OpenApiKeyRecord = {
      companyId: currentTenantId(),
      name: name.slice(0, 80),
      prefix,
      keyHash: hashApiKey(key),
      active: true,
      createdAt: new Date().toISOString(),
    };
    const [id] = await db.add('mesa_open_api_keys', [record as unknown as Record<string, unknown>]);
    if (!id) return error('Falha ao gerar chave', 500);
    await saveIntegrationConfig('open-api', {
      enabled: true,
      status: 'Ativo',
      fields: {},
      message: 'API aberta ativa com chave válida.',
    });
    return json({ id, key, prefix, createdAt: record.createdAt }, 201);
  }],

  'DELETE /api/open/v1/keys/:id': [async ({ params }) => {
    const tenantId = currentTenantId();
    const result = await db.list<OpenApiKeyRecord>('mesa_open_api_keys', { limit: 1000 });
    const key = result.items.find(item => item.id === params.id && (item.companyId || '__master__') === tenantId);
    if (!key) return error('Chave não encontrada', 404);
    const [ok] = await db.delete('mesa_open_api_keys', [params.id]);
    if (!ok) return error('Chave não encontrada', 404);
    return json({ revoked: true });
  }],

  'GET /api/open/v1/health': [async () => json({ status: 'ok', service: 'TAPFOOD Open API', version: 'v1' })],

  'GET /api/open/v1/menu': [async ({ event }) => {
    const apiKey = await validateOpenApiKey(event);
    if (!apiKey) return error('API key inválida', 401);
    const current = await get(apiKey.companyId || '__master__');
    return json(current.state.products.filter(product => product.active).map(product => ({
      id: product.id,
      sku: product.code || product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      stock: product.stock,
      description: product.description || '',
      prepTime: product.prepTime || 15,
      channels: product.channels || [],
    })));
  }],

  'GET /api/open/v1/tables': [async ({ event }) => {
    const apiKey = await validateOpenApiKey(event);
    if (!apiKey) return error('API key inválida', 401);
    const current = await get(apiKey.companyId || '__master__');
    return json(current.state.tables);
  }],

  'GET /api/open/v1/orders': [async ({ event }) => {
    const apiKey = await validateOpenApiKey(event);
    if (!apiKey) return error('API key inválida', 401);
    const current = await get(apiKey.companyId || '__master__');
    return json(current.state.orders.slice(0, 100));
  }],

  'POST /api/open/v1/orders': [async ({ event, body }) => {
    const apiKey = await validateOpenApiKey(event);
    if (!apiKey) return error('API key inválida', 401);
    const value = body as { channel?: string; table?: string; customer?: string; paymentMethod?: string; items?: Array<Partial<I>> };
    if (!value.items?.length) return error('Pedido sem itens', 400);
    const current = await get(apiKey.companyId || '__master__');
    const validated = validateOrderItems(current.state, value.items);
    if ('error' in validated) return error(String(validated.error), 400);

    const channel = value.channel || 'API';
    if (!allowedOrderChannels.has(channel)) return error('Canal inválido', 400);
    if (value.table && !current.state.tables.some(item => item.name === value.table)) return error('Mesa inválida', 400);

    const subtotal = Number(validated.items.reduce((sum, item) => sum + item.price * item.qty, 0).toFixed(2));
    const fee = channel === 'Mesa' && current.state.settings.automaticServiceFee ? subtotal * (current.state.settings.serviceFee / 100) : 0;
    const total = Number((subtotal + fee).toFixed(2));
    const createdAt = new Date().toISOString();
    const order: O = {
      id: 'api-o' + Date.now(),
      code: '#API' + String(Date.now()).slice(-6),
      channel,
      table: value.table,
      customer: value.customer?.trim().slice(0, 120) || 'Integração API',
      items: validated.items,
      total,
      status: 'Novo',
      createdAt,
      updatedAt: createdAt,
      paymentMethod: value.paymentMethod?.trim().slice(0, 60) || 'Externo',
    };
    applyOrderEffects(current.state, order);
    audit(current.state, 'order', order.id, 'Pedido recebido pela API aberta', order.code + ' · ' + order.channel);
    await save(current.id, current.state, apiKey.companyId || '__master__');
    await notifyN8n(current.state, 'order.created_from_api', { order }, apiKey.companyId || '__master__');
    return json(order, 201);
  }],

  'POST /api/qa/run': [async ({ body }) => {
    const value = body as { scope?: 'quick' | 'operation' | 'integrations' | 'customer' | 'api' | 'full' };
    const scope = value.scope || 'quick';
    const allowedScopes = new Set(['quick', 'operation', 'integrations', 'customer', 'api', 'full']);
    if (!allowedScopes.has(scope)) return error('Escopo de teste inválido', 400);

    const current = await get();
    const state = current.state;
    const integrations = await listIntegrationConfigs();
    const tenantId = currentTenantId();
    const allApiKeys = await db.list<OpenApiKeyRecord>('mesa_open_api_keys', { limit: 1000 });
    const apiKeys = { items: allApiKeys.items.filter(item => (item.companyId || '__master__') === tenantId) };

    type QaStatus = 'pass' | 'warn' | 'fail';
    type QaCheck = { id: string; module: string; status: QaStatus; title: string; detail: string };
    const checks: QaCheck[] = [];
    const add = (id: string, module: string, status: QaStatus, title: string, detail: string) => checks.push({ id, module, status, title, detail });
    const wants = (...areas: string[]) => scope === 'full' || scope === 'quick' || areas.includes(scope);

    if (wants('operation')) {
      add(
        'state-core',
        'Sistema',
        state.products.length > 0 && state.tables.length > 0 ? 'pass' : 'fail',
        'Estrutura operacional carregada',
        state.products.length > 0 && state.tables.length > 0
          ? state.products.length + ' produto(s) e ' + state.tables.length + ' mesa(s) disponíveis.'
          : 'Produtos ou mesas não foram encontrados no estado do sistema.'
      );

      const invalidOrders = state.orders.filter(order =>
        !order.id ||
        !order.createdAt ||
        !Array.isArray(order.items) ||
        order.items.length === 0 ||
        order.total < 0 ||
        order.items.some(item => !item.productId || item.qty <= 0 || item.price < 0)
      );
      add(
        'orders-integrity',
        'Pedidos / PDV',
        invalidOrders.length === 0 ? 'pass' : 'fail',
        'Integridade dos pedidos',
        invalidOrders.length === 0
          ? state.orders.length + ' pedido(s) com estrutura válida.'
          : invalidOrders.length + ' pedido(s) possuem item, valor ou data inválidos.'
      );

      const missingProducts = state.orders.flatMap(order => order.items).filter(item => !state.products.some(product => product.id === item.productId));
      add(
        'order-products',
        'Pedidos / Cardápio',
        missingProducts.length === 0 ? 'pass' : 'warn',
        'Referência dos produtos nos pedidos',
        missingProducts.length === 0
          ? 'Todos os itens dos pedidos possuem produto correspondente.'
          : missingProducts.length + ' item(ns) históricos apontam para produto que não está mais cadastrado.'
      );

      const occupiedWithoutOrder = state.tables.filter(table =>
        table.status !== 'Livre' &&
        !state.orders.some(order => order.table === table.name && !['Entregue', 'Finalizado', 'Cancelado'].includes(order.status))
      );
      add(
        'tables-consistency',
        'Mesas',
        occupiedWithoutOrder.length === 0 ? 'pass' : 'warn',
        'Consistência das mesas ocupadas',
        occupiedWithoutOrder.length === 0
          ? 'Mesas ocupadas possuem operação ativa coerente.'
          : occupiedWithoutOrder.length + ' mesa(s) estão marcadas como ocupadas sem pedido ativo.'
      );

      const invalidRequests = state.serviceRequests.filter(request => !state.tables.some(table => table.name === request.table));
      add(
        'waiter-alerts',
        'Atendimento',
        invalidRequests.length === 0 ? 'pass' : 'fail',
        'Alertas de garçom e conta',
        invalidRequests.length === 0
          ? state.serviceRequests.filter(request => request.status === 'pending').length + ' solicitação(ões) pendente(s), todas ligadas a mesas válidas.'
          : invalidRequests.length + ' solicitação(ões) apontam para mesa inexistente.'
      );

      const validCash = ['Aberto', 'Fechado'].includes(state.cashRegister.status) && state.cashRegister.openingAmount >= 0;
      add(
        'cash-register',
        'Caixa',
        validCash ? 'pass' : 'fail',
        'Estado do caixa',
        validCash
          ? 'Caixa ' + state.cashRegister.status.toLowerCase() + ' com abertura de R$ ' + state.cashRegister.openingAmount.toFixed(2) + '.'
          : 'O caixa possui status ou valor de abertura inválido.'
      );

      const invalidKds = state.orders.filter(order => !['Novo', 'Preparando', 'Pronto', 'Entregue', 'Finalizado', 'Cancelado'].includes(order.status));
      add(
        'kds-status',
        'Cozinha / KDS',
        invalidKds.length === 0 ? 'pass' : 'fail',
        'Status do KDS',
        invalidKds.length === 0 ? 'Todos os pedidos usam status reconhecidos pelo KDS.' : invalidKds.length + ' pedido(s) possuem status desconhecido.'
      );

      const invalidProducts = state.products.filter(product => !product.name.trim() || product.price <= 0 || product.stock < 0);
      const productsWithoutImage = state.products.filter(product => product.active && !product.imageUrl && !product.imagePath);
      add(
        'catalog-products',
        'Produtos / Cardápio',
        invalidProducts.length > 0 ? 'fail' : productsWithoutImage.length > 0 ? 'warn' : 'pass',
        'Cadastro dos produtos',
        invalidProducts.length > 0
          ? invalidProducts.length + ' produto(s) possuem nome, preço ou estoque inválido.'
          : productsWithoutImage.length > 0
            ? productsWithoutImage.length + ' produto(s) ativo(s) ainda não possuem foto própria/configurada.'
            : 'Produtos ativos possuem dados principais e imagens configuradas.'
      );

      const invalidStock = state.stock.filter(item => item.current < 0 || item.minimum < 0 || item.cost < 0);
      const lowStock = state.stock.filter(item => item.current <= item.minimum);
      add(
        'stock-health',
        'Estoque',
        invalidStock.length > 0 ? 'fail' : lowStock.length > 0 ? 'warn' : 'pass',
        'Saúde do estoque',
        invalidStock.length > 0
          ? invalidStock.length + ' item(ns) possuem valores negativos.'
          : lowStock.length > 0
            ? lowStock.length + ' item(ns) estão no mínimo ou abaixo do mínimo.'
            : 'Nenhum item está abaixo do estoque mínimo.'
      );

      const printersConfigured = [state.settings.kitchenPrinter, state.settings.counterPrinter, state.settings.barPrinter].every(item => String(item || '').trim());
      add(
        'printer-config',
        'Impressoras',
        printersConfigured && state.settings.printCopies >= 1 ? 'pass' : 'warn',
        'Configuração de impressão',
        printersConfigured
          ? 'Setores de cozinha, balcão e bar estão configurados com ' + state.settings.printCopies + ' cópia(s).'
          : 'Informe as impressoras/setores antes de ativar impressão automática.'
      );

      const invalidTransactions = state.transactions.filter(tx => tx.amount <= 0 || !['Entrada', 'Saída'].includes(tx.type));
      add(
        'finance-integrity',
        'Financeiro',
        invalidTransactions.length === 0 ? 'pass' : 'fail',
        'Movimentações financeiras',
        invalidTransactions.length === 0
          ? state.transactions.length + ' movimentação(ões) com tipo e valor válidos.'
          : invalidTransactions.length + ' movimentação(ões) possuem tipo ou valor inválido.'
      );
    }

    if (scope === 'customer' || scope === 'full' || scope === 'quick') {
      const tableOrdersInvalid = state.orders.filter(order => order.table && !state.tables.some(table => table.name === order.table));
      const customerRequestsInvalid = state.serviceRequests.filter(request => !state.tables.some(table => table.name === request.table));
      add(
        'customer-table-links',
        'Modo Cliente',
        tableOrdersInvalid.length === 0 && customerRequestsInvalid.length === 0 ? 'pass' : 'fail',
        'Vínculo cliente ↔ mesa',
        tableOrdersInvalid.length === 0 && customerRequestsInvalid.length === 0
          ? 'Pedidos e solicitações do cliente apontam para mesas válidas.'
          : 'Foram encontrados pedidos ou solicitações vinculados a mesas inexistentes.'
      );

      const activeTableOrders = state.orders.filter(order => order.table && !['Entregue', 'Finalizado', 'Cancelado'].includes(order.status));
      add(
        'customer-status-flow',
        'Modo Cliente',
        'pass',
        'Acompanhamento de pedidos',
        activeTableOrders.length + ' pedido(s) de mesa podem ser acompanhados pelo portal do cliente.'
      );
    }

    if (scope === 'integrations' || scope === 'full' || scope === 'quick') {
      const configured = integrations.filter(item => item.status !== 'Inativo');
      const errors = integrations.filter(item => item.status === 'Erro');
      const pending = integrations.filter(item => item.status === 'Aguardando credenciais');

      add(
        'integration-config',
        'Integrações',
        errors.length > 0 ? 'fail' : 'pass',
        'Backend de integrações',
        errors.length > 0
          ? errors.length + ' integração(ões) estão com erro de configuração.'
          : configured.length > 0
            ? configured.length + ' integração(ões) possuem configuração registrada e o catálogo está operacional.'
            : 'Catálogo e persistência de integrações estão operacionais. Nenhum conector externo opcional foi configurado ainda.'
      );

      add(
        'integration-credentials',
        'Integrações',
        pending.length > 0 ? 'warn' : 'pass',
        'Credenciais de parceiros',
        pending.length > 0
          ? pending.length + ' conector(es) aguardam credenciais/autorização oficial do provedor.'
          : 'Nenhum conector está pendente por credencial oficial.'
      );

      const kds = integrations.find(item => item.id === 'kds');
      const totem = integrations.find(item => item.id === 'totem');
      add(
        'native-modules',
        'Integrações Nativas',
        state.settings.kdsEnabled && kds?.status === 'Ativo' ? 'pass' : 'warn',
        'KDS e Totem',
        'KDS: ' + (state.settings.kdsEnabled ? 'ativo' : 'inativo') + ' (' + (kds?.status || 'Inativo') + ') · Totem: ' + (state.settings.selfServiceEnabled ? 'ativo' : 'opcional/inativo') + ' (' + (totem?.status || 'Inativo') + ').'
      );
    }

    if (scope === 'api' || scope === 'full' || scope === 'quick') {
      const activeKeys = apiKeys.items.filter(item => item.active);
      add(
        'open-api-keys',
        'API Aberta',
        'pass',
        'Proteção por chaves',
        activeKeys.length > 0
          ? activeKeys.length + ' chave(s) ativa(s) para integração externa.'
          : 'Backend da API aberta está pronto e protegido. Ainda não foi emitida uma chave para consumidor externo.'
      );

      const openApiIntegration = integrations.find(item => item.id === 'open-api');
      add(
        'open-api-config',
        'API Aberta',
        'pass',
        'Estado da API aberta',
        activeKeys.length > 0 && openApiIntegration?.status === 'Ativo'
          ? 'API aberta ativa com credencial disponível.'
          : 'Endpoints e validação da API aberta estão implementados. A emissão de chave é opcional e feita em Ajustes > API Aberta quando houver um consumidor externo.'
      );
    }

    const summary = checks.reduce((acc, check) => {
      acc[check.status] += 1;
      acc.total += 1;
      return acc;
    }, { pass: 0, warn: 0, fail: 0, total: 0 });

    return json({
      scope,
      generatedAt: new Date().toISOString(),
      summary,
      checks,
    });
  }],

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
      ? `Você é a Central TAPFOOD do Modo Cliente. Responda em português do Brasil, de forma curta, clara e acolhedora. Nunca invente status, preço, prazo ou ação que não esteja no contexto. Não execute ações. Sua função é explicar como usar a interface do cliente. Regras e recursos permitidos:\n${customerGuide}\nMesa atual: ${value.table || 'não informada'}.`
      : `Você é a Central TAPFOOD operacional. Responda em português do Brasil, com instruções práticas, curtas e passo a passo. Ajude o estabelecimento a usar o sistema sem inventar recursos que não existem e sem afirmar que executou ações. Quando for útil, indique o nome exato do módulo. Recursos atuais:\n${establishmentGuide}\nTela atual: ${value.page || 'não informada'}.`;

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
    const tenantId = customerTenantFromCode(params.code);
    const current = await get(tenantId);
    const table = tableFromCode(current.state, params.code);
    if (!table) return error('Mesa não encontrada', 404);
    const publicState = await withSignedImages(current.state);
    const orders = current.state.orders
      .filter(order => order.table === table.name && !['Entregue', 'Finalizado', 'Cancelado'].includes(order.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const pendingRequests = current.state.serviceRequests.filter(request => request.table === table.name && request.status === 'pending');
    const menuCategories = publicState.menuCategories
      .filter(category => category.active)
      .sort((a, b) => a.order - b.order)
      .map(category => ({
        id: category.id,
        name: category.name,
        active: category.active,
        order: category.order,
        imageUrl: category.imageUrl,
      }));
    const products = publicState.products
      .filter(product => product.active && (!product.channels?.length || product.channels.includes('Mesa')))
      .map(product => ({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        active: product.active,
        description: product.description || '',
        featured: product.featured || false,
        prepTime: product.prepTime || 15,
        channels: product.channels || [],
        imageUrl: product.imageUrl,
      }));
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
      menuCategories,
      products,
    });
  }],

  'POST /api/customer/table/:code/orders': [async ({ params, body }) => {
    const value = body as { customer?: string; items?: Array<Partial<I>> };
    if (!value.items?.length) return error('Pedido sem itens', 400);
    const tenantId = customerTenantFromCode(params.code);
    const current = await get(tenantId);
    const table = tableFromCode(current.state, params.code);
    if (!table) return error('Mesa não encontrada', 404);
    const validated = validateOrderItems(current.state, value.items);
    if ('error' in validated) return error(String(validated.error), 400);

    const unavailableForTable = validated.items.find(item => {
      const product = current.state.products.find(candidate => candidate.id === item.productId);
      return product?.channels?.length && !product.channels.includes('Mesa');
    });
    if (unavailableForTable) return error('Produto indisponível para mesa', 400);

    const subtotal = Number(validated.items.reduce((sum, item) => sum + item.price * item.qty, 0).toFixed(2));
    const fee = current.state.settings.automaticServiceFee ? subtotal * (current.state.settings.serviceFee / 100) : 0;
    const total = Number((subtotal + fee).toFixed(2));
    const sequence = 1051 + current.state.orders.filter(order => /^#\d+$/.test(order.code) && Number(order.code.slice(1)) >= 1051).length;
    const createdAt = new Date().toISOString();
    const order: O = {
      id: 'co' + Date.now(),
      code: '#' + sequence,
      channel: 'Mesa',
      table: table.name,
      customer: value.customer?.trim().slice(0, 120) || 'Cliente da mesa',
      items: validated.items,
      total,
      status: 'Novo',
      createdAt,
      updatedAt: createdAt,
      paymentMethod: 'Na mesa',
    };
    applyOrderEffects(current.state, order);
    audit(current.state, 'order', order.id, 'Pedido enviado pelo cliente', order.code + ' · ' + table.name, 'Cliente');
    await save(current.id, current.state, tenantId);
    await notifyN8n(current.state, 'order.created_from_customer', { order, table }, tenantId);
    return json(order, 201);
  }],

  'POST /api/customer/table/:code/register': [async ({ params, body }) => {
    const value = body as Partial<C>;
    if (!value.name?.trim() || !value.phone?.trim()) return error('Nome e telefone obrigatórios', 400);
    const normalizedPhone = value.phone.replace(/\D/g, '');
    if (normalizedPhone.length < 10 || normalizedPhone.length > 13) return error('Telefone inválido', 400);
    const email = String(value.email || '').trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('E-mail inválido', 400);

    const tenantId = customerTenantFromCode(params.code);
    const current = await get(tenantId);
    const table = tableFromCode(current.state, params.code);
    if (!table) return error('Mesa não encontrada', 404);

    let customer = current.state.customers.find(item => item.phone.replace(/\D/g, '') === normalizedPhone);
    if (!customer) {
      customer = {
        id: 'c' + Date.now(),
        name: value.name.trim().slice(0, 120),
        phone: value.phone.trim().slice(0, 30),
        email,
        orders: 0,
        totalSpent: 0,
        lastOrder: 'Sem pedidos',
      };
      current.state.customers.unshift(customer);
    } else {
      customer.name = value.name.trim().slice(0, 120);
      customer.email = email || customer.email || '';
    }

    current.state.orders
      .filter(order => order.table === table.name && !['Entregue', 'Finalizado', 'Cancelado'].includes(order.status))
      .forEach(order => { order.customer = customer!.name; });

    audit(current.state, 'customer', customer.id, 'Cliente conectado à mesa', customer.name + ' · ' + table.name, 'Cliente');
    await save(current.id, current.state, tenantId);
    await notifyN8n(current.state, 'customer.registered', { customer, table }, tenantId);
    return json(customer, 201);
  }],

  'POST /api/customer/table/:code/request': [async ({ params, body }) => {
    const value = body as { type?: 'waiter' | 'bill' };
    if (!value.type || !['waiter', 'bill'].includes(value.type)) return error('Solicitação inválida', 400);
    const tenantId = customerTenantFromCode(params.code);
    const current = await get(tenantId);
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
    await save(current.id, current.state, tenantId);
    await notifyN8n(current.state, 'table.customer_request', { request, table }, tenantId);
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
    await notifyN8n(current.state, 'table.request_resolved', { request });
    return json(request);
  }],

  'POST /api/cash/open': [async ({ body }) => {
    const value = body as { openingAmount?: number };
    const openingAmount = Number(value.openingAmount ?? 0);
    if (!Number.isFinite(openingAmount) || openingAmount < 0 || openingAmount > 100_000_000) return error('Valor de abertura inválido', 400);
    const current = await get();
    if (current.state.cashRegister.status === 'Aberto') return error('Caixa já está aberto', 400);
    current.state.cashRegister = {
      status: 'Aberto',
      openingAmount: Number(openingAmount.toFixed(2)),
      openedAt: new Date().toISOString(),
    };
    audit(current.state, 'cash', 'cash', 'Caixa aberto', 'Valor de abertura ' + openingAmount.toFixed(2));
    await save(current.id, current.state);
    return json(current.state.cashRegister);
  }],

  'POST /api/cash/close': [async () => {
    const current = await get();
    if (current.state.cashRegister.status === 'Fechado') return error('Caixa já está fechado', 400);
    const openedAt = Date.parse(current.state.cashRegister.openedAt);
    if (!Number.isFinite(openedAt)) return error('Data de abertura do caixa inválida', 400);

    const sales = current.state.orders
      .filter(order => order.status !== 'Cancelado' && Date.parse(order.createdAt) >= openedAt)
      .reduce((sum, order) => sum + order.total, 0);
    const entries = current.state.transactions
      .filter(tx => tx.type === 'Entrada' && tx.category !== 'Vendas' && transactionTimestamp(current.state, tx) >= openedAt)
      .reduce((sum, tx) => sum + tx.amount, 0);
    const exits = current.state.transactions
      .filter(tx => tx.type === 'Saída' && transactionTimestamp(current.state, tx) >= openedAt)
      .reduce((sum, tx) => sum + tx.amount, 0);
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

  'POST /api/products': [async ({ body }) => {
    const value = body as Partial<P>;
    const price = Number(value.price);
    const stock = Number(value.stock ?? 0);
    const cost = Number(value.cost ?? 0);
    const prepTime = Number(value.prepTime ?? 15);
    if (!value.name?.trim() || !Number.isFinite(price) || price <= 0) return error('Nome e preço são obrigatórios', 400);
    if (![stock, cost, prepTime].every(Number.isFinite) || stock < 0 || cost < 0 || prepTime <= 0) return error('Estoque, custo ou tempo de preparo inválido', 400);
    const current = await get();
    const product: P = {
      id: 'p' + Date.now(),
      name: value.name.trim().slice(0, 120),
      category: value.category?.trim().slice(0, 80) || 'Outros',
      price: Number(price.toFixed(2)),
      stock,
      active: value.active ?? true,
      description: value.description?.slice(0, 1000) || '',
      cost: Number(cost.toFixed(2)),
      code: value.code?.trim().slice(0, 80) || '',
      featured: value.featured ?? false,
      prepTime,
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
    if (!updated.name.trim() || !Number.isFinite(updated.price) || updated.price <= 0) return error('Nome e preço são obrigatórios', 400);
    if (![updated.stock, updated.cost ?? 0, updated.prepTime ?? 15].every(Number.isFinite) || updated.stock < 0 || (updated.cost ?? 0) < 0 || (updated.prepTime ?? 15) <= 0) return error('Estoque, custo ou tempo de preparo inválido', 400);
    current.state.products[index] = {
      ...updated,
      name: updated.name.trim().slice(0, 120),
      category: updated.category.trim().slice(0, 80),
      price: Number(updated.price.toFixed(2)),
      cost: Number((updated.cost ?? 0).toFixed(2)),
      description: updated.description?.slice(0, 1000),
      code: updated.code?.trim().slice(0, 80),
    };
    await save(current.id, current.state);
    return json(updated);
  }],

  'POST /api/products/:id/image': [async ({ params, body }) => {
    const value = body as { content?: string; contentType?: string };
    const validatedImage = validateImagePayload(value);
    if ('error' in validatedImage) return error(String(validatedImage.error), 400);
    const current = await get();
    const product = current.state.products.find(item => item.id === params.id);
    if (!product) return error('Produto não encontrado', 404);
    const path = 'tenants/' + currentTenantId() + '/catalog/products/' + params.id + '-' + Date.now() + '.' + validatedImage.extension;
    const [ok] = await storage.write([{ path, content: value.content!, contentType: value.contentType! }]);
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
    const validatedImage = validateImagePayload(value);
    if ('error' in validatedImage) return error(String(validatedImage.error), 400);
    const current = await get();
    const category = current.state.menuCategories.find(item => item.id === params.id);
    if (!category) return error('Categoria não encontrada', 404);
    const path = 'tenants/' + currentTenantId() + '/catalog/categories/' + params.id + '-' + Date.now() + '.' + validatedImage.extension;
    const [ok] = await storage.write([{ path, content: value.content!, contentType: value.contentType! }]);
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
    if (!table || !value.status || !allowedTableStatuses.has(value.status)) return error('Mesa/status inválido', 400);
    table.status = value.status;
    if (value.status === 'Livre') {
      table.total = 0;
      table.waiter = undefined;
    }
    if (value.status === 'Ocupada' && !table.waiter) table.waiter = 'Equipe';
    audit(current.state, 'table', table.id, 'Status da mesa alterado', table.name + ' · ' + value.status);
    await save(current.id, current.state);
    await notifyN8n(current.state, 'table.status_changed', { table });
    return json(table);
  }],

  'POST /api/orders': [async ({ body }) => {
    const value = body as { channel?: string; table?: string; customer?: string; paymentMethod?: string; items?: Array<Partial<I>> };
    if (!value.items?.length) return error('Pedido sem itens', 400);
    const current = await get();
    const validated = validateOrderItems(current.state, value.items);
    if ('error' in validated) return error(String(validated.error), 400);

    const channel = value.channel || 'Balcão';
    if (!allowedOrderChannels.has(channel)) return error('Canal inválido', 400);
    if (channel === 'Mesa' && (!value.table || !current.state.tables.some(item => item.name === value.table))) return error('Mesa inválida', 400);

    const subtotal = Number(validated.items.reduce((sum, item) => sum + item.price * item.qty, 0).toFixed(2));
    const fee = channel === 'Mesa' && current.state.settings.automaticServiceFee ? subtotal * (current.state.settings.serviceFee / 100) : 0;
    const total = Number((subtotal + fee).toFixed(2));
    const sequence = 1051 + current.state.orders.filter(order => /^#\d+$/.test(order.code) && Number(order.code.slice(1)) >= 1051).length;
    const createdAt = new Date().toISOString();
    const order: O = {
      id: 'o' + Date.now(),
      code: '#' + sequence,
      channel,
      table: channel === 'Mesa' ? value.table : undefined,
      customer: value.customer?.trim().slice(0, 120) || 'Cliente balcão',
      items: validated.items,
      total,
      status: 'Novo',
      createdAt,
      updatedAt: createdAt,
      paymentMethod: value.paymentMethod?.trim().slice(0, 60) || 'Não informado',
    };
    applyOrderEffects(current.state, order);
    await save(current.id, current.state);
    await notifyN8n(current.state, 'order.created', { order });
    return json(order, 201);
  }],

  'PUT /api/orders/:id/status': [async ({ params, body }) => {
    const value = body as { status?: string };
    const current = await get();
    const order = current.state.orders.find(item => item.id === params.id);
    if (!order || !value.status || !allowedOrderStatuses.has(value.status)) return error('Pedido/status inválido', 400);
    const changedAt = new Date().toISOString();
    order.status = value.status;
    order.updatedAt = changedAt;
    if (value.status === 'Preparando' && !order.startedAt) order.startedAt = changedAt;
    if (value.status === 'Pronto' && !order.readyAt) order.readyAt = changedAt;
    if (value.status === 'Entregue' && !order.deliveredAt) order.deliveredAt = changedAt;
    if (order.table && value.status === 'Entregue') {
      const table = current.state.tables.find(item => item.name === order.table);
      const hasOtherActive = current.state.orders.some(item => item.id !== order.id && item.table === order.table && !['Entregue', 'Finalizado', 'Cancelado'].includes(item.status));
      if (table && !hasOtherActive) table.status = 'Fechamento';
    }
    audit(current.state, 'order', order.id, 'Status do pedido alterado', order.code + ' · ' + value.status);
    await save(current.id, current.state);
    await notifyN8n(current.state, value.status === 'Pronto' ? 'order.ready' : 'order.status_changed', { order });
    return json(order);
  }],

  'POST /api/customers': [async ({ body }) => {
    const value = body as Partial<C>;
    if (!value.name?.trim() || !value.phone?.trim()) return error('Nome e telefone obrigatórios', 400);
    const current = await get();
    const normalizedPhone = value.phone.replace(/\D/g, '');
    if (normalizedPhone.length < 10 || normalizedPhone.length > 13) return error('Telefone inválido', 400);
    const email = String(value.email || '').trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('E-mail inválido', 400);
    if (current.state.customers.some(item => item.phone.replace(/\D/g, '') === normalizedPhone)) return error('Telefone já cadastrado', 409);
    const customer: C = {
      id: 'c' + Date.now(),
      name: value.name.trim().slice(0, 120),
      phone: value.phone.trim().slice(0, 30),
      email,
      orders: 0,
      totalSpent: 0,
      lastOrder: 'Sem pedidos',
    };
    current.state.customers.unshift(customer);
    audit(current.state, 'customer', customer.id, 'Cliente cadastrado', customer.name + ' · ' + customer.phone);
    await save(current.id, current.state);
    await notifyN8n(current.state, 'customer.created', { customer });
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

  'POST /api/printers/test': [async ({ body }) => {
    const value = body as { station?: string };
    const station = String(value.station || '').trim().slice(0, 80);
    if (!station) return error('Impressora/setor obrigatório', 400);
    const current = await get();
    audit(current.state, 'printer', station, 'Teste de impressão', 'Comanda de teste enviada para ' + station);
    await save(current.id, current.state);
    await notifyN8n(current.state, 'printer.test', { station, copies: current.state.settings.printCopies });
    return json({ ok: true, message: 'Teste registrado para ' + station + '.' });
  }],

  'POST /api/transactions': [async ({ body }) => {
    const value = body as Partial<Tx>;
    const amount = Number(value.amount);
    if (!value.description?.trim() || !['Entrada', 'Saída'].includes(String(value.type)) || !Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
      return error('Lançamento financeiro inválido', 400);
    }
    const current = await get();
    const transaction: Tx = {
      id: 'f' + Date.now(),
      description: value.description.trim().slice(0, 200),
      type: value.type as 'Entrada' | 'Saída',
      amount: Number(amount.toFixed(2)),
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
    if (value.serviceFee !== undefined && (!Number.isFinite(Number(value.serviceFee)) || Number(value.serviceFee) < 0 || Number(value.serviceFee) > 30)) return error('Taxa de serviço inválida', 400);
    if (value.deliveryMinimum !== undefined && (!Number.isFinite(Number(value.deliveryMinimum)) || Number(value.deliveryMinimum) < 0)) return error('Pedido mínimo inválido', 400);
    if (value.freeDeliveryFrom !== undefined && (!Number.isFinite(Number(value.freeDeliveryFrom)) || Number(value.freeDeliveryFrom) < 0)) return error('Frete grátis inválido', 400);
    if (value.openingHours !== undefined && value.openingHours.length > 120) return error('Horário de funcionamento inválido', 400);
    if (value.printCopies !== undefined && (!Number.isFinite(Number(value.printCopies)) || Number(value.printCopies) < 1 || Number(value.printCopies) > 5)) return error('Cópias de impressão inválidas', 400);
    const current = await get();
    current.state.settings = {
      ...current.state.settings,
      ...value,
      restaurantName: value.restaurantName?.trim().slice(0, 120) || current.state.settings.restaurantName,
      unit: value.unit?.trim().slice(0, 120) || current.state.settings.unit,
      serviceFee: value.serviceFee === undefined ? current.state.settings.serviceFee : Number(value.serviceFee),
      deliveryMinimum: value.deliveryMinimum === undefined ? current.state.settings.deliveryMinimum : Number(value.deliveryMinimum),
      freeDeliveryFrom: value.freeDeliveryFrom === undefined ? current.state.settings.freeDeliveryFrom : Number(value.freeDeliveryFrom),
      openingHours: value.openingHours?.trim().slice(0, 120) || current.state.settings.openingHours,
      kitchenPrinter: value.kitchenPrinter?.trim().slice(0, 80) || current.state.settings.kitchenPrinter,
      counterPrinter: value.counterPrinter?.trim().slice(0, 80) || current.state.settings.counterPrinter,
      barPrinter: value.barPrinter?.trim().slice(0, 80) || current.state.settings.barPrinter,
      printCopies: value.printCopies === undefined ? current.state.settings.printCopies : Number(value.printCopies),
    };
    await save(current.id, current.state);
    return json(current.state.settings);
  }],
});
