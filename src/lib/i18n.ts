/**
 * Locale preferences and safe UI translations.
 * No tenant data, credentials or customer content is sent to third parties.
 * Translation keys are stable identifiers; missing keys fall back to Portuguese.
 */
export const SUPPORTED_LOCALES = ['pt-BR', 'en', 'es', 'fr', 'de', 'it', 'ja', 'zh-CN'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt-BR';
export const LOCALE_STORAGE_KEY = 'tapfood:preferred-locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ja: '日本語',
  'zh-CN': '简体中文',
};

const messages = {
  'pt-BR': {
    recentOrders: "Pedidos recentes",
    viewHistory: "Ver histórico",
    noOrders: "Nenhum pedido registrado.",
    noProductPhoto: "Produto sem foto cadastrada",
    collapseOrder: "Recolher pedido",
    expandOrder: "Expandir pedido",
    openMenu: "Abrir menu",
    decreaseQuantity: "Diminuir quantidade de",
    increaseQuantity: "Aumentar quantidade de",
    removeItem: "Remover",
    favoriteProduct: "Favoritar",

    language: 'Idioma',
    login: 'Entrar',
    logout: 'Sair',
    email: 'E-mail',
    password: 'Senha',
    table: 'Mesa',
    search: 'Buscar produtos, clientes ou pedidos',
    loading: 'Carregando sistema...',
    restricted: 'Acesso restrito',
  },
  en: {
    recentOrders: "Recent orders",
    viewHistory: "View history",
    noOrders: "No orders recorded.",
    noProductPhoto: "No product photo",
    collapseOrder: "Collapse order",
    expandOrder: "Expand order",
    openMenu: "Open menu",
    decreaseQuantity: "Decrease quantity of",
    increaseQuantity: "Increase quantity of",
    removeItem: "Remove",
    favoriteProduct: "Favorite",

    language: 'Language', login: 'Sign in', logout: 'Sign out',
    email: 'Email', password: 'Password', table: 'Table',
    search: 'Search products, customers or orders', loading: 'Loading system...',
    restricted: 'Restricted access',
  },
  es: {
    recentOrders: "Pedidos recientes",
    viewHistory: "Ver historial",
    noOrders: "No hay pedidos registrados.",
    noProductPhoto: "Producto sin foto",
    collapseOrder: "Contraer pedido",
    expandOrder: "Expandir pedido",
    openMenu: "Abrir menú",
    decreaseQuantity: "Reducir cantidad de",
    increaseQuantity: "Aumentar cantidad de",
    removeItem: "Eliminar",
    favoriteProduct: "Favorito",

    language: 'Idioma', login: 'Ingresar', logout: 'Salir',
    email: 'Correo electrónico', password: 'Contraseña', table: 'Mesa',
    search: 'Buscar productos, clientes o pedidos', loading: 'Cargando sistema...',
    restricted: 'Acceso restringido',
  },
  fr: {
    recentOrders: "Commandes récentes",
    viewHistory: "Voir l’historique",
    noOrders: "Aucune commande enregistrée.",
    noProductPhoto: "Produit sans photo",
    collapseOrder: "Réduire la commande",
    expandOrder: "Développer la commande",
    openMenu: "Ouvrir le menu",
    decreaseQuantity: "Réduire la quantité de",
    increaseQuantity: "Augmenter la quantité de",
    removeItem: "Supprimer",
    favoriteProduct: "Favori",

    language: 'Langue', login: 'Connexion', logout: 'Déconnexion',
    email: 'E-mail', password: 'Mot de passe', table: 'Table',
    search: 'Rechercher produits, clients ou commandes', loading: 'Chargement...',
    restricted: 'Accès restreint',
  },
  de: {
    recentOrders: "Letzte Bestellungen",
    viewHistory: "Verlauf anzeigen",
    noOrders: "Keine Bestellungen erfasst.",
    noProductPhoto: "Kein Produktfoto",
    collapseOrder: "Bestellung einklappen",
    expandOrder: "Bestellung ausklappen",
    openMenu: "Menü öffnen",
    decreaseQuantity: "Menge verringern für",
    increaseQuantity: "Menge erhöhen für",
    removeItem: "Entfernen",
    favoriteProduct: "Favorit",

    language: 'Sprache', login: 'Anmelden', logout: 'Abmelden',
    email: 'E-Mail', password: 'Passwort', table: 'Tisch',
    search: 'Produkte, Kunden oder Bestellungen suchen', loading: 'System wird geladen...',
    restricted: 'Zugriff eingeschränkt',
  },
  it: {
    recentOrders: "Ordini recenti",
    viewHistory: "Visualizza cronologia",
    noOrders: "Nessun ordine registrato.",
    noProductPhoto: "Prodotto senza foto",
    collapseOrder: "Comprimi ordine",
    expandOrder: "Espandi ordine",
    openMenu: "Apri menu",
    decreaseQuantity: "Riduci quantità di",
    increaseQuantity: "Aumenta quantità di",
    removeItem: "Rimuovi",
    favoriteProduct: "Preferito",

    language: 'Lingua', login: 'Accedi', logout: 'Esci',
    email: 'E-mail', password: 'Password', table: 'Tavolo',
    search: 'Cerca prodotti, clienti o ordini', loading: 'Caricamento...',
    restricted: 'Accesso riservato',
  },
  ja: {
    recentOrders: "最近の注文",
    viewHistory: "履歴を見る",
    noOrders: "注文はありません。",
    noProductPhoto: "商品画像なし",
    collapseOrder: "注文を折りたたむ",
    expandOrder: "注文を展開",
    openMenu: "メニューを開く",
    decreaseQuantity: "数量を減らす",
    increaseQuantity: "数量を増やす",
    removeItem: "削除",
    favoriteProduct: "お気に入り",

    language: '言語', login: 'ログイン', logout: 'ログアウト',
    email: 'メール', password: 'パスワード', table: 'テーブル',
    search: '商品、顧客、注文を検索', loading: '読み込み中...',
    restricted: 'アクセス制限',
  },
  'zh-CN': {
    recentOrders: "最近订单",
    viewHistory: "查看历史",
    noOrders: "暂无订单。",
    noProductPhoto: "暂无商品图片",
    collapseOrder: "收起订单",
    expandOrder: "展开订单",
    openMenu: "打开菜单",
    decreaseQuantity: "减少数量",
    increaseQuantity: "增加数量",
    removeItem: "移除",
    favoriteProduct: "收藏",

    language: '语言', login: '登录', logout: '退出登录',
    email: '邮箱', password: '密码', table: '餐桌',
    search: '搜索商品、客户或订单', loading: '加载中...',
    restricted: '访问受限',
  },
} as const;

export type TranslationKey = keyof typeof messages['pt-BR'];

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE;
  if (isLocale(value)) return value;
  const base = value.split('-')[0].toLowerCase();
  return SUPPORTED_LOCALES.find(locale => locale.split('-')[0].toLowerCase() === base) ?? DEFAULT_LOCALE;
}

export function translate(locale: Locale, key: TranslationKey): string {
  return messages[locale][key] || messages[DEFAULT_LOCALE][key];
}

export function readPreferredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    return resolveLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function savePreferredLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage may be unavailable in privacy mode; the UI should still work.
  }
  document.documentElement.lang = locale;
}

/**
 * Locale-aware display formatting. Business amounts remain numeric in storage.
 * Currency is explicit to prevent an accidental conversion of prices.
 */
export function formatMoney(amount: number, locale: Locale, currency = 'BRL'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}
