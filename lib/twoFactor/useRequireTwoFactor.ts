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
        // Ensure ID token is fresh before callable
        await user.getIdToken(false).catch(() => {});
        const tokenRes = await user.getIdTokenResult().catch(() => null);
        const authTimeMs = tokenRes?.claims?.auth_time ? Number(tokenRes.claims.auth_time) * 1000 : 0;

        let status: any = null;
        try {
          status = await getTwoFactorStatus();
        } catch (e: any) {
          // Fail closed: se não conseguiu verificar status, assume 2FA necessário -> redireciona
          // só libera se erro for claramente de não-autenticado e status não existe
          if (!cancelled) router.replace('/2fa');
          return;
        }
        if (!status?.enabled) {
          if (!cancelled) setChecking(false);
          return;
        }
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
        // Sessão expirada
        if (!expMs || Date.now() > expMs) {
          if (!cancelled) router.replace('/2fa');
          return;
        }
        // Sessão stale: verificada antes do login atual (auth_time)
        // Garante que verificação seja por login, não reutilização de sessão antiga de 30min
        let verifiedMs = 0;
        if (data.verifiedAt?.toMillis) verifiedMs = data.verifiedAt.toMillis();
        else if (data.verifiedAt?.seconds) verifiedMs = data.verifiedAt.seconds * 1000;
        if (authTimeMs && verifiedMs && verifiedMs < authTimeMs - 5000) {
          // verified before this login -> exige novo 2FA
          if (!cancelled) router.replace('/2fa');
          return;
        }
        if (!cancelled) setChecking(false);
      } catch {
        // Qualquer erro inesperado: fail closed -> força 2FA
        if (!cancelled) router.replace('/2fa');
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [router, pathname]);

  return checking;
}
