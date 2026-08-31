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

    // Verifica prova de 2FA recente: aceita session OU challenge COMPLETED (evita lag us-central1->iad1)
    const body = await req.json().catch(()=> ({}));
    const proofChallengeId = typeof body.challengeId === 'string' ? body.challengeId.trim() : '';

    let hasValidProof = false;
    let proofReason = '';

    // Caminho 1: challenge recém completado (mais confiável, ignora replicação de session)
    if (proofChallengeId) {
      try {
        const chSnap = await adminDb.doc(`authChallenges/${proofChallengeId}`).get();
        if (chSnap.exists) {
          const ch: any = chSnap.data();
          const completedMs = ch.completedAt?.toMillis ? ch.completedAt.toMillis() : (ch.completedAt?.seconds ? ch.completedAt.seconds*1000 : 0);
          const isOwn = ch.userId === uid;
          const isCompleted = ch.status === 'COMPLETED';
          const isRecent = completedMs && Date.now() - completedMs < 5*60*1000;
          if (isOwn && isCompleted && isRecent) hasValidProof = true;
          else proofReason = `challenge_${ch.status}_${isOwn?'own':'foreign'}_${isRecent?'recent':'stale'}`;
        } else proofReason = 'challenge_not_found';
      } catch(e:any){ proofReason = 'challenge_error:'+e.message; }
    }

    // Caminho 2: twoFactorSession recente (fallback, com retry para replicação)
    if (!hasValidProof) {
      let sessSnap = await adminDb.doc(`users/${uid}/security/twoFactorSession`).get();
      let sessData: any = sessSnap.data();
      let verifiedAtMs = sessData?.verifiedAt?.toMillis ? sessData.verifiedAt.toMillis() : (sessData?.verifiedAt?.seconds ? sessData.verifiedAt.seconds*1000 : 0);
      if (!sessSnap.exists || !verifiedAtMs || Date.now() - verifiedAtMs > 5 * 60 * 1000) {
        // retry 2x para replicação
        for(let i=0;i<2;i++){
          await new Promise(r=>setTimeout(r, 800));
          sessSnap = await adminDb.doc(`users/${uid}/security/twoFactorSession`).get();
          sessData = sessSnap.data();
          verifiedAtMs = sessData?.verifiedAt?.toMillis ? sessData.verifiedAt.toMillis() : (sessData?.verifiedAt?.seconds ? sessData.verifiedAt.seconds*1000 : 0);
          if (sessSnap.exists && verifiedAtMs && Date.now() - verifiedAtMs <= 5*60*1000) break;
        }
      }
      if (sessSnap.exists && verifiedAtMs && Date.now() - verifiedAtMs <= 5*60*1000) hasValidProof = true;
      else proofReason = proofReason || (sessSnap.exists ? `session_stale_${Date.now()- (verifiedAtMs||0)}ms` : '2fa_not_verified');
    }

    if (!hasValidProof) {
      console.warn(`[create trusted] denied uid=${uid} reason=${proofReason} challengeId=${proofChallengeId||'none'}`);
      // mapeia para erro compatível com cliente
      const err = proofReason.includes('challenge') && proofReason.includes('stale') ? 'session_not_fresh' : (proofReason.includes('not_found') || proofReason.includes('2fa_not_verified') ? '2fa_not_verified' : 'session_not_fresh');
      return NextResponse.json({ error: err, detail: proofReason }, { status: 403 });
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

    // Cria cookie HttpOnly - domínio .clanforge.app para compartilhar www <-> não-www
    const cookieValue = `${deviceId}.${rawToken}`;
    const isProd = process.env.NODE_ENV === 'production';
    const host = req.headers.get('host') || req.headers.get('x-forwarded-host') || '';
    const isClanForgeHost = host.includes('clanforge.app');
    const cookieDomain = isClanForgeHost ? '.clanforge.app' : undefined;
    const response = NextResponse.json({ success: true, deviceId, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });

    // Detecta se request é https (Vercel sempre https em prod) para Secure correto
    const forwardedProto = req.headers.get('x-forwarded-proto') || '';
    const isHttps = forwardedProto === 'https' || isProd;
    response.cookies.set(COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
    // Log para debug de produção (sem expor token)
    console.log(`[create trusted] user=${uid} device=${deviceId} label=${label} host=${host} domain=${cookieDomain||'(host-only)'} secure=${isHttps}`);

    return response;
  } catch (e: any) {
    if (e.message === 'RATE_LIMITED') {
      return NextResponse.json({ error: 'too_many_requests' }, { status: 429 });
    }
    console.error('[create trusted] error', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
