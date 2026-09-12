import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

let app: App | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: Storage | undefined;

/**
 * Inicialização preguiçosa: erro de env (ex.: private key malformada)
 * estoura SÓ quando usado — e é capturável pela rota/layout — em vez de
 * derrubar o import e transformar tudo em 500 opaco.
 */
function getAdminApp(): App {
  if (!app) {
    app = getApps().length === 0
      ? initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
          }),
        })
      : getApps()[0];
  }
  return app;
}

export function getAdminAuth(): Auth {
  if (!auth) auth = getAuth(getAdminApp());
  return auth;
}

export function getAdminDb(): Firestore {
  if (!db) db = getFirestore(getAdminApp());
  return db;
}

export function getAdminStorage(): Storage {
  if (!storage) storage = getStorage(getAdminApp());
  return storage;
}
