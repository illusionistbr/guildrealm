import { NextResponse, type NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/admin/firebase/admin';
import type { AdminRole } from '@/lib/admin/rbac/roles';

export const runtime = 'nodejs';

const COOKIE_NAME = 'admin_session';
const ADMIN_ROLES: AdminRole[] = ['super_admin', 'admin', 'moderator', 'editor', 'support'];

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

function iso(value: unknown): string | null {
  if (!value) return null;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

// GET — lista usuários + contagem de guildas por dono.
// Via Admin SDK: não depende do Auth client-side nem das firestore.rules.
export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const [usersSnap, guildsSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('guilds').get(),
    ]);

    const guildCounts: Record<string, number> = {};
    for (const g of guildsSnap.docs) {
      const owners = g.data()?.memberOwnerIds;
      if (Array.isArray(owners)) {
        for (const uid of owners) {
          if (typeof uid === 'string') guildCounts[uid] = (guildCounts[uid] ?? 0) + 1;
        }
      }
    }

    const users = usersSnap.docs.map((d) => {
      const u = d.data();
      return {
        id: d.id,
        nickname: typeof u?.nickname === 'string' ? u.nickname : null,
        displayName: typeof u?.displayName === 'string' ? u.displayName : null,
        email: typeof u?.email === 'string' ? u.email : null,
        isActive: u?.isActive !== false,
        banned: u?.banned === true,
        xp: typeof u?.xp === 'number' ? u.xp : 0,
        plan: u?.plan === 'elite' || u?.plan === 'conquistador' ? u.plan : 'free',
        planExpiresAt: iso(u?.planExpiresAt),
        premium: u?.premium === true,
        createdAt: iso(u?.createdAt),
      };
    });

    return NextResponse.json({ users, guildCounts });
  } catch (err) {
    console.error(
      '[admin/users/list] falhou:',
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
