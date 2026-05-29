import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";

import admin from "firebase-admin";

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

function getArg(name) {
  return process.argv.includes(name);
}

function readPicchioDataFromBrowserScript(absPath) {
  const code = fs.readFileSync(absPath, "utf8");

  const sandbox = { window: {}, console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const script = new vm.Script(code, { filename: absPath });
  script.runInContext(sandbox);

  const data = sandbox.PICCHIO_DATA || sandbox.window?.PICCHIO_DATA;
  if (!data || typeof data !== "object") throw new Error("No se pudo obtener window.PICCHIO_DATA desde el data.js");
  return data;
}

function sanitize(v) {
  return JSON.parse(JSON.stringify(v));
}

async function deleteCollection(db, collName, batchSize = 250) {
  while (true) {
    const snap = await db.collection(collName).limit(batchSize).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

async function seedCategories(db, categories) {
  const chunks = [];
  for (let i = 0; i < categories.length; i += 400) chunks.push(categories.slice(i, i + 400));
  for (const part of chunks) {
    const batch = db.batch();
    part.forEach((c, idx) => {
      const slug = String(c.slug);
      const ref = db.collection("categories").doc(slug);
      const payload = sanitize({
        ...c,
        slug,
        order: Number.isFinite(c.order) ? c.order : idx,
        active: c.active ?? true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.set(ref, payload, { merge: true });
    });
    await batch.commit();
  }
}

async function seedProducts(db, products, categories) {
  const catsBySlug = new Map(categories.map((c) => [c.slug, c.name]));
  const chunks = [];
  for (let i = 0; i < products.length; i += 400) chunks.push(products.slice(i, i + 400));
  for (const part of chunks) {
    const batch = db.batch();
    part.forEach((p) => {
      const id = String(p.id);
      const ref = db.collection("products").doc(id);
      const catName = p.cat ? catsBySlug.get(p.cat) || p.catName : p.catName;
      const image = p.imageUrl || p.image || "";
      const payload = sanitize({
        ...p,
        id,
        catName,
        image,
        imageUrl: image,
        active: p.active ?? true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.set(ref, payload, { merge: true });
    });
    await batch.commit();
  }
}

async function seedGeneric(db, collName, items, idKey = "id") {
  const chunks = [];
  for (let i = 0; i < items.length; i += 400) chunks.push(items.slice(i, i + 400));
  for (const part of chunks) {
    const batch = db.batch();
    part.forEach((it) => {
      const id = it?.[idKey] ? String(it[idKey]) : db.collection(collName).doc().id;
      const ref = db.collection(collName).doc(id);
      const payload = sanitize({
        ...it,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.set(ref, payload, { merge: true });
    });
    await batch.commit();
  }
}

async function seedSiteContent(db, img) {
  await db
    .collection("site")
    .doc("content")
    .set({ img: sanitize(img || {}), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

async function main() {
  const wipe = getArg("--wipe");

  const sourcePath =
    process.env.SEED_SOURCE_DATA_PATH || "c:\\Users\\usuario\\OneDrive\\Desktop\\picchio\\data.js";
  if (!path.isAbsolute(sourcePath)) throw new Error("SEED_SOURCE_DATA_PATH debe ser una ruta absoluta en Windows");

  const serviceAccountPath = requiredEnv("FIREBASE_SERVICE_ACCOUNT_PATH");
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const data = readPicchioDataFromBrowserScript(sourcePath);
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const products = Array.isArray(data.products) ? data.products : [];
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const testimonials = Array.isArray(data.testimonials) ? data.testimonials : [];

  console.log(`Data: categories=${categories.length} products=${products.length}`);

  if (wipe) {
    console.log("Wipe: borrando products/categories/projects/testimonials...");
    await deleteCollection(db, "products");
    await deleteCollection(db, "categories");
    await deleteCollection(db, "projects");
    await deleteCollection(db, "testimonials");
    console.log("Wipe OK");
  }

  console.log("Seeding categories...");
  await seedCategories(db, categories);
  console.log("Seeding products...");
  await seedProducts(db, products, categories);
  console.log("Seeding projects...");
  await seedGeneric(db, "projects", projects, "id");
  console.log("Seeding testimonials...");
  await seedGeneric(db, "testimonials", testimonials, "name");
  console.log("Seeding site/content...");
  await seedSiteContent(db, data.img);

  console.log("Seed finalizado OK");
}

main().catch((e) => {
  console.error("Seed error:", e);
  process.exitCode = 1;
});

