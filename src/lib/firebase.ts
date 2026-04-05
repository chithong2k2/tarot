import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA9avmK4ed3JDBzRCVh0-602BoLVU8Cgn8",
  authDomain: "tarot-5719b.firebaseapp.com",
  projectId: "tarot-5719b",
  storageBucket: "tarot-5719b.firebasestorage.app",
  messagingSenderId: "30679561256",
  appId: "1:30679561256:web:392561ac7f849bbe2f311d",
  measurementId: "G-973ZSG8E6C",
};

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
