import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { api, apiBaseUrl } from './lib/api';
import { QRCodeSVG } from 'qrcode.react';
import {
  LayoutDashboard,
  ShoppingBag,
  Utensils,
  ChefHat,
  Bike,
  Package,
  Boxes,
  WalletCards,
  Users,
  BarChart3,
  Settings,
  Plus,
  Minus,
  Trash2,
  Check,
  AlertTriangle,
  Menu,
  Search,
  SlidersHorizontal,
  Bell,
  Heart,
  CreditCard,
  Banknote,
  QrCode,
  Wallet,
  MessageCircle,
  Clock3,
  Star,
  ArrowUpRight,
  Grid3X3,
  ImagePlus,
  Layers3,
  Copy,
  Smartphone,
  Printer,
  Plug,
  ReceiptText,
  Percent,
  Truck,
  ShieldCheck,
  BrainCircuit,
  History,
  Store,
  Send,
  X,
  Globe2,
  KeyRound,
  RefreshCw,
  Code2,
  MapPinned,
  UserCog,
  BadgePercent,
  Gift,
  LogOut,
  CircleDollarSign,
  Megaphone,
} from 'lucide-react';

type Product = {
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
type Table = { id: string; name: string; seats: number; status: 'Livre' | 'Ocupada' | 'Aguardando' | 'Fechamento'; total: number; waiter?: string };
type Item = { productId: string; name: string; qty: number; price: number };
type Order = { id: string; code: string; channel: string; table?: string; customer?: string; items: Item[]; total: number; status: string; createdAt: string; updatedAt?: string; startedAt?: string; readyAt?: string; deliveredAt?: string; paymentMethod?: string };
type Customer = { id: string; name: string; phone: string; email?: string; orders: number; totalSpent: number; lastOrder: string };
type Stock = { id: string; name: string; unit: string; current: number; minimum: number; cost: number };
type Tx = { id: string; description: string; type: 'Entrada' | 'Saída'; amount: number; date: string; category: string; createdAt?: string };
type CashRegister = { status: 'Aberto' | 'Fechado'; openingAmount: number; openedAt: string; closedAt?: string; closingAmount?: number };
type ServiceRequest = { id: string; table: string; type: 'waiter' | 'bill'; status: 'pending' | 'resolved'; createdAt: string; resolvedAt?: string };
type AuditEvent = { id: string; entity: string; entityId: string; action: string; detail: string; user: string; createdAt: string };
type State = {
  products: Product[];
  menuCategories: MenuCategory[];
  tables: Table[];
  orders: Order[];
  customers: Customer[];
  stock: Stock[];
  transactions: Tx[];
  cashRegister: CashRegister;
  serviceRequests: ServiceRequest[];
  auditLog: AuditEvent[];
  settings: AppSettings;
};
type Page = 'dashboard' | 'pdv' | 'tables' | 'history' | 'menu' | 'kds' | 'delivery' | 'products' | 'stock' | 'finance' | 'customers' | 'reports' | 'settings';
type AuthSession = { mode: 'empresa' | 'cliente'; name: string; role: string; email?: string; tableCode?: string; userId?: string; companyId?: string; companyName?: string; token: string; expiresAt: string };

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const ACCENT = '#f45f3f';
const AUTH_STORAGE_KEY = 'tapfood-auth-session';

const nav: Array<[Page, string, typeof LayoutDashboard]> = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['pdv', 'Pedidos / PDV', ShoppingBag],
  ['tables', 'Mesas', Utensils],
  ['history', 'Histórico / Caixa', History],
  ['menu', 'Montar cardápio', Grid3X3],
  ['kds', 'Cozinha / KDS', ChefHat],
  ['delivery', 'Delivery', Bike],
  ['products', 'Produtos', Package],
  ['stock', 'Estoque', Boxes],
  ['finance', 'Financeiro', WalletCards],
  ['customers', 'Clientes / CRM', Users],
  ['reports', 'Relatórios', BarChart3],
  ['settings', 'Configurações', Settings],
];

const pageRoutes: Record<Page, string> = {
  dashboard: '/',
  pdv: '/pedidos',
  tables: '/mesas',
  history: '/historico',
  menu: '/cardapio',
  kds: '/cozinha',
  delivery: '/delivery',
  products: '/produtos',
  stock: '/estoque',
  finance: '/financeiro',
  customers: '/clientes',
  reports: '/relatorios',
  settings: '/configuracoes',
};

const pageFromPath = (pathname: string): Page => {
  const normalized = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  const match = Object.entries(pageRoutes).find(([, route]) => route.replace(/^\/+|\/+$/g, '') === normalized);
  return match ? match[0] as Page : 'dashboard';
};

const defaultSettings: AppSettings = {
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
};

const empty: State = {
  products: [],
  menuCategories: [],
  tables: [],
  orders: [],
  customers: [],
  stock: [],
  transactions: [],
  cashRegister: { status: 'Aberto', openingAmount: 0, openedAt: new Date().toISOString() },
  serviceRequests: [],
  auditLog: [],
  settings: defaultSettings,
};

const PHOTO_BY_PRODUCT: Record<string, string> = {
  p1: 'https://images.unsplash.com/photo-1559067933-0293effe6133?auto=format&fit=crop&w=900&q=82',
  p2: 'https://images.unsplash.com/photo-1674073117843-5838b44b7ae0?auto=format&fit=crop&w=900&q=82',
  p3: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=900&q=82',
  p4: 'https://images.unsplash.com/photo-1633633514326-2064746ad5b6?auto=format&fit=crop&w=900&q=82',
  p5: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=900&q=82',
  p6: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=900&q=82&sat=-8',
  p7: 'https://images.unsplash.com/photo-1702827402870-7c33dc7b67be?auto=format&fit=crop&w=900&q=82',
  p8: 'https://images.unsplash.com/photo-1565553642973-6afe791aee33?auto=format&fit=crop&w=900&q=82',
};

const RESTAURANT_HERO_IMAGE = 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=2200&q=84';

const productPhoto = (product: Product) => {
  if (product.imageUrl) return product.imageUrl;
  if (PHOTO_BY_PRODUCT[product.id]) return PHOTO_BY_PRODUCT[product.id];
  const value = (product.category + ' ' + product.name).toLowerCase();
  if (value.includes('bebida') || value.includes('coca') || value.includes('suco')) return PHOTO_BY_PRODUCT.p5;
  if (value.includes('sobremesa') || value.includes('brownie')) return PHOTO_BY_PRODUCT.p7;
  if (value.includes('batata') || value.includes('porção') || value.includes('porcao')) return PHOTO_BY_PRODUCT.p3;
  return PHOTO_BY_PRODUCT.p2;
};

const categoryPhoto = (category: string) => {
  const value = category.toLowerCase();
  if (value === 'todos') return PHOTO_BY_PRODUCT.p8;
  if (value.includes('bebida')) return PHOTO_BY_PRODUCT.p5;
  if (value.includes('sobremesa')) return PHOTO_BY_PRODUCT.p7;
  if (value.includes('porç') || value.includes('porc')) return PHOTO_BY_PRODUCT.p3;
  if (value.includes('combo')) return PHOTO_BY_PRODUCT.p8;
  return PHOTO_BY_PRODUCT.p2;
};

const badgeClass = (value: string) => {
  if (value === 'Livre' || value === 'Pronto' || value === 'Ativo') return 'bg-emerald-50 text-emerald-700';
  if (value === 'Ocupada' || value === 'Preparando') return 'bg-orange-50 text-orange-700';
  if (value === 'Novo') return 'bg-blue-50 text-blue-700';
  return 'bg-amber-50 text-amber-700';
};

const readStoredSession = (): AuthSession | null => {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.token || !parsed.expiresAt || Date.parse(parsed.expiresAt) <= Date.now()) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const tableLoginPassword = (tableName: string) => 'mesa' + (tableName.match(/\d+/)?.[0] || '01').padStart(2, '0');

export default function MesaApp() {
  const customerCode = new URLSearchParams(window.location.search).get('cliente');
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());

  const handleLogin = (nextSession: AuthSession) => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    if (window.location.pathname !== '/') window.history.pushState({}, '', '/');
  };

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
    if (window.location.pathname !== '/') window.history.pushState({}, '', '/');
  };

  if (customerCode) return <CustomerPortal code={customerCode} session={session} onLogout={session?.mode === 'cliente' ? handleLogout : undefined} />;
  if (!session) return <LoginScreen onLogin={handleLogin} />;
  if (session.mode === 'cliente') return <CustomerPortal code={session.tableCode || 'Mesa 01'} session={session} onLogout={handleLogout} />;
  return <AdminApp session={session} onLogout={handleLogout} />;
}

function LoginScreen({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<'empresa' | 'cliente'>('empresa');
  const [email, setEmail] = useState('admin@tapfood.com.br');
  const [tableCode, setTableCode] = useState('Mesa 01');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await api.post<AuthSession>('/api/auth/login', mode === 'empresa'
        ? { mode, email, password }
        : { mode, table: tableCode, password });
      onLogin(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#151413] text-white">
      <img src={RESTAURANT_HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover natural-photo" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,15,14,.88),rgba(16,15,14,.62)_42%,rgba(16,15,14,.2)),linear-gradient(0deg,rgba(16,15,14,.72),rgba(16,15,14,.08)_48%)]" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[.95fr_1.05fr]">
        <section className="max-w-xl space-y-7">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#f45f3f] text-white shadow-[0_18px_45px_rgba(244,95,63,.35)]"><Utensils size={22} /></span>
            <div>
              <h1 className="text-3xl font-bold text-white">TAPFOOD</h1>
              <p className="text-xs font-semibold uppercase text-[#ffb5a5]">atendimento digital para restaurantes</p>
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-medium uppercase text-[#ffb5a5]">Salão, balcão e cliente na mesa</p>
            <h2 className="max-w-[620px] text-4xl font-bold leading-tight text-white md:text-5xl">Pedidos mais simples para uma operação mais leve.</h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/78">
              Uma experiência bonita para o cliente fazer o pedido e uma rotina mais clara para a equipe acompanhar tudo no restaurante.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Cardápio visual', 'Pedido direto da mesa', 'Equipe sincronizada'].map(item => (
              <span key={item} className="rounded-full border border-white/18 bg-white/10 px-3 py-2 text-[11px] font-medium text-white/90 backdrop-blur">{item}</span>
            ))}
          </div>
        </section>

        <form onSubmit={submit} className="ml-auto w-full max-w-xl rounded-lg border border-white/18 bg-[#fffefa] p-5 text-[#2f3136] shadow-[0_28px_80px_rgba(0,0,0,.32)]">
          <div className="mb-5 flex rounded-lg border border-[#ece8e2] bg-white p-1">
            <button type="button" onClick={() => setMode('empresa')} className={'flex-1 rounded-lg px-4 py-3 text-xs font-semibold ' + (mode === 'empresa' ? 'bg-[#202538] text-white' : 'text-slate-500')}>Empresa</button>
            <button type="button" onClick={() => setMode('cliente')} className={'flex-1 rounded-lg px-4 py-3 text-xs font-semibold ' + (mode === 'cliente' ? 'bg-[#202538] text-white' : 'text-slate-500')}>Cliente</button>
          </div>

          <div className="mb-5">
            <h2 className="text-xl font-semibold">{mode === 'empresa' ? 'Acesso do estabelecimento' : 'Acesso do cliente'}</h2>
            <p className="mt-1 text-xs text-slate-400">{mode === 'empresa' ? 'Entre para acompanhar pedidos, mesas e atendimento.' : 'Veja o cardápio, monte seu pedido e acompanhe sua mesa.'}</p>
          </div>

          <div className="space-y-3">
            {mode === 'empresa' ? (
              <Field label="E-mail"><input autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} className="control" /></Field>
            ) : (
              <Field label="Mesa"><input value={tableCode} onChange={event => setTableCode(event.target.value)} placeholder="Mesa 01" className="control" /></Field>
            )}
            <Field label="Senha"><input autoComplete={mode === 'empresa' ? 'current-password' : 'one-time-code'} type="password" value={password} onChange={event => setPassword(event.target.value)} className="control" /></Field>
          </div>

          {mode === 'cliente' && <p className="mt-2 text-[10px] text-slate-400">A senha da mesa segue o padrão informado ao estabelecimento.</p>}
          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">{error}</div>}

          <button disabled={busy || !password.trim()} className="mt-5 w-full rounded-xl bg-[#f45f3f] px-5 py-3 text-xs font-semibold text-white disabled:opacity-50">
            {busy ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}

function AdminApp({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const [page, setPageState] = useState<Page>(() => pageFromPath(window.location.pathname));
  const [data, setData] = useState<State>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [menu, setMenu] = useState(false);
  const [cart, setCart] = useState<Item[]>([]);
  const [channel, setChannel] = useState('Balcão');
  const [table, setTable] = useState('');
  const [payment, setPayment] = useState('Pix');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [tab, setTab] = useState<'Popular' | 'Recentes'>('Popular');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [settingsForm, setSettingsForm] = useState<AppSettings>(defaultSettings);
  const seededCart = useRef(false);

  const setPage = (nextPage: Page) => {
    setPageState(nextPage);
    const nextPath = pageRoutes[nextPage];
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    window.scrollTo({ top: 0 });
  };

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/state');
      const state = response.data as State;
      setData(state);
      setSettingsForm(state.settings);
      if (!seededCart.current && state.products.length >= 3) {
        setCart([
          { productId: state.products[0].id, name: state.products[0].name, qty: 1, price: state.products[0].price },
          { productId: state.products[1].id, name: state.products[1].name, qty: 1, price: state.products[1].price },
          { productId: state.products[4]?.id || state.products[2].id, name: state.products[4]?.name || state.products[2].name, qty: 1, price: state.products[4]?.price || state.products[2].price },
        ]);
        seededCart.current = true;
      }
      setError('');
    } catch {
      setError('Não foi possível carregar os dados do sistema.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const handlePopState = () => setPageState(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const response = await api.get('/api/state');
        setData(response.data as State);
      } catch {
        // Keep the last valid operational snapshot if a background refresh fails.
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const run = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      await load();
      setToast(message);
      setError('');
    } catch {
      setError('Não foi possível concluir a operação.');
    }
  };

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
  const activeOrders = data.orders.filter(order => !['Entregue', 'Finalizado', 'Cancelado'].includes(order.status)).length;
  const sales = data.transactions.filter(tx => tx.type === 'Entrada').reduce((sum, tx) => sum + tx.amount, 0);

  const addProduct = (product: Product) => {
    setCart(current => {
      const found = current.find(item => item.productId === product.id);
      if (found) {
        return current.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...current, { productId: product.id, name: product.name, qty: 1, price: product.price }];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart(current => current.map(item => item.productId === productId ? { ...item, qty: item.qty + delta } : item).filter(item => item.qty > 0));
  };

  const removeItem = (productId: string) => setCart(current => current.filter(item => item.productId !== productId));

  const openTableOrder = (tableName: string) => {
    setChannel('Mesa');
    setTable(tableName);
    setCart([]);
    setCategory('Todos');
    setSearch('');
    setPage('pdv');
  };

  const finishOrder = async () => {
    if (!cart.length) {
      setError('Adicione pelo menos um produto ao pedido.');
      return;
    }
    if (channel === 'Mesa' && !table) {
      setError('Selecione uma mesa antes de finalizar.');
      return;
    }
    await run(
      () => api.post('/api/orders', {
        channel,
        table: channel === 'Mesa' ? table : undefined,
        customer: 'Cliente balcão',
        paymentMethod: payment,
        items: cart,
      }),
      'Pedido criado e enviado para a cozinha.'
    );
    setCart([]);
    setTable('');
  };

  const managedCategories = data.menuCategories
    .filter(item => item.active)
    .sort((a, b) => a.order - b.order)
    .map(item => item.name);
  const categories = ['Todos', ...Array.from(new Set([...managedCategories, ...data.products.map(product => product.category)]))];
  const visibleProducts = data.products
    .filter(product => category === 'Todos' || product.category === category)
    .filter(product => !search || product.name.toLowerCase().includes(search.toLowerCase()))
    .filter(product => !onlyAvailable || product.stock > 0);
  const orderedProducts = tab === 'Recentes' ? [...visibleProducts].reverse() : visibleProducts;

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-[#2f3136]">
      <aside className={'fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col border-r border-[#ebe7e2] bg-[#fffefa] px-4 py-5 shadow-[6px_0_30px_rgba(45,42,38,0.025)] transition-transform lg:translate-x-0 ' + (menu ? 'translate-x-0' : '-translate-x-full')}>
        <div className="mb-5 flex items-center gap-2 px-2">
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-[#f45f3f] text-lg text-white">
            <span className="absolute right-0 top-0 h-3 w-3 rounded-bl-full bg-white" />
            <Utensils size={15} />
          </span>
          <div>
            <strong className="block text-lg tracking-normal text-[#ef5a38]">TAP<span className="text-[#202538]">FOOD</span></strong>
            <span className="block text-[10px] text-slate-400">Gestão de Restaurantes</span>
          </div>
        </div>

        <nav className="space-y-2 overflow-y-auto pb-3">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => { setPage(id); setMenu(false); }}
              className={'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-[12px] transition ' + (page === id ? 'border-[#f08a73] bg-[#fff2ee] text-[#e85b3a]' : 'border-[#ececf2] bg-white text-[#53596d] hover:bg-slate-50')}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span className="flex-1">{label}</span>
              {id === 'kds' && activeOrders > 0 && (
                <span className="rounded-full bg-[#f45f3f] px-2 py-0.5 text-[9px] font-bold text-white">{activeOrders}</span>
              )}
            </button>
          ))}
        </nav>

      </aside>

      {menu && <button aria-label="Fechar menu" className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setMenu(false)} />}

      <main className="lg:ml-[220px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-[#ebe7e2] bg-[#fffefa]/95 px-4 shadow-[0_4px_20px_rgba(45,42,38,0.025)] backdrop-blur md:px-6">
          <button className="grid h-10 w-10 place-items-center rounded-xl border lg:hidden" onClick={() => setMenu(true)}><Menu size={18} /></button>
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#e7e8ee] bg-[#f9fafc] px-3 md:max-w-[420px]">
            <Search size={16} className="text-slate-400" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar produtos, clientes ou pedidos" className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
          </label>
          <button onClick={() => setOnlyAvailable(value => !value)} className={'hidden h-10 items-center gap-2 rounded-lg px-4 text-xs font-semibold text-white sm:flex ' + (onlyAvailable ? 'bg-[#d84f31]' : 'bg-[#f45f3f]')}>
            Filtro <SlidersHorizontal size={14} />
          </button>
          <button className="ml-auto grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-50"><Bell size={18} /></button>
          <button onClick={onLogout} className="flex items-center gap-2 rounded-xl border border-[#e9eaf0] bg-[#f8f9fb] p-1.5 pr-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#ffe0d8] text-xs font-bold text-[#ef5a38]">{session.name.split(' ').map(part => part[0]).slice(0, 2).join('') || 'TF'}</span>
            <span className="hidden text-left md:block"><strong className="block text-[11px]">{session.name}</strong><small className="block text-[9px] text-slate-400">{session.companyName || 'TAPFOOD'} · {session.role} · {data.settings.unit}</small></span>
            <LogOut size={14} className="text-slate-400" />
          </button>
        </header>

        <div className="p-4 md:p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
              <AlertTriangle size={17} /><span className="flex-1">{error}</span><button onClick={() => setError('')}>×</button>
            </div>
          )}

          {loading ? (
            <div className="grid min-h-[65vh] place-items-center text-sm text-slate-400">Carregando sistema...</div>
          ) : (
            <PageView
              page={page}
              data={data}
              sales={sales}
              activeOrders={activeOrders}
              cart={cart}
              subtotal={subtotal}
              channel={channel}
              setChannel={setChannel}
              table={table}
              setTable={setTable}
              payment={payment}
              setPayment={setPayment}
              categories={categories}
              category={category}
              setCategory={setCategory}
              tab={tab}
              setTab={setTab}
              products={orderedProducts}
              favorites={favorites}
              toggleFavorite={id => setFavorites(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])}
              addProduct={addProduct}
              changeQty={changeQty}
              removeItem={removeItem}
              finishOrder={finishOrder}
              run={run}
              search={search}
              settingsForm={settingsForm}
              setSettingsForm={setSettingsForm}
              setPage={setPage}
              openTableOrder={openTableOrder}
              session={session}
              onLogout={onLogout}
            />
          )}
        </div>
      </main>

      <AiAssistant mode="establishment" page={page} />

      {toast && (
        <div className="fixed bottom-20 right-4 z-[60] flex items-center gap-2 rounded-xl bg-[#202538] px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <Check size={15} className="text-emerald-400" />{toast}
        </div>
      )}
    </div>
  );
}

type ViewProps = {
  page: Page;
  data: State;
  sales: number;
  activeOrders: number;
  cart: Item[];
  subtotal: number;
  channel: string;
  setChannel: (value: string) => void;
  table: string;
  setTable: (value: string) => void;
  payment: string;
  setPayment: (value: string) => void;
  categories: string[];
  category: string;
  setCategory: (value: string) => void;
  tab: 'Popular' | 'Recentes';
  setTab: (value: 'Popular' | 'Recentes') => void;
  products: Product[];
  favorites: string[];
  toggleFavorite: (id: string) => void;
  addProduct: (product: Product) => void;
  changeQty: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  finishOrder: () => Promise<void>;
  run: (fn: () => Promise<unknown>, message: string) => Promise<void>;
  search: string;
  settingsForm: AppSettings;
  setSettingsForm: (value: AppSettings) => void;
  setPage: (page: Page) => void;
  openTableOrder: (tableName: string) => void;
  session: AuthSession;
  onLogout: () => void;
};

function PageView(props: ViewProps) {
  if (props.page === 'dashboard') return <OperationalDashboard {...props} />;
  if (props.page === 'pdv') return <OrderingWorkspace {...props} />;
  if (props.page === 'tables') return <TablesView {...props} />;
  if (props.page === 'history') return <HistoryView {...props} />;
  if (props.page === 'menu') return <MenuBuilderView {...props} />;
  if (props.page === 'kds') return <KdsView {...props} />;
  if (props.page === 'delivery') return <DeliveryView {...props} />;
  if (props.page === 'products') return <ProductsView {...props} />;
  if (props.page === 'stock') return <StockView {...props} />;
  if (props.page === 'finance') return <FinanceView {...props} />;
  if (props.page === 'customers') return <CustomersView {...props} />;
  if (props.page === 'reports') return <ReportsView {...props} />;
  return <SettingsView {...props} />;
}

function OperationalDashboard(props: ViewProps) {
  const now = Date.now();
  const activeOrders = props.data.orders.filter(order => !['Entregue', 'Finalizado', 'Cancelado'].includes(order.status));
  const occupiedTables = props.data.tables.filter(table => table.status !== 'Livre');
  const pendingWaiter = props.data.serviceRequests.filter(request => request.status === 'pending' && request.type === 'waiter');
  const pendingBills = props.data.serviceRequests.filter(request => request.status === 'pending' && request.type === 'bill');
  const cash = props.data.cashRegister;
  const cashEntries = props.data.transactions.filter(tx => tx.type === 'Entrada').reduce((sum, tx) => sum + tx.amount, 0);
  const cashExits = props.data.transactions.filter(tx => tx.type === 'Saída').reduce((sum, tx) => sum + tx.amount, 0);
  const projectedCash = cash.openingAmount + cashEntries - cashExits;

  const toggleDashboardCash = async () => {
    if (cash.status === 'Aberto') {
      if (!confirm('Deseja fechar o caixa agora?')) return;
      await props.run(() => api.post('/api/cash/close', {}), 'Caixa fechado.');
      return;
    }

    const typed = window.prompt('Valor de abertura do caixa', '0');
    if (typed === null) return;
    const openingAmount = Number(typed || 0);
    if (!Number.isFinite(openingAmount) || openingAmount < 0) return;
    await props.run(() => api.post('/api/cash/open', { openingAmount }), 'Caixa aberto.');
  };

  const delayedOrders = activeOrders.filter(order => {
    const elapsed = now - new Date(order.startedAt || order.createdAt).getTime();
    const expected = Math.max(...order.items.map(item => props.data.products.find(product => product.id === item.productId)?.prepTime || 15), 15);
    return elapsed > expected * 60000;
  });

  const completedServiceTimes = props.data.orders
    .filter(order => order.deliveredAt)
    .map(order => new Date(order.deliveredAt as string).getTime() - new Date(order.createdAt).getTime())
    .filter(value => value >= 0);
  const fallbackServiceTimes = activeOrders.map(order => now - new Date(order.createdAt).getTime()).filter(value => value >= 0);
  const serviceTimes = completedServiceTimes.length ? completedServiceTimes : fallbackServiceTimes;
  const averageService = serviceTimes.length ? serviceTimes.reduce((sum, value) => sum + value, 0) / serviceTimes.length : 0;

  const waitTimes = props.data.orders
    .map(order => {
      if (order.startedAt) return new Date(order.startedAt).getTime() - new Date(order.createdAt).getTime();
      if (order.status === 'Novo') return now - new Date(order.createdAt).getTime();
      return 0;
    })
    .filter(value => value > 0);
  const averageWait = waitTimes.length ? waitTimes.reduce((sum, value) => sum + value, 0) / waitTimes.length : 0;

  const tableElapsed = (tableName: string) => {
    const orders = activeOrders.filter(order => order.table === tableName);
    if (!orders.length) return 0;
    const earliest = Math.min(...orders.map(order => new Date(order.createdAt).getTime()));
    return Math.max(0, now - earliest);
  };

  const pendingFor = (tableName: string) => props.data.serviceRequests.filter(request => request.table === tableName && request.status === 'pending');

  const resolveRequest = async (request: ServiceRequest) => {
    await props.run(
      () => api.put('/api/service-requests/' + request.id + '/resolve', {}),
      request.type === 'bill' ? 'Solicitação de conta atendida.' : 'Chamada de garçom atendida.'
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold md:text-xl">Dashboard Operacional</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Tempo real</span>
            <span className="rounded-full bg-[#eef7fb] px-2 py-1 text-[8px] font-semibold text-[#246486]">Estabelecimento · acesso total</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400 md:text-xs">Pedidos, mesas, atendimento, alertas e histórico atualizados automaticamente.</p>
        </div>
        <button onClick={() => props.setPage('tables')} className="rounded-lg bg-[#f45f3f] px-3 py-2.5 text-[10px] font-bold text-white">Abrir mesas</button>
        <button onClick={() => props.setPage('history')} className="rounded-lg border border-[#dedbd6] bg-white px-3 py-2.5 text-[10px] font-semibold">Histórico / Caixa</button>
      </div>

      <div className={'flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 shadow-[0_4px_14px_rgba(46,42,38,.025)] ' + (cash.status === 'Aberto' ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-slate-50')}>
        <span className={'grid h-8 w-8 place-items-center rounded-lg ' + (cash.status === 'Aberto' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500')}><WalletCards size={15} /></span>
        <div className="min-w-[120px]"><small className="block text-[8px] text-slate-400">Caixa</small><b className="text-xs">{cash.status}</b></div>
        <div className="hidden h-7 w-px bg-black/5 sm:block" />
        <div><small className="block text-[8px] text-slate-400">Abertura</small><b className="text-[10px]">{BRL(cash.openingAmount)}</b></div>
        <div><small className="block text-[8px] text-slate-400">Saldo estimado</small><b className="text-[10px]">{BRL(projectedCash)}</b></div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => props.setPage('history')} className="rounded-lg border border-[#d9d9d6] bg-white px-3 py-2 text-[9px] font-semibold">Ver caixa</button>
          <button onClick={() => void toggleDashboardCash()} className={'rounded-lg px-3 py-2 text-[9px] font-bold text-white ' + (cash.status === 'Aberto' ? 'bg-[#ff5a5f]' : 'bg-emerald-500')}>{cash.status === 'Aberto' ? 'Fechar caixa' : 'Abrir caixa'}</button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <OpsMetric icon={<ShoppingBag size={15} />} label="Pedidos" value={String(props.data.orders.length)} detail={activeOrders.length + ' ativo(s)'} />
        <OpsMetric icon={<Utensils size={15} />} label="Mesas ocupadas" value={String(occupiedTables.length)} detail={'de ' + props.data.tables.length + ' mesas'} />
        <OpsMetric icon={<Clock3 size={15} />} label="Tempo atendimento" value={formatOperationalTime(averageService)} detail="média da operação" />
        <OpsMetric icon={<History size={15} />} label="Tempo de espera" value={formatOperationalTime(averageWait)} detail="desde confirmação até preparo" />
        <OpsMetric icon={<Bell size={15} />} label="Chamar garçom" value={String(pendingWaiter.length)} detail="chamado(s) pendente(s)" alert={pendingWaiter.length > 0} />
        <OpsMetric icon={<ReceiptText size={15} />} label="Contas solicitadas" value={String(pendingBills.length)} detail={delayedOrders.length + ' pedido(s) atrasado(s)'} alert={pendingBills.length > 0 || delayedOrders.length > 0} />
      </div>

      {(pendingWaiter.length > 0 || pendingBills.length > 0 || delayedOrders.length > 0) && (
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="mb-3 flex items-center gap-2"><AlertTriangle size={17} className="text-red-500" /><div><b className="block text-sm text-red-700">Alertas de atendimento</b><small className="text-[10px] text-red-500">Priorize mesas em vermelho.</small></div></div>
            <div className="space-y-2">
              {[...pendingWaiter, ...pendingBills].slice(0, 8).map(request => (
                <div key={request.id} className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-red-100 text-red-600">{request.type === 'bill' ? <ReceiptText size={16} /> : <Bell size={16} />}</span>
                  <span className="min-w-0 flex-1"><b className="block text-xs">{request.table}</b><small className="text-[9px] text-slate-400">{request.type === 'bill' ? 'Solicitou a conta' : 'Chamou o garçom'} · {formatOperationalTime(now - new Date(request.createdAt).getTime())}</small></span>
                  <button onClick={() => void resolveRequest(request)} className="rounded-lg bg-red-500 px-3 py-2 text-[9px] font-bold text-white">Atender</button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-3 flex items-center gap-2"><Clock3 size={17} className="text-amber-600" /><div><b className="block text-sm text-amber-800">Pedidos acima do tempo</b><small className="text-[10px] text-amber-600">Pedidos que ultrapassaram o tempo estimado do cardápio.</small></div></div>
            <div className="space-y-2">
              {delayedOrders.slice(0, 8).map(order => (
                <button key={order.id} onClick={() => props.setPage('kds')} className="flex w-full items-center gap-3 rounded-lg bg-white p-3 text-left shadow-sm">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-amber-700"><ChefHat size={16} /></span>
                  <span className="min-w-0 flex-1"><b className="block text-xs">{order.code} {order.table ? '· ' + order.table : ''}</b><small className="text-[9px] text-slate-400">{order.status} · {formatOperationalTime(now - new Date(order.startedAt || order.createdAt).getTime())}</small></span>
                  <span className="text-[9px] font-bold text-amber-700">Ver KDS</span>
                </button>
              ))}
              {delayedOrders.length === 0 && <p className="text-xs text-amber-700">Nenhum pedido acima do tempo esperado.</p>}
            </div>
          </section>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-xl border border-[#ebe7e2] bg-[#fffefa] p-4 shadow-[0_10px_28px_rgba(46,42,38,0.04)]">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><h2 className="text-sm font-bold">Mesas em tempo real</h2><p className="text-[10px] text-slate-400">Clique para abrir a mesa. Chamados pendentes ficam vermelhos.</p></div>
            <span className="text-[9px] text-slate-400">{occupiedTables.length} ocupada(s) · {pendingWaiter.length + pendingBills.length} alerta(s)</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {props.data.tables.map(table => {
              const requests = pendingFor(table.name);
              const hasAlert = requests.length > 0;
              const elapsed = tableElapsed(table.name);
              return (
                <button key={table.id} onClick={() => props.openTableOrder(table.name)} className={'relative rounded-xl border-2 p-3 text-left transition hover:-translate-y-0.5 ' + (hasAlert ? 'border-red-500 bg-red-50 shadow-[0_8px_20px_rgba(239,68,68,.12)]' : table.status === 'Livre' ? 'border-slate-200 bg-slate-50' : 'border-emerald-300 bg-emerald-50')}>
                  {hasAlert && <span className="absolute right-2 top-2 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />}
                  <div className="flex items-center gap-2"><Utensils size={14} className={hasAlert ? 'text-red-600' : table.status === 'Livre' ? 'text-slate-400' : 'text-emerald-600'} /><b className="text-xs">{table.name}</b></div>
                  <div className="mt-2 flex items-center justify-between text-[9px]"><span>{table.status}</span><span>{elapsed > 0 ? formatOperationalTime(elapsed) : 'Livre'}</span></div>
                  {hasAlert && <div className="mt-2 rounded-lg bg-red-500 px-2 py-1.5 text-[9px] font-bold text-white">{requests.some(request => request.type === 'waiter') ? 'GARÇOM SOLICITADO' : 'CONTA SOLICITADA'}</div>}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-[#ebe7e2] bg-[#fffefa] p-4 shadow-[0_10px_28px_rgba(46,42,38,0.04)]">
          <div className="mb-4 flex items-end justify-between"><div><h2 className="text-sm font-bold">Histórico operacional</h2><p className="text-[10px] text-slate-400">Últimas ações registradas.</p></div><button onClick={() => props.setPage('history')} className="text-[9px] font-bold text-[#159fe5]">Ver tudo</button></div>
          <div className="max-h-[430px] space-y-1 overflow-auto">
            {props.data.auditLog.slice(0, 12).map(event => (
              <div key={event.id} className="flex items-start gap-3 border-t py-3 first:border-t-0">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#eef7fb] text-[#178fc5]"><History size={13} /></span>
                <span className="min-w-0 flex-1"><b className="block text-[10px]">{event.action}</b><small className="block truncate text-[9px] text-slate-400">{event.detail}</small></span>
                <small className="shrink-0 text-[8px] text-slate-400">{new Date(event.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-[#ebe7e2] bg-[#fffefa] p-4">
        <div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="text-sm font-bold">Pedidos em andamento</h2><p className="text-[10px] text-slate-400">Visão operacional do salão, balcão e delivery.</p></div><button onClick={() => props.setPage('kds')} className="text-[9px] font-bold text-[#f45f3f]">Abrir KDS</button></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[10px]">
            <thead className="border-b text-slate-400"><tr><th className="pb-3">Pedido</th><th>Mesa/Canal</th><th>Status</th><th>Itens</th><th>Tempo atual</th><th>Valor</th></tr></thead>
            <tbody>{activeOrders.slice(0, 12).map(order => (
              <tr key={order.id} className="border-b border-[#f0efec]">
                <td className="py-3 font-bold">{order.code}</td>
                <td>{order.table || order.channel}</td>
                <td><Badge value={order.status} /></td>
                <td>{order.items.reduce((sum, item) => sum + item.qty, 0)}</td>
                <td>{formatOperationalTime(now - new Date(order.createdAt).getTime())}</td>
                <td className="font-bold">{BRL(order.total)}</td>
              </tr>
            ))}</tbody>
          </table>
          {activeOrders.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Nenhum pedido em andamento.</p>}
        </div>
      </section>
    </section>
  );
}

function OpsMetric({ icon, label, value, detail, alert }: { icon: ReactNode; label: string; value: string; detail: string; alert?: boolean }) {
  return <div className={'min-h-[112px] rounded-xl border p-3 shadow-[0_4px_14px_rgba(46,42,38,.03)] ' + (alert ? 'border-red-300 bg-red-50' : 'border-[#ebe7e2] bg-[#fffefa]')}><div className="flex items-start justify-between gap-2"><span className={'grid h-8 w-8 place-items-center rounded-lg ' + (alert ? 'bg-red-100 text-red-600' : 'bg-[#fff2ee] text-[#e85b3a]')}>{icon}</span>{alert && <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />}</div><div className="mt-2 flex items-end justify-between gap-2"><div><strong className="block text-lg tracking-[-.03em]">{value}</strong><span className="mt-0.5 block text-[9px] font-semibold">{label}</span></div><small className="max-w-[92px] text-right text-[8px] leading-3 text-slate-400">{detail}</small></div></div>;
}

function formatOperationalTime(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return '0 min';
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 60) return totalMinutes + ' min';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours + 'h ' + String(minutes).padStart(2, '0') + 'm';
}

function OrderingWorkspace(props: ViewProps) {
  if (props.channel === 'Mesa' && props.table) return <TableOrderWorkspace {...props} />;
  return (
    <div className="grid gap-5 2xl:grid-cols-[1fr_300px]">
      <section className="min-w-0">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h1 className="text-lg font-bold">{props.channel === 'Mesa' && props.table ? props.table + ' · Cardápio' : 'Explore categorias'}</h1>
            <p className="text-xs text-slate-400">{props.channel === 'Mesa' && props.table ? 'Adicione os produtos cadastrados ao pedido desta mesa.' : 'Escolha os itens do pedido e finalize no painel ao lado.'}</p>
          </div>
          <span className="hidden text-[10px] text-slate-400 md:block">Operação online · {props.data.settings.restaurantName}</span>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {props.categories.map(item => (
            <button
              key={item}
              onClick={() => props.setCategory(item)}
              className={'flex min-w-[126px] items-center gap-2 rounded-xl border p-2 text-left text-xs transition ' + (props.category === item ? 'border-[#e98e79] bg-[#fff5f1] text-[#d95738] shadow-[0_6px_16px_rgba(92,72,60,0.04)]' : 'border-[#ece8e3] bg-[#fffefa] text-[#47484d] hover:border-[#e5c5bc] hover:shadow-[0_6px_16px_rgba(92,72,60,0.04)]')}
            >
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#efede9]"><img src={categoryPhoto(item)} alt="" loading="lazy" className="h-full w-full object-cover natural-photo" /></span>
              <span className="font-semibold">{item}</span>
            </button>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-5 border-b border-[#e5e6ec]">
          {(['Popular', 'Recentes'] as const).map(value => (
            <button key={value} onClick={() => props.setTab(value)} className={'relative pb-2 text-sm font-semibold ' + (props.tab === value ? 'text-[#252a3b]' : 'text-slate-400')}>
              {value}
              {props.tab === value && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#f45f3f]" />}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {props.products.map(product => (
            <article key={product.id} className="rounded-xl border border-[#ebe7e2] bg-[#fffefa] p-3 shadow-[0_10px_26px_rgba(46,42,38,0.045)] transition hover:-translate-y-0.5 hover:border-[#e6b6aa] hover:shadow-[0_14px_34px_rgba(46,42,38,0.07)]">
              <div className="relative mb-3 h-36 overflow-hidden rounded-lg bg-[#eeebe6]">
                <button onClick={() => props.toggleFavorite(product.id)} className={'absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-md border bg-white ' + (props.favorites.includes(product.id) ? 'border-[#f45f3f] text-[#f45f3f]' : 'border-[#dfe1e8] text-slate-400')}>
                  <Heart size={14} fill={props.favorites.includes(product.id) ? ACCENT : 'none'} />
                </button>
                <img src={productPhoto(product)} alt={product.name} loading="lazy" className="h-full w-full object-cover natural-photo" />
              </div>
              <h3 className="truncate text-sm font-bold">{product.name}</h3>
              <div className="mt-1 flex items-center justify-between">
                <strong className="text-lg text-[#ef5a38]">{BRL(product.price)}</strong>
                <span className="flex items-center gap-1 text-[9px] text-slate-400"><Star size={11} fill="#f6b62f" className="text-[#f6b62f]" /> 4.8 · {product.stock} un</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => props.toggleFavorite(product.id)} className="rounded-lg border border-[#e4e6ed] py-2 text-[10px] font-semibold text-[#596075]">Favoritar</button>
                <button onClick={() => props.addProduct(product)} disabled={product.stock <= 0} className="rounded-lg bg-[#f45f3f] py-2 text-[10px] font-semibold text-white disabled:opacity-40">Adicionar</button>
              </div>
            </article>
          ))}
        </div>
        {!props.products.length && <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-400">Nenhum produto encontrado.</div>}
      </section>

      <InvoicePanel {...props} />
    </div>
  );
}

function InvoicePanel(props: ViewProps) {
  return (
    <aside className="h-fit rounded-xl bg-white p-4 2xl:sticky 2xl:top-[96px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">{props.channel === 'Mesa' && props.table ? 'Pedido · ' + props.table : 'Pedido atual'}</h2>
          {props.channel === 'Mesa' && props.table && <p className="mt-0.5 text-[9px] text-slate-400">Mesa selecionada para lançamento dos itens</p>}
        </div>
        {props.channel === 'Mesa' && props.table && <span className="rounded-full bg-[#fff2ee] px-2 py-1 text-[9px] font-bold text-[#e85b3a]">Mesa</span>}
      </div>
      <div className="space-y-3">
        {props.cart.map(item => (
          <div key={item.productId} className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#eeeae4]"><img src={productPhoto(props.data.products.find(product => product.id === item.productId) || { id: item.productId, name: item.name, category: '', price: item.price, stock: 0, active: true })} alt={item.name} loading="lazy" className="h-full w-full object-cover natural-photo" /></div>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-[11px]">{item.name}</strong>
              <span className="text-[11px] font-bold text-[#ef5a38]">{BRL(item.price * item.qty)}</span>
              <div className="mt-1 flex items-center gap-2">
                <button onClick={() => props.changeQty(item.productId, -1)} className="grid h-5 w-5 place-items-center rounded border"><Minus size={11} /></button>
                <b className="text-[10px]">{item.qty}</b>
                <button onClick={() => props.changeQty(item.productId, 1)} className="grid h-5 w-5 place-items-center rounded border"><Plus size={11} /></button>
                <button onClick={() => props.removeItem(item.productId)} className="ml-auto text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        ))}
        {!props.cart.length && <div className="rounded-lg border border-dashed p-5 text-center text-xs text-slate-400">Seu pedido está vazio.</div>}
      </div>

      <div className="my-4 rounded-xl border border-dashed border-[#d9dbe3] p-3">
        <div className="flex justify-between text-[11px] text-slate-500"><span>Subtotal</span><b className="text-[#303648]">{BRL(props.subtotal)}</b></div>
        <div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>Taxas</span><b className="text-[#303648]">{BRL(0)}</b></div>
        <div className="mt-3 border-t pt-3">
          <div className="flex justify-between text-xs font-bold"><span>Total do pedido</span><span>{BRL(props.subtotal)}</span></div>
        </div>

        <div className="mt-4">
          <span className="text-[10px] text-slate-500">Canal</span>
          <div className="mt-1 grid grid-cols-3 gap-1.5">
            {['Balcão', 'Mesa', 'Delivery'].map(value => (
              <button key={value} onClick={() => props.setChannel(value)} className={'rounded-lg border py-2 text-[9px] font-bold ' + (props.channel === value ? 'border-[#f45f3f] bg-[#fff3ef] text-[#e85b3a]' : 'border-[#e5e6ec]')}>{value}</button>
            ))}
          </div>
          {props.channel === 'Mesa' && (
            <select value={props.table} onChange={event => props.setTable(event.target.value)} className="mt-2 w-full rounded-lg border border-[#e5e6ec] p-2 text-[10px] outline-none">
              <option value="">Selecione a mesa</option>
              {props.data.tables.map(table => <option key={table.id} value={table.name}>{table.name}</option>)}
            </select>
          )}
        </div>

        <div className="mt-4">
          <span className="text-[10px] text-slate-500">Método de pagamento</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <PayButton label="Pix" icon={<QrCode size={20} />} active={props.payment === 'Pix'} onClick={() => props.setPayment('Pix')} />
            <PayButton label="Cartão" icon={<CreditCard size={20} />} active={props.payment === 'Cartão'} onClick={() => props.setPayment('Cartão')} />
            <PayButton label="Dinheiro" icon={<Banknote size={20} />} active={props.payment === 'Dinheiro'} onClick={() => props.setPayment('Dinheiro')} />
            <PayButton label="Carteira" icon={<Wallet size={20} />} active={props.payment === 'Carteira'} onClick={() => props.setPayment('Carteira')} />
          </div>
        </div>
      </div>

      <button disabled={!props.cart.length} onClick={() => void props.finishOrder()} className="w-full rounded-lg bg-[#f45f3f] py-3 text-[11px] font-bold text-white transition hover:bg-[#df5132] disabled:cursor-not-allowed disabled:opacity-40">
        Finalizar pedido
      </button>
    </aside>
  );
}

function TableOrderWorkspace(props: ViewProps) {
  const fee = props.data.settings.automaticServiceFee ? props.subtotal * (props.data.settings.serviceFee / 100) : 0;
  const total = props.subtotal + fee;
  const categoryImage = (name: string) => props.data.menuCategories.find(item => item.name === name)?.imageUrl || categoryPhoto(name);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={() => props.setPage('tables')} className="rounded-xl px-3 py-2 text-sm font-semibold text-[#555d62] hover:bg-white">VOLTAR</button>
        <label className="flex h-11 min-w-0 flex-1 items-center rounded-xl border border-[#cfd4d7] bg-white px-4">
          <input value={props.search} readOnly placeholder="Buscar" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          <Search size={18} className="text-[#50585c]" />
        </label>
        <button onClick={() => props.setPage('history')} className="grid h-11 w-11 place-items-center rounded-full text-[#535c60] hover:bg-white"><History size={20} /></button>
        <button onClick={async () => {
          const code = props.table.toUpperCase().replace(/\s+/g, '-');
          const link = window.location.origin + window.location.pathname + '?cliente=' + encodeURIComponent(code);
          try {
            await navigator.clipboard.writeText(link);
            alert('Link do cliente copiado: ' + link);
          } catch {
            window.prompt('Copie o link do cliente:', link);
          }
        }} className="rounded-xl bg-[#eef7fb] px-3 py-2 text-[10px] font-semibold text-[#246486]">Conectar cliente</button>
      </div>

      <div className="grid min-h-[620px] gap-4 xl:grid-cols-[330px_1fr]">
        <aside className="flex flex-col rounded-xl border border-[#e5e7e8] bg-white">
          <div className="border-b px-5 py-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{props.table.toUpperCase()}</h2>
              <span className="text-xs text-slate-400">✎</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {props.cart.length === 0 ? <div className="grid h-full min-h-[220px] place-items-center text-center text-xs text-slate-400">Nenhum item lançado nesta mesa.<br />Clique nos produtos ao lado.</div> : props.cart.map(item => (
              <div key={item.productId} className="mb-2 flex items-center gap-3 rounded-lg border border-[#eef0f1] p-2">
                <div className="h-10 w-10 overflow-hidden rounded-md bg-[#eeeae4]"><img src={productPhoto(props.data.products.find(product => product.id === item.productId) || { id: item.productId, name: item.name, category: '', price: item.price, stock: 0, active: true })} alt={item.name} className="h-full w-full object-cover natural-photo" /></div>
                <div className="min-w-0 flex-1"><b className="block truncate text-[11px]">{item.name}</b><small className="text-[10px] text-slate-400">{BRL(item.price)}</small></div>
                <button onClick={() => props.changeQty(item.productId, -1)} className="grid h-7 w-7 place-items-center rounded border"><Minus size={12} /></button>
                <b className="text-xs">{item.qty}</b>
                <button onClick={() => props.changeQty(item.productId, 1)} className="grid h-7 w-7 place-items-center rounded border"><Plus size={12} /></button>
              </div>
            ))}
          </div>

          <div className="border-t p-4">
            <div className="flex justify-between py-1 text-sm"><b>Subtotal</b><b>{BRL(props.subtotal)}</b></div>
            <div className="flex justify-between py-1 text-xs text-emerald-500"><b>Acréscimo automático</b><b>{props.data.settings.automaticServiceFee ? props.data.settings.serviceFee + ' %' : 'Desativado'}</b></div>
            <div className="mt-2 flex justify-between py-1 text-xl"><b>Total</b><b>{BRL(total)}</b></div>
            <div className="flex justify-between py-1 text-sm"><b>Restante</b><b>{BRL(total)}</b></div>

            <div className="mt-4 grid grid-cols-5 gap-2">
              <QuickIcon icon={<Trash2 size={16} />} />
              <QuickIcon icon={<Percent size={16} />} />
              <QuickIcon icon={<WalletCards size={16} />} />
              <QuickIcon icon={<ReceiptText size={16} />} />
              <QuickIcon icon={<Printer size={16} />} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {props.data.settings.pixEnabled && <button onClick={() => props.setPayment('Pix')} className={'rounded-lg border py-2 text-[9px] font-semibold ' + (props.payment === 'Pix' ? 'border-[#1da878] bg-[#effcf7] text-[#13865f]' : '')}>Pix</button>}
              {props.data.settings.cardEnabled && <button onClick={() => props.setPayment('Cartão')} className={'rounded-lg border py-2 text-[9px] font-semibold ' + (props.payment === 'Cartão' ? 'border-[#1da878] bg-[#effcf7] text-[#13865f]' : '')}>Cartão</button>}
              {props.data.settings.cashEnabled && <button onClick={() => props.setPayment('Dinheiro')} className={'rounded-lg border py-2 text-[9px] font-semibold ' + (props.payment === 'Dinheiro' ? 'border-[#1da878] bg-[#effcf7] text-[#13865f]' : '')}>Dinheiro</button>}
            </div>

            <button className="mt-3 w-full rounded-xl bg-[#7dc8ef] py-4 text-sm font-semibold text-[#175071]">+ Adicionar Pagamento</button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col rounded-xl border border-[#e5e7e8] bg-white p-4">
          <div className="flex gap-2 overflow-x-auto pb-3">
            {props.categories.filter(name => name !== 'Todos').map(name => (
              <button key={name} onClick={() => props.setCategory(name)} className="min-w-[90px] text-center">
                <span className={'mx-auto block h-16 w-16 overflow-hidden rounded-full border-2 bg-[#f1f2f3] ' + (props.category === name ? 'border-[#f45f3f]' : 'border-[#d3d6d8]')}>
                  <img src={categoryImage(name)} alt={name} className="h-full w-full object-cover natural-photo" />
                </span>
                <span className="mt-2 block truncate text-[10px] text-[#4f565a]">{name}</span>
              </button>
            ))}
          </div>

          <div className="h-2 rounded-full bg-[#d7d9da]" />

          <div className="mt-4 grid flex-1 auto-rows-max gap-3 overflow-auto sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {props.products.filter(product => product.active && (!product.channels?.length || product.channels.includes('Mesa'))).map(product => (
              <button key={product.id} onClick={() => props.addProduct(product)} className="overflow-hidden rounded-xl border border-[#edf0f1] bg-white text-left shadow-[0_4px_12px_rgba(32,35,38,0.06)] transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative h-32 bg-[#f4f4f3]"><img src={productPhoto(product)} alt={product.name} className="h-full w-full object-cover natural-photo" />{product.stock <= 5 && <span className="absolute right-2 top-2 rounded-full bg-[#a8a8a8] px-2 py-1 text-[9px] font-bold text-white">!</span>}</div>
                <div className="p-3">
                  <b className="block min-h-8 text-xs">{product.name}</b>
                  <div className="mt-2 border-t pt-2 text-xs">{BRL(product.price)}</div>
                </div>
              </button>
            ))}
          </div>

          <button disabled={!props.cart.length} onClick={() => void props.finishOrder()} className="mt-4 w-full rounded-xl bg-[#7dc8ef] py-4 text-sm font-semibold text-[#175071] disabled:opacity-40">Salvar</button>
        </section>
      </div>
    </div>
  );
}

function MenuBuilderView(props: ViewProps) {
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrTable, setQrTable] = useState(props.data.tables[0]?.name || 'Mesa 01');
  const categories = [...props.data.menuCategories].sort((a, b) => a.order - b.order);
  const lowStock = props.data.products.filter(product => product.stock <= 5).length;
  const lowMargin = props.data.products.filter(product => product.cost && product.price > 0 && ((product.price - product.cost) / product.price) * 100 < 35).length;

  const duplicate = async (product: Product) => {
    await props.run(() => api.post('/api/products', {
      name: product.name + ' (cópia)',
      category: product.category,
      price: product.price,
      stock: product.stock,
      description: product.description,
      cost: product.cost,
      code: product.code ? product.code + '-C' : '',
      featured: false,
      prepTime: product.prepTime,
      channels: product.channels,
      addons: product.addons,
      ingredients: product.ingredients,
      imageUrl: product.imageUrl,
    }), 'Produto duplicado.');
  };

  return (
    <PageSection title="Montar cardápio" subtitle="Categorias, produtos, fotos, canais, complementos e ficha técnica">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Produtos cadastrados" value={String(props.data.products.length)} />
        <Metric label="Categorias" value={String(categories.length)} />
        <Metric label="Estoque crítico" value={String(lowStock)} />
        <Metric label="Margem abaixo de 35%" value={String(lowMargin)} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => { setEditingProduct(null); setProductOpen(true); }} className="flex items-center gap-2 rounded-xl bg-[#f45f3f] px-4 py-3 text-xs font-bold text-white"><Plus size={15} />Novo produto</button>
        <button onClick={() => { setEditingCategory(null); setCategoryOpen(true); }} className="flex items-center gap-2 rounded-xl border border-[#d9dadd] bg-white px-4 py-3 text-xs font-semibold"><Layers3 size={15} />Nova categoria</button>
        <button onClick={() => setQrOpen(true)} className="flex items-center gap-2 rounded-xl border border-[#d9dadd] bg-white px-4 py-3 text-xs font-semibold"><QrCode size={15} />Pré-visualizar QR</button>
        <button className="flex items-center gap-2 rounded-xl border border-[#d9dadd] bg-white px-4 py-3 text-xs font-semibold"><BrainCircuit size={15} />Smart Ops: sugerir margem</button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[250px_1fr]">
        <Surface>
          <SectionHead title="Categorias" subtitle="Ordem e imagem do cardápio" />
          <div className="space-y-2">
            {categories.map(category => (
              <button key={category.id} onClick={() => { setEditingCategory(category); setCategoryOpen(true); }} className="flex w-full items-center gap-3 rounded-lg border border-[#eeece8] p-2 text-left hover:border-[#e3b4a8]">
                <span className="h-10 w-10 overflow-hidden rounded-lg bg-[#efede9]"><img src={category.imageUrl || categoryPhoto(category.name)} alt={category.name} className="h-full w-full object-cover natural-photo" /></span>
                <span className="min-w-0 flex-1"><b className="block truncate text-xs">{category.name}</b><small className="text-[9px] text-slate-400">Ordem {category.order}</small></span>
                <span className={'h-2.5 w-2.5 rounded-full ' + (category.active ? 'bg-emerald-500' : 'bg-slate-300')} />
              </button>
            ))}
          </div>
        </Surface>

        <Surface>
          <div className="mb-4 flex items-end justify-between gap-3"><SectionHead title="Produtos do cardápio" subtitle="Clique em um produto para editar" /><span className="text-[10px] text-slate-400">Fotos próprias, custo, margem e canais</span></div>
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {props.data.products.map(product => {
              const margin = product.cost && product.price > 0 ? ((product.price - product.cost) / product.price) * 100 : null;
              return (
                <article key={product.id} className="overflow-hidden rounded-xl border border-[#ebe7e2] bg-[#fffefa]">
                  <button onClick={() => { setEditingProduct(product); setProductOpen(true); }} className="block w-full text-left">
                    <div className="relative h-36 bg-[#f1efeb]"><img src={productPhoto(product)} alt={product.name} className="h-full w-full object-cover natural-photo" />{product.featured && <span className="absolute left-2 top-2 rounded-full bg-[#f45f3f] px-2 py-1 text-[9px] font-bold text-white">Destaque</span>}{!product.active && <span className="absolute inset-0 grid place-items-center bg-black/40 text-xs font-bold text-white">Inativo</span>}</div>
                    <div className="p-3"><small className="text-[9px] uppercase text-slate-400">{product.category}</small><b className="mt-1 block text-sm">{product.name}</b><div className="mt-2 flex items-center justify-between"><strong className="text-[#ef5a38]">{BRL(product.price)}</strong><span className={'text-[9px] ' + (margin !== null && margin < 35 ? 'text-amber-600' : 'text-emerald-600')}>{margin === null ? 'Custo não informado' : 'Margem ' + margin.toFixed(0) + '%'}</span></div></div>
                  </button>
                  <div className="grid grid-cols-3 border-t">
                    <button onClick={() => { setEditingProduct(product); setProductOpen(true); }} className="py-2 text-[9px] font-semibold">Editar</button>
                    <button onClick={() => void duplicate(product)} className="flex items-center justify-center gap-1 border-x py-2 text-[9px] font-semibold"><Copy size={11} />Copiar</button>
                    <button onClick={() => { if (confirm('Excluir ' + product.name + '?')) void props.run(() => api.delete('/api/products/' + product.id), 'Produto excluído.'); }} className="py-2 text-[9px] font-semibold text-red-500">Excluir</button>
                  </div>
                </article>
              );
            })}
          </div>
        </Surface>
      </div>

      {productOpen && <ProductEditor product={editingProduct} categories={categories} run={props.run} onClose={() => setProductOpen(false)} />}
      {categoryOpen && <CategoryEditor category={editingCategory} run={props.run} onClose={() => setCategoryOpen(false)} />}
      {qrOpen && (() => {
        const link = window.location.origin + '/?cliente=' + encodeURIComponent(qrTable);
        return (
          <Modal title="QR Code do cardápio" onClose={() => setQrOpen(false)}>
            <div className="grid gap-4 md:grid-cols-[220px_1fr]">
              <div className="grid place-items-center rounded-xl border border-[#e5e8ea] bg-white p-4">
                <QRCodeSVG value={link} size={190} level="M" includeMargin title={'QR ' + qrTable} />
              </div>
              <div className="space-y-3">
                <Field label="Mesa">
                  <select value={qrTable} onChange={event => setQrTable(event.target.value)} className="control">
                    {props.data.tables.map(table => <option key={table.id} value={table.name}>{table.name}</option>)}
                  </select>
                </Field>
                <div className="rounded-xl border border-[#d9e8ef] bg-[#eef7fb] p-3 text-[10px] leading-4 text-[#35667d]">Este QR abre diretamente o cardápio e atendimento da mesa selecionada.</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void navigator.clipboard.writeText(link)} className="rounded-xl border border-[#d9dde0] px-4 py-3 text-[10px] font-semibold">Copiar link</button>
                  <button onClick={() => window.open(link, '_blank', 'noopener,noreferrer')} className="rounded-xl bg-[#159fe5] px-4 py-3 text-[10px] font-bold text-white">Testar QR / link</button>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
    </PageSection>
  );
}

function ProductEditor({ product, categories, run, onClose }: { product: Product | null; categories: MenuCategory[]; run: ViewProps['run']; onClose: () => void }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || categories[0]?.name || 'Outros',
    price: product?.price || 0,
    cost: product?.cost || 0,
    stock: product?.stock || 0,
    code: product?.code || '',
    description: product?.description || '',
    prepTime: product?.prepTime || 15,
    featured: product?.featured || false,
    active: product?.active ?? true,
    channels: product?.channels?.length ? product.channels : ['Mesa', 'Balcão', 'Delivery', 'QR/Totem'],
    addonsText: product?.addons?.join(', ') || '',
    ingredientsText: product?.ingredients?.join(', ') || '',
    imageUrl: product?.imageUrl || '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(product?.imageUrl || '');

  const selectPhoto = (selected: File | null) => {
    if (!selected) return;
    if (!selected.type.startsWith('image/')) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const toggleChannel = (channel: string) => {
    setForm(current => ({ ...current, channels: current.channels.includes(channel) ? current.channels.filter(item => item !== channel) : [...current.channels, channel] }));
  };

  const save = async () => {
    if (!form.name.trim() || form.price <= 0) return;
    await run(async () => {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        price: Number(form.price),
        cost: Number(form.cost),
        stock: Number(form.stock),
        code: form.code,
        description: form.description,
        prepTime: Number(form.prepTime),
        featured: form.featured,
        active: form.active,
        channels: form.channels,
        addons: form.addonsText.split(',').map(item => item.trim()).filter(Boolean),
        ingredients: form.ingredientsText.split(',').map(item => item.trim()).filter(Boolean),
        imageUrl: form.imageUrl,
      };
      let id = product?.id;
      if (id) {
        await api.put('/api/products/' + id, payload);
      } else {
        const created = await api.post<Product>('/api/products', payload);
        id = created.data.id;
      }
      if (file && id) {
        const image = await compressImage(file);
        await api.post('/api/products/' + id + '/image', image);
      }
    }, product ? 'Produto atualizado.' : 'Produto cadastrado.');
    onClose();
  };

  return (
    <Modal title={product ? 'Editar produto' : 'Novo produto'} onClose={onClose}>
      <div className="grid max-h-[70vh] gap-3 overflow-auto pr-1 sm:grid-cols-2">
        <Field label="Nome do produto"><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className="control" /></Field>
        <Field label="Categoria"><select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} className="control">{categories.map(category => <option key={category.id}>{category.name}</option>)}<option>Outros</option></select></Field>
        <Field label="Preço de venda"><input type="number" step="0.01" value={form.price} onChange={event => setForm({ ...form, price: Number(event.target.value) })} className="control" /></Field>
        <Field label="Custo"><input type="number" step="0.01" value={form.cost} onChange={event => setForm({ ...form, cost: Number(event.target.value) })} className="control" /></Field>
        <Field label="Estoque"><input type="number" value={form.stock} onChange={event => setForm({ ...form, stock: Number(event.target.value) })} className="control" /></Field>
        <Field label="Código PDV / SKU"><input value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} className="control" /></Field>
        <Field label="Tempo de preparo (min)"><input type="number" value={form.prepTime} onChange={event => setForm({ ...form, prepTime: Number(event.target.value) })} className="control" /></Field>
        <Field label="Imagem por URL (opcional)"><input value={form.imageUrl} onChange={event => { setForm({ ...form, imageUrl: event.target.value }); if (!file) setPreview(event.target.value); }} placeholder="https://..." className="control" /></Field>
        <Field label="Descrição"><textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className="control min-h-20" /></Field>
        <Field label="Foto do produto">
          <div className="grid min-h-[118px] gap-2 rounded-xl border border-[#e4e1dc] bg-[#faf9f6] p-2 sm:grid-cols-[118px_1fr]">
            <div className="grid h-[102px] overflow-hidden rounded-lg border border-[#e8e4de] bg-white place-items-center">
              {preview ? <img src={preview} alt="Pré-visualização do produto" className="h-full w-full object-cover natural-photo" /> : <div className="text-center text-slate-400"><ImagePlus size={24} className="mx-auto" /><span className="mt-1 block text-[9px]">Sem foto</span></div>}
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#d6d2cb] bg-white px-3 py-3 text-center">
              <ImagePlus size={19} className="mb-1 text-[#e45d3e]" />
              <b className="text-[10px] text-[#43484c]">{file ? 'Trocar foto selecionada' : product?.imageUrl ? 'Trocar foto do produto' : 'Escolher foto do produto'}</b>
              <span className="mt-1 max-w-[210px] text-[9px] leading-4 text-slate-400">Selecione uma imagem JPG, PNG ou WebP. A foto será otimizada automaticamente antes de salvar.</span>
              {file && <span className="mt-1 max-w-[220px] truncate text-[9px] font-semibold text-emerald-600">{file.name}</span>}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => selectPhoto(event.target.files?.[0] || null)} />
            </label>
          </div>
        </Field>
        <Field label="Complementos"><textarea value={form.addonsText} onChange={event => setForm({ ...form, addonsText: event.target.value })} placeholder="Bacon, Queijo extra, Molho..." className="control min-h-20" /></Field>
        <Field label="Ficha técnica / insumos"><textarea value={form.ingredientsText} onChange={event => setForm({ ...form, ingredientsText: event.target.value })} placeholder="Pão 1 un, Carne 160g..." className="control min-h-20" /></Field>
      </div>

      <div className="mt-4">
        <span className="text-[10px] font-semibold text-slate-500">Canais disponíveis</span>
        <div className="mt-2 flex flex-wrap gap-2">{['Mesa', 'Balcão', 'Delivery', 'QR/Totem'].map(channel => <button key={channel} onClick={() => toggleChannel(channel)} className={'rounded-full border px-3 py-2 text-[9px] font-semibold ' + (form.channels.includes(channel) ? 'border-[#f45f3f] bg-[#fff2ee] text-[#dd5335]' : '')}>{channel}</button>)}</div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => setForm({ ...form, active: !form.active })} className={'rounded-lg px-3 py-2 text-[10px] font-semibold ' + (form.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{form.active ? 'Produto ativo' : 'Produto inativo'}</button>
        <button onClick={() => setForm({ ...form, featured: !form.featured })} className={'rounded-lg px-3 py-2 text-[10px] font-semibold ' + (form.featured ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-500')}>{form.featured ? 'Em destaque' : 'Sem destaque'}</button>
        {form.cost > 0 && form.price > 0 && <span className="ml-auto rounded-lg bg-[#f7f7f5] px-3 py-2 text-[10px] font-semibold">Margem: {(((form.price - form.cost) / form.price) * 100).toFixed(1)}%</span>}
      </div>

      <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl border px-4 py-3 text-xs">Cancelar</button><button onClick={() => void save()} className="rounded-xl bg-[#f45f3f] px-5 py-3 text-xs font-bold text-white">Salvar produto</button></div>
    </Modal>
  );
}

function CategoryEditor({ category, run, onClose }: { category: MenuCategory | null; run: ViewProps['run']; onClose: () => void }) {
  const [name, setName] = useState(category?.name || '');
  const [order, setOrder] = useState(category?.order || 1);
  const [active, setActive] = useState(category?.active ?? true);
  const [imageUrl, setImageUrl] = useState(category?.imageUrl || '');
  const [file, setFile] = useState<File | null>(null);

  const save = async () => {
    if (!name.trim()) return;
    await run(async () => {
      let id = category?.id;
      const payload = { name: name.trim(), order: Number(order), active, imageUrl };
      if (id) {
        await api.put('/api/menu/categories/' + id, payload);
      } else {
        const created = await api.post<MenuCategory>('/api/menu/categories', payload);
        id = created.data.id;
      }
      if (file && id) {
        const image = await compressImage(file);
        await api.post('/api/menu/categories/' + id + '/image', image);
      }
    }, category ? 'Categoria atualizada.' : 'Categoria cadastrada.');
    onClose();
  };

  return (
    <Modal title={category ? 'Editar categoria' : 'Nova categoria'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nome"><input value={name} onChange={event => setName(event.target.value)} className="control" /></Field>
        <Field label="Ordem"><input type="number" min="1" value={order} onChange={event => setOrder(Number(event.target.value))} className="control" /></Field>
        <Field label="Imagem por URL"><input value={imageUrl} onChange={event => setImageUrl(event.target.value)} className="control" placeholder="https://..." /></Field>
        <Field label="Imagem da categoria"><label className="flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed text-xs text-slate-500"><ImagePlus size={18} />{file ? file.name : 'Selecionar foto'}<input type="file" accept="image/*" className="hidden" onChange={event => setFile(event.target.files?.[0] || null)} /></label></Field>
        <button onClick={() => setActive(!active)} className={'rounded-lg px-3 py-2 text-[10px] font-semibold ' + (active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{active ? 'Categoria ativa' : 'Categoria inativa'}</button>
      </div>
      <div className="mt-5 flex justify-between gap-2">
        {category ? <button onClick={() => { if (confirm('Excluir categoria ' + category.name + '?')) void run(() => api.delete('/api/menu/categories/' + category.id), 'Categoria excluída.').then(onClose); }} className="rounded-xl border border-red-200 px-4 py-3 text-xs text-red-500">Excluir</button> : <span />}
        <div className="flex gap-2"><button onClick={onClose} className="rounded-xl border px-4 py-3 text-xs">Cancelar</button><button onClick={() => void save()} className="rounded-xl bg-[#f45f3f] px-5 py-3 text-xs font-bold text-white">Salvar categoria</button></div>
      </div>
    </Modal>
  );
}

async function compressImage(file: File): Promise<{ content: string; contentType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler imagem'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onerror = () => reject(new Error('Imagem inválida'));
    element.onload = () => resolve(element);
    element.src = dataUrl;
  });

  const max = 1200;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Falha ao processar imagem');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const compressed = canvas.toDataURL('image/jpeg', 0.82);
  return { content: compressed.split(',')[1] || '', contentType: 'image/jpeg' };
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/35 p-4"><div className="w-full max-w-3xl rounded-2xl bg-[#fffefa] p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-bold">{title}</h3><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-sm">×</button></div>{children}</div></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-[10px] font-semibold text-slate-500"><span className="mb-1 block">{label}</span>{children}</label>;
}

function SettingToggle({ icon, title, subtitle, enabled, onClick }: { icon: ReactNode; title: string; subtitle: string; enabled: boolean; onClick: () => void }) {
  return <button onClick={onClick} className="flex w-full items-center gap-3 border-t border-[#f0efec] py-3 text-left first:border-t-0"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fff2ee] text-[#e85b3a]">{icon}</span><span className="min-w-0 flex-1"><b className="block text-xs">{title}</b><small className="text-[9px] text-slate-400">{subtitle}</small></span><span className={'relative h-6 w-11 rounded-full transition ' + (enabled ? 'bg-emerald-500' : 'bg-slate-300')}><span className={'absolute top-1 h-4 w-4 rounded-full bg-white transition ' + (enabled ? 'left-6' : 'left-1')} /></span></button>;
}

function QuickIcon({ icon }: { icon: ReactNode }) {
  return <button className="grid h-12 place-items-center rounded-xl bg-[#f4f5f5] text-[#566066]">{icon}</button>;
}

type CustomerPortalData = {
  store: { restaurantName: string; unit: string; serviceFee: number; automaticServiceFee: boolean };
  table: Table;
  orders: Order[];
  pendingRequests: ServiceRequest[];
  menuCategories: MenuCategory[];
  products: Product[];
};

const normalizeCustomerPortalData = (raw: Partial<CustomerPortalData>, code: string): CustomerPortalData => {
  const tableName = raw.table?.name || decodeURIComponent(code).replace(/-/g, ' ').trim() || 'Mesa';
  const tableStatus = raw.table?.status && ['Livre', 'Ocupada', 'Aguardando', 'Fechamento'].includes(raw.table.status)
    ? raw.table.status
    : 'Livre';
  const serviceFee = Number(raw.store?.serviceFee ?? defaultSettings.serviceFee);

  return {
    store: {
      restaurantName: raw.store?.restaurantName || defaultSettings.restaurantName,
      unit: raw.store?.unit || defaultSettings.unit,
      serviceFee: Number.isFinite(serviceFee) ? serviceFee : defaultSettings.serviceFee,
      automaticServiceFee: raw.store?.automaticServiceFee ?? defaultSettings.automaticServiceFee,
    },
    table: {
      id: raw.table?.id || tableName.toLowerCase().replace(/\s+/g, '-'),
      name: tableName,
      seats: Number(raw.table?.seats ?? 0),
      status: tableStatus,
      total: Number(raw.table?.total ?? 0),
      waiter: raw.table?.waiter,
    },
    orders: Array.isArray(raw.orders) ? raw.orders : [],
    pendingRequests: Array.isArray(raw.pendingRequests) ? raw.pendingRequests : [],
    menuCategories: Array.isArray(raw.menuCategories) ? raw.menuCategories : [],
    products: Array.isArray(raw.products) ? raw.products : [],
  };
};

const loadCustomerMenuFallback = async (data: CustomerPortalData): Promise<CustomerPortalData> => {
  if (data.products.length || data.menuCategories.length) return data;

  try {
    const response = await api.get<Partial<State>>('/api/state');
    const state = response.data;
    const menuCategories = Array.isArray(state.menuCategories)
      ? state.menuCategories
        .filter(category => category.active)
        .sort((a, b) => a.order - b.order)
      : [];
    const products = Array.isArray(state.products)
      ? state.products.filter(product => product.active && (!product.channels?.length || product.channels.includes('Mesa')))
      : [];

    return {
      ...data,
      store: state.settings ? {
        restaurantName: state.settings.restaurantName || data.store.restaurantName,
        unit: state.settings.unit || data.store.unit,
        serviceFee: Number(state.settings.serviceFee ?? data.store.serviceFee),
        automaticServiceFee: state.settings.automaticServiceFee ?? data.store.automaticServiceFee,
      } : data.store,
      menuCategories,
      products,
    };
  } catch {
    return data;
  }
};

function CustomerPortal({ code, session, onLogout }: { code: string; session?: AuthSession | null; onLogout?: () => void }) {
  const [data, setData] = useState<CustomerPortalData | null>(null);
  const [error, setError] = useState('');
  const [requesting, setRequesting] = useState('');
  const [customerCart, setCustomerCart] = useState<Item[]>([]);
  const [customerCategory, setCustomerCategory] = useState('Todos');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderMessage, setOrderMessage] = useState('');
  const customerStorageKey = 'tapfood-customer-' + code.toLowerCase();
  const [customerForm, setCustomerForm] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem(customerStorageKey) || '{}') as { name?: string; phone?: string; email?: string };
    } catch {
      return {};
    }
  });
  const [customerSaved, setCustomerSaved] = useState(() => Boolean(customerForm.name && customerForm.phone));
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerMessage, setCustomerMessage] = useState('');
  const lastStatuses = useRef<Record<string, string>>({});

  const load = async () => {
    try {
      const response = await api.get('/api/customer/table/' + encodeURIComponent(code));
      const payload = response.data && typeof response.data === 'object' ? response.data as Partial<CustomerPortalData> : {};
      const next = await loadCustomerMenuFallback(normalizeCustomerPortalData(payload, code));
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        next.orders.forEach(order => {
          const previous = lastStatuses.current[order.id];
          if (previous && previous !== order.status) {
            new Notification(next.store.restaurantName, { body: order.code + ' agora está: ' + order.status });
          }
          lastStatuses.current[order.id] = order.status;
        });
      } else {
        next.orders.forEach(order => { lastStatuses.current[order.id] = order.status; });
      }
      setData(next);
      setError('');
    } catch {
      setError('Não foi possível localizar esta mesa. Confira o link recebido do estabelecimento.');
    }
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [code]);

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    await Notification.requestPermission();
  };

  const sendRequest = async (type: 'waiter' | 'bill') => {
    setRequesting(type);
    try {
      await api.post('/api/customer/table/' + encodeURIComponent(code) + '/request', { type });
      await load();
    } finally {
      setRequesting('');
    }
  };

  const registerCustomer = async (event: FormEvent) => {
    event.preventDefault();
    setCustomerSaving(true);
    setCustomerMessage('');
    try {
      const payload = {
        name: String(customerForm.name || '').trim(),
        phone: String(customerForm.phone || '').trim(),
        email: String(customerForm.email || '').trim(),
      };
      await api.post('/api/customer/table/' + encodeURIComponent(code) + '/register', payload);
      window.localStorage.setItem(customerStorageKey, JSON.stringify(payload));
      setCustomerSaved(true);
      setCustomerMessage('Cadastro conectado à mesa.');
      await load();
    } catch (err) {
      setCustomerMessage(err instanceof Error ? err.message : 'Não foi possível salvar seus dados.');
    } finally {
      setCustomerSaving(false);
    }
  };

  const addCustomerProduct = (product: Product) => {
    setOrderMessage('');
    setCustomerCart(current => {
      const found = current.find(item => item.productId === product.id);
      if (found) {
        if (found.qty >= product.stock) return current;
        return current.map(item => item.productId === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...current, { productId: product.id, name: product.name, qty: 1, price: product.price }];
    });
  };

  const changeCustomerQty = (productId: string, delta: number) => {
    setOrderMessage('');
    setCustomerCart(current => current.map(item => {
      if (item.productId !== productId) return item;
      const product = data?.products.find(candidate => candidate.id === productId);
      const limit = product?.stock || item.qty;
      return { ...item, qty: Math.min(limit, item.qty + delta) };
    }).filter(item => item.qty > 0));
  };

  const sendCustomerOrder = async () => {
    if (!customerCart.length) return;
    setPlacingOrder(true);
    setOrderMessage('');
    try {
      await api.post('/api/customer/table/' + encodeURIComponent(code) + '/orders', {
        customer: String(customerForm.name || session?.name || 'Cliente da mesa').trim(),
        items: customerCart,
      });
      setCustomerCart([]);
      setCustomerCategory('Todos');
      setOrderMessage('Pedido enviado para a equipe.');
      await load();
    } catch (err) {
      setOrderMessage(err instanceof Error ? err.message : 'Não foi possível enviar o pedido.');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (error) return <div className="grid min-h-screen place-items-center bg-[#f6f5f2] p-6"><div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-lg"><AlertTriangle className="mx-auto text-amber-500" /><h1 className="mt-3 text-lg font-bold">Mesa não encontrada</h1><p className="mt-2 text-sm text-slate-500">{error}</p></div></div>;
  if (!data) return <div className="grid min-h-screen place-items-center bg-[#f6f5f2] text-sm text-slate-400">Conectando à mesa...</div>;

  const current = data.orders[0];
  const statusSteps = ['Novo', 'Preparando', 'Pronto', 'Entregue'];
  const currentIndex = current ? Math.max(0, statusSteps.indexOf(current.status)) : -1;
  const subtotal = data.orders.reduce((sum, order) => sum + order.total, 0);
  const hasWaiter = data.pendingRequests.some(request => request.type === 'waiter');
  const hasBill = data.pendingRequests.some(request => request.type === 'bill');
  const customerCategories = ['Todos', ...Array.from(new Set([
    ...data.menuCategories.filter(item => item.active).sort((a, b) => a.order - b.order).map(item => item.name),
    ...data.products.map(product => product.category),
  ]))];
  const customerProducts = data.products.filter(product => customerCategory === 'Todos' || product.category === customerCategory);
  const orderSubtotal = customerCart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const orderFee = data.store.automaticServiceFee ? orderSubtotal * (data.store.serviceFee / 100) : 0;
  const orderTotal = Number((orderSubtotal + orderFee).toFixed(2));

  return (
    <div className="min-h-screen bg-[#f6f5f2] text-[#2f3136]">
      <header className="border-b bg-[#fffefa] px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f45f3f] text-white"><Utensils size={18} /></span>
          <div className="min-w-0 flex-1"><b className="block truncate">{data.store.restaurantName}</b><small className="text-slate-400">{data.store.unit} · Modo Cliente · acesso limitado</small></div>
          <button onClick={() => void enableNotifications()} className="rounded-xl bg-[#eef7fb] px-3 py-2 text-[10px] font-semibold text-[#276584]"><Bell size={14} className="mr-1 inline" />Notificações</button>
          {onLogout && <button onClick={onLogout} className="grid h-9 w-9 place-items-center rounded-xl border text-slate-500"><LogOut size={15} /></button>}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <div className="rounded-xl border border-[#d9e8ef] bg-[#eef7fb] px-3 py-2 text-[10px] text-[#35667d]"><b>Interface do Cliente:</b> acesso limitado à própria mesa, acompanhamento do pedido, notificações e solicitação de atendimento. Caixa, estoque, relatórios e configurações não aparecem nesta interface.</div>
        <section className="rounded-2xl bg-white p-5 shadow-[0_10px_28px_rgba(46,42,38,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <small className="text-slate-400">Identificação para avisos</small>
              <h2 className="font-bold">{customerSaved ? customerForm.name || session?.name || 'Cliente conectado' : 'Complete seu cadastro'}</h2>
            </div>
            {customerSaved && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">Notificações vinculadas</span>}
          </div>
          {!customerSaved ? (
            <form onSubmit={registerCustomer} className="mt-4 grid gap-3 sm:grid-cols-3">
              <input required value={customerForm.name || ''} onChange={event => setCustomerForm(current => ({ ...current, name: event.target.value }))} placeholder="Nome" className="control" />
              <input required value={customerForm.phone || ''} onChange={event => setCustomerForm(current => ({ ...current, phone: event.target.value }))} placeholder="Telefone" className="control" />
              <input type="email" value={customerForm.email || ''} onChange={event => setCustomerForm(current => ({ ...current, email: event.target.value }))} placeholder="E-mail" className="control" />
              <button disabled={customerSaving} className="rounded-xl bg-[#f45f3f] px-4 py-3 text-xs font-bold text-white sm:col-span-3">{customerSaving ? 'Salvando...' : 'Salvar e receber avisos'}</button>
            </form>
          ) : (
            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[10px] text-emerald-700">Pedido pronto, mudança de status e solicitações da mesa serão enviadas para o fluxo configurado no n8n quando a integração estiver ativa.</div>
          )}
          {customerMessage && <p className="mt-2 text-[10px] text-slate-500">{customerMessage}</p>}
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-[0_10px_28px_rgba(46,42,38,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><small className="text-slate-400">Você está conectado em</small><h1 className="text-2xl font-bold">{data.table.name}</h1></div>
            <span className={'rounded-full px-3 py-1.5 text-[10px] font-bold ' + (data.table.status === 'Livre' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700')}>{data.table.status}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#f7f7f5] p-3"><small className="text-slate-400">Total da mesa</small><b className="mt-1 block text-lg">{BRL(data.table.total || subtotal)}</b></div><div className="rounded-xl bg-[#f7f7f5] p-3"><small className="text-slate-400">Pedidos ativos</small><b className="mt-1 block text-lg">{data.orders.length}</b></div></div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-[0_10px_28px_rgba(46,42,38,0.05)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <small className="text-slate-400">Faça seu pedido</small>
              <h2 className="text-xl font-bold">Cardápio</h2>
            </div>
            <span className="rounded-full bg-[#fff2ee] px-3 py-1.5 text-[10px] font-bold text-[#e85b3a]">{data.products.length} item(ns)</span>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {customerCategories.map(category => (
              <button
                key={category}
                onClick={() => setCustomerCategory(category)}
                className={'whitespace-nowrap rounded-full border px-4 py-2 text-[10px] font-bold ' + (customerCategory === category ? 'border-[#f45f3f] bg-[#fff3ef] text-[#d84f31]' : 'border-[#e5e6ec] text-slate-500')}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-4 divide-y divide-[#f0efec]">
            {customerProducts.map(product => {
              const quantity = customerCart.find(item => item.productId === product.id)?.qty || 0;
              return (
                <div key={product.id} className="grid grid-cols-[76px_1fr_auto] gap-3 py-3">
                  <div className="h-[76px] w-[76px] overflow-hidden rounded-xl bg-[#eeeae4]">
                    <img src={productPhoto(product)} alt={product.name} loading="lazy" className="h-full w-full object-cover natural-photo" />
                  </div>
                  <div className="min-w-0">
                    <b className="block truncate text-sm">{product.name}</b>
                    {product.description && <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-400">{product.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-[#ef5a38]">{BRL(product.price)}</strong>
                      {product.prepTime && <span className="text-[10px] text-slate-400">{product.prepTime} min</span>}
                    </div>
                  </div>
                  <div className="flex w-20 flex-col items-end justify-center gap-2">
                    {quantity > 0 ? (
                      <div className="flex items-center gap-1 rounded-full border border-[#e5e6ec] p-1">
                        <button onClick={() => changeCustomerQty(product.id, -1)} className="grid h-6 w-6 place-items-center rounded-full bg-slate-50 text-slate-500"><Minus size={12} /></button>
                        <b className="w-4 text-center text-xs">{quantity}</b>
                        <button onClick={() => changeCustomerQty(product.id, 1)} className="grid h-6 w-6 place-items-center rounded-full bg-[#fff2ee] text-[#e85b3a]"><Plus size={12} /></button>
                      </div>
                    ) : (
                      <button disabled={product.stock <= 0} onClick={() => addCustomerProduct(product)} className="grid h-9 w-9 place-items-center rounded-full bg-[#f45f3f] text-white disabled:bg-slate-200 disabled:text-slate-400"><Plus size={17} /></button>
                    )}
                    {product.stock <= 0 && <span className="text-[9px] font-bold text-slate-400">Esgotado</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {!customerProducts.length && <div className="mt-4 rounded-xl bg-[#f7f7f5] p-5 text-center text-sm text-slate-400">Nenhum item disponível nesta categoria.</div>}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-[0_10px_28px_rgba(46,42,38,0.05)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <small className="text-slate-400">Itens selecionados</small>
              <h2 className="font-bold">Seu pedido</h2>
            </div>
            <b className="text-lg text-[#ef5a38]">{BRL(orderTotal)}</b>
          </div>
          <div className="mt-4 space-y-3">
            {customerCart.map(item => (
              <div key={item.productId} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-xs">{item.qty}x {item.name}</b>
                  <small className="text-[10px] text-slate-400">{BRL(item.price * item.qty)}</small>
                </div>
                <button onClick={() => changeCustomerQty(item.productId, -1)} className="grid h-7 w-7 place-items-center rounded-lg border border-[#e5e6ec]"><Minus size={12} /></button>
                <button onClick={() => changeCustomerQty(item.productId, 1)} className="grid h-7 w-7 place-items-center rounded-lg border border-[#e5e6ec]"><Plus size={12} /></button>
                <button onClick={() => setCustomerCart(current => current.filter(cartItem => cartItem.productId !== item.productId))} className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            ))}
            {!customerCart.length && <div className="rounded-xl border border-dashed border-[#d9dbe3] p-5 text-center text-xs text-slate-400">Escolha itens do cardápio para montar seu pedido.</div>}
          </div>
          {!!customerCart.length && (
            <div className="mt-4 rounded-xl bg-[#f7f7f5] p-3 text-xs">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><b>{BRL(orderSubtotal)}</b></div>
              {data.store.automaticServiceFee && <div className="mt-2 flex justify-between text-slate-500"><span>Serviço</span><b>{BRL(orderFee)}</b></div>}
              <div className="mt-3 flex justify-between border-t pt-3 font-bold"><span>Total</span><span>{BRL(orderTotal)}</span></div>
            </div>
          )}
          {orderMessage && <p className="mt-3 text-xs text-slate-500">{orderMessage}</p>}
          <button disabled={!customerCart.length || placingOrder} onClick={() => void sendCustomerOrder()} className="mt-4 w-full rounded-xl bg-[#f45f3f] px-4 py-4 text-sm font-bold text-white disabled:opacity-50">{placingOrder ? 'Enviando...' : 'Enviar pedido'}</button>
        </section>

        {current ? (
          <section className="rounded-2xl bg-white p-5">
            <div className="flex items-center justify-between gap-3"><div><small className="text-slate-400">Último pedido</small><h2 className="font-bold">{current.code}</h2></div><Badge value={current.status} /></div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {statusSteps.map((step, index) => <div key={step} className="text-center"><span className={'mx-auto grid h-8 w-8 place-items-center rounded-full text-[10px] font-bold ' + (index <= currentIndex ? 'bg-[#f45f3f] text-white' : 'bg-slate-100 text-slate-400')}>{index < currentIndex ? '✓' : index + 1}</span><small className="mt-1 block text-[9px] text-slate-500">{step}</small></div>)}
            </div>
            <div className="mt-5 border-t pt-3">{current.items.map((item, index) => <div key={index} className="flex justify-between py-2 text-xs"><span>{item.qty}x {item.name}</span><b>{BRL(item.price * item.qty)}</b></div>)}</div>
          </section>
        ) : <section className="rounded-2xl bg-white p-5 text-center text-sm text-slate-400">Ainda não há pedido ativo nesta mesa.</section>}

        <section className="rounded-2xl bg-white p-5">
          <h2 className="font-bold">Precisa de atendimento?</h2>
          <p className="mt-1 text-xs text-slate-400">A equipe recebe a solicitação diretamente na tela de Mesas.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button disabled={hasWaiter || requesting === 'waiter'} onClick={() => void sendRequest('waiter')} className="rounded-xl bg-[#f5c84b] px-4 py-4 text-sm font-bold text-[#5f4700] disabled:opacity-60">{hasWaiter ? 'Garçom já solicitado' : 'Chamar garçom'}</button>
            <button disabled={hasBill || requesting === 'bill'} onClick={() => void sendRequest('bill')} className="rounded-xl bg-[#f45f63] px-4 py-4 text-sm font-bold text-white disabled:opacity-60">{hasBill ? 'Conta já solicitada' : 'Solicitar a conta'}</button>
          </div>
        </section>

        <p className="pb-6 text-center text-[10px] text-slate-400">Atualização automática a cada 5 segundos. Ative as notificações para ser avisado quando o pedido mudar de etapa.</p>
      </main>

      <AiAssistant mode="customer" table={data.table.name} />
    </div>
  );
}

type AssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type QaStatus = 'pass' | 'warn' | 'fail';

type QaCheck = {
  id: string;
  module: string;
  status: QaStatus;
  title: string;
  detail: string;
};

type QaReport = {
  scope: string;
  generatedAt: string;
  summary: { pass: number; warn: number; fail: number; total: number };
  checks: QaCheck[];
};

function AiAssistant({ mode, page, table }: { mode: 'establishment' | 'customer'; page?: Page; table?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [qaMode, setQaMode] = useState(false);
  const [qaRunning, setQaRunning] = useState(false);
  const [qaReport, setQaReport] = useState<QaReport | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      content: mode === 'customer'
        ? 'Olá! Posso ajudar com seu pedido, status da mesa, notificações, chamar o garçom ou solicitar a conta.'
        : 'Olá! Sou a Central TAPFOOD. Posso orientar sobre os módulos e executar testes de diagnóstico no modo Testar Sistema.',
    },
  ]);

  const quickQuestions = mode === 'customer'
    ? ['Como acompanho meu pedido?', 'Como chamo o garçom?', 'Como solicito a conta?']
    : ['Como abrir uma mesa?', 'Como abrir ou fechar o caixa?', 'Como cadastrar produto com foto?'];

  const ask = async (question?: string) => {
    const text = (question || input).trim();
    if (!text || sending) return;

    const nextMessages: AssistantMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const response = await api.post<{ answer?: string }>('/api/assistant', {
        mode,
        message: text,
        page,
        table,
        history: nextMessages.slice(-8),
      });

      setMessages(current => [
        ...current,
        {
          role: 'assistant',
          content: String(response.data?.answer || 'Não consegui gerar uma orientação agora. Tente novamente.'),
        },
      ]);
    } catch {
      setMessages(current => [
        ...current,
        {
          role: 'assistant',
          content: 'O assistente está temporariamente indisponível. Você pode continuar usando o sistema normalmente e tentar novamente em instantes.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const runQa = async (scope: 'quick' | 'operation' | 'integrations' | 'customer' | 'api' | 'full') => {
    if (qaRunning) return;
    setQaRunning(true);
    try {
      const response = await api.post('/api/qa/run', { scope });
      setQaReport(response.data as QaReport);
    } catch {
      setQaReport({
        scope,
        generatedAt: new Date().toISOString(),
        summary: { pass: 0, warn: 0, fail: 1, total: 1 },
        checks: [{
          id: 'qa-endpoint',
          module: 'Testes/QA',
          status: 'fail',
          title: 'Não foi possível executar o diagnóstico',
          detail: 'O endpoint de testes não respondeu. O sistema operacional não foi alterado.',
        }],
      });
    } finally {
      setQaRunning(false);
    }
  };

  return (
    <>
      {open && (
        <section className="fixed bottom-[78px] right-3 z-[75] flex max-h-[min(590px,calc(100vh-105px))] w-[min(390px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border border-[#e6e2dc] bg-[#fffefa] shadow-[0_22px_65px_rgba(38,35,32,.22)] sm:right-4">
          <header className="flex items-center gap-3 border-b border-[#eeeae4] bg-white px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff0eb] text-[#e85b3a]"><BrainCircuit size={18} /></span>
            <div className="min-w-0 flex-1">
              <b className="block text-xs">Central TAPFOOD</b>
              <small className="block truncate text-[9px] text-slate-400">{mode === 'customer' ? 'Ajuda ao cliente · acesso limitado' : qaMode ? 'Testes / QA · somente leitura' : 'Suporte operacional · estabelecimento'}</small>
            </div>
            <button aria-label="Fechar assistente" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
          </header>

          {mode === 'establishment' && (
            <div className="grid grid-cols-2 gap-1 border-b border-[#eeeae4] bg-white p-2">
              <button onClick={() => setQaMode(false)} className={'rounded-lg py-2 text-[9px] font-bold ' + (!qaMode ? 'bg-[#202538] text-white' : 'text-slate-500 hover:bg-slate-50')}>Ajuda</button>
              <button onClick={() => setQaMode(true)} className={'flex items-center justify-center gap-1 rounded-lg py-2 text-[9px] font-bold ' + (qaMode ? 'bg-[#f45f3f] text-white' : 'text-slate-500 hover:bg-slate-50')}><ShieldCheck size={13} />Testar Sistema</button>
            </div>
          )}

          {!qaMode || mode === 'customer' ? (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {messages.map((message, index) => (
                  <div key={index} className={'flex ' + (message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={'max-w-[88%] rounded-2xl px-3 py-2 text-[10px] leading-4 ' + (message.role === 'user' ? 'rounded-br-md bg-[#f45f3f] text-white' : 'rounded-bl-md border border-[#ece8e2] bg-white text-[#454a4d]')}>
                      {message.content}
                    </div>
                  </div>
                ))}
                {sending && <div className="w-fit rounded-2xl rounded-bl-md border border-[#ece8e2] bg-white px-3 py-2 text-[10px] text-slate-400">Pensando...</div>}
              </div>

              {messages.length <= 2 && (
                <div className="flex gap-1.5 overflow-x-auto border-t border-[#f1eee9] px-3 py-2">
                  {quickQuestions.map(question => (
                    <button key={question} disabled={sending} onClick={() => void ask(question)} className="whitespace-nowrap rounded-full border border-[#e8e3dd] bg-white px-2.5 py-1.5 text-[8px] font-semibold text-[#5c6266] hover:border-[#f0a08d] hover:text-[#dc5739]">{question}</button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2 border-t border-[#eeeae4] bg-white p-3">
                <textarea
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void ask();
                    }
                  }}
                  rows={1}
                  placeholder={mode === 'customer' ? 'Dúvida sobre seu pedido...' : 'Como posso usar o TAPFOOD?'}
                  className="max-h-24 min-h-10 flex-1 resize-none rounded-xl border border-[#dfdcd6] bg-[#faf9f7] px-3 py-2.5 text-[10px] outline-none focus:border-[#e99b88]"
                />
                <button aria-label="Enviar mensagem" disabled={!input.trim() || sending} onClick={() => void ask()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f45f3f] text-white disabled:opacity-40"><Send size={15} /></button>
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-[#eeeae4] bg-[#fffdf9] p-3">
                <div className="rounded-xl border border-[#d9e8ef] bg-[#eef7fb] p-3 text-[9px] leading-4 text-[#35667d]">
                  <b>Diagnóstico seguro:</b> os testes são somente leitura. Nenhum pedido, caixa, estoque, cliente ou configuração é alterado.
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  <button onClick={() => void runQa('quick')} disabled={qaRunning} className="rounded-lg border bg-white px-2 py-2 text-[8px] font-bold">Teste rápido</button>
                  <button onClick={() => void runQa('operation')} disabled={qaRunning} className="rounded-lg border bg-white px-2 py-2 text-[8px] font-bold">Operação</button>
                  <button onClick={() => void runQa('integrations')} disabled={qaRunning} className="rounded-lg border bg-white px-2 py-2 text-[8px] font-bold">Integrações</button>
                  <button onClick={() => void runQa('customer')} disabled={qaRunning} className="rounded-lg border bg-white px-2 py-2 text-[8px] font-bold">Modo Cliente</button>
                  <button onClick={() => void runQa('api')} disabled={qaRunning} className="rounded-lg border bg-white px-2 py-2 text-[8px] font-bold">API Aberta</button>
                  <button onClick={() => void runQa('full')} disabled={qaRunning} className="rounded-lg bg-[#202538] px-2 py-2 text-[8px] font-bold text-white">Teste completo</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {qaRunning && <div className="grid min-h-40 place-items-center text-center"><div><RefreshCw size={20} className="mx-auto animate-spin text-[#f45f3f]" /><b className="mt-2 block text-xs">Executando diagnóstico...</b><small className="text-[9px] text-slate-400">Verificando os módulos sem alterar os dados.</small></div></div>}

                {!qaRunning && !qaReport && <div className="grid min-h-44 place-items-center text-center"><div><ShieldCheck size={28} className="mx-auto text-emerald-500" /><b className="mt-2 block text-xs">Pronto para testar</b><p className="mt-1 max-w-[280px] text-[9px] leading-4 text-slate-400">Escolha uma área ou execute o Teste completo para verificar toda a operação.</p></div></div>}

                {!qaRunning && qaReport && (
                  <div>
                    <div className="grid grid-cols-3 gap-2">
                      <QaSummaryCard label="Aprovado" value={qaReport.summary.pass} status="pass" />
                      <QaSummaryCard label="Atenção" value={qaReport.summary.warn} status="warn" />
                      <QaSummaryCard label="Erro" value={qaReport.summary.fail} status="fail" />
                    </div>
                    <div className="mt-3 space-y-2">
                      {qaReport.checks.map(check => <QaCheckCard key={check.id} check={check} />)}
                    </div>
                    <p className="mt-3 text-center text-[8px] text-slate-400">Diagnóstico: {new Date(qaReport.generatedAt).toLocaleString('pt-BR')} · {qaReport.summary.total} verificação(ões)</p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      <button
        aria-label={open ? 'Fechar Central TAPFOOD' : 'Abrir Central TAPFOOD'}
        onClick={() => setOpen(value => !value)}
        className="fixed bottom-4 right-3 z-[76] flex h-12 items-center gap-2 rounded-full bg-[#202538] px-3.5 text-white shadow-[0_12px_30px_rgba(32,37,56,.28)] transition hover:-translate-y-0.5 sm:right-4"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f45f3f]"><BrainCircuit size={15} /></span>
        <span className="hidden pr-1 text-[9px] font-bold sm:block">{mode === 'establishment' ? 'Suporte / Testes' : 'Ajuda TAPFOOD'}</span>
      </button>
    </>
  );
}

function QaSummaryCard({ label, value, status }: { label: string; value: number; status: QaStatus }) {
  const theme = status === 'pass' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : status === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700';
  return <div className={'rounded-xl border p-2 text-center ' + theme}><b className="block text-lg">{value}</b><small className="text-[8px] font-semibold">{label}</small></div>;
}

function QaCheckCard({ check }: { check: QaCheck }) {
  const theme = check.status === 'pass'
    ? { box: 'border-emerald-100 bg-emerald-50/60', icon: 'bg-emerald-100 text-emerald-700', symbol: '✓' }
    : check.status === 'warn'
      ? { box: 'border-amber-100 bg-amber-50/60', icon: 'bg-amber-100 text-amber-700', symbol: '!' }
      : { box: 'border-red-100 bg-red-50/60', icon: 'bg-red-100 text-red-700', symbol: '×' };

  return <div className={'rounded-xl border p-3 ' + theme.box}><div className="flex items-start gap-2"><span className={'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ' + theme.icon}>{theme.symbol}</span><span className="min-w-0 flex-1"><small className="block text-[8px] font-bold uppercase tracking-wide text-slate-400">{check.module}</small><b className="mt-0.5 block text-[10px]">{check.title}</b><p className="mt-1 text-[9px] leading-4 text-slate-500">{check.detail}</p></span></div></div>;
}

function PayButton({ label, icon, active, onClick }: { label: string; icon: ReactNode; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={'flex h-14 items-center justify-center gap-2 rounded-lg border text-[9px] font-bold ' + (active ? 'border-[#f45f3f] bg-[#fff3ef] text-[#e85b3a]' : 'border-[#ececf2] bg-white text-[#51586c]')}>{icon}{label}</button>;
}

function TablesView(props: ViewProps) {
  const pendingFor = (tableName: string) => props.data.serviceRequests.filter(request => request.table === tableName && request.status === 'pending');

  const statusTheme = (status: Table['status']) => {
    if (status === 'Ocupada') return {
      panel: 'border-[#12a35a] bg-[#baf2d3]',
      badge: 'bg-white/80 text-[#087a42]',
      label: 'Aberta',
    };
    if (status === 'Aguardando' || status === 'Fechamento') return {
      panel: 'border-[#7052ca] bg-[#e5e0fa]',
      badge: 'bg-white/80 text-[#5c40b5]',
      label: 'Em atendimento',
    };
    return {
      panel: 'border-[#899195] bg-[#e6e8e9]',
      badge: 'bg-white/80 text-[#32383b]',
      label: 'Livre',
    };
  };

  const copyCustomerLink = async (tableName: string) => {
    const code = tableName.toUpperCase().replace(/\s+/g, '-');
    const link = window.location.origin + window.location.pathname + '?cliente=' + encodeURIComponent(code);
    try {
      await navigator.clipboard.writeText(link);
      alert('Link do cliente copiado: ' + link);
    } catch {
      window.prompt('Copie o link do cliente:', link);
    }
  };

  const callWaiter = async (tableName: string) => {
    const code = tableName.toUpperCase().replace(/\s+/g, '-');
    await props.run(() => api.post('/api/customer/table/' + encodeURIComponent(code) + '/request', { type: 'waiter' }), 'Garçom chamado para ' + tableName + '.');
  };

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-[#e3e5e6] pb-4">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold text-[#282d31]">Início</h1>
          <p className="mt-1 text-xs text-slate-400">Mesas, balcão e atendimento presencial em tempo real.</p>
        </div>
        <button onClick={() => props.setPage('dashboard')} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#596166] hover:bg-white"><BarChart3 size={16} />Dashboard</button>
        <button onClick={() => props.setPage('menu')} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#596166] hover:bg-white"><QrCode size={16} />Cardápio QR Code</button>
        <button onClick={() => props.setPage('history')} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#596166] hover:bg-white"><History size={16} />Histórico</button>
        <button onClick={() => props.setPage('settings')} className="flex items-center gap-2 rounded-xl bg-[#79e7b1] px-4 py-3 text-xs font-semibold text-[#16653f] shadow-sm"><Store size={16} />Totem de Autoatendimento</button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex h-12 min-w-[260px] max-w-[420px] flex-1 items-center gap-2 rounded-xl border border-[#cfd4d7] bg-white px-4">
          <Search size={18} className="text-[#4d565b]" />
          <span className="text-sm text-slate-400">Alertas do cliente aparecem em vermelho</span>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[9px] font-bold text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Atualização a cada 5s</div>
        <button onClick={() => props.setPage('settings')} className="flex h-12 items-center gap-2 rounded-xl bg-[#e4e6e7] px-5 text-xs font-semibold text-[#0e5f93]"><Settings size={16} />Configuração geral</button>
      </div>

      <div className="operational-scroll grid max-h-[calc(100vh-315px)] min-h-[320px] gap-3 overflow-y-auto pr-2 sm:grid-cols-2 xl:grid-cols-4">
        <button onClick={() => {
          props.setChannel('Balcão');
          props.setTable('');
          props.setPage('pdv');
        }} className="min-h-[154px] rounded-xl border-4 border-[#12a35a] bg-[#baf2d3] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-[#087a42]"><ShoppingBag size={14} />Aberta</span>
          <strong className="mt-5 block text-sm text-[#174d36]">BALCÃO</strong>
          <div className="mt-2 flex items-center justify-between text-xs text-[#147849]"><span>{BRL(0)}</span><span className="flex items-center gap-1"><Clock3 size={14} />Sempre aberto</span></div>
        </button>

        {props.data.tables.map((table, index) => {
          const theme = statusTheme(table.status);
          const requests = pendingFor(table.name);
          const hasAlert = requests.length > 0;
          const waiterPending = requests.some(request => request.type === 'waiter');
          return (
            <div
              key={table.id}
              role="button"
              tabIndex={0}
              onClick={() => props.openTableOrder(table.name)}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') props.openTableOrder(table.name); }}
              className={'relative min-h-[154px] cursor-pointer rounded-xl border-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ' + (hasAlert ? 'border-red-500 bg-red-100 shadow-[0_12px_28px_rgba(239,68,68,.16)]' : theme.panel)}
            >
              {hasAlert && <span className="absolute right-3 top-3 h-3 w-3 animate-pulse rounded-full bg-red-500 shadow-[0_0_0_5px_rgba(239,68,68,.12)]" />}
              <div className="flex items-start justify-between gap-2 pr-5">
                <span className={'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold ' + (hasAlert ? 'bg-red-600 text-white' : theme.badge)}>
                  {hasAlert ? <Bell size={14} /> : table.status === 'Livre' ? <Check size={14} /> : <Utensils size={14} />}
                  {hasAlert ? (waiterPending ? 'Garçom solicitado' : 'Conta solicitada') : theme.label}
                </span>
              </div>

              <strong className={'mt-4 block text-sm ' + (hasAlert ? 'text-red-800' : '')}>{table.name.toUpperCase()}</strong>
              <div className={'mt-2 flex items-center justify-between text-xs ' + (hasAlert ? 'text-red-700' : '')}>
                <span>{BRL(table.total)}</span>
                {table.status !== 'Livre' && <span className="flex items-center gap-1"><Clock3 size={14} />{index % 3 === 0 ? '4 Minutos' : index % 3 === 1 ? '11 Horas' : '12 Horas'}</span>}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={event => { event.stopPropagation(); void callWaiter(table.name); }} disabled={waiterPending} className={'rounded-lg px-2 py-2 text-[9px] font-bold ' + (waiterPending ? 'bg-red-600 text-white' : 'bg-white/80 text-[#50575c]')}><Bell size={12} className="mr-1 inline" />{waiterPending ? 'Garçom chamado' : 'Chamar garçom'}</button>
                <button onClick={event => { event.stopPropagation(); void copyCustomerLink(table.name); }} className="rounded-lg bg-white/80 px-2 py-2 text-[9px] font-semibold text-[#465057]">Link cliente</button>
              </div>

              {requests.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {requests.map(request => (
                    <button
                      key={request.id}
                      onClick={event => {
                        event.stopPropagation();
                        void props.run(() => api.put('/api/service-requests/' + request.id + '/resolve', {}), request.type === 'bill' ? 'Solicitação de conta atendida.' : 'Chamada de garçom atendida.');
                      }}
                      className="flex w-full items-center justify-between rounded-lg bg-red-600 px-3 py-2 text-[9px] font-bold text-white"
                    >
                      <span>{request.type === 'bill' ? 'Conta solicitada' : 'Garçom solicitado'}</span>
                      <span>Atender</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HistoryView(props: ViewProps) {
  const [tab, setTab] = useState<'sales' | 'payments' | 'moves'>('sales');
  const [query, setQuery] = useState('');
  const cash = props.data.cashRegister;
  const salesTotal = props.data.orders.filter(order => order.status !== 'Cancelado').reduce((sum, order) => sum + order.total, 0);
  const manualEntries = props.data.transactions.filter(tx => tx.type === 'Entrada' && tx.category !== 'Vendas').reduce((sum, tx) => sum + tx.amount, 0);
  const exits = props.data.transactions.filter(tx => tx.type === 'Saída').reduce((sum, tx) => sum + tx.amount, 0);

  const addMovement = async (type: 'Entrada' | 'Saída') => {
    const description = window.prompt(type === 'Entrada' ? 'Descrição da entrada' : 'Descrição da saída');
    if (!description) return;
    const amount = Number(window.prompt('Valor') || 0);
    if (amount <= 0) return;
    await props.run(() => api.post('/api/transactions', { description, type, amount, category: 'Caixa' }), type === 'Entrada' ? 'Entrada adicionada ao caixa.' : 'Saída adicionada ao caixa.');
  };

  const toggleCash = async () => {
    if (cash.status === 'Aberto') {
      if (!confirm('Deseja fechar o caixa agora?')) return;
      await props.run(() => api.post('/api/cash/close', {}), 'Caixa fechado.');
      return;
    }
    const openingAmount = Number(window.prompt('Valor de abertura do caixa') || 0);
    await props.run(() => api.post('/api/cash/open', { openingAmount }), 'Caixa aberto.');
  };

  const filteredOrders = props.data.orders.filter(order => {
    const target = [order.customer, order.code, order.channel, order.paymentMethod, order.table].filter(Boolean).join(' ').toLowerCase();
    return !query || target.includes(query.toLowerCase());
  });

  const payments = Array.from(new Set(props.data.orders.map(order => order.paymentMethod || 'Não informado'))).map(method => ({
    method,
    count: props.data.orders.filter(order => (order.paymentMethod || 'Não informado') === method).length,
    total: props.data.orders.filter(order => (order.paymentMethod || 'Não informado') === method).reduce((sum, order) => sum + order.total, 0),
  }));

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-[#efefef] bg-white p-6 shadow-[0_6px_24px_rgba(30,34,38,0.025)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#202326]">Resumo do Caixa</h1>
            <span className={'rounded-full px-2.5 py-1 text-[10px] font-bold ' + (cash.status === 'Aberto' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>● {cash.status}</span>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#159fe5]"><Printer size={17} />Imprimir</button>
          <button onClick={() => void addMovement('Entrada')} className="flex items-center gap-2 rounded-lg bg-[#f4f4f4] px-4 py-3 text-xs font-semibold text-emerald-600"><Plus size={16} />Adicionar entrada</button>
          <button onClick={() => void addMovement('Saída')} className="flex items-center gap-2 rounded-lg bg-[#f4f4f4] px-4 py-3 text-xs font-semibold text-rose-500"><Plus size={16} />Adicionar Saída</button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CashCard title="Vendas" value={salesTotal} />
          <CashCard title="Valor de abertura" value={cash.openingAmount} />
          <CashCard title="Entradas" value={manualEntries} positive />
          <CashCard title="Saídas" value={exits} negative />
        </div>

        <div className="mt-6 border-t pt-6">
          <button onClick={() => void toggleCash()} className={'w-full rounded-lg py-3.5 text-sm font-bold text-white ' + (cash.status === 'Aberto' ? 'bg-[#ff5a5f]' : 'bg-emerald-500')}>
            {cash.status === 'Aberto' ? '▣ Quero fechar meu Caixa' : '+ Abrir meu Caixa'}
          </button>
          {cash.status === 'Fechado' && cash.closingAmount !== undefined && <p className="mt-2 text-center text-[10px] text-slate-400">Último fechamento: {BRL(cash.closingAmount)}</p>}
        </div>
      </div>

      <div className="rounded-xl border border-[#efefef] bg-white p-6">
        <h2 className="text-xl font-bold">Relatório de vendas</h2>
        <div className="mt-6 flex gap-5 overflow-x-auto border-b">
          <button onClick={() => setTab('sales')} className={'pb-3 text-sm font-semibold ' + (tab === 'sales' ? 'border-b-2 border-[#1eb0e8] text-[#159fe5]' : 'text-[#778087]')}>Vendas</button>
          <button onClick={() => setTab('payments')} className={'pb-3 text-sm font-semibold ' + (tab === 'payments' ? 'border-b-2 border-[#1eb0e8] text-[#159fe5]' : 'text-[#778087]')}>Vendas por Formas de Pagamento</button>
          <button onClick={() => setTab('moves')} className={'pb-3 text-sm font-semibold ' + (tab === 'moves' ? 'border-b-2 border-[#1eb0e8] text-[#159fe5]' : 'text-[#778087]')}>Movimentações</button>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <label className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-[#cfd4d7] px-4">
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por forma de pagamento ou valor..." className="min-w-0 flex-1 text-xs outline-none" />
            <Search size={17} className="text-[#596166]" />
          </label>
          <button className="flex h-11 items-center gap-1 rounded-lg border border-[#9fa7ad] px-3 text-[10px] font-semibold text-[#697178]">Filtrar <SlidersHorizontal size={14} /></button>
        </div>

        {tab === 'sales' && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-[10px]">
              <thead className="border-b text-[#6d757b]"><tr><th className="py-3">Cliente</th><th>Data</th><th>Canal</th><th>Forma de pagamento</th><th>Valor</th><th>Vendido por</th><th>Ver detalhes</th></tr></thead>
              <tbody>{filteredOrders.map(order => (
                <tr key={order.id} className="border-b border-[#f0f1f2]">
                  <td className="py-3 font-semibold">{order.customer || 'Cliente balcão'}</td>
                  <td>{new Date(order.createdAt).toLocaleString('pt-BR')}</td>
                  <td>{order.channel}{order.table ? ' · ' + order.table : ''}</td>
                  <td>{order.paymentMethod || 'Não informado'}</td>
                  <td className="font-bold">{BRL(order.total)}</td>
                  <td>Equipe</td>
                  <td><button onClick={() => alert(order.items.map(item => item.qty + 'x ' + item.name).join('\n'))} className="text-[#159fe5]">Detalhes</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {tab === 'payments' && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {payments.map(item => <div key={item.method} className="rounded-xl border border-[#eceef0] p-4"><span className="text-[10px] text-slate-400">{item.method}</span><b className="mt-2 block text-lg">{BRL(item.total)}</b><small className="text-[9px] text-slate-400">{item.count} venda(s)</small></div>)}
          </div>
        )}

        {tab === 'moves' && (
          <div className="mt-4">
            {props.data.transactions.filter(tx => !query || (tx.description + ' ' + tx.category + ' ' + tx.amount).toLowerCase().includes(query.toLowerCase())).map(tx => (
              <DataRow key={tx.id}>
                <span className={'grid h-9 w-9 place-items-center rounded-lg ' + (tx.type === 'Entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}><WalletCards size={16} /></span>
                <span className="flex-1"><b className="block text-xs">{tx.description}</b><small className="text-[9px] text-slate-400">{tx.category} · {tx.date}</small></span>
                <b className={'text-xs ' + (tx.type === 'Entrada' ? 'text-emerald-600' : 'text-red-500')}>{tx.type === 'Entrada' ? '+' : '-'} {BRL(tx.amount)}</b>
              </DataRow>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#efefef] bg-white p-6">
        <SectionHead title="Histórico operacional" subtitle="Ações recentes em mesas, pedidos, caixa e atendimento ao cliente." />
        <div className="space-y-1">
          {props.data.auditLog.slice(0, 30).map(event => (
            <div key={event.id} className="flex items-center gap-3 border-t py-3 first:border-t-0">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#eef7fb] text-[#1b91c8]"><History size={14} /></span>
              <span className="min-w-0 flex-1"><b className="block text-[10px]">{event.action}</b><small className="block truncate text-[9px] text-slate-400">{event.detail}</small></span>
              <span className="text-right"><b className="block text-[9px] text-[#45515a]">{event.user}</b><small className="text-[9px] text-slate-400">{new Date(event.createdAt).toLocaleString('pt-BR')}</small></span>
            </div>
          ))}
          {props.data.auditLog.length === 0 && <p className="text-xs text-slate-400">Nenhuma movimentação registrada ainda.</p>}
        </div>
      </div>
    </section>
  );
}

function CashCard({ title, value, positive, negative }: { title: string; value: number; positive?: boolean; negative?: boolean }) {
  return <div className="rounded-lg border border-[#dfe3e5] p-4"><div className="flex items-center gap-2"><b className="text-sm">{title}</b><span className="grid h-4 w-4 place-items-center rounded-full border text-[9px] text-slate-400">i</span></div><strong className={'mt-3 block text-xs ' + (positive ? 'text-emerald-600' : negative ? 'text-rose-500' : 'text-[#62686d]')}>{BRL(value)}</strong></div>;
}

function KdsView(props: ViewProps) {
  return (
    <PageSection title="Cozinha / KDS" subtitle="Fluxo de produção dos pedidos">
      <div className="grid gap-4 lg:grid-cols-3">
        {['Novo', 'Preparando', 'Pronto'].map(status => (
          <section key={status} className="min-h-[480px] rounded-xl bg-[#ebecef] p-3">
            <div className="mb-3 flex items-center justify-between"><strong className="text-sm">{status}</strong><span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold">{props.data.orders.filter(order => order.status === status).length}</span></div>
            <div className="space-y-3">
              {props.data.orders.filter(order => order.status === status).map(order => (
                <article key={order.id} className="rounded-xl bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between"><b className="text-xs">{order.code}</b><small className="text-[9px] text-slate-400">{order.channel}</small></div>
                  <div className="my-3 border-y border-[#f0f0f4] py-2">{order.items.map((item, index) => <p key={index} className="text-[10px]"><b>{item.qty}x</b> {item.name}</p>)}</div>
                  <div className="flex items-center justify-between">
                    <b className="text-xs">{BRL(order.total)}</b>
                    <button onClick={() => void props.run(
                      () => api.put('/api/orders/' + order.id + '/status', { status: status === 'Novo' ? 'Preparando' : status === 'Preparando' ? 'Pronto' : 'Entregue' }),
                      'Pedido atualizado.'
                    )} className="rounded-lg bg-[#f45f3f] px-3 py-2 text-[9px] font-bold text-white">
                      {status === 'Novo' ? 'Iniciar' : status === 'Preparando' ? 'Marcar pronto' : 'Entregar'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageSection>
  );
}

function DeliveryView(props: ViewProps) {
  return (
    <PageSection title="Delivery" subtitle="Pedidos de entrega e retirada">
      <Surface>
        {props.data.orders.filter(order => order.channel === 'Delivery').map(order => (
          <DataRow key={order.id}>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fff2ee] text-[#ef5a38]"><Bike size={17} /></span>
            <span className="min-w-0 flex-1"><b className="block text-xs">{order.code} · {order.customer}</b><small className="text-[10px] text-slate-400">{order.items.length} item(ns) · {order.paymentMethod || 'Pagamento não informado'}</small></span>
            <b className="text-xs">{BRL(order.total)}</b><Badge value={order.status} />
          </DataRow>
        ))}
      </Surface>
    </PageSection>
  );
}

function ProductsView(props: ViewProps) {
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [quickUploadOpen, setQuickUploadOpen] = useState(false);
  const [quickUploadProductId, setQuickUploadProductId] = useState(props.data.products[0]?.id || '');
  const [quickUploadFile, setQuickUploadFile] = useState<File | null>(null);
  const [quickUploadPreview, setQuickUploadPreview] = useState('');
  const categories = [...props.data.menuCategories].sort((a, b) => a.order - b.order);

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductOpen(true);
  };

  const openQuickUpload = () => {
    const first = props.data.products[0];
    setQuickUploadProductId(first?.id || '');
    setQuickUploadFile(null);
    setQuickUploadPreview(first ? productPhoto(first) : '');
    setQuickUploadOpen(true);
  };

  const selectQuickUploadProduct = (id: string) => {
    setQuickUploadProductId(id);
    const selected = props.data.products.find(product => product.id === id);
    if (!quickUploadFile) setQuickUploadPreview(selected ? productPhoto(selected) : '');
  };

  const selectQuickUploadFile = (file: File | null) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }
    setQuickUploadFile(file);
    const url = URL.createObjectURL(file);
    setQuickUploadPreview(url);
  };

  const saveQuickUpload = async () => {
    if (!quickUploadProductId || !quickUploadFile) return;
    const image = await compressImage(quickUploadFile);
    await props.run(() => api.post('/api/products/' + quickUploadProductId + '/image', image), 'Foto do produto atualizada.');
    setQuickUploadOpen(false);
    setQuickUploadFile(null);
  };

  return (
    <PageSection title="Produtos" subtitle="Catálogo comercial do restaurante" action="Novo produto" onAction={openNewProduct}>
      <Surface>
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-[#f0f0f4] pb-3">
          <div>
            <b className="block text-xs">Produtos cadastrados</b>
            <small className="text-[10px] text-slate-400">Cadastre o produto com foto, preço, estoque e demais informações do cardápio.</small>
          </div>
          <button type="button" onClick={openQuickUpload} className="hidden items-center gap-1 rounded-full bg-[#fff2ee] px-3 py-1.5 text-[9px] font-semibold text-[#df5536] transition hover:bg-[#ffe6df] sm:flex"><ImagePlus size={13} />Upload de foto disponível</button>
        </div>

        {props.data.products.filter(product => !props.search || product.name.toLowerCase().includes(props.search.toLowerCase())).map(product => (
          <DataRow key={product.id}>
            <button onClick={() => openEditProduct(product)} className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#ece9e4] bg-[#eeeae4]">
              <img src={productPhoto(product)} alt={product.name} loading="lazy" className="h-full w-full object-cover natural-photo" />
            </button>
            <button onClick={() => openEditProduct(product)} className="min-w-0 flex-1 text-left">
              <b className="block truncate text-xs">{product.name}</b>
              <small className="block truncate text-[10px] text-slate-400">{product.category}{product.imagePath ? ' · Foto própria' : product.imageUrl ? ' · Foto configurada' : ''}</small>
            </button>
            <span className="hidden text-[10px] text-slate-500 sm:inline">{product.stock} un</span>
            <b className="text-xs text-[#ef5a38]">{BRL(product.price)}</b>
            <button onClick={() => openEditProduct(product)} className="rounded-lg border border-[#e7e4df] px-3 py-2 text-[9px] font-semibold text-[#555d62]">Editar</button>
            <button onClick={() => { if (confirm('Excluir ' + product.name + '?')) void props.run(() => api.delete('/api/products/' + product.id), 'Produto excluído.'); }} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
          </DataRow>
        ))}
      </Surface>

      {productOpen && <ProductEditor product={editingProduct} categories={categories} run={props.run} onClose={() => setProductOpen(false)} />}

      {quickUploadOpen && (
        <Modal title="Upload rápido de foto" onClose={() => setQuickUploadOpen(false)}>
          <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
            <div className="grid min-h-[160px] place-items-center overflow-hidden rounded-xl border border-[#e8e4de] bg-[#faf9f6]">
              {quickUploadPreview
                ? <img src={quickUploadPreview} alt="Pré-visualização" className="h-40 w-full object-cover natural-photo" />
                : <div className="text-center text-slate-400"><ImagePlus size={28} className="mx-auto" /><span className="mt-2 block text-[10px]">Selecione uma foto</span></div>}
            </div>
            <div className="space-y-3">
              <Field label="Produto">
                <select value={quickUploadProductId} onChange={event => selectQuickUploadProduct(event.target.value)} className="control">
                  {props.data.products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
              </Field>
              <Field label="Foto">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#d6d2cb] bg-white px-4 py-4 text-[10px] font-semibold text-[#555d62]">
                  <ImagePlus size={18} className="text-[#e45d3e]" />
                  {quickUploadFile ? quickUploadFile.name : 'Escolher JPG, PNG ou WebP'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => selectQuickUploadFile(event.target.files?.[0] || null)} />
                </label>
              </Field>
              <div className="rounded-xl border border-[#d9e8ef] bg-[#eef7fb] p-3 text-[10px] leading-4 text-[#35667d]">
                A foto será otimizada automaticamente e substituirá somente a imagem do produto selecionado.
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setQuickUploadOpen(false)} className="rounded-xl border px-4 py-3 text-xs">Cancelar</button>
            <button disabled={!quickUploadProductId || !quickUploadFile} onClick={() => void saveQuickUpload()} className="rounded-xl bg-[#f45f3f] px-5 py-3 text-xs font-bold text-white disabled:opacity-40">Enviar foto</button>
          </div>
        </Modal>
      )}
    </PageSection>
  );
}

function StockView(props: ViewProps) {
  const adjust = async (item: Stock) => {
    const delta = Number(prompt('Quantidade a adicionar (use valor negativo para saída)') || 0);
    if (!delta) return;
    await props.run(() => api.post('/api/stock/' + item.id + '/adjust', { delta }), 'Estoque atualizado.');
  };
  return (
    <PageSection title="Estoque" subtitle="Controle de insumos, mínimos e reposição">
      <Surface>
        {props.data.stock.map(item => (
          <DataRow key={item.id}>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fff2ee] text-[#ef5a38]"><Boxes size={16} /></span>
            <span className="flex-1"><b className="block text-xs">{item.name}</b><small className="text-[10px] text-slate-400">Custo {BRL(item.cost)} / {item.unit}</small></span>
            <span className="text-[10px]">{item.current} {item.unit}</span>
            <span className="text-[10px] text-slate-400">Mín. {item.minimum}</span>
            <Badge value={item.current <= item.minimum ? 'Repor' : 'Ativo'} />
            <button onClick={() => void adjust(item)} className="rounded-lg bg-[#f45f3f] px-3 py-2 text-[9px] font-bold text-white">Movimentar</button>
          </DataRow>
        ))}
      </Surface>
    </PageSection>
  );
}

function FinanceView(props: ViewProps) {
  const income = props.data.transactions.filter(tx => tx.type === 'Entrada').reduce((sum, tx) => sum + tx.amount, 0);
  const expense = props.data.transactions.filter(tx => tx.type === 'Saída').reduce((sum, tx) => sum + tx.amount, 0);
  const create = async () => {
    const description = prompt('Descrição do lançamento');
    if (!description) return;
    const type = confirm('OK para ENTRADA. Cancelar para SAÍDA.') ? 'Entrada' : 'Saída';
    const amount = Number(prompt('Valor') || 0);
    if (amount <= 0) return;    await props.run(() => api.post('/api/transactions', { description, type, amount, category: type === 'Entrada' ? 'Receitas' : 'Despesas' }), 'Lançamento financeiro criado.');
  };
  return (
    <PageSection title="Financeiro" subtitle="Fluxo de caixa e movimentações" action="Novo lançamento" onAction={create}>
      <div className="mb-4 grid gap-3 sm:grid-cols-3"><Metric label="Entradas" value={BRL(income)} /><Metric label="Saídas" value={BRL(expense)} /><Metric label="Saldo" value={BRL(income - expense)} /></div>
      <Surface>
        {props.data.transactions.map(tx => (
          <DataRow key={tx.id}><span className={'grid h-9 w-9 place-items-center rounded-lg ' + (tx.type === 'Entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500')}><WalletCards size={16} /></span><span className="flex-1"><b className="block text-xs">{tx.description}</b><small className="text-[10px] text-slate-400">{tx.category} · {tx.date}</small></span><b className={'text-xs ' + (tx.type === 'Entrada' ? 'text-emerald-600' : 'text-red-500')}>{tx.type === 'Entrada' ? '+' : '-'} {BRL(tx.amount)}</b></DataRow>
        ))}
      </Surface>
    </PageSection>
  );
}

function CustomersView(props: ViewProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const create = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    await props.run(() => api.post('/api/customers', form), 'Cliente cadastrado e notificação enviada.');
    setForm({ name: '', phone: '', email: '' });
    setOpen(false);
  };
  return (
    <PageSection title="Clientes / CRM" subtitle="Base de clientes e relacionamento" action="Novo cliente" onAction={() => setOpen(true)}>
      <Surface>
        {props.data.customers.filter(customer => !props.search || (customer.name + ' ' + customer.phone).toLowerCase().includes(props.search.toLowerCase())).map(customer => (
          <DataRow key={customer.id}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff2ee] text-[10px] font-bold text-[#e85b3a]">{customer.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span>
            <span className="flex-1"><b className="block text-xs">{customer.name}</b><small className="text-[10px] text-slate-400">{customer.phone}{customer.email ? ' · ' + customer.email : ''}</small></span>
            <span className="text-[10px] text-slate-500">{customer.orders} pedidos</span><b className="text-xs">{BRL(customer.totalSpent)}</b>
          </DataRow>
        ))}
      </Surface>
      {open && (
        <Modal title="Novo cliente" onClose={() => setOpen(false)}>
          <div className="grid gap-3">
            <Field label="Nome"><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className="control" /></Field>
            <Field label="Telefone"><input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} className="control" /></Field>
            <Field label="E-mail"><input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className="control" /></Field>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="rounded-xl border border-[#d9dde0] px-4 py-3 text-[10px] font-semibold">Cancelar</button>
            <button onClick={() => void create()} className="rounded-xl bg-[#f45f3f] px-5 py-3 text-[10px] font-bold text-white">Salvar cliente</button>
          </div>
        </Modal>
      )}
    </PageSection>
  );
}

function ReportsView(props: ViewProps) {
  const average = props.data.orders.reduce((sum, order) => sum + order.total, 0) / Math.max(1, props.data.orders.length);
  return (
    <PageSection title="Relatórios" subtitle="Indicadores da operação">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Faturamento" value={BRL(props.sales)} /><Metric label="Pedidos ativos" value={String(props.activeOrders)} /><Metric label="Ticket médio" value={BRL(average)} /><Metric label="Clientes" value={String(props.data.customers.length)} /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Surface><SectionHead title="Produtos em destaque" subtitle="Ranking do catálogo" />{props.data.products.slice(0, 5).map((product, index) => <DataRow key={product.id}><b className="w-7 text-xs text-[#ef5a38]">#{index + 1}</b><span className="flex-1 text-xs">{product.name}</span><Star size={13} className="text-[#f6b62f]" fill="#f6b62f" /></DataRow>)}</Surface>
        <Surface><SectionHead title="Resumo operacional" subtitle="Performance do restaurante" /><div className="grid grid-cols-2 gap-3"><MiniStat label="Tempo preparo" value="14m 32s" /><MiniStat label="Cancelamentos" value="1,8%" /><MiniStat label="Recorrência" value="42%" /><MiniStat label="Avaliação" value="4,8 / 5" /></div></Surface>
      </div>
    </PageSection>
  );
}


type IntegrationState = {
  id: string;
  enabled: boolean;
  status: 'Ativo' | 'Configurado' | 'Aguardando credenciais' | 'Inativo' | 'Erro';
  fields: Record<string, string>;
  updatedAt?: string;
  message?: string;
};

type OpenApiKeyInfo = {
  id: string;
  name: string;
  prefix: string;
  active: boolean;
  createdAt: string;
};

type CompanyInfo = {
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

type PlatformUserInfo = {
  id: string;
  companyId: string;
  companyName?: string;
  name: string;
  email: string;
  role: 'Administrador' | 'Gestor' | 'Operador';
  status: 'Ativo' | 'Inativo';
  createdAt: string;
  updatedAt: string;
};

type SettingsSection = 'hub' | 'general' | 'integrations' | 'payments' | 'delivery' | 'access' | 'marketing' | 'print' | 'tools' | 'open-api' | 'companies' | 'qr';

const integrationCatalog = [
  { id: 'n8n', name: 'n8n / WhatsApp', category: 'Automação', description: 'Webhook para avisar cliente e operação sobre cadastro, mesa, pedido pronto e mudança de status.', badge: 'Webhook', icon: MessageCircle },
  { id: 'pix-auto', name: 'Pix Automático', category: 'Pagamentos', description: 'Estrutura para recebimento e conciliação automática de pagamentos via Pix.', badge: 'Provedor externo', icon: QrCode },
  { id: 'ifood', name: 'iFood', category: 'Marketplaces', description: 'Centralize pedidos, códigos PDV e sincronização operacional do marketplace.', badge: 'Autorização oficial', icon: ShoppingBag },
  { id: '99food', name: '99Food', category: 'Marketplaces', description: 'Receba pedidos da loja 99Food no gestor e concentre a operação.', badge: 'Autorização oficial', icon: Bike },
  { id: 'keeta', name: 'Keeta', category: 'Marketplaces', description: 'Conector de pedidos e identificação da loja Keeta.', badge: 'Autorização oficial', icon: Truck },
  { id: 'wallet-pay', name: 'Apple e Google Pay', category: 'Pagamentos', description: 'Preparação para carteiras digitais em pagamentos compatíveis.', badge: 'Provedor externo', icon: Smartphone },
  { id: 'pos', name: 'Maquininha POS', category: 'Pagamentos', description: 'Configuração de terminal e integração de pagamentos presenciais.', badge: 'Provedor externo', icon: CreditCard },
  { id: 'totem', name: 'Totem', category: 'Operação', description: 'Autoatendimento conectado ao cardápio e ao fluxo do estabelecimento.', badge: 'Nativo', icon: Store },
  { id: 'zapturbo', name: 'ZapTurbo', category: 'Performance', description: 'Base de automação para campanhas e relacionamento via WhatsApp.', badge: 'Conector', icon: Megaphone },
  { id: 'boletim', name: 'Boletim', category: 'Performance', description: 'Resumo operacional e indicadores preparados para envio ao WhatsApp.', badge: 'Conector', icon: MessageCircle },
  { id: 'kds', name: 'KDS', category: 'Operação', description: 'Painel de cozinha em tempo real integrado aos pedidos.', badge: 'Nativo', icon: ChefHat },
  { id: 'driver-app', name: 'App do Entregador', category: 'Logística', description: 'Estrutura de operação para entregadores e acompanhamento de rotas.', badge: 'Conector', icon: Bike },
  { id: 'foody-delivery', name: 'Foody Delivery', category: 'Logística', description: 'Conector para solicitação e acompanhamento de entregas terceirizadas.', badge: 'Provedor externo', icon: Truck },
  { id: 'meta-capi', name: 'API de Conversões', category: 'Performance', description: 'Preparação para eventos server-side de campanhas Meta.', badge: 'Credencial necessária', icon: BarChart3 },
  { id: 'custom-domain', name: 'Domínio Próprio', category: 'Performance', description: 'Configuração do domínio personalizado do cardápio e atendimento.', badge: 'Configuração DNS', icon: Globe2 },
  { id: 'google-analytics', name: 'Google Analytics', category: 'Performance', description: 'Cadastro do ID GA4 para mensuração do cardápio digital.', badge: 'Configurável', icon: BarChart3 },
  { id: 'google-tag-manager', name: 'Google Tag Manager', category: 'Performance', description: 'Cadastro do container GTM para governança de tags e eventos.', badge: 'Configurável', icon: Code2 },
  { id: 'facebook-pixel', name: 'Facebook Pixel', category: 'Performance', description: 'Cadastro do Pixel ID para rastreamento do cardápio digital.', badge: 'Configurável', icon: BadgePercent },
  { id: 'open-api', name: 'API Aberta + Webhooks', category: 'Operação', description: 'API REST própria para integrar cardápio, mesas e pedidos com sistemas externos.', badge: 'Nativo', icon: KeyRound },
] as const;

function SettingsView(props: ViewProps) {
  const [section, setSection] = useState<SettingsSection>('hub');
  const [filter, setFilter] = useState('Todas');
  const [integrations, setIntegrations] = useState<IntegrationState[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [integrationFields, setIntegrationFields] = useState<Record<string, string>>({});
  const [integrationMessage, setIntegrationMessage] = useState('');
  const [integrationBusy, setIntegrationBusy] = useState(false);
  const [apiKeys, setApiKeys] = useState<OpenApiKeyInfo[]>([]);
  const [newApiKey, setNewApiKey] = useState('');
  const [apiKeyName, setApiKeyName] = useState('Integração principal');
  const [printMessage, setPrintMessage] = useState('');
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyInfo | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', document: '', email: '', phone: '', contactName: '', plan: '', status: 'Ativa' as CompanyInfo['status'] });
  const [settingsQrTable, setSettingsQrTable] = useState(props.data.tables[0]?.name || 'Mesa 01');
  const [platformUsers, setPlatformUsers] = useState<PlatformUserInfo[]>([]);
  const [userOpen, setUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<PlatformUserInfo | null>(null);
  const [userForm, setUserForm] = useState({
    companyId: '',
    name: '',
    email: '',
    password: '',
    role: 'Operador' as PlatformUserInfo['role'],
    status: 'Ativo' as PlatformUserInfo['status'],
  });

  const saveGeneral = async () => {
    if (!props.settingsForm.restaurantName.trim() || !props.settingsForm.unit.trim()) return;
    await props.run(() => api.put('/api/settings', props.settingsForm), 'Configurações salvas.');
  };

  const toggle = (key: keyof AppSettings) => {
    const current = props.settingsForm[key];
    if (typeof current !== 'boolean') return;
    props.setSettingsForm({ ...props.settingsForm, [key]: !current });
  };

  const loadIntegrations = async () => {
    const response = await api.get('/api/integrations');
    setIntegrations(response.data as IntegrationState[]);
  };

  const loadApiKeys = async () => {
    const response = await api.get('/api/open/v1/keys');
    setApiKeys(response.data as OpenApiKeyInfo[]);
  };

  const loadCompanies = async () => {
    const response = await api.get('/api/companies');
    setCompanies(response.data as CompanyInfo[]);
  };

  const loadPlatformUsers = async () => {
    const response = await api.get('/api/platform-users');
    setPlatformUsers(response.data as PlatformUserInfo[]);
  };

  const openUser = (user?: PlatformUserInfo, companyId?: string) => {
    setEditingUser(user || null);
    setUserForm(user ? {
      companyId: user.companyId,
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      status: user.status,
    } : {
      companyId: companyId || companies[0]?.id || '',
      name: '',
      email: '',
      password: '',
      role: 'Operador',
      status: 'Ativo',
    });
    setUserOpen(true);
  };

  const savePlatformUser = async () => {
    if (!userForm.companyId || !userForm.name.trim() || !userForm.email.trim()) return;
    if (!editingUser && userForm.password.length < 6) {
      alert('Informe uma senha com pelo menos 6 caracteres.');
      return;
    }
    const payload = { ...userForm, password: userForm.password || undefined };
    if (editingUser) await api.put('/api/platform-users/' + editingUser.id, payload);
    else await api.post('/api/platform-users', payload);
    setUserOpen(false);
    await loadPlatformUsers();
  };

  const deletePlatformUser = async (user: PlatformUserInfo) => {
    if (!confirm('Excluir o acesso de ' + user.name + '?')) return;
    await api.delete('/api/platform-users/' + user.id);
    await loadPlatformUsers();
  };

  const openCompany = (company?: CompanyInfo) => {
    setEditingCompany(company || null);
    setCompanyForm(company ? {
      name: company.name,
      document: company.document || '',
      email: company.email || '',
      phone: company.phone || '',
      contactName: company.contactName || '',
      plan: company.plan || '',
      status: company.status,
    } : { name: '', document: '', email: '', phone: '', contactName: '', plan: '', status: 'Ativa' });
    setCompanyOpen(true);
  };

  const saveCompany = async () => {
    if (!companyForm.name.trim()) return;
    if (editingCompany) await api.put('/api/companies/' + editingCompany.id, companyForm);
    else await api.post('/api/companies', companyForm);
    setCompanyOpen(false);
    await loadCompanies();
  };

  const deleteCompany = async (company: CompanyInfo) => {
    if (!confirm('Excluir a empresa ' + company.name + '?')) return;
    await api.delete('/api/companies/' + company.id);
    await loadCompanies();
  };

  useEffect(() => {
    if (section === 'integrations' || section === 'open-api') {
      void loadIntegrations().catch(() => setIntegrationMessage('Não foi possível carregar as integrações.'));
    }
    if (section === 'open-api') {
      void loadApiKeys().catch(() => setIntegrationMessage('Não foi possível carregar as chaves da API.'));
    }
    if (section === 'companies' || section === 'access') {
      void loadCompanies().catch(() => setIntegrationMessage('Não foi possível carregar as empresas.'));
    }
    if (section === 'access') {
      void loadPlatformUsers().catch(() => setIntegrationMessage('Não foi possível carregar os usuários.'));
    }
  }, [section]);

  const openIntegration = (id: string) => {
    if (id === 'open-api') {
      setSection('open-api');
      setSelectedIntegration(null);
      return;
    }
    const saved = integrations.find(item => item.id === id);
    setIntegrationFields(saved?.fields || {});
    setIntegrationMessage(saved?.message || '');
    setSelectedIntegration(id);
  };

  const fieldSpec = (id: string) => {
    const commonStore = [{ key: 'storeId', label: 'ID da loja / estabelecimento', placeholder: 'Informe o ID fornecido pelo parceiro' }];
    if (id === 'n8n') return [{ key: 'webhookUrl', label: 'Webhook n8n', placeholder: 'https://seu-n8n/webhook/tapfood' }, { key: 'whatsappNumber', label: 'WhatsApp da operação', placeholder: '55DDDNUMERO' }];
    if (id === 'ifood') return [...commonStore, { key: 'merchantId', label: 'Merchant ID', placeholder: 'ID comercial do iFood' }, { key: 'syncMode', label: 'Sincronização', placeholder: 'Pedidos, status, cardápio' }];
    if (id === '99food' || id === 'keeta') return commonStore;
    if (id === 'google-analytics') return [{ key: 'measurementId', label: 'ID de mensuração GA4', placeholder: 'G-XXXXXXXXXX' }];
    if (id === 'google-tag-manager') return [{ key: 'containerId', label: 'Container ID', placeholder: 'GTM-XXXXXXX' }];
    if (id === 'facebook-pixel') return [{ key: 'pixelId', label: 'Pixel ID', placeholder: '123456789012345' }];
    if (id === 'meta-capi') return [{ key: 'pixelId', label: 'Pixel ID', placeholder: '123456789012345' }, { key: 'datasetId', label: 'Dataset ID', placeholder: 'Opcional' }];
    if (id === 'custom-domain') return [{ key: 'domain', label: 'Domínio', placeholder: 'cardapio.seudominio.com.br' }];
    if (id === 'pos') return [{ key: 'terminalId', label: 'ID do terminal', placeholder: 'Terminal / serial' }, { key: 'provider', label: 'Adquirente', placeholder: 'Nome do provedor' }];
    if (id === 'pix-auto') return [{ key: 'merchantDocument', label: 'CNPJ do estabelecimento', placeholder: '00.000.000/0000-00' }, { key: 'provider', label: 'Provedor', placeholder: 'Banco / PSP' }];
    if (id === 'wallet-pay') return [{ key: 'merchantId', label: 'Merchant ID', placeholder: 'Identificador do estabelecimento' }];
    if (id === 'zapturbo' || id === 'boletim') return [{ key: 'whatsappNumber', label: 'WhatsApp da operação', placeholder: '55DDDNUMERO' }];
    if (id === 'driver-app' || id === 'foody-delivery') return [{ key: 'operationName', label: 'Identificação da operação', placeholder: 'Nome / ID da frota' }];
    if (id === 'totem') return [{ key: 'stationName', label: 'Identificação do Totem', placeholder: 'Totem entrada' }];
    if (id === 'kds') return [{ key: 'stationName', label: 'Estação KDS', placeholder: 'Cozinha principal' }];
    return [];
  };

  const saveIntegration = async () => {
    if (!selectedIntegration) return;
    setIntegrationBusy(true);
    setIntegrationMessage('');
    try {
      const response = await api.put('/api/integrations/' + selectedIntegration, { fields: integrationFields });
      const saved = response.data as IntegrationState;
      setIntegrationMessage(saved.message || 'Configuração salva.');
      await loadIntegrations();
    } catch {
      setIntegrationMessage('Não foi possível salvar a configuração.');
    } finally {
      setIntegrationBusy(false);
    }
  };

  const testIntegration = async () => {
    if (!selectedIntegration) return;
    setIntegrationBusy(true);
    setIntegrationMessage('');
    try {
      const response = await api.post<{ message?: string }>('/api/integrations/' + selectedIntegration + '/test', {});
      setIntegrationMessage(String(response.data?.message || 'Teste concluído.'));
      await loadIntegrations();
    } catch {
      setIntegrationMessage('Não foi possível testar a integração.');
    } finally {
      setIntegrationBusy(false);
    }
  };

  const createApiKey = async () => {
    if (!apiKeyName.trim()) return;
    const response = await api.post<{ key?: string }>('/api/open/v1/keys', { name: apiKeyName.trim() });
    setNewApiKey(String(response.data?.key || ''));
    await loadApiKeys();
  };

  const revokeApiKey = async (id: string) => {
    if (!confirm('Revogar esta chave da API?')) return;
    await api.delete('/api/open/v1/keys/' + id);
    await loadApiKeys();
  };

  const testPrinter = async (station: string) => {
    setPrintMessage('');
    try {
      const response = await api.post<{ message?: string }>('/api/printers/test', { station });
      setPrintMessage(String(response.data?.message || 'Teste enviado.'));
    } catch {
      setPrintMessage('Não foi possível executar o teste de impressão.');
    }
  };

  const routeTile = (target: Page) => () => props.setPage(target);
  const showHub = () => setSection('hub');

  if (section === 'integrations') {
    const visible = integrationCatalog.filter(item => filter === 'Todas' || item.category === filter);
    return (
      <section>
        <SettingsBack title="Integrações" onBack={showHub} subtitle="Conectores, performance, operação e API aberta" />
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {['Todas', 'Automação', 'Marketplaces', 'Pagamentos', 'Operação', 'Logística', 'Performance'].map(category => (
            <button key={category} onClick={() => setFilter(category)} className={'whitespace-nowrap rounded-full border px-4 py-2 text-[10px] font-semibold ' + (filter === category ? 'border-[#159fe5] bg-[#eef8fd] text-[#107db2]' : 'border-[#d9dde0] bg-white text-[#586066]')}>{category}</button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {visible.map(item => {
            const Icon = item.icon;
            const state = integrations.find(integration => integration.id === item.id);
            return (
              <button key={item.id} onClick={() => openIntegration(item.id)} className="min-h-[220px] rounded-xl border border-[#e1e4e6] bg-white p-5 text-left shadow-[0_5px_18px_rgba(26,35,40,.035)] transition hover:-translate-y-0.5 hover:border-[#b9dff2] hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef8fd] text-[#159fe5]"><Icon size={22} /></span>
                  {state?.status === 'Ativo' && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700">● Ativa</span>}
                </div>
                <h3 className="mt-4 text-sm font-bold">{item.name}</h3>
                <p className="mt-2 min-h-[48px] text-[10px] leading-4 text-slate-500">{item.description}</p>
                <div className="mt-4 flex items-center justify-between border-t pt-3"><span className="text-[9px] text-slate-400">{state?.status || item.badge}</span><span className="text-[#159fe5]">›</span></div>
              </button>
            );
          })}
        </div>

        {selectedIntegration && (() => {
          const spec = integrationCatalog.find(item => item.id === selectedIntegration);
          if (!spec) return null;
          const Icon = spec.icon;
          const state = integrations.find(item => item.id === selectedIntegration);
          return (
            <Modal title={'Configurar ' + spec.name} onClose={() => { setSelectedIntegration(null); setIntegrationMessage(''); }}>
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#e5e9eb] bg-[#f8fbfc] p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8f6fc] text-[#159fe5]"><Icon size={20} /></span>
                <div><b className="text-xs">{spec.name}</b><p className="mt-1 text-[9px] leading-4 text-slate-500">{spec.description}</p><span className="mt-1 inline-block text-[8px] font-semibold text-[#607078]">Status: {state?.status || 'Inativo'}</span></div>
              </div>

              <div className="space-y-3">
                {fieldSpec(selectedIntegration).map(field => (
                  <Field key={field.key} label={field.label}>
                    <input value={integrationFields[field.key] || ''} onChange={event => setIntegrationFields(current => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} className="control" />
                  </Field>
                ))}
                {fieldSpec(selectedIntegration).length === 0 && <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[10px] text-emerald-700">Este módulo usa a infraestrutura nativa do sistema e não exige campos adicionais.</div>}
                {['ifood','99food','keeta','pix-auto','wallet-pay','pos','foody-delivery','meta-capi','zapturbo','boletim'].includes(selectedIntegration) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[9px] leading-4 text-amber-800">Credenciais, tokens e autorizações oficiais do parceiro não são armazenados neste formulário. O conector só será marcado como ativo depois que a autorização oficial estiver disponível no backend seguro.</div>
                )}
                {integrationMessage && <div className="rounded-xl border border-[#d9e8ef] bg-[#eef7fb] p-3 text-[10px] text-[#35667d]">{integrationMessage}</div>}
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button onClick={() => void testIntegration()} disabled={integrationBusy} className="flex items-center gap-2 rounded-xl border border-[#d9dde0] px-4 py-3 text-[10px] font-semibold"><RefreshCw size={13} />Testar conexão</button>
                <button onClick={() => void saveIntegration()} disabled={integrationBusy} className="rounded-xl bg-[#159fe5] px-5 py-3 text-[10px] font-bold text-white">Salvar configuração</button>
              </div>
            </Modal>
          );
        })()}
      </section>
    );
  }

  if (section === 'open-api') {
    const origin = apiBaseUrl || window.location.origin;
    return (
      <section>
        <SettingsBack title="API Aberta + Webhooks" onBack={() => setSection('integrations')} subtitle="Integre sistemas externos ao TAPFOOD" />
        <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
          <Surface>
            <SectionHead title="Chaves de API" subtitle="A chave completa é exibida somente no momento da criação." />
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={apiKeyName} onChange={event => setApiKeyName(event.target.value)} className="control flex-1" placeholder="Nome da integração" />
              <button onClick={() => void createApiKey()} className="rounded-xl bg-[#159fe5] px-4 py-3 text-[10px] font-bold text-white">Gerar chave API</button>
            </div>
            {newApiKey && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <b className="text-[10px] text-amber-800">Copie agora — esta chave não será exibida novamente.</b>
                <div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 text-[9px]">{newApiKey}</code><button onClick={() => void navigator.clipboard.writeText(newApiKey)} className="rounded-lg bg-[#202538] px-3 text-[9px] font-bold text-white">Copiar</button></div>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {apiKeys.map(key => <div key={key.id} className="flex items-center gap-3 rounded-xl border border-[#ece9e4] p-3"><KeyRound size={15} className="text-[#159fe5]" /><span className="min-w-0 flex-1"><b className="block text-[10px]">{key.name}</b><small className="text-[8px] text-slate-400">{key.prefix}•••• · criada em {new Date(key.createdAt).toLocaleString('pt-BR')}</small></span><button onClick={() => void revokeApiKey(key.id)} className="text-[9px] font-semibold text-red-500">Revogar</button></div>)}
              {apiKeys.length === 0 && <p className="text-[10px] text-slate-400">Nenhuma chave criada.</p>}
            </div>
          </Surface>

          <Surface>
            <SectionHead title="Endpoints REST" subtitle="Envie a chave no header x-api-key." />
            <ApiEndpoint method="GET" path={origin + '/api/open/v1/health'} note="Saúde da API" />
            <ApiEndpoint method="GET" path={origin + '/api/open/v1/menu'} note="Cardápio ativo" />
            <ApiEndpoint method="GET" path={origin + '/api/open/v1/tables'} note="Mesas e status" />
            <ApiEndpoint method="GET" path={origin + '/api/open/v1/orders'} note="Pedidos" />
            <ApiEndpoint method="POST" path={origin + '/api/open/v1/orders'} note="Criar pedido por integração" />
            <div className="mt-4 rounded-xl border border-[#d9e8ef] bg-[#eef7fb] p-3 text-[9px] leading-4 text-[#35667d]"><b>Webhooks:</b> conectores externos podem enviar pedidos para o endpoint POST de pedidos usando uma chave própria. A API valida os produtos e calcula os valores com o cadastro interno.</div>
          </Surface>
        </div>
      </section>
    );
  }

  if (section === 'companies') {
    return (
      <section>
        <SettingsBack title="Empresas contratantes" onBack={showHub} subtitle="Cadastre e acompanhe as empresas que utilizam a plataforma" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Total" value={String(companies.length)} />
            <MiniStat label="Ativas" value={String(companies.filter(item => item.status === 'Ativa').length)} />
            <MiniStat label="Em teste" value={String(companies.filter(item => item.status === 'Teste').length)} />
          </div>
          <button onClick={() => openCompany()} className="flex items-center gap-2 rounded-xl bg-[#f45f3f] px-4 py-3 text-xs font-bold text-white"><Plus size={15} />Cadastrar empresa</button>
        </div>
        <Surface>
          <SectionHead title="Empresas cadastradas" subtitle="Contrato, contato e situação de acesso à ferramenta" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead><tr className="border-b text-[9px] uppercase text-slate-400"><th className="py-3">Empresa</th><th>Contato</th><th>Plano</th><th>Status</th><th className="text-right">Ações</th></tr></thead>
              <tbody>
                {companies.map(company => (
                  <tr key={company.id} className="border-b border-[#f0eeea] text-[10px]">
                    <td className="py-3"><b className="block text-xs">{company.name}</b><span className="text-slate-400">{company.document || 'Documento não informado'}</span></td>
                    <td><b className="block">{company.contactName || 'Responsável não informado'}</b><span className="text-slate-400">{company.email || company.phone || 'Sem contato'}</span></td>
                    <td>{company.plan || 'Padrão'}</td>
                    <td><Badge value={company.status} /></td>
                    <td><div className="flex justify-end gap-2"><button onClick={() => { setSection('access'); setTimeout(() => openUser(undefined, company.id), 0); }} className="rounded-lg border border-[#cce7f4] px-3 py-2 font-semibold text-[#159fe5]">Criar acesso</button><button onClick={() => openCompany(company)} className="rounded-lg border px-3 py-2 font-semibold">Editar</button><button onClick={() => void deleteCompany(company)} className="rounded-lg border border-red-100 px-3 py-2 font-semibold text-red-500">Excluir</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {companies.length === 0 && <div className="py-8 text-center text-xs text-slate-400">Nenhuma empresa cadastrada.</div>}
          </div>
        </Surface>
        {companyOpen && (
          <Modal title={editingCompany ? 'Editar empresa' : 'Cadastrar empresa'} onClose={() => setCompanyOpen(false)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome da empresa"><input value={companyForm.name} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} className="control" /></Field>
              <Field label="CNPJ / Documento"><input value={companyForm.document} onChange={e => setCompanyForm({ ...companyForm, document: e.target.value })} className="control" /></Field>
              <Field label="Responsável"><input value={companyForm.contactName} onChange={e => setCompanyForm({ ...companyForm, contactName: e.target.value })} className="control" /></Field>
              <Field label="E-mail"><input type="email" value={companyForm.email} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} className="control" /></Field>
              <Field label="Telefone"><input value={companyForm.phone} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} className="control" /></Field>
              <Field label="Plano"><input value={companyForm.plan} onChange={e => setCompanyForm({ ...companyForm, plan: e.target.value })} placeholder="Ex.: Profissional" className="control" /></Field>
              <Field label="Status"><select value={companyForm.status} onChange={e => setCompanyForm({ ...companyForm, status: e.target.value as CompanyInfo['status'] })} className="control"><option>Ativa</option><option>Teste</option><option>Inativa</option></select></Field>
            </div>
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => setCompanyOpen(false)} className="rounded-xl border px-4 py-3 text-[10px] font-semibold">Cancelar</button><button onClick={() => void saveCompany()} className="rounded-xl bg-[#159fe5] px-5 py-3 text-[10px] font-bold text-white">Salvar empresa</button></div>
          </Modal>
        )}
      </section>
    );
  }

  if (section === 'qr') {
    const qrLink = window.location.origin + '/?cliente=' + encodeURIComponent(settingsQrTable);
    return (
      <section>
        <SettingsBack title="Cardápio QR Code" onBack={showHub} subtitle="Gere, teste e copie o acesso de cada mesa" />
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <Surface>
            <div className="grid place-items-center rounded-xl bg-white p-3"><QRCodeSVG value={qrLink} size={240} level="M" includeMargin title={'QR ' + settingsQrTable} /></div>
          </Surface>
          <Surface>
            <SectionHead title="QR por mesa" subtitle="O código aponta para o portal real do cliente." />
            <Field label="Mesa"><select value={settingsQrTable} onChange={e => setSettingsQrTable(e.target.value)} className="control">{props.data.tables.map(table => <option key={table.id} value={table.name}>{table.name}</option>)}</select></Field>
            <div className="mt-3 rounded-xl border border-[#d9e8ef] bg-[#eef7fb] p-3 text-[10px] leading-4 text-[#35667d] break-all">{qrLink}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => void navigator.clipboard.writeText(qrLink)} className="rounded-xl border border-[#d9dde0] px-4 py-3 text-[10px] font-semibold">Copiar link</button>
              <button onClick={() => window.open(qrLink, '_blank', 'noopener,noreferrer')} className="rounded-xl bg-[#159fe5] px-4 py-3 text-[10px] font-bold text-white">Testar acesso</button>
            </div>
          </Surface>
        </div>
      </section>
    );
  }

  if (section === 'access') {
    const sampleTable = props.data.tables[0]?.name || 'Mesa 01';
    const customerUrl = window.location.origin + '/?cliente=' + encodeURIComponent(sampleTable);
    return (
      <section>
        <SettingsBack title="Acessos e Usuários" onBack={showHub} subtitle="Crie acessos por empresa e identifique cada ação nos logs" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Usuários" value={String(platformUsers.length)} />
            <MiniStat label="Ativos" value={String(platformUsers.filter(item => item.status === 'Ativo').length)} />
            <MiniStat label="Empresas" value={String(companies.length)} />
          </div>
          <button onClick={() => openUser()} className="flex items-center gap-2 rounded-xl bg-[#f45f3f] px-4 py-3 text-xs font-bold text-white"><Plus size={15} />Criar usuário</button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
          <Surface>
            <SectionHead title="Usuários da plataforma" subtitle="Cada usuário entra com seu próprio e-mail e senha." />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead><tr className="border-b text-[9px] uppercase text-slate-400"><th className="py-3">Usuário</th><th>Empresa</th><th>Perfil</th><th>Status</th><th className="text-right">Ações</th></tr></thead>
                <tbody>
                  {platformUsers.map(user => (
                    <tr key={user.id} className="border-b border-[#f0eeea] text-[10px]">
                      <td className="py-3"><b className="block text-xs">{user.name}</b><span className="text-slate-400">{user.email}</span></td>
                      <td>{user.companyName || companies.find(company => company.id === user.companyId)?.name || '—'}</td>
                      <td>{user.role}</td>
                      <td><Badge value={user.status} /></td>
                      <td><div className="flex justify-end gap-2"><button onClick={() => openUser(user)} className="rounded-lg border px-3 py-2 font-semibold">Editar</button><button onClick={() => void deletePlatformUser(user)} className="rounded-lg border border-red-100 px-3 py-2 font-semibold text-red-500">Excluir</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {platformUsers.length === 0 && <div className="py-8 text-center text-xs text-slate-400">Nenhum usuário empresarial cadastrado.</div>}
            </div>
          </Surface>

          <div className="space-y-4">
            <Surface>
              <SectionHead title="Sessão atual" subtitle="Identidade usada nos registros de auditoria" />
              <DataRow><UserCog size={17} className="text-[#159fe5]" /><span className="flex-1"><b className="block text-xs">{props.session.name}</b><small className="text-[10px] text-slate-400">{props.session.email || 'admin@tapfood.com.br'} · {props.session.role}</small></span><Badge value="Ativo" /></DataRow>
              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[10px] leading-4 text-emerald-700">Pedidos, caixa, mesas, cadastros e demais ações auditadas passam a registrar o nome do usuário autenticado.</div>
              <button onClick={props.onLogout} className="mt-3 w-fit rounded-xl bg-[#202538] px-4 py-3 text-[10px] font-bold text-white">Sair da empresa</button>
            </Surface>

            <Surface>
              <SectionHead title="Clientes por mesa" subtitle="Acesso limitado ao pedido e atendimento" />
              <div className="grid gap-3">
                <Field label="Mesa de exemplo"><input readOnly value={sampleTable} className="control" /></Field>
                <Field label="Senha da mesa"><input readOnly value={tableLoginPassword(sampleTable)} className="control" /></Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => void navigator.clipboard.writeText(customerUrl)} className="rounded-xl border border-[#d9dde0] px-4 py-3 text-[10px] font-semibold">Copiar link cliente</button>
                <button onClick={() => setSection('integrations')} className="rounded-xl bg-[#159fe5] px-4 py-3 text-[10px] font-bold text-white">Configurar n8n</button>
              </div>
            </Surface>
          </div>
        </div>

        {userOpen && (
          <Modal title={editingUser ? 'Editar usuário' : 'Criar acesso'} onClose={() => setUserOpen(false)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Empresa"><select value={userForm.companyId} onChange={e => setUserForm({ ...userForm, companyId: e.target.value })} className="control"><option value="">Selecione</option>{companies.filter(company => company.status !== 'Inativa').map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></Field>
              <Field label="Nome do usuário"><input value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="control" /></Field>
              <Field label="E-mail de acesso"><input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="control" /></Field>
              <Field label={editingUser ? 'Nova senha (opcional)' : 'Senha'}><input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="control" placeholder={editingUser ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'} /></Field>
              <Field label="Perfil"><select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value as PlatformUserInfo['role'] })} className="control"><option>Administrador</option><option>Gestor</option><option>Operador</option></select></Field>
              <Field label="Status"><select value={userForm.status} onChange={e => setUserForm({ ...userForm, status: e.target.value as PlatformUserInfo['status'] })} className="control"><option>Ativo</option><option>Inativo</option></select></Field>
            </div>
            <div className="mt-3 rounded-xl border border-[#d9e8ef] bg-[#eef7fb] p-3 text-[10px] leading-4 text-[#35667d]">O usuário poderá entrar pela opção Empresa usando este e-mail e senha. O nome dele será usado automaticamente nos logs de auditoria.</div>
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => setUserOpen(false)} className="rounded-xl border px-4 py-3 text-xs">Cancelar</button><button onClick={() => void savePlatformUser()} className="rounded-xl bg-[#159fe5] px-5 py-3 text-xs font-bold text-white">Salvar acesso</button></div>
          </Modal>
        )}
      </section>
    );
  }

  if (section === 'marketing') {
    return (
      <section>
        <SettingsBack title="Fidelidade, Cupons e Cashback" onBack={showHub} subtitle="Relacionamento conectado ao CRM" />
        <div className="grid gap-4 xl:grid-cols-3">
          <Surface>
            <SectionHead title="Fidelidade" subtitle="Programa por recorrência" />
            <SettingToggle icon={<Heart size={16} />} title="Programa ativo" subtitle="Cliente ganha benefícios por retorno." enabled={props.settingsForm.loyaltyEnabled} onClick={() => toggle('loyaltyEnabled')} />
            <button onClick={() => void saveGeneral()} className="mt-4 rounded-xl bg-[#159fe5] px-5 py-3 text-xs font-bold text-white">Salvar fidelidade</button>
          </Surface>
          <Surface>
            <SectionHead title="Cupons" subtitle="Regras promocionais rápidas" />
            <DataRow><Gift size={17} className="text-[#f45f3f]" /><span className="flex-1"><b className="block text-xs">Volta10</b><small className="text-[10px] text-slate-400">Modelo pronto para campanhas no CRM</small></span><Badge value="Ativo" /></DataRow>
            <DataRow><BadgePercent size={17} className="text-[#159fe5]" /><span className="flex-1"><b className="block text-xs">Primeiro pedido</b><small className="text-[10px] text-slate-400">Aplicável em cardápio digital</small></span><Badge value="Configurado" /></DataRow>
          </Surface>
          <Surface>
            <SectionHead title="Cashback" subtitle="Diferencial para retenção" />
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[10px] leading-4 text-emerald-700">Base pronta para campanhas por cliente, mesa e histórico de compra. Eventos podem sair pelo n8n para WhatsApp quando o pedido muda de etapa.</div>
            <button onClick={() => setSection('integrations')} className="mt-4 rounded-xl bg-[#202538] px-4 py-3 text-[10px] font-bold text-white">Automatizar mensagens</button>
          </Surface>
        </div>
      </section>
    );
  }

  if (section === 'print') {
    return (
      <section>
        <SettingsBack title="Impressoras" onBack={showHub} subtitle="Setores de impressão e teste operacional" />
        <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
          <Surface>
            <SectionHead title="Configuração por setor" subtitle="Defina o destino de cada comanda" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cozinha"><input value={props.settingsForm.kitchenPrinter} onChange={event => props.setSettingsForm({ ...props.settingsForm, kitchenPrinter: event.target.value })} className="control" /></Field>
              <Field label="Balcão"><input value={props.settingsForm.counterPrinter} onChange={event => props.setSettingsForm({ ...props.settingsForm, counterPrinter: event.target.value })} className="control" /></Field>
              <Field label="Bar"><input value={props.settingsForm.barPrinter} onChange={event => props.setSettingsForm({ ...props.settingsForm, barPrinter: event.target.value })} className="control" /></Field>
              <Field label="Cópias"><input type="number" min="1" max="5" value={props.settingsForm.printCopies} onChange={event => props.setSettingsForm({ ...props.settingsForm, printCopies: Number(event.target.value) })} className="control" /></Field>
            </div>
            <div className="mt-3"><SettingToggle icon={<Printer size={16} />} title="Impressão automática" subtitle="Envia comandas ao criar ou mudar pedido." enabled={props.settingsForm.autoPrint} onClick={() => toggle('autoPrint')} /></div>
            <button onClick={() => void saveGeneral()} className="mt-4 rounded-xl bg-[#159fe5] px-5 py-3 text-xs font-bold text-white">Salvar impressoras</button>
          </Surface>
          <Surface>
            <SectionHead title="Teste de impressão" subtitle="Valida comunicação e gera evento operacional" />
            <div className="grid gap-2">
              {[props.settingsForm.kitchenPrinter, props.settingsForm.counterPrinter, props.settingsForm.barPrinter].filter(Boolean).map(station => (
                <button key={station} onClick={() => void testPrinter(station)} className="flex items-center gap-2 rounded-xl border border-[#e1e4e6] bg-white px-4 py-3 text-left text-[10px] font-bold"><Printer size={15} className="text-[#159fe5]" />Testar {station}</button>
              ))}
            </div>
            {printMessage && <div className="mt-3 rounded-xl border border-[#d9e8ef] bg-[#eef7fb] p-3 text-[10px] text-[#35667d]">{printMessage}</div>}
          </Surface>
        </div>
      </section>
    );
  }

  if (section === 'tools') {
    return (
      <section>
        <SettingsBack title="Diagnóstico TAPFOOD" onBack={showHub} subtitle="Atalhos para validar a operação" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PromoCard icon={<ShieldCheck size={19} />} title="Teste completo" subtitle="Abra a Central TAPFOOD no canto inferior e execute a verificação geral." action="Abrir central" onClick={() => window.scrollTo({ top: document.body.scrollHeight })} />
          <PromoCard icon={<Package size={19} />} title="Produtos com foto" subtitle="Complete imagens e disponibilidade do cardápio." action="Ver produtos" onClick={routeTile('products')} />
          <PromoCard icon={<Boxes size={19} />} title="Estoque mínimo" subtitle="Ajuste insumos que estiverem no limite." action="Ver estoque" onClick={routeTile('stock')} />
          <PromoCard icon={<Printer size={19} />} title="Impressoras" subtitle="Teste cozinha, balcão e bar." action="Configurar" onClick={() => setSection('print')} />
        </div>
      </section>
    );
  }

  if (section === 'general') {
    return (
      <section>
        <SettingsBack title="Configuração Geral" onBack={showHub} subtitle="Operação, atendimento e dispositivos" />
        <div className="grid gap-4 xl:grid-cols-2">
          <Surface>
            <SectionHead title="Identidade e regras" subtitle="Dados principais do estabelecimento" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome do restaurante"><input value={props.settingsForm.restaurantName} onChange={event => props.setSettingsForm({ ...props.settingsForm, restaurantName: event.target.value })} className="control" /></Field>
              <Field label="Unidade"><input value={props.settingsForm.unit} onChange={event => props.setSettingsForm({ ...props.settingsForm, unit: event.target.value })} className="control" /></Field>
              <Field label="Taxa de serviço (%)"><input type="number" min="0" max="30" value={props.settingsForm.serviceFee} onChange={event => props.setSettingsForm({ ...props.settingsForm, serviceFee: Number(event.target.value) })} className="control" /></Field>
              <Field label="Horário de funcionamento"><input value={props.settingsForm.openingHours} onChange={event => props.setSettingsForm({ ...props.settingsForm, openingHours: event.target.value })} className="control" /></Field>
              <Field label="Pedido mínimo delivery"><input type="number" value={props.settingsForm.deliveryMinimum} onChange={event => props.setSettingsForm({ ...props.settingsForm, deliveryMinimum: Number(event.target.value) })} className="control" /></Field>
              <Field label="Frete grátis acima de"><input type="number" value={props.settingsForm.freeDeliveryFrom} onChange={event => props.setSettingsForm({ ...props.settingsForm, freeDeliveryFrom: Number(event.target.value) })} className="control" /></Field>
            </div>
            <button onClick={() => void saveGeneral()} className="mt-4 rounded-xl bg-[#159fe5] px-5 py-3 text-xs font-bold text-white">Salvar configuração geral</button>
          </Surface>
          <Surface>
            <SectionHead title="Operação" subtitle="Ative os recursos usados na unidade" />
            <SettingToggle icon={<Percent size={16} />} title="Taxa de serviço automática" subtitle="Calcula a taxa no fechamento." enabled={props.settingsForm.automaticServiceFee} onClick={() => toggle('automaticServiceFee')} />
            <SettingToggle icon={<QrCode size={16} />} title="Cardápio QR Code" subtitle="Cardápio digital para clientes." enabled={props.settingsForm.qrMenuEnabled} onClick={() => toggle('qrMenuEnabled')} />
            <SettingToggle icon={<Smartphone size={16} />} title="Modo garçom" subtitle="Atendimento móvel vinculado às mesas." enabled={props.settingsForm.waiterAppEnabled} onClick={() => toggle('waiterAppEnabled')} />
            <SettingToggle icon={<Store size={16} />} title="Totem" subtitle="Autoatendimento." enabled={props.settingsForm.selfServiceEnabled} onClick={() => toggle('selfServiceEnabled')} />
            <SettingToggle icon={<ChefHat size={16} />} title="KDS" subtitle="Fila digital de produção." enabled={props.settingsForm.kdsEnabled} onClick={() => toggle('kdsEnabled')} />
            <SettingToggle icon={<Printer size={16} />} title="Impressão automática" subtitle="Impressão por setor." enabled={props.settingsForm.autoPrint} onClick={() => toggle('autoPrint')} />
          </Surface>
        </div>
      </section>
    );
  }

  if (section === 'payments') {
    return (
      <section>
        <SettingsBack title="Formas de Pagamento" onBack={showHub} subtitle="Meios aceitos no fechamento do pedido" />
        <Surface>
          <SettingToggle icon={<QrCode size={16} />} title="Pix" subtitle="Pagamento via Pix." enabled={props.settingsForm.pixEnabled} onClick={() => toggle('pixEnabled')} />
          <SettingToggle icon={<CreditCard size={16} />} title="Cartão" subtitle="Crédito e débito." enabled={props.settingsForm.cardEnabled} onClick={() => toggle('cardEnabled')} />
          <SettingToggle icon={<Banknote size={16} />} title="Dinheiro" subtitle="Pagamento em espécie." enabled={props.settingsForm.cashEnabled} onClick={() => toggle('cashEnabled')} />
          <SettingToggle icon={<ReceiptText size={16} />} title="Módulo fiscal" subtitle="Estrutura de NFC-e / NF-e." enabled={props.settingsForm.fiscalEnabled} onClick={() => toggle('fiscalEnabled')} />
          <button onClick={() => void saveGeneral()} className="mt-4 rounded-xl bg-[#159fe5] px-5 py-3 text-xs font-bold text-white">Salvar meios de pagamento</button>
        </Surface>
      </section>
    );
  }

  if (section === 'delivery') {
    return (
      <section>
        <SettingsBack title="Configurações de Delivery" onBack={showHub} subtitle="Área, pedidos e logística" />
        <div className="grid gap-4 xl:grid-cols-2">
          <Surface>
            <SettingToggle icon={<Truck size={16} />} title="Aceite automático" subtitle="Pedidos entram direto na operação." enabled={props.settingsForm.autoAcceptDelivery} onClick={() => toggle('autoAcceptDelivery')} />
            <Field label="Pedido mínimo"><input type="number" value={props.settingsForm.deliveryMinimum} onChange={event => props.setSettingsForm({ ...props.settingsForm, deliveryMinimum: Number(event.target.value) })} className="control" /></Field>
            <div className="mt-3"><Field label="Frete grátis acima de"><input type="number" value={props.settingsForm.freeDeliveryFrom} onChange={event => props.setSettingsForm({ ...props.settingsForm, freeDeliveryFrom: Number(event.target.value) })} className="control" /></Field></div>
            <button onClick={() => void saveGeneral()} className="mt-4 rounded-xl bg-[#159fe5] px-5 py-3 text-xs font-bold text-white">Salvar delivery</button>
          </Surface>
          <Surface>
            <SectionHead title="Logística" subtitle="Conectores disponíveis em Integrações" />
            <AjusteLink icon={<MapPinned size={22} />} title="Área de entrega" subtitle="Regras por região, raio e operação" onClick={() => setSection('integrations')} />
            <AjusteLink icon={<Bike size={22} />} title="Entregadores" subtitle="App do Entregador e parceiros logísticos" onClick={() => setSection('integrations')} />
            <AjusteLink icon={<Truck size={22} />} title="Marketplaces" subtitle="iFood, 99Food e Keeta" onClick={() => setSection('integrations')} />
          </Surface>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Ajustes</h1>
        <p className="mt-1 text-xs text-slate-400">Cadastros, delivery, relatórios, configurações, integrações e API.</p>
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#e5e8ea] bg-[#fffefa] p-4">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#159fe5] text-white"><Store size={22} /></span>
        <div className="min-w-0 flex-1"><small className="text-[9px] text-slate-400">Perfil</small><b className="block truncate text-sm">{props.data.settings.restaurantName}</b><span className="text-[9px] text-slate-400">{props.data.settings.unit} · Modo Estabelecimento</span></div>
        <button onClick={() => setSection('general')} className="rounded-lg border px-3 py-2 text-[9px] font-semibold">Mostrar perfil</button>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PromoCard icon={<Plug size={19} />} title="Central de Integrações" subtitle="Marketplaces, pagamentos, logística e performance." action="Configurar" onClick={() => setSection('integrations')} />
        <PromoCard icon={<KeyRound size={19} />} title="API Aberta" subtitle="Chaves REST para sistemas e automações externas." action="Gerenciar API" onClick={() => setSection('open-api')} />
        <PromoCard icon={<Store size={19} />} title="Totem e KDS" subtitle="Autoatendimento e produção conectados." action="Ver integrações" onClick={() => setSection('integrations')} />
        <PromoCard icon={<ShieldCheck size={19} />} title="Diagnóstico do Sistema" subtitle="Testes, alertas e rotinas de produção." action="Ver diagnóstico" onClick={() => setSection('tools')} />
      </div>

      <SettingsGroup title="Cadastros">
        <AjusteTile icon={<CircleDollarSign size={29} />} title="Pagamentos" onClick={() => setSection('payments')} />
        <AjusteTile icon={<QrCode size={29} />} title="Cardápio QR Code" onClick={() => setSection('qr')} />
        <AjusteTile icon={<Package size={29} />} title="Produtos" onClick={routeTile('products')} />
        <AjusteTile icon={<Layers3 size={29} />} title="Categorias" onClick={routeTile('menu')} />
        <AjusteTile icon={<Users size={29} />} title="Clientes" onClick={routeTile('customers')} />
        <AjusteTile icon={<CreditCard size={29} />} title="Formas de pagamento" onClick={() => setSection('payments')} />
        <AjusteTile icon={<Heart size={29} />} title="Fidelidade" onClick={() => setSection('marketing')} />
        <AjusteTile icon={<Gift size={29} />} title="Cupons" onClick={() => setSection('marketing')} />
        <AjusteTile icon={<Printer size={29} />} title="Categorias de impressão" onClick={() => setSection('print')} />
        <AjusteTile icon={<UserCog size={29} />} title="Usuários" onClick={() => setSection('access')} />
        <AjusteTile icon={<Plug size={29} />} title="Integrações" onClick={() => setSection('integrations')} />
        <AjusteTile icon={<BadgePercent size={29} />} title="Programa de Cashback" onClick={() => setSection('marketing')} />
      </SettingsGroup>

      <SettingsGroup title="Delivery">
        <AjusteTile icon={<ShoppingBag size={29} />} title="Cardápio Delivery" onClick={routeTile('menu')} />
        <AjusteTile icon={<MapPinned size={29} />} title="Área de entrega" onClick={() => setSection('delivery')} />
        <AjusteTile icon={<Bike size={29} />} title="Entregadores" onClick={() => setSection('integrations')} />
        <AjusteTile icon={<Settings size={29} />} title="Configurações" onClick={() => setSection('delivery')} />
        <AjusteTile icon={<Truck size={29} />} title="Integrações Delivery" onClick={() => setSection('integrations')} />
      </SettingsGroup>

      <SettingsGroup title="Relatórios">
        <AjusteTile icon={<WalletCards size={29} />} title="Caixas" onClick={routeTile('history')} />
        <AjusteTile icon={<BarChart3 size={29} />} title="Painel" onClick={routeTile('dashboard')} />
      </SettingsGroup>

      <SettingsGroup title="Configurações">
        <AjusteTile icon={<Settings size={29} />} title="Geral" onClick={() => setSection('general')} />
        <AjusteTile icon={<Store size={29} />} title="Empresas contratantes" onClick={() => setSection('companies')} />
        <AjusteTile icon={<UserCog size={29} />} title="Acessos" onClick={() => setSection('access')} />
        <AjusteTile icon={<Printer size={29} />} title="Impressoras" onClick={() => setSection('print')} />
        <AjusteTile icon={<KeyRound size={29} />} title="API Aberta" onClick={() => setSection('open-api')} />
      </SettingsGroup>

      <SettingsGroup title="Outros">
        <AjusteTile icon={<ReceiptText size={29} />} title="Meus Pagamentos" onClick={() => setSection('payments')} />
        <AjusteTile icon={<LogOut size={29} />} title="Sair" onClick={props.onLogout} />
      </SettingsGroup>
    </section>
  );
}

function SettingsBack({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return <div className="mb-5 flex items-center gap-3"><button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white">←</button><div><h1 className="text-xl font-bold">{title}</h1><p className="text-[10px] text-slate-400">{subtitle}</p></div></div>;
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mb-7"><h2 className="mb-3 text-sm font-bold text-[#26394c]">{title}</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-10">{children}</div></section>;
}

function AjusteTile({ icon, title, onClick }: { icon: ReactNode; title: string; onClick: () => void }) {
  return <button onClick={onClick} className="min-h-[138px] rounded-lg border border-[#dfe3e5] bg-white p-3 text-center shadow-[0_4px_12px_rgba(25,35,42,.04)] transition hover:-translate-y-0.5 hover:border-[#b9dff2]"><span className="mx-auto grid h-16 w-16 place-items-center text-[#159fe5]">{icon}</span><b className="mt-2 block text-[9px] leading-3">{title}</b></button>;
}

function AjusteLink({ icon, title, subtitle, onClick }: { icon: ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex w-full items-center gap-3 border-t border-[#eeeae4] py-3 text-left first:border-t-0"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef8fd] text-[#159fe5]">{icon}</span><span className="min-w-0 flex-1"><b className="block text-xs">{title}</b><small className="text-[9px] text-slate-400">{subtitle}</small></span><span className="text-[#159fe5]">›</span></button>;
}

function PromoCard({ icon, title, subtitle, action, onClick }: { icon: ReactNode; title: string; subtitle: string; action: string; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-xl border border-[#e1e5e7] bg-gradient-to-br from-white to-[#eef8fd] p-4 text-left"><span className="text-[#159fe5]">{icon}</span><b className="mt-3 block text-xs">{title}</b><p className="mt-1 text-[9px] leading-4 text-slate-500">{subtitle}</p><span className="mt-3 inline-block text-[9px] font-bold text-[#159fe5]">{action} ›</span></button>;
}

function ApiEndpoint({ method, path, note }: { method: string; path: string; note: string }) {
  return <div className="mb-2 rounded-xl border border-[#ece9e4] p-3"><div className="flex items-center gap-2"><span className={'rounded px-2 py-1 text-[8px] font-bold ' + (method === 'POST' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#eef7fb] text-[#147eaf]')}>{method}</span><code className="min-w-0 flex-1 truncate text-[8px]">{path}</code></div><small className="mt-1 block text-[8px] text-slate-400">{note}</small></div>;
}

function PageSection({ title, subtitle, action, onAction, children }: { title: string; subtitle: string; action?: string; onAction?: () => void | Promise<void>; children: ReactNode }) {
  return <section><div className="mb-4 flex items-center justify-between"><div><h1 className="text-lg font-bold">{title}</h1><p className="text-xs text-slate-400">{subtitle}</p></div>{action && <button onClick={() => void onAction?.()} className="flex items-center gap-2 rounded-lg bg-[#f45f3f] px-4 py-2.5 text-[10px] font-bold text-white"><Plus size={14} />{action}</button>}</div>{children}</section>;
}

function Surface({ children }: { children: ReactNode }) {
  return <section className="rounded-xl border border-[#ebe7e2] bg-[#fffefa] p-4 shadow-[0_10px_28px_rgba(46,42,38,0.04)]">{children}</section>;
}

function DataRow({ children }: { children: ReactNode }) {
  return <div className="flex min-h-14 items-center gap-3 border-t border-[#f0f0f4] first:border-t-0">{children}</div>;
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="mb-4"><h3 className="text-sm font-bold">{title}</h3><p className="text-[10px] text-slate-400">{subtitle}</p></div>;
}

function Badge({ value }: { value: string }) {
  return <span className={'rounded-full px-2 py-1 text-[9px] font-bold ' + badgeClass(value)}>{value}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#ebe7e2] bg-[#fffefa] p-4 shadow-[0_8px_24px_rgba(46,42,38,0.035)]"><span className="text-[10px] text-slate-400">{label}</span><strong className="mt-2 block text-xl tracking-[-0.02em] text-[#2d2e32]">{value}</strong><span className="mt-1 flex items-center gap-1 text-[9px] text-emerald-600"><ArrowUpRight size={11} />Atualizado agora</span></div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-[#f7f8fa] p-4"><span className="block text-[9px] text-slate-400">{label}</span><b className="mt-1 block text-sm">{value}</b></div>;
}
