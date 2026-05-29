import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db, firebaseConfigured } from "../firebase";

function assertConfigured() {
  if (!firebaseConfigured || !db) throw new Error("Firebase no configurado. Creá .env con VITE_FIREBASE_*");
}

export function subscribeCategories(cb, onError) {
  assertConfigured();
  const q = query(collection(db, "categories"), orderBy("order", "asc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export function subscribeProducts(cb, onError) {
  assertConfigured();
  const q = query(collection(db, "products"), orderBy("updatedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export function subscribeOrders(cb, onError) {
  assertConfigured();
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export function subscribeLeads(cb, onError) {
  assertConfigured();
  const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export async function upsertCategory(slug, data) {
  assertConfigured();
  await setDoc(
    doc(db, "categories", slug),
    {
      ...data,
      slug,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteCategory(slug) {
  assertConfigured();
  await deleteDoc(doc(db, "categories", slug));
}

export async function upsertProduct(id, data) {
  assertConfigured();
  await setDoc(
    doc(db, "products", id),
    {
      ...data,
      id,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function deleteProduct(id) {
  assertConfigured();
  await deleteDoc(doc(db, "products", id));
}

export async function updateOrderStatus(id, status) {
  assertConfigured();
  await updateDoc(doc(db, "orders", id), { status, updatedAt: serverTimestamp() });
}

