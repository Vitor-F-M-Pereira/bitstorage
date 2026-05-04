import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA6RzWxhioxQkyfP9AxofYSECJqhHetEt4",
  authDomain: "bitstorage-8da8f.firebaseapp.com",
  projectId: "bitstorage-8da8f",
  storageBucket: "bitstorage-8da8f.firebasestorage.app",
  messagingSenderId: "794711745617",
  appId: "1:794711745617:web:01080407df9f5e97fe4470",
  measurementId: "G-T8XY1RTS7E"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
