import { useEffect, useRef, useState } from 'react';
import { api } from './lib/api';

type Position = { lat: number; lng: number; accuracy: number; updatedAt: string };
type TrackingInfo = {
  exists?: boolean;
  code?: string;
  status?: string;
  active: boolean;
  position?: Position | null;
  viewerToken?: string | null;
  driverToken?: string | null;
  expiresAt?: string;
};

const googleEmbedKey = ((import.meta as ImportMeta & { env?: { VITE_GOOGLE_MAPS_EMBED_KEY?: string } }).env?.VITE_GOOGLE_MAPS_EMBED_KEY || '').trim();
function urlFor(role: 'viewer' | 'driver', token: string) {
  return window.location.origin + '/?' + (role === 'driver' ? 'entregador' : 'rastreio') + '=' + encodeURIComponent(token);
}
function googleLocationUrl(position: Position) {
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(position.lat + ',' + position.lng);
}
function GoogleDeliveryMap({ position }: { position?: Position | null }) {
  if (!position) {
    return <div className="grid min-h-[220px] place-items-center rounded-xl border bg-slate-50 p-6 text-center text-xs text-slate-500">
      Aguardando o entregador autorizar o GPS e começar a compartilhar sua posição.
    </div>;
  }
  const stale = Date.now() - new Date(position.updatedAt).getTime() > 60000;
  const embed = 'https://www.google.com/maps/embed/v1/place?key=' + encodeURIComponent(googleEmbedKey) +
    '&q=' + encodeURIComponent(position.lat + ',' + position.lng) + '&zoom=16&language=pt-BR';
  return <div className="space-y-2">
    {googleEmbedKey ? (
      <iframe title="Google Maps - localização do entregador" src={embed} loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin" className="h-[300px] w-full rounded-xl border" allowFullScreen />
    ) : (
      <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-xl border bg-slate-50 p-4 text-center">
        <p className="text-sm text-slate-600">A posição mais recente está disponível no Google Maps.</p>
        <a href={googleLocationUrl(position)} target="_blank" rel="noopener noreferrer"
          referrerPolicy="no-referrer" className="rounded-lg bg-[#f45f3f] px-4 py-3 text-xs font-bold text-white">
          Ver posição no Google Maps
        </a>
      </div>
    )}
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className={stale ? 'font-semibold text-amber-700' : 'text-emerald-700'}>
        {stale ? 'Última posição conhecida (sem atualização recente)' : 'Localização recebida'} ·
        {' ' + new Date(position.updatedAt).toLocaleTimeString('pt-BR')}
        {' · precisão aprox. ' + Math.round(position.accuracy) + ' m'}
      </span>
      <a href={googleLocationUrl(position)} target="_blank" rel="noopener noreferrer"
        referrerPolicy="no-referrer" className="font-semibold text-blue-700 underline">
        Abrir no Google Maps
      </a>
    </div>
  </div>;
}

export function DeliveryTrackingControls({ orderId, status }: { orderId: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<TrackingInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const terminal = ['Entregue', 'Finalizado', 'Cancelado'].includes(status);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const refresh = async () => {
      try {
        const result = await api.get<TrackingInfo>('/api/delivery/' + encodeURIComponent(orderId) + '/tracking');
        if (mounted) setInfo(result.data);
      } catch {
        if (mounted) setNotice('Não foi possível consultar o rastreamento.');
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 12000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [open, orderId, status]);

  const update = async (action: 'start' | 'stop') => {
    setBusy(true);
    setNotice('');
    try {
      const path = '/api/delivery/' + encodeURIComponent(orderId) + '/tracking';
      const response = await api.post<TrackingInfo>(action === 'stop' ? path + '/stop' : path, {});
      setInfo(action === 'stop' ? { exists: true, active: false } : response.data);
      setNotice(action === 'stop' ? 'Rastreamento encerrado e localização removida.' : 'Links gerados. Envie os acessos separadamente ao cliente e ao entregador.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Erro ao configurar rastreamento.');
    } finally {
      setBusy(false);
    }
  };
  const copyLink = async (role: 'viewer' | 'driver') => {
    const token = role === 'driver' ? info?.driverToken : info?.viewerToken;
    if (!token) return;
    try {
      await navigator.clipboard.writeText(urlFor(role, token));
      setNotice(role === 'driver' ? 'Link do entregador copiado.' : 'Link do cliente copiado.');
    } catch {
      setNotice('Não foi possível copiar automaticamente. Abra o link e copie pela barra de endereço.');
    }
  };

  return <div className="mb-3 pl-1 sm:pl-12">
    <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
      onClick={() => setOpen(value => !value)}>{open ? 'Ocultar mapa e rastreamento' : 'Google Maps · Rastrear entrega'}</button>
    {open && <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-600">O entregador precisa abrir seu próprio link no celular e permitir o GPS. O cliente recebe um acesso somente de leitura.</p>
      <div className="flex flex-wrap gap-2">
        {!terminal && !info?.active && <button disabled={busy} onClick={() => void update('start')}
          className="rounded-lg bg-[#f45f3f] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
          Ativar rastreamento
        </button>}
        {info?.active && <>
          <button onClick={() => void copyLink('viewer')} className="rounded-lg border px-3 py-2 text-xs font-semibold">Copiar link do cliente</button>
          <button onClick={() => void copyLink('driver')} className="rounded-lg border px-3 py-2 text-xs font-semibold">Copiar link do entregador</button>
          {info.viewerToken && <a href={urlFor('viewer', info.viewerToken)} target="_blank" rel="noopener noreferrer"
            referrerPolicy="no-referrer" className="rounded-lg border px-3 py-2 text-xs font-semibold text-blue-700">Abrir visão do cliente</a>}
          {info.driverToken && <a href={urlFor('driver', info.driverToken)} target="_blank" rel="noopener noreferrer"
            referrerPolicy="no-referrer" className="rounded-lg border px-3 py-2 text-xs font-semibold text-blue-700">Abrir visão do entregador</a>}
          <button disabled={busy} onClick={() => void update('stop')}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60">Encerrar rastreamento</button>
        </>}
      </div>
      {notice && <p role="status" className="text-xs text-slate-700">{notice}</p>}
      {info?.active && <GoogleDeliveryMap position={info.position} />}
      {terminal && <p className="text-xs text-slate-500">Pedido encerrado; o compartilhamento de localização está desativado.</p>}
      {!terminal && status !== 'Pronto' && <p className="text-xs text-amber-700">O GPS só poderá ser enviado quando o pedido estiver no status Pronto (saída para entrega).</p>}
    </div>}
  </div>;
}

export function DeliveryPublicPage({ mode, token }: { mode: 'viewer' | 'driver'; token: string }) {
  const [info, setInfo] = useState<TrackingInfo | null>(null);
  const [message, setMessage] = useState('Carregando acompanhamento...');
  const [sharing, setSharing] = useState(false);
  const watch = useRef<number | null>(null);
  const lastSent = useRef(0);
  const inFlight = useRef(false);

  const stopSharing = () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setSharing(false);
  };

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const result = await api.get<TrackingInfo>('/api/delivery/track/' + encodeURIComponent(token));
        if (mounted) {
          setInfo(result.data);
          setMessage('');
          if (!result.data.active && watch.current !== null) {
            navigator.geolocation.clearWatch(watch.current);
            watch.current = null;
            setSharing(false);
          }
        }
      } catch (err) {
        if (mounted) setMessage(err instanceof Error ? err.message : 'Link indisponível.');
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
    };
  }, [token]);

  const startSharing = () => {
    if (!window.isSecureContext || !navigator.geolocation) {
      setMessage('O compartilhamento de localização requer HTTPS e GPS disponível neste dispositivo.');
      return;
    }
    if (info?.status !== 'Pronto' || !info.active || watch.current !== null) return;
    setMessage('Aguardando autorização e posição do GPS...');
    watch.current = navigator.geolocation.watchPosition(async value => {
      const now = Date.now();
      if (inFlight.current || now - lastSent.current < 8000) return;
      lastSent.current = now;
      inFlight.current = true;
      try {
        await api.post('/api/delivery/location/' + encodeURIComponent(token), {
          lat: value.coords.latitude, lng: value.coords.longitude, accuracy: value.coords.accuracy,
        });
        setMessage('Localização enviada · ' + new Date().toLocaleTimeString('pt-BR'));
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Falha ao enviar GPS.');
        stopSharing();
      } finally {
        inFlight.current = false;
      }
    }, error => {
      setMessage(error.code === 1 ? 'Permissão de localização negada. Ative o GPS nas configurações do navegador.' :
        'GPS indisponível no momento. Verifique sinal e permissão.');
      stopSharing();
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    setSharing(true);
  };

  const complete = info && ['Entregue', 'Finalizado', 'Cancelado'].includes(info.status || '');
  return <main className="min-h-screen bg-[#f6f5f2] px-4 py-8 text-[#303238]">
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="rounded-xl border bg-white p-5">
        <div className="text-xs font-bold uppercase tracking-wide text-[#e65c3d]">TAPFOOD · Delivery</div>
        <h1 className="mt-2 text-2xl font-bold">{mode === 'driver' ? 'Compartilhar localização' : 'Acompanhe sua entrega'}</h1>
        {info && <p className="mt-2 text-sm text-slate-700">Pedido {info.code} · <b>{info.status}</b></p>}
      </header>
      <section className="space-y-4 rounded-xl border bg-white p-5">
        {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
        {info && <>
          {complete ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            {info.status === 'Cancelado' ? 'Pedido cancelado. Rastreamento encerrado.' : 'Entrega encerrada. O compartilhamento de localização foi finalizado.'}
          </p> : !info.active ? <p className="text-sm text-slate-600">Rastreamento encerrado ou expirado.</p> :
            <p className="text-sm text-slate-600">{info.status === 'Pronto' ? 'Pedido liberado para entrega.' : 'Pedido em preparação. A localização aparecerá quando o entregador iniciar a rota.'}</p>}
          {mode === 'driver' && info.active && !complete && <div className="space-y-2">
            {info.status === 'Pronto' ? (sharing ?
              <button className="rounded-lg border border-red-200 px-4 py-3 text-sm font-bold text-red-700" onClick={stopSharing}>Parar compartilhamento neste celular</button> :
              <button className="rounded-lg bg-[#f45f3f] px-4 py-3 text-sm font-bold text-white" onClick={startSharing}>Iniciar compartilhamento do GPS</button>
            ) : <p className="text-xs text-amber-700">Aguarde a liberação do pedido para iniciar o GPS.</p>}
            <p className="text-xs text-slate-500">Compartilhe apenas durante a entrega e mantenha esta página aberta, com localização ativada. O navegador pode interromper o GPS com a tela bloqueada ou em segundo plano.</p>
          </div>}
          {info.active && <GoogleDeliveryMap position={info.position} />}
        </>}
      </section>
      <p className="text-center text-[11px] text-slate-500">A localização é mostrada somente durante a entrega. Não compartilhe o link do entregador com terceiros.</p>
    </div>
  </main>;
}
