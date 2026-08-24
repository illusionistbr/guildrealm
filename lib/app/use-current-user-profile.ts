'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  getFirebaseAuth,
  getFirebaseDb,
} from '@/lib/admin/firebase/client';
import { COLLECTIONS } from '@/lib/admin/firebase/collections';

export type ProfileVisibility = {
  showBio: boolean;
  showGuilds: boolean;
  showAchievements: boolean;
  showFriends: boolean;
};

export const DEFAULT_VISIBILITY: ProfileVisibility = {
  showBio: true,
  showGuilds: true,
  showAchievements: true,
  showFriends: true,
};

export type UserProfileData = {
  id: string;
  email?: string;
  displayName?: string;
  nickname?: string;
  bio?: string;
  photoURL?: string | null;
  coverUrl?: string | null;
  socialLinks?: Record<string, string>;
  visibility?: Partial<ProfileVisibility>;
  createdAt?: { seconds: number } | null;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
}

export function useCurrentUserProfile() {
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let disposed = false;

    const unsub = onAuthStateChanged(getFirebaseAuth(), async (user) => {
      if (disposed) return;
      setFbUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(
          doc(getFirebaseDb(), COLLECTIONS.USERS, user.uid),
        );
        if (disposed) return;
        setProfile(
          snap.exists()
            ? ({ id: snap.id, ...snap.data() } as UserProfileData)
            : null,
        );
      } catch {
        if (!disposed) setProfile(null);
      }
      if (!disposed) setLoading(false);
    });

    return () => {
      disposed = true;
      unsub();
    };
  }, []);

  return { fbUser, profile, loading };
}

export function profileNickname(profile: UserProfileData | null): string {
  if (!profile) return '';
  return (
    profile.nickname?.trim() ||
    slugify(profile.displayName ?? '') ||
    profile.id.slice(0, 12)
  );
}
