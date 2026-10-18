import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './appdeploy-compat.js';
import { sessionSigningSecret } from './session-secret.js';

// Rastreamento isolado por empresa e unidade; não altera registros de pedidos, caixa ou credenciais.
export type DeliveryPosition = { lat: number; lng: number; accuracy: number; updatedAt: string };
export type DeliveryTracking = {
  id: string;
  orderId: string;
  nonce: string;
  expiresAt: string;
  active: boolean;
  position?: DeliveryPosition;
};
export type DeliveryClaims = {
  v: 1;
  t: string;
  u: string;
  o: string;
  n: string;
  r: 'viewer' | 'driver';
  exp: number;
};

const cleanPart = (value: string) => value.replace(/[^a-z0-9_-]/gi, '_');
function collection(tenantId: string, unitId: string) {
  const base = 'tapfood_delivery_tracking';
  if (!tenantId || tenantId === '__master__') return base;
  return base + '__' + cleanPart(tenantId) + (unitId ? '__' + cleanPart(unitId) : '');
}
export async function readDeliveryTracking(tenantId: string, unitId: string, orderId: string) {
  const records = await db.list<DeliveryTracking>(collection(tenantId, unitId));
  return records.items.find(item => item.orderId === orderId) || null;
}
export async function enableDeliveryTracking(tenantId: string, unitId: string, orderId: string) {
  const existing = await readDeliveryTracking(tenantId, unitId, orderId);
  if (existing?.active && Date.parse(existing.expiresAt) > Date.now()) return existing;
  const record = {
    orderId,
    nonce: randomBytes(24).toString('base64url'),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    active: true,
  };
  if (existing) {
    const [updated] = await db.update(collection(tenantId, unitId), [{ id: existing.id, record }]);
    if (!updated) throw new Error('Falha ao reativar rastreamento');
    return { ...record, id: existing.id } as DeliveryTracking;
  }
  const [id] = await db.add(collection(tenantId, unitId), [record]);
  if (!id) throw new Error('Falha ao criar rastreamento');
  return { ...record, id } as DeliveryTracking;
}
export async function stopDeliveryTracking(tenantId: string, unitId: string, orderId: string) {
  const record = await readDeliveryTracking(tenantId, unitId, orderId);
  if (!record) return;
  const { position: _position, ...withoutPosition } = record;
  const [updated] = await db.update(collection(tenantId, unitId), [{
    id: record.id, record: { ...withoutPosition, active: false },
  }]);
  if (!updated) throw new Error('Falha ao encerrar rastreamento');
}
export async function saveDeliveryPosition(tenantId: string, unitId: string, record: DeliveryTracking, value: DeliveryPosition) {
  const current = await readDeliveryTracking(tenantId, unitId, record.orderId);
  if (!current || current.nonce !== record.nonce || !current.active || Date.parse(current.expiresAt) <= Date.now()) return 'inactive';
  if (current.position && Date.now() - Date.parse(current.position.updatedAt) < 4000) return 'throttled';
  const [updated] = await db.update(collection(tenantId, unitId), [{
    id: current.id, record: { ...current, position: value },
  }]);
  return updated ? 'ok' : 'inactive';
}
export function deliveryToken(record: DeliveryTracking, tenantId: string, unitId: string, role: 'viewer' | 'driver') {
  const payload: DeliveryClaims = { v: 1, t: tenantId, u: unitId, o: record.orderId, n: record.nonce, r: role, exp: Date.parse(record.expiresAt) };
  const base = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = createHmac('sha256', sessionSigningSecret()).update('tapfood-delivery-v1:' + base).digest('base64url');
  return 'd.' + base + '.' + mac;
}
export function verifyDeliveryToken(token: string): DeliveryClaims | null {
  if (!/^d\.[A-Za-z0-9_-]{20,1500}\.[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const parts = token.split('.');
  const expected = createHmac('sha256', sessionSigningSecret()).update('tapfood-delivery-v1:' + parts[1]).digest();
  const supplied = Buffer.from(parts[2], 'base64url');
  if (supplied.toString('base64url') !== parts[2] || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as DeliveryClaims;
    if (claims.v !== 1 || !['viewer', 'driver'].includes(claims.r) || typeof claims.t !== 'string' ||
      typeof claims.u !== 'string' || typeof claims.o !== 'string' || typeof claims.n !== 'string' ||
      !claims.t || !claims.o || !claims.n || !Number.isFinite(claims.exp) || claims.exp <= Date.now() ||
      claims.exp > Date.now() + 25 * 60 * 60 * 1000 ||
      claims.t.length > 100 || claims.u.length > 100 || claims.o.length > 150) return null;
    return claims;
  } catch {
    return null;
  }
}
