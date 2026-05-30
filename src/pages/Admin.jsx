import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { deleteField } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, firebaseConfigured } from "../firebase";
import { isAdminUser, useAuth } from "../hooks/useAuth";
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
import { uploadProductImage } from "../services/storage";

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
  const isAdmin = isAdminUser(user);

  const [tab, setTab] = useState("products");
  const [status, setStatus] = useState({ type: "", message: "" });

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [logging, setLogging] = useState(false);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [leads, setLeads] = useState([]);

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

  useEffect(() => {
    setStatus({ type: "", message: "" });
  }, [tab]);

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
    if (authed && !isAdmin && !loading) {
      setStatus({ type: "err", message: "Tu usuario no tiene permisos de administrador" });
    }
  }, [authed, isAdmin, loading]);

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
      setStatus({ type: "err", message: "No se pudo iniciar sesión" });
    } finally {
      setLogging(false);
    }
  }

  async function onLogout() {
    await signOut(auth);
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
            { k: "products", l: "Productos" },
            { k: "categories", l: "Categorías" },
            { k: "orders", l: "Pedidos" },
            { k: "leads", l: "Consultas" },
          ].map((t) => (
            <button key={t.k} className={"chip" + (tab === t.k ? " active" : "")} onClick={() => setTab(t.k)}>
              {t.l}
            </button>
          ))}
        </div>

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
                    <button className="btn btn--ghost btn--sm" onClick={() => navigator.clipboard?.writeText(o.id)}>
                      Copiar ID
                    </button>
                  </div>
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

