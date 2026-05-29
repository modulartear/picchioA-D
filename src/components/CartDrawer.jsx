import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { Icon } from "./icons";

export function CartDrawer() {
  const nav = useNavigate();
  const { cartOpen, setCartOpen, items, changeQty, removeItem } = useCart();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setCartOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCartOpen]);

  const onCheckout = () => {
    setCartOpen(false);
    nav("/checkout");
  };

  return (
    <>
      <div className={"drawer-backdrop" + (cartOpen ? " open" : "")} onClick={() => setCartOpen(false)} />
      <aside className={"drawer" + (cartOpen ? " open" : "")} aria-hidden={!cartOpen}>
        <div className="drawer__head">
          <h3>
            Tu carrito{" "}
            {items.length > 0 && (
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--muted)" }}>({items.length})</span>
            )}
          </h3>
          <button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Cerrar">
            <Icon.Close />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="drawer__empty">
            <Icon.Cart style={{ width: 48, height: 48, opacity: 0.25, margin: "0 auto" }} />
            <h4>Carrito vacío</h4>
            <p>Sumá algún producto para empezar.</p>
            <button className="btn btn--primary" onClick={() => setCartOpen(false)}>
              Seguir explorando
            </button>
          </div>
        ) : (
          <>
            <div className="drawer__items">
              {items.map((it) => (
                <div key={it.uid} className="drawer__item">
                  <div className="drawer__item-media" style={{ backgroundImage: `url(${it.image})` }} />
                  <div className="drawer__item-body">
                    <div className="drawer__item-title">{it.name}</div>
                    <div className="drawer__item-meta">{it.meta || it.color?.name}</div>
                    <div className="drawer__qty">
                      <button onClick={() => changeQty(it.uid, it.qty - 1)} aria-label="Restar">
                        <Icon.Minus style={{ width: 14, height: 14 }} />
                      </button>
                      <span>{it.qty}</span>
                      <button onClick={() => changeQty(it.uid, it.qty + 1)} aria-label="Sumar">
                        <Icon.Plus style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  </div>
                  <div className="drawer__item-right">
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{it.priceLabel || "Consultar"}</span>
                    <button className="drawer__item-remove" onClick={() => removeItem(it.uid)}>
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="drawer__foot">
              <div className="drawer__row">
                <span>Productos</span>
                <b>{items.reduce((s, x) => s + x.qty, 0)}</b>
              </div>
              {(() => {
                const priced = items.filter((i) => i.priceAmount);
                const subtotal = priced.reduce((s, i) => s + i.priceAmount * i.qty, 0);
                const hasUnpriced = items.some((i) => !i.priceAmount);
                return (
                  <>
                    {priced.length > 0 && (
                      <div className="drawer__row">
                        <span>Subtotal estimado</span>
                        <b>${subtotal.toLocaleString("es-AR")}</b>
                      </div>
                    )}
                    <div className="drawer__row drawer__total">
                      <span>Total</span>
                      <b>
                        {priced.length > 0
                          ? hasUnpriced
                            ? `Desde $${subtotal.toLocaleString("es-AR")}`
                            : `$${subtotal.toLocaleString("es-AR")}`
                          : "A consultar"}
                      </b>
                    </div>
                  </>
                );
              })()}
              <p className="drawer__hint">Los precios definitivos se confirman al cerrar el pedido. Envíos a todo el país.</p>
              <button className="btn btn--accent btn--block btn--lg" onClick={onCheckout}>
                Solicitar pedido <Icon.Arrow style={{ width: 18, height: 18 }} />
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

