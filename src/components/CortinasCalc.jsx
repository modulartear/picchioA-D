import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { Icon } from "./icons";

export function CortinasCalc({ variant = "section", cortinaImage }) {
  const { addCustomItem } = useCart();

  const TELAS = {
    "sun-screen": {
      key: "sun-screen",
      label: "Sun Screen",
      tag: "Filtro UV · Visión hacia afuera",
      pricePerM2: 32000,
      desc: "Tela técnica con apertura 5%, 10% o 14%. Filtra el sol manteniendo visibilidad. Ideal para oficinas y livings.",
    },
    blackout: {
      key: "blackout",
      label: "Black-Out",
      tag: "100% opaca · Oscurece totalmente",
      pricePerM2: 38000,
      desc: "Bloquea el paso de la luz por completo. Ideal para dormitorios, salas de TV o salas de reunión.",
    },
    doble: {
      key: "doble",
      label: "Sistema Doble",
      tag: "Screen + Black-Out en un solo sistema",
      pricePerM2: 75000,
      desc: "Dos cortinas en un mismo soporte: tela técnica de día + black-out para la noche. La opción más versátil.",
    },
  };

  const APERTURAS = ["5% (más oscura)", "10% (estándar)", "14% (más luminosa)"];
  const ACCIONAMIENTOS = {
    cadena: { label: "Cadena estándar", extra: 0 },
    motor: { label: "Motorizada (con control)", extra: 95000 },
  };

  const [ancho, setAncho] = useState(150);
  const [alto, setAlto] = useState(180);
  const [tela, setTela] = useState("blackout");
  const [apertura, setApertura] = useState(APERTURAS[1]);
  const [accion, setAccion] = useState("cadena");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setAdded(false);
  }, [variant]);

  const areaRaw = (ancho / 100) * (alto / 100);
  const area = Math.max(1, areaRaw);
  const t = TELAS[tela];
  const baseTela = Math.round(area * t.pricePerM2);
  const extra = ACCIONAMIENTOS[accion].extra;
  const total = baseTela + extra;
  const fmt = (n) => "$" + n.toLocaleString("es-AR");

  const handleAdd = () => {
    const desc = [
      `${ancho} × ${alto} cm`,
      area > areaRaw ? "(mín. 1 m²)" : null,
      tela === "sun-screen" ? `Apertura ${apertura.split(" ")[0]}` : null,
      ACCIONAMIENTOS[accion].label,
    ]
      .filter(Boolean)
      .join(" · ");

    const item = {
      id: `cortina-custom-${Date.now()}`,
      name: `Cortina Roller ${t.label}`,
      image: cortinaImage,
      cat: "cortinas",
      catName: "Cortinas a medida",
      isCustom: true,
      priceAmount: total,
      priceLabel: fmt(total),
      meta: desc,
    };
    addCustomItem(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const Inner = (
    <div className="cortcalc">
      <div className="cortcalc__head">
        <span className="eyebrow">Cotizador de cortinas roller</span>
        <h3 className="cortcalc__title">
          Calculá tu cortina
          <br />
          <em>en vivo.</em>
        </h3>
        <p className="cortcalc__intro">Poné las medidas y el tipo de tela. El precio estimado se actualiza al instante.</p>
      </div>

      <div className="cortcalc__body">
        <div className="cortcalc__col">
          <div className="cortcalc__group">
            <span className="cortcalc__lbl">Tipo de tela</span>
            <div className="cortcalc__telas">
              {Object.values(TELAS).map((opt) => (
                <button key={opt.key} type="button" className={"tela" + (tela === opt.key ? " active" : "")} onClick={() => setTela(opt.key)}>
                  <span className="tela__top">
                    <span className="tela__name">{opt.label}</span>
                    <span className="tela__price">
                      {fmt(opt.pricePerM2)}
                      <small>/m²</small>
                    </span>
                  </span>
                  <span className="tela__tag">{opt.tag}</span>
                </button>
              ))}
            </div>
            <p className="cortcalc__hint">{t.desc}</p>
          </div>

          <div className="cortcalc__measures">
            <div className="cortcalc__measure">
              <label>Ancho</label>
              <div className="cortcalc__stepper">
                <button type="button" onClick={() => setAncho((v) => Math.max(60, v - 10))} aria-label="Restar ancho">
                  −
                </button>
                <div className="cortcalc__input">
                  <input type="number" min="60" max="400" step="5" value={ancho} onChange={(e) => setAncho(Math.max(60, Math.min(400, +e.target.value || 60)))} />
                  <span>cm</span>
                </div>
                <button type="button" onClick={() => setAncho((v) => Math.min(400, v + 10))} aria-label="Sumar ancho">
                  +
                </button>
              </div>
            </div>
            <div className="cortcalc__measure">
              <label>Alto</label>
              <div className="cortcalc__stepper">
                <button type="button" onClick={() => setAlto((v) => Math.max(60, v - 10))} aria-label="Restar alto">
                  −
                </button>
                <div className="cortcalc__input">
                  <input type="number" min="60" max="320" step="5" value={alto} onChange={(e) => setAlto(Math.max(60, Math.min(320, +e.target.value || 60)))} />
                  <span>cm</span>
                </div>
                <button type="button" onClick={() => setAlto((v) => Math.min(320, v + 10))} aria-label="Sumar alto">
                  +
                </button>
              </div>
            </div>
          </div>

          {tela === "sun-screen" && (
            <div className="cortcalc__group">
              <span className="cortcalc__lbl">Apertura del tejido</span>
              <div className="cortcalc__chips">
                {APERTURAS.map((a) => (
                  <button key={a} type="button" className={"chip" + (apertura === a ? " active" : "")} onClick={() => setApertura(a)}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="cortcalc__group">
            <span className="cortcalc__lbl">Accionamiento</span>
            <div className="cortcalc__chips">
              {Object.entries(ACCIONAMIENTOS).map(([k, v]) => (
                <button key={k} type="button" className={"chip" + (accion === k ? " active" : "")} onClick={() => setAccion(k)}>
                  {v.label}
                  {v.extra > 0 && (
                    <span style={{ marginLeft: 6, color: "var(--muted)", fontWeight: 500 }}>+ {fmt(v.extra)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <aside className="cortcalc__summary">
          <div className="cortcalc__preview">
            <div className="cortcalc__window" style={{ aspectRatio: `${ancho} / ${alto}` }}>
              <div className={"cortcalc__fabric cortcalc__fabric--" + tela} />
              <div className="cortcalc__measure-h">
                <span>{ancho} cm</span>
              </div>
              <div className="cortcalc__measure-v">
                <span>{alto} cm</span>
              </div>
            </div>
          </div>

          <div className="cortcalc__rows">
            <div className="cortcalc__row">
              <span>Superficie</span>
              <b>
                {areaRaw.toFixed(2)} m² {area > areaRaw && <small className="muted">(mín. 1 m²)</small>}
              </b>
            </div>
            <div className="cortcalc__row">
              <span>
                {t.label} · {fmt(t.pricePerM2)}/m²
              </span>
              <b>{fmt(baseTela)}</b>
            </div>
            {extra > 0 && (
              <div className="cortcalc__row">
                <span>Motorización</span>
                <b>+ {fmt(extra)}</b>
              </div>
            )}
          </div>

          <div className="cortcalc__total">
            <div className="cortcalc__total-lbl">Precio estimado</div>
            <div className="cortcalc__total-num">{fmt(total)}</div>
            <div className="cortcalc__total-hint">+ IVA. Incluye toma de medidas e instalación en Venado Tuerto.</div>
          </div>

          <button className="btn btn--accent btn--lg btn--block" onClick={handleAdd} disabled={added}>
            {added ? "✓ Agregado al pedido" : <>Agregar a mi presupuesto <Icon.Arrow style={{ width: 18, height: 18 }} /></>}
          </button>
          <a href="https://wa.me/543462415161" target="_blank" rel="noopener" className="btn btn--ghost btn--block" style={{ marginTop: 8 }}>
            <Icon.WhatsApp style={{ width: 16, height: 16 }} /> Consultar por WhatsApp
          </a>
        </aside>
      </div>
    </div>
  );

  if (variant === "section") {
    return (
      <section className="section" id="cortinas-calc" style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="container">{Inner}</div>
      </section>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
      {Inner}
    </div>
  );
}

