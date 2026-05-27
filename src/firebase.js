import { initializeApp } from 'firebase/app';
import { Capacitor } from '@capacitor/core';
import { getAuth, initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDqVDqKc1SN9yix0gMbjJg_ItSi1zBEFKc",
  authDomain: "pray-for-the-cup.firebaseapp.com",
  projectId: "pray-for-the-cup",
  storageBucket: "pray-for-the-cup.firebasestorage.app",
  messagingSenderId: "13754311833",
  appId: "1:13754311833:web:739759a70af752a3290408"
};

const app = initializeApp(firebaseConfig);
// Use initializeAuth on native platforms to prevent Firebase from loading
// its browser popup/redirect resolver, which causes Chrome to open on Android
const auth = Capacitor.isNativePlatform()
  ? initializeAuth(app, {
      persistence: indexedDBLocalPersistence,
      popupRedirectResolver: undefined
    })
  : getAuth(app);
export { auth };
export const db = getFirestore(app);
