import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/icons";
import { ProductPriceBlock } from "../components/ProductPriceBlock";
import { useCart } from "../context/CartContext";
import { useProduct, useProductsByCategory } from "../hooks/useCatalog";

export function Product() {
  const { id } = useParams();
  const nav = useNavigate();
  const { addToCart, setCotizadorOpen } = useCart();

  const productState = useProduct(id);
  const product = productState.data;
  const relatedState = useProductsByCategory(product?.cat);

  const [color, setColor] = useState(product?.colors?.[0]);
  const [qty, setQty] = useState(1);
  const [accordion, setAccordion] = useState("");
  const [imgIdx, setImgIdx] = useState(0);

  const defaultEnvioText = "Envío gratis en Venado Tuerto. Envío a todo el país coordinado por transporte propio o flete.";
  const defaultGarantiaText = "Garantía Picchio: 1 año en tapicería, 2 años en estructura y 5 años en herrajes.";

  const specsEntries = useMemo(() => Object.entries(product?.specs || {}), [product]);

  const accordionItems = useMemo(() => {
    if (!product) return [];

    const renderSpecs = () => (
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {specsEntries.map(([k, v]) => (
          <li key={String(k)} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <span style={{ color: "var(--muted)", textTransform: "capitalize" }}>{String(k).replace(/_/g, " ")}</span>
            <span style={{ color: "var(--ink)", textAlign: "right" }}>{String(v)}</span>
          </li>
        ))}
      </ul>
    );

    const customRaw = Array.isArray(product.sections) ? product.sections : [];
    const customClean = customRaw
      .map((s, i) => ({
        key: String(s?.id || `sec_${i}`),
        type: s?.type === "specs" ? "specs" : "text",
        label: String(s?.title || "").trim(),
        body: String(s?.body || ""),
      }))
      .filter((s) => s.label.length > 0);

    const customItems = customClean.flatMap((s) => {
      if (s.type === "specs") {
        if (specsEntries.length === 0) return [];
        return [{ key: s.key, label: s.label, body: renderSpecs() }];
      }
      return [
        {
          key: s.key,
          label: s.label,
          body: <p style={{ whiteSpace: "pre-wrap" }}>{s.body}</p>,
        },
      ];
    });

    if (customItems.length > 0) return customItems;

    return [
      { key: "desc", label: "Detalles del producto", body: <p style={{ whiteSpace: "pre-wrap" }}>{product.desc}</p> },
      ...(specsEntries.length > 0 ? [{ key: "specs", label: "Especificaciones", body: renderSpecs() }] : []),
      { key: "envio", label: "Envíos y devoluciones", body: <p style={{ whiteSpace: "pre-wrap" }}>{defaultEnvioText}</p> },
      { key: "garantia", label: "Garantía", body: <p style={{ whiteSpace: "pre-wrap" }}>{defaultGarantiaText}</p> },
    ];
  }, [product, specsEntries, defaultEnvioText, defaultGarantiaText]);

  useEffect(() => {
    if (product) {
      setColor(product.colors?.[0]);
      setQty(1);
      setImgIdx(0);
      setAccordion((prev) => prev || "");
      const firstKey = (accordionItems[0]?.key || "").trim();
      setAccordion(firstKey);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id, product, accordionItems]);

  const gallery = useMemo(() => {
    const main = product?.imageUrl || product?.image;
    if (!main) return [];
    return [main, main, main, main];
  }, [product]);

  const related = useMemo(() => {
    const list = (relatedState.data || []).filter((p) => p?.active !== false);
    return product ? list.filter((p) => p.id !== product.id).slice(0, 4) : [];
  }, [relatedState.data, product]);

  if (productState.error) {
    return (
      <div className="container" style={{ padding: 100 }}>
        <h2 className="h-section">Error cargando producto</h2>
        <p className="muted" style={{ marginTop: 12 }}>{productState.error}</p>
      </div>
    );
  }
  if (productState.loading) return <div className="container" style={{ padding: 80 }}><p className="muted">Cargando…</p></div>;
  if (!product) return <div className="container" style={{ padding: 100 }}>Producto no encontrado</div>;

  const isAMedida = product.cat === "a-medida";

  return (
    <div className="fade-in">
      <div className="container" style={{ paddingTop: 24 }}>
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
          <a
            href="/cat/productos"
            onClick={(e) => {
              e.preventDefault();
              nav("/cat/productos");
            }}
          >
            Productos
          </a>
          <span className="sep">/</span>
          <a
            href={"/cat/" + product.cat}
            onClick={(e) => {
              e.preventDefault();
              nav("/cat/" + product.cat);
            }}
          >
            {product.catName}
          </a>
          <span className="sep">/</span>
          <span>{product.name}</span>
        </nav>
      </div>

      <div className="container">
        <div className="pdp">
          <div className="pdp__gallery">
            <div className="pdp__main" style={{ backgroundImage: `url(${gallery[imgIdx]})` }}>
              {product.badge && <span className="card__badge" style={{ position: "absolute", top: 16, left: 16 }}>{product.badge}</span>}
            </div>
            <div className="pdp__thumbs">
              {gallery.map((g, i) => (
                <button key={i} className={"pdp__thumb" + (imgIdx === i ? " active" : "")} onClick={() => setImgIdx(i)} style={{ backgroundImage: `url(${g})` }} aria-label={`Foto ${i + 1}`} />
              ))}
            </div>
          </div>

          <div className="pdp__info">
            <div>
              <span className="card__cat" style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600 }}>
                {product.catName}
              </span>
              <h1 className="pdp__title" style={{ marginTop: 6 }}>
                {product.name}
              </h1>
              <p className="pdp__sub" style={{ marginTop: 8 }}>
                {product.tagline}
              </p>
            </div>

            <p className="pdp__desc">{product.desc}</p>

            {product.colors && product.colors.length > 0 && (
              <div className="qv__row">
                <span className="qv__row-label">
                  Color · <span style={{ color: "var(--ink)" }}>{color?.name}</span>
                </span>
                <div className="swatches">
                  {product.colors.map((c) => (
                    <button
                      key={c.name}
                      className={"swatch" + (color?.name === c.name ? " active" : "")}
                      style={{ background: c.hex }}
                      onClick={() => setColor(c)}
                      title={c.name}
                      aria-label={c.name}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="pdp__price">
              <ProductPriceBlock product={product} variant="detail" />
            </div>

            <div className="qv__row" style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <div className="drawer__qty" style={{ marginTop: 0 }}>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Restar">
                  <Icon.Minus style={{ width: 14, height: 14 }} />
                </button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} aria-label="Sumar">
                  <Icon.Plus style={{ width: 14, height: 14 }} />
                </button>
              </div>
              <button
                className="btn btn--accent btn--lg"
                style={{ flex: 1 }}
                onClick={() => {
                  if (isAMedida) {
                    setCotizadorOpen(true);
                  } else {
                    for (let i = 0; i < qty; i++) addToCart(product, color);
                  }
                }}
              >
                {isAMedida ? "Solicitar cotización" : "Agregar al carrito"} <Icon.Arrow style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div className="pdp__actions">
              <button className="btn btn--ghost" onClick={() => {}}>
                <Icon.Heart style={{ width: 16, height: 16 }} /> Guardar en favoritos
              </button>
              <a href="https://wa.me/543462415161" target="_blank" rel="noopener" className="btn btn--ghost">
                <Icon.WhatsApp style={{ width: 16, height: 16 }} /> Consultar por WhatsApp
              </a>
            </div>

            <div className="pdp__accordion">
              {accordionItems.map((a) => (
                <div key={a.key} className={"acc-item" + (accordion === a.key ? " open" : "")}>
                  <button className="acc-head" onClick={() => setAccordion(accordion === a.key ? "" : a.key)}>
                    <span>{a.label}</span>
                    <Icon.Plus style={{ width: 16, height: 16 }} />
                  </button>
                  <div className="acc-body">{a.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section" style={{ paddingTop: 56 }}>
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow">Productos relacionados</span>
                <h2 className="h-section" style={{ marginTop: 8 }}>
                  Combiná con
                  <br />
                  <em>estos favoritos.</em>
                </h2>
              </div>
            </div>
            <div className="product-grid">
              {related.map((p) => (
                <div key={p.id} className="card" onClick={() => nav("/product/" + p.id)}>
                  <div className="card__media">
                    <div className="card__img" style={{ backgroundImage: `url(${p.imageUrl || p.image})` }} />
                    {p.badge && <span className={"card__badge" + (p.badge === "SALE" || p.badge === "NUEVO" ? " card__badge--accent" : "")}>{p.badge}</span>}
                  </div>
                  <div className="card__body">
                    <span className="card__cat">{p.catName}</span>
                    <div className="card__title">{p.name}</div>
                    <ProductPriceBlock product={p} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

