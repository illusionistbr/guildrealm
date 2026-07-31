const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const ADMIN_COLLECTIONS = {
  SETTINGS: 'admin_settings',
  LOGS: 'admin_logs',
  PERMISSIONS: 'admin_permissions',
  ROLES: 'admin_roles',
  SESSIONS: 'admin_sessions',
} as const;

export { firebaseConfig, ADMIN_COLLECTIONS };
