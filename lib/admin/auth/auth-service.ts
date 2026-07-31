import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/admin/firebase/client';
import { ADMIN_COLLECTIONS } from '@/lib/admin/firebase/config';

export type AdminUser = {
  uid: string;
  email: string;
  role: string;
  permissions: string[];
  displayName?: string;
  photoURL?: string;
  mfaEnabled: boolean;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
};

export async function loginAdmin(email: string, password: string) {
  const result = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return result.user;
}

export async function logoutAdmin() {
  await signOut(getFirebaseAuth());
}

export function onAdminAuthStateChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function getAdminProfile(uid: string): Promise<AdminUser | null> {
  const snap = await getDoc(doc(getFirebaseDb(), ADMIN_COLLECTIONS.ROLES, uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as AdminUser;
}

export async function recordAdminLogin(uid: string, email: string) {
  const logRef = doc(getFirebaseDb(), ADMIN_COLLECTIONS.LOGS, `${uid}_${Date.now()}`);
  await setDoc(logRef, {
    uid,
    email,
    action: 'login',
    timestamp: serverTimestamp(),
    ip: 'collected-from-middleware',
    device: 'collected-from-client',
    details: { type: 'admin_login' },
  });
}

export async function refreshClaims(user: User) {
  return user.getIdTokenResult(true);
}
