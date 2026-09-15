'use client';

export const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? '';
export const DISCORD_CALLBACK_PATH = '/auth/discord/callback';
const VERIFIER_KEY = 'discord_oauth_verifier';

function base64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function getDiscordRedirectUri(): string {
  return `${window.location.origin}${DISCORD_CALLBACK_PATH}`;
}

async function newVerifier(): Promise<{ verifier: string; challenge: string }> {
  const raw = crypto.getRandomValues(new Uint8Array(64));
  const verifier = base64Url(raw);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

/** Inicia o OAuth2 do Discord (PKCE). Redireciona para o Discord. */
export async function startDiscordOAuth(): Promise<void> {
  if (!DISCORD_CLIENT_ID) {
    throw new Error('Login com Discord indisponível no momento.');
  }
  const { verifier, challenge } = await newVerifier();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: getDiscordRedirectUri(),
    response_type: 'code',
    scope: 'identify email',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'consent',
  });
  window.location.href = `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function takeDiscordVerifier(): string | null {
  const v = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  return v;
}
