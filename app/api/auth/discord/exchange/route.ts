import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/admin/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

const TOKEN_URL = 'https://discord.com/api/oauth2/token';
const ME_URL = 'https://discord.com/api/users/@me';
const CALLBACK_PATH = '/auth/discord/callback';

type DiscordMe = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string | null;
  verified?: boolean;
};

function avatarUrl(id: string, hash: string | null | undefined): string | null {
  if (!hash) return null;
  const ext = hash.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${id}/${hash}.${ext}?size=256`;
}

/** redirect_uri só vale se for do próprio host (https) ou localhost. */
function isAllowedRedirectUri(value: string, reqHost: string | null): boolean {
  try {
    const u = new URL(value);
    if (u.pathname !== CALLBACK_PATH) return false;
    const host = u.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return u.protocol === 'http:';
    }
    if (u.protocol !== 'https:') return false;
    // Em produção, exige o mesmo host do app (anti-abuso do client secret).
    if (reqHost && host !== reqHost) return false;
    return true;
  } catch {
    return false;
  }
}

// POST { code, verifier, redirectUri } — troca o code no Discord,
// localiza ou cria o usuário Firebase e devolve um custom token.
export async function POST(req: Request) {
  let body: { code?: unknown; verifier?: unknown; redirectUri?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }
  const code = typeof body.code === 'string' ? body.code : '';
  const verifier = typeof body.verifier === 'string' ? body.verifier : '';
  const redirectUri = typeof body.redirectUri === 'string' ? body.redirectUri : '';
  if (!code || !verifier || !redirectUri) {
    return NextResponse.json({ error: 'missing-params' }, { status: 400 });
  }

  const clientId = process.env.DISCORD_CLIENT_ID || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'server-misconfigured' }, { status: 503 });
  }

  const reqHost = new URL(req.url).hostname;
  if (!isAllowedRedirectUri(redirectUri, reqHost)) {
    return NextResponse.json({ error: 'invalid-redirect-uri' }, { status: 400 });
  }

  // 1) Troca o código por access token (com o secret, só no servidor).
  let me: DiscordMe;
  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });
    if (!tokenRes.ok) {
      return NextResponse.json({ error: 'exchange-failed' }, { status: 401 });
    }
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      return NextResponse.json({ error: 'exchange-failed' }, { status: 401 });
    }
    const meRes = await fetch(ME_URL, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!meRes.ok) {
      return NextResponse.json({ error: 'profile-failed' }, { status: 401 });
    }
    me = (await meRes.json()) as DiscordMe;
    if (!me.id) {
      return NextResponse.json({ error: 'profile-failed' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'discord-unreachable' }, { status: 502 });
  }

  const email = typeof me.email === 'string' ? me.email.trim().toLowerCase() : '';
  const emailVerified = me.verified === true && !!email;
  const displayName = (me.global_name || me.username || 'Jogador').trim().slice(0, 60) || 'Jogador';
  const photoURL = avatarUrl(me.id, me.avatar);

  try {
    const auth = getAdminAuth();
    const db = getAdminDb();
    let uid: string | null = null;
    let isNew = false;

    // 2a) Conta já vinculada a este Discord?
    const byDiscord = await db.collection('users').where('discordId', '==', me.id).limit(1).get();
    if (!byDiscord.empty) {
      uid = byDiscord.docs[0].id;
    }

    // 2b) Vincula pelo e-mail verificado do Discord.
    if (!uid && emailVerified) {
      try {
        const existing = await auth.getUserByEmail(email);
        uid = existing.uid;
        await db.collection('users').doc(uid).set({ discordId: me.id }, { merge: true });
      } catch {
        uid = null; // não existe: cria abaixo
      }
    }

    // 2c) Cria conta nova.
    if (!uid) {
      isNew = true;
      const toCreate: { displayName: string; photoURL?: string; email?: string; emailVerified?: boolean } = {
        displayName,
      };
      if (photoURL) toCreate.photoURL = photoURL;
      if (email) {
        toCreate.email = email;
        // E-mail verificado no Discord: não trava no login por verificação.
        if (emailVerified) toCreate.emailVerified = true;
      }
      const created = await auth.createUser(toCreate);
      uid = created.uid;
      await db.collection('users').doc(uid).set(
        {
          discordId: me.id,
          email: email || '',
          displayName,
          photoURL: photoURL ?? null,
          createdAt: FieldValue.serverTimestamp(),
          isActive: true,
          xp: 0,
          premium: false,
          plan: 'free',
          role: 'user',
        },
        { merge: true },
      );
    }

    // 3) Custom token para o cliente entrar com signInWithCustomToken.
    const customToken = await auth.createCustomToken(uid);
    return NextResponse.json({ customToken, displayName, photoURL, isNew });
  } catch (err) {
    console.error('[auth/discord] falhou:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
