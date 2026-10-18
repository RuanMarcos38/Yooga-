import { useEffect, useRef, useState } from 'react';
import { api } from './lib/api';
import { QRCodeSVG } from 'qrcode.react';

type Position = { lat: number; lng: number; accuracy: number; updatedAt: string };
type Assignment = { driverName: string; driverPhone: string; recipient: string; address: string; notes: string };
const emptyAssignment: Assignment = { driverName: '', driverPhone: '', recipient: '', address: '', notes: '' };
type TrackingInfo = {
  exists?: boolean;
  code?: string;
  status?: string;
  active: boolean;
  position?: Position | null;
  viewerToken?: string | null;
  driverToken?: string | null;
  expiresAt?: string;
  assignment?: Assignment | null;
  driverName?: string;
  departedAt?: string | null;
};

function DeliveryAssignmentForm({ orderId, initial, onSaved }: { orderId: string; initial?: Assignment | null; onSaved: (value: TrackingInfo) => void }) {
  const [draft, setDraft] = useState<Assignment>(() => initial || emptyAssignment);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const fields = [['recipient', 'Destinatário', 120], ['address', 'Endereço completo de entrega', 300],
    ['driverName', 'Nome do motoboy', 100], ['driverPhone', 'Telefone do motoboy com DDD', 20], ['notes', 'Referência / instruções para o motoboy', 500]] as const;
  return <form className="space-y-3 rounded-xl bg-slate-50 p-3" onSubmit={async event => {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      await api.put('/api/delivery/' + encodeURIComponent(orderId) + '/assignment', draft);
      const response = await api.get<TrackingInfo>('/api/delivery/' + encodeURIComponent(orderId) + '/tracking');
      onSaved(response.data); setMessage('Entrega salva. Os acessos estão disponíveis abaixo.');
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Não foi possível salvar a entrega.'); }
    finally { setSaving(false); }
  }}>
    <h3 className="text-sm font-bold">1. Dados da entrega e do motoboy</h3>
    <div className="grid gap-3 sm:grid-cols-2">{fields.map(([key, label, limit]) => <label key={key} className={'text-xs ' + (key === 'address' || key === 'notes' ? 'sm:col-span-2' : '')}>
      {label}{(key === 'recipient' || key === 'address') && ' *'}
      <input className="mt-1 w-full rounded-lg border bg-white p-2 text-sm" value={draft[key]} maxLength={limit}
        type={key === 'driverPhone' ? 'tel' : 'text'} required={key === 'recipient' || key === 'address'}
        onChange={event => setDraft(value => ({ ...value, [key]: event.target.value }))} />
    </label>)}</div>
    <p className="text-xs text-slate-500">O motoboy também pode informar nome e telefone no próprio celular. Endereço e instruções ficam restritos à equipe e ao link do entregador.</p>
    <p className="text-xs text-slate-500">Ao trocar nome ou telefone do motoboy por aqui, os links anteriores serão revogados. Envie os novos acessos ao motoboy e ao cliente.</p>
    <button disabled={saving} className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar entrega e gerar acessos'}</button>
    {message && <p role="status" className="text-xs text-slate-700">{message}</p>}
  </form>;
}

function DeliveryAccess({ role, token }: { role: 'viewer' | 'driver'; token: string }) {
  const url = urlFor(role, token);
  return <div className="min-w-0 space-y-2 rounded-xl border p-3">
    <h4 className="text-xs font-bold">{role === 'driver' ? '2. Acesso do motoboy' : '3. Acompanhamento do cliente'}</h4>
    <QRCodeSVG value={url} size={112} title={role === 'driver' ? 'QR do motoboy' : 'QR do cliente'} />
    <label className="block text-xs">{role === 'driver' ? 'Link exclusivo do motoboy' : 'Link de acompanhamento do cliente'}
      <input readOnly value={url} onFocus={event => event.target.select()} className="mt-1 w-full rounded border p-2 text-xs" />
    </label>
    <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="inline-block rounded-lg border px-3 py-2 text-xs font-semibold text-blue-700">{role === 'driver' ? 'Abrir painel do motoboy' : 'Abrir acompanhamento'}</a>
    <p className="text-xs text-slate-500">{role === 'driver' ? 'Envie este link somente ao motoboy. Ele permite enviar GPS e confirmar a entrega.' : 'Este acesso permite apenas acompanhar a entrega.'}</p>
  </div>;
}

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
      onClick={() => setOpen(value => !value)}>{open ? 'Ocultar detalhes da entrega' : terminal ? 'Ver entrega encerrada' : 'Preparar entrega / Motoboy e GPS'}</button>
    {open && <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      {!terminal && <p className="text-xs text-slate-600">Preencha o destino, envie o acesso ao motoboy e libere o pedido com Despachar. No celular, o motoboy confirma os dados e inicia o GPS.</p>}
      {info && !terminal && <DeliveryAssignmentForm orderId={orderId} initial={info.assignment} onSaved={setInfo} />}
      {info?.active && !terminal && <div className="grid gap-3 sm:grid-cols-2">
        {info.driverToken && <DeliveryAccess role="driver" token={info.driverToken} />}
        {info.viewerToken && <DeliveryAccess role="viewer" token={info.viewerToken} />}
      </div>}
      <div className="flex flex-wrap gap-2">
        {info?.active && !terminal && <>
          <button onClick={() => void copyLink('viewer')} className="rounded-lg border px-3 py-2 text-xs font-semibold">Copiar link do cliente</button>
          <button onClick={() => void copyLink('driver')} className="rounded-lg border px-3 py-2 text-xs font-semibold">Copiar link do entregador</button>
          <button disabled={busy} onClick={() => void update('stop')}
            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60">Encerrar rastreamento</button>
        </>}
      </div>
      {notice && <p role="status" className="text-xs text-slate-700">{notice}</p>}
      {info?.active && !terminal && <><h3 className="text-sm font-bold">4. Acompanhar GPS</h3>
        <p className="text-xs text-slate-600">{info.departedAt ? 'Rota iniciada pelo motoboy.' : 'Aguardando o motoboy iniciar o GPS.'}</p>
        <GoogleDeliveryMap position={info.position} /></>}
      {terminal && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Esta entrega já foi encerrada. O GPS foi desativado para proteger a localização do motoboy. Para outra entrega, use Novo delivery.</p>}
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
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const profileLoaded = useRef(false);

  const stopSharing = () => {
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setSharing(false);
  };

  useEffect(() => {
    let mounted = true;
    profileLoaded.current = false;
    setProfileSaved(false);
    setInfo(null);
    lastSent.current = 0;
    const refresh = async () => {
      try {
        const result = await api.get<TrackingInfo>('/api/delivery/track/' + encodeURIComponent(token));
        if (mounted) {
          setInfo(result.data);
          if (!profileLoaded.current) {
            setDriverName(result.data.assignment?.driverName || '');
            setDriverPhone(result.data.assignment?.driverPhone || '');
            setProfileSaved(Boolean(result.data.assignment?.driverName && result.data.assignment?.driverPhone));
            profileLoaded.current = true;
            setMessage('');
          }
          if (!result.data.active && watch.current !== null) {
            navigator.geolocation.clearWatch(watch.current);
            watch.current = null;
            setSharing(false);
          }
        }
      } catch (err) {
        if (mounted) {
          setInfo(null);
          setMessage(err instanceof Error ? err.message : 'Link indisponível.');
          if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
          watch.current = null; setSharing(false);
        }
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
    if (!profileSaved || info?.status !== 'Pronto' || !info.active || watch.current !== null) return;
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
        setInfo(current => current ? { ...current, departedAt: current.departedAt || new Date().toISOString() } : current);
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
        <h1 className="mt-2 text-2xl font-bold">{mode === 'driver' ? 'Painel do motoboy' : 'Acompanhe sua entrega'}</h1>
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
            {info.assignment?.address && <div className="space-y-2 rounded-xl bg-slate-50 p-4">
              <h2 className="font-bold">Destino da entrega</h2>
              <p className="text-sm">{info.assignment.recipient}</p>
              <p className="whitespace-pre-wrap break-words text-sm">{info.assignment.address}</p>
              {info.assignment.notes && <p className="whitespace-pre-wrap break-words text-sm text-slate-600">Referência: {info.assignment.notes}</p>}
              <a target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
                className="inline-block rounded-lg border bg-white px-4 py-3 text-sm font-bold text-blue-700"
                href={'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(info.assignment.address)}>Abrir rota no Google Maps</a>
            </div>}
            {!info.assignment?.address && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">O estabelecimento ainda precisa informar o endereço de entrega.</p>}
            {profileSaved ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
              <span>Motoboy: <b>{driverName}</b> · {driverPhone}</span>
              <button className="rounded border px-3 py-2 text-xs font-semibold" onClick={() => setProfileSaved(false)}>Editar meus dados</button>
            </div> : <form className="space-y-3 rounded-xl border p-4" onSubmit={async event => {
              event.preventDefault(); setSaving(true);
              try {
                await api.post('/api/delivery/driver/' + encodeURIComponent(token) + '/profile', { driverName, driverPhone });
                setProfileSaved(true); setMessage('Dados confirmados. Quando o pedido estiver liberado, inicie o GPS.');
              } catch (err) { setMessage(err instanceof Error ? err.message : 'Falha ao salvar dados.'); }
              finally { setSaving(false); }
            }}>
              <h2 className="font-bold">Seus dados</h2>
              <label className="block text-sm">Nome do motoboy<input required maxLength={100} autoComplete="name" value={driverName}
                onChange={event => { setDriverName(event.target.value); setProfileSaved(false); }} className="mt-1 w-full rounded-lg border p-3" /></label>
              <label className="block text-sm">Telefone com DDD<input required maxLength={20} type="tel" autoComplete="tel" value={driverPhone}
                onChange={event => { setDriverPhone(event.target.value); setProfileSaved(false); }} className="mt-1 w-full rounded-lg border p-3" /></label>
              <button disabled={saving} className="rounded-lg bg-slate-800 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Salvando...' : profileSaved ? 'Dados confirmados · Atualizar' : 'Confirmar meus dados'}</button>
            </form>}
            {!profileSaved && <p className="text-xs text-amber-700">Confirme nome e telefone antes de compartilhar o GPS.</p>}
            {info.status === 'Pronto' ? (sharing ?
              <button className="rounded-lg border border-red-200 px-4 py-3 text-sm font-bold text-red-700" onClick={stopSharing}>Parar compartilhamento neste celular</button> :
              <button disabled={!profileSaved || !info.assignment?.address} className="w-full rounded-lg bg-[#f45f3f] px-4 py-4 text-sm font-bold text-white disabled:opacity-50" onClick={startSharing}>Iniciar rota e compartilhar GPS</button>
            ) : <p className="text-xs text-amber-700">Aguarde a liberação do pedido para iniciar o GPS.</p>}
            <p className="text-xs text-slate-500">Compartilhe apenas durante a entrega e mantenha esta página aberta, com localização ativada. O navegador pode interromper o GPS com a tela bloqueada ou em segundo plano.</p>
            {info.departedAt && info.status === 'Pronto' && <div className="rounded-xl border border-emerald-200 p-3">
              {confirming ? <><p className="mb-2 text-sm">O pedido foi recebido pelo destinatário? Ao confirmar, a entrega será encerrada e o GPS removido.</p>
                <button disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50" onClick={async () => {
                  setSaving(true);
                  try {
                    await api.post('/api/delivery/driver/' + encodeURIComponent(token) + '/complete', {});
                    stopSharing(); setInfo(current => current ? { ...current, active: false, status: 'Entregue', position: null, assignment: null } : current);
                    setMessage('Entrega confirmada. Obrigado!'); setConfirming(false);
                  } catch (err) { setMessage(err instanceof Error ? err.message : 'Não foi possível confirmar.'); }
                  finally { setSaving(false); }
                }}>Confirmar entrega recebida</button>
                <button className="ml-3 p-2 text-sm" onClick={() => setConfirming(false)}>Voltar</button></> :
                <button className="w-full rounded-lg border border-emerald-300 px-4 py-3 text-sm font-bold text-emerald-800" onClick={() => setConfirming(true)}>Finalizar entrega</button>}
            </div>}
          </div>}
          {mode === 'viewer' && info.driverName && info.active && <p className="text-sm text-slate-600">Motoboy: {info.driverName}</p>}
          {mode === 'viewer' && info.active && <p className="text-xs text-slate-500">Atualização automática a cada 10 segundos. {info.departedAt ? 'Motoboy em rota.' : 'Aguardando início da rota.'}</p>}
          {info.active && <GoogleDeliveryMap position={info.position} />}
        </>}
      </section>
      <p className="text-center text-[11px] text-slate-500">A localização é mostrada somente durante a entrega. Não compartilhe o link do entregador com terceiros.</p>
    </div>
  </main>;
}
