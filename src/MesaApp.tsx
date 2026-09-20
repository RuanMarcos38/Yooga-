import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '@appdeploy/client';
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
  ChevronDown,
  Heart,
  CreditCard,
  Banknote,
  QrCode,
  Wallet,
  RotateCcw,
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
  Headphones,
  History,
  Store,
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
};
type Table = { id: string; name: string; seats: number; status: 'Livre' | 'Ocupada' | 'Aguardando' | 'Fechamento'; total: number; waiter?: string };
type Item = { productId: string; name: string; qty: number; price: number };
type Order = { id: string; code: string; channel: string; table?: string; customer?: string; items: Item[]; total: number; status: string; createdAt: string; paymentMethod?: string };
type Customer = { id: string; name: string; phone: string; orders: number; totalSpent: number; lastOrder: string };
type Stock = { id: string; name: string; unit: string; current: number; minimum: number; cost: number };
type Tx = { id: string; description: string; type: 'Entrada' | 'Saída'; amount: number; date: string; category: string };
type State = {
  products: Product[];
  menuCategories: MenuCategory[];
  tables: Table[];
  orders: Order[];
  customers: Customer[];
  stock: Stock[];
  transactions: Tx[];
  settings: AppSettings;
};
type Page = 'dashboard' | 'pdv' | 'tables' | 'menu' | 'kds' | 'delivery' | 'products' | 'stock' | 'finance' | 'customers' | 'reports' | 'settings';

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const ACCENT = '#f45f3f';

const nav: Array<[Page, string, typeof LayoutDashboard]> = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['pdv', 'Pedidos / PDV', ShoppingBag],
  ['tables', 'Mesas', Utensils],
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

const defaultSettings: AppSettings = {
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
};

const empty: State = {
  products: [],
  menuCategories: [],
  tables: [],
  orders: [],
  customers: [],
  stock: [],
  transactions: [],
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

export default function MesaApp() {
  const [page, setPage] = useState<Page>('dashboard');
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
            <strong className="block text-lg tracking-tight text-[#ef5a38]">mesa<span className="text-[#f6b62f]">food</span></strong>
            <span className="block text-[10px] text-slate-400">Restaurant Management</span>
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

        <div className="mt-auto rounded-xl border border-[#ebe7e2] bg-[#fffdfa] p-3 shadow-[0_8px_24px_rgba(45,42,38,0.04)]">
          <div className="mb-2 h-20 overflow-hidden rounded-lg bg-[#eeeae4]"><img src="https://images.unsplash.com/photo-1777463210529-8599820d3a4d?auto=format&fit=crop&w=900&q=80" alt="Interior de restaurante" loading="lazy" className="h-full w-full object-cover natural-photo" /></div>
          <strong className="text-xs">Como operar?</strong>
          <p className="mt-1 text-[10px] leading-4 text-slate-400">Use o PDV, acompanhe a cozinha e controle toda a operação em um só lugar.</p>
          <button onClick={() => setPage('pdv')} className="mt-2 rounded-full bg-[#f45f3f] px-3 py-1.5 text-[10px] font-bold text-white">Abrir PDV</button>
        </div>
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
          <button className="flex items-center gap-2 rounded-xl border border-[#e9eaf0] bg-[#f8f9fb] p-1.5 pr-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#ffe0d8] text-xs font-bold text-[#ef5a38]">RM</span>
            <span className="hidden text-left md:block"><strong className="block text-[11px]">Administrador</strong><small className="block text-[9px] text-slate-400">{data.settings.unit}</small></span>
            <ChevronDown size={14} className="text-slate-400" />
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
            />
          )}
        </div>
      </main>

      {toast && (
        <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-xl bg-[#202538] px-4 py-3 text-xs font-semibold text-white shadow-xl">
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
};

function PageView(props: ViewProps) {
  if (props.page === 'dashboard' || props.page === 'pdv') return <OrderingWorkspace {...props} />;
  if (props.page === 'tables') return <TablesView {...props} />;
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
        <button onClick={() => props.setPage('reports')} className="grid h-11 w-11 place-items-center rounded-full text-[#535c60] hover:bg-white"><History size={20} /></button>
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
        <button className="flex items-center gap-2 rounded-xl border border-[#d9dadd] bg-white px-4 py-3 text-xs font-semibold"><QrCode size={15} />Pré-visualizar QR</button>
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
        const created = await api.post('/api/products', payload);
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
        <Field label="Imagem por URL"><input value={form.imageUrl} onChange={event => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://..." className="control" /></Field>
        <Field label="Descrição"><textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className="control min-h-20" /></Field>
        <Field label="Imagem do produto"><label className="flex min-h-20 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed text-xs text-slate-500"><ImagePlus size={18} />{file ? file.name : 'Selecionar foto'}<input type="file" accept="image/*" className="hidden" onChange={event => setFile(event.target.files?.[0] || null)} /></label></Field>
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
        const created = await api.post('/api/menu/categories', payload);
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

function IntegrationCard({ icon, title }: { icon: ReactNode; title: string }) {
  return <div className="rounded-xl border border-[#ece9e4] p-3"><span className="text-[#e85b3a]">{icon}</span><b className="mt-2 block text-[10px]">{title}</b><small className="text-[9px] text-slate-400">Disponível para integração</small></div>;
}

function QuickIcon({ icon }: { icon: ReactNode }) {
  return <button className="grid h-12 place-items-center rounded-xl bg-[#f4f5f5] text-[#566066]">{icon}</button>;
}

function PayButton({ label, icon, active, onClick }: { label: string; icon: ReactNode; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={'flex h-14 items-center justify-center gap-2 rounded-lg border text-[9px] font-bold ' + (active ? 'border-[#f45f3f] bg-[#fff3ef] text-[#e85b3a]' : 'border-[#ececf2] bg-white text-[#51586c]')}>{icon}{label}</button>;
}

function TablesView(props: ViewProps) {
  const tableSearch = props.search.trim().toLowerCase();
  const visibleTables = props.data.tables.filter(table => !tableSearch || table.name.toLowerCase().includes(tableSearch));

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

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-[#e3e5e6] pb-4">
        <div className="mr-auto">
          <h1 className="text-2xl font-bold text-[#282d31]">Início</h1>
          <p className="mt-1 text-xs text-slate-400">Mesas, balcão e atendimento presencial.</p>
        </div>
        <button onClick={() => props.setPage('menu')} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#596166] hover:bg-white"><QrCode size={16} />Cardápio QR Code</button>
        <button onClick={() => props.setPage('reports')} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#596166] hover:bg-white"><History size={16} />Histórico</button>
        <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#596166] hover:bg-white"><Headphones size={16} />Suporte</button>
        <button onClick={() => props.setPage('settings')} className="flex items-center gap-2 rounded-xl bg-[#79e7b1] px-4 py-3 text-xs font-semibold text-[#16653f] shadow-sm"><Store size={16} />Totem de Autoatendimento</button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <label className="flex h-12 min-w-[280px] max-w-[380px] flex-1 items-center gap-2 rounded-xl border border-[#cfd4d7] bg-white px-4">
          <input value={props.search} onChange={event => {
            const input = event.target as HTMLInputElement;
            const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
            native?.call(input, input.value);
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }} placeholder="Buscar..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" readOnly />
          <Search size={18} className="text-[#4d565b]" />
        </label>
        <button onClick={() => props.setPage('settings')} className="ml-auto flex h-12 items-center gap-2 rounded-xl bg-[#e4e6e7] px-5 text-xs font-semibold text-[#0e5f93]"><Settings size={16} />Configuração geral</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button onClick={() => {
          props.setChannel('Balcão');
          props.setTable('');
          props.setPage('pdv');
        }} className="min-h-[138px] rounded-xl border-4 border-[#12a35a] bg-[#baf2d3] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-[#087a42]"><ShoppingBag size={14} />Aberta</span>
          <strong className="mt-5 block text-sm text-[#174d36]">BALCÃO</strong>
          <div className="mt-2 flex items-center justify-between text-xs text-[#147849]"><span>{BRL(0)}</span><span className="flex items-center gap-1"><Clock3 size={14} />Sempre aberto</span></div>
        </button>

        {visibleTables.map((table, index) => {
          const theme = statusTheme(table.status);
          return (
            <button key={table.id} onClick={() => props.openTableOrder(table.name)} className={'min-h-[138px] rounded-xl border-4 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ' + theme.panel}>
              <span className={'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold ' + theme.badge}>
                {table.status === 'Livre' ? <Check size={14} /> : <Utensils size={14} />}
                {theme.label}
              </span>
              <strong className="mt-5 block text-sm">{table.name.toUpperCase()}</strong>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span>{BRL(table.total)}</span>
                {table.status !== 'Livre' && <span className="flex items-center gap-1"><Clock3 size={14} />{index % 3 === 0 ? '4 Minutos' : index % 3 === 1 ? '11 Horas' : '12 Horas'}</span>}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
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
  const create = async () => {
    const name = prompt('Nome do produto');
    if (!name) return;
    const price = Number(prompt('Preço') || 0);
    const category = prompt('Categoria') || 'Outros';
    if (price <= 0) return;
    await props.run(() => api.post('/api/products', { name, category, price, stock: 10 }), 'Produto cadastrado.');
  };
  return (
    <PageSection title="Produtos" subtitle="Catálogo comercial do restaurante" action="Novo produto" onAction={create}>
      <Surface>
        {props.data.products.filter(product => !props.search || product.name.toLowerCase().includes(props.search.toLowerCase())).map(product => (
          <DataRow key={product.id}>
            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#eeeae4]"><img src={productPhoto(product)} alt={product.name} loading="lazy" className="h-full w-full object-cover natural-photo" /></span>
            <span className="flex-1"><b className="block text-xs">{product.name}</b><small className="text-[10px] text-slate-400">{product.category}</small></span>
            <span className="text-[10px] text-slate-500">{product.stock} un</span><b className="text-xs text-[#ef5a38]">{BRL(product.price)}</b>
            <button onClick={() => { if (confirm('Excluir ' + product.name + '?')) void props.run(() => api.delete('/api/products/' + product.id), 'Produto excluído.'); }} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
          </DataRow>
        ))}
      </Surface>
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
    if (amount <= 0) return;
    await props.run(() => api.post('/api/transactions', { description, type, amount, category: type === 'Entrada' ? 'Receitas' : 'Despesas' }), 'Lançamento financeiro criado.');
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
  const create = async () => {
    const name = prompt('Nome do cliente');
    if (!name) return;
    const phone = prompt('Telefone') || '';
    if (!phone) return;
    await props.run(() => api.post('/api/customers', { name, phone }), 'Cliente cadastrado.');
  };
  return (
    <PageSection title="Clientes / CRM" subtitle="Base de clientes e relacionamento" action="Novo cliente" onAction={create}>
      <Surface>
        {props.data.customers.filter(customer => !props.search || (customer.name + ' ' + customer.phone).toLowerCase().includes(props.search.toLowerCase())).map(customer => (
          <DataRow key={customer.id}>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff2ee] text-[10px] font-bold text-[#e85b3a]">{customer.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span>
            <span className="flex-1"><b className="block text-xs">{customer.name}</b><small className="text-[10px] text-slate-400">{customer.phone}</small></span>
            <span className="text-[10px] text-slate-500">{customer.orders} pedidos</span><b className="text-xs">{BRL(customer.totalSpent)}</b>
          </DataRow>
        ))}
      </Surface>
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

function SettingsView(props: ViewProps) {
  const save = async () => {
    if (!props.settingsForm.restaurantName.trim() || !props.settingsForm.unit.trim()) return;
    await props.run(() => api.put('/api/settings', props.settingsForm), 'Configurações salvas.');
  };

  const toggle = (key: keyof AppSettings) => {
    const current = props.settingsForm[key];
    if (typeof current !== 'boolean') return;
    props.setSettingsForm({ ...props.settingsForm, [key]: !current });
  };

  return (
    <PageSection title="Configurações" subtitle="Operação, atendimento, cardápio, pagamentos e dispositivos">
      <div className="grid gap-4 xl:grid-cols-2">
        <Surface>
          <SectionHead title="Configuração geral" subtitle="Identidade e regras do salão" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome do restaurante"><input value={props.settingsForm.restaurantName} onChange={event => props.setSettingsForm({ ...props.settingsForm, restaurantName: event.target.value })} className="control" /></Field>
            <Field label="Unidade"><input value={props.settingsForm.unit} onChange={event => props.setSettingsForm({ ...props.settingsForm, unit: event.target.value })} className="control" /></Field>
            <Field label="Taxa de serviço (%)"><input type="number" min="0" max="30" value={props.settingsForm.serviceFee} onChange={event => props.setSettingsForm({ ...props.settingsForm, serviceFee: Number(event.target.value) })} className="control" /></Field>
            <Field label="Horário de funcionamento"><input value={props.settingsForm.openingHours} onChange={event => props.setSettingsForm({ ...props.settingsForm, openingHours: event.target.value })} className="control" /></Field>
            <Field label="Pedido mínimo delivery"><input type="number" value={props.settingsForm.deliveryMinimum} onChange={event => props.setSettingsForm({ ...props.settingsForm, deliveryMinimum: Number(event.target.value) })} className="control" /></Field>
            <Field label="Frete grátis acima de"><input type="number" value={props.settingsForm.freeDeliveryFrom} onChange={event => props.setSettingsForm({ ...props.settingsForm, freeDeliveryFrom: Number(event.target.value) })} className="control" /></Field>
          </div>
          <button onClick={() => void save()} className="mt-4 rounded-xl bg-[#f45f3f] px-5 py-3 text-xs font-bold text-white">Salvar configuração geral</button>
        </Surface>

        <Surface>
          <SectionHead title="Atendimento e canais" subtitle="Recursos que podem ser ativados por operação" />
          <SettingToggle icon={<Percent size={16} />} title="Acréscimo automático / taxa de serviço" subtitle="Calcula a taxa no fechamento da mesa." enabled={props.settingsForm.automaticServiceFee} onClick={() => toggle('automaticServiceFee')} />
          <SettingToggle icon={<QrCode size={16} />} title="Cardápio QR Code" subtitle="Exibe o cardápio digital para clientes." enabled={props.settingsForm.qrMenuEnabled} onClick={() => toggle('qrMenuEnabled')} />
          <SettingToggle icon={<Smartphone size={16} />} title="App / modo garçom" subtitle="Atendimento móvel vinculado às mesas." enabled={props.settingsForm.waiterAppEnabled} onClick={() => toggle('waiterAppEnabled')} />
          <SettingToggle icon={<Store size={16} />} title="Totem de autoatendimento" subtitle="Modo de pedido sem atendente." enabled={props.settingsForm.selfServiceEnabled} onClick={() => toggle('selfServiceEnabled')} />
          <SettingToggle icon={<Truck size={16} />} title="Aceite automático do delivery" subtitle="Pedidos entram direto na operação." enabled={props.settingsForm.autoAcceptDelivery} onClick={() => toggle('autoAcceptDelivery')} />
        </Surface>

        <Surface>
          <SectionHead title="Pagamentos e fiscal" subtitle="Formas de pagamento e emissão" />
          <SettingToggle icon={<QrCode size={16} />} title="Pix" subtitle="Disponível no fechamento de pedidos." enabled={props.settingsForm.pixEnabled} onClick={() => toggle('pixEnabled')} />
          <SettingToggle icon={<CreditCard size={16} />} title="Cartão" subtitle="Crédito e débito no fechamento." enabled={props.settingsForm.cardEnabled} onClick={() => toggle('cardEnabled')} />
          <SettingToggle icon={<Banknote size={16} />} title="Dinheiro" subtitle="Pagamento em espécie." enabled={props.settingsForm.cashEnabled} onClick={() => toggle('cashEnabled')} />
          <SettingToggle icon={<ReceiptText size={16} />} title="Módulo fiscal" subtitle="Estrutura preparada para NFC-e / NF-e." enabled={props.settingsForm.fiscalEnabled} onClick={() => toggle('fiscalEnabled')} />
        </Surface>

        <Surface>
          <SectionHead title="Produção, impressão e inteligência" subtitle="Diferenciais de operação" />
          <SettingToggle icon={<ChefHat size={16} />} title="KDS de cozinha" subtitle="Fila digital de produção." enabled={props.settingsForm.kdsEnabled} onClick={() => toggle('kdsEnabled')} />
          <SettingToggle icon={<Printer size={16} />} title="Impressão automática" subtitle="Preparação para impressoras por setor." enabled={props.settingsForm.autoPrint} onClick={() => toggle('autoPrint')} />
          <SettingToggle icon={<AlertTriangle size={16} />} title="Alerta inteligente de estoque" subtitle="Sinaliza itens abaixo do mínimo." enabled={props.settingsForm.lowStockAlerts} onClick={() => toggle('lowStockAlerts')} />
          <SettingToggle icon={<Clock3 size={16} />} title="Alerta de tempo de preparo" subtitle="Destaca pedidos acima do tempo esperado." enabled={props.settingsForm.prepAlerts} onClick={() => toggle('prepAlerts')} />
          <SettingToggle icon={<Heart size={16} />} title="Fidelidade / CRM" subtitle="Base para recorrência e campanhas." enabled={props.settingsForm.loyaltyEnabled} onClick={() => toggle('loyaltyEnabled')} />
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <IntegrationCard icon={<Plug size={17} />} title="iFood" />
            <IntegrationCard icon={<ReceiptText size={17} />} title="Contabilidade" />
            <IntegrationCard icon={<CreditCard size={17} />} title="Smart POS" />
          </div>
        </Surface>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e9e5df] bg-[#fffefa] p-4">
        <div><b className="text-xs">Manutenção da demonstração</b><p className="text-[10px] text-slate-400">Restaura somente os dados de exemplo do ambiente de prévia.</p></div>
        <button onClick={() => { if (confirm('Restaurar dados de demonstração?')) void props.run(() => api.post('/api/reset', {}), 'Demonstração restaurada.'); }} className="flex items-center gap-2 rounded-lg border px-4 py-3 text-[10px] font-semibold text-slate-500"><RotateCcw size={14} />Restaurar demonstração</button>
      </div>
    </PageSection>
  );
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

function Preference({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return <div className="flex items-center gap-3 border-t border-[#f0f0f4] py-3 first:border-t-0"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fff2ee] text-[#e85b3a]">{icon}</span><span className="flex-1 text-xs font-semibold">{title}</span><b className="text-[10px] text-emerald-600">{value}</b></div>;
}
