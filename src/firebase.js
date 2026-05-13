import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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
export const auth = getAuth(app);
export const db = getFirestore(app);
