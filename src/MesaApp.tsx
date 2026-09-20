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
} from 'lucide-react';

type Product = { id: string; name: string; category: string; price: number; stock: number; active: boolean };
type Table = { id: string; name: string; seats: number; status: 'Livre' | 'Ocupada' | 'Aguardando' | 'Fechamento'; total: number; waiter?: string };
type Item = { productId: string; name: string; qty: number; price: number };
type Order = { id: string; code: string; channel: string; table?: string; customer?: string; items: Item[]; total: number; status: string; createdAt: string; paymentMethod?: string };
type Customer = { id: string; name: string; phone: string; orders: number; totalSpent: number; lastOrder: string };
type Stock = { id: string; name: string; unit: string; current: number; minimum: number; cost: number };
type Tx = { id: string; description: string; type: 'Entrada' | 'Saída'; amount: number; date: string; category: string };
type State = {
  products: Product[];
  tables: Table[];
  orders: Order[];
  customers: Customer[];
  stock: Stock[];
  transactions: Tx[];
  settings: { restaurantName: string; unit: string };
};
type Page = 'dashboard' | 'pdv' | 'tables' | 'kds' | 'delivery' | 'products' | 'stock' | 'finance' | 'customers' | 'reports' | 'settings';

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const ACCENT = '#f45f3f';

const nav: Array<[Page, string, typeof LayoutDashboard]> = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['pdv', 'Pedidos / PDV', ShoppingBag],
  ['tables', 'Mesas', Utensils],
  ['kds', 'Cozinha / KDS', ChefHat],
  ['delivery', 'Delivery', Bike],
  ['products', 'Produtos', Package],
  ['stock', 'Estoque', Boxes],
  ['finance', 'Financeiro', WalletCards],
  ['customers', 'Clientes / CRM', Users],
  ['reports', 'Relatórios', BarChart3],
  ['settings', 'Configurações', Settings],
];

const empty: State = {
  products: [],
  tables: [],
  orders: [],
  customers: [],
  stock: [],
  transactions: [],
  settings: { restaurantName: 'Mesa Restaurante', unit: 'Unidade Centro' },
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
  const [settingsForm, setSettingsForm] = useState(empty.settings);
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

  const categories = ['Todos', ...Array.from(new Set(data.products.map(product => product.category)))];
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
  settingsForm: { restaurantName: string; unit: string };
  setSettingsForm: (value: { restaurantName: string; unit: string }) => void;
  setPage: (page: Page) => void;
};

function PageView(props: ViewProps) {
  if (props.page === 'dashboard' || props.page === 'pdv') return <OrderingWorkspace {...props} />;
  if (props.page === 'tables') return <TablesView {...props} />;
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
  return (
    <div className="grid gap-5 2xl:grid-cols-[1fr_300px]">
      <section className="min-w-0">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h1 className="text-lg font-bold">Explore categorias</h1>
            <p className="text-xs text-slate-400">Escolha os itens do pedido e finalize no painel ao lado.</p>
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
      <h2 className="mb-4 text-sm font-bold">Pedido atual</h2>
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

function PayButton({ label, icon, active, onClick }: { label: string; icon: ReactNode; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={'flex h-14 items-center justify-center gap-2 rounded-lg border text-[9px] font-bold ' + (active ? 'border-[#f45f3f] bg-[#fff3ef] text-[#e85b3a]' : 'border-[#ececf2] bg-white text-[#51586c]')}>{icon}{label}</button>;
}

function TablesView(props: ViewProps) {
  return (
    <PageSection title="Mesas" subtitle="Mapa operacional e situação em tempo real">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {props.data.tables.map(table => (
          <div key={table.id} className="rounded-xl border border-white bg-white p-4">
            <div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#fff2ee] text-[#ef5a38]"><Utensils size={17} /></span><Badge value={table.status} /></div>
            <h3 className="mt-4 text-sm font-bold">{table.name}</h3>
            <p className="mt-1 text-[10px] text-slate-400">{table.seats} lugares {table.waiter ? '· ' + table.waiter : ''}</p>
            <strong className="mt-3 block text-sm">{table.total ? BRL(table.total) : 'Disponível'}</strong>
            <button
              onClick={() => void props.run(
                () => api.put('/api/tables/' + table.id + '/status', { status: table.status === 'Livre' ? 'Ocupada' : 'Livre' }),
                table.status === 'Livre' ? 'Mesa aberta.' : 'Mesa liberada.'
              )}
              className={'mt-4 w-full rounded-lg py-2 text-[10px] font-bold ' + (table.status === 'Livre' ? 'bg-[#fff0eb] text-[#e85b3a]' : 'bg-[#f2f3f6] text-[#50566a]')}
            >
              {table.status === 'Livre' ? 'Abrir mesa' : 'Liberar mesa'}
            </button>
          </div>
        ))}
      </div>
    </PageSection>
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
  return (
    <PageSection title="Configurações" subtitle="Dados gerais e preferências">
      <div className="grid gap-4 lg:grid-cols-2">
        <Surface>
          <SectionHead title="Estabelecimento" subtitle="Informações da unidade" />
          <label className="block text-[10px] text-slate-500">Nome do restaurante<input value={props.settingsForm.restaurantName} onChange={event => props.setSettingsForm({ ...props.settingsForm, restaurantName: event.target.value })} className="mt-1 w-full rounded-lg border border-[#e5e6ec] p-3 text-xs outline-none focus:border-[#f08a73]" /></label>
          <label className="mt-3 block text-[10px] text-slate-500">Unidade<input value={props.settingsForm.unit} onChange={event => props.setSettingsForm({ ...props.settingsForm, unit: event.target.value })} className="mt-1 w-full rounded-lg border border-[#e5e6ec] p-3 text-xs outline-none focus:border-[#f08a73]" /></label>
          <button onClick={() => void save()} className="mt-4 rounded-lg bg-[#f45f3f] px-4 py-3 text-[10px] font-bold text-white">Salvar alterações</button>
        </Surface>
        <Surface>
          <SectionHead title="Sistema" subtitle="Preferências operacionais" />
          <Preference icon={<Bell size={16} />} title="Som de novo pedido" value="Ativo" />
          <Preference icon={<MessageCircle size={16} />} title="Alertas operacionais" value="Ativo" />
          <Preference icon={<Clock3 size={16} />} title="Atualização do painel" value="Automática" />
          <button onClick={() => { if (confirm('Restaurar dados de demonstração?')) void props.run(() => api.post('/api/reset', {}), 'Demonstração restaurada.'); }} className="mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-[10px] font-semibold text-slate-500"><RotateCcw size={14} />Restaurar demonstração</button>
        </Surface>
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
