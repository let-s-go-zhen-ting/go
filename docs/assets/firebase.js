// docs/assets/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyACzO994yOxUU30DXwN9kmPuu3y9i6u-Vk",
  authDomain: "let-s-go-2e630.firebaseapp.com",
  projectId: "let-s-go-2e630",
  storageBucket: "let-s-go-2e630.appspot.com",
  messagingSenderId: "532753039027",
  appId: "1:532753039027:web:cbcc61cfdd980e6e5ebac6"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function ensureSignedInAnon() {
  if (!auth.currentUser) await signInAnonymously(auth);
  return new Promise((resolve) =>
    onAuthStateChanged(auth, () => resolve(auth.currentUser))
  );
}
