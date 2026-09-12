import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth } from '@/lib/admin/firebase/admin';
import type { AdminRole } from '@/lib/admin/rbac/roles';

export const runtime = 'nodejs';

const COOKIE_NAME = 'admin_session';
const MAX_AGE = 60 * 60 * 24; // 24h

const ADMIN_ROLES: AdminRole[] = ['super_admin', 'admin', 'moderator', 'editor', 'support'];

function buildSessionCookieHeader(value: string, maxAge: number) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

/** Verifica o session cookie e retorna { uid, role } ou null. */
async function getAdminSession(req: NextRequest): Promise<{ uid: string; role: AdminRole } | null> {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true);
    const role = decoded.role as AdminRole | undefined;
    if (!role || !ADMIN_ROLES.includes(role)) return null;
    return { uid: decoded.uid, role };
  } catch {
    return null;
  }
}

// GET — informa se há sessão admin válida (usado pelo login/shell).
export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, uid: session.uid, role: session.role });
}

// POST { idToken } — verifica o ID token + claim de cargo e emite o
// session cookie httpOnly. Sem claim administrativa, recusa (401).
export async function POST(req: NextRequest) {
  let idToken: unknown;
  try {
    idToken = (await req.json())?.idToken;
  } catch {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }
  if (typeof idToken !== 'string' || !idToken) {
    return NextResponse.json({ error: 'idToken-required' }, { status: 400 });
  }

  // Config ausente no servidor: 503 explícito (em vez de 500 opaco).
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    return NextResponse.json({ error: 'server-misconfigured' }, { status: 503 });
  }

  let adminAuth;
  try {
    adminAuth = getAdminAuth();
  } catch (err) {
    console.error(
      '[admin/session] Admin SDK init falhou (verifique FIREBASE_PRIVATE_KEY/CLIENT_EMAIL/PROJECT_ID):',
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: 'server-misconfigured' }, { status: 503 });
  }

  try {
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch (err) {
      console.error(
        '[admin/session] verifyIdToken falhou:',
        err instanceof Error ? `${(err as { code?: unknown }).code ?? ''} ${err.message}` : err,
      );
      return NextResponse.json({ error: 'invalid-token' }, { status: 401 });
    }
    const role = (decoded as { role?: AdminRole }).role;
    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    let sessionCookie: string;
    try {
      sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn: MAX_AGE * 1000,
      });
    } catch (err) {
      console.error(
        '[admin/session] createSessionCookie falhou:',
        err instanceof Error ? `${(err as { code?: unknown }).code ?? ''} ${err.message}` : err,
      );
      return NextResponse.json({ error: 'session-cookie-failed' }, { status: 500 });
    }
    const res = NextResponse.json({ ok: true, role });
    res.headers.set('Set-Cookie', buildSessionCookieHeader(sessionCookie, MAX_AGE));
    return res;
  } catch (err) {
    console.error(
      '[admin/session] erro inesperado:',
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

// DELETE — encerra a sessão admin (limpa o cookie).
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', buildSessionCookieHeader('', 0));
  return res;
}
