import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/admin/firebase/admin';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'guildrealm_trusted';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 dias
const MAX_DEVICES = 10;

function deviceLabelFromUA(ua: string): string {
  const u = (ua || '').toLowerCase();
  let browser = 'Navegador desconhecido';
  if (u.includes('edg')) browser = 'Edge';
  else if (u.includes('chrome') && !u.includes('edg')) browser = 'Chrome';
  else if (u.includes('safari') && !u.includes('chrome')) browser = 'Safari';
  else if (u.includes('firefox')) browser = 'Firefox';
  else if (u.includes('opera') || u.includes('opr')) browser = 'Opera';

  let os = '';
  if (u.includes('windows')) os = 'Windows';
  else if (u.includes('mac os') || u.includes('macintosh')) os = 'macOS';
  else if (u.includes('iphone')) os = 'iPhone';
  else if (u.includes('ipad')) os = 'iPad';
  else if (u.includes('android')) os = 'Android';
  else if (u.includes('linux')) os = 'Linux';

  return os ? `${browser} — ${os}` : browser;
}

async function checkRateLimit(uid: string): Promise<void> {
  const ref = adminDb.doc(`trusted_device_attempts/${uid}`);
  const now = Date.now();
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({ count: 1, windowStart: now });
    return;
  }
  const data: any = snap.data();
  const ws = data.windowStart ?? now;
  if (now - ws > 10 * 60 * 1000) {
    await ref.set({ count: 1, windowStart: now });
    return;
  }
  if ((data.count ?? 0) >= 5) {
    throw new Error('RATE_LIMITED');
  }
  const { FieldValue } = await import('firebase-admin/firestore');
  await ref.update({ count: FieldValue.increment(1) });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }
    const idToken = authHeader.slice(7);
    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }
    const uid = decoded.uid;

    // Verifica se 2FA está habilitado
    const totpSnap = await adminDb.doc(`users/${uid}/security/totp`).get();
    if (!totpSnap.exists || !totpSnap.data()?.enabled) {
      return NextResponse.json({ error: '2fa_not_enabled' }, { status: 400 });
    }

    // Verifica se existe sessão 2FA recente (deve ter verificado TOTP nos últimos 5min)
    const sessSnap = await adminDb.doc(`users/${uid}/security/twoFactorSession`).get();
    if (!sessSnap.exists) {
      return NextResponse.json({ error: '2fa_not_verified' }, { status: 403 });
    }
    const sessData: any = sessSnap.data();
    const verifiedAtMs = sessData.verifiedAt?.toMillis ? sessData.verifiedAt.toMillis() : 0;
    if (!verifiedAtMs || Date.now() - verifiedAtMs > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'session_not_fresh' }, { status: 403 });
    }

    await checkRateLimit(`create_${uid}`).catch((e) => {
      if ((e as Error).message === 'RATE_LIMITED') throw e;
    });

    // Gera token seguro 32 bytes
    const rawToken = crypto.randomBytes(32).toString('hex'); // 64 hex
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const deviceId = adminDb.collection(`users/${uid}/trustedDevices`).doc().id;
    const ua = req.headers.get('user-agent') || '';
    const label = deviceLabelFromUA(ua);

    const { Timestamp, FieldValue } = await import('firebase-admin/firestore');

    // Limite de 10 dispositivos: remove o mais antigo se necessário
    const col = adminDb.collection(`users/${uid}/trustedDevices`);
    const existing = await col.orderBy('createdAt', 'asc').get();
    if (existing.size >= MAX_DEVICES) {
      const toDelete = existing.docs.slice(0, existing.size - MAX_DEVICES + 1);
      const batch = adminDb.batch();
      toDelete.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    await adminDb.doc(`users/${uid}/trustedDevices/${deviceId}`).set({
      userId: uid,
      tokenHash,
      createdAt: FieldValue.serverTimestamp(),
      lastUsedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
      revoked: false,
      revokedAt: null,
      userAgent: ua.slice(0, 500),
      deviceLabel: label,
    });

    // Auditoria
    try {
      await adminDb.collection(`users/${uid}/activity`).add({
        type: 'TRUSTED_DEVICE_CREATED',
        deviceId,
        deviceLabel: label,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch {}

    // Renova sessão para 30 dias? Não, mantém sessão curta mas já está ok.
    // Cria cookie HttpOnly
    const cookieValue = `${deviceId}.${rawToken}`;
    const isProd = process.env.NODE_ENV === 'production';
    const response = NextResponse.json({ success: true, deviceId, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });

    response.cookies.set(COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (e: any) {
    if (e.message === 'RATE_LIMITED') {
      return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
    }
    console.error('[create trusted] error', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
