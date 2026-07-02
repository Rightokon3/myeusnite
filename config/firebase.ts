

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyCiu2ps9dJOHCIn7jmda1itFvpoBfo0A6o',
  authDomain: 'myeusnite.firebaseapp.com',
  databaseURL: 'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com',
  projectId: 'myeusnite',
  storageBucket: 'myeusnite.firebasestorage.app', 
  messagingSenderId: '519044936235',
  appId: '1:519044936235:web:845e80d073f9914a05b06e',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export default app;