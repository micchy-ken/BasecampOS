import React, { useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

interface FirebaseSyncProps {
  currentData: any;
  onLoadWorkspace: (data: any) => void;
  onError: (errorMsg: string) => void;
}

export default function FirebaseSync({ currentData, onLoadWorkspace, onError }: FirebaseSyncProps) {
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  useEffect(() => {
    // 接続テスト
    console.log("FirebaseSync: 接続開始");
    const testDocRef = doc(db, 'system', 'connection_test');
    setDoc(testDocRef, { lastConnected: new Date().toISOString() }, { merge: true })
      .then(() => {
        console.log("FirebaseSync: 接続成功！");
        setSuccessMsg("🔥 Firebaseに正常に接続しました！");
        setTimeout(() => setSuccessMsg(null), 5000); // 5秒後に消す
      })
      .catch((error) => {
        console.error("FirebaseSync: 接続失敗:", error);
        onError(`Firebase接続エラー: ${error.message}`);
      });
  }, [onError]);

  const onLoadRef = React.useRef(onLoadWorkspace);
  React.useEffect(() => {
    onLoadRef.current = onLoadWorkspace;
  }, [onLoadWorkspace]);

  // Read
  useEffect(() => {
    const docRef = doc(db, 'workspaces', 'default');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onLoadRef.current(data);
      }
    }, (error) => {
      console.error("FirebaseSync: onSnapshot エラー:", error);
      onError(`Firebase同期エラー: ${error.message}`);
    });

    return () => unsubscribe();
  }, [onError]);

  // Write
  useEffect(() => {
    // throttle writes
    const timeout = setTimeout(() => {
      const docRef = doc(db, 'workspaces', 'default');
      setDoc(docRef, currentData, { merge: true })
        .catch(error => {
          console.error("FirebaseSync: setDoc エラー:", error);
          onError(`Firebase保存エラー: ${error.message}`);
        });
    }, 2000);

    return () => clearTimeout(timeout);
  }, [currentData, onError]);

  return (
    <>
      {successMsg && (
        <div className="bg-emerald-600 text-white p-3 font-bold text-center fixed top-10 w-full z-50 shadow-md">
          {successMsg}
        </div>
      )}
    </>
  );
}
