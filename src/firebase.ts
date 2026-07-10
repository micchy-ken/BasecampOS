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

// Immediate connection test to log
import { doc, getDoc } from "firebase/firestore";

const showDebugMessage = (msg: string, isError: boolean = false) => {
  if (typeof window !== "undefined" && window.document) {
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.top = "0";
    div.style.left = "0";
    div.style.width = "100%";
    div.style.padding = "10px";
    div.style.zIndex = "9999";
    div.style.textAlign = "center";
    div.style.fontWeight = "bold";
    div.style.color = "white";
    div.style.backgroundColor = isError ? "red" : "green";
    div.innerText = msg;
    document.body.appendChild(div);
    
    if (!isError) {
      setTimeout(() => {
        if (document.body.contains(div)) document.body.removeChild(div);
      }, 5000);
    }
  }
};

(async () => {
  try {
    console.log("🔥 Firebase init: 接続テストを開始します...");
    // A simple read test
    await getDoc(doc(db, "system", "ping"));
    console.log("✅ Firebase init: 接続テスト成功！Firestoreと正常に通信できました。");
    showDebugMessage("✅ Firebase接続テスト成功！Firestoreと正常に通信できました。");
  } catch (error: any) {
    console.error("❌ Firebase init: 接続テスト失敗！", error);
    showDebugMessage(`❌ Firebaseエラー: ${error.message}`, true);
  }
})();

// Auth（認証）を初期化
export const auth = getAuth(app);