import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db, firebaseConfigured } from "../firebase";

function assertConfigured() {
  if (!firebaseConfigured || !db) throw new Error("Firebase no configurado. Creá .env con VITE_FIREBASE_*");
}

export const DEFAULT_IMAGES = {
  heroLiving:
    "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=2400&q=80",
  heroKitchen:
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=2400&q=80",
  aboutShop:
    "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1400&q=80",
  aMedida:
    "https://firebasestorage.googleapis.com/v0/b/picchio-f4d60.firebasestorage.app/o/site%2F2.png?alt=media&token=f271961a-59dd-43f7-bbf6-03d02de69f3e",
  proj1:
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
  proj2:
    "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=80",
  proj3:
    "https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=1200&q=80",
  proj4:
    "https://images.unsplash.com/photo-1556909195-4e5d12330aa1?auto=format&fit=crop&w=1200&q=80",
  proj5:
    "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
  sillaErgo:
    "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=900&q=80",
  sillonGris:
    "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=80",
  sillonBeige:
    "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=80",
  mesaRedonda:
    "https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&w=900&q=80",
  banqueta:
    "https://images.unsplash.com/photo-1582582450937-58ed9344da64?auto=format&fit=crop&w=900&q=80",
  cortina:
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80",
  colchon:
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
  placard:
    "https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&w=900&q=80",
  cocina:
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
  escritorio:
    "https://images.unsplash.com/photo-1593062096033-9a26b09da705?auto=format&fit=crop&w=900&q=80",
  sillaTapizada:
    "https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=900&q=80",
};

export const DEFAULT_HERO = {
  slides: [DEFAULT_IMAGES.heroLiving, DEFAULT_IMAGES.heroKitchen].filter(Boolean),
  titleLine1: "Hacemos los muebles",
  titleLine2: "",
  highlightText: "que imaginás.",
  lead: "Diseño, fabricación propia y entrega a todo el país. Cocinas, placards, sillas, sillones y cortinas roller.",
  primaryCtaLabel: "Ver proyectos",
  primaryCtaHref: "#proyectos",
  secondaryCtaLabel: "Cotizar mi proyecto",
  secondaryCtaHref: "",
};

export const DEFAULT_CHECKOUT = {
  shippingOptions: [
    {
      id: "showroom",
      title: "Retiro en showroom · Sin cargo",
      desc: "Almafuerte 201, Venado Tuerto. Lun a Vie 8:30-12:30 y 16-19:30.",
      priceLabel: "Gratis",
      requiresAddress: false,
      active: true,
    },
    {
      id: "local",
      title: "Envío en Venado Tuerto",
      desc: "Coordinamos día y horario. Entrega en 24-72hs.",
      priceLabel: "Gratis",
      requiresAddress: true,
      active: true,
    },
    {
      id: "pais",
      title: "Envío a todo el país",
      desc: "Transporte propio o flete. Te confirmamos el costo al cerrar el pedido.",
      priceLabel: "A consultar",
      requiresAddress: true,
      active: true,
    },
  ],
  paymentOptions: [
    {
      id: "transferencia",
      title: "Transferencia bancaria",
      desc: "10% de descuento. Te enviamos los datos al confirmar.",
      active: true,
    },
    {
      id: "efectivo",
      title: "Efectivo en showroom",
      desc: "5% de descuento sobre el precio de lista.",
      active: true,
    },
    {
      id: "tarjeta",
      title: "Tarjeta de crédito · Hasta 6 cuotas",
      desc: "Visa, Mastercard, Naranja. Sin interés según promo vigente.",
      active: true,
    },
  ],
};

export async function fetchCategories() {
  assertConfigured();
  const q = query(collection(db, "categories"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchProducts() {
  assertConfigured();
  const q = query(collection(db, "products"), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchProductsByCategory(slug) {
  assertConfigured();
  const q = query(collection(db, "products"), where("cat", "==", slug));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchFeaturedProducts(limitN = 8) {
  assertConfigured();
  const q = query(collection(db, "products"), where("featured", "==", true));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return list.slice(0, limitN);
}

export async function fetchProductById(id) {
  assertConfigured();
  const snap = await getDoc(doc(db, "products", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function fetchProjects() {
  assertConfigured();
  const q = query(collection(db, "projects"), orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchProjectById(id) {
  assertConfigured();
  const snap = await getDoc(doc(db, "projects", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function fetchTestimonials() {
  assertConfigured();
  const q = query(collection(db, "testimonials"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchSiteContent() {
  assertConfigured();
  const snap = await getDoc(doc(db, "site", "content"));
  if (!snap.exists()) return { img: DEFAULT_IMAGES, hero: DEFAULT_HERO, checkout: DEFAULT_CHECKOUT };
  const data = snap.data() || {};
  const checkoutRaw = data.checkout && typeof data.checkout === "object" ? data.checkout : {};
  const shippingOptions = Array.isArray(checkoutRaw.shippingOptions) ? checkoutRaw.shippingOptions : DEFAULT_CHECKOUT.shippingOptions;
  const paymentOptions = Array.isArray(checkoutRaw.paymentOptions) ? checkoutRaw.paymentOptions : DEFAULT_CHECKOUT.paymentOptions;
  const heroRaw = data.hero && typeof data.hero === "object" ? data.hero : {};
  const heroSlidesRaw = Array.isArray(heroRaw.slides) ? heroRaw.slides : [];
  const heroSlides = heroSlidesRaw
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 4);
  return {
    img: { ...DEFAULT_IMAGES, ...(data.img || {}) },
    hero: {
      ...DEFAULT_HERO,
      ...heroRaw,
      slides: heroSlides.length > 0 ? heroSlides : DEFAULT_HERO.slides,
      titleLine1: String(heroRaw.titleLine1 || DEFAULT_HERO.titleLine1 || "").trim(),
      titleLine2: String(heroRaw.titleLine2 || DEFAULT_HERO.titleLine2 || "").trim(),
      highlightText: String(heroRaw.highlightText || DEFAULT_HERO.highlightText || "").trim(),
      lead: String(heroRaw.lead || DEFAULT_HERO.lead || "").trim(),
      primaryCtaLabel: String(heroRaw.primaryCtaLabel || DEFAULT_HERO.primaryCtaLabel || "").trim(),
      primaryCtaHref: String(heroRaw.primaryCtaHref || DEFAULT_HERO.primaryCtaHref || "").trim(),
      secondaryCtaLabel: String(heroRaw.secondaryCtaLabel || DEFAULT_HERO.secondaryCtaLabel || "").trim(),
      secondaryCtaHref: String(heroRaw.secondaryCtaHref || DEFAULT_HERO.secondaryCtaHref || "").trim(),
    },
    checkout: { shippingOptions, paymentOptions },
  };
}
