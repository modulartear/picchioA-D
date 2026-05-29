import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { createLead } from "../services/orders";
import { Icon } from "./icons";

export function Cotizador() {
  const { cotizadorOpen: open, setCotizadorOpen, showToast } = useCart();
  const [form, setForm] = useState({
    type: "Cocina",
    medidas: "",
    materiales: "Melamina",
    presupuesto: "",
    nombre: "",
    tel: "",
    detalle: "",
  });
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) setStep(0);
    const onKey = (e) => {
      if (e.key === "Escape") setCotizadorOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setCotizadorOpen]);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handle = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      await createLead({ kind: "a-medida", form });
      setStep(1);
      showToast("✓ Consulta enviada");
    } catch (err) {
      showToast("Error enviando la consulta");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className={"modal-backdrop open"} onClick={() => setCotizadorOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <button className="modal__close" onClick={() => setCotizadorOpen(false)} aria-label="Cerrar">
          <Icon.Close />
        </button>
        {step === 0 ? (
          <form className="cotiz" onSubmit={handle}>
            <div>
              <span className="eyebrow">Cotizador</span>
              <h3 style={{ marginTop: 8 }}>
                Mueble <em style={{ fontStyle: "italic", color: "var(--accent)" }}>a medida</em>
              </h3>
              <p className="cotiz__intro">Contanos qué necesitás y un asesor te responde con un primer presupuesto.</p>
            </div>

            <div className="qv__row">
              <span className="qv__row-label">¿Qué tipo de mueble?</span>
              <div className="opt-grid">
                {["Cocina", "Placard", "Vestidor", "Mueble TV / Comedor", "Oficina", "Otro"].map((t) => (
                  <div key={t} className={"opt-card" + (form.type === t ? " active" : "")} onClick={() => upd("type", t)}>
                    <div className="opt-card__radio" />
                    <div className="opt-card__body">
                      <div className="opt-card__title">{t}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="field-grid">
              <div className="field">
                <label>Medidas aprox.</label>
                <input type="text" placeholder="Ej: 3.20 × 2.40 m" value={form.medidas} onChange={(e) => upd("medidas", e.target.value)} required />
              </div>
              <div className="field">
                <label>Material</label>
                <select value={form.materiales} onChange={(e) => upd("materiales", e.target.value)}>
                  <option>Melamina</option>
                  <option>Laqueado</option>
                  <option>Madera maciza</option>
                  <option>Mixto / A definir</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>Contanos más (opcional)</label>
              <textarea rows="3" placeholder="Estilo, colores, plazos, referencias…" value={form.detalle} onChange={(e) => upd("detalle", e.target.value)} />
            </div>

            <div className="field-grid">
              <div className="field">
                <label>Nombre</label>
                <input type="text" required value={form.nombre} onChange={(e) => upd("nombre", e.target.value)} />
              </div>
              <div className="field">
                <label>WhatsApp</label>
                <input type="tel" required value={form.tel} onChange={(e) => upd("tel", e.target.value)} placeholder="3462 415161" />
              </div>
            </div>

            <button type="submit" className="btn btn--accent btn--lg btn--block" disabled={sending}>
              {sending ? "Enviando..." : <>Solicitar cotización <Icon.Arrow style={{ width: 18, height: 18 }} /></>}
            </button>
            <p className="muted" style={{ fontSize: 12, textAlign: "center", margin: 0 }}>
              Tu consulta es sin compromiso. Visitamos a domicilio en zona Venado Tuerto.
            </p>
          </form>
        ) : (
          <div className="cotiz" style={{ textAlign: "center", alignItems: "center", padding: "64px 48px" }}>
            <div className="checkout__success-icon">
              <Icon.Check style={{ width: 32, height: 32 }} />
            </div>
            <h3>¡Recibimos tu pedido!</h3>
            <p className="cotiz__intro">
              Un asesor de Picchio te va a contactar al <b>{form.tel}</b> para coordinar la visita o el primer presupuesto.
            </p>
            <button className="btn btn--ghost btn--lg" onClick={() => setCotizadorOpen(false)}>
              Volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

