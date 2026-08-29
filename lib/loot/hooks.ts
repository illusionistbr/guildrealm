'use client';

import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/admin/firebase/client';
import type { LootDoc, DkpBalanceDoc, DkpTransactionDoc, LootSettings, BidDoc } from './types';
import { DEFAULT_LOOT_SETTINGS } from './types';

export function useLootSettings(guildId: string) {
  const [settings, setSettings] = useState<LootSettings | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!guildId) return;
    const ref = doc(getFirebaseDb(), 'guilds', guildId, 'settings', 'loot');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setSettings(snap.data() as LootSettings);
      else setSettings(DEFAULT_LOOT_SETTINGS);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [guildId]);
  return { settings, loading };
}

export function useLootList(guildId: string) {
  const [loots, setLoots] = useState<LootDoc[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!guildId) return;
    const q = query(collection(getFirebaseDb(), 'guilds', guildId, 'loot'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: LootDoc[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as LootDoc));
      setLoots(list);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [guildId]);
  return { loots, loading };
}

export function useDkpBalances(guildId: string) {
  const [balances, setBalances] = useState<DkpBalanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!guildId) return;
    const q = query(collection(getFirebaseDb(), 'guilds', guildId, 'dkp_balances'), orderBy('dkpBalance', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: DkpBalanceDoc[] = [];
      snap.forEach(d => list.push(d.data() as DkpBalanceDoc));
      setBalances(list);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [guildId]);
  return { balances, loading };
}

export function useMyDkp(guildId: string, characterId: string) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!guildId || !characterId) { setLoading(false); return; }
    const ref = doc(getFirebaseDb(), 'guilds', guildId, 'dkp_balances', characterId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setBalance((snap.data() as DkpBalanceDoc).dkpBalance);
      else setBalance(0);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [guildId, characterId]);
  return { balance, loading };
}

export function useDkpHistory(guildId: string, characterId?: string, limitCount = 50) {
  const [txs, setTxs] = useState<DkpTransactionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!guildId) return;
    let q;
    if (characterId) {
      q = query(collection(getFirebaseDb(), 'guilds', guildId, 'dkp_transactions'), where('characterId', '==', characterId), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(getFirebaseDb(), 'guilds', guildId, 'dkp_transactions'), orderBy('createdAt', 'desc'));
    }
    const unsub = onSnapshot(q as any, (snap: any) => {
      const list: DkpTransactionDoc[] = [];
      snap.forEach((d: any) => list.push({ id: d.id, ...d.data() } as DkpTransactionDoc));
      setTxs(list.slice(0, limitCount));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [guildId, characterId, limitCount]);
  return { txs, loading };
}

export function useLootBids(guildId: string, lootId: string) {
  const [bids, setBids] = useState<BidDoc[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!guildId || !lootId) return;
    const q = query(collection(getFirebaseDb(), 'guilds', guildId, 'loot', lootId, 'bids'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: BidDoc[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as BidDoc));
      setBids(list);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [guildId, lootId]);
  return { bids, loading };
}

export function useCountdown(target: Date | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return { totalMs: 0, formatted: '00:00', finished: true };
  const totalMs = Math.max(0, target.getTime() - now);
  const finished = totalMs <= 0;
  const sec = Math.floor(totalMs / 1000);
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  const h = Math.floor(sec / 3600);
  const formatted = h > 0 ? `${String(h).padStart(2, '0')}:${m}:${s}` : `${m}:${s}`;
  return { totalMs, formatted, finished };
}
