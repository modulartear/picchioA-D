import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { db, firebaseConfigured } from "../firebase";
import { Icon } from "./icons";

export function CortinasCalc({ variant = "section", cortinaImage }) {
  const { addCustomItem } = useCart();

  const toNumber = (v) => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const DEFAULT_FABRICS = [
    {
      key: "sun-screen",
      label: "Sun Screen",
      tag: "Filtro UV · Visión hacia afuera",
      pricePerM2: 32000,
      desc: "Tela técnica con apertura 5%, 10% o 14%. Filtra el sol manteniendo visibilidad. Ideal para oficinas y livings.",
      apertureEnabled: true,
      active: true,
      imageUrl: "",
    },
    {
      key: "blackout",
      label: "Black-Out",
      tag: "100% opaca · Oscurece totalmente",
      pricePerM2: 38000,
      desc: "Bloquea el paso de la luz por completo. Ideal para dormitorios, salas de TV o salas de reunión.",
      apertureEnabled: false,
      active: true,
      imageUrl: "",
    },
    {
      key: "doble",
      label: "Sistema Doble",
      tag: "Screen + Black-Out en un solo sistema",
      pricePerM2: 75000,
      desc: "Dos cortinas en un mismo soporte: tela técnica de día + black-out para la noche. La opción más versátil.",
      apertureEnabled: false,
      active: true,
      imageUrl: "",
    },
  ];

  const APERTURAS = ["5% (más oscura)", "10% (estándar)", "14% (más luminosa)"];
  const MOTOR_EXTRA = 95000;

  const [config, setConfig] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  const [ancho, setAncho] = useState(150);
  const [alto, setAlto] = useState(180);
  const [tela, setTela] = useState("blackout");
  const [apertura, setApertura] = useState(APERTURAS[1]);
  const [accion, setAccion] = useState("cadena");
  const [includeInstall, setIncludeInstall] = useState(true);
  const [chainMetal, setChainMetal] = useState(false);
  const [systemBlack, setSystemBlack] = useState(false);
  const [zocalo, setZocalo] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setAdded(false);
  }, [variant]);

  useEffect(() => {
    if (!firebaseConfigured || !db) {
      setConfigLoaded(true);
      return;
    }
    const ref = doc(db, "categories", "cortinas");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        setConfig(data?.cortinasConfig || null);
        setConfigLoaded(true);
      },
      () => setConfigLoaded(true),
    );
    return () => unsub();
  }, []);

  const fabrics = useMemo(() => {
    const raw = Array.isArray(config?.fabrics) ? config.fabrics : [];
    const mapped = raw
      .map((f, i) => ({
        key: String(f?.id || f?.key || `fabric_${i}`),
        label: String(f?.name || f?.label || "").trim(),
        tag: String(f?.tag || "").trim(),
        pricePerM2: toNumber(f?.pricePerM2),
        apertureEnabled: !!f?.apertureEnabled,
        active: f?.active !== false,
        imageUrl: String(f?.imageUrl || ""),
      }))
      .filter((f) => f.label.length > 0 && f.pricePerM2 > 0 && f.active !== false);
    return mapped.length > 0 ? mapped : DEFAULT_FABRICS.filter((f) => f.active !== false);
  }, [config]);

  useEffect(() => {
    if (!fabrics.some((f) => f.key === tela)) {
      setTela(fabrics[0]?.key || "blackout");
    }
  }, [fabrics, tela]);

  const pricing = useMemo(() => {
    const p = config?.pricing || {};
    return {
      installPrice: toNumber(p.installPrice),
      chainMetalPrice: toNumber(p.chainMetalPrice),
      systemBlackPrice: toNumber(p.systemBlackPrice),
      zocaloPrice: toNumber(p.zocaloPrice),
      extraHeightThresholdCm: toNumber(p.extraHeightThresholdCm || 220) || 220,
      extraHeightPrice: toNumber(p.extraHeightPrice),
    };
  }, [config]);

  const areaRaw = (ancho / 100) * (alto / 100);
  const area = Math.max(1, areaRaw);
  const t = fabrics.find((f) => f.key === tela) || fabrics[0] || DEFAULT_FABRICS[1];
  const baseTela = Math.round(area * toNumber(t.pricePerM2));
  const extraMotor = accion === "motor" ? MOTOR_EXTRA : 0;
  const extraChainMetal = accion === "cadena" && chainMetal ? pricing.chainMetalPrice : 0;
  const extraInstall = includeInstall ? pricing.installPrice : 0;
  const extraSystemBlack = systemBlack ? pricing.systemBlackPrice : 0;
  const extraZocalo = zocalo ? pricing.zocaloPrice : 0;
  const extraHeight = alto > pricing.extraHeightThresholdCm ? pricing.extraHeightPrice : 0;
  const total = baseTela + extraMotor + extraChainMetal + extraInstall + extraSystemBlack + extraZocalo + extraHeight;
  const fmt = (n) => "$" + n.toLocaleString("es-AR");

  const handleAdd = () => {
    const desc = [
      `${ancho} × ${alto} cm`,
      area > areaRaw ? "(mín. 1 m²)" : null,
      t.apertureEnabled ? `Apertura ${apertura.split(" ")[0]}` : null,
      accion === "motor" ? "Motorizada" : chainMetal ? "Cadena metálica" : "Cadena estándar",
      includeInstall ? "Incluye instalación" : "Sin instalación",
      systemBlack ? "Sistema negro" : null,
      zocalo ? "Zócalo" : null,
      extraHeight > 0 ? `Extra alto (+${fmt(extraHeight)})` : null,
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
              {fabrics.map((opt) => (
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

          {t.apertureEnabled && (
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
              <button type="button" className={"chip" + (accion === "cadena" ? " active" : "")} onClick={() => setAccion("cadena")}>
                Cadena
              </button>
              <button type="button" className={"chip" + (accion === "motor" ? " active" : "")} onClick={() => setAccion("motor")}>
                Motorizada {MOTOR_EXTRA > 0 && <span style={{ marginLeft: 6, color: "var(--muted)", fontWeight: 500 }}>+ {fmt(MOTOR_EXTRA)}</span>}
              </button>
            </div>
          </div>

          {accion === "cadena" && (
            <div className="cortcalc__group">
              <span className="cortcalc__lbl">Cadena</span>
              <div className="cortcalc__chips">
                <button type="button" className={"chip" + (!chainMetal ? " active" : "")} onClick={() => setChainMetal(false)}>
                  Estándar
                </button>
                <button type="button" className={"chip" + (chainMetal ? " active" : "")} onClick={() => setChainMetal(true)}>
                  Metálica {pricing.chainMetalPrice > 0 && <span style={{ marginLeft: 6, color: "var(--muted)", fontWeight: 500 }}>+ {fmt(pricing.chainMetalPrice)}</span>}
                </button>
              </div>
            </div>
          )}

          <div className="cortcalc__group">
            <span className="cortcalc__lbl">Adicionales</span>
            <div className="cortcalc__chips">
              <button type="button" className={"chip" + (includeInstall ? " active" : "")} onClick={() => setIncludeInstall((v) => !v)}>
                Instalación {pricing.installPrice > 0 && <span style={{ marginLeft: 6, color: "var(--muted)", fontWeight: 500 }}>+ {fmt(pricing.installPrice)}</span>}
              </button>
              <button type="button" className={"chip" + (systemBlack ? " active" : "")} onClick={() => setSystemBlack((v) => !v)}>
                Sistema negro {pricing.systemBlackPrice > 0 && <span style={{ marginLeft: 6, color: "var(--muted)", fontWeight: 500 }}>+ {fmt(pricing.systemBlackPrice)}</span>}
              </button>
              <button type="button" className={"chip" + (zocalo ? " active" : "")} onClick={() => setZocalo((v) => !v)}>
                Zócalo {pricing.zocaloPrice > 0 && <span style={{ marginLeft: 6, color: "var(--muted)", fontWeight: 500 }}>+ {fmt(pricing.zocaloPrice)}</span>}
              </button>
            </div>
            {pricing.extraHeightPrice > 0 && (
              <p className="cortcalc__hint" style={{ marginTop: 10 }}>
                Si el alto supera {pricing.extraHeightThresholdCm} cm: + {fmt(pricing.extraHeightPrice)}
              </p>
            )}
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
            {extraMotor > 0 && (
              <div className="cortcalc__row">
                <span>Motorización</span>
                <b>+ {fmt(extraMotor)}</b>
              </div>
            )}
            {extraChainMetal > 0 && (
              <div className="cortcalc__row">
                <span>Cadena metálica</span>
                <b>+ {fmt(extraChainMetal)}</b>
              </div>
            )}
            {extraSystemBlack > 0 && (
              <div className="cortcalc__row">
                <span>Sistema negro</span>
                <b>+ {fmt(extraSystemBlack)}</b>
              </div>
            )}
            {extraZocalo > 0 && (
              <div className="cortcalc__row">
                <span>Zócalo</span>
                <b>+ {fmt(extraZocalo)}</b>
              </div>
            )}
            {extraInstall > 0 && (
              <div className="cortcalc__row">
                <span>Instalación</span>
                <b>+ {fmt(extraInstall)}</b>
              </div>
            )}
            {extraHeight > 0 && (
              <div className="cortcalc__row">
                <span>Extra alto</span>
                <b>+ {fmt(extraHeight)}</b>
              </div>
            )}
          </div>

          <div className="cortcalc__total">
            <div className="cortcalc__total-lbl">Precio estimado</div>
            <div className="cortcalc__total-num">{fmt(total)}</div>
            <div className="cortcalc__total-hint">
              + IVA. {includeInstall ? "Incluye" : "No incluye"} instalación.
              {!configLoaded && " (cargando configuración)"}
            </div>
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

