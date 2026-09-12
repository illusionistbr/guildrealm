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

// GET — lista guildas + dados dos donos (nome e plano premium).
// Via Admin SDK: não depende do Auth client-side nem das firestore.rules.
export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const guildsSnap = await db.collection('guilds').get();
    const guilds = guildsSnap.docs.map((d) => {
      const g = d.data();
      return {
        id: d.id,
        name: typeof g?.name === 'string' ? g.name : null,
        game: typeof g?.game === 'string' ? g.game : null,
        ownerId: typeof g?.ownerId === 'string' ? g.ownerId : null,
        ownerName: typeof g?.ownerName === 'string' ? g.ownerName : null,
        ownerCharacterName: typeof g?.ownerCharacterName === 'string' ? g.ownerCharacterName : null,
        members: Array.isArray(g?.members) ? (g.members as unknown[]).length : 0,
        isActive: g?.isActive !== false,
        createdAt: iso(g?.createdAt),
      };
    });

    const ownerIds = [...new Set(guilds.map((g) => g.ownerId).filter((id): id is string => !!id))];
    const owners: Record<string, { displayName: string | null; plan: string; planExpiresAt: string | null; premium: boolean }> = {};
    await Promise.all(
      ownerIds.map(async (uid) => {
        try {
          const snap = await db.collection('users').doc(uid).get();
          if (!snap.exists) return;
          const u = snap.data();
          owners[uid] = {
            displayName: typeof u?.displayName === 'string' ? u.displayName : null,
            plan: u?.plan === 'elite' || u?.plan === 'conquistador' ? (u.plan as string) : 'free',
            planExpiresAt: iso(u?.planExpiresAt),
            premium: u?.premium === true,
          };
        } catch {
          // Dono ilegível: trata como sem premium.
        }
      }),
    );

    return NextResponse.json({ guilds, owners });
  } catch (err) {
    console.error(
      '[admin/guilds/list] falhou:',
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
