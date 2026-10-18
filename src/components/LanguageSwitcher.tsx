import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { LOCALE_LABELS, LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, isLocale, readPreferredLocale, savePreferredLocale, type Locale } from '../lib/i18n';

export default function LanguageSwitcher() {
  const [locale, setLocale] = useState<Locale>(readPreferredLocale);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [source, setSource] = useState<Locale | 'auto'>('auto');
  const [target, setTarget] = useState<Locale>('en');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.lang = locale;
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY) setLocale(readPreferredLocale());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [locale]);

  async function doTranslate() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError('');
    setResult('');
    try {
      const response = await api.post<{ translatedText: string }>('/api/i18n/translate', {
        text: text.trim(), sourceLocale: source, targetLocale: target,
      });
      setResult(response.data.translatedText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao traduzir');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-3 left-3 z-[90] max-w-[calc(100vw-24px)] rounded-lg border border-slate-200 bg-white/95 p-2 text-slate-800 shadow-md backdrop-blur">
      <div className="flex items-center gap-2">
        <label htmlFor="tapfood-locale" className="text-xs font-semibold">🌐</label>
        <select id="tapfood-locale" className="max-w-[130px] bg-transparent text-xs outline-none"
          aria-label="Selecionar idioma" value={locale}
          onChange={event => {
            const next = event.target.value;
            if (!isLocale(next)) return;
            savePreferredLocale(next);
            setLocale(next);
            window.dispatchEvent(new CustomEvent('tapfood:locale-changed', { detail: next }));
          }}>
          {SUPPORTED_LOCALES.map(value => <option key={value} value={value}>{LOCALE_LABELS[value]}</option>)}
        </select>
        <button type="button" aria-expanded={open} aria-controls="tapfood-translator"
          className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
          onClick={() => setOpen(value => !value)}>{open ? 'Fechar' : 'Tradutor'}</button>
      </div>
      {open && (
        <section id="tapfood-translator" className="mt-3 max-h-[65vh] w-[320px] max-w-full space-y-2 overflow-y-auto">
          <p className="text-xs text-slate-500">Traduza textos manualmente. Não insira senhas ou dados sensíveis.</p>
          <div className="flex gap-2">
            <select aria-label="Idioma de origem" value={source}
              onChange={event => setSource(event.target.value as Locale | 'auto')}
              className="min-w-0 flex-1 rounded border p-1 text-xs">
              <option value="auto">Detectar idioma</option>
              {SUPPORTED_LOCALES.map(value => <option key={value} value={value}>{LOCALE_LABELS[value]}</option>)}
            </select>
            <button type="button" aria-label="Inverter idiomas" className="rounded border px-2 text-xs"
              onClick={() => { const nextSource = target; setTarget(source === 'auto' ? locale : source); setSource(nextSource); setText(result || text); setResult(''); }}>⇄</button>
            <select aria-label="Idioma de destino" value={target}
              onChange={event => setTarget(event.target.value as Locale)}
              className="min-w-0 flex-1 rounded border p-1 text-xs">
              {SUPPORTED_LOCALES.map(value => <option key={value} value={value}>{LOCALE_LABELS[value]}</option>)}
            </select>
          </div>
          <textarea aria-label="Texto para traduzir" maxLength={2000} value={text}
            onChange={event => setText(event.target.value)} rows={3}
            className="w-full rounded border p-2 text-sm" placeholder="Digite o texto..." />
          <button type="button" onClick={doTranslate} disabled={busy || !text.trim()}
            className="rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {busy ? 'Traduzindo...' : 'Traduzir'}
          </button>
          {error && <div role="alert" className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <p className="font-semibold">Tradução não concluída</p><p>{error}</p>
            <p>Seu texto foi mantido para tentar novamente. O idioma da interface pode ser alterado pelo seletor acima.</p>
          </div>}
          {result && <div aria-live="polite" className="rounded border bg-slate-50 p-2">
            <p className="whitespace-pre-wrap break-words text-sm">{result}</p>
            <button type="button" className="mt-2 rounded border px-2 py-1 text-xs"
              onClick={() => navigator.clipboard?.writeText(result)}>Copiar</button>
          </div>}
        </section>
      )}
    </div>
  );
}
