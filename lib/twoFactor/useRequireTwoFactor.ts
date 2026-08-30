'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/admin/firebase/client';
import { getTwoFactorStatus } from '@/lib/twoFactor/hooks';

const PUBLIC_OR_2FA_PATHS = ['/2fa', '/login', '/signup', '/forgot-password', '/', '/privacy', '/terms'];

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PUBLIC_OR_2FA_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function useRequireTwoFactor(): boolean {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isPublicPath(pathname)) {
      setChecking(false);
      return;
    }

    // Only guard protected prefixes
    const isProtected = pathname?.startsWith('/app') || pathname?.startsWith('/panel');
    if (!isProtected) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (cancelled) return;
      if (!user) {
        router.replace('/login');
        return;
      }
      try {
        const status: any = await getTwoFactorStatus().catch(() => ({ enabled: false }));
        if (!status?.enabled) {
          if (!cancelled) setChecking(false);
          return;
        }
        // 2FA enabled -> require valid session
        const db = getFirebaseDb();
        const snap = await getDoc(doc(db, 'users', user.uid, 'security', 'twoFactorSession'));
        if (!snap.exists()) {
          if (!cancelled) router.replace('/2fa');
          return;
        }
        const data: any = snap.data();
        let expMs = 0;
        if (data.expiresAt?.toMillis) expMs = data.expiresAt.toMillis();
        else if (data.expiresAt?.seconds) expMs = data.expiresAt.seconds * 1000;
        else if (typeof data.expiresAt === 'number') expMs = data.expiresAt;
        if (!expMs || Date.now() > expMs) {
          if (!cancelled) router.replace('/2fa');
          return;
        }
        if (!cancelled) setChecking(false);
      } catch {
        if (!cancelled) setChecking(false);
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [router, pathname]);

  return checking;
}
