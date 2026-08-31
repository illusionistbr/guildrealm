import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/admin/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
    const col = adminDb.collection(`users/${uid}/trustedDevices`);
    const snap = await col.orderBy('createdAt', 'desc').get();
    const devices = snap.docs.map((d) => {
      const data: any = d.data();
      // Nunca retornar tokenHash
      return {
        deviceId: d.id,
        deviceLabel: data.deviceLabel || 'Dispositivo',
        createdAt: data.createdAt,
        lastUsedAt: data.lastUsedAt,
        expiresAt: data.expiresAt,
        revoked: !!data.revoked,
        userAgent: data.userAgent ? String(data.userAgent).slice(0, 80) : undefined,
      };
    }).filter((d) => !d.revoked); // só ativos; pode incluir revogados se quiser

    return NextResponse.json({ devices });
  } catch (e) {
    console.error('[list trusted] error', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
