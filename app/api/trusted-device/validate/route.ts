import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/admin/firebase/admin';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'guildrealm_trusted';
const TRUSTED_DEVICE_COLLECTION = 'trustedDevices';

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  header.split(';').forEach((p) => {
    const idx = p.indexOf('=');
    if (idx === -1) return;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ trusted: false, reason: 'no_auth' }, { status: 401 });
    }
    const idToken = authHeader.slice(7);
    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ trusted: false, reason: 'invalid_token' }, { status: 401 });
    }
    const uid = decoded.uid;

    // Check if 2FA is enabled - if not, trusted device is irrelevant but we allow
    const totpSnap = await adminDb.doc(`users/${uid}/security/totp`).get();
    if (!totpSnap.exists || !totpSnap.data()?.enabled) {
      return NextResponse.json({ trusted: false, reason: '2fa_not_enabled' });
    }

    // NextRequest.cookies é mais confiável que parse manual; fallback para header
    const rawCookie = req.cookies.get(COOKIE_NAME)?.value ?? parseCookies(req.headers.get('cookie'))[COOKIE_NAME];
    if (!rawCookie) {
      console.warn(`[validate trusted] no_cookie uid=${uid} cookieHeader=${(req.headers.get('cookie')||'').slice(0,120)} host=${req.headers.get('host')}`);
      return NextResponse.json({ trusted: false, reason: 'no_cookie' });
    }
    // cookie format: deviceId.rawToken
    const dotIdx = rawCookie.indexOf('.');
    if (dotIdx === -1) {
      return NextResponse.json({ trusted: false, reason: 'malformed_cookie' });
    }
    const deviceId = rawCookie.slice(0, dotIdx);
    const rawToken = rawCookie.slice(dotIdx + 1);
    if (!deviceId || !rawToken || !/^[a-fA-F0-9]{64}$/.test(rawToken)) {
      return NextResponse.json({ trusted: false, reason: 'invalid_token_format' });
    }

    const docRef = adminDb.doc(`users/${uid}/trustedDevices/${deviceId}`);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ trusted: false, reason: 'device_not_found' });
    }
    const data: any = snap.data();
    if (data.userId !== uid) {
      return NextResponse.json({ trusted: false, reason: 'user_mismatch' });
    }
    if (data.revoked === true) {
      return NextResponse.json({ trusted: false, reason: 'revoked' });
    }
    const expiresAtMs = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : (data.expiresAt?.seconds ? data.expiresAt.seconds * 1000 : 0);
    if (!expiresAtMs || Date.now() > expiresAtMs) {
      // opcional: deletar expirado
      return NextResponse.json({ trusted: false, reason: 'expired' });
    }
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    if (!timingSafeEqualHex(tokenHash, data.tokenHash)) {
      return NextResponse.json({ trusted: false, reason: 'hash_mismatch' });
    }

    // Atualiza lastUsedAt no máximo 1 vez por hora para evitar custo
    const lastUsedMs = data.lastUsedAt?.toMillis ? data.lastUsedAt.toMillis() : 0;
    if (!lastUsedMs || Date.now() - lastUsedMs > 60 * 60 * 1000) {
      const { FieldValue } = await import('firebase-admin/firestore');
      await docRef.update({ lastUsedAt: FieldValue.serverTimestamp() });
    }

    // Opcional: garante que twoFactorSession existe para compatibilidade com guard que checa sessão
    // Cria/renova sessão de 30min para este login confiável
    try {
      const sessRef = adminDb.doc(`users/${uid}/security/twoFactorSession`);
      const sessSnap = await sessRef.get();
      const needRenew = !sessSnap.exists || (() => {
        const d: any = sessSnap.data();
        const exp = d?.expiresAt?.toMillis ? d.expiresAt.toMillis() : 0;
        return !exp || Date.now() > exp || (d?.verifiedAt?.toMillis ? d.verifiedAt.toMillis() < Date.now() - 30 * 60 * 1000 : true);
      })();
      if (needRenew) {
        const { Timestamp } = await import('firebase-admin/firestore');
        await sessRef.set({
          verifiedAt: Timestamp.now(),
          viaTrustedDevice: true,
          deviceId,
          expiresAt: Timestamp.fromMillis(Date.now() + 30 * 60 * 1000),
        }, { merge: true });
      }
    } catch {}

    return NextResponse.json({ trusted: true, deviceId, expiresAt: data.expiresAt });
  } catch (e: any) {
    console.error('[validate trusted] error', e);
    return NextResponse.json({ trusted: false, reason: 'internal' }, { status: 500 });
  }
}
