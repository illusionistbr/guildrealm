import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_LOGIN_PATH = '/admin/login';
const ADMIN_PATHS = ['/admin'];
const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  if (!isAdminPath) return NextResponse.next();

  const isPublicPath = PUBLIC_ADMIN_PATHS.some((p) => pathname === p);
  if (isPublicPath) return NextResponse.next();

  const adminSession = request.cookies.get('admin_session')?.value;

  if (!adminSession) {
    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images|icons).*)',
  ],
};
