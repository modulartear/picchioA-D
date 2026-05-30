import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { firebaseConfigured, storage } from "../firebase";

function assertConfigured() {
  if (!firebaseConfigured || !storage) throw new Error("Firebase no configurado. Creá .env con VITE_FIREBASE_*");
}

export async function uploadProductImage({ productId, file }) {
  assertConfigured();
  const safeName = String(file.name || "image").replace(/[^\w.\-]+/g, "-");
  const key = `products/${productId}/${Date.now()}-${safeName}`;
  const r = ref(storage, key);
  await uploadBytes(r, file);
  return await getDownloadURL(r);
}

export async function uploadCortinasFabricImage({ fabricId, file }) {
  assertConfigured();
  const safeName = String(file.name || "image").replace(/[^\w.\-]+/g, "-");
  const key = `products/cortinas/fabrics/${fabricId}/${Date.now()}-${safeName}`;
  const r = ref(storage, key);
  await uploadBytes(r, file);
  return await getDownloadURL(r);
}

export async function uploadCortinasColorImage({ colorId, file }) {
  assertConfigured();
  const safeName = String(file.name || "image").replace(/[^\w.\-]+/g, "-");
  const key = `products/cortinas/colors/${colorId}/${Date.now()}-${safeName}`;
  const r = ref(storage, key);
  await uploadBytes(r, file);
  return await getDownloadURL(r);
}
