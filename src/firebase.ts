import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import appletConfig from "../firebase-applet-config.json";

// Define the shape of the Firebase configuration
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

// 1. Direct configuration from firebase-applet-config.json (auto-provisioned by AI Studio)
const configSource: any = appletConfig || {};

// 2. Try loading from environment variables (as override for GitHub/production)
const viteEnv = (import.meta as any).env || {};
const envConfig: Partial<FirebaseConfig> = {
  apiKey: viteEnv.VITE_FIREBASE_API_KEY,
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: viteEnv.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: viteEnv.VITE_FIREBASE_DATABASE_ID,
};

// Determine active config (優先順：環境変数 > appletConfigの自動取得値)
const activeConfig: FirebaseConfig = {
  apiKey: envConfig.apiKey || configSource.apiKey || "",
  authDomain: envConfig.authDomain || configSource.authDomain || "",
  projectId: envConfig.projectId || configSource.projectId || "",
  storageBucket: envConfig.storageBucket || configSource.storageBucket || "",
  messagingSenderId: envConfig.messagingSenderId || configSource.messagingSenderId || "",
  appId: envConfig.appId || configSource.appId || "",
  firestoreDatabaseId: envConfig.firestoreDatabaseId || configSource.firestoreDatabaseId || ""
};

// Initialize Firebase App
const app = initializeApp({
  apiKey: activeConfig.apiKey,
  authDomain: activeConfig.authDomain,
  projectId: activeConfig.projectId,
  storageBucket: activeConfig.storageBucket,
  messagingSenderId: activeConfig.messagingSenderId,
  appId: activeConfig.appId,
});

// Initialize Firestore (handle standard "default" DB vs custom enterprise DB IDs)
export const db = getFirestore(
  app,
  activeConfig.firestoreDatabaseId === "default" || !activeConfig.firestoreDatabaseId
    ? undefined
    : activeConfig.firestoreDatabaseId
);

// Initialize Auth
export const auth = getAuth(app);
