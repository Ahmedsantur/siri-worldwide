import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
};

const config: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
};

export function isFirebaseAuthConfigured() {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseAuthConfigured()) return null;
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}