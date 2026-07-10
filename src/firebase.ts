import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebaseの接続設定（直接ハードコード）
const firebaseConfig = {
  apiKey: "AIzaSyAwYzwD0YH_jh2SrlOfaS16ClJFkGRSXvU",
  authDomain: "gen-lang-client-0304293524.firebaseapp.com",
  projectId: "gen-lang-client-0304293524",
  storageBucket: "gen-lang-client-0304293524.firebasestorage.app",
  messagingSenderId: "1022762764096",
  appId: "1:1022762764096:web:a46cb24a297ed5ed389ca5"
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// AI Studioプレビューや一部環境でのWebSocket通信エラー（client is offline）を防ぐため、Long Pollingを強制
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, "ai-studio-camppackinglayou-fd0e9c0e-9f7e-4d99-b8ba-457b5f2e6dfb");

// Auth（認証）を初期化
export const auth = getAuth(app);