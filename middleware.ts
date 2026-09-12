import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_LOGIN_PATH = '/admin/login';
const ADMIN_PATHS = ['/admin'];
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/forgot-password'];

function looksLikeJwt(value: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value) && value.length < 4096;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  if (!isAdminPath) return NextResponse.next();

  const isPublicPath = PUBLIC_ADMIN_PATHS.some((p) => pathname === p);
  if (isPublicPath) return NextResponse.next();

  // Triagem rápida: exige o session cookie httpOnly (emitido pelo servidor
  // após validar cargo). A verificação real da assinatura acontece no
  // layout server-side do painel — aqui só evitamos carregar páginas à toa.
  const adminSession = request.cookies.get('admin_session')?.value;

  if (!adminSession || !looksLikeJwt(adminSession)) {
    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Expõe o pathname ao layout server-side (para o ?redirect= do guard).
  const headers = new Headers(request.headers);
  headers.set('x-pathname', pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|icons).*)',
  ],
};
