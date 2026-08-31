import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/admin/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'guildrealm_trusted';

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

    // Opcional: exigir TOTP recente para ação sensível - por enquanto só exige auth recente via ID token
    // Poderíamos exigir body.code TOTP, mas spec diz considerar exigir para revoke-all extremamente sensível
    // Vamos exigir que 2FA esteja verificado recentemente se 2FA habilitado? Para simplicidade, só auth.

    const col = adminDb.collection(`users/${uid}/trustedDevices`);
    const snap = await col.where('revoked', '==', false).get();
    const { FieldValue } = await import('firebase-admin/firestore');
    const batch = adminDb.batch();
    snap.docs.forEach((d) => {
      batch.update(d.ref, { revoked: true, revokedAt: FieldValue.serverTimestamp() });
    });
    await batch.commit();

    try {
      await adminDb.collection(`users/${uid}/activity`).add({
        type: 'TRUSTED_DEVICES_REVOKED_ALL',
        count: snap.size,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch {}

    const response = NextResponse.json({ success: true, revoked: snap.size });
    // Limpa cookie atual
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (e) {
    console.error('[revoke-all] error', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
