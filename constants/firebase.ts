import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCiu2ps9dJOHCIn7jmda1itFvpoBfo0A6o",
  authDomain: "myeusnite.firebaseapp.com",
  projectId: "myeusnite",
  storageBucket: "myeusnite.firebasestorage.app",
  messagingSenderId: "519044936235",
  appId: "1:519044936235:web:845e80d073f9914a05b06e"
};

// ✅ Prevent duplicate Firebase apps
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);