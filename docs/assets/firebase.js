// docs/assets/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInAnonymously,
  setPersistence, browserLocalPersistence,
  signInWithEmailAndPassword,   // ← 加這個
  signOut                       // ← 和這個
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js"; // 若未使用可刪

// 先放 config
export const firebaseConfig = {
  apiKey: "AIzaSyACzO994yOxUU30DXwN9kmPuu3y9i6u-Vk",
  authDomain: "let-s-go-2e630.firebaseapp.com",
  projectId: "let-s-go-2e630",
  storageBucket: "let-s-go-2e630.appspot.com",
  messagingSenderId: "532753039027",
  appId: "1:532753039027:web:cbcc61cfdd980e6e5ebac6"
};

// 再初始化一次就好
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // 若未使用可刪

// ✅ 讓登入狀態保存在 local，不會跳頁就換 UID
await setPersistence(auth, browserLocalPersistence);

// 匿名登入（需要時才登入）
export async function ensureSignedInAnon() {
  if (!auth.currentUser) await signInAnonymously(auth);
  return new Promise((resolve) =>
    onAuthStateChanged(auth, () => resolve(auth.currentUser))
  );
}
export async function adminEmailPasswordSignIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function signOutNow() {
  return signOut(auth);
}
