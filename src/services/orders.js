import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, firebaseConfigured } from "../firebase";

function assertConfigured() {
  if (!firebaseConfigured || !db) throw new Error("Firebase no configurado. Creá .env con VITE_FIREBASE_*");
}

export async function createOrder(payload) {
  assertConfigured();
  const ref = await addDoc(collection(db, "orders"), {
    ...payload,
    status: "new",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createLead(payload) {
  assertConfigured();
  const ref = await addDoc(collection(db, "leads"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
