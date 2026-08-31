import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/admin/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'guildrealm_trusted';

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
    const body = await req.json().catch(() => ({}));
    const deviceId = String(body.deviceId || '').trim();
    if (!deviceId) return NextResponse.json({ error: 'deviceId_required' }, { status: 400 });

    const ref = adminDb.doc(`users/${uid}/trustedDevices/${deviceId}`);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const data: any = snap.data();
    if (data.userId !== uid) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const { FieldValue } = await import('firebase-admin/firestore');
    await ref.update({ revoked: true, revokedAt: FieldValue.serverTimestamp() });

    try {
      await adminDb.collection(`users/${uid}/activity`).add({
        type: 'TRUSTED_DEVICE_REVOKED',
        deviceId,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch {}

    // Se o cookie atual for deste device, limpar cookie
    const cookieHeader = req.headers.get('cookie');
    const cookies = parseCookies(cookieHeader);
    const rawCookie = cookies[COOKIE_NAME];
    let shouldClear = false;
    if (rawCookie && rawCookie.startsWith(deviceId + '.')) shouldClear = true;

    const response = NextResponse.json({ success: true });
    if (shouldClear) {
      response.cookies.set(COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
    }
    return response;
  } catch (e) {
    console.error('[revoke trusted] error', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
