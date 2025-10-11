// docs/assets/firebase.js（占位設定，請自行替換 YOUR_... ）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 匿名登入：前台用戶不必註冊即可有 uid
export async function ensureSignedInAnon() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return new Promise((resolve) => onAuthStateChanged(auth, () => resolve(auth.currentUser)));
}