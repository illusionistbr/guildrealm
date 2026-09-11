'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/admin/firebase/client';
import {
  getRemainingDays,
  getUserPlanDefinition,
  resolvePlanId,
  type PlanDefinition,
  type PlanId,
  type UserPlanDoc,
} from '@/lib/premium/plans';

export type UserPlanState = {
  loading: boolean;
  planId: PlanId;
  plan: PlanDefinition;
  remainingDays: number | null;
  raw: UserPlanDoc | null;
};

/** Lê users/{uid} em tempo real e resolve o plano vigente (com expiração). */
export function useUserPlan(uid: string | null): UserPlanState {
  const [raw, setRaw] = useState<UserPlanDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(getFirebaseDb(), 'users', uid),
      (snap) => {
        setRaw(snap.exists() ? (snap.data() as UserPlanDoc) : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [uid]);

  // Atualiza o countdown a cada minuto sem refetch.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const planId = resolvePlanId(raw, now);
  return {
    loading,
    planId,
    plan: getUserPlanDefinition(raw, now),
    remainingDays: getRemainingDays(raw, now),
    raw,
  };
}

/** Plano do DONO da guild — é ele que define limites/recursos da guild. */
export function useGuildOwnerPlan(ownerId: string | null | undefined): UserPlanState {
  return useUserPlan(ownerId ?? null);
}
