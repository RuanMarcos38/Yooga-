import { useEffect, useMemo, useState } from 'react';
import { api } from '@appdeploy/client';
import {
  LayoutDashboard,
  ShoppingCart,
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
  Store,
  RotateCcw,
  Search,
  ArrowUpRight,
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  active: boolean;
};
type Table = {
  id: string;
  name: string;
  seats: number;
  status: 'Livre' | 'Ocupada' | 'Aguardando' | 'Fechamento';
  total: number;
  waiter?: string;
};
type Item = { productId: string; name: string; qty: number; price: number };
type Order = {
  id: string;
  code: string;
  channel: string;
  table?: string;
  customer?: string;
  items: Item[];
  total: number;
  status: string;
  createdAt: string;
};
type Customer = {
  id: string;
  name: string;
  phone: string;
  orders: number;
  totalSpent: number;
  lastOrder: string;
};
type Stock = {
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
};
type State = {
  products: Product[];
  tables: Table[];
  orders: Order[];
  customers: Customer[];
  stock: Stock[];
  transactions: Tx[];
  settings: { restaurantName: string; unit: string };
};
type Page =
  | 'dashboard'
  | 'pdv'
  | 'tables'
  | 'kds'
  | 'delivery'
  | 'products'
  | 'stock'
  | 'finance'
  | 'customers'
  | 'reports'
  | 'settings';

const BRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const nav: Array<[Page, string, typeof LayoutDashboard]> = [
  ['dashboard', 'Visão geral', LayoutDashboard],
  ['pdv', 'PDV', ShoppingCart],
  ['tables', 'Mesas', Utensils],
  ['kds', 'Cozinha · KDS', ChefHat],
  ['delivery', 'Delivery', Bike],
  ['products', 'Produtos', Package],
  ['stock', 'Estoque', Boxes],
  ['finance', 'Financeiro', WalletCards],
  ['customers', 'Clientes · CRM', Users],
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
const badge = (s: string) =>
  s === 'Livre' || s === 'Pronto' || s === 'Ativo'
    ? 'bg-emerald-100 text-emerald-700'
    : s === 'Ocupada'
      ? 'bg-orange-100 text-orange-700'
      : s === 'Novo'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-amber-100 text-amber-700';

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
  const [search, setSearch] = useState('');
  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/state');
      setData(r.data as State);
      setError('');
    } catch {
      setError('Falha ao carregar a demonstração.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      await load();
      setToast(msg);
    } catch {
      setError('Não foi possível concluir a operação.');
    }
  };
  const total = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.qty, 0),
    [cart]
  );
  const sales = data.transactions
    .filter(t => t.type === 'Entrada')
    .reduce((s, t) => s + t.amount, 0);
  const active = data.orders.filter(
    o => !['Entregue', 'Finalizado', 'Cancelado'].includes(o.status)
  ).length;
  const add = (p: Product) =>
    setCart(c => {
      const x = c.find(i => i.productId === p.id);
      return x
        ? c.map(i => (i.productId === p.id ? { ...i, qty: i.qty + 1 } : i))
        : [...c, { productId: p.id, name: p.name, qty: 1, price: p.price }];
    });
  const qty = (id: string, d: number) =>
    setCart(c =>
      c
        .map(i => (i.productId === id ? { ...i, qty: i.qty + d } : i))
        .filter(i => i.qty > 0)
    );
  const finish = async () => {
    if (!cart.length) return;
    if (channel === 'Mesa' && !table) {
      setError('Selecione uma mesa.');
      return;
    }
    await run(
      () =>
        api.post('/api/orders', {
          channel,
          table: channel === 'Mesa' ? table : undefined,
          customer: 'Cliente balcão',
          items: cart,
        }),
      'Pedido enviado para a cozinha.'
    );
    setCart([]);
    setTable('');
  };
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <aside
        className={`${menu ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 w-60 bg-emerald-950 p-4 text-slate-200 transition md:translate-x-0`}
      >
        <div className="mb-6 flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-emerald-950">
            <Store size={20} />
          </span>
          <div>
            <b className="block tracking-[.2em] text-white">MESA</b>
            <small className="text-emerald-200/60">Restaurant OS</small>
          </div>
        </div>
        <nav className="space-y-1">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => {
                setPage(id);
                setMenu(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${page === id ? 'bg-emerald-800 text-white' : 'text-emerald-100/70 hover:bg-emerald-900'}`}
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {id === 'kds' && active > 0 && (
                <b className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] text-emerald-950">
                  {active}
                </b>
              )}
            </button>
          ))}
        </nav>
        <button
          onClick={() => {
            if (confirm('Restaurar a demonstração?'))
              void run(
                () => api.post('/api/reset', {}),
                'Demonstração restaurada.'
              );
          }}
          className="absolute bottom-5 left-5 flex items-center gap-2 text-xs text-emerald-200/60"
        >
          <RotateCcw size={14} />
          Restaurar demo
        </button>
      </aside>
      <main className="md:ml-60">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white px-4 md:px-6">
          <button className="mr-3 md:hidden" onClick={() => setMenu(!menu)}>
            <Menu />
          </button>
          <div>
            <h1 className="font-bold">{nav.find(n => n[0] === page)?.[1]}</h1>
            <p className="text-xs text-slate-400">
              {data.settings.unit} ·{' '}
              <span className="text-emerald-600">Operação online</span>
            </p>
          </div>
          <label className="ml-auto hidden items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 lg:flex">
            <Search size={16} className="text-slate-400" />
            <input
              className="w-48 bg-transparent text-xs outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar no sistema"
            />
          </label>
          <div className="ml-3 grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-xs font-bold text-emerald-700">
            RM
          </div>
        </header>
        <div className="p-4 md:p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
              <AlertTriangle size={17} />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')}>×</button>
            </div>
          )}
          {loading ? (
            <div className="grid min-h-[60vh] place-items-center text-sm text-slate-400">
              Carregando operação...
            </div>
          ) : (
            <PageView
              page={page}
              data={data}
              sales={sales}
              active={active}
              cart={cart}
              total={total}
              channel={channel}
              setChannel={setChannel}
              table={table}
              setTable={setTable}
              add={add}
              qty={qty}
              finish={finish}
              run={run}
              search={search}
            />
          )}
        </div>
      </main>
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <Check size={16} className="text-emerald-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

function PageView(p: {
  page: Page;
  data: State;
  sales: number;
  active: number;
  cart: Item[];
  total: number;
  channel: string;
  setChannel: (s: string) => void;
  table: string;
  setTable: (s: string) => void;
  add: (p: Product) => void;
  qty: (id: string, d: number) => void;
  finish: () => Promise<void>;
  run: (f: () => Promise<unknown>, m: string) => Promise<void>;
  search: string;
}) {
  const { page, data } = p;
  if (page === 'dashboard')
    return (
      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-4 rounded-2xl bg-emerald-950 p-6 text-white sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Operação em andamento
            </span>
            <h2 className="mt-2 text-2xl font-bold">
              Seu restaurante em uma única tela.
            </h2>
            <p className="mt-1 text-sm text-emerald-100/60">
              Vendas, pedidos, mesas, estoque e clientes conectados.
            </p>
          </div>
          <span className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-emerald-950">
            Sistema operacional ativo
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <K label="Faturamento" value={BRL(p.sales)} />
          <K label="Pedidos ativos" value={String(p.active)} />
          <K
            label="Mesas ocupadas"
            value={`${data.tables.filter(t => t.status !== 'Livre').length}/${data.tables.length}`}
          />
          <K
            label="Ticket médio"
            value={BRL(
              data.orders.reduce((s, o) => s + o.total, 0) /
                Math.max(1, data.orders.length)
            )}
          />
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-2xl border bg-white p-4 xl:col-span-2">
            <Head title="Pedidos recentes" sub="Últimas movimentações" />
            <div>
              {data.orders.slice(0, 7).map(o => (
                <Row key={o.id}>
                  <b>{o.code}</b>
                  <span className="flex-1">
                    <b className="block">{o.customer}</b>
                    <small className="text-slate-400">
                      {o.channel}
                      {o.table ? ` · ${o.table}` : ''}
                    </small>
                  </span>
                  <b>{BRL(o.total)}</b>
                  <Badge s={o.status} />
                </Row>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border bg-white p-4">
            <Head title="Precisa de atenção" sub="Alertas operacionais" />
            <div className="space-y-3">
              <AlertTriangle className="text-amber-500" />
              <p className="text-sm">
                <b>
                  {data.stock.filter(s => s.current <= s.minimum).length}{' '}
                  item(ns)
                </b>{' '}
                abaixo do estoque mínimo.
              </p>
              <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                {data.orders.filter(o => o.status === 'Preparando').length}{' '}
                pedido(s) estão em preparo no KDS.
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  if (page === 'pdv')
    return (
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border bg-white p-4">
          <Head title="Produtos" sub="Toque para adicionar ao pedido" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.products
              .filter(
                x =>
                  !p.search ||
                  x.name.toLowerCase().includes(p.search.toLowerCase())
              )
              .map(x => (
                <button
                  key={x.id}
                  onClick={() => p.add(x)}
                  className="rounded-2xl border p-3 text-left hover:border-emerald-400"
                >
                  <div className="mb-3 grid h-20 place-items-center rounded-xl bg-emerald-50 text-xl font-black text-emerald-700">
                    {x.name.slice(0, 2).toUpperCase()}
                  </div>
                  <small className="text-[10px] uppercase text-slate-400">
                    {x.category}
                  </small>
                  <b className="block text-sm">{x.name}</b>
                  <strong className="mt-2 block text-emerald-700">
                    {BRL(x.price)}
                  </strong>
                </button>
              ))}
          </div>
        </section>
        <aside className="rounded-2xl border bg-white p-4">
          <Head
            title="Novo pedido"
            sub={`${p.cart.reduce((s, i) => s + i.qty, 0)} item(ns)`}
          />
          <div className="mb-3 grid grid-cols-3 gap-2">
            {['Balcão', 'Mesa', 'Delivery'].map(x => (
              <button
                key={x}
                onClick={() => p.setChannel(x)}
                className={`rounded-lg border py-2 text-xs font-semibold ${p.channel === x ? 'bg-emerald-950 text-white' : ''}`}
              >
                {x}
              </button>
            ))}
          </div>
          {p.channel === 'Mesa' && (
            <select
              value={p.table}
              onChange={e => p.setTable(e.target.value)}
              className="mb-3 w-full rounded-xl border p-2 text-sm"
            >
              <option value="">Selecione a mesa</option>
              {data.tables.map(t => (
                <option key={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <div className="min-h-52 border-y">
            {p.cart.length === 0 ? (
              <div className="grid h-52 place-items-center text-center text-xs text-slate-400">
                <div>
                  <ShoppingCart className="mx-auto mb-2" />
                  Pedido vazio
                  <br />
                  Adicione produtos ao lado.
                </div>
              </div>
            ) : (
              p.cart.map(i => (
                <Row key={i.productId}>
                  <span className="flex-1 text-sm font-semibold">
                    {i.name}
                    <small className="block text-slate-400">
                      {BRL(i.price)}
                    </small>
                  </span>
                  <button onClick={() => p.qty(i.productId, -1)}>
                    <Minus size={15} />
                  </button>
                  <b>{i.qty}</b>
                  <button onClick={() => p.qty(i.productId, 1)}>
                    <Plus size={15} />
                  </button>
                  <b>{BRL(i.price * i.qty)}</b>
                </Row>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{BRL(p.total)}</span>
          </div>
          <button
            disabled={!p.cart.length}
            onClick={() => void p.finish()}
            className="mt-4 w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-emerald-950 disabled:opacity-40"
          >
            Finalizar pedido
          </button>
        </aside>
      </div>
    );
  if (page === 'tables')
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {data.tables.map(t => (
          <div key={t.id} className="rounded-2xl border bg-white p-4">
            <div className="flex justify-between">
              <Utensils className="text-emerald-700" />
              <Badge s={t.status} />
            </div>
            <h3 className="mt-4 font-bold">{t.name}</h3>
            <p className="text-xs text-slate-400">
              {t.seats} lugares {t.waiter ? `· ${t.waiter}` : ''}
            </p>
            <b className="mt-3 block">
              {t.total ? BRL(t.total) : 'Disponível'}
            </b>
            <div className="mt-4 flex gap-2">
              {t.status === 'Livre' ? (
                <button
                  onClick={() =>
                    void p.run(
                      () =>
                        api.put(`/api/tables/${t.id}/status`, {
                          status: 'Ocupada',
                        }),
                      'Mesa aberta.'
                    )
                  }
                  className="w-full rounded-lg bg-emerald-100 py-2 text-xs font-bold text-emerald-700"
                >
                  Abrir mesa
                </button>
              ) : (
                <button
                  onClick={() =>
                    void p.run(
                      () =>
                        api.put(`/api/tables/${t.id}/status`, {
                          status: 'Livre',
                        }),
                      'Mesa liberada.'
                    )
                  }
                  className="w-full rounded-lg bg-slate-100 py-2 text-xs font-bold"
                >
                  Liberar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  if (page === 'kds')
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {['Novo', 'Preparando', 'Pronto'].map(s => (
          <section key={s} className="min-h-96 rounded-2xl bg-slate-100 p-3">
            <h3 className="mb-3 flex justify-between font-bold">
              <span>{s}</span>
              <b className="rounded-full bg-white px-2 text-xs">
                {data.orders.filter(o => o.status === s).length}
              </b>
            </h3>
            <div className="space-y-3">
              {data.orders
                .filter(o => o.status === s)
                .map(o => (
                  <div key={o.id} className="rounded-xl border bg-white p-3">
                    <div className="flex justify-between">
                      <b>{o.code}</b>
                      <small className="text-slate-400">{o.channel}</small>
                    </div>
                    <div className="my-3 border-y py-2 text-xs">
                      {o.items.map((i, n) => (
                        <p key={n}>
                          <b>{i.qty}x</b> {i.name}
                        </p>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <b>{BRL(o.total)}</b>
                      <button
                        onClick={() =>
                          void p.run(
                            () =>
                              api.put(`/api/orders/${o.id}/status`, {
                                status:
                                  s === 'Novo'
                                    ? 'Preparando'
                                    : s === 'Preparando'
                                      ? 'Pronto'
                                      : 'Entregue',
                              }),
                            'Pedido atualizado.'
                          )
                        }
                        className="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-bold text-white"
                      >
                        {s === 'Novo'
                          ? 'Iniciar'
                          : s === 'Preparando'
                            ? 'Pronto'
                            : 'Entregar'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
    );
  if (page === 'products')
    return (
      <CrudList
        title="Catálogo de produtos"
        action="Novo produto"
        onAction={async () => {
          const name = prompt('Nome do produto');
          if (!name) return;
          const price = Number(prompt('Preço') || 0);
          if (price > 0)
            await p.run(
              () =>
                api.post('/api/products', {
                  name,
                  category: 'Outros',
                  price,
                  stock: 10,
                }),
              'Produto cadastrado.'
            );
        }}
      >
        {data.products
          .filter(
            x =>
              !p.search || x.name.toLowerCase().includes(p.search.toLowerCase())
          )
          .map(x => (
            <Row key={x.id}>
              <b className="flex-1">
                {x.name}
                <small className="block font-normal text-slate-400">
                  {x.category}
                </small>
              </b>
              <span>{x.stock} un</span>
              <b>{BRL(x.price)}</b>
              <button
                onClick={() => {
                  if (confirm(`Excluir ${x.name}?`))
                    void p.run(
                      () => api.delete(`/api/products/${x.id}`),
                      'Produto excluído.'
                    );
                }}
                className="text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </Row>
          ))}
      </CrudList>
    );
  if (page === 'stock')
    return (
      <CrudList title="Estoque" action="Registrar entrada">
        {data.stock.map(x => (
          <Row key={x.id}>
            <b className="flex-1">{x.name}</b>
            <span>
              {x.current} {x.unit}
            </span>
            <span>Mín. {x.minimum}</span>
            <b
              className={
                x.current <= x.minimum ? 'text-amber-600' : 'text-emerald-600'
              }
            >
              {x.current <= x.minimum ? 'Repor' : 'Normal'}
            </b>
          </Row>
        ))}
      </CrudList>
    );
  if (page === 'finance')
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <K
            label="Entradas"
            value={BRL(
              data.transactions
                .filter(x => x.type === 'Entrada')
                .reduce((s, x) => s + x.amount, 0)
            )}
          />
          <K
            label="Saídas"
            value={BRL(
              data.transactions
                .filter(x => x.type === 'Saída')
                .reduce((s, x) => s + x.amount, 0)
            )}
          />
          <K
            label="Saldo"
            value={BRL(
              data.transactions.reduce(
                (s, x) => s + (x.type === 'Entrada' ? x.amount : -x.amount),
                0
              )
            )}
          />
        </div>
        <CrudList title="Movimentações" action="Novo lançamento">
          {data.transactions.map(x => (
            <Row key={x.id}>
              <b className="flex-1">
                {x.description}
                <small className="block font-normal text-slate-400">
                  {x.category} · {x.date}
                </small>
              </b>
              <b
                className={
                  x.type === 'Entrada' ? 'text-emerald-600' : 'text-red-500'
                }
              >
                {x.type === 'Entrada' ? '+' : '-'} {BRL(x.amount)}
              </b>
            </Row>
          ))}
        </CrudList>
      </div>
    );
  if (page === 'customers')
    return (
      <CrudList
        title="Clientes · CRM"
        action="Novo cliente"
        onAction={async () => {
          const name = prompt('Nome do cliente');
          if (!name) return;
          const phone = prompt('Telefone') || '';
          if (phone)
            await p.run(
              () => api.post('/api/customers', { name, phone }),
              'Cliente cadastrado.'
            );
        }}
      >
        {data.customers
          .filter(
            x =>
              !p.search ||
              `${x.name} ${x.phone}`
                .toLowerCase()
                .includes(p.search.toLowerCase())
          )
          .map(x => (
            <Row key={x.id}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                {x.name
                  .split(' ')
                  .map(a => a[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <b className="flex-1">
                {x.name}
                <small className="block font-normal text-slate-400">
                  {x.phone}
                </small>
              </b>
              <span>{x.orders} pedidos</span>
              <b>{BRL(x.totalSpent)}</b>
            </Row>
          ))}
      </CrudList>
    );
  if (page === 'delivery')
    return (
      <CrudList title="Pedidos de delivery" action="Novo delivery">
        {data.orders
          .filter(o => o.channel === 'Delivery')
          .map(o => (
            <Row key={o.id}>
              <Bike size={18} className="text-emerald-600" />
              <b className="flex-1">
                {o.code} · {o.customer}
              </b>
              <b>{BRL(o.total)}</b>
              <Badge s={o.status} />
            </Row>
          ))}
      </CrudList>
    );
  if (page === 'reports')
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-emerald-950 p-6 text-white lg:col-span-2">
          <small className="text-emerald-300">Faturamento consolidado</small>
          <strong className="mt-2 block text-3xl">{BRL(p.sales)}</strong>
          <p className="text-xs text-emerald-100/60">
            Demonstração operacional
          </p>
        </section>
        <section className="rounded-2xl border bg-white p-4">
          <Head title="Indicadores" sub="Eficiência" />
          <div className="grid grid-cols-2 gap-3">
            <K label="Tempo de preparo" value="14m 32s" />
            <K label="Cancelamentos" value="1,8%" />
            <K label="Recorrência" value="42%" />
            <K label="Avaliação" value="4,8/5" />
          </div>
        </section>
        <section className="rounded-2xl border bg-white p-4">
          <Head title="Produtos em destaque" sub="Ranking" />
          {data.products.slice(0, 5).map((x, i) => (
            <Row key={x.id}>
              <b className="w-7 text-emerald-600">#{i + 1}</b>
              <span className="flex-1">{x.name}</span>
              <ArrowUpRight size={15} />
            </Row>
          ))}
        </section>
      </div>
    );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border bg-white p-4">
        <Head title="Dados do estabelecimento" sub="Configurações gerais" />
        <label className="block text-xs">
          Nome
          <input
            className="mt-1 w-full rounded-xl border p-3"
            defaultValue={data.settings.restaurantName}
          />
        </label>
        <label className="mt-3 block text-xs">
          Unidade
          <input
            className="mt-1 w-full rounded-xl border p-3"
            defaultValue={data.settings.unit}
          />
        </label>
        <button className="mt-4 rounded-xl bg-emerald-500 px-4 py-3 text-xs font-bold">
          Salvar alterações
        </button>
      </section>
      <section className="rounded-2xl border bg-white p-4">
        <Head title="Preferências" sub="Operação" />
        <p className="rounded-xl bg-slate-50 p-4 text-sm">
          Som de novo pedido{' '}
          <b className="float-right text-emerald-600">Ativo</b>
        </p>
        <p className="rounded-xl bg-slate-50 p-4 text-sm">
          Impressão automática <b className="float-right">Desativada</b>
        </p>
      </section>
    </div>
  );
}
function K({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <span className="text-xs text-slate-400">{label}</span>
      <strong className="mt-2 block text-xl">{value}</strong>
    </div>
  );
}
function Badge({ s }: { s: string }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-bold ${badge(s)}`}
    >
      {s}
    </span>
  );
}
function Head({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-bold">{title}</h3>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 border-t first:border-t-0 text-sm">
      {children}
    </div>
  );
}
function CrudList({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action: string;
  onAction?: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="text-xs text-slate-400">Gestão operacional</p>
        </div>
        <button
          onClick={() => void onAction?.()}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-emerald-950"
        >
          <Plus size={16} />
          {action}
        </button>
      </div>
      <div>{children}</div>
    </section>
  );
}
