import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDliMuHXhnuE_k8TGaQVOnSAU56WNW-beA",
  authDomain: "gen-lang-client-0792225149.firebaseapp.com",
  projectId: "gen-lang-client-0792225149",
  storageBucket: "gen-lang-client-0792225149.firebasestorage.app",
  messagingSenderId: "1005276687942",
  appId: "1:1005276687942:web:e06ce50821b270078c2447",
  measurementId: "G-7SVV0NBZCR"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
