'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: ReturnType<typeof getStorage>;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY_HERE') {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    }
  }
  return app!;
}

function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

function getFirebaseStorage() {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }
  return storage;
}

export { getFirebaseApp, getFirebaseAuth, getFirebaseDb, getFirebaseStorage };

// Lazy exports that only initialize on first access
export function initFirebase() {
  const app = getFirebaseApp();
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  const storage = getFirebaseStorage();
  return { app, auth, db, storage };
}
