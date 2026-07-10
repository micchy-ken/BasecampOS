import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Determine active config (優先順：環境変数)
// ※フロントエンドからFirebaseに接続するための公開設定値です
const activeConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID
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

