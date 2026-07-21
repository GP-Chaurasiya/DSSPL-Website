import { ref, set } from "firebase/database";
import { db } from "./firebase";

set(ref(db, "test"), {
  message: "Hello DSSPL"
});