import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCUa8Ok6MPLPvAdR_bGI3Wubm_Yin2sxPk",
  authDomain: "campus-2537b.firebaseapp.com",
  projectId: "campus-2537b",
  storageBucket: "campus-2537b.firebasestorage.app",
  messagingSenderId: "1038854778536",
  appId: "1:1038854778536:web:ecc7b3a27492ef62971c9d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore without persistence (free-tier optimized)
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { app, db, storage };
