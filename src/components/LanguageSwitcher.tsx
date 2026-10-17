import { useEffect, useState } from 'react';
import { LOCALE_LABELS, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, isLocale, readPreferredLocale, savePreferredLocale, type Locale } from '../lib/i18n';

export default function LanguageSwitcher() {
  const [locale, setLocale] = useState<Locale>(readPreferredLocale);
  useEffect(() => {
    document.documentElement.lang = locale;
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY) setLocale(readPreferredLocale());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [locale]);

  return (
    <div className="fixed bottom-3 left-3 z-[90] rounded-lg border border-slate-200 bg-white/95 px-2 py-1.5 text-slate-800 shadow-md backdrop-blur" aria-label="Idioma da interface">
      <label htmlFor="tapfood-locale" className="mr-2 text-xs font-semibold">🌐</label>
      <select
        id="tapfood-locale"
        className="max-w-[135px] bg-transparent text-xs outline-none"
        aria-label="Selecionar idioma"
        value={locale}
        onChange={event => {
          const next = event.target.value;
          if (!isLocale(next)) return;
          savePreferredLocale(next);
          setLocale(next);
          window.dispatchEvent(new CustomEvent('tapfood:locale-changed', { detail: next }));
        }}
      >
        {SUPPORTED_LOCALES.map(value => <option key={value} value={value}>{LOCALE_LABELS[value]}</option>)}
      </select>
    </div>
  );
}
