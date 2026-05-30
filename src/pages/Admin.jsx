import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { arrayRemove, arrayUnion, deleteField, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, firebaseConfigured } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import {
  deleteCategory,
  deleteProduct,
  subscribeCategories,
  subscribeLeads,
  subscribeOrders,
  subscribeProducts,
  updateOrderStatus,
  upsertCategory,
  upsertProduct,
} from "../services/admin";
import { uploadCortinasColorImage, uploadCortinasFabricImage, uploadProductImage } from "../services/storage";

function fmtDate(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : ts instanceof Date ? ts : null;
    if (!d) return "";
    return d.toLocaleString("es-AR");
  } catch (_) {
    return "";
  }
}

function Field({ label, children }) {
  return (
    <div className="admin__field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Admin() {
  const nav = useNavigate();
  const { loading, user } = useAuth();
  const authed = !!user;
  const envAdminUid = import.meta.env.VITE_ADMIN_UID ? String(import.meta.env.VITE_ADMIN_UID) : "";
  const [adminsDoc, setAdminsDoc] = useState({ loading: true, data: null });

  const isAdmin = useMemo(() => {
    if (!user) return false;
    if (envAdminUid && user.uid === envAdminUid) return true;
    const d = adminsDoc.data || {};
    const uids = d?.uids && typeof d.uids === "object" ? d.uids : {};
    const emailsMap = d?.emails && typeof d.emails === "object" ? d.emails : {};
    const emailsListRaw = Array.isArray(d?.emailsList) ? d.emailsList : [];
    const email = user.email ? String(user.email).toLowerCase() : "";
    if (uids && user.uid && uids[String(user.uid)]) return true;
    if (emailsMap && email && emailsMap[email]) return true;
    if (email && emailsListRaw.some((e) => String(e || "").toLowerCase() === email)) return true;
    return false;
  }, [adminsDoc.data, envAdminUid, user]);

  const [tab, setTab] = useState("home");
  const [settingsTab, setSettingsTab] = useState("admins");
  const [status, setStatus] = useState({ type: "", message: "" });

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [logging, setLogging] = useState(false);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [siteContentDoc, setSiteContentDoc] = useState({ loading: true, data: null });

  const DEFAULT_CHECKOUT = useMemo(
    () => ({
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
    }),
    [],
  );

  const [checkoutDraft, setCheckoutDraft] = useState(DEFAULT_CHECKOUT);
  const [savingCheckout, setSavingCheckout] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPass, setNewAdminPass] = useState("");
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const [catDraft, setCatDraft] = useState({ slug: "", name: "", tag: "", icon: "chair", order: 0, active: true });

  const blankProduct = useMemo(
    () => ({
      id: "",
      name: "",
      cat: "sillas",
      catName: "Sillas",
      tagline: "",
      desc: "",
      imageUrl: "",
      price: "",
      badge: "",
      featured: false,
      active: true,
      colors: [],
      specs: {},
      sections: [],
    }),
    [],
  );
  const [prodDraft, setProdDraft] = useState(blankProduct);
  const [uploading, setUploading] = useState(false);
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#111111");

  const blankCortinas = useMemo(
    () => ({
      fabrics: [
        {
          id: "sun-screen",
          name: "Sun Screen",
          tag: "Filtro UV · Visión hacia afuera",
          pricePerM2: 32000,
          active: true,
          imageUrl: "",
        },
        {
          id: "blackout",
          name: "Black-Out",
          tag: "100% opaca · Oscurece totalmente",
          pricePerM2: 38000,
          active: true,
          imageUrl: "",
        },
        {
          id: "doble",
          name: "Sistema Doble",
          tag: "Screen + Black-Out en un solo sistema",
          pricePerM2: 75000,
          active: true,
          imageUrl: "",
        },
      ],
      pricing: {
        installPrice: 0,
        chainMetalPrice: 0,
        systemBlackPrice: 0,
        zocaloPrice: 0,
        extraHeightThresholdCm: 220,
        extraHeightPrice: 0,
      },
      colors: [],
    }),
    [],
  );
  const [cortinasDraft, setCortinasDraft] = useState(blankCortinas);
  const [cortinasSaving, setCortinasSaving] = useState(false);
  const [cortinasUploading, setCortinasUploading] = useState("");
  const [cortinasColorUploading, setCortinasColorUploading] = useState("");
  const [cortinasSubtab, setCortinasSubtab] = useState("telas");
  const [selectedFabricId, setSelectedFabricId] = useState("");
  const [selectedColorId, setSelectedColorId] = useState("");
  const [openOrderId, setOpenOrderId] = useState("");

  const defaultEnvioText = "Envío gratis en Venado Tuerto. Envío a todo el país coordinado por transporte propio o flete.";
  const defaultGarantiaText = "Garantía Picchio: 1 año en tapicería, 2 años en estructura y 5 años en herrajes.";

  const palette = useMemo(
    () => [
      { name: "Negro", hex: "#111111" },
      { name: "Blanco", hex: "#F5F3EE" },
      { name: "Gris", hex: "#9CA3AF" },
      { name: "Grafito", hex: "#374151" },
      { name: "Beige", hex: "#D6C7B2" },
      { name: "Arena", hex: "#C9B79C" },
      { name: "Visón", hex: "#A89F91" },
      { name: "Nogal", hex: "#6B4E3D" },
      { name: "Roble", hex: "#B08D57" },
      { name: "Verde", hex: "#1F7A4D" },
      { name: "Azul", hex: "#1D4ED8" },
      { name: "Terracota", hex: "#B45309" },
    ],
    [],
  );

  function describeError(err) {
    const code = err?.code ? String(err.code) : "";
    const message = err?.message ? String(err.message) : "";
    if (code && message) return `${code}: ${message}`;
    return code || message || "Error";
  }

  function describeCreateAdminError(err) {
    const code = err?.code ? String(err.code) : "";
    if (code === "auth/email-already-in-use") return "Ese email ya existe. Usá “Habilitar como admin” o elegí otro email.";
    if (code === "auth/invalid-email") return "El email no es válido.";
    if (code === "auth/weak-password") return "La contraseña es muy débil (mínimo 6 caracteres).";
    if (code === "auth/operation-not-allowed") return "Email/Contraseña está deshabilitado en Firebase Auth.";
    if (code === "auth/invalid-api-key") return "API Key inválida (revisá VITE_FIREBASE_API_KEY).";
    if (code === "auth/network-request-failed") return "Error de red. Probá nuevamente.";
    const msg = err?.message ? String(err.message) : "";
    if (msg) return msg;
    return "No se pudo crear el usuario admin.";
  }

  function toNumber(v) {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function makeId(prefix = "id") {
    try {
      return crypto.randomUUID();
    } catch (_) {
      return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
  }

  function updateShippingOption(idx, patch) {
    setCheckoutDraft((p) => ({
      ...p,
      shippingOptions: (Array.isArray(p.shippingOptions) ? p.shippingOptions : []).map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  }

  function addShippingOption() {
    setCheckoutDraft((p) => ({
      ...p,
      shippingOptions: [
        ...(Array.isArray(p.shippingOptions) ? p.shippingOptions : []),
        { id: makeId("ship"), title: "Nuevo envío", desc: "", priceLabel: "Gratis", requiresAddress: true, active: true },
      ],
    }));
  }

  function removeShippingOption(idx) {
    setCheckoutDraft((p) => ({
      ...p,
      shippingOptions: (Array.isArray(p.shippingOptions) ? p.shippingOptions : []).filter((_, i) => i !== idx),
    }));
  }

  function updatePaymentOption(idx, patch) {
    setCheckoutDraft((p) => ({
      ...p,
      paymentOptions: (Array.isArray(p.paymentOptions) ? p.paymentOptions : []).map((x, i) => (i === idx ? { ...x, ...patch } : x)),
    }));
  }

  function addPaymentOption() {
    setCheckoutDraft((p) => ({
      ...p,
      paymentOptions: [...(Array.isArray(p.paymentOptions) ? p.paymentOptions : []), { id: makeId("pay"), title: "Nuevo pago", desc: "", active: true }],
    }));
  }

  function removePaymentOption(idx) {
    setCheckoutDraft((p) => ({
      ...p,
      paymentOptions: (Array.isArray(p.paymentOptions) ? p.paymentOptions : []).filter((_, i) => i !== idx),
    }));
  }

  useEffect(() => {
    setStatus({ type: "", message: "" });
  }, [tab]);

  useEffect(() => {
    if (!authed || !firebaseConfigured || !db) {
      setAdminsDoc({ loading: false, data: null });
      return;
    }

    setAdminsDoc((s) => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      doc(db, "site", "admins"),
      (snap) => setAdminsDoc({ loading: false, data: snap.exists() ? snap.data() : null }),
      () => setAdminsDoc({ loading: false, data: null }),
    );
    return () => unsub();
  }, [authed]);

  useEffect(() => {
    if (!authed || !isAdmin) return;

    const onSubError = (err) => setStatus({ type: "err", message: describeError(err) });

    let unsubCats = () => {};
    let unsubProds = () => {};
    let unsubOrders = () => {};
    let unsubLeads = () => {};

    try {
      unsubCats = subscribeCategories(setCategories, onSubError);
      unsubProds = subscribeProducts(setProducts, onSubError);
      unsubOrders = subscribeOrders(setOrders, onSubError);
      unsubLeads = subscribeLeads(setLeads, onSubError);
    } catch (err) {
      setStatus({ type: "err", message: describeError(err) });
    }

    return () => {
      unsubCats();
      unsubProds();
      unsubOrders();
      unsubLeads();
    };
  }, [authed, isAdmin]);

  useEffect(() => {
    if (!authed || !isAdmin || !firebaseConfigured || !db) return;
    setSiteContentDoc((s) => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      doc(db, "site", "content"),
      (snap) => setSiteContentDoc({ loading: false, data: snap.exists() ? snap.data() : null }),
      () => setSiteContentDoc({ loading: false, data: null }),
    );
    return () => unsub();
  }, [authed, isAdmin]);

  useEffect(() => {
    if (!siteContentDoc.data) return;
    const checkout = siteContentDoc.data?.checkout || null;
    if (!checkout || typeof checkout !== "object") return;
    const shipRaw = Array.isArray(checkout.shippingOptions) ? checkout.shippingOptions : [];
    const payRaw = Array.isArray(checkout.paymentOptions) ? checkout.paymentOptions : [];
    const shippingOptions =
      shipRaw.length > 0
        ? shipRaw
            .map((s, i) => ({
              id: String(s?.id || `ship_${i}`),
              title: String(s?.title || "").trim(),
              desc: String(s?.desc || "").trim(),
              priceLabel: String(s?.priceLabel || "").trim(),
              requiresAddress: !!s?.requiresAddress,
              active: s?.active !== false,
            }))
            .filter((s) => s.id && s.title)
        : DEFAULT_CHECKOUT.shippingOptions;

    const paymentOptions =
      payRaw.length > 0
        ? payRaw
            .map((p, i) => ({
              id: String(p?.id || `pay_${i}`),
              title: String(p?.title || "").trim(),
              desc: String(p?.desc || "").trim(),
              active: p?.active !== false,
            }))
            .filter((p) => p.id && p.title)
        : DEFAULT_CHECKOUT.paymentOptions;

    setCheckoutDraft({ shippingOptions, paymentOptions });
  }, [DEFAULT_CHECKOUT.paymentOptions, DEFAULT_CHECKOUT.shippingOptions, siteContentDoc.data]);

  useEffect(() => {
    if (tab !== "cortinas") return;
    const existing = categories.find((c) => (c.slug || c.id) === "cortinas");
    const cfg = existing?.cortinasConfig || null;

    const fabricsRaw = Array.isArray(cfg?.fabrics) ? cfg.fabrics : [];
    const fabrics =
      fabricsRaw.length > 0
        ? fabricsRaw
            .map((f, i) => ({
              id: String(f?.id || f?.key || `fabric_${i}`),
              name: String(f?.name || f?.label || "").trim(),
              tag: String(f?.tag || "").trim(),
              pricePerM2: toNumber(f?.pricePerM2),
              active: f?.active !== false,
              imageUrl: String(f?.imageUrl || ""),
              colorIds: Array.isArray(f?.colorIds) ? f.colorIds.map((x) => String(x)) : [],
            }))
            .filter((f) => f.name.length > 0)
        : blankCortinas.fabrics;

    const colorsRaw = Array.isArray(cfg?.colors) ? cfg.colors : [];
    const colors =
      colorsRaw.length > 0
        ? colorsRaw
            .map((c, i) => ({
              id: String(c?.id || `color_${i}`),
              name: String(c?.name || "").trim(),
              imageUrl: String(c?.imageUrl || ""),
              active: c?.active !== false,
            }))
            .filter((c) => c.name.length > 0)
        : blankCortinas.colors;

    const pricing = {
      installPrice: toNumber(cfg?.pricing?.installPrice),
      chainMetalPrice: toNumber(cfg?.pricing?.chainMetalPrice),
      systemBlackPrice: toNumber(cfg?.pricing?.systemBlackPrice),
      zocaloPrice: toNumber(cfg?.pricing?.zocaloPrice),
      extraHeightThresholdCm: toNumber(cfg?.pricing?.extraHeightThresholdCm || 220) || 220,
      extraHeightPrice: toNumber(cfg?.pricing?.extraHeightPrice),
    };

    setCortinasDraft({ fabrics, pricing, colors });
    setCortinasSubtab("telas");
    setSelectedFabricId(String((fabrics[0] && fabrics[0].id) || ""));
    setSelectedColorId(String((colors[0] && colors[0].id) || ""));
  }, [tab, categories, blankCortinas]);

  useEffect(() => {
    if (tab !== "cortinas") return;
    const first = (Array.isArray(cortinasDraft.fabrics) ? cortinasDraft.fabrics : [])[0];
    if (selectedFabricId && (Array.isArray(cortinasDraft.fabrics) ? cortinasDraft.fabrics : []).some((f) => f.id === selectedFabricId)) return;
    setSelectedFabricId(String(first?.id || ""));
  }, [tab, cortinasDraft.fabrics, selectedFabricId]);

  useEffect(() => {
    if (tab !== "cortinas") return;
    const first = (Array.isArray(cortinasDraft.colors) ? cortinasDraft.colors : [])[0];
    if (selectedColorId && (Array.isArray(cortinasDraft.colors) ? cortinasDraft.colors : []).some((c) => c.id === selectedColorId)) return;
    setSelectedColorId(String(first?.id || ""));
  }, [tab, cortinasDraft.colors, selectedColorId]);

  useEffect(() => {
    if (authed && !isAdmin && !loading && !adminsDoc.loading) {
      setStatus({ type: "err", message: "Tu usuario no tiene permisos de administrador" });
    }
  }, [authed, isAdmin, loading, adminsDoc.loading]);

  function describeLoginError(err) {
    const code = err?.code ? String(err.code) : "";
    if (code === "auth/invalid-credential") return "Email o contraseña incorrectos.";
    if (code === "auth/wrong-password") return "Contraseña incorrecta.";
    if (code === "auth/user-not-found") return "Ese usuario no existe. Primero hay que crearlo en Firebase Auth.";
    if (code === "auth/too-many-requests") return "Demasiados intentos. Esperá unos minutos y probá de nuevo.";
    if (code === "auth/network-request-failed") return "Error de red. Probá de nuevo.";
    if (code === "auth/operation-not-allowed") return "Email/Contraseña está deshabilitado en Firebase Auth.";
    const msg = err?.message ? String(err.message) : "";
    return msg || "No se pudo iniciar sesión.";
  }

  async function onLogin(e) {
    e.preventDefault();
    if (logging) return;
    setLogging(true);
    setStatus({ type: "", message: "" });
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setEmail("");
      setPass("");
    } catch (err) {
      setStatus({ type: "err", message: describeLoginError(err) });
    } finally {
      setLogging(false);
    }
  }

  async function onLogout() {
    await signOut(auth);
  }

  async function addAdmin(uid, email) {
    if (!firebaseConfigured || !db) return;
    const cleanUid = String(uid || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanUid && !cleanEmail) return;
    const patch = { updatedAt: serverTimestamp() };
    if (cleanUid) patch.uids = { [cleanUid]: { email: cleanEmail || null, createdAt: serverTimestamp() } };
    if (cleanEmail) patch.emailsList = arrayUnion(cleanEmail);
    await setDoc(doc(db, "site", "admins"), patch, { merge: true });
  }

  async function removeAdmin(uid, email) {
    if (!firebaseConfigured || !db) return;
    const cleanUid = String(uid || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const patch = { updatedAt: serverTimestamp() };
    if (cleanUid) patch[`uids.${cleanUid}`] = deleteField();
    if (cleanEmail) patch.emailsList = arrayRemove(cleanEmail);
    await updateDoc(doc(db, "site", "admins"), patch);
  }

  async function onCreateAdminUser() {
    if (creatingAdmin) return;
    if (!firebaseConfigured) return;

    const email = String(newAdminEmail || "").trim().toLowerCase();
    const pass = String(newAdminPass || "");
    if (!email || pass.length < 6) {
      setStatus({ type: "err", message: "Ingresá un email válido y una contraseña (mínimo 6 caracteres)" });
      return;
    }

    setCreatingAdmin(true);
    setStatus({ type: "", message: "" });
    try {
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };
      const secondaryApp = initializeApp(firebaseConfig, `admin-create-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
      await addAdmin(cred.user.uid, email);
      setNewAdminEmail("");
      setNewAdminPass("");
      setStatus({ type: "ok", message: "Usuario admin creado" });
    } catch (err) {
      setStatus({ type: "err", message: describeCreateAdminError(err) });
    } finally {
      setCreatingAdmin(false);
    }
  }

  async function onSaveCheckoutSettings() {
    if (savingCheckout) return;
    if (!firebaseConfigured || !db) return;
    setSavingCheckout(true);
    setStatus({ type: "", message: "" });
    try {
      await setDoc(
        doc(db, "site", "content"),
        {
          checkout: checkoutDraft,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setStatus({ type: "ok", message: "Configuración guardada" });
    } catch (err) {
      setStatus({ type: "err", message: "No se pudo guardar la configuración" });
    } finally {
      setSavingCheckout(false);
    }
  }

  function updateCortinasPricing(patch) {
    setCortinasDraft((p) => ({ ...p, pricing: { ...p.pricing, ...patch } }));
  }

  function updateCortinasFabric(id, patch) {
    setCortinasDraft((p) => ({
      ...p,
      fabrics: (Array.isArray(p.fabrics) ? p.fabrics : []).map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  }

  function updateCortinasColor(id, patch) {
    setCortinasDraft((p) => ({
      ...p,
      colors: (Array.isArray(p.colors) ? p.colors : []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  function removeCortinasFabric(id) {
    setCortinasDraft((p) => ({ ...p, fabrics: (Array.isArray(p.fabrics) ? p.fabrics : []).filter((f) => f.id !== id) }));
  }

  function removeCortinasColor(id) {
    setCortinasDraft((p) => {
      const colors = (Array.isArray(p.colors) ? p.colors : []).filter((c) => c.id !== id);
      const fabrics = (Array.isArray(p.fabrics) ? p.fabrics : []).map((f) => ({
        ...f,
        colorIds: (Array.isArray(f.colorIds) ? f.colorIds : []).filter((x) => x !== id),
      }));
      return { ...p, colors, fabrics };
    });
  }

  function toggleCortinasFabricColor(fabricId, colorId) {
    setCortinasDraft((p) => {
      const fabrics = (Array.isArray(p.fabrics) ? p.fabrics : []).map((f) => {
        if (f.id !== fabricId) return f;
        const ids = Array.isArray(f.colorIds) ? f.colorIds.map((x) => String(x)) : [];
        const next = ids.includes(colorId) ? ids.filter((x) => x !== colorId) : [...ids, colorId];
        return { ...f, colorIds: next };
      });
      return { ...p, fabrics };
    });
  }

  function createCortinasFabric() {
    const id = makeId("fabric");
    const next = {
      id,
      name: "Nueva tela",
      tag: "",
      pricePerM2: 0,
      active: true,
      imageUrl: "",
      colorIds: [],
    };
    setCortinasDraft((p) => ({ ...p, fabrics: [next, ...(Array.isArray(p.fabrics) ? p.fabrics : [])] }));
    setSelectedFabricId(id);
    setCortinasSubtab("telas");
    setStatus({ type: "ok", message: "Tela creada (completá los datos y guardá)" });
  }

  function createCortinasColor() {
    const id = makeId("color");
    const next = { id, name: "Nuevo color", imageUrl: "", active: true };
    setCortinasDraft((p) => {
      const colors = [next, ...(Array.isArray(p.colors) ? p.colors : [])];
      const fabrics = (Array.isArray(p.fabrics) ? p.fabrics : []).map((f) => ({
        ...f,
        colorIds: (Array.isArray(f.colorIds) ? f.colorIds : []).filter((x) => String(x) !== id),
      }));
      return { ...p, colors, fabrics };
    });
    setSelectedColorId(id);
    setCortinasSubtab("colores");
    setStatus({ type: "ok", message: "Color creado (completá los datos y guardá)" });
  }

  async function onUploadCortinasFabricImage(fabricId, file) {
    if (!file) return;
    setStatus({ type: "", message: "" });
    setCortinasUploading(fabricId);
    try {
      const url = await uploadCortinasFabricImage({ fabricId, file });
      updateCortinasFabric(fabricId, { imageUrl: url });
      setStatus({ type: "ok", message: "Imagen de tela subida" });
    } catch (err) {
      setStatus({ type: "err", message: describeError(err) });
    } finally {
      setCortinasUploading("");
    }
  }

  async function onUploadCortinasColorImage(colorId, file) {
    if (!file) return;
    setStatus({ type: "", message: "" });
    setCortinasColorUploading(colorId);
    try {
      const url = await uploadCortinasColorImage({ colorId, file });
      updateCortinasColor(colorId, { imageUrl: url });
      setStatus({ type: "ok", message: "Imagen de color subida" });
    } catch (err) {
      setStatus({ type: "err", message: describeError(err) });
    } finally {
      setCortinasColorUploading("");
    }
  }

  async function onSaveCortinasConfig() {
    if (cortinasSaving) return;
    setCortinasSaving(true);
    setStatus({ type: "", message: "" });
    try {
      const existing = categories.find((c) => (c.slug || c.id) === "cortinas");
      const baseCategory = {
        name: existing?.name || "Cortinas Roller",
        tag: existing?.tag || "Black-out · Sun screen",
        icon: existing?.icon || "blinds",
        order: existing?.order ?? 0,
        active: existing?.active !== false,
      };

      const fabrics = (Array.isArray(cortinasDraft.fabrics) ? cortinasDraft.fabrics : [])
        .map((f, i) => ({
          id: String(f?.id || `fabric_${i}`),
          name: String(f?.name || "").trim(),
          tag: String(f?.tag || "").trim(),
          pricePerM2: toNumber(f?.pricePerM2),
          active: f?.active !== false,
          imageUrl: String(f?.imageUrl || ""),
          colorIds: Array.isArray(f?.colorIds) ? f.colorIds.map((x) => String(x)) : [],
        }))
        .filter((f) => f.name.length > 0 && f.pricePerM2 > 0);

      const colors = (Array.isArray(cortinasDraft.colors) ? cortinasDraft.colors : [])
        .map((c, i) => ({
          id: String(c?.id || `color_${i}`),
          name: String(c?.name || "").trim(),
          imageUrl: String(c?.imageUrl || ""),
          active: c?.active !== false,
        }))
        .filter((c) => c.name.length > 0);

      const pricing = {
        installPrice: toNumber(cortinasDraft?.pricing?.installPrice),
        chainMetalPrice: toNumber(cortinasDraft?.pricing?.chainMetalPrice),
        systemBlackPrice: toNumber(cortinasDraft?.pricing?.systemBlackPrice),
        zocaloPrice: toNumber(cortinasDraft?.pricing?.zocaloPrice),
        extraHeightThresholdCm: toNumber(cortinasDraft?.pricing?.extraHeightThresholdCm || 220) || 220,
        extraHeightPrice: toNumber(cortinasDraft?.pricing?.extraHeightPrice),
      };

      await upsertCategory("cortinas", {
        ...baseCategory,
        cortinasConfig: { fabrics, pricing, colors },
      });
      setStatus({ type: "ok", message: "Configuración de cortinas guardada" });
    } catch (err) {
      setStatus({ type: "err", message: describeError(err) });
    } finally {
      setCortinasSaving(false);
    }
  }

  async function onSaveCategory(e) {
    e?.preventDefault();
    setStatus({ type: "", message: "" });
    if (!catDraft.slug || !catDraft.name) return setStatus({ type: "err", message: "Slug y nombre son obligatorios" });
    try {
      await upsertCategory(catDraft.slug, {
        name: catDraft.name,
        tag: catDraft.tag,
        icon: catDraft.icon,
        order: Number(catDraft.order) || 0,
        active: !!catDraft.active,
      });
      setCatDraft({ slug: "", name: "", tag: "", icon: "chair", order: 0, active: true });
      setStatus({ type: "ok", message: "Categoría guardada" });
    } catch (err) {
      setStatus({ type: "err", message: describeError(err) });
    }
  }

  async function onEditCategory(c) {
    setCatDraft({
      slug: c.slug || c.id,
      name: c.name || "",
      tag: c.tag || "",
      icon: c.icon || "chair",
      order: c.order ?? 0,
      active: c.active !== false,
    });
    setTab("categories");
  }

  async function onDeleteCategory(slug) {
    if (!confirm("¿Eliminar categoría?")) return;
    setStatus({ type: "", message: "" });
    try {
      await deleteCategory(slug);
      setStatus({ type: "ok", message: "Categoría eliminada" });
    } catch (err) {
      setStatus({ type: "err", message: describeError(err) });
    }
  }

  function deriveCatName(slug) {
    const c = categories.find((x) => x.slug === slug || x.id === slug);
    return c?.name || slug;
  }

  function normalizeHex(v) {
    const s = String(v || "").trim();
    if (!s) return "";
    if (s.startsWith("#")) return s.toUpperCase();
    return ("#" + s).toUpperCase();
  }

  function makeSectionId() {
    try {
      return crypto.randomUUID();
    } catch (_) {
      return `sec_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
  }

  function addColor(next) {
    const name = String(next?.name || "").trim();
    const hex = normalizeHex(next?.hex);
    if (!name) return setStatus({ type: "err", message: "Color: falta el nombre" });
    if (!/^#[0-9A-F]{6}$/i.test(hex)) return setStatus({ type: "err", message: "Color: hex inválido (ej: #FFFFFF)" });
    setProdDraft((p) => {
      const existing = Array.isArray(p.colors) ? p.colors : [];
      const withoutSameName = existing.filter((c) => String(c?.name || "").toLowerCase() !== name.toLowerCase());
      return { ...p, colors: [...withoutSameName, { name, hex }] };
    });
    setColorName("");
    setStatus({ type: "", message: "" });
  }

  function removeColor(name) {
    setProdDraft((p) => {
      const existing = Array.isArray(p.colors) ? p.colors : [];
      return { ...p, colors: existing.filter((c) => c?.name !== name) };
    });
  }

  function addSection(kind = "text") {
    setProdDraft((p) => {
      const existing = Array.isArray(p.sections) ? p.sections : [];
      const next =
        kind === "specs"
          ? { id: makeSectionId(), type: "specs", title: "Especificaciones" }
          : { id: makeSectionId(), type: "text", title: "", body: "" };
      return { ...p, sections: [...existing, next] };
    });
  }

  function removeSection(id) {
    setProdDraft((p) => {
      const existing = Array.isArray(p.sections) ? p.sections : [];
      return { ...p, sections: existing.filter((s) => s?.id !== id) };
    });
  }

  function moveSection(id, dir) {
    setProdDraft((p) => {
      const existing = Array.isArray(p.sections) ? p.sections : [];
      const idx = existing.findIndex((s) => s?.id === id);
      if (idx < 0) return p;
      const nextIdx = dir === "up" ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= existing.length) return p;
      const next = [...existing];
      const tmp = next[idx];
      next[idx] = next[nextIdx];
      next[nextIdx] = tmp;
      return { ...p, sections: next };
    });
  }

  async function onSaveProduct(e) {
    e?.preventDefault();
    setStatus({ type: "", message: "" });
    if (!prodDraft.id || !prodDraft.name) return setStatus({ type: "err", message: "ID y nombre son obligatorios" });

    const specs = prodDraft?.specs && typeof prodDraft.specs === "object" ? prodDraft.specs : {};
    const sectionsRaw = Array.isArray(prodDraft.sections) ? prodDraft.sections : [];
    const sectionsClean = sectionsRaw
      .map((s) => {
        const id = String(s?.id || "").trim() || makeSectionId();
        const type = s?.type === "specs" ? "specs" : "text";
        const title = String(s?.title || "").trim();
        const body = String(s?.body || "");
        return { id, type, title, body };
      })
      .filter((s) => s.title.length > 0);

    try {
      const catName = deriveCatName(prodDraft.cat);
      const rawPrice = String(prodDraft.price || "").trim();
      const price =
        rawPrice.length === 0
          ? deleteField()
          : (() => {
              const n = Number(rawPrice);
              if (!Number.isFinite(n) || n < 0) throw new Error("Precio inválido");
              return n;
            })();

      await upsertProduct(prodDraft.id, {
        id: prodDraft.id,
        name: prodDraft.name,
        cat: prodDraft.cat,
        catName,
        tagline: prodDraft.tagline,
        desc: prodDraft.desc,
        imageUrl: prodDraft.imageUrl,
        image: prodDraft.imageUrl,
        price,
        badge: prodDraft.badge || "",
        featured: !!prodDraft.featured,
        active: !!prodDraft.active,
        colors: Array.isArray(prodDraft.colors) ? prodDraft.colors : [],
        specs,
        sections: sectionsClean.length > 0 ? sectionsClean : deleteField(),
      });
      setProdDraft(blankProduct);
      setStatus({ type: "ok", message: "Producto guardado" });
    } catch (err) {
      setStatus({ type: "err", message: describeError(err) });
    }
  }

  function onEditProduct(p) {
    setProdDraft({
      id: p.id || p.docId || p._id || p.id,
      name: p.name || "",
      cat: p.cat || "sillas",
      catName: p.catName || deriveCatName(p.cat || "sillas"),
      tagline: p.tagline || "",
      desc: p.desc || "",
      imageUrl: p.imageUrl || p.image || "",
      price: p.price == null ? "" : String(p.price),
      badge: p.badge || "",
      featured: !!p.featured,
      active: p.active !== false,
      colors: Array.isArray(p.colors) ? p.colors : [],
      specs: p?.specs && typeof p.specs === "object" ? p.specs : {},
      sections:
        Array.isArray(p.sections) && p.sections.length > 0
          ? p.sections
          : [
              { id: makeSectionId(), type: "text", title: "Detalles del producto", body: p.desc || "" },
              ...(p?.specs && Object.keys(p.specs).length > 0 ? [{ id: makeSectionId(), type: "specs", title: "Especificaciones" }] : []),
              { id: makeSectionId(), type: "text", title: "Envíos y devoluciones", body: defaultEnvioText },
              { id: makeSectionId(), type: "text", title: "Garantía", body: defaultGarantiaText },
            ],
    });
    setColorName("");
    setColorHex("#111111");
    setTab("products");
  }

  async function onDeleteProduct(id) {
    if (!confirm("¿Eliminar producto?")) return;
    setStatus({ type: "", message: "" });
    try {
      await deleteProduct(id);
      setStatus({ type: "ok", message: "Producto eliminado" });
    } catch (err) {
      setStatus({ type: "err", message: describeError(err) });
    }
  }

  async function onUploadImage(file) {
    if (!file) return;
    if (!prodDraft.id) return setStatus({ type: "err", message: "Primero definí el ID del producto" });
    setUploading(true);
    setStatus({ type: "", message: "" });
    try {
      const url = await uploadProductImage({ productId: prodDraft.id, file });
      setProdDraft((p) => ({ ...p, imageUrl: url }));
      setStatus({ type: "ok", message: "Imagen subida" });
    } catch (err) {
      setStatus({ type: "err", message: describeError(err) });
    } finally {
      setUploading(false);
    }
  }

  async function onChangeOrderStatus(orderId, status) {
    try {
      await updateOrderStatus(orderId, status);
    } catch (err) {
      setStatus({ type: "err", message: describeError(err) });
    }
  }

  if (!firebaseConfigured) {
    return (
      <div className="admin">
        <div className="container">
          <div className="admin__card">
            <div className="admin__head">
              <div>
                <div className="eyebrow">Panel</div>
                <h1 className="admin__title">Admin Picchio</h1>
                <p className="muted" style={{ margin: "8px 0 0" }}>
                  Falta configurar Firebase. Creá un archivo .env con VITE_FIREBASE_* y VITE_ADMIN_UID.
                </p>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => nav("/")}>
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin">
        <div className="container">
          <p className="muted">Cargando…</p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin">
        <div className="container">
          <div className="admin__card">
            <div className="admin__head">
              <div>
                <div className="eyebrow">Panel</div>
                <h1 className="admin__title">Admin Picchio</h1>
                <p className="muted" style={{ margin: "8px 0 0" }}>
                  Ingresá con tu usuario admin (Firebase Auth).
                </p>
              </div>
              <button className="btn btn--ghost btn--sm" onClick={() => nav("/")}>
                Volver
              </button>
            </div>

            <form onSubmit={onLogin} className="admin__auth">
              <Field label="Email">
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" required />
              </Field>
              <Field label="Contraseña">
                <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" autoComplete="current-password" required />
              </Field>
              <button className="btn btn--accent btn--block" disabled={logging}>
                {logging ? "Entrando..." : "Entrar"}
              </button>
            </form>

            {status.message && <div className={"admin__status " + (status.type === "err" ? "err" : "ok")}>{status.message}</div>}
          </div>
        </div>
      </div>
    );
  }

  if (adminsDoc.loading) {
    return (
      <div className="admin">
        <div className="container">
          <p className="muted">Verificando permisos…</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin">
        <div className="container">
          <div className="admin__card">
            <div className="admin__head">
              <div>
                <div className="eyebrow">Panel</div>
                <h1 className="admin__title">Admin Picchio</h1>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn--ghost btn--sm" onClick={() => nav("/")}>
                  Ir al sitio
                </button>
                <button className="btn btn--ghost btn--sm" onClick={onLogout}>
                  Salir
                </button>
              </div>
            </div>
            <div className={"admin__status err"}>Tu usuario no tiene permisos de administrador.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="container">
        <div className="admin__head">
          <div>
            <div className="eyebrow">Panel</div>
            <h1 className="admin__title">Admin Picchio</h1>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              Catálogo (Firestore) + imágenes (Storage). Pedidos y consultas sin cuenta.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn--ghost btn--sm" onClick={() => nav("/")}>
              Ir al sitio
            </button>
            <button className="btn btn--ghost btn--sm" onClick={onLogout}>
              Salir
            </button>
          </div>
        </div>

        <div className="admin__tabs">
          {[
            { k: "home", l: "Home" },
            { k: "products", l: "Productos" },
            { k: "categories", l: "Categorías" },
            { k: "cortinas", l: "Cortinas" },
            { k: "orders", l: "Pedidos" },
            { k: "leads", l: "Consultas" },
            { k: "settings", l: "Configuración" },
          ].map((t) => (
            <button key={t.k} className={"chip" + (tab === t.k ? " active" : "")} onClick={() => setTab(t.k)}>
              {t.l}
            </button>
          ))}
        </div>

        {tab === "home" && (
          <div className="admin__grid" style={{ marginTop: 16 }}>
            <div className="admin__panel">
              <div className="admin__panel-head" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <b>Pedidos</b>
                  <span className="muted">{orders.length}</span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    nuevos {(orders || []).filter((o) => (o.status || "new") === "new").length}
                  </span>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => setTab("orders")}>
                  Ver todos
                </button>
              </div>
              <div className="admin__list">
                {(orders || []).slice(0, 5).map((o) => (
                  <div key={o.id} className="admin__row">
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <b>{o.contact?.nombre ? `${o.contact.nombre} ${o.contact.apellido || ""}` : "Cliente"}</b>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {(o.status || "new") + " · " + fmtDate(o.createdAt)}
                      </span>
                    </div>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        setOpenOrderId(o.id);
                        setTab("orders");
                      }}
                    >
                      Abrir
                    </button>
                  </div>
                ))}
                {(orders || []).length === 0 && <div style={{ padding: 14 }} className="muted">Sin pedidos todavía.</div>}
              </div>
            </div>

            <div className="admin__panel">
              <div className="admin__panel-head" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <b>Consultas</b>
                  <span className="muted">{leads.length}</span>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => setTab("leads")}>
                  Ver todas
                </button>
              </div>
              <div className="admin__list">
                {(leads || []).slice(0, 5).map((l) => (
                  <div key={l.id} className="admin__row">
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <b>{l.form?.nombre || "Consulta"}</b>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {(l.form?.tel || "") + " · " + fmtDate(l.createdAt)}
                      </span>
                    </div>
                    <button className="btn btn--ghost btn--sm" onClick={() => setTab("leads")}>
                      Abrir
                    </button>
                  </div>
                ))}
                {(leads || []).length === 0 && <div style={{ padding: 14 }} className="muted">Sin consultas todavía.</div>}
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div style={{ marginTop: 16 }}>
            <div className="admin__tabs">
              {[
                { k: "admins", l: "Usuarios admin" },
                { k: "shipping", l: "Envío" },
                { k: "payment", l: "Pago" },
              ].map((t) => (
                <button key={t.k} className={"chip" + (settingsTab === t.k ? " active" : "")} onClick={() => setSettingsTab(t.k)}>
                  {t.l}
                </button>
              ))}
            </div>

            {settingsTab === "admins" && (
              <div className="admin__grid" style={{ marginTop: 16 }}>
                <div className="admin__panel">
                  <div className="admin__panel-head">
                    <b>Crear usuario admin</b>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="admin__auth">
                      <Field label="Email">
                        <input value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="admin@picchio.com" />
                      </Field>
                      <Field label="Contraseña">
                        <input type="password" value={newAdminPass} onChange={(e) => setNewAdminPass(e.target.value)} placeholder="mínimo 6 caracteres" />
                      </Field>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" className="btn btn--accent" onClick={onCreateAdminUser} disabled={creatingAdmin}>
                          {creatingAdmin ? "Creando..." : "Crear admin"}
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => addAdmin("", String(newAdminEmail || "").trim().toLowerCase())}
                          disabled={!String(newAdminEmail || "").trim()}
                        >
                          Habilitar como admin
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => addAdmin(user?.uid || "", user?.email || "")}
                          disabled={!user}
                        >
                          Agregarme como admin
                        </button>
                      </div>
                      <p className="muted" style={{ margin: "10px 0 0", fontSize: 12 }}>
                        Los admins se guardan en Firestore: <b>site/admins</b>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="admin__panel">
                  <div className="admin__panel-head">
                    <b>Admins habilitados</b>
                    <span className="muted">
                      {(() => {
                        const uids = adminsDoc.data?.uids && typeof adminsDoc.data.uids === "object" ? adminsDoc.data.uids : {};
                        const emails = Array.isArray(adminsDoc.data?.emailsList) ? adminsDoc.data.emailsList : [];
                        const emailOnly = emails.filter((e) => !Object.values(uids).some((x) => String(x?.email || "").toLowerCase() === String(e || "").toLowerCase()));
                        return Object.keys(uids).length + emailOnly.length;
                      })()}
                    </span>
                  </div>
                  <div className="admin__list">
                    {(() => {
                      const uids = adminsDoc.data?.uids && typeof adminsDoc.data.uids === "object" ? adminsDoc.data.uids : {};
                      const emails = Array.isArray(adminsDoc.data?.emailsList) ? adminsDoc.data.emailsList : [];
                      const usedEmails = new Set(
                        Object.values(uids)
                          .map((x) => String(x?.email || "").toLowerCase())
                          .filter(Boolean),
                      );
                      const emailOnly = emails.map((e) => String(e || "")).filter((e) => e && !usedEmails.has(e.toLowerCase()));

                      const rows = [
                        ...Object.entries(uids).map(([uid, info]) => ({
                          kind: "uid",
                          uid,
                          email: info?.email ? String(info.email) : "",
                        })),
                        ...emailOnly.map((email) => ({ kind: "email", uid: "", email: String(email) })),
                      ];

                      return rows.map((r) => (
                        <div key={(r.kind === "uid" ? `uid:${r.uid}` : `email:${r.email}`)} className="admin__row">
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <b style={{ fontSize: 13 }}>{r.email || r.uid}</b>
                            <span className="muted" style={{ fontSize: 12 }}>
                              {r.uid ? r.uid : "Sin UID (aún no inició sesión)"}
                            </span>
                          </div>
                          <button
                            className="btn btn--ghost btn--sm"
                            onClick={() => removeAdmin(r.uid, r.email)}
                            disabled={!!r.uid && user?.uid === r.uid}
                          >
                            Quitar
                          </button>
                        </div>
                      ));
                    })()}
                    {Object.keys(adminsDoc.data?.uids || {}).length === 0 && (!Array.isArray(adminsDoc.data?.emailsList) || adminsDoc.data.emailsList.length === 0) && (
                      <div style={{ padding: 14 }} className="muted">
                        Todavía no hay admins en site/admins.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {(settingsTab === "shipping" || settingsTab === "payment") && (
              <div className="admin__grid" style={{ marginTop: 16 }}>
                <div className="admin__panel">
                  <div className="admin__panel-head" style={{ justifyContent: "space-between" }}>
                    <b>{settingsTab === "shipping" ? "Métodos de envío" : "Métodos de pago"}</b>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={settingsTab === "shipping" ? addShippingOption : addPaymentOption}>
                        + Agregar
                      </button>
                      <button type="button" className="btn btn--accent btn--sm" onClick={onSaveCheckoutSettings} disabled={savingCheckout}>
                        {savingCheckout ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: 14, display: "grid", gap: 12 }}>
                    {settingsTab === "shipping" &&
                      (checkoutDraft.shippingOptions || []).map((s, idx) => (
                        <div key={s.id || idx} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 12 }}>
                          <div className="field-grid">
                            <Field label="ID">
                              <input value={s.id || ""} onChange={(e) => updateShippingOption(idx, { id: e.target.value.trim() })} />
                            </Field>
                            <Field label="Precio">
                              <input value={s.priceLabel || ""} onChange={(e) => updateShippingOption(idx, { priceLabel: e.target.value })} />
                            </Field>
                          </div>
                          <Field label="Título">
                            <input value={s.title || ""} onChange={(e) => updateShippingOption(idx, { title: e.target.value })} />
                          </Field>
                          <Field label="Descripción">
                            <input value={s.desc || ""} onChange={(e) => updateShippingOption(idx, { desc: e.target.value })} />
                          </Field>
                          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <input type="checkbox" checked={!!s.requiresAddress} onChange={(e) => updateShippingOption(idx, { requiresAddress: e.target.checked })} />
                              Pide dirección
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <input type="checkbox" checked={s.active !== false} onChange={(e) => updateShippingOption(idx, { active: e.target.checked })} />
                              Activo
                            </label>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeShippingOption(idx)}>
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}

                    {settingsTab === "payment" &&
                      (checkoutDraft.paymentOptions || []).map((p, idx) => (
                        <div key={p.id || idx} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 12 }}>
                          <Field label="ID">
                            <input value={p.id || ""} onChange={(e) => updatePaymentOption(idx, { id: e.target.value.trim() })} />
                          </Field>
                          <Field label="Título">
                            <input value={p.title || ""} onChange={(e) => updatePaymentOption(idx, { title: e.target.value })} />
                          </Field>
                          <Field label="Descripción">
                            <input value={p.desc || ""} onChange={(e) => updatePaymentOption(idx, { desc: e.target.value })} />
                          </Field>
                          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <input type="checkbox" checked={p.active !== false} onChange={(e) => updatePaymentOption(idx, { active: e.target.checked })} />
                              Activo
                            </label>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => removePaymentOption(idx)}>
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div style={{ padding: "0 14px 14px" }}>
                    <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                      Se guarda en <b>site/content.checkout</b>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "categories" && (
          <div className="admin__grid" style={{ marginTop: 16 }}>
            <div className="admin__panel">
              <div className="admin__panel-head">
                <b>Editar categoría</b>
                <span className="muted">{categories.length}</span>
              </div>
              <div style={{ padding: 14 }}>
                <form onSubmit={onSaveCategory} className="admin__auth">
                  <Field label="Slug">
                    <input value={catDraft.slug} onChange={(e) => setCatDraft((c) => ({ ...c, slug: e.target.value.trim() }))} />
                  </Field>
                  <Field label="Nombre">
                    <input value={catDraft.name} onChange={(e) => setCatDraft((c) => ({ ...c, name: e.target.value }))} />
                  </Field>
                  <Field label="Tag">
                    <input value={catDraft.tag} onChange={(e) => setCatDraft((c) => ({ ...c, tag: e.target.value }))} />
                  </Field>
                  <div className="field-grid">
                    <Field label="Icon">
                      <select value={catDraft.icon} onChange={(e) => setCatDraft((c) => ({ ...c, icon: e.target.value }))}>
                        {["ruler", "chair", "desk", "blinds", "table", "bed", "sofa"].map((i) => (
                          <option key={i} value={i}>
                            {i}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Order">
                      <input value={catDraft.order} type="number" onChange={(e) => setCatDraft((c) => ({ ...c, order: Number(e.target.value) }))} />
                    </Field>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" checked={!!catDraft.active} onChange={(e) => setCatDraft((c) => ({ ...c, active: e.target.checked }))} />
                    Activa
                  </label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn btn--accent">Guardar</button>
                    <button type="button" className="btn btn--ghost" onClick={() => setCatDraft({ slug: "", name: "", tag: "", icon: "chair", order: 0, active: true })}>
                      Limpiar
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="admin__panel">
              <div className="admin__panel-head">
                <b>Listado</b>
                <span className="muted">{categories.length}</span>
              </div>
              <div className="admin__list">
                {categories.map((c) => (
                  <div key={c.slug || c.id} className="admin__row">
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <b>{c.name}</b>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {c.slug || c.id} · {c.icon} · order {c.order ?? 0} {c.active === false ? "· inactiva" : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => onEditCategory(c)}>
                        Editar
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={() => onDeleteCategory(c.slug || c.id)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "products" && (
          <div className="admin__grid" style={{ marginTop: 16 }}>
            <div className="admin__panel">
              <div className="admin__panel-head">
                <b>Editar producto</b>
                <span className="muted">{products.length}</span>
              </div>
              <div style={{ padding: 14 }}>
                <form onSubmit={onSaveProduct} className="admin__auth">
                  <div className="field-grid">
                    <Field label="ID (docId)">
                      <input value={prodDraft.id} onChange={(e) => setProdDraft((p) => ({ ...p, id: e.target.value.trim() }))} />
                    </Field>
                    <Field label="Categoría (slug)">
                      <select value={prodDraft.cat} onChange={(e) => setProdDraft((p) => ({ ...p, cat: e.target.value }))}>
                        {categories.map((c) => (
                          <option key={c.slug || c.id} value={c.slug || c.id}>
                            {c.name} ({c.slug || c.id})
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Nombre">
                    <input value={prodDraft.name} onChange={(e) => setProdDraft((p) => ({ ...p, name: e.target.value }))} />
                  </Field>
                  <Field label="Tagline">
                    <input value={prodDraft.tagline} onChange={(e) => setProdDraft((p) => ({ ...p, tagline: e.target.value }))} />
                  </Field>
                  <Field label="Descripción">
                    <textarea rows={3} value={prodDraft.desc} onChange={(e) => setProdDraft((p) => ({ ...p, desc: e.target.value }))} />
                  </Field>

                  <Field label="Imagen (URL)">
                    <input value={prodDraft.imageUrl} onChange={(e) => setProdDraft((p) => ({ ...p, imageUrl: e.target.value }))} />
                  </Field>
                  <label className="btn btn--ghost" style={{ cursor: "pointer", justifyContent: "center" }}>
                    {uploading ? "Subiendo..." : "Subir imagen a Storage"}
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onUploadImage(e.target.files?.[0])} disabled={uploading} />
                  </label>

                  <div className="field-grid">
                    <Field label="Precio (ARS)">
                      <input
                        inputMode="numeric"
                        value={prodDraft.price}
                        placeholder="Ej: 125000"
                        onChange={(e) => setProdDraft((p) => ({ ...p, price: e.target.value }))}
                      />
                    </Field>
                    <Field label="Badge">
                      <input value={prodDraft.badge} onChange={(e) => setProdDraft((p) => ({ ...p, badge: e.target.value }))} />
                    </Field>
                  </div>

                  <div className="field-grid">
                    <Field label="Destacado">
                      <select value={prodDraft.featured ? "1" : "0"} onChange={(e) => setProdDraft((p) => ({ ...p, featured: e.target.value === "1" }))}>
                        <option value="0">No</option>
                        <option value="1">Sí</option>
                      </select>
                    </Field>
                    <Field label="Activo">
                      <select value={prodDraft.active ? "1" : "0"} onChange={(e) => setProdDraft((p) => ({ ...p, active: e.target.value === "1" }))}>
                        <option value="1">Sí</option>
                        <option value="0">No</option>
                      </select>
                    </Field>
                  </div>

                  <Field label="Colores">
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <input style={{ flex: 1, minWidth: 160 }} value={colorName} placeholder="Nombre (ej: Nogal)" onChange={(e) => setColorName(e.target.value)} />
                        <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} style={{ width: 52, height: 44, padding: 0 }} />
                        <input style={{ width: 120 }} value={colorHex} onChange={(e) => setColorHex(e.target.value)} />
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => addColor({ name: colorName, hex: colorHex })}>
                          Agregar
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {palette.map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => {
                              setColorName((v) => v || c.name);
                              setColorHex(c.hex);
                            }}
                            style={{ display: "flex", alignItems: "center", gap: 8 }}
                          >
                            <span style={{ width: 14, height: 14, borderRadius: 999, background: c.hex, border: "1px solid var(--line)" }} />
                            {c.name}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {(Array.isArray(prodDraft.colors) ? prodDraft.colors : []).map((c) => (
                          <div
                            key={c.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              border: "1px solid var(--line-strong)",
                              borderRadius: 999,
                              padding: "8px 10px",
                              background: "var(--bg)",
                            }}
                          >
                            <span style={{ width: 14, height: 14, borderRadius: 999, background: c.hex, border: "1px solid var(--line)" }} />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                            <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeColor(c.name)} style={{ padding: "6px 10px" }}>
                              Quitar
                            </button>
                          </div>
                        ))}
                        {(Array.isArray(prodDraft.colors) ? prodDraft.colors : []).length === 0 && <span className="muted">Sin colores</span>}
                      </div>
                    </div>
                  </Field>

                  <Field label="Secciones (Acordeón)">
                    <div style={{ display: "grid", gap: 12 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => addSection("text")}>
                          + Texto
                        </button>
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => addSection("specs")}>
                          + Especificaciones
                        </button>
                      </div>

                      <div style={{ display: "grid", gap: 12 }}>
                        {(Array.isArray(prodDraft.sections) ? prodDraft.sections : []).map((s, idx) => (
                          <div key={s.id || idx} style={{ border: "1px solid var(--line-strong)", borderRadius: 12, padding: 12, background: "var(--bg)" }}>
                            <div style={{ display: "grid", gap: 10 }}>
                              <div className="field-grid">
                                <Field label="Título">
                                  <input
                                    value={s.title || ""}
                                    onChange={(e) =>
                                      setProdDraft((p) => {
                                        const arr = Array.isArray(p.sections) ? [...p.sections] : [];
                                        arr[idx] = { ...arr[idx], title: e.target.value };
                                        return { ...p, sections: arr };
                                      })
                                    }
                                  />
                                </Field>
                                <Field label="Tipo">
                                  <select
                                    value={s.type === "specs" ? "specs" : "text"}
                                    onChange={(e) =>
                                      setProdDraft((p) => {
                                        const arr = Array.isArray(p.sections) ? [...p.sections] : [];
                                        const nextType = e.target.value === "specs" ? "specs" : "text";
                                        arr[idx] = { ...arr[idx], type: nextType };
                                        return { ...p, sections: arr };
                                      })
                                    }
                                  >
                                    <option value="text">Texto</option>
                                    <option value="specs">Especificaciones</option>
                                  </select>
                                </Field>
                              </div>

                              {(s.type === "specs" ? "specs" : "text") === "text" && (
                                <Field label="Contenido">
                                  <textarea
                                    rows={4}
                                    value={s.body || ""}
                                    onChange={(e) =>
                                      setProdDraft((p) => {
                                        const arr = Array.isArray(p.sections) ? [...p.sections] : [];
                                        arr[idx] = { ...arr[idx], body: e.target.value };
                                        return { ...p, sections: arr };
                                      })
                                    }
                                  />
                                </Field>
                              )}

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button type="button" className="btn btn--ghost btn--sm" onClick={() => moveSection(s.id, "up")} disabled={idx === 0}>
                                  ↑ Subir
                                </button>
                                <button
                                  type="button"
                                  className="btn btn--ghost btn--sm"
                                  onClick={() => moveSection(s.id, "down")}
                                  disabled={idx === (Array.isArray(prodDraft.sections) ? prodDraft.sections.length : 0) - 1}
                                >
                                  ↓ Bajar
                                </button>
                                <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeSection(s.id)}>
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(Array.isArray(prodDraft.sections) ? prodDraft.sections : []).length === 0 && <span className="muted">Sin secciones</span>}
                      </div>
                    </div>
                  </Field>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn btn--accent">Guardar</button>
                    <button type="button" className="btn btn--ghost" onClick={() => setProdDraft(blankProduct)}>
                      Limpiar
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="admin__panel">
              <div className="admin__panel-head">
                <b>Listado</b>
                <span className="muted">{products.length}</span>
              </div>
              <div className="admin__list">
                {products.map((p) => (
                  <div key={p.id} className="admin__row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="admin__thumb" style={{ backgroundImage: `url(${p.imageUrl || p.image || ""})` }} />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <b>{p.name}</b>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {p.id} · {p.cat} {Number.isFinite(p?.price) ? `· $${p.price.toLocaleString("es-AR")}` : ""} {p.active === false ? "· inactivo" : ""} {p.featured ? "· destacado" : ""}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn--ghost btn--sm" onClick={() => onEditProduct(p)}>
                        Editar
                      </button>
                      <button className="btn btn--ghost btn--sm" onClick={() => onDeleteProduct(p.id)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "cortinas" && (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div className="admin__panel">
              <div className="admin__panel-head">
                <b>Cortinas</b>
                <span className="muted">
                  {(Array.isArray(cortinasDraft.fabrics) ? cortinasDraft.fabrics : []).length} telas · {(Array.isArray(cortinasDraft.colors) ? cortinasDraft.colors : []).length} colores
                </span>
              </div>
              <div style={{ padding: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button className="btn btn--accent btn--sm" onClick={onSaveCortinasConfig} disabled={cortinasSaving}>
                  {cortinasSaving ? "Guardando..." : "Guardar"}
                </button>
                {[
                  { k: "telas", l: "Telas" },
                  { k: "colores", l: "Colores" },
                  { k: "config", l: "Configuración" },
                ].map((st) => (
                  <button key={st.k} type="button" className={"chip" + (cortinasSubtab === st.k ? " active" : "")} onClick={() => setCortinasSubtab(st.k)}>
                    {st.l}
                  </button>
                ))}
                <span className="muted" style={{ fontSize: 12 }}>
                  categories/cortinas → cortinasConfig
                </span>
              </div>
            </div>

            {cortinasSubtab === "config" && (
              <div className="admin__panel">
                <div className="admin__panel-head">
                  <b>Configuración</b>
                  <span className="muted">Precios adicionales</span>
                </div>
                <div style={{ padding: 14 }}>
                  <div className="field-grid">
                    <Field label="Precio instalación">
                      <input type="number" value={cortinasDraft.pricing.installPrice} onChange={(e) => updateCortinasPricing({ installPrice: toNumber(e.target.value) })} />
                    </Field>
                    <Field label="Cadena metálica">
                      <input type="number" value={cortinasDraft.pricing.chainMetalPrice} onChange={(e) => updateCortinasPricing({ chainMetalPrice: toNumber(e.target.value) })} />
                    </Field>
                    <Field label="Sistema negro">
                      <input type="number" value={cortinasDraft.pricing.systemBlackPrice} onChange={(e) => updateCortinasPricing({ systemBlackPrice: toNumber(e.target.value) })} />
                    </Field>
                    <Field label="Zócalo">
                      <input type="number" value={cortinasDraft.pricing.zocaloPrice} onChange={(e) => updateCortinasPricing({ zocaloPrice: toNumber(e.target.value) })} />
                    </Field>
                    <Field label="Alto extra desde (cm)">
                      <input type="number" value={cortinasDraft.pricing.extraHeightThresholdCm} onChange={(e) => updateCortinasPricing({ extraHeightThresholdCm: toNumber(e.target.value) || 220 })} />
                    </Field>
                    <Field label="Precio extra alto">
                      <input type="number" value={cortinasDraft.pricing.extraHeightPrice} onChange={(e) => updateCortinasPricing({ extraHeightPrice: toNumber(e.target.value) })} />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {cortinasSubtab === "telas" && (
              <div className="admin__grid">
                <div className="admin__panel">
                  <div className="admin__panel-head">
                    <b>Telas</b>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={createCortinasFabric}>
                      + Nueva tela
                    </button>
                  </div>
                  <div className="admin__list">
                    {(Array.isArray(cortinasDraft.fabrics) ? cortinasDraft.fabrics : []).map((f) => {
                      const active = f.id === selectedFabricId;
                      return (
                        <div
                          key={f.id}
                          className="admin__row"
                          onClick={() => setSelectedFabricId(f.id)}
                          style={{
                            cursor: "pointer",
                            background: active ? "var(--accent-soft)" : "transparent",
                            borderColor: active ? "var(--line-strong)" : undefined,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="admin__thumb" style={{ width: 42, height: 42, backgroundImage: `url(${f.imageUrl || ""})` }} />
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <b>{f.name || "Sin nombre"}</b>
                              <span className="muted" style={{ fontSize: 12 }}>
                                {toNumber(f.pricePerM2) > 0 ? `$${toNumber(f.pricePerM2).toLocaleString("es-AR")}/m²` : "Sin precio"} {f.active === false ? "· inactiva" : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {(Array.isArray(cortinasDraft.fabrics) ? cortinasDraft.fabrics : []).length === 0 && <div style={{ padding: 14 }} className="muted">Sin telas.</div>}
                  </div>
                </div>

                <div className="admin__panel">
                  <div className="admin__panel-head">
                    <b>Editar tela</b>
                    <span className="muted">{selectedFabricId || ""}</span>
                  </div>
                  <div style={{ padding: 14 }}>
                    {(() => {
                      const f = (Array.isArray(cortinasDraft.fabrics) ? cortinasDraft.fabrics : []).find((x) => x.id === selectedFabricId);
                      if (!f) return <div className="muted">Seleccioná una tela de la lista.</div>;
                      const allColors = Array.isArray(cortinasDraft.colors) ? cortinasDraft.colors : [];
                      const selectedIds = Array.isArray(f.colorIds) ? f.colorIds : [];
                      return (
                        <div style={{ display: "grid", gap: 12 }}>
                          <div className="field-grid">
                            <Field label="Nombre">
                              <input value={f.name || ""} onChange={(e) => updateCortinasFabric(f.id, { name: e.target.value })} />
                            </Field>
                            <Field label="Precio / m²">
                              <input type="number" value={toNumber(f.pricePerM2)} onChange={(e) => updateCortinasFabric(f.id, { pricePerM2: toNumber(e.target.value) })} />
                            </Field>
                          </div>
                          <Field label="Tag">
                            <input value={f.tag || ""} onChange={(e) => updateCortinasFabric(f.id, { tag: e.target.value })} />
                          </Field>
                          <div className="field-grid">
                            <Field label="Activa">
                              <select value={f.active !== false ? "1" : "0"} onChange={(e) => updateCortinasFabric(f.id, { active: e.target.value === "1" })}>
                                <option value="1">Sí</option>
                                <option value="0">No</option>
                              </select>
                            </Field>
                          </div>

                          <Field label="Imagen">
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <div className="admin__thumb" style={{ width: 72, height: 56, backgroundImage: `url(${f.imageUrl || ""})` }} />
                              <label className="btn btn--ghost btn--sm" style={{ cursor: "pointer", justifyContent: "center" }}>
                                {cortinasUploading === f.id ? "Subiendo..." : "Subir imagen"}
                                <input type="file" accept="image/*" style={{ display: "none" }} disabled={cortinasUploading === f.id} onChange={(e) => onUploadCortinasFabricImage(f.id, e.target.files?.[0])} />
                              </label>
                            </div>
                          </Field>

                          <Field label="Colores (solo los que aplican a esta tela)">
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              {allColors.map((c) => {
                                const isSelected = selectedIds.includes(c.id);
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    className={"btn btn--ghost btn--sm" + (isSelected ? " active" : "")}
                                    onClick={() => toggleCortinasFabricColor(f.id, c.id)}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                                  >
                                    <span
                                      style={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: 4,
                                        border: "1px solid var(--line)",
                                        background: isSelected ? "var(--accent)" : "transparent",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        color: isSelected ? "var(--accent-ink)" : "transparent",
                                        fontSize: 12,
                                        fontWeight: 800,
                                        lineHeight: 1,
                                      }}
                                    >
                                      ✓
                                    </span>
                                    <span
                                      style={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: 999,
                                        backgroundImage: c.imageUrl ? `url(${c.imageUrl})` : "none",
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                        border: "1px solid var(--line)",
                                        backgroundColor: "var(--surface-2)",
                                      }}
                                    />
                                    {c.name}
                                  </button>
                                );
                              })}
                              {allColors.length === 0 && (
                                <span className="muted">
                                  Primero cargá colores en la pestaña “Colores”.
                                </span>
                              )}
                            </div>
                          </Field>

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => {
                                if (!confirm("¿Eliminar tela?")) return;
                                removeCortinasFabric(f.id);
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {cortinasSubtab === "colores" && (
              <div className="admin__grid">
                <div className="admin__panel">
                  <div className="admin__panel-head">
                    <b>Colores</b>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={createCortinasColor}>
                      + Nuevo color
                    </button>
                  </div>
                  <div className="admin__list">
                    {(Array.isArray(cortinasDraft.colors) ? cortinasDraft.colors : []).map((c) => {
                      const active = c.id === selectedColorId;
                      return (
                        <div
                          key={c.id}
                          className="admin__row"
                          onClick={() => setSelectedColorId(c.id)}
                          style={{
                            cursor: "pointer",
                            background: active ? "var(--accent-soft)" : "transparent",
                            borderColor: active ? "var(--line-strong)" : undefined,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="admin__thumb" style={{ width: 42, height: 42, backgroundImage: `url(${c.imageUrl || ""})` }} />
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <b>{c.name || "Sin nombre"}</b>
                              <span className="muted" style={{ fontSize: 12 }}>
                                {c.active === false ? "Inactivo" : "Activo"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {(Array.isArray(cortinasDraft.colors) ? cortinasDraft.colors : []).length === 0 && <div style={{ padding: 14 }} className="muted">Sin colores.</div>}
                  </div>
                </div>

                <div className="admin__panel">
                  <div className="admin__panel-head">
                    <b>Editar color</b>
                    <span className="muted">{selectedColorId || ""}</span>
                  </div>
                  <div style={{ padding: 14 }}>
                    {(() => {
                      const c = (Array.isArray(cortinasDraft.colors) ? cortinasDraft.colors : []).find((x) => x.id === selectedColorId);
                      if (!c) return <div className="muted">Seleccioná un color de la lista.</div>;
                      return (
                        <div style={{ display: "grid", gap: 12 }}>
                          <div className="field-grid">
                            <Field label="Nombre">
                              <input value={c.name || ""} onChange={(e) => updateCortinasColor(c.id, { name: e.target.value })} />
                            </Field>
                            <Field label="Activo">
                              <select value={c.active !== false ? "1" : "0"} onChange={(e) => updateCortinasColor(c.id, { active: e.target.value === "1" })}>
                                <option value="1">Sí</option>
                                <option value="0">No</option>
                              </select>
                            </Field>
                          </div>
                          <Field label="Imagen">
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <div className="admin__thumb" style={{ width: 72, height: 56, backgroundImage: `url(${c.imageUrl || ""})` }} />
                              <label className="btn btn--ghost btn--sm" style={{ cursor: "pointer", justifyContent: "center" }}>
                                {cortinasColorUploading === c.id ? "Subiendo..." : "Subir imagen"}
                                <input type="file" accept="image/*" style={{ display: "none" }} disabled={cortinasColorUploading === c.id} onChange={(e) => onUploadCortinasColorImage(c.id, e.target.files?.[0])} />
                              </label>
                            </div>
                          </Field>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => {
                                if (!confirm("¿Eliminar color? Se desasigna de todas las telas.")) return;
                                removeCortinasColor(c.id);
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "orders" && (
          <div className="admin__panel" style={{ marginTop: 16 }}>
            <div className="admin__panel-head">
              <b>Pedidos</b>
              <span className="muted">{orders.length}</span>
            </div>
            <div className="admin__list">
              {orders.map((o) => (
                <div key={o.id} className="admin__row" style={{ alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <b>{o.contact?.nombre ? `${o.contact.nombre} ${o.contact.apellido || ""}` : "Cliente"}</b>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {o.contact?.tel || ""} · {o.contact?.email || ""} · {fmtDate(o.createdAt)}
                    </span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      Items: {Array.isArray(o.items) ? o.items.length : 0} · Envío: {o.shipping?.envio} · Pago: {o.payment?.pago}
                    </span>
                    {o.notes ? <span className="muted" style={{ fontSize: 12 }}>Notas: {o.notes}</span> : null}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <select value={o.status || "new"} onChange={(e) => onChangeOrderStatus(o.id, e.target.value)} style={{ border: "1px solid var(--line-strong)", padding: "8px 12px", borderRadius: 999, background: "transparent", fontSize: 13, fontWeight: 600 }}>
                      {["new", "in_progress", "done", "cancelled"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => setOpenOrderId((prev) => (prev === o.id ? "" : o.id))}
                    >
                      {openOrderId === o.id ? "Ocultar detalle" : "Ver detalle"}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => navigator.clipboard?.writeText(o.id)}>
                      Copiar ID
                    </button>
                  </div>
                  {openOrderId === o.id && (
                    <div style={{ width: "100%", marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "grid", gap: 8 }}>
                          {(Array.isArray(o.items) ? o.items : []).map((it, idx) => {
                            const qty = Number(it?.qty) || 1;
                            const hasAmount = Number.isFinite(it?.priceAmount);
                            const lineTotal = hasAmount ? it.priceAmount * qty : null;
                            const colorLabel =
                              it?.color && typeof it.color === "object"
                                ? it.color.name || ""
                                : typeof it?.color === "string"
                                  ? it.color
                                  : "";
                            return (
                              <div
                                key={it?.uid || it?.id || idx}
                                style={{
                                  display: "flex",
                                  gap: 10,
                                  alignItems: "flex-start",
                                  border: "1px solid var(--line)",
                                  borderRadius: 12,
                                  padding: 10,
                                  background: "var(--bg)",
                                }}
                              >
                                <div className="admin__thumb" style={{ width: 54, height: 54, backgroundImage: `url(${it?.image || ""})` }} />
                                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                    <b>{it?.name || "Item"}</b>
                                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                                      {hasAmount ? `$${lineTotal.toLocaleString("es-AR")}` : it?.priceLabel || ""}
                                    </span>
                                  </div>
                                  <div className="muted" style={{ fontSize: 12 }}>
                                    Cantidad: {qty}
                                    {colorLabel ? ` · Color: ${colorLabel}` : ""}
                                    {it?.isCustom ? " · A medida" : ""}
                                  </div>
                                  {it?.meta ? (
                                    <div className="muted" style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
                                      {it.meta}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                          {(Array.isArray(o.items) ? o.items : []).length === 0 && <div className="muted">Sin items.</div>}
                        </div>

                        <div style={{ display: "grid", gap: 6, fontSize: 13 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <span className="muted">Envío</span>
                            <b>{o.shipping?.envio || "-"}</b>
                          </div>
                          {o.shipping?.direccion || o.shipping?.ciudad || o.shipping?.provincia ? (
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                              <span className="muted">Dirección</span>
                              <b style={{ textAlign: "right" }}>
                                {[o.shipping?.direccion, o.shipping?.ciudad, o.shipping?.provincia, o.shipping?.cp].filter(Boolean).join(", ")}
                              </b>
                            </div>
                          ) : null}
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <span className="muted">Pago</span>
                            <b>{o.payment?.pago || "-"}</b>
                          </div>
                          {(() => {
                            const total = (Array.isArray(o.items) ? o.items : []).reduce((acc, it) => {
                              const qty = Number(it?.qty) || 1;
                              if (!Number.isFinite(it?.priceAmount)) return acc;
                              return acc + it.priceAmount * qty;
                            }, 0);
                            const hasAny = (Array.isArray(o.items) ? o.items : []).some((it) => Number.isFinite(it?.priceAmount));
                            if (!hasAny) return null;
                            return (
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                                <span className="muted">Total</span>
                                <b>${total.toLocaleString("es-AR")}</b>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {orders.length === 0 && <div style={{ padding: 14 }} className="muted">Sin pedidos todavía.</div>}
            </div>
          </div>
        )}

        {tab === "leads" && (
          <div className="admin__panel" style={{ marginTop: 16 }}>
            <div className="admin__panel-head">
              <b>Consultas</b>
              <span className="muted">{leads.length}</span>
            </div>
            <div className="admin__list">
              {leads.map((l) => (
                <div key={l.id} className="admin__row" style={{ alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <b>{l.form?.nombre || "Consulta"}</b>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {l.form?.tel || ""} · {fmtDate(l.createdAt)}
                    </span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      Tipo: {l.form?.type || l.kind || "a-medida"}
                    </span>
                    {l.form?.detalle ? <span className="muted" style={{ fontSize: 12 }}>Detalle: {l.form.detalle}</span> : null}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn--ghost btn--sm" onClick={() => navigator.clipboard?.writeText(JSON.stringify(l, null, 2))}>
                      Copiar JSON
                    </button>
                  </div>
                </div>
              ))}
              {leads.length === 0 && <div style={{ padding: 14 }} className="muted">Sin consultas todavía.</div>}
            </div>
          </div>
        )}

        {status.message && (
          <div className={"admin__status " + (status.type === "err" ? "err" : "ok")} style={{ marginTop: 14 }}>
            {status.message}
          </div>
        )}
      </div>
    </div>
  );
}

