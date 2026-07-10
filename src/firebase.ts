import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Determine active config (優先順：環境変数 > ハードコードされたデフォルト値)
// ※フロントエンドからFirebaseに接続するための公開設定値であり、ソースコードに含めても安全です。
const activeConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAwYzwD0YH_jh2SrlOfaS16ClJFkGRSXvU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0304293524.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0304293524",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0304293524.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1022762764096",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1022762764096:web:a46cb24a297ed5ed389ca5",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-camppackinglayou-fd0e9c0e-9f7e-4d99-b8ba-457b5f2e6dfb"
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

