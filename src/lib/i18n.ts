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
    language: 'Language', login: 'Sign in', logout: 'Sign out',
    email: 'Email', password: 'Password', table: 'Table',
    search: 'Search products, customers or orders', loading: 'Loading system...',
    restricted: 'Restricted access',
  },
  es: {
    language: 'Idioma', login: 'Ingresar', logout: 'Salir',
    email: 'Correo electrónico', password: 'Contraseña', table: 'Mesa',
    search: 'Buscar productos, clientes o pedidos', loading: 'Cargando sistema...',
    restricted: 'Acceso restringido',
  },
  fr: {
    language: 'Langue', login: 'Connexion', logout: 'Déconnexion',
    email: 'E-mail', password: 'Mot de passe', table: 'Table',
    search: 'Rechercher produits, clients ou commandes', loading: 'Chargement...',
    restricted: 'Accès restreint',
  },
  de: {
    language: 'Sprache', login: 'Anmelden', logout: 'Abmelden',
    email: 'E-Mail', password: 'Passwort', table: 'Tisch',
    search: 'Produkte, Kunden oder Bestellungen suchen', loading: 'System wird geladen...',
    restricted: 'Zugriff eingeschränkt',
  },
  it: {
    language: 'Lingua', login: 'Accedi', logout: 'Esci',
    email: 'E-mail', password: 'Password', table: 'Tavolo',
    search: 'Cerca prodotti, clienti o ordini', loading: 'Caricamento...',
    restricted: 'Accesso riservato',
  },
  ja: {
    language: '言語', login: 'ログイン', logout: 'ログアウト',
    email: 'メール', password: 'パスワード', table: 'テーブル',
    search: '商品、顧客、注文を検索', loading: '読み込み中...',
    restricted: 'アクセス制限',
  },
  'zh-CN': {
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
