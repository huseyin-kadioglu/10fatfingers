import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Firebase Console > Proje Ayarları > Web uygulaması > Config
// Bu değerleri kendi projenizden kopyalayın:
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDjQP9V6t9fy8FO8EUxX3DXjYByt4qiwgY",
  authDomain: "fatfingers-b2d3c.firebaseapp.com",
  projectId: "fatfingers-b2d3c",
  storageBucket: "fatfingers-b2d3c.firebasestorage.app",
  messagingSenderId: "945343422891",
  appId: "1:945343422891:web:ced55f976ba19ed8feb2ee",
  measurementId: "G-V0134ZNKM0"
};

export const app = initializeApp(firebaseConfig)
export const db  = getFirestore(app)
