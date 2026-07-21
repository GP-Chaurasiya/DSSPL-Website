import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBZekUkKdjvmyH03g8cJokFwGnouuCuq5U",
  authDomain: "dsspl-website.firebaseapp.com",
  databaseURL:
    "https://dsspl-aec00-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "dsspl-website",
  storageBucket: "dsspl-website.firebasestorage.app",
  messagingSenderId: "380885051797",
  appId: "1:380885051797:web:a067a0356d898c2b4d6e9c"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

import { ref, set } from "firebase/database";
import { db } from "./firebase";

set(ref(db, "test"), {
  message: "Hello DSSPL"
});