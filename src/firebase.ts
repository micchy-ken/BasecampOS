import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebaseの接続設定（直接ハードコード）
const firebaseConfig = {
  apiKey: "AIzaSyAwYzWD0YH_jh2Sr1OfaS16ClJFkGRSXvU",
  authDomain: "gen-lang-client-0304293524.firebaseapp.com",
  projectId: "gen-lang-client-0304293524",
  storageBucket: "gen-lang-client-0304293524.firebasestorage.app",
  messagingSenderId: "1022762764096",
  appId: "1:1022762764096:web:a46cb24a297ed5ed389ca5"
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// 【超重要】エラーの原因になっていた特殊なID指定を完全に削除！！
export const db = getFirestore(app);

// Immediate connection test to log
import { doc, getDoc } from "firebase/firestore";
(async () => {
  try {
    console.log("🔥 Firebase init: 接続テストを開始します...");
    // A simple read test
    await getDoc(doc(db, "system", "ping"));
    console.log("✅ Firebase init: 接続テスト成功！Firestoreと正常に通信できました。");
  } catch (error: any) {
    console.error("❌ Firebase init: 接続テスト失敗！", error);
    // Force alert to screen if possible, but we don't have access to DOM directly yet
    // We will rely on FirebaseSync for the on-screen alert.
  }
})();

// Auth（認証）を初期化
export const auth = getAuth(app);