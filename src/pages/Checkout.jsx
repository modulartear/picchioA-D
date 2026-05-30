import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/icons";
import { useCart } from "../context/CartContext";
import { useSiteContent } from "../hooks/useCatalog";
import { createOrder } from "../services/orders";

export function Checkout() {
  const nav = useNavigate();
  const { items, clearCart, showToast } = useCart();
  const site = useSiteContent();
  const shippingOptions = useMemo(() => {
    const raw = site.data?.checkout?.shippingOptions;
    const list = Array.isArray(raw) ? raw : [];
    return list.filter((x) => x?.active !== false);
  }, [site.data]);
  const paymentOptions = useMemo(() => {
    const raw = site.data?.checkout?.paymentOptions;
    const list = Array.isArray(raw) ? raw : [];
    return list.filter((x) => x?.active !== false);
  }, [site.data]);

  const [step, setStep] = useState(1);
  const [orderId, setOrderId] = useState("");
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);

  const [data, setData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    tel: "",
    direccion: "",
    ciudad: "",
    provincia: "Santa Fe",
    cp: "",
    envio: "showroom",
    pago: "transferencia",
    notas: "",
  });

  const upd = (k, v) => setData((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);

  useEffect(() => {
    if (shippingOptions.length === 0) return;
    setData((d) => {
      if (shippingOptions.some((s) => s.id === d.envio)) return d;
      return { ...d, envio: shippingOptions[0].id };
    });
  }, [shippingOptions]);

  useEffect(() => {
    if (paymentOptions.length === 0) return;
    setData((d) => {
      if (paymentOptions.some((p) => p.id === d.pago)) return d;
      return { ...d, pago: paymentOptions[0].id };
    });
  }, [paymentOptions]);

  const next = async (e) => {
    e?.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }

    if (submitLock.current) return;
    submitLock.current = true;
    setSaving(true);

    try {
      const snapshotItems = items.map((it) => ({
        uid: it.uid,
        id: it.id,
        name: it.name,
        image: it.image,
        qty: it.qty,
        color: it.color || null,
        meta: it.meta || "",
        priceAmount: it.priceAmount || null,
        priceLabel: it.priceLabel || null,
        cat: it.cat || null,
        catName: it.catName || null,
        isCustom: !!it.isCustom,
      }));

      const id = await createOrder({
        contact: {
          nombre: data.nombre,
          apellido: data.apellido,
          email: data.email,
          tel: data.tel,
        },
        shipping: {
          envio: data.envio,
          direccion: data.direccion,
          ciudad: data.ciudad,
          provincia: data.provincia,
          cp: data.cp,
        },
        payment: { pago: data.pago },
        notes: data.notas,
        items: snapshotItems,
      });

      setOrderId(id);
      setStep(3);
      clearCart();
      showToast("✓ Pedido enviado");
    } catch (err) {
      showToast("Error enviando el pedido");
      submitLock.current = false;
    } finally {
      setSaving(false);
    }
  };

  const prev = () => setStep((s) => Math.max(1, s - 1));

  if (items.length === 0 && step < 3) {
    return (
      <div className="container fade-in" style={{ padding: "80px 0", textAlign: "center" }}>
        <h2 className="h-section">Tu carrito está vacío</h2>
        <p className="muted" style={{ marginTop: 16, marginBottom: 24 }}>
          Agregá productos antes de iniciar el pedido.
        </p>
        <button className="btn btn--accent btn--lg" onClick={() => nav("/")}>
          Volver a la tienda
        </button>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="fade-in">
        <div className="container">
          <div className="checkout__success">
            <div className="checkout__success-icon">
              <Icon.Check style={{ width: 32, height: 32 }} />
            </div>
            <span className="eyebrow">Pedido #{orderId ? orderId.slice(0, 8).toUpperCase() : "PICCHIO"}</span>
            <h1>¡Recibimos tu pedido, {data.nombre || "cliente"}!</h1>
            <p>
              Un asesor de Picchio te va a contactar al <b>{data.tel || "tu WhatsApp"}</b> para confirmar los precios, coordinar el envío y enviarte los datos de pago.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <button className="btn btn--accent btn--lg" onClick={() => nav("/")}>
                Volver al inicio
              </button>
              <a href="https://wa.me/543462415161" target="_blank" rel="noopener" className="btn btn--ghost btn--lg">
                <Icon.WhatsApp style={{ width: 16, height: 16 }} /> Escribir por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="container">
        <div className="cat-hero" style={{ padding: "48px 0 24px", borderBottom: "1px solid var(--line)", marginBottom: 32 }}>
          <nav className="crumbs">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                nav("/");
              }}
            >
              Inicio
            </a>
            <span className="sep">/</span>
            <span>Finalizar pedido</span>
          </nav>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "clamp(36px, 4.4vw, 56px)", margin: "16px 0 0" }}>Finalizar pedido</h1>
        </div>

        <div className="checkout">
          <div>
            <div className="checkout__steps">
              <div className={"checkout__step " + (step >= 1 ? "active" : "") + (step > 1 ? " done" : "")}>
                <span className="num">{step > 1 ? "✓" : "1"}</span> Contacto
              </div>
              <div className={"checkout__step " + (step >= 2 ? "active" : "")}>
                <span className="num">2</span> Envío y pago
              </div>
              <div className="checkout__step">
                <span className="num">3</span> Confirmación
              </div>
            </div>

            <form onSubmit={next}>
              {step === 1 && (
                <div className="field-stack fade-in">
                  <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 28, margin: 0 }}>¿Cómo te contactamos?</h3>
                  <p className="muted" style={{ margin: 0 }}>
                    Te escribimos para confirmar precios, stock y coordinar el envío.
                  </p>

                  <div className="field-grid">
                    <div className="field">
                      <label>Nombre</label>
                      <input type="text" required value={data.nombre} onChange={(e) => upd("nombre", e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Apellido</label>
                      <input type="text" required value={data.apellido} onChange={(e) => upd("apellido", e.target.value)} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input type="email" required value={data.email} onChange={(e) => upd("email", e.target.value)} placeholder="vos@email.com" />
                  </div>
                  <div className="field">
                    <label>WhatsApp</label>
                    <input type="tel" required value={data.tel} onChange={(e) => upd("tel", e.target.value)} placeholder="3462 415161" />
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <button type="button" className="btn btn--ghost" onClick={() => nav("/")}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn--accent btn--lg" style={{ flex: 1 }}>
                      Continuar al envío <Icon.Arrow style={{ width: 18, height: 18 }} />
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="field-stack fade-in">
                  <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 28, margin: 0 }}>Envío</h3>
                  <div className="field-stack">
                    {shippingOptions.map((s) => (
                      <div key={s.id} className={"opt-card" + (data.envio === s.id ? " active" : "")} onClick={() => upd("envio", s.id)}>
                        <div className="opt-card__radio" />
                        <div className="opt-card__body">
                          <div className="opt-card__title">{s.title}</div>
                          <div className="opt-card__desc">{s.desc}</div>
                        </div>
                        <span className="opt-card__price">{s.priceLabel || ""}</span>
                      </div>
                    ))}
                  </div>

                  {shippingOptions.find((s) => s.id === data.envio)?.requiresAddress && (
                    <div className="field-stack fade-in">
                      <div className="field">
                        <label>Dirección</label>
                        <input type="text" required value={data.direccion} onChange={(e) => upd("direccion", e.target.value)} placeholder="Calle y número" />
                      </div>
                      <div className="field-grid">
                        <div className="field">
                          <label>Ciudad</label>
                          <input type="text" required value={data.ciudad} onChange={(e) => upd("ciudad", e.target.value)} />
                        </div>
                        <div className="field">
                          <label>Provincia</label>
                          <select value={data.provincia} onChange={(e) => upd("provincia", e.target.value)}>
                            {["Santa Fe", "Buenos Aires", "Córdoba", "Entre Ríos", "Mendoza", "CABA", "Otra"].map((p) => (
                              <option key={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="field" style={{ maxWidth: 200 }}>
                        <label>Código Postal</label>
                        <input type="text" value={data.cp} onChange={(e) => upd("cp", e.target.value)} />
                      </div>
                    </div>
                  )}

                  <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 28, margin: "16px 0 0" }}>Forma de pago</h3>
                  <div className="field-stack">
                    {paymentOptions.map((p) => (
                      <div key={p.id} className={"opt-card" + (data.pago === p.id ? " active" : "")} onClick={() => upd("pago", p.id)}>
                        <div className="opt-card__radio" />
                        <div className="opt-card__body">
                          <div className="opt-card__title">{p.title}</div>
                          <div className="opt-card__desc">{p.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="field">
                    <label>Notas para el asesor (opcional)</label>
                    <textarea rows="3" value={data.notas} onChange={(e) => upd("notas", e.target.value)} placeholder="Horarios, accesos, comentarios sobre el producto…" />
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <button type="button" className="btn btn--ghost" onClick={prev}>
                      ← Volver
                    </button>
                    <button type="submit" className="btn btn--accent btn--lg" style={{ flex: 1 }} disabled={saving}>
                      {saving ? "Enviando..." : <>Confirmar pedido <Icon.Arrow style={{ width: 18, height: 18 }} /></>}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          <aside className="summary">
            <h3>Resumen</h3>
            <div className="summary__items">
              {items.map((it) => (
                <div key={it.uid} className="summary__item">
                  <div className="summary__item-media" style={{ backgroundImage: `url(${it.image})` }} />
                  <div>
                    <div className="summary__item-title">{it.name}</div>
                    <div className="summary__item-meta">
                      {it.meta || it.color?.name} · x{it.qty}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{it.priceLabel || "Consultar"}</span>
                </div>
              ))}
            </div>
            <div className="summary__row">
              <span>Productos</span>
              <span>{items.reduce((s, x) => s + x.qty, 0)}</span>
            </div>
            <div className="summary__row">
              <span>Envío</span>
              <span>{shippingOptions.find((s) => s.id === data.envio)?.priceLabel || ""}</span>
            </div>
            {(() => {
              const priced = items.filter((i) => i.priceAmount);
              const subtotal = priced.reduce((s, i) => s + i.priceAmount * i.qty, 0);
              const hasUnpriced = items.some((i) => !i.priceAmount);
              return (
                <div className="summary__total">
                  <span>Total</span>
                  <span>{priced.length > 0 ? (hasUnpriced ? `Desde $${subtotal.toLocaleString("es-AR")}` : `$${subtotal.toLocaleString("es-AR")}`) : "A consultar"}</span>
                </div>
              );
            })()}
            <p className="muted" style={{ fontSize: 12, margin: 0, lineHeight: 1.4 }}>
              Los precios definitivos se confirman al cerrar el pedido por WhatsApp. Sin compromiso de compra hasta entonces.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

