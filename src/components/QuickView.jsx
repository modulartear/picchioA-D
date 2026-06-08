import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { ProductPriceBlock } from "./ProductPriceBlock";
import { Icon } from "./icons";

export function QuickView() {
  const nav = useNavigate();
  const { quickViewProduct: product, setQuickViewProduct, addToCart } = useCart();
  const [color, setColor] = useState(product?.colors?.[0]);

  useEffect(() => {
    setColor(product?.colors?.[0]);
  }, [product]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setQuickViewProduct(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setQuickViewProduct]);

  if (!product) return null;

  return (
    <div className={"modal-backdrop open"} onClick={() => setQuickViewProduct(null)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={() => setQuickViewProduct(null)} aria-label="Cerrar">
          <Icon.Close />
        </button>
        <div className="qv">
          <div className="qv__media" style={{ backgroundImage: `url(${product.imageUrl || product.image})` }}>
            {product.badge && <span className="card__badge" style={{ position: "absolute", top: 18, left: 18 }}>{product.badge}</span>}
          </div>
          <div className="qv__body">
            <span className="qv__cat">{product.catName}</span>
            <h2 className="qv__title">{product.name}</h2>
            <p className="qv__desc">{product.desc}</p>

            {product.colors && product.colors.length > 0 && (
              <div className="qv__row">
                <span className="qv__row-label">Color · {color?.name}</span>
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

            <div className="qv__row" style={{ paddingTop: 8, borderTop: "1px solid var(--line)" }}>
              <ProductPriceBlock product={product} variant="modal" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600 }}>Entrega</span>
                <span className="muted" style={{ fontSize: 14 }}>
                  {product.specs?.tiempo || "Consultar"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                className="btn btn--accent btn--lg"
                style={{ flex: 1 }}
                onClick={() => {
                  addToCart(product, color);
                  setQuickViewProduct(null);
                }}
              >
                Agregar al carrito
              </button>
              <button
                className="btn btn--ghost btn--lg"
                onClick={() => {
                  setQuickViewProduct(null);
                  nav("/product/" + product.id);
                }}
              >
                Ver detalle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

