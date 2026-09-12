import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/admin/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

const COOKIE_NAME = 'admin_session';
// Só cargos de gestão podem mexer em premium (igual ao setUserPlan das functions).
const ALLOWED_ROLES = ['super_admin', 'admin'];
const PLANS = ['elite', 'conquistador', 'free'] as const;

type PlanId = (typeof PLANS)[number];

/** Verifica o session cookie e retorna o role ou null. */
async function getSessionRole(req: NextRequest): Promise<string | null> {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true);
    const role = (decoded as { role?: unknown }).role;
    return typeof role === 'string' ? role : null;
  } catch {
    return null;
  }
}

// POST { guildId, plan: 'elite'|'conquistador'|'free', days? } — aplica o
// plano ao DONO da guilda (o premium é do usuário; a guilda herda).
// Usa o Admin SDK: não depende das firestore.rules do cliente.
export async function POST(req: NextRequest) {
  const role = await getSessionRole(req);
  if (!role || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { guildId?: unknown; plan?: unknown; days?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }

  const guildId = typeof body.guildId === 'string' ? body.guildId.trim() : '';
  const plan = typeof body.plan === 'string' ? body.plan : '';
  if (!guildId) {
    return NextResponse.json({ error: 'guildId-required' }, { status: 400 });
  }
  if (!(PLANS as readonly string[]).includes(plan)) {
    return NextResponse.json({ error: 'invalid-plan' }, { status: 400 });
  }
  const planId = plan as PlanId;

  let days = 0;
  if (planId !== 'free') {
    days = Math.floor(Number(body.days));
    if (!Number.isFinite(days) || days < 1 || days > 3650) {
      return NextResponse.json({ error: 'invalid-days' }, { status: 400 });
    }
  }

  try {
    const db = getAdminDb();
    const guildSnap = await db.collection('guilds').doc(guildId).get();
    if (!guildSnap.exists) {
      return NextResponse.json({ error: 'guild-not-found' }, { status: 404 });
    }
    const ownerId = guildSnap.data()?.ownerId;
    if (typeof ownerId !== 'string' || !ownerId) {
      return NextResponse.json({ error: 'owner-not-found' }, { status: 404 });
    }

    if (planId === 'free') {
      await db.collection('users').doc(ownerId).set(
        {
          plan: 'free',
          premium: false,
          planStartedAt: null,
          planExpiresAt: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return NextResponse.json({ ok: true, plan: planId, expiresAt: null });
    }

    const expiresAt = Timestamp.fromMillis(Date.now() + days * 86400000);
    await db.collection('users').doc(ownerId).set(
      {
        plan: planId,
        premium: true,
        planStartedAt: FieldValue.serverTimestamp(),
        planExpiresAt: expiresAt,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return NextResponse.json({ ok: true, plan: planId, expiresAt: expiresAt.toDate().toISOString() });
  } catch (err) {
    console.error(
      '[admin/guilds/premium] falhou:',
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
